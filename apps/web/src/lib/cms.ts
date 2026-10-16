/**
 * Typed read-only client for the Strapi REST API (D4). Every request is cached
 * by Next with tags that the CMS webhook invalidates (see app/api/revalidate):
 * lists use `<type>`, single documents `<type>` and `<type>:<slug>`.
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
const DEFAULT_PAGE_SIZE = 12;

type QueryValue = string | number | boolean | null | undefined | QueryValue[] | { [key: string]: QueryValue };
type Query = Record<string, QueryValue>;

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

async function request<T>(path: string, query: Query, tags: string[]): Promise<T | null> {
  const base = process.env.CMS_URL;
  if (!base) throw new Error('CMS_URL is not set');
  const url = `${base.replace(/\/+$/, '')}/api/${path}?${toQueryString({ ...query, status: 'published' })}`;
  const res = await fetch(url, { next: { tags, revalidate: REVALIDATE_SECONDS } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`CMS responded ${res.status} for /api/${path}`);
  return (await res.json()) as T;
}

const emptyList = <T>(): ListResponse<T> => ({
  data: [],
  meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } },
});

async function findMany<T>(type: string, plural: string, query: Query): Promise<ListResponse<T>> {
  return (await request<ListResponse<T>>(plural, query, [type])) ?? emptyList<T>();
}

async function findBySlug<T>(type: string, plural: string, slug: string, populate: Query): Promise<T | null> {
  const res = await request<ListResponse<T>>(
    plural,
    { filters: { slug: { $eq: slug } }, populate, pagination: { pageSize: 1 } },
    [type, `${type}:${slug}`],
  );
  return res?.data[0] ?? null;
}

async function findSingle<T>(type: string, populate: Query): Promise<T | null> {
  return (await request<SingleResponse<T>>(type, { populate }, [type]))?.data ?? null;
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
    'redirects',
    { filters: { from: { $eq: path } }, pagination: { pageSize: 1 } },
    ['redirect'],
  );
  return res?.data[0] ?? null;
}
