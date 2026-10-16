import type { ReactNode } from 'react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ContactLink } from '@/components/layout/ContactLink';
import { LeadForm } from '@/components/lead/LeadForm';
import { Show } from '@/components/Show';
import { renderPerRequestWithoutCms } from '@/lib/build';
import { safeHref, telHref } from '@/lib/present';
import { pageMetadata } from '@/lib/seo';
import { loadSiteSetting } from '@/lib/site-setting';

// Static + ISR (NFR-03): refreshed when the CMS revalidates `site-setting`.
export const revalidate = 3600;

const INTRO = 'Để lại điểm đến, số người và thời gian dự kiến. AZway sẽ liên hệ để gợi ý hành trình phù hợp.';

export const generateMetadata = () => pageMetadata({
  title: 'Liên hệ',
  description: `Hotline, Zalo, email và địa chỉ của AZway. ${INTRO}`,
  path: '/lien-he',
});

const mailHref = (email: string | null | undefined) => (email && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email.trim()) ? `mailto:${email.trim()}` : null);

/** FR-GEN-01: the design's consult panel (`.consult-panel`), contacts from site-setting. */
export default async function Page() {
  await renderPerRequestWithoutCms();
  const setting = await loadSiteSetting();
  const tel = telHref(setting?.hotline);
  const zalo = safeHref(setting?.zaloUrl);
  const messenger = safeHref(setting?.messengerUrl);
  const mail = mailHref(setting?.email);

  return (
    <div className="shell pb-section pt-6 sm:pt-8">
      <Breadcrumb items={[{ name: 'Liên hệ' }]} className="mb-6" />
      <h1 className="text-[32px] font-bold leading-[1.08] tracking-[-0.05em] text-navy sm:text-[clamp(30px,3.1vw,44px)]">Liên hệ AZway</h1>
      <p className="mt-3 max-w-[640px] text-muted">{INTRO}</p>

      <div className="mt-8 grid overflow-hidden rounded-[28px] bg-navy shadow-card md:grid-cols-[0.82fr_1.18fr]">
        <section aria-labelledby="thong-tin-lien-he" className="relative overflow-hidden p-7 text-white sm:p-[clamp(35px,5vw,70px)]">
          <p className="mb-3 text-kicker font-extrabold text-red-on-navy">NHẬN TƯ VẤN</p>
          <h2 id="thong-tin-lien-he" className="text-[30px] font-bold leading-[1.2] tracking-[-0.03em] sm:text-[clamp(32px,3.4vw,48px)] sm:leading-[1.08]">
            Chưa chọn được tour? Gửi yêu cầu cho AZway
          </h2>
          <dl className="mt-8 grid gap-5">
            <Show when={tel}>
              {(href) => (
                <Row label="Hotline">
                  <ContactLink href={href} event="click_call" className="text-xl font-extrabold hover:underline">
                    {setting?.hotline}
                  </ContactLink>
                </Row>
              )}
            </Show>
            <Show when={mail}>
              {(href) => (
                <Row label="Email">
                  <a href={href} className="font-bold hover:underline">
                    {setting?.email?.trim()}
                  </a>
                </Row>
              )}
            </Show>
            <Show when={setting?.address}>
              {(address) => (
                <Row label="Địa chỉ">
                  <span className="whitespace-pre-line">{address.trim()}</span>
                </Row>
              )}
            </Show>
            <Show when={setting?.responseTimeText}>{(text) => <Row label="Thời gian phản hồi">{text.trim()}</Row>}</Show>
          </dl>
        </section>

        {/* FR-LEAD-11: the general request form, then the quick channels. */}
        <section id="gui-yeu-cau" aria-labelledby="gui-yeu-cau-title" className="bg-white p-5 sm:p-[clamp(30px,4vw,55px)]">
          <h2 id="gui-yeu-cau-title" className="text-card-title font-bold text-navy">
            Gửi yêu cầu tư vấn
          </h2>
          <div className="-mx-5 sm:-mx-7">
            <LeadForm responseTimeText={setting?.responseTimeText} hotline={setting?.hotline} />
          </div>
          <h2 id="kenh-nhanh" className="mt-4 border-t border-line pt-6 text-card-title font-bold text-navy">
            Trao đổi ngay với AZway
          </h2>
          <p className="mt-2 text-label">Gọi hotline hoặc nhắn tin, nhân viên tư vấn sẽ trả lời theo lịch trình và số khách của bạn.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Show when={tel}>{(href) => <Channel href={href} event="click_call" label="Gọi hotline" className="bg-red hover:bg-red-hover" />}</Show>
            <Show when={zalo}>{(href) => <Channel href={href} event="click_zalo" label="Nhắn Zalo" className="bg-zalo" />}</Show>
            <Show when={messenger}>{(href) => <Channel href={href} event="click_messenger" label="Messenger" className="bg-messenger" />}</Show>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-navy-mist">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function Channel({ href, event, label, className }: { href: string; event: 'click_call' | 'click_zalo' | 'click_messenger'; label: string; className: string }) {
  return (
    <ContactLink href={href} event={event} className={`inline-flex min-h-[52px] items-center justify-center rounded-button px-5 font-bold text-white ${className}`}>
      {label}
    </ContactLink>
  );
}
