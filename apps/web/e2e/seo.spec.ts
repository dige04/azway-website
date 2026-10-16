import { expect, test, type Page } from '@playwright/test';

// SEO (M7) on the seeded site. Metadata does not depend on the viewport: run once.
const desktopOnly = () => test.skip(test.info().project.name !== 'desktop-1440', 'viewport-independent');

// AC-15: published pages of every type, never a draft (seed: JP-6N5D stays a draft).
test('sitemap.xml lists published pages and no drafts; robots.txt points to it', async ({ request, baseURL }) => {
  desktopOnly();
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  for (const path of [
    '/',
    '/tour/ha-noi-bach-dang-giang-ha-long-2n1d',
    '/du-thuyen/ambassador',
    '/teambuilding/teambuilding',
    '/diem-den/ha-long',
    '/cam-nang/tour-trung-quoc-cua-khau',
    '/cam-nang/danh-muc/trung-quoc',
  ]) {
    expect(xml, path).toContain(`<loc>${new URL(path, baseURL)}</loc>`);
  }
  expect(xml).not.toContain('tokyo-phu-si-kyoto-osaka-6n5d');

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain(`Sitemap: ${new URL('/sitemap.xml', baseURL)}`);
});

async function meta(page: Page) {
  return page.evaluate(() => {
    const content = (selector: string) => document.querySelector(selector)?.getAttribute('content') ?? null;
    return {
      title: document.title,
      description: content('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      robots: content('meta[name="robots"]'),
      ogTitle: content('meta[property="og:title"]'),
      ogDescription: content('meta[property="og:description"]'),
      ogImage: content('meta[property="og:image"]'),
      ogUrl: content('meta[property="og:url"]'),
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((script) => JSON.parse(script.textContent ?? '')['@type']),
    };
  });
}

// AC-14/17, SEO-02/04/05: each page type has its own title and description (from
// content when the seed has no `seo`), its canonical, and the same title and
// description in Open Graph with an image to share.
const PAGES: { path: string; jsonLd: string[] }[] = [
  { path: '/', jsonLd: ['TravelAgency'] },
  { path: '/tour', jsonLd: ['TravelAgency', 'BreadcrumbList'] },
  { path: '/tour/sapa-cat-cat-fansipan-2n1d', jsonLd: ['TravelAgency', 'TouristTrip', 'BreadcrumbList'] },
  { path: '/du-thuyen/ambassador', jsonLd: ['TravelAgency', 'TouristTrip', 'BreadcrumbList'] },
  { path: '/teambuilding/teambuilding', jsonLd: ['TravelAgency', 'BreadcrumbList'] },
  { path: '/diem-den/ha-long', jsonLd: ['TravelAgency', 'BreadcrumbList'] },
  { path: '/cam-nang/tour-trung-quoc-cua-khau', jsonLd: ['TravelAgency', 'Article', 'BreadcrumbList'] },
  { path: '/cam-nang/danh-muc/trung-quoc', jsonLd: ['TravelAgency', 'BreadcrumbList'] },
];

test('every page type: own title and description, canonical, Open Graph, JSON-LD', async ({ page, baseURL }) => {
  desktopOnly();
  const titles = new Set<string>();
  for (const { path, jsonLd } of PAGES) {
    await page.goto(path);
    const tags = await meta(page);
    const url = new URL(path, baseURL).toString();
    expect(tags.description, `description on ${path}`).toBeTruthy();
    expect(tags.canonical, `canonical on ${path}`).toBe(url);
    expect(tags.ogUrl, `og:url on ${path}`).toBe(url);
    expect(tags.title.startsWith(tags.ogTitle ?? '-'), `<title> "${tags.title}" vs og:title "${tags.ogTitle}" on ${path}`).toBe(true);
    expect(tags.ogDescription, `og:description on ${path}`).toBe(tags.description);
    expect(tags.ogImage, `og:image on ${path}`).toMatch(/^https?:\/\//);
    expect(tags.robots, `robots on ${path}`).toBeNull();
    expect([...tags.jsonLd].sort(), `JSON-LD on ${path}`).toEqual([...jsonLd].sort());
    titles.add(tags.title);
  }
  expect(titles.size, 'titles are unique').toBe(PAGES.length);
});

// SEO-06: a filtered list points at its base page and stays out of the index.
test('a filtered tour list is canonical to /tour and noindex, follow', async ({ page, baseURL }) => {
  desktopOnly();
  await page.goto('/tour?loai=trung-quoc&sap-xep=gia-tang');
  const tags = await meta(page);
  expect(tags.canonical).toBe(new URL('/tour', baseURL).toString());
  expect(tags.robots).toBe('noindex, follow');
});
