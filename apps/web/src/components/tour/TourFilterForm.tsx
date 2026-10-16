'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ComponentProps, type CSSProperties, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { track } from '@/lib/track';
import { CATEGORIES, DURATIONS, parseTourQuery, REGIONS, SORTS, tourHref, type TourQuery } from '@/lib/tour-filter';

export const FORM_ID = 'tour-filter';

const control = 'min-h-[52px] w-full rounded-control border border-line bg-white px-3.5 py-3 text-ink';
// Design `.field select`: no native arrow, a small navy chevron.
const chevron: CSSProperties = {
  appearance: 'none',
  backgroundImage: 'linear-gradient(45deg,transparent 50%,var(--color-navy) 50%),linear-gradient(135deg,var(--color-navy) 50%,transparent 50%)',
  backgroundPosition: 'calc(100% - 18px) 22px,calc(100% - 13px) 22px',
  backgroundSize: '5px 5px,5px 5px',
  backgroundRepeat: 'no-repeat',
  paddingRight: 35,
};

/**
 * The /tour URL the visitor just asked for (form, sort, chip). `filter_apply`
 * fires when the page arrives there, so it carries the result count, and
 * Back/Forward or paging never fire it.
 */
let applying: string | null = null;

/** Submits to a clean, shareable /tour URL; without JavaScript it is a plain GET form. */
function useSubmitToUrl() {
  const router = useRouter();
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) if (typeof value === 'string') data.append(key, value);
    const target = tourHref(parseTourQuery(data));
    // Resubmitting what is shown changes nothing, so it is not an apply.
    const current = tourHref({ ...parseTourQuery(new URLSearchParams(window.location.search)), page: undefined });
    if (target !== current) applying = target;
    router.push(target, { scroll: false });
  };
}

/**
 * A link to other /tour conditions (chips, suggestions): following it is a
 * `filter_apply`. A click that opens a new tab or window applies nothing here.
 */
export function FilterLink({ href, onClick, ...props }: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (plain && !event.defaultPrevented) applying = href;
  };
  return <Link href={href} scroll={false} {...props} onClick={follow} />;
}

/** Filter fields (FR-SRC-01, FR-SRC-03); the page keys them by the current URL. */
export function TourFilterForm({ query, gates }: { query: TourQuery; gates: { value: string; label: string }[] }) {
  const onSubmit = useSubmitToUrl();
  return (
    <form id={FORM_ID} action="/tour" method="get" onSubmit={onSubmit} role="search" aria-label="Lọc tour">
      <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[1.4fr_repeat(5,1fr)_auto]">
        <Field label="Tên hoặc mã tour" htmlFor="tour-q" className="col-span-2 lg:col-span-1">
          <input id="tour-q" name="q" type="search" defaultValue={query.q} placeholder="VD: Hạ Long hoặc mã tour" maxLength={100} className={control} />
        </Field>
        {/* Phones: the two with the longest values get a full row. */}
        <Select label="Loại tour" name="loai" value={query.category} all="Tất cả loại" options={CATEGORIES} className="max-sm:col-span-2" />
        {gates.length > 0 && <Select label="Cửa khẩu" name="cua-khau" value={query.gate} all="Mọi cửa khẩu" options={gates} className="max-sm:col-span-2" />}
        <Select label="Khu vực" name="khu-vuc" value={query.region} all="Mọi khu vực" options={REGIONS} />
        <Select label="Thời lượng" name="thoi-luong" value={query.duration} all="Mọi thời lượng" options={DURATIONS} />
        <Field label="Số khách trong đoàn" htmlFor="tour-group">
          <input id="tour-group" name="so-khach" type="number" inputMode="numeric" min={1} max={10000} defaultValue={query.groupSize} placeholder="VD: 30" className={control} />
        </Field>
        {/* The sort select lives in the result bar; it belongs to this form via `form`. */}
        <button
          type="submit"
          className={`min-h-[52px] rounded-button bg-red px-6 font-bold text-white shadow-red hover:bg-red-hover lg:col-span-1 ${gates.length > 0 ? '' : 'sm:col-span-2'}`}
        >
          Lọc tour
        </button>
      </div>
    </form>
  );
}

/** Sort for the result bar (FR-SRC-02): applies as soon as it changes. */
export function TourSortSelect({ sort }: { sort: TourQuery['sort'] }) {
  return (
    <label className="flex items-center gap-2 text-sm font-bold text-label">
      <span className="shrink-0">Sắp xếp</span>
      <select
        name="sap-xep"
        form={FORM_ID}
        defaultValue={sort ?? ''}
        onChange={(event) => {
          const form = event.currentTarget.form;
          if (!form) return;
          // An invalid field may sit in the closed phone panel: open it so its message shows.
          if (!form.checkValidity()) form.closest('details')?.setAttribute('open', '');
          form.requestSubmit();
        }}
        className={`${control} min-h-11 py-2 font-normal`}
        style={{ ...chevron, backgroundPosition: 'calc(100% - 18px) 18px,calc(100% - 13px) 18px' }}
      >
        <option value="">Mới nhất</option>
        {SORTS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * AN-04: one `filter_apply` per change of conditions or sort the visitor
 * makes on the page (see `applying`). Opening a shared link is not an apply.
 */
export function FilterApplyTracker({ href, params }: { href: string; params: Record<string, string> }) {
  const previous = useRef(href);
  useEffect(() => {
    if (previous.current === href) return;
    previous.current = href;
    const asked = applying === href;
    applying = null;
    if (asked) track('filter_apply', params);
  }, [href, params]);
  // Leaving /tour drops a request that never arrived.
  useEffect(
    () => () => {
      applying = null;
    },
    [],
  );
  return null;
}

function Field({ label, htmlFor, className = '', children }: { label: string; htmlFor: string; className?: string; children: ReactNode }) {
  return (
    <div className={`grid min-w-0 gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-bold text-label">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  label,
  name,
  value,
  all,
  options,
  className,
}: {
  label: string;
  name: string;
  value?: string;
  all: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const id = `tour-${name}`;
  return (
    <Field label={label} htmlFor={id} className={className}>
      <select id={id} name={name} defaultValue={value ?? ''} className={control} style={chevron}>
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
