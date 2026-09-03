/* RALLY v40 — release gates.

   v40 is a client-only compatibility release. A device that synced under a
   build which kept no server evidence (v37 and earlier wrote no `serverAt`)
   cannot tell its own uploaded records from records that never went up, so
   every safety gate reading that evidence — the Smart Split gate, the
   territory-claim withhold — fails closed on it forever. v40 proves the book
   against the server ONCE, and carries the durability work that review
   demanded around it: atomic deletes, pending-tombstone protection, per-page
   outbox durability before the cursor, proven-identity alias deletion.

   Every crash here is induced from the TEST side (tests/lib/crash.js): a
   chosen IndexedDB call never returns, and the page is then closed. Committed
   transactions survive in the browser context; every in-memory structure does
   not. RALLY itself has no crash hook.

   "Legacy" state is emulated exactly — records on the server and on the
   device, cursors past them, no serverAt, no marker. The same state on the
   REAL v37 tree is certified in upgrade-transition-test.js §8; this suite is
   the breadth. Each block runs in its own team, so no block can see another's
   rows.

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/v40-test.js
   ONLY=K  — run one section (D, P, T, N, R, K, M) */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const { scrubTrigger } = require("./lib/scrub-trigger.js");
const crash = require("./lib/crash.js");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8875);
const ONLY = process.env.ONLY ? new RegExp("^(" + process.env.ONLY + ")") : null;

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
};
const section = (t) => console.log("\n== " + t);

// ---------------- mock Supabase (sync-test.js's, plus counters) ----------------
const mock = {
  users: {}, profiles: {}, access: {},
  tables: { pins: new Map(), events: new Map(), territories: new Map(), customers: new Map() },
  writes: 0, clock: Date.parse("2026-09-03T00:00:00Z"),
  gets: {}, delivered: {},            // page requests / rows returned, per table
  patches: new Map(),                 // id -> PATCH attempts
  upserts: new Map(),                 // pin id -> [{ territory_id }] per upload
  failOnce: null, fail: null,         // injected server failures
  authHits: {},                       // email -> sign-in requests received
};
const tick = () => new Date(++mock.clock).toISOString();
const newTeam = () => crypto.randomUUID();
function addUser(email, password, prof) {
  const id = crypto.randomUUID();
  // keyed lowercase, because that is how the sign-in handler looks it up
  const key = String(email).toLowerCase();
  mock.users[key] = { id, password };
  mock.profiles[id] = Object.assign({ id, role: "owner", name: email, email: key, disabled: false }, prof);
  return id;
}
const j = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const authOf = (req) => mock.access[String(req.headers.authorization || "").replace(/^Bearer /, "")];
const resetCounts = () => {
  mock.gets = { pins: 0, events: 0, territories: 0, customers: 0 };
  mock.delivered = { pins: 0, events: 0, territories: 0, customers: 0 };
  mock.patches = new Map(); mock.upserts = new Map();
};
resetCounts();

