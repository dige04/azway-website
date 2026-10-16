'use client';

import { BlocksRenderer, type BlocksContent } from '@strapi/blocks-react-renderer';
import Image from 'next/image';
import { createElement, type ReactNode } from 'react';

/** A CMS link that may go in href: http(s), tel, mailto or a path on this site. */
function linkHref(url: string): string | null {
  const value = url.trim();
  return /^(https?:\/\/|tel:|mailto:)/i.test(value) || /^\/(?!\/)/.test(value) ? value : null;
}

/**
 * Article content (Strapi Blocks), styled like the design's `.article-prose`.
 * `blocks` come from `prepareArticle`: headings carry their anchor `id`,
 * images an absolute URL.
 */
export function ArticleBody({ blocks }: { blocks: unknown[] }) {
  return (
    <div className="text-[17px] leading-[1.95] text-ink-2 sm:text-lg">
      <BlocksRenderer
        content={blocks as BlocksContent}
        blocks={{
          paragraph: ({ children }) => <p className="mb-[18px]">{children}</p>,
          heading: ({ children, level, ...props }) =>
            createElement(
              `h${level}`,
              {
                id: (props as { id?: string }).id,
                className:
                  level <= 2
                    ? 'mb-4 mt-8 scroll-mt-28 font-serif text-[25px] font-bold leading-[1.35] tracking-[-0.02em] text-navy sm:text-[28px]'
                    : 'mb-3 mt-7 scroll-mt-28 font-serif text-[21px] font-bold leading-snug text-navy',
              },
              children,
            ),
          list: ({ children, format }) =>
            format === 'ordered' ? (
              <ol className="mb-6 list-decimal pl-6 [&>li]:mb-2 [&>li]:pl-1">{children}</ol>
            ) : (
              <ul className="mb-6 list-disc pl-6 [&>li]:mb-2 [&>li]:pl-1">{children}</ul>
            ),
          quote: ({ children }) => (
            <blockquote className="my-7 border-l-[3px] border-red bg-cream px-5 py-4 text-[15px] leading-[1.8] text-label">{children}</blockquote>
          ),
          link: ({ children, url }) => <ArticleLink url={url}>{children}</ArticleLink>,
          image: ({ image }) => (
            <figure className="my-7">
              <Image
                src={image.url}
                alt={image.alternativeText ?? ''}
                width={image.width}
                height={image.height}
                sizes="(min-width: 1181px) 820px, 100vw"
                className="h-auto w-full rounded-sm"
              />
              {image.caption && <figcaption className="pt-2 text-xs text-muted">{image.caption}</figcaption>}
            </figure>
          ),
        }}
      />
    </div>
  );
}

/** In-text links need no client navigation, so a plain <a> (external ones open a new tab). */
function ArticleLink({ url, children }: { url: string; children: ReactNode }) {
  const href = linkHref(url);
  if (!href) return <>{children}</>;
  const external = /^https?:/i.test(href);
  return (
    <a href={href} className="text-red underline underline-offset-2" {...(external && { target: '_blank', rel: 'noopener noreferrer' })}>
      {children}
    </a>
  );
}
