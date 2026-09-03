/* RALLY — THE UPGRADE ITSELF.

   Every other suite runs a device that is purely one release for its whole
   life. This one runs the transition: ONE origin, ONE service-worker scope,
   a REAL service worker (not stubbed), a device that boots on the OLD
   release, and then v39 is published underneath it. The old release is a
   parameter (OLD_REF / OLD_BUILD): v38 by default, and v37 = c623c6f — the
   commit production serves — for the certification run.

   What must hold: the device lands on v39, it takes a knowable number of
   opens to get there, the old cache is gone afterwards, and nothing the rep
   had already saved is lost on the way. */
const { chromium } = require("playwright");
const { scrubTrigger } = require("./lib/scrub-trigger.js"); // the ONE mirror of 0004
const http = require("http"), fs = require("fs"), path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const V39_ROOT = path.join(__dirname, "..");
// the build label of the tree under test, read from the tree itself
const NEW_BUILD = /RALLY_BUILD = "(.*?)"/.exec(fs.readFileSync(path.join(V39_ROOT, "index.html"), "utf8"))[1];
/* The OLD release is a parameter. The default is the v38 candidate; the
   runner ALSO passes the commit production actually serves (origin/main =
   c623c6f, Build v37 — v38 was never published), so the jump that gets
   certified is the one the phones will really make. */
const OLD_REF = process.env.OLD_REF || "ac125e6";
const OLD_BUILD = process.env.OLD_BUILD || "v38";
const OLD_CACHE = "rally-" + OLD_BUILD;
const V38_REF = OLD_REF;
const V38_ROOT = `/tmp/rally-${OLD_BUILD}-tree/rally`;
const PORT = Number(process.env.PORT || 8861);
const CLOUD_PORT = PORT + 1;   // the mock Supabase lives on its OWN origin (section 7)
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

if (!fs.existsSync(path.join(V38_ROOT, "index.html"))) {
  fs.mkdirSync(`/tmp/rally-${OLD_BUILD}-tree`, { recursive: true });
  execSync(`git archive ${V38_REF} rally | tar -x -C /tmp/rally-${OLD_BUILD}-tree`,
    { cwd: path.join(V39_ROOT, ".."), stdio: "pipe" });
}
// the tree really is the release it claims to be — a wrong ref must not
// quietly certify a different upgrade
const oldLabel = (/RALLY_BUILD = "(.*?)"/.exec(fs.readFileSync(path.join(V38_ROOT, "index.html"), "utf8")) || [])[1];
if (oldLabel !== OLD_BUILD) {
  console.error(`expected a ${OLD_BUILD} tree at ${OLD_REF}, got ${oldLabel}`); process.exit(1);
}

// ONE origin. What it serves is flipped at "publish" time, exactly like a
// static deploy replacing the files under the same URLs.
let SERVING = V38_ROOT;
/* The shell is fetched BY THE SERVICE WORKER, and Playwright's route() does
   not intercept service-worker requests — so a client-side delay would never
   reach networkFirstShell and the test would be vacuous. The delay has to be
   on the wire. */
let SLOW_JS_MS = 0;
const served = { old: 0, [NEW_BUILD]: 0 };   // "old" and the new build's own label
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json", ".pbf": "application/x-protobuf" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  served[SERVING === V38_ROOT ? "old" : NEW_BUILD]++;
  const delay = (SLOW_JS_MS && /\.js$/.test(p) && !/index\.html$/.test(p)) ? SLOW_JS_MS : 0;
  fs.readFile(path.join(SERVING, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    setTimeout(() => {
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(p)] || "application/octet-stream",
        "Cache-Control": "no-cache",   // the SW is the cache, not the HTTP layer
      });
      res.end(d);
    }, delay);
  });
});

/* ---------------- a tiny Supabase, on its OWN origin ----------------
   Production's cloud is a different origin from the shell, so the shell
   worker never sees an API request. The same must hold here: a same-origin
   mock would have its GETs run through networkFirstShell and CACHED, and a
   "dead zone" would quietly answer from that cache. So: a second server, a
   second port, CORS like Supabase. When `cloud.down` the socket is simply
   destroyed — no bytes, no status — which is what a phone in a basement
   actually gets. */
