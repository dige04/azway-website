/**
 * Display rules shared by every page: what counts as "no data" (FR-PRD-05),
 * how prices and durations read (FR-PRD-03, FR-PRD-01).
 */

/**
 * True when a CMS value has something to show. Empty strings, empty lists,
 * lists of empty items and Strapi Blocks that only hold blank text count as
 * empty. Numbers and `true` always count; use `formatPrice` for prices.
 */
export function hasContent(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    // Blocks text node / repeatable `shared.text-item`: judged by its text only.
    if (typeof record.text === 'string') return hasContent(record.text);
    // Blocks element: judged by its children (an empty paragraph is empty).
    if (Array.isArray(record.children)) return record.children.some(hasContent) || record.type === 'image';
    // Media and other objects with an identity are content.
    if ('url' in record || 'documentId' in record) return true;
    return Object.values(record).some(hasContent);
  }
  return true;
}

const vnd = new Intl.NumberFormat('vi-VN');

/** FR-PRD-03: "1.390.000 đ/khách"; 0, null or a non-positive value -> "Liên hệ báo giá". */
export function formatPrice(price: number | null | undefined, unit = 'khách'): string {
  if (!price || !Number.isFinite(price) || price <= 0) return 'Liên hệ báo giá';
  return `${vnd.format(Math.round(price))} đ/${unit}`;
}

/** "Trong ngày", "2N1Đ", "4N3Đ". */
export function formatDuration(days: number, nights: number): string {
  if (days <= 1 && nights === 0) return 'Trong ngày';
  return `${days}N${nights}Đ`;
}

/**
 * Characters a Strapi uid accepts. Capped at 200 so the `<type>:<slug>` cache
 * tag stays within Next's 256-character limit. Checked before calling the CMS
 * so junk URLs 404 without a request or a cache entry.
 */
export function isStrapiSlug(value: string): boolean {
  return /^[A-Za-z0-9\-_.~]{1,200}$/.test(value);
}

/** True for absolute http(s) links, which leave the site (no next/link). */
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** "033.202.8585" -> "tel:0332028585"; null when there is no number. */
export function telHref(hotline: string | null | undefined): string | null {
  const digits = hotline?.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}
