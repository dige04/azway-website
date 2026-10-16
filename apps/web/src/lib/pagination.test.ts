import { describe, expect, it } from 'vitest';
import { pageFromSegment, pageHref } from './pagination';

describe('list pagination', () => {
  // SEO: a page reachable under two URLs is duplicate content.
  it('gives every page exactly one URL', () => {
    for (const page of [1, 2, 10]) {
      const href = pageHref('/cam-nang', page);
      const segment = href.split('/trang/')[1];
      expect(segment === undefined ? 1 : pageFromSegment(segment)).toBe(page);
    }
    for (const other of ['1', '0', '02', '2.0', '-2', 'x', '']) expect(pageFromSegment(other)).toBeNull();
  });
});
