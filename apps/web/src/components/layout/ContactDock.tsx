'use client';

import type { SiteSetting } from '@/lib/cms-types';
import { safeHref, telHref } from '@/lib/present';
import { track, type TrackEvent } from '@/lib/track';

interface DockLink {
  href: string | null | undefined;
  label: string;
  event: TrackEvent | null;
  color: string;
  icon: string;
}

/**
 * Floating call / Messenger / Zalo / Facebook buttons (design `.contact-dock`):
 * a column at the bottom right on desktop, a full-width bar on phones.
 * Links come from site-setting; an empty field hides its button.
 */
export function ContactDock({ setting }: { setting: SiteSetting | null }) {
  const all: DockLink[] = [
    { href: telHref(setting?.hotline), label: 'Gọi ngay', event: 'click_call', color: 'bg-red-dark', icon: ICONS.call },
    { href: safeHref(setting?.messengerUrl), label: 'Messenger', event: 'click_messenger', color: 'bg-[#6039cf]', icon: ICONS.messenger },
    { href: safeHref(setting?.zaloUrl), label: 'Zalo', event: 'click_zalo', color: 'bg-[#0068d9]', icon: ICONS.zalo },
    { href: safeHref(setting?.facebookUrl), label: 'Facebook', event: null, color: 'bg-[#1454ac]', icon: ICONS.facebook },
  ];
  const links = all.filter((link) => link.href);
  if (links.length === 0) return null;

  return (
    <aside
      aria-label="Liên hệ AZway"
      className="fixed inset-x-0 bottom-0 z-50 grid auto-cols-fr grid-flow-col gap-1.5 border-t border-line bg-white px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 sm:inset-x-auto sm:bottom-6 sm:right-3.5 sm:grid-flow-row sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0"
    >
      {links.map((link) => {
        const external = !link.href!.startsWith('tel:');
        return (
          <a
            key={link.label}
            href={link.href!}
            {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
            onClick={link.event ? () => track(link.event!, { link_url: link.href! }) : undefined}
            className={`${link.color} flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-sm px-1 py-2 text-xs font-bold text-white shadow-sm sm:flex-row sm:gap-2 sm:rounded-button sm:px-4 sm:text-sm`}
          >
            <svg viewBox="0 0 24 24" className="size-[22px] shrink-0 sm:size-6" fill="currentColor" aria-hidden="true">
              <path d={link.icon} />
            </svg>
            {link.label}
          </a>
        );
      })}
    </aside>
  );
}

const ICONS = {
  call: 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z',
  messenger: 'M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.14 7.16V22l2.97-1.63c.89.25 1.84.38 2.89.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm1 12.96-2.55-2.72-4.97 2.72 5.47-5.8 2.6 2.71 4.92-2.71-5.47 5.8Z',
  zalo: 'M12 2C6.5 2 2 5.94 2 10.8c0 2.78 1.48 5.26 3.78 6.87L5 22l4.26-2.37c.88.2 1.8.3 2.74.3 5.5 0 10-3.94 10-8.8S17.5 2 12 2Zm-4.4 11.6H5.4l2.4-3.4H5.6V9h3.6l-2.4 3.4h1.8v1.2Zm4.4 0h-1.2V9H12v4.6Zm4.6 0h-3V9h1.2v3.4h1.8v1.2Z',
  facebook: 'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.5-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z',
};
