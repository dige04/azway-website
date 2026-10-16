import type { ReactNode } from 'react';
import { ContactLink } from '@/components/layout/ContactLink';
import { Show } from '@/components/Show';
import type { SiteSetting, TextItem } from '@/lib/cms-types';
import { formatPrice, hasContent, safeHref, telHref } from '@/lib/present';

// Building blocks shared by the product detail pages (tour, cruise, ...).

/** A titled section; only rendered inside <Show>, so never empty (FR-PRD-05). */
export function Block({ title, plain = false, children }: { title: string; plain?: boolean; children: ReactNode }) {
  return (
    <section className={plain ? '' : 'rounded-card border border-line bg-white p-5 sm:p-6'}>
      <h2 className="mb-4 text-[24px] font-bold tracking-[-0.03em] text-navy">{title}</h2>
      {children}
    </section>
  );
}

/** A full-width section under the main grid (related products, articles). */
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="shell mt-14">
      <h2 className="mb-6 text-[28px] font-bold tracking-[-0.035em] text-navy">{title}</h2>
      {children}
    </section>
  );
}

export function TextList({ items, icon }: { items: TextItem[]; icon: ReactNode }) {
  return (
    <ul className="grid gap-2.5">
      {items.map((item) => (
        <li key={item.id} className="flex gap-2.5 text-ink-2">
          {icon}
          {item.text}
        </li>
      ))}
    </ul>
  );
}

export function Check({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-4 shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

/** "Giá bao gồm" / "Giá không bao gồm" side by side; either may be missing. */
export function Inclusions({ inclusions, exclusions }: { inclusions?: TextItem[]; exclusions?: TextItem[] }) {
  if (!hasContent(inclusions) && !hasContent(exclusions)) return null;
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Show when={inclusions}>
        {(items) => (
          <Block title="Giá bao gồm">
            <TextList items={items} icon={<Check className="mt-1 text-success" />} />
          </Block>
        )}
      </Show>
      <Show when={exclusions}>
        {(items) => (
          <Block title="Giá không bao gồm">
            <TextList items={items} icon={<span aria-hidden="true" className="mt-0.5 font-bold text-red">–</span>} />
          </Block>
        )}
      </Show>
    </div>
  );
}

export interface Fact {
  label: string;
  value: string | null | undefined;
}

/** FR-PRD-03 price ("Giá từ" only with a real price) and the key facts. */
export function PriceBox({ price, facts }: { price: number | null; facts: Fact[] }) {
  const shown = facts.filter((fact) => hasContent(fact.value));
  const hasPrice = !!price && price > 0;
  return (
    <div className="rounded-card border border-line bg-white p-6">
      {hasPrice && <p className="text-xs uppercase tracking-wider text-muted">Giá từ</p>}
      <p className="text-[28px] font-extrabold leading-tight text-red-dark">{formatPrice(price)}</p>
      {shown.length > 0 && (
        <dl className="mt-5 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 border-t border-line pt-5 text-sm">
          {shown.map((fact) => (
            <div key={fact.label} className="contents">
              <dt className="text-muted">{fact.label}</dt>
              <dd className="font-semibold text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <a href="#yeu-cau" className="mt-6 flex min-h-[52px] items-center justify-center rounded-button bg-red font-bold text-white shadow-red hover:bg-red-hover">
        Gửi yêu cầu tư vấn
      </a>
    </div>
  );
}

/**
 * `#yeu-cau`, the spot for the lead form; WP-12 replaces the body with
 * LeadForm (product type, code and name). `subject`, e.g. "tour <b>MC4</b>".
 */
export function RequestBlock({ subject, setting }: { subject: ReactNode; setting: SiteSetting | null }) {
  const tel = telHref(setting?.hotline);
  const zalo = safeHref(setting?.zaloUrl);
  return (
    <section id="yeu-cau" className="scroll-mt-24 rounded-panel bg-navy p-6 text-white sm:p-8">
      <h2 className="text-2xl font-bold">Gửi yêu cầu cho AZway</h2>
      <p className="mt-2 text-navy-mist">Cho AZway biết số khách, ngày dự kiến và yêu cầu riêng của đoàn cho {subject}, AZway sẽ tư vấn chương trình và báo giá.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {tel && (
          <ContactLink href={tel} event="click_call" className="inline-flex min-h-12 items-center rounded-button bg-red px-5 font-bold hover:bg-red-hover">
            Gọi {setting?.hotline}
          </ContactLink>
        )}
        {zalo && (
          <ContactLink href={zalo} event="click_zalo" className="inline-flex min-h-12 items-center rounded-button bg-white px-5 font-bold text-navy">
            Nhắn Zalo
          </ContactLink>
        )}
      </div>
    </section>
  );
}
