import { expect, test } from '@playwright/test';

// AC-09 / FR-PRD-05: a block without data has no heading at all.
test('a tour without exclusions or cancellation rules shows neither block', async ({ page }) => {
  const headings = async (path: string) => {
    await page.goto(path);
    return page.locator('h2').allInnerTexts();
  };
  const full = await headings('/tour/ha-noi-bach-dang-giang-ha-long-2n1d');
  expect(full).toEqual(expect.arrayContaining(['Giá không bao gồm', 'Điều kiện hoàn huỷ', 'Chính sách FOC']));
  const missing = await headings('/tour/sapa-cat-cat-fansipan-2n1d');
  expect(missing).not.toContain('Giá không bao gồm');
  expect(missing).not.toContain('Điều kiện hoàn huỷ');
  expect(missing).not.toContain('Chính sách FOC');
});

// AC-02: the gallery lightbox opens, steps and closes.
test('gallery lightbox opens, moves to the next photo and closes on Escape', async ({ page }) => {
  await page.goto('/tour/bac-hai-nam-ninh-3n2d-mc4');
  await page.getByRole('button', { name: /^Xem ảnh 1\// }).click();
  const lightbox = page.getByRole('dialog');
  await expect(lightbox).toBeVisible();
  await expect(lightbox.getByText(/^1 \/ \d$/)).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(lightbox.getByText(/^2 \/ \d$/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(lightbox).toBeHidden();
});

test('an unknown tour is a 404', async ({ page }) => {
  expect((await page.goto('/tour/khong-co-tour-nay'))?.status()).toBe(404);
});
