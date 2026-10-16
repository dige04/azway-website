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

  it('cuts what the page adds (URL, product) to fit instead of losing the lead', () => {
    const lead = leadSchema.parse({ ...valid, sourcePage: `/tour/x?utm_campaign=${'a'.repeat(2500)}`, productName: 'T'.repeat(250), productCode: 'C'.repeat(150) });
    expect(lead.sourcePage).toHaveLength(2000);
    expect(lead.productName).toHaveLength(200);
    expect(lead.productCode).toHaveLength(100);
  });
});
