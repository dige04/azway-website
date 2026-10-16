import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { FeedbackCard } from '@/components/feedback/FeedbackCard';
import { Breadcrumb } from '@/components/Breadcrumb';
import { LeadForm } from '@/components/lead/LeadForm';
import { Block, Check, DetailSection, Inclusions, PriceBox, RequestBlock } from '@/components/product/Detail';
import { JsonLd } from '@/components/JsonLd';
import { Gallery } from '@/components/product/Gallery';
import { ProductCard, tourCard } from '@/components/ProductCard';
import { Show } from '@/components/Show';
import { Itinerary } from '@/components/tour/Itinerary';
import { cancellationWindows } from '@/lib/cancellation';
import { getFeedbacks, getTourBySlug, getTourCatalog } from '@/lib/cms';
import type { Tour } from '@/lib/cms-types';
import { galleryImages } from '@/lib/gallery';
import { formatDuration, groupSize, isStrapiSlug } from '@/lib/present';
import { movedOrNotFound } from '@/lib/redirect';
import { catalogForRelated, relatedFromCatalog } from '@/lib/related';
import { metaDescription, pageMetadata } from '@/lib/seo';
import { touristTrip } from '@/lib/structured-data';
import { loadSiteSetting } from '@/lib/site-setting';

// ISR (NFR-03, D4): each tour is rendered on its first request, then served
// from cache until the webhook revalidates `tour:<slug>` or a type it shows.
export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

type Props = { params: Promise<{ slug: string }> };

/** Feedback groups shown on a tour: the newest few, each brings its whole album into every rebuild. */
const FEEDBACKS = 8;

async function loadTour(slug: string): Promise<Tour> {
  const tour = isStrapiSlug(slug) ? await getTourBySlug(slug) : null;
  if (!tour) return movedOrNotFound('tour', slug);
  return tour;
}

/** Description from content when `seo.metaDescription` is empty (the seed has none for most tours). */
function contentSummary(tour: Tour): string {
  const facts = [formatDuration(tour.durationDays, tour.durationNights), tour.departure && `khởi hành từ ${tour.departure}`].filter(Boolean).join(', ');
  const highlights = (tour.highlights ?? []).map((item) => item.text.trim().replace(/[.;,]+$/, '')).filter(Boolean);
  return [`${tour.name}: ${facts}.`, highlights.length > 0 && `${highlights.join(', ')}.`].filter(Boolean).join(' ');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tour = await loadTour((await params).slug);
  return pageMetadata({
    title: tour.name,
    description: contentSummary(tour),
    path: `/tour/${tour.slug}`,
    image: tour.thumbnail,
    seo: tour.seo,
  });
}

export default async function Page({ params }: Props) {
  const tour = await loadTour((await params).slug);
  const [setting, catalog, feedbacks] = await Promise.all([
    loadSiteSetting(),
    catalogForRelated(getTourCatalog(), 'tour catalog'),
    catalogForRelated(getFeedbacks({ tour: tour.slug, pageSize: FEEDBACKS }).then((res) => res.data), 'tour feedback'),
  ]);
  const related = relatedFromCatalog(tour, catalog, (item) => item.category === tour.category);
  const facts = [
    { label: 'Mã tour', value: tour.code },
    { label: 'Thời gian', value: formatDuration(tour.durationDays, tour.durationNights) },
    { label: 'Khởi hành', value: tour.departure },
    { label: 'Cửa khẩu', value: tour.borderGate },
    { label: 'Phương tiện', value: tour.transport },
    { label: 'Quy mô đoàn', value: groupSize(tour.groupSizeMin, tour.groupSizeMax) },
  ];

  return (
    <div className="bg-paper pb-16">
      <JsonLd data={touristTrip(tour, metaDescription(tour.seo, contentSummary(tour)))} />
      <div className="shell pb-6 pt-5">
        <Breadcrumb items={[{ name: 'Tour', href: '/tour' }, { name: tour.name }]} />
      </div>

      {/* Phones: title, price box, then the blocks. Desktop: price box in the right column. */}
      <div className="shell grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <header className="min-w-0 lg:col-start-1">
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

        <div className="grid min-w-0 gap-8 lg:col-start-1">
          <Show when={galleryImages(tour.name, tour.thumbnail, tour.gallery)}>{(images) => <Gallery images={images} title={tour.name} />}</Show>

          <Show when={tour.highlights}>
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

          <Inclusions inclusions={tour.inclusions} exclusions={tour.exclusions} />

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
                    {cancellationWindows(rules).map((rule) => (
                      <tr key={rule.id} className="border-t border-line">
                        <td className="py-2.5 pr-4">
                          {rule.label}
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

          <RequestBlock
            setting={setting}
            subject={
              <>
                tour <strong className="text-white">{tour.code}</strong>
              </>
            }
          >
            <LeadForm product={{ type: 'tour', code: tour.code, name: tour.name }} responseTimeText={setting?.responseTimeText} hotline={setting?.hotline} />
          </RequestBlock>
        </div>

        <aside className="row-start-2 grid gap-4 lg:sticky lg:top-[calc(var(--spacing-header)+16px)] lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <PriceBox price={tour.priceFrom} facts={facts} />
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

      <Show when={feedbacks}>
        {(feedbacks) => (
          <DetailSection title="Đoàn đã đi tour này">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {feedbacks.map((feedback) => (
                <FeedbackCard key={feedback.documentId} feedback={feedback} linkTour={false} />
              ))}
            </div>
          </DetailSection>
        )}
      </Show>

      <Show when={related}>
        {(tours) => (
          <DetailSection title="Tour liên quan">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {tours.map((item) => (
                <ProductCard key={item.documentId} product={tourCard(item)} />
              ))}
            </div>
          </DetailSection>
        )}
      </Show>

      <Show when={tour.articles}>
        {(articles) => (
          <DetailSection title="Cẩm nang cho chuyến đi">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.documentId} article={article} />
              ))}
            </div>
          </DetailSection>
        )}
      </Show>
    </div>
  );
}
