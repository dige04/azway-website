import type { APIRequestContext } from '@playwright/test';
import { expect, test } from './test';

/**
 * TASKS M7 "Xong khi" (AC-16, SEO-07, D8): a legacy path answers 308 (CMS
 * 301) or 307 (CMS 302) to its target, and a redirect saved in Strapi after
 * the build works at once: the CMS webhook clears tag `redirect`.
 *
 * Writes through the Strapi admin API (CMS_URL, E2E_ADMIN_EMAIL /
 * E2E_ADMIN_PASSWORD), and the preview needs REVALIDATE_SECRET matching the CMS.
 */

const CMS = process.env.CMS_URL?.replace(/\/+$/, '');
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
const REDIRECTS = `${CMS}/content-manager/collection-types/api::redirect.redirect`;

// HTTP only: one browser is enough.
test.skip(({ isMobile }) => isMobile, 'one browser (desktop)');

/** Status and target of `path`, without following the redirect. */
async function answer(request: APIRequestContext, path: string): Promise<[number, string | null]> {
  const res = await request.get(path, { maxRedirects: 0 });
  const location = res.headers().location;
  if (!location) return [res.status(), null];
  const url = new URL(location, 'http://site.invalid');
  return [res.status(), url.pathname + url.search];
}

// Seed: apps/cms/scripts/seed-data/catalog.mjs.
test('seeded legacy paths redirect to their targets', async ({ request }) => {
  expect(await answer(request, '/tour-ha-long-1-ngay.html')).toEqual([308, '/tour/ha-noi-ha-long-1-ngay']);
  expect(await answer(request, '/tourtrungtonghop')).toEqual([308, '/tour?loai=trung-quoc']);
  expect(await answer(request, '/khuyen-mai-mua-he')).toEqual([307, '/']);
});

test('a redirect saved in Strapi after the build works without a rebuild', async ({ request }) => {
  const configured = !!(CMS && ADMIN.email && ADMIN.password);
  if (process.env.CI && !configured) throw new Error('redirect.spec.ts needs CMS_URL, E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD on CI');
  test.skip(!configured, 'needs CMS_URL, E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');

  // A renamed tour: the detail route's not-found branch (an ISR page).
  const from = `/tour/ten-cu-${Date.now().toString(36)}`;
  const target = '/tour/ha-noi-ha-long-1-ngay';
  // Requested first, so the cached redirect list without it must be cleared.
  expect(await answer(request, from)).toEqual([404, null]);

  const login = await request.post(`${CMS}/admin/login`, { data: ADMIN });
  expect(login.ok(), 'admin login').toBe(true);
  const headers = { authorization: `Bearer ${((await login.json()) as { data: { token: string } }).data.token}` };
  const created = await request.post(REDIRECTS, { headers, data: { from, to: target, statusCode: 301 } });
  expect(created.ok(), 'redirect created').toBe(true);
  const { documentId } = ((await created.json()) as { data: { documentId: string } }).data;
  try {
    // The webhook is sent after the commit, without waiting for it.
    await expect.poll(() => answer(request, from), { timeout: 10_000 }).toEqual([308, target]);
  } finally {
    await request.delete(`${REDIRECTS}/${documentId}`, { headers });
  }
});
