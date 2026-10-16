/**
 * Typed read-only client for the Strapi REST API (D4). Every request is cached
 * by Next with tags that the CMS webhook invalidates (see app/api/revalidate).
 * The webhook only sends `<type>` and `<type>:<slug>` of the changed document,
 * so each fetch is tagged with its own type, its slug tag for single
 * documents, and the type of every relation it populates or filters on
 * (a renamed destination must refresh the tour pages that show it).
 * Only published documents are returned.
 */
import type {
  Article,
  ArticleCategory,
  Cruise,
  Destination,
  Feedback,
  Homepage,
  ListResponse,
  Redirect,
  Region,
  Seo,
  SingleResponse,
  SiteSetting,
  Teambuilding,
  Tour,
} from './cms-types';

const REVALIDATE_SECONDS = 3600;
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_PAGE_SIZE = 12;

type QueryValue = string | number | boolean | null | undefined | QueryValue[] | { [key: string]: QueryValue };
type Query = Record<string, QueryValue>;

/**
 * Relation fields per content type, checked against apps/cms/src/api/*
 * schemas by cms.test.ts: a relation missing here would go untagged.
 */
export const RELATIONS: Record<string, Record<string, string>> = {
  tour: { destinations: 'destination', articles: 'article', teambuildings: 'teambuilding', feedbacks: 'feedback' },
  cruise: { destinations: 'destination', articles: 'article' },
  teambuilding: { tours: 'tour' },
  destination: { tours: 'tour', cruises: 'cruise' },
  article: { category: 'article-category', tours: 'tour', cruises: 'cruise' },
  'article-category': { articles: 'article' },
  feedback: { tour: 'tour' },
  homepage: { featuredTours: 'tour', featuredCruises: 'cruise', featuredArticles: 'article' },
  'site-setting': {},
  redirect: {},
};

/** Content types a query reads: `type` plus every relation in populate/filters. */
function dependencyTypes(type: string, query: Query): string[] {
  const found = new Set([type]);
  const walk = (current: string, value: QueryValue) => {
    if (Array.isArray(value)) return value.forEach((item) => walk(current, item));
    if (value === null || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      const target = RELATIONS[current]?.[key];
      if (target) {
        found.add(target);
        walk(target, child);
      } else if (key.startsWith('$') || key === 'populate' || key === 'filters') {
        walk(current, child);
      }
      // Anything else is a scalar field, media or component: no other type.
    }
  };
  walk(type, { populate: query.populate, filters: query.filters });
  return [...found];
}

