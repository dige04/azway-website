# Staging demo

Link tạm để khách xem, trên tài khoản cá nhân của người dựng; không phải production, không dùng tài khoản AZway.

- Web: Worker `azway-web-staging` trên `*.workers.dev` (env `staging` trong `apps/web/wrangler.jsonc`), deploy bằng workflow **Deploy web (staging)**.
- Strapi: web service miễn phí trên Render, build từ `apps/cms/Dockerfile` theo Blueprint `render.yaml`, cùng Render Postgres miễn phí. Ảnh upload nằm trên R2.
- Chi phí: $0, với các giới hạn ở mục 6.

Chỉ để demo với dữ liệu mẫu: không nhập dữ liệu khách thật (NFR-10: dữ liệu khách chỉ nằm trong hệ thống của AZway), và nói rõ điều này với khách. Web không được index: workflow build với `SITE_NOINDEX=1`.

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

   Ảnh được phục vụ công khai qua URL `pub-….r2.dev`: miễn phí, có giới hạn tốc độ, đủ cho demo. Production nên gắn tên miền riêng. Miễn phí: R2 10 GB, D1 5 GB và 100.000 dòng ghi/ngày.
4. API token cho GitHub (**My Profile → API Tokens → Create Token**): mẫu "Edit Cloudflare Workers", thêm quyền **Account · D1 · Edit**, chỉ chọn tài khoản này.
5. Khoá R2 cho Strapi (**R2 → Manage API tokens**): quyền Object Read & Write, chỉ bucket `azway-cms-staging-uploads`. Ghi lại Access Key ID và Secret Access Key.

Hai cache trên là để sửa trong CMS thì web đổi ngay: trang nằm trong R2, Strapi gọi webhook `/api/revalidate`, mốc thời gian của tag ghi vào D1, lần xem kế tiếp render lại với dữ liệu mới. Khi Strapi đang ngủ, trang đã cache vẫn mở được.

Ảnh: env `staging` không có binding Cloudflare Images, nên `/_next/image` trả ảnh gốc, không resize hay đổi sang AVIF/WebP. Muốn bật thì thêm `"images": { "binding": "IMAGES" }` vào `env.staging` trong `wrangler.jsonc` (gói Free có 5.000 lượt biến đổi ảnh/tháng).

## 2. Biến cần đặt

Sinh `LEAD_INGEST_TOKEN` và `REVALIDATE_SECRET` một lần (`openssl rand -base64 32` cho mỗi cái) và dùng cùng giá trị ở cả hai nơi. Không gửi giá trị thật qua chat hay commit vào repo.

**Render** hỏi các biến `sync: false` trong `render.yaml` khi tạo Blueprint. Secret riêng của Strapi (`APP_KEYS`, `*_SALT`, `*_SECRET`, `ENCRYPTION_KEY`) do Render tự sinh, `DATABASE_URL` tự nối với Postgres.

| Biến | Giá trị |
| --- | --- |
| `ADMIN_PATH` | Đường dẫn admin riêng, ví dụ `/quan-tri-<chuỗi ngẫu nhiên>`. Không được là `/admin`, không có `/` ở cuối |
| `R2_ACCOUNT_ID` | Account ID Cloudflare |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Khoá ở bước 1.5 |
| `R2_PUBLIC_URL` | URL `pub-….r2.dev` ở bước 1.3 |
| `LEAD_INGEST_TOKEN`, `REVALIDATE_SECRET` | Như trên |
| `WEB_REVALIDATE_URL` | Để trống lúc tạo; điền ở mục 3 bước 6 |

**GitHub**: **Settings → Environments → New environment** tên `staging`. Ở *Deployment branches and tags* chọn *Selected branches and tags* và thêm `main`, để chỉ `main` nhận được token. Secret và variable đặt trong môi trường này, không đặt ở cấp repo.

| Biến | Loại | Giá trị |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | secret | Token ở bước 1.4 |
| `LEAD_INGEST_TOKEN`, `REVALIDATE_SECRET` | secret | Như trên |
| `CLOUDFLARE_ACCOUNT_ID` | variable | Account ID Cloudflare |
| `CMS_URL` | variable | URL service Render, dạng `https://azway-cms-staging….onrender.com` |
| `CMS_MEDIA_URL` | variable | Giống `R2_PUBLIC_URL` |
| `NEXT_PUBLIC_SITE_URL` | variable | `https://azway-web-staging.<subdomain>.workers.dev` |

## 3. Thứ tự bật

