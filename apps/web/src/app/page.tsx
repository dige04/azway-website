import Image from 'next/image';
import { getTours } from '@/lib/cms';
import { imageProps } from '@/lib/media';

// Temporary page proving the CMS -> Workers data path (WP-05); replaced by the
// real homepage in M5. Rendered per request so `next build` needs no CMS.
export const dynamic = 'force-dynamic';

const vnd = new Intl.NumberFormat('vi-VN');

export default async function Page() {
  const { data: tours, meta } = await getTours({ pageSize: 6 });

  return (
    <main className="shell py-section">
      <p className="text-kicker font-extrabold uppercase text-red">AZway</p>
      <h1 className="text-h2 font-bold text-navy">Tour mới cập nhật</h1>
      <p className="mt-3 text-muted">{meta.pagination.total} tour đã xuất bản</p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour) => {
          const image = imageProps(tour.thumbnail, tour.name);
          return (
            <li key={tour.documentId} className="overflow-hidden rounded-card border border-line bg-white">
              {image && (
                <Image {...image} width={image.width ?? 800} height={image.height ?? 600} sizes="(min-width: 1181px) 440px, 100vw" className="h-56 w-full object-cover" />
              )}
              <div className="p-5">
                <p className="text-sm text-muted">{tour.code}</p>
                <h2 className="text-card-title font-bold text-navy">{tour.name}</h2>
                <p className="mt-4 font-bold text-red">
                  {tour.priceFrom ? `${vnd.format(tour.priceFrom)} đ/khách` : 'Liên hệ báo giá'}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
