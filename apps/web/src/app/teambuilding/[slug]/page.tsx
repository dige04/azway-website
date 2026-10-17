import type { Metadata } from 'next';
import Image from 'next/image';
import { Breadcrumb } from '@/components/Breadcrumb';
import { LeadForm } from '@/components/lead/LeadForm';
import { Block, Check, DESCRIPTION, DetailSection, PriceBox, RequestBlock, TextList } from '@/components/product/Detail';
import { Gallery } from '@/components/product/Gallery';
import { ProductCard, teambuildingCard, tourCard } from '@/components/ProductCard';
import { RichText } from '@/components/RichText';
import { Show } from '@/components/Show';
import { getTeambuildingBySlug, getTeambuildingCatalog } from '@/lib/cms';
import type { Teambuilding, TeambuildingGame } from '@/lib/cms-types';
import { galleryImages } from '@/lib/gallery';
import { imageProps } from '@/lib/media';
import { groupSize, hasContent, isStrapiSlug } from '@/lib/present';
import { movedOrNotFound } from '@/lib/redirect';
import { catalogForRelated, relatedFromCatalog } from '@/lib/related';
import { blocksText, pageMetadata } from '@/lib/seo';
import { loadSiteSetting } from '@/lib/site-setting';

// ISR (NFR-03, D4): rendered on first request, cached until the webhook
// revalidates `teambuilding:<slug>` or `tour`.
export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

type Props = { params: Promise<{ slug: string }> };

async function loadProgramme(slug: string): Promise<Teambuilding> {
  const programme = isStrapiSlug(slug) ? await getTeambuildingBySlug(slug) : null;
  if (!programme) return movedOrNotFound('teambuilding', slug);
  return programme;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const programme = await loadProgramme((await params).slug);
  return pageMetadata({
    title: programme.name,
    description: blocksText(programme.description) || [programme.theme, groupSize(programme.groupSizeMin, programme.groupSizeMax)].filter(Boolean).join(' · '),
    path: `/teambuilding/${programme.slug}`,
    image: programme.thumbnail,
    seo: programme.seo,
  });
}

export default async function Page({ params }: Props) {
  const programme = await loadProgramme((await params).slug);
  const [setting, catalog] = await Promise.all([loadSiteSetting(), catalogForRelated(getTeambuildingCatalog(), 'teambuilding catalog')]);
  const related = relatedFromCatalog(programme, catalog, () => true);
  // The album also takes videos; the gallery shows photos only.
  const photos = programme.album?.filter((media) => media.mime.startsWith('image/'));
  const games = programme.games ?? [];
  // Game photos credit their source in the CMS caption; shown once under the grid.
  const credits = [...new Set(games.map((game) => game.image?.caption).filter((caption): caption is string => hasContent(caption)))];

  return (
    <div className="bg-paper pb-16">
      <div className="shell pb-6 pt-5">
        <Breadcrumb items={[{ name: 'Teambuilding', href: '/teambuilding' }, { name: programme.name }]} />
      </div>

      {/* Phones: title, price box, then the blocks. Desktop: price box in the right column. */}
      <div className="shell grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <header className="min-w-0 lg:col-start-1">
          <p className="text-kicker font-extrabold uppercase text-red-dark">{hasContent(programme.theme) ? programme.theme : 'Teambuilding'}</p>
          <h1 className="mt-2 text-[32px] font-bold leading-[1.1] tracking-[-0.035em] text-navy sm:text-[clamp(32px,3.4vw,48px)]">{programme.name}</h1>
        </header>

        <div className="grid min-w-0 gap-8 lg:col-start-1">
          <Show when={galleryImages(programme.name, programme.thumbnail, photos)}>{(images) => <Gallery images={images} title={programme.name} />}</Show>

          <Show when={programme.description}>
            {(description) => (
              <Block title="Giới thiệu">
                <RichText content={description} className={DESCRIPTION} />
              </Block>
            )}
          </Show>

          <Show when={programme.packages}>
            {(items) => (
              <Block title="Gói kèm">
                <TextList items={items} icon={<Check className="mt-1 text-red" />} />
              </Block>
            )}
          </Show>

          <Show when={games}>
            {(items) => (
              <Block title="Kho trò chơi" plain>
                <p className="-mt-2 mb-5 text-sm text-muted">{`${items.length} trò chơi. Kịch bản được điều chỉnh theo không gian, thể lực và điều kiện tổ chức.`}</p>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </ul>
                {credits.map((credit) => (
                  <p key={credit} className="mt-4 text-[13px] text-muted">
                    {credit}
                  </p>
                ))}
              </Block>
            )}
          </Show>

          <RequestBlock
            setting={setting}
            subject={
              <>
                chương trình <strong className="text-white">{programme.name}</strong>
              </>
            }
          >
            {/* No code field: the slug identifies a programme, as for cruises. */}
            <LeadForm product={{ type: 'teambuilding', code: programme.slug, name: programme.name }} responseTimeText={setting?.responseTimeText} hotline={setting?.hotline} />
          </RequestBlock>
        </div>

        <aside className="row-start-2 lg:sticky lg:top-[calc(var(--spacing-header)+16px)] lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <PriceBox
            price={null}
            facts={[
              { label: 'Chủ đề', value: programme.theme },
              { label: 'Quy mô đoàn', value: groupSize(programme.groupSizeMin, programme.groupSizeMax) },
              { label: 'Trò chơi', value: games.length > 0 ? `${games.length} trò chơi` : null },
            ]}
          />
        </aside>
      </div>

      <Show when={programme.tours}>
        {(tours) => (
          <DetailSection title="Tour kết hợp">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {tours.map((tour) => (
                <ProductCard key={tour.documentId} product={tourCard(tour)} />
              ))}
            </div>
          </DetailSection>
        )}
      </Show>

      <Show when={related}>
        {(programmes) => (
          <DetailSection title="Chương trình khác">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {programmes.map((item) => (
                <ProductCard key={item.documentId} product={teambuildingCard(item)} />
              ))}
            </div>
          </DetailSection>
        )}
      </Show>
    </div>
  );
}

/** One game: photo, name and how to play (phones: photo beside the text, to keep 12 games short). */
function GameCard({ game }: { game: TeambuildingGame }) {
  const image = imageProps(game.image, `Trò chơi ${game.name}`);
  return (
    <li className="grid grid-cols-[96px_1fr] overflow-hidden rounded-card border border-line bg-white sm:grid-cols-1">
      <div className="relative bg-paper sm:aspect-[1.45]">
        {image && <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1181px) 280px, (min-width: 681px) 45vw, 96px" className="object-cover" />}
      </div>
      <div className="p-4">
        <h3 className="font-bold leading-snug text-navy sm:text-lg">{game.name}</h3>
        <Show when={game.howToPlay}>{(howToPlay) => <p className="mt-1.5 text-sm text-muted">{howToPlay}</p>}</Show>
      </div>
    </li>
  );
}
