# Changelog

Mỗi thay đổi ghi 3 điều: **đổi gì**, **vì sao**, **logic** (cách làm và đánh đổi).
Mới nhất ở trên. Số `vNN` là phiên bản cache trong `sw.js`.

---

## 2026-11-22 · Dậy trễ: bộ chọn giờ thay khung chat, AI hết báo "sai dạng" · v75
**Đổi gì**
- "Mình dậy trễ" và "Mình không khoẻ" (trước là "Hôm nay mình không ổn") nằm chung 1 hàng, chia đôi bề ngang, kể cả trên điện thoại. Dòng "Đã sắp lại từ… · Trả lại lịch cũ" vẫn chiếm riêng 1 hàng.
- Bấm "Mình dậy trễ" mở thẳng bộ chọn giờ "Mình dậy lúc", nút chính "Sắp lại lịch hôm nay" (thay "Xong"). Không còn khung chat. Trong sheet xem trước, "Kể lại" đổi thành "Đổi giờ dậy".
- Bộ chọn giờ (mọi ô giờ trong app) thấp lại còn 3 hàng (220 → 132px).
- Gemini trả giờ lệch dạng (`9:00`, `09:00:00`, `9h30`) thì app tự chuẩn hoá. Thiếu 1 đầu giờ thì giữ độ dài cũ. Nhắc khối mà không có giờ thì giữ nguyên.
- Đề xuất của AI vẫn sai luật (chồng giờ, quá khứ…), hoặc Gemini bận / trả JSON hỏng, thì app dùng bản dời đơn giản (`demoLate`) và ghi rõ trong sheet xem trước, không báo lỗi nữa. Riêng key sai vẫn báo kèm nút Mở Cài đặt.

**Vì sao**
Thử trên web có key vẫn không tạo được lịch: `lateCheck` chỉ nhận đúng `HH:MM`, Gemini hay trả `9:00` hoặc bỏ trống giờ của khối không đổi, nên bị từ chối với lỗi "giờ của … sai dạng". Gõ chữ để kể chậm hơn chọn giờ, và chỉ cần giờ dậy là đủ để sắp lại.

**Logic**
- `normT` chuẩn hoá giờ, chỉ trả "" khi hỏng hẳn (vd "chín giờ", "24:00"). Prompt dặn thêm AI viết đủ HH:MM.
- Giờ dậy lấy theo giờ người dùng chọn, ghi đè `wake` của AI. Giờ dậy sau bây giờ thì báo bằng toast, giữ bộ chọn.
- `TP.open(null, { title, value, ok, onOk })`: bộ chọn giờ dùng được không cần ô giờ, đổi chữ nút chính. Lúc đang sắp lịch, nút chính quay vòng, Hủy / chạm nền / Esc không đóng được, bấm nhiều lần chỉ gọi AI 1 lần.
- Vẫn có bước xem trước, AI không bao giờ tự áp dụng.
- Đánh đổi: không còn kể thêm (vd "chiều có hẹn") cho AI. Muốn chỉnh riêng một khối thì sửa sau trên timeline.

 trên timeline Hôm nay · v74
**Đổi gì**
- Giữ rồi kéo khối (Kế hoạch hoặc Thực tế) để dời giờ, kéo mép dưới để đổi giờ kết thúc, kéo trên chỗ trống cột Kế hoạch để chọn khoảng rồi mở "Thêm kế hoạch". Bước 15 phút, có nhãn giờ nổi, tự cuộn ở mép, thả là lưu kèm Hoàn tác.

**Vì sao**
Đổi giờ phải mở sheet rồi gõ giờ, chậm hơn nhiều so với kéo như trên Google Calendar.

**Logic**
- Điện thoại phải giữ 350 ms mới nhấc khối, để vuốt dọc vẫn cuộn timeline. Đã nhấc thì chặn `touchmove` để trình duyệt không cuộn.
- Sheet sửa và kéo-thả dùng chung `applyPlanTime` / `applyActTime` (lưu + hoàn tác). Kế hoạch vẫn chỉ đổi lần lặp hôm nay.
- Tuần mẫu chưa kéo được.

---

## 2026-11-22 · Dậy trễ: AI sắp lại lịch hôm nay · v73
**Đổi gì**
- Tab Hôm nay có thêm nút "Mình dậy trễ" cạnh "Hôm nay mình không ổn". Nút chỉ hiện khi có Gemini key (hoặc ở chế độ xem thử) và hôm nay còn khối chưa làm, chưa bỏ qua.
- Bấm nút mở popup kể (có micro), điền sẵn "Mình dậy lúc HH:MM". Gemini đề xuất lịch mới, app kiểm tra rồi mở sheet "Lịch mới hôm nay": `giờ cũ → giờ mới`, mục Bỏ hôm nay, thói quen của khối dậy (chọn sẵn Đạt / Chưa), nút Kể lại, Hủy / Áp dụng.
- Áp dụng xong: toast có Hoàn tác, chỗ nút đổi thành "Đã sắp lại từ HH:MM · Trả lại lịch cũ".

**Vì sao**
Dậy trễ thì các khối buổi sáng đã trôi qua, các khối sau vẫn giữ giờ cũ, nên lịch hôm đó không dùng được và Google Calendar nhắc sai giờ. Để AI sắp thì không phải thêm cờ "giờ cố định" vào Tuần mẫu, và bạn kể thêm được (có hẹn, muốn bỏ gì).

**Logic**
- Gửi cho Gemini các khối hôm nay theo giờ gốc, kèm mã ngắn b1, b2…, nhóm, `ess` và trạng thái. AI trả `{ wake, items:[{id, s, e, skip}], reply }`.
- `lateCheck` (hàm thuần) từ chối đề xuất có id lạ, giờ trong quá khứ, `s ≥ e`, quá 23:00, chồng giờ, hoặc đổi khối đã làm. Gặp lỗi thì báo, popup giữ chữ để gửi lại. Khối đã qua giờ, chưa làm mà AI để nguyên thì tự vào mục Bỏ hôm nay.
- Áp dụng: lưu `rec.late` (giờ gốc các khối đã dời, các khối đã bỏ, mức thói quen trước đó) **trước**, rồi đổi giờ lần lặp hôm nay bằng `updatePlan`, gọi song song. Lỡ hỏng giữa chừng thì vẫn Trả lại lịch cũ được.
- `rec.late` lưu thành 2 thuộc tính `late` và `lm` của sự kiện Thói quen, vì mỗi thuộc tính của Calendar tối đa 1024 ký tự.
- Sắp lại lần nữa luôn tính từ giờ gốc (`lateBase`). Trả lại lịch cũ trả thói quen về mức trước, trừ khi bạn đã tự đổi mức.
- Xem thử không có key thì dùng `demoLate`, một bản dời đơn giản: khối `ess` chưa tới giờ đứng yên, khối khác nối tiếp vào chỗ trống.
- Đánh đổi: cần key và chờ vài giây, kết quả AI có thể khác nhau giữa các lần. Bù lại luôn có bước xem trước và không bao giờ tự áp dụng.

---

## 2026-11-16 · Bảng Tuần thoáng hơn · v72
**Đổi gì**
- Khoảng cách giữa các hàng thói quen 4px → 10px.
- Cột tên cách cột T2 thêm (padding phải 2px → 8px); dòng "[icon] số" cách tên 2px.

**Vì sao**
Sau khi tên lên 2 dòng (tên / [icon] số), mỗi khối tên cao ~ ô ngày; với 4px giữa hàng, các khối tên và các ô màu dính vào nhau, tên dài chạm sát ô T2.

**Logic**
- Chỉ đổi khoảng trắng, không đổi cỡ ô (34px) hay cỡ chữ. Bảng dài thêm ~6px mỗi hàng (8 thói quen ≈ 48px).

---

## 2026-11-16 · Bảng Tuần: tên ở trên, [icon] số ở dưới · v71
**Đổi gì**
- Cột tên của bảng Tuần (tab Thói quen) đổi từ "[icon] Tên / số" sang "Tên" ở dòng trên, "[icon] 1/1" ở dòng dưới.

**Vì sao**
Cột tên rất hẹp. Icon chiếm riêng một cột 18px cạnh tên nên tên bị cắt ("Đi bộ 300…", "Cất máy 2…"), trong khi dòng số bên dưới để trống phần dưới icon. Dời icon xuống dòng số thì tên được thêm ~22px mà mỗi dòng không cao thêm.

**Logic**
- `.wname` từ grid 2 cột sang flex cột; icon nằm trong `<small>` cùng số (`<b class="num">`). Icon vẫn tô màu nhóm qua `--cat` (rule đổi từ `.wname > i` thành `.wname i`).
- Đánh đổi: icon không còn thẳng hàng với tên nên quét màu theo cột kém nổi hơn chút; chọn ưu tiên đọc đủ tên.

---

## 2026-11-16 · Chữ trong sheet Kế hoạch khớp tiêu đề · v70
**Đổi gì**
- Trong các sheet tiêu đề "Thêm kế hoạch" / "Sửa kế hoạch" / "Chỉnh sửa kế hoạch", chữ đi kèm trả về "kế hoạch": lỗi "Đặt tên cho kế hoạch nhé.", ghi chú "Kế hoạch thêm riêng cho hôm nay.", toast "Đã đổi kế hoạch hôm nay", aria-label "Tên kế hoạch", "Xoá kế hoạch này".

**Vì sao**
v69 đổi hết sang "lịch" làm sheet tự mâu thuẫn: tiêu đề "Thêm kế hoạch" mà báo lỗi "Đặt tên cho lịch nhé.". Lỗi và nhãn trong form phải gọi đúng tên mà tiêu đề form dùng. Toast "Đã đổi kế hoạch hôm nay" cũng khớp với "Đã thêm kế hoạch", "Đã xoá kế hoạch" có sẵn.

**Logic**
- Quy tắc: trong form nào thì dùng đúng từ của tiêu đề form đó. Ngoài form (thẻ Bây giờ, Rest day, nhắc qua lịch ở sheet thói quen) vẫn dùng "lịch" như v69.

---

