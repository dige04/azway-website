import { expect, test } from '@playwright/test';

// FR-BLG-02/03 on a seeded article: its table of contents leads to its
// headings, and the hand-picked tours show. Seed: tour-trung-quoc-cua-khau
// has five sections and three tours (LC2, MC3, TK1S).
test('article: table of contents leads to the headings, related products show', async ({ page }) => {
  await page.goto('/cam-nang/tour-trung-quoc-cua-khau');

  const links = page.locator('main a[href^="#"]').filter({ visible: true });
  await expect(links.first()).toBeVisible();
  const targets = await links.evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')!.slice(1)));
  expect(targets.length).toBeGreaterThanOrEqual(5);
  for (const id of targets) {
    await expect(page.locator(`main :is(h2, h3)[id="${id}"]`), `heading for #${id}`).toHaveCount(1);
  }

  const products = page.getByRole('region', { name: 'Sản phẩm liên quan' }).locator('article');
  await expect(products).toHaveCount(3);
  await expect(products).toContainText(['LC2', 'MC3', 'TK1S']);
});
