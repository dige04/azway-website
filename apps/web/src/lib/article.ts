import type { BlocksContent } from './cms-types';
import { PAGE_IDS } from './page-ids';
import { type InlineNode, plainText, slugify } from './text';

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Article content with heading anchors, and its table of contents
 * (FR-BLG-02). Every heading gets an anchor from its text without accents,
 * so a shared "#chuan-bi-gi" link keeps working while the heading stays the
 * same; repeated headings are numbered ("-2", "-3").
 */
export function prepareArticle(content: BlocksContent | null | undefined): { blocks: BlocksContent; toc: TocEntry[] } {
  const used = new Set<string>(Object.values(PAGE_IDS));
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
    return block;
  });
  return { blocks, toc };
}
