import { notFound } from 'next/navigation';
import { getTourBySlug } from '@/lib/cms';
import { formatPrice, isStrapiSlug } from '@/lib/present';

// Temporary page (WP-05) proving cache tags end to end: rendered on first
// request, then served from the ISR cache until the webhook revalidates
// `tour:<slug>` or a type it shows (`destination`, ...). Replaced in M5.
export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isStrapiSlug(slug)) notFound();
  const tour = await getTourBySlug(slug);
  if (!tour) notFound();
  const destinations = tour.destinations?.map((destination) => destination.name) ?? [];

  return (
    <main className="shell py-section">
      <p className="text-sm text-muted">{tour.code}</p>
      <h1 className="text-h2 font-bold text-navy">{tour.name}</h1>
      {destinations.length > 0 && <p className="mt-3 text-muted">{destinations.join(' · ')}</p>}
      <p className="mt-4 font-bold text-red">{formatPrice(tour.priceFrom)}</p>
    </main>
  );
}
