# Changelog

Mỗi thay đổi ghi 3 điều: **đổi gì**, **vì sao**, **logic** (cách làm và đánh đổi).
Mới nhất ở trên. Số `vNN` là phiên bản cache trong `sw.js`.

---

## 2026-11-14 · Ngày nằm trong form thẻ việc · v25
**Đổi gì**: thẻ việc trong sheet xác nhận theo thứ tự Tên → Nhóm → Giờ → Ngày. Ngày là ô chọn ngày sửa được, kèm chữ "Hôm nay", "Hôm qua"
hoặc thứ; ngày khác hôm nay thì ô được tô màu nhấn. Bỏ nhãn "Ghi vào Hôm qua" nằm ngoài thẻ (bản v24). Đổi nhóm thì viền thẻ đổi màu theo.

**Vì sao**: nhãn ngày nằm ngoài thẻ trông như tiêu đề nhóm, tách rời khỏi việc nó nói tới, và chỉ xem được chứ không sửa được.
Người dùng muốn ngày là một trường của form như tên, nhóm, giờ.

**Logic**
- Ô ngày luôn hiện (kể cả hôm nay) để form có cấu trúc cố định, nhưng chỉ tô màu khi khác hôm nay nên vẫn giữ được tác dụng cảnh báo của v24.
- `max` = hôm nay, và `validDay()` đưa ngày rỗng, sai định dạng hay ở tương lai về hôm nay, cả lúc đổi trong form lẫn lúc lưu
  (việc đã làm không thể ở tương lai, giống luật trong prompt Gemini).
- Việc chỉ được thêm vào timeline hôm nay khi ngày đúng là hôm nay; đổi sang hôm qua thì chỉ ghi vào Calendar ngày đó.
- Chip thói quen vẫn giữ nhãn ngày, vì chip không có chỗ cho một ô nhập, nhưng rút gọn (`dayShort`): "Hôm qua", ngày cũ hơn
  là "T6 13/11". Ngày đầy đủ đã có ở ô ngày phía trên nên chip chỉ cần nhắc. `dayTag` của v24 bị bỏ.
- Thêm 4 test (tổng 91).

## 2026-11-14 · Sửa 6 lỗi của luồng nhập · v24
**Đổi gì**
1. Việc, thói quen không phải hôm nay có nhãn "Ghi vào Hôm qua · Thứ Sáu 13/11" trong sheet xác nhận.
2. Không có gì để ghi thì nút Lưu bị khoá; `savePending` cũng tự chặn và báo "Không có gì để ghi".
3. Bấm thùng rác bỏ hết việc thì ẩn lời đáp cũ của AI, báo "Đã bỏ hết". Bỏ một dòng không còn làm mất chỗ đã sửa ở dòng khác.
4. Giờ kết thúc không sau giờ bắt đầu: cảnh báo ngay dưới ô giờ, nói rõ sẽ lưu thành gì. Có ở mọi sheet có ô giờ.
5. Timeline: các khối chồng giờ chia làn nằm cạnh nhau thay vì đè lên nhau.
6. Lỗi thiếu hoặc sai Gemini key: toast có nút "Mở Cài đặt".

**Vì sao**: chụp lại toàn bộ luồng nhập (21 trường hợp) thì thấy 6 chỗ làm người dùng hiểu sai hoặc mất dữ liệu:
lưu nhầm ngày mà không biết, bấm Lưu khi trống vẫn báo "Đã ghi", lời đáp nói về việc đã bỏ, giờ bị đổi âm thầm,
việc bị che mất trên timeline, và lỗi bảo "vào Cài đặt" nhưng không đưa tới đó.

**Logic**
- Nhãn ngày dùng `dayTag(ds)`: hôm nay trả chuỗi rỗng nên giao diện quen thuộc không đổi, chỉ ngày khác mới có nhãn.
- "Trống" = không việc, không thói quen, nhật ký rỗng, không unwell (`pendingEmpty`). Ngoại lệ chế độ "Làm việc khác":
  lưu khi trống vẫn có ý nghĩa (đánh dấu bỏ qua khối đang chạy) nên không khoá.
- Lời đáp chỉ ẩn khi người dùng **đã bỏ** hết (`p.edited`). Nếu AI không tìm được gì từ đầu thì lời đáp của AI vẫn hữu ích nên giữ.
- Trước khi bỏ một dòng, đọc lại giá trị đang có trong các ô vào `S.pending`, vì sheet được dựng lại từ `S.pending`.
- Giờ ngược: không tự sửa và không chặn lưu (đôi khi người dùng chủ ý để vậy), chỉ nói trước kết quả. `timeWarn` gắn vào mọi `.act`
  khi mở sheet và mỗi lần đổi ô giờ, nên sheet Thêm, Sửa kế hoạch và Sửa việc đã làm đều có.