/** Strapi's bracket notation: { filters: { slug: { $eq: 'a' } } } -> filters[slug][$eq]=a */
function toQueryString(query: Query): string {
  const parts: string[] = [];
  const walk = (value: QueryValue, key: string) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${key}[${index}]`));
    } else if (value !== null && typeof value === 'object') {
      for (const [child, childValue] of Object.entries(value)) walk(childValue, `${key}[${child}]`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  };
  for (const [key, value] of Object.entries(query)) walk(value, key);
  return parts.join('&');
}

interface RequestOptions {
  /**
   * Single types answer 404 `NotFoundError` until their first save: treat it
   * as "no data". Any other 404 (wrong CMS_URL, unknown route) still throws.
   */
  allow404?: boolean;
  /** Adds the `<type>:<slug>` tag. */
  slug?: string;
}

async function request<T>(type: string, path: string, query: Query, options: RequestOptions = {}): Promise<T | null> {
  const base = process.env.CMS_URL;
  if (!base) throw new Error('CMS_URL is not set');
  const url = `${base.replace(/\/+$/, '')}/api/${path}?${toQueryString({ ...query, status: 'published' })}`;
  const tags = [...dependencyTypes(type, query), ...(options.slug ? [`${type}:${options.slug}`] : [])];
  const res = await fetch(url, {
    next: { tags, revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status === 404 && options.allow404) {
    const body = (await res.json().catch(() => null)) as { error?: { name?: string } } | null;
    if (body?.error?.name === 'NotFoundError') return null;
  }
  if (!res.ok) throw new Error(`CMS responded ${res.status} for /api/${path}`);
  return (await res.json()) as T;
}

async function findMany<T>(type: string, plural: string, query: Query): Promise<ListResponse<T>> {
  return (await request<ListResponse<T>>(type, plural, query)) as ListResponse<T>;
}

async function findBySlug<T>(type: string, plural: string, slug: string, populate: Query): Promise<T | null> {
  const res = await request<ListResponse<T>>(
    type,
    plural,
    { filters: { slug: { $eq: slug } }, populate, pagination: { pageSize: 1 } },
    { slug },
  );
  // A missing slug is `200 { data: [] }`; any non-2xx is a misconfiguration.
  return res?.data[0] ?? null;
}

async function findSingle<T>(type: string, populate: Query): Promise<T | null> {
  return (await request<SingleResponse<T>>(type, type, { populate }, { allow404: true }))?.data ?? null;
}

const pagination = (page = 1, pageSize = DEFAULT_PAGE_SIZE) => ({ page, pageSize });
const card = { fields: ['name', 'slug'] };
const seo = { populate: { shareImage: true } };

/** Strapi's default `maxLimit`: a larger pageSize is silently capped. */
const MAX_PAGE_SIZE = 100;

/** Every published document of a type, page by page. */
async function findAll<T>(type: string, plural: string, query: Query): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const res = await findMany<T>(type, plural, { ...query, pagination: pagination(page, MAX_PAGE_SIZE) });
    all.push(...res.data);
    // Stops on a missing pageCount too: an odd answer must not loop forever.
    if (!(page < res.meta?.pagination?.pageCount)) return all;
  }
}

// Tours

/**
 * Every published tour with what /tour shows and filters on. /tour filters,
 * sorts and searches this list itself (lib/tour-filter.ts): one cached
 * request serves every filter combination, and the visitor's URL never
 * reaches Strapi.
 */
export const getTourCatalog = () =>
  findAll<Tour>('tour', 'tours', {
    fields: [
      'name', 'slug', 'code', 'category', 'departure', 'borderGate', 'durationDays', 'durationNights',
      'groupSizeMin', 'groupSizeMax', 'priceFrom', 'publishedAt',
    ],
    populate: { thumbnail: true, destinations: { fields: ['name', 'slug', 'region'] } },
    sort: ['publishedAt:desc', 'id:desc'],
  });

export const getTourBySlug = (slug: string) =>
  findBySlug<Tour>('tour', 'tours', slug, {
    thumbnail: true,
    gallery: true,
    highlights: true,
    itinerary: { populate: { milestones: true } },
    inclusions: true,
    exclusions: true,
    cancellationRules: true,
    destinations: card,
    // ArticleCard: category chip and reading time, as on the home page.
    articles: { fields: ['title', 'slug', 'excerpt', 'readingMinutes'], populate: { cover: true, category: card } },
    teambuildings: card,
    seo,
  });

// Cruises

/** Every published cruise with what a card shows: /du-thuyen and related cruises. */
export const getCruiseCatalog = () =>
  findAll<Cruise>('cruise', 'cruises', {
    fields: ['name', 'slug', 'starRating', 'capacity'],
    populate: { thumbnail: true, options: true, destinations: card },
    sort: ['capacity:desc', 'name:asc'],
  });

export const getCruiseBySlug = (slug: string) =>
  findBySlug<Cruise>('cruise', 'cruises', slug, {
    thumbnail: true,
    gallery: true,
    options: true,
    inclusions: true,
    exclusions: true,
    destinations: card,
    articles: { fields: ['title', 'slug', 'excerpt', 'readingMinutes'], populate: { cover: true, category: card } },
    seo,
  });

// Teambuilding

/** Every published programme with what its card shows: /teambuilding and "Chương trình khác". */
export const getTeambuildingCatalog = () =>
  findAll<Teambuilding>('teambuilding', 'teambuildings', {
    fields: ['name', 'slug', 'theme', 'groupSizeMin', 'groupSizeMax', 'description'],
    populate: { thumbnail: true, packages: true },
    sort: ['name:asc'],
  });

export const getTeambuildingBySlug = (slug: string) =>
  findBySlug<Teambuilding>('teambuilding', 'teambuildings', slug, {
    thumbnail: true,
    album: true,
    games: { populate: { image: true } },
    packages: true,
    tours: {
      fields: ['name', 'slug', 'code', 'category', 'departure', 'priceFrom', 'durationDays', 'durationNights'],
      populate: { thumbnail: true },
      sort: ['publishedAt:desc', 'id:desc'],
    },
    seo,
  });

// Destinations

/** Every published destination (/diem-den, the home grid). */
export const getDestinations = ({ region }: { region?: Region } = {}) =>
  findAll<Destination>('destination', 'destinations', {
    filters: region ? { region: { $eq: region } } : undefined,
    populate: { image: true },
    sort: ['name:asc'],
  });

export const getDestinationBySlug = (slug: string) =>
  findBySlug<Destination>('destination', 'destinations', slug, {
    image: true,
    // Full product cards (tourCard, cruiseCard) for the destination's products.
    // Sorted so the cards shown (the page caps each list) stay the same between regenerations.
    tours: {
      fields: ['name', 'slug', 'code', 'category', 'departure', 'priceFrom', 'durationDays', 'durationNights'],
      populate: { thumbnail: true },
      sort: ['publishedAt:desc', 'id:desc'],
    },
    cruises: {
      fields: ['name', 'slug', 'starRating', 'capacity'],
      populate: { thumbnail: true, options: true },
      sort: ['capacity:desc', 'name:asc'],
    },
    seo,
  });

// Articles

export const getArticles = ({ category, page, pageSize }: { category?: string; page?: number; pageSize?: number } = {}) =>
  findMany<Article>('article', 'articles', {
    fields: ['title', 'slug', 'excerpt', 'author', 'readingMinutes', 'publishedAt'],
    filters: category ? { category: { slug: { $eq: category } } } : undefined,
    populate: { cover: true, category: card },
    sort: ['publishedAt:desc'],
    pagination: pagination(page, pageSize),
  });

/** Every published guide article with what ArticleCard shows: /tim-kiem searches it. */
export const getArticleCatalog = () =>
  findAll<Article>('article', 'articles', {
    fields: ['title', 'slug', 'excerpt', 'readingMinutes', 'publishedAt'],
    populate: { cover: true, category: card },
    sort: ['publishedAt:desc', 'id:desc'],
  });

/** An article with its hand-picked products (FR-BLG-03), fields as their cards show them. */
export const getArticleBySlug = (slug: string) =>
  findBySlug<Article>('article', 'articles', slug, {
    cover: true,
    category: card,
    tours: {
      fields: ['name', 'slug', 'code', 'category', 'departure', 'priceFrom', 'durationDays', 'durationNights'],
      populate: { thumbnail: true },
    },
    cruises: { fields: ['name', 'slug', 'starRating', 'capacity'], populate: { thumbnail: true, options: true } },
    seo,
  });

export const getArticleCategories = () =>
  findMany<ArticleCategory>('article-category', 'article-categories', {
    sort: ['name:asc'],
    pagination: pagination(1, 50),
  });

export const getArticleCategoryBySlug = (slug: string) =>
  findBySlug<ArticleCategory>('article-category', 'article-categories', slug, { seo });

// Feedback

export const getFeedbacks = ({ tour, page, pageSize }: { tour?: string; page?: number; pageSize?: number } = {}) =>
  findMany<Feedback>('feedback', 'feedbacks', {
    filters: tour ? { tour: { slug: { $eq: tour } } } : undefined,
    populate: { album: true, tour: card },
    sort: ['date:desc'],
    pagination: pagination(page, pageSize),
  });

// Sitemap

/** Content types with a public page per document (SEO-01). */
export const PAGE_TYPES = {
  tour: 'tours',
  cruise: 'cruises',
  teambuilding: 'teambuildings',
  destination: 'destinations',
  article: 'articles',
  'article-category': 'article-categories',
} as const;
export type PageType = keyof typeof PAGE_TYPES;

export interface PageDocument {
  slug: string;
  updatedAt: string;
  seo?: Pick<Seo, 'noIndex' | 'canonicalUrl'> | null;
}

/** Slug, last change and index settings of every published document of a type (sitemap.xml). */
export const getPageDocuments = (type: PageType) =>
  findAll<PageDocument>(type, PAGE_TYPES[type], {
    fields: ['slug', 'updatedAt'],
    populate: { seo: { fields: ['noIndex', 'canonicalUrl'] } },
    sort: ['id:asc'],
  });

// Single types and redirects.

export const getSiteSetting = () => findSingle<SiteSetting>('site-setting', { defaultSeo: seo });

export const getHomepage = () =>
  findSingle<Homepage>('homepage', {
    heroSlides: { populate: { image: true } },
    featuredTours: { populate: { thumbnail: true, destinations: card } },
    featuredCruises: { populate: { thumbnail: true, options: true } },
    featuredArticles: { populate: { cover: true, category: card } },
  });

/** Every redirect (D8): one cached list that lib/redirect.ts searches in memory. */
export const getRedirects = () => findAll<Redirect>('redirect', 'redirects', { fields: ['from', 'to', 'statusCode'] });
