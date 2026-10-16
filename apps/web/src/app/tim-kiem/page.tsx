import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArticleCard } from '@/components/ArticleCard';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { cruiseCard, ProductCard, tourCard } from '@/components/ProductCard';
import { SearchBox } from '@/components/SearchBox';
import { getArticles, getCruises, getTourCatalog } from '@/lib/cms';
import { search, searchTerm, type SearchCatalogs } from '@/lib/search';
import { tourHref } from '@/lib/tour-filter';

/** Tours shown here; the rest are one click away on /tour, which pages them. */
const TOUR_LIMIT = 8;

export const metadata: Metadata = {
  title: 'Tìm kiếm',
  // Results pages are thin and endless (one per query): kept out of the index.
  robots: { index: false, follow: true },
};

// Rendered per request (it reads ?q=); the catalogs are cached fetches, so the query never reaches Strapi.
async function loadCatalogs(): Promise<SearchCatalogs> {
  const [tours, cruises, articles] = await Promise.all([
    getTourCatalog(),
    getCruises({ pageSize: 100 }).then((res) => res.data),
    getArticles({ pageSize: 100 }).then((res) => res.data),
  ]);
  return { tours, cruises, articles };
}

/** FR-SRC-03: tours, cruises and guide articles by name or code. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = searchTerm((await searchParams).q);
  const results = q ? search(q, await loadCatalogs()) : null;
  const total = results ? results.tours.length + results.cruises.length + results.articles.length : 0;

  return (
    <div className="shell pb-section pt-6 sm:pt-8">
      <Breadcrumb items={[{ name: 'Tìm kiếm' }]} className="mb-6" />
      <h1 className="text-[32px] font-bold leading-[1.08] tracking-[-0.05em] text-navy sm:text-[clamp(30px,3.1vw,44px)]">Bạn muốn khám phá điều gì?</h1>
      <SearchBox defaultValue={q} className="mt-6 max-w-[650px]" />

      {results && (
        <p role="status" className="mb-2 mt-8 border-b border-line pb-3 text-sm font-bold text-navy">
          {total > 0 ? `${total} kết quả cho “${q}”` : `Không tìm thấy kết quả cho “${q}”`}
        </p>
      )}
      {results && total === 0 && (
        <p className="mt-4 max-w-[640px] text-muted">
          Thử từ khóa ngắn hơn, tên điểm đến hoặc mã tour, hoặc{' '}
          <Link href="/tour" className="font-bold text-navy underline underline-offset-4">
            xem tất cả tour
          </Link>
          .
        </p>
      )}

      {results && results.tours.length > 0 && (
        <Group title="Tour" count={results.tours.length}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {results.tours.slice(0, TOUR_LIMIT).map((tour) => (
              <ProductCard key={tour.documentId} product={tourCard(tour)} />
            ))}
          </div>
          {results.tours.length > TOUR_LIMIT && (
            <Link href={tourHref({ q })} className="mt-6 inline-flex font-bold text-navy underline underline-offset-4 hover:text-red">
              Xem tất cả {results.tours.length} tour
            </Link>
          )}
        </Group>
      )}
      {results && results.cruises.length > 0 && (
        <Group title="Du thuyền" count={results.cruises.length}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {results.cruises.map((cruise) => (
              <ProductCard key={cruise.documentId} product={cruiseCard(cruise)} />
            ))}
          </div>
        </Group>
      )}
      {results && results.articles.length > 0 && (
        <Group title="Cẩm nang" count={results.articles.length}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.articles.map((article) => (
              <ArticleCard key={article.documentId} article={article} />
            ))}
          </div>
        </Group>
      )}

      {total === 0 && <FeaturedProducts title={results ? 'Có thể bạn quan tâm' : 'Sản phẩm nổi bật'} />}
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section aria-label={title} className="mt-10">
      <h2 className="mb-5 text-[24px] font-bold tracking-[-0.03em] text-navy">
        {title} <span className="text-base font-semibold text-muted">({count})</span>
      </h2>
      {children}
    </section>
  );
}
