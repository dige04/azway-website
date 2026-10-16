# Kế hoạch triển khai cho Claude Code

Mỗi milestone = **một nhánh + một PR**, làm theo thứ tự. Một milestone chỉ xong khi mọi ô "Xong khi" đều đúng và đã chạy lệnh kiểm tra tương ứng. Cập nhật ô `[ ]` → `[x]` trong file này ngay trong PR của milestone đó.

Ký hiệu truy vết (FR-, NFR-, SEO-, AC-) trỏ về [BRD-PRD.md](./BRD-PRD.md).

---

## M1 — Khung monorepo + Strapi chạy được

Nhánh: `m1/cms-scaffold`

- [x] Tạo `apps/cms` bằng Strapi **5.58.x**, TypeScript, không dùng example data. Package name `@azway/cms`.
- [x] `config/database.ts`: `sqlite` mặc định (file `.tmp/data.db`), `postgres` khi `DATABASE_CLIENT=postgres` (hỗ trợ `DATABASE_URL`).
- [x] `config/plugins.ts`: upload provider `aws-s3` trỏ R2 **chỉ khi** có đủ biến `R2_*`; ngược lại dùng local.
- [x] `config/middlewares.ts`: CSP cho phép ảnh từ `R2_PUBLIC_URL`; CORS theo `CORS_ORIGINS`.
- [x] `config/admin.ts`: đường dẫn admin lấy từ `ADMIN_PATH` (mặc định `/admin`) — NFR-07.
- [x] `.env.example` đầy đủ theo ARCHITECTURE.md.
- [x] Script root `pnpm dev:cms` chạy được.

**Xong khi:** `pnpm --filter @azway/cms build` thành công; `develop` khởi động trên sqlite, tạo được admin đầu tiên, `/_health` trả 204 (route có sẵn của Strapi 5, không body).

---

## M2 — Content-types và components (BRD §7)

Nhánh: `m2/content-model`

- [x] Components: `shared.seo`, `shared.text-item`, `tour.itinerary-day` (lồng `tour.milestone`), `tour.milestone` (giờ regex `^\d{2}:\d{2}$`), `tour.cancellation-rule` (feePercent 0–100), `cruise.option`, `teambuilding.game`, `home.hero-slide`.
- [x] Collection types (draft & publish, i18n bật): `tour`, `cruise`, `teambuilding`, `destination`, `article`, `article-category`, `feedback`.
- [x] `tour.category` enum: `noi_dia`, `trung_quoc`, `quoc_te`, `trai_nghiem_hoc_tap`. `tour.code` unique. Trường số, mã, giá, ảnh đặt `i18n.localized: false`.
- [x] `destination.region` enum: `mien_bac`, `mien_trung`, `mien_nam`, `trung_quoc`, `quoc_te`.
- [x] Quan hệ đúng bảng §7.1 (tour↔destination n-n, article↔tour n-n, article↔cruise n-n, teambuilding↔tour n-n, feedback→tour n-1).
- [x] Collection không D&P, không i18n: `redirect` (`from` unique, `to`, `statusCode` 301/302), `lead` (đủ trường §7.1 + `sheetsStatus` enum `pending|synced|failed|skipped`, `sheetsAttempts`, `sheetsError`, `notifiedAt`, `ipHash`).
- [x] Single types (i18n): `site-setting` (hotline, zaloUrl, messengerUrl, facebookUrl, youtubeUrl, tiktokUrl, email, address, `leadNotifyEmails`, `responseTimeText`, `defaultSeo`), `homepage` (heroSlides, featuredTours, featuredCruises, featuredArticles).
- [x] Bootstrap: tạo locale `vi` và đặt mặc định; cấp quyền **Public** `find`/`findOne` cho mọi type công khai (KHÔNG cho `lead`); tạo role "Editor" (FR-CMS-08).
- [x] Document middleware: `article.readingMinutes` tự tính (200 từ/phút) khi create/update.

