import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ContactDock } from '@/components/layout/ContactDock';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { isBuildWithoutCms } from '@/lib/build';
import { getSiteSetting } from '@/lib/cms';
import '@/styles/globals.css';

export const metadata: Metadata = {
  // Required by next.config.ts for production builds; dev falls back to local.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'AZway', template: '%s | AZway' },
};

/**
 * Contacts for header, footer and dock (all render without them). A CMS that
 * is down or slow must not turn every route, /lien-he and the 404 page
 * included, into a 500, so a failure is logged and the shell renders without
 * contacts. A build without CMS_URL (CI) skips the request.
 */
async function loadSiteSetting() {
  if (isBuildWithoutCms()) return null;
  try {
    return await getSiteSetting();
  } catch (error) {
    console.error('[layout] site-setting unavailable, rendering without contacts:', error instanceof Error ? error.message : error);
    return null;
  }
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
        <main id="main">{children}</main>
        <SiteFooter setting={setting} />
        <ContactDock setting={setting} />
      </body>
    </html>
  );
}
