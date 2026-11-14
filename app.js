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

const HABITS = [
  { id: "eat",     name: "Ăn đủ 3 bữa",        icon: "ph-bowl-food",  freq: "daily", full: "3 bữa", min: "không bỏ bữa", rule: "full: ăn đủ 3 bữa. min: có 3 bữa nhưng có bữa qua loa/lệch giờ." },
  { id: "wake",    name: "Dậy 5:30",           icon: "ph-sun-horizon", freq: "daily", full: "5:30", min: "trước 6:00", rule: "full: dậy trước hoặc lúc 5:35. min: dậy trước 6:00." },
  { id: "korean",  name: "Tiếng Hàn 10 phút",  icon: "ph-translate",  freq: "daily", full: "10 phút", min: "5 từ mới", rule: "full: học tiếng Hàn từ 10 phút trở lên (đi lớp cũng tính). min: học ít nhất 5 từ mới. value = số phút nếu có." },
  { id: "walk",    name: "Đi bộ 3000 bước",    icon: "ph-sneaker-move", freq: "daily", full: "3000 bước", min: "2000 bước", rule: "value = số bước. full: >= 3000. min: >= 2000." },
  { id: "yoga",    name: "Yoga",               icon: "ph-person-simple-tai-chi", freq: "days", days: [1, 3, 5], full: "T2 · T4 · T6", rule: "full: có tập yoga." },
  { id: "gym",     name: "Gym",                icon: "ph-barbell",    freq: "weekly", days: [2, 6], perWeekMin: 1, perWeekFull: 2, full: "T3 · T7", min: "1 buổi/tuần", rule: "full: có tập gym hôm đó." },
  { id: "phone",   name: "Cất điện thoại 22:00", icon: "ph-moon-stars", freq: "daily", full: "22:00", min: "trước 22:30", rule: "full: cất điện thoại ra ngoài giường lúc 22:00. min: trước 22:30 hoặc bật chế độ ngủ." },
  { id: "journal", name: "Nhật ký",            icon: "ph-notebook",   freq: "daily", full: "3 dòng", min: "1 dòng", rule: "full: viết nhật ký 3 dòng. min: 1 dòng." },
];
const H = Object.fromEntries(HABITS.map(h => [h.id, h]));

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
const fmtDate = d => `${DOW[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`;
const LV = { full: 3, min: 2, skip: 1 };
const better = (a, b) => ((LV[a] || 0) >= (LV[b] || 0) ? a : b);

