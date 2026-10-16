import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageDocument, PageType } from './cms';
import { sitemapEntries, sitemapFile, sitemapFileCount, sitemapIndexXml, SITEMAP_SIZE } from './sitemap';

const documents: Partial<Record<PageType, PageDocument[]>> = {};
vi.mock('./cms', async (original) => ({
  ...(await original<typeof import('./cms')>()),
  getPageDocuments: async (type: PageType) => documents[type] ?? [],
}));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://azway.example');
  for (const key of Object.keys(documents)) delete documents[key as PageType];
});

describe('sitemap (SEO-03)', () => {
  it('leaves out pages kept from the index or pointing their canonical elsewhere', async () => {
    const doc = (slug: string, seo?: PageDocument['seo']) => ({ slug, updatedAt: '2026-10-01T00:00:00.000Z', seo });
    documents.tour = [doc('a'), doc('hidden', { noIndex: true, canonicalUrl: null }), doc('copy', { noIndex: false, canonicalUrl: 'https://azway.example/tour/a' })];
    // Pointing at itself, however written, keeps the page.
    documents['article-category'] = [
      doc('self', { noIndex: false, canonicalUrl: 'https://azway.example/cam-nang/danh-muc/self' }),
      doc('slash', { noIndex: false, canonicalUrl: 'https://azway.example/cam-nang/danh-muc/slash/' }),
      doc('relative', { noIndex: false, canonicalUrl: '/cam-nang/danh-muc/relative' }),
    ];
    const paths = (await sitemapEntries()).map((entry) => entry.path);
    expect(paths).toContain('/tour/a');
    expect(paths).toEqual(expect.arrayContaining(['/cam-nang/danh-muc/self', '/cam-nang/danh-muc/slash', '/cam-nang/danh-muc/relative']));
    expect(paths).not.toContain('/tour/hidden');
    expect(paths).not.toContain('/tour/copy');
  });

  it('splits into files of 1,000 URLs past 1,000, every URL in exactly one file', () => {
    const entries = Array.from({ length: 2 * SITEMAP_SIZE + 1 }, (_, index) => ({ path: `/tour/t-${index}` }));
    expect(sitemapFileCount(SITEMAP_SIZE)).toBe(1);
    expect(sitemapFileCount(entries.length)).toBe(3);
    expect([1, 2, 3].flatMap((file) => sitemapFile(entries, file))).toEqual(entries);
    expect(sitemapIndexXml(3)).toContain('<loc>https://azway.example/sitemap-3.xml</loc>');
  });
});
