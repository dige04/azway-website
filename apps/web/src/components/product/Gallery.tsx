'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { GalleryImage } from '@/lib/gallery';

/**
 * FR-PRD-02 gallery: one large photo and up to four thumbnails; any photo
 * opens a lightbox (native <dialog>: Esc closes, focus is trapped) with
 * previous/next by button or arrow key.
 */
export function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const count = images.length;
  const step = (delta: number) => setIndex((value) => (value === null ? value : (value + delta + count) % count));

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (index !== null && !element.open) element.showModal();
    if (index === null && element.open) element.close();
  }, [index]);

  const shown = images.slice(0, 5);
  const current = index === null ? null : images[index];

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

      <dialog
        ref={dialog}
        aria-label={`Ảnh ${title}`}
        onClose={() => setIndex(null)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') step(1);
          if (event.key === 'ArrowLeft') step(-1);
        }}
        className="m-auto h-dvh max-h-none w-screen max-w-none bg-[#07122bf2] p-0 text-white backdrop:bg-transparent"
      >
        {current && (
          <div className="grid h-full grid-rows-[auto_1fr_auto]">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span aria-live="polite" className="text-sm font-bold tabular-nums">
                {(index ?? 0) + 1} / {count}
              </span>
              <button type="button" onClick={() => setIndex(null)} aria-label="Đóng ảnh phóng to" autoFocus className="grid size-11 place-items-center rounded-control bg-white/10 text-2xl hover:bg-white/20">
                ×
              </button>
            </div>
            <figure className="relative m-0 min-h-0">
              <Image src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" />
            </figure>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              {count > 1 ? (
                <button type="button" onClick={() => step(-1)} aria-label="Ảnh trước" className="grid size-11 place-items-center rounded-control bg-white/10 hover:bg-white/20">
                  ‹
                </button>
              ) : (
                <span />
              )}
              <p className="text-center text-xs text-white/75">{current.caption ?? current.alt}</p>
              {count > 1 ? (
                <button type="button" onClick={() => step(1)} aria-label="Ảnh tiếp theo" className="grid size-11 place-items-center rounded-control bg-white/10 hover:bg-white/20">
                  ›
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
