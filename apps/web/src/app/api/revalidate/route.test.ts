import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag }));

const { POST } = await import('./route');

const call = (secret: string | null, body: unknown) =>
  POST(
    new Request('http://localhost/api/revalidate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(secret ? { 'x-revalidate-secret': secret } : {}) },
      body: JSON.stringify(body),
    }),
  );

describe('POST /api/revalidate', () => {
  beforeEach(() => vi.stubEnv('REVALIDATE_SECRET', 'right-secret'));
  afterEach(() => {
    vi.unstubAllEnvs();
    revalidateTag.mockReset();
  });

  it('rejects a missing or wrong secret without revalidating', async () => {
    expect((await call(null, { tags: ['tour'] })).status).toBe(401);
    expect((await call('wrong-secret', { tags: ['tour'] })).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('rejects every request when REVALIDATE_SECRET is not configured', async () => {
    vi.stubEnv('REVALIDATE_SECRET', '');
    expect((await call('', { tags: ['tour'] })).status).toBe(401);
    expect((await call('anything', { tags: ['tour'] })).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('rejects a body that is not a non-empty list of tags', async () => {
    for (const body of [null, {}, { tags: [] }, { tags: 'tour' }, { tags: [1] }]) {
      expect((await call('right-secret', body)).status).toBe(400);
    }
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('revalidates every tag when the secret matches', async () => {
    const res = await call('right-secret', { tags: ['tour', 'tour:ha-long-2n1d'] });
    expect(res.status).toBe(200);
    // expire: 0 = drop now, so the next request renders fresh data (NFR-03).
    expect(revalidateTag.mock.calls).toEqual([
      ['tour', { expire: 0 }],
      ['tour:ha-long-2n1d', { expire: 0 }],
    ]);
  });
});
