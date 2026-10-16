import { renderPerRequestWithoutCms } from '@/lib/build';
import { sitemapEntries, sitemapFile, sitemapFileCount, urlsetXml, xmlResponse } from '@/lib/sitemap';

export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ file: string }[]> => [];

/** /sitemap/N.xml: the N-th SITEMAP_SIZE URLs, listed by /sitemap.xml when it is an index. */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const match = /^([1-9]\d{0,3})\.xml$/.exec((await params).file);
  if (!match) return new Response('Not found', { status: 404 });
  await renderPerRequestWithoutCms();
  const entries = await sitemapEntries();
  const file = Number(match[1]);
  if (file > sitemapFileCount(entries.length)) return new Response('Not found', { status: 404 });
  return xmlResponse(urlsetXml(sitemapFile(entries, file)));
}
