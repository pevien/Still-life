"use strict";
/* Still life · v1
   Kế hoạch + Thực tế trên Google Calendar, Nhật ký trên Google Drive, Gemini hiểu câu nhập.
   Không backend. Chạy được ở chế độ demo (dữ liệu mẫu trong máy) để xem thử. */

// ============================================================ constants
const DEFAULT_CLIENT_ID = "52671955751-alt0r48fncoeuji336b2ljfhh4hpfpqg.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/calendar.app.created https://www.googleapis.com/auth/drive.file";
const CAL = "https://www.googleapis.com/calendar/v3";
const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const DOW = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const DOW_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const ALL = [0, 1, 2, 3, 4, 5, 6];

// Màu khớp với colorId của Google Calendar
const CATS = {
  health: { name: "Sức khỏe", short: "Sức khỏe", color: "10", hex: "#0B8043", icon: "ph-heartbeat" },
  korean: { name: "Tiếng Hàn", short: "Tiếng Hàn", color: "3", hex: "#8E24AA", icon: "ph-translate" },
  build:  { name: "Build & Learn", short: "Build", color: "9", hex: "#3F51B5", icon: "ph-code" },
  life:   { name: "Sinh hoạt", short: "Sinh hoạt", color: "4", hex: "#D9685E", icon: "ph-house-line" },
  people: { name: "Người thân & bạn bè", short: "Người thân", color: "5", hex: "#E3AE1B", icon: "ph-users-three", lightInk: true },
  fun:    { name: "Giải trí có chủ đích", short: "Giải trí", color: "6", hex: "#E8592A", icon: "ph-film-strip" },
  scroll: { name: "Lướt vô thức", short: "Lướt", color: "8", hex: "#616161", icon: "ph-device-mobile" },
};

// Thói quen mẫu: chỉ là dữ liệu của chế độ xem thử. Người dùng thật bắt đầu với danh sách trống và tự thêm ở trang Quản lý thói quen
// (lưu trong máy + file cấu hình trên Drive). Ngoại lệ: cấu hình dựng trước khi có danh sách riêng (chưa có trường habits)
// thì dùng bộ này một lần rồi ghi lên Drive, để lịch sử cũ vẫn khớp id (xem legacyHabits trong refresh()).
const SAMPLE_HABITS = [
  { id: "eat",     name: "Ăn đủ 3 bữa", cat: "life",        icon: "ph-bowl-food",  freq: "daily", full: "ăn đủ 3 bữa. min: có 3 bữa nhưng có bữa qua loa/lệch giờ.", min: "không bỏ bữa" },
  { id: "wake",    name: "Dậy 5:30", cat: "life",           icon: "ph-sun-horizon", freq: "daily", full: "dậy trước hoặc lúc 5:35. min: dậy trước 6:00.", min: "trước 6:00" },
  { id: "korean",  name: "Tiếng Hàn 10p", cat: "korean",  icon: "ph-translate",  freq: "daily", full: "học tiếng Hàn từ 10 phút trở lên (đi lớp cũng tính). min: học ít nhất 5 từ mới. value = số phút nếu có.", min: "5 từ mới" },
  { id: "walk",    name: "Đi bộ 3000 bước", cat: "health",    icon: "ph-sneaker-move", freq: "daily", full: "value = số bước. full: >= 3000. min: >= 2000.", min: "2000 bước" },
  { id: "yoga",    name: "Yoga", cat: "health",               icon: "ph-person-simple-tai-chi", freq: "days", days: [1, 3, 5], full: "có tập yoga." },
  { id: "gym",     name: "Gym", cat: "health",                icon: "ph-barbell",    freq: "weekly", days: [2, 6], perWeekMin: 1, perWeekFull: 2, full: "có tập gym hôm đó.", min: "1 buổi/tuần" },
  { id: "phone",   name: "Cất máy 22:00", cat: "life", icon: "ph-moon-stars", freq: "daily", full: "cất điện thoại ra ngoài giường lúc 22:00. min: trước 22:30 hoặc bật chế độ ngủ.", min: "trước 22:30" },
  { id: "journal", name: "Nhật ký", cat: "life",            icon: "ph-notebook",   freq: "daily", full: "viết nhật ký 3 dòng. min: 1 dòng.", min: "1 dòng" },
];

// Tuần mẫu. days: 0 = CN. ess = vẫn giữ trong unwell day.
const TEMPLATE = [
  { key: "wake",     title: "Dậy · uống nước",        cat: "life",   days: ALL, s: "05:30", e: "05:45", habit: "wake" },
  { key: "yoga",     title: "Yoga",                   cat: "health", days: [1, 3, 5], s: "06:00", e: "07:00", habit: "yoga" },
  { key: "gym",      title: "Gym",                    cat: "health", days: [2, 6], s: "06:00", e: "07:00", habit: "gym" },
  { key: "move",     title: "Đi bộ nhanh · giãn cơ",  cat: "health", days: [4, 0], s: "06:00", e: "07:00", habit: "walk" },
  { key: "breakfast",title: "Ăn sáng",                cat: "life",   days: ALL, s: "07:00", e: "07:45", ess: 1 },
  { key: "build",    title: "Build & Learn",          cat: "build",  days: [1, 2, 3, 4, 5, 6], s: "09:00", e: "11:30" },
  { key: "lunch",    title: "Ăn trưa · nghỉ",         cat: "life",   days: ALL, s: "11:30", e: "13:30", ess: 1 },
  { key: "kprep",    title: "Ôn bài trước lớp Hàn",   cat: "korean", days: [1, 3, 5], s: "14:00", e: "14:30", habit: "korean" },
  { key: "kself",    title: "Tự học tiếng Hàn",       cat: "korean", days: [2, 4, 6, 0], s: "14:00", e: "14:30", habit: "korean" },
  { key: "free",     title: "Việc tự do",             cat: "life",   days: ALL, s: "14:30", e: "17:00" },
  { key: "dinnerA",  title: "Ăn tối",                 cat: "life",   days: [1, 3, 5], s: "17:30", e: "18:30", ess: 1 },
  { key: "dinnerB",  title: "Ăn tối",                 cat: "life",   days: [2, 4, 6, 0], s: "18:30", e: "19:30", ess: 1 },
  { key: "class",    title: "Lớp tiếng Hàn",          cat: "korean", days: [1, 3, 5], s: "19:00", e: "21:00", habit: "korean", ess: 1 },
  { key: "fun",      title: "Giải trí thoải mái",     cat: "fun",    days: [2, 4, 6, 0], s: "20:00", e: "21:00" },
  { key: "journal",  title: "Nhật ký & tổng kết ngày",cat: "life",   days: ALL, s: "21:00", e: "21:30", habit: "journal", ess: 1 },
  { key: "phone",    title: "Cất điện thoại · đi ngủ",cat: "life",   days: ALL, s: "22:00", e: "22:15", habit: "phone", ess: 1, rem: [30, 0] },
];
const TPL = Object.fromEntries(TEMPLATE.map(t => [t.key, t]));

