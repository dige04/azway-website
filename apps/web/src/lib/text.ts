import type { BlocksContent } from './cms-types';

/** Lower case without Vietnamese accents: "Hạ Long" and "ha long" both read "ha long". */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/gi, 'd').toLowerCase();
}

/** "Lào Cai – Hà Khẩu" -> "lao-cai-ha-khau". */
export function slugify(text: string): string {
  return foldText(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Whether `text` holds every word of `query`, case and accents ignored ("ha long" finds "Hạ Long"). */
export function matchesQuery(text: string, query: string): boolean {
  const haystack = foldText(text);
  return foldText(query).split(/\s+/).every((word) => haystack.includes(word));
}

export type InlineNode = { type?: string; text?: string; children?: InlineNode[] };

/** The words of rich-text inline nodes (text, links), formatting dropped. */
export function plainText(nodes: InlineNode[] | undefined): string {
  return (nodes ?? []).map((node) => node.text ?? plainText(node.children)).join('');
}

/** The first paragraph with words, as plain text: a card summary, whatever the description starts with. */
export function firstParagraph(content: BlocksContent | null | undefined): string {
  for (const block of content ?? []) {
    const text = block.type === 'paragraph' ? plainText(block.children as InlineNode[]).trim() : '';
    if (text) return text;
  }
  return '';
}
