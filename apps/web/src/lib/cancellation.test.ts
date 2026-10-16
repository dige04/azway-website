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
});
