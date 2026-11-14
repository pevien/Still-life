# Still life

App ghi nhanh cho ngày của bạn: kế hoạch và thực tế trên Google Calendar, nhật ký trên Google Drive, Gemini hiểu câu bạn nhập.
Thiết kế chi tiết ở [SPEC.md](SPEC.md).

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
1. Mở app → **Bắt đầu** → dán Gemini API key (dùng chung key của app Korean được).
2. **Đăng nhập Google**.
3. **Tạo lịch**: app tạo 2 lịch "Still life · Kế hoạch", "Still life · Thực tế" và thư mục Drive "Still life".
   Nếu đăng nhập trên máy khác, app tự tìm lại cấu hình, không tạo trùng.
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
- Sửa tuần mẫu hoặc danh sách habit: hằng số `TEMPLATE` và `HABITS` đầu file `app.js`. Lịch đã tạo thì sửa thẳng trong Google Calendar.
