import type { NextRequest } from 'next/server';
import { LANDING_COOKIE, UTM_COOKIE, UTM_KEYS } from '@/lib/attribution';
import { fieldErrors, type LeadErrors, type LeadResponse, leadSchema } from '@/lib/lead';
import { createRateLimiter } from '@/lib/rate-limit';

/**
 * POST /api/lead (D5): the browser's only way to send a lead. Honeypot, rate
 * limit, validation, then Strapi `POST /api/leads/submit` with the secret
 * X-Lead-Token, which never reaches the browser. Answers are `LeadResponse`;
 * no CMS error or stack trace is passed on, and nothing personal is logged.
 */

const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });
const MAX_BODY_BYTES = 16_000;
const CMS_TIMEOUT_MS = 10_000;

const FAILED = 'Chưa gửi được yêu cầu. Vui lòng thử lại sau ít phút hoặc gọi hotline để được tư vấn ngay.';

const reply = (body: LeadResponse, status = 200) => Response.json(body, { status });

export async function POST(request: NextRequest) {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return reply({ ok: false, message: FAILED }, 413);
  const raw = await request.text().catch(() => '');
  const body = raw.length <= MAX_BODY_BYTES ? parseJson(raw) : null;
  if (!body) return reply({ ok: false, message: FAILED }, 400);

  // A bot filled the hidden field: it is told the lead went through, nothing is stored.
  if (typeof body.hp === 'string' && body.hp.trim() !== '') {
    console.info('[lead] honeypot hit');
    return reply({ ok: true });
  }

  const ip = clientIp(request);
  if (!limiter.allow(ip)) {
    console.warn('[lead] rate limited');
    return reply({ ok: false, message: 'Bạn vừa gửi nhiều yêu cầu liên tiếp. Vui lòng thử lại sau 10 phút hoặc gọi hotline.' }, 429);
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return reply({ ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fields: fieldErrors(parsed.error) }, 400);
  }

  const cms = process.env.CMS_URL;
  const token = process.env.LEAD_INGEST_TOKEN;
  if (!cms || !token) {
    console.error('[lead] CMS_URL or LEAD_INGEST_TOKEN is not set');
    return reply({ ok: false, message: FAILED }, 503);
  }

  const lead = {
    ...parsed.data,
    landingPage: request.cookies.get(LANDING_COOKIE)?.value,
    ...utmFromCookie(request.cookies.get(UTM_COOKIE)?.value),
    device: device(request.headers),
    ipHash: await hashIp(ip, token),
  };

  let res: Response;
  try {
    res = await fetch(`${cms.replace(/\/+$/, '')}/api/leads/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-lead-token': token },
      body: JSON.stringify(lead),
      cache: 'no-store',
      signal: AbortSignal.timeout(CMS_TIMEOUT_MS),
    });
  } catch (error) {
    console.error('[lead] CMS unreachable:', error instanceof Error ? error.name : 'unknown');
    return reply({ ok: false, message: FAILED }, 502);
  }

  if (res.status === 201) {
    await res.body?.cancel();
    return reply({ ok: true });
  }
  if (res.status === 400) {
    // Same rules on both sides, so rare: point at the fields the CMS named.
    const details = (await res.json().catch(() => null)) as { error?: { details?: { errors?: Record<string, unknown> } } } | null;
    const fields: LeadErrors = {};
    for (const field of Object.keys(details?.error?.details?.errors ?? {})) {
      if (field in leadSchema.shape) fields[field as keyof LeadErrors] = 'Thông tin chưa hợp lệ';
    }
    return reply({ ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fields }, 400);
  }
  await res.body?.cancel();
  console.error(`[lead] CMS responded ${res.status}`);
  return reply({ ok: false, message: FAILED }, 502);
}

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Cloudflare sets CF-Connecting-IP (a client cannot override it there). */
function clientIp(request: NextRequest): string {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

function utmFromCookie(value: string | undefined): Partial<Record<(typeof UTM_KEYS)[number], string>> {
  try {
    const parsed: unknown = value ? JSON.parse(value) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    const utm = parsed as Record<string, unknown>;
    return Object.fromEntries(UTM_KEYS.flatMap((key) => (typeof utm[key] === 'string' ? [[key, utm[key] as string] as const] : [])));
  } catch {
    return {};
  }
}

/** mobile, tablet or desktop: Client Hints first, then the user agent. */
function device(headers: Headers): string {
  const ua = headers.get('user-agent') ?? '';
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
  if (headers.get('sec-ch-ua-mobile') === '?1' || /Mobi|iPhone|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Keyed hash, so the stored value cannot be reversed by hashing every IPv4 address. */
async function hashIp(ip: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const hmac = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', hmac, encoder.encode(ip)));
  return [...signature].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
