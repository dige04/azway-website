import { RichText } from '@/components/RichText';
import type { BlocksContent } from '@/lib/cms-types';

/** The design's `.article-prose` typography on top of RichText. */
const PROSE = [
  'text-[17px] leading-[1.95] text-ink-2 sm:text-lg [&_p]:mb-[18px]',
  '[&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-serif [&_h2]:text-[25px] [&_h2]:leading-[1.35] [&_h2]:tracking-[-0.02em] sm:[&_h2]:text-[28px]',
  '[&_h3]:font-serif [&_h3]:text-[21px]',
  '[&_blockquote]:text-[15px] [&_blockquote]:leading-[1.8] [&_blockquote]:text-label',
].join(' ');

/** Article content; `blocks` come from `prepareArticle` (headings carry their TOC anchor). */
export function ArticleBody({ blocks }: { blocks: BlocksContent }) {
  return <RichText content={blocks} className={PROSE} />;
}