**Xong khi:** build pass; mở admin thấy đủ type; tạo được một tour có 2 ngày × 3 mốc, kéo thả mốc được (AC-04 phần CMS); `GET /api/tours?populate=*` trả tour đã publish, không trả bản nháp (AC-05).

---

## M3 — Lead pipeline + revalidate webhook

Nhánh: `m3/lead-pipeline`

- [x] Route `POST /api/leads/submit`, `auth: false`, policy kiểm `X-Lead-Token === LEAD_INGEST_TOKEN` (so sánh timing-safe).
- [x] Service `lead.submit`: validate lại phía server, chuẩn hoá SĐT, lưu `pending`, trả `{ id }`, rồi `setImmediate` chạy notify + sync.
- [x] `src/services/google-sheets.ts`: JWT RS256 bằng `node:crypto`, cache access token tới khi hết hạn, `values:append` với `valueInputOption=USER_ENTERED`. Cột theo ARCHITECTURE.md.
- [x] Retry 3 lần (1s, 3s, 9s). Thiếu cấu hình Google → `skipped`. Thất bại → `failed` + email `ALERT_EMAILS`.
- [x] `src/services/mailer.ts`: Resend qua `fetch`; người nhận = `site-setting.leadNotifyEmails`, fallback env.
- [x] Cron (`config/cron-tasks.ts`) mỗi 10 phút đồng bộ lại lead `failed` / `pending` > 5 phút, tối đa 10 lần thử.
- [x] Document middleware: publish / unpublish / delete (và update với type không D&P như `redirect`, `site-setting`) → `POST WEB_REVALIDATE_URL` body `{ tags: [<uid ngắn>, "<uid>:<slug>"] }` header `x-revalidate-secret`. Lỗi webhook chỉ log, không chặn thao tác.
- [x] Unit test (vitest) cho: ký JWT, chuẩn hoá SĐT, logic retry/trạng thái (mock `fetch`).

**Xong khi:** test pass; `curl` không token → 401; có token → 201 và lead xuất hiện trong admin; mock Sheets lỗi → `failed` + log email cảnh báo (AC-10, AC-11 ở mức unit/integration).

---

## M4 — Next.js trên Cloudflare Workers: khung + data layer

Nhánh: `m4/web-scaffold`

- [x] `apps/web`: Next.js **16.4.x**, App Router, TypeScript strict, `@opennextjs/cloudflare` **1.20.x**, wrangler 4. Package `@azway/web`.
- [x] `wrangler.jsonc` + `open-next.config.ts`; scripts `dev`, `build` (`next build`), `build:worker` (`opennextjs-cloudflare build`), `preview` (`opennextjs-cloudflare build && preview`), `deploy`.
- [x] Styling: Tailwind CSS 4, design tokens trong `src/styles/tokens.css` (navy–đỏ từ thiết kế đã duyệt, nguồn trong `design/`).
- [x] `src/lib/cms.ts`: client REST có kiểu (types sinh tay từ schema M2), `fetch` với `next: { tags, revalidate: 3600 }`, hàm `getTours(filters)`, `getTourBySlug`, `getCruises`, …, `getSiteSetting`, `getRedirect(path)`.
- [x] `src/lib/media.ts`: chuẩn hoá URL ảnh; `next.config` `images.remotePatterns` theo `CMS_MEDIA_URL`; loader phù hợp Workers (loader mặc định của Next, `/_next/image` chạy qua binding Cloudflare Images).
- [x] `app/api/revalidate/route.ts`: kiểm secret, `revalidateTag` từng tag.
- [x] Seed script `apps/cms/scripts/seed.mjs`: 10 tour (đủ loại, có 1 tour "trải nghiệm học tập" dựa trên lịch trình Hà Nội – Bạch Đằng Giang – Hạ Long 2N1Đ), 3 du thuyền, 2 teambuilding, 5 điểm đến, 5 bài viết, cấu hình chung. Dữ liệu là mẫu, ghi rõ trong README. (`pnpm --filter @azway/cms seed`, xem `apps/cms/README.md`.)

