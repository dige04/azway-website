import { describe, expect, it } from 'vitest';
import { leadSchema } from './lead';

const valid = { fullName: 'Nguyễn Văn A', phone: '0912345678' };

describe('leadSchema (FR-LEAD-03)', () => {
  it('takes a Vietnamese 10-digit phone in common spellings and refuses anything else', () => {
    for (const phone of ['0912345678', '0912 345 678', '0912.345.678', '+84 912 345 678', '84912345678']) {
      expect(leadSchema.parse({ ...valid, phone }).phone, phone).toBe('0912345678');
    }
    for (const phone of ['091234567', '09123456789', '1912345678', 'abc']) {
      expect(leadSchema.safeParse({ ...valid, phone }).success, phone).toBe(false);
    }
  });

  it('checks an email only when given, and drops blank optional fields', () => {
    expect(leadSchema.safeParse({ ...valid, email: 'a@b' }).success).toBe(false);
    const lead = leadSchema.parse({ ...valid, email: ' ', organization: '', groupSize: '', travelDate: '' });
    expect(lead).toEqual({ fullName: 'Nguyễn Văn A', phone: '0912345678' });
  });
});
