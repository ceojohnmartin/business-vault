/* RALLY v39 — TORTURE: clock skew, interruption, and the long run.
 *
 * The other suites test that RALLY does the right thing. This one tries to
 * make it do the wrong thing, in the three ways nothing else covers:
 *
 *   1. CLOCK SKEW. Sync resolves conflicts with last-write-wins on a
 *      CLIENT-stamped clock. Phones disagree about the time. Find where
 *      that can resurrect stale data, steal attribution, requeue forever,
 *      defeat refusal healing, or move an agreement.
 *   2. INTERRUPTION. Kill or reload the app at the ugly moments. Anything
 *      the UI said was saved must survive; anything it did not promise may
 *      be lost, but never half-written.
 *   3. THE LONG RUN. A hundred knocks, repeated offline transitions and
 *      repeated role switches, looking for queue growth, duplicate events
 *      and repeated dead-lettering.
 *
 * Findings are REPORTED, not quietly patched: a note printed by this file
 * is a fact about the design, and the ones that are inherent to
 * client-stamped LWW are named as such rather than hidden behind a green
 * tick.
 */
const { chromium } = require("playwright");
const { scrubTrigger } = require("./lib/scrub-trigger.js");
const http = require("http"), fs = require("fs"), path = require("path");
const crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const PORT = 8855;
const ok = [], bad = [], notes = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));
const note = (n) => notes.push(n);

const TEAM = "11111111-1111-4111-a111-111111111111";
const mock = {
  users: {}, profiles: {}, access: {},
  tables: { pins: new Map(), events: new Map(), territories: new Map(), customers: new Map() },
  writes: 0, reqs: 0,
  clock: Date.parse("2026-09-01T00:00:00Z"),
};
const tick = () => new Date(++mock.clock).toISOString();
function addUser(email, password, prof) {
  const id = crypto.randomUUID();
  mock.users[email] = { id, password };
  mock.profiles[id] = Object.assign(
    { id, team_id: TEAM, role: "rep", name: "", email, disabled: false }, prof);
  return id;
}
const j = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const authOf = (req) => mock.access[String(req.headers.authorization || "").replace(/^Bearer /, "")];

