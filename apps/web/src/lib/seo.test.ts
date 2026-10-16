import { beforeEach, expect, it, vi } from 'vitest';
import type { BlocksContent, Media, Seo, SiteSetting } from './cms-types';
import { blocksText, pageMetadata, type PageSeo } from './seo';

const cms = vi.hoisted(() => ({ setting: null as SiteSetting | Error | null, connection: vi.fn() }));
vi.mock('./cms', () => ({
  getSiteSetting: async () => {
    if (cms.setting instanceof Error) throw cms.setting;
    return cms.setting;
  },
}));
vi.mock('next/server', () => ({ connection: cms.connection }));

beforeEach(() => {
  cms.connection.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

it('blocksText: no space added around a link inside a line, one between blocks', () => {
  const blocks = [
    { type: 'heading', level: 2, children: [{ type: 'text', text: 'Lưu ý' }] },
    {
      type: 'paragraph',
      children: [
        { type: 'text', text: 'Xem ' },
        { type: 'link', url: '/cam-nang', children: [{ type: 'text', text: 'cẩm nang' }] },
        { type: 'text', text: '.' },
      ],
    },
  ] as BlocksContent;
  expect(blocksText(blocks)).toBe('Lưu ý Xem cẩm nang.');
});

// SEO-05/AC-17: what Facebook/Zalo show. A CMS failure must not put the logo in the ISR cache.
it('share image: seo image, then content image, then site default, then logo; a CMS failure falls back per request only', async () => {
  const media = (name: string) => ({ url: `https://media.example/${name}.jpg` }) as Media;
  const shareImage = async (page: Partial<PageSeo>) => {
    const { openGraph } = await pageMetadata({ title: 'Tour', path: '/tour/a', ...page });
    return (openGraph?.images as string[])[0];
  };
  cms.setting = { defaultSeo: { shareImage: media('default') } } as SiteSetting;
  expect(await shareImage({ seo: { shareImage: media('seo') } as Seo, image: media('cover') })).toBe('https://media.example/seo.jpg');
  expect(await shareImage({ image: media('cover') })).toBe('https://media.example/cover.jpg');
  expect(await shareImage({})).toBe('https://media.example/default.jpg');
  cms.setting = { defaultSeo: null } as SiteSetting;
  expect(await shareImage({})).toBe('/logo-azway.png');
  expect(cms.connection).not.toHaveBeenCalled();

  cms.setting = new Error('CMS down');
  expect(await shareImage({})).toBe('/logo-azway.png');
  expect(cms.connection).toHaveBeenCalledOnce();
});

// The page and /sitemap.xml name the same URL: no trailing slash (Next redirects it), and a broken canonical is ignored.
it("an editor's canonical is written as the sitemap compares it", async () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://azway.example');
  cms.setting = null;
  const canonical = async (canonicalUrl: string) =>
    (await pageMetadata({ title: 'Tour', path: '/tour/a', seo: { canonicalUrl } as Seo })).alternates?.canonical;
  expect(await canonical('https://azway.example/tour/b/')).toBe('https://azway.example/tour/b');
  expect(await canonical('https://[')).toBe('/tour/a');
});
