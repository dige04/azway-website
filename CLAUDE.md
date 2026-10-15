# AZway — hướng dẫn cho Claude Code

Website du lịch AZway (Công ty CP AZway Việt Nam): **Strapi 5 (CMS, VPS) + Next.js 16 trên Cloudflare Workers**. Website là kênh **nhận yêu cầu**, không phải hệ thống đặt chỗ — không thêm giỏ hàng, thanh toán, tồn chỗ.

## Đọc trước khi làm

1. `docs/TASKS.md` — làm milestone tiếp theo còn ô `[ ]`, đúng thứ tự, một milestone một PR.
2. `docs/BRD-PRD.md` — yêu cầu có mã (FR-, NFR-, SEO-, AC-). Mọi PR ghi mã yêu cầu nó đáp ứng.
3. `docs/ARCHITECTURE.md` — quyết định D1–D10. Không đi ngược một quyết định mà không sửa file này và giải thích trong PR.

## Cấu trúc

```
apps/cms     @azway/cms   Strapi 5.58.x, TypeScript
apps/web     @azway/web   Next.js 16.4.x + @opennextjs/cloudflare 1.20.x
infra/       Docker Compose, Caddy, backup scripts cho VPS
docs/        spec, kiến trúc, kế hoạch, hướng dẫn
design/      source thiết kế đã duyệt (khi khách giao)
```

pnpm workspace, Node 22. Lệnh từ root: `pnpm dev:cms`, `pnpm dev:web`, `pnpm build:cms`, `pnpm build:web`, `pnpm typecheck`, `pnpm -r test`.

## Quy ước

- **Ngôn ngữ:** code, tên biến, commit message bằng tiếng Anh. Nội dung hiển thị cho người dùng cuối, nhãn trong admin Strapi (`displayName`, `description` của field) và tài liệu cho khách bằng **tiếng Việt có dấu**.
- **URL công khai tiếng Việt không dấu:** `/tour`, `/du-thuyen`, `/teambuilding`, `/diem-den`, `/cam-nang`, `/lien-he`, `/tim-kiem`.
- **TypeScript strict** ở `apps/web`. Không `any` trừ khi có comment lý do.
- **Không thêm dependency nặng** khi vài chục dòng code làm được (xem D6, D7). Mỗi dependency mới ghi lý do trong PR.
- **Không hard-code** số hotline, link Zalo, email nhận lead — luôn đọc từ `site-setting`.
- **Dữ liệu rỗng không render khối** (FR-PRD-05): dùng helper chung, không rải `&&` thủ công khắp nơi.
- **Giá:** số nguyên VND; hiển thị `Intl.NumberFormat('vi-VN')` + "đ/khách"; 0 hoặc null → "Liên hệ báo giá".
- **Bí mật:** không commit `.env`, `.dev.vars`. Cập nhật `.env.example` / `.dev.vars.example` mỗi khi thêm biến.
- **Lead là dữ liệu cá nhân:** không log SĐT/email đầy đủ (mask), không gửi lead đến dịch vụ nào ngoài Strapi DB, Google Sheets và email của AZway (NFR-10).

## Ràng buộc môi trường

- VPS production chỉ có **1 core / 2 GB RAM**. Không build gì trên VPS; Strapi chạy từ image đã build sẵn.
- Next.js chạy trên **Workers runtime**: không dùng API chỉ có ở Node (fs, child_process). Kiểm bằng `pnpm --filter @azway/web preview` trước khi coi là xong.
- Strapi chỉ chạy trên Node/VPS, **không** đưa lên Workers.
- Tài khoản production (Cloudflare, VPS, Google, Resend) **đứng tên AZway**. Không tạo resource production trong tài khoản cá nhân.

## Định nghĩa "xong"

Một milestone xong khi: build + typecheck + test pass; mục "Xong khi" của milestone đã được chạy thật và kết quả dán vào mô tả PR; ô `[ ]` trong `docs/TASKS.md` đã tick trong cùng PR; không còn TODO không có issue đi kèm.

Nếu một yêu cầu trong spec mâu thuẫn, mơ hồ, hoặc cần thông tin từ khách (xem BRD §13): chọn mặc định hợp lý, làm nó cấu hình được, ghi vào mục "Câu hỏi cho khách" trong mô tả PR — không dừng chờ.
