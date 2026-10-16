import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

// A route passes when its document answers < 400 and the page logs no console
// error and throws no uncaught exception, including after hydration.
for (const route of ROUTES) {
  test(`smoke ${route}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

    const response = await page.goto(route);
    expect(response?.status(), `HTTP status of ${route}`).toBeLessThan(400);
    await page.waitForLoadState('networkidle');

    // SMOKE_SCREENSHOTS=<dir>: full-page captures for review (not committed).
    if (process.env.SMOKE_SCREENSHOTS) {
      const name = `${testInfo.project.name}${route.replaceAll('/', '_') || '_'}.png`;
      await page.screenshot({ path: `${process.env.SMOKE_SCREENSHOTS}/${name}`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