// ============================================================ helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(Math.floor(n)).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const atTime = (day, t) => { const [h, m] = t.split(":").map(Number); const x = startOfDay(day); x.setHours(h, m, 0, 0); return x; };
const mondayOf = d => { const x = startOfDay(d); const k = (x.getDay() + 6) % 7; return addDays(x, -k); };
function rfc(d) {
  const off = -d.getTimezoneOffset(), s = off >= 0 ? "+" : "-", a = Math.abs(off);
  return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${s}${pad(a / 60)}:${pad(a % 60)}`;
}
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayStr = () => ymd(new Date());
const tomorrowStr = () => ymd(addDays(startOfDay(new Date()), 1));
// Mọi ngày hiện ra đều theo DD/MM/YYYY (vd 14/11/2026)
const dmy = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtDate = d => `${DOW[d.getDay()]}, ${dmy(d)}`;
const LV = { full: 3, min: 2, skip: 1 };
const better = (a, b) => ((LV[a] || 0) >= (LV[b] || 0) ? a : b);

// undo: hàm async để hoàn tác; có thì toast hiện nút "Hoàn tác" và ở lâu hơn.
// opt: { label, icon, done } để dùng nút cho việc khác (vd "Mở Cài đặt"); done = câu báo sau khi chạy, null = không báo.
function toast(msg, ms = 2600, undo = null, opt = {}) {
  const t = $("#toast"), label = opt.label || "Hoàn tác", icon = opt.icon || "ph-arrow-counter-clockwise";
  t.innerHTML = `<span>${esc(msg)}</span>` + (undo ? `<button class="toast__undo" type="button"><i class="ph ${icon}"></i> ${esc(label)}</button>` : "");
  toast._undo = undo; toast._done = "done" in opt ? opt.done : "Đã hoàn tác"; t.classList.toggle("has-undo", !!undo); t.classList.add("is-on");
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.classList.remove("is-on"); toast._undo = null; }, undo ? Math.max(ms, 6000) : ms);
}
function hideToast() { clearTimeout(toast._t); $("#toast").classList.remove("is-on"); toast._undo = null; }

// ============================================================ state
const LS = {
  get(k, d) { try { const v = localStorage.getItem("sl." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("sl." + k, JSON.stringify(v)); } catch {} },
};
const S = {
  settings: Object.assign({ clientId: DEFAULT_CLIENT_ID, geminiKey: "", model: "", demo: false }, LS.get("settings", {})),
  cfg: LS.get("cfg", null),         // { planCal, actualCal, folderId, journalFolderId, configFileId, start }
  tok: LS.get("tok", null),         // { t, exp }
  view: "today",
  today: { plan: [], actual: [], rec: null },
  days: {},                         // ymd -> record
  pending: null,
  habView: LS.get("habView", "week"),
  habWeek: null,                    // ymd thứ Hai đang xem (null = tuần này)
};
if (new URLSearchParams(location.search).has("demo")) S.settings.demo = true;
const saveSettings = () => LS.set("settings", S.settings);
if (S.settings.model === "gemini-2.5-flash") S.settings.model = "";   // mặc định cũ → để app tự chọn model

// ============================================================ danh sách thói quen (sửa được)
// ALLH: mọi thói quen kể cả đã ngừng (off) · HABITS: đang theo dõi, theo thứ tự hiện · H: id → thói quen (kể cả đã ngừng, để đọc lịch sử)
// since: ngày bắt đầu theo dõi riêng của thói quen (thêm mới hôm nay thì các ngày trước không tính là bỏ)
let ALLH = [], HABITS = [], H = {};
const habKey = () => (S.settings.demo ? "demoHabits" : "habits");
// Lịch của thói quen = freq, days, perWeekFull, perWeekMin. Lịch cũ nằm trong prev: [{ until: "YYYY-MM-DD", ...lịch }],
// xếp theo until tăng dần; mỗi lịch cũ áp dụng tới hết ngày until. Lịch ở ngoài cùng áp dụng sau lịch cũ cuối cùng.
// Nhờ vậy đổi lịch không làm đổi trạng thái (Bỏ, nghỉ, x/y, chuỗi) của những ngày trước.
const SKEYS = ["freq", "days", "perWeekFull", "perWeekMin"];
function normSched(o) {
  if (!["daily", "days", "weekly"].includes(o.freq)) o.freq = "daily";
  o.days = o.freq === "daily" ? undefined : [...new Set((o.days || []).map(Number).filter(n => n >= 0 && n <= 6))].sort();
  if (o.freq === "days" && !o.days.length) o.freq = "daily", o.days = undefined;
  if (o.freq === "weekly") {
    if (!o.days.length) o.days = [...ALL];
    o.perWeekFull = Math.min(7, Math.max(1, +o.perWeekFull || 1));
    o.perWeekMin = Math.min(o.perWeekFull, Math.max(0, +o.perWeekMin || 0));
  } else { delete o.perWeekFull; delete o.perWeekMin; }
  if (!o.days) delete o.days;
  return o;
}
const pickSched = x => { const o = {}; for (const k of SKEYS) if (x[k] != null) o[k] = x[k]; return normSched(o); };
const sameSched = (a, b) => JSON.stringify(pickSched(a)) === JSON.stringify(pickSched(b));
// Tên hiện cả ở bảng Tuần (cột hẹp, tối đa 2 dòng), nên giới hạn ngắn; không còn "tên ngắn" riêng
const NAME_MAX = 15;
function normHabit(x) {
  const h = normSched(Object.assign({}, x));
  h.name = String(h.name || "").trim() || "Thói quen";
  delete h.short;   // trường cũ, đã bỏ
  h.icon = h.icon || "ph-check-circle";
  // "Ghi chú cho AI" (rule) đã gộp vào "Thế nào là đạt" (full): rule cũ thay full, bỏ nhãn "full: " ở đầu
  if (h.rule != null) { const r = String(h.rule).trim(); if (r) h.full = r.replace(/^full:\s*/i, ""); delete h.rule; }
  if (!CATS[h.cat]) h.cat = (SAMPLE_HABITS.find(d => d.id === h.id) || {}).cat || "life";
  const prev = (h.prev || []).filter(p => /^\d{4}-\d\d-\d\d$/.test(p.until || "")).map(p => Object.assign({ until: p.until }, pickSched(p)))
    .sort((a, b) => a.until.localeCompare(b.until));
  if (prev.length) h.prev = prev; else delete h.prev;
  return h;
}
// Lịch đang áp dụng vào ngày d
function sch(hb, d) { const ds = typeof d === "string" ? d : ymd(d); for (const p of hb.prev || []) if (ds <= p.until) return p; return hb; }
// Ngày lịch ngoài cùng bắt đầu áp dụng, nếu còn ở tương lai (đã hẹn đổi lịch); không thì null
function pendingFrom(hb) {
  const p = hb.prev && hb.prev[hb.prev.length - 1]; if (!p) return null;
  const f = ymd(addDays(parseYmd(p.until), 1)); return f > todayStr() ? f : null;
}
// Đổi lịch thành N từ ngày F (F >= hôm nay). Lịch đã hẹn mà chưa tới thì bị thay (form luôn sửa lịch mới nhất).
// Các ngày trước F giữ lịch cũ. Lịch mới giống lịch đang chạy thì không tạo mốc mới.
function applySched(old, N, F) {
  const today = todayStr(), Fm1 = ymd(addDays(parseYmd(F), -1));
  let seg = [], from = null;
  for (const p of old.prev || []) { seg.push({ from, until: p.until, s: pickSched(p) }); from = ymd(addDays(parseYmd(p.until), 1)); }
  seg.push({ from, until: null, s: pickSched(old) });
  seg = seg.filter(x => !x.from || x.from <= today);       // bỏ lịch đã hẹn mà chưa tới
  seg = seg.filter(x => !x.from || x.from <= Fm1);         // lịch bắt đầu từ F trở đi bị lịch mới thay
  if (seg.length) seg[seg.length - 1].until = null;
  const last = seg[seg.length - 1];
  if (last && sameSched(last.s, N)) last.until = null;
  else { if (last) last.until = Fm1; seg.push({ from: F, until: null, s: pickSched(N) }); }
  const since = old.since || "";
  const prev = seg.slice(0, -1).filter(x => x.until >= since).map(x => Object.assign({ until: x.until }, x.s));
  const h = Object.assign({}, old); for (const k of SKEYS) delete h[k];
  Object.assign(h, seg[seg.length - 1].s);
  if (prev.length) h.prev = prev; else delete h.prev;
  return normHabit(h);
}
function useHabits(list) {
  ALLH = (list || []).map(normHabit);
  const order = Object.keys(CATS);
  HABITS = ALLH.filter(h => !h.off).map((h, i) => [h, i]).sort((a, b) => order.indexOf(a[0].cat) - order.indexOf(b[0].cat) || a[1] - b[1]).map(x => x[0]);
  H = Object.fromEntries(ALLH.map(h => [h.id, h]));
}
// Xem thử: bộ mẫu. Thật: danh sách đã lưu; chưa có thì trống, trừ cấu hình cũ (đã có lịch nhưng file cấu hình chưa có habits)
const legacyCfg = () => !!(S.cfg && !Array.isArray(S.cfg.habits));
const loadLocalHabits = () => useHabits(LS.get(habKey(), null) || (S.settings.demo || legacyCfg() ? SAMPLE_HABITS : []));
loadLocalHabits();
// Luật cho Gemini: ghi chú riêng nếu có, không thì ghép từ mức đạt / tối thiểu
// Luật gửi Gemini: "full: <Thế nào là đạt>. min: <Tối thiểu>." Ô đạt đã tự ghi full:/min: (rule cũ chuyển sang) thì không thêm lần nữa.
const aiRule = h => {
  const t = (h.rule || "").trim().replace(/^full:\s*/i, "") || (h.full || "").trim() || "có làm";
  return (/\bfull:/i.test(t) ? t : `full: ${t}`) + (/[.!?]$/.test(t) ? "" : ".") + (h.min && !/\bmin:/i.test(t) ? ` min: ${h.min}.` : "");
};
// Lịch của thói quen, một dòng: "Mỗi ngày" · "T2 · T4 · T6" · "2 lần/tuần"
const daysLabel = days => [1, 2, 3, 4, 5, 6, 0].filter(k => days.includes(k)).map(k => DOW_SHORT[k]).join(" · ");
const freqLabel = h => (h.freq === "daily" ? "Mỗi ngày" : h.freq === "days" ? daysLabel(h.days)
  : `${h.perWeekFull} lần/tuần${h.days.length < 7 ? ` · ${daysLabel(h.days)}` : ""}`);

// ============================================================ Google API
function gisReady() { return !!(window.google && google.accounts && google.accounts.oauth2); }
function loadGIS() {
  return new Promise((res, rej) => {
    if (gisReady()) return res();
    let sc = $("#gisScript");
    if (!sc) { sc = document.createElement("script"); sc.id = "gisScript"; sc.src = "https://accounts.google.com/gsi/client"; sc.async = true; document.head.appendChild(sc); }
    sc.addEventListener("load", () => res()); sc.addEventListener("error", () => rej(new Error("Không tải được Google đăng nhập (mất mạng?)")));
  });
}
function signedIn() { return !!(S.tok && S.tok.exp > Date.now()); }
async function signIn(consent) {
  await loadGIS();
  return new Promise((res, rej) => {
    const c = google.accounts.oauth2.initTokenClient({
      client_id: S.settings.clientId.trim(), scope: SCOPE,
      callback: r => {
        if (r.error) return rej(new Error(r.error_description || r.error));
        if (!google.accounts.oauth2.hasGrantedAllScopes(r, ...SCOPE.split(" "))) return rej(new Error("Bạn cần cho phép cả Calendar và Drive"));
        S.tok = { t: r.access_token, exp: Date.now() + ((+r.expires_in || 3600) - 60) * 1000 };
        LS.set("tok", S.tok); res();
      },
      error_callback: e => rej(new Error(e && e.type === "popup_closed" ? "Đã hủy đăng nhập" : e && e.type === "popup_failed_to_open" ? "Trình duyệt chặn cửa sổ đăng nhập" : "Đăng nhập lỗi")),
    });
    c.requestAccessToken({ prompt: consent ? "consent" : "" });
  });
}
function signOut() {
  if (S.tok && gisReady()) try { google.accounts.oauth2.revoke(S.tok.t); } catch {}
  S.tok = null; LS.set("tok", null);
}
async function g(url, opt = {}) {
  if (!signedIn()) { const e = new Error("Cần đăng nhập Google lại"); e.auth = true; throw e; }
  const headers = Object.assign({ Authorization: "Bearer " + S.tok.t }, opt.body && !(opt.body instanceof Blob) && typeof opt.body === "string" && !opt.raw ? { "Content-Type": "application/json" } : {}, opt.headers || {});
  const r = await fetch(url, Object.assign({}, opt, { headers }));
  if (r.status === 401) { S.tok = null; LS.set("tok", null); const e = new Error("Phiên Google hết hạn, đăng nhập lại nhé"); e.auth = true; throw e; }
  if (!r.ok) { let m = ""; try { m = (await r.json()).error.message; } catch {} throw new Error(`Google lỗi ${r.status}${m ? ": " + m : ""}`); }
  if (r.status === 204) return null;
  const ct = r.headers.get("content-type") || "";
  return ct.includes("json") ? r.json() : r.text();
}
const q = o => new URLSearchParams(o).toString();

function evToItem(ev, kind) {
  const p = (ev.extendedProperties && ev.extendedProperties.private) || {};
  const start = new Date(ev.start.dateTime || ev.start.date), end = new Date(ev.end.dateTime || ev.end.date);
  const key = p.key;
  return {
    id: ev.id, kind, key, title: (ev.summary || "").replace(/^💤 /, ""), start, end,
    cat: p.cat || (key && TPL[key] && TPL[key].cat) || "life",
    habit: p.habit != null ? p.habit : (key && TPL[key] && TPL[key].habit) || "",
    plan: p.plan || "",
    hprev: p.hprev || "",
    ess: p.ess != null ? p.ess === "1" : !!(key && TPL[key] && TPL[key].ess),
    rem: remParse(p.rem, key),
    muted: (ev.summary || "").startsWith("💤 "),
    added: p.added === "1",
  };
}
function recFromEv(ev) {
  const p = ev.extendedProperties.private;
  const j = (s, d) => { try { return JSON.parse(s); } catch { return d; } };
  return { id: ev.id, date: p.date, h: j(p.h, {}), v: j(p.v, {}), unwell: p.unwell === "1", reason: p.reason || "", skip: j(p.skip, []), muted: j(p.muted, []), late: lateParse(p.late, p.lm) };
}
function recToProps(r) {
  return { sl: "day", date: r.date, h: JSON.stringify(r.h || {}), v: JSON.stringify(r.v || {}), unwell: r.unwell ? "1" : "0", reason: (r.reason || "").slice(0, 500), skip: JSON.stringify(r.skip || []), muted: JSON.stringify(r.muted || []), ...lateProps(r.late) };
}
// Dậy trễ: lưu gọn thành 2 thuộc tính (mỗi thuộc tính của Calendar tối đa 1024 ký tự). lm = giờ gốc các khối đã dời [[id, s, e]]
function lateProps(L) {
  if (!L) return { late: "", lm: "" };
  return { late: JSON.stringify({ w: L.wake, k: L.skipped || [], h: L.hprev || {}, x: L.hset || "" }), lm: JSON.stringify((L.moved || []).map(m => [m.id, m.s, m.e])) };
}
function lateParse(late, lm) {
  if (!late) return null;
  try { const o = JSON.parse(late), m = JSON.parse(lm || "[]"); return { wake: o.w, moved: m.map(([id, s, e]) => ({ id, s, e })), skipped: o.k || [], hprev: o.h || {}, hset: o.x || "" }; } catch { return null; }
}
// Nhắc của một khối: mảng số phút trước giờ bắt đầu ([] = không nhắc). Lưu trong sự kiện (rem = "30,0"),
// để khối tự thêm cũng bật / tắt nhắc đúng khi rest day. Sự kiện cũ chưa có rem thì lấy theo tuần mẫu trong code.
function remParse(s, key) {
  if (s == null) return (key && TPL[key] && TPL[key].rem) || [0];
  return String(s).split(",").filter(x => x !== "").map(Number).filter(n => n >= 0);
}
// UNTIL của RRULE: hết ngày ds theo giờ máy, đổi sang UTC (vd 20261116T165959Z)
const untilUTC = ds => { const d = parseYmd(ds); d.setHours(23, 59, 59, 0); return d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z"); };
const rrule = (days, until) => `RRULE:FREQ=WEEKLY;BYDAY=${[...days].sort().map(d => BYDAY[d]).join(",")}` + (until ? `;UNTIL=${untilUTC(until)}` : "");
// Ngày đầu tiên từ ds trở đi rơi vào một trong các thứ days
function firstOn(days, ds) { let d = parseYmd(ds); for (let i = 0; i < 7 && !days.includes(d.getDay()); i++) d = addDays(d, 1); return d; }
function planBody(t, firstDay, until) {
  const e = t.e > t.s ? t.e : hm(new Date(+atTime(firstDay, t.s) + 15 * 60000));
  return {
    summary: t.title,
    start: { dateTime: rfc(atTime(firstDay, t.s)), timeZone: TZ },
    end: { dateTime: rfc(atTime(firstDay, e)), timeZone: TZ },
    recurrence: [rrule(t.days, until)],
    colorId: (CATS[t.cat] || CATS.life).color,
    reminders: { useDefault: false, overrides: (t.rem || [0]).map(m => ({ method: "popup", minutes: m })) },
    extendedProperties: { private: { sl: "plan", key: t.key || "", cat: t.cat, habit: t.habit || "", ess: t.ess ? "1" : "0", rem: (t.rem || [0]).join(",") } },
    transparency: "transparent",
  };
}
// Sự kiện gốc của một chuỗi lặp (singleEvents=false) → khối tuần mẫu.
// from = ngày lần lặp đầu, until = ngày lần lặp cuối (null = mãi mãi). Chuỗi kiểu khác (COUNT, cách tuần...) thì bỏ qua.
function evToSeries(ev) {
  if (!ev.start || !ev.start.dateTime) return null;
  const rr = (ev.recurrence || []).find(r => r.startsWith("RRULE:")); if (!rr) return null;
  const P = Object.fromEntries(rr.slice(6).split(";").map(x => x.split("=")));
  if (!["WEEKLY", "DAILY"].includes(P.FREQ) || (P.INTERVAL && P.INTERVAL !== "1") || P.COUNT) return null;
  const it = evToItem(ev, "plan");
  const days = P.FREQ === "DAILY" ? [...ALL] : P.BYDAY ? [...new Set(P.BYDAY.split(",").map(x => BYDAY.indexOf(x.slice(-2))).filter(n => n >= 0))].sort() : [it.start.getDay()];
  let until = null;
  if (P.UNTIL) {
    const m = P.UNTIL.match(/^(\d{4})(\d\d)(\d\d)(?:T(\d\d)(\d\d)(\d\d)(Z?))?/);
    if (m) until = ymd(m[4] ? (m[7] ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6])) : new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5])) : new Date(+m[1], m[2] - 1, +m[3]));
  }
  const s = hm(it.start), e = startOfDay(it.end) > startOfDay(it.start) ? "23:59" : hm(it.end);
  return { id: ev.id, key: it.key || "", title: it.title, cat: CATS[it.cat] ? it.cat : "life", days, s, e, habit: it.habit, ess: it.ess, rem: it.rem, from: ymd(it.start), until, recurrence: ev.recurrence };
}
// Thay / thêm UNTIL trong RRULE, giữ các dòng khác (EXDATE...). until = null thì bỏ UNTIL.
const withUntil = (rec, until) => rec.map(r => (r.startsWith("RRULE:") ? r.replace(/;UNTIL=[^;]*/, "") + (until ? `;UNTIL=${untilUTC(until)}` : "") : r));

const Google = {
  async findConfig() {
    const r = await g(`${DRIVE}/files?${q({ q: "name='still-life-config.json' and trashed=false", fields: "files(id)", spaces: "drive" })}`);
    if (!r.files.length) return null;
    const c = await this.readConfig(r.files[0].id);
    c.configFileId = r.files[0].id; return c;
  },
  async readConfig(id) {
    const v = await g(`${DRIVE}/files/${id}?alt=media`);   // Drive trả application/json nên g() có thể đã parse sẵn
    return typeof v === "string" ? JSON.parse(v) : v;
  },
  // Ghi Gemini key vào file cấu hình trên Drive để máy khác cùng tài khoản dùng chung
  async pushKey(key) {
    const c = await this.readConfig(S.cfg.configFileId);
    if (c.geminiKey === key) return;
    c.geminiKey = key;
    await this.writeFile("still-life-config.json", null, JSON.stringify(c, null, 2), "application/json", S.cfg.configFileId);
  },
  // Danh sách thói quen cũng nằm trong file cấu hình, để máy khác cùng tài khoản thấy giống nhau
  async pushHabits(list) {
    const c = await this.readConfig(S.cfg.configFileId);
    c.habits = list;
    await this.writeFile("still-life-config.json", null, JSON.stringify(c, null, 2), "application/json", S.cfg.configFileId);
  },
  async folder(name, parent) {
    const qs = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false` + (parent ? ` and '${parent}' in parents` : "");
    const r = await g(`${DRIVE}/files?${q({ q: qs, fields: "files(id)" })}`);
    if (r.files.length) return r.files[0].id;
    const f = await g(`${DRIVE}/files?fields=id`, { method: "POST", body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: parent ? [parent] : undefined }) });
    return f.id;
  },
  async writeFile(name, parent, content, mime, fileId) {
    if (fileId) return g(`${UPLOAD}/files/${fileId}?uploadType=media&fields=id`, { method: "PATCH", body: new Blob([content], { type: mime }), headers: { "Content-Type": mime } });
    const boundary = "sl" + Math.random().toString(36).slice(2);
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parent], mimeType: mime })}\r\n--${boundary}\r\nContent-Type: ${mime}; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`;
    return g(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: "POST", body, raw: true, headers: { "Content-Type": `multipart/related; boundary=${boundary}` } });
  },
  async setup(onStep) {
    onStep("Tạo thư mục Drive “Still life”");
    const folderId = await this.folder("Still life");
    const journalFolderId = await this.folder("Nhật ký", folderId);
    onStep("Tạo lịch “Still life · Kế hoạch”");
    const plan = await g(`${CAL}/calendars`, { method: "POST", body: JSON.stringify({ summary: "Still life · Kế hoạch", description: "Tuần mẫu. Sửa trực tiếp ở đây hoặc qua app Still life.", timeZone: TZ }) });
    onStep("Tạo lịch “Still life · Thực tế”");
    const act = await g(`${CAL}/calendars`, { method: "POST", body: JSON.stringify({ summary: "Still life · Thực tế", description: "Những gì đã thật sự làm, do app Still life ghi.", timeZone: TZ }) });
    const today = startOfDay(new Date());
    for (const [i, t] of TEMPLATE.entries()) {
      onStep(`Thêm lịch mẫu ${i + 1}/${TEMPLATE.length}: ${t.title}`);
      let first = today; while (!t.days.includes(first.getDay())) first = addDays(first, 1);
      await g(`${CAL}/calendars/${encodeURIComponent(plan.id)}/events`, { method: "POST", body: JSON.stringify(planBody(t, first)) });
    }
    const cfg = { planCal: plan.id, actualCal: act.id, folderId, journalFolderId, start: ymd(today), v: 1, geminiKey: cleanKey(S.settings.geminiKey), habits: [] };   // bắt đầu không có thói quen nào
    const f = await this.writeFile("still-life-config.json", folderId, JSON.stringify(cfg, null, 2), "application/json");
    cfg.configFileId = f.id; return cfg;
  },
  async listPlan(from, to) {
    const r = await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.planCal)}/events?${q({ singleEvents: true, orderBy: "startTime", timeMin: rfc(from), timeMax: rfc(to), maxResults: 250 })}`);
    return r.items.filter(e => e.status !== "cancelled" && e.start.dateTime).map(e => evToItem(e, "plan"));
  },
  async listActual(from, to) {
    const r = await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.actualCal)}/events?${q({ singleEvents: true, orderBy: "startTime", timeMin: rfc(from), timeMax: rfc(to), maxResults: 500, privateExtendedProperty: "sl=act" })}`);
    return r.items.filter(e => e.start.dateTime).map(e => evToItem(e, "act"));
  },
  async listDays(from, to) {
    const out = {}; let pageToken = "";
    do {
      const r = await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.actualCal)}/events?${q(Object.assign({ singleEvents: true, timeMin: rfc(addDays(from, -1)), timeMax: rfc(addDays(to, 1)), maxResults: 500, privateExtendedProperty: "sl=day" }, pageToken ? { pageToken } : {}))}`);
      for (const e of r.items) { const rec = recFromEv(e); if (rec.date) out[rec.date] = rec; }
      pageToken = r.nextPageToken || "";
    } while (pageToken);
    return out;
  },
  async addActual(a) {
    const body = {
      summary: a.title, start: { dateTime: rfc(a.start), timeZone: TZ }, end: { dateTime: rfc(a.end), timeZone: TZ },
      colorId: CATS[a.cat].color, reminders: { useDefault: false, overrides: [] }, transparency: "transparent",
      extendedProperties: { private: { sl: "act", cat: a.cat, habit: a.habit || "", plan: a.plan || "", hprev: a.hprev || "" } },
    };
    const ev = await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.actualCal)}/events`, { method: "POST", body: JSON.stringify(body) });
    const it = evToItem(ev, "act"); it.plan = a.plan || ""; return it;
  },
  async updateActual(a) {
    const body = {
      summary: a.title, start: { dateTime: rfc(a.start), timeZone: TZ }, end: { dateTime: rfc(a.end), timeZone: TZ },
      colorId: CATS[a.cat].color, extendedProperties: { private: { sl: "act", cat: a.cat, habit: a.habit || "", plan: a.plan || "", hprev: a.hprev || "" } },
    };
    const ev = await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.actualCal)}/events/${encodeURIComponent(a.id)}`, { method: "PATCH", body: JSON.stringify(body) });
    const it = evToItem(ev, "act"); it.plan = a.plan || ""; return it;
  },
  async deleteActual(id) {
    await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.actualCal)}/events/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async saveDay(rec) {
    const d = parseYmd(rec.date);
    const body = {
      summary: `Thói quen · ${dmy(d)}` + (rec.unwell ? " · rest day" : ""),
      start: { date: rec.date }, end: { date: ymd(addDays(d, 1)) }, transparency: "transparent",
      reminders: { useDefault: false, overrides: [] }, colorId: "2",
      extendedProperties: { private: recToProps(rec) },
    };
    const base = `${CAL}/calendars/${encodeURIComponent(S.cfg.actualCal)}/events`;
    const ev = rec.id ? await g(`${base}/${rec.id}`, { method: "PUT", body: JSON.stringify(body) }) : await g(base, { method: "POST", body: JSON.stringify(body) });
    return recFromEv(ev);
  },
  async mutePlan(items, mute) {
    const base = `${CAL}/calendars/${encodeURIComponent(S.cfg.planCal)}/events`;
    await Promise.all(items.map(it => {   // song song: tắt cả chục khối mất ~1 lượt mạng thay vì chục lượt
      const body = mute
        ? { summary: "💤 " + it.title, reminders: { useDefault: false, overrides: [] } }
        : { summary: it.title, reminders: { useDefault: false, overrides: (it.rem || [0]).map(m => ({ method: "popup", minutes: m })) } };
      return g(`${base}/${encodeURIComponent(it.id)}`, { method: "PATCH", body: JSON.stringify(body) });
    }));
  },
  async addPlan(it) {   // khối riêng cho 1 ngày, không lặp
    const body = {
      summary: it.title, start: { dateTime: rfc(it.start), timeZone: TZ }, end: { dateTime: rfc(it.end), timeZone: TZ },
      colorId: CATS[it.cat].color, transparency: "transparent",
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] },
      extendedProperties: { private: { sl: "plan", cat: it.cat, added: "1" } },
    };
    const ev = await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.planCal)}/events`, { method: "POST", body: JSON.stringify(body) });
    return evToItem(ev, "plan");
  },
  async deletePlan(id) {
    await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.planCal)}/events/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async updatePlan(it) {   // id là 1 lần lặp (singleEvents) → chỉ đổi ngày đó
    const body = { summary: (it.muted ? "💤 " : "") + it.title, start: { dateTime: rfc(it.start), timeZone: TZ }, end: { dateTime: rfc(it.end), timeZone: TZ } };
    const ev = await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.planCal)}/events/${encodeURIComponent(it.id)}`, { method: "PATCH", body: JSON.stringify(body) });
    return evToItem(ev, "plan");
  },
  // ---- tuần mẫu: làm việc với sự kiện gốc của chuỗi lặp, không phải từng lần lặp
  // Các chuỗi còn chạy từ ngày mai (chuỗi đã cắt ở hôm nay hoặc trước đó là quá khứ, không hiện)
  async listSeries() {
    const out = [], T = tomorrowStr(); let pageToken = "";
    do {
      const r = await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.planCal)}/events?${q(Object.assign({ singleEvents: false, maxResults: 250 }, pageToken ? { pageToken } : {}))}`);
      for (const e of r.items) { if (e.status === "cancelled") continue; const s = evToSeries(e); if (s && (!s.until || s.until >= T)) out.push(s); }
      pageToken = r.nextPageToken || "";
    } while (pageToken);
    return out;
  },
  async createSeries(t, from) {
    const ev = await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.planCal)}/events`, { method: "POST", body: JSON.stringify(planBody(t, firstOn(t.days, from), t.until)) });
    return evToSeries(ev);
  },
  async updateSeries(id, t, from) {   // sửa thẳng chuỗi (chỉ dùng khi chuỗi chưa có lần lặp nào tới hôm nay)
    const ev = await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.planCal)}/events/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(planBody(t, firstOn(t.days, from), t.until)) });
    return evToSeries(ev);
  },
  async endSeries(s, until) {   // cho chuỗi dừng sau ngày until (null = chạy tiếp mãi, dùng khi hoàn tác)
    await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.planCal)}/events/${encodeURIComponent(s.id)}`, { method: "PATCH", body: JSON.stringify({ recurrence: withUntil(s.recurrence || [rrule(s.days)], until) }) });
  },
  async deleteSeries(id) { await this.deletePlan(id); },
  async listJournal() {
    const r = await g(`${DRIVE}/files?${q({ q: `'${S.cfg.journalFolderId}' in parents and trashed=false`, fields: "files(id,name,modifiedTime)", orderBy: "name desc", pageSize: 120 })}`);
    return r.files.map(f => ({ id: f.id, date: f.name.replace(/\.md$/, ""), mod: f.modifiedTime }));
  },
  async readJournal(file) { return g(`${DRIVE}/files/${file.id}?alt=media`); },
  async saveJournal(date, md, file) {
    const r = await this.writeFile(`${date}.md`, S.cfg.journalFolderId, md, "text/markdown", file && file.id);
    return { id: r.id, date, mod: new Date().toISOString() };
  },
};

// ============================================================ Demo store (dữ liệu mẫu, chỉ trong máy)
const Demo = (() => {
  const db = LS.get("demo", null) || seed();
  function seed() {
    const t0 = startOfDay(new Date()), days = {}, actual = [], journal = {};
    let rnd = 7; const r = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
    for (let i = 60; i >= 1; i--) {
      const d = addDays(t0, -i), ds = ymd(d), h = {}, dow = d.getDay(), warm = 1 - i / 75;
      const unwell = i === 9 || i === 23;
      for (const hb of HABITS) {
        if (!scheduled(hb, d)) continue;
        const x = r();
        if (unwell) continue;
        if (x < 0.45 + warm * 0.4) h[hb.id] = "full"; else if (x < 0.62 + warm * 0.3) h[hb.id] = "min";
      }
      days[ds] = { id: "d" + ds, date: ds, h, v: { walk: 1500 + Math.round(r() * 2500) }, unwell, reason: unwell ? "mệt" : "", skip: [], muted: [] };
      if (i <= 6) journal[ds] = `# Nhật ký · ${fmtDate(d)}\n\n## Vui vì\nĐi lớp tiếng Hàn, cô khen phát âm.\n\n## Biết ơn\nCơm mẹ nấu.\n\n## Mai muốn\nDậy 5:30 và đi gym.\n`;
    }
    const now = new Date(), ds = ymd(t0);
    days[ds] = { id: "d" + ds, date: ds, h: {}, v: {}, unwell: false, reason: "", skip: [], muted: [] };
    const push = (title, cat, s, e, habit) => { const a = atTime(t0, s), b = atTime(t0, e); if (b <= now) actual.push({ id: "a" + actual.length, kind: "act", title, cat, start: a, end: b, habit: habit || "" }); };
    push("Dậy", "life", "05:40", "05:50", "wake"); push(t0.getDay() % 2 ? "Yoga" : "Đi bộ quanh hồ", "health", "06:00", "06:55");
    push("Ăn sáng", "life", "07:00", "07:30"); push("Lướt TikTok", "scroll", "07:30", "08:40");
    push("Code app Still life", "build", "09:00", "11:10"); push("Ăn trưa", "life", "11:40", "12:20");
    push("Xem YouTube", "scroll", "12:20", "13:30"); push("Học 8 từ mới", "korean", "14:05", "14:25", "korean");
    if (now.getHours() >= 6) days[ds].h.wake = "min";
    if (now.getHours() >= 15) days[ds].h.korean = "full";
    return { days, actual, journal, muted: [] };
  }
  db.planEdit = db.planEdit || {}; db.planExtra = db.planExtra || [];
  // Tuần mẫu của demo: mỗi chuỗi { id, ...khối, from, until }. Chuỗi gốc lấy id = key để id lần lặp giữ dạng key_ngày như trước
  db.tpl = db.tpl || TEMPLATE.map(t => ({ id: t.key, key: t.key, title: t.title, cat: t.cat, days: [...t.days], s: t.s, e: t.e, habit: t.habit || "", ess: !!t.ess, rem: t.rem || [0], from: "2000-01-01", until: null }));
  const persist = () => LS.set("demo", { days: db.days, actual: db.actual.map(a => Object.assign({}, a, { start: +a.start, end: +a.end })), journal: db.journal, jmod: db.jmod, muted: db.muted, planEdit: db.planEdit, planExtra: db.planExtra, tpl: db.tpl });
  const SF = ["key", "title", "cat", "days", "s", "e", "habit", "ess", "rem"];
  const pickS = t => { const o = {}; for (const k of SF) o[k] = Array.isArray(t[k]) ? [...t[k]] : t[k]; o.key = o.key || ""; o.habit = o.habit || ""; o.ess = !!o.ess; o.rem = o.rem || [0]; return o; };
  db.actual = db.actual.map(a => Object.assign(a, { start: new Date(a.start), end: new Date(a.end) }));
  return {
    async setup() { return { planCal: "demo", actualCal: "demo", start: ymd(addDays(new Date(), -60)) }; },
    async listPlan(from, to) {
      const out = [];
      for (let d = startOfDay(from); d < to; d = addDays(d, 1)) for (const t of db.tpl) {
        const ds = ymd(d);
        if (!t.days.includes(d.getDay()) || ds < t.from || (t.until && ds > t.until)) continue;
        const id = `${t.id}_${ds}`;
        const ed = db.planEdit[id] || {};
        out.push({ id, kind: "plan", key: t.key, title: ed.title || t.title, start: ed.start ? new Date(ed.start) : atTime(d, t.s), end: ed.end ? new Date(ed.end) : atTime(d, t.e), cat: t.cat, habit: t.habit || "", ess: !!t.ess, rem: t.rem, muted: db.muted.includes(id) });
      }
      for (const x of db.planExtra) {
        const ed = db.planEdit[x.id] || {}, st = new Date(ed.start || x.start), en = new Date(ed.end || x.end);
        if (st >= startOfDay(from) && st < to) out.push({ id: x.id, kind: "plan", title: ed.title || x.title, start: st, end: en, cat: x.cat, habit: "", ess: false, added: true, muted: db.muted.includes(x.id) });
      }
      return out.sort((a, b) => a.start - b.start);
    },
    async listActual(from, to) { return db.actual.filter(a => a.start >= from && a.start < to).sort((a, b) => a.start - b.start); },
    async listDays(from, to) { const o = {}; for (const [k, v] of Object.entries(db.days)) { const d = parseYmd(k); if (d >= startOfDay(from) && d <= to) o[k] = v; } return o; },
    async addActual(a) { const it = Object.assign({ id: "a" + Date.now() + Math.random(), kind: "act" }, a); db.actual.push(it); persist(); return it; },
    async updateActual(a) { const i = db.actual.findIndex(x => x.id === a.id); if (i >= 0) db.actual[i] = Object.assign({}, db.actual[i], a); persist(); return Object.assign({}, db.actual[i]); },
    async deleteActual(id) { db.actual = db.actual.filter(x => x.id !== id); persist(); },
    async saveDay(rec) { rec = Object.assign({}, rec, { id: rec.id || "d" + rec.date }); db.days[rec.date] = rec; persist(); return rec; },
    async addPlan(it) { const x = { id: "p" + Date.now(), title: it.title, cat: it.cat, start: +it.start, end: +it.end }; db.planExtra.push(x); persist(); return Object.assign({ kind: "plan", habit: "", ess: false, added: true, muted: false }, it, { id: x.id }); },
    async deletePlan(id) { db.planExtra = db.planExtra.filter(x => x.id !== id); delete db.planEdit[id]; persist(); },
    async updatePlan(it) { db.planEdit[it.id] = { title: it.title, start: +it.start, end: +it.end }; persist(); return Object.assign({}, it); },
    async listSeries() { const T = tomorrowStr(); return db.tpl.filter(t => !t.until || t.until >= T).map(t => Object.assign({}, t, pickS(t))); },
    async createSeries(t, from) { const x = Object.assign(pickS(t), { id: "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), from: ymd(firstOn(t.days, from)), until: t.until || null }); db.tpl.push(x); persist(); return Object.assign({}, x); },
    async updateSeries(id, t, from) { const x = db.tpl.find(y => y.id === id); if (!x) throw new Error("Không thấy lịch"); Object.assign(x, pickS(t), { from: ymd(firstOn(t.days, from)), until: t.until || null }); persist(); return Object.assign({}, x); },
    async endSeries(s, until) { const x = db.tpl.find(y => y.id === s.id); if (x) { x.until = until || null; persist(); } },
    async deleteSeries(id) { db.tpl = db.tpl.filter(y => y.id !== id); persist(); },
    async mutePlan(items, mute) { for (const it of items) { db.muted = db.muted.filter(x => x !== it.id); if (mute) db.muted.push(it.id); } persist(); },
    async listJournal() { return Object.keys(db.journal).sort().reverse().map(date => ({ id: date, date, mod: (db.jmod || {})[date] })); },
    async readJournal(f) { return db.journal[f.date] || ""; },
    async saveJournal(date, md) { const mod = new Date().toISOString(); db.journal[date] = md; (db.jmod = db.jmod || {})[date] = mod; persist(); return { id: date, date, mod }; },
    reset() { localStorage.removeItem("sl.demo"); localStorage.removeItem("sl.demoHabits"); },
  };
})();
const api = () => (S.settings.demo ? Demo : Google);
const ready = () => S.settings.demo || (S.cfg && signedIn());

// ============================================================ habit logic
function blankRec(date) { return { id: null, date, h: {}, v: {}, unwell: false, reason: "", skip: [], muted: [], late: null }; }
function scheduled(hb, d) { const s = sch(hb, d); return s.freq === "daily" || s.days.includes(d.getDay()); }
function trackStart() {
  if (S.settings.demo) return addDays(startOfDay(new Date()), -60);
  return S.cfg && S.cfg.start ? parseYmd(S.cfg.start) : startOfDay(new Date());
}
// Ngày bắt đầu tính của một thói quen: muộn hơn giữa ngày bắt đầu app và since của thói quen đó
function habStart(hb) { const t = trackStart(); if (!hb.since) return t; const s = parseYmd(hb.since); return s > t ? s : t; }
// Trạng thái 1 ô: full | min | rest | miss | pending | off | none | future
function cellStatus(hb, d) {
  const ds = ymd(d), rec = S.days[ds], today = startOfDay(new Date());
  const st = rec && rec.h[hb.id];
  if (d > today) return "future";
  if (st === "full" || st === "min") return st;
  if (d < habStart(hb)) return "none";
  if (!scheduled(hb, d)) return "off";
  if (rec && rec.unwell) return "rest";
  if (sch(hb, d).freq === "weekly") return +d === +today ? "pending" : "off";   // gym: tính theo tuần
  if (+d === +today) return "pending";
  return "miss";
}
// Tuần có đổi lịch: số lần/tuần tính theo lịch của thứ Hai đầu tuần
function weekCount(hb, monday) {
  let done = 0, total = 0;
  const ws = sch(hb, monday);
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i), st = cellStatus(hb, d);
    if (st === "full" || st === "min") done++;
    if (sch(hb, d).freq !== "weekly" && scheduled(hb, d) && st !== "future" && st !== "none" && st !== "rest") total++;
  }
  if (ws.freq === "weekly") return { done, total: ws.perWeekFull, label: `${done}/${ws.perWeekFull}`, star: done >= ws.perWeekFull, ok: done >= Math.max(1, ws.perWeekMin) };
  return { done, total, label: `${done}/${total}`, star: total > 0 && done === total, ok: total > 0 && done === total };
}
function streak(hb) {
  const today = startOfDay(new Date()), start = habStart(hb), fq = sch(hb, today).freq;
  if (fq === "weekly") {
    let n = 0, m = mondayOf(today);
    const cur = weekCount(hb, m); if (cur.ok) n++;
    for (m = addDays(m, -7); m >= mondayOf(start); m = addDays(m, -7)) { if (weekCount(hb, m).ok) n++; else break; }
    return { n, unit: "tuần" };
  }
  let n = 0;
  for (let d = today; d >= start; d = addDays(d, -1)) {
    const st = cellStatus(hb, d);
    if (st === "full" || st === "min") n++;
    else if (st === "pending" || st === "rest" || st === "off") continue;
    else break;
  }
  return { n, unit: fq === "days" ? "buổi" : "ngày" };
}
// Thói quen còn hiện trong rest day: có lịch hôm đó, đã bắt đầu, có bản tối thiểu cho riêng ngày đó
// (số lần/tuần có tối thiểu tính theo tuần, nên không tính)
function restHabits(d) {
  return HABITS.filter(hb => (hb.min || "").trim() && d >= habStart(hb) && scheduled(hb, d) && sch(hb, d).freq !== "weekly");
}
function unwellRun() {
  let n = 0; for (let d = startOfDay(new Date()); n < 10; d = addDays(d, -1)) { const r = S.days[ymd(d)]; if (r && r.unwell) n++; else break; }
  return n;
}

// ============================================================ data loading
async function loadToday() {
  const t0 = startOfDay(new Date()), t1 = addDays(t0, 1);
  const [plan, actual, days] = await Promise.all([api().listPlan(t0, t1), api().listActual(t0, t1), api().listDays(addDays(t0, -3), t0)]);
  Object.assign(S.days, days);
  S.today = { plan, actual, rec: S.days[ymd(t0)] || blankRec(ymd(t0)) };
}
async function loadHistory() {
  const t0 = startOfDay(new Date());
  const from = addDays(mondayOf(t0), -7 * 16);
  Object.assign(S.days, await api().listDays(from, t0));
}
// tuần/tháng cũ hơn phần lịch sử đã tải thì tải thêm
async function ensureDays(from, to) {
  if (S.days[ymd(from)] || from < addDays(trackStart(), -7)) return;
  try { Object.assign(S.days, await api().listDays(from, to)); } catch (er) { handleErr(er); }
}
async function saveRec(rec) {
  const saved = await api().saveDay(rec);
  S.days[saved.date] = saved;
  if (saved.date === todayStr()) S.today.rec = saved;
  return saved;
}
// Ghi lần lượt: bấm nhanh nhiều nút thì lần sau đợi lần trước xong, đọc bản đã lưu (có id), không tạo hai sự kiện cho một ngày
let habQ = Promise.resolve();
function queueHabit(date, id, level, value) {
  const run = habQ.then(() => setHabit(date, id, level, value));
  habQ = run.catch(() => {});
  return run;
}
async function setHabit(date, id, level, value) {
  const rec = Object.assign(blankRec(date), S.days[date] || {});
  rec.h = Object.assign({}, rec.h); rec.v = Object.assign({}, rec.v);
  if (level == null) delete rec.h[id]; else rec.h[id] = level;
  if (value != null) rec.v[id] = value;
  return saveRec(rec);
}

// ============================================================ render: today
function catVars(cat) { const c = CATS[cat] || CATS.life; return `--cat:${c.hex}`; }
// Màu icon thói quen theo nhóm. Vàng (Người thân) quá nhạt trên nền sáng nên đi qua biến --yellow-ic (đậm hơn ở theme sáng).
function icVars(cat) { const k = CATS[cat] ? cat : "life"; return `--cat:${k === "people" ? "var(--yellow-ic)" : CATS[k].hex}`; }
function currentBlocks() {
  const now = new Date(), rec = S.today.rec || {};
  const plan = S.today.plan.filter(p => !(rec.unwell && !p.ess));
  const doneIds = new Set(S.today.actual.map(a => a.plan).filter(Boolean));
  const cur = plan.find(p => p.start <= now && now < p.end);
  const next = plan.find(p => p.start > now);
  return { cur, next, done: cur && (doneIds.has(cur.id) || (rec.skip || []).includes(cur.id)), skipped: cur && (rec.skip || []).includes(cur.id) };
}

