import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/Breadcrumb';
import { RequestBlock } from '@/components/product/Detail';
import { ProgrammeCard } from '@/components/teambuilding/ProgrammeCard';
import { renderPerRequestWithoutCms } from '@/lib/build';
import { getTeambuildingCatalog } from '@/lib/cms';
import { loadSiteSetting } from '@/lib/site-setting';

// Static + ISR (NFR-03, D4): regenerated when the webhook revalidates `teambuilding`.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Teambuilding, gala dinner cho doanh nghiệp',
  description: 'Chương trình teambuilding và gala dinner theo đội ngũ của bạn: kịch bản trò chơi, MC, đạo cụ và lịch trình cho đoàn. Gửi yêu cầu để AZway tư vấn và báo giá.',
  alternates: { canonical: '/teambuilding' },
};

const STEPS = [
  { title: 'Lắng nghe nhu cầu', text: 'Trao đổi mục tiêu, số người, ngày dự kiến, điểm đến và ngân sách.' },
  { title: 'Đề xuất chương trình', text: 'Xây dựng chủ đề, trò chơi, lịch trình và báo giá theo nhu cầu.' },
  { title: 'Thống nhất dịch vụ', text: 'Chốt hạng mục, trách nhiệm, phương án dự phòng và điều kiện đặt dịch vụ.' },
  { title: 'Cùng nhau trải nghiệm', text: 'Phối hợp với đầu mối doanh nghiệp để điều phối chương trình tại địa điểm.' },
  { title: 'Khép lại hành trình', text: 'Nghiệm thu, tiếp nhận góp ý và bàn giao ảnh, video theo gói đã thống nhất.' },
];

export default async function Page() {
  await renderPerRequestWithoutCms();
  const [programmes, setting] = await Promise.all([getTeambuildingCatalog(), loadSiteSetting()]);

  return (
    <div className="bg-paper pb-section">
      <section className="bg-navy pb-14 pt-6 text-white sm:pb-20">
        <div className="shell">
          <Breadcrumb items={[{ name: 'Teambuilding' }]} className="[&_[aria-current]]:text-white [&_ol]:text-navy-mist" />
          <p className="mb-4 mt-10 text-[13px] font-extrabold tracking-[0.14em] text-red-on-navy">TEAMBUILDING · GALA DINNER · COMPANY TRIP</p>
          <h1 className="max-w-[760px] text-[44px] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-[clamp(44px,4.7vw,68px)]">
            Cùng một đội.
            <span className="block text-red-on-navy">Chung một hành trình.</span>
          </h1>
          <p className="mt-6 max-w-[560px] text-base leading-[1.8] text-navy-mist sm:text-lg">
            Rời bàn làm việc, mở những kết nối mới. Cùng AZway tạo nên chuyến đi mà mỗi thành viên đều có câu chuyện để mang về.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#yeu-cau" className="inline-flex min-h-[52px] items-center rounded-button bg-red px-5 font-bold shadow-red hover:bg-red-hover">
              Lên chương trình cùng AZway
            </a>
            <a href="#chuong-trinh" className="inline-flex min-h-[52px] items-center rounded-button bg-white px-5 font-bold text-navy">
              Xem các chương trình
            </a>
          </div>
        </div>
      </section>

      <section id="chuong-trinh" className="shell scroll-mt-24 pt-14 sm:pt-20">
        <p className="mb-3 text-[13px] font-extrabold tracking-[0.14em] text-red">CHỌN CÁCH ĐI CÙNG NHAU</p>
        <h2 className="max-w-[750px] text-[32px] font-bold leading-[1.1] tracking-[-0.04em] text-navy sm:text-[clamp(32px,3.4vw,48px)]">
          Một đội ngũ. Nhiều cách để gắn kết.
        </h2>
        <p className="mb-9 mt-4 max-w-[560px] text-muted">
          Từ một buổi chơi hết mình đến chuyến đi trọn vẹn. Chọn điểm khởi đầu, AZway cùng bạn xây dựng phần còn lại.
        </p>
        {programmes.length > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {programmes.map((programme, index) => (
                <ProgrammeCard key={programme.documentId} programme={programme} number={index + 1} />
              ))}
            </div>
            <p className="mt-5 text-[13px] text-muted">
              Hạng mục trên là gợi ý để xây dựng chương trình. Phạm vi dịch vụ và báo giá được xác nhận theo số khách, thời gian, địa điểm và yêu cầu của đoàn.
            </p>
          </>
        ) : (
          <p className="text-ink-2">Chương trình đang được cập nhật. Gửi yêu cầu bên dưới để AZway tư vấn chương trình riêng cho đoàn.</p>
        )}
      </section>

      <section className="shell pt-14 sm:pt-20">
        <p className="mb-3 text-[13px] font-extrabold tracking-[0.14em] text-red">ĐI CÙNG AZWAY</p>
        <h2 className="max-w-[750px] text-[32px] font-bold leading-[1.1] tracking-[-0.04em] text-navy sm:text-[clamp(32px,3.4vw,48px)]">
          Từ ý tưởng đầu tiên đến khoảnh khắc cuối cùng.
        </h2>
        <ol className="mt-9 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-t border-line pt-5">
              <span className="text-[37px] font-extrabold tracking-[-0.06em] text-red">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="mb-3 mt-3 text-lg font-bold leading-snug text-navy">{step.title}</h3>
              <p className="text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="shell mt-14 sm:mt-20">
        <RequestBlock setting={setting} subject="chương trình teambuilding" />
      </div>
    </div>
  );
}
