'use client';

import { useEffect } from 'react';
import { ATTRIBUTION_MAX_AGE, LANDING_COOKIE, UTM_COOKIE, UTM_KEYS } from '@/lib/lead';

const MAX_LENGTH = 1000;

/**
 * FR-LEAD-07: on the first visit, remembers the landing page and the UTM
 * tags of the URL for 30 days (cookies, so pages can stay cached); a lead
 * sent later carries them. Never overwritten: first touch wins.
 */
export function AttributionCookies() {
  useEffect(() => {
    const has = (name: string) => document.cookie.split('; ').some((cookie) => cookie.startsWith(`${name}=`));
    const set = (name: string, value: string) => {
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${name}=${encodeURIComponent(value.slice(0, MAX_LENGTH))}; Max-Age=${ATTRIBUTION_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    };

    if (!has(LANDING_COOKIE)) set(LANDING_COOKIE, location.pathname + location.search);
    const params = new URLSearchParams(location.search);
    const utm = Object.fromEntries(UTM_KEYS.flatMap((key) => (params.get(key) ? [[key, params.get(key)!.slice(0, 200)]] : [])));
    if (!has(UTM_COOKIE) && Object.keys(utm).length > 0) set(UTM_COOKIE, JSON.stringify(utm));
  }, []);
  return null;
}
