import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArticleCard } from '@/components/ArticleCard';
import { DestinationCard } from '@/components/DestinationCard';
import { HeroCarousel, type Slide } from '@/components/home/HeroCarousel';
import { cruiseCard, ProductCard, tourCard } from '@/components/ProductCard';
import { Show } from '@/components/Show';
import { renderPerRequestWithoutCms } from '@/lib/build';
import { getDestinations, getFeedbacks, getHomepage } from '@/lib/cms';
import type { Feedback } from '@/lib/cms-types';
import { imageProps, mediaUrl } from '@/lib/media';

// Static + ISR (NFR-03, D4): regenerated hourly, and at once when the CMS
// webhook revalidates a tag the page reads (homepage, tour, cruise, ...).
export const revalidate = 3600;

export default async function Page() {
  await renderPerRequestWithoutCms();
  const [homepage, destinations, feedbacks] = await Promise.all([getHomepage(), getDestinations(), getFeedbacks({ pageSize: 4 })]);

  const slides: Slide[] = (homepage?.heroSlides ?? []).flatMap(({ image, title, subtitle, ctaLabel, ctaUrl }) => {
    const src = mediaUrl(image?.url);
    return src ? [{ src, alt: image?.alternativeText ?? title ?? '', title, subtitle, ctaLabel, ctaUrl }] : [];
  });
  // Destinations with a photo first; the grid shows one large and four small.
  const shownDestinations = [...destinations.data].sort((a, b) => Number(!a.image) - Number(!b.image)).slice(0, 5);

  return (
    <>
      <section className="relative overflow-hidden bg-navy pb-16 pt-14 text-white md:pb-[72px] md:pt-8">
        <div className="shell relative grid items-center gap-10 md:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="mb-3 text-[13px] font-extrabold tracking-[0.16em] text-red-on-navy">AZWAY TRAVEL AGENCY</p>
            <h1 className="text-[34px] font-bold leading-[1.12] tracking-[-0.035em] sm:text-[clamp(32px,3.6vw,52px)]">
              <span className="block">Du lịch cùng AZway.</span>
              <span className="block text-[#ff4054]">Chọn nhanh, đi đúng ý.</span>
            </h1>
            <p className="mt-4 max-w-[640px] text-base text-navy-mist sm:text-[17px]">
              Du thuyền, khách sạn, xe di chuyển tại Việt Nam; tour Trung Quốc theo cửa khẩu và những hành trình quốc tế. Chọn điểm đến, AZway tư vấn hành trình phù hợp.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5 sm:gap-4">
              <Link href="/tour" className="inline-flex min-h-[52px] items-center rounded-button bg-red px-5 font-bold text-white shadow-red hover:bg-red-hover">
                Khám phá tour
              </Link>
              <Link href="/tim-kiem" className="inline-flex min-h-[52px] items-center rounded-button bg-white px-5 font-bold text-navy">
                Tìm tour nhanh
              </Link>
            </div>
          </div>
          <Show when={slides}>{(items) => <HeroCarousel slides={items} />}</Show>
        </div>
      </section>

      <Show when={homepage?.featuredTours}>
        {(tours) => (
          <Section kicker="TOUR NỔI BẬT" title="Hành trình được chọn nhiều" action={{ href: '/tour', label: 'Xem tất cả tour' }}>
            <ProductGrid>{tours.map((tour) => <ProductCard key={tour.documentId} product={tourCard(tour)} />)}</ProductGrid>
          </Section>
        )}
      </Show>

      <Show when={homepage?.featuredCruises}>
        {(cruises) => (
          <Section kicker="DU THUYỀN HẠ LONG" title="Du thuyền trong ngày và thuê tàu" action={{ href: '/du-thuyen', label: 'Xem tất cả du thuyền' }} tone="paper">
            <ProductGrid>{cruises.map((cruise) => <ProductCard key={cruise.documentId} product={cruiseCard(cruise)} />)}</ProductGrid>
          </Section>
        )}
      </Show>

      <Show when={shownDestinations}>
        {(items) => (
          <Section kicker="ĐIỂM ĐẾN" title="Chọn nơi bạn muốn đến" action={{ href: '/diem-den', label: 'Tất cả điểm đến' }}>
            <div className="grid auto-rows-[218px] grid-cols-1 gap-4 xs:grid-cols-2 lg:auto-rows-[245px] lg:grid-cols-12">
              {items.map((destination, index) => (
                <DestinationCard
                  key={destination.documentId}
                  destination={destination}
                  className={index === 0 ? 'xs:col-span-2 lg:col-span-6 lg:row-span-2' : 'lg:col-span-3'}
                  sizes={index === 0 ? '(min-width: 1181px) 690px, 100vw' : '(min-width: 1181px) 345px, (min-width: 451px) 50vw, 100vw'}
                />
              ))}
            </div>
          </Section>
        )}
      </Show>

      <Show when={feedbacks.data}>
        {(items) => (
          <Section kicker="FEEDBACK KHÁCH HÀNG" title="Những đoàn đã đi cùng AZway" tone="paper">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((feedback) => (
                <FeedbackCard key={feedback.documentId} feedback={feedback} />
              ))}
            </div>
          </Section>
        )}
      </Show>

      <Show when={homepage?.featuredArticles}>
        {(articles) => (
          <Section kicker="CẨM NANG" title="Kinh nghiệm trước chuyến đi" action={{ href: '/cam-nang', label: 'Đọc thêm cẩm nang' }}>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.documentId} article={article} />
              ))}
            </div>
          </Section>
        )}
      </Show>
    </>
  );
}

