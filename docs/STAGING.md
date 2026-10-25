# Staging demo

Link tạm để khách xem, trên tài khoản Cloudflare cá nhân của người dựng; không phải production, không dùng tài khoản AZway. Web: Worker `azway-web-staging` trên `*.workers.dev` (env `staging` trong `apps/web/wrangler.jsonc`), deploy bằng workflow **Deploy web (staging)**. Strapi + Postgres: một host chạy image `apps/cms/Dockerfile`; ảnh upload nằm trên R2.

Các lệnh `wrangler` dưới đây chạy trong `apps/web` (`pnpm exec wrangler …`), sau khi `pnpm exec wrangler login` bằng tài khoản cá nhân.

## 1. Chuẩn bị một lần trên Cloudflare

1. Mở **Workers & Pages** một lần và chọn subdomain `workers.dev` (tài khoản mới chưa có thì deploy lỗi). URL web sẽ là `https://azway-web-staging.<subdomain>.workers.dev`.
2. Bật R2 (dashboard có thể đòi thêm phương thức thanh toán; trong mức miễn phí 10 GB/tháng không bị tính tiền).
3. Tạo tài nguyên. Deploy tìm hai cái đầu theo tên, nên không có id nào phải chép vào repo:

   ```sh
   pnpm exec wrangler r2 bucket create azway-web-staging-cache            # cache trang (ISR)
   pnpm exec wrangler d1 create azway-web-staging-tag-cache --location apac # mốc revalidate theo tag
   pnpm exec wrangler r2 bucket create azway-cms-staging-uploads           # ảnh Strapi upload
   pnpm exec wrangler r2 bucket dev-url enable azway-cms-staging-uploads   # in ra https://pub-….r2.dev
   ```

   Miễn phí: R2 10 GB, D1 5 GB và 100.000 dòng ghi/ngày, đủ cho demo.
4. API token cho GitHub (**My Profile → API Tokens → Create Token**): mẫu "Edit Cloudflare Workers", thêm quyền **Account · D1 · Edit**, chỉ chọn tài khoản này.
5. Khoá R2 cho Strapi (**R2 → Manage API tokens**): quyền Object Read & Write, chỉ bucket `azway-cms-staging-uploads`.

Hai cache trên là để sửa trong CMS thì web đổi ngay: trang nằm trong R2, Strapi gọi webhook `/api/revalidate`, mốc thời gian của tag ghi vào D1, lần xem kế tiếp render lại với dữ liệu mới. Khi Strapi đang ngủ, trang đã cache vẫn mở được.

Ảnh: env `staging` không có binding Cloudflare Images, nên `/_next/image` trả ảnh gốc, không resize hay đổi sang AVIF/WebP. Muốn bật thì thêm `"images": { "binding": "IMAGES" }` vào `env.staging` trong `wrangler.jsonc` (gói Free có 5.000 lượt biến đổi ảnh/tháng).

## 2. Biến cần đặt

| Biến | Đặt ở đâu | Giá trị |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | GitHub secret | Token ở bước 1.4 |
| `LEAD_INGEST_TOKEN` | GitHub secret **và** env Strapi | Cùng một chuỗi ngẫu nhiên ≥ 32 ký tự |
| `REVALIDATE_SECRET` | GitHub secret **và** env Strapi | Cùng một chuỗi ngẫu nhiên |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub variable | Account ID (trang tổng quan Workers & Pages) |
| `CMS_URL` | GitHub variable | URL Strapi, ví dụ `https://<cms-host>` |
| `CMS_MEDIA_URL` | GitHub variable **và** `R2_PUBLIC_URL` của Strapi | URL `pub-….r2.dev` ở bước 1.3 |
| `NEXT_PUBLIC_SITE_URL` | GitHub variable | `https://azway-web-staging.<subdomain>.workers.dev` |
| `WEB_REVALIDATE_URL` | env Strapi | `NEXT_PUBLIC_SITE_URL` + `/api/revalidate` |

