// The public REST API against a real Strapi (temporary sqlite), so Strapi
// upgrades cannot silently break it:
// - AC-05: never returns drafts, whatever the query says (src/setup/published-only.ts);
// - M3: lead ingest is token-protected, stores the lead, and the background
//   email/Sheets job runs (src/api/lead, src/services/lead-pipeline.ts).
import { randomBytes } from 'node:crypto';
import { rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Strapi is CommonJS; loading it through Vite's ESM interop fails.
const { compileStrapi, createStrapi } = createRequire(__filename)('@strapi/strapi') as typeof import('@strapi/strapi');

const dbFile = `.tmp/test-api-${process.pid}.db`;
const LEAD_TOKEN = randomBytes(32).toString('hex');
let strapi: Core.Strapi;
let base: string;
let secretTourId: string;
let publicTourId: string;
let apiToken: string;
let adminToken: string;
// Stand-in for the Resend API: answers 500 and counts the calls.
let resend: Server;
let resendCalls = 0;

beforeAll(async () => {
  resend = createServer((_req, res) => {
    resendCalls++;
    res.writeHead(500).end('{"message":"mock"}');
  });
  await new Promise<void>((resolve) => resend.listen(0, '127.0.0.1', resolve));

  const secret = () => randomBytes(16).toString('base64');
  Object.assign(process.env, {
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '0',
    APP_KEYS: `${secret()},${secret()}`,
    API_TOKEN_SALT: secret(),
    ADMIN_JWT_SECRET: secret(),
    TRANSFER_TOKEN_SALT: secret(),
    JWT_SECRET: secret(),
    ENCRYPTION_KEY: secret(),
    DATABASE_CLIENT: 'sqlite',
    DATABASE_FILENAME: dbFile,
    CRON_ENABLED: 'false',
    LEAD_INGEST_TOKEN: LEAD_TOKEN,
    LEAD_NOTIFY_EMAILS: 'sales@example.com',
    RESEND_API_URL: `http://127.0.0.1:${(resend.address() as { port: number }).port}`,
    // Set (even empty) so a developer's apps/cms/.env cannot fill them in.
    RESEND_API_KEY: '',
    MAIL_FROM: '',
    GOOGLE_SA_EMAIL: '',
    GOOGLE_SA_PRIVATE_KEY: '',
    GOOGLE_SHEET_ID: '',
    WEB_REVALIDATE_URL: '',
  });
  strapi = await createStrapi(await compileStrapi()).load();
  await strapi.listen();
  const address = strapi.server.httpServer.address() as { port: number };
  base = `http://127.0.0.1:${address.port}`;

  const tours = strapi.documents('api::tour.tour');
  // A media file used by a draft: /api/upload/files?populate[related] must not reveal it.
  const cover = await strapi.db.query('plugin::upload.file').create({
    data: { name: 'a.png', hash: 'a', ext: '.png', mime: 'image/png', size: 1, url: '/uploads/a.png', provider: 'local' },
  });
  const article = await strapi
    .documents('api::article.article')
    .create({ data: { title: 'SECRET article', slug: 'secret-article', content: [], cover: cover.id } });
  const secretTour = await tours.create({
    data: { name: 'SECRET tour', code: 'SECRET', slug: 'secret', category: 'noi_dia', durationDays: 1, durationNights: 0 },
  });
  secretTourId = secretTour.documentId;
  const published = await tours.create({
    data: {
      name: 'Public tour',
      code: 'PUB',
      slug: 'public',
      category: 'noi_dia',
      durationDays: 1,
      durationNights: 0,
      thumbnail: cover.id,
      articles: { connect: [article.documentId] },
    },
  });
  await tours.publish({ documentId: published.documentId });
  publicTourId = published.documentId;

  // Readers that must keep seeing drafts (FR-CMS-09 preview, the admin panel).
  const token = await strapi
    .service('admin::api-token')
    .create({ name: 'preview', type: 'read-only', kind: 'content-api', lifespan: null });
  apiToken = token.accessKey;
  const password = `${randomBytes(18).toString('base64url')}Aa1!`;
  const superAdmin = await strapi.service('admin::role').getSuperAdmin();
  await strapi
    .service('admin::user')
    .create({ firstname: 'Test', email: 'admin@test.local', password, isActive: true, roles: [superAdmin.id] });
  const login = await fetch(`${base}/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.local', password }),
  });
  adminToken = ((await login.json()) as { data: { token: string } }).data.token;
}, 120_000);

afterAll(async () => {
  // Not strapi.destroy(): it calls process.removeAllListeners(), which kills the vitest worker.
  await strapi?.server.destroy();
  await strapi?.db.destroy();
  rmSync(path.join(__dirname, '..', dbFile), { force: true });
  resend?.close();
});

const get = async (query: string, token?: string) => {
  const response = await fetch(base + query, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: response.status, body: await response.text() };
};

const EMPTY = '"data":[]';

describe('public REST API (AC-05)', () => {
  // [query, expected status, what the answer must contain]
  it.each([
    ['/api/tours', 200, ['Public tour']],
    ['/api/tours?status=draft', 200, ['Public tour']],
    ['/api/tours?filters[publishedAt][$null]=true', 200, [EMPTY]],
    ['/api/tours?status=draft&filters[$or][0][publishedAt][$null]=true&filters[$or][1][code]=SECRET', 200, [EMPTY]],
    ['/api/tours?status=draft&populate[articles]=true', 200, ['Public tour']],
    // Images still populate without Public upload permissions.
    ['/api/tours?populate[thumbnail]=true', 200, ['Public tour', '/uploads/a.png']],
    ['/api/articles?status=draft', 200, [EMPTY]],
    // Rejected on purpose: `related` is private (src/extensions/upload).
    ['/api/tours?populate[thumbnail][populate][related]=true', 400, []],
    // No Public upload permissions.
    ['/api/upload/files?populate[related]=true', 403, []],
  ] as const)('%s returns no draft', async (query, status, expected) => {
    const response = await get(query);
    expect(response.body).not.toContain('SECRET');
    expect(response.status).toBe(status);
    for (const text of expected) expect(response.body).toContain(text);
  });

  it('findOne returns the published document and not the draft-only one', async () => {
    expect(publicTourId).toBeTruthy();
    expect(secretTourId).toBeTruthy();
    expect(await get(`/api/tours/${publicTourId}?status=draft`)).toMatchObject({ status: 200, body: expect.stringContaining('Public tour') });
    const draft = await get(`/api/tours/${secretTourId}?status=draft`);
    expect(draft.status).toBe(404);
    expect(draft.body).not.toContain('SECRET');
  });
});

describe('trusted readers still see drafts', () => {
  it('API token (FR-CMS-09 preview) and the admin panel', async () => {
    expect((await get('/api/tours?status=draft', apiToken)).body).toContain('SECRET tour');
    expect((await get('/content-manager/collection-types/api::tour.tour', adminToken)).body).toContain('SECRET tour');
  });
});

// FR-CMS-08 / NFR-10: src/setup/editor-role.ts, as applied on boot.
describe('Editor role', () => {
  it('edits and publishes content, only reads redirects and settings, never sees leads', async () => {
    const role = await strapi.service('admin::role').findOne({ code: 'strapi-editor' });
    const permissions: { action: string; subject: string | null }[] = await strapi.db.query('admin::permission').findMany({ where: { role: role.id } });
    const actions = (subject: string) => permissions.filter((permission) => permission.subject === subject).map((permission) => permission.action.split('.').pop()).sort();
    expect(actions('api::tour.tour')).toEqual(expect.arrayContaining(['create', 'delete', 'publish', 'read', 'update']));
    expect(actions('api::redirect.redirect')).toEqual(['read']);
    expect(actions('api::site-setting.site-setting')).toEqual(['read']);
    expect(actions('api::lead.lead')).toEqual([]);
  });
});

describe('lead ingest (M3)', () => {
  const submit = (token?: string) =>
    fetch(`${base}/api/leads/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { 'x-lead-token': token } : {}) },
      body: JSON.stringify({ fullName: 'Nguyễn Văn A', phone: '+84 912 345 678', productType: 'tour', productCode: 'PUB' }),
    });
  type StoredLead = { phone: string; sheetsStatus: string; notifyAttempts: number; notifiedAt: string | null };
  // Waits for the background job: without Google config it ends at `skipped`.
  const processed = async (documentId: string) =>
    vi.waitFor(
      async () => {
        const lead = (await strapi.documents('api::lead.lead').findOne({ documentId })) as unknown as StoredLead;
        expect(lead.sheetsStatus).toBe('skipped');
        return lead;
      },
      { timeout: 5000 }
    );

  it('rejects a missing or wrong X-Lead-Token and stores nothing', async () => {
    expect((await submit()).status).toBe(401);
    expect((await submit('x'.repeat(64))).status).toBe(401);
    expect(await strapi.documents('api::lead.lead').count({})).toBe(0);
  });

  it('stores the lead, then emails it; no Resend key is not a failure', async () => {
    const response = await submit(LEAD_TOKEN);
    expect(response.status).toBe(201);
    const { id } = (await response.json()) as { id: string };
    expect(await processed(id)).toMatchObject({ phone: '0912345678', notifyAttempts: 0, notifiedAt: null });
    expect(resendCalls).toBe(0);
  });

  it('keeps the lead and counts the attempt when Resend fails', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('MAIL_FROM', 'AZway <no-reply@example.com>');
    try {
      const response = await submit(LEAD_TOKEN);
      expect(response.status).toBe(201);
      const { id } = (await response.json()) as { id: string };
      expect(await processed(id)).toMatchObject({ notifyAttempts: 1, notifiedAt: null });
      expect(resendCalls).toBe(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
