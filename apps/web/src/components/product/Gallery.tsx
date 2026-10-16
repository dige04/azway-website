'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Lightbox } from '@/components/Lightbox';
import type { GalleryImage } from '@/lib/gallery';

/**
 * FR-PRD-02 gallery: one large photo and up to four thumbnails; any photo
 * opens the lightbox on the whole set.
 */
export function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const count = images.length;
  const shown = images.slice(0, 5);

  return (
    <>
      <div className={`grid gap-2 ${shown.length > 1 ? 'md:grid-cols-[2fr_1fr]' : ''}`}>
        {shown.map((image, i) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Xem ảnh ${i + 1}/${count}: ${image.alt}`}
            className={`group relative overflow-hidden rounded-card bg-paper ${i === 0 ? 'aspect-[4/3] md:row-span-2 md:aspect-auto md:min-h-[420px]' : 'hidden aspect-[4/3] md:block'}`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={i === 0}
              sizes={i === 0 ? '(min-width: 901px) 60vw, 100vw' : '30vw'}
              className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
            />
            {i === 0 && count > 1 && (
              <span className="absolute bottom-3 right-3 rounded-sm bg-navy/80 px-2.5 py-1 text-xs font-bold text-white">{count} ảnh</span>
            )}
          </button>
        ))}
      </div>

      <Lightbox images={images} title={title} index={index} onIndex={setIndex} />
    </>
  );
}