1. **Strapi.** Trên Render: **New → Blueprint**, chọn repo này, điền các biến ở mục 2. Render tạo service `azway-cms-staging` và database `azway-cms-staging-db` (region Singapore), build image (vài phút), rồi chạy health check `/_health`. Lấy URL của service làm `CMS_URL`.
2. **Tài khoản admin.** Vào ngay `CMS_URL` + `ADMIN_PATH` để tạo admin đầu tiên: ai mở trang này trước thì người đó tạo được.
3. **Kiểm giới hạn đăng nhập.** Strapi chặn sau 5 lần đăng nhập trong 5 phút, đếm theo email và IP. Render nối thêm vào `X-Forwarded-For` mà client gửi lên, còn `True-Client-IP` thì edge Cloudflare của Render ghi đè bằng IP thật, nên `render.yaml` cho Strapi đọc `True-Client-IP`. Chạy lệnh dưới đây từ máy mình (email không tồn tại, chỉ email đó bị khoá 5 phút):

   ```sh
   for i in 1 2 3 4 5 6; do curl -sS -o /dev/null -w '%{http_code} ' \
     -H "X-Forwarded-For: 198.51.100.$i" -H "True-Client-IP: 198.51.100.$i" -H 'Content-Type: application/json' \
     -d '{"email":"khong-ton-tai@example.com","password":"sai-mat-khau-1A"}' "$CMS_URL/admin/login"; done; echo
   ```

   Phải ra `400 400 400 400 400 429`. Nếu lần 6 không phải `429`, IP giả đã lọt qua. Khi đó xoá biến `SERVER_PROXY_IP_HEADER` trên Render: Strapi sẽ đếm theo IP của proxy Render, mọi người dùng chung một giới hạn (chặt hơn nhưng không vượt được).
4. **Seed** (mục 4).
5. **GitHub.** Đặt đủ secret và variable ở mục 2, rồi **Actions → Deploy web (staging) → Run workflow** trên `main`.
   - Workflow chờ Strapi thức dậy (tối đa 5 phút) rồi mới build.
   - Thiếu biến nào thì run vẫn xanh, có dòng *Staging deploy skipped* kèm tên các biến còn thiếu, và không deploy gì.
   - Chạy từ nhánh khác `main` thì mọi job bị bỏ qua.
   - Sau lần này, mỗi lần push `main` có đổi `apps/web/**` hoặc lockfile thì tự deploy lại.

   Lần deploy đầu là lần đầu ba việc sau chạy thật (CI chỉ dry-run): nạp cache R2, tìm D1 theo tên, gửi secret. Nên xem:
   - Log bước *Deploy* phải có `Successfully populated cache with … entries` (R2) và `Successfully created D1 table`, cuối log là URL `workers.dev`.
   - Bước *Site answers, not indexable* in ra `200 noindex, nofollow`.
   - **Workers → azway-web-staging → Settings → Variables and Secrets** có `CMS_URL` (dạng text), `LEAD_INGEST_TOKEN` và `REVALIDATE_SECRET` (dạng secret).
   - Lỗi `Couldn't find a D1 DB named …`: chưa chạy bước 1.3, hoặc gõ sai tên.
   - Lỗi quyền (403, `Authentication error`): token thiếu quyền ở bước 1.4.
6. **Webhook.** Trên Render, ở **azway-cms-staging → Environment**, đặt `WEB_REVALIDATE_URL` = `NEXT_PUBLIC_SITE_URL` + `/api/revalidate`, rồi lưu (Render tự deploy lại).
7. **Kiểm.** Sửa tên một tour trong admin và publish, tải lại trang tour trên web: tên mới hiện ra. Ảnh tour mở từ `pub-….r2.dev`. Gửi thử form tư vấn với dữ liệu giả: lead xuất hiện trong admin.

## 4. Seed dữ liệu mẫu

Chạy từ máy mình, ghi thẳng vào Postgres trên Render. Không dùng job của Render vì gói miễn phí không có one-off job hay shell; image cũng chỉ chứa `dist/`, nên không chạy được lệnh CLI của Strapi. Ảnh seed được upload qua provider R2, không nằm trên đĩa container.

