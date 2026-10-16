// Server-side validation of POST /api/leads/submit (FR-LEAD-01/03/07).
// The web app validates too; this is the authority. Contract: ARCHITECTURE.md.

export const PRODUCT_TYPES = ['tour', 'cruise', 'teambuilding'] as const;

export type LeadInput = {
  fullName: string;
  phone: string;
  email: string | null;
  organization: string | null;
  travelDate: string | null;
  groupSize: number | null;
  need: string | null;
  note: string | null;
  productType: (typeof PRODUCT_TYPES)[number] | null;
  productCode: string | null;
  productName: string | null;
  sourcePage: string | null;
  landingPage: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device: string | null;
  ipHash: string | null;
};

// Max length per text field; `fullName` and `phone` are required.
const TEXT_LIMITS = {
  fullName: 100,
  email: 254,
  organization: 200,
  need: 2000,
  note: 2000,
  productCode: 100,
  productName: 200,
  sourcePage: 2000,
  landingPage: 2000,
  utm_source: 200,
  utm_medium: 200,
  utm_campaign: 200,
  device: 50,
  ipHash: 128,
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Vietnamese mobile/landline: 10 digits starting with 0, after +84/84/0084 → 0. */
export const normalizePhone = (raw: string): string | null => {
  let digits = raw.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+84')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('0084')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('84') && digits.length === 11) digits = `0${digits.slice(2)}`;
  return /^0\d{9}$/.test(digits) ? digits : null;
};

const text = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

export type ValidationResult = { ok: true; value: LeadInput } | { ok: false; errors: Record<string, string> };

export const validateLeadInput = (body: unknown): ValidationResult => {
  const src = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const out: Record<string, unknown> = {};

  for (const [field, max] of Object.entries(TEXT_LIMITS)) {
    const value = text(src[field]);
    if (value && value.length > max) errors[field] = `tối đa ${max} ký tự`;
    out[field] = value;
  }

  if (!out.fullName) errors.fullName = 'bắt buộc';

  const phone = text(src.phone);
  if (!phone) errors.phone = 'bắt buộc';
  else if (!(out.phone = normalizePhone(phone))) errors.phone = 'số điện thoại Việt Nam 10 số';

  if (out.email && !EMAIL.test(out.email as string)) errors.email = 'email không hợp lệ';

  const travelDate = text(src.travelDate);
  out.travelDate = travelDate;
  if (travelDate && (!ISO_DATE.test(travelDate) || Number.isNaN(Date.parse(travelDate)))) {
    errors.travelDate = 'định dạng YYYY-MM-DD';
  }

  const groupSize = text(src.groupSize);
  out.groupSize = groupSize === null ? null : Number(groupSize);
  if (groupSize !== null && !(Number.isInteger(out.groupSize) && (out.groupSize as number) >= 1 && (out.groupSize as number) <= 10000)) {
    errors.groupSize = 'số nguyên 1–10000';
  }

  const productType = text(src.productType);
  out.productType = productType;
  if (productType && !(PRODUCT_TYPES as readonly string[]).includes(productType)) {
    errors.productType = PRODUCT_TYPES.join(' | ');
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: out as LeadInput };
};
