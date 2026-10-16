import { describe, expect, it } from 'vitest';
import { prepareArticle } from './article';
import type { BlocksContent } from './cms-types';

const heading = (text: string, level = 2) => ({ type: 'heading', level, children: [{ type: 'text', text }] });

describe('article table of contents', () => {
  // FR-BLG-02: anchors are shared in links, so they must not depend on accents or case; a repeated
  // heading takes the next free suffix in document order, and ids the page uses are never taken.
  it('gives Vietnamese headings stable, unique anchors', () => {
    const content: BlocksContent = [
      heading('Đi đoàn: chuẩn bị gì?'),
      { type: 'paragraph', children: [{ type: 'text', text: 'x' }] },
      heading('Checklist nhanh', 3),
      heading('Đi Đoàn: Chuẩn bị gì'),
      heading('Main'),
      heading('Sản phẩm liên quan'),
      heading('🙂'),
    ];
    const { blocks, toc } = prepareArticle(content);
    expect(toc.map(({ id, level }) => [id, level])).toEqual([
      ['di-doan-chuan-bi-gi', 2],
      ['checklist-nhanh', 3],
      ['di-doan-chuan-bi-gi-2', 2],
      ['main-2', 2],
      ['san-pham-lien-quan-2', 2],
      ['muc', 2],
    ]);
    expect(blocks.filter((block) => block.type === 'heading').map((block) => block.id)).toEqual(toc.map((entry) => entry.id));
    expect(prepareArticle(content).toc).toEqual(toc);
  });
});
