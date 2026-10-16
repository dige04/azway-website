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
  SingleResponse,
  SiteSetting,
  Teambuilding,
  Tour,
  TourCategory,
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
  /** Single types answer 404 until their first save: treat it as "no data". */
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
  if (res.status === 404 && options.allow404) return null;
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

// Tours

export interface TourFilters {
  category?: TourCategory;
  /** Destination slug. */
  destination?: string;
  region?: Region;
  borderGate?: string;
  minDays?: number;
  maxDays?: number;
  /** Group size the tour must accept. */
  groupSize?: number;
  /** Matches tour name or code. */
  q?: string;
  sort?: 'price:asc' | 'price:desc' | 'duration:asc' | 'duration:desc';
  page?: number;
  pageSize?: number;
}

const TOUR_SORT = { price: 'priceFrom', duration: 'durationDays' } as const;

function tourFilterQuery(filters: TourFilters): Query {
  const and: QueryValue[] = [];
  if (filters.category) and.push({ category: { $eq: filters.category } });
  if (filters.destination) and.push({ destinations: { slug: { $eq: filters.destination } } });
  if (filters.region) and.push({ destinations: { region: { $eq: filters.region } } });
  if (filters.borderGate) and.push({ borderGate: { $eqi: filters.borderGate } });
  if (filters.minDays !== undefined) and.push({ durationDays: { $gte: filters.minDays } });
  if (filters.maxDays !== undefined) and.push({ durationDays: { $lte: filters.maxDays } });
  if (filters.groupSize !== undefined) {
    and.push({ $or: [{ groupSizeMin: { $null: true } }, { groupSizeMin: { $lte: filters.groupSize } }] });
    and.push({ $or: [{ groupSizeMax: { $null: true } }, { groupSizeMax: { $gte: filters.groupSize } }] });
  }
  if (filters.q) and.push({ $or: [{ name: { $containsi: filters.q } }, { code: { $containsi: filters.q } }] });

  const [field, direction] = (filters.sort ?? '').split(':') as [keyof typeof TOUR_SORT | '', string?];
  return {
    filters: and.length > 0 ? { $and: and } : undefined,
    sort: field ? [`${TOUR_SORT[field]}:${direction}`] : ['publishedAt:desc'],
  };
}

export const getTours = (filters: TourFilters = {}) =>
  findMany<Tour>('tour', 'tours', {
    ...tourFilterQuery(filters),
    populate: { thumbnail: true, destinations: card },
    pagination: pagination(filters.page, filters.pageSize),
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
    articles: { fields: ['title', 'slug', 'excerpt'], populate: { cover: true } },
    teambuildings: card,
    feedbacks: { populate: { album: true } },
    seo,
  });

// Cruises

export const getCruises = ({ page, pageSize }: { page?: number; pageSize?: number } = {}) =>
  findMany<Cruise>('cruise', 'cruises', {
    populate: { thumbnail: true, options: true, destinations: card },
    sort: ['publishedAt:desc'],
    pagination: pagination(page, pageSize),
  });

export const getCruiseBySlug = (slug: string) =>
  findBySlug<Cruise>('cruise', 'cruises', slug, {
    thumbnail: true,
    gallery: true,
    options: true,
    inclusions: true,
    exclusions: true,
    destinations: card,
    articles: { fields: ['title', 'slug', 'excerpt'], populate: { cover: true } },
    seo,
  });

// Teambuilding

export const getTeambuildings = ({ page, pageSize }: { page?: number; pageSize?: number } = {}) =>
  findMany<Teambuilding>('teambuilding', 'teambuildings', {
    populate: { thumbnail: true },
    sort: ['publishedAt:desc'],
    pagination: pagination(page, pageSize),
  });

export const getTeambuildingBySlug = (slug: string) =>
  findBySlug<Teambuilding>('teambuilding', 'teambuildings', slug, {
    thumbnail: true,
    album: true,
    games: { populate: { image: true } },
    packages: true,
    tours: { fields: ['name', 'slug', 'code', 'priceFrom', 'durationDays', 'durationNights'], populate: { thumbnail: true } },
    seo,
  });

// Destinations

export const getDestinations = ({ region, page, pageSize }: { region?: Region; page?: number; pageSize?: number } = {}) =>
  findMany<Destination>('destination', 'destinations', {
    filters: region ? { region: { $eq: region } } : undefined,
    populate: { image: true },
    sort: ['name:asc'],
    pagination: pagination(page, pageSize ?? 50),
  });

export const getDestinationBySlug = (slug: string) =>
  findBySlug<Destination>('destination', 'destinations', slug, {
    image: true,
    tours: { fields: ['name', 'slug', 'code', 'priceFrom', 'durationDays', 'durationNights'], populate: { thumbnail: true } },
    cruises: { fields: ['name', 'slug'], populate: { thumbnail: true } },
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

export const getArticleBySlug = (slug: string) =>
  findBySlug<Article>('article', 'articles', slug, {
    cover: true,
    category: card,
    tours: { fields: ['name', 'slug', 'code', 'priceFrom', 'durationDays', 'durationNights'], populate: { thumbnail: true } },
    cruises: { fields: ['name', 'slug'], populate: { thumbnail: true } },
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

// Single types and redirects. SCHEMA-PENDING (WP-03): check populate keys.

export const getSiteSetting = () => findSingle<SiteSetting>('site-setting', { defaultSeo: seo });

export const getHomepage = () =>
  findSingle<Homepage>('homepage', {
    heroSlides: { populate: { image: true } },
    featuredTours: { populate: { thumbnail: true, destinations: card } },
    featuredCruises: { populate: { thumbnail: true } },
    featuredArticles: { populate: { cover: true } },
  });

/** Redirect for a legacy path, e.g. "/tour-ha-long.html" (D8). */
export async function getRedirect(path: string): Promise<Redirect | null> {
  const res = await request<ListResponse<Redirect>>(
    'redirect',
    'redirects',
    { filters: { from: { $eq: path } }, pagination: { pageSize: 1 } },
  );
  return res?.data[0] ?? null;
}