function handleRest(req, res, u, body) {
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
  if (mock.failOnce && mock.failOnce.when(req, u, table)) {
    const st = mock.failOnce.status; mock.failOnce = null;
    return j(res, st, { message: "injected" });
  }
  if (mock.fail) { const st = mock.fail(req, u, table); if (st) return j(res, st, { message: "injected" }); }

  if (req.method === "POST") {
    const prefer = String(req.headers.prefer || "");
    const rows = Array.isArray(body) ? body : [body];
    const reqClock = tick();
    for (const row of rows) {
      if (row.team_id !== me.team_id)
        return j(res, 401, { code: "42501", message: "row-level security" });
      if (table === "events" && row.by_user && row.by_user !== uid)
        return j(res, 401, { code: "42501", message: "row-level security (by_user)" });
      const k = row.team_id + "|" + row.id;
      const existing = t.get(k);
      if (table === "pins") {
        const arr = mock.upserts.get(row.id) || [];
        arr.push({ territory_id: row.territory_id }); mock.upserts.set(row.id, arr);
      }
      if (existing) {
        if (prefer.includes("ignore-duplicates")) continue;
        if (table === "events") return j(res, 401, { code: "42501", message: "permission denied for events" });
        // BEFORE INSERT OR UPDATE fires twice for an upsert — see sync-test.js
        const proposed = JSON.parse(JSON.stringify(row));
        if (table === "customers") scrubTrigger(proposed, null);
        const merged = Object.assign({}, existing, proposed,
          { created_at: existing.created_at, updated_at: reqClock });
        if (table === "customers") scrubTrigger(merged, existing);
        t.set(k, merged);
      } else {
        const fresh = Object.assign({}, row, { created_at: reqClock });
        if (table !== "events") fresh.updated_at = fresh.created_at;
        if (table === "customers") scrubTrigger(fresh, null);
        t.set(k, fresh);
      }
      mock.writes++;
    }
    return j(res, 201, prefer.includes("return=minimal") ? undefined : rows);
  }
  if (req.method === "PATCH") {
    if (table === "events") return j(res, 401, { code: "42501" });
    const id = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    mock.patches.set(id, (mock.patches.get(id) || 0) + 1);
    const teamQ = String(u.searchParams.get("team_id") || "").replace(/^eq\./, "");
    const wantRep = String(req.headers.prefer || "").includes("return=representation");
    if (teamQ !== me.team_id) return j(res, 200, wantRep ? [] : undefined);
    const row = t.get(teamQ + "|" + id);
    if (row) {
      const before = JSON.parse(JSON.stringify(row));
      Object.assign(row, body, { updated_at: tick() });
      if (table === "customers") scrubTrigger(row, before);
      mock.writes++;
      return j(res, 200, wantRep ? [row] : undefined);
    }
    return j(res, 200, wantRep ? [] : undefined);   // matched nothing: 2xx, zero rows
  }
  let rows = [...t.values()].filter((r) => r.team_id === me.team_id);
  const idEq = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
  if (idEq) rows = rows.filter((r) => r.id === idEq);
  const clockCol = table === "events" ? "created_at" : "updated_at";
  const or = u.searchParams.get("or");
  if (or) {
    const m = or.match(/\(\w+\.gt\.(.*?),and\(\w+\.eq\.(.*?),id\.gt\.(.*)\)\)/);
    if (!m) return j(res, 400, { message: "bad or= filter: " + or });
    rows = rows.filter((r) => r[clockCol] > m[1] || (r[clockCol] === m[2] && r.id > m[3]));
    mock.gets[table]++;
  }
  rows.sort((a, b) => a[clockCol] < b[clockCol] ? -1 : a[clockCol] > b[clockCol] ? 1
    : a.id < b.id ? -1 : 1);
  const limit = Number(u.searchParams.get("limit") || 0);
  if (limit) rows = rows.slice(0, limit);
  if (or) mock.delivered[table] += rows.length;
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
        const who = String(body.email || "").toLowerCase();
        mock.authHits[who] = (mock.authHits[who] || 0) + 1;
        const usr = mock.users[who];
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

const srv = (team, table, id) => mock.tables[table].get(team + "|" + id) || null;
const tomb = (team, table, id) => { const r = srv(team, table, id); return !!(r && r.deleted_at); };

// ---------------- the run ----------------
const browserRef = { b: null };   // so the crash handler can always close it
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  let browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  browserRef.b = browser;
  const errors = [];
  let nUser = 0, sinceRecycle = 0;
  /* This suite boots dozens of contexts. Chromium accumulates state across
     them — enough that, deterministically, around the fifteenth the gate
     stops appearing within half a minute. Nothing about RALLY changes; the
     browser does. Recycle the whole browser once a stretch of devices has
     been through it, but only when NO context is open, so no live device is
     ever pulled out from under a test. */
  const closeDevice = async (d) => { try { await closeDevice(d); } catch (_) {} };
  async function recycleIfIdle() {
    if (sinceRecycle < 10 || browser.contexts().length) return;
    await browser.close();
    browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
    browserRef.b = browser;
    sinceRecycle = 0;
  }

  async function openPage(d) {
    d.page = await d.ctx.newPage();
    d.page.on("pageerror", (e) => errors.push(d.email + ": " + e.message));
    await d.page.goto(`http://localhost:${PORT}/`);
  }
  async function device(tag, team, prof, opts) {
    await recycleIfIdle();
    sinceRecycle++;
    const email = `${tag}${++nUser}@x.com`.toLowerCase();
    addUser(email, "knock1234", Object.assign({ team_id: team }, prof || {}));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    });
    await ctx.addInitScript(`window.RALLY_CLOUD = { url: "http://localhost:${PORT}", anonKey: "test-anon", pollMs: 3600e3 };`);
    const d = { ctx, email, team };
    await openPage(d);
    /* A long run boots dozens of contexts. Occasionally a submit lands
       without reaching the network at all — no request, no error on the gate
       — so the tap is repeated before the whole page is reloaded. */
    for (let attempt = 0; ; attempt++) {
      try {
        if (attempt) await openPage(d);
        await d.page.waitForSelector("#gate:not([hidden])", { timeout: attempt ? 45000 : 25000 });
        await d.page.fill("#gate-email", email); await d.page.fill("#gate-pass", "knock1234");
        for (let tap = 0; ; tap++) {
          await d.page.click("#gate-submit");
          try {
            await d.page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 8000 });
            break;
          } catch (inner) {
            if (tap >= 3) throw inner;
            await d.page.waitForTimeout(500);
          }
        }
        await d.page.waitForFunction(() => !!(window.MSYNC && MSYNC.status().loaded), null, { timeout: 30000 });
        break;
      } catch (e) {
        const why = await d.page.evaluate(() => ({
          gateHidden: !!(document.querySelector("#gate") || {}).hidden,
          err: (document.querySelector("#gate-err") || {}).textContent || "",
          hasAccount: !!(window.MAUTH && MAUTH.hasAccount && MAUTH.hasAccount()),
          unlocked: !!(window.MAUTH && MAUTH.isUnlocked && MAUTH.isUnlocked()),
          lockMs: window.MAUTH && MAUTH.lockRemainingMs ? MAUTH.lockRemainingMs() : null,
          cloud: !!(window.MCLOUD && MCLOUD.enabled && MCLOUD.enabled()),
        })).catch((x) => ({ evalFailed: String(x).slice(0, 120) }));
        why.authHits = mock.authHits[email] || 0;
        why.pageErrors = errors.filter((x) => x.startsWith(email)).slice(-3);
        why.users = Object.keys(mock.users).length;
        console.log("    [device " + email + " attempt " + attempt + "] " + JSON.stringify(why));
        if (attempt) throw e;
        try { await d.page.close(); } catch (_) {}
      }
    }
    // Cut the network before the first cycle can pull. Two phones that each
    // import the same property list before either has synced is the whole
    // point of the dedupe fixtures; letting one pull first makes it dedupe
    // against the other's row instead of authoring its own.
    if (opts && opts.offlineAfterLogin) await offline(d);
    await d.page.waitForTimeout(300);
    return d;
  }
  // a force-close and reopen: the page dies, the context's storage survives
  async function reopen(d) {
    try { await d.page.close(); } catch (_) {}
    await openPage(d);
    await d.page.waitForFunction(() => document.querySelector("#gate") && document.querySelector("#gate").hidden
      && window.MSYNC && MSYNC.status().loaded && window.STORE && STORE.pins, null, { timeout: 25000 });
    await d.page.waitForTimeout(250);
  }
  const S = (d, fn, arg) => d.page.evaluate(fn, arg);
  const sync = (d) => d.page.evaluate(async () => {
    for (let i = 0; i < 200 && MSYNC.status().running; i++) await new Promise((r) => setTimeout(r, 50));
    await MSYNC.syncNow();
  }).catch(() => {});
  async function syncUntil(d, fn, tries = 10) {
    for (let i = 0; i < tries; i++) {
      await sync(d);
      if (await d.page.evaluate(fn).catch(() => false)) return true;
      await d.page.waitForTimeout(120);
    }
    return false;
  }
  const drain = (d, n) => syncUntil(d, () => MSYNC.status().pending === 0 && !MSYNC.status().running, n || 10);
  const settled = (d, n) => syncUntil(d, () => MSYNC.status().reconcile === "done" && MSYNC.status().pending === 0, n || 10);
  const status = (d) => S(d, () => MSYNC.status());
  const offline = (d) => d.ctx.route(/\/(auth|rest)\/v1\//, (r) => r.abort());
  const online = (d) => d.ctx.unroute(/\/(auth|rest)\/v1\//);
  // the durable picture, read straight from IndexedDB
  const disk = (d) => S(d, async () => ({
    pins: (await MDB.getAll("pins")).map((p) => p.id).sort(),
    territories: (await MDB.getAll("territories")).map((p) => p.id).sort(),
    customers: (await MDB.getAll("customers")).map((p) => p.id).sort(),
    events: (await MDB.getAll("events")).map((e) => e.id).sort(),
    outbox: (await MDB.getAll("outbox")).map((e) => ({ k: e.k, op: e.op, wasOnServer: e.wasOnServer }))
      .sort((a, b) => a.k < b.k ? -1 : 1),
    marker: await MDB.kvGet("syncReconcile", null),
    cursors: await MDB.kvGet("syncCursors", null),
    stamps: Object.fromEntries([...(await MDB.getAll("pins")), ...(await MDB.getAll("territories")),
      ...(await MDB.getAll("customers"))].map((r) => [r.id, !!r.serverAt])),
  }));
  /* Make a synced device look exactly like one v37 synced: the records are
     here and on the server, the cursors are past them, nothing carries
     serverAt, and there is no marker. */
  async function legacyize(d) {
    await S(d, async () => {
      for (const s of ["pins", "territories", "customers"]) {
        const rows = await MDB.getAll(s);
        rows.forEach((r) => { delete r.serverAt; });
        if (rows.length) await MDB.bulkPut(s, rows);
      }
      await MDB.kvSet("syncReconcile", null);
    });
    await reopen(d);
  }
  // arm a crash, fire the action without awaiting it, wait for the hit, reopen
  async function crashAt(d, spec, fire) {
    await crash.arm(d.page, spec);
    d.page.evaluate(fire).catch(() => {});
    const hit = await crash.waitHit(d.page);
    await reopen(d);
    return hit;
  }
  const fireSync = () => { MSYNC.syncNow(); };
  const delName = (table) => table === "pins" ? "deletePin" : table === "territories" ? "deleteTerritory" : "deleteCustomer";
  const delFire = (table, id) => new Function(`STORE.${delName(table)}(${JSON.stringify(id)});`);
  const del = (d, table, id) => S(d, ({ f, id }) => STORE[f](id), { f: delName(table), id });
  // the only two shapes a delete may leave on disk
  const shapeOf = (dk, table, id) => {
    const present = dk[table].includes(id);
    const entry = dk.outbox.find((e) => e.k === table + ":" + id && e.op === "delete");
    return { present, entry: !!entry, wasOnServer: entry ? entry.wasOnServer : null,
      coherent: (present && !entry) || (!present && !!entry) };
  };
  const want = (name) => !ONLY || ONLY.test(name);

  /* ======================= D — atomic delete creation ======================= */
  if (want("D")) {
    section("D — a delete is ONE transaction: the record and its tombstone commit together or not at all");
    for (const table of ["pins", "territories", "customers"]) {
      const T = newTeam();
      const d = await device("del", T);
      const mk = () => S(d, async (table) => {
        if (table === "pins") {
          await STORE.importDoors([{ lat: 38.5, lng: -98.4, address: "1 Del St", city: "GB", zip: "67530", externalId: "d-" + Date.now(), source: "t" }]);
          const p = STORE.pins[STORE.pins.length - 1];
          await STORE.addKnock({ pinId: p.id, lat: p.lat, lng: p.lng, disposition: "nothome", reason: null, dm: false, note: "" });
          return p.id;
        }
        if (table === "territories") {
          const t = await STORE.addTerritory({ name: "Del Hood", homes: 3, points: [[-98.41, 38.49], [-98.39, 38.49], [-98.39, 38.51], [-98.41, 38.51]] });
          return t.id;
        }
        return (await STORE.addCustomer({ first: "Del", last: "Cust", phones: [], appointments: [] })).id;
      }, table);

      // D0 — killed before the transaction can commit
      let id = await mk(); await drain(d);
      let hit = await crashAt(d, { method: "txn", match: table }, delFire(table, id));
      let dk = await disk(d); let sh = shapeOf(dk, table, id);
      check(`D0 ${table}: killed before the commit — record present, no delete intent`,
        hit && sh.present && !sh.entry, JSON.stringify(sh));

      // D1/D3 — the transaction aborts: IndexedDB writes nothing, and memory rolls back
      await crash.arm(d.page, { method: "txn", match: table, mode: "reject" });
      const rej = await S(d, ({ f, id, table }) => STORE[f](id).then((ok) => ({
        ok, inMemory: !!STORE[table].find((r) => r.id === id), st: MSYNC.status(),
        events: STORE.events.filter((e) => e.pinId === id).length })), { f: delName(table), id, table });
      dk = await disk(d); sh = shapeOf(dk, table, id);
      check(`D1/D3 ${table}: an aborted transaction rolls back — present on disk AND in memory, nothing queued`,
        rej.ok === false && rej.inMemory && sh.present && !sh.entry &&
        rej.st.pending === 0 && rej.st.pendingDeletes === 0 && (table !== "pins" || rej.events === 1),
        JSON.stringify({ ok: rej.ok, inMemory: rej.inMemory, pending: rej.st.pending, ev: rej.events, sh }));
      await reopen(d);
      check(`D1/D3 ${table}: …and still present after reopen`, shapeOf(await disk(d), table, id).present);

      // D4 — committed, killed before the push
      hit = await crashAt(d, { method: "getAll", match: "outbox", after: { method: "txn", match: table } }, delFire(table, id));
      dk = await disk(d); sh = shapeOf(dk, table, id);
      check(`D4 ${table}: committed — record absent, tombstone durable and proven, cascade committed with it`,
        hit && !sh.present && sh.entry && sh.wasOnServer === true && (table !== "pins" || dk.events.length === 0),
        JSON.stringify({ sh, events: dk.events.length }));
      check(`D2 ${table}: "tombstone committed, record still present" was never observable`, sh.coherent, JSON.stringify(sh));
      const st = await status(d);
      check(`D6 ${table}: reopen rebuilt the pending-delete set from the durable outbox`,
        st.pendingDeletes === 1 && st.pending === 1, JSON.stringify(st));
      await drain(d);
      check(`D4 ${table}: …then it pushes — server row tombstoned, outbox empty`,
        tomb(T, table, id) && (await disk(d)).outbox.length === 0);

      // D5 — killed at an arbitrary instant right after the tap
      id = await mk(); await drain(d);
      d.page.evaluate(delFire(table, id)).catch(() => {});
      await reopen(d);
      dk = await disk(d); sh = shapeOf(dk, table, id);
      check(`D5 ${table}: killed right after the tap — one of exactly two coherent states`, sh.coherent, JSON.stringify(sh));
      await drain(d);
      const fin = await disk(d);
      check(`D5 ${table}: …and converges (present and live, or absent and tombstoned)`,
        (fin[table].includes(id) && !tomb(T, table, id)) || (!fin[table].includes(id) && tomb(T, table, id)),
        JSON.stringify(shapeOf(fin, table, id)));
      await closeDevice(d);
    }
  }

  /* ============= P — per-page durability and the claim repair ============= */
  if (want("P")) {
    section("P — page crash matrix: APPLY → serverAt → outbox → cursor; the withheld claim is repaired once");
    const specs = {
      P0: { method: "bulkPut", match: "pins" },                                                     // the serverAt stamps
      P3: { method: "txn", match: "outbox" },                                                       // the repair commit
      P4: { method: "kvSet", match: "syncCursors", after: { method: "txn", match: "outbox" } },     // after outbox, before cursor
      P5: { method: "kvSet", match: "syncPendingEvents", after: { method: "txn", match: "outbox" } },
      P6: { method: "kvSet", match: "syncReconcile" },                                              // the "done" write
      P7: { method: "getAll", match: "outbox", after: { method: "kvSet", match: "syncReconcile" } }, // push start
      P8: { method: "bulkDel", match: "outbox" },                                                   // after the server accepted
    };
    for (const [name, spec] of Object.entries(specs)) {
      const T = newTeam();
      const d = await device("page", T);
      const ids = await S(d, async () => {
        const hood = await STORE.addTerritory({ name: "Legacy Hood", homes: 5, points: [[-98.31, 38.39], [-98.29, 38.39], [-98.29, 38.41], [-98.31, 38.41]] });
        await STORE.importDoors([{ lat: 38.401, lng: -98.301, address: "12 Legacy Ln", city: "GB", zip: "67530", source: "t" }], { territoryId: hood.id });
        const door = STORE.pins[0];
        await STORE.addKnock({ pinId: door.id, lat: door.lat, lng: door.lng, disposition: "goback", reason: null, dm: false, note: "legacy" });
        return { hood: hood.id, door: door.id };
      });
      await drain(d);
      // the production shape: the door went up while its hood was still unproven, so the claim was withheld
      srv(T, "pins", ids.door).territory_id = null;
      await legacyize(d);
      resetCounts();
      const before = await disk(d);
      const hit = await crashAt(d, spec, fireSync);
      const mid = await disk(d);
      const cursorPassed = !!(mid.cursors && mid.cursors.pins);
      const stampsDurable = mid.stamps[ids.door] && mid.stamps[ids.hood];
      const repairDurable = mid.outbox.some((e) => e.k === "pins:" + ids.door && e.op === "upsert");
      const alreadyPushed = srv(T, "pins", ids.door).territory_id === ids.hood;
      check(`${name} killed at ${spec.method}(${spec.match}): the cursor never passed a row whose stamps and repair were not already durable`,
        hit && !before.marker && !before.stamps[ids.hood] &&
        (!cursorPassed || (stampsDurable && (repairDurable || alreadyPushed))),
        JSON.stringify({ hit, cursorPassed, stampsDurable, repairDurable, alreadyPushed, outbox: mid.outbox, marker: mid.marker }));
      const done = await settled(d, 12);
      const fin = await disk(d);
      const claims = (mock.upserts.get(ids.door) || []).filter((u) => u.territory_id === ids.hood).length;
      /* One repair upload — or two at P8, which is killed between the
         server accepting the push and the outbox row being cleaned, so the
         same idempotent upsert is re-sent once. At-least-once delivery is
         the contract; what must never happen is an unbounded re-repair. */
      check(`${name} converges: hood and door proven, claim on the server, the repair uploaded ${name === "P8" ? "at most twice (re-sent after the crash)" : "exactly once"}, no duplicates, outbox empty, marker done`,
        done && fin.stamps[ids.hood] && fin.stamps[ids.door] && srv(T, "pins", ids.door).territory_id === ids.hood &&
        claims >= 1 && claims <= (name === "P8" ? 2 : 1) &&
        fin.pins.length === 1 && fin.territories.length === 1 && fin.outbox.length === 0 && fin.marker.state === "done",
        JSON.stringify({ done, claims, pins: fin.pins.length, outbox: fin.outbox, col: srv(T, "pins", ids.door).territory_id }));
      check(`${name} the crashed page was re-applied at most once`, mock.delivered.pins <= 2, JSON.stringify(mock.delivered));
      await closeDevice(d);
    }
    // the claim regression itself, with no crash
    {
      const T = newTeam();
      const d = await device("claim", T);
      const ids = await S(d, async () => {
        const hood = await STORE.addTerritory({ name: "Claim Hood", homes: 5, points: [[-98.31, 38.39], [-98.29, 38.39], [-98.29, 38.41], [-98.31, 38.41]] });
        await STORE.importDoors([{ lat: 38.401, lng: -98.301, address: "1 Claim Ln", city: "GB", zip: "67530", source: "t" },
          { lat: 38.412, lng: -98.312, address: "2 Claim Ln", city: "GB", zip: "67530", source: "t" }], { territoryId: hood.id });
        return { hood: hood.id, doors: STORE.pins.map((p) => p.id) };
      });
      await drain(d);
      srv(T, "pins", ids.doors[0]).territory_id = null;      // withheld
      await legacyize(d);
      resetCounts();
      await settled(d, 12);
      const fin = await disk(d);
      const u0 = (mock.upserts.get(ids.doors[0]) || []).length, u1 = (mock.upserts.get(ids.doors[1]) || []).length;
      check("PR1 a withheld claim is repaired: the null-column door is re-uploaded once with its hood; the door whose column was already set is untouched",
        srv(T, "pins", ids.doors[0]).territory_id === ids.hood && u0 === 1 && u1 === 0 && fin.outbox.length === 0,
        JSON.stringify({ u0, u1, col: srv(T, "pins", ids.doors[0]).territory_id }));
      const w = mock.writes; const cur1 = fin.cursors || {}; resetCounts();
      await reopen(d);
      const onBoot = await disk(d);                 // read BEFORE any cycle runs
      await sync(d); await sync(d);
      const st2 = await status(d); const cur2 = (await disk(d)).cursors;
      const forward = ["pins", "territories", "customers"].every((t) =>
        !cur1[t] || (cur2 && cur2[t] && cur2[t].t >= cur1[t].t));
      check("PR2 run twice: done already on boot, the cursors only move forward (no second re-read), and no further server writes",
        onBoot.marker && onBoot.marker.state === "done" && st2.reconcile === "done" && forward && mock.writes === w,
        JSON.stringify({ boot: onBoot.marker, reconcile: st2.reconcile, forward, writes: mock.writes - w }));
      await closeDevice(d);
    }
  }

  /* ============ T — pending tombstones never resurrect ============ */
  if (want("T")) {
    section("T — a pending local tombstone never resurrects; evidence and retirement are durable before the cursor");
    // A: offline delete of a legacy customer, reconciliation delivers it LIVE
    {
      const T = newTeam();
      const d = await device("tomb", T);
      const cid = await S(d, async () => (await STORE.addCustomer({ first: "Gone", last: "Legacy", phones: [], appointments: [] })).id);
      await drain(d);
      await legacyize(d);
      await offline(d);
      await del(d, "customers", cid);
      let dk = await disk(d); let sh = shapeOf(dk, "customers", cid);
      check("TA1 deleted offline: absent, tombstone durable and UNPROVEN (wasOnServer:false), no marker",
        !sh.present && sh.entry && sh.wasOnServer === false && !dk.marker, JSON.stringify(sh));
      await online(d);
      // the tombstone PATCH is refused once, so the cycle ends between pull and push
      mock.failOnce = { when: (req, u, t) => req.method === "PATCH" && t === "customers", status: 503 };
      await sync(d);
      dk = await disk(d); sh = shapeOf(dk, "customers", cid);
      const visible = await S(d, (id) => !!STORE.customers.find((c) => c.id === id), cid);
      check("TA2 the pull delivered the live row: not visible, not on disk, tombstone still queued and now PROVEN, marker done",
        !visible && !sh.present && sh.entry && sh.wasOnServer === true &&
        dk.marker && dk.marker.state === "done" && !tomb(T, "customers", cid),
        JSON.stringify({ visible, sh, marker: dk.marker }));
      await drain(d);
      check("TA3 the tombstone then pushes: server row tombstoned, outbox empty",
        tomb(T, "customers", cid) && (await disk(d)).outbox.length === 0);
      await reopen(d);
      check("TA4 force-close and reopen: still absent",
        !(await disk(d)).customers.includes(cid) && !(await S(d, (id) => !!STORE.customers.find((c) => c.id === id), cid)));
      await closeDevice(d);
    }
    // B — the blind-spot case: the ONLY legacy record has been deleted
    const points = {
      "during the evidence upgrade": { method: "txn", match: "outbox" },
      "after the evidence upgrade, before the page cursor": { method: "kvSet", match: "syncCursors", after: { method: "txn", match: "outbox" } },
      "after the page cursor": { method: "kvSet", match: "syncReconcile" },
      "before the delete push": { method: "getAll", match: "outbox", after: { method: "kvSet", match: "syncReconcile" } },
    };
    for (const table of ["customers", "pins", "territories"]) {
      for (const [label, spec] of Object.entries(points)) {
        const T = newTeam();
        const d = await device("blind", T);
        const id = await S(d, async (table) => {
          if (table === "customers") return (await STORE.addCustomer({ first: "Only", last: "One", phones: [], appointments: [] })).id;
          if (table === "pins") { await STORE.importDoors([{ lat: 38.5, lng: -98.4, address: "9 Only St", city: "GB", zip: "67530", source: "t" }]); return STORE.pins[0].id; }
          return (await STORE.addTerritory({ name: "Only Hood", homes: 1, points: [[-98.41, 38.49], [-98.39, 38.49], [-98.39, 38.51], [-98.41, 38.51]] })).id;
        }, table);
        await drain(d);
        await legacyize(d);
        await offline(d);
        await del(d, table, id);
        let dk = await disk(d); let sh = shapeOf(dk, table, id);
        const pre = !sh.present && sh.entry && sh.wasOnServer === false && !dk.marker &&
          dk.pins.length + dk.territories.length + dk.customers.length === 0;
        await online(d);
        resetCounts();
        const hit = await crashAt(d, spec, fireSync);
        dk = await disk(d); sh = shapeOf(dk, table, id);
        const visibleMid = await S(d, ({ table, id }) => !!STORE[table].find((r) => r.id === id), { table, id });
        const cursorPassed = !!(dk.cursors && dk.cursors[table]);
        check(`TB ${table} — legacy delete only, killed ${label}: never visible, tombstone intact, evidence durable before the cursor`,
          pre && hit && !visibleMid && !sh.present && sh.entry && (!cursorPassed || sh.wasOnServer === true),
          JSON.stringify({ pre, hit, visibleMid, sh, cursorPassed, marker: dk.marker }));
        const done = await settled(d, 12);
        const fin = await disk(d);
        check(`TB ${table} — …reconciliation RAN (no zero-request shortcut), row tombstoned, outbox empty, marker done, record absent`,
          done && mock.gets[table] >= 1 && tomb(T, table, id) && fin.outbox.length === 0 &&
          fin.marker.state === "done" && !fin[table].includes(id),
          JSON.stringify({ done, gets: mock.gets, tomb: tomb(T, table, id), outbox: fin.outbox }));
        await reopen(d);
        check(`TB ${table} — …absent after force-close and reopen (${label})`, !(await disk(d))[table].includes(id));
        await closeDevice(d);
      }
    }
    // an incomplete reconciliation must not authorise the zero-row discard
    {
      const T = newTeam();
      const d = await device("hold", T);
      const cid = await S(d, async () => (await STORE.addCustomer({ first: "Held", last: "Back", phones: [], appointments: [] })).id);
      await drain(d);
      await legacyize(d);
      await offline(d);
      await del(d, "customers", cid);
      await online(d);
      resetCounts();
      mock.fail = (req, u, t) => (req.method === "GET" && t === "customers") ? 500 : 0;
      await sync(d);
      const dk = await disk(d); const sh = shapeOf(dk, "customers", cid); const st = await status(d);
      check("TH1 an incomplete reconciliation HOLDS the unproven delete: still queued, not dead-lettered, not discarded, marker started, no PATCH sent",
        sh.entry && sh.wasOnServer === false && st.reconcile === "started" && st.held === 1 &&
        st.refused === 0 && (mock.patches.get(cid) || 0) === 0 && !tomb(T, "customers", cid),
        JSON.stringify({ sh, reconcile: st.reconcile, held: st.held, refused: st.refused, patches: mock.patches.get(cid) }));
      mock.fail = null;
      await settled(d, 12);
      check("TH2 once the read completes the delete is proven, pushed, and the row is tombstoned",
        tomb(T, "customers", cid) && (await disk(d)).outbox.length === 0);
      await closeDevice(d);
    }
    // a record the server genuinely never had: a COMPLETE read proves absence
    {
      const T = newTeam();
      const d = await device("absent", T);
      await offline(d);
      const cid = await S(d, async () => {
        const c = await STORE.addCustomer({ first: "Never", last: "Up", phones: [], appointments: [] });
        await STORE.deleteCustomer(c.id); return c.id;
      });
      await online(d);
      resetCounts();
      await drain(d);
      const st = await status(d);
      check("TN1 a delete of a record the server never had: the complete read finds nothing, the zero-row PATCH is finalised, nothing is surfaced as refused",
        st.reconcile === "done" && st.pending === 0 && st.refused === 0 && (mock.patches.get(cid) || 0) === 1,
        JSON.stringify({ reconcile: st.reconcile, pending: st.pending, refused: st.refused, patches: mock.patches.get(cid) }));
      await closeDevice(d);
    }
    // a delivered server tombstone retires a redundant pending delete
    {
      const T = newTeam();
      const A = await device("retA", T), B = await device("retB", T);
      const cid = await S(A, async () => (await STORE.addCustomer({ first: "Both", last: "Delete", phones: [], appointments: [] })).id);
      await drain(A);
      await syncUntil(B, (id) => !!STORE.customers.find((c) => c.id === id), 8);
      await drain(B);
      await legacyize(A);
      await offline(A);
      await del(A, "customers", cid);
      await del(B, "customers", cid); await drain(B);
      const bTomb = tomb(T, "customers", cid);
      resetCounts();
      await online(A);
      await settled(A, 12);
      const dk = await disk(A);
      check("TR1 the server's tombstone retires A's pending delete through the page transaction: A sends no PATCH, outbox empty, nothing resurrected",
        bTomb && (mock.patches.get(cid) || 0) === 0 && dk.outbox.length === 0 && !dk.customers.includes(cid),
        JSON.stringify({ bTomb, patches: mock.patches.get(cid), outbox: dk.outbox }));
      await closeDevice(A); await closeDevice(B);
    }
    // D — a deleted hood that contains a door
    {
      const T = newTeam();
      const d = await device("hoodD", T);
      const ids = await S(d, async () => {
        const hood = await STORE.addTerritory({ name: "Doomed Hood", homes: 5, points: [[-98.31, 38.39], [-98.29, 38.39], [-98.29, 38.41], [-98.31, 38.41]] });
        await STORE.importDoors([{ lat: 38.401, lng: -98.301, address: "5 Doom Ln", city: "GB", zip: "67530", source: "t" }], { territoryId: hood.id });
        const door = STORE.pins[0];
        await STORE.addKnock({ pinId: door.id, lat: door.lat, lng: door.lng, disposition: "sold", reason: null, dm: true, note: "kept" });
        return { hood: hood.id, door: door.id };
      });
      await drain(d);
      await legacyize(d);
      await offline(d);
      await del(d, "territories", ids.hood);
      await online(d);
      await S(d, (hid) => {
        window.__seen = [];
        window.__t = setInterval(() => window.__seen.push({
          hood: !!STORE.territories.find((t) => t.id === hid),
          doorHood: (STORE.pins[0] || {}).territoryId }), 20);
      }, ids.hood);
      await settled(d, 12);
      const samples = await S(d, () => { clearInterval(window.__t); return window.__seen; });
      const fin = await disk(d);
      const door = await S(d, () => STORE.pins[0]);
      check("TD1 the deleted hood is absent at EVERY sample and on disk; the door keeps its history and is never re-homed into it",
        samples.length > 0 && samples.every((s) => !s.hood && (s.doorHood === ids.hood || s.doorHood === null)) &&
        !fin.territories.includes(ids.hood) && door && door.history.length === 1 && door.territoryId === null &&
        tomb(T, "territories", ids.hood) && !tomb(T, "pins", ids.door) && fin.outbox.length === 0,
        JSON.stringify({ samples: samples.length, withHood: samples.filter((s) => s.hood).length,
          door: door && { hood: door.territoryId, hist: door.history.length }, outbox: fin.outbox }));
      await reopen(d);
      check("TD2 …and after force-close and reopen", !(await disk(d)).territories.includes(ids.hood));
      await closeDevice(d);
    }
  }

  /* ====== N — who reconciles: legacy yes, clean devices and fresh installs no ====== */
  if (want("N")) {
    section("N — the predicate: a clean v40 device and a fresh install pay nothing");
    {
      const T = newTeam();
      resetCounts();
      const w0 = mock.writes;
      const d = await device("fresh", T);
      await sync(d);
      const st = await status(d); const dk = await disk(d);
      /* Every table is read the same number of times as any other — an
         ordinary first pull, one page each per cycle. A reconciliation would
         show as the three evidence tables being re-read from the epoch while
         `events` was not, and as the marker passing through "started". */
      const uniform = new Set(Object.values(mock.gets)).size === 1;
      check("N1 a fresh install goes straight to done: an ordinary first pull, every table read alike, nothing delivered, no writes",
        st.reconcile === "done" && dk.marker.team === T && uniform &&
        mock.delivered.pins === 0 && mock.delivered.customers === 0 && mock.writes === w0,
        JSON.stringify({ reconcile: st.reconcile, gets: mock.gets, delivered: mock.delivered, writes: mock.writes - w0 }));
      await S(d, async () => {
        await STORE.addCustomer({ first: "Clean", last: "Dev", phones: [], appointments: [] });
        await STORE.importDoors([{ lat: 38.5, lng: -98.4, address: "3 Clean St", city: "GB", zip: "67530", source: "t" }]);
      });
      await drain(d);
      await sync(d);                    // consume this device's own echo, so a cursor exists
      const cur1 = (await disk(d)).cursors || {};
      resetCounts(); const w1 = mock.writes;
      await reopen(d);
      const onBoot = await disk(d);                 // read BEFORE any cycle runs
      await sync(d);
      const st2 = await status(d); const cur2 = (await disk(d)).cursors;
      /* A device that just pushed always re-pulls its own rows once — their
         updated_at moved past its cursor. That is the ordinary incremental
         pull. What distinguishes a RECONCILIATION is the cursor reset, so
         that is what this asserts. */
      const forward = ["pins", "territories", "customers"].every((t) =>
        !cur1[t] || (cur2 && cur2[t] && cur2[t].t >= cur1[t].t));
      check("N2 a clean v40 device never reconciles: done already on boot, cursors only move forward (no epoch re-read), one page per table, no server writes",
        onBoot.marker && onBoot.marker.state === "done" && st2.reconcile === "done" && forward &&
        mock.gets.pins === 1 && mock.gets.customers === 1 && mock.writes === w1,
        JSON.stringify({ boot: onBoot.marker, reconcile: st2.reconcile, forward, gets: mock.gets, writes: mock.writes - w1 }));
      await closeDevice(d);
    }
    {
      const T = newTeam();
      const e = await device("fresh2", T);
      await offline(e);
      await S(e, async () => {
        const c = await STORE.addCustomer({ first: "Blink", last: "Gone", phones: [], appointments: [] });
        await STORE.deleteCustomer(c.id);
      });
      await online(e); resetCounts(); await drain(e);
      const st3 = await status(e);
      check("N3 a fresh device whose only unproven thing is a delete reconciles at the price of its first pull: still one page per table",
        st3.reconcile === "done" && st3.pending === 0 && mock.gets.customers === 1 && mock.gets.pins === 1,
        JSON.stringify({ reconcile: st3.reconcile, gets: mock.gets }));
      await closeDevice(e);
    }
    // team change: Team A's "done" cannot satisfy Team B
    {
      const TA = newTeam(), TB = newTeam();
      const d = await device("team", TA);
      await S(d, async () => { await STORE.addCustomer({ first: "Team", last: "Mover", phones: [], appointments: [] }); });
      await drain(d);
      check("N4a on Team A: the marker names Team A", (await disk(d)).marker.team === TA);
      mock.profiles[mock.users[d.email].id].team_id = TB;
      await reopen(d);
      await settled(d, 12);
      const dk = await disk(d);
      check("N4b moved to Team B: the marker is re-decided for Team B (never inherited) and the book re-uploads there",
        dk.marker && dk.marker.team === TB && dk.marker.state === "done" &&
        [...mock.tables.customers.values()].some((r) => r.team_id === TB),
        JSON.stringify({ marker: dk.marker }));
      await closeDevice(d);
    }
    // scale: 1,200 legacy doors = ceil(1200/500) = 3 pages, one pass, no writes
    {
      const T = newTeam();
      const d = await device("scale", T);
      await S(d, async () => {
        const list = [];
        for (let i = 0; i < 1200; i++) list.push({ lat: 38.3 + (i % 40) * 0.002, lng: -98.6 + Math.floor(i / 40) * 0.002,
          address: (i + 1) + " Scale Rd", city: "GB", zip: "67530", externalId: "sc-" + i, source: "t" });
        await STORE.importDoors(list);
      });
      await drain(d, 40);
      check("N5a 1,200 doors reached the server", mock.tables.pins.size >= 1200, String(mock.tables.pins.size));
      await legacyize(d);
      resetCounts(); const w = mock.writes;
      const t0 = Date.now();
      const done = await settled(d, 40);
      const dk = await disk(d);
      const stamped = Object.values(dk.stamps).filter(Boolean).length;
      check("N5b reconciling 1,200 doors: 3 page requests, every door proven, ZERO server writes, one pass",
        done && mock.gets.pins === 3 && stamped >= 1200 && mock.writes === w && dk.pins.length === 1200,
        JSON.stringify({ done, gets: mock.gets, stamped, writes: mock.writes - w, ms: Date.now() - t0 }));
      await closeDevice(d);
    }
  }

  /* ====== R — a backup carries no evidence; a restored device re-proves ====== */
  if (want("R")) {
    section("R — backup/restore strips server evidence and re-proves it");
    const T = newTeam();
    const d = await device("rest", T);
    const capture = () => S(d, async () => {
      const orig = MUI.shareOrDownload; let captured = null;
      MUI.shareOrDownload = async (text) => { captured = text; return true; };
      await MVAULT.backup(); MUI.shareOrDownload = orig; return captured;
    });
    const restore = async (fileObj) => {
      await S(d, async (f) => {
        window.confirm = () => true;
        const blob = new Blob([typeof f === "string" ? f : JSON.stringify(f)], { type: "application/json" });
        await MVAULT.restoreFile(new File([blob], "b.json", { type: "application/json" }));
      }, fileObj);
      await d.page.waitForTimeout(1600);
      await d.page.waitForFunction(() => !!(window.MDB && window.STORE && window.MSYNC && MSYNC.status().loaded), null, { timeout: 20000 });
    };
    const ids = await S(d, async () => {
      const c = await STORE.addCustomer({ first: "Back", last: "Up", phones: [], appointments: [] });
      const h = await STORE.addTerritory({ name: "Backup Hood", homes: 2, points: [[-98.41, 38.49], [-98.39, 38.49], [-98.39, 38.51], [-98.41, 38.51]] });
      await STORE.importDoors([{ lat: 38.5, lng: -98.4, address: "8 Backup St", city: "GB", zip: "67530", source: "t" }], { territoryId: h.id });
      return { c: c.id, h: h.id, p: STORE.pins[0].id };
    });
    await drain(d);
    const before = await disk(d);
    const payload = await capture();
    const file = JSON.parse(payload);
    const carried = ["pins", "territories", "customers"].flatMap((s) => (file.data[s] || []).filter((r) => "serverAt" in r));
    check("R1 the export carries no serverAt on any pin, hood or customer, and no reconcile marker",
      before.stamps[ids.c] && before.stamps[ids.h] && before.stamps[ids.p] && carried.length === 0 &&
      !(file.data.kv || []).some((r) => r.k === "syncReconcile"), JSON.stringify({ carried: carried.length }));
    // a file that DOES carry evidence (hand-edited, or from a future build) is stripped on the way IN too
    const poisoned = JSON.parse(payload);
    ["pins", "territories", "customers"].forEach((s) => (poisoned.data[s] || []).forEach((r) => { r.serverAt = 1; }));
    poisoned.data.kv = (poisoned.data.kv || []).concat([{ k: "syncReconcile", v: { v: 1, team: T, state: "done" } }]);
    await offline(d);           // no cycle may run before the state is read
    await restore(poisoned);
    const after = await disk(d);
    check("R2 after restore: nothing carries serverAt, the marker is gone, the cursors are gone",
      !after.stamps[ids.c] && !after.stamps[ids.h] && !after.stamps[ids.p] && !after.marker && !after.cursors,
      JSON.stringify({ stamps: after.stamps, marker: after.marker }));
    await online(d);
    resetCounts();
    await settled(d, 12);
    const fin = await disk(d);
    check("R3 …then every record is re-proven through push and pull, and the server's book is unchanged",
      fin.stamps[ids.c] && fin.stamps[ids.h] && fin.stamps[ids.p] && fin.marker.state === "done" && fin.outbox.length === 0 &&
      mock.tables.customers.size >= 1 && [...mock.tables.pins.values()].filter((r) => r.team_id === T).length === 1,
      JSON.stringify({ stamps: fin.stamps }));
    // C — restore while a tombstone is pending, with the record NOT in the file
    const cid2 = await S(d, async () => (await STORE.addCustomer({ first: "After", last: "File", phones: [], appointments: [] })).id);
    await drain(d);
    await offline(d);
    await del(d, "customers", cid2);
    await restore(file);
    await online(d);
    const midC = await disk(d); const shC = shapeOf(midC, "customers", cid2);
    await settled(d, 12);
    const finC = await disk(d);
    check("RC1 restore with a tombstone pending and the record NOT in the file: the delete survives the restore, the live server row does not resurrect it, it is tombstoned",
      !shC.present && shC.entry && !finC.customers.includes(cid2) && tomb(T, "customers", cid2) && finC.outbox.length === 0,
      JSON.stringify({ shC, tomb: tomb(T, "customers", cid2), outbox: finC.outbox }));
    // C2 — the file DOES contain the record: the restored book wins (unchanged v39 rule)
    const cid3 = await S(d, async () => (await STORE.addCustomer({ first: "In", last: "File", phones: [], appointments: [] })).id);
    await drain(d);
    const payload3 = await capture();
    await offline(d);
    await del(d, "customers", cid3);
    await restore(payload3);
    /* The restored record must be re-queued for upload even though a cycle
       may fire between the restore's writes and its reload — backfill reads
       the book from disk for exactly this reason (js/sync.js). Without that,
       the pending tombstone would win over the record the file just put back. */
    const afterRestore = (await disk(d)).outbox.find((e) => e.k === "customers:" + cid3);
    await online(d);
    await settled(d, 12);
    const finC2 = await disk(d);
    check("RC2 restore with the record IN the file: the restore re-queues it as an upsert over the pending tombstone, and the restored book wins — live here and live on the server",
      afterRestore && afterRestore.op === "upsert" &&
      finC2.customers.includes(cid3) && !tomb(T, "customers", cid3) && finC2.outbox.length === 0,
      JSON.stringify({ afterRestore, has: finC2.customers.includes(cid3), tomb: tomb(T, "customers", cid3) }));
    await closeDevice(d);
  }

  /* ====== K — proven identities: only an identity-grade merge may retire another row ====== */
  if (want("K")) {
    section("K — proven identities (akaSure): tier gating, uniqueness, transitivity, alias deletion");
    const PROP = { externalId: "prop-777", parcelId: "par-777", address: "777 Same St", city: "Great Bend",
      state: "KS", zip: "67530", source: "demo", lat: 38.55, lng: -98.45 };
    // K1 — tier gating: two rep-dropped pins ~12 m apart, no address: coordinate tier only
    {
      const T = newTeam();
      const A = await device("geoA", T, null, { offlineAfterLogin: true });
      const B = await device("geoB", T, null, { offlineAfterLogin: true });
      const aId = await S(A, async () => (await STORE.addKnock({ lat: 38.6000, lng: -98.5000, disposition: "nothome", reason: null, dm: false, note: "unit 1" })).id);
      const bId = await S(B, async () => (await STORE.addKnock({ lat: 38.6001, lng: -98.5001, disposition: "sold", reason: null, dm: true, note: "unit 2" })).id);
      await online(A); await online(B);
      await drain(A); await drain(B);
      await syncUntil(A, (b) => STORE.pins.some((p) => (p.aka || []).includes(b)), 8);
      await syncUntil(B, (a) => STORE.pins.some((p) => (p.aka || []).includes(a)), 8);
      const aView = await S(A, () => STORE.pins.map((p) => ({ id: p.id, aka: p.aka || [], sure: p.akaSure || [] })));
      check("K1a a ~12 m coordinate match merges for display (aka) but is NOT a proven identity (no akaSure)",
        aView.length === 1 && aView[0].aka.includes(bId) && aView[0].sure.length === 0, JSON.stringify(aView));
      const idsA = await S(A, () => STORE.pinIdentities(STORE.pins[0]));
      await del(A, "pins", aId);
      await drain(A);
      await syncUntil(B, (a) => !STORE.pins.some((p) => (p.aka || []).includes(a)), 8);
      const bView = await S(B, () => STORE.pins.map((p) => ({ id: p.id, aka: p.aka || [], hist: p.history.length })));
      check("K1b deleting A's door retires ONLY A's row — B's neighbouring door and its history survive, B just drops the alias",
        idsA.length === 1 && tomb(T, "pins", aId) && !tomb(T, "pins", bId) &&
        bView.length === 1 && bView[0].id === bId && bView[0].hist >= 1 && !bView[0].aka.includes(aId),
        JSON.stringify({ idsA, aTomb: tomb(T, "pins", aId), bTomb: tomb(T, "pins", bId), bView }));
      await closeDevice(A); await closeDevice(B);
    }
    // K2 — alias uniqueness: an inherited claim on an identity another live door owns is dropped
    {
      const T = newTeam();
      const A = await device("uniq", T);
      const p1 = await S(A, async () => {
        await STORE.importDoors([{ lat: 38.7, lng: -98.7, address: "1 Uniq St", city: "GB", zip: "67530", externalId: "u-1", source: "t" }]);
        return STORE.pins[0].id;
      });
      await drain(A);
      const X = crypto.randomUUID(), Q = crypto.randomUUID();
      const wire = (id, lat, lng, addr, city, zip, ext, extra) => {
        const at = tick();
        mock.tables.pins.set(T + "|" + id, { team_id: T, id, lat, lng, address: addr, disposition: "unworked",
          territory_id: null, created_by: null, deleted_at: null, created_at: at, updated_at: at,
          data: Object.assign({ id, lat, lng, address: addr, geo: { city, state: "KS", zip }, disposition: "unworked",
            reason: null, dm: false, note: "", history: [], notes: [], callbackAt: null, territoryId: null,
            prop: { externalId: ext, parcelId: null, source: "t" }, createdAt: Date.now(), updatedAt: Date.now() }, extra || {}) });
      };
      wire(X, 38.7, -98.7, "1 Uniq St", "GB", "67530", "u-1");                    // same property as p1 → ext match
      await syncUntil(A, (x) => STORE.pins.some((p) => (p.aka || []).includes(x)), 8);
      wire(Q, 39.9, -99.9, "9 Far Rd", "Elsewhere", "00000", null, { aka: [X, p1], akaSure: [X, p1] });
      await syncUntil(A, (q) => STORE.pins.some((p) => p.id === q), 8);
      const view = await S(A, () => STORE.pins.map((p) => ({ id: p.id, aka: p.aka || [], sure: p.akaSure || [] })));
      const claimants = (v) => {
        const m = new Map();
        v.forEach((p) => new Set([...p.aka, ...p.sure]).forEach((a) =>
          m.set(a, (m.get(a) || new Set()).add(p.id))));
        return m;
      };
      const owners = claimants(view);
      const q = view.find((p) => p.id === Q);
      check("K2a no two live doors claim the same identity: Q's inherited claim on X (p1's alias) and on p1 itself (a live primary) is dropped from BOTH aka and akaSure",
        view.length === 2 && [...owners.values()].every((set) => set.size === 1) && q &&
        !q.aka.includes(X) && !q.aka.includes(p1) && !q.sure.includes(X) && !q.sure.includes(p1),
        JSON.stringify(view));
      await reopen(A); await drain(A);
      const view2 = await S(A, () => STORE.pins.map((p) => ({ id: p.id, aka: p.aka || [], sure: p.akaSure || [] })));
      check("K2b …and it stays unique across reopen and reconciliation",
        view2.length === 2 && [...claimants(view2).values()].every((set) => set.size === 1),
        JSON.stringify(view2));
      await closeDevice(A);
    }
    /* Three devices, one property. C creates Z. A imports the same property and
       proves Z → X by externalId, then pushes X carrying akaSure:[Z]. B imports
       it too and proves X → P, inheriting Z. B must end holding P, X and Z. */
    const three = async (T) => {
      const off = { offlineAfterLogin: true };
      const C = await device("trC", T, null, off);
      const A = await device("trA", T, null, off);
      const B = await device("trB", T, null, off);
      const own = (d) => S(d, async (P) => {
        const before = STORE.pins.length;
        await STORE.importDoors([P]);
        if (STORE.pins.length !== before + 1) throw new Error("fixture: the import deduped instead of authoring a row");
        return STORE.pins[STORE.pins.length - 1].id;
      }, PROP);
      const zId = await own(C); await online(C); await drain(C);
      const xId = await own(A); await online(A);
      // A proves Z → X by externalId, then pushes X carrying akaSure:[Z]
      await syncUntil(A, (z) => STORE.pins.some((p) => (p.akaSure || []).includes(z)), 10);
      await drain(A);
      const pId = await own(B); await online(B);
      await syncUntil(B, ({ x, z }) => { const p = STORE.pins[0];
        return !!p && (p.akaSure || []).includes(x) && (p.akaSure || []).includes(z); }, 12);
      await drain(B);
      return { A, B, C, xId, zId, pId };
    };
    {
      const T = newTeam();
      const { A, B, C, xId, zId, pId } = await three(T);
      const aSure = await S(A, () => STORE.pins[0].akaSure || []);
      const bView = await S(B, () => ({ n: STORE.pins.length, sure: STORE.pins[0].akaSure || [],
        ids: STORE.pinIdentities(STORE.pins[0]) }));
      check("K3a A proves Z→X; B receives X with akaSure:[Z] and proves X→P — P carries proven identities X and Z (flat, deduplicated, never its own id)",
        aSure.includes(zId) && bView.n === 1 && bView.sure.includes(xId) && bView.sure.includes(zId) &&
        !bView.sure.includes(pId) && new Set(bView.sure).size === bView.sure.length && bView.ids.length === 3,
        JSON.stringify({ aSure, bView }));
      await reopen(B);
      const persisted = await S(B, () => STORE.pins[0].akaSure || []);
      check("K3b the proven set survives reopen", persisted.includes(xId) && persisted.includes(zId), JSON.stringify(persisted));
      await del(B, "pins", pId);
      const box = (await disk(B)).outbox;
      check("K3c deleting P writes ONE tombstone per proven identity, in one transaction, with no duplicate keys, each proven on the server by construction",
        box.length === 3 && box.every((e) => e.op === "delete" && e.wasOnServer === true) &&
        new Set(box.map((e) => e.k)).size === 3 && [pId, xId, zId].every((id) => box.some((e) => e.k === "pins:" + id)),
        JSON.stringify(box));
      await drain(B);
      await syncUntil(A, () => STORE.pins.length === 0, 6);
      await syncUntil(C, () => STORE.pins.length === 0, 6);
      check("K3d P, X and Z are all tombstoned; A's and C's copies of the same proven door go with it; no alias came back as a new pin",
        tomb(T, "pins", pId) && tomb(T, "pins", xId) && tomb(T, "pins", zId) &&
        (await S(A, () => STORE.pins.length)) === 0 && (await S(C, () => STORE.pins.length)) === 0 &&
        (await S(B, () => STORE.pins.length)) === 0,
        JSON.stringify({ p: tomb(T, "pins", pId), x: tomb(T, "pins", xId), z: tomb(T, "pins", zId) }));
      await reopen(B); await settled(B, 8);
      check("K3e …absent after reopen and reconciliation, outbox empty",
        (await S(B, () => STORE.pins.length)) === 0 && (await disk(B)).outbox.length === 0);
      await closeDevice(A); await closeDevice(B); await closeDevice(C);
    }
    // A0–A8: crash boundaries around a proven-identity delete
    {
      const matrix = {
        A0: { at: "delete", spec: { method: "txn", match: "pins" }, after: "present" },
        A1: { at: "delete-reject", spec: { method: "txn", match: "pins", mode: "reject" }, after: "present" },
        A2: { at: "delete", spec: { method: "getAll", match: "events", after: { method: "txn", match: "pins" } }, after: "absent" },
        A3: { at: "reopen", spec: null, after: "absent" },
        A4: { at: "sync", spec: { method: "txn", match: "outbox" }, after: "absent" },
        A5: { at: "sync", spec: { method: "kvSet", match: "syncCursors", after: { method: "txn", match: "outbox" } }, after: "absent" },
        A6: { at: "sync", spec: { method: "getAll", match: "outbox", after: { method: "kvSet", match: "syncCursors" } }, after: "absent" },
        A7: { at: "sync", spec: { method: "del", match: "outbox" }, after: "absent" },
        A8: { at: "partial-batch", spec: null, after: "absent" },
      };
      for (const [name, m] of Object.entries(matrix)) {
        const T = newTeam();
        const { A, B, C, xId, zId, pId } = await three(T);
        await legacyize(B);
        await offline(B);
        let hit = true, rej = null;
        if (m.at === "delete") hit = await crashAt(B, m.spec, delFire("pins", pId));
        else if (m.at === "delete-reject") {
          await crash.arm(B.page, m.spec);
          rej = await del(B, "pins", pId);
          await reopen(B);
        } else {
          await del(B, "pins", pId);
          if (m.at === "reopen") await reopen(B);
        }
        let dk = await disk(B);
        let entries = dk.outbox.filter((e) => e.op === "delete");
        const shaped = m.after === "present"
          ? dk.pins.includes(pId) && entries.length === 0
          : !dk.pins.includes(pId) && entries.length === 3 &&
            [pId, xId, zId].every((id) => entries.some((e) => e.k === "pins:" + id));
        check(`${name} after the crash: ${m.after === "present" ? "pin present, NO tombstones" : "pin absent, ALL THREE tombstones"} — never a partial alias set`,
          hit && shaped && (m.at !== "delete-reject" || rej === false),
          JSON.stringify({ hit, rej, pins: dk.pins.length, entries }));
        await online(B);
        if (m.after === "present") await del(B, "pins", pId);
        if (m.at === "sync") {
          hit = await crashAt(B, m.spec, fireSync);
          dk = await disk(B);
          const visible = await S(B, () => STORE.pins.length);
          check(`${name} killed at ${m.spec.method}(${m.spec.match}) mid-cycle: no alias resurrected, the remaining tombstones are intact`,
            hit && visible === 0 && dk.pins.length === 0 && dk.outbox.filter((e) => e.op === "delete").length >= 1,
            JSON.stringify({ hit, visible, outbox: dk.outbox }));
        }
        if (m.at === "partial-batch") {
          let n = 0;
          mock.fail = (req, u, t) => (req.method === "PATCH" && t === "pins" && ++n === 2) ? 503 : 0;
          await sync(B); mock.fail = null;
          dk = await disk(B);
          const doneNow = [pId, xId, zId].filter((id) => tomb(T, "pins", id)).length;
          check(`${name} a partially-accepted network batch: the accepted tombstone leaves the outbox, the rest stay queued`,
            doneNow === 1 && dk.outbox.filter((e) => e.op === "delete").length === 2,
            JSON.stringify({ doneNow, outbox: dk.outbox }));
        }
        await settled(B, 14);
        await syncUntil(A, () => STORE.pins.length === 0, 6);
        await syncUntil(C, () => STORE.pins.length === 0, 6);
        const fin = await disk(B);
        check(`${name} converges: P, X and Z tombstoned; nothing resurrected on B, A or C; no duplicate pins; outbox empty; no orphan history`,
          tomb(T, "pins", pId) && tomb(T, "pins", xId) && tomb(T, "pins", zId) &&
          fin.pins.length === 0 && fin.outbox.length === 0 && fin.events.length === 0 &&
          (await S(A, () => STORE.pins.length)) === 0 && (await S(C, () => STORE.pins.length)) === 0,
          JSON.stringify({ p: tomb(T, "pins", pId), x: tomb(T, "pins", xId), z: tomb(T, "pins", zId),
            pins: fin.pins, outbox: fin.outbox }));
        await reopen(B);
        check(`${name} …absent after force-close and reopen`, (await disk(B)).pins.length === 0);
        await closeDevice(A); await closeDevice(B); await closeDevice(C);
      }
    }
    // an alias whose server row is not there at all
    {
      const T = newTeam();
      const { A, B, C, xId, zId, pId } = await three(T);
      mock.tables.pins.delete(T + "|" + zId);   // absent, not tombstoned
      resetCounts();
      await del(B, "pins", pId);
      await drain(B, 10);
      const st = await status(B); const dk = await disk(B);
      check("KZ an alias absent from the server: its zero-row PATCH is surfaced ONCE as a refusal (the conservative rule, kept), no retry loop, P and X still tombstoned, outbox empty",
        tomb(T, "pins", pId) && tomb(T, "pins", xId) && (mock.patches.get(zId) || 0) === 1 &&
        st.refused === 1 && st.lastRefusal && st.lastRefusal.id === zId && dk.outbox.length === 0,
        JSON.stringify({ patches: mock.patches.get(zId), refused: st.refused,
          last: st.lastRefusal && st.lastRefusal.id, outbox: dk.outbox }));
      await closeDevice(A); await closeDevice(B); await closeDevice(C);
    }
  }

  /* ====== M — reconciliation is an ordinary pull: local unsynced edits win ====== */
  if (want("M")) {
    section("M — the merge rules are unchanged: unsynced local edits survive reconciliation");
    const T = newTeam();
    const d = await device("merge", T);
    const ids = await S(d, async () => {
      const h = await STORE.addTerritory({ name: "Old Name", homes: 2, points: [[-98.41, 38.49], [-98.39, 38.49], [-98.39, 38.51], [-98.41, 38.51]] });
      await STORE.importDoors([{ lat: 38.5, lng: -98.4, address: "4 Merge St", city: "GB", zip: "67530", source: "t" }], { territoryId: h.id });
      const c = await STORE.addCustomer({ first: "Old", last: "First", phones: [], appointments: [] });
      return { h: h.id, p: STORE.pins[0].id, c: c.id };
    });
    await drain(d);
    await legacyize(d);
    await offline(d);
    await S(d, async (ids) => {
      const h = STORE.territories.find((t) => t.id === ids.h); h.name = "New Name"; await STORE.updateTerritory(h);
      const p = STORE.pins.find((x) => x.id === ids.p);
      await STORE.addKnock({ pinId: p.id, lat: p.lat, lng: p.lng, disposition: "sold", reason: null, dm: true, note: "closed" });
      await STORE.addNote(p, "callback set");
      p.callbackAt = 12345; await STORE.updatePin(p);
      const c = STORE.customers.find((x) => x.id === ids.c); c.first = "New"; await STORE.updateCustomer(c);
    }, ids);
    await online(d);
    await settled(d, 14);
    const v = await S(d, (ids) => ({
      hood: STORE.territories.find((t) => t.id === ids.h).name,
      pin: STORE.pins[0], cust: STORE.customers.find((c) => c.id === ids.c).first }), ids);
    check("M1 a rename, a knock, a note, a callback and a customer edit made before reconciliation all survive it and reach the server",
      v.hood === "New Name" && v.pin.history.length === 1 && v.pin.notes.length === 1 && v.pin.callbackAt === 12345 &&
      v.cust === "New" && srv(T, "territories", ids.h).name === "New Name" &&
      srv(T, "customers", ids.c).first === "New" && srv(T, "pins", ids.p).data.callbackAt === 12345,
      JSON.stringify({ hood: v.hood, hist: v.pin.history.length, notes: v.pin.notes.length, cb: v.pin.callbackAt, cust: v.cust }));
    await closeDevice(d);
  }

  await browser.close();
  server.close();
  const pageErrors = errors.filter((e) => !/Failed to fetch|NetworkError|Load failed/.test(e));
  if (pageErrors.length) check("no page errors", false, pageErrors.slice(0, 4).join(" | "));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => {
  console.error("CRASH", e);
  // leave no orphaned Chromium behind — the next suite in the batch pays for it
  try { await browserRef.b.close(); } catch (_) {}
  process.exit(1);
});
