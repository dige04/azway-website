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
  it('adds the type of every populated relation, nested ones included', async () => {
    await cms.getTourBySlug('x');
    expect(lastCall().tags).toEqual(['article', 'destination', 'feedback', 'teambuilding', 'tour', 'tour:x']);

    await cms.getHomepage(); // featuredTours -> destinations
    expect(lastCall().tags).toEqual(['article', 'cruise', 'destination', 'homepage', 'tour']);
  });

  it('RELATIONS lists exactly the relations in the CMS schemas', () => {
    const apiDir = fileURLToPath(new URL('../../../cms/src/api/', import.meta.url));
    const fromSchemas: Record<string, Record<string, string>> = {};
    for (const name of readdirSync(apiDir)) {
      const schema = JSON.parse(readFileSync(join(apiDir, name, 'content-types', name, 'schema.json'), 'utf8'));
      fromSchemas[schema.info.singularName] = Object.fromEntries(
        Object.entries(schema.attributes as Record<string, { type: string; target?: string }>)
          .filter(([, attribute]) => attribute.type === 'relation')
          .map(([field, attribute]) => [field, attribute.target!.split('.').pop()!]),
      );
    }
    // Types without relations (e.g. lead) need no entry.
    for (const [type, relations] of Object.entries(fromSchemas)) expect(RELATIONS[type] ?? {}, type).toEqual(relations);

    // Schemas that land with PR #3; once they are on main this list must be
    // emptied so those types are checked too.
    const pendingSchemas = ['homepage', 'redirect', 'site-setting'];
    expect(Object.keys(RELATIONS).filter((type) => !fromSchemas[type]).sort()).toEqual(pendingSchemas);
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

describe('missing content', () => {
  const respond = (body: unknown, status = 200) =>
    fetchMock.mockImplementation(async () => (status === 200 ? Response.json(body) : new Response('', { status })));

  it('an unknown slug is null, a single type never saved is null', async () => {
    respond({ data: [] });
    await expect(cms.getTourBySlug('missing')).resolves.toBeNull();
    await expect(cms.getRedirect('/missing')).resolves.toBeNull();
    respond(null, 404);
    await expect(cms.getHomepage()).resolves.toBeNull();
  });

  // A 404 on a collection means a wrong CMS_URL or route: it must not be
  // cached as "no content" (notFound) for an hour.
  it('a 404 on a collection endpoint is an error', async () => {
    respond(null, 404);
    await expect(cms.getTourBySlug('x')).rejects.toThrow('CMS responded 404');
    await expect(cms.getRedirect('/x')).rejects.toThrow('CMS responded 404');
    await expect(cms.getTours()).rejects.toThrow('CMS responded 404');
  });
});
