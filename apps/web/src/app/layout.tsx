import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { JsonLd } from '@/components/JsonLd';
import { ContactDock } from '@/components/layout/ContactDock';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { PAGE_IDS } from '@/lib/page-ids';
import { SITE_NAME, siteUrl } from '@/lib/site';
import { loadSiteSetting } from '@/lib/site-setting';
import { travelAgency } from '@/lib/structured-data';
import '@/styles/globals.css';

export const metadata: Metadata = {
  // Required by next.config.ts for production builds; dev falls back to local.
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  // Pages set the full set through lib/seo pageMetadata; these cover the rest (404).
  openGraph: { siteName: SITE_NAME, locale: 'vi_VN', type: 'website' },
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
        <a href={`#${PAGE_IDS.main}`} className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-70 focus:rounded-control focus:bg-white focus:p-3">
          Bỏ qua menu
        </a>
        <JsonLd data={travelAgency(setting)} />
        <SiteHeader contacts={contacts} />
        <main id={PAGE_IDS.main}>{children}</main>
        <SiteFooter setting={setting} />
        <ContactDock contacts={contacts} />
      </body>
    </html>
  );
}
