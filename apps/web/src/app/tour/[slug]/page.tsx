import { notFound } from 'next/navigation';
import { getTourBySlug } from '@/lib/cms';

// Temporary page (WP-05) proving cache tags end to end: rendered on first
// request, then served from the ISR cache until the webhook revalidates
// `tour:<slug>` or a type it shows (`destination`, ...). Replaced in M5.
export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

const vnd = new Intl.NumberFormat('vi-VN');

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const tour = await getTourBySlug((await params).slug);
  if (!tour) notFound();

  return (
    <main className="shell py-section">
      <p className="text-sm text-muted">{tour.code}</p>
      <h1 className="text-h2 font-bold text-navy">{tour.name}</h1>
      <p className="mt-3 text-muted">{tour.destinations?.map((destination) => destination.name).join(' · ')}</p>
      <p className="mt-4 font-bold text-red">
        {tour.priceFrom ? `${vnd.format(tour.priceFrom)} đ/khách` : 'Liên hệ báo giá'}
      </p>
    </main>
  );
}
