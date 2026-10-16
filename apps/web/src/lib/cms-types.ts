/**
 * Hand-written types for the Strapi 5 REST API (flattened responses, no
 * `attributes` wrapper), following apps/cms/src/{api,components} schemas.
 * Relations and media are only present when populated, hence optional.
 */

/** Strapi Blocks rich text; rendered with @strapi/blocks-react-renderer (M5). */
export type BlocksContent = Array<{ type: string; children?: unknown[]; [key: string]: unknown }>;

export interface MediaFormat {
  url: string;
  width: number;
  height: number;
  mime: string;
}

export interface Media {
  id: number;
  documentId: string;
  url: string;
  alternativeText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  mime: string;
  formats: Partial<Record<'thumbnail' | 'small' | 'medium' | 'large', MediaFormat>> | null;
}

interface Document {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  locale?: string;
}

// Components

export interface Seo {
  metaTitle: string | null;
  metaDescription: string | null;
  shareImage?: Media | null;
  canonicalUrl: string | null;
  noIndex: boolean | null;
}

export interface TextItem {
  id: number;
  text: string;
}

export interface Milestone {
  id: number;
  /** HH:mm */
  time: string;
  title: string;
  description: string | null;
  note: string | null;
}

export interface ItineraryDay {
  id: number;
  dayNumber: number;
  title: string;
  breakfast: boolean | null;
  lunch: boolean | null;
  dinner: boolean | null;
  milestones?: Milestone[];
}

export interface CancellationRule {
  id: number;
  daysBefore: number;
  feePercent: number;
  note: string | null;
}

export interface CruiseOption {
  id: number;
  type: 've_du_ngoan' | 'thue_nguyen_tau' | 'an_toi';
  name: string;
  price: number | null;
  description: string | null;
}

export interface TeambuildingGame {
  id: number;
  name: string;
  howToPlay: string | null;
  image?: Media | null;
}

export interface HeroSlide {
  id: number;
  image?: Media | null;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

// Collection types

export type TourCategory = 'noi_dia' | 'trung_quoc' | 'quoc_te' | 'trai_nghiem_hoc_tap';
export type Region = 'mien_bac' | 'mien_trung' | 'mien_nam' | 'trung_quoc' | 'quoc_te';

export interface Tour extends Document {
  name: string;
  code: string;
  slug: string;
  category: TourCategory;
  departure: string | null;
  borderGate: string | null;
  durationDays: number;
  durationNights: number;
  transport: string | null;
  /** Integer VND; 0 or null means "Liên hệ báo giá". */
  priceFrom: number | null;
  focNote: string | null;
  groupSizeMin: number | null;
  groupSizeMax: number | null;
  thumbnail?: Media | null;
  gallery?: Media[];
  highlights?: TextItem[];
  itinerary?: ItineraryDay[];
  inclusions?: TextItem[];
  exclusions?: TextItem[];
  cancellationRules?: CancellationRule[];
  destinations?: Destination[];
  articles?: Article[];
  teambuildings?: Teambuilding[];
  feedbacks?: Feedback[];
  seo?: Seo | null;
}

export interface Cruise extends Document {
  name: string;
  slug: string;
  starRating: number | null;
  capacity: number | null;
  options?: CruiseOption[];
  description: BlocksContent | null;
  thumbnail?: Media | null;
  gallery?: Media[];
  inclusions?: TextItem[];
  exclusions?: TextItem[];
  destinations?: Destination[];
  articles?: Article[];
  seo?: Seo | null;
}

export interface Teambuilding extends Document {
  name: string;
  slug: string;
  theme: string | null;
  groupSizeMin: number | null;
  groupSizeMax: number | null;
  description: BlocksContent | null;
  games?: TeambuildingGame[];
  packages?: TextItem[];
  thumbnail?: Media | null;
  album?: Media[];
  tours?: Tour[];
  seo?: Seo | null;
}

export interface Destination extends Document {
  name: string;
  slug: string;
  region: Region;
  image?: Media | null;
  description: BlocksContent | null;
  tours?: Tour[];
  cruises?: Cruise[];
  seo?: Seo | null;
}

export interface Article extends Document {
  title: string;
  slug: string;
  category?: ArticleCategory | null;
  cover?: Media | null;
  author: string | null;
  excerpt: string | null;
  content: BlocksContent;
  readingMinutes: number | null;
  tours?: Tour[];
  cruises?: Cruise[];
  seo?: Seo | null;
}

export interface ArticleCategory extends Document {
  name: string;
  slug: string;
  description: string | null;
  articles?: Article[];
  seo?: Seo | null;
}

export interface Feedback extends Document {
  groupName: string;
  organization: string | null;
  date: string | null;
  description: string | null;
  album?: Media[];
  tour?: Tour | null;
}

export interface SiteSetting extends Document {
  hotline: string | null;
  zaloUrl: string | null;
  messengerUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  email: string | null;
  address: string | null;
  responseTimeText: string | null;
  defaultSeo?: Seo | null;
}

export interface Homepage extends Document {
  heroSlides?: HeroSlide[];
  featuredTours?: Tour[];
  featuredCruises?: Cruise[];
  featuredArticles?: Article[];
}

export interface Redirect extends Document {
  from: string;
  to: string;
  statusCode: 301 | 302;
}

// Responses

export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: { pagination: Pagination };
}

export interface SingleResponse<T> {
  data: T | null;
}