- Chia làn theo **vị trí vẽ** chứ không theo giờ thật, vì khối ngắn được vẽ cao tối thiểu 22px và có thể đè khối sau dù giờ không chồng.
  Thuật toán gom cụm khối chồng nhau, xếp từng khối vào làn trống đầu tiên; mọi khối trong cụm chia đều bề ngang theo số làn của cụm.
  Khối không chồng ai giữ nguyên toàn bề ngang.
- Toast nhận thêm `{ label, icon, done }` để nút dùng được cho việc khác ngoài hoàn tác; `done: null` nghĩa là chạy xong không báo "Đã hoàn tác".
  Lỗi Gemini 401/403 hoặc thông báo có "API key" cũng được đánh dấu `needKey`.
- Thêm 13 test (tổng 87).

## 2026-11-14 · Unit test và tài liệu
**Đổi gì**
- Thêm `tests/` (74 test) và `tests/run.py` chạy bằng Chrome headless.
- Thêm `TECHNICAL.md` (luồng dữ liệu) và file này. Cập nhật `SPEC.md`, `README.md` cho khớp app hiện tại.

**Vì sao**
- SPEC và README đã lệch so với app (vẫn ghi "sửa lịch trong Google Calendar", chưa có Cài đặt ở thanh dưới, timeline cuộn, sửa/thêm kế hoạch).
- Chưa có test nào, mỗi lần sửa phải bấm tay để kiểm.

**Logic**
- App là một script thường, không module, không build, máy cũng không có Node. Nên test chạy **trong trình duyệt**:
  mở app ở `?demo` trong iframe, chèn `tests.js` vào iframe để thấy được cả các `const` toàn cục (`S`, `TL`, `Demo`).
  Đánh đổi: không tách được từng hàm ra chạy riêng, nhưng không phải sửa app để test được.
- Test chỉ dùng `Demo`, không gọi Google hay Gemini. Phần Google được kiểm gián tiếp qua các hàm chuyển đổi dữ liệu.
- Trang test chụp lại `sl.*` trong localStorage trước khi chạy và trả về sau, để không làm hỏng dữ liệu demo đang có trên máy.
- `run.py` chỉ dùng thư viện chuẩn của Python (tự viết WebSocket tối giản để nói chuyện với Chrome), vì máy không có Node, Playwright.

---

## 2026-11-14 · Unwell day hiện trạng thái đang chạy · v23 · `6c7ce46`
**Đổi gì**: nút "Hôm nay mình không ổn" và "Mình ổn hơn rồi" khoá lại, hiện vòng quay và chữ "Đang chuyển…" trong lúc chờ. Tắt, bật các khối gọi song song.

**Vì sao**: bấm xong vài giây không có phản hồi gì, người dùng không biết app có nhận chưa, dễ bấm lại.

**Logic**
- Chậm vì `mutePlan` PATCH từng khối **nối tiếp** (khoảng 10 khối là 10 lượt chờ mạng). Đổi sang `Promise.all`: còn khoảng 1 lượt chờ.
  Số khối ít nên không lo chạm giới hạn tốc độ của Calendar.
- Thêm `busy(el, label)` dùng chung: khoá nút (chống bấm 2 lần) và thay nội dung bằng vòng quay. Render lại sau khi xong sẽ thay nút mới, nên không cần "bỏ busy".

## 2026-11-14 · Sửa và thêm kế hoạch ngay trong app · v18–v22 · `583e9e9`
**Đổi gì**
- Bấm khối Kế hoạch → sheet "Chỉnh sửa kế hoạch" (tên, giờ, có hoàn tác).
- Bấm chỗ trống cột Kế hoạch → sheet "Thêm kế hoạch". Khối thêm có nút xoá.
- Khối ngắn trên timeline hiện 1 dòng, cắt "…".
- Đầu trang gộp thành 1 dòng chữ nhỏ "Buổi chiều · Thứ Bảy, 14 tháng 11".
- Tab Thói quen: chú thích đặt dưới tiêu đề ở cả Tuần và Tháng, căn giữa; bỏ "Chạm ô để sửa".

**Vì sao**
- Người dùng muốn quản lý kế hoạch trong Still life thay vì mở Google Calendar.
- Khối 30 phút như "Tự học tiếng Hàn" bị xuống dòng, che mất nửa chữ.
- Tiêu đề ngày to chiếm chỗ; chú thích Tuần và Tháng nằm hai chỗ khác nhau; dòng hướng dẫn thừa.

