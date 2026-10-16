# Thiết kế đã duyệt

Trích từ bản bàn giao HTML của khách (bản cập nhật 09/09/2026: `AZway_Web_Chinh.html`, `AZway_Cam_Nang.html`, `AZway_Teambuilding.html`, `assets/site-updates.css`). Dùng để đọc bố cục và giá trị CSS. Không nhúng trực tiếp vào site.

| Đường dẫn | Nội dung |
| --- | --- |
| `html/*.html` | HTML gốc. Ảnh base64 đã thay bằng `data:<mime>;base64,REMOVED`, mở bằng trình duyệt sẽ thiếu ảnh nhưng còn bố cục, chữ và script |
| `css/*.css` | Các khối `<style>` tách ra từ HTML tương ứng, cộng với `site-updates.css` |
| `assets/logo-azway.png` | Logo, thu về rộng 720 px (bản gốc 3724 px, 1,5 MB) |

Không đưa vào repo: file HTML gốc 11 MB, ảnh `assets/teambuilding` và `assets/china-gallery` (ảnh nội dung, sẽ upload qua Strapi khi seed), file JS hành vi (`site-updates.js`, `azway-links.js`).

Token dùng trong code nằm ở `apps/web/src/styles/tokens.css`, lấy từ `:root` của `css/web-chinh.css` và các giá trị lặp lại trong đó. Font là font hệ thống (`Arial, "Helvetica Neue", "Segoe UI", "Noto Sans"`), không có web font.
