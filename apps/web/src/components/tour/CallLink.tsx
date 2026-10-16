'use client';

import type { ReactNode } from 'react';
import { track } from '@/lib/track';

/** `tel:` link that reports AN-03 `click_call`, like the contact dock. */
export function CallLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} onClick={() => track('click_call', { link_url: href })} className={className}>
      {children}
    </a>
  );
}
