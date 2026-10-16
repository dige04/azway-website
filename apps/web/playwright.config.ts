import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test (TASKS M5 "Xong khi"): every route in e2e/routes.ts at 375px and
 * 1440px, against a running server. Locally: `pnpm preview`, then `pnpm smoke`
 * (SMOKE_BASE_URL to point elsewhere).
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: { baseURL: process.env.SMOKE_BASE_URL ?? 'http://localhost:8787' },
  projects: [
    { name: 'mobile-375', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true } },
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
