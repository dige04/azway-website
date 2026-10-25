import type { MetadataRoute } from 'next';
import { isNoindexSite, siteUrl } from '@/lib/site';

/** SEO-03: everything public is crawlable; the API is not a page. Staging: nothing is. */
export default function robots(): MetadataRoute.Robots {
  if (isNoindexSite()) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: siteUrl('/sitemap.xml'),
  };
}