## 2026-11-16 · Ưu tiên chữ "lịch" thay "kế hoạch" · v69
**Đổi gì**
- Các chữ vừa đổi từ "khối" (v67, v68) chuyển tiếp sang "lịch": "Nhắc nhở các lịch khác đã tắt.", "Không có lịch nào lúc này.", "Nhắc qua lịch: …", "Chưa có lịch nào trong Tuần mẫu…", "Lịch thêm riêng cho hôm nay.", toast "Đã đổi lịch hôm nay", "…bỏ qua lịch đang chạy.", "…bấm vào lịch ở trang Hôm nay.", "Đặt tên cho lịch nhé.", aria-label "Tên lịch", "Xoá lịch này".
- "Đã điền lịch theo kế hoạch vừa lưu" → "Đã điền ngày theo lịch vừa lưu" (tránh "lịch theo lịch").

**Vì sao**
"Lịch" ngắn, đời thường, khớp với Google Calendar nơi các mục này thật sự nằm. "Kế hoạch" nghe nặng và dài hơn cho một mục 30 phút.

**Logic**
- Chỉ đổi chữ hiển thị. Tên cột "Kế hoạch" (đối với "Thực tế") trên timeline giữ nguyên vì là cặp so sánh.
- Test và SPEC sửa theo chữ mới.

---

## 2026-11-16 · Bỏ chữ "khối" khỏi giao diện · v68
**Đổi gì**
- Mọi chữ "khối" người dùng thấy hoặc trình đọc màn hình đọc ra đổi sang "kế hoạch" (hoặc "lịch" khi tự nhiên hơn):
  - Thẻ Bây giờ: "Không có kế hoạch nào lúc này."
  - Sheet sửa thói quen: "Đang xem lịch nhắc…", "Nhắc qua kế hoạch: …", "Chưa có kế hoạch nào trong Tuần mẫu…"
  - Sửa kế hoạch hôm nay: "Kế hoạch thêm riêng cho hôm nay.", toast "Đã đổi kế hoạch hôm nay"
  - Thẻ xác nhận AI: "…bỏ qua kế hoạch đang chạy."
  - Tuần mẫu: "…bấm vào kế hoạch ở trang Hôm nay.", "Đặt tên cho kế hoạch nhé.", "Đã điền lịch theo kế hoạch vừa lưu…"
  - aria-label "Tên kế hoạch", "Xoá kế hoạch này"; lỗi demo "Không thấy kế hoạch".

**Vì sao**
Tiếp theo đổi ở thẻ Rest day (v67): "khối" là từ nội bộ của người làm app, người dùng gọi là kế hoạch / lịch, khớp với cột "Kế hoạch" trên timeline.

**Logic**
- Chỉ đổi chữ hiển thị. Ghi chú trong code, tên test và tài liệu kỹ thuật vẫn dùng "khối" làm thuật ngữ nội bộ.
- Test `#hBlocks` và SPEC mục nhắc thói quen sửa theo chữ mới.

---

## 2026-11-16 · Thẻ Rest day: "khối" → "kế hoạch" · v67
**Đổi gì**
- Thẻ Rest day: "Nhắc nhở các khối khác đã tắt." → "Nhắc nhở các kế hoạch khác đã tắt."

**Vì sao**
"Khối" là từ nội bộ (khối thời gian trong lịch), người dùng không gọi vậy. "Kế hoạch" là thứ họ thấy trên timeline và hiểu ngay.

**Logic**
- Chỉ đổi chữ trong `app.js`, không đổi cách tắt nhắc nhở.

---

## 2026-11-16 · Số giờ đứng ngay sau tên · v66
**Đổi gì**
- Danh sách thời gian 2 cột (v65): số giờ không dồn mép phải nữa mà đứng ngay sau tên nhóm.

**Vì sao**
Số dồn mép phải cách tên quá xa, mắt phải nhảy ngang mới ghép được "Lướt" với "2h20", nên khó đọc.

**Logic**
- Bỏ `.sum__list b { margin-left: auto; }`. Vẫn giữ lưới 2 cột.
- Nâng cache lên v66: v65 đã có máy tải về, giữ v65 thì service worker vẫn trả `styles.css` cũ.

---

## 2026-11-16 · Tổng thời gian chia 2 cột · v65
**Đổi gì**
- Danh sách thời gian theo nhóm dưới thanh màu (Thời gian hôm nay) xếp thành 2 cột đều nhau. Số giờ đứng ngay sau tên.

**Vì sao**
Trước đó các mục xếp nối đuôi rồi tự xuống dòng, mỗi dòng dài ngắn khác nhau nên nhìn lộn xộn, khó so số. 2 cột thì mỗi mục bắt đầu ở cùng một mép, nhìn gọn. Số không cần thẳng hàng, để ngay sau tên cho dễ đọc liền.

**Logic**
- `.sum__list`: flex-wrap → grid `repeat(2, minmax(0, 1fr))`, gap 6px 24px. `li` thành flex, số nằm ngay sau tên (không dồn mép phải).
- Thứ tự giữ nguyên (nhiều → ít), chạy theo hàng: trái → phải rồi xuống.

---

## 2026-11-16 · Bỏ ngôi sao ở bảng Tuần · v64
**Đổi gì**
- Dòng đếm dưới tên thói quen ở bảng Tuần chỉ còn "1/1", bỏ ★ khi đủ cả tuần.

**Vì sao**
"1/1" đã nói là đủ, ★ lặp lại ý đó và chiếm chỗ trong cột tên vốn hẹp. Bảng cũng gọn, đều hơn khi hàng nào cũng chỉ một con số.

**Logic**
- Chỉ bỏ phần hiển thị trong `renderHabits()`. `weekCount()` vẫn trả `star` (test đang dùng, để dành nếu cần lại).

---

## 2026-11-16 · Khoảng cột bớt đi dồn cho tên · v63
**Đổi gì**
- Bảng Tuần: cột tên thói quen rộng tối thiểu 92px → 106px. Ô ngày giữ bề rộng như trước khi giảm gap (v61).

**Vì sao**
Giảm gap giữa cột (v61) là để tên có thêm chỗ, nhưng thực tế phần bớt đi lại chia hết cho 7 ô ngày làm ô rộng ra. Trên điện thoại cột tên luôn kẹt ở mức tối thiểu, nên phải nâng mức tối thiểu thì tên mới được thêm chỗ.

**Logic**
- Trên màn điện thoại (≤ ~430px) cột tên = mức tối thiểu, 7 ô ngày chia phần còn lại. Gap 4 → 2px bớt khoảng 14px, cộng đúng vào mức tối thiểu 92 + 14 = 106px, nên ô ngày gần như không đổi (360px: ~26px cả trước lẫn sau).
- Màn rộng: tỉ lệ `1.4fr` vẫn quyết định, không đổi.
- Thêm khoảng 1-2 ký tự cho tên trước khi bị cắt "…" (v62).

---

## 2026-11-16 · Tên ở bảng Tuần chỉ 1 dòng · v62
**Đổi gì**
- Tên thói quen ở bảng Tuần (trang Thói quen) chỉ hiện 1 dòng, dài quá thì cắt "…". Trước đó cho xuống tối đa 2 dòng.

**Vì sao**
Tên 2 dòng ("Tiếng Hàn / 10p", "Cất máy / 22:00") làm hàng cao không đều, bảng lổn nhổn và dài ra. 1 dòng thì mọi hàng cao bằng nhau, nhìn thẳng hơn. Tên đầy đủ vẫn xem được ở Hôm nay và trang Quản lý thói quen.

**Logic**
- `.wname span`: bỏ `-webkit-line-clamp: 2` và `overflow-wrap: anywhere`, thay bằng `white-space: nowrap; text-overflow: ellipsis`.
- Đánh đổi: cột tên rộng tối thiểu 92px nên tên dài hơn khoảng 9-10 ký tự sẽ bị cắt.

---

## 2026-11-16 · Bảng Tuần sát cột hơn · v61
**Đổi gì**
- Bảng Tuần (trang Thói quen): khoảng giữa các cột 4px → 2px. Khoảng giữa các hàng giữ nguyên 4px.

**Vì sao**
Ô ngày nằm rời nhau theo chiều ngang, hàng 7 ngày trông lỏng, khó đọc liền một tuần.

**Logic**
- Chỉ đổi `gap` của `.wgrid` (áp cho cả hàng tiêu đề T2…CN và hàng thói quen, nên cột vẫn thẳng). Ô ngày tự giãn ra lấp phần gap bớt đi, vì cột là `1fr`.
- Lịch tháng (`.mcal__row`, gap 3px) không đổi.
- Lúc đầu nhầm sang khoảng giữa các hàng, đã trả lại như cũ.

---

## 2026-11-16 · Bỏ chú thích màu ở tab Tháng · v60
**Đổi gì**
- Tab Tháng (trang Thói quen) không còn dòng chú thích "Đạt · Tối thiểu · Rest · Bỏ" dưới tên tháng. Tab Tuần vẫn giữ.

**Vì sao**
Ở Tháng, dòng này chiếm chỗ mà không thêm thông tin: mỗi thẻ thói quen đã có dòng đếm kèm chấm màu ("3 đạt · 1 tối thiểu · 2 bỏ"), tự làm chú thích luôn. Bỏ đi để thẻ đầu tiên lên cao hơn.

**Logic**
- Chỉ xoá `html += legend` ở nhánh tháng của `renderHabits()`. Biến `legend` và CSS `.legend` giữ cho Tuần.
- Test "Thói quen · Tháng" đổi: kiểm tra không có `.legend` và thẻ đầu nằm ngay dưới tiêu đề tháng.

---

## 2026-11-16 · Nút bút tròn, nhỏ hơn · v59
**Đổi gì**
- Nút bút nổi (`.fab`, mở ô viết nhanh) đổi từ ô vuông bo góc 56px sang hình tròn 48px. Icon bút 26px → 22px.

**Vì sao**
Ô vuông 56px to và nặng, che mất một phần timeline và hàng thói quen bên dưới. Hình tròn nhỏ hơn đọc ra là nút nổi phụ, không giành chú ý với nội dung.