GitHub: **Settings → Secrets and variables → Actions**, tab *Secrets* hoặc *Variables*. Env Strapi: theo `apps/cms/.env.example`. Ngoài các biến trên còn có các secret Strapi, `DATABASE_CLIENT=postgres` + `DATABASE_URL` (+ `DATABASE_SSL=true` nếu host yêu cầu), `R2_*` với khoá ở bước 1.5, `PUBLIC_URL` = `CMS_URL`, `ADMIN_PATH`, `CRON_ENABLED=false`.

Mỗi secret sinh bằng `openssl rand -base64 32`. Không gửi giá trị thật qua chat hay commit vào repo.

## 3. Thứ tự bật

1. **Strapi.** Image build từ thư mục gốc repo: Dockerfile `apps/cms/Dockerfile`, build arg `ADMIN_PATH` (bake vào trang admin; đặt cùng giá trị cho env `ADMIN_PATH`). Image nghe ở `$PORT` mà host cấp, health check `/_health`. Đặt env theo mục 2, tạm để trống `WEB_REVALIDATE_URL`. Khi chạy xong, lấy URL của nó làm `CMS_URL`.
2. **Tài khoản admin.** Vào ngay `CMS_URL` + `ADMIN_PATH` để tạo admin đầu tiên: ai mở trang này trước thì người đó tạo được.
3. **Seed** (mục 4).
4. **GitHub.** Đặt đủ secret và variable ở mục 2, rồi **Actions → Deploy web (staging) → Run workflow** trên `main`. Thiếu biến nào thì run vẫn xanh, có dòng *Staging deploy skipped* kèm tên các biến còn thiếu, và không deploy gì. Sau lần này, mỗi lần push `main` có đổi `apps/web/**` thì tự deploy lại.
5. **Webhook.** Trên Strapi đặt `WEB_REVALIDATE_URL` và `REVALIDATE_SECRET`, rồi khởi động lại.
6. **Kiểm.** Sửa tên một tour trong admin và publish, tải lại trang tour trên web: tên mới hiện ra. Gửi thử form tư vấn: lead xuất hiện trong admin.

Gói Workers Free giới hạn 10 ms CPU cho mỗi request và 100.000 request/ngày. Nếu trang báo lỗi 1102 (*Worker exceeded CPU time limit*, xem **Workers → azway-web-staging → Observability**), nâng lên Workers Paid trong thời gian demo.

## 4. Seed dữ liệu mẫu

Chạy từ máy mình, ghi thẳng vào DB staging:

1. Chép env của Strapi staging vào `apps/cms/.env` (cùng secret, `DATABASE_URL` là URL kết nối từ ngoài của Postgres, cùng `R2_*`).
2. Từ thư mục gốc repo, với thư mục ảnh của bản bàn giao (`apps/cms/README.md`):

   ```sh
   SEED_ALLOW_REMOTE=1 SEED_SKIP_UNVERIFIED_MEDIA=1 SEED_ASSETS_DIR=<thư mục ảnh> pnpm --filter @azway/cms seed
   ```

3. Xoá `apps/cms/.env` hoặc đưa nó về giá trị local.

Seed chạy trước lần deploy web đầu tiên, nên bản build đã có dữ liệu. Seed lại sau đó thì web nhận dữ liệu mới qua webhook, hoặc chậm nhất sau 1 giờ.

## 5. Xoá sau demo

1. GitHub: xoá các secret và variable ở mục 2. Từ đó workflow chỉ báo *skipped*.
2. Cloudflare:

   ```sh
   pnpm exec wrangler delete --env staging
   pnpm exec wrangler d1 delete azway-web-staging-tag-cache
   pnpm exec wrangler r2 bucket delete azway-web-staging-cache
   pnpm exec wrangler r2 bucket delete azway-cms-staging-uploads
   ```

   Bucket còn object thì không xoá được: xoá object trên dashboard, hoặc đặt `pnpm exec wrangler r2 bucket lifecycle add <bucket> expire-all --expire-days 1` rồi hôm sau xoá bucket.
3. Xoá API token ở bước 1.4 và khoá R2 ở bước 1.5.
4. Host Strapi: xoá service Strapi và database Postgres.