**Xong khi:** `pnpm --filter @azway/web build` và `preview` chạy local đọc được dữ liệu seed từ Strapi local.

---

## M5 — Trang và component (FR-PRD, FR-SRC, FR-BLG, FR-GEN)

Nhánh: `m5/pages`

- [x] Layout: header, menu mobile, footer, breadcrumb, **contact dock** (gọi, Zalo, Messenger; bắn sự kiện AN-03).
- [x] `/` trang chủ: hero carousel, sản phẩm nổi bật, điểm đến, feedback, bài mới.
- [ ] `/tour`, `/du-thuyen`, `/teambuilding`, `/diem-den`, `/cam-nang` (+ `/cam-nang/danh-muc/[slug]`) danh sách; `/tour/[slug]` … chi tiết.
- [x] Bộ lọc tour: loại, khu vực (qua điểm đến), cửa khẩu, thời lượng, quy mô đoàn; sắp xếp giá/thời lượng; tìm tên/mã; **state trên URL**; trạng thái rỗng FR-SRC-05; sự kiện AN-04.
- [x] Chi tiết tour: gallery + lightbox, điểm nổi bật, **lịch trình theo ngày/mốc giờ**, bao gồm / không bao gồm, hoàn huỷ, FOC, quy mô, giá (FR-PRD-03), sản phẩm liên quan (FR-PRD-06), bài liên quan.
- [x] Mọi khối có dữ liệu rỗng thì không render (FR-PRD-05) — viết helper chung, có test.
- [x] Bài viết: mục lục tự sinh từ heading, thời gian đọc, khối sản phẩm liên quan.
- [ ] `/lien-he`, `/tim-kiem`, `not-found` (ô tìm + sản phẩm nổi bật, SEO-08).
- [ ] Render rich text bằng `@strapi/blocks-react-renderer`.

**Xong khi:** mọi route render với dữ liệu seed; Playwright smoke test mở từng route ở 375px và 1440px không lỗi console; lighthouse local mobile ≥ 75 cho `/` và một trang tour.

---

## M6 — Form lead phía web

Nhánh: `m6/lead-form`

- [ ] Component `LeadForm` dùng trên chi tiết sản phẩm (gắn `productType/code/name`) và `/lien-he`.
- [ ] Trường theo FR-LEAD-01; validate client + server (zod dùng chung).
- [ ] Cookie `az_utm` + `az_landing` ghi lần vào đầu (30 ngày) từ query UTM.
- [ ] `app/api/lead/route.ts`: honeypot, rate limit 5/10 phút/IP (binding Rate Limiting nếu có, fallback in-memory), gọi Strapi với `X-Lead-Token`, map lỗi thân thiện.
- [ ] Màn hình xác nhận dùng `site-setting.responseTimeText`, nói rõ đây là ghi nhận yêu cầu (FR-LEAD-09). Sự kiện `lead_submit` (AN-02).

**Xong khi:** Playwright gửi form với UTM → lead trong Strapi có đủ mã SP, trang nguồn, UTM, thiết bị (AC-13); gửi 6 lần liên tiếp → lần 6 bị chặn; honeypot có giá trị → 200 giả nhưng không tạo lead.

---

## M7 — SEO + redirect + analytics

Nhánh: `m7/seo`

- [ ] `generateMetadata` mọi trang: title/description/canonical từ component SEO, fallback sinh từ nội dung (SEO-02); OG/Twitter (SEO-05).
- [ ] `app/sitemap.ts` (phân trang nếu > 1000 URL), `app/robots.ts` (SEO-03).
- [ ] JSON-LD: TravelAgency (layout), BreadcrumbList, Article, TouristTrip (SEO-04).
- [ ] Trang có query lọc → canonical về URL gốc + `robots: noindex, follow` (SEO-06).
- [ ] Redirect theo ARCHITECTURE D8: `app/[...legacy]/page.tsx` + nhánh notFound của trang chi tiết gọi `getRedirect(pathname)` → `permanentRedirect` (301) / `redirect` (302).
- [ ] Script `apps/cms/scripts/import-redirects.mjs` nhập CSV `from,to,statusCode`.
- [ ] GA4 tải sau tương tác/idle, helper `track(event, params)`.
- [ ] Security headers (NFR-08) qua `next.config` `headers()`.

