/** Routes the smoke test opens. Add each new page here (paths need seed data). */
export const ROUTES = ['/', '/tour', '/tour?loai=trung-quoc&thoi-luong=4n3d&sap-xep=gia-tang', '/tour/ha-noi-ha-long-1-ngay'];

/**
 * Public URLs the menu and cards already link to but no page serves yet (M5
 * pages after WP-07). Next prefetches those links and gets 404s; the smoke
 * test tolerates exactly those. Remove a path when its page lands.
 */
export const NOT_BUILT = ['/du-thuyen', '/teambuilding', '/diem-den', '/cam-nang', '/lien-he', '/tim-kiem'];
