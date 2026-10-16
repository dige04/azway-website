import { revalidateTag } from 'next/cache';

/**
 * Strapi webhook (D4): POST { tags: string[] } with header x-revalidate-secret.
 * Tags expire immediately so the next request renders fresh data (NFR-03).
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = request.headers.get('x-revalidate-secret');
  if (!secret || !given || !(await safeEqual(given, secret))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const tags = (body as { tags?: unknown } | null)?.tags;
  if (!Array.isArray(tags) || tags.length === 0 || !tags.every(isTag)) {
    return Response.json({ error: 'body must be { tags: string[] }' }, { status: 400 });
  }

  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}

const isTag = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 256;

/** Constant-time comparison; hashing first hides the length of the secret. */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const digest = async (value: string) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [x, y] = [await digest(a), await digest(b)];
  let diff = 0;
  x.forEach((byte, i) => {
    diff |= byte ^ (y[i] ?? 0);
  });
  return diff === 0;
}