**Logic**
- `border-radius: 50%`. Lớp ánh sáng chạy (`::after`) đã có `overflow: hidden` nên tự cắt theo hình tròn.
- 48px vẫn đủ vùng chạm tối thiểu (44px). Vị trí giữ nguyên: cách mép phải 16px, trên tab bar 14px.

---

## 2026-11-16 · Đổi màu Sinh hoạt ↔ Người thân · v58
**Đổi gì**
- Sinh hoạt: vàng (Banana) → hồng san hô (Flamingo, #D9685E).
- Người thân & bạn bè: hồng (Flamingo) → vàng (Banana, #E3AE1B).

**Vì sao**
Muốn Sinh hoạt mang màu hồng/cam thay cho vàng. Đổi chỗ với Người thân thay vì chọn màu mới vì Google Calendar chỉ có 11 màu và hai màu ấm hồng/cam đã dùng hết.

**Logic**
- Đổi `color` (colorId Google) và `hex` của `CATS.life` / `CATS.people`; cờ `lightInk` (chữ tối trên khối vàng) chuyển sang `people`.
- Biến `--life-ic` đổi tên thành `--yellow-ic`, `icVars` áp nó cho `people`.
- App đọc nhóm từ `extendedProperties.cat`, không đọc `colorId`, nên sự kiện cũ hiện đúng màu mới trong app. Trên Google Calendar, sự kiện cũ giữ màu cũ tới khi được sửa hoặc tạo lại từ app.

---

## 2026-11-16 · Mọi tiêu đề đậm 600 · v57
**Đổi gì**
- Mọi chữ dùng `--f-display` (Bricolage Grotesque) đổi từ đậm 700 xuống 600: tiêu đề mục `.h2`, tiêu đề sheet, trang con, thẻ Rest day, trang trống, tên tuần/tháng, số chuỗi, bộ chọn giờ, mục Nhật ký, logo cổng vào.
- Link Google Fonts chỉ tải Bricolage 600, bỏ 700.

**Vì sao**
Sau khi thử 600 cho tiêu đề lớn nhất (v55), các tiêu đề còn lại ở 700 trông nặng và lệch với tiêu đề lớn. Đưa hết về 600 cho đồng bộ, nhẹ mắt hơn, và chỉ còn một độ đậm cho font tiêu đề.

**Logic**
- Thay `font: 700 … var(--f-display)` → `600` ở 11 chỗ trong `styles.css`.
- `.streak2.is-on` bỏ `font-weight: 600` riêng vì giờ đã là mặc định.
- Bricolage chỉ còn 1 file font thay vì 2.
- Chữ đậm 700 của font chữ thường (Be Vietnam Pro, ví dụ `.dock__title`) không đổi.

---

## 2026-11-16 · Chip đã đạt / tối thiểu: icon giữ màu nhóm · v56
**Đổi gì**
- Chip Hôm nay khi Đạt hoặc Tối thiểu: icon không chuyển xanh nữa, giữ màu nhóm như lúc chưa làm.

**Vì sao**
Icon xanh lẫn vào nền chip xanh, mất màu nhóm vừa thêm ở v54. Trạng thái đã đủ rõ qua nền, viền và icon đặc.

**Logic**
- Bỏ 2 rule `.chip[data-st="full"|"min"] .chip__ic { color: var(--good) }`; icon đọc `var(--cat)` như mọi trạng thái.

---

## 2026-11-16 · Tiêu đề lớn nhất đậm 600 · v55
**Đổi gì**
- Tiêu đề cỡ `--fd-xl` (thẻ Bây giờ như "Ngày đã khép lại.", tiêu đề cổng vào) giảm từ đậm 700 xuống 600.
- Link Google Fonts tải thêm Bricolage Grotesque 600.

**Vì sao**
Ở 34px, Bricolage 700 trông nặng và dày, lấn các phần khác của thẻ. Chữ càng to càng thấy đậm, nên hạ một bậc ở cỡ lớn nhất cho nhẹ mắt mà vẫn là chữ nổi nhất màn hình.

**Logic**
- Chỉ đổi `.now__title` và `.gate__title`. Tiêu đề 22px và 16px giữ 700, vì ở cỡ nhỏ hơn 600 dễ mất độ nổi.
- `.now__title` cũng dùng cho "Ba dòng cho hôm nay." trong Nhật ký (cỡ `--fd-l` gắn inline), nên chữ đó cũng thành 600.
- Tải thêm một file font (600), vừa bỏ 500 ở v53 nên tổng số file không đổi.

---

## 2026-11-16 · Icon thói quen tô màu theo nhóm ở mọi chỗ · v54
**Đổi gì**
- Biểu tượng thói quen mang màu nhóm ở: chip Hôm nay (cả lúc chưa làm lẫn đã đạt / tối thiểu), thẻ thói quen bên Tiến độ, danh sách Quản lý, hàng sửa ngày, danh sách Rest day, nút chọn thói quen khi AI đọc Nhật ký, badge trong sheet sửa kế hoạch. Bảng Tuần vốn đã tô màu.
- Giữ nguyên: bộ chọn biểu tượng (màu trung tính); thói quen đã ngừng vẫn mờ.

**Vì sao**
Trước chỉ bảng Tuần có màu, chỗ khác xám, nên cùng một thói quen trông như hai thứ khác nhau. Màu nhóm giúp nhận ra thói quen nhanh hơn chữ.
Bộ chọn biểu tượng là chỗ chọn hình, không phải chỗ nhận diện. Chip đã đạt / tối thiểu ban đầu để icon xanh theo trạng thái, nhưng thử thấy icon xanh lẫn vào nền xanh và mất màu nhóm; trạng thái đã đủ rõ qua nền chip, viền và icon đặc, nên icon giữ màu nhóm.

**Logic**
- Bỏ 2 rule `.chip[data-st="full"|"min"] .chip__ic { color: var(--good) }`.
- Hàm `icVars(cat)` gắn `--cat` lên `<i>`; CSS dùng `var(--cat, var(--ink-soft))` để thiếu nhóm thì về xám như cũ. Thêm class `.hic` cho 3 chỗ chưa có rule màu icon.
- Vàng Sinh hoạt #E3AE1B chỉ ~2:1 trên nền sáng: thêm `--life-ic` (#A87D0B ở theme sáng, giữ #E3AE1B ở theme tối).
- Đánh đổi: Giải trí (cam) và Người thân (đỏ hồng) hơi gần màu lửa 🔥 và màu cảnh báo; chấp nhận vì icon luôn đi kèm tên.

---

## 2026-11-16 · Gộp cỡ chữ 11px vào 12px, dọn hệ chữ · v53
**Đổi gì**
- Bỏ bậc `--fs-xs` (11px). Nhãn tab bar, hàng thứ lịch tháng, chữ nhỏ dưới số chuỗi và dưới tên bảng Tuần lên 12px (`--fs-s`).
- Chữ thường giờ còn 3 bậc: 15 / 13 / 12px.
- Số trong bộ chọn giờ (`.tp__it`, `.tp__colon`) dùng token `--fd-l` thay cho 22px viết cứng. Cỡ không đổi.
- Link Google Fonts chỉ tải Bricolage Grotesque độ đậm 700, bỏ 500.

**Vì sao**
11px và 12px gần như không phân biệt được bằng mắt, nên không tạo thứ bậc mà chỉ thêm một token phải nhớ. Ở 11px, dấu tiếng Việt chồng (ệ, ở, ữ) dễ dính nhau, nhất là với chữ màu nhạt, mà phần lớn chữ 11px lại đang dùng màu nhạt. Gộp lên 12px thay vì xuống 11px để không làm khó đọc giờ timeline, số ngày, badge.

**Logic**
- Thay `var(--fs-xs)` → `var(--fs-s)` ở 4 chỗ: `.wname small`, `.streak small`, `.mcal__row--head span`, `.tab`. Xoá biến khỏi `:root`.
- Bộ chọn giờ: vẫn font chữ thường (`--f-text`, số tabular), chỉ mượn cỡ của `--fd-l` để đổi cỡ tiêu đề thì số giờ đổi theo. Ngoài icon, còn đúng một cỡ viết cứng là logo 40px.
- Bricolage 500: không chỗ nào dùng, mọi `--f-display` đều 700. Bỏ đi thì tải ít hơn một file font.
- Đánh đổi: các chỗ hẹp rộng thêm khoảng 1px mỗi chữ. Nhãn tab và "T2…CN" ngắn nên vẫn vừa ở 360px.

---

## 2026-11-16 · Ngọn lửa chuỗi màu đỏ · v52
**Đổi gì**
- Icon lửa cạnh số chuỗi (thẻ thói quen và chuỗi lớn) đổi từ vàng `--accent` sang đỏ cam `--fire`.

**Vì sao**
Lửa vàng nhạt trông như icon giọt nước/đồng xu, không ra "lửa". Đỏ cam đọc ra ngay là chuỗi đang cháy, và tách khỏi vàng accent dùng cho nút/nhấn khác.

**Logic**
- Thêm biến `--fire` ở `:root` (#E0452B) và theme tối (#FF5A3C, sáng hơn để nổi trên nền đen). Chỉ dùng cho icon lửa, kể cả quầng sáng nhấp nháy `glint` (trước sáng vàng).
- Chuỗi = 0 vẫn icon viền, màu vẫn đỏ; số giữ màu `--ink-faint` như cũ.

---

## 2026-11-16 · Thời lượng ghi "2h20" thay vì "2g20"
**Đổi gì**
- Tổng thời gian theo nhóm (dưới timeline Hôm nay): "2g20" → "2h20", "1g" → "1h". Dưới 1 giờ vẫn "45p".

**Vì sao**
"g" cho giờ không phải cách viết quen; "h" đọc ra ngay. Giữ dạng gọn (không viết "phút") cho hàng tổng ngắn, dễ quét.

**Logic**
- `fmtDur(m)`: < 60 → `Np`; tròn giờ → `Nh`; còn lại → `NhMM` (phút 2 chữ số).

---

## 2026-11-16 · Cỡ tiêu đề: gom 10 cỡ về 3 · v51
**Đổi gì**
- Tiêu đề chỉ còn 34 / 22 / 16px (trước có 34, 28, 26, 24, 22, 20, 18, 16). Logo "Still life" ở cổng vào giữ 40px.
  - 34px: thẻ Bây giờ, tiêu đề cổng vào (trước 28).
  - 22px: "Ba dòng cho hôm nay." (trước 28; 34 thì xuống 2 dòng to, lấn form), tiêu đề sheet, trang con, thẻ Rest day (trước 24), trang trống (trước 26), số chuỗi 🔥 (trước 26).
  - 22px cả tiêu đề mục `.h2` như "Thói quen hôm nay", "Thời gian hôm nay" (trước 20; 16 thì chìm, không còn tách được các mục của trang).
  - 16px: tên tuần/tháng (trước 20), bộ chọn giờ (trước 20), chuỗi phụ (trước 18), mục khi đọc Nhật ký.
- 3 dòng ghi chú trong HTML đang viết cứng `font-size:13px` chuyển sang `var(--fs-m)`.

**Vì sao**
Nối tiếp v50: các cỡ cách nhau 2px (18/20, 22/24/26) mắt không phân biệt được là hai bậc, chỉ thấy lệch. Ba bậc cách xa nhau thì mỗi bậc có vai trò rõ:
chữ chính của màn, tiêu đề khung, tiêu đề mục.

**Logic**
- Biến `--fd-xl`, `--fd-l`, `--fd-m` trong `:root`, thay mọi `font: … Npx … var(--f-display)` trong `styles.css`.
- Tiêu đề mục 16px vẫn nổi hơn chữ chính 15px nhờ font tiêu đề, đậm 700 và khoảng cách trên 36px.

---

## 2026-11-16 · Nhật ký: bỏ dòng ngày trên tiêu đề
**Đổi gì**
- Form Nhật ký bỏ dòng "🌙 Thứ Hai, 16/11/2026 · trước khi ngủ" phía trên "Ba dòng cho hôm nay.".
- Bỏ dòng "Lưu vào Google Drive (Still life › Nhật ký), mỗi ngày một trang." dưới nút Lưu. Dòng báo "Hôm nay đã có trang…" (khi lưu sẽ nối vào trang cũ) vẫn giữ, vì nó nói điều người dùng cần biết trước khi bấm.

**Vì sao**
Đầu trang đã ghi "Buổi tối · Thứ Hai, 16/11/2026", nên ngày bị lặp hai lần sát nhau. Tiêu đề "Ba dòng cho hôm nay." đã đủ nói đây là trang của hôm nay.

**Logic**
- `drawJournal()` bỏ `<p class="now__label">`; tiêu đề đặt `margin-top: 0` để không hở khoảng trên.

---

## 2026-11-16 · Cỡ chữ: gom về 4 bậc, ô nhập và dropdown nhỏ lại · v50
**Đổi gì**
- Chữ trong ô nhập, dropdown, ô soạn câu và chữ chính của app: 16px → 15px.
- Mọi chữ thường trong app chỉ còn 4 cỡ: 15 / 13 / 12 / 11px (trước có 10, 11, 12, 12.5, 13, 14, 15, 16).
  14px (chữ phụ, toast, dòng "Tiếp theo", danh sách Nhật ký…) → 13px. 12.5 → 12. 10 → 11.
- Tiêu đề lớn và cỡ icon giữ nguyên.

**Vì sao**
Trong một sheet có tới 5 cỡ chữ đứng cạnh nhau (tiêu đề ô 13, giá trị trong ô 16, chú thích 12, nút 15, ghi chú 14), nhìn lộn xộn
và chữ trong ô nhập to hơn hẳn mọi thứ xung quanh. Ít bậc hơn thì mắt đọc ra thứ bậc ngay: tiêu đề ô / giá trị / chú thích.

**Logic**
- Biến `--fs-b`, `--fs-m`, `--fs-s`, `--fs-xs` trong `:root`. Thay hết `font-size` / `font:` px của chữ thường bằng biến theo bảng trên;
  bỏ qua selector của icon (`… i`, nút `.seg`) và tiêu đề `--f-display`.
- Ô nhập 15px vẫn cao ≥ 44px nhờ padding. Đánh đổi: Safari trên iPhone tự phóng to khi chạm vào ô có chữ < 16px.
  App đang dùng chủ yếu trên Android nên chấp nhận; nếu sau này dùng iPhone thì cân nhắc `maximum-scale=1` (đánh đổi: chặn phóng to bằng hai ngón).

---

## 2026-11-16 · Sheet kế hoạch: "Vẫn nhắc khi rest day" thành công tắc · v49
**Đổi gì**
- Checkbox "Vẫn giữ khi rest day" + mô tả đổi thành một dòng: "Vẫn nhắc khi rest day", công tắc sát lề phải, nằm ngay dưới ô Nhắc, chữ cùng cỡ và màu với tiêu đề ô (13px, `--ink-soft`). Bỏ mô tả và emoji 💤. Nhắc là "Không nhắc" thì ẩn dòng này (không có nhắc thì không có gì để giữ); giá trị đã chọn vẫn được giữ, chọn lại có nhắc là hiện lại đúng như cũ.
- Bỏ dòng "Google Calendar trên điện thoại sẽ báo theo giờ này." dưới ô Nhắc.
- Ô "Gắn thói quen" + dòng "Bấm Đã làm ở khối này thì thói quen được đánh dấu đạt." gộp thành một tiêu đề: "Làm xong thì đạt thói quen".
- Nút full-width (`.btn--block`) cho chữ xuống dòng; nút "Lưu & đổi lịch thói quen" rút gọn nhãn.

**Vì sao**
Checkbox to, chữ đậm, mô tả hai dòng và emoji nằm lệch khỏi nhịp của form, trông như chèn tạm vào. Với người dùng, tác dụng thấy được
là "rest day vẫn được nhắc", nên tên ô nói thẳng điều đó và không cần mô tả. Công tắc bên phải là kiểu quen thuộc cho bật/tắt trên điện thoại.

**Logic**
- `.switchrow` (label bọc chữ + `input.switch`), một dòng cao 44px, cả hàng bấm được. `.switchrow .switch` vẽ công tắc bằng `appearance: none` + `::after`,
  selector 2 class để thắng `.field input` (vốn cho input rộng 100%, có viền, padding).
- Xoá `.check` vì không còn chỗ nào dùng. `#tEss` vẫn là checkbox nên đọc `checked` như cũ.

---

## 2026-11-16 · Timeline: thêm khoảng trống dưới cùng · v47
**Đổi gì**
- Timeline Hôm nay và Tuần mẫu có thêm 24px trống dưới vạch 23:00.

**Vì sao**
Nhãn 23:00 và khối cuối ngày nằm sát mép dưới thẻ, trông như bị cắt, và khó bấm chỗ trống cuối ngày.

**Logic**
- `tlFrame()` trả thêm `bodyPad` (`PAD` trên, `PAD + 24` dưới), hai timeline dùng chung. Toạ độ giờ vẫn tính từ mép trên nên bấm chỗ trống ra đúng giờ.

---

## 2026-11-16 · Trang Tuần mẫu: sửa lịch lặp hằng tuần ngay trong app · v46
**Đổi gì**
- Tiêu đề "Thời gian hôm nay" có thêm icon bút (bên trái icon lịch), mở trang con **Tuần mẫu**: chip T2…CN (chọn sẵn thứ của ngày mai) và timeline của thứ đó.
- Bấm khối để sửa, bấm chỗ trống để thêm khối lặp (không ghi chú thích dưới timeline: thao tác này đã quen từ timeline Hôm nay). Sheet tên "Sửa kế hoạch" / "Thêm kế hoạch", không dùng chữ "khối lặp" (từ kỹ thuật, người dùng gọi là kế hoạch). Ô: Tên, Nhóm, Giờ, Lặp vào các thứ, Gắn thói quen, Vẫn giữ khi rest day, Nhắc. Xoá khối = ngừng lặp. Lưu và xoá đều có hoàn tác.
- Mọi thay đổi **áp dụng từ ngày mai**. Hôm nay và quá khứ giữ nguyên.
- Ngày lặp lệch lịch thói quen đã gắn thì báo một dòng, kèm nút "Lưu & đổi lịch thói quen" (mở Sửa thói quen điền sẵn, không tự lưu). Nút full-width (`.btn--block`) cho chữ xuống dòng, không tràn.
- Sheet Sửa thói quen có dòng "Nhắc qua khối: …" hoặc "Chưa có khối nào…, nên sẽ không có nhắc".
- Nhắc của mỗi khối được ghi vào sự kiện (`rem`), để rest day bật / tắt nhắc đúng cho cả khối tự thêm.

**Vì sao**
Muốn đổi nhịp sinh hoạt lâu dài (giờ lớp, ngày tập) thì trước đây phải mở Google Calendar, còn trong app chỉ sửa được cho hôm nay.
Chốt qua buổi grill:
- Chỉ sửa tuần mẫu. Sửa riêng một ngày khác thì để sau.
- Không có ô chọn ngày, luôn tính từ mai, cho đơn giản. Đổi từ hôm nay thì có thể làm mất liên kết Đã làm / Bỏ qua / 💤 của khối hôm nay.
- Khối và thói quen giữ độc lập, chỉ nhắc khi lệch. Đồng bộ tự động sẽ làm hỏng các trường hợp như Gym 2 lần/tuần nhưng khối cố định T3, T7, và đổi lịch thói quen kéo theo chuỗi.
- Nhắc nằm ở khối vì app không có máy chủ: thông báo do Google Calendar gửi theo giờ của khối, còn thói quen thì không có giờ.

**Logic**
- `tplApply(old, N)`: chuỗi đã có lần lặp tới hôm nay thì đặt `UNTIL` = hôm nay rồi tạo chuỗi mới từ mai. Chuỗi bắt đầu từ mai trở đi (vừa tạo hôm nay) thì sửa / xoá thẳng, nên sửa nhiều lần trong một ngày vẫn chỉ ra một bản. Tạo chuỗi mới lỗi thì nối lại chuỗi cũ.
- `evToSeries` đọc sự kiện gốc (`singleEvents=false`), chỉ nhận WEEKLY / DAILY không COUNT. `withUntil` thay UNTIL và giữ EXDATE.
- `evToItem`: thuộc tính có ghi trong sự kiện thắng `TPL` (trước đây `ess`, `habit` rỗng bị `TPL` ghi đè, nên không bỏ được).
- `mutePlan(false)` khôi phục nhắc theo `it.rem` thay vì `TPL[key].rem`.
- Timeline tách `tlFrame` / `laneStyle` dùng chung. Demo chuyển từ `TEMPLATE` cố định sang `db.tpl` sửa được.
- Test: chuyển đổi chuỗi, UNTIL, luật cắt / sửa thẳng / xoá / hoàn tác, câu báo lệch lịch, luồng màn hình (152 test).

---

## 2026-11-16 · Bỏ "Tên ngắn", tên thói quen tối đa 15 ký tự · v45
**Đổi gì**
- Form thói quen bỏ ô **Tên ngắn** và dòng giải thích dưới ô Nhóm ("Để tô màu và xếp thói quen theo nhóm."). Ô **Tên** giới hạn 15 ký tự, dùng cho mọi chỗ (Hôm nay, sheet một ngày, bảng Tuần, Quản lý).
- Bảng Tuần: tên xuống tối đa 2 dòng rồi mới cắt "…", thay vì 1 dòng.
- Gemini (Nhờ AI điền) không trả `short` nữa; tên AI đưa được cắt còn 15 ký tự.
- Bộ mẫu: "Tiếng Hàn 10 phút" → "Tiếng Hàn 10p", "Cất điện thoại 22:00" → "Cất máy 22:00" cho vừa giới hạn.

**Vì sao**
Hai ô tên cho một thói quen là thêm việc phải nghĩ mà ít người cần: phần lớn tên đã ngắn, và người dùng thấy hai tên khác nhau ở hai màn hình.
Giới hạn tên ngay từ đầu thì một tên vừa mọi chỗ. 15 ký tự giữ tên gọn như một nhãn, vừa 2 dòng ở cột tên bảng Tuần; chi tiết (giờ, số phút) đã có ở "Thế nào là đạt".

**Logic**
- `NAME_MAX = 15`: `maxlength` của `#hName`, mô tả trong schema Gemini, `fillHabForm` cắt theo nó.
- `normHabit` xoá `short` của dữ liệu cũ; bảng Tuần hiện `name`. Tên cũ dài hơn 15 không bị cắt trong dữ liệu (không tự đổi dữ liệu của người dùng); lần sửa tới ô Tên sẽ giữ giới hạn.
- `.wname span`: `-webkit-line-clamp: 2` thay cho `nowrap` + ellipsis.
- Test: bộ mẫu không có `short`, tên ≤ 15; form không còn `#hShort`; ô Tên có `maxlength`.

---

## 2026-11-16 · Sheet một ngày: đổi liền, có trạng thái đang lưu, hiện bản tối thiểu · v44
**Đổi gì**
- Bấm Chưa / Tối thiểu / Đạt trong sheet một ngày: nút đổi ngay, icon thói quen bên trái quay vòng tới khi lưu xong lên Lịch.
- Dưới tên thói quen hiện "Tối thiểu: …" nếu thói quen có bản tối thiểu.
- 3 nút trạng thái nhỏ lại (44 → 34px, khoảng cách 3px), tên thói quen có thêm ~30px, ít bị xuống dòng.

**Vì sao**
Trước đây bấm xong phải đợi Google Calendar trả lời (có khi cả giây) mới thấy đổi, không có dấu hiệu gì nên tưởng bấm không ăn.
Bấm thêm lần nữa trong lúc đó còn có thể tạo hai sự kiện cho cùng một ngày (lần thứ hai chưa biết `id` của lần đầu).
Bản tối thiểu cần thấy ngay lúc chọn nút ½, không phải nhớ.

**Logic**
- `queueHabit()` xếp mọi lần ghi thói quen (sheet một ngày và chip Hôm nay) vào một hàng đợi `habQ`, chạy lần lượt; lần cuối thắng.
- Sheet: đổi `aria-pressed` của cả hàng ngay khi bấm, `data-saving` đếm số lần đang lưu, về 0 mới trả icon. Không vẽ lại sheet khi lưu thành công
  (tránh nhảy cuộn); lỗi thì vẽ lại theo dữ liệu thật để không hiển thị sai.
- Nút 34px nhỏ hơn mức 44px khuyến nghị, đổi lấy chỗ cho tên; 3 nút cách nhau 3px, vẫn bấm được bằng ngón tay trên màn nhỏ.
- Test: đổi liền, đang lưu, bấm hai lần liên tiếp, hiện / không hiện bản tối thiểu.

---

## 2026-11-16 · Chip thói quen không đổi chỗ khi đã đạt · v43
**Đổi gì**
- Hôm nay: chip thói quen giữ nguyên vị trí khi đánh dấu đạt, tối thiểu hay rest. Thứ tự luôn là thứ tự nhóm, giống bảng Tuần và trang Quản lý.

**Vì sao**
Trước đây chip chưa làm được đẩy lên đầu, chip đã đạt tụt xuống cuối. Chạm xong thì chip nhảy đi chỗ khác, dễ chạm nhầm chip vừa trượt vào chỗ cũ
và mất cảm giác "danh sách của mình". Màu và icon đầy đã đủ cho biết cái nào xong, số "còn N" ở tiêu đề cho biết còn bao nhiêu.

**Logic**
- `renderToday()` bỏ `ORDER` và `.sort` theo trạng thái, giữ thứ tự `HABITS` (nhóm trong `CATS`, trong nhóm theo `ALLH`).
- Test: đánh dấu đạt / tối thiểu, thứ tự chip không đổi.

---

## 2026-11-16 · Rest day chỉ giữ thói quen có tối thiểu · bộ thói quen mẫu chỉ cho xem thử · v42
**Đổi gì**
- Rest day: chỉ hiện thói quen có **Tối thiểu** (chip ghi luôn bản tối thiểu). Thói quen không có tối thiểu hoặc loại số lần/tuần thì ẩn hôm đó, trừ khi đã đánh dấu. Tiêu đề ghi "rest day" thay vì "xong".
- Thẻ Rest day không còn 5 dòng viết cứng (bỏ "Ngủ thêm, dậy lúc nào cũng được"): liệt kê các thói quen còn hiện mà chưa làm, kèm bản tối thiểu; không còn gì thì "Hôm nay nghỉ ngơi là đủ."
- `DEFAULT_HABITS` đổi tên thành `SAMPLE_HABITS`, chỉ là dữ liệu của chế độ xem thử. Tài khoản mới dựng lịch bắt đầu với danh sách trống.
- Prompt Gemini bỏ ví dụ gắn với id mẫu (yoga, korean); luật riêng về bữa ăn chỉ gửi khi có thói quen `eat`.

**Vì sao**
QA thấy rest day báo "xong" và đánh mọi thói quen là "nghỉ", trong khi thẻ vẫn bảo ăn đủ 3 bữa, cất điện thoại. Rest day đúng nghĩa là "chỉ làm bản tối thiểu",
nên thói quen không có tối thiểu thì không có gì để làm hôm đó. Thẻ viết cứng theo bộ mặc định thì lệch ngay khi người dùng sửa danh sách,
và giờ danh sách là của người dùng nên app không nên tự cài sẵn bộ của một người cụ thể.

**Logic**
- `restHabits(d)`: có `min`, có lịch ngày `d`, đã bắt đầu, lịch ngày đó không phải `weekly` (tối thiểu "N lần/tuần" là theo tuần). Trạng thái `rest` giữ nguyên: không tính, không gãy chuỗi.
- `loadLocalHabits()`: bản đã lưu → xem thử thì `SAMPLE_HABITS` → tài khoản thật thì `[]`. Ngoại lệ cấu hình cũ (`legacyCfg()`: có lịch, file cấu hình chưa có `habits`):
  dùng `SAMPLE_HABITS` như trước, và `refresh()` ghi danh sách đó lên Drive một lần, nên lịch sử dùng id cũ (eat, walk, …) không bị mất. `Google.setup()` ghi `habits: []`.
  `adoptCfg()` lấy luôn `habits` của cấu hình tìm được, máy thứ hai không thấy bộ mẫu chớp qua.
- Còn gắn với id mẫu (để sau): luật số bước của `walk`, liên kết khối tuần mẫu → thói quen trong `TEMPLATE`, bộ đọc câu của chế độ xem thử. Với thói quen người dùng tự tạo (id mới) các luật này không áp dụng.
- Test: rest day (chip, thẻ, tiêu đề, không còn tối thiểu), nguồn danh sách theo từng trường hợp. Hàm test `withState` gọi lại `loadLocalHabits()` khi trả về chế độ xem thử, giống `refresh()` trong app.

---

## 2026-11-16 · Sửa: ↺ trả lại thói quen · v41
**Đổi gì**
- Bấm Đã làm ở khối có thói quen (vd Nhật ký & tổng kết) rồi bấm nút ↺ trên thẻ: trước đây chỉ xoá việc đã ghi, thói quen vẫn "đạt". Giờ thói quen trở về mức trước khi bấm, giống Hoàn tác trên toast.

**Vì sao**
Tìm ra khi QA bằng Playwright. ↺ để lại thói quen đạt sai, làm lệch bảng Tuần và chuỗi.

**Logic**
- `markBlock` lưu mức thói quen trước đó vào sự kiện việc đã làm (`private.hprev`, `none` nếu chưa có), nên ↺ trả đúng kể cả sau khi mở lại app. `updateActual` giữ nguyên trường này.
- `unmarkBlock` (dùng cho cả ↺ và Hoàn tác trên toast) chỉ trả lại khi thói quen vẫn là `full`; bạn đã tự đổi sang tối thiểu sau đó thì giữ lựa chọn của bạn. Việc ghi trước bản này không có `hprev` nên ↺ không đụng thói quen.
- Test mới trong `tests/tests.js`: ↺ với mức trước rỗng / tối thiểu, sau khi tải lại, người dùng tự đổi, hoàn tác trên toast.

---

## 2026-11-16 · Nhờ AI điền / sửa thói quen · v40
**Đổi gì**
Sheet Thêm / Sửa thói quen có nút **Nhờ AI điền** (thêm mới) hoặc **Nhờ AI sửa** (đang sửa) ở đầu form. Bấm vào mở popup nhập
từ dưới lên, giống popup ghi việc ở Hôm nay (có micro). Kể bằng lời rồi gửi: popup đóng,
Gemini điền tên, tên ngắn, nhóm, biểu tượng, lịch, Thế nào là đạt, Tối thiểu. Ô nào đổi thì nháy nhẹ; dưới nút có 1 câu nói AI đã làm gì.
AI không tự lưu: xem lại, chỉnh, rồi bấm Lưu như bình thường.
Ô "Bản tối thiểu" đổi tên thành **Tối thiểu** (gọn hơn, khớp với nhãn "Tối thiểu" ở chú thích lịch và nút ½).

**Vì sao**
Form có 9–10 ô; nghĩ ra "Thế nào là đạt" đủ rõ để AI chấm và một bản tối thiểu đủ nhỏ là phần khó nhất.
Nói một câu tự nhiên rồi chỉnh lại nhanh hơn điền từng ô, nhất là khi chỉ muốn đổi một chi tiết ("đổi thành 3 buổi mỗi tuần").

Bản đầu (chưa phát hành) đặt ô nhập ngay trong form: ô quá chật, chữ gợi ý bị cắt, đẩy các ô khác xuống. Nên đổi thành 1 nút + popup.

**Logic**
- Popup dùng lại `#dock` (không làm thêm một ô nhập thứ hai): cùng cách nhập, cùng micro. `#dock` đã có z-index cao hơn sheet nên nằm đè lên form.
  Chữ đang gõ dở ở ô Hôm nay được cất và trả lại khi đóng popup, nên hai việc không lẫn vào nhau.
- Tách `geminiJSON(prompt, schema, temperature)` từ `callGemini` để hai luồng dùng chung việc thử model dự phòng và báo lỗi key (`needKey` → nút Mở Cài đặt).
- Schema giới hạn `icon` trong `HICONS` và `cat` trong các nhóm trừ "Lướt vô thức", nên AI không chọn được thứ form không hiện.
- Khi sửa (hoặc form thêm mới đã có tên) prompt gửi kèm các ô hiện tại và dặn chỉ đổi phần được nhờ, nên nhờ AI nhiều lần liên tiếp được.
- AI chỉ điền form, không ghi Drive: kết quả vẫn qua `readHabForm` → `applySched`, nên đổi lịch qua AI cũng giữ đúng luật "không đổi quá khứ".
  Ô ngày áp dụng không bị AI đụng tới vì đó là quyết định của người dùng.
- `fillHabForm` kẹp mọi giá trị (độ dài, ngày 0..6, số lần 1..7, tối thiểu ≤ mục tiêu); giá trị lạ thì giữ ô cũ thay vì báo lỗi.
- Chưa có Gemini key thì không hiện nút: bấm vào mà không dùng được chỉ gây rối. Bỏ luôn bộ đoán đơn giản cho chế độ xem thử.
- Đánh đổi: thêm một lượt gọi Gemini (dùng chung quota free).

---

## 2026-11-16 · Đổi tên "Unwell day" thành "Rest day" · v39
**Đổi gì**
Mọi chữ người dùng thấy: thẻ ở Hôm nay, toast, chú thích lịch thói quen (Rest), lời hỏi thăm sau 3 ngày, gợi ý sau câu nhập,
và tên sự kiện cả ngày trên Calendar ("Thói quen · d/m · rest day").

**Vì sao**
"Unwell" nghe tiêu cực, như đang bị ốm. "Rest" nói đúng ý: hôm nay chọn nghỉ, nhẹ lại, không phải thất bại.

**Logic**
Chỉ đổi chữ hiển thị. Tên trong code và dữ liệu vẫn là `unwell` (`rec.unwell`, `setUnwell`, `private.unwell`, class CSS),
nên bản ghi cũ đọc vẫn đúng, không cần chuyển dữ liệu. Sự kiện Calendar của những ngày cũ giữ tên "unwell day" cho tới khi được lưu lại.
Nút "Hôm nay mình không ổn" giữ nguyên vì là lời người dùng tự nói.

## 2026-11-16 · Ô giờ chỉ còn icon đồng hồ, chữ ô ngày cùng màu, chọn biểu tượng gọn hơn, gộp ô Ghi chú cho AI · v37
**Đổi gì**
1. Ô chọn giờ (thêm/sửa việc đã làm, kế hoạch) trên điện thoại chỉ hiện icon đồng hồ; bỏ mũi tên ▾ bị chồng lên.
2. Chữ trong ô ngày (Thêm việc đã làm) cùng màu với các ô khác, không còn xám nhạt.
3. Sheet Thêm / Sửa thói quen: ô Biểu tượng là một hàng vuốt ngang thay cho lưới 4 hàng; biểu tượng đang chọn đứng đầu.
4. Sheet Thêm / Sửa thói quen còn 2 ô mức đạt: **Thế nào là đạt** (ô nhiều dòng, Gemini đọc) và **Bản tối thiểu**. Bỏ ô Ghi chú cho AI.

**Vì sao**
- Trên Chrome Android, ô `type=time` có giao diện mặc định giống select, tự vẽ mũi tên ▾ ở bên phải, đúng chỗ icon đồng hồ app vẽ lại.
- Ô ngày đã điền mà chữ nhạt trông như placeholder chưa điền.
- Lưới 28 biểu tượng chiếm gần nửa màn hình, đẩy các ô quan trọng hơn (Lịch, Thế nào là đạt) xuống dưới.
- "Thế nào là đạt" chỉ để gửi AI, và bị bỏ qua khi đã điền Ghi chú cho AI: hai ô làm cùng một việc nên dễ điền trùng hoặc lệch nhau.
  Bản tối thiểu giữ riêng vì app dùng nó (nút ½ ở Hôm nay, nhãn, thống kê "x tối thiểu").

**Logic**
Thêm `appearance: none` cho `input[type=time]:read-only` để tắt giao diện mặc định, chỉ giữ icon đồng hồ vẽ bằng `background-image`.
Căn chữ giờ sang trái (`::-webkit-date-and-time-value`) vì khi tắt giao diện mặc định, iOS sẽ căn giữa.
`.act__date` dùng màu nhạt cho nhãn "Hôm nay", và input kế thừa màu đó (`input { color: inherit }`), nên đặt lại `color: var(--ink)` cho input.
`.iconpick` đổi từ grid sang flex `overflow-x: auto`, ẩn thanh cuộn, mép phải mờ (mask) để thấy còn biểu tượng phía sau. Mỗi nút vẫn 44px để dễ chạm.
Đưa icon đang chọn lên đầu mảng khi render nên luôn thấy ngay, không cần code cuộn tới nó; đánh đổi là thứ tự không cố định giữa các lần mở.
`aiRule()` luôn ghép `full: <Thế nào là đạt>. min: <Bản tối thiểu>.`; nếu ô đạt đã tự ghi `full:`/`min:` thì không thêm lần nữa.
Thói quen cũ có `rule`: `normHabit()` chuyển nguyên văn `rule` (bỏ nhãn `full: ` ở đầu) vào `full` rồi xoá `rule`, nên câu luật gửi Gemini giống hệt trước, không mất chữ nào.
Đánh đổi: thói quen cũ hiện cả phần `min: …` trong ô đạt; xoá đi thì AI dùng Bản tối thiểu. Thói quen mặc định đổi theo cùng cách.
Bản app cũ trên máy khác đọc `full` khi thiếu `rule`, nên vẫn chạy đúng.

---

## 2026-11-16 · Trang Quản lý thói quen, lịch đổi theo ngày, nhóm thói quen · v36
**Đổi gì**
1. Tab Thói quen có nút thanh trượt cạnh Tuần/Tháng, mở trang **Quản lý thói quen**: danh sách gom theo nhóm, ↑ ↓ đổi thứ tự trong nhóm,
   Thêm thói quen, mục Đã ngừng. Sheet Thêm / Sửa: tên, tên ngắn, nhóm, biểu tượng, lịch (Mỗi ngày · Ngày cố định · Số lần/tuần),
   ngày áp dụng, mức đạt, bản tối thiểu, ghi chú cho AI; Ngừng theo dõi / Theo dõi lại / Xoá hẳn, đều có hoàn tác.
2. Đổi lịch chọn được ngày **áp dụng từ** (hôm nay hoặc tương lai); những ngày trước giữ lịch cũ. Thói quen mới chọn được ngày bắt đầu.
3. Thói quen có **nhóm** (7 nhóm thời gian). Hôm nay và bảng Tuần xếp theo nhóm; bảng Tuần tô màu biểu tượng theo nhóm.
4. Danh sách thói quen lưu trong máy và trong `still-life-config.json` trên Drive.
5. Sheet sửa một ngày hiện cả thói quen số lần/tuần vào ngày ngoài ngày gợi ý.
6. Thói quen số lần/tuần đặt tối thiểu 0 không còn làm chuỗi tăng mãi: phải có ít nhất 1 lần trong tuần.
7. Service worker tải file với `cache: "no-cache"`.

**Vì sao**
- Danh sách thói quen nằm cứng trong code: muốn thêm Thiền (đã hẹn ở Bản 2), đổi Yoga sang mỗi ngày, hay bớt một thói quen quá sức
  đều phải sửa `app.js`. Thói quen nên được chỉnh theo sức của mình, ngay trên điện thoại.
- Trạng thái Bỏ, nghỉ, x/y và chuỗi không được lưu mà tính từ lịch mỗi lần hiện. Nếu đổi lịch mà áp cho cả quá khứ thì
  ngày cũ đang "nghỉ" thành "Bỏ" (hoặc ngược lại), chuỗi gãy vì một quyết định của hôm nay. Bạn muốn kết quả cũ giữ nguyên,
  và chỉ cho chọn ngày áp dụng từ hôm nay trở đi để không sửa lại quá khứ.
- Nhóm giúp nhìn danh sách gọn hơn, cùng màu với timeline. Chấm màu ở Hôm nay bị bỏ vì thừa (đã có màu Đạt/Tối thiểu).
- Lưu trên Drive để máy thứ hai thấy cùng danh sách, giống Gemini key.
- Bản cũ vẫn hiện sau khi cập nhật ở localhost vì trình duyệt dùng bộ nhớ HTTP dù service worker là network-first.

**Logic**
- `HABITS` từ hằng số thành biến; `ALLH` giữ mọi thói quen kể cả đã ngừng, `H` gồm cả đã ngừng để đọc lịch sử.
  Thói quen đã ngừng không vào Hôm nay, bảng, chuỗi, prompt Gemini, và bấm "Đã làm" ở khối kế hoạch gắn với nó không đánh dấu.
- Lịch theo thời gian lưu dạng `prev: [{ until, ...lịch }]` (lịch cũ) + lịch ngoài cùng. Chọn mốc kết thúc (`until`) thay vì mốc bắt đầu
  để tra `sch(hb, d)` chỉ cần duyệt tới mốc đầu tiên ≥ ngày đó. Form luôn sửa lịch mới nhất, nên lưu lại thì thay lịch đã hẹn chưa tới;
  chọn lại đúng lịch đang chạy là huỷ hẹn. Tuần có đổi lịch dùng lịch thứ Hai cho mục tiêu tuần: đơn giản, chỉ lệch ở đúng tuần đổi.
- Theo dõi lại đặt `since` = hôm nay: những ngày đã ngừng hiện "none" thay vì "Bỏ"; ngày đã đánh dấu vẫn hiện vì `cellStatus` xét bản ghi trước `since`.
- Lịch Số lần/tuần không chọn ngày thì lưu `days` = cả tuần. Bản tối thiểu của loại này ghép từ số lần ("1 lần/tuần").
- `saveHabits` đổi trong máy trước rồi mới ghi Drive, nên ↑ ↓ và lưu không phải chờ mạng. Đánh đổi: hai máy sửa cùng lúc thì bản ghi sau thắng.
- Mức đạt vẫn là chữ; loại "mục tiêu bằng số" (app tự chấm theo con số) để sau, chưa chốt.
- Thêm 19 test: trang quản lý, form, ngừng/theo dõi lại/xoá, đổi lịch từ một ngày, nhóm và thứ tự.

---

## 2026-11-16 · Bộ chọn giờ trong app, nút Lưu dính đáy sheet · v35
**Đổi gì**
1. Bấm ô giờ (Thêm/Sửa việc đã làm, thẻ xác nhận, Thêm/Chỉnh sửa kế hoạch) mở bộ chọn giờ của app:
   hai cột cuộn Giờ / Phút, nút "Bây giờ", Hủy / Xong. Ô giờ có icon đồng hồ vẽ lại.
2. Hủy / Lưu trong sheet dính đáy sheet, không bị đẩy xuống dưới khi bàn phím bật hoặc có nhiều thẻ việc.

**Vì sao**
- Trên Vivo X200 Pro mini, hộp chọn giờ của Android bị cắt mất một khúc nút "Set", khó chọn xong giờ.
  Hộp đó do hệ điều hành vẽ, CSS của app không chỉnh được, nên phải thay bằng bộ chọn của app.
- Thử trên khung 405×460 (màn có bàn phím): sheet "Thêm việc đã làm" có 2–3 thẻ thì nút Lưu nằm ngoài màn hình, phải đóng bàn phím rồi cuộn mới lưu được.

**Logic**
- Ô giờ vẫn là `input type="time"` (giá trị `HH:MM` như cũ), chỉ thêm `readOnly` để trình duyệt không mở hộp riêng; `TP` gán giá trị và phát `input` + `change`,
  nên cảnh báo giờ ngược và code lưu giữ nguyên. Đánh đổi: không gõ giờ bằng bàn phím được nữa (trên điện thoại vốn cũng không gõ).
- Cột cuộn dùng CSS scroll-snap, không thư viện. Chọn phút theo từng phút (60 dòng) để giữ đúng giờ app tự điền (vd 18:52).
- Thanh nút sticky dùng `bottom` âm bằng padding-bottom của panel, nền trùng màu panel để che nội dung cuộn phía dưới.
- Ô ngày (`type="date"`) vẫn dùng hộp của Android.

---

## 2026-11-14 · Cổng vào 3 bước: Đăng nhập → Gemini → Lịch · v34
**Đổi gì**
1. Chưa vào được app thì chỉ hiện một màn full màn hình, không đầu trang, không thanh tab, không nút bút:
   - **Bước 1 · Đăng nhập**: "Still life", một dòng, nút Đăng nhập Google. Hết phiên cũng về đây (chữ đổi thành "Phiên Google đã hết…").
   - **Bước 2 · Kết nối Gemini**: ô key, chọn model, nút Kết nối, link nhỏ "Để sau".
   - **Bước 3 · Lịch của bạn**: "Bắt đầu tạo lịch" và "Xem lịch mẫu". Đã có lịch trên Drive thì bỏ qua.
2. Lỗi ở bước nào hiện ngay dưới nút của bước đó, bấm lại được.
3. Bỏ màn "Chào bạn" + 3 bước, thẻ "Đăng nhập lại nhé" (v32, v33) và hàm `startFlow`.

**Vì sao**
- Màn cũ trộn mọi thứ: các bước, nút xem thử, thanh tab, nút bút, trong khi lúc đó chỉ làm được một việc.
  Mỗi lúc một việc thì không phải đọc, không bấm nhầm.
- Thứ tự Đăng nhập trước: đăng nhập xong app lấy được key và lịch đã lưu trên Drive, máy thứ hai đi thẳng vào app.
- "Để sau" ở bước Gemini: app vẫn dùng được không cần AI (nút Tự thêm), không để key lỗi chặn ngoài cửa.
- Không làm đăng nhập ngầm khi hết phiên: hay bị Safari iPhone chặn; bấm một nút là đủ.

**Logic**
- `gateStep()` quyết định bước (demo → không cổng; chưa đăng nhập → login; chưa key và chưa "Để sau" → key; chưa cfg → cal).
  `render()` hỏi `gateStep()` trước; có bước thì vẽ `#gate`, `body.is-gated` ẩn phần còn lại bằng CSS.
- `refresh()` không gọi `loadToday()` khi cổng đang che; `findConfig()` chỉ chạy một lần mỗi phiên mở app (`S.cfgLooked`).
- Key được thử bằng `testKey()` trước khi lưu, nên key sai không lọt vào app.
- `settings.keyLater` nhớ lựa chọn "Để sau"; gõ câu cần AI mà chưa có key vẫn báo kèm nút Mở Cài đặt như trước.
- Hết phiên khi đang mở sheet: không đóng sheet (giữ chữ), cổng hiện phía sau. Mỗi phút kiểm tra token để hiện bước 1 cả khi không bấm gì.
- Thay 2 test của v32 bằng 6 test cổng vào (từng bước, chỉ còn cổng trên màn, Để sau, demo, vào app).

## 2026-11-14 · Màn bắt đầu ít chữ hơn · v33
**Đổi gì**: màn bắt đầu (máy chưa có cấu hình) chỉ còn: "Chào bạn.", một dòng "Lịch ở Google Calendar, nhật ký ở Google Drive.",
3 bước mỗi bước một dòng (Gemini API key · Đăng nhập Google · Tạo lịch và thư mục Drive), nút "Bắt đầu" và "Xem thử".
Bỏ dòng phụ dưới mỗi bước, rút gọn tiêu đề và nút "Xem thử với dữ liệu mẫu".

**Vì sao**: màn đầu tiên nhiều chữ, mắt phải đọc hết mới thấy nút. Các dòng phụ (dùng lại key app Korean, quyền truy cập, tự nhận ra lịch đã có)
không giúp quyết định bấm gì; khi cần thì các bước sau tự nói.

**Logic**: chỉ đổi chữ trong `renderOnboarding`, gom HTML mỗi bước vào hàm `step()`. Thứ tự bước và nút chính đổi theo bước đang chờ như cũ.

## 2026-11-14 · Hết phiên Google: chỉ hiện thẻ Đăng nhập lại · v32
**Đổi gì**: máy đã dựng hệ thống mà phiên Google hết hạn thì cả 3 tab chỉ hiện một thẻ "Đăng nhập lại nhé." với một nút.
Bỏ banner "Phiên Google đã hết hạn" và không hiện lại khung "Chào bạn…" cùng 3 bước bắt đầu.

**Vì sao**: trước đây tab Hôm nay hiện cả banner lẫn khung bắt đầu, với 2 nút đăng nhập và các bước đã làm xong.
Trông như phải cài lại từ đầu, trong khi chỉ cần đăng nhập lại. Tab Thói quen, Nhật ký thì bảo "sang tab Hôm nay", thêm một bước thừa.

**Logic**
- `needReauth()` = không demo + có `S.cfg` + hết token. Đúng thì `renderOnboarding`, `renderHabits`, `renderJournal` đều vẽ `reauthCard()`.
- Chưa có `S.cfg` (lần đầu, máy mới) thì vẫn hiện các bước bắt đầu như cũ.
- Bỏ `#banner`, `showBanner()` và CSS `.banner`. Lỗi 401 giữa chừng: `handleErr` gọi `render()`, tab đang mở chuyển sang thẻ.
  Không đóng sheet đang mở, để chữ đang nhập không mất; đăng nhập lại rồi bấm lưu lần nữa.
- Thêm 2 test (hết phiên: 3 tab chỉ có thẻ, không banner; chưa có cấu hình: vẫn có các bước).

## 2026-11-14 · Ngày hiện theo DD/MM/YYYY · v31
**Đổi gì**: mọi ngày trong app hiện theo `DD/MM/YYYY`: đầu trang ("Thứ Bảy, 14/11/2026"), dòng tuần ở Thói quen
("09/11/2026 – 15/11/2026"), tiêu đề sheet, danh sách nhật ký, nhãn chip ngày, tiêu đề file nhật ký mới, tên sự kiện "Thói quen · 14/11/2026".

**Vì sao**: trước đây lẫn lộn "14 tháng 11", "14/11", "9/11", khó đọc và không thống nhất.

**Logic**
- Một hàm `dmy(d)` (có số 0 đứng đầu) cho mọi chỗ hiển thị; `fmtDate` = thứ + `dmy`. Bỏ `dm()` cũ.
- Dữ liệu, tên file `YYYY-MM-DD.md`, `data-day` giữ `ymd()`: đổi sẽ làm hỏng file và sự kiện đã có.
- Không đổi: số ngày trong ô lịch tháng (chỉ là số), tiêu đề tháng ("Tháng 11 · 2026"), ô chọn ngày (`input type=date` hiện theo ngôn ngữ của máy, app không chỉnh được).
- File nhật ký cũ có tiêu đề kiểu cũ vẫn đọc bình thường: `parseJournal` bỏ qua dòng `# `.

## 2026-11-14 · Nhật ký: form chỉ để viết, đọc trong sheet · v30
**Đổi gì**
1. Form trên trang Nhật ký **luôn trống**, mở lại app cũng trống. Bỏ thẻ "Đã lưu hôm nay" của v28.
2. Danh sách bên dưới đổi tên thành **"Đã viết"** và gồm cả hôm nay. Lưu xong, dòng "Hôm nay" nháy nền một lần và cuộn tới.
3. Hôm nay đã có trang mà lưu nữa: **nối** vào từng mục, không ghi đè. Tiêu đề form đổi thành "Viết thêm cho hôm nay."
4. Chạm một trang: sheet hiện **chữ thuần** kèm giờ lưu. Nút "Sửa" nhỏ ở cuối mới mở form.

**Vì sao**
- Form đầy chữ cũ trông như bản nháp chưa lưu, và lẫn chỗ để viết với chỗ để đọc. Tách ra: trên để viết, dưới để đọc.
- Form trống mà lưu đè thì sẽ mất phần đã viết trước đó trong ngày, nên phải nối.
- Vẫn giữ nút Sửa (nhỏ, ở cuối sheet) vì không có nó thì không sửa được lỗi gõ.

**Logic**
- `drawJournal(flash)` vẽ form trống + danh sách từ `S.jfiles`, không gọi mạng. Bỏ `S.jedit`, `S.jcur`, `#jEdit`, `#jCancel`.
- Lưu từ form: có trang hôm nay thì đọc trang, `mergeJournal(cur, add)` nối từng mục (mục trống giữ nguyên), rồi ghi.
  Mức thói quen Nhật ký tính trên trang sau khi nối.
- Lưu từ Sửa (`#jpast`): ghi đè đúng trang đó, như trước.
- Demo lưu thêm giờ lưu (`db.jmod`) để sheet hiện được "lúc HH:MM".
- Thay 2 test của v28 bằng 4 test: `mergeJournal`, form trống sau khi lưu và khi mở lại, lưu lần 2 thì nối, sheet chữ thuần + Sửa.

## 2026-11-14 · Nút đang chạy: chỉ còn vòng quay · v29
**Đổi gì**: mọi nút đang chờ mạng chỉ hiện vòng quay ở giữa, bỏ chữ ("Đang lưu lên Drive…", "Đang thử…", "Đang chuyển sang ngày nhẹ nhàng…").
Áp cho cả các nút trước đây chỉ bị khoá mà không báo gì: Lưu / Xoá / Thêm trong các sheet, nút Làm / Bỏ qua của khối kế hoạch.

**Vì sao**: chữ dài làm nút đổi kích thước, nhảy layout, và đọc rối. Vòng quay đủ để biết đang chạy. Các nút chỉ khoá thì
trông như bấm không ăn.

**Logic**
- `busy(el, label)` giữ nguyên rộng / cao của nút trước khi thay nội dung, nên nút không co lại. Vòng quay nằm giữa (`.is-busy`).
- `label` không hiện nữa mà thành `aria-label` + `aria-busy`, để trình đọc màn hình vẫn biết nút đang làm gì.
- `busy` trả về hàm trả nút về như cũ (nội dung, kích thước, aria). Lỗi thì gọi hàm này; thành công thì render lại thay nút mới.
- Chữ "Đang mở nhật ký…" và "Đang kiểm tra key…" giữ nguyên: đó là dòng trạng thái, không phải nút.
- Sửa 3 test cho đúng hành vi mới (không còn chữ, trả lại như cũ).

## 2026-11-14 · Nhật ký: lưu xong thấy rõ đã lưu · v28
**Đổi gì**
1. Bấm "Lưu nhật ký": nút hiện vòng quay và chữ "Đang lưu lên Drive…".
2. Lưu xong, form hôm nay chuyển thành **bản đã lưu** (chỉ đọc): "Đã lưu hôm nay.", dòng xanh "Đã lưu vào Google Drive lúc HH:MM",
   nội dung từng mục, nút **Sửa**, và một dòng nói rõ ngày mai sẽ có trang mới, trang này chuyển xuống "Những ngày trước".
3. Mở lại app trong ngày vẫn thấy bản đã lưu. Bấm Sửa thì ra form điền sẵn, kèm nút "Huỷ, giữ bản đã lưu".
4. Dưới form có dòng ghi trang được lưu ở đâu (Still life › Nhật ký trên Drive).

**Vì sao**
- Trước đây bấm Lưu không có gì thay đổi ngoài toast, form vẫn nguyên chữ, nên không biết đã lưu chưa.
  Mở lại vẫn thấy form đầy chữ, trông như bản nháp chưa gửi, nên không chắc mai còn không.
- Hôm nay không nằm trong "Những ngày trước" nên càng không thấy dấu hiệu đã lưu.

**Logic**
- Tách `renderJournal()` (tải) và `drawJournal()` (vẽ, không gọi mạng). Lưu xong vẽ lại ngay từ dữ liệu vừa gửi, không tải lại.
- Có nội dung hôm nay trên Drive và không đang sửa (`S.jedit`) → hiện bản đã lưu. Mở lại tab thì `jedit` trở về false.
- `listJournal` lấy thêm `modifiedTime` (`mod`), `saveJournal` trả `mod` = giờ lưu, để hiện "lúc HH:MM".
- Lưu lỗi thì nút trở lại như cũ, form giữ nguyên chữ.
- Thêm 2 test (nút đang lưu, bản đã lưu, mở lại; Sửa / Huỷ).

## 2026-11-14 · "Thêm việc đã làm", nút + Thêm việc, form cùng thứ tự · v27
**Đổi gì**
1. Sheet mở từ nút "Tự thêm" có tiêu đề **"Thêm việc đã làm"**, không còn dòng nhóm "Thời gian thực tế". Nút trong ô nhập giữ chữ "Tự thêm".
2. Dưới các thẻ việc (cả sheet này lẫn "Mình hiểu là…" của AI) có nút **"+ Thêm việc"** để ghi nhiều việc một lần.
3. Mọi form việc theo cùng thứ tự Tên → Nhóm → Giờ: đổi ở **Thêm kế hoạch** và **Sửa việc đã làm** (trước đó Nhóm nằm cuối).

**Vì sao**
- Tiêu đề nên nói sheet dùng làm gì, và khớp cặp "Thêm kế hoạch" / "Sửa việc đã làm". "Tự thêm" chỉ hợp cho nút, để phân biệt với AI.
- Tự thêm mà chỉ được một việc thì muốn ghi 3 việc phải mở lại 3 lần. Với AI, nếu nó bỏ sót một việc thì trước đây phải gõ lại cả câu.
- Có nút thêm thì thùng rác ở mỗi thẻ mới có nghĩa, và giữ thùng rác cho đồng bộ với Sửa việc đã làm.
- Cùng thứ tự ô thì không phải dò lại mỗi form.

**Logic**
- Dòng "Thời gian thực tế" chỉ ẩn khi `p.manual`: sheet của AI còn Thói quen, nhật ký nên cần dòng nhóm để tách.
- Thẻ mới (`nextActivity`) nối tiếp thẻ cuối: cùng ngày, cùng nhóm, bắt đầu lúc thẻ cuối kết thúc, dài 30 phút; tên trống và ô tên được focus.
  Không có thẻ nào thì 30 phút trước → bây giờ, hôm nay, Sinh hoạt.
- Trước khi thêm, bỏ dòng hay lưu đều gọi `syncPending()` đọc lại các ô đang sửa, vì sheet được dựng lại từ `S.pending`
  (gộp 2 đoạn code đọc ô trùng nhau trước đây).
- Ô ngày của Thêm kế hoạch **chưa** thêm: kế hoạch chỉ tải và hiện cho hôm nay, thêm cho ngày khác sẽ không thấy ở đâu. Để Bản 2.
- Thêm 2 test.

## 2026-11-14 · Nút "Tự thêm" trong ô nhập · v26
**Đổi gì**: ô nhập (cả khi mở từ "Làm việc khác") có thêm nút "Tự thêm" bên trái mic, gửi. Bấm thì đóng ô nhập và mở sheet
"Tự thêm" với một thẻ việc trống (Tên, Nhóm, Giờ, Ngày) để tự điền rồi Lưu, không qua Gemini.

**Vì sao**: có lúc chỉ muốn ghi nhanh một việc đã biết rõ, không cần AI đọc câu: không có mạng tốt, không có key,
hoặc AI hiểu sai và gõ lại mất công hơn tự điền.

**Logic**
- Không làm form mới: `manualPending(text)` tạo một `pending` giống kết quả AI (1 việc, `manual: true`) và dùng lại
  `renderConfirm` / `savePending`. Nhờ vậy ô ngày, cảnh báo giờ ngược, hoàn tác và đánh dấu bỏ qua khối "Làm việc khác" giữ nguyên.
- Mặc định: tên = dòng đầu chữ đã gõ (tối đa 80 ký tự), để gõ dở rồi đổi ý không mất chữ. Giờ = 30 phút trước → bây giờ.
  Đang "Làm việc khác" thì bắt đầu từ đầu khối đang chạy và lấy nhóm của khối, vì thường là thay thế đúng khoảng đó.
- Tên để trống khi lưu thì dùng tên nhóm, tránh tạo sự kiện Calendar không tên.
- Nút để kiểu ghost, nằm tách bên trái cặp mic, gửi, để AI vẫn là cách chính.
- Thêm 2 test (tổng 93).

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
