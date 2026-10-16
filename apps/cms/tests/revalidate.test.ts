import type { Core } from '@strapi/strapi';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerRevalidate } from '../src/setup/revalidate';

type Middleware = (ctx: { uid: string; action: string; params: object }, next: () => Promise<unknown>) => Promise<unknown>;

// Just enough of Strapi for the middleware: one D&P type, a slug table and a transaction.
const fakeStrapi = () => {
  const rows = { slug: 'ha-long' };
  const commitCallbacks: (() => void)[] = [];
  let middleware: Middleware | undefined;
  const strapi = {
    contentTypes: {
      'api::tour.tour': { options: { draftAndPublish: true }, info: { singularName: 'tour' }, attributes: { slug: {} } },
    },
    documents: { use: (fn: Middleware) => (middleware = fn) },
    db: {
      query: () => ({ findMany: async () => [{ slug: rows.slug }] }),
      inTransaction: () => true,
      transaction: async (fn: (trx: { onCommit: (cb: () => void) => void }) => Promise<void>) =>
        fn({ onCommit: (cb) => commitCallbacks.push(cb) }),
    },
    log: { info: vi.fn(), error: vi.fn() },
  };
  registerRevalidate(strapi as unknown as Core.Strapi);
  return { rows, commitCallbacks, run: middleware! };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('revalidate webhook', () => {
  it('sends old and new slug tags, only after the transaction commits', async () => {
    vi.stubEnv('WEB_REVALIDATE_URL', 'http://web.test/api/revalidate');
    vi.stubEnv('REVALIDATE_SECRET', 'secret');
    const fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    const { rows, commitCallbacks, run } = fakeStrapi();
    // Publishing a draft whose slug was renamed.
    await run({ uid: 'api::tour.tour', action: 'publish', params: { documentId: 'd1' } }, async () => {
      rows.slug = 'ha-long-moi';
      return { documentId: 'd1' };
    });
    expect(fetchMock).not.toHaveBeenCalled();

    commitCallbacks.forEach((callback) => callback());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ tags: ['tour', 'tour:ha-long', 'tour:ha-long-moi'] });
  });
});