**Xong khi:** test kiểm `/sitemap.xml` chứa slug seed; URL cũ mẫu trả 301 đúng đích (AC-16); Rich Results Test không lỗi với 1 tour + 1 bài (ghi lại kết quả trong PR).

---

## M8 — Hạ tầng, CI/CD, sao lưu

Nhánh: `m8/infra`

- [ ] `apps/cms/Dockerfile` multi-stage (node 22-alpine), chạy non-root. `ADMIN_PATH` truyền vào làm build-arg cho `strapi build` (nó được bake vào bundle admin); kiểm image trả 200 ở `/<ADMIN_PATH>`.
- [ ] `infra/docker-compose.yml`: `strapi`, `postgres:16-alpine` (volume), `caddy` (TLS tự động cho `CMS_DOMAIN`); healthcheck; `restart: unless-stopped`; giới hạn RAM Strapi ~1.2 GB.
- [ ] `infra/backup.sh` + systemd timer/cron: `pg_dump | gzip` → R2 qua `rclone` hoặc `aws s3 --endpoint-url`, giữ 7 bản; `infra/restore.md` có lệnh khôi phục đã thử (NFR-09).
- [ ] `infra/bootstrap-vps.md`: tạo swap 2 GB, cài Docker, firewall 22/80/443, user deploy.
- [x] `.github/workflows/ci.yml`: install, typecheck, test, build cả hai app trên PR (build `apps/cms` và bundle Workers của `apps/web`).
- [ ] `.github/workflows/deploy-web.yml`: tạo R2 bucket + D1 cache theo `apps/web/wrangler.jsonc` (điền `database_id`), bật Cloudflare Images cho binding `IMAGES`, đặt `CMS_URL`/`CMS_MEDIA_URL`/`NEXT_PUBLIC_SITE_URL` khi build; thêm `vars` `CMS_URL`/`CMS_MEDIA_URL` giá trị thật vào `wrangler.jsonc` (không để rỗng). Trên push `main` đổi `apps/web/**` → `opennextjs-cloudflare build` + `wrangler deploy` (secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). Preview deploy cho PR (tên worker `azway-web-pr-<n>`), dọn khi đóng PR.
- [ ] `.github/workflows/deploy-cms.yml`: build image → GHCR → SSH vào VPS `docker compose pull strapi && docker compose up -d` (secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`).

**Xong khi:** CI xanh trên PR; `docker compose up` chạy local với Postgres và seed; tài liệu đủ để người khác dựng lại VPS từ đầu.

---

## M9 — Ghép thiết kế đã duyệt

Nhánh: `m9/design`

Bị chặn cho đến khi có source thiết kế (HTML/CSS/ảnh) trong `design/` ở root repo.

- [ ] Chuyển token màu, font, spacing, radius từ source vào `tokens.css`.
- [ ] Đối chiếu từng trang với thiết kế ở 6 độ phân giải NFR-04; giữ animation chính.
- [ ] Ảnh chụp so sánh trước/sau đính kèm PR.

**Xong khi:** AC-01, AC-02 đạt khi tự kiểm; lighthouse vẫn ≥ 75 mobile.

---

## M10 — Tài liệu bàn giao

Nhánh: `m10/handover`

- [ ] `README.md` root: kiến trúc 1 trang, chạy local, deploy, biến môi trường, sao lưu/khôi phục (NFR-12).
- [ ] `docs/HUONG-DAN-BIEN-TAP.md` tiếng Việt cho biên tập viên: thêm tour, lịch trình, ảnh, SEO, chuyển hướng, cấu hình chung.
- [ ] `docs/CHECKLIST-NGHIEM-THU.md`: 20 tiêu chí AC kèm cách kiểm và ô kết quả.
