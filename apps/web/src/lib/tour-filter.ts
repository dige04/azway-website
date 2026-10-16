/**
 * /tour filters, sort and search (FR-SRC-01..04): the URL holds the whole
 * state, so a filtered list can be shared. Parameters are Vietnamese without
 * accents like the public URLs; values that are not understood are dropped,
 * never passed on. Filtering runs on the catalog from `getTourCatalog`.
 */
import type { Region, Tour, TourCategory } from './cms-types';
import { foldText, slugify } from './text';

export const PAGE_SIZE = 12;

interface Choice<T> {
  value: string;
  label: string;
  match: T;
}

export const CATEGORIES: Choice<TourCategory>[] = [
  { value: 'trong-nuoc', label: 'Tour trong nước', match: 'noi_dia' },
  // Linked from the seed (hero slide) and the 301 of /tourtrungtonghop.
  { value: 'trung-quoc', label: 'Tour Trung Quốc', match: 'trung_quoc' },
  { value: 'nuoc-ngoai', label: 'Tour nước ngoài', match: 'quoc_te' },
  { value: 'trai-nghiem-hoc-tap', label: 'Trải nghiệm học tập', match: 'trai_nghiem_hoc_tap' },
];

export const REGIONS: Choice<Region>[] = [
  { value: 'mien-bac', label: 'Miền Bắc', match: 'mien_bac' },
  { value: 'mien-trung', label: 'Miền Trung', match: 'mien_trung' },
  { value: 'mien-nam', label: 'Miền Nam', match: 'mien_nam' },
  { value: 'trung-quoc', label: 'Trung Quốc', match: 'trung_quoc' },
  { value: 'quoc-te', label: 'Quốc tế', match: 'quoc_te' },
];

/** Same buckets as the design's quick search; `match` is [min, max] days. */
export const DURATIONS: Choice<[number, number]>[] = [
  { value: 'trong-ngay', label: 'Trong ngày', match: [1, 1] },
  { value: '2n1d', label: '2N1Đ', match: [2, 2] },
  { value: '3n2d', label: '3N2Đ', match: [3, 3] },
  { value: '4n3d', label: '4N3Đ', match: [4, 4] },
  { value: 'tu-5-ngay', label: 'Từ 5 ngày', match: [5, Infinity] },
];

export const SORTS = [
  { value: 'gia-tang', label: 'Giá tăng dần' },
  { value: 'gia-giam', label: 'Giá giảm dần' },
  { value: 'ngan-nhat', label: 'Thời lượng ngắn nhất' },
  { value: 'dai-nhat', label: 'Thời lượng dài nhất' },
] as const;
export type Sort = (typeof SORTS)[number]['value'];

/** Everything /tour can be asked for. Absent = no condition. */
export interface TourQuery {
  category?: string;
  region?: string;
  /** `slugify` of the tour's border gate, e.g. "lao-cai-ha-khau". */
  gate?: string;
  duration?: string;
  /** Number of guests the tour must accept. */
  groupSize?: number;
  /** Words to find in the tour name or code. */
  q?: string;
  sort?: Sort;
  page?: number;
}

/** URL parameter of each field, in the order canonical URLs list them. */
export const PARAMS = {
  q: 'q',
  category: 'loai',
  region: 'khu-vuc',
  gate: 'cua-khau',
  duration: 'thoi-luong',
  groupSize: 'so-khach',
  sort: 'sap-xep',
  page: 'trang',
} as const satisfies Record<keyof TourQuery, string>;

/** Conditions that narrow the list (sort and page do not). */
export const CONDITION_KEYS = ['q', 'category', 'region', 'gate', 'duration', 'groupSize'] as const;
export type ConditionKey = (typeof CONDITION_KEYS)[number];

const MAX_GROUP_SIZE = 10_000;
const MAX_QUERY_LENGTH = 100;

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

const first = (params: RawParams, key: string): string | undefined => {
  const value = params instanceof URLSearchParams ? params.get(key) : params[key];
  const text = Array.isArray(value) ? value[0] : value;
  return text?.trim() || undefined;
};

const oneOf = (value: string | undefined, choices: readonly { value: string }[]) =>
  choices.some((choice) => choice.value === value) ? value : undefined;

const positiveInt = (value: string | undefined, max: number) => {
  if (!value || !/^\d{1,6}$/.test(value)) return undefined;
  const number = Number(value);
  return number >= 1 && number <= max ? number : undefined;
};

export function parseTourQuery(params: RawParams): TourQuery {
  const gate = first(params, PARAMS.gate);
  const query: TourQuery = {
    q: first(params, PARAMS.q)?.slice(0, MAX_QUERY_LENGTH),
    category: oneOf(first(params, PARAMS.category), CATEGORIES),
    region: oneOf(first(params, PARAMS.region), REGIONS),
    gate: gate && /^[a-z0-9-]{1,80}$/.test(gate) ? gate : undefined,
    duration: oneOf(first(params, PARAMS.duration), DURATIONS),
    groupSize: positiveInt(first(params, PARAMS.groupSize), MAX_GROUP_SIZE),
    sort: oneOf(first(params, PARAMS.sort), SORTS) as Sort | undefined,
    page: positiveInt(first(params, PARAMS.page), 999_999),
  };
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined)) as TourQuery;
}

/** Canonical "/tour?..." for a query: fixed parameter order, no page 1. */
export function tourHref(query: TourQuery): string {
  const params = new URLSearchParams();
  for (const [key, param] of Object.entries(PARAMS) as [keyof TourQuery, string][]) {
    const value = query[key];
    if (value === undefined || value === '' || (key === 'page' && value === 1)) continue;
    params.set(param, String(value));
  }
  const search = params.toString();
  return search ? `/tour?${search}` : '/tour';
}

