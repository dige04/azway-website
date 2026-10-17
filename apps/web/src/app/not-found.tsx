import type { Metadata } from 'next';
import Link from 'next/link';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { SearchBox } from '@/components/SearchBox';
import { renderPerRequestWithoutCms } from '@/lib/build';

export const metadata: Metadata = { title: 'Không tìm thấy trang' };

/** SEO-08: every 404 (unknown URL or a missing slug) offers search and featured products. */
export default async function NotFound() {
  await renderPerRequestWithoutCms();
  return (
    <div className="shell pb-section pt-10 sm:pt-14">
      <p className="mb-3 text-kicker font-extrabold text-red-dark">LỖI 404</p>
      <h1 className="text-[32px] font-bold leading-[1.08] tracking-[-0.05em] text-navy sm:text-[clamp(30px,3.1vw,44px)]">Không tìm thấy trang này</h1>
      <p className="mt-3 max-w-[640px] text-muted">Trang có thể đã đổi địa chỉ hoặc không còn nữa. Tìm tour, du thuyền hoặc bài viết bạn cần:</p>
      <SearchBox className="mt-6 max-w-[650px]" />
      <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-navy">
        <Link href="/" className="underline underline-offset-4 hover:text-red">
          Về trang chủ
        </Link>
        <Link href="/tour" className="underline underline-offset-4 hover:text-red">
          Xem tất cả tour
        </Link>
      </p>
      <FeaturedProducts />
    </div>
  );
}
