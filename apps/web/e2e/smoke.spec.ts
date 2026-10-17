import type { ConsoleMessage } from '@playwright/test';
import { expect, test } from './test';
import { CALLS, LISTS, NOT_BUILT, ROUTES, TEXTS } from './routes';

/** A 404 prefetch (`?_rsc=`) of a link to a page that does not exist yet. */
function isPendingPagePrefetch(message: ConsoleMessage): boolean {
  const { url } = message.location();
  if (!url || !message.text().includes('404')) return false;
  const { pathname, searchParams } = new URL(url);
  const pending = NOT_BUILT.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return searchParams.has('_rsc') && pending;
}

// A route passes when its document answers < 400, it shows its heading, its
// cards if it is a list (LISTS), its own content (TEXTS), a dialable call link
// where one is promised (CALLS) and the contact dock (the conversion channel),
// nothing scrolls sideways, and the page logs no console error and throws no
// uncaught exception, including after hydration.
for (const route of ROUTES) {
  test(`smoke ${route}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !isPendingPagePrefetch(message)) errors.push(`console: ${message.text()} (${message.location().url})`);
    });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

    // Screenshots: a still carousel, so captures are comparable.
    if (process.env.SMOKE_SCREENSHOTS) await page.emulateMedia({ reducedMotion: 'reduce' });
    const response = await page.goto(route, { waitUntil: 'load' });
    expect(response?.status(), `HTTP status of ${route}`).toBeLessThan(400);
    // Hydration errors and effects show up right after load.
    await page.waitForTimeout(1500);
    await expect(page.locator('h1').first(), `heading of ${route}`).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Liên hệ AZway' }), `contact dock on ${route}`).toBeVisible();
    const list = LISTS[route];
    if (list) {
      const cards = page.locator('main article');
      await expect(cards.first(), `cards on ${route}`).toBeVisible();
      if (list.cards) {
        await expect(cards, `cards on ${route}`).toHaveCount(list.cards.length);
        await expect(cards, `card order on ${route}`).toContainText(list.cards);
      }
    }
    for (const text of TEXTS[route] ?? []) {
      await expect(page.locator('main').getByText(text, { exact: true }).first(), `"${text}" on ${route}`).toBeVisible();
    }
    if (CALLS.includes(route)) await expect(page.locator('main a[href^="tel:"]').first(), `call link on ${route}`).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow (px) on ${route}`).toBeLessThanOrEqual(0);

    // SMOKE_SCREENSHOTS=<dir>: full-page captures for review (not committed).
    if (process.env.SMOKE_SCREENSHOTS) {
      // Scroll through once so lazy images load before the capture.
      for (let y = 0; y < (await page.evaluate(() => document.body.scrollHeight)); y += 600) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(150);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      const name = `${testInfo.project.name}${route.replace(/[^\w-]/g, '_')}.png`;
      await page.screenshot({ path: `${process.env.SMOKE_SCREENSHOTS}/${name}`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}

// SEO-08: an unknown URL answers 404 with a search box and featured products.
test('smoke 404', async ({ page }) => {
  const response = await page.goto('/khong-co-trang-nay', { waitUntil: 'load' });
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.getByRole('search').getByRole('searchbox')).toBeVisible();
  await expect(page.locator('main article').first(), 'featured products').toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontal overflow (px) on the 404 page').toBeLessThanOrEqual(0);
});

// Browsers and crawlers ask for /favicon.ico when a page links no icon (Safari ignores SVG icons).
test('site icon: /favicon.ico is served and pages link an icon', async ({ page, request }) => {
  const icon = await request.get('/favicon.ico');
  expect(icon.status()).toBe(200);
  expect(icon.headers()['content-type']).toMatch(/^image\//);
  await page.goto('/');
  await expect(page.locator('link[rel="icon"]')).not.toHaveCount(0);
});

// NFR-08: pages and API routes alike.
test('security headers on a page and an API response', async ({ request }) => {
  for (const res of [await request.get('/'), await request.post('/api/revalidate', { data: {} })]) {
    const headers = res.headers();
    expect(headers['content-security-policy'], res.url()).toContain("frame-ancestors 'none'");
    expect(headers['x-content-type-options'], res.url()).toBe('nosniff');
    expect(headers['x-frame-options'], res.url()).toBe('DENY');
  }
});
