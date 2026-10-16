import { getPageDocuments, PAGE_TYPES, type PageDocument, type PageType } from './cms';
import { canonicalUrl, siteUrl } from './site';

/** URLs per sitemap file; Google allows 50,000, the spec asks for paging past 1,000 (SEO-03). */
export const SITEMAP_SIZE = 1000;

export interface SitemapEntry {
  path: string;
  lastModified?: string;
}

/** Pages without a CMS document. /tim-kiem is noindex; list page 2+ are found through their links. */
const STATIC_PATHS = ['/', '/tour', '/du-thuyen', '/teambuilding', '/diem-den', '/cam-nang', '/lien-he'];

const PATH: Record<PageType, (slug: string) => string> = {
  tour: (slug) => `/tour/${slug}`,
  cruise: (slug) => `/du-thuyen/${slug}`,
  teambuilding: (slug) => `/teambuilding/${slug}`,
  destination: (slug) => `/diem-den/${slug}`,
  article: (slug) => `/cam-nang/${slug}`,
  'article-category': (slug) => `/cam-nang/danh-muc/${slug}`,
};

/**
 * A page search engines should index: not noindex, and its canonical (if any)
 * is itself, compared as pageMetadata writes it. A blank or unparseable
 * canonical counts as none, as on the page.
 */
const indexable = (doc: PageDocument, path: string) => {
  const canonical = doc.seo?.canonicalUrl && canonicalUrl(doc.seo.canonicalUrl);
  return !doc.seo?.noIndex && (!canonical || canonical === canonicalUrl(path));
};

/** AC-15: every published page (the CMS client asks for published documents only). */
export async function sitemapEntries(): Promise<SitemapEntry[]> {
  const perType = await Promise.all(
    (Object.keys(PAGE_TYPES) as PageType[]).map(async (type) =>
      (await getPageDocuments(type)).flatMap((doc) => {
        const path = PATH[type](doc.slug);
        return indexable(doc, path) ? [{ path, lastModified: doc.updatedAt }] : [];
      }),
    ),
  );
  return [...STATIC_PATHS.map((path) => ({ path })), ...perType.flat()];
}

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Sitemap files for `count` URLs: 1 means /sitemap.xml holds them all. */
export const sitemapFileCount = (count: number) => Math.max(1, Math.ceil(count / SITEMAP_SIZE));

/** URLs of file `file` (1-based). */
export const sitemapFile = (entries: SitemapEntry[], file: number) => entries.slice((file - 1) * SITEMAP_SIZE, file * SITEMAP_SIZE);

export function urlsetXml(entries: SitemapEntry[]): string {
  const urls = entries.map(
    ({ path, lastModified }) => `<url><loc>${escape(siteUrl(path))}</loc>${lastModified ? `<lastmod>${escape(lastModified)}</lastmod>` : ''}</url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** /sitemap.xml past SITEMAP_SIZE URLs: an index of /sitemap-1.xml, /sitemap-2.xml, ... (at the root, see next.config). */
export function sitemapIndexXml(files: number): string {
  const items = Array.from({ length: files }, (_, index) => `<sitemap><loc>${escape(siteUrl(`/sitemap-${index + 1}.xml`))}</loc></sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>\n`;
}

export const xmlResponse = (body: string) => new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
