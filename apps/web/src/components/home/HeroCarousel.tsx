'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isExternalUrl } from '@/lib/present';

export interface Slide {
  src: string;
  alt: string;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

const AUTOPLAY_MS = 6000;

/**
 * Design `.azh-*` carousel without a library: native scroll-snap (swipe and
 * keyboard scrolling for free), dots, arrows and an autoplay that pauses on
 * hover/focus, can be stopped, and never starts under prefers-reduced-motion.
 */
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const element = track.current;
      if (!element) return;
      const target = (index + slides.length) % slides.length;
      element.scrollTo({ left: target * element.clientWidth, behavior: reducedMotion ? 'auto' : 'smooth' });
    },
    [slides.length, reducedMotion],
  );

  const autoplay = playing && !hovered && !reducedMotion && slides.length > 1;
  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => goTo(current + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoplay, current, goTo]);

  const onScroll = () => {
    const element = track.current;
    if (element) setCurrent(Math.round(element.scrollLeft / element.clientWidth));
  };

  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Hình ảnh nổi bật"
      className="w-full min-w-0 self-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div className="relative isolate overflow-hidden rounded-[14px] border border-white/15 bg-navy-2 shadow-[0_16px_38px_#030c2126] sm:rounded-[19px]">
        <div
          ref={track}
          onScroll={onScroll}
          tabIndex={0}
          aria-label="Trượt để xem ảnh"
          className="flex h-[210px] snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] xs:h-[270px] md:h-[clamp(255px,22vw,306px)] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide, index) => (
            <figure
              key={`${index}-${slide.src}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${slides.length}`}
              aria-hidden={index !== current}
              className="relative m-0 h-full min-w-0 flex-[0_0_100%] snap-start snap-always overflow-hidden"
            >
              <Image src={slide.src} alt={slide.alt} fill priority={index === 0} sizes="(min-width: 901px) 45vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-[#06142ecc] via-transparent to-transparent" aria-hidden="true" />
              {(slide.title || slide.subtitle || (slide.ctaLabel && slide.ctaUrl)) && (
                <figcaption className="absolute inset-x-[18px] bottom-[18px] z-10 grid gap-1 text-white sm:inset-x-[22px] sm:bottom-[22px]">
                  {slide.title && <strong className="line-clamp-2 text-2xl leading-tight sm:text-[30px]">{slide.title}</strong>}
                  {slide.subtitle && <span className="hidden text-[13px] text-white/85 xs:line-clamp-2">{slide.subtitle}</span>}
                  {slide.ctaLabel && slide.ctaUrl && <SlideLink url={slide.ctaUrl} label={slide.ctaLabel} hidden={index !== current} />}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
        {slides.length > 1 && (
          <span className="pointer-events-none absolute right-3.5 top-3.5 z-20 rounded-[7px] border border-white/20 bg-[#08193288] px-2.5 py-1.5 text-[11px] font-bold tabular-nums tracking-wider text-white">
            {pad(current + 1)} / {pad(slides.length)}
          </span>
        )}
      </div>

      {slides.length > 1 && (
        <div className="flex h-[52px] items-center justify-between gap-2 pt-1.5 text-[#c7d4f0]">
          <div className="flex items-center">
            {slides.map((slide, index) => (
              <button
                key={`${index}-${slide.src}`}
                type="button"
                aria-label={slide.title ?? `Ảnh ${index + 1}`}
                aria-current={index === current}
                onClick={() => goTo(index)}
                className="grid h-10 w-[25px] place-items-center"
              >
                <span className={`block h-[5px] rounded-full transition-all ${index === current ? 'w-[18px] bg-[#ff6074]' : 'w-[5px] bg-white/45'}`} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowButton label="Ảnh trước" path="m14 6-6 6 6 6" onClick={() => goTo(current - 1)} />
            {!reducedMotion && (
              <ArrowButton
                label={playing ? 'Dừng tự chạy' : 'Tự chạy ảnh'}
                path={playing ? 'M9 5v14M15 5v14' : 'm8 5 11 7-11 7Z'}
                onClick={() => setPlaying((value) => !value)}
              />
            )}
            <ArrowButton label="Ảnh tiếp theo" path="m10 6 6 6-6 6" onClick={() => goTo(current + 1)} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Internal paths use next/link; https:// links leave the site safely. */
function SlideLink({ url, label, hidden }: { url: string; label: string; hidden: boolean }) {
  const className = 'mt-2 inline-flex min-h-10 w-fit items-center rounded-control bg-red px-4 text-sm font-bold text-white hover:bg-red-hover';
  const tabIndex = hidden ? -1 : undefined;
  if (isExternalUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className} tabIndex={tabIndex}>
        {label}
      </a>
    );
  }
  return (
    <Link href={url} className={className} tabIndex={tabIndex}>
      {label}
    </Link>
  );
}

function ArrowButton({ label, path, onClick }: { label: string; path: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-[35px] place-items-center rounded-[9px] border border-white/20 bg-white/5 p-2 text-white hover:bg-white/15"
    >
      <svg viewBox="0 0 24 24" className="size-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
    </button>
  );
}