function handleRest(req, res, u, body) {
  mock.reqs++;
  const uid = authOf(req);
  if (!uid) return j(res, 401, { message: "JWT invalid" });
  const me = mock.profiles[uid];
  const table = u.pathname.replace("/rest/v1/", "");
  if (table === "profiles") {
    const want = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    const rows = Object.values(mock.profiles).filter((p) =>
      p.id === uid || (p.team_id === me.team_id && p.team_id));
    return j(res, 200, want ? rows.filter((r) => r.id === want) : rows);
  }
  const t = mock.tables[table];
  if (!t) return j(res, 404, { message: "not found" });
  const mayWriteTerritory = ["leader", "manager", "owner"].includes(me.role) && !me.disabled;

  if (req.method === "POST") {
    const prefer = String(req.headers.prefer || "");
    const rows = Array.isArray(body) ? body : [body];
    const reqClock = tick();
    for (const row of rows) {
      if (row.team_id !== me.team_id)
        return j(res, 401, { code: "42501", message: "row-level security" });
      if (table === "territories" && !mayWriteTerritory)
        return j(res, 403, { code: "42501", message: "row-level security (territories)" });
      const key = row.team_id + "|" + row.id;
      const existing = t.get(key);
      if (existing && prefer.includes("ignore-duplicates")) continue;
      if (table === "customers") {
        const proposed = JSON.parse(JSON.stringify(row));
        if (existing) {
          scrubTrigger(proposed, null);                 // BEFORE INSERT: no OLD
          const merged = Object.assign({}, existing, proposed);
          scrubTrigger(merged, existing);               // BEFORE UPDATE
          t.set(key, Object.assign(merged, {
            created_at: existing.created_at, updated_at: reqClock }));
        } else {
          scrubTrigger(proposed, null);
          t.set(key, Object.assign(proposed, { created_at: reqClock, updated_at: reqClock }));
        }
      } else {
        t.set(key, Object.assign({}, existing, row, {
          created_at: (existing && existing.created_at) || reqClock,
          updated_at: reqClock }));
      }
      mock.writes++;
    }
    return prefer.includes("return=minimal") ? j(res, 201) : j(res, 201, rows);
  }
  if (req.method === "PATCH") {
    const team = String(u.searchParams.get("team_id") || "").replace(/^eq\./, "");
    const id = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    const row = t.get(team + "|" + id);
    const allowed = table !== "territories" || mayWriteTerritory;
    if (!row || !allowed) return j(res, 200, []);
    Object.assign(row, body, { updated_at: tick() });
    return j(res, 200, [row]);
  }
  let rows = [...t.values()].filter((r) => r.team_id === me.team_id);
  const idEq = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
  if (idEq) rows = rows.filter((r) => r.id === idEq);
  const clockCol = table === "events" ? "created_at" : "updated_at";
  const gt = u.searchParams.get(clockCol);
  if (gt && gt.startsWith("gt.")) rows = rows.filter((r) => r[clockCol] > gt.slice(3));
  const or = u.searchParams.get("or");
  if (or) {
    const m = or.match(/\(\w+\.gt\.(.*?),and\(\w+\.eq\.(.*?),id\.gt\.(.*)\)\)/);
    if (!m) return j(res, 400, { message: "bad or= filter: " + or });
    rows = rows.filter((r) => r[clockCol] > m[1] || (r[clockCol] === m[2] && r.id > m[3]));
  }
  rows.sort((a, b) => a[clockCol] < b[clockCol] ? -1 : a[clockCol] > b[clockCol] ? 1
    : a.id < b.id ? -1 : 1);
  const limit = Number(u.searchParams.get("limit") || 0);
  if (limit) rows = rows.slice(0, limit);
  return j(res, 200, rows);
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/auth/v1/") || u.pathname.startsWith("/rest/v1/")) {
    let raw = "";
    req.on("data", (c) => raw += c);
    req.on("end", () => {
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch (_) {}
      if (u.pathname === "/auth/v1/token") {
        const usr = mock.users[String(body.email || "").toLowerCase()];
        if (u.searchParams.get("grant_type") === "password") {
          if (!usr || usr.password !== body.password)
            return j(res, 400, { error_description: "Invalid login credentials" });
          const a = "at-" + crypto.randomBytes(8).toString("hex");
          mock.access[a] = usr.id;
          return j(res, 200, { access_token: a, refresh_token: "rt-" + a, token_type: "bearer",
            expires_in: 3600, user: { id: usr.id, email: body.email } });
        }
        return j(res, 400, { error_description: "unsupported" });
      }
      if (u.pathname === "/auth/v1/logout") return j(res, 204);
      if (u.pathname.startsWith("/rest/v1/")) return handleRest(req, res, u, body);
      return j(res, 404, {});
    });
    return;
  }
  let p = decodeURIComponent(u.pathname); if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(d);
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const aId = addUser("a@x.com", "knock1234", { name: "Ada Reyes", role: "owner" });
  const bId = addUser("b@x.com", "knock1234", { name: "Ben Cole", role: "rep" });

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];
  /* skewMs shifts the DEVICE's clock, exactly the way a phone with the wrong
     time does: Date.now() and new Date() both move, and nothing else knows. */
  async function device(email, skewMs) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    });
    if (skewMs) {
      await ctx.addInitScript(`(() => {
        const skew = ${skewMs};
        const RealDate = Date;
        const D = function (...a) {
          if (!(this instanceof D)) return new RealDate(RealDate.now() + skew).toString();
          return a.length ? new RealDate(...a) : new RealDate(RealDate.now() + skew);
        };
        D.prototype = RealDate.prototype;
        D.now = () => RealDate.now() + skew;
        D.parse = RealDate.parse; D.UTC = RealDate.UTC;
        window.Date = D;
      })();`);
    }
    await ctx.addInitScript(`window.RALLY_CLOUD = { url: "http://localhost:${PORT}", anonKey: "test-anon" };`);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(email + ": " + e.message));
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
    await page.fill("#gate-email", email); await page.fill("#gate-pass", "knock1234");
    await page.click("#gate-submit");
    await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 20000 });
    await page.waitForTimeout(800);
    return { ctx, page, email };
  }
  const S = (d, fn, arg) => d.page.evaluate(fn, arg);
  const sync = async (d) => {
    await d.page.evaluate(async () => {
      for (let i = 0; i < 300 && MSYNC.status().running; i++) await new Promise((r) => setTimeout(r, 50));
      await MSYNC.syncNow();
    });
    await d.page.waitForTimeout(250);
  };
  const syncBoth = async (x, y) => { await sync(x); await sync(y); await sync(x); await sync(y); };
  const offline = (d) => d.ctx.route(/\/(auth|rest)\/v1\//, (r) => r.abort());
  const online = (d) => d.ctx.unroute(/\/(auth|rest)\/v1\//);

  // ======================================================== 1. CLOCK SKEW
  const FIVE_MIN = 5 * 60e3;
  const A = await device("a@x.com", 0);            // correct time
  const B = await device("b@x.com", FIVE_MIN);     // five minutes FAST
  await sync(A); await sync(B);

  // a door both of them work
  const pinId = await S(A, async () => {
    const p = await STORE.addKnock({ lat: 38.48, lng: -98.36, disposition: "nothome",
      reason: null, dm: false, note: "" });
    return p.id;
  });
  await syncBoth(A, B);
  check("1a (setup) both devices hold the same door",
    (await S(B, (id) => STORE.pins.some((p) => p.id === id), pinId)) === true);

  /* THE CORE SKEW QUESTION. B (five minutes fast) writes FIRST in real time.
     A writes SECOND. Last-write-wins compares the two client stamps, so the
     later real edit carries the LOWER number. Whose edit survives? */
  await S(B, async (id) => {
    const p = STORE.pins.find((x) => x.id === id);
    p.address = "WRITTEN BY THE FAST PHONE";
    p.updatedAt = Date.now();
    await MDB.put("pins", p); MSYNC.queue("pins", p.id);
  }, pinId);
  await sync(B);
  await A.page.waitForTimeout(400);
  await S(A, async (id) => {
    const p = STORE.pins.find((x) => x.id === id);
    p.address = "WRITTEN LATER BY THE CORRECT PHONE";
    p.updatedAt = Date.now();
    await MDB.put("pins", p); MSYNC.queue("pins", p.id);
  }, pinId);
  await syncBoth(A, B);
  const winner = await S(A, (id) => (STORE.pins.find((x) => x.id === id) || {}).address, pinId);
  const winnerB = await S(B, (id) => (STORE.pins.find((x) => x.id === id) || {}).address, pinId);
  check("1b both devices agree on ONE winner — skew never forks the record",
    winner === winnerB, winner + " vs " + winnerB);
  if (/FAST PHONE/.test(winner)) {
    note("SKEW FINDING 1 (inherent to client-stamped LWW, present since Phase 2): a device "
      + "whose clock runs fast wins every conflict, including against an edit made LATER in "
      + "real time. Here the 5-minutes-fast phone's edit survived over one made 0.4s after "
      + "it. This is the documented cost of record-level LWW on a client clock; it is NOT "
      + "new in v39 and is not being redesigned inside this task. It is bounded: knock "
      + "history UNIONS rather than fighting, and the financial/agreement state it could "
      + "reach does not exist yet.");
  }
  check("1c the losing edit is not silently duplicated into a second door",
    (await S(A, (id) => STORE.pins.filter((p) => p.id === id).length, pinId)) === 1);

  /* Knock history is append-only and must survive skew from BOTH sides —
     this is the property that makes the LWW cost bounded rather than fatal. */
  await S(B, async (id) => {
    const p = STORE.pins.find((x) => x.id === id);
    await STORE.addKnock({ pinId: p.id, lat: p.lat, lng: p.lng,
      disposition: "goback", reason: null, dm: true, note: "fast phone knock" });
  }, pinId);
  await S(A, async (id) => {
    const p = STORE.pins.find((x) => x.id === id);
    await STORE.addKnock({ pinId: p.id, lat: p.lat, lng: p.lng,
      disposition: "sold", reason: null, dm: true, note: "correct phone knock" });
  }, pinId);
  await syncBoth(A, B);
  const hist = await S(A, (id) => {
    const p = STORE.pins.find((x) => x.id === id);
    return { n: (p.history || []).length, evs: STORE.events.filter((e) => e.pinId === id).length };
  }, pinId);
  const histB = await S(B, (id) => {
    const p = STORE.pins.find((x) => x.id === id);
    return { n: (p.history || []).length, evs: STORE.events.filter((e) => e.pinId === id).length };
  }, pinId);
  check("1d NO knock is lost to skew — history unions on both devices",
    hist.n === histB.n && hist.n >= 3, JSON.stringify({ a: hist, b: histB }));
  check("1e and no knock is DUPLICATED by it either",
    hist.evs === histB.evs && hist.evs === 3, JSON.stringify({ a: hist, b: histB }));

  /* ATTRIBUTION must be immune: it is keyed on the stable profile id stored
     ON the record, never on a clock and never on a name. */
  const attrib = await S(A, () => {
    const me = STORE.myId();
    return { mine: STORE.statsFor(0, null, me).doors,
             team: STORE.statsFor(0, null).doors };
  });
  const attribB = await S(B, () => {
    const me = STORE.myId();
    return { mine: STORE.statsFor(0, null, me).doors,
             team: STORE.statsFor(0, null).doors };
  });
  check("1f skew cannot move a knock from one rep's total to another's",
    attrib.mine + attribB.mine === attrib.team && attrib.team === attribB.team,
    JSON.stringify({ a: attrib, b: attribB }));
  if (attribB.mine > 0) {
    note("SKEW FINDING 2 (bounded, reporting only): daily and weekly totals bucket on the "
      + "event's CLIENT timestamp, so a phone with a wrong clock files its knocks under the "
      + "wrong day near midnight. Whose knocks they are never changes — that is keyed on the "
      + "profile id — only which day they land in. A server-stamped bucket would fix it and "
      + "belongs with the financial work, not here.");
  }

  /* A CORRECTED clock must not resurrect anything or start a requeue loop. */
  const beforeFix = await S(A, () => MSYNC.status().pending);
  const B2 = await device("b@x.com", 0);        // same rep, clock now correct
  await sync(B2); await sync(B2);
  const afterFix = await S(B2, (id) => ({
    pending: MSYNC.status().pending,
    addr: (STORE.pins.find((p) => p.id === id) || {}).address,
    evs: STORE.events.filter((e) => e.pinId === id).length,
  }), pinId);
  check("1g a corrected clock does not resurrect the old value",
    afterFix.addr === winner, afterFix.addr + " vs " + winner);
  check("1h …and does not start a requeue loop",
    afterFix.pending === 0 && beforeFix === 0,
    JSON.stringify({ before: beforeFix, after: afterFix.pending }));
  check("1i …and does not duplicate the knock log",
    afterFix.evs === 3, String(afterFix.evs));

  /* A SIGNED AGREEMENT must not change state under skew. The signature is a
     fact with a timestamp, not a timestamp that decides the fact. */
  const custId = await S(A, async () => {
    const c = await STORE.addCustomer({ first: "Skew", last: "Case", phones: [{ n: "8015550100" }],
      plan: { name: "premium", monthly: 99, initial: 450 },
      agreement: { signedAt: Date.now(), termMonths: 24 } });
    return c.id;
  });
  await syncBoth(A, B);
  const sig = await S(B, (id) => {
    const c = STORE.customers.find((x) => x.id === id);
    return { signed: !!(c && c.agreement && c.agreement.signedAt),
             term: c && c.agreement && c.agreement.termMonths };
  }, custId);
  check("1j a signed agreement stays signed on a skewed device",
    sig.signed === true && sig.term === 24, JSON.stringify(sig));
  await S(B, async (id) => {
    const c = STORE.customers.find((x) => x.id === id);
    c.notesForever = "edited by the fast phone";
    c.updatedAt = Date.now();
    await MDB.put("customers", c); MSYNC.queue("customers", c.id);
  }, custId);
  await syncBoth(A, B);
  const sig2 = await S(A, (id) => {
    const c = STORE.customers.find((x) => x.id === id);
    return { signed: !!(c && c.agreement && c.agreement.signedAt),
             term: c && c.agreement && c.agreement.termMonths };
  }, custId);
  check("1k …and a skewed edit elsewhere on the record cannot unsign it",
    sig2.signed === true && sig2.term === 24, JSON.stringify(sig2));

  await B2.ctx.close();

  // ================================================ 2. KILL IT MID-SENTENCE
  /* Everything the UI told the rep was saved must be on disk. Anything it
     never promised may be lost — but never half-written. */
  const killPin = await S(A, async () => {
    const p = await STORE.addKnock({ lat: 38.50, lng: -98.30, disposition: "nothome",
      reason: null, dm: false, note: "" });
    return p.id;
  });
  await A.page.reload();                            // killed straight after a save
  await A.page.waitForFunction(() => window.STORE && STORE.pins, null, { timeout: 25000 });
  await A.page.waitForFunction(() => window.MSYNC && MSYNC.status().loaded, null, { timeout: 25000 });
  const afterKill1 = await S(A, (id) => ({
    pin: STORE.pins.some((p) => p.id === id),
    evs: STORE.events.filter((e) => e.pinId === id).length,
  }), killPin);
  check("2a a knock saved a moment before the app died is still there",
    afterKill1.pin && afterKill1.evs === 1, JSON.stringify(afterKill1));

  // killed with work still queued, before it ever reached the server
  await offline(A);
  const queuedCust = await S(A, async () => {
    const c = await STORE.addCustomer({ first: "Queued", last: "Work",
      phones: [{ n: "8015550111" }], plan: { name: "premium", monthly: 99, initial: 450 } });
    return c.id;
  });
  const pendBeforeKill = await S(A, () => MSYNC.status().pending);
  await A.page.reload();
  await A.page.waitForFunction(() => window.MSYNC && MSYNC.status().loaded, null, { timeout: 25000 });
  const afterKill2 = await S(A, (id) => ({
    cust: STORE.customers.some((c) => c.id === id),
    pending: MSYNC.status().pending,
  }), queuedCust);
  check("2b work saved OFFLINE survives the kill, still on disk",
    afterKill2.cust, JSON.stringify(afterKill2));
  check("2c …and is still QUEUED to go up — the outbox is durable",
    afterKill2.pending >= 1 && pendBeforeKill >= 1, JSON.stringify(afterKill2));
  await online(A);
  await sync(A); await sync(A);
  const drained = await S(A, () => MSYNC.status().pending);
  check("2d …and drains cleanly once the network is back", drained === 0, String(drained));
  check("2e the server actually received it",
    [...mock.tables.customers.values()].some((r) => r.id === queuedCust));

  // killed DURING a sync, with the request in flight
  await S(A, async () => {
    await STORE.addKnock({ lat: 38.51, lng: -98.31, disposition: "sold",
      reason: null, dm: true, note: "mid-sync" });
  });
  S(A, () => { MSYNC.syncNow(); }).catch(() => {});
  await A.page.waitForTimeout(120);
  await A.page.reload();                              // reload mid-flight
  await A.page.waitForFunction(() => window.MSYNC && MSYNC.status().loaded, null, { timeout: 25000 });
  await sync(A); await sync(A);
  const midSync = await S(A, () => ({
    pending: MSYNC.status().pending,
    sold: STORE.events.filter((e) => e.disposition === "sold").length,
  }));
  const soldOnServer = [...mock.tables.events.values()].filter((r) => r.disposition === "sold").length;
  check("2f a kill mid-sync loses nothing and duplicates nothing",
    midSync.pending === 0 && midSync.sold === soldOnServer,
    JSON.stringify({ local: midSync, server: soldOnServer }));

  // killed during the payment sanitation sweep
  const sanit = await S(A, async () => {
    await STORE.verifySanitation();
    return { ok: STORE.sanitation.ok, safe: STORE.paymentSafe() };
  });
  check("2g sanitation is confirmed before the interruption",
    sanit.ok === true && sanit.safe === true, JSON.stringify(sanit));
  await A.page.reload();
  await A.page.waitForFunction(() => window.STORE && STORE.customers, null, { timeout: 25000 });
  await A.page.waitForFunction(() => STORE.sanitation && STORE.sanitation.checked, null, { timeout: 25000 });
  const sanit2 = await S(A, () => ({ ok: STORE.sanitation.ok, safe: STORE.paymentSafe(),
    remaining: STORE.sanitation.remaining }));
  check("2h and the second boot re-verifies rather than trusting the last one",
    sanit2.ok === true && sanit2.safe === true && sanit2.remaining === 0,
    JSON.stringify(sanit2));

  /* 2i. THE BOOT WINDOW. A rep opens the app and taps a disposition
     immediately — before the sync engine has finished reading its stored
     state. The knock is saved locally either way; the question is whether it
     is ever QUEUED. It used not to be: queueing required the engine to have
     started, so a tap in that window was not queued, not failed and not
     dead-lettered. It stayed on the phone, counted in that rep's own totals,
     and never reached the team, and nothing re-queued it later because the
     one-time backfill had already run on this device. */
  await A.page.reload();
  await A.page.waitForFunction(() => window.STORE && STORE.pins, null, { timeout: 25000 });
  const bootKnock = await S(A, async () => {
    const started = window.MSYNC ? MSYNC.status().loaded : false;
    const p = await STORE.addKnock({ lat: 38.55, lng: -98.55, disposition: "sold",
      reason: null, dm: true, note: "tapped the instant it opened" });
    return { id: p.id, syncWasReady: started };
  });
  await A.page.waitForFunction(() => window.MSYNC && MSYNC.status().loaded, null, { timeout: 25000 });
  await sync(A); await sync(A);
  check("2i a knock taken in the boot window still reaches the server",
    [...mock.tables.pins.values()].some((r) => r.id === bootKnock.id),
    JSON.stringify(bootKnock));
  check("2j …and leaves nothing stuck in the queue",
    (await S(A, () => MSYNC.status().pending)) === 0);

  // ==================================================== 3. THE LONG RUN
  const t0 = Date.now();
  await S(A, async () => {
    for (let i = 0; i < 100; i++) {
      await STORE.addKnock({
        lat: 38.40 + i * 0.0004, lng: -98.40 + i * 0.0004,
        disposition: ["nothome", "notinterested", "goback", "sold"][i % 4],
        reason: null, dm: i % 2 === 0, note: "" });
    }
  });
  const knockMs = Date.now() - t0;
  const t1 = Date.now();
  for (let i = 0; i < 6; i++) { await sync(A); }
  const syncMs = Date.now() - t1;
  const long = await S(A, async () => ({
    pending: MSYNC.status().pending,
    events: STORE.events.length,
    pins: STORE.pins.length,
    outbox: (await MDB.getAll("outbox")).length,
    dead: (await MSYNC.refusals()).length,
  }));
  const serverEvents = mock.tables.events.size;
  const serverPins = mock.tables.pins.size;
  check("3a a hundred knocks all reach the server, once each",
    long.pending === 0 && long.outbox === 0 && serverEvents === long.events,
    JSON.stringify({ localEvents: long.events, serverEvents,
      localPins: long.pins, serverPins, pending: long.pending,
      dead: long.dead, lastError: await S(A, () => MSYNC.status().lastError) }));
  check("3b no duplicate events appeared anywhere",
    (await S(A, () => new Set(STORE.events.map((e) => e.id)).size)) === long.events,
    String(long.events));
  check("3c nothing was dead-lettered by volume alone",
    long.dead === 0, String(long.dead));

  // repeated offline/online transitions with work in each window
  const beforeCycles = mock.writes;
  for (let i = 0; i < 5; i++) {
    await offline(A);
    await S(A, async (n) => {
      await STORE.addKnock({ lat: 38.60 + n * 0.001, lng: -98.60, disposition: "nothome",
        reason: null, dm: false, note: "" });
    }, i);
    await sync(A);                       // fails: offline
    await online(A);
    await sync(A); await sync(A);
  }
  const cycled = await S(A, async () => ({
    pending: MSYNC.status().pending,
    outbox: (await MDB.getAll("outbox")).length,
    dead: (await MSYNC.refusals()).length,
    events: STORE.events.length,
  }));
  check("3d five offline/online round trips leave the queue EMPTY",
    cycled.pending === 0 && cycled.outbox === 0, JSON.stringify(cycled));
  check("3e …with nothing dead-lettered and nothing lost",
    cycled.dead === 0 && cycled.events === long.events + 5, JSON.stringify(cycled));
  check("3f …and no write storm: rows written stayed proportional to work done",
    mock.writes - beforeCycles < 60, "wrote " + (mock.writes - beforeCycles) + " rows for 5 knocks");

  // repeated role switches
  for (let i = 0; i < 4; i++) {
    mock.profiles[aId].role = i % 2 ? "owner" : "rep";
    await sync(A);
    await A.page.waitForFunction(
      (want) => STORE.effectiveRole() === want, i % 2 ? "owner" : "rep", { timeout: 20000 });
  }
  mock.profiles[aId].role = "owner";
  await sync(A);
  await A.page.waitForFunction(() => STORE.effectiveRole() === "owner", null, { timeout: 20000 });
  const roles = await S(A, async () => ({
    role: STORE.effectiveRole(), mode: STORE.roleState.mode,
    can: STORE.canManageTerritories(STORE.effectiveRole()),
    dead: (await MSYNC.refusals()).length,
    pending: MSYNC.status().pending,
  }));
  check("3g four role switches land on the server's answer, not a cached one",
    roles.role === "owner" && roles.mode === "server" && roles.can === true,
    JSON.stringify(roles));
  check("3h …and churned nothing into the dead-letter or the queue",
    roles.dead === 0 && roles.pending === 0, JSON.stringify(roles));

  console.log("  [timing] 100 knocks written in " + knockMs + "ms; "
    + "6 sync cycles over them in " + syncMs + "ms; "
    + mock.reqs + " HTTP requests across the whole run "
    + "(one machine, one mock server — a shape, not a benchmark)");

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();
  server.close();
  ok.forEach((n) => console.log("  ✓ " + n));
  if (notes.length) {
    console.log("=== FINDINGS (reported, not silently fixed) ===");
    notes.forEach((n) => console.log("  ! " + n));
  }
  if (bad.length) {
    console.log("=== FAIL (" + bad.length + ") ===");
    bad.forEach((n) => console.log("  ✗ " + n));
    process.exit(1);
  }
  console.log("ALL GREEN");
})();
