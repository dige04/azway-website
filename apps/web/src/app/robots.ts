import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

/** SEO-03: everything public is crawlable; the API is not a page. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: siteUrl('/sitemap.xml'),
  };
}
