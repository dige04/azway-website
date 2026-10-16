import type { Metadata } from 'next';
import type { BlocksContent, Media, Seo } from './cms-types';
import { mediaUrl } from './media';
import { canonicalUrl, SITE_NAME } from './site';
import { loadSiteSetting } from './site-setting';

/** Google cuts descriptions around 155–160 characters. */
const DESCRIPTION_LENGTH = 160;
/** Last share-image fallback: the logo in public/. */
const LOGO = '/logo-azway.png';

/** Plain text of Strapi blocks (paragraphs, headings, lists, quotes): a space between blocks, none inside a line. */
export function blocksText(blocks: BlocksContent | null | undefined): string {
  type Node = { type?: string; text?: string; children?: Node[] };
  const inline = (node: Node) => node.text !== undefined || node.type === 'link';
  const text = (node: Node): string => node.text ?? join(node.children ?? []);
  const join = (nodes: Node[]) => nodes.map(text).join(nodes.every(inline) ? '' : ' ');
  return join((blocks ?? []) as Node[]);
}

/** A meta description from content: spaces collapsed, cut at a word with "…" past 160 characters. */
export function summarize(...parts: (string | null | undefined)[]): string | undefined {
  const text = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (text.length <= DESCRIPTION_LENGTH) return text || undefined;
  const cut = text.slice(0, DESCRIPTION_LENGTH - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > DESCRIPTION_LENGTH / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

/** The meta description a page shows: the editor's, else a summary of the content. */
export const metaDescription = (seo: Seo | null | undefined, content: string | null | undefined) => seo?.metaDescription?.trim() || summarize(content);

export interface PageSeo {
  /** Content title, used when `seo.metaTitle` is empty. */
  title: string;
  /** Text from the content, used when `seo.metaDescription` is empty (summarized). */
  description?: string | null;
  /** Site path: the canonical, unless `seo.canonicalUrl` names another URL. */
  path: string;
  /** Content image (cover, thumbnail) to share when `seo.shareImage` is empty. */
  image?: Media | null;
  seo?: Seo | null;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  /** Kept out of the index whatever `seo.noIndex` says (search, filtered lists). */
  noIndex?: boolean;
}

/**
 * SEO-02/05: one resolved title, description, canonical and share image for
 * <title>, the meta description, Open Graph (Facebook, Zalo) and Twitter.
 * Next replaces a parent's `openGraph` instead of merging it, so each page
 * takes the whole set from here. Share image: `seo.shareImage`, then the
 * content image, then site-setting `defaultSeo.shareImage`, then the logo.
 */
export async function pageMetadata(page: PageSeo): Promise<Metadata> {
  const title = page.seo?.metaTitle?.trim() || page.title;
  const description = metaDescription(page.seo, page.description);
  // The editor's canonical in the form the sitemap compares; an unparseable one is ignored.
  const url = (page.seo?.canonicalUrl && canonicalUrl(page.seo.canonicalUrl)) || page.path;
  const image = mediaUrl(page.seo?.shareImage?.url) ?? mediaUrl(page.image?.url) ?? (await defaultShareImage());
  const article = page.type === 'article' && {
    publishedTime: page.publishedTime ?? undefined,
    modifiedTime: page.modifiedTime ?? undefined,
  };
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: page.noIndex || page.seo?.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: page.type ?? 'website',
      siteName: SITE_NAME,
      locale: 'vi_VN',
      url,
      title,
      description,
      images: [image],
      ...article,
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

/**
 * The editor's site-wide share image, else the logo. A CMS failure falls back
 * only in a per-request render (loadSiteSetting), never in a cached one.
 */
async function defaultShareImage(): Promise<string> {
  const setting = await loadSiteSetting();
  return mediaUrl(setting?.defaultSeo?.shareImage?.url) ?? LOGO;
}