function renderToday() {
  const v = $("#view-today");
  if (!ready()) return;   // cổng vào đang che app
  if (S.tplOpen) return renderTpl();
  const rec = S.today.rec || blankRec(todayStr()), now = new Date();
  const { cur, next, done, skipped } = currentBlocks();
  let html = "";

  if (unwellRun() >= 3) html += `<div class="care fade-in"><b>Mấy hôm nay bạn ổn không?</b>Đã ${unwellRun()} ngày liền là rest day. Nếu thấy nặng nề, nhắn cho một người bạn tin tưởng hoặc tìm chuyên gia tâm lý nhé. Bạn không phải tự gồng một mình.</div>`;

  if (rec.unwell) {
    html += `<div class="unwell-card fade-in">
      <p class="now__label"><i class="ph-fill ph-hand-heart"></i> Rest day</p>
      <h3>Hôm nay chỉ cần nhẹ nhàng thôi.</h3>
      <p class="muted" style="margin:0">Chuỗi ngày không bị gãy. Nhắc nhở các lịch khác đã tắt.</p>
      ${(() => { const t0 = startOfDay(new Date()), rs = restHabits(t0).filter(hb => cellStatus(hb, t0) === "rest");   // đã làm rồi thì không nhắc
        return rs.length ? `<p class="muted" style="margin:10px 0 0">Nếu còn sức, chỉ cần bản tối thiểu:</p>
      <ul>${rs.map(hb => `<li><i class="ph ${hb.icon} hic" style="${icVars(hb.cat)}"></i> <span><b>${esc(hb.name)}</b> · ${esc(hb.min)}</span></li>`).join("")}</ul>`
        : `<p class="muted" style="margin:10px 0 14px">Hôm nay nghỉ ngơi là đủ.</p>`; })()}
      <button class="btn" id="btnUnwellOff"><i class="ph ph-arrow-counter-clockwise"></i> Mình ổn hơn rồi</button>
    </div>`;
  }

  if (cur) {
    const pct = Math.min(100, Math.max(0, (now - cur.start) / (cur.end - cur.start) * 100));
    html += `<article class="now fade-in ${done ? "now--done" : ""}" style="${catVars(cur.cat)}">
      <h2 class="now__title">${esc(cur.title)}</h2>
      <p class="now__time num">${hm(cur.start)} – ${hm(cur.end)} · còn ${Math.max(0, Math.round((cur.end - now) / 60000))} phút</p>
      <div class="bar" aria-hidden="true"><span style="transform:scaleX(${pct / 100})"></span></div>
      ${done ? `<div class="now__done"><span class="badge ${skipped ? "" : "badge--good"}"><i class="ph${skipped ? "" : "-fill"} ${skipped ? "ph-skip-forward" : "ph-check-circle"}"></i> ${skipped ? "Đã bỏ qua" : "Đã làm"}</span>
          <button class="btn btn--icon" data-act="undo" data-id="${esc(cur.id)}" aria-label="Hoàn tác" title="Hoàn tác"><i class="ph ph-arrow-counter-clockwise"></i></button></div>`
        : `<div class="now__actions">
        <button class="btn btn--primary" data-act="done" data-id="${esc(cur.id)}"><i class="ph ph-check"></i> Đã làm</button>
        <button class="btn btn--icon" data-act="skip" data-id="${esc(cur.id)}" aria-label="Bỏ qua" title="Bỏ qua"><i class="ph ph-skip-forward"></i></button>
        <button class="btn btn--icon" data-act="other" data-id="${esc(cur.id)}" aria-label="Đang làm việc khác" title="Đang làm việc khác"><i class="ph ph-pencil-simple"></i></button>
      </div>`}
      ${next ? `<p class="now__next"><i class="ph ph-arrow-right"></i> <b>${esc(next.title)}</b> <span class="num">${hm(next.start)}</span></p>` : ""}
    </article>`;
  } else {
    const msg = next ? `Tiếp theo <b>${esc(next.title)}</b> lúc <span class="num">${hm(next.start)}</span>.` : now.getHours() >= 22 || now.getHours() < 5 ? "Hết lịch hôm nay. Ngủ ngon nhé." : "Không có lịch nào lúc này.";
    html += `<article class="now fade-in" style="${next ? catVars(next.cat) : ""}">
      <h2 class="now__title">${next ? "Thở một chút." : "Ngày đã khép lại."}</h2>
      <p class="now__time">${msg}</p>
    </article>`;
  }

  // Hàng nút nhẹ: "Mình dậy trễ" (có key, còn khối chưa xong) hoặc dòng "Đã sắp lại", rồi "Mình không khoẻ"
  const lateBtn = rec.late
    ? `<div class="late-state"><button class="late-state__main" id="btnLateRedo"${canLate() ? "" : " disabled"}><i class="ph ph-alarm"></i> Đã sắp lại từ <b class="num">${esc(rec.late.wake)}</b></button><button class="late-state__undo" id="btnLateUndo"><i class="ph ph-arrow-counter-clockwise"></i> Trả lại lịch cũ</button></div>`
    : canLate() && lateNeeded() ? `<button class="unwell-toggle unwell-toggle--late" id="btnLate"><i class="ph ph-alarm"></i> Mình dậy trễ</button>` : "";
  const toggles = lateBtn + (rec.unwell ? "" : `<button class="unwell-toggle" id="btnUnwell"><i class="ph-fill ph-hand-heart"></i> Mình không khoẻ</button>`);
  if (toggles) html += `<div class="day-toggles">${toggles}</div>`;

  // habits today: giữ thứ tự của HABITS (theo nhóm), không đổi chỗ khi đánh dấu. Chạm thẻ = đạt, nút ½ = tối thiểu.
  const t = startOfDay(new Date());
  // Rest day: thói quen chưa làm thành "rest" (không tính, không gãy chuỗi). Chỉ hiện những thói quen có bản tối thiểu
  // cho riêng ngày đó (restHabits); thói quen không có tối thiểu hoặc số lần/tuần thì ẩn, trừ khi đã đánh dấu.
  const restIds = new Set(restHabits(t).map(h => h.id));
  const list = HABITS.map(hb => ({ hb, st: cellStatus(hb, t) }))
    .filter(x => (t >= habStart(x.hb) && scheduled(x.hb, t)) || x.st === "full" || x.st === "min")
    .filter(x => x.st !== "rest" || restIds.has(x.hb.id));
  const left = list.filter(x => x.st === "pending" || x.st === "miss").length;
  const rested = list.some(x => x.st === "rest");
  const badge = left ? `còn ${left}` : rested ? '<i class="ph-fill ph-hand-heart"></i> rest day' : '<i class="ph-fill ph-check-circle ok-c"></i> xong';
  if (list.length) html += `<h2 class="h2">Thói quen hôm nay <small class="num">${badge}</small></h2>`;
  html += `<div class="chips">`;
  for (const { hb, st } of list) {
    const val = rec.v[hb.id];
    const sub = st === "full" ? (val ? `${val}${hb.id === "walk" ? " bước" : ""}` : "") : st === "min" ? (hb.min || "") : st === "rest" ? hb.min : "";
    const label = st === "full" ? "đạt" : st === "min" ? "đạt tối thiểu" : st === "rest" ? `rest day, tối thiểu ${hb.min}` : "chưa";
    html += `<div class="chip" data-st="${st}">
      <button class="chip__main" data-habit="${hb.id}" aria-pressed="${st === "full"}" aria-label="${esc(hb.name)}: ${label}">
        <i class="ph${st === "full" || st === "min" ? "-fill" : ""} ${hb.icon} chip__ic" style="${icVars(hb.cat)}"></i>
        <span class="chip__t">${esc(hb.name)}</span>${sub ? `<span class="chip__s">${esc(sub)}</span>` : ""}
      </button>
      ${hb.min ? `<button class="chip__half" data-habit-min="${hb.id}" aria-pressed="${st === "min"}" aria-label="Tối thiểu: ${esc(hb.min)}" title="Tối thiểu: ${esc(hb.min)}"><i class="ph${st === "min" ? "-fill" : ""} ph-circle-half"></i></button>` : `<span class="chip__half" aria-hidden="true"></span>`}
    </div>`;
  }
  html += `</div>`;

  // thời gian theo nhóm + timeline
  html += `<h2 class="h2">Thời gian hôm nay <span class="h2__acts">
      <button class="icon-btn" id="btnTpl" aria-label="Sửa tuần mẫu" title="Sửa tuần mẫu"><i class="ph ph-pencil-simple"></i></button>
      <button class="icon-btn" id="btnOpenCal" aria-label="Mở Google Calendar" title="Mở Google Calendar"><i class="ph ph-calendar-blank"></i></button>
    </span></h2>
    ${summaryHTML()}${timelineHTML()}`;
  const prev = v.querySelector(".tl__scroll"), keep = prev && prev.dataset.pos ? prev.scrollTop : null;
  v.innerHTML = html;
  const sc = v.querySelector(".tl__scroll"); if (!sc) return;
  if (keep != null) { sc.scrollTop = keep; sc.dataset.pos = "1"; }
  else requestAnimationFrame(() => {   // cuộn tới giờ hiện tại; khi tab đang ẩn (cao 0) thì để lần render sau
    if (!sc.clientHeight) return;
    sc.scrollTop = Math.max(0, +sc.dataset.now - sc.clientHeight * 0.35); sc.dataset.pos = "1";
  });
}

// Thời lượng: "45p", "2h", "2h20"
const fmtDur = m => { m = Math.round(m); return m < 60 ? `${m}p` : `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ""}`; };
function summaryHTML() {
  const now = new Date(), mins = {};
  for (const a of S.today.actual) { const m = (Math.min(+a.end, +now) - a.start) / 60000; if (m > 0) mins[a.cat] = (mins[a.cat] || 0) + m; }
  const rows = Object.entries(mins).filter(([k]) => CATS[k]).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return "";
  return `<div class="sum fade-in">
    <div class="sum__bar" aria-hidden="true">${rows.map(([k, m]) => `<span style="flex:${m};--cat:${CATS[k].hex}"></span>`).join("")}</div>
    <ul class="sum__list">${rows.map(([k, m]) => `<li class="${k === "scroll" ? "is-warn" : ""}" style="--cat:${CATS[k].hex}"><span class="dot"></span>${esc(CATS[k].short)}<b class="num">${fmtDur(m)}</b></li>`).join("")}</ul>
  </div>`;
}

const TL = { H0: 5, H1: 23, PX: 56 };
// Xếp các khối chồng nhau (theo vị trí vẽ, kể cả chiều cao tối thiểu) thành làn cạnh nhau.
// geo(it) → { top, bot } hoặc null nếu không vẽ. Trả Map id → { lane, n }.
function laneLayout(items, geo) {
  const out = new Map(); let cluster = [], ends = [], cEnd = -Infinity;
  const flush = () => { for (const [id, lane] of cluster) out.set(id, { lane, n: ends.length }); cluster = []; ends = []; };
  for (const it of [...items].sort((a, b) => a.start - b.start || b.end - a.end)) {
    const g = geo(it); if (!g) continue;
    if (g.top >= cEnd) { flush(); cEnd = -Infinity; }
    let lane = ends.findIndex(e => e <= g.top); if (lane < 0) { lane = ends.length; ends.push(0); }
    ends[lane] = g.bot; cEnd = Math.max(cEnd, g.bot); cluster.push([it.id, lane]);
  }
  flush(); return out;
}
// Khung chung của timeline (Hôm nay và Tuần mẫu): y(giờ) → px, vị trí một khối, cột giờ và vạch kẻ
function tlFrame(t0) {
  const { H0, H1, PX } = TL, PAD = 10, height = (H1 - H0) * PX;
  // dưới thêm khoảng trống: nhãn 23:00 và khối cuối ngày không dính sát mép thẻ
  const bodyPad = `padding:${PAD}px 0 ${PAD + 24}px`;
  const y = d => ((d - t0) / 3600000 - H0) * PX;
  const geo = it => {
    if (y(it.end) <= 0 || y(it.start) >= height) return null;
    const top = Math.max(0, y(it.start)), h = Math.max(22, Math.min(height, y(it.end)) - top - 2);
    return { top, h, bot: top + h + 2 };
  };
  let hours = "", grid = "";
  for (let h = H0; h <= H1; h++) { hours += `<div class="tl__hour num" style="top:${(h - H0) * PX}px">${pad(h)}:00</div>`; grid += `<div class="tl__grid" style="top:${(h - H0) * PX + PAD}px"></div>`; }
  return { PAD, bodyPad, height, y, geo, hours, grid };
}
const laneStyle = L => (L && L.n > 1 ? `left:${(L.lane * 100 / L.n).toFixed(3)}%;right:auto;width:calc(${(100 / L.n).toFixed(3)}% - 3px);` : "");
function timelineHTML() {
  const rec = S.today.rec || {}, t0 = startOfDay(new Date()), now = new Date();
  const { PAD, bodyPad, height, y, geo, hours, grid } = tlFrame(t0);
  const lanes = new Map([...laneLayout(S.today.plan, geo), ...laneLayout(S.today.actual, geo)]);
  const evHTML = it => {
    const g = geo(it); if (!g) return "";
    const { top, h } = g, c = CATS[it.cat] || CATS.life, lane = laneStyle(lanes.get(it.id));
    const time = h > 40 ? `<small class="num">${hm(it.start)}–${hm(it.end)}</small>` : "";
    const short = h <= 40 ? " is-short" : "", tt = `<span class="tl__t">${esc(it.title)}</span>`;
    if (it.kind === "plan") {
      const extra = ((rec.skip || []).includes(it.id) ? " is-skip" : "") + (it.muted || (rec.unwell && !it.ess) ? " is-muted" : "");
      return `<button class="tl__ev${extra}${short}" data-pid="${esc(it.id)}" style="top:${top}px;height:${h}px;${lane}--cat:${c.hex}" title="${esc(it.title)} ${hm(it.start)}–${hm(it.end)}" aria-label="Chi tiết: ${esc(it.title)} ${hm(it.start)}–${hm(it.end)}">${tt}${time}</button>`;
    }
    return `<button class="tl__ev${c.lightInk ? " light-ink" : ""}${short}" title="${esc(it.title)} ${hm(it.start)}–${hm(it.end)}" data-aid="${esc(it.id)}" style="top:${top}px;height:${h}px;${lane}--cat:${c.hex}" aria-label="Sửa: ${esc(it.title)} ${hm(it.start)}–${hm(it.end)}">${tt}${time}</button>`;
  };
  const nowY = y(now);
  const nowLine = nowY > 0 && nowY < height ? `<div class="tl__nowline" style="top:${nowY + PAD}px"></div>` : "";
  return `<div class="tl">
    <div class="tl__heads"><span></span><div class="tl__head">Kế hoạch</div><div class="tl__head">Thực tế</div></div>
    <div class="tl__scroll" data-now="${Math.max(0, Math.min(height, nowY)) + PAD}">
      <div class="tl__body" style="${bodyPad}">
        <div class="tl__hours" style="height:${height}px">${hours}</div>
        <div class="tl__col tl__col--plan" style="height:${height}px">${S.today.plan.map(evHTML).join("")}</div>
        <div class="tl__col tl__col--act" style="height:${height}px">${S.today.actual.map(evHTML).join("")}</div>
        ${grid}${nowLine}
      </div>
    </div>
  </div>`;
}

// y trên màn hình → phút trong ngày (chưa làm tròn), theo vị trí hiện tại của cột (đã tính phần cuộn)
const yToMin = (col, clientY) => TL.H0 * 60 + (clientY - col.getBoundingClientRect().top) / TL.PX * 60;

// ============================================================ kéo-thả trên timeline Hôm nay (giống Google Calendar)
// Cảm ứng: giữ yên HOLD ms rồi mới kéo, để vuốt dọc vẫn cuộn timeline. Chuột: kéo quá MSLOP px là bắt đầu.
// Kéo thân khối = dời giờ · bắt đầu ở mép dưới = đổi giờ kết thúc · kéo chỗ trống cột Kế hoạch = chọn khoảng rồi mở sheet Thêm.
// Bước 15 phút, kẹp trong TL.H0..TL.H1. Thả tay: Kế hoạch → updatePlan (chỉ hôm nay), Thực tế → updateActual, có hoàn tác.
const Drag = {
  HOLD: 350, SLOP: 8, MSLOP: 4, EDGE: 40, st: null, dropped: 0,
  minOf: d => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60,
  at(min) { const d = startOfDay(new Date()); d.setMinutes(Math.round(min)); return d; },
  down(e) {
    if (Drag.st || e.button !== 0 || !e.isPrimary) return;
    const col = e.target.closest(".tl:not(.tl--tpl) .tl__col"); if (!col) return;
    const ev = e.target.closest(".tl__ev"), touch = e.pointerType !== "mouse";
    let kind = "new", it = null, mode = "create";
    if (ev) {
      kind = ev.dataset.pid ? "plan" : "act";
      it = kind === "plan" ? S.today.plan.find(x => x.id === ev.dataset.pid) : S.today.actual.find(x => x.id === ev.dataset.aid);
      const t0 = startOfDay(new Date());
      // khối tràn ra ngoài khung 5:00–23:00 hoặc sang ngày khác thì chỉ bấm được, không kéo
      if (!it || startOfDay(it.start) - t0 || it.end - Drag.at(TL.H1 * 60) > 0 || Drag.minOf(it.start) < TL.H0 * 60) return;
      const r = ev.getBoundingClientRect(), zone = Math.min(touch ? 12 : 6, r.height / 4);
      mode = e.clientY > r.bottom - zone ? "resize" : "move";
    } else if (!col.classList.contains("tl__col--plan")) return;
    const s0 = it ? Drag.minOf(it.start) : 0, e0 = it ? Drag.minOf(it.end) : 0;
    Drag.st = { id: e.pointerId, col, sc: col.closest(".tl__scroll"), ev, kind, it, mode, touch, x0: e.clientX, y0: e.clientY, cy: e.clientY, m0: yToMin(col, e.clientY), s0, e0, s: s0, e: e0, lifted: false };
    if (touch) Drag.st.timer = setTimeout(Drag.lift, Drag.HOLD);
  },
  move(e) {
    const st = Drag.st; if (!st || e.pointerId !== st.id) return;
    st.cy = e.clientY;
    if (!st.lifted) {
      const d = Math.max(Math.abs(e.clientX - st.x0), Math.abs(e.clientY - st.y0));
      if (st.touch) { if (d > Drag.SLOP) Drag.clear(); return; }   // vuốt trước khi giữ đủ lâu = cuộn
      if (d <= Drag.MSLOP) return;
      Drag.lift();
    }
    e.preventDefault(); Drag.update();
  },
  lift() {
    const st = Drag.st; if (!st) return;
    st.lifted = true; clearTimeout(st.timer);
    if (st.touch) navigator.vibrate?.(10);
    try { st.col.setPointerCapture(st.id); } catch {}
    st.sc.classList.add("is-dragging");
    if (st.ev) st.ev.classList.add("is-lifted", st.mode === "resize" ? "is-resizing" : "is-moving");
    else { st.ghost = document.createElement("div"); st.ghost.className = "tl__ghost"; st.col.append(st.ghost); }
    st.label = document.createElement("div"); st.label.className = "tl__dragtime num"; st.col.append(st.label);
    const loop = () => {   // tự cuộn khi kéo gần mép trên / dưới
      if (Drag.st !== st) return;
      const r = st.sc.getBoundingClientRect(), v = st.cy < r.top + Drag.EDGE ? -1 : st.cy > r.bottom - Drag.EDGE ? 1 : 0;
      if (v) { const before = st.sc.scrollTop; st.sc.scrollTop += v * 8; if (st.sc.scrollTop !== before) Drag.update(); }
      st.raf = requestAnimationFrame(loop);
    };
    st.raf = requestAnimationFrame(loop);
    Drag.update();
  },
  // tính giờ mới theo chỗ ngón tay rồi vẽ lại đúng một phần tử (không render cả trang)
  update() {
    const st = Drag.st, H0 = TL.H0 * 60, H1 = TL.H1 * 60, q = m => Math.round(m / 15) * 15;
    const dm = yToMin(st.col, st.cy) - st.m0, still = Math.abs(dm) < 7.5;   // chưa kéo quá nửa bước: giữ giờ cũ (kể cả giờ lẻ)
    if (st.mode === "move") {
      const dur = st.e0 - st.s0;
      st.s = still ? st.s0 : Math.max(H0, Math.min(H1 - dur, q(st.s0 + dm))); st.e = st.s + dur;
    } else if (st.mode === "resize") {
      st.s = st.s0; st.e = still ? st.e0 : Math.max(st.s0 + 15, Math.min(H1, q(st.e0 + dm)));
    } else {
      const a = Math.floor(Math.max(H0, Math.min(H1 - 15, st.m0)) / 15) * 15;
      if (still) { st.s = a; st.e = a + 30; st.pick = false; }
      else { const b = Math.max(H0, Math.min(H1, st.m0 + dm)); st.s = Math.min(a, Math.floor(b / 15) * 15); st.e = Math.max(a + 15, Math.ceil(b / 15) * 15); st.pick = true; }
      st.e = Math.min(H1, st.e);
    }
    const top = (st.s - H0) / 60 * TL.PX, h = Math.max(22, (st.e - st.s) / 60 * TL.PX - 2), el = st.ev || st.ghost;
    el.style.top = top + "px"; el.style.height = h + "px";
    st.label.textContent = `${hm(Drag.at(st.s))}–${hm(Drag.at(st.e))}`;
    st.label.style.top = Math.max(0, top - 22) + "px";
  },
  clear() {
    const st = Drag.st; if (!st) return;
    clearTimeout(st.timer); cancelAnimationFrame(st.raf);
    st.sc.classList.remove("is-dragging"); st.ghost?.remove(); st.label?.remove();
    st.ev?.classList.remove("is-lifted", "is-moving", "is-resizing");
    Drag.st = null; return st;
  },
  cancel() { const st = Drag.clear(); if (st?.lifted) renderToday(); },
  async up(e) {
    const st = Drag.st; if (!st || e.pointerId !== st.id) return;
    if (!st.lifted) return Drag.clear();   // chạm nhanh: để click mở sheet như cũ
    Drag.clear(); Drag.dropped = Date.now();
    const s = Drag.at(st.s), en = Drag.at(st.e);
    if (st.kind === "new") return st.pick ? renderPlanAdd(s, en) : renderPlanAdd(s);
    if (st.s === st.s0 && st.e === st.e0) return renderToday();
    st.ev.classList.add("is-saving");
    const msg = st.mode === "move" ? `Đã dời sang ${hm(s)}–${hm(en)}` : `Đã đổi thành ${hm(s)}–${hm(en)}`;
    try { await (st.kind === "plan" ? applyPlanTime(st.it, { start: s, end: en }, msg) : applyActTime(st.it, { start: s, end: en }, msg)); }
    catch (er) { handleErr(er); }
    renderToday();
  },
};
document.addEventListener("pointerdown", Drag.down);
document.addEventListener("pointermove", Drag.move, { passive: false });
document.addEventListener("pointerup", Drag.up);
document.addEventListener("pointercancel", e => { if (Drag.st && e.pointerId === Drag.st.id) Drag.cancel(); });
// đã nhấc khối thì chặn cuộn của trình duyệt (touch-action đặt sau pointerdown không có tác dụng với cú chạm đang diễn ra)
document.addEventListener("touchmove", e => { if (Drag.st?.lifted) e.preventDefault(); }, { passive: false });
document.addEventListener("contextmenu", e => { if (Drag.st) e.preventDefault(); });

// ============================================================ cổng vào: Đăng nhập → Gemini → Lịch
// Mỗi lúc chỉ một việc, full màn hình: ẩn header, tab, nút bút. Demo bỏ qua cổng (không cần Google).
function gateStep() {
  if (S.settings.demo) return null;
  if (!signedIn()) return "login";
  if (!S.settings.geminiKey && !S.settings.keyLater) return "key";
  if (!S.cfg) return "cal";
  return null;
}
const gateErr = msg => `<p class="gate__err" id="gateErr" role="alert"${msg ? "" : " hidden"}>${msg ? `<i class="ph ph-warning-circle"></i> ${esc(msg)}` : ""}</p>`;
function showGateErr(msg) { const el = $("#gateErr"); if (!el) return toast(msg); el.hidden = false; el.innerHTML = `<i class="ph ph-warning-circle"></i> ${esc(msg)}`; }
function renderGate(step) {
  const g = $("#gate");
  const html = {
    login: `<h1 class="gate__brand">Still life</h1>
      <p class="gate__lead">${S.cfg ? "Phiên Google đã hết. Đăng nhập lại để tiếp tục." : "Đăng nhập Google để bắt đầu."}</p>
      <button class="btn btn--primary btn--block" id="gLogin"><i class="ph ph-google-logo"></i> Đăng nhập Google</button>`,
    key: `<h1 class="gate__title">Kết nối Gemini</h1>
      <p class="gate__lead">Để gõ một câu là app tự hiểu bạn vừa làm gì.</p>
      <label class="field"><span>Gemini API key</span><input id="gKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="AIza…">
        <small>Lấy miễn phí ở <a class="link" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a></small></label>
      <label class="field"><span>Model</span><select id="sModel">${modelOptions()}</select></label>
      <button class="btn btn--primary btn--block" id="gKeySave">Kết nối</button>`,
    cal: `<h1 class="gate__title">Lịch của bạn</h1>
      <p class="gate__lead">Chưa có lịch Still life trên Google của bạn.</p>
      <button class="btn btn--primary btn--block" id="gSetup">Bắt đầu tạo lịch</button>
      <button class="btn btn--block" id="gDemo" style="margin-top:8px">Xem lịch mẫu</button>
      <p class="gate__step" id="gStep" hidden></p>`,
  }[step];
  g.innerHTML = `<div class="gate__card fade-in" data-step="${step}">${html}${gateErr("")}
    ${step === "key" ? `<button class="gate__later" id="gKeyLater" type="button">Để sau</button>` : ""}</div>`;
  g.hidden = false; document.body.classList.add("is-gated");
}
function hideGate() { const g = $("#gate"); g.hidden = true; g.innerHTML = ""; document.body.classList.remove("is-gated"); }
// Bước 1: đăng nhập. Máy chưa có cấu hình thì tìm ngay trên Drive (lấy luôn key nếu đã lưu ở máy khác).
async function gateLogin(btn) {
  const done = busy(btn, "Đang đăng nhập");
  try {
    await signIn(!S.cfg);
    if (!S.cfg) { const found = await Google.findConfig(); if (found) adoptCfg(found); }
  } catch (e) { done(); return showGateErr(e.message || "Đăng nhập lỗi"); }
  return refresh();
}
// Bước 2: thử key với Gemini rồi mới lưu. Lỗi thì giữ nguyên màn để sửa.
async function gateKey(btn) {
  const key = cleanKey($("#gKey").value);
  if (!key) return showGateErr("Dán key vào trước nhé");
  const done = busy(btn, "Đang kết nối Gemini");
  try { await testKey(key); } catch (e) { done(); return showGateErr(e.message); }
  S.settings.geminiKey = key; S.settings.model = $("#sModel").value; saveSettings(); syncKey(key);
  toast("Đã kết nối Gemini");
  return refresh();
}
// Bước 3: tạo 2 lịch + thư mục Drive. Hiện từng việc đang làm dưới nút.
async function gateSetup(btn) {
  const done = busy(btn, "Đang tạo lịch"), st = $("#gStep");
  $("#gDemo").disabled = true;
  try {
    S.cfg = await Google.setup(m => { if (st) { st.hidden = false; st.textContent = m; } });
    LS.set("cfg", S.cfg);
  } catch (e) { done(); $("#gDemo").disabled = false; if (st) st.hidden = true; return showGateErr(e.message); }
  toast("Xong! Lịch đã có trên Google Calendar");
  return refresh();
}

// ============================================================ render: habits
const editable = d => d <= startOfDay(new Date()) && d >= trackStart();
function habitDay(hb, d, cls = "") {
  const st = cellStatus(hb, d), label = `${esc(hb.name)} ${DOW_SHORT[d.getDay()]} ${dmy(d)}`;
  return editable(d)
    ? `<button class="mcal__d ${cls}" data-st="${st}" data-day="${ymd(d)}" aria-label="${label}">${d.getDate()}</button>`
    : `<span class="mcal__d ${cls}" data-st="${st}">${d.getDate()}</span>`;
}
function renderHabits() {
  const v = $("#view-habits");
  if (!ready()) { v.innerHTML = `<div class="empty"><h2>Chưa có dữ liệu</h2><p>Kết nối Google ở tab Hôm nay trước nhé.</p></div>`; return; }
  if (S.habManage) return renderHabManage();
  const t = startOfDay(new Date()), mode = S.habView === "month" ? "month" : "week";
  let html = `<div class="htop"><div class="vtoggle" role="tablist" aria-label="Chế độ xem">
      <button role="tab" data-hview="week" aria-selected="${mode === "week"}">Tuần</button>
      <button role="tab" data-hview="month" aria-selected="${mode === "month"}">Tháng</button>
    </div><button class="icon-btn htop__manage" id="hManage" aria-label="Quản lý thói quen" title="Quản lý thói quen"><i class="ph ph-sliders-horizontal"></i></button></div>`;
  if (!HABITS.length) {
    v.innerHTML = html + `<div class="empty"><h2>Chưa có thói quen nào</h2><p>Thêm một thói quen nhỏ để bắt đầu.</p>
      <button class="btn btn--primary" id="hAdd"><i class="ph ph-plus"></i> Thêm thói quen</button></div>`;
    return;
  }
  const nav = (key, prev, next, title, sub) => `<div class="hnav">
      <button class="icon-btn" data-${key}="-1" aria-label="Trước" ${prev ? "" : "disabled"}><i class="ph ph-caret-left"></i></button>
      <div class="hnav__t"><b>${title}</b><small class="num">${sub}</small></div>
      <button class="icon-btn" data-${key}="1" aria-label="Sau" ${next ? "" : "disabled"}><i class="ph ph-caret-right"></i></button>
    </div>`;
  const legend = `<div class="legend"><span><i class="sdot" data-st="full"></i>Đạt</span><span><i class="sdot" data-st="min"></i>Tối thiểu</span><span><i class="sdot" data-st="rest"></i>Rest</span><span><i class="sdot" data-st="miss"></i>Bỏ</span></div>`;

  if (mode === "week") {
    const mon = S.habWeek ? parseYmd(S.habWeek) : mondayOf(t), sun = addDays(mon, 6), cur = mondayOf(t);
    const ago = Math.round((cur - mon) / (7 * 864e5));
    html += nav("week", mon > mondayOf(trackStart()), mon < cur, ago === 0 ? "Tuần này" : ago === 1 ? "Tuần trước" : `${ago} tuần trước`, `${dmy(mon)} – ${dmy(sun)}`);
    html += `${legend}<div class="week fade-in"><div class="wgrid wgrid--head"><span></span>`;
    for (let i = 0; i < 7; i++) {
      const d = addDays(mon, i);
      html += editable(d)
        ? `<button class="wday ${+d === +t ? "is-today" : ""}" data-day="${ymd(d)}" aria-label="Sửa thói quen ${DOW[d.getDay()]} ${dmy(d)}">${DOW_SHORT[d.getDay()]}</button>`
        : `<span class="wday ${+d === +t ? "is-today" : ""}">${DOW_SHORT[d.getDay()]}</span>`;
    }
    html += `</div>`;
    for (const hb of HABITS) {
      const wc = weekCount(hb, mon);
      html += `<div class="wgrid"><div class="wname" style="${icVars(hb.cat)}"><span>${esc(hb.name)}</span><small><i class="ph ${hb.icon}"></i><b class="num">${wc.label}</b></small></div>`;
      for (let i = 0; i < 7; i++) html += habitDay(hb, addDays(mon, i));
      html += `</div>`;
    }
    html += `</div>`;
    v.innerHTML = html; return;
  }

  // Theo tháng: mỗi thói quen 1 thẻ, hàng = tuần, ô ghi số ngày.
  const cm = S.calMonth || (S.calMonth = { y: t.getFullYear(), m: t.getMonth() });
  const mStart = new Date(cm.y, cm.m, 1), mEnd = new Date(cm.y, cm.m + 1, 0);
  const first = mondayOf(mStart), W = Math.ceil((addDays(mEnd, 1) - first) / (7 * 864e5));
  html += nav("month", mStart > trackStart(), mEnd < t, `Tháng ${cm.m + 1}`, cm.y);   // không chú thích màu: ô ngày đã đủ rõ, chú thích chỉ ở Tuần
  for (const hb of HABITS) {
    const s = streak(hb);
    const n = { full: 0, min: 0, miss: 0 };
    let rows = `<div class="mcal__row mcal__row--head">${[1, 2, 3, 4, 5, 6, 0].map(k => `<span>${DOW_SHORT[k]}</span>`).join("")}</div>`;
    for (let w = 0; w < W; w++) {
      rows += `<div class="mcal__row">`;
      for (let i = 0; i < 7; i++) {
        const d = addDays(first, w * 7 + i);
        if (d.getMonth() !== cm.m) { rows += `<span class="mcal__d mcal__d--out"></span>`; continue; }
        const st = cellStatus(hb, d);
        if (st in n) n[st]++;
        rows += habitDay(hb, d);
      }
      rows += `</div>`;
    }
    const streakTxt = `<i class="ph${s.n > 0 ? "-fill" : ""} ph-fire"></i> ${s.n}`;
    html += `<article class="hcard fade-in">
      <div class="hcard__head"><i class="ph ${hb.icon} big" style="${icVars(hb.cat)}"></i>
        <div class="hcard__name">${esc(hb.name)}</div>
        <div class="streak2 ${s.n > 0 ? "is-on" : ""}" aria-label="${s.n} ${s.unit} liên tiếp">${streakTxt}</div>
      </div>
      <p class="hcard__stats"><span><i class="sdot" data-st="full"></i>${n.full} đạt</span>${hb.min ? `<span><i class="sdot" data-st="min"></i>${n.min} tối thiểu</span>` : ""}<span><i class="sdot" data-st="miss"></i>${n.miss} bỏ</span></p>
      <div class="mcal">${rows}</div>
    </article>`;
  }
  v.innerHTML = html;
}

