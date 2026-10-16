'use client';

import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { fieldErrors, type LeadErrors, type LeadFields, type LeadProduct, type LeadResponse, leadSchema } from '@/lib/lead';
import { telHref } from '@/lib/present';
import { track } from '@/lib/track';

type State = { step: 'form'; message?: string } | { step: 'sending' } | { step: 'sent' };

const NETWORK = 'Chưa gửi được yêu cầu. Kiểm tra kết nối mạng rồi thử lại, hoặc gọi hotline.';

/**
 * FR-LEAD-01..03/09: the request form. Checked here with the server's schema,
 * sent to /api/lead with the product being viewed; then a confirmation that
 * the request was received (not that anything is booked).
 */
export function LeadForm({ product, responseTimeText, hotline }: { product?: LeadProduct; responseTimeText: string | null | undefined; hotline: string | null | undefined }) {
  const [state, setState] = useState<State>({ step: 'form' });
  const [errors, setErrors] = useState<LeadErrors>({});
  const form = useRef<HTMLFormElement>(null);
  const done = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state.step === 'sent') done.current?.focus();
  }, [state.step]);

  const focusFirstError = (found: LeadErrors) => {
    const first = Object.keys(found)[0];
    if (first) form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? '');
    const lead = {
      fullName: value('fullName'),
      phone: value('phone'),
      email: value('email'),
      organization: value('organization'),
      groupSize: value('groupSize'),
      travelDate: value('travelDate'),
      need: value('need'),
      note: value('note'),
      productType: product?.type,
      productCode: product?.code,
      productName: product?.name,
      sourcePage: location.pathname + location.search,
      hp: value('hp'),
    } satisfies LeadFields & { hp: string };
    const checked = leadSchema.safeParse(lead);
    if (!checked.success) {
      const found = fieldErrors(checked.error);
      setErrors(found);
      focusFirstError(found);
      return;
    }

    setErrors({});
    setState({ step: 'sending' });
    try {
      const res = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(lead) });
      const answer = (await res.json().catch(() => null)) as LeadResponse | null;
      if (answer?.ok) {
        track('lead_submit', { product_code: product?.code ?? '', source_page: location.pathname });
        setState({ step: 'sent' });
        return;
      }
      setErrors(answer?.fields ?? {});
      setState({ step: 'form', message: answer?.message ?? NETWORK });
      focusFirstError(answer?.fields ?? {});
    } catch {
      setState({ step: 'form', message: NETWORK });
    }
  }

  if (state.step === 'sent') {
    return (
      <div role="status" className="rounded-card bg-white p-6 text-ink sm:p-8">
        <h3 ref={done} tabIndex={-1} className="text-2xl font-bold text-navy outline-none">
          AZway đã nhận yêu cầu của bạn
        </h3>
        <p className="mt-3 text-ink-2">{responseTimeText?.trim() || 'Nhân viên tư vấn sẽ liên hệ lại với bạn sớm.'}</p>
        <p className="mt-3 text-sm text-muted">Đây là xác nhận AZway đã nhận thông tin, chưa phải xác nhận đặt chỗ hay báo giá.</p>
      </div>
    );
  }

  const sending = state.step === 'sending';
  const tel = telHref(hotline);
  return (
    <form ref={form} onSubmit={submit} noValidate className="grid gap-4 rounded-card bg-white p-5 text-ink sm:grid-cols-2 sm:p-7">
      <Field name="fullName" label="Họ và tên *" error={errors.fullName}>
        {(props) => <input {...props} required maxLength={100} autoComplete="name" />}
      </Field>
      <Field name="phone" label="Số điện thoại *" error={errors.phone}>
        {(props) => <input {...props} required type="tel" inputMode="tel" maxLength={20} autoComplete="tel" />}
      </Field>
      <Field name="email" label="Email" error={errors.email}>
        {(props) => <input {...props} type="email" maxLength={254} autoComplete="email" />}
      </Field>
      <Field name="organization" label="Công ty / Trường / Đơn vị" error={errors.organization}>
        {(props) => <input {...props} maxLength={200} autoComplete="organization" />}
      </Field>
      <Field name="groupSize" label="Số người dự kiến" error={errors.groupSize}>
        {(props) => <input {...props} type="number" inputMode="numeric" min={1} max={10000} step={1} />}
      </Field>
      <Field name="travelDate" label="Ngày đi dự kiến" error={errors.travelDate}>
        {(props) => <input {...props} type="date" />}
      </Field>
      <Field name="need" label="Nhu cầu" error={errors.need} wide>
        {(props) => <textarea {...props} rows={3} maxLength={2000} placeholder="Điểm đến, số ngày, ngân sách, mong muốn của đoàn…" />}
      </Field>
      <Field name="note" label="Ghi chú" error={errors.note} wide>
        {(props) => <textarea {...props} rows={2} maxLength={2000} placeholder="Trẻ em, ăn chay, khách sạn mong muốn…" />}
      </Field>

      {/* Honeypot (FR-LEAD-08): hidden from people and screen readers; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input name="hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.step === 'form' && state.message && (
        <p role="alert" className="rounded-control bg-red-soft p-3 text-sm text-red-dark sm:col-span-2">
          {state.message}
          {tel && (
            <>
              {' '}
              <a href={tel} className="font-bold underline">
                {`Gọi ${hotline}`}
              </a>
            </>
          )}
        </p>
      )}

      <div className="sm:col-span-2">
        <button type="submit" disabled={sending} className="inline-flex min-h-[52px] w-full items-center justify-center rounded-button bg-red px-6 font-bold text-white shadow-red hover:bg-red-hover disabled:opacity-70 sm:w-auto">
          {sending ? 'Đang gửi…' : 'Gửi yêu cầu tư vấn'}
        </button>
        <p className="mt-3 text-xs text-muted">AZway chỉ dùng thông tin này để liên hệ tư vấn cho bạn.</p>
      </div>
    </form>
  );
}

type FieldProps = { id: string; name: string; 'aria-invalid'?: true; 'aria-describedby'?: string; className: string };

function Field({ name, label, error, wide = false, children }: { name: keyof LeadFields; label: string; error?: string; wide?: boolean; children: (props: FieldProps) => ReactNode }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
      </label>
      {children({
        id,
        name,
        className: `block w-full rounded-control border bg-white px-3.5 py-3 text-base text-ink outline-none focus:border-navy ${error ? 'border-red' : 'border-line'}`,
        ...(error ? { 'aria-invalid': true as const, 'aria-describedby': errorId } : {}),
      })}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-dark">
          {error}
        </p>
      )}
    </div>
  );
}
