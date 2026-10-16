import type { BlocksContent } from '@/lib/cms-types';
import { mediaUrl } from '@/lib/media';
import { RichTextBlocks } from './RichTextBlocks';

/**
 * Strapi Blocks rich text (article content, cruise and destination
 * descriptions) with @strapi/blocks-react-renderer. Links only to http(s),
 * tel, mailto or site paths; external ones open a new tab. Images get their
 * absolute URL here, on the server (an image the CMS has no URL for is
 * dropped). Typography comes from `className`, e.g. "[&_h2]:text-2xl".
 */
export function RichText({ content, className }: { content: BlocksContent | null | undefined; className?: string }) {
  const blocks = (content ?? []).flatMap((block) => {
    if (block.type !== 'image') return [block];
    const image = block.image as { url?: string } | undefined;
    const url = mediaUrl(image?.url);
    return url ? [{ ...block, image: { ...image, url } }] : [];
  });
  return <RichTextBlocks blocks={blocks} className={className} />;
}
