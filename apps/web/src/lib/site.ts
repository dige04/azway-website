export const SITE_NAME = 'AZway';

/** Staging demo (docs/STAGING.md): SITE_NOINDEX=1 at build keeps the whole site out of search engines. */
export const isNoindexSite = (): boolean => process.env.SITE_NOINDEX === '1';

/** Absolute URL on this site, from NEXT_PUBLIC_SITE_URL (required for production builds, next.config.ts). */
export function siteUrl(path = '/'): string {
  return new URL(path, process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').toString();
}

/**
 * The canonical form of a site path or an editor's canonical URL: absolute,
 * no trailing slash (Next redirects `/tour/a/` to `/tour/a`). Null when it
 * is blank (it would resolve to the home page) or does not parse: the CMS
 * only checks `^https://\S+`, so `https://[` gets in.
 */
export function canonicalUrl(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(text, siteUrl());
  } catch {
    return null;
  }
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
  return url.href;
}
