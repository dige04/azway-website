import { describe, expect, it } from 'vitest';
import { pickRelated, relatedFromCatalog } from './related';

const doc = (documentId: string) => ({ documentId });

describe('pickRelated (FR-PRD-06)', () => {
  it('returns at most 4 others, same destination first, without duplicates or itself', () => {
    const related = pickRelated('self', [doc('self'), doc('a'), doc('b')], [doc('b'), doc('self'), doc('c'), doc('d'), doc('e')]);
    expect(related.map((item) => item.documentId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('from a catalog: any shared destination first, then the same type', () => {
    const tour = (documentId: string, category: string, ...places: string[]) => ({ documentId, category, destinations: places.map((slug) => ({ slug })) });
    const self = tour('self', 'trung_quoc', 'bac-hai', 'dong-hung');
    const catalog = [self, tour('other-type', 'noi_dia', 'ha-long'), tour('same-type', 'trung_quoc'), tour('second-place', 'noi_dia', 'dong-hung')];
    const related = relatedFromCatalog(self, catalog, (item) => item.category === self.category);
    expect(related.map((item) => item.documentId)).toEqual(['second-place', 'same-type']);
  });
});
