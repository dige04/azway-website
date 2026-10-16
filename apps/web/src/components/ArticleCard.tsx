import Image from 'next/image';
import Link from 'next/link';
import type { Article } from '@/lib/cms-types';
import { imageProps } from '@/lib/media';

/** Guide article card (cover, category, reading time, title, excerpt); empty parts are left out. */
export function ArticleCard({ article }: { article: Article }) {
  const cover = imageProps(article.cover, article.title);
  const href = `/cam-nang/${article.slug}`;
  return (
    <article className="flex flex-col overflow-hidden rounded-[22px] border border-line bg-white">
      <Link href={href} className="block h-[215px] overflow-hidden bg-paper">
        {cover && <Image {...cover} width={cover.width ?? 800} height={cover.height ?? 600} sizes="(min-width: 1181px) 450px, (min-width: 681px) 50vw, 100vw" className="size-full object-cover" />}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {article.category && <span className="rounded-full bg-[#ffe8ec] px-3 py-1 font-bold text-red-dark">{article.category.name}</span>}
          {article.readingMinutes ? <span className="text-muted">{article.readingMinutes} phút đọc</span> : null}
        </div>
        <h3 className="text-[23px] font-bold leading-tight tracking-[-0.025em] text-navy">
          <Link href={href} className="hover:text-red">
            {article.title}
          </Link>
        </h3>
        {article.excerpt && <p className="text-[15px] text-muted">{article.excerpt}</p>}
      </div>
    </article>
  );
}
