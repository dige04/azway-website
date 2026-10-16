import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ContactLink } from '@/components/layout/ContactLink';
import { ProductCard, tourCard } from '@/components/ProductCard';
import { FilterApplyTracker, TourFilterForm, TourSortSelect } from '@/components/tour/TourFilterForm';
import { getSiteSetting, getTourCatalog } from '@/lib/cms';
import { telHref } from '@/lib/present';
import {
  conditionLabels,
  filterEventParams,
  filterTours,
  gateChoices,
  hasConditions,
  paginate,
  parseTourQuery,
  relaxations,
  tourHref,
  without,
  type ConditionKey,
  type TourQuery,
} from '@/lib/tour-filter';

// Rendered per request (the URL is the filter); the catalog fetch is cached by tag.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tour du lịch',
  description: 'Tour trong nước, tour Trung Quốc theo cửa khẩu và tour nước ngoài. Lọc theo loại, khu vực, thời lượng, số khách.',
  // SEO-06: every filtered URL points search engines at the list itself.
  alternates: { canonical: '/tour' },
};

type Labels = Partial<Record<ConditionKey, string>>;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseTourQuery(await searchParams);
  // The hotline is only for the empty state; without it the list still renders.
  const [catalog, setting] = await Promise.all([getTourCatalog(), getSiteSetting().catch(() => null)]);
  const gates = gateChoices(catalog);
  const found = filterTours(catalog, query);
  const { items, page, pageCount } = paginate(found, query.page);
  const labels = conditionLabels(query, gates);
  const href = tourHref({ ...query, page: undefined });

  return (
    <div className="bg-paper pb-section">
      <FilterApplyTracker href={href} params={filterEventParams(query, found.length)} />
      <section className="bg-white pb-8 pt-6 sm:pb-10">
        <div className="shell">
          <Breadcrumb items={[{ name: 'Tour du lịch' }]} />
          <p className="mb-3 mt-8 text-kicker font-extrabold text-red">TOUR DU LỊCH</p>
          <h1 className="text-[32px] font-bold leading-[1.08] tracking-[-0.05em] text-navy sm:text-[clamp(30px,3.1vw,44px)]">
            Tìm tour phù hợp với đoàn của bạn
          </h1>
          {/*
            Phones: a closed <details>, so the first screen reaches the results
            (the active chips stay in the result bar). From 640px the panel is
            always open; browsers without ::details-content keep the toggle.
            Keyed by the URL: fields show what the list shows, and the panel
            closes again after a filter is applied.
          */}
          <details
            key={href}
            className="group mt-7 rounded-panel border border-line bg-white shadow-sm sm:[&::details-content]:block sm:[&::details-content]:[content-visibility:visible]"
          >
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-[18px] font-bold text-navy supports-[selector(::details-content)]:sm:hidden [&::-webkit-details-marker]:hidden">
              Bộ lọc{Object.keys(labels).length > 0 && ` (${Object.keys(labels).length})`}
              <span aria-hidden="true" className="text-sm transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="px-[18px] pb-[18px] sm:p-6">
              <TourFilterForm query={query} gates={gates} />
            </div>
          </details>
        </div>
      </section>

      <section className="shell pt-8">
        <div className="mb-6 flex flex-col gap-3 rounded-button border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-1 font-bold text-navy" aria-live="polite">
              {found.length} tour
            </p>
            <ActiveConditions query={query} labels={labels} />
          </div>
          <TourSortSelect key={href} sort={query.sort} />
        </div>

        {items.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((tour) => (
                <ProductCard key={tour.documentId} product={tourCard(tour)} />
              ))}
            </div>
            <Pagination query={query} page={page} pageCount={pageCount} />
          </>
        ) : (
          <NoResults query={query} labels={labels} suggestions={relaxations(catalog, query)} phone={telHref(setting?.hotline)} hotline={setting?.hotline} />
        )}
      </section>
    </div>
  );
}

const chip = 'inline-flex min-h-9 items-center gap-1.5 rounded-sm bg-red-soft px-2.5 text-sm font-bold text-red-dark hover:bg-[#ffdce1]';

function ActiveConditions({ query, labels }: { query: TourQuery; labels: Labels }) {
  const active = Object.entries(labels) as [ConditionKey, string][];
  if (active.length === 0) return null;
  return (
    <>
      {active.map(([key, label]) => (
        <Link key={key} href={tourHref(without(query, key))} scroll={false} className={chip} aria-label={`Bỏ điều kiện ${label}`}>
          {label} <span aria-hidden="true">×</span>
        </Link>
      ))}
      <Link href={tourHref({ sort: query.sort })} scroll={false} className="text-sm font-bold text-navy underline underline-offset-4 hover:text-red">
        Xoá bộ lọc
      </Link>
    </>
  );
}

/** FR-SRC-05: which condition to drop (with what it brings back) and a call button. */
function NoResults({
  query,
  labels,
  suggestions,
  phone,
  hotline,
}: {
  query: TourQuery;
  labels: Labels;
  suggestions: { key: ConditionKey; count: number }[];
  phone: string | null;
  hotline: string | null | undefined;
}) {
  return (
    <div className="rounded-card border border-dashed border-[#bdc7d7] bg-white px-6 py-12 text-center sm:py-16">
      <h2 className="text-h3 font-bold text-navy">Chưa có tour khớp mọi điều kiện</h2>
      {suggestions.length > 0 ? (
        <>
          <p className="mt-3 text-muted">Thử bỏ bớt một điều kiện:</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {suggestions.map(({ key, count }) => (
              <li key={key}>
                <Link href={tourHref(without(query, key))} scroll={false} className={chip}>
                  Bỏ “{labels[key]}” → {count} tour
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-muted">{hasConditions(query) ? 'Thử bỏ bớt điều kiện lọc.' : 'Danh sách tour đang được cập nhật.'}</p>
      )}
      <p className="mt-6 text-muted">AZway có thể thiết kế tour riêng theo yêu cầu của đoàn.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {phone && (
          <ContactLink href={phone} event="click_call" className="inline-flex min-h-[52px] items-center rounded-button bg-red px-6 font-bold text-white shadow-red hover:bg-red-hover">
            Gọi {hotline}
          </ContactLink>
        )}
        {hasConditions(query) && (
          <Link href="/tour" className="inline-flex min-h-[52px] items-center rounded-button border border-line bg-white px-6 font-bold text-navy">
            Xem tất cả tour
          </Link>
        )}
      </div>
    </div>
  );
}

function Pagination({ query, page, pageCount }: { query: TourQuery; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Trang" className="mt-10 flex flex-wrap justify-center gap-2">
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
        <Link
          key={number}
          href={tourHref({ ...query, page: number })}
          aria-current={number === page ? 'page' : undefined}
          className={`grid size-11 place-items-center rounded-control border font-bold ${number === page ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:border-navy'}`}
        >
          {number}
        </Link>
      ))}
    </nav>
  );
}
