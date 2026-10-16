import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { ArticleBody } from '@/components/article/ArticleBody';
import { TableOfContents } from '@/components/article/TableOfContents';
import { Breadcrumb, type Crumb } from '@/components/Breadcrumb';
import { ContactLink } from '@/components/layout/ContactLink';
import { cruiseCard, ProductCard, tourCard } from '@/components/ProductCard';
import { Show } from '@/components/Show';
import { prepareArticle } from '@/lib/article';
import { getArticleBySlug, getArticles } from '@/lib/cms';
import type { Article, SiteSetting } from '@/lib/cms-types';
import { imageProps, mediaUrl } from '@/lib/media';
import { isStrapiSlug, safeHref, telHref } from '@/lib/present';
import { pickRelated } from '@/lib/related';
import { loadSiteSetting } from '@/lib/site-setting';

// Static + ISR (NFR-03, D4): rendered on first request, then served from the
// cache until the webhook revalidates `article:<slug>` or a type it shows.
export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

type Props = { params: Promise<{ slug: string }> };

async function load(params: Props['params']) {
  const { slug } = await params;
  if (!isStrapiSlug(slug)) notFound();
  const article = await getArticleBySlug(slug);
  if (!article) notFound();
  return article;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await load(params);
  const image = mediaUrl(article.seo?.shareImage?.url ?? article.cover?.url);
  return {
    title: article.seo?.metaTitle || article.title,
    description: article.seo?.metaDescription || article.excerpt || undefined,
    alternates: { canonical: `/cam-nang/${article.slug}` },
    robots: article.seo?.noIndex ? { index: false } : undefined,
    openGraph: { type: 'article', title: article.title, publishedTime: article.publishedAt ?? undefined, images: image ? [image] : undefined },
  };
}

/**
 * FR-BLG-04: other articles of the same category first, then the newest
 * (the seed has one article per category). Optional: a failure hides the block.
 */
async function relatedArticles(article: Article): Promise<Article[]> {
  const [sameCategory, newest] = await Promise.all([
    article.category ? getArticles({ category: article.category.slug, pageSize: 4 }).then((res) => res.data) : [],
    getArticles({ pageSize: 4 }).then((res) => res.data),
  ]).catch(() => [[], []]);
  return pickRelated(article.documentId, sameCategory, newest, 3);
}

const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });

