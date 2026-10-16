import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

/**
 * Every spec's `test`: Google's hosts answer with an empty script, so no
 * request leaves the run and, with gtag.js absent, every gtag call stays in
 * window.dataLayer for analytics.spec.ts to read.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(/^https:\/\/([^/]+\.)?(googletagmanager|google-analytics)\.com\//, (route) =>
      route.fulfill({ contentType: 'text/javascript', body: '' }),
    );
    await use(context);
  },
});
