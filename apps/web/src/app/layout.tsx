import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ContactDock } from '@/components/layout/ContactDock';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { loadSiteSetting } from '@/lib/site-setting';
import '@/styles/globals.css';

export const metadata: Metadata = {
  // Required by next.config.ts for production builds; dev falls back to local.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'AZway', template: '%s | AZway' },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const setting = await loadSiteSetting();
  const contacts = setting && {
    hotline: setting.hotline,
    zaloUrl: setting.zaloUrl,
    messengerUrl: setting.messengerUrl,
    facebookUrl: setting.facebookUrl,
  };
  return (
    <html lang="vi">
      <body className="pb-[82px] sm:pb-0">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-70 focus:rounded-control focus:bg-white focus:p-3">
          Bỏ qua menu
        </a>
        <SiteHeader contacts={contacts} />
        <main id="main">{children}</main>
        <SiteFooter setting={setting} />
        <ContactDock contacts={contacts} />
      </body>
    </html>
  );
}
