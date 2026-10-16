import type { Metadata } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import type { ReactNode } from 'react';
import { ContactDock } from '@/components/layout/ContactDock';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getSiteSetting } from '@/lib/cms';
import '@/styles/globals.css';

export const metadata: Metadata = {
  // Required by next.config.ts for production builds; dev falls back to local.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'AZway', template: '%s | AZway' },
};

/**
 * Contacts for header, footer and dock. `next build` prerenders /_not-found
 * through this layout; a build without CMS_URL (CI) renders it without
 * contacts instead of failing. With CMS_URL set, errors surface as usual.
 */
async function loadSiteSetting() {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD && !process.env.CMS_URL) return null;
  return getSiteSetting();
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const setting = await loadSiteSetting();
  return (
    <html lang="vi">
      <body className="pb-[82px] sm:pb-0">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-70 focus:rounded-control focus:bg-white focus:p-3">
          Bỏ qua menu
        </a>
        <SiteHeader setting={setting} />
        {children}
        <SiteFooter setting={setting} />
        <ContactDock setting={setting} />
      </body>
    </html>
  );
}