export function hasConditions(query: TourQuery): boolean {
  return CONDITION_KEYS.some((key) => query[key] !== undefined);
}

const choice = <T>(choices: Choice<T>[], value: string | undefined) => choices.find((item) => item.value === value);

/** Whether `tour` meets condition `key` of `query` (true when the condition is absent). */
const CONDITIONS: Record<ConditionKey, (tour: Tour, query: TourQuery) => boolean> = {
  q: (tour, { q }) => {
    if (!q) return true;
    const haystack = foldText(`${tour.name} ${tour.code}`);
    return foldText(q).split(/\s+/).every((word) => haystack.includes(word));
  },
  category: (tour, { category }) => !category || tour.category === choice(CATEGORIES, category)?.match,
  region: (tour, { region }) =>
    !region || (tour.destinations ?? []).some((destination) => destination.region === choice(REGIONS, region)?.match),
  gate: (tour, { gate }) => !gate || (!!tour.borderGate && slugify(tour.borderGate) === gate),
  duration: (tour, { duration }) => {
    const range = choice(DURATIONS, duration)?.match;
    return !range || (tour.durationDays >= range[0] && tour.durationDays <= range[1]);
  },
  // An open bound accepts any size (BRD §13 question: [groupSizeMin, groupSizeMax]).
  groupSize: (tour, { groupSize }) =>
    groupSize === undefined ||
    ((tour.groupSizeMin ?? 0) <= groupSize && (tour.groupSizeMax ?? Infinity) >= groupSize),
};

const priced = (tour: Tour) => (tour.priceFrom ?? 0) > 0;
const durationRank = (tour: Tour) => tour.durationDays * 100 + tour.durationNights;

/**
 * Price sorts keep "Liên hệ báo giá" tours (price 0 or empty) last in both
 * directions; otherwise they would lead every ascending list.
 */
const COMPARE: Record<Sort, (a: Tour, b: Tour) => number> = {
  'gia-tang': (a, b) => Number(!priced(a)) - Number(!priced(b)) || (priced(a) ? a.priceFrom! - b.priceFrom! : 0),
  'gia-giam': (a, b) => Number(!priced(a)) - Number(!priced(b)) || (priced(a) ? b.priceFrom! - a.priceFrom! : 0),
  'ngan-nhat': (a, b) => durationRank(a) - durationRank(b),
  'dai-nhat': (a, b) => durationRank(b) - durationRank(a),
};

/** Tours meeting every condition of `query`, sorted; catalog order (newest first) by default. */
export function filterTours(tours: Tour[], query: TourQuery): Tour[] {
  const found = tours.filter((tour) => CONDITION_KEYS.every((key) => CONDITIONS[key](tour, query)));
  return query.sort ? found.sort(COMPARE[query.sort]) : found;
}

export function paginate<T>(items: T[], page = 1) {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  return { items: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE), page: current, pageCount };
}

/** Border gates present in the catalog, for the filter (the CMS field is free text). */
export function gateChoices(tours: Tour[]): { value: string; label: string }[] {
  const gates = new Map<string, string>();
  for (const tour of tours) if (tour.borderGate?.trim()) gates.set(slugify(tour.borderGate), tour.borderGate.trim());
  return [...gates].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

/** Readable label of each active condition, e.g. { category: 'Tour Trung Quốc', groupSize: '20 khách' }. */
export function conditionLabels(query: TourQuery, gates: { value: string; label: string }[]): Partial<Record<ConditionKey, string>> {
  const labels: Partial<Record<ConditionKey, string>> = {
    q: query.q ? `“${query.q}”` : undefined,
    category: choice(CATEGORIES, query.category)?.label,
    region: choice(REGIONS, query.region)?.label,
    gate: query.gate ? (gates.find((gate) => gate.value === query.gate)?.label ?? query.gate) : undefined,
    duration: choice(DURATIONS, query.duration)?.label,
    groupSize: query.groupSize ? `${query.groupSize} khách` : undefined,
  };
  return Object.fromEntries(Object.entries(labels).filter(([, label]) => label));
}

/** `query` without one condition, back to page 1. */
export function without(query: TourQuery, key: ConditionKey): TourQuery {
  return { ...query, [key]: undefined, page: undefined };
}

/**
 * FR-SRC-05: for an empty result, how many tours each single condition
 * removed would bring back, most results first.
 */
export function relaxations(tours: Tour[], query: TourQuery): { key: ConditionKey; count: number }[] {
  return CONDITION_KEYS.filter((key) => query[key] !== undefined)
    .map((key) => ({ key, count: filterTours(tours, without(query, key)).length }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count);
}

const MAX_TRACKED_TERM = 50;

/**
 * NFR-10: what a visitor types may be their phone number or email, which must
 * not go to GA4. Tour codes have a digit or two; 7 digits is a phone number.
 */
function trackedTerm(q: string | undefined): string | undefined {
  if (!q || (q.match(/\d/g)?.length ?? 0) >= 7 || q.includes('@')) return undefined;
  return q.slice(0, MAX_TRACKED_TERM);
}

/** AN-04 `filter_apply` parameters: the active conditions and sort, in GA4 snake_case. */
export function filterEventParams(query: TourQuery, results: number): Record<string, string> {
  const params: Record<string, string | number | undefined> = {
    search_term: trackedTerm(query.q),
    category: query.category,
    region: query.region,
    gate: query.gate,
    duration: query.duration,
    group_size: query.groupSize,
    sort: query.sort,
    results,
  };
  return Object.fromEntries(Object.entries(params).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])));
}
