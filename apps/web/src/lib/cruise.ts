import type { CruiseOption } from './cms-types';

/** FR-PRD-08 options in the order visitors compare them. */
const ORDER: CruiseOption['type'][] = ['ve_du_ngoan', 'an_toi', 'thue_nguyen_tau'];

export const OPTION_SHORT: Record<CruiseOption['type'], string> = {
  ve_du_ngoan: 'Vé ngày',
  an_toi: 'Ăn tối',
  thue_nguyen_tau: 'Thuê tàu',
};

export const sortedOptions = (options: CruiseOption[] = []) => [...options].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));

/** Cheapest per-guest option; charter options carry no per-guest price. */
export function lowestGuestPrice(options: CruiseOption[] = []): number | null {
  const prices = options.map((option) => option.price).filter((price): price is number => !!price && price > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** "Vé ngày · Ăn tối · Thuê tàu", each type once. */
export const optionSummary = (options: CruiseOption[] = []) =>
  [...new Set(sortedOptions(options).map((option) => OPTION_SHORT[option.type]))].join(' · ');
