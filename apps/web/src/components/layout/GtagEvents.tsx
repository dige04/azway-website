'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { TrackEvent } from '@/lib/track';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Query parameters GA4 never sees: people type phone numbers into search. */
const PRIVATE_PARAMS = ['q'];

function withoutPrivateParams(href: string): string {
  try {
    const url = new URL(href);
    for (const name of PRIVATE_PARAMS) url.searchParams.delete(name);
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

function gtag(...args: unknown[]): void {
  if (!window.gtag) {
    window.dataLayer = window.dataLayer ?? [];
    // gtag.js reads Arguments objects from dataLayer, not arrays.
    window.gtag = function () {
      window.dataLayer!.push(arguments);
    };
  }
  window.gtag(...args);
}

/**
 * Sends a page_view per route change and every track() event. Page views are
 * sent here, not by gtag, so that page_location and page_referrer (which
 * every later event carries too) never hold the search term. In GA4, turn off
 * Enhanced measurement > "Page changes based on browser history events".
 */
export function GtagEvents({ id }: { id: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    gtag('js', new Date());
    gtag('config', id, { send_page_view: false });
    const forward = (event: Event) => {
      const { event: name, ...params } = (event as CustomEvent<{ event: TrackEvent } & Record<string, string>>).detail;
      gtag('event', name, params);
    };
    window.addEventListener('azway:track', forward);
    return () => window.removeEventListener('azway:track', forward);
  }, [id]);

  useEffect(() => {
    const location = withoutPrivateParams(window.location.href);
    const referrer = previous.current ?? withoutPrivateParams(document.referrer);
    previous.current = location;
    gtag('set', { page_location: location, page_referrer: referrer });
    gtag('event', 'page_view');
  }, [pathname, search]);

  return null;
}
