import Image from 'next/image';
import Link from 'next/link';
import { Check } from '@/components/product/Detail';
import { Show } from '@/components/Show';
import type { Teambuilding } from '@/lib/cms-types';
import { imageProps } from '@/lib/media';
import { groupSize } from '@/lib/present';
import { firstParagraph } from '@/lib/text';

/** A programme on /teambuilding (the design's `.package`): theme, summary and bundled services. */
export function ProgrammeCard({ programme, number }: { programme: Teambuilding; number: number }) {
  const href = `/teambuilding/${programme.slug}`;
  const image = imageProps(programme.thumbnail, programme.name);

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-line bg-white transition-shadow hover:shadow-card">
      <Link href={href} className="relative block aspect-[1.85] overflow-hidden bg-paper">
        {image && (
          <Image
            {...image}
            width={image.width ?? 800}
            height={image.height ?? 600}
            sizes="(min-width: 1181px) 440px, (min-width: 681px) 50vw, 100vw"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
          />
        )}
        <Show when={programme.theme}>
          {(theme) => <span className="absolute left-4 top-4 rounded-sm bg-white px-2.5 py-1 text-xs font-bold uppercase text-navy">{theme}</span>}
        </Show>
      </Link>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-xs font-extrabold tracking-[0.1em] text-red">CHƯƠNG TRÌNH {String(number).padStart(2, '0')}</p>
        <h3 className="mb-3 mt-2.5 text-[25px] font-bold leading-tight tracking-[-0.03em] text-navy">
          <Link href={href} className="hover:text-red">
            {programme.name}
          </Link>
        </h3>
        <Show when={firstParagraph(programme.description)}>{(summary) => <p className="line-clamp-3 text-[15px] text-muted">{summary}</p>}</Show>
        <Show when={groupSize(programme.groupSizeMin, programme.groupSizeMax)}>
          {(size) => <p className="mt-3 text-sm font-semibold text-ink-2">Quy mô {size}</p>}
        </Show>
        <Show when={programme.packages}>
          {(items) => (
            <ul className="mt-5 grid gap-2.5 text-[15px]">
              {items.map((item) => (
                <li key={item.id} className="flex gap-2.5 text-ink-2">
                  <Check className="mt-1 text-red" />
                  {item.text}
                </li>
              ))}
            </ul>
          )}
        </Show>
        <div className="mt-auto pt-6">
          <Link href={href} className="flex min-h-12 items-center justify-center rounded-button border border-navy px-5 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-white">
            {`Xem chương trình ${programme.name}`}
          </Link>
        </div>
      </div>
    </article>
  );
}
