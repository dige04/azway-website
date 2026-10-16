import { describe, expect, it } from 'vitest';
import { formatPrice, hasContent, isStrapiSlug } from './present';

describe('hasContent (FR-PRD-05: empty data hides the block)', () => {
  it('treats what Strapi returns for an unfilled field as empty', () => {
    const emptyEditor = [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }];
    // Components always carry an `id` (and `__component` in dynamic zones).
    const emptyComponent = { id: 7, title: '', description: null };
    const emptyZone = [{ id: 3, __component: 'shared.text-item', text: '' }];
    for (const value of [null, undefined, '', '   ', [], [{ id: 1, text: '' }], emptyEditor, {}, { metaTitle: null }, emptyComponent, [emptyComponent], emptyZone]) {
      expect(hasContent(value), JSON.stringify(value)).toBe(false);
    }
  });

  it('treats any real value as content', () => {
    const paragraph = [{ type: 'paragraph', children: [{ type: 'text', text: 'Bãi cọc' }] }];
    for (const value of ['Hạ Long', 0, [{ id: 1, text: 'Xe đưa đón' }], paragraph, { url: '/uploads/a.jpg' }, [{ documentId: 'x' }], { id: 7, title: 'Ngày 1' }]) {
      expect(hasContent(value), JSON.stringify(value)).toBe(true);
    }
  });
});

describe('formatPrice (FR-PRD-03)', () => {
  it('formats VND per guest and falls back to "Liên hệ báo giá"', () => {
    expect(formatPrice(1390000)).toBe('1.390.000 đ/khách');
    expect(formatPrice(310000000, 'chuyến')).toBe('310.000.000 đ/chuyến');
    for (const value of [0, null, undefined, -1, Number.NaN]) expect(formatPrice(value)).toBe('Liên hệ báo giá');
  });
});

describe('isStrapiSlug', () => {
  it('accepts the uid charset up to 200 chars, rejects the rest', () => {
    for (const slug of ['ha-long', 'ha_long', 'LC2', 'a.b~c', 'x'.repeat(200)]) expect(isStrapiSlug(slug), slug).toBe(true);
    for (const slug of ['', 'x'.repeat(201), 'hạ-long', 'a/b', 'a b', '%2e']) expect(isStrapiSlug(slug), slug).toBe(false);
  });
});
