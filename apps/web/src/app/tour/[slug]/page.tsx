import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArticleCard } from '@/components/ArticleCard';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ProductCard, tourCard } from '@/components/ProductCard';
import { Show } from '@/components/Show';
import { Itinerary } from '@/components/tour/Itinerary';
import { type GalleryImage, TourGallery } from '@/components/tour/TourGallery';
import { getSiteSetting, getTourBySlug, getTours } from '@/lib/cms';
import type { Media, TextItem, Tour } from '@/lib/cms-types';
import { mediaUrl } from '@/lib/media';
import { formatDuration, formatPrice, hasContent, isStrapiSlug, safeHref, telHref } from '@/lib/present';
import { pickRelated } from '@/lib/related';

// ISR (NFR-03, D4): each tour is rendered on its first request, then served
// from cache until the webhook revalidates `tour:<slug>` or a type it shows.
export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

type Props = { params: Promise<{ slug: string }> };

async function loadTour(slug: string): Promise<Tour> {
  const tour = isStrapiSlug(slug) ? await getTourBySlug(slug) : null;
  if (!tour) notFound();
  return tour;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tour = await loadTour((await params).slug);
  return { title: tour.seo?.metaTitle ?? tour.name, description: tour.seo?.metaDescription ?? undefined };
}

