import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';

type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Parses an origin env var; a malformed value fails the build with its name. */
function originFrom(name: string): URL | null {
  const value = process.env[name];
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url;
  } catch {
    // reported below
  }
  throw new Error(`${name} must be an absolute http(s) URL, got "${value}"`);
}

const toPattern = (url: URL, pathname: string): RemotePattern => ({
  protocol: url.protocol.replace(':', '') as 'http' | 'https',
  hostname: url.hostname,
  port: url.port,
  pathname,
});

// GA4 (AN-01): gtag.js and its collection endpoints, per Google's CSP guide.
const GA = {
  script: 'https://www.googletagmanager.com',
  connect: 'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com',
  img: 'https://*.google-analytics.com https://*.googletagmanager.com',
};

/**
 * NFR-08, on every response (pages and /api). The CSP is one static header so
 * pages stay ISR (NFR-03): App Router streams each page's data in inline
 * scripts that change per page and per revalidation, and a nonce would make
 * every page render per request. So inline scripts are allowed ('unsafe-inline');
 * the CSP still blocks scripts from any other origin, plugins, <base>
 * hijacking, form posts elsewhere and framing. JSON-LD is not executed and
 * Zalo/Messenger are plain links, so neither needs an entry.
 */
function securityHeaders({ dev, https, images }: { dev: boolean; https: boolean; images: string[] }) {
  const csp = [
    "default-src 'self'",
    // React needs eval in dev only.
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} ${GA.script}`,
    // style="" attributes (next/image, the filter selects).
    "style-src 'self' 'unsafe-inline'",
    ['img-src', "'self'", 'data:', 'blob:', ...images, GA.img].join(' '),
    "font-src 'self'",
    `connect-src 'self' ${GA.connect}${dev ? ' ws:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ...(https ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
  ];
}

export default function config(phase: string): NextConfig {
  // Read at build time (see ARCHITECTURE "Biến môi trường"): NEXT_PUBLIC_* is
  // inlined into the bundle and remotePatterns is fixed in the build output.
  const siteUrl = originFrom('NEXT_PUBLIC_SITE_URL');
  const cms = originFrom('CMS_URL');
  const media = originFrom('CMS_MEDIA_URL');
  if (phase === PHASE_PRODUCTION_BUILD && !siteUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL is required for a production build (canonical URLs, sitemap)');
  }
  // Without CMS_URL every CMS page renders per request (src/lib/build.ts) and
  // images from the CMS are refused: only CI's type/build check may do that.
  if (phase === PHASE_PRODUCTION_BUILD && !cms && process.env.BUILD_WITHOUT_CMS !== '1') {
    throw new Error('CMS_URL is required for a production build (set BUILD_WITHOUT_CMS=1 only for a CI check build)');
  }

  // Images: the R2 public domain in production, Strapi's own /uploads when it
  // stores files locally.
  const remotePatterns = [
    ...(media ? [toPattern(media, '/**')] : []),
    ...(cms ? [toPattern(cms, '/uploads/**')] : []),
  ];

  const headers = securityHeaders({
    dev: phase === PHASE_DEVELOPMENT_SERVER,
    https: siteUrl?.protocol === 'https:',
    images: [media, cms].flatMap((url) => (url ? [url.origin] : [])),
  });

  return {
    headers: async () => [{ source: '/:path*', headers }],
    images: {
      remotePatterns,
      formats: ['image/avif', 'image/webp'],
      // `next dev` refuses upstream images on private IPs; allow it only for a
      // local Strapi in dev. Workers builds use the Images binding instead.
      dangerouslyAllowLocalIP:
        phase === PHASE_DEVELOPMENT_SERVER && [cms, media].some((url) => url && LOCAL_HOSTS.has(url.hostname)),
    },
    // Child sitemaps sit at the root: a sitemap may only list URLs under its
    // own directory. App Router has no `sitemap-[n].xml` segment.
    rewrites: async () => [{ source: '/sitemap-:file(\\d+).xml', destination: '/sitemap/:file' }],
  };
}

// Gives `next dev` access to the Cloudflare bindings in wrangler.jsonc.
initOpenNextCloudflareForDev();
