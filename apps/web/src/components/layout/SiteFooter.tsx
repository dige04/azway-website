import Image from 'next/image';
import Link from 'next/link';
import type { SiteSetting } from '@/lib/cms-types';
import { hasContent, safeHref } from '@/lib/present';
import { NAV_ITEMS } from './nav';

const PRODUCT_LINKS = NAV_ITEMS.slice(0, 4);
const INFO_LINKS = NAV_ITEMS.slice(4);

const linkClass = 'block py-1 text-[13px] text-[#c0cbe2] hover:text-[#ff6d7d]';
const siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').host;

export function SiteFooter({ setting }: { setting: SiteSetting | null }) {
  const zalo = safeHref(setting?.zaloUrl);
  const social = [
    { label: 'Facebook', href: safeHref(setting?.facebookUrl) },
    { label: 'YouTube', href: safeHref(setting?.youtubeUrl) },
    { label: 'TikTok', href: safeHref(setting?.tiktokUrl) },
  ].filter((item): item is { label: string; href: string } => item.href !== null);

  return (
    <footer className="bg-navy-deep pb-6 pt-[70px] text-[#c0cbe2]">
      <div className="shell">
        <div className="grid grid-cols-1 gap-11 xs:grid-cols-2 md:grid-cols-[1.2fr_1fr_1fr] lg:grid-cols-[1.4fr_0.75fr_0.75fr_0.8fr]">
          <div className="xs:col-span-2 md:col-span-3 lg:col-span-1">
            <Image src="/logo-azway.png" alt="AZway" width={720} height={216} className="h-auto w-[210px] brightness-0 invert" />
            <h3 className="mb-3 mt-5 text-sm font-bold text-white">CÔNG TY CỔ PHẦN AZWAY VIỆT NAM</h3>
            {setting?.address?.split('\n').filter(hasContent).map((line, index) => (
              <p key={index} className="my-2 max-w-[500px] text-[13px]">
                {line}
              </p>
            ))}
          </div>

          <FooterColumn title="Dòng sản phẩm">
            {PRODUCT_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass}>
                {item.label}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title="Thông tin chung">
            {INFO_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass}>
                {item.label}
              </Link>
            ))}
            {social.map((item) => (
              <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {item.label}
              </a>
            ))}
          </FooterColumn>

          <FooterColumn title="Liên hệ AZway">
            {setting?.hotline && <strong className="mb-2 block text-[22px] text-white">{setting.hotline}</strong>}
            {setting?.email && (
              <a href={`mailto:${setting.email}`} className={linkClass}>
                {setting.email}
              </a>
            )}
            {zalo && (
              <a href={zalo} target="_blank" rel="noopener noreferrer" className={linkClass}>
                Zalo {setting.hotline}
              </a>
            )}
          </FooterColumn>
        </div>

        <div className="mt-11 flex flex-col justify-between gap-2 border-t border-white/12 pt-5 text-xs sm:flex-row">
          <span>© {new Date().getFullYear()} AZway. Bảo lưu mọi quyền.</span>
          <span>{siteHost}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-bold text-white">{title}</h3>
      {children}
    </div>
  );
}
