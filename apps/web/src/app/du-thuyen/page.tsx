import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/Breadcrumb';
import { RequestBlock } from '@/components/product/Detail';
import { cruiseCard, ProductCard } from '@/components/ProductCard';
import { renderPerRequestWithoutCms } from '@/lib/build';
import { getCruiseCatalog } from '@/lib/cms';
import { loadSiteSetting } from '@/lib/site-setting';

// Static + ISR (NFR-03, D4): regenerated when the webhook revalidates `cruise`.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Du thuyền Hạ Long',
  description: 'Vé du thuyền trong ngày, du thuyền ăn tối và thuê nguyên tàu trên vịnh Hạ Long. Xem giá từng lựa chọn và gửi yêu cầu cho AZway.',
  alternates: { canonical: '/du-thuyen' },
};

export default async function Page() {
  await renderPerRequestWithoutCms();
  const cruises = await getCruiseCatalog();

  return (
    <div className="bg-paper pb-section">
      <section className="bg-white pb-8 pt-6 sm:pb-10">
        <div className="shell">
          <Breadcrumb items={[{ name: 'Du thuyền' }]} />
          <p className="mb-3 mt-8 text-kicker font-extrabold text-red">DU THUYỀN HẠ LONG</p>
          <h1 className="text-[32px] font-bold leading-[1.08] tracking-[-0.05em] text-navy sm:text-[clamp(30px,3.1vw,44px)]">
            Du thuyền trong ngày, ăn tối và thuê nguyên tàu
          </h1>
          <p className="mt-4 max-w-[720px] text-ink-2">
            Chọn du thuyền theo sức chứa và lựa chọn bạn cần: vé du ngoạn trong ngày, du thuyền ăn tối, hoặc thuê nguyên tàu cho đoàn. Mỗi du thuyền ghi rõ giá từng lựa chọn.
          </p>
        </div>
      </section>

      <section className="shell pt-8">
        {cruises.length > 0 ? (
          <>
            <p className="mb-6 font-bold text-navy">{cruises.length} du thuyền</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cruises.map((cruise) => (
                <ProductCard key={cruise.documentId} product={cruiseCard(cruise)} />
              ))}
            </div>
          </>
        ) : (
          <RequestBlock setting={await loadSiteSetting()} subject="chuyến du thuyền Hạ Long" />
        )}
      </section>
    </div>
  );
}
