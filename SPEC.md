# Still life · Bản 1

Hệ thống sinh hoạt cá nhân: kế hoạch tuần, ghi nhận thực tế, thói quen, nhật ký.
Chốt qua buổi grill ngày 14/11/2026, cập nhật theo app hiện tại.

## Kiến trúc
- App web tĩnh (PWA), không build, không backend, chạy trên GitHub Pages (giống app Korean).
- Đăng nhập Google (Google Identity Services, cùng OAuth Client ID với app Korean).
- Gemini API key của người dùng, lưu trên máy (localStorage) và đồng bộ theo tài khoản qua file cấu hình trên Drive, nên máy thứ hai không phải dán lại.
- Giao diện tiếng Việt, ưu tiên điện thoại Android.

## Dữ liệu (tất cả trong Google của người dùng)
| Nơi | Chứa gì |
|---|---|
| Google Calendar · lịch **Still life · Kế hoạch** | Tuần mẫu, sự kiện lặp lại hằng tuần, có nhắc nhở. Sửa trong app chỉ đổi đúng lần lặp của hôm nay. Khối thêm trong app là sự kiện đơn (không lặp), đánh dấu `added=1` |
| Google Calendar · lịch **Still life · Thực tế** | Việc đã làm (AI tạo từ câu nhập), tô màu theo nhóm. Mỗi ngày 1 sự kiện cả ngày "Thói quen" lưu trạng thái habit + unwell |
| Google Drive · `Still life/Nhật ký/YYYY-MM-DD.md` | Nhật ký 3 dòng + tự do |
| Google Drive · `Still life/still-life-config.json` | ID 2 lịch, thư mục, ngày bắt đầu, Gemini key. Máy mới đăng nhập sẽ tự tìm file này để nối vào, không tạo trùng |

Scope OAuth: `calendar.app.created` (chỉ các lịch app tự tạo) + `drive.file` (chỉ file app tự tạo).

## Nhóm thời gian (màu Google Calendar)
Sức khỏe (Basil) · Tiếng Hàn (Grape) · Build & Learn (Blueberry) · Sinh hoạt (Banana) ·
Người thân & bạn bè (Flamingo) · Giải trí có chủ đích (Tangerine) · Lướt vô thức (Graphite)

## Tuần mẫu
- Mỗi ngày: 5:30 dậy · 6:00–7:00 vận động · 7:00 ăn sáng · 11:30 ăn trưa · 21:00 nhật ký & tổng kết · 22:00 cất điện thoại
- Vận động 6:00: Yoga T2-4-6 · Gym T3, T7 · Đi bộ/giãn cơ T5, CN
- 9:00–11:30 Build & Learn (T2–T7)
- Lớp tiếng Hàn T2-4-6 19:00–21:00 (ăn tối 17:30) · ngày khác tự học 14:00–14:30, ăn tối 18:30, giải trí 20:00

## Habit (giai đoạn khởi động)
| Habit | Tần suất | Tối thiểu |
|---|---|---|
| Ăn đủ 3 bữa | hằng ngày | không bỏ bữa |
| Dậy 5:30 | hằng ngày | trước 6:00 |
| Tiếng Hàn 10 phút | hằng ngày | 5 từ mới |
| Đi bộ 3000 bước | hằng ngày | 2000 bước (nhập tay) |
| Yoga | T2-4-6 | — |
| Gym | T3, T7 | 1 buổi/tuần (đủ 2 là 🌟) |
| Cất điện thoại 22:00 | hằng ngày | bật chế độ ngủ trước 22:30 |
| Nhật ký | hằng ngày | 1 dòng |

Để sau: Thiền.

Luật chuỗi: bản tối thiểu vẫn tính. Unwell day không làm gãy chuỗi. Hôm nay chưa xong không làm gãy chuỗi.

## Unwell day
Lịch hôm nay chuyển sang bản nhẹ (ăn 3 bữa, 5 từ, đi bộ ngắn, ngủ). Tắt nhắc nhở các khối không cần thiết còn lại hôm đó
trong lịch Kế hoạch: thêm 💤 vào tên, bỏ nhắc, gọi song song (bật lại được bằng "Mình ổn hơn rồi").
Trong lúc chờ, nút khoá lại và hiện vòng quay. 3 ngày liền là unwell → app hỏi thăm.

## Màn hình
Thanh dưới có 4 ô: Hôm nay · Thói quen · Nhật ký · Cài đặt (Cài đặt mở sheet, không đổi tab).
Đầu trang là 1 dòng chữ nhỏ: lời chào theo buổi · thứ, ngày tháng.

1. **Hôm nay**
   - Bây giờ / Tiếp theo: nút Đã làm, Bỏ qua, Làm việc khác.
   - Habit hôm nay, nút "Hôm nay mình không ổn".
   - Thời gian theo nhóm + timeline kế hoạch vs thực tế 5:00–23:00 trong khung cao cố định, cuộn bên trong,
     mở ra tự cuộn tới giờ hiện tại, render lại giữ nguyên chỗ đang xem. Khối ngắn hiện 1 dòng, cắt bằng "…".
   - Bấm khối Kế hoạch → "Chỉnh sửa kế hoạch": đổi tên, giờ cho riêng hôm nay, có hoàn tác.
     Khối thêm trong app có thêm nút xoá.
   - Bấm chỗ trống cột Kế hoạch → "Thêm kế hoạch": giờ bắt đầu theo chỗ bấm (làm tròn xuống 15 phút),
     dài 30 phút hoặc tới khối kế tiếp, chọn nhóm. Chỉ cho hôm nay.
   - Bấm khối Thực tế → sửa, xoá việc đã ghi.
2. **Nhập** (nút bút nổi ở tab Hôm nay): gõ hoặc nói → Gemini hiểu → thẻ xác nhận (sửa được) → lưu.
   - Thẻ việc theo thứ tự Tên, Nhóm, Giờ, Ngày. Ngày sửa được (không chọn ngày tương lai), khác hôm nay thì được tô màu.
     Chip thói quen của ngày khác có nhãn ngày.
   - Không còn gì để ghi thì không lưu được. Giờ kết thúc không sau giờ bắt đầu thì cảnh báo ngay, lưu thành 15 phút.
   - Thiếu hoặc sai Gemini key: thông báo có nút mở Cài đặt.
   - Nút "Tự thêm" trong ô nhập: bỏ qua AI, mở thẳng một thẻ việc trống (tên lấy từ dòng đầu chữ đã gõ, nếu có;
     giờ từ 30 phút trước tới bây giờ). Mở từ "Làm việc khác" thì giờ bắt đầu là đầu khối đang chạy, nhóm theo khối,
     lưu xong khối đó được đánh dấu bỏ qua như khi nhập qua AI.
   - Trên timeline, các việc chồng giờ nằm cạnh nhau.
3. **Thói quen**: chuyển Tuần / Tháng, lùi tới từng tuần, tháng (không quá ngày bắt đầu, không quá hiện tại).
   Chú thích trạng thái nằm dưới tiêu đề, căn giữa. Chạm ô một ngày để sửa habit ngày đó. Chuỗi 🔥.
4. **Nhật ký**: viết hôm nay, xem các ngày trước.

## Kiểm thử
Unit test chạy trong trình duyệt, ở chế độ demo, không đụng Google: xem `tests/` và mục Kiểm thử trong README.

## Bản 2
Idea bank (Drive), To-do (Google Tasks), báo cáo tuần + review Chủ nhật, Thiền, tự động lấy số bước.
