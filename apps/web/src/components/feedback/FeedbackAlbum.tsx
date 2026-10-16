'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Lightbox } from '@/components/Lightbox';
import type { GalleryImage } from '@/lib/gallery';

const SHOWN = 4;

/** Up to four photos of a feedback album; any of them opens the whole album. */
export function FeedbackAlbum({ photos, title }: { photos: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const more = photos.length - SHOWN;
  return (
    <>
      <div className="grid grid-cols-2 gap-0.5">
        {photos.slice(0, SHOWN).map((photo, i) => (
          <button key={photo.src} type="button" onClick={() => setIndex(i)} aria-label={`Xem ảnh ${i + 1}/${photos.length}: ${photo.alt}`} className="relative aspect-[4/3] overflow-hidden bg-paper">
            <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1181px) 170px, 50vw" className="object-cover" />
            {i === SHOWN - 1 && more > 0 && (
              <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-navy/60 text-lg font-bold text-white">
                +{more} ảnh
              </span>
            )}
          </button>
        ))}
      </div>
      <Lightbox images={photos} title={title} index={index} onIndex={setIndex} />
    </>
  );
}
