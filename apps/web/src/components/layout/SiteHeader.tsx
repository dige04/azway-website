import Image from 'next/image';
import Link from 'next/link';
import { telHref } from '@/lib/present';
import { type Contacts, ContactLink } from './ContactLink';
import { MobileMenu } from './MobileMenu';
import { NAV_ITEMS, SEARCH_HREF } from './nav';

export function SiteHeader({ contacts }: { contacts: Contacts | null }) {
  const tel = telHref(contacts?.hotline);

  return (
    // The blur sits on its own layer: backdrop-filter on the header itself would
    // make it the containing block of the drawer's `position: fixed`.
    <header className="sticky top-0 z-60 border-b border-navy/10">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-white/96 backdrop-blur-lg" />
      <div className="shell grid min-h-header grid-cols-[auto_1fr_auto] items-center gap-5">
        <Link href="/" aria-label="AZway trang chủ" className="flex items-center">
          <Image src="/logo-azway.png" alt="AZway Travel Agency" width={720} height={216} priority className="h-auto w-[145px] sm:w-[180px]" />
        </Link>

        <nav aria-label="Menu chính" className="hidden h-full items-stretch justify-center gap-[clamp(12px,1.55vw,27px)] lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center whitespace-nowrap text-sm font-semibold text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:origin-left after:scale-x-0 after:bg-red after:transition-transform hover:after:scale-x-100 focus-visible:after:scale-x-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-self-end gap-3">
          <Link href={SEARCH_HREF} aria-label="Tìm kiếm" className="grid size-11 place-items-center rounded-control border border-line text-navy hover:border-navy">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>
          {tel && (
            <ContactLink href={tel} event="click_call" className="hidden min-h-11 items-center rounded-control bg-red px-4 text-[13px] font-bold text-white shadow-red hover:bg-red-dark lg:inline-flex">
              {contacts?.hotline}
            </ContactLink>
          )}
          <MobileMenu contacts={contacts} />
        </div>
      </div>
    </header>
  );
}