function Section({
  kicker,
  title,
  action,
  tone = 'white',
  children,
}: {
  kicker: string;
  title: string;
  action?: { href: string; label: string };
  tone?: 'white' | 'paper';
  children: ReactNode;
}) {
  return (
    <section className={`py-[46px] sm:py-16 ${tone === 'paper' ? 'bg-paper' : 'bg-white'}`}>
      <div className="shell">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-kicker font-extrabold text-red">{kicker}</p>
            <h2 className="text-[32px] font-bold leading-[1.08] tracking-[-0.05em] text-navy sm:text-[clamp(30px,3.1vw,44px)]">{title}</h2>
          </div>
          {action && (
            <Link href={action.href} className="shrink-0 text-sm font-bold text-navy underline underline-offset-4 hover:text-red">
              {action.label}
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function ProductGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', { month: '2-digit', year: 'numeric' });

/** FR-GEN-03: one group, its note and its photo album. */
function FeedbackCard({ feedback }: { feedback: Feedback }) {
  const photos = (feedback.album ?? []).flatMap((media) => imageProps(media, feedback.groupName) ?? []).slice(0, 4);
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-white">
      <Show when={photos}>
        {(items) => (
          <div className="grid grid-cols-2 gap-0.5">
            {items.map((photo) => (
              <Image key={photo.src} {...photo} width={photo.width ?? 400} height={photo.height ?? 300} sizes="(min-width: 1181px) 170px, 50vw" className="aspect-[4/3] w-full object-cover" />
            ))}
          </div>
        )}
      </Show>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {feedback.date && <p className="text-sm font-bold text-red">{dateFormat.format(new Date(feedback.date))}</p>}
        <h3 className="text-lg font-bold leading-snug text-navy">{feedback.groupName}</h3>
        {feedback.organization && <p className="text-sm text-label">{feedback.organization}</p>}
        {feedback.description && <p className="text-sm text-muted">{feedback.description}</p>}
        {feedback.tour && (
          <Link href={`/tour/${feedback.tour.slug}`} className="mt-auto pt-2 text-sm font-bold text-navy underline underline-offset-4 hover:text-red">
            {feedback.tour.name}
          </Link>
        )}
      </div>
    </article>
  );
}
