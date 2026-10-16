import { describe, expect, it } from 'vitest';
import type { BlocksContent } from './cms-types';
import { firstParagraph } from './text';

describe('firstParagraph', () => {
  it('summarises a description by its first paragraph with words, whatever comes before it', () => {
    const description: BlocksContent = [
      { type: 'image', image: { url: '/uploads/a.jpg' }, children: [{ type: 'text', text: '' }] },
      { type: 'list', format: 'unordered', children: [{ type: 'list-item', children: [{ type: 'text', text: 'MC' }] }] },
      { type: 'paragraph', children: [{ type: 'text', text: '  ' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'Chơi cùng nhau, ' }, { type: 'link', url: '/x', children: [{ type: 'text', text: 'gala' }] }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'Đoạn sau.' }] },
    ];
    expect(firstParagraph(description)).toBe('Chơi cùng nhau, gala');
    expect(firstParagraph(null)).toBe('');
  });
});
