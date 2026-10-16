import type { Page } from '@playwright/test';
import { expect, test } from './test';

/**
 * AN-01..04: page views and track() events reach gtag, and the search term
 * (people type phone numbers) never does. ./test.ts stubs gtag.js, so calls
 * stay in dataLayer. Needs a build with NEXT_PUBLIC_GA_ID (CI sets a fake one).
 */

const TERM = '0912345678';

test.skip(({ isMobile }) => isMobile, 'one browser (desktop)');
if (process.env.CI && !process.env.NEXT_PUBLIC_GA_ID) throw new Error('analytics.spec.ts needs NEXT_PUBLIC_GA_ID on CI');
test.skip(!process.env.NEXT_PUBLIC_GA_ID, 'needs a build with NEXT_PUBLIC_GA_ID');

type Call = [string, ...unknown[]];

const gtagCalls = (page: Page) =>
  page.evaluate(() => ((window as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).map((args) => Array.from(args)) as Call[]);

const pageViews = async (page: Page) => {
  const locations: unknown[] = [];
  for (const [command, value, params] of await gtagCalls(page)) {
    if (command === 'set') locations.push(value);
    if (command === 'event' && value === 'page_view') locations.push(params ?? 'page_view');
  }
  return locations;
};

test('page views and clicks reach GA4, the search term never does', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.goto(`/tim-kiem?q=${TERM}`);
  // Keep the page: the call link must not leave it.
  await page.evaluate(() =>
    document.addEventListener('click', (event) => {
      if ((event.target as Element).closest('a[href^="tel:"]')) event.preventDefault();
    }),
  );
  await expect.poll(() => pageViews(page)).toEqual([
    { page_location: `${origin}/tim-kiem`, page_referrer: '' },
    'page_view',
  ]);

  const call = page.locator('main a[href^="tel:"]').first();
  const phone = await call.getAttribute('href');
  await call.click();
  // A client-side navigation is a page view too, referred by the search page.
  await page.getByRole('banner').getByRole('link', { name: 'AZway trang chủ' }).click();
  await expect.poll(() => pageViews(page)).toEqual([
    { page_location: `${origin}/tim-kiem`, page_referrer: '' },
    'page_view',
    { page_location: `${origin}/`, page_referrer: `${origin}/tim-kiem` },
    'page_view',
  ]);

  const calls = await gtagCalls(page);
  expect(calls).toContainEqual(['config', process.env.NEXT_PUBLIC_GA_ID, { send_page_view: false }]);
  expect(calls).toContainEqual(['event', 'click_call', { link_url: phone }]);
  expect(JSON.stringify(calls)).not.toContain(TERM);
});
