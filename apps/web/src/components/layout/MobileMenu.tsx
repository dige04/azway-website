'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { safeHref, telHref } from '@/lib/present';
import { type Contacts, ContactLink } from './ContactLink';
import { NAV_ITEMS } from './nav';

/** Matches Tailwind `lg`, where the desktop nav takes over. */
const DESKTOP = '(min-width: 1181px)';

/** Hamburger + drawer under 1181px (design `.menu-btn` / `.mobile-drawer`). */
export function MobileMenu({ contacts }: { contacts: Contacts | null }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const tel = telHref(contacts?.hotline);
  const zalo = safeHref(contacts?.zaloUrl);

  /** Closing by keyboard or the button hands focus back to the button. */
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // While open: Escape closes, widening to desktop closes, the page behind
  // neither scrolls nor takes focus (`inert` on everything but the header).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close(true);
    const desktop = window.matchMedia(DESKTOP);
    const onWiden = () => desktop.matches && close(false);
    const overflow = document.body.style.overflow;
    const behind = [...document.body.children].filter(
      (element): element is HTMLElement => element instanceof HTMLElement && !element.contains(drawer.current),
    );

    document.body.style.overflow = 'hidden';
    behind.forEach((element) => (element.inert = true));
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onWiden);
    return () => {
      document.body.style.overflow = overflow;
      behind.forEach((element) => (element.inert = false));
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onWiden);
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

      <div ref={drawer} id="mobile-drawer" hidden={!open} className="fixed inset-x-0 bottom-0 top-header z-55 overflow-auto bg-white px-6 pb-32 pt-5 lg:hidden">
        <nav aria-label="Menu điện thoại">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex border-b border-line py-4 text-xl font-bold text-navy">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 grid grid-cols-1 gap-2.5 xs:grid-cols-2">
          {tel && (
            <ContactLink href={tel} event="click_call" className="flex justify-center rounded-control bg-navy p-3 font-bold text-white">
              {contacts?.hotline}
            </ContactLink>
          )}
          {zalo && (
            <ContactLink href={zalo} event="click_zalo" className="flex justify-center rounded-control bg-red p-3 font-bold text-white">
              Zalo AZway
            </ContactLink>
          )}
        </div>
      </div>
    </>
  );
}
