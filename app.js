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
  life:   { name: "Sinh hoạt", short: "Sinh hoạt", color: "5", hex: "#E3AE1B", icon: "ph-house-line", lightInk: true },
  people: { name: "Người thân & bạn bè", short: "Người thân", color: "4", hex: "#D9685E", icon: "ph-users-three" },
  fun:    { name: "Giải trí có chủ đích", short: "Giải trí", color: "6", hex: "#E8592A", icon: "ph-film-strip" },
  scroll: { name: "Lướt vô thức", short: "Lướt", color: "8", hex: "#616161", icon: "ph-device-mobile" },
};

// Danh sách mặc định. Danh sách thật sửa được ở trang Quản lý thói quen, lưu trong máy + file cấu hình trên Drive.
const DEFAULT_HABITS = [
  { id: "eat",     name: "Ăn đủ 3 bữa", short: "Ăn 3 bữa", cat: "life",        icon: "ph-bowl-food",  freq: "daily", full: "3 bữa", min: "không bỏ bữa", rule: "full: ăn đủ 3 bữa. min: có 3 bữa nhưng có bữa qua loa/lệch giờ." },
  { id: "wake",    name: "Dậy 5:30", short: "Dậy 5:30", cat: "life",           icon: "ph-sun-horizon", freq: "daily", full: "5:30", min: "trước 6:00", rule: "full: dậy trước hoặc lúc 5:35. min: dậy trước 6:00." },
  { id: "korean",  name: "Tiếng Hàn 10 phút", short: "Tiếng Hàn", cat: "korean",  icon: "ph-translate",  freq: "daily", full: "10 phút", min: "5 từ mới", rule: "full: học tiếng Hàn từ 10 phút trở lên (đi lớp cũng tính). min: học ít nhất 5 từ mới. value = số phút nếu có." },
  { id: "walk",    name: "Đi bộ 3000 bước", short: "Đi bộ", cat: "health",    icon: "ph-sneaker-move", freq: "daily", full: "3000 bước", min: "2000 bước", rule: "value = số bước. full: >= 3000. min: >= 2000." },
  { id: "yoga",    name: "Yoga", short: "Yoga", cat: "health",               icon: "ph-person-simple-tai-chi", freq: "days", days: [1, 3, 5], full: "có tập", rule: "full: có tập yoga." },
  { id: "gym",     name: "Gym", short: "Gym", cat: "health",                icon: "ph-barbell",    freq: "weekly", days: [2, 6], perWeekMin: 1, perWeekFull: 2, full: "có tập", min: "1 buổi/tuần", rule: "full: có tập gym hôm đó." },
  { id: "phone",   name: "Cất điện thoại 22:00", short: "Cất máy", cat: "life", icon: "ph-moon-stars", freq: "daily", full: "22:00", min: "trước 22:30", rule: "full: cất điện thoại ra ngoài giường lúc 22:00. min: trước 22:30 hoặc bật chế độ ngủ." },
  { id: "journal", name: "Nhật ký", short: "Nhật ký", cat: "life",            icon: "ph-notebook",   freq: "daily", full: "3 dòng", min: "1 dòng", rule: "full: viết nhật ký 3 dòng. min: 1 dòng." },
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
function normHabit(x) {
  const h = normSched(Object.assign({}, x));
  h.name = String(h.name || "").trim() || "Thói quen";
  h.icon = h.icon || "ph-check-circle";
  if (!CATS[h.cat]) h.cat = (DEFAULT_HABITS.find(d => d.id === h.id) || {}).cat || "life";
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
const loadLocalHabits = () => useHabits(LS.get(habKey(), null) || DEFAULT_HABITS);
loadLocalHabits();
// Luật cho Gemini: ghi chú riêng nếu có, không thì ghép từ mức đạt / tối thiểu
const aiRule = h => (h.rule || "").trim() || `full: ${h.full || "có làm"}.${h.min ? ` min: ${h.min}.` : ""}`;
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
    habit: p.habit || (key && TPL[key] && TPL[key].habit) || "",
    plan: p.plan || "",
    ess: p.ess === "1" || !!(key && TPL[key] && TPL[key].ess),
    muted: (ev.summary || "").startsWith("💤 "),
    added: p.added === "1",
  };
}
function recFromEv(ev) {
  const p = ev.extendedProperties.private;
  const j = (s, d) => { try { return JSON.parse(s); } catch { return d; } };
  return { id: ev.id, date: p.date, h: j(p.h, {}), v: j(p.v, {}), unwell: p.unwell === "1", reason: p.reason || "", skip: j(p.skip, []), muted: j(p.muted, []) };
}
function recToProps(r) {
  return { sl: "day", date: r.date, h: JSON.stringify(r.h || {}), v: JSON.stringify(r.v || {}), unwell: r.unwell ? "1" : "0", reason: (r.reason || "").slice(0, 500), skip: JSON.stringify(r.skip || []), muted: JSON.stringify(r.muted || []) };
}
function planBody(t, firstDay) {
  return {
    summary: t.title,
    start: { dateTime: rfc(atTime(firstDay, t.s)), timeZone: TZ },
    end: { dateTime: rfc(atTime(firstDay, t.e)), timeZone: TZ },
    recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${t.days.map(d => BYDAY[d]).join(",")}`],
    colorId: CATS[t.cat].color,
    reminders: { useDefault: false, overrides: (t.rem || [0]).map(m => ({ method: "popup", minutes: m })) },
    extendedProperties: { private: { sl: "plan", key: t.key, cat: t.cat, habit: t.habit || "", ess: t.ess ? "1" : "0" } },
    transparency: "transparent",
  };
}

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
    const cfg = { planCal: plan.id, actualCal: act.id, folderId, journalFolderId, start: ymd(today), v: 1, geminiKey: cleanKey(S.settings.geminiKey) };
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
      extendedProperties: { private: { sl: "act", cat: a.cat, habit: a.habit || "", plan: a.plan || "" } },
    };
    const ev = await g(`${CAL}/calendars/${encodeURIComponent(S.cfg.actualCal)}/events`, { method: "POST", body: JSON.stringify(body) });
    const it = evToItem(ev, "act"); it.plan = a.plan || ""; return it;
  },
  async updateActual(a) {
    const body = {
      summary: a.title, start: { dateTime: rfc(a.start), timeZone: TZ }, end: { dateTime: rfc(a.end), timeZone: TZ },
      colorId: CATS[a.cat].color, extendedProperties: { private: { sl: "act", cat: a.cat, habit: a.habit || "", plan: a.plan || "" } },
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
      summary: `Thói quen · ${dmy(d)}` + (rec.unwell ? " · unwell day" : ""),
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
      const t = TPL[it.key] || {};
      const body = mute
        ? { summary: "💤 " + it.title, reminders: { useDefault: false, overrides: [] } }
        : { summary: it.title, reminders: { useDefault: false, overrides: (t.rem || [0]).map(m => ({ method: "popup", minutes: m })) } };
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
  const persist = () => LS.set("demo", { days: db.days, actual: db.actual.map(a => Object.assign({}, a, { start: +a.start, end: +a.end })), journal: db.journal, jmod: db.jmod, muted: db.muted, planEdit: db.planEdit, planExtra: db.planExtra });
  db.actual = db.actual.map(a => Object.assign(a, { start: new Date(a.start), end: new Date(a.end) }));
  return {
    async setup() { return { planCal: "demo", actualCal: "demo", start: ymd(addDays(new Date(), -60)) }; },
    async listPlan(from, to) {
      const out = [];
      for (let d = startOfDay(from); d < to; d = addDays(d, 1)) for (const t of TEMPLATE) if (t.days.includes(d.getDay())) {
        const id = `${t.key}_${ymd(d)}`;
        const ed = db.planEdit[id] || {};
        out.push({ id, kind: "plan", key: t.key, title: ed.title || t.title, start: ed.start ? new Date(ed.start) : atTime(d, t.s), end: ed.end ? new Date(ed.end) : atTime(d, t.e), cat: t.cat, habit: t.habit || "", ess: !!t.ess, muted: db.muted.includes(id) });
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
function blankRec(date) { return { id: null, date, h: {}, v: {}, unwell: false, reason: "", skip: [], muted: [] }; }
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
async function setHabit(date, id, level, value) {
  const rec = Object.assign(blankRec(date), S.days[date] || {});
  rec.h = Object.assign({}, rec.h); rec.v = Object.assign({}, rec.v);
  if (level == null) delete rec.h[id]; else rec.h[id] = level;
  if (value != null) rec.v[id] = value;
  return saveRec(rec);
}

// ============================================================ render: today
function catVars(cat) { const c = CATS[cat] || CATS.life; return `--cat:${c.hex}`; }
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
  const rec = S.today.rec || blankRec(todayStr()), now = new Date();
  const { cur, next, done, skipped } = currentBlocks();
  let html = "";

  if (unwellRun() >= 3) html += `<div class="care fade-in"><b>Mấy hôm nay bạn ổn không?</b>Đã ${unwellRun()} ngày liền là unwell day. Nếu thấy nặng nề, nhắn cho một người bạn tin tưởng hoặc tìm chuyên gia tâm lý nhé. Bạn không phải tự gồng một mình.</div>`;

  if (rec.unwell) {
    html += `<div class="unwell-card fade-in">
      <p class="now__label"><i class="ph-fill ph-hand-heart"></i> Unwell day</p>
      <h3>Hôm nay chỉ cần nhẹ nhàng thôi.</h3>
      <p class="muted" style="margin:0">Chuỗi ngày không bị gãy. Nhắc nhở các khối khác đã tắt.</p>
      <ul>
        <li><i class="ph ph-bed"></i> Ngủ thêm, dậy lúc nào cũng được</li>
        <li><i class="ph ph-bowl-food"></i> Ăn đủ 3 bữa, quan trọng nhất</li>
        <li><i class="ph ph-translate"></i> 5 từ tiếng Hàn nếu còn sức</li>
        <li><i class="ph ph-sneaker-move"></i> Đi bộ 5 đến 10 phút hoặc nằm giãn cơ</li>
        <li><i class="ph ph-moon-stars"></i> Cất điện thoại lúc 22:00</li>
      </ul>
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
    const msg = next ? `Tiếp theo <b>${esc(next.title)}</b> lúc <span class="num">${hm(next.start)}</span>.` : now.getHours() >= 22 || now.getHours() < 5 ? "Hết lịch hôm nay. Ngủ ngon nhé." : "Không có khối nào lúc này.";
    html += `<article class="now fade-in" style="${next ? catVars(next.cat) : ""}">
      <h2 class="now__title">${next ? "Thở một chút." : "Ngày đã khép lại."}</h2>
      <p class="now__time">${msg}</p>
    </article>`;
  }

  if (!rec.unwell) html += `<button class="unwell-toggle" id="btnUnwell"><i class="ph-fill ph-hand-heart"></i> Hôm nay mình không ổn</button>`;

  // habits today: chưa làm lên đầu. Chạm thẻ = đạt, nút ½ = tối thiểu.
  const t = startOfDay(new Date());
  const ORDER = { pending: 0, miss: 0, rest: 1, off: 1, min: 2, full: 3 };
  const list = HABITS.map(hb => ({ hb, st: cellStatus(hb, t) }))
    .filter(x => (t >= habStart(x.hb) && scheduled(x.hb, t)) || x.st === "full" || x.st === "min")
    .sort((a, b) => (ORDER[a.st] ?? 0) - (ORDER[b.st] ?? 0));
  const left = list.filter(x => x.st === "pending" || x.st === "miss").length;
  if (list.length) html += `<h2 class="h2">Thói quen hôm nay <small class="num">${left ? `còn ${left}` : '<i class="ph-fill ph-check-circle ok-c"></i> xong'}</small></h2>`;
  html += `<div class="chips">`;
  for (const { hb, st } of list) {
    const val = rec.v[hb.id];
    const sub = st === "full" ? (val ? `${val}${hb.id === "walk" ? " bước" : ""}` : "") : st === "min" ? (hb.min || "") : st === "rest" ? "nghỉ" : "";
    const label = st === "full" ? "đạt" : st === "min" ? "đạt tối thiểu" : "chưa";
    html += `<div class="chip" data-st="${st}">
      <button class="chip__main" data-habit="${hb.id}" aria-pressed="${st === "full"}" aria-label="${esc(hb.name)}: ${label}">
        <i class="ph${st === "full" || st === "min" ? "-fill" : ""} ${hb.icon} chip__ic"></i>
        <span class="chip__t">${esc(hb.name)}</span>${sub ? `<span class="chip__s">${esc(sub)}</span>` : ""}
      </button>
      ${hb.min ? `<button class="chip__half" data-habit-min="${hb.id}" aria-pressed="${st === "min"}" aria-label="Tối thiểu: ${esc(hb.min)}" title="Tối thiểu: ${esc(hb.min)}"><i class="ph${st === "min" ? "-fill" : ""} ph-circle-half"></i></button>` : `<span class="chip__half" aria-hidden="true"></span>`}
    </div>`;
  }
  html += `</div>`;

  // thời gian theo nhóm + timeline
  html += `<h2 class="h2">Thời gian hôm nay <span class="h2__acts">
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

const fmtDur = m => { m = Math.round(m); return m < 60 ? `${m}p` : `${Math.floor(m / 60)}g${m % 60 ? pad(m % 60) : ""}`; };
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
function timelineHTML() {
  const rec = S.today.rec || {}, t0 = startOfDay(new Date()), now = new Date();
  const { H0, H1, PX } = TL, PAD = 10;
  const y = d => ((d - t0) / 3600000 - H0) * PX;
  const height = (H1 - H0) * PX;
  const geo = it => {
    if (y(it.end) <= 0 || y(it.start) >= height) return null;
    const top = Math.max(0, y(it.start)), h = Math.max(22, Math.min(height, y(it.end)) - top - 2);
    return { top, h, bot: top + h + 2 };
  };
  const lanes = new Map([...laneLayout(S.today.plan, geo), ...laneLayout(S.today.actual, geo)]);
  const evHTML = it => {
    const g = geo(it); if (!g) return "";
    const { top, h } = g, c = CATS[it.cat] || CATS.life, L = lanes.get(it.id);
    const lane = L && L.n > 1 ? `left:${(L.lane * 100 / L.n).toFixed(3)}%;right:auto;width:calc(${(100 / L.n).toFixed(3)}% - 3px);` : "";
    const time = h > 40 ? `<small class="num">${hm(it.start)}–${hm(it.end)}</small>` : "";
    const short = h <= 40 ? " is-short" : "", tt = `<span class="tl__t">${esc(it.title)}</span>`;
    if (it.kind === "plan") {
      const extra = ((rec.skip || []).includes(it.id) ? " is-skip" : "") + (it.muted || (rec.unwell && !it.ess) ? " is-muted" : "");
      return `<button class="tl__ev${extra}${short}" data-pid="${esc(it.id)}" style="top:${top}px;height:${h}px;${lane}--cat:${c.hex}" title="${esc(it.title)} ${hm(it.start)}–${hm(it.end)}" aria-label="Chi tiết: ${esc(it.title)} ${hm(it.start)}–${hm(it.end)}">${tt}${time}</button>`;
    }
    return `<button class="tl__ev${c.lightInk ? " light-ink" : ""}${short}" title="${esc(it.title)} ${hm(it.start)}–${hm(it.end)}" data-aid="${esc(it.id)}" style="top:${top}px;height:${h}px;${lane}--cat:${c.hex}" aria-label="Sửa: ${esc(it.title)} ${hm(it.start)}–${hm(it.end)}">${tt}${time}</button>`;
  };
  let hours = "", grid = "";
  for (let h = H0; h <= H1; h++) { hours += `<div class="tl__hour num" style="top:${(h - H0) * PX}px">${pad(h)}:00</div>`; grid += `<div class="tl__grid" style="top:${(h - H0) * PX + PAD}px"></div>`; }
  const nowY = y(now);
  const nowLine = nowY > 0 && nowY < height ? `<div class="tl__nowline" style="top:${nowY + PAD}px"></div>` : "";
  return `<div class="tl">
    <div class="tl__heads"><span></span><div class="tl__head">Kế hoạch</div><div class="tl__head">Thực tế</div></div>
    <div class="tl__scroll" data-now="${Math.max(0, Math.min(height, nowY)) + PAD}">
      <div class="tl__body" style="padding:${PAD}px 0">
        <div class="tl__hours" style="height:${height}px">${hours}</div>
        <div class="tl__col tl__col--plan" style="height:${height}px">${S.today.plan.map(evHTML).join("")}</div>
        <div class="tl__col tl__col--act" style="height:${height}px">${S.today.actual.map(evHTML).join("")}</div>
        ${grid}${nowLine}
      </div>
    </div>
  </div>`;
}

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
  const legend = `<div class="legend"><span><i class="sdot" data-st="full"></i>Đạt</span><span><i class="sdot" data-st="min"></i>Tối thiểu</span><span><i class="sdot" data-st="rest"></i>Unwell</span><span><i class="sdot" data-st="miss"></i>Bỏ</span></div>`;

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
      html += `<div class="wgrid"><div class="wname" style="${catVars(hb.cat)}"><i class="ph ${hb.icon}"></i><span>${esc(hb.short || hb.name)}</span><small class="num">${wc.label}${wc.star ? " ★" : ""}</small></div>`;
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
  html += nav("month", mStart > trackStart(), mEnd < t, `Tháng ${cm.m + 1}`, cm.y);
  html += legend;
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
      <div class="hcard__head"><i class="ph ${hb.icon} big"></i>
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
        <i class="ph ${esc(h.icon)} mrow__ic"></i>
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
  const h = id ? H[id] : { name: "", cat: "health", icon: "ph-check-circle", freq: "daily", days: [], perWeekFull: 3, perWeekMin: 1, full: "", min: "", rule: "" };
  if (!h) return;
  S.habEdit = id;
  const days = h.days || [], freq = h.freq, icons = HICONS.includes(h.icon) ? HICONS : [h.icon, ...HICONS];
  const t = todayStr(), fromVal = id ? pendingFrom(h) || t : h.since && h.since > t ? h.since : t;
  const fromField = `<input id="hFrom" class="input num" type="date" value="${fromVal}" min="${t}">`;
  const nOpts = (sel, from) => Array.from({ length: 8 - from }, (_, k) => k + from).map(n => `<option value="${n}" ${n === sel ? "selected" : ""}>${n || "Không có"}</option>`).join("");
  openSheet(id ? "Sửa thói quen" : "Thêm thói quen", `<div id="hForm" data-freq="${freq}">
    ${id ? (h.off ? `<div class="mdanger"><button class="btn btn--block" id="hResume" type="button"><i class="ph ph-play"></i> Theo dõi lại</button>
        <button class="btn btn--ghost btn--block" id="hDelete" type="button"><i class="ph ph-trash"></i> Xoá hẳn</button></div>`
      : `<div class="mdanger"><button class="btn btn--ghost btn--block" id="hStop" type="button"><i class="ph ph-pause"></i> Ngừng theo dõi</button></div>`) : ""}
    <label class="field"><span>Tên</span><input id="hName" type="text" value="${esc(h.name)}" placeholder="vd Uống 2 lít nước" maxlength="60"></label>
    <label class="field"><span>Tên ngắn</span><input id="hShort" type="text" value="${esc(h.short || "")}" placeholder="${esc(h.name || "vd Uống nước")}" maxlength="14"><small>Hiện ở bảng Tuần (chỗ hẹp). Để trống thì dùng tên.</small></label>
    <label class="field"><span>Nhóm</span><select id="hCat">${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === h.cat ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select><small>Để tô màu và xếp thói quen theo nhóm.</small></label>
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
    <label class="field"><span>Thế nào là đạt</span><input id="hFull" type="text" value="${esc(h.full || "")}" placeholder="vd 2 lít" maxlength="60"></label>
    <label class="field hf-min"><span>Bản tối thiểu</span><input id="hMin" type="text" value="${esc(h.min || "")}" placeholder="vd 1 lít" maxlength="60"><small>Ngày mệt làm bản nhỏ này vẫn giữ chuỗi. Để trống nếu không có.</small></label>
    <label class="field"><span>Ghi chú cho AI</span><textarea id="hRule" rows="2" placeholder="Để trống thì AI dựa vào các ô ở trên">${esc(h.rule || "")}</textarea><small>Gemini đọc dòng này để biết câu bạn kể có tính là đạt không.</small></label>
    <p class="act__warn" id="hErr" hidden></p>
    </div>
    <div class="sheet-actions"><button class="btn" data-close>Hủy</button><button class="btn btn--primary" id="hSave"><i class="ph ph-check"></i> Lưu</button></div>`);
  if (!id) setTimeout(() => $("#hName") && $("#hName").focus(), 50);
}
function setHabFreq(f) {
  const box = $("#hForm"); if (!box) return;
  box.dataset.freq = f;
  $$("[data-hfreq]", box).forEach(b => { b.setAttribute("aria-selected", b.dataset.hfreq === f); b.setAttribute("aria-checked", b.dataset.hfreq === f); });
  $("#hFreqHint").textContent = HFREQ_HINT[f];
  $(".hf-days__t", box).textContent = f === "weekly" ? "Ngày gợi ý (không bắt buộc)" : "Những ngày";
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
    name, short: $("#hShort").value.trim(), cat: $("#hCat").value, icon: ic ? ic.dataset.hicon : "ph-check-circle", freq: f,
    full: $("#hFull").value.trim(), min: $("#hMin").value.trim(), rule: $("#hRule").value.trim(),
  });
  if (!h.short) delete h.short;
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
    return `<div class="dayrow"><i class="ph ${hb.icon}"></i><span>${esc(hb.name)}</span><div class="seg" role="group" aria-label="${esc(hb.name)}">
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
    <p class="now__label"><i class="ph ph-moon"></i> ${fmtDate(new Date())} · trước khi ngủ</p>
    <h2 class="now__title" style="font-size:28px;margin-bottom:16px">${hasToday ? "Viết thêm cho hôm nay." : "Ba dòng cho hôm nay."}</h2>
    ${journalFormFields({})}
    <button class="btn btn--primary btn--block" type="submit"><i class="ph ph-floppy-disk"></i> Lưu nhật ký</button>
    <p class="jnote">${hasToday ? "Hôm nay đã có trang. Lưu nữa thì viết nối vào trang đó, không mất phần cũ." : "Lưu vào Google Drive (Still life › Nhật ký), mỗi ngày một trang."}</p>
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
      ${S.cfg && !s.demo ? `<p class="faint" style="font-size:13px;margin:10px 0 0">Đang theo dõi từ ${esc(S.cfg.start)}. <a class="link" href="https://drive.google.com/drive/folders/${esc(S.cfg.folderId)}" target="_blank" rel="noopener">Mở thư mục Drive</a></p>` : ""}
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
    p.habits.forEach((h, i) => { const hb = H[h.id]; if (!hb) return; const tag = dayShort(h.date); html += `<button type="button" data-hi="${i}" data-lv="${h.level}"><i class="ph ${hb.icon}"></i>${esc(hb.name)} · ${h.level === "full" ? "Đạt" : h.level === "min" ? "Tối thiểu" : "Bỏ"}${h.value ? ` (${h.value})` : ""}${tag ? `<span class="hpick__day">${esc(tag)}</span>` : ""}</button>`; });
    html += `</div>`;
  }
  if (p.journal) html += `<p class="group-t">Thêm vào nhật ký</p><label class="field"><textarea id="cJournal" rows="3">${esc(p.journal)}</textarea></label>`;
  if (p.unwell) html += `<p class="care"><b>Bật unwell day cho hôm nay?</b>Lịch sẽ nhẹ lại và chuỗi ngày không gãy.</p>`;
  if (empty) html += `<p class="muted">${p.edited ? "Đã bỏ hết, không còn gì để ghi." : "Mình chưa thấy việc nào để ghi. Thử kể cụ thể hơn, ví dụ “vừa đi bộ 20 phút”."}${S.otherFor ? " Lưu sẽ chỉ đánh dấu bỏ qua khối đang chạy." : ""}</p>`;
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

2) habits: thói quen được nhắc tới, kể cả gián tiếp (tập yoga → yoga full; lớp tiếng Hàn → korean full).
${HABITS.map(h => `- ${h.id} (${h.name}): ${aiRule(h)}`).join("\n") || "(chưa có thói quen nào, để trống)"}
- Chỉ dùng "skip" khi người dùng nói rõ là không làm.
- Hoạt động về ăn uống chỉ tính habit eat khi người dùng nói đã đủ 3 bữa (hoặc tổng kết cả ngày).

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
  const key = cleanKey(S.settings.geminiKey);
  if (!key) throw Object.assign(new Error("Chưa có Gemini API key"), { needKey: true });
  const models = [curModel(), ...modelList(), "gemini-flash-latest"].filter((m, i, a) => a.indexOf(m) === i);
  let last;
  for (const model of models) {
    try {
      const r = await fetch(`${GEMINI}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: geminiPrompt(text) }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: geminiSchema(), temperature: 0.2 } }),
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
      const p = JSON.parse(out);
      return { activities: p.activities || [], habits: p.habits || [], journal: p.journal || "", unwell: !!p.unwell, reply: p.reply || "", model };
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

async function markBlock(id, how) {
  const blk = S.today.plan.find(p => p.id === id); if (!blk) return;
  if (how === "done") {
    const end = new Date() < blk.end ? new Date() : blk.end;
    const hid = blk.habit && blk.habit !== "walk" && HABITS.some(h => h.id === blk.habit) ? blk.habit : "";   // thói quen đã ngừng thì không đánh dấu
    const item = await api().addActual({ title: blk.title, cat: blk.cat, start: blk.start, end: end > blk.start ? end : blk.end, plan: blk.id, habit: blk.habit });
    item.plan = blk.id; S.today.actual.push(item);
    const prevLv = hid ? (S.today.rec || {}).h?.[hid] : undefined;
    if (hid) await setHabit(todayStr(), hid, better("full", prevLv));
    toast(`Đã ghi: ${blk.title}`, 2600, async () => {
      await api().deleteActual(item.id); S.today.actual = S.today.actual.filter(a => a.id !== item.id);
      if (hid) await setHabit(todayStr(), hid, prevLv || null);
    });
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
  for (const a of S.today.actual.filter(a => a.plan === id)) await api().deleteActual(a.id);
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
  openSheet("Chỉnh sửa kế hoạch", `<p class="plan-meta"><span class="badge" style="${catVars(p.cat)}"><span class="dot"></span>${esc(c.name)}</span>${hb ? `<span class="badge"><i class="ph ${hb.icon}"></i> ${esc(hb.name)}</span>` : ""}${st}</p>
    <div class="act" style="${catVars(p.cat)}">
      <input class="input" type="text" id="pTitle" value="${esc(p.title)}" aria-label="Tên khối"${p.added ? "" : ` style="grid-column:1/-1"`}>
      ${p.added ? `<button type="button" class="icon-btn act__rm" id="pDel" aria-label="Xoá khối này"><i class="ph ph-trash"></i></button>` : ""}
      <div class="act__times"><input class="input num" type="time" id="pStart" value="${hm(p.start)}" aria-label="Bắt đầu"><span class="faint">–</span><input class="input num" type="time" id="pEnd" value="${hm(p.end)}" aria-label="Kết thúc"></div>
    </div>
    <p class="faint" style="font-size:13px;margin:0 0 4px">${p.added ? "Khối thêm riêng cho hôm nay." : "Chỉ đổi cho hôm nay, lịch các ngày khác giữ nguyên."}</p>
    <div class="sheet-actions"><button class="btn" data-close>Hủy</button><button class="btn btn--primary" id="pSave"><i class="ph ph-check"></i> Lưu</button></div>`);
}
async function savePlanEdit() {
  const old = S.today.plan.find(p => p.id === S.editPlan); if (!old) return closeSheet();
  const day = startOfDay(old.start);
  let s = atTime(day, $("#pStart").value || hm(old.start)), e = atTime(day, $("#pEnd").value || hm(old.end));
  if (e <= s) e = new Date(s.getTime() + 15 * 60000);
  const title = $("#pTitle").value.trim() || old.title;
  if (title === old.title && +s === +old.start && +e === +old.end) return closeSheet();
  const prev = Object.assign({}, old);
  const swap = it => {
    S.today.plan = S.today.plan.map(p => (p.id === prev.id ? Object.assign({}, p, { title: it.title, start: it.start, end: it.end }) : p)).sort((a, b) => a.start - b.start);
  };
  swap(await api().updatePlan(Object.assign({}, old, { title, start: s, end: e }))); closeSheet();
  toast("Đã đổi khối hôm nay", 2600, async () => swap(await api().updatePlan(prev)));
}

// Chạm chỗ trống ở cột Kế hoạch → thêm khối cho hôm nay
function renderPlanAdd(start) {
  const next = S.today.plan.find(p => p.start > start);
  let end = new Date(+start + 30 * 60000);
  if (next && next.start < end && next.start - start >= 15 * 60000) end = next.start;
  const catOpts = Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === "build" ? "selected" : ""}>${c.name}</option>`).join("");
  openSheet("Thêm kế hoạch", `<div class="act" style="${catVars("build")}" id="pAddBox">
      <input class="input" type="text" id="pTitle" placeholder="Định làm gì?" aria-label="Tên khối" style="grid-column:1/-1">
      <select class="input" id="pCat" aria-label="Nhóm">${catOpts}</select>
      <div class="act__times"><input class="input num" type="time" id="pStart" value="${hm(start)}" aria-label="Bắt đầu"><span class="faint">–</span><input class="input num" type="time" id="pEnd" value="${hm(end)}" aria-label="Kết thúc"></div>
    </div>
    <p class="faint" style="font-size:13px;margin:0 0 4px">Chỉ thêm cho hôm nay.</p>
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
  const next = Object.assign({}, old, { title: $("#eTitle").value.trim() || old.title, cat: $("#eCat").value, start: s, end: e });
  const prev = Object.assign({}, old);
  const swap = it => { S.today.actual = S.today.actual.map(a => (a.id === it.id ? Object.assign({}, it, { plan: it.plan || prev.plan, kind: "act" }) : a)); };
  swap(await api().updateActual(next)); closeSheet();
  toast("Đã sửa", 2600, async () => swap(await api().updateActual(prev)));
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
      if (!Array.isArray(c.habits) || JSON.stringify(c.habits) === JSON.stringify(LS.get("habits", null))) return;
      LS.set("habits", c.habits); useHabits(c.habits); render();
    }).catch(e => console.warn("habits", e));
  }
  try { await loadToday(); render(); loadHistory().then(() => { if (S.view === "habits") renderHabits(); }).catch(handleErr); }
  catch (e) { handleErr(e); render(); }
}
function setView(v) {
  S.view = v;
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
  const el = e.target.closest("button, [data-close]");
  if (!el) {   // chỗ trống ở cột Kế hoạch → thêm khối (làm tròn xuống 15 phút)
    const col = e.target.closest(".tl__col--plan"); if (!col) return;
    const m = TL.H0 * 60 + (e.clientY - col.getBoundingClientRect().top) / TL.PX * 60;
    const q = Math.max(TL.H0 * 60, Math.min(TL.H1 * 60 - 15, Math.floor(m / 15) * 15));
    const st = startOfDay(new Date()); st.setMinutes(q);
    return renderPlanAdd(st);
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
  if (id === "btnOpenCal") return window.open("https://calendar.google.com/calendar/r/day", "_blank", "noopener");
  if (id === "btnUnwell") { busy(el, "Đang chuyển sang ngày nhẹ nhàng"); try { await setUnwell(true); toast("Unwell day. Nghỉ ngơi nhé", 2600, () => setUnwell(false)); } catch (er) { handleErr(er); } return render(); }
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
  if (el.dataset.hday) { el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") !== "true"); return; }
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
    try { await setHabit(S.dayDate, el.dataset.dh, el.dataset.lv || null); } catch (er) { handleErr(er); }
    renderDaySheet(S.dayDate); return S.view === "habits" ? renderHabits() : renderToday();
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
    try { await setHabit(todayStr(), hid, nextLv); } catch (er) { handleErr(er); }
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
  if (e.target.id === "dock") return submitInput($("#inputText").value);
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
document.addEventListener("change", e => { if (e.target.id === "sModel") { S.settings.model = e.target.value; saveSettings(); } });
document.addEventListener("change", e => { if (e.target.id === "sKey") saveKey(e.target.value).then(() => { if (S.view === "today" && !ready()) renderToday(); }); });
document.addEventListener("paste", e => { if (e.target.id === "sKey") setTimeout(() => saveKey(e.target.value).then(() => { if (S.view === "today" && !ready()) renderToday(); }), 0); });

// Bộ chọn giờ trong app: hộp chọn giờ của Android bị cắt nút "Set" trên vài máy (Vivo X200 Pro mini),
// nên ô giờ để readonly và mở bộ chọn này. Chọn xong thì gán value + phát input/change như ô giờ thường.
const TP = (() => {
  const H = 44; let target = null;
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
  const cols = { h: $('.tp__col[data-k="h"]', el), m: $('.tp__col[data-k="m"]', el) };
  const get = c => Math.max(0, Math.min(c.children.length - 1, Math.round(c.scrollTop / H)));
  const set = (c, v, smooth) => c.scrollTo({ top: v * H, behavior: smooth ? "smooth" : "instant" });
  const mark = c => { const i = get(c); [...c.children].forEach((it, j) => { it.classList.toggle("is-on", j === i); it.setAttribute("aria-selected", j === i); }); };
  Object.values(cols).forEach(c => {
    c.addEventListener("scroll", () => mark(c), { passive: true });
    c.addEventListener("click", e => { const it = e.target.closest(".tp__it"); if (it) set(c, +it.dataset.v, true); });
    c.addEventListener("keydown", e => { const d = { ArrowUp: -1, ArrowDown: 1 }[e.key]; if (d) { e.preventDefault(); set(c, get(c) + d, true); } });
  });
  const close = () => { el.hidden = true; if (target) target.focus({ preventScroll: true }); target = null; };
  const open = inp => {
    target = inp; el.hidden = false;
    $("#tpTitle", el).textContent = inp.getAttribute("aria-label") || "Chọn giờ";
    const [h, m] = (inp.value || hm(new Date())).split(":").map(Number);
    set(cols.h, h || 0); set(cols.m, m || 0); mark(cols.h); mark(cols.m);
    cols.h.focus({ preventScroll: true });
  };
  el.addEventListener("click", e => {
    if (e.target.closest("[data-tp-close]")) return close();
    if (e.target.closest("[data-tp-now]")) { const n = new Date(); set(cols.h, n.getHours(), true); set(cols.m, n.getMinutes(), true); return; }
    if (e.target.closest("[data-tp-ok]")) {
      const p = n => String(n).padStart(2, "0"), inp = target;
      inp.value = `${p(get(cols.h))}:${p(get(cols.m))}`;
      close();
      inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  return { open, close, isOpen: () => !el.hidden };
})();
// pointerdown đặt readonly trước khi trình duyệt kịp mở hộp chọn giờ mặc định
document.addEventListener("pointerdown", e => { if (e.target.matches?.('input[type="time"]')) e.target.readOnly = true; }, true);
document.addEventListener("click", e => { if (e.target.matches?.('input[type="time"]')) { e.preventDefault(); TP.open(e.target); } });
document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.('input[type="time"]')) { e.preventDefault(); TP.open(e.target); } });

$("#inputText").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer: fine)").matches) { e.preventDefault(); submitInput(e.target.value); } });
document.addEventListener("keydown", e => { if (e.key !== "Escape") return; if (TP.isOpen()) TP.close(); else if (!$("#sheet").hidden) closeSheet(); else if ($("#dock").classList.contains("is-open")) closeCompose(); });

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
setInterval(() => { if (gateStep() && $("#gate").hidden && $("#sheet").hidden) return render(); if (S.view === "today" && $("#sheet").hidden && document.activeElement !== $("#inputText")) renderToday(); }, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

refresh();