// ============================================================ quản lý thói quen
// Dòng phụ ở danh sách: lịch hôm nay, lịch đã hẹn đổi, ngày bắt đầu nếu ở tương lai
const dm = ds => { const d = parseYmd(ds); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
function schedNote(h) {
  const t = todayStr(), pf = pendingFrom(h);
  if (h.since && h.since > t) return `Bắt đầu ${dm(h.since)} · ${freqLabel(h)}`;
  return freqLabel(sch(h, t)) + (pf ? ` · từ ${dm(pf)}: ${freqLabel(h)}` : h.min ? ` · tối thiểu ${h.min}` : "");
}
// Trang con trong tab Thói quen: thứ tự, thêm, sửa, ngừng theo dõi, xoá hẳn.
function renderHabManage() {
  const v = $("#view-habits"), off = ALLH.filter(h => h.off);
  const row = (h, i, n) => `<li class="mrow${h.off ? " is-off" : ""}">
      <button class="mrow__main" data-hedit="${esc(h.id)}" aria-label="Sửa ${esc(h.name)}">
        <i class="ph ${esc(h.icon)} mrow__ic" style="${icVars(h.cat)}"></i>
        <span class="mrow__txt"><b>${esc(h.name)}</b><small>${esc(schedNote(h))}</small></span>
      </button>
      ${h.off ? "" : `<button class="icon-btn mrow__mv" data-hmove="${esc(h.id)}" data-dir="-1" aria-label="Lên trên" ${i === 0 ? "disabled" : ""}><i class="ph ph-arrow-up"></i></button>
      <button class="icon-btn mrow__mv" data-hmove="${esc(h.id)}" data-dir="1" aria-label="Xuống dưới" ${i === n - 1 ? "disabled" : ""}><i class="ph ph-arrow-down"></i></button>`}
    </li>`;
  let html = `<div class="mhead">
      <button class="icon-btn" id="hBack" aria-label="Quay lại Thói quen"><i class="ph ph-arrow-left"></i></button>
      <h2>Quản lý thói quen</h2>
    </div>
    <p class="muted mnote">Hôm nay và bảng Tuần xếp theo nhóm, trong nhóm theo thứ tự ở đây. Ít mà đều vẫn hơn nhiều mà bỏ.</p>`;
  if (!HABITS.length) html += `<p class="muted">Chưa theo dõi thói quen nào.</p>`;
  for (const [k, c] of Object.entries(CATS)) {
    const g = HABITS.filter(h => h.cat === k); if (!g.length) continue;
    html += `<p class="mgroup" style="${catVars(k)}"><span class="dot"></span>${esc(c.name)}</p><ul class="mlist fade-in">${g.map((h, i) => row(h, i, g.length)).join("")}</ul>`;
  }
  html += `<button class="btn btn--block madd" id="hAdd"><i class="ph ph-plus"></i> Thêm thói quen</button>`;
  if (off.length) html += `<h2 class="h2">Đã ngừng <small>${off.length}</small></h2>
    <ul class="mlist mlist--off">${off.map(h => row(h, 0, 0)).join("")}</ul>
    <p class="faint mnote">Thói quen đã ngừng không hiện ở Hôm nay, không tính chuỗi. Dữ liệu cũ vẫn giữ.</p>`;
  v.innerHTML = html;
}
const HICONS = ["ph-check-circle", "ph-bowl-food", "ph-drop", "ph-coffee", "ph-sun-horizon", "ph-bed", "ph-moon-stars", "ph-sneaker-move",
  "ph-person-simple-run", "ph-person-simple-tai-chi", "ph-barbell", "ph-bicycle", "ph-flower-lotus", "ph-heart", "ph-pill", "ph-tooth",
  "ph-translate", "ph-book-open", "ph-brain", "ph-code", "ph-pencil-line", "ph-notebook", "ph-music-notes", "ph-device-mobile-slash",
  "ph-broom", "ph-plant", "ph-wallet", "ph-users-three"];
const HFREQ_HINT = { daily: "Mỗi ngày đều tính.", days: "Chỉ những ngày này mới tính. Ngày khác không làm cũng không sao.", weekly: "Đủ số lần trong tuần là đạt, ngày nào cũng được. Chọn ngày thì thói quen chỉ hiện ở Hôm nay vào những ngày đó." };
// Sheet thêm / sửa một thói quen. id = null là thêm mới.
function renderHabForm(id) {
  const h = id ? H[id] : { name: "", cat: "health", icon: "ph-check-circle", freq: "daily", days: [], perWeekFull: 3, perWeekMin: 1, full: "", min: "" };
  if (!h) return;
  S.habEdit = id;
  const days = h.days || [], freq = h.freq, icons = [h.icon, ...HICONS.filter(x => x !== h.icon)]; // icon đang chọn đứng đầu hàng cuộn ngang
  const t = todayStr(), fromVal = id ? pendingFrom(h) || t : h.since && h.since > t ? h.since : t;
  const fromField = `<input id="hFrom" class="input num" type="date" value="${fromVal}" min="${t}">`;
  const nOpts = (sel, from) => Array.from({ length: 8 - from }, (_, k) => k + from).map(n => `<option value="${n}" ${n === sel ? "selected" : ""}>${n || "Không có"}</option>`).join("");
  openSheet(id ? "Sửa thói quen" : "Thêm thói quen", `<div id="hForm" data-freq="${freq}">
    ${id ? (h.off ? `<div class="mdanger"><button class="btn btn--block" id="hResume" type="button"><i class="ph ph-play"></i> Theo dõi lại</button>
        <button class="btn btn--ghost btn--block" id="hDelete" type="button"><i class="ph ph-trash"></i> Xoá hẳn</button></div>`
      : `<div class="mdanger"><button class="btn btn--ghost btn--block" id="hStop" type="button"><i class="ph ph-pause"></i> Ngừng theo dõi</button></div>`) : ""}
    ${cleanKey(S.settings.geminiKey) ? `<div class="hai"><button class="btn btn--block hai__go" id="hAiGo" type="button"><i class="ph ph-sparkle"></i> Nhờ AI ${id ? "sửa" : "điền"}</button>
      <p class="hai__note" id="hAiNote" role="status" hidden></p></div>` : ""}
    <label class="field"><span>Tên</span><input id="hName" type="text" value="${esc(h.name)}" placeholder="vd Uống 2 lít nước" maxlength="${NAME_MAX}"></label>
    <label class="field"><span>Nhóm</span><select id="hCat">${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === h.cat ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
    <div class="field"><span>Biểu tượng</span><div class="iconpick" role="radiogroup" aria-label="Biểu tượng">
      ${icons.map(ic => `<button type="button" role="radio" data-hicon="${esc(ic)}" aria-checked="${ic === h.icon}" aria-label="${esc(ic.replace(/^ph-/, ""))}"><i class="ph ${esc(ic)}"></i></button>`).join("")}
    </div></div>
    <div class="field"><span>Lịch</span><div class="vtoggle vtoggle--3" role="radiogroup" aria-label="Lịch">
      ${[["daily", "Mỗi ngày"], ["days", "Ngày cố định"], ["weekly", "Số lần/tuần"]].map(([k, l]) => `<button type="button" role="radio" data-hfreq="${k}" aria-selected="${k === freq}" aria-checked="${k === freq}">${l}</button>`).join("")}
    </div><small id="hFreqHint">${HFREQ_HINT[freq]}</small></div>
    <div class="field hf-days"><span class="hf-days__t">${freq === "weekly" ? "Ngày gợi ý (không bắt buộc)" : "Những ngày"}</span><div class="daypick" role="group" aria-label="Ngày trong tuần">
      ${[1, 2, 3, 4, 5, 6, 0].map(k => `<button type="button" data-hday="${k}" aria-pressed="${days.includes(k) && !(freq === "weekly" && days.length === 7)}">${DOW_SHORT[k]}</button>`).join("")}
    </div></div>
    <div class="hf-week"><label class="field"><span>Mục tiêu mỗi tuần</span><select id="hPerFull">${nOpts(h.perWeekFull || 3, 1)}</select></label>
      <label class="field"><span>Tối thiểu mỗi tuần</span><select id="hPerMin">${nOpts(h.perWeekMin ?? 1, 0)}</select></label></div>
    <label class="field"><span>${id ? "Lịch này áp dụng từ" : "Bắt đầu theo dõi từ"}</span>${fromField}
      <small>${id ? "Những ngày trước vẫn tính theo lịch cũ, kết quả cũ không đổi." : "Những ngày trước ngày này không tính."}</small></label>
    ${id ? `<p class="hblocks" id="hBlocks"><i class="ph ph-bell"></i><span>${S.tplList ? esc(habBlocksText(id)) : "Đang xem lịch nhắc…"}</span></p>` : ""}
    <label class="field"><span>Thế nào là đạt</span><textarea id="hFull" rows="2" placeholder="vd 2 lít, tính cả trà, không tính cà phê" maxlength="300">${esc(h.full || "")}</textarea><small>Gemini đọc ô này và ô Tối thiểu để biết câu bạn kể có tính là đạt không.</small></label>
    <label class="field hf-min"><span>Tối thiểu</span><input id="hMin" type="text" value="${esc(h.min || "")}" placeholder="vd 1 lít" maxlength="60"><small>Ngày mệt làm bản nhỏ này vẫn giữ chuỗi. Để trống nếu không có.</small></label>
    <p class="act__warn" id="hErr" hidden></p>
    </div>
    <div class="sheet-actions"><button class="btn" data-close>Hủy</button><button class="btn btn--primary" id="hSave"><i class="ph ph-check"></i> Lưu</button></div>`);
  if (!id) setTimeout(() => $("#hName") && $("#hName").focus(), 50);
  else fillHabBlocks(id);
}
function setHabFreq(f) {
  const box = $("#hForm"); if (!box) return;
  box.dataset.freq = f;
  $$("[data-hfreq]", box).forEach(b => { b.setAttribute("aria-selected", b.dataset.hfreq === f); b.setAttribute("aria-checked", b.dataset.hfreq === f); });
  $("#hFreqHint").textContent = HFREQ_HINT[f];
  $(".hf-days__t", box).textContent = f === "weekly" ? "Ngày gợi ý (không bắt buộc)" : "Những ngày";
}
// ---- Nhờ AI điền / sửa form thói quen. AI chỉ điền form, người dùng xem lại rồi tự bấm Lưu.
// Các ô đang có trên form (chưa kiểm tra), để AI sửa tiếp từ đó
function habFormRaw() {
  const box = $("#hForm"), f = box.dataset.freq, ic = $("[data-hicon][aria-checked=true]", box);
  const o = { name: $("#hName").value.trim(), cat: $("#hCat").value, icon: ic ? ic.dataset.hicon : "ph-check-circle", freq: f,
    days: $$("[data-hday]", box).filter(b => b.getAttribute("aria-pressed") === "true").map(b => +b.dataset.hday), full: $("#hFull").value.trim(), min: $("#hMin").value.trim() };
  if (f === "weekly") { o.perWeekFull = +$("#hPerFull").value; o.perWeekMin = +$("#hPerMin").value; delete o.min; }
  return o;
}
const HAI_CATS = () => Object.keys(CATS).filter(k => k !== "scroll");   // "Lướt vô thức" không phải thói quen để xây
function habAiSchema() {
  return {
    type: "OBJECT",
    properties: {
      name: { type: "STRING", description: `tên ngắn gọn, tối đa ${NAME_MAX} ký tự, viết hoa chữ đầu` },
      cat: { type: "STRING", enum: HAI_CATS() },
      icon: { type: "STRING", enum: HICONS },
      freq: { type: "STRING", enum: ["daily", "days", "weekly"] },
      days: { type: "ARRAY", items: { type: "INTEGER" }, description: "0 = Chủ nhật, 1 = Thứ Hai … 6 = Thứ Bảy" },
      perWeekFull: { type: "INTEGER", description: "chỉ khi weekly: số lần mỗi tuần để đạt, 1..7" },
      perWeekMin: { type: "INTEGER", description: "chỉ khi weekly: số lần tối thiểu mỗi tuần, 0..perWeekFull" },
      full: { type: "STRING", description: "thế nào là đạt, 1 câu cụ thể, đo được" },
      min: { type: "STRING", description: "bản tối thiểu rất nhỏ, tối đa 60 ký tự; chuỗi rỗng nếu không có" },
      reply: { type: "STRING", description: "1 câu tiếng Việt ngắn, ấm áp: đã điền / đã đổi gì" },
    },
    required: ["name", "cat", "icon", "freq", "full", "reply"],
  };
}
function habAiPrompt(text, cur) {
  return `Bạn giúp người dùng app "Still life" (Atomic Habits) ${cur ? "SỬA một thói quen" : "TẠO một thói quen mới"} từ lời họ kể. Trả JSON đủ các ô của form.
Nhóm: ${HAI_CATS().map(k => `${k} = ${CATS[k].name}`).join(" · ")}.
Lịch (freq):
- daily: mỗi ngày đều tính. Không cần days.
- days: chỉ những ngày cố định trong tuần (vd thứ 2, 4, 6 → days [1,3,5]).
- weekly: đủ perWeekFull lần trong tuần là đạt, ngày nào cũng được. days = ngày gợi ý nếu họ nói, không thì để trống. perWeekMin = số lần tối thiểu (không nói thì 1).
Ngày: 0 = Chủ nhật, 1 = Thứ Hai, 2 = Thứ Ba, 3 = Thứ Tư, 4 = Thứ Năm, 5 = Thứ Sáu, 6 = Thứ Bảy.
full ("Thế nào là đạt"): tiêu chí cụ thể để AI khác đọc câu kể hằng ngày mà biết có đạt không (vd "uống đủ 2 lít, tính cả trà, không tính cà phê"). Có con số (bước, phút, trang) thì nêu rõ.
min ("Tối thiểu"): bản thật nhỏ cho ngày mệt để vẫn giữ chuỗi (vd "1 lít", "5 phút"). Họ không nói thì tự gợi ý một bản nhỏ hợp lý. Với weekly để trống.
Thói quen nên bắt đầu nhỏ, dễ làm. Không phán xét. Viết tiếng Việt.
${cur ? `Thói quen hiện tại (JSON):\n${JSON.stringify(cur)}\nChỉ đổi những gì người dùng yêu cầu, các ô khác giữ nguyên y như cũ.\n` : ""}
Lời người dùng:
"""${text}"""`;
}
// Đổ kết quả AI vào form; ô nào đổi thì nháy nhẹ để người dùng thấy. Không đụng ô ngày áp dụng.
function fillHabForm(a) {
  const box = $("#hForm"); if (!box) return;
  const cur = habFormRaw(), mark = el => { const f = el && el.closest(".field"); if (f) { f.classList.remove("is-ai"); void f.offsetWidth; f.classList.add("is-ai"); } };
  const set = (sel, v) => { const el = $(sel); if (el && v != null && String(v) !== el.value) { el.value = String(v); mark(el); } };
  const txt = (v, n) => (v == null ? null : String(v).trim().slice(0, n));
  set("#hName", txt(a.name, NAME_MAX) || null);
  if (HAI_CATS().includes(a.cat)) set("#hCat", a.cat);
  if (HICONS.includes(a.icon) && a.icon !== cur.icon) {
    const pick = $(".iconpick", box);
    pick.innerHTML = [a.icon, ...HICONS.filter(x => x !== a.icon)].map(ic => `<button type="button" role="radio" data-hicon="${esc(ic)}" aria-checked="${ic === a.icon}" aria-label="${esc(ic.replace(/^ph-/, ""))}"><i class="ph ${esc(ic)}"></i></button>`).join("");
    pick.scrollLeft = 0; mark(pick);
  }
  const f = ["daily", "days", "weekly"].includes(a.freq) ? a.freq : cur.freq;
  let days = [...new Set((a.days || []).map(Number).filter(n => n >= 0 && n <= 6))].sort();
  if (f === "days" && !days.length) days = cur.days;
  if (f === "weekly" && days.length === 7) days = [];
  if (f !== cur.freq) { setHabFreq(f); mark($(".vtoggle", box)); }
  if (f !== "daily" && days.join() !== [...cur.days].sort().join()) {
    $$("[data-hday]", box).forEach(b => b.setAttribute("aria-pressed", days.includes(+b.dataset.hday)));
    mark($(".daypick", box));
  }
  if (f === "weekly") {
    const pf = Math.min(7, Math.max(1, +a.perWeekFull || cur.perWeekFull || 3));
    set("#hPerFull", pf); set("#hPerMin", Math.min(pf, Math.max(0, a.perWeekMin != null ? +a.perWeekMin : cur.perWeekMin ?? 1)));
  }
  set("#hFull", txt(a.full, 300));
  if (f !== "weekly") set("#hMin", txt(a.min, 60));
}
// Chỉ hiện khi có Gemini key. Nút "Nhờ AI" mở popup nhập ở dưới (dùng lại #dock của Hôm nay, có cả micro), nằm trên sheet form.
// Chữ đang gõ dở ở ô Hôm nay được cất đi và trả lại khi đóng popup.
function openHabAi() {
  const t = $("#inputText");
  S.compose = { mode: "habit", text: t.value, ph: t.placeholder };
  t.value = "";
  $("#dock").classList.add("is-habit");
  $("#dockTitle").textContent = S.habEdit ? "Nhờ AI sửa thói quen" : "Nhờ AI điền thói quen";
  openCompose(S.habEdit ? "Muốn đổi gì? vd đổi thành 3 buổi mỗi tuần, tối thiểu 1 buổi"
    : "Kể thói quen bằng lời của bạn. vd uống 2 lít nước mỗi ngày, ngày mệt thì 1 lít cũng được");
}
const habAiOpen = () => !!(S.compose && S.compose.mode === "habit");
// Đóng popup của chế độ riêng (Nhờ AI thói quen): trả lại chữ đang gõ dở ở ô Hôm nay
function endHabAi() {
  if (!S.compose) return;
  const t = $("#inputText");
  t.value = S.compose.text; t.placeholder = S.compose.ph; S.compose = null;
  $("#dock").classList.remove("is-habit"); autosize();
}
const dockSend = text => (habAiOpen() ? habAi(text) : submitInput(text));
async function habAi(text) {
  text = text.trim(); if (!text) return $("#inputText").focus();
  const dock = $("#dock"), ic = $("#btnSend i");
  dock.classList.add("is-busy"); ic.className = "ph ph-circle-notch";
  try {
    const cur = S.habEdit || habFormRaw().name ? habFormRaw() : null;   // form đã có chữ thì AI sửa tiếp, không làm lại từ đầu
    const a = (await geminiJSON(habAiPrompt(text, cur), habAiSchema(), 0.3)).p;
    closeCompose();
    fillHabForm(a);
    const note = $("#hAiNote");
    note.innerHTML = `<i class="ph-fill ph-check-circle"></i> <span>${esc(a.reply || "Đã điền.")} Xem lại rồi bấm Lưu.</span>`;
    note.hidden = false;
  } catch (e) { handleErr(e); }   // lỗi thì giữ popup và chữ để thử lại
  finally { dock.classList.remove("is-busy"); ic.className = "ph ph-paper-plane-tilt"; }
}
// Đọc form → thói quen, hoặc { err } nếu thiếu
function readHabForm() {
  const box = $("#hForm"), f = box.dataset.freq, old = S.habEdit ? H[S.habEdit] : null;
  const name = $("#hName").value.trim();
  if (!name) return { err: "Đặt tên cho thói quen nhé.", el: "#hName" };
  const days = $$("[data-hday]", box).filter(b => b.getAttribute("aria-pressed") === "true").map(b => +b.dataset.hday);
  if (f === "days" && !days.length) return { err: "Chọn ít nhất một ngày.", el: "[data-hday]" };
  const from = $("#hFrom").value || todayStr();
  if (from < todayStr()) return { err: "Chỉ chọn từ hôm nay trở đi.", el: "#hFrom" };
  const ic = $("[data-hicon][aria-checked=true]", box);
  const h = Object.assign({}, old || { id: "h" + Date.now().toString(36), since: from }, {
    name, cat: $("#hCat").value, icon: ic ? ic.dataset.hicon : "ph-check-circle", freq: f,
    full: $("#hFull").value.trim(), min: $("#hMin").value.trim(),
  });
  if (f === "daily") { delete h.days; delete h.perWeekFull; delete h.perWeekMin; }
  if (f === "days") { h.days = days; delete h.perWeekFull; delete h.perWeekMin; }
  if (f === "weekly") {
    h.days = days.length ? days : [...ALL];
    h.perWeekFull = +$("#hPerFull").value; h.perWeekMin = Math.min(+$("#hPerMin").value, h.perWeekFull);
    h.min = h.perWeekMin ? `${h.perWeekMin} lần/tuần` : "";
  }
  if (!old) return { h: normHabit(h) };
  // Thói quen đã có: lịch mới áp dụng từ ngày đã chọn, lịch cũ giữ cho những ngày trước
  return { h: applySched(Object.assign({}, h, pickSched(old), { prev: old.prev }), pickSched(h), from) };
}
// Lưu cả danh sách: trong máy trước (hiện ngay), rồi ghi lên Drive
async function saveHabits(list) {
  useHabits(list);
  LS.set(habKey(), ALLH);
  if (!S.settings.demo && S.cfg && S.cfg.configFileId && signedIn()) await Google.pushHabits(ALLH);
}
// Hiện ngay (danh sách trong máy đổi trước khi chờ Drive), toast có Hoàn tác
async function habChange(list, msg) {
  const prev = ALLH.map(h => Object.assign({}, h));
  const saving = saveHabits(list);
  if (!$("#sheet").hidden) closeSheet();
  render();
  if (msg) toast(msg, 2600, async () => { await saveHabits(prev); render(); });
  try { await saving; } catch (er) { handleErr(er); }
}
async function saveHabForm() {
  const r = readHabForm(), err = $("#hErr");
  if (r.err) { err.innerHTML = `<i class="ph ph-warning"></i> ${esc(r.err)}`; err.hidden = false; const el = $(r.el); if (el) el.focus(); return false; }
  const exists = ALLH.some(h => h.id === r.h.id);
  await habChange(exists ? ALLH.map(h => (h.id === r.h.id ? r.h : h)) : [...ALLH, r.h], exists ? "Đã lưu thói quen" : `Đã thêm: ${r.h.name}`);
  return true;
}
// Đổi chỗ với thói quen đang theo dõi kề bên (bỏ qua thói quen đã ngừng)
// Đổi chỗ với thói quen kề bên trong cùng nhóm (bỏ qua thói quen đã ngừng)
function moveHabit(id, dir) {
  const cat = H[id] && H[id].cat, act = HABITS.filter(h => h.cat === cat).map(h => h.id), i = act.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= act.length) return;
  const list = ALLH.slice(), a = list.findIndex(h => h.id === id), b = list.findIndex(h => h.id === act[j]);
  [list[a], list[b]] = [list[b], list[a]];
  return habChange(list, null);
}

// Sheet sửa thói quen của một ngày (hôm nay hoặc ngày cũ)
function renderDaySheet(date) {
  S.dayDate = date;
  const d = parseYmd(date), rec = S.days[date] || blankRec(date);
  const rows = HABITS.filter(hb => d >= habStart(hb) && (scheduled(hb, d) || sch(hb, d).freq === "weekly" || rec.h[hb.id])).map(hb => {
    const cur = rec.h[hb.id] === "full" || rec.h[hb.id] === "min" ? rec.h[hb.id] : "";
    const opts = [["", "ph-x", "Chưa"], ["min", "ph-circle-half", "Tối thiểu"], ["full", "ph-check", "Đạt"]];
    return `<div class="dayrow" data-row="${hb.id}"><i class="ph ${hb.icon}" data-ic="${hb.icon}" style="${icVars(hb.cat)}"></i><span>${esc(hb.name)}${hb.min ? `<small class="dayrow__min">Tối thiểu: ${esc(hb.min)}</small>` : ""}</span><div class="seg" role="group" aria-label="${esc(hb.name)}">
      ${opts.map(([lv, ic, lab]) => lv === "min" && !hb.min ? `<span class="seg__gap"></span>` : `<button data-dh="${hb.id}" data-lv="${lv}" aria-pressed="${cur === lv}" aria-label="${lab}" title="${lab}"><i class="ph ${ic}"></i></button>`).join("")}
    </div></div>`;
  }).join("");
  openSheet(`${DOW[d.getDay()]} ${dmy(d)}`, rows ? `<div class="daylist">${rows}</div>` : `<p class="muted">Ngày này không có thói quen nào.</p>`);
}