// undo: hàm async để hoàn tác; có thì toast hiện nút "Hoàn tác" và ở lâu hơn
function toast(msg, ms = 2600, undo = null) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>` + (undo ? `<button class="toast__undo" type="button"><i class="ph ph-arrow-counter-clockwise"></i> Hoàn tác</button>` : "");
  toast._undo = undo; t.classList.toggle("has-undo", !!undo); t.classList.add("is-on");
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
};
if (new URLSearchParams(location.search).has("demo")) S.settings.demo = true;
const saveSettings = () => LS.set("settings", S.settings);
if (S.settings.model === "gemini-2.5-flash") S.settings.model = "";   // mặc định cũ → để app tự chọn model

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
      summary: `Thói quen · ${d.getDate()}/${d.getMonth() + 1}` + (rec.unwell ? " · unwell day" : ""),
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
    for (const it of items) {
      const t = TPL[it.key] || {};
      const body = mute
        ? { summary: "💤 " + it.title, reminders: { useDefault: false, overrides: [] } }
        : { summary: it.title, reminders: { useDefault: false, overrides: (t.rem || [0]).map(m => ({ method: "popup", minutes: m })) } };
      await g(`${base}/${encodeURIComponent(it.id)}`, { method: "PATCH", body: JSON.stringify(body) });
    }
  },
  async listJournal() {
    const r = await g(`${DRIVE}/files?${q({ q: `'${S.cfg.journalFolderId}' in parents and trashed=false`, fields: "files(id,name,modifiedTime)", orderBy: "name desc", pageSize: 120 })}`);
    return r.files.map(f => ({ id: f.id, date: f.name.replace(/\.md$/, "") }));
  },
  async readJournal(file) { return g(`${DRIVE}/files/${file.id}?alt=media`); },
  async saveJournal(date, md, file) {
    const r = await this.writeFile(`${date}.md`, S.cfg.journalFolderId, md, "text/markdown", file && file.id);
    return { id: r.id, date };
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
        if (hb.freq !== "daily" && !hb.days.includes(dow)) continue;
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
  const persist = () => LS.set("demo", { days: db.days, actual: db.actual.map(a => Object.assign({}, a, { start: +a.start, end: +a.end })), journal: db.journal, muted: db.muted });
  db.actual = db.actual.map(a => Object.assign(a, { start: new Date(a.start), end: new Date(a.end) }));
  return {
    async setup() { return { planCal: "demo", actualCal: "demo", start: ymd(addDays(new Date(), -60)) }; },
    async listPlan(from, to) {
      const out = [];
      for (let d = startOfDay(from); d < to; d = addDays(d, 1)) for (const t of TEMPLATE) if (t.days.includes(d.getDay())) {
        const id = `${t.key}_${ymd(d)}`;
        out.push({ id, kind: "plan", key: t.key, title: t.title, start: atTime(d, t.s), end: atTime(d, t.e), cat: t.cat, habit: t.habit || "", ess: !!t.ess, muted: db.muted.includes(id) });
      }
      return out.sort((a, b) => a.start - b.start);
    },
    async listActual(from, to) { return db.actual.filter(a => a.start >= from && a.start < to).sort((a, b) => a.start - b.start); },
    async listDays(from, to) { const o = {}; for (const [k, v] of Object.entries(db.days)) { const d = parseYmd(k); if (d >= startOfDay(from) && d <= to) o[k] = v; } return o; },
    async addActual(a) { const it = Object.assign({ id: "a" + Date.now() + Math.random(), kind: "act" }, a); db.actual.push(it); persist(); return it; },
    async updateActual(a) { const i = db.actual.findIndex(x => x.id === a.id); if (i >= 0) db.actual[i] = Object.assign({}, db.actual[i], a); persist(); return Object.assign({}, db.actual[i]); },
    async deleteActual(id) { db.actual = db.actual.filter(x => x.id !== id); persist(); },
    async saveDay(rec) { rec = Object.assign({}, rec, { id: rec.id || "d" + rec.date }); db.days[rec.date] = rec; persist(); return rec; },
    async mutePlan(items, mute) { for (const it of items) { db.muted = db.muted.filter(x => x !== it.id); if (mute) db.muted.push(it.id); } persist(); },
    async listJournal() { return Object.keys(db.journal).sort().reverse().map(date => ({ id: date, date })); },
    async readJournal(f) { return db.journal[f.date] || ""; },
    async saveJournal(date, md) { db.journal[date] = md; persist(); return { id: date, date }; },
    reset() { localStorage.removeItem("sl.demo"); },
  };
})();
const api = () => (S.settings.demo ? Demo : Google);
const ready = () => S.settings.demo || (S.cfg && signedIn());

// ============================================================ habit logic
function blankRec(date) { return { id: null, date, h: {}, v: {}, unwell: false, reason: "", skip: [], muted: [] }; }
function scheduled(hb, d) { return hb.freq === "daily" || hb.days.includes(d.getDay()); }
function trackStart() {
  if (S.settings.demo) return addDays(startOfDay(new Date()), -60);
  return S.cfg && S.cfg.start ? parseYmd(S.cfg.start) : startOfDay(new Date());
}
// Trạng thái 1 ô: full | min | rest | miss | pending | off | none | future
function cellStatus(hb, d) {
  const ds = ymd(d), rec = S.days[ds], today = startOfDay(new Date());
  const st = rec && rec.h[hb.id];
  if (d > today) return "future";
  if (st === "full" || st === "min") return st;
  if (d < trackStart()) return "none";
  if (!scheduled(hb, d)) return "off";
  if (rec && rec.unwell) return "rest";
  if (hb.freq === "weekly") return +d === +today ? "pending" : "off";   // gym: tính theo tuần
  if (+d === +today) return "pending";
  return "miss";
}
function weekCount(hb, monday) {
  let done = 0, total = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i), st = cellStatus(hb, d);
    if (st === "full" || st === "min") done++;
    if (hb.freq !== "weekly" && scheduled(hb, d) && st !== "future" && st !== "none" && st !== "rest") total++;
  }
  if (hb.freq === "weekly") return { done, total: hb.perWeekFull, label: `${done}/${hb.perWeekFull}`, star: done >= hb.perWeekFull, ok: done >= hb.perWeekMin };
  return { done, total, label: `${done}/${total}`, star: total > 0 && done === total };
}
function streak(hb) {
  const today = startOfDay(new Date()), start = trackStart();
  if (hb.freq === "weekly") {
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
  return { n, unit: hb.freq === "days" ? "buổi" : "ngày" };
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
  if (!ready()) return renderOnboarding(v);
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
    .filter(x => scheduled(x.hb, t) || x.st === "full" || x.st === "min")
    .sort((a, b) => (ORDER[a.st] ?? 0) - (ORDER[b.st] ?? 0));
  const left = list.filter(x => x.st === "pending" || x.st === "miss").length;
  html += `<h2 class="h2">Thói quen hôm nay <small class="num">${left ? `còn ${left}` : '<i class="ph-fill ph-check-circle ok-c"></i> xong'}</small></h2><div class="chips">`;
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
      <button class="icon-btn" id="btnTlToggle" aria-label="${S.tlFull ? "Thu gọn" : "Xem cả ngày"}" title="${S.tlFull ? "Thu gọn" : "Xem cả ngày"}"><i class="ph ph-arrows-${S.tlFull ? "in" : "out"}-line-vertical"></i></button>
      <button class="icon-btn" id="btnOpenCal" aria-label="Mở Google Calendar" title="Mở Google Calendar"><i class="ph ph-calendar-blank"></i></button>
    </span></h2>
    ${summaryHTML()}${timelineHTML()}`;
  v.innerHTML = html;
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

