import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { Breadcrumb, type Crumb } from '@/components/Breadcrumb';
import { getArticleCategories, getArticleCategoryBySlug, getArticles } from '@/lib/cms';
import { pageFromSegment, pageHref } from '@/lib/pagination';
import { isStrapiSlug } from '@/lib/present';

const PAGE_SIZE = 9;
const ALL = { title: 'Cẩm nang du lịch', description: 'Kinh nghiệm, gợi ý lịch trình và lưu ý cho chuyến đi của bạn và đoàn.' };

/** The list a route shows: all guide articles, or one category; `page` from a `trang/[page]` segment. */
export interface GuideListParams {
  category?: string;
  page?: string;
}

async function resolve({ category, page: segment }: GuideListParams) {
  const page = segment === undefined ? 1 : pageFromSegment(segment);
  if (page === null) notFound();
  if (category === undefined) return { page, category: null, base: '/cam-nang' };
  if (!isStrapiSlug(category)) notFound();
  const found = await getArticleCategoryBySlug(category);
  if (!found) notFound();
  return { page, category: found, base: `/cam-nang/danh-muc/${found.slug}` };
}

export async function guideListMetadata(params: GuideListParams): Promise<Metadata> {
  const { page, category, base } = await resolve(params);
  const title = category ? category.seo?.metaTitle || `${category.name} – Cẩm nang` : ALL.title;
  return {
    title: page > 1 ? `${title} – Trang ${page}` : title,
    description: (category ? category.seo?.metaDescription || category.description : ALL.description) ?? undefined,
    // Each page has its own articles, so its own canonical (only filters point at the base, SEO-06).
    alternates: { canonical: pageHref(base, page) },
  };
}

/** FR-BLG-01: guide articles, newest first, by category, paged. */
export async function GuideList(params: GuideListParams) {
  const { page, category, base } = await resolve(params);
  const [articles, categories] = await Promise.all([
    getArticles({ category: category?.slug, page, pageSize: PAGE_SIZE }),
    getArticleCategories(),
  ]);
  const { pageCount = 1, total = articles.data.length } = articles.meta?.pagination ?? {};
  if (page > 1 && page > pageCount) notFound();

  const crumbs: Crumb[] = category ? [{ name: 'Cẩm nang', href: '/cam-nang' }, { name: category.name }] : [{ name: 'Cẩm nang' }];
  return (
    <div className="shell pb-section pt-6 sm:pt-8">
      <Breadcrumb items={crumbs} className="mb-6" />
      <h1 className="font-serif text-[34px] font-bold leading-[1.15] tracking-[-0.035em] text-navy sm:text-[clamp(38px,3.4vw,50px)]">
        {category?.name ?? ALL.title}
      </h1>
      <p className="mt-3 max-w-[640px] text-muted">{category ? category.description : ALL.description}</p>

      {categories.data.length > 0 && (
        <nav aria-label="Chuyên mục" className="mt-7 flex flex-wrap gap-2">
          {[{ name: 'Tất cả', href: '/cam-nang', current: !category }, ...categories.data.map((item) => ({ name: item.name, href: `/cam-nang/danh-muc/${item.slug}`, current: item.slug === category?.slug }))].map(
            (item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.current ? 'page' : undefined}
                className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-bold ${item.current ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:border-navy'}`}
              >
                {item.name}
              </Link>
            ),
          )}
        </nav>
      )}

      <p className="mb-5 mt-8 border-b border-line pb-3 text-sm font-bold text-navy">{total} bài viết</p>
      {articles.data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.data.map((article) => (
            <ArticleCard key={article.documentId} article={article} />
          ))}
        </div>
      ) : (
        <p className="rounded-card border border-dashed border-line bg-white px-6 py-12 text-center text-muted">
          Chưa có bài viết{category ? ' trong chuyên mục này' : ''}.{' '}
          {category && (
            <Link href="/cam-nang" className="font-bold text-navy underline underline-offset-4">
              Xem tất cả bài viết
            </Link>
          )}
        </p>
      )}

      {pageCount > 1 && (
        <nav aria-label="Trang" className="mt-10 flex flex-wrap justify-center gap-2">
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
            <Link
              key={number}
              href={pageHref(base, number)}
              aria-current={number === page ? 'page' : undefined}
              className={`grid size-11 place-items-center rounded-control border font-bold ${number === page ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:border-navy'}`}
            >
              {number}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
