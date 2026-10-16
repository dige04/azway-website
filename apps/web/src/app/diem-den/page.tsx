import { Breadcrumb } from '@/components/Breadcrumb';
import { DestinationCard, REGION_LABEL } from '@/components/DestinationCard';
import { renderPerRequestWithoutCms } from '@/lib/build';
import { getDestinations } from '@/lib/cms';
import type { Region } from '@/lib/cms-types';
import { pageMetadata } from '@/lib/seo';

// Static + ISR (NFR-03, D4): regenerated when the webhook revalidates `destination`.
export const revalidate = 3600;

export const generateMetadata = () => pageMetadata({
  title: 'Điểm đến',
  description: 'Điểm đến trong nước, Trung Quốc và quốc tế cùng AZway: chọn nơi bạn muốn đến để xem tour và du thuyền.',
  path: '/diem-den',
});

export default async function Page() {
  await renderPerRequestWithoutCms();
  const destinations = await getDestinations();
  // One section per region, in REGION_LABEL order; a region without places is left out.
  const regions = (Object.keys(REGION_LABEL) as Region[])
    .map((region) => ({ region, places: destinations.filter((place) => place.region === region) }))
    .filter(({ places }) => places.length > 0);

  return (
    <div className="bg-paper pb-section">
      <section className="bg-white pb-8 pt-6 sm:pb-10">
        <div className="shell">
          <Breadcrumb items={[{ name: 'Điểm đến' }]} />
          <p className="mb-3 mt-8 text-kicker font-extrabold text-red">ĐIỂM ĐẾN</p>
          <h1 className="text-[32px] font-bold leading-[1.08] tracking-[-0.05em] text-navy sm:text-[clamp(30px,3.1vw,44px)]">Chọn nơi bạn muốn đến</h1>
          <p className="mt-4 max-w-[720px] text-ink-2">Mỗi điểm đến gom các tour và du thuyền AZway đang có ở đó.</p>
        </div>
      </section>

      {regions.map(({ region, places }) => (
        <section key={region} className="shell pt-10">
          <h2 className="mb-5 text-[26px] font-bold tracking-[-0.035em] text-navy">{REGION_LABEL[region]}</h2>
          <ul className="grid auto-rows-[218px] grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
            {places.map((place) => (
              <li key={place.documentId} className="grid">
                <DestinationCard destination={place} sizes="(min-width: 1181px) 290px, (min-width: 451px) 50vw, 100vw" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