const TEAM = "11111111-1111-4111-a111-111111111111";
const cloud = {
  down: false, users: {}, profiles: {}, access: {},
  tables: { pins: new Map(), events: new Map(), territories: new Map(), customers: new Map() },
  rawBodies: [], writes: 0, clock: Date.parse("2026-09-01T00:00:00Z"),
  splits: new Map(), rpcCalls: 0,   // 0005's smart_split_territory, as the server holds it
};
const tick = () => new Date(++cloud.clock).toISOString();
function addUser(email, password, prof) {
  const id = crypto.randomUUID();
  cloud.users[email] = { id, password };
  cloud.profiles[id] = Object.assign(
    { id, team_id: TEAM, role: "rep", name: "", email, disabled: false }, prof);
  return id;
}
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, prefer, x-client-info, range",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "*",
};
const j = (res, code, body) => {
  res.writeHead(code, Object.assign({ "Content-Type": "application/json" }, CORS));
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const authOf = (req) => cloud.access[String(req.headers.authorization || "").replace(/^Bearer /, "")];
function handleRest(req, res, u, body) {
  const uid = authOf(req);
  if (!uid) return j(res, 401, { message: "JWT invalid" });
  const me = cloud.profiles[uid];
  const table = u.pathname.replace("/rest/v1/", "");
  /* 0005 smart_split_territory, the parts a client can observe: leadership
     only, the parent must be a live row of the caller's team, the operation
     is idempotent, children are inserted and the parent tombstoned in one
     step. */
  if (u.pathname === "/rest/v1/rpc/smart_split_territory") {
    cloud.rpcCalls++;
    if (!["leader", "manager", "owner"].includes(me.role) || me.disabled)
      return j(res, 403, { code: "42501", message: "smart split: requires leader, manager or owner" });
    const prior = cloud.splits.get(me.team_id + "|" + body.p_operation_id);
    if (prior) return j(res, 200, Object.assign({ status: "already_committed" }, prior));
    const parent = cloud.tables.territories.get(me.team_id + "|" + body.p_parent_id);
    if (!parent) return j(res, 403, { code: "42501", message: "smart split: parent not found for this team" });
    if (parent.deleted_at) return j(res, 400, { code: "55000", message: "smart split: parent is already deleted or split" });
    const kids = Array.isArray(body.p_children) ? body.p_children : [];
    if (kids.length < 2 || kids.length > 8) return j(res, 400, { code: "22023", message: "smart split: 2 to 8 children" });
    const at = tick();
    for (const k of kids) cloud.tables.territories.set(me.team_id + "|" + k.id,
      { team_id: me.team_id, id: k.id, name: k.name || "", polygon: k.polygon, homes: k.homes,
        data: k.data || {}, created_by: uid, deleted_at: null, created_at: at, updated_at: at });
    Object.assign(parent, { deleted_at: at, updated_at: at });
    const out = { operation_id: body.p_operation_id, parent_id: body.p_parent_id, child_ids: kids.map((k) => k.id) };
    cloud.splits.set(me.team_id + "|" + body.p_operation_id, out);
    cloud.writes++;
    return j(res, 200, Object.assign({ status: "committed" }, out));
  }
  if (table === "profiles") {
    const want = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    const rows = Object.values(cloud.profiles).filter((p) =>
      p.id === uid || (p.team_id === me.team_id && p.team_id));
    return j(res, 200, want ? rows.filter((r) => r.id === want) : rows);
  }
  const t = cloud.tables[table];
  if (!t) return j(res, 404, { message: "not found" });
  if (req.method === "POST") {
    const prefer = String(req.headers.prefer || "");
    const rows = Array.isArray(body) ? body : [body];
    const reqClock = tick();
    for (const row of rows) {
      if (row.team_id !== me.team_id)
        return j(res, 401, { code: "42501", message: "row-level security" });
      if (table === "events" && row.by_user && row.by_user !== uid)
        return j(res, 401, { code: "42501", message: "row-level security (by_user)" });
      const key = row.team_id + "|" + row.id;
      const existing = t.get(key);
      if (existing) {
        if (prefer.includes("ignore-duplicates")) continue;
        if (table === "events") return j(res, 401, { code: "42501", message: "permission denied for events" });
        // BEFORE INSERT OR UPDATE fires twice for an upsert — see sync-test.js
        const proposed = JSON.parse(JSON.stringify(row));
        if (table === "customers") scrubTrigger(proposed, null);
        const merged = Object.assign({}, existing, proposed,
          { created_at: existing.created_at, updated_at: reqClock });
        if (table === "customers") scrubTrigger(merged, existing);
        t.set(key, merged);
      } else {
        const fresh = Object.assign({}, row, { created_at: reqClock });
        if (table !== "events") fresh.updated_at = fresh.created_at;
        if (table === "customers") scrubTrigger(fresh, null);
        t.set(key, fresh);
      }
      cloud.writes++;
    }
    return j(res, 201, prefer.includes("return=minimal") ? undefined : rows);
  }
  if (req.method === "PATCH") {
    if (table === "events") return j(res, 401, { code: "42501" });
    const id = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    const teamQ = String(u.searchParams.get("team_id") || "").replace(/^eq\./, "");
    const wantRep = String(req.headers.prefer || "").includes("return=representation");
    if (teamQ !== me.team_id) return j(res, 200, wantRep ? [] : undefined);
    const row = t.get(teamQ + "|" + id);
    if (row) {
      const before = JSON.parse(JSON.stringify(row));
      Object.assign(row, body, { updated_at: tick() });
      if (table === "customers") scrubTrigger(row, before);
      cloud.writes++;
      return j(res, 200, wantRep ? [row] : undefined);
    }
    return j(res, 200, wantRep ? [] : undefined);   // matched nothing: 2xx, zero rows
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
const cserver = http.createServer((req, res) => {
  if (cloud.down) { req.socket.destroy(); return; }       // the dead zone
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }
  const u = new URL(req.url, "http://x");
  let raw = "";
  req.on("data", (c) => raw += c);
  req.on("end", () => {
    let body = {};
    try { body = JSON.parse(raw || "{}"); } catch (_) {}
    if (raw) cloud.rawBodies.push(raw);
    if (u.pathname === "/auth/v1/token") {
      const usr = cloud.users[String(body.email || "").toLowerCase()];
      if (u.searchParams.get("grant_type") === "password") {
        if (!usr || usr.password !== body.password)
          return j(res, 400, { error_description: "Invalid login credentials" });
        const a = "at-" + crypto.randomBytes(8).toString("hex");
        cloud.access[a] = usr.id;
        return j(res, 200, { access_token: a, refresh_token: "rt-" + a, token_type: "bearer",
          expires_in: 3600, user: { id: usr.id, email: body.email } });
      }
      return j(res, 400, { error_description: "unsupported" });
    }
    if (u.pathname === "/auth/v1/logout") return j(res, 204);
    if (u.pathname.startsWith("/rest/v1/")) return handleRest(req, res, u, body);
    return j(res, 404, {});
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  await new Promise((r) => cserver.listen(CLOUD_PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  // a persistent-ish context: service workers ALLOWED (this is the point)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript(() => {
    window.RALLY_CLOUD = { url: "", anonKey: "" }; // local-only: this is about the shell
    // how many times a worker took this tab over — survives the self-reloads
    try {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        sessionStorage.cc = String(Number(sessionStorage.cc || 0) + 1);
      });
    } catch (_) {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && !/net::ERR_/.test(t)) errors.push(t);
  });

  const build = () => page.evaluate(() => window.RALLY_BUILD).catch(() => undefined);
  /* The app reloads ITSELF when the new worker claims the page, so any read
     can land in a destroyed execution context. Poll through it rather than
     racing it — this is about what the device ends up on, not about timing. */
  const waitForBuild = async (want, ms) => {
    const until = 60 * 60 * 1000; // wall-clock is provided by the runner
    let waited = 0;
    while (waited < ms) {
      const b = await build();
      if (b === want) return b;
      await page.waitForTimeout(250).catch(() => {});
      waited += 250;
      if (until < 0) break;
    }
    return build();
  };
  // same reason as build(): a self-reload can destroy the context mid-read
  const cacheNames = async () => {
    for (let i = 0; i < 40; i++) {
      const r = await page.evaluate(() => caches.keys()).catch(() => null);
      if (r) return r;
      await page.waitForTimeout(250).catch(() => {});
    }
    return [];
  };
  const settle = (ms) => page.waitForTimeout(ms);

  // ONLY7=1 skips to section 7 — for repeating the suspended-device case
  if (!process.env.ONLY7) {
  // ---- 1. boot on v38 with a real service worker ----
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => document.querySelector("#splash").hidden, null, { timeout: 25000 });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 25000 })
    .catch(() => {});
  await settle(1500);
  check(`1a the device boots on ${OLD_BUILD}`, (await build()) === OLD_BUILD, await build());
  check("1b a real service worker took control",
    await page.evaluate(() => !!navigator.serviceWorker.controller));
  const c1 = await cacheNames();
  check(`1c and populated the ${OLD_BUILD} cache`, c1.includes(OLD_CACHE), JSON.stringify(c1));

  // the rep does real work on v38
  await page.click("#gate-swap-btn"); await settle(300);
  await page.fill("#gate-name", "Upgrade Rep");
  await page.fill("#gate-email", "up@example.com");
  await page.fill("#gate-pass", "knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 25000 });
  await settle(800);
  await page.evaluate(async () => {
    // a hood first, so the doors below attribute to it the way real knocks do
    window.__hood = await STORE.addTerritory({ name: "ZZ Test Hood", homes: 12,
      points: [[-98.31, 38.39], [-98.29, 38.39], [-98.29, 38.41], [-98.31, 38.41]] });
    await STORE.addCustomer({ first: "Before", last: "Upgrade", phones: [], appointments: [],
      plan: { id: "prem", name: "Premium", monthly: 99, initial: 450 },
      payment: { method: "card", autopay: true, last4: "4242",
        card: { name: "Before Upgrade", number: "4111111111111111", exp: "01/30" },
        ach: { name: "", routing: "021000021", account: "000123456789", type: "checking" },
        billingAddress: null } });
    await STORE.addKnock({ lat: 38.4, lng: -98.3, disposition: "sold", reason: null, dm: true, note: "" });
    // a MARKED pin: a door of the hood (pins get their hood by being imported
    // into it — an ad-hoc knock attributes only its event), knocked as a
    // go-back with a callback time and a note. The iPhone checklist's test
    // pin is exactly this.
    await STORE.importDoors([{ lat: 38.401, lng: -98.301, address: "12 Test Ln", source: "test" }],
      { territoryId: window.__hood.id });
    const door = STORE.pins.find((p) => p.address === "12 Test Ln");
    window.__marked = await STORE.addKnock({ pinId: door.id, lat: door.lat, lng: door.lng,
      disposition: "goback", reason: null, dm: false, note: "MARKED TEST PIN",
      callbackAt: Date.now() + 3600e3 });
  });
  const beforeCounts = await page.evaluate(() => ({
    cust: STORE.customers.length, pins: STORE.pins.length, events: STORE.events.length,
    hoods: STORE.territories.length,
    marked: { id: window.__marked.id, cb: window.__marked.callbackAt, note: window.__marked.note,
      tid: window.__marked.territoryId || null },
    hood: { id: window.__hood.id, name: window.__hood.name, pts: window.__hood.points.length },
  }));
  check(`1d the rep's ${OLD_BUILD} work is saved`, beforeCounts.cust === 1 && beforeCounts.events === 2 &&
    beforeCounts.pins === 2 && beforeCounts.hoods === 1 && beforeCounts.marked.tid === beforeCounts.hood.id,
    JSON.stringify(beforeCounts));
  check("1e …and a pre-v39 record really does hold raw credentials",
    await page.evaluate(async () => JSON.stringify(await MDB.getAll("customers"))
      .includes("4111111111111111")));

  // ---- 2. PUBLISH v39 under the running device ----
  SERVING = V39_ROOT;
  const newFetchesBefore = served[NEW_BUILD] || 0;

  // one reopen, exactly what a rep does
  let opens = 0;
  await page.goto(`http://localhost:${PORT}/`); opens++;
  // the app reloads itself when the new worker claims — ride it out
  const buildAfter1 = await waitForBuild(NEW_BUILD, 40000);
  // let the self-reload finish completely before inspecting anything
  await page.waitForFunction(() => !!(window.STORE && STORE.customers), null, { timeout: 25000 })
    .catch(() => {});
  await settle(2000);
  check(`2a ONE reopen is enough to land on ${NEW_BUILD}`, buildAfter1 === NEW_BUILD, String(buildAfter1));
  check("2b the new worker actually fetched the new assets",
    (served[NEW_BUILD] || 0) > newFetchesBefore,
    `fetches=${(served[NEW_BUILD] || 0) - newFetchesBefore}`);
  const c2 = await cacheNames();
  check("2c the new cache exists — the new worker installed on this open", c2.includes(("rally-" + NEW_BUILD)), JSON.stringify(c2));
  /* WHEN the new worker takes over is the browser's call, not v39's: a
     skip-waiting worker activates only once the old worker has no work in
     flight (Chromium: IsReadyToActivate needs HasNoWork). Sometimes that is
     during this open, sometimes at the next. v39 controls the rest —
     skipWaiting, claim, reload-on-takeover, versioned assets — so what is
     asserted is: the old cache is gone once the takeover has happened (here
     or in 4c), and the page is coherent either way (4e, 6b). */
  const takeovers1 = await page.evaluate(() => Number(sessionStorage.cc || 0)).catch(() => -1);
  check(`2d once the new worker has taken over, the ${OLD_BUILD} cache is gone`,
    takeovers1 < 2 || !c2.includes(OLD_CACHE), JSON.stringify({ takeovers: takeovers1, caches: c2 }));
  check("2e the running page is controlled by a worker",
    await page.evaluate(() => !!navigator.serviceWorker.controller));

  // ---- 3. nothing the rep did was lost, and v39's migration ran ----
  await page.waitForFunction(() => !!(window.STORE && STORE.customers), null, { timeout: 20000 });
  await settle(800);
  const after = await page.evaluate(async (b) => {
    const marked = STORE.pins.find((p) => p.id === b.marked.id) || null;
    const hood = STORE.territories.find((t) => t.id === b.hood.id) || null;
    return {
      cust: STORE.customers.length, pins: STORE.pins.length, events: STORE.events.length,
      hoods: STORE.territories.length,
      marked: marked && { cb: marked.callbackAt, note: marked.note, dispo: marked.disposition,
        tid: marked.territoryId || null },
      hood: hood && { name: hood.name, pts: (hood.points || []).length,
        split: !!hood.splitInto, archived: !!hood.archived },
      raw: JSON.stringify(await MDB.getAll("customers")).includes("4111111111111111"),
      pay: JSON.stringify((STORE.customers[0] || {}).payment),
      gateShut: document.querySelector("#gate").hidden,
    };
  }, beforeCounts);
  check(`3a every record the rep saved on ${OLD_BUILD} survives the upgrade`,
    after.cust === beforeCounts.cust && after.pins === beforeCounts.pins &&
    after.events === beforeCounts.events && after.hoods === beforeCounts.hoods, JSON.stringify(after));
  check("3a1 the marked pin is still marked — same callback time, note, outcome and hood",
    !!after.marked && after.marked.cb === beforeCounts.marked.cb &&
    after.marked.note === "MARKED TEST PIN" && after.marked.dispo === "goback" &&
    after.marked.tid === beforeCounts.marked.tid, JSON.stringify(after.marked));
  check("3a2 the hood is intact — same name and outline, live, not split or archived",
    !!after.hood && after.hood.name === beforeCounts.hood.name && after.hood.pts === beforeCounts.hood.pts &&
    !after.hood.split && !after.hood.archived, JSON.stringify(after.hood));
  check("3b the device is still unlocked — the rep is not thrown back to the gate",
    after.gateShut === true);
  check(`3c v39's boot purge stripped the credentials the ${OLD_BUILD} record carried`,
    after.raw === false, after.pay);
  check("3d …and kept the safe metadata", /"last4":"4242"/.test(after.pay), after.pay);
  // the purge DELETES the legacy key; honestPayment supplies the honest
  // answer on read. Neither invents a request from the old default.
  check("3e the legacy autopay default is gone from the stored record",
    !/"autopay":/.test(after.pay), after.pay);
  check("3f …and reads back as no request and nothing configured",
    await page.evaluate(() => {
      const p = MCUST.honestPayment(STORE.customers[0].payment);
      return p.autopayRequested === false && p.status === "pending_setup" && p.last4 === "4242";
    }));

  // ---- 4. a second open changes nothing (idempotent, no reload loop) ----
  const reloadsBefore = served[NEW_BUILD] || 0;
  // if the takeover lands on THIS open, the app's own reload interrupts the
  // navigation (net::ERR_ABORTED) — that is the takeover, not a failure
  let abort2 = null;
  await page.goto(`http://localhost:${PORT}/`).catch((e) => { abort2 = String(e).split("\n")[0]; }); opens++;
  const buildAfter2 = await waitForBuild(NEW_BUILD, 40000);
  const takeoversAfter = await page.evaluate(() => Number(sessionStorage.cc || 0)).catch(() => -1);
  check("4a0 by the second open the new worker has taken this device over",
    takeoversAfter >= 1 && (abort2 === null || /ERR_ABORTED/.test(abort2)),
    JSON.stringify({ abort2, takeovers: takeoversAfter }));
  await page.waitForFunction(() => !!(window.STORE && STORE.customers), null, { timeout: 25000 })
    .catch(() => {});
  await settle(1500);
  check(`4a a second open stays on ${NEW_BUILD}`, buildAfter2 === NEW_BUILD, String(buildAfter2));
  check("4b …and does not loop reloading",
    (served[NEW_BUILD] || 0) - reloadsBefore < 120,
    `fetches=${(served[NEW_BUILD] || 0) - reloadsBefore}`);
  const c3 = await cacheNames();
  check("4c caches are stable", c3.includes(("rally-" + NEW_BUILD)) && !c3.includes(OLD_CACHE),
    JSON.stringify(c3));
  check("4d total user-initiated opens needed: 1", opens === 2, `opens=${opens}`);

  /* ---- 4e. RELEASE COHERENCE ----
     "Build v39" must mean every loaded module is v39, not merely that
     index.html is. Each of these lives in a DIFFERENT file, so a mixed load
     would show up as a v39 build label with a v38-shaped API somewhere.
     app.js is the LAST module the shell loads: wait for it, so a slow
     machine mid-load is not mistaken for a mixed release. */
  await page.waitForFunction(() => !!(window.MAPP && window.MSYNC && window.MCUST && window.MDATA),
    null, { timeout: 25000 }).catch(() => {});
  const coherence = await page.evaluate(() => ({
    build: window.RALLY_BUILD,
    store_v39: typeof STORE.canManageTerritories === "function",
    store_v38: typeof STORE.isManager === "function",
    sync_v39: typeof MSYNC.refusals === "function",
    customers_v39: typeof MCUST.honestPayment === "function",
    data_v39: typeof MDATA.DEMO_TEAM === "undefined",
    app_v39: !!(window.MAPP && MAPP.roleChanged),
  }));
  check("4e every module is from the same release as the build label",
    coherence.build === NEW_BUILD && coherence.store_v39 && !coherence.store_v38 &&
    coherence.sync_v39 && coherence.customers_v39 && coherence.data_v39 &&
    coherence.app_v39, JSON.stringify(coherence));

  // ---- 5. the operator's verification signal is visible ----
  await page.evaluate(() => MAPP.show("more"));
  await settle(600);
  const buildLabel = await page.$eval("#more-build", (e) => e.textContent).catch(() => "");
  check("5a More shows the build, so a device can be verified by eye",
    buildLabel.includes(NEW_BUILD), buildLabel);

  /* ---- 6. THE TRANSITION MOMENT, ON A SLOW LINK ----
     This is the only window where a mixed release was ever possible, and it
     needs a FRESH context: a device whose cache still holds the OLD release
     while the new one is published under it. (Testing this after the upgrade
     proves nothing — the old cache has already been deleted by then.)

     index.html is served fast; every module is delayed past the shell's
     3.5s per-file race. With bare filenames the new index.html asked for
     urls the OLD cache already had, so each raced, timed out, and resolved
     to the OLD module: a v39 page running v38 code. Versioned urls are
     absent from that cache, so the no-cache branch runs and the module is
     awaited instead of raced. */
  {
    SERVING = V38_ROOT;
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await c2.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await c2.addInitScript(() => { window.RALLY_CLOUD = { url: "", anonKey: "" }; });
    const p2 = await c2.newPage();
    await p2.goto(`http://localhost:${PORT}/`);
    await p2.waitForFunction(() => document.querySelector("#splash").hidden, null, { timeout: 25000 });
    await p2.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 25000 })
      .catch(() => {});
    await p2.waitForTimeout(1500);
    const pre = await p2.evaluate(() => ({ b: window.RALLY_BUILD, k: null }))
      .then(async (x) => ({ ...x, k: await p2.evaluate(() => caches.keys()) }));
    check(`6a the device is on ${OLD_BUILD} with a populated ${OLD_BUILD} cache`,
      pre.b === OLD_BUILD && pre.k.includes(OLD_CACHE), JSON.stringify(pre));

    // publish v39 underneath it, and make every module slower than the race
    SERVING = V39_ROOT;
    SLOW_JS_MS = 4500;                    // > NET_TIMEOUT_MS (3500), on the wire
    await p2.goto(`http://localhost:${PORT}/`);
    await p2.waitForFunction(() => !!(window.STORE && window.MSYNC && window.MCUST),
      null, { timeout: 90000 }).catch(() => {});
    await p2.waitForTimeout(1500);
    const mix = await p2.evaluate(() => ({
      build: window.RALLY_BUILD,
      store_v39: typeof STORE.canManageTerritories === "function",
      store_v38: typeof STORE.isManager === "function",
      sync_v39: typeof MSYNC.refusals === "function",
      customers_v39: typeof MCUST.honestPayment === "function",
      data_v39: typeof MDATA.DEMO_TEAM === "undefined",
    })).catch((e) => ({ error: String(e).slice(0, 80) }));
    // Either outcome is CORRECT: a coherent v39 page, or a coherent v38 page
    // (the shell itself fell back to cache). What must never happen is a v39
    // label over v38 modules.
    const coherentV39 = mix.build === NEW_BUILD && mix.store_v39 && !mix.store_v38 &&
      mix.sync_v39 && mix.customers_v39 && mix.data_v39;
    const coherentV38 = mix.build === OLD_BUILD && !mix.store_v39 && mix.store_v38 &&
      !mix.sync_v39 && !mix.customers_v39;
    check("6b a slow link at the transition cannot produce a MIXED release",
      coherentV39 || coherentV38, JSON.stringify(mix));
    check(`6c …and it is not a v39 label over ${OLD_BUILD} modules`,
      !(mix.build === NEW_BUILD && mix.store_v38), JSON.stringify(mix));
    await c2.close();
    SLOW_JS_MS = 0;
    SERVING = V39_ROOT;
  }


  }

  /* ---- 7. THE SUSPENDED DEVICE WITH UNSENT WORK ----
     The real phone: signed in to the cloud, left OPEN and suspended, some of
     its work never uploaded because the last stretch was a dead zone. Then
     v39 is published underneath it. Nothing is tapped. What must hold: the
     worker update alone carries the device to v39 coherently, every queued
     write is still queued under v39 with the same keys and ops, the hood /
     marked pin / customer are all there, the rep is still signed in, and
     when coverage returns v39 drains the OLD build's queue to the server
     without losing or inventing anything. */
  {
    addUser("up@x.com", "knock1234", { name: "Upgrade Owner", role: "owner" });
    SERVING = V38_ROOT; cloud.down = false;
    const c7 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await c7.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await c7.addInitScript((port) => {
      window.RALLY_CLOUD = { url: "http://localhost:" + port, anonKey: "test-anon", pollMs: 900 };
    }, CLOUD_PORT);
    const p7 = await c7.newPage();
    const errors7 = [];
    p7.on("pageerror", (e) => errors7.push("PAGEERROR " + e.message));
    p7.on("console", (m) => {
      const t = m.text();
      if (m.type() === "error" && !/net::ERR_/.test(t) && !/WebSocket/.test(t)) errors7.push(t);
    });
    const b7 = () => p7.evaluate(() => window.RALLY_BUILD).catch(() => undefined);
    const wait7 = async (want, ms) => {
      for (let w = 0; w < ms; w += 250) {
        if ((await b7()) === want) return want;
        await p7.waitForTimeout(250).catch(() => {});
      }
      return b7();
    };
    const st7 = () => p7.evaluate(() => MSYNC.status());
    // MSYNC.syncNow() is cycle(), which returns instantly while another
    // cycle is in flight — wait that out, THEN run a real one (sync-test.js)
    const sync7 = async () => {
      await p7.evaluate(async () => {
        for (let i = 0; i < 200 && MSYNC.status().running; i++) await new Promise((r) => setTimeout(r, 50));
        await MSYNC.syncNow();
      }).catch(() => {});
      await p7.waitForTimeout(300);
    };
    const boxOf = () => p7.evaluate(async () =>
      (await MDB.getAll("outbox")).map((e) => ({ k: e.k, op: e.op, wasOnServer: e.wasOnServer }))
        .sort((a, b) => (a.k < b.k ? -1 : 1)));
    const key = (id) => TEAM + "|" + id;

    await p7.goto(`http://localhost:${PORT}/`);
    await p7.waitForFunction(() => document.querySelector("#splash").hidden, null, { timeout: 25000 });
    await p7.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 25000 })
      .catch(() => {});
    await p7.fill("#gate-email", "up@x.com"); await p7.fill("#gate-pass", "knock1234");
    await p7.click("#gate-submit");
    await p7.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 25000 });
    await p7.waitForTimeout(1000);
    // the old worker itself (Playwright can evaluate in a Chromium service
    // worker) — used only to ask whether it is still running, never patched
    const oldSW = c7.serviceWorkers()[0] || await c7.waitForEvent("serviceworker", { timeout: 10000 }).catch(() => null);
    const oldAlive = () => oldSW ? oldSW.evaluate(() => 1).then(() => true, () => false) : Promise.resolve(null);
    check(`7a a cloud-signed-in ${OLD_BUILD} device with a real worker`,
      (await b7()) === OLD_BUILD && await p7.evaluate(() => !!navigator.serviceWorker.controller));

    // in coverage: one door reaches the server (it will be deleted in the dead zone)
    const idA = await p7.evaluate(async () => (await STORE.addKnock({ lat: 38.402, lng: -98.302,
      disposition: "nothome", reason: null, dm: false, note: "" })).id);
    for (let i = 0; i < 8 && !cloud.tables.pins.has(key(idA)); i++) await sync7();
    check("7b the in-coverage door reached the server before the dead zone",
      cloud.tables.pins.has(key(idA)) && (await st7()).pending === 0, JSON.stringify(await st7()));

    // the dead zone: a hood, a marked door, a customer with the OLD build's
    // raw payment fields, a door knocked then deleted, and the server-known
    // door deleted too
    cloud.down = true;
    const writesBefore = cloud.writes;
    const ids = await p7.evaluate(async (idA) => {
      const hood = await STORE.addTerritory({ name: "ZZ Suspended Hood", homes: 8,
        points: [[-98.32, 38.38], [-98.28, 38.38], [-98.28, 38.42], [-98.32, 38.42]] });
      await STORE.importDoors([{ lat: 38.403, lng: -98.303, address: "7 Dead Zone Ct", source: "test" }],
        { territoryId: hood.id });
      const door = STORE.pins.find((p) => p.address === "7 Dead Zone Ct");
      const marked = await STORE.addKnock({ pinId: door.id, lat: door.lat, lng: door.lng,
        disposition: "goback", reason: null, dm: true, note: "MARKED TEST PIN",
        callbackAt: Date.now() + 7200e3 });
      await STORE.addCustomer({ first: "Suspended", last: "Signup", phones: [], appointments: [],
        plan: { id: "prem", name: "Premium", monthly: 99, initial: 450 },
        payment: { method: "card", autopay: true, last4: "4242",
          card: { name: "Suspended Signup", number: "4111111111111111", exp: "01/30" },
          ach: { name: "", routing: "021000021", account: "000123456789", type: "checking" },
          billingAddress: null } });
      const cust = STORE.customers.find((c) => c.last === "Signup");
      const gone = await STORE.addKnock({ lat: 38.404, lng: -98.304, disposition: "dnk",
        reason: null, dm: false, note: "" });
      await STORE.deletePin(gone.id);
      await STORE.deletePin(idA);
      return { hood: hood.id, marked: marked.id, cust: cust.id, gone: gone.id,
        markedTid: marked.territoryId || null, cb: marked.callbackAt };
    }, idA);
    await sync7(); await sync7();
    const box37 = await boxOf();
    const stDown = await st7();
    check(`7c the dead zone left every ${OLD_BUILD} write queued and nothing reached the server`,
      box37.length >= 5 && stDown.pending === box37.length && cloud.writes === writesBefore,
      JSON.stringify({ n: box37.length, pending: stDown.pending, writes: cloud.writes - writesBefore, err: stDown.lastError }));
    const dels37 = box37.filter((e) => e.op === "delete");
    check(`7c1 ${OLD_BUILD} queued both deletes, and its entries carry no wasOnServer (a v39 field)`,
      dels37.length === 2 && dels37.every((e) => e.wasOnServer === undefined) &&
      box37.some((e) => e.k === "territories:" + ids.hood) && box37.some((e) => e.k === "customers:" + ids.cust),
      JSON.stringify(box37));
    check("7c2 the door knocked in the dead zone stayed in its hood locally",
      ids.markedTid === ids.hood, JSON.stringify(ids));

    // ---- publish v39 underneath the suspended device ----
    SERVING = V39_ROOT;
    // the browser's own update check — what a resumed PWA runs — NOT a tap,
    // NOT a navigation. Still in the dead zone.
    await p7.evaluate(() => navigator.serviceWorker.getRegistration()
      .then((r) => r && r.update()).catch(() => {}));
    /* Sample the device while it waits. Two things are the browser's:
       WHETHER the skip-waiting worker activates now (Chromium activates it
       only once the old worker has no work in flight — measured here: the
       old worker is sometimes already idle-terminated and the new one still
       sits in "installed") and therefore whether the in-place reload happens
       before the next open. What is v39's, and asserted: at EVERY sample the
       shell is coherent — the whole old build or the whole new one, never a
       mix — and the device is on v39 after at most ONE open. */
    const timeline = [];
    const sample = () => p7.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      const st = (w) => (w ? w.state : null);
      const b = window.RALLY_BUILD;
      const newApi = typeof STORE.canManageTerritories === "function" && typeof MSYNC.refusals === "function";
      const oldApi = typeof STORE.isManager === "function" && typeof MSYNC.refusals !== "function";
      return { i: st(r && r.installing), w: st(r && r.waiting), a: st(r && r.active),
        cc: Number(sessionStorage.cc || 0), b,
        coherent: (b === NEW_BUILD && newApi && !oldApi) || (b !== NEW_BUILD && oldApi && !newApi) };
    }).catch(() => ({ reloading: true, coherent: true }));
    let landed, path = "in place";
    for (let w = 0; w < 20000; w += 2000) {
      timeline.push(await sample());
      landed = await b7();
      if (landed === NEW_BUILD) break;
      await p7.waitForTimeout(2000).catch(() => {});
    }
    timeline.push({ oldWorkerAlive: await oldAlive() });
    if (landed !== NEW_BUILD) {
      // the takeover did not land in place: ONE open, the app's own reload
      // may interrupt it (net::ERR_ABORTED) — that is the takeover
      path = "one reopen";
      await p7.goto(`http://localhost:${PORT}/`).catch((e) => {
        if (!/ERR_ABORTED/.test(String(e))) throw e;
      });
      landed = await wait7(NEW_BUILD, 40000);
    }
    await p7.waitForFunction(() => !!(window.STORE && STORE.customers && window.MSYNC && MSYNC.status),
      null, { timeout: 25000 }).catch(() => {});
    await p7.waitForTimeout(2500);
    check("7d the suspended device is on v39 after at most one open — the worker update alone, or the next open",
      landed === NEW_BUILD, `${path} — ${JSON.stringify(timeline)}`);
    check("7d1 at no sample while it waited was the shell a MIX of releases",
      timeline.every((t) => t.coherent !== false), JSON.stringify(timeline.filter((t) => t.coherent === false)));
    const c7keys = await p7.evaluate(() => caches.keys()).catch(() => []);
    const post = await p7.evaluate(async (ids) => {
      const box = (await MDB.getAll("outbox")).map((e) => ({ k: e.k, op: e.op, wasOnServer: e.wasOnServer }))
        .sort((a, b) => (a.k < b.k ? -1 : 1));
      const hood = STORE.territories.find((t) => t.id === ids.hood) || null;
      const marked = STORE.pins.find((p) => p.id === ids.marked) || null;
      const cust = STORE.customers.find((c) => c.id === ids.cust) || null;
      const custRaw = JSON.stringify(await MDB.getAll("customers"));
      return {
        build: window.RALLY_BUILD, st: MSYNC.status(), box,
        hood: hood && { name: hood.name, pts: (hood.points || []).length, split: !!hood.splitInto },
        marked: marked && { note: marked.note, cb: marked.callbackAt, tid: marked.territoryId || null,
          dispo: marked.disposition },
        cust: cust && { last: cust.last, pay: JSON.stringify(cust.payment) },
        gone: STORE.pins.some((p) => p.id === ids.gone) || STORE.pins.some((p) => p.id === ids.a),
        raw: /4111111111111111|021000021|000123456789/.test(custRaw),
        gateShut: document.querySelector("#gate").hidden,
        coherent: typeof STORE.canManageTerritories === "function" && typeof MSYNC.refusals === "function" &&
          typeof MCUST.honestPayment === "function" && typeof STORE.isManager !== "function",
      };
    }, Object.assign({ a: idA }, ids));
    check("7e v39 booted coherently over the old device's storage, old cache gone",
      post.build === NEW_BUILD && post.coherent && c7keys.includes(("rally-" + NEW_BUILD)) && !c7keys.includes(OLD_CACHE),
      JSON.stringify({ b: post.build, coherent: post.coherent, caches: c7keys }));
    check(`7f every ${OLD_BUILD} outbox entry is still queued under v39 — same keys, same ops, still counted`,
      JSON.stringify(post.box) === JSON.stringify(box37) && post.st.pending === box37.length,
      JSON.stringify({ before: box37, after: post.box, pending: post.st.pending }));
    check("7g the hood, the marked pin and the customer survived the in-place upgrade; the deleted doors stayed deleted",
      !!post.hood && post.hood.name === "ZZ Suspended Hood" && post.hood.pts === 4 && !post.hood.split &&
      !!post.marked && post.marked.note === "MARKED TEST PIN" && post.marked.cb === ids.cb &&
      post.marked.dispo === "goback" && post.marked.tid === ids.markedTid &&
      !!post.cust && post.cust.last === "Signup" && !post.gone,
      JSON.stringify({ hood: post.hood, marked: post.marked, cust: post.cust && post.cust.last, gone: post.gone }));
    check("7h the raw card and bank numbers the old build stored are gone, and the rep is still signed in",
      post.raw === false && post.gateShut === true,
      JSON.stringify({ raw: post.raw, gate: post.gateShut, pay: post.cust && post.cust.pay }));

    // ---- coverage returns ----
    cloud.down = false;
    let drained = false;
    for (let i = 0; i < 8 && !drained; i++) {
      await sync7();
      const s = await st7();
      drained = s.pending === 0 && !s.running;
    }
    const fin = await p7.evaluate(async () => ({
      st: MSYNC.status(), box: (await MDB.getAll("outbox")).map((e) => e.k), dead: await MSYNC.refusals(),
    }));
    check(`7i back in coverage, v39 drains the ${OLD_BUILD} queue`,
      drained && fin.box.length === 0, JSON.stringify({ st: fin.st, box: fin.box }));
    /* The door knocked AND deleted in the dead zone was never on the server.
       Its OLD-build delete entry carries no wasOnServer, and v39 treats "no
       evidence" as "refused" by design (sync.js, the zero-row PATCH path):
       the entry is parked and SHOWN as a refusal rather than dropped. That
       is the one thing the queue does not call done — and it must be the
       only one. */
    const deadKeys = fin.dead.map((d) => d.k);
    check("7j the only refusal is the delete of the door that never existed on the server — surfaced, not swallowed",
      deadKeys.length === 1 && deadKeys[0] === "pins:" + ids.gone, JSON.stringify(fin.dead));
    const sHood = cloud.tables.territories.get(key(ids.hood));
    const sMarked = cloud.tables.pins.get(key(ids.marked));
    const sCust = cloud.tables.customers.get(key(ids.cust));
    const sA = cloud.tables.pins.get(key(idA));
    const sGone = cloud.tables.pins.get(key(ids.gone));
    check("7k the server now holds the hood, the marked door with its callback and note, and the customer",
      !!sHood && !sHood.deleted_at && !!sMarked && !sMarked.deleted_at &&
      JSON.stringify(sMarked).includes("MARKED TEST PIN") && sMarked.data && sMarked.data.callbackAt === ids.cb &&
      !!sCust && !sCust.deleted_at,
      JSON.stringify({ hood: !!sHood, marked: sMarked && sMarked.data && sMarked.data.callbackAt, cust: !!sCust }));
    check("7l the server-known door deleted offline is tombstoned; the never-uploaded one never appears",
      !!(sA && sA.deleted_at) && !sGone, JSON.stringify({ a: sA && sA.deleted_at, gone: !!sGone }));
    check("7m the marked door's hood claim is stated on the server once the hood is a server fact",
      !!sMarked && sMarked.territory_id === ids.hood, JSON.stringify({ tid: sMarked && sMarked.territory_id }));
    check("7n no card or bank number crossed the wire at any point",
      !cloud.rawBodies.some((b) => /4111111111111111|021000021|000123456789/.test(b)));
    check("7o the customer on the server carries only the safe payment shape",
      !!sCust && !/4111111111111111|021000021|000123456789/.test(JSON.stringify(sCust)) &&
      !!(sCust.data && sCust.data.payment) && sCust.data.payment.last4 === "4242",
      JSON.stringify(sCust && sCust.data && sCust.data.payment));
    check("7p no page errors on the suspended device", errors7.length === 0, errors7.slice(0, 4).join(" | "));
    await c7.close();
  }

  /* ---- 8. A HOOD THAT WAS SYNCED BY THE OLD BUILD, SPLIT ON v39 ----
     The real STEP 5 on the phone: `ZZ Test Hood` was drawn and synced on
     v37, the phone is on v39 now, and the owner Smart Splits it. v39 sends
     the split only once it knows the parent is a server fact — a `serverAt`
     stamp it sets on a successful push or on a pull. A hood the OLD build
     pushed never got that stamp, and the pull cursor is already past it.
     Does the split still commit, or does it wait forever? Measured, not
     assumed. The same evidence gates the hood claim on every door pushed
     from that hood. */
  /* FIXED IN v40, and this section is the proof — on the REAL old tree, not
     an emulation of it. v39 stamped `serverAt` only on its own successful
     push or on a pull, so a record the OLD build synced carried no stamp and
     the pull cursor was already past it: 8c failed (the door's hood claim was
     withheld forever) and 8d/8e failed (the Smart Split was never sent, the
     children sat at "waiting on the team" with no RPC and no error). v40's
     one-time reconciliation re-reads the team's book once and stamps what the
     server actually holds, so all of these must now be GREEN. The gate is
     off; SPLIT_LEGACY is no longer read. */
  {
    addUser("up8@x.com", "knock1234", { name: "Split Owner", role: "owner" });
    SERVING = V38_ROOT; cloud.down = false;
    const c8 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await c8.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await c8.addInitScript((port) => {
      window.RALLY_CLOUD = { url: "http://localhost:" + port, anonKey: "test-anon", pollMs: 900 };
    }, CLOUD_PORT);
    const p8 = await c8.newPage();
    const errors8 = [];
    p8.on("pageerror", (e) => errors8.push("PAGEERROR " + e.message));
    p8.on("console", (m) => { const t = m.text();
      if (m.type() === "error" && !/net::ERR_/.test(t) && !/WebSocket/.test(t)) errors8.push(t); });
    const b8 = () => p8.evaluate(() => window.RALLY_BUILD).catch(() => undefined);
    const sync8 = async () => {
      await p8.evaluate(async () => {
        for (let i = 0; i < 200 && MSYNC.status().running; i++) await new Promise((r) => setTimeout(r, 50));
        await MSYNC.syncNow();
      }).catch(() => {});
      await p8.waitForTimeout(300);
    };
    const key = (id) => TEAM + "|" + id;
    await p8.goto(`http://localhost:${PORT}/`);
    await p8.waitForFunction(() => document.querySelector("#splash").hidden, null, { timeout: 25000 });
    await p8.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 25000 }).catch(() => {});
    await p8.fill("#gate-email", "up8@x.com"); await p8.fill("#gate-pass", "knock1234");
    await p8.click("#gate-submit");
    await p8.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 25000 });
    await p8.waitForTimeout(1000);
    // the OLD build, in coverage: a hood with a door in it, synced
    const ids8 = await p8.evaluate(async () => {
      const hood = await STORE.addTerritory({ name: "ZZ Test Hood", homes: 12,
        points: [[-98.31, 38.39], [-98.29, 38.39], [-98.29, 38.41], [-98.31, 38.41]] });
      await STORE.importDoors([{ lat: 38.401, lng: -98.301, address: "12 Test Ln", source: "test" }],
        { territoryId: hood.id });
      const door = STORE.pins.find((p) => p.address === "12 Test Ln");
      const marked = await STORE.addKnock({ pinId: door.id, lat: door.lat, lng: door.lng,
        disposition: "goback", reason: null, dm: false, note: "MARKED TEST PIN",
        callbackAt: Date.now() + 3600e3 });
      return { hood: hood.id, marked: marked.id };
    });
    for (let i = 0; i < 8 && !(cloud.tables.territories.has(key(ids8.hood)) && cloud.tables.pins.has(key(ids8.marked))); i++) await sync8();
    check(`8a the ${OLD_BUILD} device synced the hood and its door to the server`,
      cloud.tables.territories.has(key(ids8.hood)) && cloud.tables.pins.get(key(ids8.marked)).territory_id === ids8.hood,
      JSON.stringify(await p8.evaluate(() => MSYNC.status())));

    // publish v39 and reopen (the reliable iPhone procedure)
    SERVING = V39_ROOT;
    await p8.goto(`http://localhost:${PORT}/`).catch((e) => { if (!/ERR_ABORTED/.test(String(e))) throw e; });
    for (let w = 0; w < 40000 && (await b8()) !== NEW_BUILD; w += 250) await p8.waitForTimeout(250).catch(() => {});
    await p8.waitForFunction(() => !!(window.STORE && STORE.territories && window.MSYNC && MSYNC.status),
      null, { timeout: 25000 }).catch(() => {});
    await p8.waitForTimeout(2000);
    await sync8(); await sync8();
    const pre8 = await p8.evaluate((ids) => {
      const h = STORE.territories.find((t) => t.id === ids.hood);
      return { build: window.RALLY_BUILD, hoodHere: !!h, serverAt: !!(h && h.serverAt), st: MSYNC.status() };
    }, ids8);
    check("8b on v39 the hood the old build synced is still here", pre8.build === NEW_BUILD && pre8.hoodHere, JSON.stringify(pre8));

    // a door knocked in that hood AFTER the upgrade: is its hood claim stated?
    const newDoor = await p8.evaluate(async (ids) => {
      const h = STORE.territories.find((t) => t.id === ids.hood);
      await STORE.importDoors([{ lat: 38.402, lng: -98.302, address: "14 Test Ln", source: "test" }], { territoryId: h.id });
      const d = STORE.pins.find((p) => p.address === "14 Test Ln");
      await STORE.addKnock({ pinId: d.id, lat: d.lat, lng: d.lng, disposition: "nothome", reason: null, dm: false, note: "" });
      return d.id;
    }, ids8);
    for (let i = 0; i < 6 && !cloud.tables.pins.has(key(newDoor)); i++) await sync8();
    const newRow = cloud.tables.pins.get(key(newDoor));
    check("8c a door knocked on v39 inside that hood reaches the server WITH its hood claim",
      !!newRow && newRow.territory_id === ids8.hood,
      JSON.stringify({ territory_id: newRow && newRow.territory_id, st: await p8.evaluate(() => MSYNC.status()) }));

    // the owner Smart Splits it, exactly as the hood sheet does
    const split8 = await p8.evaluate(async (ids) => {
      const h = STORE.territories.find((t) => t.id === ids.hood);
      const kids = await STORE.splitTerritory(h, 2);
      return { kids: kids.map((k) => ({ id: k.id, name: k.name })), pendingSplit: kids[0].pendingSplit };
    }, ids8);
    for (let i = 0; i < 8 && cloud.splits.size === 0; i++) await sync8();
    await sync8();
    const post8 = await p8.evaluate((ids) => {
      const kids = STORE.territories.filter((t) => t.pendingSplit);
      const parent = STORE.territories.find((t) => t.id === ids.hood);
      const marked = STORE.pins.find((p) => p.id === ids.marked);
      return { pendingKids: kids.length, parentHere: !!parent, parentSplitInto: !!(parent && parent.splitInto),
        markedHood: marked && marked.territoryId, st: MSYNC.status(),
        liveNames: STORE.territories.filter((t) => STORE.isLive(t) && /^ZZ Test Hood/.test(t.name))
          .map((t) => t.name).sort() };
    }, ids8);
    const sParent = cloud.tables.territories.get(key(ids8.hood));
    check("8d the split of a hood the OLD build synced COMMITS on the server (one RPC, children live, parent retired)",
      cloud.splits.size === 1 && cloud.rpcCalls >= 1 && !!(sParent && sParent.deleted_at) &&
      split8.kids.every((k) => { const r = cloud.tables.territories.get(key(k.id)); return r && !r.deleted_at; }),
      JSON.stringify({ splits: cloud.splits.size, rpcCalls: cloud.rpcCalls, parentDeleted: !!(sParent && sParent.deleted_at),
        pending: post8.st.pending, lastError: post8.st.lastError, serverAtBefore: pre8.serverAt }));
    check("8e …and the device shows it as a fact: no children waiting, parent gone, the marked door re-homed into a child",
      post8.pendingKids === 0 && !post8.parentHere &&
      split8.kids.some((k) => k.id === post8.markedHood) &&
      JSON.stringify(post8.liveNames) === JSON.stringify(["ZZ Test Hood A", "ZZ Test Hood B"]),
      JSON.stringify(post8));
    check("8f no page errors", errors8.length === 0, errors8.slice(0, 4).join(" | "));
    check("8g the reconciliation ran once and then stayed done",
      (await p8.evaluate(() => MSYNC.status())).reconcile === "done");
    await c8.close();
  }

  /* ---------------- 9. the claim repair, and a delete across the upgrade
     Same real OLD tree. Two things v40 owes a device that upgrades:
       - a door the OLD build pushed WITHOUT its hood ever being proven gets
         its membership claim stated on the server, exactly once;
       - a record deleted on the upgraded build, while the whole book is
         still unproven, is never resurrected by the reconciliation that
         re-reads that book — and its tombstone still reaches the server. */
  {
    addUser("up9@x.com", "knock1234", { name: "Repair Owner", role: "owner" });
    SERVING = V38_ROOT; cloud.down = false;
    const c9 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await c9.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await c9.addInitScript((port) => {
      window.RALLY_CLOUD = { url: "http://localhost:" + port, anonKey: "test-anon", pollMs: 900 };
    }, CLOUD_PORT);
    const p9 = await c9.newPage();
    const errors9 = [];
    p9.on("pageerror", (e) => errors9.push("PAGEERROR " + e.message));
    p9.on("console", (m) => { const t = m.text();
      if (m.type() === "error" && !/net::ERR_/.test(t) && !/WebSocket/.test(t)) errors9.push(t); });
    const b9 = () => p9.evaluate(() => window.RALLY_BUILD).catch(() => undefined);
    const sync9 = async () => {
      await p9.evaluate(async () => {
        for (let i = 0; i < 200 && MSYNC.status().running; i++) await new Promise((r) => setTimeout(r, 50));
        await MSYNC.syncNow();
      }).catch(() => {});
      await p9.waitForTimeout(300);
    };
    const key9 = (id) => TEAM + "|" + id;
    await p9.goto(`http://localhost:${PORT}/`);
    await p9.waitForFunction(() => document.querySelector("#splash").hidden, null, { timeout: 25000 });
    await p9.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 25000 }).catch(() => {});
    await p9.fill("#gate-email", "up9@x.com"); await p9.fill("#gate-pass", "knock1234");
    await p9.click("#gate-submit");
    await p9.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 25000 });
    await p9.waitForTimeout(1000);

    // OLD build: a hood with a door in it, and a customer — all synced
    const ids9 = await p9.evaluate(async () => {
      const hood = await STORE.addTerritory({ name: "YY Repair Hood", homes: 9,
        points: [[-97.31, 37.39], [-97.29, 37.39], [-97.29, 37.41], [-97.31, 37.41]] });
      await STORE.importDoors([{ lat: 37.401, lng: -97.301, address: "20 Repair Ln", source: "test" }],
        { territoryId: hood.id });
      const door = STORE.pins.find((p) => p.address === "20 Repair Ln");
      const cust = await STORE.addCustomer({ first: "Legacy", last: "Customer", phones: [], appointments: [] });
      return { hood: hood.id, door: door.id, cust: cust.id };
    });
    for (let i = 0; i < 10 && !(cloud.tables.territories.has(key9(ids9.hood)) &&
      cloud.tables.pins.has(key9(ids9.door)) && cloud.tables.customers.has(key9(ids9.cust))); i++) await sync9();
    check(`9a the ${OLD_BUILD} device synced a hood, a door and a customer`,
      cloud.tables.territories.has(key9(ids9.hood)) && cloud.tables.pins.has(key9(ids9.door)) &&
      cloud.tables.customers.has(key9(ids9.cust)));

    /* Blank the door's hood column on the server, which is exactly the state
       v39 produced for every door knocked inside an unproven hood after an
       upgrade: the rep's work committed, the privileged membership claim did
       not. The repair has to notice and state it. */
    cloud.tables.pins.get(key9(ids9.door)).territory_id = null;

    /* Cut the cloud BEFORE the upgrade reload. The first v40 cycle fires
       about a second and a half after boot; if it reaches the server it
       reconciles and stamps this book, and the tombstone below would be born
       already proven — a different, easier case than the one §9 asserts.
       Only the cloud origin is cut; the app's own assets serve normally. */
    const cloudRe9 = new RegExp("localhost:" + CLOUD_PORT);
    await c9.route(cloudRe9, (r) => r.abort());
    // publish v40 and reopen
    SERVING = V39_ROOT;
    await p9.goto(`http://localhost:${PORT}/`).catch((e) => { if (!/ERR_ABORTED/.test(String(e))) throw e; });
    for (let w = 0; w < 40000 && (await b9()) !== NEW_BUILD; w += 250) await p9.waitForTimeout(250).catch(() => {});
    await p9.waitForFunction(() => !!(window.STORE && STORE.pins && window.MSYNC && MSYNC.status),
      null, { timeout: 25000 }).catch(() => {});
    await p9.waitForTimeout(1500);

    // delete while the book is still unproven (the cloud is cut, above)
    await p9.evaluate((id) => STORE.deleteCustomer(id), ids9.cust);
    const box9 = await p9.evaluate(async () => (await MDB.getAll("outbox"))
      .map((e) => ({ k: e.k, op: e.op, wasOnServer: e.wasOnServer })));
    check("9b the delete of a record the OLD build synced is queued as an UNPROVEN tombstone (no serverAt existed to prove it)",
      box9.some((e) => e.k === "customers:" + ids9.cust && e.op === "delete" && e.wasOnServer === false),
      JSON.stringify(box9));

    await c9.unroute(cloudRe9);
    for (let i = 0; i < 14; i++) {
      const st = await p9.evaluate(() => MSYNC.status());
      if (st.reconcile === "done" && st.pending === 0) break;
      await sync9();
    }
    const post9 = await p9.evaluate((ids) => ({
      st: MSYNC.status(),
      hoodStamped: !!(STORE.territories.find((t) => t.id === ids.hood) || {}).serverAt,
      doorStamped: !!(STORE.pins.find((p) => p.id === ids.door) || {}).serverAt,
      custHere: !!STORE.customers.find((c) => c.id === ids.cust),
    }), ids9);
    const srvDoor9 = cloud.tables.pins.get(key9(ids9.door));
    const srvCust9 = cloud.tables.customers.get(key9(ids9.cust));
    check("9c the withheld hood claim is repaired on the server, and the hood and door are now proven locally",
      srvDoor9 && srvDoor9.territory_id === ids9.hood && post9.hoodStamped && post9.doorStamped,
      JSON.stringify({ col: srvDoor9 && srvDoor9.territory_id, post9 }));
    check("9d the unproven tombstone is NOT resurrected by the re-read of the book, and it reaches the server",
      !post9.custHere && !!(srvCust9 && srvCust9.deleted_at) && post9.st.pending === 0,
      JSON.stringify({ custHere: post9.custHere, deleted: !!(srvCust9 && srvCust9.deleted_at), st: post9.st }));

    /* Reopen: the whole app is torn down and booted again from IndexedDB, so
       nothing about this assertion can be coming from the old JS heap. It is
       a re-navigation rather than closing the tab because this origin has a
       live service worker and a brand-new page in the same context does not
       reliably complete its navigation under one; destroying the page
       outright is covered, with workers off, throughout tests/v40-test.js. */
    await p9.goto(`http://localhost:${PORT}/`)
      .catch((e) => { if (!/ERR_ABORTED/.test(String(e))) throw e; });
    await p9.waitForFunction(() => !!(window.STORE && STORE.customers && window.MSYNC && MSYNC.status().loaded),
      null, { timeout: 40000 });
    await p9.waitForTimeout(800);
    const after9 = await p9.evaluate((ids) => ({
      custHere: !!STORE.customers.find((c) => c.id === ids.cust),
      reconcile: MSYNC.status().reconcile,
    }), ids9);
    check("9e after a reopen the record is still gone and the book stays proven",
      !after9.custHere && after9.reconcile === "done", JSON.stringify(after9));
    check("9f no page errors", errors9.length === 0, errors9.slice(0, 4).join(" | "));
    await c9.close();
  }

  check("no page errors across the upgrade", errors.length === 0, errors.slice(0, 4).join(" | "));

  console.log("\n=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  await browser.close(); server.close(); cserver.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  console.log("\n=== PASS so far (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  console.log("\n=== FAIL so far (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x));
  process.exit(1);
});