1. Cất `apps/cms/.env` đang dùng cho local (ví dụ đổi tên thành `.env.local-backup`).
2. Tạo `apps/cms/.env` mới:
   - `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`, `LEAD_INGEST_TOKEN`: mỗi biến một giá trị `openssl rand -base64 32` bất kỳ. Seed không cần trùng với Render.
   - `DATABASE_CLIENT=postgres`, `DATABASE_URL` = **External Database URL** ở trang Info của database trên Render, `DATABASE_SSL=true`.
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=azway-cms-staging-uploads`, `R2_PUBLIC_URL`: giống trên Render.
3. Từ thư mục gốc repo, với thư mục ảnh của bản bàn giao (`apps/cms/README.md`):

   ```sh
   SEED_ALLOW_REMOTE=1 SEED_SKIP_UNVERIFIED_MEDIA=1 SEED_ASSETS_DIR=<thư mục ảnh> pnpm --filter @azway/cms seed
   ```

   Lỗi chứng chỉ (`self-signed certificate`) thì thêm `DATABASE_SSL_REJECT_UNAUTHORIZED=false`: kết nối vẫn mã hoá, chỉ không kiểm chứng chỉ (Render chỉ công bố `sslmode=require` cho kết nối từ ngoài). Nếu URL có đuôi `?sslmode=…` thì bỏ đuôi đó đi.
4. Trả `apps/cms/.env` local về chỗ cũ.

Seed chạy trước lần deploy web đầu tiên, nên bản build đã có dữ liệu. Seed lại sau đó thì web nhận dữ liệu mới chậm nhất sau 1 giờ (seed từ máy mình không gọi webhook vì `WEB_REVALIDATE_URL` trống), hoặc ngay khi chạy lại workflow.

## 5. Quên mật khẩu admin

Image không chạy được lệnh CLI của Strapi, nên đặt lại mật khẩu từ máy mình với `apps/cms/.env` như mục 4:

```sh
pnpm --filter @azway/cms strapi admin:reset-user-password --email=<email admin> --password=<mật khẩu mới>
```

## 6. Giới hạn gói miễn phí

- **Strapi ngủ.** Service miễn phí ngủ sau 15 phút không có request, lần gọi đầu mất khoảng 1 phút để thức.
  - Trang đã cache trên web vẫn mở ngay, nhưng trang chưa cache và mọi thao tác trong admin phải chờ Strapi.
  - Trước buổi demo vài phút, mở `CMS_URL/_health` (hoặc trang admin) và chờ trả về. Worker không ngủ, chỉ cần mở trang chủ web một lần.
  - Trong buổi demo, thao tác trong admin giữ cho nó thức.
  - Mỗi tháng có 750 giờ miễn phí, đủ cho một service chạy liên tục.
- **Bộ nhớ.** Service có 512 MB. Build chạy trên máy build của Render, không bị giới hạn này. Job `cms-image` của CI chạy image với giới hạn 512 MB, trên Postgres.
- **Postgres hết hạn.** Database miễn phí hết hạn 30 ngày sau khi tạo. Sau đó còn 14 ngày để nâng gói, quá hạn Render xoá database. Mỗi workspace chỉ có một database miễn phí. Demo kéo dài hơn thì chọn một trong hai:
  - Nâng database lên gói trả phí: giữ nguyên dữ liệu.
  - Làm lại từ đầu: xoá database cũ trên Render, mở Blueprint và chọn **Manual sync** để tạo database mới cùng tên. Render nối lại `DATABASE_URL` và deploy lại Strapi. Sau đó làm lại mục 3 bước 2 (admin) và mục 4 (seed), rồi chạy lại workflow web. Mọi sửa đổi trong CMS sẽ mất; ảnh cũ còn trên R2 nhưng seed upload bản mới.
- **Workers Free.** Giới hạn 10 ms CPU cho mỗi request và 100.000 request/ngày. Nếu trang báo lỗi 1102 (*Worker exceeded CPU time limit*, xem **Workers → azway-web-staging → Observability**), nâng lên Workers Paid trong thời gian demo.

## 7. Xoá sau demo

1. GitHub: xoá môi trường `staging` (cả secret và variable của nó đi theo). Từ đó workflow chỉ báo *skipped*.
2. Render: xoá Blueprint, service `azway-cms-staging` và database `azway-cms-staging-db`.
3. Cloudflare:

   ```sh
   pnpm exec wrangler delete --env staging
   pnpm exec wrangler d1 delete azway-web-staging-tag-cache
   pnpm exec wrangler r2 bucket delete azway-web-staging-cache
   pnpm exec wrangler r2 bucket delete azway-cms-staging-uploads
   ```

   Bucket còn object thì không xoá được: xoá object trên dashboard, hoặc đặt `pnpm exec wrangler r2 bucket lifecycle add <bucket> expire-all --expire-days 1` rồi hôm sau xoá bucket.
4. Xoá API token ở bước 1.4 và khoá R2 ở bước 1.5.
