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
  '/cam-nang',
  '/cam-nang/danh-muc/trung-quoc',
  '/cam-nang/tour-trung-quoc-cua-khau',
  '/du-thuyen',
  // All three options: day ticket, charter (no price), dinner.
  '/du-thuyen/ambassador',
  '/diem-den',
  // Tours and cruises.
  '/diem-den/ha-long',
  '/lien-he',
  '/tim-kiem',
  // Tours and an article, accents typed or not.
  '/tim-kiem?q=ha+long',
  '/teambuilding',
  // 12 games, packages, a combined tour, the other programme.
  '/teambuilding/teambuilding',
];

/**
 * List routes: their heading reads the same with or without data, so the
 * cards must show. `cards`: the exact cards, in order (text on each, e.g. a
 * tour code), which proves the URL's filter was applied.
 */
export const LISTS: Partial<Record<string, { cards?: string[] }>> = {
  '/tour': {},
  // Seed: Chinese 4N3Đ tours by price ascending, "Liên hệ báo giá" (LC6) last.
  '/tour?loai=trung-quoc&thoi-luong=4n3d&sap-xep=gia-tang': { cards: ['LC7', 'TK1S', 'LC6'] },
  '/cam-nang': {},
  // Seed: one article per category.
  '/cam-nang/danh-muc/trung-quoc': { cards: ['Đi Trung Quốc: chọn cửa khẩu'] },
  '/du-thuyen': {},
  '/diem-den/ha-long': {},
  // No query: featured products.
  '/tim-kiem': {},
  '/tim-kiem?q=ha+long': { cards: ['HL-1N', 'HT-BDHL-2N1D', 'Hạ Long 2 ngày 1 đêm'] },
  '/teambuilding': {},
};

/** Text each route must show in <main> (seed data), so a page is never empty. */
export const TEXTS: Partial<Record<string, string[]>> = {
  '/du-thuyen/ambassador': ['Vé du ngoạn trong ngày', 'Du thuyền ăn tối', 'Thuê nguyên tàu'],
  '/diem-den': ['Hạ Long', 'Đông Hưng'],
  '/diem-den/ha-long': ['Tour đi Hạ Long', 'Du thuyền Hạ Long'],
  '/lien-he': ['033.202.8585', 'info@azway.vn'],
  '/teambuilding': ['Teambuilding & Gala Dinner'],
  '/teambuilding/teambuilding': ['Mò cua bắt ốc', 'Xếp tháp niềm tin', 'MC và nhân sự điều phối'],
};

/**
 * Public URLs the menu and cards already link to but no page serves yet (M5
 * pages after WP-07). Next prefetches those links and gets 404s; the smoke
 * test tolerates exactly those. Remove a path when its page lands.
 */
export const NOT_BUILT: string[] = [];
