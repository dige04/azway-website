import { expect, test } from '@playwright/test';

type Recorder = Window & { tracked?: unknown[] };

// AN-03: a contact link reports its click as an `azway:track` event.
test('a contact link fires azway:track', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const win = window as Recorder;
    win.tracked = [];
    window.addEventListener('azway:track', (event) => win.tracked?.push((event as CustomEvent).detail));
    // Keep the page: the click must not open Zalo.
    document.addEventListener('click', (event) => event.preventDefault());
  });
  const zalo = page.getByRole('complementary', { name: 'Liên hệ AZway' }).getByRole('link', { name: 'Zalo' });
  // The handler exists only after hydration; click until it has run.
  await expect(async () => {
    await zalo.click();
    expect(await page.evaluate(() => (window as Recorder).tracked?.length)).toBeGreaterThan(0);
  }).toPass();
  const [first] = await page.evaluate(() => (window as Recorder).tracked ?? []);
  expect(first).toEqual({ event: 'click_zalo', link_url: await zalo.getAttribute('href') });
});
