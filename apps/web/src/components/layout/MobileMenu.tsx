'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { SiteSetting } from '@/lib/cms-types';
import { safeHref, telHref } from '@/lib/present';
import { NAV_ITEMS } from './nav';

/** Hamburger + drawer under 1181px (design `.menu-btn` / `.mobile-drawer`). */
export function MobileMenu({ setting }: { setting: SiteSetting | null }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const tel = telHref(setting?.hotline);
  const zalo = safeHref(setting?.zaloUrl);

  /** Closing by keyboard or the button hands focus back to the button. */
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);
  // While open: Escape closes, the page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close(true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-controls="mobile-drawer"
        aria-expanded={open}
        aria-label={open ? 'Đóng menu' : 'Mở menu'}
        onClick={() => (open ? close(true) : setOpen(true))}
        className="grid size-[46px] place-items-center rounded-[11px] border border-line bg-white lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="size-5 text-navy" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M3 6h18M8 12h13M3 18h18" />}
        </svg>
      </button>

      <div id="mobile-drawer" hidden={!open} className="fixed inset-x-0 bottom-0 top-header z-55 overflow-auto bg-white px-6 pb-32 pt-5 lg:hidden">
        <nav aria-label="Menu điện thoại">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex border-b border-line py-4 text-xl font-bold text-navy">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 grid grid-cols-1 gap-2.5 xs:grid-cols-2">
          {tel && (
            <a href={tel} className="flex justify-center rounded-control bg-navy p-3 font-bold text-white">
              {setting?.hotline}
            </a>
          )}
          {zalo && (
            <a href={zalo} target="_blank" rel="noopener noreferrer" className="flex justify-center rounded-control bg-red p-3 font-bold text-white">
              Zalo AZway
            </a>
          )}
        </div>
      </div>
    </>
  );
}