function timelineHTML() {
  const rec = S.today.rec || {}, PX = 56, t0 = startOfDay(new Date()), now = new Date();
  let H0 = 5, H1 = 23;
  if (!S.tlFull) { const nh = now.getHours() + now.getMinutes() / 60; H0 = Math.max(5, Math.min(17, Math.floor(nh) - 3)); H1 = H0 + 6; }
  const y = d => ((d - t0) / 3600000 - H0) * PX;
  const height = (H1 - H0) * PX;
  const evHTML = it => {
    if (y(it.end) <= 0 || y(it.start) >= height) return "";
    const top = Math.max(0, y(it.start)), h = Math.max(22, Math.min(height, y(it.end)) - top - 2);
    const c = CATS[it.cat] || CATS.life;
    const time = h > 40 ? `<small class="num">${hm(it.start)}–${hm(it.end)}</small>` : "";
    if (it.kind === "plan") {
      const extra = ((rec.skip || []).includes(it.id) ? " is-skip" : "") + (it.muted || (rec.unwell && !it.ess) ? " is-muted" : "");
      return `<div class="tl__ev${extra}" style="top:${top}px;height:${h}px;--cat:${c.hex}" title="${esc(it.title)}">${esc(it.title)}${time}</div>`;
    }
    return `<button class="tl__ev${c.lightInk ? " light-ink" : ""}" data-aid="${esc(it.id)}" style="top:${top}px;height:${h}px;--cat:${c.hex}" aria-label="Sửa: ${esc(it.title)} ${hm(it.start)}–${hm(it.end)}">${esc(it.title)}${time}</button>`;
  };
  let hours = "", grid = "";
  for (let h = H0; h <= H1; h++) { hours += `<div class="tl__hour num" style="top:${(h - H0) * PX}px">${pad(h)}:00</div>`; grid += `<div class="tl__grid" style="top:${(h - H0) * PX + 26}px"></div>`; }
  const nowY = y(now);
  const nowLine = nowY > 0 && nowY < height ? `<div class="tl__nowline" style="top:${nowY + 26}px"></div>` : "";
  return `<div class="tl">
    <div><div class="tl__head">&nbsp;</div><div class="tl__hours" style="height:${height}px">${hours}</div></div>
    <div><div class="tl__head">Kế hoạch</div><div class="tl__col tl__col--plan" style="height:${height}px">${S.today.plan.map(evHTML).join("")}</div></div>
    <div><div class="tl__head">Thực tế</div><div class="tl__col tl__col--act" style="height:${height}px">${S.today.actual.map(evHTML).join("")}</div></div>
    ${grid}${nowLine}
  </div>`;
}

function renderOnboarding(v) {
  const s = S.settings;
  const hasKey = !!s.geminiKey, isIn = signedIn(), hasCfg = !!S.cfg;
  v.innerHTML = `<div class="empty fade-in">
    <h2>Chào bạn. Mình dựng hệ thống cho ngày của bạn nhé.</h2>
    <p>Lịch nằm trên Google Calendar, nhật ký nằm trên Google Drive, còn app này là chỗ ghi nhanh và nhìn lại.</p>
    <ol class="steps">
      <li class="${hasKey ? "ok" : ""}"><i class="ph${hasKey ? "-fill ph-check-circle" : " ph-circle"}"></i><span>Nhập Gemini API key<small>Dùng lại key của app Korean được</small></span></li>
      <li class="${isIn ? "ok" : ""}"><i class="ph${isIn ? "-fill ph-check-circle" : " ph-circle"}"></i><span>Đăng nhập Google<small>Chỉ cấp quyền cho các lịch và file app tự tạo</small></span></li>
      <li class="${hasCfg ? "ok" : ""}"><i class="ph${hasCfg ? "-fill ph-check-circle" : " ph-circle"}"></i><span>Tạo 2 lịch Kế hoạch, Thực tế và thư mục Drive<small>Làm một lần, tự nhận ra nếu đã có</small></span></li>
    </ol>
    <div class="row">
      <button class="btn btn--primary" id="btnStart">${!hasKey ? "Bắt đầu" : !isIn ? "Đăng nhập Google" : "Tạo lịch"}</button>
      <button class="btn btn--ghost" id="btnDemo">Xem thử với dữ liệu mẫu</button>
    </div>
  </div>`;
}

