/* ============================================================
   SMU core — state, routing, gamification, daily engine.
   Standalone app: storage keys are namespaced "smu_*" and never
   touch any other app's data on this origin.
   ============================================================ */

window.SMU_DATA = window.SMU_DATA || { schools: [] };
window.SMU = window.SMU || {};

(function () {
  const STORE_KEY = "smu_state_v1";

  /* ---------- state ---------- */
  const DEFAULTS = {
    name: "",
    niche: "business",
    goal: "grow",
    onboarded: false,
    xp: 0,
    skills: { strategy: 0, viral: 0, video: 0, photo: 0, editing: 0, marketing: 0, branding: 0, analytics: 0 },
    streak: 0,
    bestStreak: 0,
    lastXPDay: "",
    lessons: {},        // lessonId -> {done:true, score:0-100, at:ts}
    challenges: {},     // challengeId(+date) -> ts
    quizzes: {},        // dayKey -> {score, total}
    saved: [],          // [{type:'viral'|'creator'|'trend'|'idea'|'hook', id?, text?, at}]
    brand: null,        // brand builder output
    coachLog: [],       // [{role:'user'|'assistant', text}]
    analyses: [],       // content analyzer history [{at, score, verdict, breakdown}]
    genHistory: [],     // generated content history [{at, tool, text}]
    settings: { apiKey: "", model: "claude-opus-4-8", haptics: true },
    firstDay: "",
  };

  let state;
  try { state = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORE_KEY) || "{}")); }
  catch (e) { state = Object.assign({}, DEFAULTS); }
  state.skills = Object.assign({}, DEFAULTS.skills, state.skills || {});
  state.settings = Object.assign({}, DEFAULTS.settings, state.settings || {});
  if (!state.firstDay) state.firstDay = dayKey();

  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }

  /* ---------- dates ---------- */
  function dayKey(d) {
    const x = d || new Date();
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  }
  function daysSinceEpoch() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }

  /* ---------- seeded daily rng ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dailyRng(salt) { return mulberry32(daysSinceEpoch() * 2654435761 + (salt || 0)); }
  function dailyPick(arr, salt) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(dailyRng(salt)() * arr.length)];
  }
  function dailyPickN(arr, n, salt) {
    if (!arr || !arr.length) return [];
    const rng = dailyRng(salt), out = [], used = new Set();
    let guard = 0;
    while (out.length < Math.min(n, arr.length) && guard++ < 500) {
      const i = Math.floor(rng() * arr.length);
      if (!used.has(i)) { used.add(i); out.push(arr[i]); }
    }
    return out;
  }

  /* ---------- gamification ---------- */
  const RANKS = [
    { name: "Beginner", min: 0 },
    { name: "Intermediate", min: 1200 },
    { name: "Advanced", min: 3500 },
    { name: "Expert", min: 7500 },
    { name: "Master", min: 14000 },
  ];
  function rank() {
    let r = RANKS[0], next = null;
    for (let i = 0; i < RANKS.length; i++) {
      if (state.xp >= RANKS[i].min) { r = RANKS[i]; next = RANKS[i + 1] || null; }
    }
    const base = r.min, cap = next ? next.min : Math.max(state.xp, r.min + 1);
    return {
      name: r.name, index: RANKS.indexOf(r), next: next ? next.name : null,
      pct: next ? Math.min(100, Math.round(((state.xp - base) / (cap - base)) * 100)) : 100,
      toNext: next ? next.min - state.xp : 0,
    };
  }

  function bumpStreak() {
    const today = dayKey();
    if (state.lastXPDay === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    state.streak = state.lastXPDay === dayKey(y) ? state.streak + 1 : 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.lastXPDay = today;
  }

  function addXP(amount, skill) {
    amount = Math.max(0, Math.round(amount || 0));
    if (!amount) return;
    state.xp += amount;
    if (skill && state.skills[skill] !== undefined) state.skills[skill] += amount;
    bumpStreak();
    save();
    if (SMU.ui && SMU.ui.xpBurst) SMU.ui.xpBurst(amount);
    if (SMU.refreshChrome) SMU.refreshChrome();
  }

  // streak display: broken if last XP was before yesterday
  function liveStreak() {
    if (!state.lastXPDay) return 0;
    const today = dayKey();
    const y = new Date(); y.setDate(y.getDate() - 1);
    return (state.lastXPDay === today || state.lastXPDay === dayKey(y)) ? state.streak : 0;
  }

  /* ---------- curriculum helpers ---------- */
  function schools() { return (SMU_DATA.schools || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)); }
  function school(id) { return (SMU_DATA.schools || []).find((s) => s.id === id) || null; }

  function allLessons() {
    const out = [];
    schools().forEach((s) => (s.courses || []).forEach((c) => (c.lessons || []).forEach((l) => {
      out.push({ lesson: l, course: c, school: s });
    })));
    return out;
  }
  function findLesson(lessonId) { return allLessons().find((x) => x.lesson.id === lessonId) || null; }

  function lessonDone(id) { return !!(state.lessons[id] && state.lessons[id].done); }
  function completeLesson(lessonId, score) {
    const hit = findLesson(lessonId);
    if (!hit) return;
    const first = !lessonDone(lessonId);
    state.lessons[lessonId] = { done: true, score: score == null ? null : score, at: Date.now() };
    if (first) addXP(hit.lesson.xp || 50, hit.lesson.skill);
    else save();
  }

  function courseProgress(course) {
    const total = (course.lessons || []).length;
    const done = (course.lessons || []).filter((l) => lessonDone(l.id)).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  function schoolProgress(s) {
    let done = 0, total = 0;
    (s.courses || []).forEach((c) => { const p = courseProgress(c); done += p.done; total += p.total; });
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  function overallProgress() {
    let done = 0, total = 0;
    schools().forEach((s) => { const p = schoolProgress(s); done += p.done; total += p.total; });
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  // next not-done lesson (continue learning); prefers current partially-done course
  function nextLesson() {
    const all = allLessons();
    // most recently active course first
    let lastAt = 0, lastCourse = null;
    all.forEach((x) => {
      const rec = state.lessons[x.lesson.id];
      if (rec && rec.at > lastAt) { lastAt = rec.at; lastCourse = x.course.id; }
    });
    if (lastCourse) {
      const inCourse = all.find((x) => x.course.id === lastCourse && !lessonDone(x.lesson.id));
      if (inCourse) return inCourse;
    }
    return all.find((x) => !lessonDone(x.lesson.id)) || null;
  }

  function weakestSkills(n) {
    return Object.entries(state.skills).sort((a, b) => a[1] - b[1]).slice(0, n || 2).map((e) => e[0]);
  }

  /* ---------- daily program ---------- */
  function daily() {
    const T = SMU_DATA.training || {};
    const weak = weakestSkills(2);
    const lessonRec = nextLesson();
    return {
      lesson: lessonRec,
      challenge: dailyPick(T.challenges || [], 11),
      creator: dailyPick(SMU_DATA.creators || [], 23),
      viral: dailyPick(SMU_DATA.viral || [], 37),
      editingDrill: dailyPick(T.editingDrills || [], 41),
      photoDrill: dailyPick(T.photoDrills || [], 53),
      marketingDrill: dailyPick(T.marketingDrills || [], 67),
      quiz: dailyPickN(T.quizBank || [], 5, 71),
      focusSkills: weak,
    };
  }
  function challengeKey(id) { return id + "@" + dayKey(); }
  function challengeDone(id) { return !!state.challenges[challengeKey(id)]; }
  function completeChallenge(id, xp, skill) {
    if (challengeDone(id)) return;
    state.challenges[challengeKey(id)] = Date.now();
    addXP(xp || 40, skill);
  }

  /* ---------- saved / bookmarks ---------- */
  function isSaved(type, id) { return state.saved.some((s) => s.type === type && s.id === id); }
  function toggleSave(type, id, label) {
    const i = state.saved.findIndex((s) => s.type === type && s.id === id);
    if (i >= 0) { state.saved.splice(i, 1); save(); return false; }
    state.saved.unshift({ type, id, label: label || "", at: Date.now() });
    save(); return true;
  }
  function saveText(type, text, label) {
    state.saved.unshift({ type, text, label: label || "", at: Date.now() });
    save();
  }

  /* ---------- markdown-lite ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function inline(s) { return esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"); }
  function md(text) {
    const blocks = String(text == null ? "" : text).replace(/\r/g, "").split(/\n{2,}/);
    return blocks.map((b) => {
      const lines = b.split("\n").filter((l) => l.trim() !== "");
      if (!lines.length) return "";
      if (lines.every((l) => /^\s*-\s+/.test(l)))
        return "<ul>" + lines.map((l) => "<li>" + inline(l.replace(/^\s*-\s+/, "")) + "</li>").join("") + "</ul>";
      if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l)))
        return "<ol>" + lines.map((l) => "<li>" + inline(l.replace(/^\s*\d+[.)]\s+/, "")) + "</li>").join("") + "</ol>";
      return "<p>" + lines.map(inline).join("<br>") + "</p>";
    }).join("");
  }

  /* ---------- router ---------- */
  SMU.views = {};
  function parseHash() {
    const h = (location.hash || "#/today").replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean);
    return { name: parts[0] || "today", params: parts.slice(1) };
  }
  function nav(route) { location.hash = "#/" + String(route || "today").replace(/^#?\/?/, ""); }

  let currentRoute = null;
  function renderRoute() {
    const r = parseHash();
    const view = SMU.views[r.name] || SMU.views.today;
    if (!view) return;
    currentRoute = r;
    const root = document.getElementById("view");
    // restart the enter animation on every navigation
    root.classList.remove("view");
    root.innerHTML = "";
    void root.offsetWidth;
    root.classList.add("view");
    try { view.render(root, r.params); }
    catch (e) {
      root.innerHTML = '<div class="empty"><div class="e-ico">⚠️</div><div>Something went wrong rendering this screen.</div><div class="small" style="margin-top:6px">' + esc(e.message) + "</div></div>";
      if (window.console) console.error(e);
    }
    if (SMU.refreshChrome) SMU.refreshChrome();
    window.scrollTo({ top: 0 });
  }

  /* ---------- data export / reset ---------- */
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "smu-backup-" + dayKey() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function importData(json) {
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object" || obj.xp === undefined) throw new Error("Not a valid SMU backup file.");
    state = Object.assign({}, DEFAULTS, obj);
    state.skills = Object.assign({}, DEFAULTS.skills, state.skills || {});
    state.settings = Object.assign({}, DEFAULTS.settings, state.settings || {});
    save();
    renderRoute();
  }
  function resetAll() { localStorage.removeItem(STORE_KEY); location.reload(); }

  /* ---------- exports ---------- */
  Object.assign(SMU, {
    state, save, esc, md, nav, renderRoute, parseHash,
    dayKey, dailyPick, dailyPickN, dailyRng,
    RANKS, rank, addXP, liveStreak,
    schools, school, allLessons, findLesson, lessonDone, completeLesson,
    courseProgress, schoolProgress, overallProgress, nextLesson, weakestSkills,
    daily, challengeDone, completeChallenge,
    isSaved, toggleSave, saveText,
    exportData, importData, resetAll,
    get route() { return currentRoute || parseHash(); },
  });

  SMU.SKILL_LABELS = {
    strategy: "Strategy", viral: "Viral", video: "Video", photo: "Photo",
    editing: "Editing", marketing: "Marketing", branding: "Branding", analytics: "Analytics",
  };
  SMU.NICHES = ["luxury", "cars", "realestate", "fitness", "business", "sales", "lifestyle", "fashion", "food", "travel", "creator"];
  SMU.NICHE_LABELS = {
    luxury: "Luxury", cars: "Automotive", realestate: "Real Estate", fitness: "Fitness",
    business: "Business", sales: "Sales", lifestyle: "Lifestyle", fashion: "Fashion",
    food: "Food", travel: "Travel", creator: "Creator",
  };

  window.addEventListener("hashchange", renderRoute);
})();
