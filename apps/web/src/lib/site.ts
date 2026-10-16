export const SITE_NAME = 'AZway';

/** Absolute URL on this site, from NEXT_PUBLIC_SITE_URL (required for production builds, next.config.ts). */
export function siteUrl(path = '/'): string {
  return new URL(path, process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').toString();
}
