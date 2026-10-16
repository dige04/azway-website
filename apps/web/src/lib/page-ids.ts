/**
 * Element ids the layout and pages set themselves. Article headings get
 * anchors from their text (lib/article.ts) and must never take one of these.
 */
export const PAGE_IDS = {
  /** Skip-link target. */
  main: 'main',
  mobileDrawer: 'mobile-drawer',
  relatedProducts: 'san-pham-lien-quan',
  relatedArticles: 'bai-lien-quan',
} as const;
