// Still life · unit test. Chạy bên trong iframe của app (chế độ demo), được tests/index.html chèn vào,
// nên thấy trực tiếp các hằng số / hàm toàn cục của app.js. Không gọi Google, không gọi Gemini.
(async () => {
  const T = [];
  let group = "";
  const describe = (g, fn) => { group = g; fn(); };
  const test = (name, fn) => T.push({ group, name, fn });
  const J = v => JSON.stringify(v);
  const eq = (got, want, msg) => { if (J(got) !== J(want)) throw new Error(`${msg ? msg + ": " : ""}mong ${J(want)}, nhận ${J(got)}`); };
  const ok = (v, msg) => { if (!v) throw new Error(msg || "điều kiện sai"); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));

  const today = startOfDay(new Date());
  const day = n => addDays(today, n);
  const rec = (date, extra) => Object.assign(blankRec(ymd(date)), extra);
  const setDays = list => { S.days = {}; for (const r of list) S.days[r.date] = r; };
  const block = (title, s, e, extra) => Object.assign({ id: "t_" + title, kind: "plan", title, start: s, end: e, cat: "build", habit: "", ess: false, muted: false }, extra);
  const at = (t, base = today) => atTime(base, t);
  const html = s => new DOMParser().parseFromString(`<body>${s}</body>`, "text/html").body;

  // ------------------------------------------------------------ helpers ngày giờ
  describe("Ngày giờ", () => {
    test("ymd / parseYmd đi vòng", () => {
      eq(ymd(parseYmd("2026-03-09")), "2026-03-09");
      eq(ymd(new Date(2026, 0, 5)), "2026-01-05");
    });
    test("addDays qua cuối tháng, cuối năm", () => {
      eq(ymd(addDays(new Date(2026, 0, 31), 1)), "2026-02-01");
      eq(ymd(addDays(new Date(2026, 11, 31), 1)), "2027-01-01");
      eq(ymd(addDays(new Date(2026, 2, 1), -1)), "2026-02-28");
    });
    test("mondayOf: Chủ nhật lùi về thứ Hai, thứ Hai giữ nguyên", () => {
      eq(ymd(mondayOf(new Date(2026, 10, 15))), "2026-11-09");
      eq(ymd(mondayOf(new Date(2026, 10, 9, 23, 59))), "2026-11-09");
      eq(ymd(mondayOf(new Date(2026, 10, 14))), "2026-11-09");
    });
    test("atTime / hm / pad", () => {
      const d = atTime(new Date(2026, 10, 14, 20), "07:45");
      eq([d.getHours(), d.getMinutes(), d.getDate()], [7, 45, 14]);
      eq(hm(d), "07:45");
      eq(pad(5), "05"); eq(pad(12.9), "12");
    });
    test("rfc có offset đúng múi giờ máy", () => {
      const d = new Date(2026, 0, 5, 9, 7), s = rfc(d);
      ok(s.startsWith("2026-01-05T09:07:00"), s);
      const off = -d.getTimezoneOffset(), sign = off >= 0 ? "+" : "-", a = Math.abs(off);
      ok(s.endsWith(`${sign}${pad(a / 60)}:${pad(a % 60)}`), s);
      eq(+new Date(s), +d, "parse lại ra đúng thời điểm");
    });
    test("fmtDate tiếng Việt", () => {
      eq(fmtDate(new Date(2026, 10, 14)), "Thứ Bảy, 14/11/2026");
      eq(fmtDate(new Date(2026, 10, 15)), "Chủ nhật, 15/11/2026");
      eq(dmy(new Date(2027, 0, 5)), "05/01/2027");
    });
    test("fmtDur: phút và giờ", () => {
      eq([0, 45, 60, 65, 130, 59.6].map(fmtDur), ["0p", "45p", "1g", "1g05", "2g10", "1g"]);
    });
  });

  // ------------------------------------------------------------ helpers chung
  describe("Tiện ích", () => {
    test("esc thoát đủ 5 ký tự HTML", () => {
      eq(esc(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
      eq(esc(null), ""); eq(esc(0), "0");
    });
    test("better chọn mức cao hơn: full > min > skip", () => {
      eq(better("min", "full"), "full");
      eq(better("full", undefined), "full");
      eq(better(undefined, "skip"), "skip");
      eq(better("min", "skip"), "min");
    });
    test("cleanKey bỏ khoảng trắng, nháy", () => {
      eq(cleanKey(` "AIza 12\`3"\n`), "AIza123");
      eq(cleanKey(undefined), "");
    });
    test("modelRank: Flash-Lite trước, preview sau, bản mới trước", () => {
      const list = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.0-flash-lite-preview", "gemini-2.0-flash-lite"];
      eq(list.slice().sort(modelRank), ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-3.0-flash-lite-preview", "gemini-2.5-flash"]);
    });
    test("modelLabel dễ đọc", () => {
      eq(modelLabel("gemini-2.5-flash-lite"), "Gemini 2.5 Flash-Lite · rẻ, nhanh");
      eq(modelLabel("gemini-3-flash-preview-05"), "Gemini 3 Flash (preview) · hiểu câu tốt hơn");
    });
  });

  // ------------------------------------------------------------ cấu hình tĩnh
  describe("Tuần mẫu & habit", () => {
    test("key tuần mẫu không trùng", () => eq(new Set(TEMPLATE.map(t => t.key)).size, TEMPLATE.length));
    test("mỗi khối có nhóm hợp lệ, habit hợp lệ, giờ bắt đầu < kết thúc", () => {
      for (const t of TEMPLATE) {
        ok(CATS[t.cat], `${t.key}: nhóm ${t.cat}`);
        ok(!t.habit || H[t.habit], `${t.key}: habit ${t.habit}`);
        ok(t.s < t.e, `${t.key}: ${t.s}–${t.e}`);
        ok(t.days.length && t.days.every(d => d >= 0 && d <= 6), `${t.key}: days`);
      }
    });
    test("không có 2 khối chồng giờ trong cùng một ngày", () => {
      for (let dow = 0; dow < 7; dow++) {
        const bs = TEMPLATE.filter(t => t.days.includes(dow)).sort((a, b) => a.s.localeCompare(b.s));
        for (let i = 1; i < bs.length; i++) ok(bs[i].s >= bs[i - 1].e, `${DOW[dow]}: ${bs[i - 1].key} ${bs[i - 1].e} > ${bs[i].key} ${bs[i].s}`);
      }
    });
    test("habit theo ngày / theo tuần có lịch, mức theo tuần hợp lệ", () => {
      for (const hb of HABITS) {
        if (hb.freq !== "daily") ok(Array.isArray(hb.days) && hb.days.length, hb.id);
        if (hb.freq === "weekly") ok(hb.perWeekMin >= 1 && hb.perWeekMin <= hb.perWeekFull, hb.id);
      }
    });
    test("mỗi habit mặc định đều có tên ngắn cho bảng tuần", () => { for (const hb of DEFAULT_HABITS) ok(hb.short, hb.id); });
  });

  // ------------------------------------------------------------ Calendar mapping
  describe("Chuyển đổi sự kiện Calendar", () => {
    const ev = (summary, priv) => ({ id: "e1", summary, start: { dateTime: "2026-11-16T06:00:00+07:00" }, end: { dateTime: "2026-11-16T07:00:00+07:00" }, extendedProperties: { private: priv } });
    test("evToItem: lấy nhóm, habit theo key của tuần mẫu", () => {
      const it = evToItem(ev("Yoga", { key: "yoga" }), "plan");
      eq([it.kind, it.title, it.cat, it.habit, it.ess, it.muted, it.added], ["plan", "Yoga", "health", "yoga", false, false, false]);
      eq(+it.end - +it.start, 3600000);
    });
    test("evToItem: 💤 nghĩa là đang tắt, tên bỏ 💤", () => {
      const it = evToItem(ev("💤 Ăn sáng", { key: "breakfast" }), "plan");
      eq([it.title, it.muted, it.ess], ["Ăn sáng", true, true]);
    });
    test("evToItem: khối thêm trong app (added=1), không key", () => {
      const it = evToItem(ev("Gọi mẹ", { sl: "plan", cat: "people", added: "1" }), "plan");
      eq([it.cat, it.added, it.habit, it.key], ["people", true, "", undefined]);
    });
    test("evToItem: thiếu extendedProperties vẫn chạy, nhóm mặc định Sinh hoạt", () => {
      const it = evToItem({ id: "x", summary: "A", start: { dateTime: "2026-11-16T06:00:00Z" }, end: { dateTime: "2026-11-16T07:00:00Z" } }, "act");
      eq([it.cat, it.plan, it.added], ["life", "", false]);
    });
    test("recToProps → recFromEv đi vòng giữ nguyên dữ liệu", () => {
      const r = { id: "d1", date: "2026-11-14", h: { eat: "full", walk: "min" }, v: { walk: 2400 }, unwell: true, reason: "mệt", skip: ["a"], muted: ["b", "c"] };
      const back = recFromEv({ id: "d1", extendedProperties: { private: recToProps(r) } });
      eq(back, r);
    });
    test("recToProps cắt lý do quá 500 ký tự", () => {
      eq(recToProps(blankRec("2026-11-14")).reason, "");
      eq(recToProps(Object.assign(blankRec("x"), { reason: "a".repeat(600) })).reason.length, 500);
    });
    test("recFromEv chịu được JSON hỏng", () => {
      const r = recFromEv({ id: "d", extendedProperties: { private: { date: "2026-11-14", h: "{oops", skip: "nope" } } });
      eq([r.h, r.skip, r.unwell], [{}, [], false]);
    });
    test("planBody: lặp hằng tuần đúng thứ, màu, nhắc", () => {
      const mon = new Date(2026, 10, 16);
      const b = planBody(TPL.yoga, mon);
      eq(b.recurrence, ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"]);
      eq(b.colorId, CATS.health.color);
      eq(b.reminders.overrides, [{ method: "popup", minutes: 0 }]);
      ok(b.start.dateTime.startsWith("2026-11-16T06:00:00"), b.start.dateTime);
      eq(b.extendedProperties.private.key, "yoga");
      eq(planBody(TPL.phone, mon).reminders.overrides.map(o => o.minutes), [30, 0]);
      eq(planBody(TPL.lunch, mon).extendedProperties.private.ess, "1");
    });
  });

  // ------------------------------------------------------------ logic habit
  describe("Trạng thái ô habit", () => {
    const eat = H.eat;
    test("tương lai / hôm nay chưa làm / hôm qua bỏ", () => {
      setDays([]);
      eq(cellStatus(eat, day(1)), "future");
      eq(cellStatus(eat, today), "pending");
      eq(cellStatus(eat, day(-1)), "miss");
    });
    test("đạt / tối thiểu / unwell", () => {
      setDays([rec(day(-1), { h: { eat: "full" } }), rec(day(-2), { h: { eat: "min" } }), rec(day(-3), { unwell: true })]);
      eq([cellStatus(eat, day(-1)), cellStatus(eat, day(-2)), cellStatus(eat, day(-3))], ["full", "min", "rest"]);
    });
    test("trước ngày bắt đầu theo dõi là none, nhưng đã ghi thì vẫn hiện", () => {
      const before = addDays(trackStart(), -1);
      setDays([]);
      eq(cellStatus(eat, before), "none");
      setDays([rec(before, { h: { eat: "full" } })]);
      eq(cellStatus(eat, before), "full");
    });
    test("ngày không có lịch là off (Yoga chỉ T2-4-6)", () => {
      setDays([]);
      let d = day(-1); while (H.yoga.days.includes(d.getDay())) d = addDays(d, -1);
      eq(cellStatus(H.yoga, d), "off");
    });
    test("Gym tính theo tuần: ngày cũ chưa tập là off, không phải miss", () => {
      setDays([]);
      let d = day(-1); while (!H.gym.days.includes(d.getDay())) d = addDays(d, -1);
      eq(cellStatus(H.gym, d), "off");
    });
  });

  describe("Đếm tuần & chuỗi", () => {
    test("weekCount habit hằng ngày: unwell không tính vào mẫu", () => {
      const mon = addDays(mondayOf(today), -7), list = [];
      for (let i = 0; i < 7; i++) list.push(rec(addDays(mon, i), { h: i === 2 ? {} : { eat: "full" }, unwell: i === 4 }));
      list[4].h = {};
      setDays(list);
      const wc = weekCount(H.eat, mon);
      eq([wc.done, wc.total, wc.label, wc.star], [5, 6, "5/6", false]);
    });
    test("weekCount đủ cả tuần thì có ★", () => {
      const mon = addDays(mondayOf(today), -7), list = [];
      for (let i = 0; i < 7; i++) list.push(rec(addDays(mon, i), { h: { eat: i % 2 ? "min" : "full" } }));
      setDays(list);
      const wc = weekCount(H.eat, mon);
      eq([wc.label, wc.star], ["7/7", true]);
    });
    test("weekCount Gym: 1 buổi là đạt tối thiểu, 2 buổi là ★", () => {
      const mon = addDays(mondayOf(today), -7);
      setDays([rec(addDays(mon, 1), { h: { gym: "full" } })]);
      let wc = weekCount(H.gym, mon); eq([wc.label, wc.ok, wc.star], ["1/2", true, false]);
      setDays([rec(addDays(mon, 1), { h: { gym: "full" } }), rec(addDays(mon, 5), { h: { gym: "full" } })]);
      wc = weekCount(H.gym, mon); eq([wc.label, wc.ok, wc.star], ["2/2", true, true]);
    });
    test("chuỗi ngày: hôm nay chưa làm và unwell không làm gãy chuỗi", () => {
      setDays([rec(day(-1), { h: { eat: "full" } }), rec(day(-2), { h: { eat: "min" } }), rec(day(-3), { unwell: true }), rec(day(-4), { h: { eat: "full" } })]);
      eq(streak(H.eat), { n: 3, unit: "ngày" });
    });
    test("chuỗi Yoga tính theo buổi, bỏ qua ngày không có lịch", () => {
      const list = []; let n = 0;
      for (let i = -1; n < 2; i--) { const d = day(i); if (H.yoga.days.includes(d.getDay())) { list.push(rec(d, { h: { yoga: "full" } })); n++; } }
      setDays(list);
      eq(streak(H.yoga), { n: 2, unit: "buổi" });
    });
    test("chuỗi Gym tính theo tuần: tuần này chưa tập không làm gãy", () => {
      const m0 = mondayOf(today);
      setDays([rec(addDays(m0, -7 + 1), { h: { gym: "full" } }), rec(addDays(m0, -14 + 1), { h: { gym: "full" } }), rec(addDays(m0, -14 + 5), { h: { gym: "full" } })]);
      eq(streak(H.gym), { n: 2, unit: "tuần" });
    });
    test("unwellRun đếm số ngày unwell liền nhau tới hôm nay", () => {
      setDays([rec(today, { unwell: true }), rec(day(-1), { unwell: true }), rec(day(-3), { unwell: true })]);
      eq(unwellRun(), 2);
      setDays([]); eq(unwellRun(), 0);
    });
  });

  // ------------------------------------------------------------ bộ đọc câu (demo)
  describe("Bộ đọc câu chế độ demo", () => {
    test("yoga 20 phút → hoạt động Sức khỏe + habit yoga đạt", () => {
      const p = demoParse("Vừa tập yoga 20 phút");
      eq(p.activities.map(a => [a.title, a.category]), [["Yoga", "health"]]);
      eq(p.habits, [{ id: "yoga", level: "full" }]);
      const a = p.activities[0], mins = (+atTime(today, a.end) - +atTime(today, a.start)) / 60000;
      ok(mins === 20 || mins === 20 - 1440, `dài ${mins} phút`);
    });
    test("số bước: ≥3000 đạt, ≥2000 tối thiểu, ít hơn là bỏ", () => {
      eq(demoParse("đi bộ 3.200 bước").habits, [{ id: "walk", level: "full", value: 3200 }]);
      eq(demoParse("đi được 2,500 bước").habits, [{ id: "walk", level: "min", value: 2500 }]);
      eq(demoParse("mới 800 bước").habits[0].level, "skip");
    });
    test("học vài từ trong ít phút → tiếng Hàn tối thiểu", () => {
      eq(demoParse("học 5 từ mới 5p").habits, [{ id: "korean", level: "min" }]);
    });
    test("mệt / ốm → gợi ý unwell; lướt TikTok → nhóm Lướt", () => {
      eq(demoParse("hôm nay mệt quá").unwell, true);
      eq(demoParse("lướt tiktok 40 phút").activities[0].category, "scroll");
    });
  });

  // ------------------------------------------------------------ nhật ký
  describe("Nhật ký markdown", () => {
    test("journalMd → parseJournal đi vòng, bỏ mục trống", () => {
      const f = { vui: "Trời đẹp\nĂn ngon", bietOn: "", mai: "Đi bộ", them: "Ghi chú" };
      const md = journalMd("2026-11-14", f);
      ok(md.startsWith("# Nhật ký · Thứ Bảy, 14/11/2026\n"), md.split("\n")[0]);
      ok(!md.includes("## Biết ơn"), "mục trống không ghi");
      eq(parseJournal(md), { vui: "Trời đẹp\nĂn ngon", mai: "Đi bộ", them: "Ghi chú" });
    });
    test("tiêu đề lạ gộp vào Ghi thêm, chuỗi rỗng không lỗi", () => {
      eq(parseJournal("# x\n## Khác\nabc\n"), { them: "abc" });
      eq(parseJournal(""), {}); eq(parseJournal(undefined), {});
    });
  });

  // ------------------------------------------------------------ Bây giờ / Tiếp theo
  describe("Bây giờ / Tiếp theo", () => {
    const now = Date.now();
    const p1 = block("Đang", new Date(now - 10 * 60000), new Date(now + 20 * 60000));
    const p2 = block("Sau", new Date(now + 30 * 60000), new Date(now + 60 * 60000), { ess: true });
    test("tìm khối hiện tại và khối kế tiếp", () => {
      S.today = { plan: [p1, p2], actual: [], rec: blankRec(todayStr()) };
      const c = currentBlocks();
      eq([c.cur && c.cur.title, c.next && c.next.title, !!c.done], ["Đang", "Sau", false]);
    });
    test("đã ghi thực tế / bỏ qua thì khối hiện tại là xong", () => {
      S.today = { plan: [p1, p2], actual: [{ id: "a", plan: p1.id }], rec: blankRec(todayStr()) };
      eq(!!currentBlocks().done, true);
      S.today = { plan: [p1, p2], actual: [], rec: Object.assign(blankRec(todayStr()), { skip: [p1.id] }) };
      const c = currentBlocks(); eq([!!c.done, !!c.skipped], [true, true]);
    });
    test("unwell day ẩn khối không thiết yếu", () => {
      S.today = { plan: [p1, p2], actual: [], rec: Object.assign(blankRec(todayStr()), { unwell: true }) };
      const c = currentBlocks(); eq([c.cur, c.next && c.next.title], [undefined, "Sau"]);
    });
  });

  // ------------------------------------------------------------ timeline
  describe("Timeline", () => {
    const setup = () => {
      S.today = {
        plan: [block("Ngắn", at("10:00"), at("10:30")), block("Dài", at("11:00"), at("13:00"))],
        actual: [{ id: "a1", kind: "act", title: "Code", start: at("10:00"), end: at("10:20"), cat: "build", plan: "" }],
        rec: blankRec(todayStr()),
      };
    };
    test("vị trí, chiều cao khối theo giờ (56px/giờ, bắt đầu 5:00)", () => {
      setup(); const b = html(timelineHTML());
      const s = b.querySelector('[data-pid="t_Ngắn"]'), l = b.querySelector('[data-pid="t_Dài"]');
      eq([s.style.top, s.style.height], [(10 - TL.H0) * TL.PX + "px", TL.PX / 2 - 2 + "px"]);
      eq([l.style.top, l.style.height], [(11 - TL.H0) * TL.PX + "px", TL.PX * 2 - 2 + "px"]);
    });
    test("khối ngắn: 1 dòng (is-short), không hiện giờ; khối dài hiện giờ", () => {
      setup(); const b = html(timelineHTML());
      const s = b.querySelector('[data-pid="t_Ngắn"]'), l = b.querySelector('[data-pid="t_Dài"]');
      ok(s.classList.contains("is-short") && !s.querySelector("small"), s.outerHTML);
      ok(!l.classList.contains("is-short") && l.querySelector("small").textContent === "11:00–13:00", l.outerHTML);
      eq(s.querySelector(".tl__t").textContent, "Ngắn");
      ok(s.title.includes("10:00–10:30"), "tooltip có tên + giờ");
    });
    test("khối kế hoạch và thực tế đều là nút bấm được", () => {
      setup(); const b = html(timelineHTML());
      eq(b.querySelectorAll(".tl__col--plan button.tl__ev[data-pid]").length, 2);
      eq(b.querySelectorAll(".tl__col--act button.tl__ev[data-aid]").length, 1);
    });
    test("đủ nhãn giờ 5:00–23:00, có khung cuộn và tiêu đề cột", () => {
      setup(); const b = html(timelineHTML());
      eq(b.querySelectorAll(".tl__hour").length, TL.H1 - TL.H0 + 1);
      eq([...b.querySelectorAll(".tl__head")].map(h => h.textContent), ["Kế hoạch", "Thực tế"]);
      ok(b.querySelector(".tl__scroll[data-now]"), "có data-now");
    });
    test("tên có ký tự HTML được thoát", () => {
      S.today = { plan: [block("<b>x</b>", at("09:00"), at("10:00"))], actual: [], rec: blankRec(todayStr()) };
      const b = html(timelineHTML());
      eq(b.querySelector(".tl__t").textContent, "<b>x</b>");
      eq(b.querySelectorAll(".tl__t b").length, 0);
    });
    test("khối bỏ qua / đang tắt có class riêng", () => {
      const p = block("A", at("09:00"), at("10:00")), m = block("B", at("10:00"), at("11:00"), { muted: true });
      S.today = { plan: [p, m], actual: [], rec: Object.assign(blankRec(todayStr()), { skip: [p.id] }) };
      const b = html(timelineHTML());
      ok(b.querySelector('[data-pid="t_A"]').classList.contains("is-skip"));
      ok(b.querySelector('[data-pid="t_B"]').classList.contains("is-muted"));
    });
  });

  // ------------------------------------------------------------ Demo API
  describe("Demo API kế hoạch", () => {
    test("addPlan → listPlan có khối, đánh dấu added", async () => {
      const it = await Demo.addPlan({ title: "API thêm", cat: "fun", start: at("16:00"), end: at("16:30") });
      const list = await Demo.listPlan(today, day(1));
      const f = list.find(p => p.id === it.id);
      ok(f, "có trong danh sách");
      eq([f.title, f.cat, f.added, hm(f.start), hm(f.end)], ["API thêm", "fun", true, "16:00", "16:30"]);
      await Demo.deletePlan(it.id);
      ok(!(await Demo.listPlan(today, day(1))).some(p => p.id === it.id), "xoá xong không còn");
    });
    test("updatePlan đổi giờ một khối tuần mẫu chỉ cho hôm nay", async () => {
      const list = await Demo.listPlan(today, day(2));
      const t0 = list.find(p => p.key === "free" && +startOfDay(p.start) === +today);
      const t1 = list.find(p => p.key === "free" && +startOfDay(p.start) === +day(1));
      await Demo.updatePlan(Object.assign({}, t0, { title: "Tự do (dời)", start: at("15:00"), end: at("16:00") }));
      const after = await Demo.listPlan(today, day(2));
      const a0 = after.find(p => p.id === t0.id), a1 = after.find(p => p.id === t1.id);
      eq([a0.title, hm(a0.start), hm(a0.end)], ["Tự do (dời)", "15:00", "16:00"]);
      eq([a1.title, hm(a1.start)], [TPL.free.title, TPL.free.s], "ngày mai giữ nguyên");
      await Demo.updatePlan(t0);
    });
    test("listPlan không lấy khối thêm của ngày khác", async () => {
      const it = await Demo.addPlan({ title: "Mai", cat: "life", start: at("09:00", day(1)), end: at("09:30", day(1)) });
      ok(!(await Demo.listPlan(today, day(1))).some(p => p.id === it.id));
      ok((await Demo.listPlan(day(1), day(2))).some(p => p.id === it.id));
      await Demo.deletePlan(it.id);
    });
    test("mutePlan bật / tắt", async () => {
      const [p] = await Demo.listPlan(today, day(1));
      await Demo.mutePlan([p], true);
      eq((await Demo.listPlan(today, day(1))).find(x => x.id === p.id).muted, true);
      await Demo.mutePlan([p], false);
      eq((await Demo.listPlan(today, day(1))).find(x => x.id === p.id).muted, false);
    });
  });

  // ------------------------------------------------------------ luồng giao diện
  const reset = async () => { closeSheet(); hideToast(); await loadToday(); setView("today"); await frame(); };
  const sheetOpen = () => !$("#sheet").hidden;
  const sheetTitle = () => $("#sheetTitle").textContent;

  describe("Thêm kế hoạch", () => {
    test("giờ kết thúc mặc định: 30 phút, hoặc tới khối kế tiếp", async () => {
      await reset();
      S.today.plan = [block("Kế", at("10:15"), at("11:00"))];
      renderPlanAdd(at("10:00"));
      eq([sheetTitle(), $("#pStart").value, $("#pEnd").value], ["Thêm kế hoạch", "10:00", "10:15"]);
      S.today.plan = [block("Sát", at("10:05"), at("11:00"))];
      renderPlanAdd(at("10:00"));
      eq($("#pEnd").value, "10:30", "khối kế tiếp sát quá (<15 phút) thì vẫn 30 phút");
    });
    test("chưa nhập tên thì không thêm, sheet vẫn mở", async () => {
      await reset();
      renderPlanAdd(at("18:30"));
      $("#pTitle").value = "  ";
      eq(await savePlanAdd(), false);
      ok(sheetOpen(), "sheet vẫn mở");
    });
    test("thêm được, giờ ngược tự thành 15 phút, có hoàn tác", async () => {
      await reset();
      renderPlanAdd(at("10:00"));
      $("#pTitle").value = "Test thêm"; $("#pStart").value = "10:00"; $("#pEnd").value = "09:00"; $("#pCat").value = "people";
      eq(await savePlanAdd(), true);
      const it = S.today.plan.find(p => p.title === "Test thêm");
      ok(it, "có trong S.today.plan");
      eq([hm(it.start), hm(it.end), it.cat, it.added], ["10:00", "10:15", "people", true]);
      ok(!sheetOpen(), "sheet đóng");
      ok((await Demo.listPlan(today, day(1))).some(p => p.id === it.id), "đã lưu");
      ok(S.today.plan.every((p, i, a) => !i || a[i - 1].start <= p.start), "vẫn sắp theo giờ");
      await toast._undo();
      ok(!S.today.plan.some(p => p.id === it.id) && !(await Demo.listPlan(today, day(1))).some(p => p.id === it.id), "hoàn tác xoá khối");
    });
    test("bấm chỗ trống cột Kế hoạch mở sheet, giờ làm tròn xuống 15 phút", async () => {
      await reset(); renderToday();
      const col = $(".tl__col--plan"), r = col.getBoundingClientRect();
      const y = (17 + 20 / 60 - TL.H0) * TL.PX;
      col.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: r.left + 5, clientY: r.top + y }));
      await wait(30);
      eq([sheetOpen(), sheetTitle(), $("#pStart").value], [true, "Thêm kế hoạch", "17:15"]);
      closeSheet();
    });
    test("vạch giờ và vạch hiện tại không chặn cú bấm", async () => {
      await reset(); renderToday();
      eq(getComputedStyle($(".tl__grid")).pointerEvents, "none");
      const nl = $(".tl__nowline"); if (nl) eq(getComputedStyle(nl).pointerEvents, "none");
    });
  });

  describe("Chỉnh sửa kế hoạch", () => {
    test("bấm khối kế hoạch mở sheet; khối tuần mẫu không có nút xoá", async () => {
      await reset(); renderToday();
      const p = S.today.plan.find(x => !x.added);
      $(`.tl__col--plan [data-pid="${p.id}"]`).click(); await wait(30);
      eq([sheetTitle(), $("#pTitle").value, $("#pStart").value], ["Chỉnh sửa kế hoạch", p.title, hm(p.start)]);
      ok(!$("#pDel"), "không có nút xoá");
      closeSheet();
    });
    test("sửa tên, giờ chỉ hôm nay, hoàn tác về như cũ", async () => {
      await reset();
      const p = S.today.plan.find(x => x.key === "free");
      renderPlanEdit(p);
      $("#pTitle").value = "Tự do mới"; $("#pStart").value = "15:00"; $("#pEnd").value = "15:45";
      await savePlanEdit();
      const n = S.today.plan.find(x => x.id === p.id);
      eq([n.title, hm(n.start), hm(n.end)], ["Tự do mới", "15:00", "15:45"]);
      const saved = (await Demo.listPlan(today, day(1))).find(x => x.id === p.id);
      eq([saved.title, hm(saved.start)], ["Tự do mới", "15:00"]);
      await toast._undo();
      const u = S.today.plan.find(x => x.id === p.id);
      eq([u.title, hm(u.start), hm(u.end)], [p.title, hm(p.start), hm(p.end)]);
    });
    test("không đổi gì thì chỉ đóng sheet, không gọi lưu", async () => {
      await reset();
      const p = S.today.plan[0], orig = Demo.updatePlan; let called = 0;
      Demo.updatePlan = async x => { called++; return orig(x); };
      try { renderPlanEdit(p); await savePlanEdit(); } finally { Demo.updatePlan = orig; }
      eq([called, sheetOpen()], [0, false]);
    });
    test("khối thêm trong app có nút xoá, xoá được và hoàn tác được", async () => {
      await reset();
      const it = await Demo.addPlan({ title: "Xoá thử", cat: "fun", start: at("16:00"), end: at("16:30") });
      await loadToday();
      renderPlanEdit(S.today.plan.find(x => x.id === it.id));
      ok($("#pDel"), "có nút xoá");
      await deletePlanAdded();
      ok(!S.today.plan.some(x => x.title === "Xoá thử"), "đã xoá khỏi màn hình");
      ok(!(await Demo.listPlan(today, day(1))).some(x => x.title === "Xoá thử"), "đã xoá khỏi dữ liệu");
      await toast._undo();
      const back = S.today.plan.find(x => x.title === "Xoá thử");
      ok(back && hm(back.start) === "16:00" && back.cat === "fun", "hoàn tác khôi phục");
      await Demo.deletePlan(back.id);
    });
  });

  describe("Unwell day", () => {
    test("bật: tắt các khối không thiết yếu còn lại; tắt: bật lại hết", async () => {
      await reset();
      const now = new Date(), expect = S.today.plan.filter(p => !p.ess && p.end > now).map(p => p.id);
      await setUnwell(true);
      eq(S.today.rec.unwell, true);
      eq(S.today.rec.muted.slice().sort(), expect.slice().sort());
      eq(S.today.plan.filter(p => p.muted).map(p => p.id).sort(), expect.slice().sort());
      await setUnwell(false);
      eq([S.today.rec.unwell, S.today.rec.muted, S.today.plan.filter(p => p.muted).length], [false, [], 0]);
    });
    test("busy(): khoá nút, chỉ còn vòng quay (không chữ), trả lại như cũ", () => {
      const b = document.createElement("button"); b.innerHTML = '<i class="ph ph-check"></i> Lưu';
      const done = busy(b, "Đang <chạy>");
      ok(b.disabled && b.classList.contains("is-busy") && b.querySelector(".spin"), b.outerHTML);
      eq([b.textContent.trim(), b.getAttribute("aria-label")], ["", "Đang <chạy>"]);
      done();
      eq([b.disabled, b.textContent.trim(), b.hasAttribute("aria-label"), b.classList.contains("is-busy")], [false, "Lưu", false, false]);
    });
    test("bấm nút hiện trạng thái ngay, xong thì hiện thẻ Unwell", async () => {
      await reset(); renderToday();
      const orig = Demo.mutePlan; let release; const gate = new Promise(r => (release = r));
      Demo.mutePlan = async (...a) => { await gate; return orig(...a); };
      try {
        $("#btnUnwell").click(); await wait(20);
        const b = $("#btnUnwell");
        ok(b && b.disabled && b.querySelector(".spin") && !b.textContent.trim(), b && b.outerHTML);
        release(); await wait(80);
        ok($(".unwell-card"), "có thẻ Unwell day");
        $("#btnUnwellOff").click(); await wait(80);
        ok($("#btnUnwell"), "quay lại nút không ổn");
      } finally { Demo.mutePlan = orig; release(); }
    });
  });

  describe("Cổng vào: Đăng nhập → Gemini → Lịch", () => {
    const CFG = { planCal: "x", actualCal: "y", folderId: "f", journalFolderId: "j", start: todayStr() };
    const TOK = () => ({ t: "test", exp: Date.now() + 3600e3 });
    // Đặt trạng thái giả (không gọi Google), chạy fn, rồi trả lại như cũ
    const withState = async (st, fn) => {
      const keep = { settings: Object.assign({}, S.settings), cfg: S.cfg, tok: S.tok, looked: S.cfgLooked };
      try {
        Object.assign(S.settings, { demo: false, geminiKey: "", keyLater: false }, st.settings || {});
        S.cfg = st.cfg || null; S.tok = st.tok || null; S.cfgLooked = true;
        render(); await frame(); await fn();
      } finally {
        S.settings = keep.settings;
        saveSettings(); S.cfg = keep.cfg; S.tok = keep.tok; S.cfgLooked = keep.looked; await reset();
      }
    };
    const shown = sel => { const el = $(sel); return !!el && getComputedStyle(el).display !== "none"; };
    const onlyGate = () => { ok(shown("#gate"), "cổng hiện"); for (const sel of [".tabs", ".fab", ".top", "main"]) ok(!shown(sel), `${sel} phải ẩn`); };

    test("chưa đăng nhập: chỉ màn đăng nhập, không tab, không nút bút", () => withState({}, async () => {
      eq(gateStep(), "login"); onlyGate(); ok($("#gLogin"), "nút đăng nhập");
    }));
    test("hết phiên (đã có lịch): vẫn bước 1, chữ nói là đăng nhập lại", () => withState({ cfg: CFG, settings: { geminiKey: "k" } }, async () => {
      eq(gateStep(), "login"); onlyGate(); ok($("#gate").textContent.includes("đăng nhập lại") || $("#gate").textContent.includes("Đăng nhập lại"), $("#gate").textContent);
    }));
    test("đăng nhập rồi, chưa có key: bước 2; key trống thì báo lỗi tại chỗ", () => withState({ tok: TOK() }, async () => {
      eq(gateStep(), "key"); onlyGate(); ok($("#gKey") && $("#sModel") && $("#gKeyLater"), "có ô key, model, Để sau");
      $("#gKeySave").click(); await frame();
      ok(!$("#gateErr").hidden && $("#gateErr").textContent.includes("key"), "báo lỗi");
    }));
    test("bấm Để sau: sang bước 3 với 2 nút Tạo lịch / Xem lịch mẫu", () => withState({ tok: TOK() }, async () => {
      $("#gKeyLater").click(); await wait(30);
      eq(gateStep(), "cal"); onlyGate(); ok($("#gSetup") && $("#gDemo"), "2 nút");
    }));
    test("có key + có lịch: vào app, không cổng", () => withState({ tok: TOK(), cfg: CFG, settings: { geminiKey: "k" } }, async () => {
      eq(gateStep(), null); ok(!shown("#gate") && shown(".tabs"), "app bình thường");
    }));
    test("demo: không cần đăng nhập", () => withState({ settings: { demo: true } }, async () => {
      eq(gateStep(), null);
    }));
  });

  describe("Trang Nhật ký: form chỉ để viết, đọc trong sheet", () => {
    const openJ = async () => { S.jdirty = false; setView("journal"); for (let i = 0; i < 40 && !$("#jform"); i++) await wait(20); };
    const fill = vals => { for (const [k, v] of Object.entries(vals)) $(`#jform [name="${k}"]`).value = v; };
    const areas = () => [...document.querySelectorAll("#jform textarea")];
    const openToday = async () => { $(`[data-jdate="${todayStr()}"]`).click(); for (let i = 0; i < 40 && $("#sheet").hidden; i++) await wait(20); };
    test("mergeJournal: nối từng mục, mục trống giữ nguyên", () => {
      eq(mergeJournal({ vui: "A", mai: "M" }, { vui: "B", bietOn: "C", mai: " " }), { vui: "A\nB", mai: "M", bietOn: "C" });
    });
    test("bấm Lưu: nút quay, xong form trống, hôm nay nằm đầu danh sách; mở lại vẫn trống", async () => {
      await reset(); await openJ();
      fill({ vui: "Test vui", bietOn: "Test biết ơn", mai: "Test mai" });
      const orig = Demo.saveJournal; let release; const gate = new Promise(r => (release = r));
      Demo.saveJournal = async (...a) => { await gate; return orig.apply(Demo, a); };
      try {
        $("#jform").requestSubmit(); await frame();
        const btn = $('#jform button[type="submit"]');
        ok(btn.disabled && btn.querySelector(".spin") && !btn.textContent.trim(), "nút chỉ còn vòng quay");
        release(); await wait(80);
      } finally { Demo.saveJournal = orig; release(); }
      ok(areas().every(t => !t.value), "form trống sau khi lưu");
      const first = $("#view-journal .jlist li");
      ok(first.classList.contains("is-new") && first.textContent.includes("Hôm nay"), first.outerHTML);
      setView("today"); await openJ();
      ok(areas().every(t => !t.value), "mở lại vẫn trống");
    });
    test("lưu lần nữa trong ngày: nối vào trang hôm nay, không mất phần cũ", async () => {
      await openJ(); fill({ vui: "Thêm vui" }); $("#jform").requestSubmit(); await wait(80);
      const j = parseJournal(await api().readJournal({ id: todayStr(), date: todayStr() }));
      eq([j.vui.endsWith("Test vui\nThêm vui"), j.bietOn.endsWith("Test biết ơn")], [true, true]);
    });
    test("chạm trang: sheet chữ thuần (không form); Sửa mới ra form điền sẵn", async () => {
      await openJ(); await openToday();
      ok(!$("#sheetBody form") && !$("#sheetBody textarea"), "không có form");
      ok($("#sheetBody .jread").textContent.includes("Thêm vui"), "thấy nội dung");
      ok($("#sheetBody").textContent.includes("Đã lưu vào Google Drive lúc"), "có giờ lưu");
      $("#jEditPage").click(); await frame();
      ok($('#jpast [name="vui"]').value.includes("Thêm vui"), "form Sửa điền sẵn");
      closeSheet(); await reset();
    });
  });

  describe("Sheet xác nhận (sau khi Gemini đọc câu)", () => {
    const P = extra => Object.assign({ reply: "", activities: [], habits: [], journal: "", unwell: false }, extra);
    const act = (title, start, end, date) => ({ title, category: "life", date: date || todayStr(), start, end });
    test("dayHint / validDay", () => {
      eq([dayHint(todayStr()), dayHint(ymd(day(-1))), dayHint(ymd(day(-3)))], ["Hôm nay", "Hôm qua", DOW[day(-3).getDay()]]);
      eq([validDay(ymd(day(-2))), validDay(ymd(day(2))), validDay(""), validDay("13/11")], [ymd(day(-2)), todayStr(), todayStr(), todayStr()]);
    });
    test("thẻ việc theo thứ tự: tên, nhóm, giờ, ngày", async () => {
      await reset();
      renderConfirm(P({ activities: [act("Ăn trưa", "11:30", "13:30")] }));
      const order = [...$("#sheetBody .act").children].map(el => el.dataset.f || el.className.split(" ")[0] || el.tagName);
      eq(order, ["title", "icon-btn", "category", "act__times", "act__date"]);
      closeSheet();
    });
    test("ô ngày: hôm nay bình thường, hôm qua tô màu và ghi 'Hôm qua'", async () => {
      await reset();
      renderConfirm(P({ activities: [act("Lớp tiếng Hàn", "19:00", "21:00", ymd(day(-1)))], habits: [{ id: "korean", level: "full", date: ymd(day(-1)) }] }));
      eq([$('[data-f="date"]').value, $(".act__dayhint").textContent], [ymd(day(-1)), "Hôm qua"]);
      ok($(".act__date").classList.contains("is-other"), "tô màu ngày khác");
      eq($(".hpick__day") && $(".hpick__day").textContent, "Hôm qua", "nhãn ngày cho thói quen gọn");
      const d3 = day(-3); eq(dayShort(ymd(d3)), `${DOW_SHORT[d3.getDay()]} ${dmy(d3)}`);
      eq(dayShort(todayStr()), "");
      renderConfirm(P({ activities: [act("Ăn trưa", "11:30", "13:30")] }));
      eq([$('[data-f="date"]').value, $(".act__dayhint").textContent], [todayStr(), "Hôm nay"]);
      ok(!$(".act__date").classList.contains("is-other"));
      eq($('[data-f="date"]').max, todayStr(), "không chọn được ngày tương lai");
      closeSheet();
    });
    test("đổi ngày trong form: cập nhật chữ, màu; ngày tương lai về hôm nay", async () => {
      await reset();
      renderConfirm(P({ activities: [act("Ăn trưa", "11:30", "13:30")] }));
      const inp = $('[data-f="date"]');
      inp.value = ymd(day(-1)); inp.dispatchEvent(new Event("change", { bubbles: true }));
      eq([$(".act__dayhint").textContent, $(".act__date").classList.contains("is-other")], ["Hôm qua", true]);
      inp.value = ymd(day(3)); inp.dispatchEvent(new Event("change", { bubbles: true }));
      eq([inp.value, $(".act__dayhint").textContent], [todayStr(), "Hôm nay"]);
      closeSheet();
    });
    test("lưu với ngày đã đổi sang hôm qua: ghi vào hôm qua, không hiện ở hôm nay", async () => {
      await reset();
      renderConfirm(P({ activities: [act("Test ngày", "19:00", "20:00")] }));
      const inp = $('[data-f="date"]'); inp.value = ymd(day(-1)); inp.dispatchEvent(new Event("change", { bubbles: true }));
      await savePending();
      const y = (await Demo.listActual(day(-1), today)).find(a => a.title === "Test ngày");
      ok(y && ymd(y.start) === ymd(day(-1)) && hm(y.start) === "19:00", "đã ghi vào hôm qua");
      ok(!S.today.actual.some(a => a.title === "Test ngày"), "không lẫn vào hôm nay");
      await toast._undo();
      ok(!(await Demo.listActual(day(-1), today)).some(a => a.title === "Test ngày"), "hoàn tác xoá");
    });
    test("đổi nhóm trong form: viền đổi màu theo", async () => {
      await reset();
      renderConfirm(P({ activities: [act("Ăn trưa", "11:30", "13:30")] }));
      const sel = $('[data-f="category"]'); sel.value = "people"; sel.dispatchEvent(new Event("change", { bubbles: true }));
      eq($("#sheetBody .act").getAttribute("style"), catVars("people"));
      closeSheet();
    });
    test("không có gì để ghi: nút Lưu bị khoá", async () => {
      await reset();
      renderConfirm(P({ reply: "Mình chưa hiểu lắm." }));
      ok($("#cSave").disabled, "Lưu bị khoá");
      ok($(".reply"), "vẫn hiện lời đáp của AI khi chưa bỏ gì");
      closeSheet();
    });
    test("chế độ Làm việc khác: trống vẫn lưu được (để đánh dấu bỏ qua)", async () => {
      await reset();
      S.otherFor = S.today.plan[0].id;
      try { renderConfirm(P({})); ok(!$("#cSave").disabled); ok($("#sheetBody").textContent.includes("bỏ qua khối đang chạy")); }
      finally { closeSheet(); resetOther(); }
    });
    test("bỏ hết việc: ẩn lời đáp cũ, khoá Lưu, giữ chỗ đã sửa", async () => {
      await reset();
      renderConfirm(P({ reply: "Chúc bạn bữa trưa ngon miệng nhé.", activities: [act("Ăn trưa", "11:30", "13:30"), act("Đi bộ", "17:00", "17:30")] }));
      $$("#sheetBody .act")[1].querySelector('[data-f="title"]').value = "Đi bộ quanh hồ";
      document.querySelector('[data-rm="0"]').click(); await wait(20);
      eq(S.pending.activities.map(a => a.title), ["Đi bộ quanh hồ"], "chỗ đã sửa không mất khi bỏ dòng khác");
      ok($(".reply"), "còn việc thì vẫn giữ lời đáp");
      document.querySelector('[data-rm="0"]').click(); await wait(20);
      ok(!$(".reply"), "lời đáp cũ bị ẩn");
      ok($("#cSave").disabled, "Lưu bị khoá");
      ok($("#sheetBody").textContent.includes("Đã bỏ hết"));
      closeSheet();
    });
    test("savePending khi không còn gì: không ghi, báo rõ", async () => {
      await reset();
      const orig = Demo.addActual; let called = 0; Demo.addActual = async x => { called++; return orig(x); };
      try {
        renderConfirm(P({ journal: "   " }));
        await savePending();
        eq([called, sheetOpen()], [0, false]);
        eq($("#toast span").textContent, "Không có gì để ghi");
      } finally { Demo.addActual = orig; }
    });
    test("giờ ngược: cảnh báo ngay, nói rõ sẽ lưu thành gì, sửa đúng thì tắt", async () => {
      await reset();
      renderConfirm(P({ activities: [act("Học 8 từ mới", "14:25", "14:05")] }));
      const box = $("#sheetBody .act"), w = $(".act__warn", box);
      ok(w && w.textContent.includes("14:25–14:40"), w ? w.textContent : "không có cảnh báo");
      const end = $('[data-f="end"]', box); end.value = "14:45"; end.dispatchEvent(new Event("input", { bubbles: true }));
      ok(!$(".act__warn", box), "hết cảnh báo khi giờ đúng");
      end.value = "14:25"; end.dispatchEvent(new Event("input", { bubbles: true }));
      ok($(".act__warn", box), "bằng nhau cũng cảnh báo");
      closeSheet();
    });
    test("bộ chọn giờ trong app: ô giờ readonly, bấm mở TP, Xong ghi giờ + chạy cảnh báo", async () => {
      await reset();
      renderConfirm(P({ activities: [act("Đọc sách", "14:00", "14:30")] }));
      const box = $("#sheetBody .act"), end = $('[data-f="end"]', box);
      ok(end.readOnly, "ô giờ readonly để Android không mở hộp chọn giờ riêng");
      end.click(); await frame();
      ok(TP.isOpen(), "bấm ô giờ mở bộ chọn"); eq($("#tpTitle").textContent, "Kết thúc");
      const col = k => $(`.tp__col[data-k="${k}"]`);
      eq([Math.round(col("h").scrollTop / 44), Math.round(col("m").scrollTop / 44)], [14, 30], "mở đúng giờ đang có");
      col("h").scrollTop = 13 * 44; col("m").scrollTop = 5 * 44;
      $(".tp [data-tp-ok]").click();
      eq([TP.isOpen(), end.value], [false, "13:05"]);
      ok($(".act__warn", box), "giờ ngược vẫn báo ngay");
      end.click(); await frame(); $(".tp [data-tp-close]").click();
      eq([TP.isOpen(), end.value], [false, "13:05"], "Hủy không đổi giờ");
      closeSheet();
    });
    test("sheet có nhiều thẻ: Hủy/Lưu dính đáy panel", async () => {
      await reset();
      renderConfirm(P({ activities: [act("A", "09:00", "09:30"), act("B", "10:00", "10:30"), act("C", "11:00", "11:30")] }));
      eq(getComputedStyle($("#sheetBody .sheet-actions")).position, "sticky");
      closeSheet();
    });
    test("cảnh báo giờ ngược có cả ở sheet Thêm kế hoạch", async () => {
      await reset();
      renderPlanAdd(at("10:00"));
      $("#pEnd").value = "09:00"; $("#pEnd").dispatchEvent(new Event("input", { bubbles: true }));
      ok($(".act__warn"), "có cảnh báo");
      closeSheet();
    });
    test("Tự thêm: nút trong ô nhập mở thẻ việc trống, không gọi AI, tên lấy từ chữ đã gõ", async () => {
      await reset();
      const orig = window.callGemini; let ai = 0; window.callGemini = async () => { ai++; return orig(); };
      try {
        openCompose(); $("#inputText").value = "Dọn phòng\nrồi nghỉ";
        $("#btnManual").click(); await wait(20);
        eq([sheetOpen(), sheetTitle(), ai], [true, "Thêm việc đã làm", 0]);
        ok(!$("#dock").classList.contains("is-open"), "ô nhập đóng lại");
        const box = $$("#sheetBody .act"); eq(box.length, 1);
        eq($('[data-f="title"]', box[0]).value, "Dọn phòng");
        eq($('[data-f="end"]', box[0]).value, hm(new Date()));
        ok(!$(".reply"), "không có lời đáp AI");
        ok(!$("#sheetBody").textContent.includes("Thời gian thực tế"), "không có dòng nhóm");
      } finally { window.callGemini = orig; closeSheet(); $("#inputText").value = ""; resetOther(); }
    });
    test("Tự thêm khi Làm việc khác: giờ từ đầu khối đang chạy, nhóm theo khối; lưu thì ghi việc + bỏ qua khối", async () => {
      await reset();
      const blk = block("Khối test", new Date(Date.now() - 40 * 60000), new Date(Date.now() + 20 * 60000), { id: "t_manual", cat: "korean" });
      S.today.plan.push(blk); S.otherFor = blk.id;
      try {
        const p = manualPending("");
        eq([p.activities[0].start, p.activities[0].category, p.activities[0].title], [hm(blk.start), "korean", ""]);
        renderConfirm(p); await savePending();
        const a = S.today.actual[S.today.actual.length - 1];
        eq(a.title, CATS.korean.name, "tên trống thì lấy tên nhóm");
        ok((S.today.rec.skip || []).includes(blk.id), "khối đang chạy được đánh dấu bỏ qua");
      } finally { S.today.plan = S.today.plan.filter(b => b.id !== blk.id); resetOther(); closeSheet(); }
    });
    test("+ Thêm việc: thẻ mới nối tiếp thẻ cuối, không mất chỗ đã sửa", async () => {
      await reset();
      renderConfirm(P({ activities: [act("Lớp tiếng Hàn", "19:00", "21:00", ymd(day(-1)))] }));
      $('#sheetBody [data-f="title"]').value = "Lớp Hàn";
      $("#cAddAct").click(); await wait(20);
      const a = S.pending.activities;
      eq(a.length, 2); eq(a[0].title, "Lớp Hàn", "chỗ đã sửa còn");
      eq([a[1].title, a[1].category, a[1].date, a[1].start, a[1].end], ["", "life", ymd(day(-1)), "21:00", "21:30"]);
      eq($$("#sheetBody .act").length, 2);
      eq(document.activeElement, $$('#sheetBody [data-f="title"]')[1], "focus ô tên thẻ mới");
      closeSheet();
    });
    test("form Thêm kế hoạch và Sửa việc đã làm: Tên → Nhóm → Giờ", async () => {
      await reset();
      const order = () => [...$("#sheetBody .act").children].map(el => el.tagName === "SELECT" ? "nhóm" : el.classList.contains("act__times") ? "giờ" : el.type === "text" ? "tên" : null).filter(Boolean);
      renderPlanAdd(at("10:00")); eq(order(), ["tên", "nhóm", "giờ"]); closeSheet();
      renderConfirm(P({ activities: [act("A", "10:00", "10:30")] })); await savePending();
      $(`[data-aid="${S.today.actual[S.today.actual.length - 1].id}"]`).click(); await wait(20);
      eq(sheetTitle(), "Sửa việc đã làm"); eq(order(), ["tên", "nhóm", "giờ"]); closeSheet();
    });
    test("lỗi thiếu Gemini key: toast có nút Mở Cài đặt", async () => {
      await reset();
      handleErr(Object.assign(new Error("Chưa có Gemini API key"), { needKey: true }));
      const b = $(".toast__undo");
      ok(b && b.textContent.includes("Mở Cài đặt"), b ? b.textContent : "không có nút");
      b.click(); await wait(30);
      eq([sheetOpen(), sheetTitle()], [true, "Cài đặt"]);
      ok(!$("#toast").classList.contains("is-on"), "không hiện 'Đã hoàn tác'");
      closeSheet();
    });
  });

  describe("Timeline: khối chồng giờ", () => {
    const g = it => ({ top: +it.start / 60000, bot: +it.end / 60000 });
    const b = (id, s, e) => ({ id, start: new Date(s * 60000), end: new Date(e * 60000) });
    test("laneLayout: chồng nhau thì chia làn, không chồng thì 1 làn", () => {
      const m = laneLayout([b("a", 0, 30), b("b", 10, 40), b("c", 50, 60)], g);
      eq([m.get("a"), m.get("b"), m.get("c")], [{ lane: 0, n: 2 }, { lane: 1, n: 2 }, { lane: 0, n: 1 }]);
    });
    test("laneLayout: làn trống được dùng lại trong cùng cụm", () => {
      const m = laneLayout([b("a", 0, 20), b("b", 10, 60), b("c", 25, 40)], g);
      eq([m.get("a").lane, m.get("b").lane, m.get("c").lane, m.get("c").n], [0, 1, 0, 2]);
    });
    test("timeline: 2 việc chồng giờ nằm cạnh nhau, việc riêng giữ toàn bề ngang", () => {
      S.today = { plan: [], rec: blankRec(todayStr()), actual: [
        { id: "x", kind: "act", title: "Học 8 từ mới", start: at("14:05"), end: at("14:25"), cat: "korean" },
        { id: "y", kind: "act", title: "Đọc sách", start: at("14:12"), end: at("14:52"), cat: "build" },
        { id: "z", kind: "act", title: "Ăn tối", start: at("18:30"), end: at("19:00"), cat: "life" }] };
      const bd = html(timelineHTML()), X = bd.querySelector('[data-aid="x"]'), Y = bd.querySelector('[data-aid="y"]'), Z = bd.querySelector('[data-aid="z"]');
      eq([X.style.left, Y.style.left], ["0%", "50%"]);
      ok(X.style.width.includes("50%") && Y.style.width.includes("50%"), X.style.width);
      eq(Z.style.width, "", "việc không chồng giữ nguyên");
    });
    test("khối cao tối thiểu (22px) đè khối sau cũng được tách làn", () => {
      S.today = { plan: [], rec: blankRec(todayStr()), actual: [
        { id: "p", kind: "act", title: "A", start: at("10:00"), end: at("10:05"), cat: "life" },
        { id: "q", kind: "act", title: "B", start: at("10:10"), end: at("10:40"), cat: "life" }] };
      const bd = html(timelineHTML());
      eq(bd.querySelector('[data-aid="q"]').style.left, "50%");
    });
  });

  describe("Màn hình", () => {
    test("thanh dưới có 4 ô; Cài đặt mở sheet, không đổi tab", async () => {
      await reset();
      eq([...document.querySelectorAll(".tabs .tab")].map(t => t.textContent.trim()), ["Hôm nay", "Thói quen", "Nhật ký", "Cài đặt"]);
      $("#btnSettings").click(); await wait(30);
      eq([sheetOpen(), sheetTitle()], [true, "Cài đặt"]);
      eq([...document.querySelectorAll(".tab.is-on")].map(t => t.dataset.view), ["today"]);
      closeSheet();
    });
    test("đầu trang 1 dòng chữ nhỏ: lời chào · ngày", async () => {
      await reset();
      eq($("#dateTitle").textContent, fmtDate(new Date()));
      ok(["Khuya rồi", "Chào buổi sáng", "Buổi trưa", "Buổi chiều", "Buổi tối"].includes($("#greet").textContent));
      eq(getComputedStyle($("#dateTitle")).fontSize, getComputedStyle($("#greet")).fontSize);
      const g = $("#greet").getBoundingClientRect(), t = $("#dateTitle").getBoundingClientRect();
      ok(Math.abs(g.top - t.top) < g.height / 2 && t.left > g.right, `cùng một dòng: greet ${J(g)}, ngày ${J(t)}`);
    });
    test("timeline: không còn nút thu gọn; mở ra cuộn tới giờ hiện tại, render lại giữ chỗ", async () => {
      await reset();
      $("#view-today").innerHTML = ""; renderToday(); await frame(); await frame();
      ok(!$("#btnTlToggle"), "không còn nút thu gọn");
      const sc = $(".tl__scroll"), want = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, +sc.dataset.now - sc.clientHeight * 0.35));
      ok(Math.abs(sc.scrollTop - want) <= 1, `scrollTop ${sc.scrollTop}, mong ${want}`);
      sc.scrollTop = 123; renderToday();
      eq($(".tl__scroll").scrollTop, 123);
    });
    test("Thói quen · Tuần: chú thích nằm trên bảng, căn giữa, không còn 'Chạm ô để sửa'", async () => {
      await reset(); S.habView = "week"; S.habWeek = null; setView("habits");
      const lg = $("#view-habits .legend");
      ok(lg && lg.nextElementSibling.classList.contains("week"), "chú thích ngay trên bảng tuần");
      ok(lg.previousElementSibling.classList.contains("hnav"), "ngay dưới tiêu đề");
      eq(getComputedStyle(lg).justifyContent, "center");
      ok(!$("#view-habits").textContent.includes("Chạm ô để sửa"));
    });
    test("Thói quen · Tháng: chú thích cùng vị trí, đủ thẻ habit", async () => {
      S.habView = "month"; S.calMonth = null; renderHabits();
      const lg = $("#view-habits .legend");
      ok(lg.previousElementSibling.classList.contains("hnav"), "ngay dưới tiêu đề");
      eq(document.querySelectorAll("#view-habits .hcard").length, HABITS.length);
      S.habView = "week"; await reset();
    });
    test("Thói quen · lùi tuần rồi tới lại", async () => {
      await reset(); S.habView = "week"; S.habWeek = null; setView("habits");
      ok($('[data-week="1"]').disabled, "tuần này không tới được nữa");
      $('[data-week="-1"]').click(); await wait(50);
      eq($(".hnav__t b").textContent, "Tuần trước");
      $('[data-week="1"]').click(); await wait(50);
      eq($(".hnav__t b").textContent, "Tuần này");
      await reset();
    });
  });

  // ------------------------------------------------------------ quản lý thói quen
  describe("Quản lý thói quen", () => {
    const keep = () => ALLH.map(h => Object.assign({}, h));
    const back = async list => { await saveHabits(list); localStorage.removeItem("sl.demoHabits"); loadLocalHabits(); };
    test("nút vào trang quản lý nằm trong tab Thói quen, quay lại được", async () => {
      await reset(); setView("habits");
      ok($("#hManage"), "có nút Quản lý");
      $("#hManage").click(); await wait(20);
      eq($("#view-habits .mhead h2").textContent, "Quản lý thói quen");
      eq(document.querySelectorAll("#view-habits .mlist .mrow").length, HABITS.length);
      $("#hBack").click(); await wait(20);
      ok($("#view-habits .vtoggle") && !$("#view-habits .mhead"), "về trang Thói quen");
      $("#hManage").click(); await wait(20); setView("habits");
      ok(!S.habManage, "bấm tab Thói quen thì về trang chính");
      await reset();
    });
    test("normHabit: sửa lịch sai, mức theo tuần nằm trong 1..7", () => {
      eq(normHabit({ name: " ", freq: "days", days: [] }).freq, "daily");
      eq(normHabit({ name: "x", freq: "lạ" }).freq, "daily");
      const w = normHabit({ name: "x", freq: "weekly", days: [], perWeekFull: 9, perWeekMin: 12 });
      eq([w.days.length, w.perWeekFull, w.perWeekMin], [7, 7, 7]);
      eq(normHabit({ name: "x", freq: "days", days: [5, 1, 1, 9] }).days, [1, 5]);
    });
    test("freqLabel và aiRule", () => {
      eq(freqLabel({ freq: "daily" }), "Mỗi ngày");
      eq(freqLabel({ freq: "days", days: [5, 1, 0] }), "T2 · T6 · CN");
      eq(freqLabel(normHabit({ freq: "weekly", days: [], perWeekFull: 3 })), "3 lần/tuần");
      eq(freqLabel(normHabit({ freq: "weekly", days: [2, 6], perWeekFull: 2 })), "2 lần/tuần · T3 · T7");
      eq(aiRule({ full: "2 lít", min: "1 lít" }), "full: 2 lít. min: 1 lít.");
      eq(aiRule({ full: "", rule: "full: có đọc sách." }), "full: có đọc sách.");
      eq(aiRule({ full: "ăn đủ 3 bữa. min: có bữa qua loa.", min: "không bỏ bữa" }), "full: ăn đủ 3 bữa. min: có bữa qua loa.");
      eq(aiRule({ full: "value = số bước. full: >= 3000.", min: "2000 bước" }), "value = số bước. full: >= 3000. min: 2000 bước.");
      eq(aiRule({ min: "1 dòng" }), "full: có làm. min: 1 dòng.");
    });
    test("Ghi chú cho AI cũ (rule) gộp vào Thế nào là đạt, luật AI không đổi", () => {
      const old = { name: "x", full: "5:30", min: "trước 6:00", rule: "full: dậy trước 5:35. min: dậy trước 6:00." };
      const h = normHabit(old);
      eq([h.full, "rule" in h], ["dậy trước 5:35. min: dậy trước 6:00.", false]);
      eq(aiRule(h), aiRule(old));
      eq(normHabit({ name: "x", full: "2 lít", rule: "" }).full, "2 lít");
    });
    test("thêm thói quen: hiện ở Hôm nay, ở bảng tuần, có trong luật AI; ngày trước không tính là bỏ", async () => {
      const prev = keep(); await reset(); setView("habits"); S.habManage = true; renderHabits();
      $("#hAdd").click(); await wait(20);
      eq(sheetTitle(), "Thêm thói quen");
      $("#hSave").click(); await wait(20);
      ok(!$("#hErr").hidden && sheetOpen(), "thiếu tên thì báo, không đóng sheet");
      $("#hName").value = "Uống 2 lít nước"; $("#hShort").value = "Nước"; $("#hFull").value = "2 lít"; $("#hMin").value = "1 lít";
      $('[data-hicon="ph-drop"]').click();
      $("#hSave").click(); await wait(30);
      ok(!sheetOpen(), "lưu xong đóng sheet");
      const h = ALLH[ALLH.length - 1];   // ALLH giữ thứ tự thêm, HABITS xếp theo nhóm
      eq([h.name, h.short, h.icon, h.freq, h.since], ["Uống 2 lít nước", "Nước", "ph-drop", "daily", todayStr()]);
      eq(cellStatus(h, day(-1)), "none", "hôm qua chưa theo dõi");
      ok(geminiPrompt("x").includes(`${h.id} (Uống 2 lít nước): full: 2 lít. min: 1 lít.`), "có trong prompt");
      ok(geminiSchema().properties.habits.items.properties.id.enum.includes(h.id), "có trong schema");
      ok(JSON.parse(localStorage.getItem("sl.demoHabits")).some(x => x.id === h.id), "lưu trong máy");
      setView("today");
      ok($(`[data-habit="${h.id}"]`), "chip ở Hôm nay");
      await back(prev); await reset();
    });
    test("ngày cố định: chưa chọn ngày thì báo; theo tuần ẩn ô tối thiểu, lưu số lần", async () => {
      const prev = keep(); await reset();
      renderHabForm(null); $("#hName").value = "Đọc sách";
      $('[data-hfreq="days"]').click();
      eq($("#hForm").dataset.freq, "days");
      $("#hSave").click(); await wait(20);
      ok(!$("#hErr").hidden, "báo chọn ngày");
      $('[data-hfreq="weekly"]').click();
      eq(getComputedStyle($(".hf-min")).display, "none");
      ok(getComputedStyle($(".hf-week")).display !== "none", "hiện ô số lần");
      $("#hPerFull").value = "3"; $("#hPerMin").value = "2";
      $("#hSave").click(); await wait(30);
      const h = ALLH[ALLH.length - 1];   // ALLH giữ thứ tự thêm, HABITS xếp theo nhóm
      eq([h.freq, h.perWeekFull, h.perWeekMin, h.days.length, h.min], ["weekly", 3, 2, 7, "2 lần/tuần"]);
      await back(prev); await reset();
    });
    test("đổi thứ tự, ngừng theo dõi, theo dõi lại, xoá hẳn có hoàn tác", async () => {
      const prev = keep(); await reset(); setView("habits"); S.habManage = true; renderHabits();
      const [a, b] = HABITS.map(h => h.id);
      $(`[data-hmove="${b}"][data-dir="-1"]`).click(); await wait(20);
      eq(HABITS.slice(0, 2).map(h => h.id), [b, a]);
      renderHabForm(a); $("#hStop").click(); await wait(20);
      ok(!HABITS.some(h => h.id === a) && H[a].off, "đã ngừng");
      ok($("#view-habits").textContent.includes("Đã ngừng"), "có mục Đã ngừng");
      ok(!geminiPrompt("x").includes(`- ${a} (`), "không còn trong prompt");
      renderHabForm(a); $("#hResume").click(); await wait(20);
      ok(HABITS.some(h => h.id === a) && !H[a].off && H[a].since === todayStr(), "theo dõi lại từ hôm nay");
      renderHabForm(a); $("#hStop").click(); await wait(20);
      renderHabForm(a); $("#hDelete").click(); await wait(20);
      ok(!H[a], "đã xoá");
      $(".toast__undo").click(); await wait(30);
      ok(H[a] && H[a].off, "hoàn tác: trở lại như trước khi xoá");
      await back(prev); await reset();
    });
    test("thói quen đã ngừng: bấm Đã làm ở khối kế hoạch không đánh dấu", async () => {
      const prev = keep(); await reset();
      await saveHabits(ALLH.map(h => (h.id === "yoga" ? Object.assign({}, h, { off: true }) : h)));
      const now = new Date(), blk = block("Yoga thử", new Date(now - 10 * 60000), new Date(+now + 10 * 60000), { habit: "yoga", cat: "health" });
      S.today.plan = [blk];
      const before = (S.today.rec || {}).h?.yoga;
      await markBlock(blk.id, "done");
      eq((S.today.rec || {}).h?.yoga, before);
      await back(prev); await reset();
    });
    test("không còn thói quen nào: tab Thói quen có nút thêm, Hôm nay không có tiêu đề thói quen", async () => {
      const prev = keep(); await reset();
      await saveHabits([]); setView("habits");
      ok($("#view-habits .empty #hAdd"), "nút Thêm thói quen");
      setView("today");
      ok(![...document.querySelectorAll("#view-today .h2")].some(x => x.textContent.includes("Thói quen hôm nay")));
      ok(!("enum" in geminiSchema().properties.habits.items.properties.id), "schema không có enum rỗng");
      await back(prev); await reset();
    });
  });

  // ------------------------------------------------------------ đổi lịch từ một ngày
  describe("Đổi lịch thói quen từ một ngày", () => {
    const keep = () => ALLH.map(h => Object.assign({}, h));
    const back = async list => { await saveHabits(list); localStorage.removeItem("sl.demoHabits"); loadLocalHabits(); };
    const yoga = () => normHabit({ id: "y", name: "Yoga", freq: "days", days: [1, 3, 5] });
    // ngày gần nhất trước hôm nay không nằm trong T2-4-6
    const offDay = () => { for (let i = 1; ; i++) { const d = day(-i); if (![1, 3, 5].includes(d.getDay())) return d; } };
    test("đổi sang Mỗi ngày từ hôm nay: ngày cũ ngoài lịch vẫn là nghỉ, không thành Bỏ", () => {
      const old = yoga(), d = offDay();
      setDays([rec(d)]);
      eq(cellStatus(old, d), "off");
      const h = applySched(old, { freq: "daily" }, todayStr());
      eq(h.freq, "daily");
      eq(h.prev, [{ until: ymd(day(-1)), freq: "days", days: [1, 3, 5] }]);
      eq(cellStatus(h, d), "off", "ngày cũ giữ lịch cũ");
      ok(scheduled(h, today), "hôm nay theo lịch mới");
      eq(pendingFrom(h), null);
    });
    test("hẹn đổi lịch ở tương lai: hôm nay vẫn lịch cũ, có ghi chú 'từ ngày'", () => {
      const old = yoga(), F = ymd(day(3));
      const h = applySched(old, { freq: "daily" }, F);
      eq(sch(h, today).freq, "days");
      eq(sch(h, day(2)).freq, "days");
      eq(sch(h, day(3)).freq, "daily");
      eq(pendingFrom(h), F);
      ok(schedNote(h).includes(`từ ${dm(F)}: Mỗi ngày`), schedNote(h));
    });
    test("sửa lại lịch đã hẹn: thay mốc cũ; chọn lại đúng lịch đang chạy thì huỷ hẹn", () => {
      const old = yoga();
      let h = applySched(old, { freq: "daily" }, ymd(day(3)));
      h = applySched(h, { freq: "daily" }, ymd(day(5)));
      eq([h.prev.length, pendingFrom(h)], [1, ymd(day(5))]);
      eq(sch(h, day(4)).freq, "days", "ngày 4 vẫn lịch cũ");
      h = applySched(h, { freq: "days", days: [1, 3, 5] }, ymd(day(5)));
      eq([h.freq, h.prev, pendingFrom(h)], ["days", undefined, null]);
    });
    test("đổi hai lần: mỗi đoạn giữ đúng lịch của nó", () => {
      const old = Object.assign(yoga(), { prev: [{ until: ymd(day(-10)), freq: "daily" }] });
      const h = applySched(old, { freq: "weekly", perWeekFull: 2, perWeekMin: 1 }, todayStr());
      eq(h.prev.map(p => p.freq), ["daily", "days"]);
      eq([sch(h, day(-11)).freq, sch(h, day(-5)).freq, sch(h, today).freq], ["daily", "days", "weekly"]);
    });
    test("số lần/tuần: tuần cũ tính theo lịch thứ Hai đầu tuần; tối thiểu 0 không làm chuỗi vô tận", () => {
      const mon = mondayOf(today), lastMon = addDays(mon, -7);
      const h = normHabit({ id: "g", name: "Gym", freq: "weekly", perWeekFull: 3, perWeekMin: 0, prev: [{ until: ymd(addDays(mon, -1)), freq: "weekly", perWeekFull: 2, perWeekMin: 1 }] });
      setDays([]);
      eq(weekCount(h, lastMon).total, 2);
      eq(weekCount(h, mon).total, 3);
      eq(weekCount(h, lastMon).ok, false);
    });
    test("form: không cho chọn ngày đã qua; sửa lịch Yoga từ hôm nay giữ lịch cũ", async () => {
      const prev = keep(); await reset();
      renderHabForm("yoga");
      eq([$("#hFrom").value, $("#hFrom").min], [todayStr(), todayStr()]);
      $("#hFrom").value = ymd(day(-1)); $("#hSave").click(); await wait(20);
      ok(!$("#hErr").hidden && sheetOpen(), "báo lỗi ngày đã qua");
      $("#hFrom").value = todayStr(); $('[data-hfreq="daily"]').click();
      $("#hSave").click(); await wait(30);
      ok(!sheetOpen(), "đã lưu");
      eq([H.yoga.freq, H.yoga.prev && H.yoga.prev[0].days], ["daily", [1, 3, 5]]);
      await back(prev); await reset();
    });
    test("thêm thói quen bắt đầu ở tương lai: chưa hiện ở Hôm nay", async () => {
      const prev = keep(); await reset();
      renderHabForm(null); $("#hName").value = "Thiền"; $("#hFrom").value = ymd(day(2));
      $("#hSave").click(); await wait(30);
      const h = HABITS.find(x => x.name === "Thiền");
      eq(h.since, ymd(day(2)));
      setView("today");
      ok(!$(`[data-habit="${h.id}"]`), "không có chip hôm nay");
      ok(schedNote(h).startsWith(`Bắt đầu ${dm(ymd(day(2)))}`), schedNote(h));
      await back(prev); await reset();
    });
  });

  // ------------------------------------------------------------ nhóm thói quen
  describe("Nhóm thói quen", () => {
    const keep = () => ALLH.map(h => Object.assign({}, h));
    const back = async list => { await saveHabits(list); localStorage.removeItem("sl.demoHabits"); loadLocalHabits(); };
    test("mặc định có nhóm hợp lệ; thiếu nhóm thì lấy theo mặc định hoặc Sinh hoạt", () => {
      for (const hb of DEFAULT_HABITS) ok(CATS[hb.cat], hb.id);
      eq(normHabit({ id: "yoga", name: "Yoga" }).cat, "health");
      eq(normHabit({ id: "lạ", name: "X", cat: "không có" }).cat, "life");
    });
    test("HABITS xếp theo nhóm, trong nhóm giữ thứ tự người dùng", async () => {
      const prev = keep();
      await saveHabits([{ id: "a", name: "A", cat: "life" }, { id: "b", name: "B", cat: "health" }, { id: "c", name: "C", cat: "life" }, { id: "d", name: "D", cat: "health" }]);
      eq(HABITS.map(h => h.id), ["b", "d", "a", "c"]);
      eq(ALLH.map(h => h.id), ["a", "b", "c", "d"]);
      await moveHabit("c", -1);
      eq(HABITS.map(h => h.id), ["b", "d", "c", "a"]);
      await moveHabit("b", -1);
      eq(HABITS.map(h => h.id), ["b", "d", "c", "a"], "đầu nhóm thì không lên được");
      await back(prev);
    });
    test("trang quản lý gom theo nhóm, không còn mũi tên ›; bảng tuần tô màu nhóm, Hôm nay không chấm", async () => {
      await reset(); setView("habits");
      ok([...document.querySelectorAll("#view-habits .wname")].every(x => x.style.getPropertyValue("--cat")), "màu nhóm ở bảng tuần");
      S.habManage = true; renderHabits();
      const groups = [...document.querySelectorAll("#view-habits .mgroup")].map(x => x.textContent.trim());
      eq(groups, Object.entries(CATS).filter(([k]) => HABITS.some(h => h.cat === k)).map(([, c]) => c.name));
      ok(!$("#view-habits .ph-caret-right"), "không còn ›");
      setView("today");
      ok(!document.querySelector("#view-today .chip .dot"), "Hôm nay không có chấm màu");
      await reset();
    });
    test("form: chọn nhóm được lưu; nút Ngừng theo dõi ở đầu form", async () => {
      const prev = keep(); await reset();
      renderHabForm("journal");
      eq($("#hCat").value, "life");
      ok($("#hForm").firstElementChild.classList.contains("mdanger"), "Ngừng theo dõi ở đầu");
      $("#hCat").value = "build"; $("#hSave").click(); await wait(30);
      eq(H.journal.cat, "build");
      await back(prev); await reset();
    });
  });

  // ------------------------------------------------------------ chạy
  const results = [];
  for (const t of T) {
    try { await t.fn(); results.push({ group: t.group, name: t.name, ok: true }); }
    catch (e) { results.push({ group: t.group, name: t.name, ok: false, err: (e && e.stack) || String(e) }); }
  }
  window.__testDone(results);
})().catch(e => window.__testDone([{ group: "runner", name: "tests.js", ok: false, err: String(e && e.stack || e) }]));
