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

// Max length of what the visitor types; longer is rejected. `fullName` and
// `phone` are required. `need` and `note` may span several lines.
const FORM_LIMITS = {
  fullName: 100,
  email: 254,
  organization: 200,
  need: 2000,
  note: 2000,
  productCode: 100,
  productName: 200,
} as const;
const MULTI_LINE = new Set(['need', 'note']);

// Tracking data the web adds (long ad-click URLs are common): cut to fit,
// never a reason to lose the lead.
const METADATA_LIMITS = {
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
// Control characters; in single-line fields they could, e.g., break the email subject.
const CONTROL = /[\u0000-\u001f\u007f]+/g;
const CONTROL_EXCEPT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f]+/g;

/** Vietnamese mobile/landline: 10 digits starting with 0, after +84/84/0084 → 0. */
export const normalizePhone = (raw: string): string | null => {
  let digits = raw.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+84')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('0084')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('84') && digits.length === 11) digits = `0${digits.slice(2)}`;
  return /^0\d{9}$/.test(digits) ? digits : null;
};

const text = (value: unknown, multiLine = false): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const cleaned = String(value).replace(/\r\n?/g, '\n').replace(multiLine ? CONTROL_EXCEPT_NEWLINE : CONTROL, ' ').trim();
  return cleaned === '' ? null : cleaned;
};

export type ValidationResult = { ok: true; value: LeadInput } | { ok: false; errors: Record<string, string> };

export const validateLeadInput = (body: unknown): ValidationResult => {
  const src = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const out: Record<string, unknown> = {};

  for (const [field, max] of Object.entries(FORM_LIMITS)) {
    const value = text(src[field], MULTI_LINE.has(field));
    if (value && value.length > max) errors[field] = `tối đa ${max} ký tự`;
    out[field] = value;
  }
  for (const [field, max] of Object.entries(METADATA_LIMITS)) {
    out[field] = text(src[field])?.slice(0, max) ?? null;
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

  // Type first: String() of an arbitrary JSON object can throw.
  const rawGroupSize = src.groupSize;
  const isText = typeof rawGroupSize === 'string' || typeof rawGroupSize === 'number';
  const groupSize = isText ? String(rawGroupSize).trim() : '';
  out.groupSize = groupSize ? Number(groupSize) : null;
  // Blank is "not given", like the other optional fields.
  const given = isText ? groupSize !== '' : rawGroupSize !== undefined && rawGroupSize !== null;
  if (given && !(/^\d+$/.test(groupSize) && Number(groupSize) >= 1 && Number(groupSize) <= 10000)) {
    errors.groupSize = 'số nguyên 1–10000';
  }

  const productType = text(src.productType);
  out.productType = productType;
  if (productType && !(PRODUCT_TYPES as readonly string[]).includes(productType)) {
    errors.productType = PRODUCT_TYPES.join(' | ');
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: out as LeadInput };
};
