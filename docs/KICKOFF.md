# Prompt khởi động cho Claude Code (cloud)

Dán vào phiên Claude Code mới, đã gắn repo này.

## Phiên đầu tiên

```
Đọc CLAUDE.md, rồi docs/BRD-PRD.md, docs/ARCHITECTURE.md và docs/TASKS.md.

Làm milestone M1 trong docs/TASKS.md: tạo nhánh m1/cms-scaffold, làm hết các ô, chạy đúng các bước ở mục "Xong khi", tick ô trong TASKS.md, rồi mở PR vào main. Mô tả PR gồm: mã yêu cầu đã đáp ứng, output của các lệnh kiểm tra, mục "Câu hỏi cho khách" nếu có.

Xong M1 thì tiếp M2, M3 theo cùng cách, mỗi milestone một PR riêng, nhánh mới tách từ main sau khi PR trước được merge (nếu PR trước chưa merge, tách từ nhánh trước và ghi rõ phụ thuộc trong PR). Dừng sau M3 và tóm tắt.
```

## Các phiên sau

```
Đọc CLAUDE.md và docs/TASKS.md. Làm milestone tiếp theo còn ô chưa tick, theo đúng quy trình trong CLAUDE.md. Một milestone, một PR.
```

## Khi có source thiết kế

```
Source thiết kế đã duyệt nằm trong design/. Làm M9 trong docs/TASKS.md. Đính kèm ảnh chụp so sánh từng trang ở 375px và 1440px trong PR.
```

## Gợi ý chạy song song

M1→M2→M3 (CMS) phải tuần tự. Sau khi M2 merge, có thể chạy song song hai phiên: một phiên M3 (lead pipeline CMS) và một phiên M4 (khung web). M5–M7 phụ thuộc M4. M8 làm được bất cứ lúc nào sau M4.
