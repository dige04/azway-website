import type { BlocksContent } from '@/lib/cms-types';
import { mediaUrl } from '@/lib/media';
import { RichTextBlocks } from './RichTextBlocks';

/**
 * Strapi Blocks rich text (article content, cruise and destination
 * descriptions) with @strapi/blocks-react-renderer. Links only to http(s),
 * tel, mailto or site paths; external ones open a new tab. Images get their
 * absolute URL here, on the server (an image without a URL or without
 * dimensions, e.g. an SVG, is dropped: next/image needs both). Typography comes from `className`, e.g. "[&_h2]:text-2xl".
 */
export function RichText({ content, className }: { content: BlocksContent | null | undefined; className?: string }) {
  const blocks = (content ?? []).flatMap((block) => {
    if (block.type !== 'image') return [block];
    const image = block.image as { url?: string; width?: number | null; height?: number | null } | undefined;
    const url = mediaUrl(image?.url);
    return url && image?.width && image.height ? [{ ...block, image: { ...image, url } }] : [];
  });
  return <RichTextBlocks blocks={blocks} className={className} />;
}