/** FR-BLG-02..03: cover, author, reading time, table of contents, content, hand-picked products. */
export default async function Page({ params }: Props) {
  const article = await load(params);
  const [setting, related] = await Promise.all([loadSiteSetting(), relatedArticles(article)]);
  const { blocks, toc } = prepareArticle(article.content);
  const cover = imageProps(article.cover, article.title);
  const products = [...(article.tours ?? []).map(tourCard), ...(article.cruises ?? []).map(cruiseCard)];
  const crumbs: Crumb[] = [
    { name: 'Cẩm nang', href: '/cam-nang' },
    ...(article.category ? [{ name: article.category.name, href: `/cam-nang/danh-muc/${article.category.slug}` }] : []),
    // The design ends the trail with "Bài viết": the title is the heading right below.
    { name: 'Bài viết' },
  ];

  return (
    <div className="shell pb-section pt-6 sm:pt-8">
      <Breadcrumb items={crumbs} className="mb-6" />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14">
        <article className="min-w-0 max-w-[820px]">
          {article.category && (
            <Link href={`/cam-nang/danh-muc/${article.category.slug}`} className="text-xs font-extrabold uppercase tracking-[0.08em] text-red">
              {article.category.name}
            </Link>
          )}
          <h1 className="mb-4 mt-3 font-serif text-[33px] font-bold leading-[1.17] tracking-[-0.035em] text-navy sm:text-[clamp(38px,3.2vw,47px)]">
            {article.title}
          </h1>
          {article.excerpt && <p className="mb-5 text-[15px] leading-[1.8] text-label sm:text-[17px]">{article.excerpt}</p>}
          <Byline author={article.author} minutes={article.readingMinutes} publishedAt={article.publishedAt} />

          {cover && (
            <Image
              {...cover}
              width={cover.width ?? 1600}
              height={cover.height ?? 900}
              priority
              sizes="(min-width: 1181px) 820px, 100vw"
              className="mt-6 aspect-video w-full rounded-sm object-cover"
            />
          )}

          <Show when={toc}>
            {(entries) => (
              <details open className="mt-6 rounded-sm border border-line p-5 lg:hidden">
                <TableOfContents entries={entries} summary />
              </details>
            )}
          </Show>

          <div className="mt-8">
            <ArticleBody blocks={blocks} />
          </div>

          <Show when={products}>
            {(items) => (
              <section aria-labelledby="san-pham-lien-quan" className="mt-12 border-t-2 border-navy pt-6">
                <h2 id="san-pham-lien-quan" className="mb-6 font-serif text-[27px] font-bold leading-snug text-navy">
                  Sản phẩm liên quan
                </h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {items.map((product) => (
                    <ProductCard key={product.href} product={product} />
                  ))}
                </div>
              </section>
            )}
          </Show>

          <section className="mt-8 flex flex-col gap-5 rounded-sm bg-navy p-6 text-white sm:flex-row sm:items-center">
            <div className="flex-1">
              <h2 className="mb-2 font-serif text-[23px] font-bold leading-snug">Biến ý tưởng thành chuyến đi.</h2>
              <p className="text-sm leading-[1.8] text-navy-mist">Gửi ngày dự kiến, số khách và điều bạn mong muốn để AZway gợi ý lựa chọn phù hợp.</p>
            </div>
            <Link href="/tour" className="inline-flex min-h-[50px] items-center justify-center rounded-button bg-red px-6 font-bold text-white hover:bg-red-hover">
              Xem tour du lịch
            </Link>
          </section>
        </article>

        <aside className="sticky top-[calc(var(--spacing-header)+22px)] hidden gap-7 lg:grid">
          <Show when={toc}>
            {(entries) => (
              <nav aria-label="Mục lục" className="rounded-sm border border-line p-5">
                <TableOfContents entries={entries} />
              </nav>
            )}
          </Show>
          <ContactCard setting={setting} />
        </aside>
      </div>

      <Show when={related}>
        {(articles) => (
          <section aria-labelledby="bai-lien-quan" className="mt-14 border-t-2 border-navy pt-6">
            <h2 id="bai-lien-quan" className="mb-6 font-serif text-[27px] font-bold leading-snug text-navy">
              Có thể bạn cũng quan tâm
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((item) => (
                <ArticleCard key={item.documentId} article={item} />
              ))}
            </div>
          </section>
        )}
      </Show>
    </div>
  );
}

function Byline({ author, minutes, publishedAt }: { author: string | null; minutes: number | null; publishedAt: string | null | undefined }) {
  const parts = [minutes ? `${minutes} phút đọc` : null, publishedAt ? date.format(new Date(publishedAt)) : null].filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4 text-xs text-muted">
      {author && (
        <>
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-red text-[10px] font-extrabold text-white">
            {initials(author)}
          </span>
          <strong className="text-[13px] text-navy">{author}</strong>
        </>
      )}
      {parts.map((part, index) => (
        <span key={part} className="flex items-center gap-3">
          {(author || index > 0) && <span aria-hidden="true">·</span>}
          {part}
        </span>
      ))}
    </div>
  );
}

/** "AZway" -> "AZ", "Nguyễn Văn An" -> "NA". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0] ?? '';
  const last = words.at(-1) ?? '';
  return (words.length > 1 ? first.charAt(0) + last.charAt(0) : first.slice(0, 2)).toUpperCase();
}

/** The design's `.contact-card`: call or Zalo from beside the article. */
function ContactCard({ setting }: { setting: SiteSetting | null }) {
  const tel = telHref(setting?.hotline);
  const zalo = safeHref(setting?.zaloUrl);
  if (!tel && !zalo) return null;
  return (
    <div className="relative overflow-hidden rounded-sm bg-navy p-6 text-white">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-red-on-navy">Đi cùng AZway</p>
      <p className="mb-3 mt-2.5 font-serif text-[26px] font-bold leading-[1.25]">Chuyến đi của bạn. Cách đi của bạn.</p>
      <p className="text-[13px] leading-[1.8] text-navy-mist">Chia sẻ điểm đến, ngày dự kiến và số khách. AZway cùng bạn chọn hành trình phù hợp.</p>
      {zalo && (
        <ContactLink href={zalo} event="click_zalo" className="mt-5 flex min-h-12 items-center justify-center rounded-button bg-red px-5 font-bold hover:bg-red-hover">
          Tư vấn qua Zalo
        </ContactLink>
      )}
      {tel && (
        <ContactLink href={tel} event="click_call" className="mt-4 block text-center text-xl font-extrabold">
          {setting?.hotline}
        </ContactLink>
      )}
    </div>
  );
}
