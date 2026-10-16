import type { BlocksContent } from './cms-types';
import { mediaUrl } from './media';
import { slugify } from './text';

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Ids already on every page (the layout's skip-link target). */
const RESERVED_IDS = ['main'];

type InlineNode = { type?: string; text?: string; children?: InlineNode[] };

function plainText(nodes: InlineNode[] | undefined): string {
  return (nodes ?? []).map((node) => node.text ?? plainText(node.children)).join('');
}

/**
 * Article body ready for the client renderer, and its table of contents
 * (FR-BLG-02). Every heading gets an anchor from its text without accents,
 * so a shared "#chuan-bi-gi" link keeps working while the heading stays the
 * same; repeated headings are numbered ("-2", "-3"). Images get absolute
 * URLs here, where CMS_URL is known.
 */
export function prepareArticle(content: BlocksContent | null | undefined): { blocks: BlocksContent; toc: TocEntry[] } {
  const used = new Set(RESERVED_IDS);
  const toc: TocEntry[] = [];
  const blocks = (content ?? []).map((block) => {
    if (block.type === 'heading') {
      const text = plainText(block.children as InlineNode[]).trim();
      const base = slugify(text) || 'muc';
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      used.add(id);
      if (text && (block.level === 2 || block.level === 3)) toc.push({ id, text, level: block.level });
      return { ...block, id };
    }
    if (block.type === 'image') {
      const image = block.image as { url?: string } | undefined;
      const url = mediaUrl(image?.url);
      return url ? { ...block, image: { ...image, url } } : null;
    }
    return block;
  });
  return { blocks: blocks.filter((block) => block !== null), toc };
}
