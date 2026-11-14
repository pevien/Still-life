# Still life · Bản 1

Hệ thống sinh hoạt cá nhân: kế hoạch tuần, ghi nhận thực tế, thói quen, nhật ký.
Chốt qua buổi grill ngày 14/11/2026.

## Kiến trúc
- App web tĩnh (PWA), không build, không backend, chạy trên GitHub Pages (giống app Korean).
- Đăng nhập Google (Google Identity Services, cùng OAuth Client ID với app Korean).
- Gemini API key của người dùng, lưu trên máy (localStorage).
- Giao diện tiếng Việt, ưu tiên điện thoại Android.

## Dữ liệu (tất cả trong Google của người dùng)
| Nơi | Chứa gì |
|---|---|
| Google Calendar · lịch **Still life · Kế hoạch** | Tuần mẫu, sự kiện lặp lại hằng tuần, có nhắc nhở |
| Google Calendar · lịch **Still life · Thực tế** | Việc đã làm (AI tạo từ câu nhập), tô màu theo nhóm. Mỗi ngày 1 sự kiện cả ngày "Thói quen" lưu trạng thái habit + unwell |
| Google Drive · `Still life/Nhật ký/YYYY-MM-DD.md` | Nhật ký 3 dòng + tự do |
| Google Drive · `Still life/still-life-config.json` | ID 2 lịch, ngày bắt đầu |

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
Lịch hôm nay chuyển sang bản nhẹ (ăn 3 bữa, 5 từ, đi bộ ngắn, ngủ). Tắt nhắc nhở các khối không cần thiết hôm đó
trong lịch Kế hoạch (bật lại được). 3 ngày liền là unwell → app hỏi thăm.

## Màn hình
1. **Hôm nay**: Bây giờ / Tiếp theo (nút Đã làm, Bỏ qua, Làm việc khác), habit hôm nay, timeline kế hoạch vs thực tế, nút Unwell day.
2. **Nhập** (luôn ở dưới): gõ hoặc nói → Gemini hiểu → thẻ xác nhận (sửa được) → lưu.
3. **Thói quen**: bảng tuần + bảng ô vuông theo tháng, chuỗi 🔥.
4. **Nhật ký**: viết hôm nay, xem các ngày trước.

## Bản 2
Idea bank (Drive), To-do (Google Tasks), báo cáo tuần + review Chủ nhật, Thiền, tự động lấy số bước.