export default async function Page({ params }: Props) {
  const tour = await loadTour((await params).slug);
  const destination = tour.destinations?.[0]?.slug;
  const [setting, sameDestination, sameType] = await Promise.all([
    getSiteSetting().catch(() => null),
    destination ? getTours({ destination, pageSize: 5 }) : null,
    getTours({ category: tour.category, pageSize: 6 }),
  ]);
  const related = pickRelated(tour.documentId, sameDestination?.data ?? [], sameType.data);

  const price = tour.priceFrom && tour.priceFrom > 0 ? tour.priceFrom : null;
  const facts = [
    { label: 'Mã tour', value: tour.code },
    { label: 'Thời gian', value: formatDuration(tour.durationDays, tour.durationNights) },
    { label: 'Khởi hành', value: tour.departure },
    { label: 'Cửa khẩu', value: tour.borderGate },
    { label: 'Phương tiện', value: tour.transport },
    { label: 'Quy mô đoàn', value: groupSize(tour.groupSizeMin, tour.groupSizeMax) },
  ].filter((fact) => hasContent(fact.value));
  const tel = telHref(setting?.hotline);
  const zalo = safeHref(setting?.zaloUrl);

  return (
    <div className="bg-paper pb-16">
      <div className="shell pb-6 pt-5">
        <Breadcrumb items={[{ name: 'Tour', href: '/tour' }, { name: tour.name }]} />
      </div>

      <div className="shell grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-8">
          <header>
            <p className="text-kicker font-extrabold uppercase text-red">{tourCard(tour).typeLabel}</p>
            <h1 className="mt-2 text-[32px] font-bold leading-[1.1] tracking-[-0.035em] text-navy sm:text-[clamp(32px,3.4vw,48px)]">{tour.name}</h1>
            <Show when={tour.destinations}>
              {(places) => (
                <p className="mt-3 flex flex-wrap gap-x-3 text-sm text-label">
                  {places.map((place) => (
                    <Link key={place.documentId} href={`/diem-den/${place.slug}`} className="underline underline-offset-4 hover:text-red">
                      {place.name}
                    </Link>
                  ))}
                </p>
              )}
            </Show>
          </header>

          <Show when={galleryImages(tour)}>{(images) => <TourGallery images={images} title={tour.name} />}</Show>

          <Show when={textItems(tour.highlights)}>
            {(items) => (
              <Block title="Điểm nổi bật">
                <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {items.map((item) => (
                    <li key={item.id} className="flex gap-2.5 text-ink-2">
                      <Check className="mt-1 text-red" />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </Block>
            )}
          </Show>

          <Show when={tour.itinerary}>
            {(days) => (
              <Block title="Lịch trình" plain>
                <Itinerary days={days} />
              </Block>
            )}
          </Show>

          {(hasContent(tour.inclusions) || hasContent(tour.exclusions)) && (
            <div className="grid gap-8 md:grid-cols-2">
              <Show when={textItems(tour.inclusions)}>
                {(items) => (
                  <Block title="Giá bao gồm">
                    <TextList items={items} icon={<Check className="mt-1 text-success" />} />
                  </Block>
                )}
              </Show>
              <Show when={textItems(tour.exclusions)}>
                {(items) => (
                  <Block title="Giá không bao gồm">
                    <TextList items={items} icon={<span aria-hidden="true" className="mt-0.5 font-bold text-red">–</span>} />
                  </Block>
                )}
              </Show>
            </div>
          )}

          <Show when={tour.cancellationRules}>
            {(rules) => (
              <Block title="Điều kiện hoàn huỷ">
                <table className="w-full text-left text-[15px]">
                  <thead className="text-sm text-muted">
                    <tr>
                      <th className="pb-2 font-semibold">Thời điểm huỷ</th>
                      <th className="pb-2 font-semibold">Phí huỷ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rules]
                      .sort((a, b) => b.daysBefore - a.daysBefore)
                      .map((rule) => (
                        <tr key={rule.id} className="border-t border-line">
                          <td className="py-2.5 pr-4">
                            Trước {rule.daysBefore} ngày khởi hành
                            {rule.note && <span className="block text-sm text-muted">{rule.note}</span>}
                          </td>
                          <td className="py-2.5 font-bold text-navy">{rule.feePercent}% giá tour</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Block>
            )}
          </Show>

          {/* WP-12 replaces this block with LeadForm (productType/code/name of this tour). */}
          <section id="yeu-cau" className="scroll-mt-24 rounded-panel bg-navy p-6 text-white sm:p-8">
            <h2 className="text-2xl font-bold">Gửi yêu cầu cho AZway</h2>
            <p className="mt-2 text-navy-mist">
              Cho AZway biết số khách, ngày dự kiến và yêu cầu riêng của đoàn cho tour <strong className="text-white">{tour.code}</strong>, AZway sẽ tư vấn chương trình và báo giá.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {tel && (
                <a href={tel} className="inline-flex min-h-12 items-center rounded-button bg-red px-5 font-bold hover:bg-red-hover">
                  Gọi {setting?.hotline}
                </a>
              )}
              {zalo && (
                <a href={zalo} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-button bg-white px-5 font-bold text-navy">
                  Nhắn Zalo
                </a>
              )}
            </div>
          </section>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-[calc(var(--spacing-header)+16px)]">
          <div className="rounded-card border border-line bg-white p-6">
            {price && <p className="text-xs uppercase tracking-wider text-muted">Giá từ</p>}
            <p className="text-[28px] font-extrabold leading-tight text-red-dark">{formatPrice(price)}</p>
            <dl className="mt-5 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 border-t border-line pt-5 text-sm">
              {facts.map((fact) => (
                <div key={fact.label} className="contents">
                  <dt className="text-muted">{fact.label}</dt>
                  <dd className="font-semibold text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <a href="#yeu-cau" className="mt-6 flex min-h-[52px] items-center justify-center rounded-button bg-red font-bold text-white shadow-red hover:bg-red-hover">
              Gửi yêu cầu tư vấn
            </a>
          </div>
          <Show when={tour.focNote}>
            {(note) => (
              <div className="rounded-card border border-[#f3dfbc] bg-[#fff6e9] p-5 text-sm text-[#775f3c]">
                <h2 className="mb-1 font-bold">Chính sách FOC</h2>
                <p>{note}</p>
              </div>
            )}
          </Show>
        </aside>
      </div>

      <Show when={related}>
        {(tours) => (
          <section className="shell mt-14">
            <h2 className="mb-6 text-[28px] font-bold tracking-[-0.035em] text-navy">Tour liên quan</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {tours.map((item) => (
                <ProductCard key={item.documentId} product={tourCard(item)} />
              ))}
            </div>
          </section>
        )}
      </Show>

      <Show when={tour.articles}>
        {(articles) => (
          <section className="shell mt-14">
            <h2 className="mb-6 text-[28px] font-bold tracking-[-0.035em] text-navy">Cẩm nang cho chuyến đi</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.documentId} article={article} />
              ))}
            </div>
          </section>
        )}
      </Show>
    </div>
  );
}

/** A titled section; only rendered inside <Show>, so never empty (FR-PRD-05). */
function Block({ title, plain = false, children }: { title: string; plain?: boolean; children: ReactNode }) {
  return (
    <section className={plain ? '' : 'rounded-card border border-line bg-white p-5 sm:p-6'}>
      <h2 className="mb-4 text-[24px] font-bold tracking-[-0.03em] text-navy">{title}</h2>
      {children}
    </section>
  );
}

function TextList({ items, icon }: { items: TextItem[]; icon: ReactNode }) {
  return (
    <ul className="grid gap-2.5">
      {items.map((item) => (
        <li key={item.id} className="flex gap-2.5 text-ink-2">
          {icon}
          {item.text}
        </li>
      ))}
    </ul>
  );
}

function Check({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-4 shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

const textItems = (items: TextItem[] | undefined) => (items ?? []).filter((item) => hasContent(item.text));

function groupSize(min: number | null, max: number | null): string | null {
  if (min && max) return `${min}–${max} khách`;
  if (min) return `Từ ${min} khách`;
  if (max) return `Đến ${max} khách`;
  return null;
}

/** Thumbnail first, then the gallery, each photo once. */
function galleryImages(tour: Tour): GalleryImage[] {
  const seen = new Set<string>();
  return [tour.thumbnail, ...(tour.gallery ?? [])].flatMap((media: Media | null | undefined) => {
    const src = mediaUrl(media?.url);
    if (!media || !src || seen.has(src)) return [];
    seen.add(src);
    return [{ src, alt: media.alternativeText ?? tour.name, caption: media.caption, width: media.width ?? 1200, height: media.height ?? 800 }];
  });
}
