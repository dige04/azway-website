import { z } from 'zod';

/**
 * The lead form (FR-LEAD-01/03), validated with this one schema in the
 * browser (LeadForm) and again in POST /api/lead. Limits and rules follow the
 * CMS, which stays the authority (apps/cms/src/services/lead-input.ts).
 */

export const PRODUCT_TYPES = ['tour', 'cruise', 'teambuilding'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/** The product a form is about (FR-LEAD-02); none on /lien-he. */
export interface LeadProduct {
  type: ProductType;
  code: string;
  name: string;
}

/** Vietnamese phone, 10 digits starting with 0, after +84/84/0084 → 0 (same rule as the CMS). */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+84')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('0084')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('84') && digits.length === 11) digits = `0${digits.slice(2)}`;
  return /^0\d{9}$/.test(digits) ? digits : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A value the page adds, not the visitor (product, page URL): cut to fit, never a reason to lose the lead. */
const supplied = (max: number) =>
  z
    .string()
    .optional()
    .transform((value) => value?.trim().slice(0, max) || undefined);

/** A blank optional field is "not given". */
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Tối đa ${max} ký tự`)
    .optional()
    .transform((value) => value || undefined);

export const leadSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(100, 'Tối đa 100 ký tự'),
  phone: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số điện thoại')
    .refine((value) => normalizePhone(value) !== null, 'Số điện thoại Việt Nam gồm 10 số, ví dụ 0912 345 678')
    .transform((value) => normalizePhone(value) ?? value),
  email: optional(254).refine((value) => !value || EMAIL.test(value), 'Email chưa đúng định dạng'),
  organization: optional(200),
  travelDate: optional(10).refine((value) => !value || (ISO_DATE.test(value) && !Number.isNaN(Date.parse(value))), 'Chọn ngày theo lịch'),
  groupSize: optional(5)
    .refine((value) => !value || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 10000), 'Số người từ 1 đến 10.000')
    .transform((value) => (value ? Number(value) : undefined)),
  need: optional(2000),
  note: optional(2000),
  productType: z.enum(PRODUCT_TYPES).optional(),
  productCode: supplied(100),
  productName: supplied(200),
  /** Path and query of the page the form was sent from (FR-LEAD-07). */
  sourcePage: supplied(2000),
});

export type LeadFields = z.input<typeof leadSchema>;
export type Lead = z.output<typeof leadSchema>;
export type LeadErrors = Partial<Record<keyof LeadFields, string>>;

/** First message per field, for the form. */
export function fieldErrors(error: z.ZodError): LeadErrors {
  const errors: LeadErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof LeadFields;
    errors[field] ??= issue.message;
  }
  return errors;
}

/** What POST /api/lead answers; `message` is always fit to show the visitor. */
export type LeadResponse = { ok: true } | { ok: false; message: string; fields?: LeadErrors };
