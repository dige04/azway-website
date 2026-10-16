import { describe, expect, it } from 'vitest';
import type { Article, Cruise, Tour } from './cms-types';
import { search } from './search';

const CATALOGS = {
  tours: [
    { code: 'LC20', name: 'Lào Cai – Côn Minh 5N4Đ' },
    { code: 'HL1', name: 'Hà Nội – Hạ Long 1 ngày' },
    { code: 'LC2', name: 'Kiến Thủy – Mông Tự 3N2Đ' },
  ] as Tour[],
  cruises: [{ name: 'Du thuyền Ambassador Hạ Long' }, { name: 'Heritage Cruises' }] as Cruise[],
  articles: [{ title: 'Đi Trung Quốc: chọn cửa khẩu' }, { title: 'Kinh nghiệm đi Hạ Long mùa đông' }] as Article[],
};
const found = (q: string) => {
  const { tours, cruises, articles } = search(q, CATALOGS);
  return [...tours.map((tour) => tour.code), ...cruises.map((cruise) => cruise.name), ...articles.map((article) => article.title)];
};

// FR-SRC-03 / AC-08 across tours, cruises and articles.
describe('search', () => {
  it('finds every product type and article by name or code, accents and case ignored', () => {
    expect(found('ha long')).toEqual(['HL1', 'Du thuyền Ambassador Hạ Long', 'Kinh nghiệm đi Hạ Long mùa đông']);
    expect(found('Hạ Long')).toEqual(found('ha long'));
    expect(found('cua khau trung quoc')).toEqual(['Đi Trung Quốc: chọn cửa khẩu']);
    expect(found('lc2')).toEqual(['LC2', 'LC20']);
    expect(found('ha long sapa')).toEqual([]);
    expect(found('  ')).toEqual([]);
  });
});
