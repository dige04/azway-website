import { renderPerRequestWithoutCms } from '@/lib/build';
import { sitemapEntries, sitemapFileCount, sitemapIndexXml, urlsetXml, xmlResponse } from '@/lib/sitemap';

// SEO-03: cached like the pages (ISR); the CMS webhook refreshes it through the tags of its fetches.
export const revalidate = 3600;

/** Every published page, or an index of /sitemap-N.xml once there are more than SITEMAP_SIZE. */
export async function GET() {
  await renderPerRequestWithoutCms();
  const entries = await sitemapEntries();
  const files = sitemapFileCount(entries.length);
  return xmlResponse(files > 1 ? sitemapIndexXml(files) : urlsetXml(entries));
}
