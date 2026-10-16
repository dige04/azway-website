import type { APIRequestContext } from '@playwright/test';
import { expect, test } from './test';

/**
 * TASKS M6 "Xong khi" (AC-13, FR-LEAD-07/08): a lead sent from a tour page
 * reaches Strapi with product, source, UTM and device; the 6th request in 10
 * minutes is refused; a filled honeypot is answered 200 and stores nothing.
 *
 * Reads leads back through the Strapi admin API, so it needs CMS_URL and an
 * admin login (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD; CI creates a throwaway
 * one). One browser only and in order: the rate limit counts per IP, and
 * every request here spends from the same 5 (a rerun within 10 minutes
 * needs a fresh preview).
 */

const CMS = process.env.CMS_URL?.replace(/\/+$/, '');
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
const TOUR = { path: '/tour/ha-noi-ha-long-1-ngay', code: 'HL-1N' };
const run = Date.now().toString(36);

test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'one browser (desktop): the rate limit is per IP');
const configured = !!(CMS && ADMIN.email && ADMIN.password);
// On CI the M6 check must run: a missing variable fails the run instead of skipping it.
if (process.env.CI && !configured) throw new Error('lead.spec.ts needs CMS_URL, E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD on CI');
test.skip(!configured, 'needs CMS_URL, E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');

type Lead = Record<string, string | number | null>;

async function leadsNamed(request: APIRequestContext, fullName: string): Promise<Lead[]> {
  const login = await request.post(`${CMS}/admin/login`, { data: ADMIN });
  expect(login.ok(), 'admin login').toBe(true);
  const { data } = (await login.json()) as { data: { token: string } };
  const res = await request.get(`${CMS}/content-manager/collection-types/api::lead.lead`, {
    params: { 'filters[fullName][$eq]': fullName, pageSize: 10 },
    headers: { authorization: `Bearer ${data.token}` },
  });
  expect(res.ok(), 'lead list').toBe(true);
  return ((await res.json()) as { results: Lead[] }).results;
}

const lead = (fullName: string, extra: Record<string, string> = {}) => ({ fullName, phone: '0912345678', sourcePage: '/lien-he', ...extra });

test('a filled honeypot is answered as sent, and no lead is stored', async ({ request }) => {
  const name = `E2E bot ${run}`;
  const res = await request.post('/api/lead', { data: lead(name, { hp: 'https://spam.example' }) });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  expect(await leadsNamed(request, name)).toHaveLength(0);
});

test('a lead from a tour page reaches Strapi with product, source page, UTM and device', async ({ page, request }) => {
  const name = `E2E khách ${run}`;
  const query = '?utm_source=e2e&utm_medium=cpc&utm_campaign=wp12';
  await page.goto(TOUR.path + query);
  await page.evaluate(() => {
    (window as unknown as { events: unknown[] }).events = [];
    window.addEventListener('azway:track', (event) => (window as unknown as { events: unknown[] }).events.push((event as CustomEvent).detail));
  });

  const form = page.locator('#yeu-cau form');
  await form.getByLabel('Họ và tên *').fill(name);
  await form.getByLabel('Số điện thoại *').fill('0912 345 678');
  await form.getByLabel('Số người dự kiến').fill('40');
  await form.getByRole('button', { name: 'Gửi yêu cầu tư vấn' }).click();
  await expect(page.locator('#yeu-cau').getByRole('status')).toContainText('AZway đã nhận yêu cầu của bạn');

  // AN-02: product and page only, nothing the visitor typed.
  const events = await page.evaluate(() => (window as unknown as { events: Record<string, string>[] }).events);
  expect(events.filter((event) => event.event === 'lead_submit')).toEqual([{ event: 'lead_submit', product_code: TOUR.code, source_page: TOUR.path }]);

  const [stored] = await leadsNamed(request, name);
  expect(stored).toMatchObject({
    phone: '0912345678',
    groupSize: 40,
    productType: 'tour',
    productCode: TOUR.code,
    sourcePage: TOUR.path + query,
    landingPage: TOUR.path + query,
    utm_source: 'e2e',
    utm_medium: 'cpc',
    utm_campaign: 'wp12',
    device: 'desktop',
  });
});

test('the 6th request from one IP within 10 minutes is refused', async ({ request }) => {
  // The tour-page lead above was the 1st.
  for (let i = 2; i <= 5; i++) {
    const res = await request.post('/api/lead', { data: lead(`E2E giới hạn ${run} ${i}`) });
    expect(res.status(), `request ${i}`).toBe(200);
  }
  const sixth = await request.post('/api/lead', { data: lead(`E2E giới hạn ${run} 6`) });
  expect(sixth.status()).toBe(429);
  const body = (await sixth.json()) as { ok: boolean; message: string };
  expect(body.ok).toBe(false);
  expect(await leadsNamed(request, `E2E giới hạn ${run} 6`)).toHaveLength(0);
});
