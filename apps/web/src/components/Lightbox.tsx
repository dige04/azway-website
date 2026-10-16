'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { GalleryImage } from '@/lib/gallery';

/**
 * Full-screen photo viewer (native <dialog>: Esc closes, focus is trapped)
 * with previous/next by button or arrow key. Open while `index` is a number.
 */
export function Lightbox({ images, title, index, onIndex }: { images: GalleryImage[]; title: string; index: number | null; onIndex: (index: number | null) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const count = images.length;
  const step = (delta: number) => index !== null && onIndex((index + delta + count) % count);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (index !== null && !element.open) element.showModal();
    if (index === null && element.open) element.close();
  }, [index]);

  const current = index === null ? null : images[index];

  return (
    <dialog
      ref={dialog}
      aria-label={`Ảnh ${title}`}
      onClose={() => onIndex(null)}
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
            <button type="button" onClick={() => onIndex(null)} aria-label="Đóng ảnh phóng to" autoFocus className="grid size-11 place-items-center rounded-control bg-white/10 text-2xl hover:bg-white/20">
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
  );
}