// ============================================================ render: journal
const JFIELDS = [["vui", "Hôm nay vui vì"], ["bietOn", "Biết ơn điều gì"], ["mai", "Mai muốn làm gì"], ["them", "Ghi thêm"]];
function journalMd(date, f) {
  const d = parseYmd(date);
  let md = `# Nhật ký · ${fmtDate(d)}\n`;
  for (const [k, label] of JFIELDS) if ((f[k] || "").trim()) md += `\n## ${label === "Hôm nay vui vì" ? "Vui vì" : label === "Biết ơn điều gì" ? "Biết ơn" : label === "Mai muốn làm gì" ? "Mai muốn" : "Ghi thêm"}\n${f[k].trim()}\n`;
  return md;
}
function parseJournal(md) {
  const f = {}, map = { "Vui vì": "vui", "Biết ơn": "bietOn", "Mai muốn": "mai", "Ghi thêm": "them" };
  let cur = null;
  for (const line of (md || "").split("\n")) {
    const m = line.match(/^## (.+)$/);
    if (m) { cur = map[m[1].trim()] || "them"; f[cur] = f[cur] || ""; continue; }
    if (cur && !line.startsWith("# ")) f[cur] += (f[cur] ? "\n" : "") + line;
  }
  for (const k in f) f[k] = f[k].trim();
  return f;
}
async function renderJournal() {
  const v = $("#view-journal");
  if (!ready()) { v.innerHTML = `<div class="empty"><h2>Chưa kết nối</h2><p>Kết nối Google ở tab Hôm nay trước nhé.</p></div>`; return; }
  // Đang viết dở (vd vừa chuyển app rồi quay lại): không vẽ lại để khỏi mất chữ
  if (S.jdirty && $("#jform", v)) return;
  S.jdirty = false;
  v.innerHTML = `<p class="muted">Đang mở nhật ký…</p>`;
  try { S.jfiles = await api().listJournal(); } catch (e) { return handleErr(e); }
  drawJournal();
}
// Form luôn trống, chỉ để viết. Mọi trang đã lưu (cả hôm nay) nằm ở danh sách bên dưới; chạm để đọc.
// Vẽ từ S.jfiles, không gọi mạng, nên lưu xong hiện ngay trang hôm nay trong danh sách.
function drawJournal(flash) {
  const v = $("#view-journal"), today = todayStr(), files = S.jfiles || [];
  const hasToday = files.some(f => f.date === today);
  let html = `<form class="jcard fade-in" id="jform">
    <h2 class="now__title" style="font-size:var(--fd-l);margin:0 0 16px">${hasToday ? "Viết thêm cho hôm nay." : "Ba dòng cho hôm nay."}</h2>
    ${journalFormFields({})}
    <button class="btn btn--primary btn--block" type="submit"><i class="ph ph-floppy-disk"></i> Lưu nhật ký</button>
    ${hasToday ? `<p class="jnote">Hôm nay đã có trang. Lưu nữa thì viết nối vào trang đó, không mất phần cũ.</p>` : ""}
  </form>`;
  html += `<h2 class="h2">Đã viết <small>${files.length}</small></h2>`;
  html += files.length ? `<ul class="jlist">${files.map(f => { const d = parseYmd(f.date), isT = f.date === today; return `<li${f.date === flash ? ' class="is-new"' : ""}><button data-jdate="${esc(f.date)}"><b>${isT ? "Hôm nay" : `${DOW_SHORT[d.getDay()]} ${dmy(d)}`}</b><span class="jprev" data-prev="${esc(f.date)}">${esc((S.jprev || {})[f.date] || "")}</span><i class="ph ph-caret-right"></i></button></li>`; }).join("")}</ul>` : `<p class="muted">Chưa có trang nào. Trang đầu tiên sẽ là hôm nay.</p>`;
  v.innerHTML = html;
  loadPreviews(files.slice(0, 20));
}
// Ghép phần mới vào trang đã có: mỗi mục nối xuống dòng dưới, mục trống giữ nguyên
const mergeJournal = (cur, add) => { const out = Object.assign({}, cur); for (const [k] of JFIELDS) { const t = (add[k] || "").trim(); if (t) out[k] = [out[k], t].filter(Boolean).join("\n"); } return out; };
// Sheet đọc một trang: chữ thuần, không phải form. Có nút Sửa nhỏ nếu cần sửa lỗi.
function journalSheet(f, j) {
  const d = parseYmd(f.date), body = JFIELDS.filter(([k]) => (j[k] || "").trim()).map(([k, label]) => `<h3>${label}</h3><p>${esc(j[k])}</p>`).join("");
  const at = f.mod ? `<p class="jsaved__meta"><i class="ph-fill ph-check-circle"></i> Đã lưu vào Google Drive lúc ${hm(new Date(f.mod))}${f.date === todayStr() ? "" : ` · ${dmy(new Date(f.mod))}`}</p>` : "";
  openSheet(`${DOW[d.getDay()]} ${dmy(d)}`, `${at}<div class="md jread">${body || '<p class="muted">Trang trống.</p>'}</div>
    <button class="btn btn--ghost btn--block" id="jEditPage" data-date="${esc(f.date)}" type="button" style="margin-top:20px"><i class="ph ph-pencil-simple"></i> Sửa</button>`);
}
// Câu đầu tiên của mỗi trang cũ, tải dần sau khi hiện danh sách
const firstLine = j => (JFIELDS.map(([k]) => j[k]).find(Boolean) || "").split("\n")[0];
async function loadPreviews(files) {
  S.jprev = S.jprev || {};
  for (const f of files) {
    if (S.jprev[f.date] != null) continue;
    try { S.jprev[f.date] = firstLine(parseJournal(await api().readJournal(f))); } catch { S.jprev[f.date] = ""; }
    const el = document.querySelector(`.jprev[data-prev="${f.date}"]`); if (el) el.textContent = S.jprev[f.date];
  }
}
function journalFormFields(j) {
  return JFIELDS.map(([k, label]) => `<label class="field"><span>${label}</span><textarea name="${k}" rows="${k === "them" ? 3 : 2}">${esc(j[k] || "")}</textarea></label>`).join("");
}

// ============================================================ sheet
function openSheet(title, html) {
  $("#sheetTitle").textContent = title; $("#sheetBody").innerHTML = html;
  $$('#sheetBody input[type="time"]').forEach(i => (i.readOnly = true)); // mở TP (bộ chọn giờ trong app) thay vì hộp của Android
  $$("#sheetBody .act").forEach(timeWarn);
  $("#sheet").hidden = false; document.body.style.overflow = "hidden";
}
// Giờ kết thúc không sau giờ bắt đầu: báo ngay dưới ô giờ, nói rõ khi lưu sẽ thành gì
function timeWarn(box) {
  const [a, b] = $$('.act__times input[type="time"]', box); if (!a || !b) return;
  let w = $(".act__warn", box);
  const bad = a.value && b.value && b.value <= a.value;
  if (!bad) { if (w) w.remove(); return; }
  if (!w) { w = document.createElement("p"); w.className = "act__warn"; $(".act__times", box).after(w); }
  w.innerHTML = `<i class="ph ph-warning"></i> Giờ kết thúc phải sau giờ bắt đầu. Để vậy thì lưu thành ${esc(a.value)}–${esc(hm(new Date(+atTime(new Date(), a.value) + 15 * 60000)))}.`;
}
function closeSheet() { $("#sheet").hidden = true; document.body.style.overflow = ""; S.pending = null; }

function renderSettings() {
  const s = S.settings;
  setTimeout(() => { if (s.geminiKey && $("#sKeyState")) saveKey(s.geminiKey, true); }, 0);
  openSheet("Cài đặt", `
    <div class="set-group">
      <div class="status-line">${s.demo ? '<i class="ph-fill ph-flask warn-c"></i> Đang ở chế độ xem thử (dữ liệu mẫu)' : signedIn() ? '<i class="ph-fill ph-check-circle ok-c"></i> Đã đăng nhập Google' : '<i class="ph ph-warning-circle warn-c"></i> Chưa đăng nhập Google'}</div>
      <div class="row">
        ${s.demo ? '<button class="btn" id="sDemoOff">Thoát xem thử</button><button class="btn btn--ghost" id="sDemoReset">Làm mới dữ liệu mẫu</button>'
          : signedIn() ? '<button class="btn" id="sOut">Đăng xuất</button>' : '<button class="btn btn--primary" id="sIn">Đăng nhập Google</button>'}
      </div>
      ${S.cfg && !s.demo ? `<p class="faint" style="font-size:var(--fs-m);margin:10px 0 0">Đang theo dõi từ ${esc(S.cfg.start)}. <a class="link" href="https://drive.google.com/drive/folders/${esc(S.cfg.folderId)}" target="_blank" rel="noopener">Mở thư mục Drive</a></p>` : ""}
    </div>
    <div class="set-group">
      <label class="field"><span>Gemini API key</span><input id="sKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(s.geminiKey)}" placeholder="AIza…"><span class="keystate" id="sKeyState" role="status"></span><small>Đồng bộ theo tài khoản Google. Lấy miễn phí ở <a class="link" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a></small></label>
      <label class="field"><span>Model</span><select id="sModel">${modelOptions()}</select><small>${MODEL_HINT}</small></label>
      <button class="btn btn--block" id="sTest" type="button"><i class="ph ph-plugs-connected"></i> Kiểm tra kết nối</button>
      <label class="field"><span>Google OAuth Client ID</span><input id="sClient" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(s.clientId)}"><small>Cùng client với app Korean. Cần thêm địa chỉ app này vào “Authorized JavaScript origins”.</small></label>
      <button class="btn btn--primary btn--block" id="sSave">Lưu cài đặt</button>
    </div>`);
}

// Ngày hợp lệ để ghi việc đã làm: định dạng YYYY-MM-DD và không ở tương lai; sai thì về hôm nay
const validDay = ds => (/^\d{4}-\d\d-\d\d$/.test(ds || "") && ds <= todayStr() ? ds : todayStr());
const dayHint = ds => (ds === todayStr() ? "Hôm nay" : ds === ymd(addDays(startOfDay(new Date()), -1)) ? "Hôm qua" : DOW[parseYmd(ds).getDay()]);
// Ô ngày trong thẻ việc: ngày khác hôm nay thì tô màu để không lưu nhầm ngày
function dateField(ds) {
  return `<label class="act__date${ds !== todayStr() ? " is-other" : ""}">
    <input class="input num" type="date" data-f="date" value="${esc(ds)}" max="${todayStr()}" aria-label="Ngày">
    <span class="act__dayhint">${esc(dayHint(ds))}</span></label>`;
}
// Nhãn ngày ngắn cho chip thói quen: "Hôm qua" hoặc "T6 13/11" ("" = hôm nay)
const dayShort = ds => (!ds || ds === todayStr() ? "" : dayHint(ds) === "Hôm qua" ? "Hôm qua" : (d => `${DOW_SHORT[d.getDay()]} ${dmy(d)}`)(parseYmd(ds)));
const pendingEmpty = p => !p.activities.length && !p.habits.length && !(p.journal || "").trim() && !p.unwell;
// "Tự thêm": thẻ việc trống, không qua AI. Tên lấy từ chữ đã gõ (nếu có).
// Đang "Làm việc khác" thì giờ bắt đầu = đầu khối đang chạy, nhóm theo khối; không thì 30 phút trước.
function manualPending(text) {
  const now = new Date(), blk = S.otherFor && S.today.plan.find(b => b.id === S.otherFor);
  const from = blk && blk.start < now ? blk.start : new Date(now - 30 * 60000);
  const title = (text || "").trim().split("\n")[0].slice(0, 80);
  return { manual: true, reply: "", habits: [], journal: "", unwell: false, raw: text || "",
    activities: [{ title, category: blk && CATS[blk.cat] ? blk.cat : "life", date: todayStr(), start: hm(from), end: hm(now) }] };
}
function openManual() {
  closeCompose(true); renderConfirm(manualPending($("#inputText").value));
  const t = $('#sheetBody [data-f="title"]'); if (t && !t.value) t.focus();
}
function renderConfirm(p) {
  S.pending = p;
  const catOpts = sel => Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${c.name}</option>`).join("");
  const empty = pendingEmpty(p), canSave = !empty || !!S.otherFor;
  // Bỏ hết dòng rồi thì lời đáp cũ (nói về những dòng đó) không còn đúng
  let html = p.reply && !(empty && p.edited) ? `<p class="reply"><i class="ph-fill ph-sparkle"></i>${esc(p.reply)}</p>` : "";
  if (p.activities.length) {
    if (!p.manual) html += `<p class="group-t">Thời gian thực tế</p>`;  // sheet Thêm hoạt động chỉ có 1 thẻ, tiêu đề sheet đã đủ
    p.activities.forEach((a, i) => {
      const ds = validDay(a.date);
      html += `<div class="act" style="${catVars(a.category)}" data-i="${i}">
        <input class="input" type="text" data-f="title" value="${esc(a.title)}" placeholder="Tên việc" aria-label="Tên việc">
        <button type="button" class="icon-btn act__rm" data-rm="${i}" aria-label="Bỏ dòng này"><i class="ph ph-trash"></i></button>
        <select class="input" data-f="category" aria-label="Nhóm">${catOpts(a.category)}</select>
        <div class="act__times"><input class="input num" type="time" data-f="start" value="${esc(a.start)}" aria-label="Bắt đầu"><span class="faint">–</span><input class="input num" type="time" data-f="end" value="${esc(a.end)}" aria-label="Kết thúc"></div>
        ${dateField(ds)}
      </div>`;
    });
  }
  html += `<button type="button" class="btn btn--ghost btn--block act-add" id="cAddAct"><i class="ph ph-plus"></i> Thêm việc</button>`;
  if (p.habits.length) {
    html += `<p class="group-t">Thói quen</p><div class="hpick">`;
    p.habits.forEach((h, i) => { const hb = H[h.id]; if (!hb) return; const tag = dayShort(h.date); html += `<button type="button" data-hi="${i}" data-lv="${h.level}"><i class="ph ${hb.icon} hic" style="${icVars(hb.cat)}"></i>${esc(hb.name)} · ${h.level === "full" ? "Đạt" : h.level === "min" ? "Tối thiểu" : "Bỏ"}${h.value ? ` (${h.value})` : ""}${tag ? `<span class="hpick__day">${esc(tag)}</span>` : ""}</button>`; });
    html += `</div>`;
  }
  if (p.journal) html += `<p class="group-t">Thêm vào nhật ký</p><label class="field"><textarea id="cJournal" rows="3">${esc(p.journal)}</textarea></label>`;
  if (p.unwell) html += `<p class="care"><b>Bật rest day cho hôm nay?</b>Lịch sẽ nhẹ lại và chuỗi ngày không gãy.</p>`;
  if (empty) html += `<p class="muted">${p.edited ? "Đã bỏ hết, không còn gì để ghi." : "Mình chưa thấy việc nào để ghi. Thử kể cụ thể hơn, ví dụ “vừa đi bộ 20 phút”."}${S.otherFor ? " Lưu sẽ chỉ đánh dấu bỏ qua lịch đang chạy." : ""}</p>`;
  html += `<div class="sheet-actions"><button class="btn" data-close>Hủy</button><button class="btn btn--primary" id="cSave"${canSave ? "" : " disabled"}><i class="ph ph-check"></i> Lưu</button></div>`;
  openSheet(p.manual ? "Thêm việc đã làm" : "Mình hiểu là…", html);
}

// ============================================================ Gemini
function geminiSchema() {
  return {
    type: "OBJECT",
    properties: {
      activities: { type: "ARRAY", items: { type: "OBJECT", properties: {
        title: { type: "STRING" }, category: { type: "STRING", enum: Object.keys(CATS) },
        date: { type: "STRING", description: "YYYY-MM-DD" }, start: { type: "STRING", description: "HH:MM 24h" }, end: { type: "STRING", description: "HH:MM 24h" } },
        required: ["title", "category", "date", "start", "end"] } },
      habits: { type: "ARRAY", items: { type: "OBJECT", properties: {
        id: Object.assign({ type: "STRING" }, HABITS.length ? { enum: HABITS.map(h => h.id) } : {}), level: { type: "STRING", enum: ["full", "min", "skip"] },
        value: { type: "NUMBER", description: "số bước, số phút hoặc số từ nếu người dùng nói" }, date: { type: "STRING", description: "YYYY-MM-DD" } },
        required: ["id", "level"] } },
      journal: { type: "STRING", description: "Chỉ khi người dùng muốn ghi nhật ký/cảm xúc/biết ơn. Giữ nguyên lời họ." },
      unwell: { type: "BOOLEAN", description: "true nếu người dùng nói hôm nay mệt/ốm/không ổn và muốn nghỉ" },
      reply: { type: "STRING", description: "1 câu tiếng Việt ngắn, ấm áp, xác nhận đã hiểu. Không phán xét." },
    },
    required: ["activities", "habits", "reply"],
  };
}
function geminiPrompt(text) {
  const now = new Date();
  const plan = S.today.plan.map(p => `- ${hm(p.start)}–${hm(p.end)} ${p.title} [${p.cat}]`).join("\n");
  return `Bạn là trợ lý ghi chép cho app "Still life" (Second Brain + Atomic Habits) của một người dùng Việt Nam.
Bây giờ: ${DOW[now.getDay()]} ${ymd(now)} ${hm(now)} (múi giờ ${TZ}).

Nhiệm vụ: đọc câu người dùng kể và tách thành dữ liệu.

1) activities: những việc ĐÃ làm, có khoảng thời gian.
- "vừa X 30p" → kết thúc bây giờ, bắt đầu 30 phút trước. "từ 6 đến 7" → 06:00–07:00. "tới 7h" nghĩa là kết thúc 07:00.
- "sáng/trưa/chiều/tối" không có giờ cụ thể: ước lượng hợp lý theo lịch kế hoạch hôm nay.
- "hôm qua" → ngày hôm qua. Không bao giờ tạo việc ở tương lai.
- Tiêu đề ngắn gọn tiếng Việt, viết hoa chữ đầu. Không chép nguyên câu.
- category: health (yoga, gym, đi bộ, thiền, vận động) · korean (học/lớp tiếng Hàn) · build (code, học tech/AI, việc làm, CV) · life (ăn, tắm, việc nhà, ngủ trưa, di chuyển) · people (gia đình, bạn bè) · fun (giải trí có chủ đích: phim đã chọn, nhạc BTS, đi chơi) · scroll (lướt TikTok/YouTube/Facebook/mua sắm online không chủ đích).
- Phân biệt fun và scroll theo lời kể: "xem phim X" là fun, "lướt", "ôm điện thoại", "coi linh tinh" là scroll.

2) habits: thói quen được nhắc tới, kể cả gián tiếp (vd kể "vừa tập yoga" mà có thói quen Yoga → id của Yoga, full).
${HABITS.map(h => `- ${h.id} (${h.name}): ${aiRule(h)}`).join("\n") || "(chưa có thói quen nào, để trống)"}
- Chỉ dùng "skip" khi người dùng nói rõ là không làm.
${H.eat && !H.eat.off ? "- Hoạt động về ăn uống chỉ tính habit eat khi người dùng nói đã đủ 3 bữa (hoặc tổng kết cả ngày).\n" : ""}
3) journal: chỉ khi người dùng viết cảm xúc/biết ơn/nhật ký.
4) unwell: chỉ khi người dùng nói không khỏe/không ổn hôm nay.

Lịch kế hoạch hôm nay:
${plan || "(trống)"}

