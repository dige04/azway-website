import type { CancellationRule } from './cms-types';

export interface CancellationWindow extends CancellationRule {
  label: string;
}

/**
 * FR-PRD-02: a rule's `daysBefore` means "cancel within this many days of
 * departure" (cancellation-rule.json), so each fee covers the days from its
 * rule down to the next one. Nothing is said beyond the largest rule, so no
 * row is invented for it.
 */
export function cancellationWindows(rules: CancellationRule[]): CancellationWindow[] {
  const sorted = [...rules].sort((a, b) => b.daysBefore - a.daysBefore);
  return sorted.map((rule, index) => {
    const next = sorted[index + 1];
    return { ...rule, label: windowLabel(rule.daysBefore, next ? next.daysBefore + 1 : null) };
  });
}

function windowLabel(from: number, to: number | null): string {
  if (to === null) return from === 0 ? 'Huỷ vào ngày khởi hành' : `Huỷ từ ${from} ngày trở xuống trước khởi hành`;
  if (from <= to) return `Huỷ ${from} ngày trước khởi hành`;
  return `Huỷ từ ${from} đến ${to} ngày trước khởi hành`;
}
