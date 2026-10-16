import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

// Origins that may serve images: R2 public domain in production, Strapi's
// own /uploads when it stores files locally (dev).
const imageOrigins = [process.env.CMS_MEDIA_URL, process.env.CMS_URL].filter(
  (value): value is string => Boolean(value),
);

type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number];

// Read at build time: set CMS_URL / CMS_MEDIA_URL in the build environment.
const remotePatterns: RemotePattern[] = imageOrigins.map((origin) => {
  const url = new URL(origin);
  return {
    protocol: url.protocol.replace(':', '') as 'http' | 'https',
    hostname: url.hostname,
    port: url.port,
    pathname: '/**',
  };
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;

// Gives `next dev` access to the Cloudflare bindings in wrangler.jsonc.
initOpenNextCloudflareForDev();