**Logic**
- **Sửa chỉ cho hôm nay**: khối tuần mẫu là sự kiện lặp, app đọc bằng `singleEvents=true` nên mỗi ngày có id riêng.
  PATCH vào id đó → Calendar tạo ngoại lệ cho đúng ngày đó, chuỗi lặp không đổi. An toàn, không cần tách chuỗi lặp.
  Muốn đổi cho mọi ngày thì vẫn sửa trong Google Calendar (chưa làm trong app vì phải tách chuỗi lặp, rủi ro cao hơn).
- **Thêm** là sự kiện đơn, đánh dấu `added=1` để biết khối nào được phép xoá. Khối tuần mẫu không cho xoá trong app để tránh xoá nhầm lịch lặp.
- Giờ bắt đầu lấy theo chỗ chạm, làm tròn xuống 15 phút; kết thúc +30 phút hoặc tới khối kế tiếp (nếu cách ≥15 phút) để không chồng lên nó.
- Vạch giờ và vạch hiện tại thêm `pointer-events: none` để cú chạm rơi xuống cột.
- Khối ngắn: thay vì tăng chiều cao tối thiểu (làm sai tỉ lệ thời gian), giữ chiều cao đúng và cắt chữ; tên đầy đủ xem bằng tooltip hoặc mở sheet.
- Dòng ngày: dùng `::after` thêm " ·" sau lời chào; vẫn giữ thẻ `h1` cho trình đọc màn hình.

## 2026-11-14 · Timeline cả ngày trong khung cuộn · v16 · `208e39e`
**Đổi gì**: bỏ nút thu gọn/xem cả ngày. Timeline luôn 5:00–23:00 trong khung cao cố định, cuộn bên trong, mở ra tự tới giờ hiện tại.

**Vì sao**: nút thu gọn thừa, phải bấm mới xem được giờ khác; người dùng muốn cuộn tự nhiên.

**Logic**
- Khung cao `min(380px, 52vh)`, tiêu đề cột "Kế hoạch / Thực tế" đứng yên phía trên.
- Lần đầu cuộn sao cho giờ hiện tại ở khoảng 1/3 từ trên xuống. Các lần render sau (mỗi phút, sau khi sửa) **giữ nguyên** `scrollTop`, không giật về giờ hiện tại.
- Chỉ đánh dấu "đã căn" khi khung có chiều cao thật. Nếu tab Hôm nay đang ẩn lúc render đầu, lần sau mới căn, tránh bị kẹt ở 5:00.

## 2026-11-14 · Cài đặt xuống thanh dưới; Thói quen Tuần/Tháng · v15 · `c0007fe`
**Đổi gì**: nút bánh răng trên header thành ô thứ 4 "Cài đặt" ở thanh dưới. Tab Thói quen có chuyển Tuần/Tháng, lùi tới từng tuần, tháng.

**Vì sao**: các điểm bấm chính gom về một chỗ dưới ngón cái; xem lại được các tuần, tháng trước.

**Logic**
- Ô Cài đặt dùng chung class `tab` để giống hệt các tab khác nhưng không có `data-view`, nên mở sheet chứ không đổi view và không mất trạng thái tab đang chọn.
- Lùi về tuần, tháng cũ hơn phần đã tải (16 tuần) thì `ensureDays()` tải thêm. Không cho lùi quá ngày bắt đầu theo dõi, không tới quá hiện tại.

## 2026-11-14 · Sửa layout ô nhập trong sheet · `8511572`
Thùng rác thẳng hàng với ô tên, mũi tên của ô chọn có lề.

## 2026-11-14 · Đồng bộ giữa các máy · `4cd112d`
**Đổi gì**: máy thứ hai đăng nhập tự nối vào bộ lịch có sẵn; Gemini key đi theo tài khoản.

**Vì sao**: trước đó máy mới sẽ dựng thêm bộ lịch thứ hai và phải dán lại key.

**Logic**: tìm `still-life-config.json` trên Drive (`findConfig`) trước khi dựng mới. Key được ghi vào file đó (`pushKey`) và máy mới lấy về nếu chưa có (`adoptCfg`).
Scope `drive.file` vẫn đủ vì file do chính app tạo.

## 2026-11-14 · Giao diện · `07ad7e8`, `eabe29e`, `36a8ed4`, `428c6f0`
Đổi style toàn app, nền, màu nhấn vàng gold (bạc cho viền focus).
Vàng là màu của **hành động chính** (gửi, nút bút, Lưu, Đã làm); xanh là màu của **trạng thái đã xong**. Giữ quy ước này khi thêm nút mới.

## 2026-11-14 · Still life v1 · `085a50e`
Kế hoạch, thực tế, thói quen, nhật ký trên Google Calendar + Drive, Gemini đọc câu nhập. Thiết kế ở [SPEC.md](SPEC.md).
