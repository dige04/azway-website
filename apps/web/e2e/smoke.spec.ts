import { expect, test, type ConsoleMessage } from '@playwright/test';
import { NOT_BUILT, ROUTES, SEED_CONTENT } from './routes';

/** A 404 prefetch (`?_rsc=`) of a link to a page that does not exist yet. */
function isPendingPagePrefetch(message: ConsoleMessage): boolean {
  const { url } = message.location();
  if (!url || !message.text().includes('404')) return false;
  const { pathname, searchParams } = new URL(url);
  const pending = NOT_BUILT.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return searchParams.has('_rsc') && pending;
}

// A route passes when its document answers < 400, it shows its heading, its
// seed content (SEED_CONTENT) and the contact dock (the conversion channel),
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
    const content = SEED_CONTENT[route];
    if (content) await expect(page.locator(content).first(), `seed content on ${route}`).toBeVisible();
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
      const name = `${testInfo.project.name}${route.replaceAll('/', '_')}.png`;
      await page.screenshot({ path: `${process.env.SMOKE_SCREENSHOTS}/${name}`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
