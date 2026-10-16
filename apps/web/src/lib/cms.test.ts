import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as cms from './cms';

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
  // `<type>:<slug>`, so every type a page shows must be in its tags.
  it.each([
    ['getTours', () => cms.getTours(), ['destination', 'tour']],
    ['getTourBySlug', () => cms.getTourBySlug('x'), ['article', 'destination', 'feedback', 'teambuilding', 'tour', 'tour:x']],
    ['getCruiseBySlug', () => cms.getCruiseBySlug('x'), ['article', 'cruise', 'cruise:x', 'destination']],
    ['getTeambuildingBySlug', () => cms.getTeambuildingBySlug('x'), ['teambuilding', 'teambuilding:x', 'tour']],
    ['getDestinationBySlug', () => cms.getDestinationBySlug('x'), ['cruise', 'destination', 'destination:x', 'tour']],
    ['getArticles', () => cms.getArticles({ category: 'c' }), ['article', 'article-category']],
    ['getArticleBySlug', () => cms.getArticleBySlug('x'), ['article', 'article-category', 'article:x', 'cruise', 'tour']],
    ['getFeedbacks', () => cms.getFeedbacks(), ['feedback', 'tour']],
    ['getHomepage', () => cms.getHomepage(), ['article', 'cruise', 'destination', 'homepage', 'tour']],
    ['getRedirect', () => cms.getRedirect('/a'), ['redirect']],
  ] as const)('%s', async (_name, call, expected) => {
    await call();
    expect(lastCall().tags).toEqual([...expected].sort());
  });
});

describe('Strapi query contract', () => {
  it('encodes tour filters in bracket notation with published status', async () => {
    await cms.getTours({ category: 'trung_quoc', region: 'mien_bac', groupSize: 20, q: 'LC2', sort: 'price:desc', page: 2 });
    const { url } = lastCall();

    expect(url.pathname).toBe('/api/tours');
    expect(url.search).toContain('filters%5B%24and%5D%5B0%5D%5Bcategory%5D%5B%24eq%5D=trung_quoc');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      'filters[$and][0][category][$eq]': 'trung_quoc',
      'filters[$and][1][destinations][region][$eq]': 'mien_bac',
      'filters[$and][2][$or][0][groupSizeMin][$null]': 'true',
      'filters[$and][2][$or][1][groupSizeMin][$lte]': '20',
      'filters[$and][3][$or][0][groupSizeMax][$null]': 'true',
      'filters[$and][3][$or][1][groupSizeMax][$gte]': '20',
      'filters[$and][4][$or][0][name][$containsi]': 'LC2',
      'filters[$and][4][$or][1][code][$containsi]': 'LC2',
      'sort[0]': 'priceFrom:desc',
      'pagination[page]': '2',
      status: 'published',
    });
  });

  it('sorts newest first and sends no filters by default', async () => {
    await cms.getTours();
    const params = [...lastCall().url.searchParams.keys()];
    expect(lastCall().url.searchParams.get('sort[0]')).toBe('publishedAt:desc');
    expect(params.some((key) => key.startsWith('filters'))).toBe(false);
  });
});

describe('404 handling', () => {
  beforeEach(() => fetchMock.mockImplementation(async () => new Response('', { status: 404 })));

  it('means "not found" for one document', async () => {
    await expect(cms.getTourBySlug('missing')).resolves.toBeNull();
    await expect(cms.getHomepage()).resolves.toBeNull();
  });

  it('is an error for a list', async () => {
    await expect(cms.getTours()).rejects.toThrow('CMS responded 404');
  });
});
