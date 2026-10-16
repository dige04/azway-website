/**
 * Paged lists by path (`/cam-nang/trang/2`), so every page stays static/ISR
 * like the rest of the site: a `?trang=` parameter would make the route render
 * per request. Each page has exactly one URL: page 1 is the list itself.
 */

const MAX_PAGE = 9999;

/** Page number of a `trang/[page]` segment; null for anything that is not a page's one URL ("1", "02", "x"). */
export function pageFromSegment(segment: string): number | null {
  if (!/^[1-9]\d*$/.test(segment)) return null;
  const page = Number(segment);
  return page >= 2 && page <= MAX_PAGE ? page : null;
}

/** "/cam-nang" + 1 -> "/cam-nang", + 3 -> "/cam-nang/trang/3". */
export function pageHref(base: string, page: number): string {
  return page <= 1 ? base : `${base}/trang/${page}`;
}
