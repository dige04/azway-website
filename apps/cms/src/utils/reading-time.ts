// Reading time for `article.content` (Strapi blocks), FR-BLG-02.

export const WORDS_PER_MINUTE = 200;

type BlockNode = { type?: string; text?: unknown; children?: BlockNode[] };

const isInline = (node: BlockNode) => node.type === 'text' || node.type === 'link';

// Inline nodes are concatenated as-is so a word split by formatting
// ("hel" + **"lo"**) stays one word; block nodes are separated by a space.
const textOf = (node: BlockNode): string => {
  if (typeof node.text === 'string') return node.text;
  return (node.children ?? []).map((child) => (isInline(child) ? textOf(child) : ` ${textOf(child)} `)).join('');
};

export const countWords = (blocks: unknown): number => {
  if (!Array.isArray(blocks)) return 0;
  return (blocks as BlockNode[])
    .map(textOf)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
};

export const readingMinutes = (blocks: unknown): number => Math.ceil(countWords(blocks) / WORDS_PER_MINUTE);