Câu của người dùng:
"""${text}"""`;
}
// Key dán từ chỗ khác hay dính khoảng trắng, xuống dòng, dấu ngoặc
const cleanKey = k => String(k || "").replace(/[\s"'`]/g, "");
// Danh sách model lấy theo key của bạn (giống app Korean). Flash-Lite trước: rẻ, nhanh, nhiều lượt miễn phí.
const MODEL_FALLBACK = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
let MODELS = LS.get("models", []);
const modelVer = id => parseFloat((id.match(/^gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
const isLite = id => /flash-lite/.test(id), isPreview = id => /preview|exp/.test(id);
const modelRank = (a, b) => (isLite(b) - isLite(a)) || (isPreview(a) - isPreview(b)) || (modelVer(b) - modelVer(a)) || a.localeCompare(b);
const modelList = () => (MODELS.length ? MODELS : MODEL_FALLBACK);
const curModel = () => (S.settings.model || "").trim() || modelList()[0];
const modelLabel = id => id.replace(/^gemini-/, "Gemini ").replace(/-flash-lite/, " Flash-Lite").replace(/-flash/, " Flash").replace(/-preview.*$/, " (preview)")
  + (isLite(id) ? " · rẻ, nhanh" : " · hiểu câu tốt hơn");
const MODEL_HINT = "<b>Flash-Lite:</b> nhanh, nhiều lượt miễn phí nhất. <b>Flash:</b> hiểu câu kể dài, lộn xộn tốt hơn.";
function modelOptions() {
  const list = modelList(), cur = (S.settings.model || "").trim();
  return [`<option value="" ${cur ? "" : "selected"}>Tự chọn · ${esc(modelLabel(list[0]).split(" · ")[0])}</option>`]
    .concat(list.map(id => `<option value="${esc(id)}" ${id === cur ? "selected" : ""}>${esc(modelLabel(id))}</option>`))
    .concat(cur && !list.includes(cur) ? [`<option value="${esc(cur)}" selected>${esc(cur)}</option>`] : []).join("");
}
async function loadModels(key) {
  const r = await fetch(`${GEMINI}?pageSize=1000`, { headers: { "x-goog-api-key": key } });
  if (!r.ok) {
    let m = ""; try { m = (await r.json()).error.message; } catch {}
    throw new Error(r.status === 400 || r.status === 403 ? "Key không hợp lệ. Kiểm tra lại ở aistudio.google.com/apikey" : `Không kiểm tra được key (${r.status}${m ? ": " + m : ""})`);
  }
  const ids = ((await r.json()).models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map(m => m.name.replace(/^models\//, ""))
    .filter(id => /^gemini-[\d.]+-flash/.test(id) && !/latest|tts|image|live|audio|embed|robotics|computer|thinking/.test(id))
    .sort(modelRank);
  if (ids.length) { MODELS = ids; LS.set("models", ids); }
  const sel = $("#sModel"); if (sel) sel.innerHTML = modelOptions();
  return MODELS;
}
const testKey = loadModels;
// Gửi thử 1 câu thật qua đúng model đang chọn
async function testConnection() {
  const b = $("#sTest"); if (!b) return;
  await saveKey($("#sKey").value, true);
  if (!S.settings.geminiKey) { const st = $("#sKeyState"); st.textContent = "Chưa nhập key"; st.className = "keystate is-bad"; return; }
  if ($("#sKeyState").classList.contains("is-bad")) return;
  S.settings.model = $("#sModel").value; saveSettings();
  const done = busy(b, "Đang thử kết nối");
  const st = $("#sKeyState");
  try {
    const p = await callGemini("vừa đi bộ 10 phút");
    st.innerHTML = `<i class="ph-fill ph-check-circle"></i> Kết nối được · ${esc(modelLabel(p.model || curModel()).split(" · ")[0])}`; st.className = "keystate is-ok";
  } catch (e) { st.textContent = e.message; st.className = "keystate is-bad"; }
  done();
}
// Key hợp lệ → đẩy lên Drive (nếu đã nối Google) để đồng bộ theo tài khoản
function syncKey(key) {
  if (S.settings.demo || !S.cfg || !S.cfg.configFileId || !signedIn() || S.cfg.geminiKey === key) return;
  Google.pushKey(key).then(() => { S.cfg.geminiKey = key; LS.set("cfg", S.cfg); }).catch(handleErr);
}
async function saveKey(raw, quiet) {
  const key = cleanKey(raw);
  S.settings.geminiKey = key; saveSettings();
  const inp = $("#sKey"); if (inp && inp.value !== key) inp.value = key;
  const st = $("#sKeyState"); if (!st) return;
  if (!key) { st.textContent = ""; st.className = "keystate"; return; }
  st.textContent = "Đang kiểm tra key…"; st.className = "keystate";
  try { await testKey(key); st.innerHTML = '<i class="ph-fill ph-check-circle"></i> Key dùng được'; st.className = "keystate is-ok"; if (!quiet) toast("Đã lưu key"); syncKey(key); }
  catch (e) { st.textContent = e.message; st.className = "keystate is-bad"; }
}
async function callGemini(text) {
  const { p, model } = await geminiJSON(geminiPrompt(text), geminiSchema(), 0.2);
  return { activities: p.activities || [], habits: p.habits || [], journal: p.journal || "", unwell: !!p.unwell, reply: p.reply || "", model };
}
// Gửi 1 prompt, nhận JSON theo schema. Thử lần lượt các model khi bị bận / model đã ngừng.
async function geminiJSON(prompt, schema, temperature) {
  const key = cleanKey(S.settings.geminiKey);
  if (!key) throw Object.assign(new Error("Chưa có Gemini API key"), { needKey: true });
  const models = [curModel(), ...modelList(), "gemini-flash-latest"].filter((m, i, a) => a.indexOf(m) === i);
  let last;
  for (const model of models) {
    try {
      const r = await fetch(`${GEMINI}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature } }),
      });
      if (r.status === 429 || r.status >= 500) { last = new Error(`Gemini đang bận (${r.status})`); continue; }
      if (r.status === 404) { last = new Error(`Model ${model} không còn dùng được`); continue; }
      if (!r.ok) {
        let m = ""; try { m = (await r.json()).error.message; } catch {}
        const bad = r.status === 401 || r.status === 403 || /api key/i.test(m);   // key sai / bị khoá → mở Cài đặt để sửa
        throw Object.assign(new Error(bad ? "Gemini key không dùng được, kiểm tra lại trong Cài đặt" : `Gemini lỗi ${r.status}${m ? ": " + m : ""}`), { needKey: bad });
      }
      const j = await r.json();
      const out = j.candidates && j.candidates[0] && j.candidates[0].content.parts.map(p => p.text || "").join("");
      return { p: JSON.parse(out), model };
    } catch (e) { last = e; if (!/bận|không còn dùng/.test(e.message)) throw e; }
  }
  throw last;
}
// Khi xem thử mà chưa có key: bộ đọc đơn giản để vẫn thử được luồng nhập
function demoParse(text) {
  const t = text.toLowerCase(), now = new Date(), out = { activities: [], habits: [], journal: "", unwell: false, reply: "" };
  const mins = (t.match(/(\d+)\s*(p|phút|ph)\b/) || [])[1];
  const steps = (t.match(/(\d[\d.,]*)\s*bước/) || [])[1];
  const dur = mins ? +mins : 30;
  const add = (title, category) => out.activities.push({ title, category, date: ymd(now), start: hm(new Date(now - dur * 60000)), end: hm(now) });
  if (/yoga/.test(t)) { add("Yoga", "health"); out.habits.push({ id: "yoga", level: "full" }); }
  if (/gym/.test(t)) { add("Gym", "health"); out.habits.push({ id: "gym", level: "full" }); }
  if (/hàn|từ mới/.test(t)) { add("Học tiếng Hàn", "korean"); out.habits.push({ id: "korean", level: /\d+\s*từ/.test(t) && dur < 10 ? "min" : "full" }); }
  if (/tiktok|lướt|youtube/.test(t)) add("Lướt điện thoại", "scroll");
  if (/code|app/.test(t)) add("Build app", "build");
  if (steps) { const n = +steps.replace(/[.,]/g, ""); out.habits.push({ id: "walk", level: n >= 3000 ? "full" : n >= 2000 ? "min" : "skip", value: n }); }
  if (/3 bữa|ba bữa/.test(t)) out.habits.push({ id: "eat", level: "full" });
  if (/mệt|ốm|không ổn/.test(t)) out.unwell = true;
  out.reply = "Chế độ xem thử dùng bộ đọc đơn giản. Thêm Gemini key để AI hiểu đầy đủ.";
  return out;
}

async function submitInput(text) {
  text = text.trim(); if (!text) return;
  const dock = $("#dock"), ic = $("#btnSend i");
  dock.classList.add("is-busy"); ic.className = "ph ph-circle-notch";
  try {
    const p = S.settings.demo && !S.settings.geminiKey ? demoParse(text) : await callGemini(text);
    p.activities = p.activities.filter(a => CATS[a.category] && /^\d\d:\d\d$/.test(a.start) && /^\d\d:\d\d$/.test(a.end));
    p.raw = text;
    closeCompose(true); renderConfirm(p);
  } catch (e) { handleErr(e); }
  finally { dock.classList.remove("is-busy"); ic.className = "ph ph-paper-plane-tilt"; }
}

// Đọc lại các ô đang sửa vào S.pending (sheet được dựng lại từ S.pending nên phải đọc trước khi thêm, bỏ dòng hay lưu)
function syncPending() {
  const p = S.pending; if (!p) return;
  $$("#sheetBody .act").forEach(el => { const a = p.activities[+el.dataset.i]; if (a) $$("[data-f]", el).forEach(inp => (a[inp.dataset.f] = inp.value)); });
  const jt = $("#cJournal"); if (jt) p.journal = jt.value;
}
// Thẻ việc mới nối tiếp thẻ cuối: cùng ngày, cùng nhóm, bắt đầu lúc thẻ cuối kết thúc, dài 30 phút
function nextActivity(last) {
  if (!last) { const now = new Date(); return { title: "", category: "life", date: todayStr(), start: hm(new Date(now - 30 * 60000)), end: hm(now) }; }
  const date = validDay(last.date);
  const s = atTime(parseYmd(date), /^\d\d:\d\d$/.test(last.end) ? last.end : hm(new Date()));
  return { title: "", category: CATS[last.category] ? last.category : "life", date, start: hm(s), end: hm(new Date(+s + 30 * 60000)) };
}
async function savePending() {
  const p = S.pending; if (!p) return;
  syncPending();
  if (pendingEmpty(p) && !S.otherFor) { closeSheet(); toast("Không có gì để ghi"); return; }
  const undoBusy = busy($("#cSave"), "Đang lưu");
  const today = todayStr(), created = [], prevRecs = {};
  const snap = d => { if (!(d in prevRecs)) prevRecs[d] = S.days[d] ? JSON.parse(JSON.stringify(S.days[d])) : null; };
  let jPrev = null, unwellOn = false;
  try {
    for (const a of p.activities) {
      a.date = validDay(a.date);
      a.title = (a.title || "").trim() || CATS[a.category]?.name || "Việc";
      const day = parseYmd(a.date);
      let s = atTime(day, a.start), e = atTime(day, a.end);
      if (e <= s) e = new Date(s.getTime() + 15 * 60000);
      const item = await api().addActual({ title: a.title, cat: a.category, start: s, end: e });
      created.push(item.id);
      if (a.date === today) S.today.actual.push(item);
    }
    const byDate = {};
    for (const h of p.habits) { const d = h.date || today; (byDate[d] = byDate[d] || []).push(h); }
    if (p.journal && p.journal.trim()) (byDate[today] = byDate[today] || []).push({ id: "journal", level: "min" });
    // "Việc khác": khối kế hoạch đang chạy được đánh dấu bỏ qua
    const other = S.otherFor && !(S.today.rec && (S.today.rec.skip || []).includes(S.otherFor)) ? S.otherFor : null;
    if (other) byDate[today] = byDate[today] || [];
    for (const [d, hs] of Object.entries(byDate)) {
      snap(d);
      const rec = Object.assign(blankRec(d), S.days[d] || {}); rec.h = Object.assign({}, rec.h); rec.v = Object.assign({}, rec.v);
      for (const h of hs) { rec.h[h.id] = h.level === "skip" ? (rec.h[h.id] === "full" || rec.h[h.id] === "min" ? rec.h[h.id] : "skip") : better(h.level, rec.h[h.id]); if (h.value) rec.v[h.id] = h.value; }
      if (d === today && other) rec.skip = [...new Set([...(rec.skip || []), other])];
      await saveRec(rec);
    }
    if (p.journal && p.journal.trim()) jPrev = await appendJournal(p.journal.trim());
    if (p.unwell && !(S.today.rec && S.today.rec.unwell)) { snap(today); await setUnwell(true); unwellOn = true; }
    closeSheet(); $("#inputText").value = ""; resetOther(); autosize();
    toast(S.settings.demo ? "Đã ghi (dữ liệu mẫu)" : "Đã ghi vào Google Calendar", 2600, async () => {
      if (unwellOn) await setUnwell(false);
      for (const id of created) { await api().deleteActual(id); S.today.actual = S.today.actual.filter(a => a.id !== id); }
      for (const [d, prev] of Object.entries(prevRecs)) await restoreRec(d, prev);
      if (jPrev) { await api().saveJournal(today, jPrev.md, jPrev.file); if (S.jprev) delete S.jprev[today]; }
    });
    render();
  } catch (e) { undoBusy(); handleErr(e); }
}
// Trả bản ghi ngày về trạng thái cũ (giữ id sự kiện hiện có để không tạo trùng)
async function restoreRec(d, prev) {
  const curId = S.days[d] && S.days[d].id;
  await saveRec(Object.assign(prev ? JSON.parse(JSON.stringify(prev)) : blankRec(d), { id: curId || (prev && prev.id) || null }));
}
function resetOther() { S.otherFor = null; $("#inputText").placeholder = "Bạn vừa làm gì?"; }
// Ô nhập: thu gọn thành nút tròn, bấm thì mở popup từ dưới lên
function openCompose(placeholder) {
  const t = $("#inputText");
  if (placeholder) t.placeholder = placeholder;
  $("#dock").classList.add("is-open"); $("#dockBackdrop").hidden = false;
  autosize(); t.focus();
}
function closeCompose(keepOther) {
  $("#dock").classList.remove("is-open"); $("#dockBackdrop").hidden = true;
  if (S.compose) return endHabAi();   // popup Nhờ AI: trả lại chữ của ô Hôm nay, không đụng S.otherFor
  if (!keepOther && !$("#inputText").value.trim()) resetOther();
}

async function appendJournal(text) {
  const today = todayStr();
  const files = S.jfiles || await api().listJournal();
  const tf = files.find(f => f.date === today);
  const prevMd = tf ? await api().readJournal(tf) : "";
  const cur = parseJournal(prevMd);
  cur.them = [cur.them, text].filter(Boolean).join("\n");
  const saved = await api().saveJournal(today, journalMd(today, cur), tf);
  if (!tf) (S.jfiles = files).unshift(saved);
  return { md: prevMd, file: tf || saved };
}

// ============================================================ actions
async function setUnwell(on) {
  const rec = Object.assign(blankRec(todayStr()), S.today.rec || {});
  const toMute = S.today.plan.filter(p => !p.ess && p.end > new Date());
  try {
    if (on) { await api().mutePlan(toMute, true); rec.muted = toMute.map(p => p.id); }
    else { const items = S.today.plan.filter(p => (rec.muted || []).includes(p.id)); await api().mutePlan(items, false); rec.muted = []; }
  } catch (e) { console.warn("mute", e); }
  rec.unwell = on;
  await saveRec(rec);
  S.today.plan.forEach(p => (p.muted = on && rec.muted.includes(p.id)));
}

// ============================================================ dậy trễ: AI sắp lại lịch hôm nay
// Luồng: nút "Mình dậy trễ" → sheet chọn giờ dậy → Gemini đề xuất → app kiểm tra (lateCheck) → sheet xem trước → Áp dụng.
// AI đề xuất sai luật thì dùng bản dời đơn giản (demoLate) thay vì báo lỗi, vẫn qua bước xem trước.
// Chỉ đổi lần lặp của hôm nay (updatePlan). rec.late giữ giờ gốc để "Trả lại lịch cũ" và để sắp lại lần nữa từ lịch gốc.
const canLate = () => !!(cleanKey(S.settings.geminiKey) || S.settings.demo);   // xem thử không có key thì dùng demoLate
const floor15 = d => { const x = new Date(d); x.setSeconds(0, 0); x.setMinutes(x.getMinutes() - (x.getMinutes() % 15)); return x; };
// Các khối hôm nay theo giờ gốc (trước lần sắp lại), k = mã ngắn gửi cho AI (b1, b2…)
function lateBase() {
  const rec = S.today.rec || {}, L = rec.late, mv = new Map(((L && L.moved) || []).map(m => [m.id, m]));
  const doneIds = new Set(S.today.actual.map(a => a.plan).filter(Boolean)), lateSkip = (L && L.skipped) || [];
  const userSkip = new Set((rec.skip || []).filter(id => !lateSkip.includes(id)));
  return S.today.plan.map(p => { const m = mv.get(p.id); return { p, start: m ? atTime(p.start, m.s) : p.start, end: m ? atTime(p.start, m.e) : p.end, done: doneIds.has(p.id), skip: userSkip.has(p.id) }; })
    .sort((a, b) => a.start - b.start).map((b, i) => Object.assign(b, { k: "b" + (i + 1) }));
}
// Còn khối nào chưa làm, chưa bỏ qua, chưa kết thúc thì mới cần nút
function lateNeeded() {
  const now = new Date(), rec = S.today.rec || {}, done = new Set(S.today.actual.map(a => a.plan).filter(Boolean));
  return S.today.plan.some(p => p.end > now && !done.has(p.id) && !(rec.skip || []).includes(p.id));
}
function lateAiSchema() {
  return {
    type: "OBJECT",
    properties: {
      wake: { type: "STRING", description: "giờ người dùng dậy, HH:MM" },
      items: { type: "ARRAY", items: { type: "OBJECT", properties: {
        id: { type: "STRING" }, s: { type: "STRING", description: "giờ bắt đầu mới HH:MM" }, e: { type: "STRING", description: "giờ kết thúc mới HH:MM" },
        skip: { type: "BOOLEAN", description: "true = bỏ khối này hôm nay" } }, required: ["id"] } },
      reply: { type: "STRING", description: "1 câu tiếng Việt ngắn, nhẹ nhàng: đã dời / giữ / bỏ gì" },
    },
    required: ["wake", "items", "reply"],
  };
}
function lateAiPrompt(text, base, now) {
  const rows = base.map(b => JSON.stringify({ id: b.k, ten: b.p.title, nhom: (CATS[b.p.cat] || CATS.life).name, s: hm(b.start), e: hm(b.end),
    quan_trong: !!b.p.ess, trang_thai: b.done ? "đã làm" : b.skip ? "đã bỏ qua" : b.end <= now ? "đã qua giờ" : "chưa làm" })).join("\n");
  return `Bạn giúp người dùng app "Still life" sắp lại lịch HÔM NAY vì họ dậy trễ. Bây giờ là ${hm(now)}, ${DOW[now.getDay()]}.
Các khối kế hoạch hôm nay (giờ gốc):
${rows}
Luật:
- wake = giờ người dùng chọn trong lời bên dưới, giữ nguyên.
- Khối đầu tiên trong ngày (thường là khối dậy) có thể đặt bắt đầu đúng lúc wake. Các khối khác dời thì bắt đầu từ ${hm(floor15(now))} trở đi, không xếp vào quá khứ.
- Khối "đã làm" hoặc "đã bỏ qua": không đổi, không nhắc tới.
- Khối "đã qua giờ" mà chưa làm: dời ra sau, hoặc skip nếu không còn chỗ / không còn hợp lý.
- Khối có giờ hẹn với người khác (lớp học, hẹn) và bữa ăn chính (trưa, tối) cố giữ đúng giờ. quan_trong = true là khối quan trọng, ưu tiên giữ.
- Không chồng giờ nhau, kể cả với khối đã làm. Không kết thúc sau 23:00.
- Không vừa thì rút ngắn khối linh hoạt hoặc skip khối ít quan trọng (giải trí trước, rồi tới việc có thể làm ngày khác).
- items chỉ gồm các khối bị đổi giờ hoặc skip. Khối không nhắc tới giữ nguyên.
- Giờ luôn viết đủ 2 chữ số HH:MM (vd 09:00, không viết 9:00). Khối đổi giờ phải có cả s và e.
- reply: 1 câu tiếng Việt, không trách, không phán xét.
Lời người dùng:
"""${text}"""`;
}
// Kiểm tra đề xuất của AI. Trả { wake, res: Map(k → {start,end} | {skip:true}) } hoặc { err }.
// Khối đã qua giờ mà AI để nguyên (chưa làm) thì coi như bỏ hôm nay, hiện trong mục "Bỏ hôm nay".
// Giờ AI trả về không luôn đúng HH:MM ("9:00", "09:00:00", "9h30"): chuẩn hoá trước, sai hẳn mới báo.
function normT(v) {
  const m = String(v == null ? "" : v).trim().match(/^(\d{1,2})\s*[:hg.]\s*(\d{1,2})?(?::\d{2})?$/i);
  if (!m || +m[1] > 23 || +(m[2] || 0) > 59) return "";
  return `${pad(+m[1])}:${pad(+(m[2] || 0))}`;
}
function lateCheck(base, out, now) {
  const day = startOfDay(now), fl = floor15(now), end = atTime(day, "23:00");
  const bad = m => ({ err: m }), has = x => x != null && String(x).trim() !== "";
  const w = out && normT(out.wake);
  if (!w) return bad("thiếu giờ dậy");
  const wake = atTime(day, w);
  if (wake > now) return bad("giờ dậy sau bây giờ");
  const by = new Map(base.map(b => [b.k, b])), res = new Map();
  for (const it of out.items || []) {
    const b = by.get(it.id);
    if (!b) return bad(`không có khối ${it.id}`);
    if (res.has(it.id)) return bad(`khối ${b.p.title} bị nhắc 2 lần`);
    if (it.skip) {
      if (b.skip) continue;
      if (b.done) return bad(`bỏ khối đã làm (${b.p.title})`);
      res.set(it.id, { skip: true }); continue;
    }
    if (!has(it.s) && !has(it.e)) continue;   // AI nhắc khối mà không đổi giờ
    const s0 = has(it.s) ? normT(it.s) : "", e0 = has(it.e) ? normT(it.e) : "";
    if ((has(it.s) && !s0) || (has(it.e) && !e0)) return bad(`giờ của ${b.p.title} sai dạng`);
    const len = b.end - b.start;   // thiếu một đầu thì giữ độ dài cũ
    const s = s0 ? atTime(day, s0) : new Date(+atTime(day, e0) - len), e = e0 ? atTime(day, e0) : new Date(+s + len);
    if (+s === +b.start && +e === +b.end) continue;
    if (b.done || b.skip) return bad(`đổi khối đã xong (${b.p.title})`);
    if (s >= e) return bad(`${b.p.title} kết thúc trước khi bắt đầu`);
    if (s < (b === base[0] ? wake : fl)) return bad(`${b.p.title} bị xếp vào quá khứ`);
    if (e > end) return bad(`${b.p.title} quá 23:00`);
    res.set(it.id, { start: s, end: e });
  }
  for (const b of base) if (!res.has(b.k) && !b.done && !b.skip && b.end <= fl) res.set(b.k, { skip: true, auto: true });
  const fin = base.filter(b => !b.skip && !(res.get(b.k) || {}).skip).map(b => { const r = res.get(b.k); return { b, s: r ? r.start : b.start, e: r ? r.end : b.end, ch: !!r }; });
  for (const x of fin) if (x.ch) for (const y of fin) if (y !== x && x.s < y.e && y.s < x.e) return bad(`${x.b.p.title} chồng giờ với ${y.b.p.title}`);
  return { wake, res };
}
// Xem thử không có key: dời đơn giản. Khối quan trọng chưa tới giờ đứng yên, khối còn lại xếp nối tiếp vào chỗ trống, không vừa thì bỏ.
function demoLate(text, base, now) {
  const m = text.match(/(\d{1,2})\s*(?:[h:g]|giờ)\s*(\d{1,2})?/i), fl = floor15(now), day = startOfDay(now);
  let wake = m ? atTime(day, `${pad(+m[1])}:${pad(+(m[2] || 0))}`) : fl;
  if (wake > now) wake = fl;
  const cur0 = wake > fl ? wake : fl, busyAt = [], items = [];
  for (const b of base) if (b.done || b.skip || (b.p.ess && b.start >= cur0)) busyAt.push([b.start, b.end]);
  const free = (s, e) => busyAt.every(([a, z]) => e <= a || s >= z);
  let cur = cur0;
  for (const b of base) {
    if (b.done || b.skip || (b.p.ess && b.start >= cur0)) continue;
    const len = b.end - b.start;
    let s = new Date(Math.max(b === base[0] ? wake : cur, b.start));
    while (!free(s, new Date(+s + len)) && s < atTime(day, "23:00")) s = new Date(+s + 15 * 60000);
    const e = new Date(+s + len);
    if (e > atTime(day, "23:00")) { items.push({ id: b.k, skip: true }); continue; }
    busyAt.push([s, e]); cur = e > cur ? e : cur;
    items.push({ id: b.k, s: hm(s), e: hm(e) });
  }
  return { wake: hm(wake), items, reply: "Chế độ xem thử dời đơn giản. Thêm Gemini key để AI sắp khéo hơn." };
}
// Thói quen gắn với khối dậy (khối đầu tiên trong ngày). Chọn sẵn Đạt khi dậy trong vòng 5 phút sau giờ của khối, còn lại Chưa
function lateHabit(base, wake) {
  const b = base[0], hid = b && b.p.habit;
  if (!hid || hid === "walk" || !HABITS.some(h => h.id === hid)) return null;
  const L = (S.today.rec || {}).late, prior = L && L.hprev && hid in L.hprev ? L.hprev[hid] : (S.today.rec || {}).h?.[hid];
  const rule = wake <= new Date(+b.start + 5 * 60000) ? "full" : "";
  return { hid, lv: prior === "full" || prior === "min" ? better(rule, prior) : rule };
}
// Bấm "Mình dậy trễ" mở thẳng bộ chọn giờ, nút chính "Sắp lại lịch hôm nay". Bộ chọn giữ nguyên (vòng quay ở nút) tới khi có lịch mới.
// Mặc định: bây giờ làm tròn xuống 15 phút, hoặc giờ của lần sắp lại trước.
function openLateAi(wake) {
  const v = wake || ((S.today.rec || {}).late || {}).wake || hm(floor15(new Date()));
  TP.open(null, { title: "Mình dậy lúc", value: v, ok: `<i class="ph ph-sparkle"></i> Sắp lại lịch hôm nay`, onOk: lateGo });
}
async function lateGo(v, btn) {
  const now = hm(new Date());
  if (v > now) return toast(`Giờ dậy phải trước bây giờ (${now})`, 3000);   // giữ bộ chọn để chọn lại
  const done = busy(btn, "Đang sắp lại lịch");
  try { await lateAi(v); TP.close(); } catch (er) { handleErr(er); } finally { done(); }
}
async function lateAi(wake) {
  const now = new Date(), base = lateBase(), text = `Mình dậy lúc ${wake}`;
  let out, fb = false, c;
  S.late = null;
  if (S.settings.demo && !cleanKey(S.settings.geminiKey)) out = demoLate(text, base, now);
  else {
    try { out = Object.assign((await geminiJSON(lateAiPrompt(text, base, now), lateAiSchema(), 0.3)).p || {}, { wake }); }
    catch (e) { if (e.needKey) throw e; console.warn("lateAi", e); out = null; }   // key sai thì báo; AI bận / trả hỏng thì dời đơn giản
  }
  c = out ? lateCheck(base, out, now) : { err: "AI không trả lời được" };
  if (c.err) {   // AI sắp sai luật hoặc lỗi: dùng bản dời đơn giản, vẫn xem trước được
    console.warn("lateCheck", c.err, out);
    out = demoLate(text, base, now); c = lateCheck(base, out, now); fb = true;
    if (c.err) throw new Error(`Chưa sắp lại được (${c.err}), thử giờ khác nhé`);
  }
  S.late = { wake: c.wake, base, res: c.res, reply: fb ? "" : out.reply || "", fb, hab: lateHabit(base, c.wake) };
  renderLateSheet();
}
// Lỗi của các khối người dùng sửa trong sheet xem trước: k → câu báo. Cùng luật với lateCheck (quá khứ, quá 23:00, chồng giờ).
function lateIssues(L, now = new Date()) {
  const fl = floor15(now), end = atTime(now, "23:00"), out = new Map();
  const rows = L.base.filter(b => !b.skip && !(L.res.get(b.k) || {}).skip).map(b => {
    const r = L.res.get(b.k); return { b, s: r ? r.start : b.start, e: r ? r.end : b.end, ch: !!r && (+r.start !== +b.start || +r.end !== +b.end) };
  });
  for (const x of rows) {
    if (!x.ch) continue;
    if (x.s < (x.b === L.base[0] ? L.wake : fl)) { out.set(x.b.k, "Giờ này đã qua"); continue; }
    if (x.e > end) { out.set(x.b.k, "Quá 23:00"); continue; }
    const y = rows.find(y => y !== x && x.s < y.e && y.s < x.e);
    if (y) out.set(x.b.k, `Chồng giờ với ${y.b.p.title}`);
  }
  return out;
}
// Chạm giờ một khối: bộ chọn giờ bắt đầu, giữ độ dài. Dùng cả khi giữ lại khối đã qua giờ (mặc định bây giờ).
function lateEditTime(k) {
  const L = S.late, b = L && L.base.find(x => x.k === k); if (!b) return;
  const r = L.res.get(k), cur = r && !r.skip ? r : null, len = cur ? cur.end - cur.start : b.end - b.start;
  const fl = floor15(new Date()), def = cur ? cur.start : b.end <= fl ? fl : b.start;
  TP.open(null, { title: b.p.title, value: hm(def), onOk: v => {
    const st = atTime(new Date(), v);
    if (+st === +b.start) L.res.delete(k); else L.res.set(k, { start: st, end: new Date(+st + len) });
    TP.close(); renderLateSheet();
  } });
}
function renderLateSheet() {
  const L = S.late; if (!L) return;
  const bad = lateIssues(L);
  const row = (b, s, e, moved) => `<li class="late__row${bad.has(b.k) ? " is-bad" : ""}" style="${catVars(b.p.cat)}"><span class="dot"></span><span class="late__name">${esc(b.p.title)}</span>
    <button type="button" class="late__time num" data-lt="${b.k}" aria-label="Đổi giờ ${esc(b.p.title)}">${moved ? `<s>${hm(b.start)}</s> <i class="ph ph-arrow-right" aria-label="thành"></i> ` : ""}<b>${hm(s)}–${hm(e)}</b></button>
    <button type="button" class="late__x" data-lskip="${b.k}" aria-label="Bỏ ${esc(b.p.title)} hôm nay" title="Bỏ hôm nay"><i class="ph ph-minus-circle"></i></button></li>
    ${bad.has(b.k) ? `<li class="act__warn late__warn"><i class="ph ph-warning"></i> ${esc(bad.get(b.k))}</li>` : ""}`;
  const dropRow = b => `<li class="late__row" style="${catVars(b.p.cat)}"><span class="dot"></span><span class="late__name">${esc(b.p.title)}</span>
    <span class="late__time num">${hm(b.start)}–${hm(b.end)}</span>
    <button type="button" class="late__x" data-lkeep="${b.k}" aria-label="Giữ lại ${esc(b.p.title)}" title="Giữ lại"><i class="ph ph-plus-circle"></i></button></li>`;
  const keep = [], drop = [];
  for (const b of L.base) {
    if (b.done || b.skip) continue;
    const r = L.res.get(b.k);
    if (r && r.skip) drop.push(b);
    else { const s0 = r ? r.start : b.start, e0 = r ? r.end : b.end; keep.push({ b, s: s0, e: e0, moved: +s0 !== +b.start || +e0 !== +b.end }); }
  }
  keep.sort((a, b) => a.s - b.s);
  const h = L.hab && HABITS.find(x => x.id === L.hab.hid);
  const opts = [["", "ph-x", "Chưa"], ["min", "ph-circle-half", "Tối thiểu"], ["full", "ph-check", "Đạt"]];
  const panel = $(".sheet__panel"), y = !$("#sheet").hidden && $("#sheetTitle").textContent === "Lịch mới hôm nay" ? panel.scrollTop : 0;
  openSheet("Lịch mới hôm nay", `${L.reply ? `<p class="hai__note"><i class="ph-fill ph-sparkle"></i> <span>${esc(L.reply)}</span></p>` : ""}
    <div class="late__wake"><span class="muted">Dậy lúc <b class="num">${hm(L.wake)}</b></span><button type="button" class="late__retell" id="lRetell" aria-label="Đổi giờ dậy"><i class="ph ph-alarm"></i> Đổi</button></div>
    ${(S.today.rec || {}).unwell ? `<p class="late__rest muted"><i class="ph ph-moon"></i> Đang rest day: các khối 💤 vẫn dời nhưng không nhắc.</p>` : ""}
    ${keep.length ? `<ul class="late__list">${keep.map(x => row(x.b, x.s, x.e, x.moved)).join("")}</ul>` : `<p class="muted">Không còn khối nào cho hôm nay.</p>`}
    ${drop.length ? `<p class="mgroup">Bỏ hôm nay</p><ul class="late__list late__list--drop">${drop.map(dropRow).join("")}</ul>` : ""}
    ${h ? `<p class="mgroup">Thói quen</p><div class="daylist late__hab"><div class="dayrow"><i class="ph ${h.icon}" style="${icVars(h.cat)}"></i><span>${esc(h.name)}${h.min ? `<small class="dayrow__min">Tối thiểu: ${esc(h.min)}</small>` : ""}</span><div class="seg" role="group" aria-label="${esc(h.name)}">
      ${opts.map(([lv, ic, lab]) => lv === "min" && !h.min ? `<span class="seg__gap"></span>` : `<button type="button" data-llv="${lv}" data-lv="${lv}" aria-pressed="${L.hab.lv === lv}" aria-label="${lab}" title="${lab}"><i class="ph ${ic}"></i></button>`).join("")}
    </div></div></div>` : ""}
    <div class="sheet-actions"><button type="button" class="btn" data-close>Hủy</button><button type="button" class="btn btn--primary" id="lApply"${bad.size ? " disabled" : ""}><i class="ph ph-check"></i> Áp dụng</button></div>`);
  panel.scrollTop = y;   // sửa một dòng không nhảy về đầu sheet
}
// Đổi giờ (chỉ hôm nay) cho các khối trong map id → {start, end}; khối đã đúng giờ thì bỏ qua. Gọi song song.
async function setPlanTimes(map) {
  const jobs = S.today.plan.filter(p => { const t = map.get(p.id); return t && (+t.start !== +p.start || +t.end !== +p.end); })
    .map(async p => { const t = map.get(p.id); await api().updatePlan(Object.assign({}, p, { start: t.start, end: t.end })); p.start = t.start; p.end = t.end; });
  const r = await Promise.allSettled(jobs);
  S.today.plan.sort((a, b) => a.start - b.start);
  const f = r.find(x => x.status === "rejected"); if (f) throw f.reason;
}
async function applyLate() {
  const L = S.late; if (!L) return;
  const cur = S.today.rec || blankRec(todayStr()), prevRec = JSON.parse(JSON.stringify(cur));
  const prevTimes = new Map(S.today.plan.map(p => [p.id, { start: p.start, end: p.end }]));
  const rec = Object.assign(blankRec(todayStr()), JSON.parse(JSON.stringify(cur))), old = rec.late;
  const target = new Map(), moved = [], skipped = [];
  for (const b of L.base) {
    const r = L.res.get(b.k);
    if (r && r.skip) skipped.push(b.p.id);
    const t = r && !r.skip ? r : { start: b.start, end: b.end };   // khối không đổi: về giờ gốc (sắp lại lần 2 không chồng lên lần trước)
    target.set(b.p.id, t);
    if (+t.start !== +b.start || +t.end !== +b.end) moved.push({ id: b.p.id, s: hm(b.start), e: hm(b.end) });
  }
  const oldSkip = (old && old.skipped) || [];
  rec.skip = [...new Set([...(rec.skip || []).filter(id => !oldSkip.includes(id)), ...skipped])];
  let hprev = (old && old.hprev) || {}, hset = "";
  if (L.hab) {
    const { hid, lv } = L.hab;
    if (!(hid in hprev)) hprev = Object.assign({}, hprev, { [hid]: rec.h[hid] || "none" });
    rec.h = Object.assign({}, rec.h); if (lv) rec.h[hid] = lv; else delete rec.h[hid];
    hset = lv || "none";
  }
  rec.late = { wake: hm(L.wake), moved, skipped, hprev, hset };
  await saveRec(rec);   // lưu giờ gốc trước, lỡ đổi giờ hỏng giữa chừng vẫn "Trả lại lịch cũ" được
  await setPlanTimes(target);
  S.late = null;
  return async () => { await restoreRec(todayStr(), prevRec); await setPlanTimes(prevTimes); };
}
// Trả lại lịch cũ: giờ gốc, bỏ các Bỏ qua do lần sắp lại đặt, thói quen về mức trước (trừ khi người dùng đã tự đổi)
async function undoLate() {
  const rec = Object.assign(blankRec(todayStr()), JSON.parse(JSON.stringify(S.today.rec || {}))), L = rec.late; if (!L) return;
  const base = new Map(L.moved.map(m => [m.id, { start: atTime(new Date(), m.s), end: atTime(new Date(), m.e) }]));
  rec.skip = (rec.skip || []).filter(id => !L.skipped.includes(id));
  rec.h = Object.assign({}, rec.h);
  for (const [hid, pv] of Object.entries(L.hprev || {})) if ((rec.h[hid] || "none") === (L.hset || "none")) { if (pv === "none") delete rec.h[hid]; else rec.h[hid] = pv; }
  rec.late = null;
  await saveRec(rec);
  await setPlanTimes(base);
}

async function markBlock(id, how) {
  const blk = S.today.plan.find(p => p.id === id); if (!blk) return;
  if (how === "done") {
    const end = new Date() < blk.end ? new Date() : blk.end;
    const hid = blk.habit && blk.habit !== "walk" && HABITS.some(h => h.id === blk.habit) ? blk.habit : "";   // thói quen đã ngừng thì không đánh dấu
    // hprev: mức thói quen trước khi bấm Đã làm ("none" = chưa có), lưu cùng sự kiện để ↺ trả lại được kể cả sau khi mở lại app
    const prevLv = hid ? (S.today.rec || {}).h?.[hid] : undefined;
    const item = await api().addActual({ title: blk.title, cat: blk.cat, start: blk.start, end: end > blk.start ? end : blk.end, plan: blk.id, habit: blk.habit, hprev: hid ? prevLv || "none" : "" });
    item.plan = blk.id; S.today.actual.push(item);
    if (hid) await setHabit(todayStr(), hid, better("full", prevLv));
    toast(`Đã ghi: ${blk.title}`, 2600, () => unmarkBlock(blk.id));
  } else {
    const rec = Object.assign(blankRec(todayStr()), S.today.rec || {});
    rec.skip = [...new Set([...(rec.skip || []), id])];
    await saveRec(rec); toast("Đã bỏ qua", 2600, () => unmarkBlock(id));
  }
}
// Bỏ trạng thái đã làm / đã bỏ qua của một khối kế hoạch
async function unmarkBlock(id) {
  const rec = Object.assign(blankRec(todayStr()), S.today.rec || {});
  if ((rec.skip || []).includes(id)) { rec.skip = rec.skip.filter(x => x !== id); await saveRec(rec); }
  for (const a of S.today.actual.filter(a => a.plan === id)) {
    await api().deleteActual(a.id);
    // Trả thói quen về mức trước khi bấm Đã làm, chỉ khi nó vẫn là "full" do Đã làm đặt (người dùng tự đổi sau đó thì giữ nguyên)
    const hid = a.habit, cur = (S.days[todayStr()] || {}).h?.[hid];
    if (a.hprev && hid && HABITS.some(h => h.id === hid) && cur === "full") await setHabit(todayStr(), hid, a.hprev === "none" ? null : a.hprev);
  }
  S.today.actual = S.today.actual.filter(a => a.plan !== id);
}

// Chi tiết một khối kế hoạch hôm nay: sửa tên/giờ (chỉ ngày này, các ngày khác giữ nguyên)
function renderPlanEdit(p) {
  S.editPlan = p.id;
  const rec = S.today.rec || {}, c = CATS[p.cat] || CATS.life;
  const done = S.today.actual.some(a => a.plan === p.id), skip = (rec.skip || []).includes(p.id);
  const st = done ? `<span class="badge badge--good"><i class="ph-fill ph-check-circle"></i> Đã làm</span>`
    : skip ? `<span class="badge"><i class="ph ph-skip-forward"></i> Đã bỏ qua</span>`
    : p.muted || (rec.unwell && !p.ess) ? `<span class="badge"><i class="ph ph-moon"></i> Đang tắt</span>` : "";
  const hb = p.habit && HABITS.find(h => h.id === p.habit);   // thói quen đã ngừng thì không hiện nhãn
  openSheet("Chỉnh sửa kế hoạch", `<p class="plan-meta"><span class="badge" style="${catVars(p.cat)}"><span class="dot"></span>${esc(c.name)}</span>${hb ? `<span class="badge"><i class="ph ${hb.icon} hic" style="${icVars(hb.cat)}"></i> ${esc(hb.name)}</span>` : ""}${st}</p>
    <div class="act" style="${catVars(p.cat)}">
      <input class="input" type="text" id="pTitle" value="${esc(p.title)}" aria-label="Tên kế hoạch"${p.added ? "" : ` style="grid-column:1/-1"`}>
      ${p.added ? `<button type="button" class="icon-btn act__rm" id="pDel" aria-label="Xoá kế hoạch này"><i class="ph ph-trash"></i></button>` : ""}
      <div class="act__times"><input class="input num" type="time" id="pStart" value="${hm(p.start)}" aria-label="Bắt đầu"><span class="faint">–</span><input class="input num" type="time" id="pEnd" value="${hm(p.end)}" aria-label="Kết thúc"></div>
    </div>
    <p class="faint" style="font-size:var(--fs-m);margin:0 0 4px">${p.added ? "Kế hoạch thêm riêng cho hôm nay." : "Chỉ đổi cho hôm nay, lịch các ngày khác giữ nguyên."}</p>
    <div class="sheet-actions"><button class="btn" data-close>Hủy</button><button class="btn btn--primary" id="pSave"><i class="ph ph-check"></i> Lưu</button></div>`);
}
async function savePlanEdit() {
  const old = S.today.plan.find(p => p.id === S.editPlan); if (!old) return closeSheet();
  const day = startOfDay(old.start);
  let s = atTime(day, $("#pStart").value || hm(old.start)), e = atTime(day, $("#pEnd").value || hm(old.end));
  if (e <= s) e = new Date(s.getTime() + 15 * 60000);
  const title = $("#pTitle").value.trim() || old.title;
  if (title === old.title && +s === +old.start && +e === +old.end) return closeSheet();
  await applyPlanTime(old, { title, start: s, end: e }); closeSheet();
}
// Đổi tên / giờ một khối kế hoạch hôm nay (chỉ lần lặp hôm nay), có hoàn tác. Sheet sửa và kéo-thả dùng chung.
async function applyPlanTime(old, next, msg = "Đã đổi kế hoạch hôm nay") {
  const prev = Object.assign({}, old);
  const swap = it => {
    S.today.plan = S.today.plan.map(p => (p.id === prev.id ? Object.assign({}, p, { title: it.title, start: it.start, end: it.end }) : p)).sort((a, b) => a.start - b.start);
  };
  swap(await api().updatePlan(Object.assign({}, old, next)));
  toast(msg, 2600, async () => swap(await api().updatePlan(prev)));
}

// Chạm chỗ trống ở cột Kế hoạch → thêm khối cho hôm nay
// end: giờ kết thúc khi kéo chọn khoảng; không có thì 30 phút, hoặc tới khối kế tiếp nếu khối đó cách ≥ 15 phút
function renderPlanAdd(start, end) {
  if (!end) {
    const next = S.today.plan.find(p => p.start > start);
    end = new Date(+start + 30 * 60000);
    if (next && next.start < end && next.start - start >= 15 * 60000) end = next.start;
  }
  const catOpts = Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === "build" ? "selected" : ""}>${c.name}</option>`).join("");
  openSheet("Thêm kế hoạch", `<div class="act" style="${catVars("build")}" id="pAddBox">
      <input class="input" type="text" id="pTitle" placeholder="Định làm gì?" aria-label="Tên kế hoạch" style="grid-column:1/-1">
      <select class="input" id="pCat" aria-label="Nhóm">${catOpts}</select>
      <div class="act__times"><input class="input num" type="time" id="pStart" value="${hm(start)}" aria-label="Bắt đầu"><span class="faint">–</span><input class="input num" type="time" id="pEnd" value="${hm(end)}" aria-label="Kết thúc"></div>
    </div>
    <p class="faint" style="font-size:var(--fs-m);margin:0 0 4px">Chỉ thêm cho hôm nay.</p>
    <div class="sheet-actions"><button class="btn" data-close>Hủy</button><button class="btn btn--primary" id="pAdd"><i class="ph ph-plus"></i> Thêm</button></div>`);
  setTimeout(() => $("#pTitle")?.focus(), 50);
}
async function savePlanAdd() {
  const title = $("#pTitle").value.trim();
  if (!title) { $("#pTitle").focus(); return false; }
  const day = startOfDay(new Date());
  let s = atTime(day, $("#pStart").value || "09:00"), e = atTime(day, $("#pEnd").value || hm(new Date(+s + 30 * 60000)));
  if (e <= s) e = new Date(s.getTime() + 15 * 60000);
  const it = await api().addPlan({ title, cat: $("#pCat").value, start: s, end: e });
  S.today.plan = [...S.today.plan, it].sort((a, b) => a.start - b.start); closeSheet();
  toast("Đã thêm kế hoạch", 2600, async () => { await api().deletePlan(it.id); S.today.plan = S.today.plan.filter(p => p.id !== it.id); });
  return true;
}
async function deletePlanAdded() {
  const old = S.today.plan.find(p => p.id === S.editPlan); if (!old || !old.added) return closeSheet();
  await api().deletePlan(old.id);
  S.today.plan = S.today.plan.filter(p => p.id !== old.id); closeSheet();
  toast("Đã xoá kế hoạch", 2600, async () => {
    const it = await api().addPlan(old);
    S.today.plan = [...S.today.plan, it].sort((a, b) => a.start - b.start);
  });
}

// ============================================================ tuần mẫu (lịch lặp hằng tuần)
// Mọi thay đổi áp dụng từ ngày mai: hôm nay và các ngày trước giữ nguyên, nên timeline ngày cũ vẫn đúng kế hoạch lúc đó.
// Chuỗi đã có lần lặp tới hôm nay → cắt ở hôm nay (UNTIL) rồi tạo chuỗi mới từ mai.
// Chuỗi chưa có lần lặp nào tới hôm nay (vd vừa tạo hôm nay) → sửa / xoá thẳng, nên sửa nhiều lần trong một ngày vẫn chỉ ra một bản.
// N = null là xoá. Trả về hàm hoàn tác.
async function tplApply(old, N) {
  const A = api(), T = tomorrowStr();
  if (!old) { const x = await A.createSeries(N, T); return () => A.deleteSeries(x.id); }
  if (old.from >= T) {
    if (!N) { await A.deleteSeries(old.id); return () => A.createSeries(old, old.from); }
    await A.updateSeries(old.id, Object.assign({}, N, { until: old.until }), T);
    return () => A.updateSeries(old.id, old, old.from);
  }
  await A.endSeries(old, todayStr());
  let x = null;
  if (N) {
    try { x = await A.createSeries(Object.assign({}, N, { until: old.until }), T); }
    catch (e) { try { await A.endSeries(old, old.until); } catch {} throw e; }   // tạo chuỗi mới lỗi: nối lại chuỗi cũ, không để mất khối
  }
  return async () => { if (x) await A.deleteSeries(x.id); await A.endSeries(old, old.until); };
}
const TPL_DAYS = [1, 2, 3, 4, 5, 6, 0];
const REM_OPTS = [["0", "Đúng giờ"], ["10", "Trước 10 phút"], ["30", "Trước 30 phút"], ["none", "Không nhắc"]];
const remKeyOf = rem => { if (!rem || !rem.length) return "none"; const m = Math.max(...rem); return m >= 30 ? "30" : m >= 10 ? "10" : "0"; };
const remFromKey = k => (k === "none" ? [] : k === "0" ? [0] : [+k, 0]);
const tplDaysLabel = days => (days.length === 7 ? "Mỗi ngày" : daysLabel(days));
const hmShort = t => t.replace(/^0(\d)/, "$1");
async function tplLoad() { S.tplList = await api().listSeries(); S.tplErr = false; return S.tplList; }
function openTpl() {
  S.tplOpen = true; S.tplList = null; S.tplErr = false; S.tplDay = addDays(startOfDay(new Date()), 1).getDay();   // chọn sẵn thứ của ngày mai
  $("#btnCompose").hidden = true; document.body.classList.add("no-dock"); closeCompose();
  window.scrollTo({ top: 0 }); renderToday();
  return tplLoad().catch(e => { S.tplErr = true; handleErr(e); }).then(() => { if (S.tplOpen && S.view === "today") renderToday(); });
}
function closeTpl() {
  S.tplOpen = false;
  $("#btnCompose").hidden = S.view !== "today"; document.body.classList.toggle("no-dock", S.view !== "today");
  window.scrollTo({ top: 0 }); renderToday();
}
function renderTpl() {
  const v = $("#view-today"), k = S.tplDay;
  let html = `<div class="mhead">
      <button class="icon-btn" id="tplBack" aria-label="Quay lại Hôm nay"><i class="ph ph-arrow-left"></i></button>
      <h2>Tuần mẫu</h2>
    </div>
    <p class="muted mnote">Thay đổi áp dụng từ ngày mai (${dmy(parseYmd(tomorrowStr()))}). Muốn đổi riêng hôm nay thì bấm vào lịch ở trang Hôm nay.</p>
    <div class="vtoggle vtoggle--7" role="tablist" aria-label="Thứ trong tuần">${TPL_DAYS.map(d => `<button role="tab" data-tday="${d}" aria-selected="${d === k}" aria-label="${DOW[d]}">${DOW_SHORT[d]}</button>`).join("")}</div>`;
  if (S.tplList) html += tplTimelineHTML(k);
  else if (S.tplErr) html += `<div class="empty"><p>Chưa tải được tuần mẫu.</p><button class="btn" id="tplRetry"><i class="ph ph-arrow-clockwise"></i> Thử lại</button></div>`;
  else html += `<p class="muted tpl__load" role="status"><i class="ph ph-circle-notch spin"></i> Đang tải tuần mẫu…</p>`;
  const prev = v.querySelector(".tl--tpl .tl__scroll"), keep = prev ? prev.scrollTop : null;
  v.innerHTML = html;
  const sc = v.querySelector(".tl__scroll"); if (sc && keep != null) sc.scrollTop = keep;
}
// Một thứ trong tuần mẫu: một cột kế hoạch, khối = chuỗi lặp có thứ đó
function tplTimelineHTML(k) {
  const t0 = startOfDay(new Date()), { PAD, bodyPad, height, geo, hours, grid } = tlFrame(t0);
  const items = S.tplList.filter(x => x.days.includes(k)).map(x => ({ id: x.id, title: x.title, cat: x.cat, start: atTime(t0, x.s), end: atTime(t0, x.e), rem: x.rem }));
  const lanes = laneLayout(items, geo);
  const ev = it => {
    const g = geo(it); if (!g) return "";
    const c = CATS[it.cat] || CATS.life, time = g.h > 40 ? `<small class="num">${hm(it.start)}–${hm(it.end)}${it.rem.length ? "" : ' · <i class="ph ph-bell-slash" aria-label="không nhắc"></i>'}</small>` : "";
    return `<button class="tl__ev${g.h <= 40 ? " is-short" : ""}" data-sid="${esc(it.id)}" style="top:${g.top}px;height:${g.h}px;${laneStyle(lanes.get(it.id))}--cat:${c.hex}" title="${esc(it.title)} ${hm(it.start)}–${hm(it.end)}" aria-label="Sửa kế hoạch: ${esc(it.title)} ${hm(it.start)}–${hm(it.end)}"><span class="tl__t">${esc(it.title)}</span>${time}</button>`;
  };
  return `<div class="tl tl--tpl fade-in">
    <div class="tl__heads"><span></span><div class="tl__head">${DOW[k]}</div></div>
    <div class="tl__scroll">
      <div class="tl__body" style="${bodyPad}">
        <div class="tl__hours" style="height:${height}px">${hours}</div>
        <div class="tl__col tl__col--plan" style="height:${height}px">${items.map(ev).join("")}</div>
        ${grid}
      </div>
    </div>
  </div>`;
}
// Sheet thêm / sửa một khối lặp. s = null là thêm mới, bắt đầu lúc startHm vào thứ đang chọn.
function renderTplForm(s, startHm) {
  S.tplEdit = s ? s.id : null;
  let t = s;
  if (!t) {   // dài 30 phút, hoặc tới khối kế tiếp cùng thứ (nếu cách từ 15 phút)
    const k = S.tplDay, t0 = startOfDay(new Date()), st = atTime(t0, startHm);
    const next = S.tplList.filter(x => x.days.includes(k) && x.s > startHm).sort((a, b) => (a.s < b.s ? -1 : 1))[0];
    let en = new Date(+st + 30 * 60000);
    if (next && atTime(t0, next.s) < en && atTime(t0, next.s) - st >= 15 * 60000) en = atTime(t0, next.s);
    t = { title: "", cat: "build", days: [k], s: startHm, e: hm(en), habit: "", ess: false, rem: [0] };
  }
  const catOpts = Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === t.cat ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  const cur = t.habit && H[t.habit];   // id lạ (thói quen không còn) thì coi như Không gắn
  const habOpts = `<option value="">Không</option>` + HABITS.map(h => `<option value="${esc(h.id)}" ${h.id === t.habit ? "selected" : ""}>${esc(h.name)}</option>`).join("")
    + (cur && cur.off ? `<option value="${esc(cur.id)}" selected>${esc(cur.name)} (đã ngừng)</option>` : "");
  const rk = remKeyOf(t.rem);
  openSheet(s ? "Sửa kế hoạch" : "Thêm kế hoạch", `<div id="tForm">
    <div class="act" style="${catVars(t.cat)}" id="tBox">
      <input class="input" type="text" id="tTitle" value="${esc(t.title)}" placeholder="Định làm gì?" aria-label="Tên kế hoạch" maxlength="80"${s ? "" : ` style="grid-column:1/-1"`}>
      ${s ? `<button type="button" class="icon-btn act__rm" id="tDel" aria-label="Xoá kế hoạch này"><i class="ph ph-trash"></i></button>` : ""}
      <select class="input" id="tCat" aria-label="Nhóm">${catOpts}</select>
      <div class="act__times"><input class="input num" type="time" id="tStart" value="${t.s}" aria-label="Bắt đầu"><span class="faint">–</span><input class="input num" type="time" id="tEnd" value="${t.e}" aria-label="Kết thúc"></div>
    </div>
    <div class="field"><span>Lặp vào các thứ</span><div class="daypick" role="group" aria-label="Lặp vào các thứ">
      ${TPL_DAYS.map(d => `<button type="button" data-hday="${d}" aria-pressed="${t.days.includes(d)}">${DOW_SHORT[d]}</button>`).join("")}
    </div></div>
    <label class="field"><span>Làm xong thì đạt thói quen</span><select id="tHabit">${habOpts}</select></label>
    <div class="tpl__hint" id="tHint" hidden></div>
    <label class="field"><span>Nhắc</span><select id="tRem">${REM_OPTS.map(([v, l]) => `<option value="${v}" ${v === rk ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="switchrow" id="tEssRow" ${rk === "none" ? "hidden" : ""}><span>Vẫn nhắc khi rest day</span><input type="checkbox" class="switch" id="tEss" ${t.ess ? "checked" : ""}></label>
    <p class="tpl__from"><i class="ph ph-calendar-check"></i> Áp dụng từ ngày mai, ${fmtDate(parseYmd(tomorrowStr()))}.</p>
    <p class="act__warn" id="tErr" hidden></p>
    </div>
    <div class="sheet-actions"><button class="btn" data-close>Hủy</button><button class="btn btn--primary" id="tSave"><i class="ph ph-check"></i> Lưu</button></div>`);
  tplHint();
  if (!s) setTimeout(() => $("#tTitle") && $("#tTitle").focus(), 50);
}
const tplFormDays = () => $$("#tForm [data-hday]").filter(b => b.getAttribute("aria-pressed") === "true").map(b => +b.dataset.hday).sort();
// Lịch thói quen (từ ngày mai) khác ngày lặp của khối → câu nhắc; trùng, hoặc thói quen số lần/tuần (ngày nào cũng được) → null
function habDaysMismatch(hb, days) {
  const sc = sch(hb, tomorrowStr());
  if (!days.length || sc.freq === "weekly") return null;
  const hd = sc.freq === "daily" ? ALL : sc.days;
  if (JSON.stringify([...hd].sort()) === JSON.stringify([...days].sort())) return null;
  return `Thói quen ${hb.name} đang tính ${freqLabel(sc)}, kế hoạch này lặp ${tplDaysLabel(days)}.`;
}
function tplHint() {
  const el = $("#tHint"); if (!el) return;
  const hb = H[$("#tHabit").value], msg = hb && !hb.off ? habDaysMismatch(hb, tplFormDays()) : null;
  el.hidden = !msg;
  el.innerHTML = msg ? `<p><i class="ph ph-info"></i> ${esc(msg)}</p><button type="button" class="btn btn--block" id="tHabSync"><i class="ph ph-arrows-clockwise"></i> Lưu & đổi lịch thói quen</button>` : "";
}
function readTplForm() {
  const old = S.tplEdit ? (S.tplList || []).find(x => x.id === S.tplEdit) : null;
  const title = $("#tTitle").value.trim();
  if (!title) return { err: "Đặt tên cho kế hoạch nhé.", el: "#tTitle" };
  const days = tplFormDays();
  if (!days.length) return { err: "Chọn ít nhất một thứ.", el: "#tForm [data-hday]" };
  const s = $("#tStart").value || (old ? old.s : "09:00");
  let e = $("#tEnd").value || (old ? old.e : "");
  if (!(e > s)) { e = hm(new Date(+atTime(new Date(), s) + 15 * 60000)); if (!(e > s)) e = "23:59"; }
  const rk = $("#tRem").value;
  const N = { key: old ? old.key : "", title, cat: $("#tCat").value, days, s, e, habit: $("#tHabit").value || (old && old.habit && !H[old.habit] ? old.habit : ""), ess: $("#tEss").checked,
    rem: old && remKeyOf(old.rem) === rk ? old.rem : remFromKey(rk) };   // không đổi ô Nhắc thì giữ nguyên kiểu nhắc cũ
  return { old, N };
}
const TPL_F = ["title", "cat", "days", "s", "e", "habit", "ess", "rem"];
const tplSame = (a, b) => TPL_F.every(k => JSON.stringify(a[k]) === JSON.stringify(b[k]));
async function saveTplForm() {
  const r = readTplForm(), err = $("#tErr");
  if (r.err) { err.innerHTML = `<i class="ph ph-warning"></i> ${esc(r.err)}`; err.hidden = false; const el = $(r.el); if (el) el.focus(); return false; }
  if (r.old && tplSame(r.old, r.N)) { closeSheet(); return r; }
  const undo = await tplApply(r.old, r.N);
  await tplLoad(); closeSheet(); renderToday();
  toast(r.old ? "Đã lưu, áp dụng từ ngày mai" : `Đã thêm: ${r.N.title}`, 2600, async () => { await undo(); await tplLoad(); });
  return r;
}
async function deleteTpl() {
  const old = (S.tplList || []).find(x => x.id === S.tplEdit); if (!old) return closeSheet();
  const undo = await tplApply(old, null);
  await tplLoad(); closeSheet(); renderToday();
  toast(`Đã xoá ${old.title} từ ngày mai`, 2600, async () => { await undo(); await tplLoad(); });
}
// Sau khi lưu khối: mở Sửa thói quen, điền sẵn lịch theo ngày lặp của khối (áp dụng từ mai). Người dùng tự bấm Lưu.
function openHabSync(hid, days) {
  if (!H[hid]) return;
  renderHabForm(hid);
  const f = days.length === 7 ? "daily" : "days";
  setHabFreq(f);
  $$("#hForm [data-hday]").forEach(b => b.setAttribute("aria-pressed", f === "days" && days.includes(+b.dataset.hday)));
  $("#hFrom").value = tomorrowStr();
  const note = document.createElement("p"); note.className = "hai__note"; note.setAttribute("role", "status");
  note.innerHTML = `<i class="ph ph-info"></i> Đã điền ngày theo lịch vừa lưu, áp dụng từ ngày mai. Xem lại rồi bấm Lưu.`;
  $("#hForm").prepend(note);
}
// Dòng "Nhắc qua khối" ở sheet Sửa thói quen: thói quen chỉ được nhắc qua khối lịch có gắn nó
function habBlocksText(id) {
  const list = (S.tplList || []).filter(x => x.habit === id).sort((a, b) => (a.s < b.s ? -1 : 1));
  if (!list.length) return "Chưa có lịch nào trong Tuần mẫu gắn với thói quen này, nên sẽ không có nhắc.";
  return "Nhắc qua lịch: " + list.map(x => `${x.title} · ${hmShort(x.s)} · ${tplDaysLabel(x.days)}${x.rem.length ? "" : " (không nhắc)"}`).join("; ");
}
async function fillHabBlocks(id) {
  const el = $("#hBlocks"); if (!el) return;
  try { await tplLoad(); } catch (e) { console.warn("tpl", e); el.hidden = true; return; }
  const now = $("#hBlocks"); if (now && S.habEdit === id) now.querySelector("span").textContent = habBlocksText(id);
}

// Sửa / xoá một việc đã ghi
function renderActEdit(a) {
  S.editAct = a.id;
  const catOpts = Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === a.cat ? "selected" : ""}>${c.name}</option>`).join("");
  openSheet("Sửa việc đã làm", `<div class="act" style="${catVars(a.cat)}">
      <input class="input" type="text" id="eTitle" value="${esc(a.title)}" aria-label="Tên việc">
      <button type="button" class="icon-btn act__rm" id="eDel" aria-label="Xoá việc này"><i class="ph ph-trash"></i></button>
      <select class="input" id="eCat" aria-label="Nhóm">${catOpts}</select>
      <div class="act__times"><input class="input num" type="time" id="eStart" value="${hm(a.start)}" aria-label="Bắt đầu"><span class="faint">–</span><input class="input num" type="time" id="eEnd" value="${hm(a.end)}" aria-label="Kết thúc"></div>
    </div>
    <div class="sheet-actions"><button class="btn" data-close>Hủy</button><button class="btn btn--primary" id="eSave"><i class="ph ph-check"></i> Lưu</button></div>`);
}
async function saveActEdit() {
  const old = S.today.actual.find(a => a.id === S.editAct); if (!old) return closeSheet();
  const day = startOfDay(old.start);
  let s = atTime(day, $("#eStart").value || hm(old.start)), e = atTime(day, $("#eEnd").value || hm(old.end));
  if (e <= s) e = new Date(s.getTime() + 15 * 60000);
  await applyActTime(old, { title: $("#eTitle").value.trim() || old.title, cat: $("#eCat").value, start: s, end: e }); closeSheet();
}
// Sửa một việc đã làm, có hoàn tác. Sheet sửa và kéo-thả dùng chung.
async function applyActTime(old, next, msg = "Đã sửa") {
  const prev = Object.assign({}, old);
  const swap = it => { S.today.actual = S.today.actual.map(a => (a.id === it.id ? Object.assign({}, it, { plan: it.plan || prev.plan, kind: "act" }) : a)); };
  swap(await api().updateActual(Object.assign({}, old, next)));
  toast(msg, 2600, async () => swap(await api().updateActual(prev)));
}
async function deleteAct() {
  const old = S.today.actual.find(a => a.id === S.editAct); if (!old) return closeSheet();
  await api().deleteActual(old.id);
  S.today.actual = S.today.actual.filter(a => a.id !== old.id); closeSheet();
  toast("Đã xoá", 2600, async () => {
    const it = await api().addActual({ title: old.title, cat: old.cat, start: old.start, end: old.end, plan: old.plan, habit: old.habit });
    it.plan = old.plan || ""; S.today.actual.push(it);
  });
}

function handleErr(e) {
  console.error(e);
  if (e.needKey) return toast(e.message, 6000, () => renderSettings(), { label: "Mở Cài đặt", icon: "ph-gear-six", done: null });
  toast(e.message || "Có lỗi xảy ra", 4200);
  if (e.auth) render();   // hết phiên giữa chừng: tab đang mở chuyển sang thẻ đăng nhập lại (sheet đang mở giữ nguyên chữ)
}

// Nhận cấu hình tìm thấy trên Drive; lấy luôn Gemini key nếu máy này chưa có
function adoptCfg(found) {
  S.cfg = found; LS.set("cfg", S.cfg);
  if (Array.isArray(found.habits)) { LS.set("habits", found.habits); useHabits(found.habits); }   // máy mới: lấy ngay danh sách thói quen
  if (found.geminiKey && !S.settings.geminiKey) { S.settings.geminiKey = found.geminiKey; saveSettings(); }
}
// ============================================================ render orchestration
function header() {
  const now = new Date(), h = now.getHours();
  $("#greet").textContent = h < 5 ? "Khuya rồi" : h < 11 ? "Chào buổi sáng" : h < 14 ? "Buổi trưa" : h < 18 ? "Buổi chiều" : "Buổi tối";
  $("#dateTitle").textContent = fmtDate(now);
}
function render() {
  const step = gateStep();
  if (step) return renderGate(step);
  hideGate(); header();
  if (S.view === "today") renderToday();
  if (S.view === "habits") renderHabits();
  if (S.view === "journal") renderJournal();
}
async function refresh() {
  // Đã đăng nhập nhưng máy này chưa có cấu hình (vd máy thứ hai): tự tìm bộ lịch có sẵn trên Drive
  // (chỉ tìm một lần mỗi phiên mở app, để màn "Lịch của bạn" không gọi Drive liên tục)
  if (!S.settings.demo && !S.cfg && signedIn() && !S.cfgLooked) {
    S.cfgLooked = true;
    try { const found = await Google.findConfig(); if (found) { adoptCfg(found); toast("Đã nối vào lịch Still life của bạn"); } }
    catch (e) { handleErr(e); }
  }
  loadLocalHabits();   // đổi giữa demo và thật thì đổi luôn danh sách
  if (!ready() || gateStep()) return render();   // cổng đang che app thì chưa tải dữ liệu
  if (!S.settings.demo && S.cfg && S.cfg.configFileId && !S.habLooked) {
    S.habLooked = true;
    Google.readConfig(S.cfg.configFileId).then(c => {
      // Cấu hình cũ chưa có habits: chốt danh sách đang dùng (đã lưu trong máy, hoặc bộ mẫu cũ) thành danh sách riêng trên Drive, một lần
      if (!Array.isArray(c.habits)) { LS.set("habits", ALLH); return Google.pushHabits(ALLH); }
      if (JSON.stringify(c.habits) === JSON.stringify(LS.get("habits", null))) return;
      LS.set("habits", c.habits); useHabits(c.habits); render();
    }).catch(e => console.warn("habits", e));
  }
  try { await loadToday(); render(); loadHistory().then(() => { if (S.view === "habits") renderHabits(); }).catch(handleErr); }
  catch (e) { handleErr(e); render(); }
}
function setView(v) {
  S.view = v; S.tplOpen = false;   // bấm tab (kể cả Hôm nay) thì rời trang Tuần mẫu
  if (v === "habits") S.habManage = false;   // bấm tab Thói quen thì về trang chính của tab
  $$(".tab").forEach(t => t.classList.toggle("is-on", t.dataset.view === v));
  $$(".view").forEach(s => (s.hidden = s.id !== "view-" + v));
  closeCompose(); $("#btnCompose").hidden = v !== "today";
  document.body.classList.toggle("no-dock", v !== "today");
  window.scrollTo({ top: 0 });
  render();
}

// ============================================================ events
function autosize() { const t = $("#inputText"); t.style.height = "auto"; t.style.height = Math.min(Math.round(innerHeight * 0.6), t.scrollHeight + 2) + "px"; }

// Nút đang chạy: khoá + chỉ còn vòng quay, giữ nguyên kích thước nút. label chỉ cho trình đọc màn hình.
// Trả về hàm trả nút về như cũ (dùng khi lỗi; thành công thì render lại thay nút mới).
function busy(el, label = "Đang xử lý") {
  const html = el.innerHTML, w = el.style.width, h = el.style.height, aria = el.getAttribute("aria-label");
  if (el.offsetWidth) { el.style.width = el.offsetWidth + "px"; el.style.height = el.offsetHeight + "px"; }
  el.disabled = true; el.classList.add("is-busy"); el.setAttribute("aria-busy", "true"); el.setAttribute("aria-label", label);
  el.innerHTML = `<i class="ph ph-circle-notch spin" aria-hidden="true"></i>`;
  return () => {
    el.disabled = false; el.classList.remove("is-busy"); el.removeAttribute("aria-busy"); el.innerHTML = html; el.style.width = w; el.style.height = h;
    if (aria == null) el.removeAttribute("aria-label"); else el.setAttribute("aria-label", aria);
  };
}

document.addEventListener("click", async e => {
  if (Date.now() - Drag.dropped < 400 && e.target.closest(".tl__col")) return;   // cú click ngay sau khi thả khối
  const el = e.target.closest("button, [data-close]");
  if (!el) {   // chỗ trống ở cột Kế hoạch → thêm khối (làm tròn xuống 15 phút)
    const col = e.target.closest(".tl__col--plan"); if (!col) return;
    const m = yToMin(col, e.clientY);
    const q = Math.max(TL.H0 * 60, Math.min(TL.H1 * 60 - 15, Math.floor(m / 15) * 15));
    const st = startOfDay(new Date()); st.setMinutes(q);
    return col.closest(".tl--tpl") ? renderTplForm(null, hm(st)) : renderPlanAdd(st);
  }
  if (el.matches("[data-close]")) return closeSheet();
  if (el.id === "btnCompose") return openCompose();
  if (el.id === "dockBackdrop") return closeCompose();
  if (el.id === "btnManual") return openManual();
  if (el.classList.contains("toast__undo")) {
    const fn = toast._undo, done = toast._done; hideToast(); if (!fn) return;
    if (done === null) return fn();
    try { await fn(); toast(done); } catch (er) { handleErr(er); }
    return render();
  }
  if (el.classList.contains("tab") && el.dataset.view) return setView(el.dataset.view);
  const id = el.id;
  if (id === "btnSettings") return renderSettings();
  if (id === "gLogin") return gateLogin(el);
  if (id === "gKeySave") return gateKey(el);
  if (id === "gKeyLater") { S.settings.keyLater = true; saveSettings(); return refresh(); }
  if (id === "gSetup") return gateSetup(el);
  if (id === "gDemo") { S.settings.demo = true; saveSettings(); return refresh(); }
  if (id === "sIn") { try { await signIn(false); closeSheet(); await refresh(); } catch (er) { handleErr(er); } return; }
  if (id === "sOut") { signOut(); closeSheet(); return render(); }   // → cổng bước 1
  if (id === "sDemoOff") { S.settings.demo = false; saveSettings(); closeSheet(); return refresh(); }
  if (id === "sDemoReset") { Demo.reset(); location.reload(); return; }
  if (id === "sTest") return testConnection();
  if (id === "sSave") {
    S.settings.model = $("#sModel").value;
    S.settings.clientId = $("#sClient").value.trim() || DEFAULT_CLIENT_ID; saveSettings();
    await saveKey($("#sKey").value, true);
    if ($("#sKeyState").classList.contains("is-bad")) return;   // giữ sheet mở để sửa key
    closeSheet(); toast("Đã lưu cài đặt"); return render();
  }
  if (id === "btnTpl") return openTpl();
  if (id === "tplBack") return closeTpl();
  if (id === "tplRetry") return openTpl();
  if (el.dataset.tday) { S.tplDay = +el.dataset.tday; return renderTpl(); }
  if (el.dataset.sid) { const x = (S.tplList || []).find(y => y.id === el.dataset.sid); if (x) renderTplForm(x); return; }
  if (id === "tSave") { const done = busy(el, "Đang lưu"); try { if (!(await saveTplForm())) done(); } catch (er) { done(); handleErr(er); } return; }
  if (id === "tDel") { const done = busy(el, "Đang xoá"); try { await deleteTpl(); } catch (er) { done(); handleErr(er); } return; }
  if (id === "tHabSync") {
    const done = busy(el, "Đang lưu");
    try { const r = await saveTplForm(); if (!r) return done(); openHabSync(r.N.habit, r.N.days); } catch (er) { done(); handleErr(er); }
    return;
  }
  if (id === "btnOpenCal") return window.open("https://calendar.google.com/calendar/r/day", "_blank", "noopener");
  if (id === "btnUnwell") { busy(el, "Đang chuyển sang ngày nhẹ nhàng"); try { await setUnwell(true); toast("Rest day. Nghỉ ngơi nhé", 2600, () => setUnwell(false)); } catch (er) { handleErr(er); } return render(); }
  if (id === "eSave") { const done = busy(el, "Đang lưu"); try { await saveActEdit(); } catch (er) { done(); handleErr(er); } return renderToday(); }
  if (id === "eDel") { const done = busy(el, "Đang xoá"); try { await deleteAct(); } catch (er) { done(); handleErr(er); } return renderToday(); }
  if (id === "pAdd") { const done = busy(el, "Đang thêm"); try { if (!(await savePlanAdd())) { done(); return; } } catch (er) { done(); handleErr(er); } return renderToday(); }
  if (id === "pDel") { const done = busy(el, "Đang xoá"); try { await deletePlanAdded(); } catch (er) { done(); handleErr(er); } return renderToday(); }
  if (id === "pSave") { const done = busy(el, "Đang lưu"); try { await savePlanEdit(); } catch (er) { done(); handleErr(er); } return renderToday(); }
  if (el.dataset.pid) { const p = S.today.plan.find(x => x.id === el.dataset.pid); if (p) renderPlanEdit(p); return; }
  if (el.dataset.aid) { const a = S.today.actual.find(x => x.id === el.dataset.aid); if (a) renderActEdit(a); return; }
  if (id === "hManage") { S.habManage = true; window.scrollTo({ top: 0 }); return renderHabits(); }
  if (id === "hBack") { S.habManage = false; window.scrollTo({ top: 0 }); return renderHabits(); }
  if (id === "hAdd") return renderHabForm(null);
  if (el.dataset.hedit) return renderHabForm(el.dataset.hedit);
  if (el.dataset.hmove) return moveHabit(el.dataset.hmove, +el.dataset.dir);
  if (el.dataset.hicon) { $$("[data-hicon]").forEach(b => b.setAttribute("aria-checked", b === el)); return; }
  if (el.dataset.hfreq) return setHabFreq(el.dataset.hfreq);
  if (el.dataset.hday) { el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") !== "true"); if (el.closest("#tForm")) tplHint(); return; }
  if (id === "hAiGo") return openHabAi();
  if (id === "hSave") { const done = busy(el, "Đang lưu"); try { if (!(await saveHabForm())) done(); } catch (er) { done(); handleErr(er); } return; }
  if (id === "hStop" || id === "hResume" || id === "hDelete") {
    const h = H[S.habEdit]; if (!h) return closeSheet();
    if (id === "hDelete") return habChange(ALLH.filter(x => x.id !== h.id), `Đã xoá: ${h.name}`);
    // Theo dõi lại: tính từ hôm nay, những ngày đã ngừng không thành "bỏ"
    const upd = id === "hStop" ? Object.assign({}, h, { off: true }) : Object.assign({}, h, { off: false, since: todayStr() });
    if (!upd.off) delete upd.off;
    return habChange(ALLH.map(x => (x.id === h.id ? upd : x)), id === "hStop" ? `Đã ngừng: ${h.name}` : `Theo dõi lại: ${h.name}`);
  }
  if (el.dataset.hview) { S.habView = el.dataset.hview; LS.set("habView", S.habView); return renderHabits(); }
  if (el.dataset.month) {
    const cm = S.calMonth, d = new Date(cm.y, cm.m + +el.dataset.month, 1);
    S.calMonth = { y: d.getFullYear(), m: d.getMonth() };
    await ensureDays(mondayOf(d), addDays(new Date(d.getFullYear(), d.getMonth() + 1, 0), 7));
    return renderHabits();
  }
  if (el.dataset.week) {
    const mon = addDays(S.habWeek ? parseYmd(S.habWeek) : mondayOf(new Date()), 7 * +el.dataset.week);
    S.habWeek = ymd(mon);
    await ensureDays(mon, addDays(mon, 7));
    return renderHabits();
  }
  if (el.dataset.day) return renderDaySheet(el.dataset.day);
  if (el.dataset.dh) {
    // Đổi nút ngay, icon thói quen bên trái quay vòng tới khi lưu xong. Lỗi thì vẽ lại theo dữ liệu thật.
    const date = S.dayDate, hid = el.dataset.dh, row = el.closest(".dayrow"), ic = row && row.querySelector("[data-ic]");
    if (row) {
      row.querySelectorAll("[data-dh]").forEach(b => b.setAttribute("aria-pressed", String(b === el)));
      row.dataset.saving = +(row.dataset.saving || 0) + 1; row.setAttribute("aria-busy", "true");
      if (ic) ic.className = "ph ph-circle-notch spin";
    }
    let failed = false;
    try { await queueHabit(date, hid, el.dataset.lv || null); } catch (er) { failed = true; handleErr(er); }
    if (row && !(row.dataset.saving = row.dataset.saving - 1)) { row.removeAttribute("aria-busy"); if (ic) ic.className = `ph ${ic.dataset.ic}`; }
    if (failed && S.dayDate === date && row && row.isConnected) renderDaySheet(date);
    return S.view === "habits" ? renderHabits() : renderToday();
  }
  if (id === "btnLate" || id === "btnLateRedo") return openLateAi();
  if (id === "lRetell") return openLateAi(S.late ? hm(S.late.wake) : null);
  if (el.dataset.lt && S.late) return lateEditTime(el.dataset.lt);
  if (el.dataset.lskip && S.late) { S.late.res.set(el.dataset.lskip, { skip: true }); return renderLateSheet(); }
  if (el.dataset.lkeep && S.late) {   // giữ lại: khối chưa tới giờ về giờ gốc, khối đã qua giờ thì chọn giờ mới
    const k = el.dataset.lkeep, b = S.late.base.find(x => x.k === k); if (!b) return;
    if (b.end > floor15(new Date())) { S.late.res.delete(k); return renderLateSheet(); }
    return lateEditTime(k);
  }
  if (el.dataset.llv != null && S.late && S.late.hab) {
    S.late.hab.lv = el.dataset.llv;
    $$("#sheetBody [data-llv]").forEach(b => b.setAttribute("aria-pressed", b.dataset.llv === S.late.hab.lv));
    return;
  }
  if (id === "lApply") {
    const done = busy(el, "Đang sắp lại lịch");
    try { const undo = await applyLate(); closeSheet(); render(); toast("Đã sắp lại lịch hôm nay", 2600, undo); }
    catch (er) { done(); handleErr(er); try { await loadToday(); } catch {} render(); }
    return;
  }
  if (id === "btnLateUndo") {
    busy(el, "Đang trả lại lịch cũ");
    try { await undoLate(); toast("Đã trả lại lịch cũ"); } catch (er) { handleErr(er); try { await loadToday(); } catch {} }
    return render();
  }
  if (id === "btnUnwellOff") { busy(el, "Đang bật lại lịch"); try { await setUnwell(false); toast("Đã bật lại lịch bình thường"); } catch (er) { handleErr(er); } return render(); }
  if (id === "cSave") return savePending();
  if (el.dataset.act) {
    if (el.dataset.act === "other") { S.otherFor = el.dataset.id; return openCompose("Đang làm gì thay vào đó?"); }
    busy(el);
    try { if (el.dataset.act === "undo") await unmarkBlock(el.dataset.id); else await markBlock(el.dataset.id, el.dataset.act); } catch (er) { handleErr(er); }
    return render();
  }
  if (el.dataset.habit || el.dataset.habitMin) {
    const isMin = !!el.dataset.habitMin, hid = el.dataset.habit || el.dataset.habitMin;
    const cur = (S.today.rec || {}).h?.[hid], want = isMin ? "min" : "full";
    const nextLv = cur === want ? null : want;
    const chip = el.closest(".chip"); if (chip) chip.dataset.st = nextLv || "pending";
    try { await queueHabit(todayStr(), hid, nextLv); } catch (er) { handleErr(er); }
    return renderToday();
  }
  if (el.dataset.rm != null && S.pending) {
    syncPending();
    S.pending.activities.splice(+el.dataset.rm, 1); S.pending.edited = true; return renderConfirm(S.pending);
  }
  if (el.id === "cAddAct" && S.pending) {
    syncPending();
    const acts = S.pending.activities; acts.push(nextActivity(acts[acts.length - 1]));
    renderConfirm(S.pending);
    const t = $$('#sheetBody [data-f="title"]').pop(); if (t) { t.focus(); t.scrollIntoView({ block: "center" }); }
    return;
  }
  if (el.dataset.hi != null && S.pending) {
    $$("#sheetBody .act").forEach(a => { const it = S.pending.activities[+a.dataset.i]; $$("[data-f]", a).forEach(inp => (it[inp.dataset.f] = inp.value)); });
    const h = S.pending.habits[+el.dataset.hi]; h.level = h.level === "full" ? "min" : h.level === "min" ? "skip" : "full";
    return renderConfirm(S.pending);
  }
  if (el.dataset.jdate) {
    const f = (S.jfiles || []).find(x => x.date === el.dataset.jdate); if (!f) return;
    let j; try { j = parseJournal(await api().readJournal(f)); } catch (er) { return handleErr(er); }
    S.jopen = j;
    return journalSheet(f, j);
  }
  if (el.id === "jEditPage") {
    const ds = el.dataset.date;
    $("#sheetBody").innerHTML = `<form id="jpast" data-date="${esc(ds)}">${journalFormFields(S.jopen || {})}
      <button class="btn btn--primary btn--block" type="submit"><i class="ph ph-floppy-disk"></i> Lưu</button></form>`;
    const t = $("#jpast textarea"); if (t) t.focus();
    return;
  }
});

document.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id === "dock") return dockSend($("#inputText").value);
  if (e.target.id === "jform" || e.target.id === "jpast") {
    // jform (form trống ở trang): nối vào trang hôm nay nếu đã có. jpast (Sửa trong sheet): ghi đè đúng trang đó.
    const fd = new FormData(e.target), add = Object.fromEntries(fd.entries()), day = e.target.dataset.date || todayStr(), past = e.target.id === "jpast";
    if (!JFIELDS.some(([k]) => (add[k] || "").trim())) return toast("Viết ít nhất một dòng nhé");
    const done = busy($("button[type=submit]", e.target), "Đang lưu nhật ký");
    try {
      S.jfiles = S.jfiles || [];
      const tf = S.jfiles.find(x => x.date === day);
      const f = past || !tf ? add : mergeJournal(parseJournal(await api().readJournal(tf)), add);
      const saved = await api().saveJournal(day, journalMd(day, f), tf);
      if (tf) tf.mod = saved.mod; else { S.jfiles.unshift(saved); S.jfiles.sort((a, b) => (a.date < b.date ? 1 : -1)); }
      const lines = ["vui", "bietOn", "mai"].filter(k => (f[k] || "").trim()).length;
      await setHabit(day, "journal", lines >= 3 ? "full" : "min");
      S.jprev = S.jprev || {}; S.jprev[day] = firstLine(f);
      S.jdirty = false;
      if (past) { closeSheet(); drawJournal(day); return toast("Đã lưu"); }
      drawJournal(day);
      const row = $("#view-journal .jlist .is-new"); if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
      return toast(lines >= 3 ? "Đã lưu. Ngủ ngon nhé" : "Đã lưu (bản tối thiểu)");
    } catch (er) { handleErr(er); }
    done();
  }
});

$("#inputText").addEventListener("input", autosize);
document.addEventListener("input", e => { if (e.target.closest("#jform")) S.jdirty = true; });
document.addEventListener("input", e => { if (e.target.type === "time" && e.target.closest(".act")) timeWarn(e.target.closest(".act")); });
// Thẻ việc trong sheet xác nhận: đổi ngày → cập nhật chữ "Hôm qua"/thứ và màu; đổi nhóm → đổi màu viền
document.addEventListener("change", e => {
  const box = e.target.closest("#sheetBody .act"); if (!box) return;
  if (e.target.dataset.f === "date") {
    const ds = validDay(e.target.value); e.target.value = ds;
    box.querySelector(".act__date").classList.toggle("is-other", ds !== todayStr());
    box.querySelector(".act__dayhint").textContent = dayHint(ds);
  }
  if (e.target.dataset.f === "category") box.setAttribute("style", catVars(e.target.value));
});
// Key tự lưu ngay khi dán hoặc rời ô, không cần nhớ bấm "Lưu cài đặt"
document.addEventListener("change", e => { if (e.target.id === "pCat") $("#pAddBox").setAttribute("style", catVars(e.target.value)); });
document.addEventListener("change", e => { if (e.target.id === "tCat") $("#tBox").setAttribute("style", catVars(e.target.value)); if (e.target.id === "tHabit") tplHint(); if (e.target.id === "tRem") $("#tEssRow").hidden = e.target.value === "none"; });
document.addEventListener("change", e => { if (e.target.id === "sModel") { S.settings.model = e.target.value; saveSettings(); } });
document.addEventListener("change", e => { if (e.target.id === "sKey") saveKey(e.target.value).then(() => { if (S.view === "today" && !ready()) renderToday(); }); });
document.addEventListener("paste", e => { if (e.target.id === "sKey") setTimeout(() => saveKey(e.target.value).then(() => { if (S.view === "today" && !ready()) renderToday(); }), 0); });

// Bộ chọn giờ trong app: hộp chọn giờ của Android bị cắt nút "Set" trên vài máy (Vivo X200 Pro mini),
// nên ô giờ để readonly và mở bộ chọn này. Chọn xong thì gán value + phát input/change như ô giờ thường.
const TP = (() => {
  const H = 44; let target = null, custom = null;   // custom: { title, value, ok (html nút chính), onOk(v, nút) } — dùng không cần ô giờ
  const el = document.createElement("div");
  el.className = "tp"; el.hidden = true;
  const col = (n, k) => `<div class="tp__col" data-k="${k}" tabindex="0" role="listbox" aria-label="${k === "h" ? "Giờ" : "Phút"}">${Array.from({ length: n }, (_, i) => `<div class="tp__it" data-v="${i}">${String(i).padStart(2, "0")}</div>`).join("")}</div>`;
  el.innerHTML = `<div class="tp__backdrop" data-tp-close></div>
    <div class="tp__panel" role="dialog" aria-modal="true" aria-labelledby="tpTitle">
      <div class="tp__head"><h3 id="tpTitle"></h3><button type="button" class="btn btn--ghost tp__now" data-tp-now><i class="ph ph-clock"></i> Bây giờ</button></div>
      <div class="tp__wheels"><div class="tp__band" aria-hidden="true"></div>${col(24, "h")}<span class="tp__colon">:</span>${col(60, "m")}</div>
      <div class="sheet-actions"><button type="button" class="btn" data-tp-close>Hủy</button><button type="button" class="btn btn--primary" data-tp-ok><i class="ph ph-check"></i> Xong</button></div>
    </div>`;
  document.body.append(el);
  const cols = { h: $('.tp__col[data-k="h"]', el), m: $('.tp__col[data-k="m"]', el) }, okBtn = $("[data-tp-ok]", el), okHtml = okBtn.innerHTML;
  const get = c => Math.max(0, Math.min(c.children.length - 1, Math.round(c.scrollTop / H)));
  const set = (c, v, smooth) => c.scrollTo({ top: v * H, behavior: smooth ? "smooth" : "instant" });
  const mark = c => { const i = get(c); [...c.children].forEach((it, j) => { it.classList.toggle("is-on", j === i); it.setAttribute("aria-selected", j === i); }); };
  Object.values(cols).forEach(c => {
    c.addEventListener("scroll", () => mark(c), { passive: true });
    c.addEventListener("click", e => { const it = e.target.closest(".tp__it"); if (it) set(c, +it.dataset.v, true); });
    c.addEventListener("keydown", e => { const d = { ArrowUp: -1, ArrowDown: 1 }[e.key]; if (d) { e.preventDefault(); set(c, get(c) + d, true); } });
  });
  const close = () => { el.hidden = true; if (target) target.focus({ preventScroll: true }); target = null; custom = null; };
  const open = (inp, o = null) => {
    target = inp; custom = o; el.hidden = false;
    okBtn.innerHTML = o && o.ok ? o.ok : okHtml;
    $("#tpTitle", el).textContent = (o && o.title) || (inp && inp.getAttribute("aria-label")) || "Chọn giờ";
    const [h, m] = ((o && o.value) || (inp && inp.value) || hm(new Date())).split(":").map(Number);
    set(cols.h, h || 0); set(cols.m, m || 0); mark(cols.h); mark(cols.m);
    cols.h.focus({ preventScroll: true });
  };
  el.addEventListener("click", e => {
    if (e.target.closest("[data-tp-close]")) return okBtn.disabled ? null : close();   // đang sắp lịch thì chưa cho đóng
    if (e.target.closest("[data-tp-now]")) { const n = new Date(); set(cols.h, n.getHours(), true); set(cols.m, n.getMinutes(), true); return; }
    if (e.target.closest("[data-tp-ok]")) {
      const p = n => String(n).padStart(2, "0"), inp = target;
      if (custom) { if (!okBtn.disabled) custom.onOk(`${p(get(cols.h))}:${p(get(cols.m))}`, okBtn); return; }
      inp.value = `${p(get(cols.h))}:${p(get(cols.m))}`;
      close();
      inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  return { open, close, isOpen: () => !el.hidden, isBusy: () => okBtn.disabled };
})();
// pointerdown đặt readonly trước khi trình duyệt kịp mở hộp chọn giờ mặc định
document.addEventListener("pointerdown", e => { if (e.target.matches?.('input[type="time"]')) e.target.readOnly = true; }, true);
document.addEventListener("click", e => { if (e.target.matches?.('input[type="time"]')) { e.preventDefault(); TP.open(e.target); } });
document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.('input[type="time"]')) { e.preventDefault(); TP.open(e.target); } });

$("#inputText").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer: fine)").matches) { e.preventDefault(); dockSend(e.target.value); } });
document.addEventListener("keydown", e => { if (e.key !== "Escape") return; if (Drag.st) Drag.cancel(); else if (TP.isOpen()) { if (!TP.isBusy()) TP.close(); } else if ($("#dock").classList.contains("is-open")) closeCompose(); else if (!$("#sheet").hidden) closeSheet(); });

// Giọng nói (Web Speech, tiếng Việt)
(() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, btn = $("#btnMic");
  if (!SR) { btn.hidden = true; return; }
  let rec = null;
  btn.addEventListener("click", () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = "vi-VN"; rec.interimResults = true; rec.continuous = false;
    const t = $("#inputText"), base = t.value ? t.value.trim() + " " : "";
    rec.onresult = ev => { t.value = base + [...ev.results].map(r => r[0].transcript).join(""); autosize(); };
    rec.onerror = ev => { if (ev.error !== "aborted" && ev.error !== "no-speech") toast("Micro lỗi: " + ev.error); };
    rec.onend = () => { btn.classList.remove("is-live"); rec = null; };
    btn.classList.add("is-live"); rec.start();
  });
})();

// Cập nhật thanh "Bây giờ" mỗi phút
setInterval(() => { if (gateStep() && $("#gate").hidden && $("#sheet").hidden) return render(); if (S.view === "today" && !S.tplOpen && !Drag.st && $("#sheet").hidden && document.activeElement !== $("#inputText")) renderToday(); }, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

refresh();
