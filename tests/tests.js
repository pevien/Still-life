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
      eq([0, 45, 60, 65, 130, 59.6].map(fmtDur), ["0p", "45p", "1h", "1h05", "2h10", "1h"]);
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
    test("tên thói quen tối đa NAME_MAX ký tự; không còn tên ngắn", () => {
      for (const hb of SAMPLE_HABITS) { ok(hb.name.length <= NAME_MAX, hb.name); ok(!("short" in hb), hb.id); }
      ok(!("short" in normHabit({ id: "x", name: "X", short: "cũ" })), "trường cũ bị bỏ");
    });
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
      const r = { id: "d1", date: "2026-11-14", h: { eat: "full", walk: "min" }, v: { walk: 2400 }, unwell: true, reason: "mệt", skip: ["a"], muted: ["b", "c"], late: null };
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

  describe("Kéo-thả timeline Hôm nay", () => {
    // gửi down → (giữ) → move → move → up lên một phần tử; cảm ứng thì chờ đủ HOLD mới kéo
    const drag = async (el, y0, y1, type = "touch", hold = true) => {
      const o = { bubbles: true, cancelable: true, pointerId: 7, pointerType: type, isPrimary: true, button: 0, clientX: el.getBoundingClientRect().left + 10 };
      el.dispatchEvent(new PointerEvent("pointerdown", Object.assign({}, o, { clientY: y0 })));
      if (type === "touch" && hold) await wait(Drag.HOLD + 40);
      el.dispatchEvent(new PointerEvent("pointermove", Object.assign({}, o, { clientY: (y0 + y1) / 2 })));
      el.dispatchEvent(new PointerEvent("pointermove", Object.assign({}, o, { clientY: y1 })));
      el.dispatchEvent(new PointerEvent("pointerup", Object.assign({}, o, { clientY: y1 })));
      await wait(60);
    };
    // khối kéo được: giờ tròn 15 phút, cách mép khung ≥ 1 giờ; cuộn cho nó nằm giữa khung
    const pickPlan = () => S.today.plan.find(p => !(p.start.getMinutes() % 15) && !(p.end.getMinutes() % 15) && p.start.getHours() >= TL.H0 + 1 && p.end.getHours() < TL.H1 - 1 && p.end - p.start >= 30 * 60000);
    const center = el => { const sc = $(".tl__scroll"); sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - sc.clientHeight / 2; return el.getBoundingClientRect(); };
    const saved = async id => (await Demo.listPlan(today, day(1))).find(x => x.id === id);

    test("cảm ứng: giữ rồi kéo khối kế hoạch xuống 30 phút, lưu cho hôm nay, hoàn tác về như cũ", async () => {
      await reset(); renderToday();
      const p = pickPlan(), el = $(`.tl__col--plan [data-pid="${p.id}"]`), r = center(el), y = r.top + Math.min(14, r.height / 3);
      await drag(el, y, y + TL.PX / 2 + 3);
      const n = await saved(p.id);
      eq([hm(n.start), hm(n.end)], [hm(new Date(+p.start + 30 * 60000)), hm(new Date(+p.end + 30 * 60000))]);
      ok(!Drag.st && !$(".tl__scroll.is-dragging") && !$(".tl__dragtime"), "dọn sạch trạng thái kéo");
      ok(toast._undo, "có hoàn tác");
      await toast._undo();
      eq(hm((await saved(p.id)).start), hm(p.start), "hoàn tác");
    });
    test("chuột: kéo mép dưới chỉ đổi giờ kết thúc", async () => {
      await reset(); renderToday();
      const p = pickPlan(), el = $(`.tl__col--plan [data-pid="${p.id}"]`), r = center(el);
      await drag(el, r.bottom - 2, r.bottom - 2 + TL.PX, "mouse");
      const n = await saved(p.id);
      eq([hm(n.start), hm(n.end)], [hm(p.start), hm(new Date(+p.end + 60 * 60000))]);
      await toast._undo();
    });
    test("kéo khối Thực tế lên 15 phút", async () => {
      await reset();
      const a = await Demo.addActual({ title: "Kéo thử", cat: "build", start: at("10:00"), end: at("10:45") });
      await loadToday(); renderToday();
      const el = $(`.tl__col--act [data-aid="${a.id}"]`), r = center(el), y = r.top + 10;
      await drag(el, y, y - TL.PX / 4, "mouse");
      const n = (await Demo.listActual(today, day(1))).find(x => x.id === a.id);
      eq([hm(n.start), hm(n.end)], ["09:45", "10:30"]);
      await Demo.deleteActual(a.id); await reset();
    });
    test("kéo chỗ trống cột Kế hoạch mở sheet Thêm với khoảng đã chọn", async () => {
      await reset(); S.today.plan = []; renderToday();
      const col = $(".tl__col--plan"), sc = $(".tl__scroll");
      sc.scrollTop = (14 - TL.H0) * TL.PX - 60;
      const y = m => col.getBoundingClientRect().top + (m / 60 - TL.H0) * TL.PX;
      await drag(col, y(14 * 60 + 5), y(15 * 60 + 20), "mouse");
      eq([sheetTitle(), $("#pStart").value, $("#pEnd").value], ["Thêm kế hoạch", "14:00", "15:30"]);
      ok(!$(".tl__ghost"), "bỏ khối nháp");
      closeSheet(); await reset();
    });
    test("chạm nhanh vẫn mở sheet; vuốt trước khi giữ đủ lâu thì không kéo; kéo chưa quá nửa bước thì không lưu", async () => {
      await reset(); renderToday();
      const orig = Demo.updatePlan; let called = 0;
      Demo.updatePlan = async x => { called++; return orig(x); };
      try {
        const p = pickPlan(), el = $(`.tl__col--plan [data-pid="${p.id}"]`), r = center(el), y = r.top + 10;
        await drag(el, y, y + 40, "touch", false);
        ok(!Drag.st && !el.classList.contains("is-lifted"), "vuốt = cuộn, không nhấc khối");
        await drag(el, y, y + TL.PX / 10, "mouse");
        eq(called, 0, "không gọi lưu");
        el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch", isPrimary: true, button: 0, clientY: y }));
        el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch", isPrimary: true, button: 0, clientY: y }));
        Drag.dropped = 0; $(`.tl__col--plan [data-pid="${p.id}"]`).click(); await wait(30);
        eq(sheetTitle(), "Chỉnh sửa kế hoạch");
      } finally { Demo.updatePlan = orig; closeSheet(); }
    });
    test("Esc khi đang kéo thì trả khối về chỗ cũ", async () => {
      await reset(); renderToday();
      const p = pickPlan(), el = $(`.tl__col--plan [data-pid="${p.id}"]`), r = center(el), y = r.top + 10;
      const o = { bubbles: true, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0 };
      el.dispatchEvent(new PointerEvent("pointerdown", Object.assign({}, o, { clientY: y })));
      el.dispatchEvent(new PointerEvent("pointermove", Object.assign({}, o, { clientY: y + TL.PX })));
      ok(Drag.st && Drag.st.lifted, "đang kéo");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      ok(!Drag.st, "huỷ");
      eq(hm((await saved(p.id)).start), hm(p.start));
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
        ok($("#btnUnwell"), "quay lại nút không khoẻ");
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
        saveSettings(); S.cfg = keep.cfg; S.tok = keep.tok; S.cfgLooked = keep.looked;
        loadLocalHabits();   // như refresh() khi đổi giữa thật và xem thử: chế độ thật chưa có lịch thì danh sách trống
        await reset();
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
      try { renderConfirm(P({})); ok(!$("#cSave").disabled); ok($("#sheetBody").textContent.includes("bỏ qua lịch đang chạy")); }
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
    test("Thói quen · Tháng: không có chú thích màu, đủ thẻ habit", async () => {
      S.habView = "month"; S.calMonth = null; renderHabits();
      ok(!$("#view-habits .legend"), "không còn dòng chú thích");
      ok($("#view-habits .hnav").nextElementSibling.classList.contains("hcard"), "thẻ đầu ngay dưới tiêu đề");
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
      $("#hName").value = "Uống 2 lít nước"; $("#hFull").value = "2 lít"; $("#hMin").value = "1 lít";
      $('[data-hicon="ph-drop"]').click();
      $("#hSave").click(); await wait(30);
      ok(!sheetOpen(), "lưu xong đóng sheet");
      const h = ALLH[ALLH.length - 1];   // ALLH giữ thứ tự thêm, HABITS xếp theo nhóm
      eq([h.name, h.icon, h.freq, h.since], ["Uống 2 lít nước", "ph-drop", "daily", todayStr()]);
      ok(!$("#hShort") && !("short" in h), "không còn tên ngắn");
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
    test("Đã làm rồi bấm ↺ ở thẻ: thói quen trở về mức trước (cả khi mở lại app)", async () => {
      await reset();
      const d = todayStr(), orig = (S.days[d] || {}).h?.journal, lv = () => (S.days[d] || {}).h?.journal;
      const now = new Date(), blk = block("Nhật ký thử", new Date(now - 10 * 60000), new Date(+now + 10 * 60000), { habit: "journal", cat: "life" });
      try {
        for (const before of [undefined, "min"]) {
          await setHabit(d, "journal", before || null); S.today.plan = [blk];
          await markBlock(blk.id, "done"); eq(lv(), "full", "Đã làm đánh dấu đạt");
          await unmarkBlock(blk.id); eq(lv(), before, "↺ trả về " + before);
        }
        // mở lại app: việc đã làm đọc lại từ lịch, vẫn biết mức cũ
        await setHabit(d, "journal", null); S.today.plan = [blk];
        await markBlock(blk.id, "done");
        S.today.actual = (await api().listActual(today, day(1))).map(a => Object.assign({}, a));
        await unmarkBlock(blk.id); eq(lv(), undefined, "sau khi tải lại");
        // tự đổi sang tối thiểu sau khi bấm Đã làm: ↺ không đè lên lựa chọn đó
        await markBlock(blk.id, "done"); await setHabit(d, "journal", "min");
        await unmarkBlock(blk.id); eq(lv(), "min", "giữ lựa chọn của người dùng");
        // hoàn tác trên toast đi cùng đường
        await setHabit(d, "journal", null); await markBlock(blk.id, "done");
        $(".toast__undo").click(); await wait(30); eq(lv(), undefined, "toast hoàn tác");
      } finally { await setHabit(d, "journal", orig || null); await reset(); }
    });
    test("Rest day: chỉ hiện thói quen có tối thiểu; thẻ Rest day liệt kê đúng những thói quen đó", async () => {
      const prev = keep(); await reset();
      const d = todayStr(), keepRec = Object.assign({}, S.days[d] || blankRec(d));
      const base = { cat: "life", icon: "ph-drop", freq: "daily", full: "x" };
      try {
        await saveHabits([
          Object.assign({}, base, { id: "rA", name: "Uống nước", min: "1 ly" }),
          Object.assign({}, base, { id: "rB", name: "Chạy bộ" }),                                                  // không có tối thiểu → ẩn
          Object.assign({}, base, { id: "rC", name: "Bơi", freq: "weekly", days: [...ALL], perWeekFull: 2, perWeekMin: 1, min: "1 lần/tuần" }), // số lần/tuần → ẩn
          Object.assign({}, base, { id: "rD", name: "Đọc sách" }),                                                 // không có tối thiểu nhưng đã làm → vẫn hiện
        ]);
        await saveRec(Object.assign(blankRec(d), { id: keepRec.id, unwell: true, h: { rD: "full" } }));
        renderToday();
        eq($$("#view-today [data-habit]").map(b => b.dataset.habit).sort(), ["rA", "rD"], "chip hiện");
        const a = $('#view-today [data-habit="rA"]');
        eq(a.getAttribute("aria-label"), "Uống nước: rest day, tối thiểu 1 ly"); ok(a.textContent.includes("1 ly"), "chip ghi bản tối thiểu");
        const card = $(".unwell-card");
        eq($$(".unwell-card li").map(li => li.textContent.trim()), ["Uống nước · 1 ly"], "thẻ Rest day");
        ok(!card.textContent.includes("Ngủ thêm"), "không còn dòng viết cứng");
        const h = [...document.querySelectorAll("#view-today .h2")].find(x => x.textContent.includes("Thói quen hôm nay"));
        ok(h.textContent.includes("rest day") && !h.textContent.includes("xong"), h.textContent);
        // không còn thói quen nào có tối thiểu: thẻ chỉ nói nghỉ ngơi là đủ
        await saveHabits([Object.assign({}, base, { id: "rB", name: "Chạy bộ" })]); renderToday();
        ok(!$(".unwell-card ul") && $(".unwell-card").textContent.includes("nghỉ ngơi là đủ"), $(".unwell-card").textContent);
      } finally { await saveRec(keepRec); await back(prev); await reset(); }
    });
    test("Hôm nay: đánh dấu đạt / tối thiểu không đổi chỗ chip", async () => {
      const prev = keep(); await reset();
      const d = todayStr(), keepRec = Object.assign({}, S.days[d] || blankRec(d));
      const base = { cat: "life", icon: "ph-drop", freq: "daily", full: "x", min: "y" };
      try {
        await saveHabits(["oA", "oB", "oC"].map(id => Object.assign({}, base, { id, name: id })));
        const ids = () => $$("#view-today [data-habit]").map(b => b.dataset.habit);
        await saveRec(Object.assign(blankRec(d), { id: keepRec.id })); renderToday();
        eq(ids(), ["oA", "oB", "oC"]);
        await saveRec(Object.assign(blankRec(d), { id: keepRec.id, h: { oA: "full", oB: "min" } })); renderToday();
        eq(ids(), ["oA", "oB", "oC"], "đã đạt vẫn ở chỗ cũ");
      } finally { await saveRec(keepRec); await back(prev); await reset(); }
    });
    test("sheet một ngày: bấm là đổi liền, icon quay khi đang lưu; hiện bản tối thiểu", async () => {
      const prev = keep(); await reset();
      const d = todayStr(), keepRec = Object.assign({}, S.days[d] || blankRec(d));
      const base = { cat: "life", icon: "ph-drop", freq: "daily", full: "x" };
      try {
        await saveHabits([Object.assign({}, base, { id: "sA", name: "Uống nước", min: "1 ly" }), Object.assign({}, base, { id: "sB", name: "Chạy bộ" })]);
        await saveRec(Object.assign(blankRec(d), { id: keepRec.id }));
        renderDaySheet(d);
        const row = id => $(`#sheetBody [data-row="${id}"]`);
        ok(row("sA").textContent.includes("Tối thiểu: 1 ly"), "có bản tối thiểu");
        ok(!row("sB").querySelector(".dayrow__min"), "không có tối thiểu thì không hiện");
        const btn = row("sA").querySelector('[data-lv="full"]');
        btn.click();
        eq(btn.getAttribute("aria-pressed"), "true", "đổi ngay, không đợi lưu");
        eq(row("sA").querySelector('[data-lv=""]').getAttribute("aria-pressed"), "false");
        ok(row("sA").getAttribute("aria-busy") === "true" && row("sA").querySelector(".ph-circle-notch"), "đang lưu");
        row("sA").querySelector('[data-lv="min"]').click();   // bấm tiếp khi lần trước chưa xong
        await habQ; await new Promise(r => setTimeout(r));
        eq(S.days[d].h.sA, "min", "lần bấm sau cùng thắng");
        ok(!row("sA").hasAttribute("aria-busy") && row("sA").querySelector(".ph-drop"), "xong thì trả icon");
      } finally { closeSheet(); await saveRec(keepRec); await back(prev); await reset(); }
    });
    test("bộ thói quen mẫu chỉ dành cho xem thử: người mới bắt đầu trống, cấu hình cũ giữ bộ cũ", async () => {
      const keepS = Object.assign({}, S.settings), keepCfg = S.cfg, keepLS = localStorage.getItem("sl.habits");
      try {
        localStorage.removeItem("sl.habits");
        S.settings.demo = false;
        S.cfg = null; loadLocalHabits(); eq(ALLH.length, 0, "chưa có lịch");
        S.cfg = { planCal: "x", configFileId: "f", habits: [] }; loadLocalHabits(); eq(ALLH.length, 0, "lịch mới dựng");
        S.cfg = { planCal: "x", configFileId: "f" }; loadLocalHabits(); eq(ALLH.map(h => h.id), SAMPLE_HABITS.map(h => h.id), "cấu hình cũ chưa có habits");
        localStorage.setItem("sl.habits", JSON.stringify([{ id: "mine", name: "Của tôi" }])); loadLocalHabits(); eq(ALLH.map(h => h.id), ["mine"], "đã lưu thì dùng danh sách đã lưu");
        S.settings.demo = true; localStorage.removeItem("sl.demoHabits"); loadLocalHabits(); eq(ALLH.length, SAMPLE_HABITS.length, "xem thử dùng bộ mẫu");
      } finally {
        S.settings = keepS; S.cfg = keepCfg;
        if (keepLS == null) localStorage.removeItem("sl.habits"); else localStorage.setItem("sl.habits", keepLS);
        loadLocalHabits(); await reset();
      }
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

  // ------------------------------------------------------------ nhờ AI điền form thói quen
  describe("Nhờ AI điền / sửa thói quen", () => {
    const keep = () => ALLH.map(h => Object.assign({}, h));
    const back = async list => { await saveHabits(list); localStorage.removeItem("sl.demoHabits"); loadLocalHabits(); };
    test("fillHabForm điền mọi ô, chưa lưu gì cho tới khi bấm Lưu", async () => {
      const prev = keep(), n = ALLH.length; await reset();
      renderHabForm(null); const from = $("#hFrom").value;
      fillHabForm({ name: "Đọc sách", cat: "build", icon: "ph-book-open", freq: "days", days: [5, 1, 3, 9], full: "đọc 10 trang", min: "1 trang" });
      eq([$("#hName").value, $("#hCat").value, $("#hForm").dataset.freq], ["Đọc sách", "build", "days"]);
      eq($("#hName").maxLength, NAME_MAX, "ô Tên giới hạn ký tự");
      eq($$("[data-hday][aria-pressed=true]").map(b => +b.dataset.hday).sort(), [1, 3, 5]);
      eq($(".iconpick button").dataset.hicon, "ph-book-open", "biểu tượng AI chọn đứng đầu, đang chọn");
      eq($(".iconpick button").getAttribute("aria-checked"), "true");
      eq([$("#hFull").value, $("#hMin").value, $("#hFrom").value], ["đọc 10 trang", "1 trang", from]);
      ok($("#hName").closest(".field").classList.contains("is-ai"), "ô đổi thì nháy");
      eq(ALLH.length, n, "chưa lưu");
      $("#hSave").click(); await wait(30);
      const h = ALLH[ALLH.length - 1];
      eq([h.name, h.cat, h.freq, h.days, h.full], ["Đọc sách", "build", "days", [1, 3, 5], "đọc 10 trang"]);
      await back(prev); await reset();
    });
    test("theo tuần: số lần trong 1..7, tối thiểu không quá mục tiêu; giá trị lạ bị bỏ qua", async () => {
      await reset(); renderHabForm(null);
      fillHabForm({ name: "Gym", cat: "scroll", icon: "ph-không-có", freq: "weekly", days: [0, 1, 2, 3, 4, 5, 6], perWeekFull: 12, perWeekMin: 9, full: "tập" });
      eq([$("#hForm").dataset.freq, $("#hPerFull").value, $("#hPerMin").value, $("#hCat").value], ["weekly", "7", "7", "health"]);
      eq($$("[data-hday][aria-pressed=true]").length, 0, "đủ 7 ngày = không gợi ý ngày");
      eq($("[data-hicon][aria-checked=true]").dataset.hicon, "ph-check-circle", "biểu tượng lạ giữ nguyên");
      await reset();
    });
    test("sửa: prompt gửi kèm thói quen hiện tại; schema đúng danh sách", async () => {
      await reset(); renderHabForm("gym");
      const cur = habFormRaw();
      eq([cur.name, cur.freq, cur.perWeekFull, "min" in cur], ["Gym", "weekly", 2, false]);
      const p = habAiPrompt("đổi thành 3 buổi", cur);
      ok(p.includes("SỬA") && p.includes('"name":"Gym"') && p.includes("đổi thành 3 buổi"), "prompt sửa");
      ok(habAiPrompt("uống nước", null).includes("TẠO") && !habAiPrompt("x", null).includes("hiện tại"), "prompt tạo mới");
      const sc = habAiSchema().properties;
      eq(sc.icon.enum, HICONS); ok(!sc.cat.enum.includes("scroll"), "không có nhóm Lướt");
      await reset();
    });
    // Có key giả, geminiJSON trả kết quả cố định: không gọi Gemini thật. Xong thì trả lại như cũ.
    const withAi = async (reply, fn) => {
      const key = S.settings.geminiKey, real = window.geminiJSON, sent = [];
      S.settings.geminiKey = "TEST"; window.geminiJSON = async (prompt) => { sent.push(prompt); return { p: reply, model: "test" }; };
      try { await fn(sent); } finally { S.settings.geminiKey = key; window.geminiJSON = real; }
    };
    test("chưa có Gemini key: form không có nút Nhờ AI", async () => {
      const key = S.settings.geminiKey; S.settings.geminiKey = "";
      try { await reset(); renderHabForm(null); ok(!$("#hAiGo"), "thêm"); renderHabForm("gym"); ok(!$("#hAiGo"), "sửa"); }
      finally { S.settings.geminiKey = key; }
      await reset();
    });
    test("sửa: nút Nhờ AI sửa mở popup nhập trên sheet; gửi thì điền form, đóng popup, sheet vẫn mở", () => withAi(
      { name: "Gym", cat: "health", icon: "ph-barbell", freq: "weekly", days: [2, 6], perWeekFull: 3, perWeekMin: 1, full: "có tập gym hôm đó.", reply: "Đã đổi thành 3 buổi." }, async sent => {
      await reset();
      $("#inputText").value = "đang gõ dở"; const ph = $("#inputText").placeholder;
      renderHabForm("gym");
      ok(!$("#hAi") && $("#hAiGo").textContent.includes("Nhờ AI sửa"), "form chỉ còn 1 nút");
      ok($("#hAiNote").hidden, "chưa có ghi chú");
      $("#hAiGo").click(); await wait(20);
      ok($("#dock").classList.contains("is-open") && $("#dock").classList.contains("is-habit"), "mở popup chế độ thói quen");
      eq([$("#inputText").value, $("#dockTitle").textContent], ["", "Nhờ AI sửa thói quen"]);
      ok(getComputedStyle($("#btnManual")).display === "none", "ẩn nút Tự thêm");
      ok(+getComputedStyle($("#dock")).zIndex > +getComputedStyle($("#sheet")).zIndex, "popup nằm trên sheet");
      $("#dock").requestSubmit(); await wait(20);
      ok($("#dock").classList.contains("is-open"), "trống thì không gửi");
      eq(sent.length, 0, "chưa gọi AI");
      $("#inputText").value = "đổi thành 3 buổi mỗi tuần"; $("#dock").requestSubmit(); await wait(40);
      ok(sent.length === 1 && sent[0].includes("SỬA") && sent[0].includes("đổi thành 3 buổi mỗi tuần"), "gửi prompt sửa");
      ok(!$("#dock").classList.contains("is-open") && sheetOpen(), "đóng popup, sheet vẫn mở");
      eq($("#hPerFull").value, "3");
      ok(!$("#hAiNote").hidden && $("#hAiNote").textContent.includes("Đã đổi thành 3 buổi.") && $("#hAiNote").textContent.includes("bấm Lưu"), "báo đã điền");
      eq(H.gym.perWeekFull, 2, "chưa lưu");
      eq([$("#inputText").value, $("#inputText").placeholder], ["đang gõ dở", ph], "trả lại chữ ô Hôm nay");
      $("#inputText").value = ""; await reset();
    }));
    test("thêm: nút Nhờ AI điền; đóng popup bằng Esc không đóng sheet, không đổi form", () => withAi({}, async () => {
      await reset(); renderHabForm(null);
      ok($("#hAiGo").textContent.includes("Nhờ AI điền"));
      $("#hAiGo").click(); await wait(20);
      eq($("#dockTitle").textContent, "Nhờ AI điền thói quen");
      $("#inputText").value = "đọc sách";
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); await wait(20);
      ok(!$("#dock").classList.contains("is-open") && !$("#dock").classList.contains("is-habit") && sheetOpen(), "chỉ đóng popup");
      eq([$("#hName").value, $("#inputText").value], ["", ""]);
      await reset();
    }));
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
      for (const hb of SAMPLE_HABITS) ok(CATS[hb.cat], hb.id);
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

  // ------------------------------------------------------------ Tuần mẫu
  describe("Tuần mẫu: đọc / ghi chuỗi lặp", () => {
    const sev = (rec, extra) => Object.assign({ id: "S1", summary: "Yoga", start: { dateTime: rfc(at("06:00", parseYmd("2026-11-02"))) }, end: { dateTime: rfc(at("07:00", parseYmd("2026-11-02"))) },
      recurrence: rec, extendedProperties: { private: { sl: "plan", key: "yoga", cat: "health", habit: "yoga", ess: "0", rem: "0" } } }, extra);
    test("evToSeries: thứ, giờ, ngày đầu, UNTIL (UTC) về ngày theo giờ máy", () => {
      const x = evToSeries(sev([rrule([1, 3, 5], "2026-11-20")]));
      eq([x.days, x.s, x.e, x.from, x.until, x.habit, x.rem], [[1, 3, 5], "06:00", "07:00", "2026-11-02", "2026-11-20", "yoga", [0]]);
      eq(evToSeries(sev(["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"])).until, null);
      eq(evToSeries(sev(["RRULE:FREQ=DAILY"])).days, ALL, "mỗi ngày");
      eq(evToSeries(sev(["RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261120"])).until, "2026-11-20", "UNTIL chỉ có ngày");
    });
    test("evToSeries bỏ qua chuỗi không hiểu được và sự kiện không lặp", () => {
      eq(evToSeries(sev(["RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=5"])), null);
      eq(evToSeries(sev(["RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO"])), null);
      eq(evToSeries(sev(["RRULE:FREQ=MONTHLY"])), null);
      eq(evToSeries(sev(undefined)), null);
      eq(evToSeries(sev(["RRULE:FREQ=WEEKLY"], { start: { date: "2026-11-02" } })), null, "cả ngày");
    });
    test("withUntil thêm / thay / bỏ UNTIL, giữ EXDATE", () => {
      const r = ["RRULE:FREQ=WEEKLY;BYDAY=MO", "EXDATE:20261109T060000Z"];
      const a = withUntil(r, "2026-11-16");
      ok(a[0].includes(";UNTIL=" + untilUTC("2026-11-16")), a[0]); eq(a[1], r[1]);
      const b = withUntil(a, "2026-11-20");
      eq((b[0].match(/UNTIL/g) || []).length, 1, "chỉ một UNTIL");
      eq(withUntil(b, null)[0], r[0]);
    });
    test("planBody ghi nhắc vào sự kiện, có UNTIL khi cần", () => {
      const b = planBody(Object.assign({}, TPL.phone, { until: null }), day(1));
      eq(b.extendedProperties.private.rem, "30,0");
      eq(planBody(Object.assign({}, TPL.yoga, { rem: [] }), day(1)).reminders.overrides, []);
      ok(planBody(TPL.yoga, day(1), "2026-12-01").recurrence[0].includes("UNTIL="));
    });
    test("evToItem: thuộc tính đã ghi trong sự kiện thắng tuần mẫu trong code", () => {
      const ev = p => ({ id: "x", summary: "Ăn trưa", start: { dateTime: rfc(at("11:30")) }, end: { dateTime: rfc(at("12:30")) }, extendedProperties: { private: p } });
      eq(evToItem(ev({ key: "lunch", ess: "0" }), "plan").ess, false, "bỏ giữ rest day");
      eq(evToItem(ev({ key: "class", habit: "" }), "plan").habit, "", "bỏ gắn thói quen");
      eq(evToItem(ev({ key: "phone" }), "plan").rem, [30, 0], "sự kiện cũ: nhắc theo code");
      eq(evToItem(ev({ key: "phone", rem: "" }), "plan").rem, [], "không nhắc");
      eq(evToItem(ev({ sl: "plan", added: "1" }), "plan").rem, [0]);
    });
    test("remKeyOf / remFromKey", () => {
      eq([[0], [10, 0], [30, 0], [], [15]].map(remKeyOf), ["0", "10", "30", "none", "10"]);
      eq(["0", "10", "30", "none"].map(remFromKey), [[0], [10, 0], [30, 0], []]);
    });
  });

  describe("Tuần mẫu: áp dụng từ ngày mai", () => {
    const find = async key => (await Demo.listSeries()).find(x => x.key === key);
    const onDay = async (d, key) => (await Demo.listPlan(d, addDays(d, 1))).find(p => p.key === key);
    test("sửa khối: hôm nay giữ, từ mai đổi; sửa lần nữa trong ngày không tạo thêm bản", async () => {
      const old = await find("free"), n0 = (await Demo.listSeries()).length;
      const undo = await tplApply(old, Object.assign({}, old, { s: "15:00", e: "17:30", title: "Tự do mới" }));
      eq(hm((await onDay(today, "free")).start), old.s, "hôm nay giữ nguyên");
      const tm = await onDay(day(1), "free"); eq([tm.title, hm(tm.start)], ["Tự do mới", "15:00"]);
      eq(hm((await onDay(day(8), "free")).start), "15:00", "tuần sau cũng đổi");
      const list = await Demo.listSeries(); eq(list.length, n0, "chuỗi cũ đã cắt không hiện");
      const cur = list.find(x => x.key === "free"); eq(cur.from, tomorrowStr());
      const undo2 = await tplApply(cur, Object.assign({}, cur, { s: "16:00" }));
      eq((await Demo.listSeries()).filter(x => x.key === "free").length, 1, "vẫn một bản");
      eq(hm((await onDay(day(1), "free")).start), "16:00");
      await undo2(); await undo();
      const back = await find("free"); eq([back.id, back.until, back.s], [old.id, null, old.s], "hoàn tác về như cũ");
      eq(hm((await onDay(day(1), "free")).start), old.s);
    });
    test("xoá khối: ngừng lặp từ mai, hôm nay còn; hoàn tác thì chạy tiếp", async () => {
      const old = await find("fun");
      const d = [0, 1, 2, 3, 4, 5, 6].map(day).find(x => x > today && old.days.includes(x.getDay()));
      const undo = await tplApply(old, null);
      ok(!(await find("fun")), "không còn trong tuần mẫu");
      ok(!(await onDay(d, "fun")), "ngày tới không còn");
      if (old.days.includes(today.getDay())) ok(await onDay(today, "fun"), "hôm nay còn");
      await undo();
      ok(await onDay(d, "fun"), "hoàn tác");
    });
    test("thêm khối mới rồi xoá trong ngày: xoá hẳn", async () => {
      const n0 = (await Demo.listSeries()).length;
      await tplApply(null, { title: "Đọc sách", cat: "fun", days: [2, 4], s: "20:00", e: "20:30", habit: "", ess: false, rem: [10, 0] });
      const x = (await Demo.listSeries()).find(y => y.title === "Đọc sách");
      ok(x && x.from >= tomorrowStr(), "bắt đầu từ mai");
      ok([2, 4].includes(parseYmd(x.from).getDay()), "ngày đầu đúng thứ");
      await tplApply(x, null);
      eq((await Demo.listSeries()).length, n0);
    });
    test("lệch lịch thói quen: chỉ báo khi ngày cố định / mỗi ngày khác ngày lặp", () => {
      ok(habDaysMismatch(H.yoga, [2, 4]).includes("Yoga"), "Yoga T2-4-6 vs T3-5");
      eq(habDaysMismatch(H.yoga, [1, 3, 5]), null);
      eq(habDaysMismatch(H.eat, ALL), null, "mỗi ngày");
      ok(habDaysMismatch(H.eat, [1]), "mỗi ngày vs T2");
      eq(habDaysMismatch(H.gym, [2]), null, "số lần/tuần: ngày nào cũng được");
    });
  });

  describe("Tuần mẫu: màn hình", () => {
    test("icon bút cạnh icon lịch, mở trang Tuần mẫu chọn sẵn thứ của ngày mai", async () => {
      await reset();
      const acts = [...document.querySelectorAll("#view-today .h2__acts .icon-btn")].map(b => b.id);
      eq(acts, ["btnTpl", "btnOpenCal"]);
      await openTpl();
      ok($("#view-today .tl--tpl"), "có timeline");
      eq($("#view-today [data-tday][aria-selected=true]").dataset.tday, String(day(1).getDay()));
      ok($("#btnCompose").hidden, "ẩn nút bút nhập");
      const n = (await Demo.listSeries()).filter(x => x.days.includes(day(1).getDay())).length;
      eq(document.querySelectorAll("#view-today .tl--tpl [data-sid]").length, n);
      $("#view-today [data-tday='0']").click(); await frame();
      eq($("#view-today .tl__head").textContent, "Chủ nhật");
      $("#tplBack").click(); await frame();
      ok(!$("#view-today .tl--tpl") && $("#view-today .tl"), "về Hôm nay");
      await openTpl(); setView("today"); ok(!S.tplOpen, "bấm tab Hôm nay cũng về");
      await reset();
    });
    test("sheet sửa khối: đủ ô, lưu có hoàn tác, khối mặc định khi bấm chỗ trống", async () => {
      await reset(); await openTpl();
      S.tplDay = 1; renderTpl();
      $("#view-today [data-sid='yoga']").click();
      eq(sheetTitle(), "Sửa kế hoạch");
      ok($("#tTitle") && $("#tCat") && $("#tStart") && $("#tHabit") && $("#tEss") && $("#tRem") && $("#tDel"), "đủ ô");
      eq([$("#tHabit").value, $("#tRem").value, $("#tEss").checked], ["yoga", "0", false]);
      ok(!$("#tEssRow").hidden, "có nhắc thì hiện Vẫn nhắc khi rest day");
      $("#tRem").value = "none"; $("#tRem").dispatchEvent(new Event("change", { bubbles: true }));
      ok($("#tEssRow").hidden, "Không nhắc thì ẩn");
      $("#tRem").value = "0"; $("#tRem").dispatchEvent(new Event("change", { bubbles: true }));
      ok(!$("#tEssRow").hidden, "chọn lại có nhắc thì hiện lại");
      ok($("#tHint").hidden, "khớp lịch thói quen thì không nhắc");
      $("#tForm [data-hday='1']").click();
      ok(!$("#tHint").hidden && $("#tHabSync"), "lệch lịch thì hiện nhắc");
      $("#tForm [data-hday='1']").click();
      $("#tStart").value = "06:30"; $("#tEnd").value = "07:15";
      $("#tSave").click(); await wait(40);
      ok(!sheetOpen(), "đóng sheet");
      eq((await Demo.listSeries()).find(x => x.key === "yoga").s, "06:30");
      ok(toast._undo, "có hoàn tác"); await toast._undo(); await tplLoad();
      eq((await Demo.listSeries()).find(x => x.key === "yoga").s, "06:00");
      renderTplForm(null, "08:00");
      eq([sheetTitle(), $("#tStart").value, $("#tEnd").value], ["Thêm kế hoạch", "08:00", "08:30"]);
      eq($$("#tForm [data-hday][aria-pressed=true]").map(b => b.dataset.hday), ["1"], "lặp vào thứ đang chọn");
      renderTplForm(null, "08:45");
      eq($("#tEnd").value, "09:00", "tới khối kế tiếp");
      $("#tSave").click(); await wait(20);
      ok(sheetOpen() && !$("#tErr").hidden, "thiếu tên thì báo, không đóng");
      await reset();
    });
    test("Lưu khối & đổi lịch thói quen: mở Sửa thói quen điền sẵn, chưa tự lưu", async () => {
      await reset(); await openTpl(); S.tplDay = 1; renderTpl();
      $("#view-today [data-sid='yoga']").click();
      $("#tForm [data-hday='5']").click();   // bỏ T6 → T2, T4
      $("#tHabSync").click(); await wait(60);
      eq(sheetTitle(), "Sửa thói quen");
      eq($("#hForm").dataset.freq, "days");
      eq($$("#hForm [data-hday][aria-pressed=true]").map(b => b.dataset.hday), ["1", "3"]);
      eq($("#hFrom").value, tomorrowStr());
      eq(H.yoga.days, [1, 3, 5], "thói quen chưa đổi");
      ok(toast._undo, "khối đã lưu, có hoàn tác"); await toast._undo(); closeSheet(); await reset();
    });
    test("Sửa thói quen có dòng nhắc qua khối", async () => {
      await reset();
      renderHabForm("yoga"); await wait(30);
      ok($("#hBlocks").textContent.includes("Nhắc qua lịch: Yoga · 6:00 · T2 · T4 · T6"), $("#hBlocks").textContent);
      renderHabForm("eat"); await wait(30);
      ok($("#hBlocks").textContent.includes("Chưa có lịch nào"), "không có khối");
      renderHabForm(null);
      ok(!$("#hBlocks"), "thêm mới thì không có");
      closeSheet();
    });
  });

  // ------------------------------------------------------------ dậy trễ
  describe("Dậy trễ: AI sắp lại lịch", () => {
    // base giống lateBase(): khối theo giờ gốc, k = mã ngắn
    const now = at("08:07");
    const mk = (k, title, s, e, extra = {}) => ({ k, p: block(title, at(s), at(e), extra.p || {}), start: at(s), end: at(e), done: !!extra.done, skip: !!extra.skip });
    const base = () => [
      mk("b1", "Dậy", "05:30", "05:45", { p: { habit: "wake" } }),
      mk("b2", "Yoga", "06:00", "07:00"),
      mk("b3", "Ăn sáng", "07:00", "07:45", { done: true }),
      mk("b4", "Build", "09:00", "11:30"),
      mk("b5", "Ăn trưa", "11:30", "13:30", { p: { ess: true } }),
      mk("b6", "Giải trí", "20:00", "21:00"),
    ];
    const out = (items, wake = "08:00") => ({ wake, items, reply: "ok" });
    test("lateCheck: đề xuất hợp lệ → dời, bỏ, khối đã qua mà AI để nguyên thì tự bỏ", () => {
      const b = base(), c = lateCheck(b, out([{ id: "b1", s: "08:00", e: "08:15" }, { id: "b4", s: "09:00", e: "11:00" }, { id: "b6", skip: true }]), now);
      ok(!c.err, c.err);
      eq(hm(c.wake), "08:00");
      eq([hm(c.res.get("b1").start), hm(c.res.get("b4").end)], ["08:00", "11:00"]);
      eq([c.res.get("b6").skip, c.res.get("b2").skip, c.res.get("b2").auto], [true, true, true], "Yoga đã qua giờ, AI không nhắc → bỏ hôm nay");
      ok(!c.res.has("b3") && !c.res.has("b5"), "khối đã làm / không đổi thì không có trong res");
    });
    test("lateCheck: bắt lỗi id lạ, quá khứ, chồng giờ, quá 23:00, s ≥ e, đổi khối đã làm, giờ dậy sau bây giờ", () => {
      const bad = (o, msg) => ok(lateCheck(base(), o, now).err, msg);
      bad(out([{ id: "b9", s: "09:00", e: "10:00" }]), "id lạ");
      bad(out([{ id: "b2", s: "07:30", e: "08:30" }]), "xếp vào quá khứ");
      bad(out([{ id: "b1", s: "07:00", e: "07:15" }]), "khối dậy trước giờ dậy");
      bad(out([{ id: "b2", s: "11:00", e: "12:00" }]), "chồng giờ ăn trưa");
      bad(out([{ id: "b6", s: "22:30", e: "23:30" }]), "quá 23:00");
      bad(out([{ id: "b4", s: "10:00", e: "09:30" }]), "s ≥ e");
      bad(out([{ id: "b3", s: "08:15", e: "09:00" }]), "đổi khối đã làm");
      bad(out([{ id: "b3", skip: true }]), "bỏ khối đã làm");
      bad(out([{ id: "b4", s: "chín giờ", e: "10:00" }]), "giờ sai dạng");
      bad(out([], "08:30"), "giờ dậy sau bây giờ");
      bad({ items: [] }, "thiếu giờ dậy");
      ok(!lateCheck(base(), out([{ id: "b3", s: "07:00", e: "07:45" }]), now).err, "khối đã làm nhắc lại đúng giờ cũ thì không sao");
    });
    test("lateCheck: chấp nhận giờ AI viết lệch dạng (9:00, 09:00:00, 9h30), thiếu 1 đầu thì giữ độ dài, không có giờ thì giữ nguyên", () => {
      eq([normT("9:00"), normT("09:00:00"), normT("9h30"), normT("9g"), normT("24:00"), normT("abc"), normT(null)], ["09:00", "09:00", "09:30", "09:00", "", "", ""]);
      const c = lateCheck(base(), out([{ id: "b4", s: "9:15", e: "11:15:00" }, { id: "b6", s: "20:30" }, { id: "b5", skip: false }], "8:00"), now);
      ok(!c.err, c.err);
      eq(hm(c.wake), "08:00");
      eq([hm(c.res.get("b4").start), hm(c.res.get("b4").end)], ["09:15", "11:15"]);
      eq(hm(c.res.get("b6").end), "21:30", "thiếu e: giữ 60 phút");
      ok(!c.res.has("b5"), "nhắc mà không có giờ: giữ nguyên");
    });
    test("lateIssues: khối sửa tay vào quá khứ, quá 23:00, chồng giờ thì báo; khối không đổi thì không", () => {
      const b = base(), L = { base: b, wake: at("08:00"), res: new Map([["b2", { skip: true }]]) };
      eq(lateIssues(L, now).size, 0, "chưa sửa gì");
      L.res.set("b4", { start: at("07:30"), end: at("08:30") }); eq(lateIssues(L, now).get("b4"), "Giờ này đã qua");
      L.res.set("b4", { start: at("22:30"), end: at("23:30") }); eq(lateIssues(L, now).get("b4"), "Quá 23:00");
      L.res.set("b4", { start: at("11:00"), end: at("12:00") }); eq(lateIssues(L, now).get("b4"), "Chồng giờ với Ăn trưa");
      L.res.set("b1", { start: at("08:00"), end: at("08:15") }); L.res.set("b4", { start: at("09:00"), end: at("11:00") });
      eq(lateIssues(L, now).size, 0, "khối dậy đặt đúng giờ dậy là hợp lệ");
    });
    test("demoLate: khối quan trọng chưa tới giờ đứng yên, khối khác nối tiếp, qua lateCheck", () => {
      const b = base(), o = demoLate("nay mình dậy 8h", b, now), c = lateCheck(b, o, now);
      ok(!c.err, c.err);
      eq(o.wake, "08:00");
      eq(hm(c.res.get("b1").start), "08:00", "khối dậy đặt đúng giờ dậy");
      ok(!c.res.has("b5"), "ăn trưa giữ giờ");
      ok(c.res.get("b2").start >= at("08:15"), "Yoga dời ra sau khối dậy");
      ok(!c.res.has("b6"), "giải trí buổi tối không bị đẩy");
      eq(demoLate("dậy rồi", b, at("04:50")).items.find(i => i.id === "b1").s, "05:30", "dậy trước giờ thì khối dậy không dời sớm lên");
    });
    test("lateHabit: chọn sẵn Đạt khi dậy đúng giờ, Chưa khi dậy trễ", () => {
      const keep = S.today; S.today = { plan: [], actual: [], rec: blankRec(todayStr()) };
      try {
        const b = base();
        if (!HABITS.some(h => h.id === "wake")) return;   // bộ mẫu không có Dậy 5:30 thì thôi
        eq(lateHabit(b, at("05:33")), { hid: "wake", lv: "full" });
        eq(lateHabit(b, at("08:00")), { hid: "wake", lv: "" });
        eq(lateHabit([mk("b1", "Dậy", "05:30", "05:45")], at("08:00")), null, "khối dậy không gắn thói quen");
      } finally { S.today = keep; }
    });
    test("rec.late lưu / đọc lại qua thuộc tính Calendar", () => {
      const L = { wake: "08:00", moved: [{ id: "abc_20261122T053000Z", s: "05:30", e: "05:45" }], skipped: ["x1"], hprev: { wake: "none" }, hset: "none" };
      const props = recToProps(Object.assign(blankRec("2026-11-22"), { late: L }));
      eq(recFromEv({ id: "d", extendedProperties: { private: props } }).late, L);
      eq(recFromEv({ id: "d", extendedProperties: { private: recToProps(blankRec("2026-11-22")) } }).late, null, "không sắp lại thì null");
      ok(props.late.length < 1024 && props.lm.length < 1024);
    });
    test("Áp dụng → Trả lại lịch cũ; sắp lại lần 2 tính từ giờ gốc; Hoàn tác về trạng thái trước", async () => {
      await reset();
      const b0 = lateBase(), [x, y] = b0.filter(b => !b.done && !b.skip).slice(1, 3);
      ok(x && y, "cần 2 khối");
      const orig = new Map(S.today.plan.map(p => [p.id, [hm(p.start), hm(p.end)]])), skip0 = [...(S.today.rec.skip || [])];
      const shift = (b, m) => ({ start: new Date(+b.start + m * 60000), end: new Date(+b.end + m * 60000) });
      S.late = { text: "t", base: b0, wake: b0[0].start, res: new Map([[x.k, shift(x, 7)], [y.k, { skip: true }]]), reply: "", hab: null };
      const undo = await applyLate();
      const px = () => S.today.plan.find(p => p.id === x.p.id);
      eq(hm(px().start), hm(shift(x, 7).start), "đã dời");
      ok(S.today.rec.skip.includes(y.p.id), "đã bỏ qua");
      eq(S.today.rec.late.moved, [{ id: x.p.id, s: orig.get(x.p.id)[0], e: orig.get(x.p.id)[1] }]);
      const saved = (await Demo.listPlan(startOfDay(new Date()), addDays(startOfDay(new Date()), 1))).find(p => p.id === x.p.id);
      eq(hm(saved.start), hm(shift(x, 7).start), "đã ghi vào lịch");
      // lần 2: chỉ dời y, x phải về giờ gốc, y không còn bị bỏ qua do lần 1
      const b1 = lateBase();
      eq(hm(b1.find(b => b.p.id === x.p.id).start), orig.get(x.p.id)[0], "lateBase trả giờ gốc");
      S.late = { text: "t", base: b1, wake: b1[0].start, res: new Map([[b1.find(b => b.p.id === y.p.id).k, shift(y, 5)]]), reply: "", hab: null };
      await applyLate();
      eq(hm(px().start), orig.get(x.p.id)[0], "x về giờ gốc");
      ok(!S.today.rec.skip.includes(y.p.id), "bỏ Bỏ qua của lần 1");
      eq(S.today.rec.late.moved.map(m => m.id), [y.p.id]);
      await undoLate();
      eq(S.today.rec.late, null);
      const key = l => l.map(r => r.join(" ")).sort().join("|");
      eq(key(S.today.plan.map(p => [p.id, hm(p.start), hm(p.end)])), key([...orig].map(([id, [s, e]]) => [id, s, e])), "về đúng giờ gốc");
      eq(S.today.rec.skip, skip0);
      await undo();   // hoàn tác của lần 1 = trở về trạng thái trước lần 1 (đã là lịch gốc), không lỗi
      eq(S.today.rec.late, null);
      await reset();
    });
    test("Thói quen: Áp dụng lưu mức đã chọn, Trả lại lịch cũ trả về mức trước (trừ khi đã tự đổi)", async () => {
      await reset();
      const b0 = lateBase(), hid = b0[0] && b0[0].p.habit;
      if (!hid || !HABITS.some(h => h.id === hid)) return;
      const before = S.today.rec.h[hid];
      S.late = { text: "t", base: b0, wake: b0[0].start, res: new Map(), reply: "", hab: { hid, lv: "full" } };
      await applyLate();
      eq(S.today.rec.h[hid], "full");
      await undoLate();
      eq(S.today.rec.h[hid], before, "về mức trước");
      S.late = { text: "t", base: lateBase(), wake: b0[0].start, res: new Map(), reply: "", hab: { hid, lv: "full" } };
      await applyLate(); await setHabit(todayStr(), hid, "min"); await undoLate();
      eq(S.today.rec.h[hid], "min", "đã tự đổi thì giữ");
      await setHabit(todayStr(), hid, before || null); await reset();
    });
    test("Màn hình: Mình dậy trễ → bộ chọn giờ → Sắp lại lịch → xem trước → Áp dụng → Trả lại lịch cũ", async () => {
      await reset();
      const keep = [S.settings.demo, S.settings.geminiKey];
      S.settings.demo = false; S.settings.geminiKey = "";
      ok(!canLate(), "không key, không xem thử thì ẩn nút");
      [S.settings.demo, S.settings.geminiKey] = keep;
      renderToday();
      ok($("#btnUnwell") && $("#btnUnwell").textContent.trim() === "Mình không khoẻ", "chữ nút mới");
      if (!lateNeeded()) return ok(!$("#btnLate"), "hết khối thì không có nút");
      ok($("#btnLate"), "có nút"); ok($("#btnLate").closest(".day-toggles").querySelector("#btnUnwell"), "cạnh nút không khoẻ");
      ok(Math.abs($("#btnLate").getBoundingClientRect().top - $("#btnUnwell").getBoundingClientRect().top) < 2, "2 nút cùng 1 hàng");
      const tp = () => document.querySelector(".tp"), tpOk = () => tp().querySelector("[data-tp-ok]");
      const pick = v => { const [h, m] = v.split(":").map(Number); tp().querySelector('[data-k="h"]').scrollTop = h * 44; tp().querySelector('[data-k="m"]').scrollTop = m * 44; };
      $("#btnLate").click(); await wait(20);
      ok(!tp().hidden && !sheetOpen(), "mở thẳng bộ chọn giờ, không qua sheet");
      eq(tp().querySelector("#tpTitle").textContent, "Mình dậy lúc");
      ok(tpOk().textContent.includes("Sắp lại lịch hôm nay"), "nút chính");
      ok(!$("#dock").classList.contains("is-open"), "không mở khung chat");
      const later = new Date(Date.now() + 2 * 3600000);
      if (later.getDate() === new Date().getDate()) {
        pick(hm(later)); await wait(20); tpOk().click(); await wait(20);
        ok(!tp().hidden && !sheetOpen(), "giờ dậy sau bây giờ thì báo, giữ bộ chọn");
      }
      const w = hm(floor15(new Date()));
      pick(w); await wait(20); tpOk().click(); await wait(80);
      ok(tp().hidden, "đóng bộ chọn"); eq(sheetTitle(), "Lịch mới hôm nay");
      $("#lRetell").click(); await wait(20);
      ok(!tp().hidden && tpOk().textContent.includes("Sắp lại"), "Đổi giờ dậy mở lại bộ chọn");
      tpOk().click(); await wait(80);
      ok(tp().hidden, "đóng bộ chọn");
      const inp = document.createElement("input"); inp.value = "10:00"; TP.open(inp);
      ok(tpOk().textContent.includes("Xong") && tp().querySelector("#tpTitle").textContent === "Chọn giờ", "ô giờ thường vẫn là Xong"); TP.close();
      eq([sheetTitle(), hm(S.late.wake)], ["Lịch mới hôm nay", w], "giữ giờ cũ");
      // sửa trên dòng: bỏ, giữ lại, đổi giờ, chồng giờ thì khoá Áp dụng
      const k0 = $("#sheetBody [data-lskip]").dataset.lskip;
      $(`#sheetBody [data-lskip="${k0}"]`).click(); await wait(20);
      ok($(`#sheetBody [data-lkeep="${k0}"]`), "Bỏ hôm nay → sang mục Bỏ");
      $(`#sheetBody [data-lkeep="${k0}"]`).click(); await wait(20);
      if (!tp().hidden) { tpOk().click(); await wait(20); }
      ok($(`#sheetBody [data-lt="${k0}"]`), "Giữ lại → về danh sách");
      const ks = [...$$("#sheetBody [data-lt]")].map(x => x.dataset.lt);
      if (ks.length >= 2) {
        const r2 = S.late.res.get(ks[1]), b2 = S.late.base.find(x => x.k === ks[1]);
        $(`#sheetBody [data-lt="${ks[0]}"]`).click(); await wait(20);
        pick(hm(r2 && !r2.skip ? r2.start : b2.start)); await wait(20); tpOk().click(); await wait(20);
        ok($("#sheetBody .late__warn") && $("#lApply").disabled, "chồng giờ: báo dưới dòng, khoá Áp dụng");
        S.late.res.set(ks[0], { skip: true }); renderLateSheet();
      }
      ok(!$("#lApply").disabled, "hết lỗi thì Áp dụng được");
      $("#lApply").click(); await wait(80);
      ok(!sheetOpen(), "đóng sheet");
      ok($("#btnLateUndo") && $(".late-state").textContent.includes("Đã sắp lại từ"), "dòng trạng thái");
      ok(toast._undo, "có hoàn tác");
      $("#btnLateUndo").click(); await wait(80);
      eq(S.today.rec.late, null);
      ok($("#btnLate"), "quay lại nút");
      await reset();
    });
    test("lateAi: AI đề xuất sai luật thì dùng bản dời đơn giản, vẫn ra sheet xem trước", async () => {
      await reset();
      if (!lateNeeded()) return;
      const keep = [S.settings.geminiKey, window.fetch];
      S.settings.geminiKey = "AIzaTEST";
      window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ wake: "07:00", items: [{ id: "b99", s: "x", e: "y" }], reply: "r" }) }] } }] }) });
      try {
        await lateAi(hm(floor15(new Date())));
        eq(sheetTitle(), "Lịch mới hôm nay");
        ok(S.late.fb && !S.late.reply && !$("#sheetBody .hai__note"), "dùng bản đơn giản, không hiện câu báo");
        eq(hm(S.late.wake), hm(floor15(new Date())), "giờ dậy theo giờ đã chọn, không theo AI");
      } finally { [S.settings.geminiKey, window.fetch] = keep; S.late = null; closeSheet(); await reset(); }
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
