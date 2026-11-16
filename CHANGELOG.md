# Changelog

Mỗi thay đổi ghi 3 điều: **đổi gì**, **vì sao**, **logic** (cách làm và đánh đổi).
Mới nhất ở trên. Số `vNN` là phiên bản cache trong `sw.js`.

---

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
