import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { Breadcrumb } from '@/components/Breadcrumb';
import { LeadForm } from '@/components/lead/LeadForm';
import { Block, DESCRIPTION, DetailSection, Inclusions, PriceBox, RequestBlock } from '@/components/product/Detail';
import { JsonLd } from '@/components/JsonLd';
import { Gallery } from '@/components/product/Gallery';
import { cruiseCard, ProductCard } from '@/components/ProductCard';
import { RichText } from '@/components/RichText';
import { Show } from '@/components/Show';
import { getCruiseBySlug, getCruiseCatalog } from '@/lib/cms';
import type { Cruise } from '@/lib/cms-types';
import { lowestGuestPrice, optionSummary, sortedOptions } from '@/lib/cruise';
import { galleryImages } from '@/lib/gallery';
import { formatPrice, isStrapiSlug } from '@/lib/present';
import { movedOrNotFound } from '@/lib/redirect';
import { catalogForRelated, relatedFromCatalog } from '@/lib/related';
import { blocksText, metaDescription, pageMetadata } from '@/lib/seo';
import { cruiseTrip } from '@/lib/structured-data';
import { loadSiteSetting } from '@/lib/site-setting';

// ISR (NFR-03, D4): rendered on first request, cached until the webhook
// revalidates `cruise:<slug>` or a type the page shows.
export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

type Props = { params: Promise<{ slug: string }> };

async function loadCruise(slug: string): Promise<Cruise> {
  const cruise = isStrapiSlug(slug) ? await getCruiseBySlug(slug) : null;
  if (!cruise) return movedOrNotFound('du-thuyen', slug);
  return cruise;
}

/** Description from content when `seo.metaDescription` is empty. */
const contentSummary = (cruise: Cruise) => blocksText(cruise.description) || `Du thuyền ${cruise.name}: ${optionSummary(cruise.options)}.`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cruise = await loadCruise((await params).slug);
  return pageMetadata({
    title: `Du thuyền ${cruise.name}`,
    description: contentSummary(cruise),
    path: `/du-thuyen/${cruise.slug}`,
    image: cruise.thumbnail,
    seo: cruise.seo,
  });
}

export default async function Page({ params }: Props) {
  const cruise = await loadCruise((await params).slug);
  const [setting, catalog] = await Promise.all([loadSiteSetting(), catalogForRelated(getCruiseCatalog(), 'cruise catalog')]);
  const related = relatedFromCatalog(cruise, catalog, () => true);
  const options = sortedOptions(cruise.options);

  return (
    <div className="bg-paper pb-16">
      <JsonLd data={cruiseTrip(cruise, metaDescription(cruise.seo, contentSummary(cruise)))} />
      <div className="shell pb-6 pt-5">
        <Breadcrumb items={[{ name: 'Du thuyền', href: '/du-thuyen' }, { name: cruise.name }]} />
      </div>

      {/* Phones: title, price box, then the blocks. Desktop: price box in the right column. */}
      <div className="shell grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <header className="min-w-0 lg:col-start-1">
          <p className="text-kicker font-extrabold uppercase text-red-dark">Du thuyền</p>
          <h1 className="mt-2 text-[32px] font-bold leading-[1.1] tracking-[-0.035em] text-navy sm:text-[clamp(32px,3.4vw,48px)]">{cruise.name}</h1>
          <Show when={cruise.destinations}>
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
          <Show when={galleryImages(cruise.name, cruise.thumbnail, cruise.gallery)}>{(images) => <Gallery images={images} title={cruise.name} />}</Show>

          <Show when={cruise.description}>
            {(description) => (
              <Block title="Giới thiệu">
                <RichText content={description} className={DESCRIPTION} />
              </Block>
            )}
          </Show>

          {/* FR-PRD-08: day ticket, dinner cruise, charter; each with its own price. */}
          <Show when={options}>
            {(items) => (
              <Block title="Lựa chọn và giá" plain>
                <ul className="grid gap-4 md:grid-cols-2">
                  {items.map((option) => (
                    <li key={option.id} className="flex flex-col gap-2 rounded-card border border-line bg-white p-5">
                      <h3 className="text-lg font-bold text-navy">{option.name}</h3>
                      <p className="text-xl font-extrabold text-red-dark">{formatPrice(option.price)}</p>
                      {option.description && <p className="text-[15px] text-ink-2">{option.description}</p>}
                    </li>
                  ))}
                </ul>
              </Block>
            )}
          </Show>

          <Inclusions inclusions={cruise.inclusions} exclusions={cruise.exclusions} />

          <RequestBlock
            setting={setting}
            subject={
              <>
                du thuyền <strong className="text-white">{cruise.name}</strong>
              </>
            }
          >
            {/* Cruises have no code: the slug identifies one. */}
            <LeadForm product={{ type: 'cruise', code: cruise.slug, name: cruise.name }} responseTimeText={setting?.responseTimeText} hotline={setting?.hotline} />
          </RequestBlock>
        </div>

        <aside className="row-start-2 lg:sticky lg:top-[calc(var(--spacing-header)+16px)] lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <PriceBox
            price={lowestGuestPrice(cruise.options)}
            facts={[
              { label: 'Hạng', value: cruise.starRating ? `${cruise.starRating} sao` : null },
              { label: 'Sức chứa', value: cruise.capacity ? `${cruise.capacity} khách` : null },
              { label: 'Lựa chọn', value: optionSummary(cruise.options) },
            ]}
          />
        </aside>
      </div>

      <Show when={related}>
        {(cruises) => (
          <DetailSection title="Du thuyền khác">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cruises.map((item) => (
                <ProductCard key={item.documentId} product={cruiseCard(item)} />
              ))}
            </div>
          </DetailSection>
        )}
      </Show>

      <Show when={cruise.articles}>
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
