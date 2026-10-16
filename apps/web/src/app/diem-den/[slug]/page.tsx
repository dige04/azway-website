import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { REGION_LABEL } from '@/components/DestinationCard';
import { DESCRIPTION, DetailSection, RequestBlock } from '@/components/product/Detail';
import { cruiseCard, ProductCard, tourCard } from '@/components/ProductCard';
import { RichText } from '@/components/RichText';
import { Show } from '@/components/Show';
import { getDestinationBySlug } from '@/lib/cms';
import type { Destination } from '@/lib/cms-types';
import { imageProps } from '@/lib/media';
import { hasContent, isStrapiSlug } from '@/lib/present';
import { movedOrNotFound } from '@/lib/redirect';
import { blocksText, pageMetadata } from '@/lib/seo';
import { loadSiteSetting } from '@/lib/site-setting';
import { toursInRegion } from '@/lib/tour-filter';

// ISR (NFR-03, D4): rendered on first request, cached until the webhook
// revalidates `destination:<slug>`, `tour` or `cruise`.
export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

type Props = { params: Promise<{ slug: string }> };

/** Cards per section; the rest is one link away (a 16-cruise column is too long on phones). */
const SHOWN = 8;

async function loadDestination(slug: string): Promise<Destination> {
  const destination = isStrapiSlug(slug) ? await getDestinationBySlug(slug) : null;
  if (!destination) return movedOrNotFound('diem-den', slug);
  return destination;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const destination = await loadDestination((await params).slug);
  return pageMetadata({
    title: `Du lịch ${destination.name}`,
    description: blocksText(destination.description) || `Tour và du thuyền ${destination.name} cùng AZway.`,
    path: `/diem-den/${destination.slug}`,
    image: destination.image,
    seo: destination.seo,
  });
}

export default async function Page({ params }: Props) {
  const destination = await loadDestination((await params).slug);
  const setting = await loadSiteSetting();
  const image = imageProps(destination.image, destination.name);
  const grid = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className="bg-paper pb-16">
      <section className="bg-white pb-10 pt-5">
        <div className="shell">
          <Breadcrumb items={[{ name: 'Điểm đến', href: '/diem-den' }, { name: destination.name }]} />
          <div className={`mt-8 grid items-center gap-8 ${image ? 'md:grid-cols-[1fr_1fr]' : ''}`}>
            <div>
              <p className="mb-3 text-kicker font-extrabold uppercase text-red">{REGION_LABEL[destination.region]}</p>
              <h1 className="text-[32px] font-bold leading-[1.08] tracking-[-0.05em] text-navy sm:text-[clamp(32px,3.4vw,48px)]">{destination.name}</h1>
              {hasContent(destination.description) && (
                <RichText content={destination.description} className={`mt-4 max-w-[640px] text-[17px] ${DESCRIPTION}`} />
              )}
            </div>
            {image && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-paper">
                <Image src={image.src} alt={image.alt} fill priority sizes="(min-width: 901px) 50vw, 100vw" className="object-cover" />
              </div>
            )}
          </div>
        </div>
      </section>

      <Show when={destination.tours}>
        {(tours) => (
          <DetailSection title={`Tour đi ${destination.name}`}>
            <div className={grid}>
              {tours.slice(0, SHOWN).map((tour) => (
                <ProductCard key={tour.documentId} product={tourCard(tour)} />
              ))}
            </div>
            {tours.length > SHOWN && <MoreLink href={toursInRegion(destination.region)}>{`Xem tất cả tour ${REGION_LABEL[destination.region]}`}</MoreLink>}
          </DetailSection>
        )}
      </Show>

      <Show when={destination.cruises}>
        {(cruises) => (
          <DetailSection title={`Du thuyền ${destination.name}`}>
            <div className={grid}>
              {cruises.slice(0, SHOWN).map((cruise) => (
                <ProductCard key={cruise.documentId} product={cruiseCard(cruise)} />
              ))}
            </div>
            {cruises.length > SHOWN && <MoreLink href="/du-thuyen">Xem tất cả du thuyền</MoreLink>}
          </DetailSection>
        )}
      </Show>

      <div className="shell mt-14">
        <RequestBlock
          setting={setting}
          subject={
            <>
              chuyến đi <strong className="text-white">{destination.name}</strong>
            </>
          }
        />
      </div>
    </div>
  );
}

function MoreLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="mt-6 inline-flex min-h-12 items-center rounded-button border border-line bg-white px-5 font-bold text-navy hover:text-red">
      {children}
    </Link>
  );
}
