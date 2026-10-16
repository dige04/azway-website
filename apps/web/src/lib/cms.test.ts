import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as cms from './cms';
import { RELATIONS } from './cms';

const fetchMock = vi.fn();

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, { next: { tags: string[] } }];
  return { url: new URL(url), tags: [...init.next.tags].sort() };
};

beforeEach(() => {
  vi.stubEnv('CMS_URL', 'http://cms.test');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async () => Response.json({ data: [], meta: { pagination: { total: 0 } } }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('cache tags', () => {
  // The webhook only revalidates the changed document's `<type>` and
  // `<type>:<slug>`, so a page's tags must cover every type it shows.
  // Explicit per getter so a typo in a populate key (untagged relation) fails.
  it.each([
    ['getTourCatalog', () => cms.getTourCatalog(), ['destination', 'tour']],
    ['getTourBySlug', () => cms.getTourBySlug('x'), ['article', 'destination', 'feedback', 'teambuilding', 'tour', 'tour:x']],
    ['getCruiseBySlug', () => cms.getCruiseBySlug('x'), ['article', 'cruise', 'cruise:x', 'destination']],
    ['getTeambuildingBySlug', () => cms.getTeambuildingBySlug('x'), ['teambuilding', 'teambuilding:x', 'tour']],
    ['getDestinationBySlug', () => cms.getDestinationBySlug('x'), ['cruise', 'destination', 'destination:x', 'tour']],
    ['getArticles', () => cms.getArticles({ category: 'c' }), ['article', 'article-category']],
    ['getArticleBySlug', () => cms.getArticleBySlug('x'), ['article', 'article-category', 'article:x', 'cruise', 'tour']],
    ['getFeedbacks', () => cms.getFeedbacks(), ['feedback', 'tour']],
    ['getCruises', () => cms.getCruises(), ['cruise', 'destination']],
    ['getTeambuildings', () => cms.getTeambuildings(), ['teambuilding']],
    ['getDestinations', () => cms.getDestinations(), ['destination']],
    ['getArticleCategories', () => cms.getArticleCategories(), ['article-category']],
    ['getArticleCategoryBySlug', () => cms.getArticleCategoryBySlug('x'), ['article-category', 'article-category:x']],
    ['getSiteSetting', () => cms.getSiteSetting(), ['site-setting']],
    ['getHomepage', () => cms.getHomepage(), ['article', 'article-category', 'cruise', 'destination', 'homepage', 'tour']],
    ['getRedirect', () => cms.getRedirect('/a'), ['redirect']],
  ] as const)('%s', async (_name, call, expected) => {
    await call();
    expect(lastCall().tags).toEqual([...expected].sort());
  });

  it('RELATIONS lists exactly the relations in the CMS schemas', () => {
    const apiDir = fileURLToPath(new URL('../../../cms/src/api/', import.meta.url));
    const fromSchemas: Record<string, Record<string, string>> = {};
    for (const entry of readdirSync(apiDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      const schema = JSON.parse(readFileSync(join(apiDir, name, 'content-types', name, 'schema.json'), 'utf8'));
      fromSchemas[schema.info.singularName] = Object.fromEntries(
        Object.entries(schema.attributes as Record<string, { type: string; target?: string }>)
          .filter(([, attribute]) => attribute.type === 'relation')
          .map(([field, attribute]) => [field, attribute.target!.split('.').pop()!]),
      );
    }
    // Types without relations (e.g. lead) need no entry.
    for (const [type, relations] of Object.entries(fromSchemas)) expect(RELATIONS[type] ?? {}, type).toEqual(relations);

    // And no type the CMS does not have.
    expect(Object.keys(RELATIONS).filter((type) => !fromSchemas[type])).toEqual([]);
  });
});

describe('Strapi query contract', () => {
  it('reads the whole tour catalog, page by page, in bracket notation, published only', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const page = Number(new URL(url).searchParams.get('pagination[page]'));
      return Response.json({ data: [{ code: `T${page}` }], meta: { pagination: { page, pageSize: 100, pageCount: 2, total: 2 } } });
    });
    const tours = await cms.getTourCatalog();

    expect(tours.map((tour) => tour.code)).toEqual(['T1', 'T2']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const { url } = lastCall();
    expect(url.pathname).toBe('/api/tours');
    expect(url.search).toContain('populate%5Bdestinations%5D%5Bfields%5D%5B0%5D=name');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      'populate[thumbnail]': 'true',
      'sort[0]': 'publishedAt:desc',
      'pagination[page]': '2',
      'pagination[pageSize]': '100',
      status: 'published',
    });
  });
});

describe('missing content', () => {
  const respond = (body: unknown, status = 200) =>
    fetchMock.mockImplementation(async () => Response.json(body, { status }));
  const notFoundError = { data: null, error: { status: 404, name: 'NotFoundError', message: 'Not Found' } };

  it('an unknown slug is null, a single type never saved is null', async () => {
    respond({ data: [] });
    await expect(cms.getTourBySlug('missing')).resolves.toBeNull();
    await expect(cms.getRedirect('/missing')).resolves.toBeNull();
    respond(notFoundError, 404);
    await expect(cms.getHomepage()).resolves.toBeNull();
  });

  // Only Strapi's NotFoundError means "single type not saved yet"; a bare 404
  // (proxy, wrong base path) is a misconfiguration.
  it('a 404 without NotFoundError on a single type is an error', async () => {
    respond(null, 404);
    await expect(cms.getSiteSetting()).rejects.toThrow('CMS responded 404');
  });

  // A 404 on a collection means a wrong CMS_URL or route: it must not be
  // cached as "no content" (notFound) for an hour.
  it('a 404 on a collection endpoint is an error', async () => {
    respond(notFoundError, 404);
    await expect(cms.getTourBySlug('x')).rejects.toThrow('CMS responded 404');
    await expect(cms.getRedirect('/x')).rejects.toThrow('CMS responded 404');
    await expect(cms.getTourCatalog()).rejects.toThrow('CMS responded 404');
  });
});
