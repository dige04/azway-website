/** Routes the smoke test opens. Add each new page here (paths need seed data). */
export const ROUTES = [
  '/',
  '/tour',
  '/tour?loai=trung-quoc&thoi-luong=4n3d&sap-xep=gia-tang',
  // Tour detail: most blocks (itinerary, FOC, cancellation), price 0, missing
  // blocks (no exclusions or cancellation), a gallery for the lightbox.
  '/tour/ha-noi-bach-dang-giang-ha-long-2n1d',
  '/tour/thach-lam-con-minh-4n3d-lc6',
  '/tour/sapa-cat-cat-fansipan-2n1d',
  '/tour/bac-hai-nam-ninh-3n2d-mc4',
  '/cam-nang/tour-trung-quoc-cua-khau',
];

/**
 * List routes: their heading reads the same with or without data, so the
 * cards must show. `codes`: the exact cards, in order (tour code on each),
 * which proves the URL state was applied.
 */
export const LISTS: Partial<Record<string, { codes?: string[] }>> = {
  '/tour': {},
  // Seed: Chinese 4N3Đ tours by price ascending, "Liên hệ báo giá" (LC6) last.
  '/tour?loai=trung-quoc&thoi-luong=4n3d&sap-xep=gia-tang': { codes: ['LC7', 'TK1S', 'LC6'] },
};

/**
 * Public URLs the menu and cards already link to but no page serves yet (M5
 * pages after WP-07). Next prefetches those links and gets 404s; the smoke
 * test tolerates exactly those. Remove a path when its page lands.
 */
export const NOT_BUILT = ['/du-thuyen', '/teambuilding', '/diem-den', '/cam-nang', '/lien-he', '/tim-kiem'];
