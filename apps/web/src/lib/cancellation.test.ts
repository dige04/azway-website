import { describe, expect, it } from 'vitest';
import { cancellationWindows } from './cancellation';

const rule = (id: number, daysBefore: number, feePercent: number) => ({ id, daysBefore, feePercent, note: null });

describe('cancellationWindows (FR-PRD-02)', () => {
  // daysBefore = "cancel within this many days of departure" (cancellation-rule.json).
  it('shows each fee for the days between its rule and the next, nothing beyond the first', () => {
    const windows = cancellationWindows([rule(1, 3, 100), rule(2, 15, 20), rule(3, 7, 50)]);
    expect(windows.map(({ label, feePercent }) => [label, feePercent])).toEqual([
      ['Huỷ từ 15 đến 8 ngày trước khởi hành', 20],
      ['Huỷ từ 7 đến 4 ngày trước khởi hành', 50],
      ['Huỷ từ 3 ngày trở xuống trước khởi hành', 100],
    ]);
  });

  it('labels the edges: a single rule, the departure day, adjacent days, no rules', () => {
    const labels = (rules: ReturnType<typeof rule>[]) => cancellationWindows(rules).map(({ label }) => label);
    expect(labels([rule(1, 10, 30)])).toEqual(['Huỷ từ 10 ngày trở xuống trước khởi hành']);
    expect(labels([rule(1, 1, 50), rule(2, 0, 100)])).toEqual(['Huỷ 1 ngày trước khởi hành', 'Huỷ vào ngày khởi hành']);
    expect(labels([rule(1, 7, 50), rule(2, 6, 70), rule(3, 2, 100)])).toEqual([
      'Huỷ 7 ngày trước khởi hành',
      'Huỷ từ 6 đến 3 ngày trước khởi hành',
      'Huỷ từ 2 ngày trở xuống trước khởi hành',
    ]);
    expect(cancellationWindows([])).toEqual([]);
  });

  it('counts two rules for the same day once, at the higher fee', () => {
    const windows = cancellationWindows([rule(1, 7, 30), rule(2, 7, 50), rule(3, 3, 100)]);
    expect(windows.map(({ label, feePercent }) => [label, feePercent])).toEqual([
      ['Huỷ từ 7 đến 4 ngày trước khởi hành', 50],
      ['Huỷ từ 3 ngày trở xuống trước khởi hành', 100],
    ]);
  });
});
