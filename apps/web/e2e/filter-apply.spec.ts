import { expect, test, type Page } from '@playwright/test';

// AN-04: `filter_apply` counts the changes the visitor makes on /tour, never
// history moves. Seed: Chinese tours, some of them 4N3Đ.
const FILTERED = '/tour?loai=trung-quoc&thoi-luong=4n3d';
const WIDER = '/tour?loai=trung-quoc';
const at = (path: string) => new RegExp(`${path.replaceAll('?', '\\?')}$`);

async function countApplies(page: Page) {
  // sessionStorage, so a full reload would not reset the count.
  await page.addInitScript(() => {
    window.addEventListener('azway:track', (event) => {
      if ((event as CustomEvent<{ event: string }>).detail.event !== 'filter_apply') return;
      sessionStorage.setItem('applies', String(Number(sessionStorage.getItem('applies') ?? 0) + 1));
    });
  });
  return () => page.evaluate(() => Number(sessionStorage.getItem('applies') ?? 0));
}

async function backAndForward(page: Page, back: string, forward: string) {
  await page.goBack();
  await expect(page).toHaveURL(at(back));
  await page.goForward();
  await expect(page).toHaveURL(at(forward));
  await page.waitForTimeout(500);
}

test('filter_apply fires once per applied change, never on Back/Forward', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'the panel is open by default only on wide screens');
  const applies = await countApplies(page);
  const chip = page.getByRole('link', { name: 'Bỏ điều kiện 4N3Đ' });

  await page.goto(FILTERED);
  await page.waitForTimeout(1000);
  expect(await applies(), 'opening a shared link').toBe(0);

  await chip.click();
  await expect(page).toHaveURL(at(WIDER));
  await expect.poll(applies, { message: 'chip' }).toBe(1);

  await page.selectOption('#tour-thoi-luong', '4n3d');
  await page.getByRole('button', { name: 'Lọc tour' }).click();
  await expect(page).toHaveURL(at(FILTERED));
  await expect.poll(applies, { message: 'form' }).toBe(2);

  await backAndForward(page, WIDER, FILTERED);
  expect(await applies(), 'Back/Forward').toBe(2);

  // Nothing changed: no apply now, and none left over for later.
  await page.getByRole('button', { name: 'Lọc tour' }).click();
  await page.waitForTimeout(500);
  await backAndForward(page, WIDER, FILTERED);
  expect(await applies(), 'resubmit, then Back/Forward').toBe(2);

  // Opened in a new tab: nothing applied here, and none left over for Back.
  const tab = context.waitForEvent('page');
  await chip.click({ modifiers: ['ControlOrMeta'] });
  await (await tab).close();
  await page.goBack();
  await expect(page).toHaveURL(at(WIDER));
  await page.waitForTimeout(500);
  expect(await applies(), 'new-tab click, then Back').toBe(2);
});
