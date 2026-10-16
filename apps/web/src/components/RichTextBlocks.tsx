'use client';

import { BlocksRenderer, type BlocksContent } from '@strapi/blocks-react-renderer';
import Image from 'next/image';
import { createElement, type ReactNode } from 'react';

/** A CMS link that may go in href: http(s), tel, mailto or a path on this site. */
function linkHref(url: string): string | null {
  const value = url.trim();
  return /^(https?:\/\/|tel:|mailto:)/i.test(value) || /^\/(?!\/)/.test(value) ? value : null;
}

/** The client half of `RichText` (the renderer is a client module); use `RichText`. */
export function RichTextBlocks({ blocks, className }: { blocks: unknown[]; className?: string }) {
  return (
    <div className={className}>
      <BlocksRenderer
        content={blocks as BlocksContent}
        blocks={{
          paragraph: ({ children }) => <p className="mb-4">{children}</p>,
          // `id`: an anchor set by the caller (article table of contents).
          heading: ({ children, level, ...props }) =>
            createElement(
              `h${level}`,
              {
                id: (props as { id?: string }).id,
                className: `mb-3 mt-7 scroll-mt-28 font-bold leading-snug text-navy ${level <= 2 ? 'text-2xl' : 'text-xl'}`,
              },
              children,
            ),
          list: ({ children, format }) =>
            format === 'ordered' ? (
              <ol className="mb-5 list-decimal pl-6 [&>li]:mb-2 [&>li]:pl-1">{children}</ol>
            ) : (
              <ul className="mb-5 list-disc pl-6 [&>li]:mb-2 [&>li]:pl-1">{children}</ul>
            ),
          quote: ({ children }) => <blockquote className="my-6 border-l-[3px] border-red bg-cream px-5 py-4">{children}</blockquote>,
          link: ({ children, url }) => <RichTextLink url={url}>{children}</RichTextLink>,
          image: ({ image }) => (
            <figure className="my-6">
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
function RichTextLink({ url, children }: { url: string; children: ReactNode }) {
  const href = linkHref(url);
  if (!href) return <>{children}</>;
  const external = /^https?:/i.test(href);
  return (
    <a href={href} className="text-red underline underline-offset-2" {...(external && { target: '_blank', rel: 'noopener noreferrer' })}>
      {children}
    </a>
  );
}