// ============================================================ render: habits
const HSHORT = { eat: "Ăn 3 bữa", wake: "Dậy 5:30", korean: "Tiếng Hàn", walk: "Đi bộ", yoga: "Yoga", gym: "Gym", phone: "Cất máy", journal: "Nhật ký" };
const editable = d => d <= startOfDay(new Date()) && d >= trackStart();
function renderHabits() {
  const v = $("#view-habits");
  if (!ready()) { v.innerHTML = `<div class="empty"><h2>Chưa có dữ liệu</h2><p>Kết nối Google ở tab Hôm nay trước nhé.</p></div>`; return; }
  const t = startOfDay(new Date()), mon = mondayOf(t);
  let html = `<h2 class="h2" style="margin-top:8px">Tuần này <small>${mon.getDate()}/${mon.getMonth() + 1} – ${addDays(mon, 6).getDate()}/${addDays(mon, 6).getMonth() + 1}</small></h2>
    <div class="week fade-in"><table><thead><tr><th></th>`;
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    html += `<th class="${+d === +t ? "is-today" : ""}">${editable(d) ? `<button class="wday" data-day="${ymd(d)}" aria-label="Sửa thói quen ${DOW[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}">${DOW_SHORT[d.getDay()]}</button>` : DOW_SHORT[d.getDay()]}</th>`;
  }
  html += `</tr></thead><tbody>`;
  for (const hb of HABITS) {
    const wc = weekCount(hb, mon);
    html += `<tr><td class="name"><span><i class="ph ${hb.icon}"></i>${esc(HSHORT[hb.id] || hb.name)}</span><small class="num">${wc.label}${wc.star ? " ★" : ""}</small></td>`;
    for (let i = 0; i < 7; i++) {
      const d = addDays(mon, i), st = cellStatus(hb, d);
      html += editable(d)
        ? `<td><button class="cell" data-st="${st}" data-day="${ymd(d)}" aria-label="${esc(hb.name)} ${DOW_SHORT[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}"></button></td>`
        : `<td><div class="cell" data-st="${st}"></div></td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>
    <div class="legend"><span><i class="cell" data-st="full"></i>Đạt</span><span><i class="cell" data-st="min"></i>Tối thiểu</span><span><i class="cell" data-st="rest"></i>Unwell</span><span><i class="cell" data-st="miss"></i>Bỏ</span><span class="legend__tap"><i class="ph ph-hand-tap"></i>Chạm ô để sửa</span></div></div>`;

  // Lịch theo tháng, có nút ‹ › để đổi tháng. Mỗi hàng 1 tuần, mỗi ô ghi số ngày.
  const cm = S.calMonth || (S.calMonth = { y: t.getFullYear(), m: t.getMonth() });
  const mStart = new Date(cm.y, cm.m, 1), mEnd = new Date(cm.y, cm.m + 1, 0);
  const canPrev = mStart > trackStart(), canNext = mEnd < t;
  const first = mondayOf(mStart), W = Math.ceil((addDays(mEnd, 1) - first) / (7 * 864e5));
  html += `<h2 class="h2 monthnav"><button class="icon-btn" data-month="-1" aria-label="Tháng trước" ${canPrev ? "" : "disabled"}><i class="ph ph-caret-left"></i></button>
    <span>Tháng ${cm.m + 1}<small>/ ${cm.y}</small></span>
    <button class="icon-btn" data-month="1" aria-label="Tháng sau" ${canNext ? "" : "disabled"}><i class="ph ph-caret-right"></i></button></h2>`;
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
        const label = `${esc(hb.name)} ${d.getDate()}/${d.getMonth() + 1}`;
        rows += editable(d)
          ? `<button class="mcal__d" data-st="${st}" data-day="${ymd(d)}" aria-label="${label}">${d.getDate()}</button>`
          : `<span class="mcal__d" data-st="${st}">${d.getDate()}</span>`;
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

// Sheet sửa thói quen của một ngày (hôm nay hoặc ngày cũ)
function renderDaySheet(date) {
  S.dayDate = date;
  const d = parseYmd(date), rec = S.days[date] || blankRec(date);
  const rows = HABITS.filter(hb => scheduled(hb, d) || rec.h[hb.id]).map(hb => {
    const cur = rec.h[hb.id] === "full" || rec.h[hb.id] === "min" ? rec.h[hb.id] : "";
    const opts = [["", "ph-x", "Chưa"], ["min", "ph-circle-half", "Tối thiểu"], ["full", "ph-check", "Đạt"]];
    return `<div class="dayrow"><i class="ph ${hb.icon}"></i><span>${esc(hb.name)}</span><div class="seg" role="group" aria-label="${esc(hb.name)}">
      ${opts.map(([lv, ic, lab]) => lv === "min" && !hb.min ? `<span class="seg__gap"></span>` : `<button data-dh="${hb.id}" data-lv="${lv}" aria-pressed="${cur === lv}" aria-label="${lab}" title="${lab}"><i class="ph ${ic}"></i></button>`).join("")}
    </div></div>`;
  }).join("");
  openSheet(`${DOW[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`, `<div class="daylist">${rows}</div>`);
}

// ============================================================ render: journal
const JFIELDS = [["vui", "Hôm nay vui vì"], ["bietOn", "Biết ơn điều gì"], ["mai", "Mai muốn làm gì"], ["them", "Ghi thêm"]];
function journalMd(date, f) {
  const d = parseYmd(date);
  let md = `# Nhật ký · ${fmtDate(d)} ${d.getFullYear()}\n`;
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
  let files = [];
  try { files = await api().listJournal(); } catch (e) { return handleErr(e); }
  S.jfiles = files;
  const today = todayStr(), tf = files.find(f => f.date === today);
  const cur = tf ? parseJournal(await api().readJournal(tf)) : {};
  let html = `<form class="jcard fade-in" id="jform">
    <p class="now__label"><i class="ph ph-moon"></i> ${fmtDate(new Date())} · trước khi ngủ</p>
    <h2 class="now__title" style="font-size:28px;margin-bottom:16px">Ba dòng cho hôm nay.</h2>`;
  html += journalFormFields(cur);
  html += `<button class="btn btn--primary btn--block" type="submit"><i class="ph ph-floppy-disk"></i> Lưu nhật ký</button></form>`;
  const past = files.filter(f => f.date !== today);
  html += `<h2 class="h2">Những ngày trước <small>${past.length}</small></h2>`;
  html += past.length ? `<ul class="jlist">${past.map(f => { const d = parseYmd(f.date); return `<li><button data-jdate="${esc(f.date)}"><b>${DOW_SHORT[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}</b><span class="jprev" data-prev="${esc(f.date)}">${esc((S.jprev || {})[f.date] || "")}</span><i class="ph ph-caret-right"></i></button></li>`; }).join("")}</ul>` : `<p class="muted">Trang đầu tiên sẽ là hôm nay.</p>`;
  v.innerHTML = html;
  loadPreviews(past.slice(0, 20));
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
  $("#sheet").hidden = false; document.body.style.overflow = "hidden";
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
      <label class="field"><span>Google OAuth Client ID</span><input id="sClient" value="${esc(s.clientId)}"><small>Cùng client với app Korean. Cần thêm địa chỉ app này vào “Authorized JavaScript origins”.</small></label>
      <button class="btn btn--primary btn--block" id="sSave">Lưu cài đặt</button>
    </div>`);
}

function renderConfirm(p) {
  S.pending = p;
  const catOpts = sel => Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${c.name}</option>`).join("");
  let html = p.reply ? `<p class="reply"><i class="ph-fill ph-sparkle"></i>${esc(p.reply)}</p>` : "";
  if (p.activities.length) {
    html += `<p class="group-t">Thời gian thực tế</p>`;
    p.activities.forEach((a, i) => {
      html += `<div class="act" style="${catVars(a.category)}" data-i="${i}">
        <input class="input" type="text" data-f="title" value="${esc(a.title)}" aria-label="Tên việc">
        <button type="button" class="icon-btn act__rm" data-rm="${i}" aria-label="Bỏ dòng này"><i class="ph ph-trash"></i></button>
        <div class="act__times"><input class="input num" type="time" data-f="start" value="${esc(a.start)}" aria-label="Bắt đầu"><span class="faint">–</span><input class="input num" type="time" data-f="end" value="${esc(a.end)}" aria-label="Kết thúc"></div>
        <select class="input" data-f="category" aria-label="Nhóm">${catOpts(a.category)}</select>
      </div>`;
    });
  }
  if (p.habits.length) {
    html += `<p class="group-t">Thói quen</p><div class="hpick">`;
    p.habits.forEach((h, i) => { const hb = H[h.id]; if (!hb) return; html += `<button type="button" data-hi="${i}" data-lv="${h.level}"><i class="ph ${hb.icon}"></i>${esc(hb.name)} · ${h.level === "full" ? "Đạt" : h.level === "min" ? "Tối thiểu" : "Bỏ"}${h.value ? ` (${h.value})` : ""}</button>`; });
    html += `</div>`;
  }
  if (p.journal) html += `<p class="group-t">Thêm vào nhật ký</p><label class="field"><textarea id="cJournal" rows="3">${esc(p.journal)}</textarea></label>`;
  if (p.unwell) html += `<p class="care"><b>Bật unwell day cho hôm nay?</b>Lịch sẽ nhẹ lại và chuỗi ngày không gãy.</p>`;
  if (!p.activities.length && !p.habits.length && !p.journal && !p.unwell) html += `<p class="muted">Mình chưa thấy việc nào để ghi. Thử kể cụ thể hơn, ví dụ “vừa đi bộ 20 phút”.</p>`;
  html += `<div class="sheet-actions"><button class="btn" data-close>Hủy</button><button class="btn btn--primary" id="cSave"><i class="ph ph-check"></i> Lưu</button></div>`;
  openSheet("Mình hiểu là…", html);
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
        id: { type: "STRING", enum: HABITS.map(h => h.id) }, level: { type: "STRING", enum: ["full", "min", "skip"] },
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
${HABITS.map(h => `- ${h.id} (${h.name}): ${h.rule}`).join("\n")}
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
  b.disabled = true; b.innerHTML = '<i class="ph ph-circle-notch spin"></i> Đang thử…';
  const st = $("#sKeyState");
  try {
    const p = await callGemini("vừa đi bộ 10 phút");
    st.innerHTML = `<i class="ph-fill ph-check-circle"></i> Kết nối được · ${esc(modelLabel(p.model || curModel()).split(" · ")[0])}`; st.className = "keystate is-ok";
  } catch (e) { st.textContent = e.message; st.className = "keystate is-bad"; }
  b.disabled = false; b.innerHTML = '<i class="ph ph-plugs-connected"></i> Kiểm tra kết nối';
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
  if (!key) throw new Error("Chưa có Gemini API key (vào Cài đặt)");
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
      if (!r.ok) { let m = ""; try { m = (await r.json()).error.message; } catch {} throw new Error(`Gemini lỗi ${r.status}${m ? ": " + m : ""}`); }
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

async function savePending() {
  const p = S.pending; if (!p) return;
  // đọc lại các ô đã sửa
  $$("#sheetBody .act").forEach(el => {
    const a = p.activities[+el.dataset.i];
    $$("[data-f]", el).forEach(inp => (a[inp.dataset.f] = inp.value));
  });
  const jt = $("#cJournal"); if (jt) p.journal = jt.value;
  const btn = $("#cSave"); btn.disabled = true;
  const today = todayStr(), created = [], prevRecs = {};
  const snap = d => { if (!(d in prevRecs)) prevRecs[d] = S.days[d] ? JSON.parse(JSON.stringify(S.days[d])) : null; };
  let jPrev = null, unwellOn = false;
  try {
    for (const a of p.activities) {
      const day = parseYmd(a.date || today);
      let s = atTime(day, a.start), e = atTime(day, a.end);
      if (e <= s) e = new Date(s.getTime() + 15 * 60000);
      const item = await api().addActual({ title: a.title, cat: a.category, start: s, end: e });
      created.push(item.id);
      if (a.date === today || !a.date) S.today.actual.push(item);
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
  } catch (e) { btn.disabled = false; handleErr(e); }
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
    const item = await api().addActual({ title: blk.title, cat: blk.cat, start: blk.start, end: end > blk.start ? end : blk.end, plan: blk.id, habit: blk.habit });
    item.plan = blk.id; S.today.actual.push(item);
    const prevLv = blk.habit ? (S.today.rec || {}).h?.[blk.habit] : undefined;
    if (blk.habit && blk.habit !== "walk") await setHabit(todayStr(), blk.habit, better("full", prevLv));
    toast(`Đã ghi: ${blk.title}`, 2600, async () => {
      await api().deleteActual(item.id); S.today.actual = S.today.actual.filter(a => a.id !== item.id);
      if (blk.habit && blk.habit !== "walk") await setHabit(todayStr(), blk.habit, prevLv || null);
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

// Sửa / xoá một việc đã ghi
function renderActEdit(a) {
  S.editAct = a.id;
  const catOpts = Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === a.cat ? "selected" : ""}>${c.name}</option>`).join("");
  openSheet("Sửa việc đã làm", `<div class="act" style="${catVars(a.cat)}">
      <input class="input" type="text" id="eTitle" value="${esc(a.title)}" aria-label="Tên việc">
      <button type="button" class="icon-btn act__rm" id="eDel" aria-label="Xoá việc này"><i class="ph ph-trash"></i></button>
      <div class="act__times"><input class="input num" type="time" id="eStart" value="${hm(a.start)}" aria-label="Bắt đầu"><span class="faint">–</span><input class="input num" type="time" id="eEnd" value="${hm(a.end)}" aria-label="Kết thúc"></div>
      <select class="input" id="eCat" aria-label="Nhóm">${catOpts}</select>
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
  toast(e.message || "Có lỗi xảy ra", 4200);
  if (e.auth) showBanner();
}
function showBanner() {
  const b = $("#banner");
  if (!S.settings.demo && S.cfg && !signedIn()) b.innerHTML = `<div class="banner"><span>Phiên Google đã hết hạn.</span><button class="btn" id="btnReauth">Đăng nhập lại</button></div>`;
  else b.innerHTML = "";
}

// Nhận cấu hình tìm thấy trên Drive; lấy luôn Gemini key nếu máy này chưa có
function adoptCfg(found) {
  S.cfg = found; LS.set("cfg", S.cfg);
  if (found.geminiKey && !S.settings.geminiKey) { S.settings.geminiKey = found.geminiKey; saveSettings(); }
}
async function startFlow() {
  const s = S.settings;
  try {
    if (!signedIn()) { await signIn(true); toast("Đã đăng nhập Google"); }
    if (!S.cfg) {
      const found = await Google.findConfig();
      if (found) { adoptCfg(found); toast("Đã tìm thấy lịch Still life của bạn"); }
      else if (!s.geminiKey) return renderSettings();
      else {
        openSheet("Đang dựng hệ thống", `<p class="muted" id="setupStep">Bắt đầu…</p>`);
        S.cfg = await Google.setup(m => { const el = $("#setupStep"); if (el) el.textContent = m; });
        LS.set("cfg", S.cfg); closeSheet(); toast("Xong! Lịch đã có trên Google Calendar");
      }
    }
    await refresh();
  } catch (e) { closeSheet(); handleErr(e); renderToday(); }
}

// ============================================================ render orchestration
function header() {
  const now = new Date(), h = now.getHours();
  $("#greet").textContent = h < 5 ? "Khuya rồi" : h < 11 ? "Chào buổi sáng" : h < 14 ? "Buổi trưa" : h < 18 ? "Buổi chiều" : "Buổi tối";
  $("#dateTitle").textContent = fmtDate(now);
}
function render() {
  header(); showBanner();
  if (S.view === "today") renderToday();
  if (S.view === "habits") renderHabits();
  if (S.view === "journal") renderJournal();
}
async function refresh() {
  // Đã đăng nhập nhưng máy này chưa có cấu hình (vd máy thứ hai): tự tìm bộ lịch có sẵn trên Drive
  if (!S.settings.demo && !S.cfg && signedIn()) {
    try { const found = await Google.findConfig(); if (found) { adoptCfg(found); toast("Đã nối vào lịch Still life của bạn"); } }
    catch (e) { handleErr(e); }
  }
  if (!ready()) return render();
  try { await loadToday(); render(); loadHistory().then(() => { if (S.view === "habits") renderHabits(); }).catch(handleErr); }
  catch (e) { handleErr(e); render(); }
}
function setView(v) {
  S.view = v;
  $$(".tab").forEach(t => t.classList.toggle("is-on", t.dataset.view === v));
  $$(".view").forEach(s => (s.hidden = s.id !== "view-" + v));
  closeCompose(); $("#btnCompose").hidden = v !== "today";
  document.body.classList.toggle("no-dock", v !== "today");
  window.scrollTo({ top: 0 });
  render();
}

// ============================================================ events
function autosize() { const t = $("#inputText"); t.style.height = "auto"; t.style.height = Math.min(Math.round(innerHeight * 0.6), t.scrollHeight + 2) + "px"; }

document.addEventListener("click", async e => {
  const el = e.target.closest("button, [data-close]"); if (!el) return;
  if (el.matches("[data-close]")) return closeSheet();
  if (el.id === "btnCompose") return openCompose();
  if (el.id === "dockBackdrop") return closeCompose();
  if (el.classList.contains("toast__undo")) {
    const fn = toast._undo; hideToast(); if (!fn) return;
    try { await fn(); toast("Đã hoàn tác"); } catch (er) { handleErr(er); }
    return render();
  }
  if (el.classList.contains("tab")) return setView(el.dataset.view);
  const id = el.id;
  if (id === "btnSettings") return renderSettings();
  if (id === "btnStart") return startFlow();
  if (id === "btnDemo") { S.settings.demo = true; saveSettings(); return refresh(); }
  if (id === "btnReauth" || id === "sIn") { try { await signIn(false); closeSheet(); await refresh(); } catch (er) { handleErr(er); } return; }
  if (id === "sOut") { signOut(); closeSheet(); return render(); }
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
  if (id === "btnUnwell") { el.disabled = true; try { await setUnwell(true); toast("Unwell day. Nghỉ ngơi nhé", 2600, () => setUnwell(false)); } catch (er) { handleErr(er); } return render(); }
  if (id === "btnTlToggle") { S.tlFull = !S.tlFull; return renderToday(); }
  if (id === "eSave") { el.disabled = true; try { await saveActEdit(); } catch (er) { el.disabled = false; handleErr(er); } return renderToday(); }
  if (id === "eDel") { el.disabled = true; try { await deleteAct(); } catch (er) { el.disabled = false; handleErr(er); } return renderToday(); }
  if (el.dataset.aid) { const a = S.today.actual.find(x => x.id === el.dataset.aid); if (a) renderActEdit(a); return; }
  if (el.dataset.month) {
    const cm = S.calMonth, d = new Date(cm.y, cm.m + +el.dataset.month, 1);
    S.calMonth = { y: d.getFullYear(), m: d.getMonth() };
    // tháng cũ hơn phần lịch sử đã tải thì tải thêm
    const from = mondayOf(d), to = addDays(new Date(d.getFullYear(), d.getMonth() + 1, 0), 7);
    if (!S.days[ymd(from)] && from >= addDays(trackStart(), -7)) { try { Object.assign(S.days, await api().listDays(from, to)); } catch (er) { handleErr(er); } }
    return renderHabits();
  }
  if (el.dataset.day) return renderDaySheet(el.dataset.day);
  if (el.dataset.dh) {
    try { await setHabit(S.dayDate, el.dataset.dh, el.dataset.lv || null); } catch (er) { handleErr(er); }
    renderDaySheet(S.dayDate); return S.view === "habits" ? renderHabits() : renderToday();
  }
  if (id === "btnUnwellOff") { el.disabled = true; try { await setUnwell(false); toast("Đã bật lại lịch bình thường"); } catch (er) { handleErr(er); } return render(); }
  if (id === "cSave") return savePending();
  if (el.dataset.act) {
    if (el.dataset.act === "other") { S.otherFor = el.dataset.id; return openCompose("Đang làm gì thay vào đó?"); }
    el.disabled = true;
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
  if (el.dataset.rm != null && S.pending) { S.pending.activities.splice(+el.dataset.rm, 1); return renderConfirm(S.pending); }
  if (el.dataset.hi != null && S.pending) {
    $$("#sheetBody .act").forEach(a => { const it = S.pending.activities[+a.dataset.i]; $$("[data-f]", a).forEach(inp => (it[inp.dataset.f] = inp.value)); });
    const h = S.pending.habits[+el.dataset.hi]; h.level = h.level === "full" ? "min" : h.level === "min" ? "skip" : "full";
    return renderConfirm(S.pending);
  }
  if (el.dataset.jdate) {
    const f = (S.jfiles || []).find(x => x.date === el.dataset.jdate); if (!f) return;
    let j; try { j = parseJournal(await api().readJournal(f)); } catch (er) { return handleErr(er); }
    const d = parseYmd(f.date);
    return openSheet(`${DOW[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`, `<form id="jpast" data-date="${esc(f.date)}">${journalFormFields(j)}
      <button class="btn btn--primary btn--block" type="submit"><i class="ph ph-floppy-disk"></i> Lưu</button></form>`);
  }
});

document.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id === "dock") return submitInput($("#inputText").value);
  if (e.target.id === "jform" || e.target.id === "jpast") {
    const fd = new FormData(e.target), f = Object.fromEntries(fd.entries()), today = e.target.dataset.date || todayStr(), past = e.target.id === "jpast";
    const lines = ["vui", "bietOn", "mai"].filter(k => (f[k] || "").trim()).length;
    if (!lines && !(f.them || "").trim()) return toast("Viết ít nhất một dòng nhé");
    const btn = $("button[type=submit]", e.target); btn.disabled = true;
    try {
      const tf = (S.jfiles || []).find(x => x.date === today);
      const saved = await api().saveJournal(today, journalMd(today, f), tf);
      if (!tf) (S.jfiles = S.jfiles || []).unshift(saved);
      await setHabit(today, "journal", lines >= 3 ? "full" : "min");
      S.jprev = S.jprev || {}; S.jprev[today] = firstLine(f);
      if (past) { closeSheet(); toast("Đã lưu"); return renderJournal(); }
      S.jdirty = false;
      toast(lines >= 3 ? "Đã lưu. Ngủ ngon nhé" : "Đã lưu (bản tối thiểu)");
    } catch (er) { handleErr(er); }
    btn.disabled = false;
  }
});

$("#inputText").addEventListener("input", autosize);
document.addEventListener("input", e => { if (e.target.closest("#jform")) S.jdirty = true; });
// Key tự lưu ngay khi dán hoặc rời ô, không cần nhớ bấm "Lưu cài đặt"
document.addEventListener("change", e => { if (e.target.id === "sModel") { S.settings.model = e.target.value; saveSettings(); } });
document.addEventListener("change", e => { if (e.target.id === "sKey") saveKey(e.target.value).then(() => { if (S.view === "today" && !ready()) renderToday(); }); });
document.addEventListener("paste", e => { if (e.target.id === "sKey") setTimeout(() => saveKey(e.target.value).then(() => { if (S.view === "today" && !ready()) renderToday(); }), 0); });

$("#inputText").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer: fine)").matches) { e.preventDefault(); submitInput(e.target.value); } });
document.addEventListener("keydown", e => { if (e.key !== "Escape") return; if (!$("#sheet").hidden) closeSheet(); else if ($("#dock").classList.contains("is-open")) closeCompose(); });

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
setInterval(() => { if (S.view === "today" && $("#sheet").hidden && document.activeElement !== $("#inputText")) renderToday(); }, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

refresh();
