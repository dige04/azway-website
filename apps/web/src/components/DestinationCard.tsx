import Image from 'next/image';
import Link from 'next/link';
import type { Destination, Region } from '@/lib/cms-types';
import { imageProps } from '@/lib/media';

export const REGION_LABEL: Record<Region, string> = {
  mien_bac: 'Miền Bắc',
  mien_trung: 'Miền Trung',
  mien_nam: 'Miền Nam',
  trung_quoc: 'Trung Quốc',
  quoc_te: 'Quốc tế',
};

/** Photo tile linking to /diem-den/<slug>; the caller's grid sets its size. */
export function DestinationCard({ destination, sizes, className = '' }: { destination: Destination; sizes: string; className?: string }) {
  const image = imageProps(destination.image, destination.name);
  return (
    <Link href={`/diem-den/${destination.slug}`} className={`group relative isolate flex items-end overflow-hidden rounded-card bg-navy-2 p-5 text-white ${className}`}>
      {image && (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          className="-z-10 object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
      )}
      <span className="absolute inset-0 -z-10 bg-linear-to-t from-[#06142ed9] via-[#06142e33] to-transparent" aria-hidden="true" />
      <span>
        <small className="block text-xs font-bold uppercase tracking-wider text-white/80">{REGION_LABEL[destination.region]}</small>
        <strong className="block text-h3 font-bold">{destination.name}</strong>
      </span>
    </Link>
  );
}
