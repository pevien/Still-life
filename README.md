# Still life

App ghi nhanh cho ngày của bạn: kế hoạch và thực tế trên Google Calendar, nhật ký trên Google Drive, Gemini hiểu câu bạn nhập.
Tài liệu:
- [SPEC.md](SPEC.md): app làm gì.
- [TECHNICAL.md](TECHNICAL.md): dữ liệu nằm ở đâu, đi như thế nào.
- [CHANGELOG.md](CHANGELOG.md): đã đổi gì, vì sao, theo logic nào.

Mỗi lần đổi code: cập nhật các file trên cho khớp và thêm một mục vào CHANGELOG (đổi gì, vì sao, logic).

## Xem thử ngay (không cần Google)
Mở app với `?demo` ở cuối địa chỉ, ví dụ `https://pevien.github.io/still-life/?demo`.
Dữ liệu mẫu chỉ nằm trong trình duyệt. Thoát xem thử trong Cài đặt.

## Cài đặt thật (làm một lần)

### 1. Google Cloud Console (dự án của app Korean)
1. **APIs & Services → Library** → bật **Google Calendar API** (Drive API đã bật sẵn cho app Korean).
2. **OAuth consent screen → Data access** → thêm 2 scope:
   - `https://www.googleapis.com/auth/calendar.app.created` (chỉ các lịch app tự tạo)
   - `https://www.googleapis.com/auth/drive.file` (chỉ các file app tự tạo)
3. **Credentials → OAuth client** → mục *Authorized JavaScript origins*:
   - `https://pevien.github.io` thường đã có sẵn (app Korean dùng chung), nên không cần thêm.
   - Muốn chạy thử trên máy thì thêm `http://localhost:8123`.

### 2. Trong app
1. **Đăng nhập Google**.
2. **Kết nối Gemini**: dán key (dùng chung key của app Korean được), chọn model, bấm Kết nối. Chưa có key thì bấm "Để sau".
   Key được lưu vào file cấu hình trên Drive, máy khác đăng nhập cùng tài khoản sẽ tự có và bỏ qua bước này.
3. **Bắt đầu tạo lịch**: app tạo 2 lịch "Still life · Kế hoạch", "Still life · Thực tế" và thư mục Drive "Still life".
   Nếu đăng nhập trên máy khác, app tự tìm lại cấu hình, không tạo trùng. Muốn xem trước thì bấm "Xem lịch mẫu".
4. Trên Android: Chrome → menu ⋮ → **Thêm vào màn hình chính**.

### 3. Thông báo
Nhắc nhở do Google Calendar gửi. Mở app Google Calendar trên điện thoại, bật hiển thị 2 lịch "Still life", và bật thông báo cho lịch Kế hoạch.

## Chạy trên máy
```bash
python3 -m http.server 8123
```
Rồi mở http://localhost:8123/?demo

## Cấu trúc
- `index.html`, `styles.css`, `app.js`: toàn bộ app, không cần build.
- `sw.js`, `manifest.webmanifest`, `icon*`: PWA.
- `tests/`: unit test (xem mục Kiểm thử).
- Sửa tuần mẫu hoặc danh sách habit: hằng số `TEMPLATE` và `HABITS` đầu file `app.js`.
- Đổi giờ, tên một khối hoặc thêm khối cho hôm nay: làm ngay trong app (tab Hôm nay → bấm vào timeline).
  Muốn đổi lịch lặp hằng tuần thì vẫn sửa trong Google Calendar.

## Kiểm thử
Test chạy trong trình duyệt trên bản demo, không gọi Google hay Gemini.

Chạy tự động (cần Google Chrome, chỉ dùng Python có sẵn):
```bash
python3 tests/run.py
```
Script tự mở server và Chrome headless với hồ sơ tạm, in kết quả, trả mã lỗi 1 nếu có test hỏng.

Xem trên trình duyệt: chạy server như mục trên rồi mở http://localhost:8123/tests/.
Trang test tạm xoá dữ liệu demo `sl.*` của origin đó trong lúc chạy và trả lại khi xong.
