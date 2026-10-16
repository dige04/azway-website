import type { Media } from './cms-types';

/**
 * Absolute URL for a Strapi media `url`. The R2 provider already stores
 * absolute URLs (CMS_MEDIA_URL); Strapi's local provider stores `/uploads/...`
 * relative to the CMS itself.
 */
export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  const base = process.env.CMS_URL;
  if (!base) throw new Error('CMS_URL is not set');
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

/**
 * Props for next/image. Resizing and AVIF/WebP happen in /_next/image through
 * the Cloudflare Images binding (wrangler.jsonc), so the original file is used.
 */
export function imageProps(media: Media | null | undefined, fallbackAlt = '') {
  const src = mediaUrl(media?.url);
  if (!media || !src) return null;
  return {
    src,
    alt: media.alternativeText ?? fallbackAlt,
    width: media.width ?? undefined,
    height: media.height ?? undefined,
  };
}
