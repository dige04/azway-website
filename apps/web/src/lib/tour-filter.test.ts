import { describe, expect, it } from 'vitest';
import type { Region, Tour } from './cms-types';
import { filterEventParams, filterTours, parseTourQuery, REGIONS, relaxations, tourHref, toursInRegion, type TourQuery } from './tour-filter';

const tour = (code: string, over: Partial<Tour> & { regions?: Region[] } = {}): Tour =>
  ({
    code,
    name: `Tour ${code}`,
    slug: code.toLowerCase(),
    category: 'noi_dia',
    borderGate: null,
    durationDays: 2,
    durationNights: 1,
    groupSizeMin: null,
    groupSizeMax: null,
    priceFrom: 1_000_000,
    destinations: (over.regions ?? ['mien_bac']).map((region) => ({ region })),
    ...over,
  }) as Tour;

const CATALOG = [
  tour('HL1', { name: 'Hà Nội – Hạ Long 1 ngày', durationDays: 1, durationNights: 0, priceFrom: 990_000 }),
  tour('SP2', { name: 'Sa Pa – Fansipan', durationDays: 3, durationNights: 2, priceFrom: null, groupSizeMin: 10, groupSizeMax: 30 }),
  tour('DN3', { name: 'Đà Nẵng – Hội An', regions: ['mien_trung'], durationDays: 4, durationNights: 3, priceFrom: 5_690_000 }),
  tour('LC4', { category: 'trung_quoc', regions: ['trung_quoc'], borderGate: 'Lào Cai – Hà Khẩu', durationDays: 4, durationNights: 3, priceFrom: 0 }),
  tour('MC5', { category: 'trung_quoc', regions: ['trung_quoc'], borderGate: 'Móng Cái – Đông Hưng', priceFrom: 1_500_000, groupSizeMin: 20 }),
  tour('BK6', { category: 'quoc_te', regions: ['quoc_te'], durationDays: 5, durationNights: 4, priceFrom: 8_000_000 }),
];
const codes = (query: TourQuery) => filterTours(CATALOG, query).map((item) => item.code);

describe('tour list URL', () => {
  it('reads and writes the whole state; links already in the CMS keep working', () => {
    const query = parseTourQuery(new URLSearchParams('loai=trung-quoc&cua-khau=lao-cai-ha-khau&thoi-luong=4n3d&so-khach=20&q=Hà Khẩu&sap-xep=gia-tang&trang=2'));
    expect(query).toEqual({
      category: 'trung-quoc',
      gate: 'lao-cai-ha-khau',
      duration: '4n3d',
      groupSize: 20,
      q: 'Hà Khẩu',
      sort: 'gia-tang',
      page: 2,
    });
    expect(parseTourQuery(new URLSearchParams(tourHref(query).split('?')[1]))).toEqual(query);
    // Seed hero slide and the 301 of /tourtrungtonghop.
    expect(codes(parseTourQuery({ loai: 'trung-quoc' }))).toEqual(['LC4', 'MC5']);
  });

  it('a link to the tours of a CMS region opens /tour filtered to that region', () => {
    const ALL: Record<Region, true> = { mien_bac: true, mien_trung: true, mien_nam: true, trung_quoc: true, quoc_te: true };
    for (const region of Object.keys(ALL) as Region[]) {
      const query = parseTourQuery(new URLSearchParams(toursInRegion(region).split('?')[1]));
      expect(REGIONS.find((choice) => choice.value === query.region)?.match, region).toBe(region);
    }
  });

  it('drops values it does not understand instead of passing them on', () => {
    const query = parseTourQuery({ 'sap-xep': 'priceFrom:asc', loai: 'hotel', 'so-khach': '-3', trang: '0', 'cua-khau': '<x>', 'khu-vuc': ['mien-bac', 'mien-nam'] });
    expect(query).toEqual({ region: 'mien-bac' });
    expect(tourHref({})).toBe('/tour');
  });
});

describe('tour filters', () => {
  // AC-07
  it('applies every condition together', () => {
    expect(codes({ category: 'trung-quoc', gate: 'lao-cai-ha-khau', duration: '4n3d' })).toEqual(['LC4']);
    expect(codes({ region: 'mien-bac', duration: 'trong-ngay' })).toEqual(['HL1']);
    expect(codes({ duration: 'tu-5-ngay' })).toEqual(['BK6']);
    // Group size inside [min, max]; an empty bound accepts any size.
    expect(codes({ groupSize: 15 })).toEqual(['HL1', 'SP2', 'DN3', 'LC4', 'BK6']);
    expect(codes({ groupSize: 40, category: 'trung-quoc' })).toEqual(['LC4', 'MC5']);
  });

  // AC-08
  it('finds tours by name or code, with or without accents', () => {
    expect(codes({ q: 'ha long' })).toEqual(['HL1']);
    expect(codes({ q: 'Hạ Long' })).toEqual(['HL1']);
    expect(codes({ q: 'dn3' })).toEqual(['DN3']);
    expect(codes({ q: 'da nang hoi an' })).toEqual(['DN3']);
    expect(codes({ q: 'hoi an sapa' })).toEqual([]);
  });

  it('sorts by price with "Liên hệ báo giá" last in both directions', () => {
    expect(codes({ sort: 'gia-tang' })).toEqual(['HL1', 'MC5', 'DN3', 'BK6', 'SP2', 'LC4']);
    expect(codes({ sort: 'gia-giam' })).toEqual(['BK6', 'DN3', 'MC5', 'HL1', 'SP2', 'LC4']);
    expect(codes({ sort: 'ngan-nhat' }).slice(0, 2)).toEqual(['HL1', 'MC5']);
  });

  // FR-SRC-05
  it('suggests which condition to drop when nothing matches', () => {
    expect(codes({ category: 'trung-quoc', duration: 'tu-5-ngay' })).toEqual([]);
    expect(relaxations(CATALOG, { category: 'trung-quoc', duration: 'tu-5-ngay' })).toEqual([
      { key: 'duration', count: 2 },
      { key: 'category', count: 1 },
    ]);
  });
});

// AN-04 + NFR-10
describe('filter_apply event', () => {
  it('never sends a phone number or email the visitor typed into search', () => {
    const term = (q: string) => filterEventParams({ q }, 0).search_term;
    expect(term('tour hạ long 0912 345 678')).toBeUndefined();
    expect(term('an@example.com')).toBeUndefined();
    expect(term('HT-BDHL-2N1D')).toBe('HT-BDHL-2N1D');
    expect(term('x'.repeat(100))).toHaveLength(50);
  });
});
