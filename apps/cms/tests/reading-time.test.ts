import { describe, expect, it } from 'vitest';
import { countWords, readingMinutes } from '../src/utils/reading-time';

const paragraph = (...children: object[]) => ({ type: 'paragraph', children });
const text = (value: string, extra: object = {}) => ({ type: 'text', text: value, ...extra });

describe('readingMinutes', () => {
  it('counts words across blocks, inline formatting and list items', () => {
    const blocks = [
      { type: 'heading', level: 2, children: [text('Kinh nghiệm')] },
      paragraph(text('hel'), text('lo', { bold: true }), text(' Hạ '), { type: 'link', url: '/x', children: [text('Long')] }),
      { type: 'list', format: 'unordered', children: [
        { type: 'list-item', children: [text('một')] },
        { type: 'list-item', children: [text('hai')] },
      ] },
      { type: 'image', image: { url: '/a.jpg' }, children: [text('')] },
    ];
    // "Kinh nghiệm" + "hello Hạ Long" + "một" + "hai"
    expect(countWords(blocks)).toBe(7);
  });

  it('rounds up to whole minutes at 200 words per minute', () => {
    const words = (n: number) => [paragraph(text(Array(n).fill('từ').join(' ')))];
    expect(readingMinutes([])).toBe(0);
    expect(readingMinutes(null)).toBe(0);
    expect(readingMinutes(words(1))).toBe(1);
    expect(readingMinutes(words(200))).toBe(1);
    expect(readingMinutes(words(201))).toBe(2);
  });
});
