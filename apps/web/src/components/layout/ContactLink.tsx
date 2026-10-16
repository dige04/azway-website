'use client';

import type { ReactNode } from 'react';
import { track, type TrackEvent } from '@/lib/track';

/** The contact fields client components need (not the whole site-setting). */
export interface Contacts {
  hotline: string | null;
  zaloUrl: string | null;
  messengerUrl: string | null;
  facebookUrl: string | null;
}

/**
 * Every call / Zalo / Messenger link on the site (AN-03): fires its event on
 * click; links leaving the site open in a new tab. `href` must already be safe
 * (telHref / safeHref).
 */
export function ContactLink({ href, event, className, children }: { href: string; event: TrackEvent | null; className?: string; children: ReactNode }) {
  const external = !href.startsWith('tel:');
  return (
    <a
      href={href}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      onClick={event ? () => track(event, { link_url: href }) : undefined}
      className={className}
    >
      {children}
    </a>
  );
}
