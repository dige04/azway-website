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

export default function config(phase: string): NextConfig {
  // Read at build time (see ARCHITECTURE "Biến môi trường"): NEXT_PUBLIC_* is
  // inlined into the bundle and remotePatterns is fixed in the build output.
  const siteUrl = originFrom('NEXT_PUBLIC_SITE_URL');
  const cms = originFrom('CMS_URL');
  const media = originFrom('CMS_MEDIA_URL');
  if (phase === PHASE_PRODUCTION_BUILD && !siteUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL is required for a production build (canonical URLs, sitemap)');
  }

  // Images: the R2 public domain in production, Strapi's own /uploads when it
  // stores files locally.
  const remotePatterns = [
    ...(media ? [toPattern(media, '/**')] : []),
    ...(cms ? [toPattern(cms, '/uploads/**')] : []),
  ];

  return {
    images: {
      remotePatterns,
      formats: ['image/avif', 'image/webp'],
      // `next dev` refuses upstream images on private IPs; allow it only for a
      // local Strapi in dev. Workers builds use the Images binding instead.
      dangerouslyAllowLocalIP:
        phase === PHASE_DEVELOPMENT_SERVER && [cms, media].some((url) => url && LOCAL_HOSTS.has(url.hostname)),
    },
  };
}

// Gives `next dev` access to the Cloudflare bindings in wrangler.jsonc.
initOpenNextCloudflareForDev();
