import type { Media } from './cms-types';
import { mediaUrl } from './media';

export interface GalleryImage {
  src: string;
  alt: string;
  caption: string | null;
}

/** Product photos for the gallery: the cover first, then the gallery, each once. */
export function galleryImages(alt: string, cover: Media | null | undefined, gallery: Media[] = []): GalleryImage[] {
  const seen = new Set<string>();
  return [cover, ...gallery].flatMap((media) => {
    const src = mediaUrl(media?.url);
    if (!media || !src || seen.has(src)) return [];
    seen.add(src);
    return [{ src, alt: media.alternativeText?.trim() || alt, caption: media.caption }];
  });
}
