import Image from 'next/image';
import Link from 'next/link';
import type { Cruise, Media, Teambuilding, Tour, TourCategory } from '@/lib/cms-types';
import { imageProps } from '@/lib/media';
import { formatDuration, formatPrice, groupSize, hasContent } from '@/lib/present';

/** FR-PRD-01: what every product card shows, whatever the product type. */
export interface ProductCardData {
  href: string;
  name: string;
  image: Media | null | undefined;
  /** Type label over the image, e.g. "Tour Trung Quốc". */
  typeLabel: string;
  /** Rows under the name; empty values are dropped (FR-PRD-05). */
  meta: { label: string; value: string | null | undefined }[];
  /** Lowest per-guest price in VND; 0 or null shows "Liên hệ báo giá" alone (FR-PRD-03). */
  price: number | null;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = imageProps(product.image, product.name);
  const meta = product.meta.filter((row) => hasContent(row.value));
  const hasPrice = !!product.price && product.price > 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-line bg-white transition-shadow hover:shadow-card">
      <Link href={product.href} className="relative block h-[220px] overflow-hidden bg-paper sm:h-[230px]">
        {image && (
          <Image
            {...image}
            width={image.width ?? 800}
            height={image.height ?? 600}
            sizes="(min-width: 1181px) 440px, (min-width: 681px) 50vw, 100vw"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
          />
        )}
        <span className="absolute left-3.5 top-3.5 rounded-sm bg-red px-2.5 py-1 text-xs font-bold text-white">{product.typeLabel}</span>
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-[21px]">
        <h3 className="text-card-title font-bold text-navy">
          <Link href={product.href} className="hover:text-red">
            {product.name}
          </Link>
        </h3>
        {meta.length > 0 && (
          <ul className="-mt-1 grid gap-1.5 text-sm text-muted">
            {meta.map((row) => (
              <li key={row.label} className="grid grid-cols-[84px_1fr] gap-2">
                <span>{row.label}</span>
                <span className="text-ink-2">{row.value}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
          <p>
            {hasPrice && <small className="block text-xs text-muted">Giá từ</small>}
            <strong className="text-[21px] text-red">{formatPrice(product.price)}</strong>
          </p>
          <Link href={product.href} className="text-sm font-bold text-navy hover:text-red">
            Xem chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
}

const TOUR_TYPE: Record<TourCategory, string> = {
  noi_dia: 'Tour trong nước',
  trung_quoc: 'Tour Trung Quốc',
  quoc_te: 'Tour nước ngoài',
  trai_nghiem_hoc_tap: 'Trải nghiệm học tập',
};

export function tourCard(tour: Tour): ProductCardData {
  return {
    href: `/tour/${tour.slug}`,
    name: tour.name,
    image: tour.thumbnail,
    typeLabel: TOUR_TYPE[tour.category],
    meta: [
      { label: 'Thời gian', value: formatDuration(tour.durationDays, tour.durationNights) },
      { label: 'Khởi hành', value: tour.departure },
      { label: 'Mã tour', value: tour.code },
    ],
    price: tour.priceFrom,
  };
}

export function cruiseCard(cruise: Cruise): ProductCardData {
  // Cheapest per-guest option; charter options carry no per-guest price.
  const prices = (cruise.options ?? []).map((option) => option.price).filter((price): price is number => !!price && price > 0);
  return {
    href: `/du-thuyen/${cruise.slug}`,
    name: cruise.name,
    image: cruise.thumbnail,
    typeLabel: 'Du thuyền',
    meta: [
      { label: 'Hạng', value: cruise.starRating ? `${cruise.starRating} sao` : null },
      { label: 'Sức chứa', value: cruise.capacity ? `${cruise.capacity} khách` : null },
    ],
    price: prices.length > 0 ? Math.min(...prices) : null,
  };
}

export function teambuildingCard(teambuilding: Teambuilding): ProductCardData {
  return {
    href: `/teambuilding/${teambuilding.slug}`,
    name: teambuilding.name,
    image: teambuilding.thumbnail,
    typeLabel: 'Teambuilding',
    meta: [
      { label: 'Chủ đề', value: teambuilding.theme },
      { label: 'Quy mô', value: groupSize(teambuilding.groupSizeMin, teambuilding.groupSizeMax) },
    ],
    price: null,
  };
}
