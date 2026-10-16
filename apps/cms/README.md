# @azway/cms

Strapi 5. Chạy local: `cp .env.example .env` (điền secret), `pnpm dev:cms` ở thư mục gốc repo.

## Dữ liệu mẫu (seed)

> **Đây là DỮ LIỆU MẪU** để dựng và kiểm giao diện, không phải nội dung chính thức của AZway. Không đưa lên production. Nếu đưa lên staging cho khách xem, chạy với `SEED_SKIP_UNVERIFIED_MEDIA=1`.

```sh
pnpm dev:cms                     # hoặc start; lần đầu tạo DB, locale vi, quyền Public
pnpm --filter @azway/cms seed    # terminal khác, cùng DB (.env)
```

Seed nạp Strapi trong tiến trình riêng và ghi qua Document Service, không gọi REST. Chạy lại bao nhiêu lần cũng không nhân đôi:

- Entry khớp theo `code` (tour), `slug`, `groupName` (feedback), `from` (redirect). Entry đã có thì bị ghi đè bằng giá trị mẫu. Entry khác không bị đụng tới.
- Ảnh khớp theo tên file, chỉ upload một lần.

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `SEED_ASSETS_DIR` | `../../assets` (tương đối thư mục gốc repo) | Thư mục ảnh của bản bàn giao (`china-gallery/`, `teambuilding/`, `logo-azway.png`), không nằm trong repo. Thiếu file thì seed bỏ qua ảnh đó và in cảnh báo |
| `SEED_SKIP_UNVERIFIED_MEDIA` | trống | `1` = không dùng ảnh chưa rõ quyền (ảnh teambuilding Viettour3mien). Slide hero thiếu ảnh sẽ dùng logo |

Nội dung (`scripts/seed-data/`):

| Loại | Số lượng | Nguồn |
| --- | --- | --- |
| Tour | 12 đã xuất bản + 1 nháp, đủ 4 loại | Tên, giá, tuyến: thiết kế `AZway_Web_Chinh.html`. Lịch trình, bao gồm, hoàn huỷ: viết mẫu. Tour Hà Nội – Bạch Đằng Giang – Hạ Long là **lịch trình mẫu**, không có giá |
| Du thuyền Hạ Long | 16, kèm lựa chọn vé du ngoạn / thuê nguyên tàu / ăn tối | Thiết kế (giá giữ nguyên bản bàn giao 09/09/2026) |
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
