import { describe, expect, it } from 'vitest';
import { pickRelated } from './related';

const doc = (documentId: string) => ({ documentId });

describe('pickRelated (FR-PRD-06)', () => {
  it('returns at most 4 others, same destination first, without duplicates or itself', () => {
    const related = pickRelated('self', [doc('self'), doc('a'), doc('b')], [doc('b'), doc('self'), doc('c'), doc('d'), doc('e')]);
    expect(related.map((item) => item.documentId)).toEqual(['a', 'b', 'c', 'd']);
  });
});
