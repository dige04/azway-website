# @azway/cms

Strapi 5. Chạy local: `cp .env.example .env` (điền secret), `pnpm dev:cms` ở thư mục gốc repo.

## Dữ liệu mẫu (seed)

> **Đây là DỮ LIỆU MẪU** để dựng và kiểm giao diện, không phải nội dung chính thức của AZway. Không đưa lên production. Nếu đưa lên staging cho khách xem, chạy với `SEED_SKIP_UNVERIFIED_MEDIA=1`.

```sh
pnpm --filter @azway/cms seed    # Node 22, cùng DB và .env với dev:cms/start
```

Seed tự nạp Strapi trong tiến trình của nó (không cần bật `dev:cms` trước) và ghi qua Document Service, không gọi REST. Chạy lại bao nhiêu lần cũng không nhân đôi (`tests/seed.integration.test.ts` kiểm):

- Entry khớp theo `code` (tour), `slug`, `groupName` (feedback), `from` (redirect). Entry đã có thì bị ghi đè bằng giá trị mẫu. Entry khác không bị đụng tới.
- Cấu hình chung và Trang chủ chỉ được tạo khi chưa có, không bao giờ bị ghi đè (giữ `leadNotifyEmails` thật).
- Ảnh khớp theo tên file, chỉ upload một lần.

Seed từ chối chạy khi `NODE_ENV=production`, `DATABASE_CLIENT` không phải `sqlite`, hoặc có biến `R2_*` nào khác rỗng (đọc cả `.env`). Chỉ khi chắc chắn muốn nạp dữ liệu mẫu vào đó (ví dụ staging cho khách xem) mới đặt `SEED_ALLOW_REMOTE=1`.

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `SEED_ASSETS_DIR` | `../../assets` | Thư mục ảnh của bản bàn giao (`china-gallery/`, `teambuilding/`, `logo-azway.png`), không nằm trong repo. Đường dẫn tương đối tính từ thư mục gốc repo. Thư mục không tồn tại thì seed dừng ngay; thiếu từng file thì bỏ qua ảnh đó và in cảnh báo |
| `SEED_SKIP_UNVERIFIED_MEDIA` | trống | `1` = không dùng ảnh chưa rõ quyền (ảnh teambuilding Viettour3mien). Slide hero thiếu ảnh sẽ dùng logo |

Nội dung (`scripts/seed-data/`):

| Loại | Số lượng | Nguồn |
| --- | --- | --- |
| Tour | 12 đã xuất bản + 1 nháp, đủ 4 loại | Tên, giá, tuyến: thiết kế `AZway_Web_Chinh.html`. Lịch trình, bao gồm, hoàn huỷ: viết mẫu. Tour Hà Nội – Bạch Đằng Giang – Hạ Long là **lịch trình mẫu**, không có giá |
| Du thuyền Hạ Long | 16, kèm lựa chọn vé du ngoạn / thuê nguyên tàu / ăn tối | Thiết kế (giá giữ nguyên bản bàn giao 09/09/2026). Trường giá là đ/khách, nên giá thuê nguyên tàu (theo chuyến) chỉ ghi trong mô tả, trường giá để trống |
| Teambuilding | 2, mỗi bài 12 trò chơi | Tên trò chơi theo thiết kế, cách chơi viết lại |
| Điểm đến | 10 | Thiết kế |
| Cẩm nang | 5 bài (heading h2/h3) + 5 danh mục | `AZway_Cam_Nang.html`, chép nguyên văn |
| Feedback | 4 | Mẫu (thiết kế chỉ có khung ảnh) |
| Cấu hình chung | hotline, Zalo, Messenger, Facebook, email, địa chỉ | Thiết kế. `leadNotifyEmails`, `responseTimeText` là giá trị mẫu |
| Trang chủ | 3 slide hero, tour/du thuyền/bài nổi bật | Mẫu |
| Chuyển hướng | 4 | Mẫu (AC-16) |

Ca kiểm thử:

- `JP-6N5D`: bản nháp (AC-05).
- `LC6`: giá 0 (FR-PRD-03).
- `SP-2N1D`: không có hoàn huỷ và không bao gồm (FR-PRD-05).
- Các tour Trung Quốc: không có lịch trình (đang chờ ảnh lịch trình của AZway).

Ảnh: chỉ dùng ảnh Wikimedia Commons (tác giả, giấy phép, link gốc ghi trong `caption`), logo AZway, và ảnh teambuilding. Ảnh teambuilding có caption "chưa xác nhận quyền sử dụng". Ảnh base64 không rõ nguồn trong file HTML không được dùng.
