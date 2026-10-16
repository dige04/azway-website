import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { siteUrl } from '@/lib/site';

export interface Crumb {
  name: string;
  /** Site path; omit for the current page (last crumb). */
  href?: string;
}

const HOME: Crumb = { name: 'Trang chủ', href: '/' };

/** FR-GEN-04 trail on listing, detail and article pages, with its BreadcrumbList (SEO-04). "Trang chủ" is added. */
export function Breadcrumb({ items, className = '' }: { items: Crumb[]; className?: string }) {
  const trail = [HOME, ...items];
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <JsonLd data={breadcrumbJsonLd(trail)} />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={`${index}-${crumb.name}`} className="flex items-center gap-2">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="hover:text-red">
                  {crumb.name}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="font-semibold text-navy">
                  {crumb.name}
                </span>
              )}
              {!last && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** schema.org BreadcrumbList of the visible trail; the current page (no href) is the last item, without a URL. */
function breadcrumbJsonLd(trail: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.href && { item: siteUrl(crumb.href) }),
    })),
  };
}
