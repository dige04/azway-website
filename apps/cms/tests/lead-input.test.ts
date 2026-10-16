import { describe, expect, it } from 'vitest';
import { normalizePhone, validateLeadInput } from '../src/services/lead-input';

describe('lead input', () => {
  it('normalises Vietnamese phone numbers to 10 digits starting with 0', () => {
    for (const raw of ['0912345678', '0912 345 678', '091.234.5678', '+84912345678', '+84 912 345 678', '84912345678', '0084912345678']) {
      expect(normalizePhone(raw), raw).toBe('0912345678');
    }
    for (const raw of ['912345678', '09123456789', '+1 912 345 678', '0912-345-67a', '']) {
      expect(normalizePhone(raw), raw).toBeNull();
    }
  });

  it('rejects what the lead form must not accept', () => {
    const result = validateLeadInput({
      fullName: ' ',
      phone: '123',
      email: 'not-an-email',
      travelDate: '16/10/2026',
      groupSize: 0,
      productType: 'hotel',
      note: 'x'.repeat(2001),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ['email', 'fullName', 'groupSize', 'note', 'phone', 'productType', 'travelDate'].sort()
      );
    }
    const ok = validateLeadInput({ fullName: 'Nguyễn Văn A', phone: '+84 912 345 678', groupSize: '30' });
    expect(ok).toMatchObject({ ok: true, value: { phone: '0912345678', groupSize: 30, email: null } });
  });
});
