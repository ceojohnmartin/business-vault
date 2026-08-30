/* Phase 2 — two-device sync test. Two real RALLY instances (John, a team
   owner, and Lena, a rep on the same team) share one mock server that
   speaks Supabase's wire protocol: GoTrue password auth plus PostgREST
   upserts/filters with the RLS rules of the real schema emulated — team
   scoping, events append-only + write-as-yourself-only, the customer
   payment scrub trigger, server-stamped updated_at.

   What must hold: knocks, customers, territories and deletions converge
   across both devices; offline work queues and drains; nothing loops; and
   no card number ever crosses the wire. */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const PORT = 8848;
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

// ---------------- mock Supabase ----------------
const TEAM = "11111111-1111-4111-a111-111111111111";
const mock = {
  users: {}, profiles: {}, access: {},
  tables: { pins: new Map(), events: new Map(), territories: new Map(), customers: new Map() },
  rawBodies: [],        // every POST/PATCH body, for the never-a-PAN assertion
  upsertWrites: 0,      // rows actually written (loop detection)
  eventUpdateAttempts: 0,
  clock: Date.parse("2026-08-30T00:00:00Z"),
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
  const uid = authOf(req);
  if (!uid) return j(res, 401, { message: "JWT invalid" });
  const me = mock.profiles[uid];
  const table = u.pathname.replace("/rest/v1/", "");

  if (table === "profiles") {
    if (me.disabled) return j(res, 200, [me]); // RLS: own row only when disabled
    const want = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    const rows = Object.values(mock.profiles).filter((p) =>
      p.id === uid || (p.team_id === me.team_id && p.team_id));
    return j(res, 200, want ? rows.filter((r) => r.id === want) : rows);
  }
  const t = mock.tables[table];
  if (!t) return j(res, 404, { message: "not found" });

  if (req.method === "POST") {
    const prefer = String(req.headers.prefer || "");
    const rows = Array.isArray(body) ? body : [body];
    for (const row of rows) {
      // RLS with-check: your own team, and events written as yourself only
      if (row.team_id !== me.team_id)
        return j(res, 401, { code: "42501", message: "row-level security" });
      if (table === "events" && row.by_user && row.by_user !== uid)
        return j(res, 401, { code: "42501", message: "row-level security (by_user)" });
      const key = row.team_id + "|" + row.id;
      const existing = t.get(key);
      if (existing) {
        if (prefer.includes("ignore-duplicates")) continue;
        if (table === "events") { // no UPDATE grant: upsert-with-merge dies at plan time
          mock.eventUpdateAttempts++;
          return j(res, 401, { code: "42501", message: "permission denied for events" });
        }
        const merged = Object.assign({}, existing, row,
          { created_at: existing.created_at, updated_at: tick() });
        if (table === "customers") scrubTrigger(merged);
        t.set(key, merged);
        mock.upsertWrites++;
      } else {
        const fresh = Object.assign({}, row, { created_at: tick() });
        if (table !== "events") fresh.updated_at = fresh.created_at;
        if (table === "customers") scrubTrigger(fresh);
        t.set(key, fresh);
        mock.upsertWrites++;
      }
    }
    return j(res, 201, prefer.includes("return=minimal") ? undefined : rows);
  }

  if (req.method === "PATCH") {
    if (table === "events") { mock.eventUpdateAttempts++; return j(res, 401, { code: "42501" }); }
    const id = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    const teamQ = String(u.searchParams.get("team_id") || "").replace(/^eq\./, "");
    if (teamQ !== me.team_id) return j(res, 200, undefined); // RLS: matches nothing
    const key = teamQ + "|" + id;
    const row = t.get(key);
    if (row) {
      Object.assign(row, body, { updated_at: tick() });
      if (table === "customers") scrubTrigger(row);
      mock.upsertWrites++;
    }
    return j(res, 200, undefined);
  }

  // GET: RLS team scope, then the query filters
  let rows = [...t.values()].filter((r) => r.team_id === me.team_id);
  const clockCol = table === "events" ? "created_at" : "updated_at";
  const gt = u.searchParams.get(clockCol);
  if (gt && gt.startsWith("gt.")) rows = rows.filter((r) => r[clockCol] > gt.slice(3));
  rows.sort((a, b) => (a[clockCol] < b[clockCol] ? -1 : 1));
  const limit = Number(u.searchParams.get("limit") || 0);
  if (limit) rows = rows.slice(0, limit);
  return j(res, 200, rows);
}

// mirror of the real DB trigger: payment survives only as the allowlist
function scrubTrigger(row) {
  if (row.data && row.data.payment) {
    const p = row.data.payment;
    row.data.payment = { method: p.method || "", last4: p.last4 || "",
      autopay: !!p.autopay, billingAddress: p.billingAddress || null };
  }
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
      if (raw) mock.rawBodies.push(raw);
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

// ---------------- the run ----------------
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const johnId = addUser("john@x.com", "knock1234", { name: "John M.", role: "owner" });
  const lenaId = addUser("lena@x.com", "knock1234", { name: "Lena Ortiz", role: "rep" });

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];
  async function device(email) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    });
    await ctx.addInitScript(`window.RALLY_CLOUD = { url: "http://localhost:${PORT}", anonKey: "test-anon" };`);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(email + ": " + e.message));
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
    await page.fill("#gate-email", email); await page.fill("#gate-pass", "knock1234");
    await page.click("#gate-submit");
    await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 20000 });
    await page.waitForTimeout(800);
    return { ctx, page };
  }
  const sync = (d) => d.page.evaluate(() => MSYNC.syncNow());
  const S = (d, fn) => d.page.evaluate(fn);
  const offline = (d) => d.ctx.route(/\/(auth|rest)\/v1\//, (r) => r.abort());
  const online = (d) => d.ctx.unroute(/\/(auth|rest)\/v1\//);

  const A = await device("john@x.com");   // John — owner
  // ---- A builds a morning of work
  await S(A, async () => {
    const t = await STORE.addTerritory({ name: "Cypress Bend", homes: 40,
      points: [[-98.37, 38.47], [-98.35, 38.47], [-98.35, 38.49], [-98.37, 38.49]] });
    await STORE.assignTerritory(t, STORE.currentUser().id);
    window.__pin = await STORE.addKnock({ lat: 38.48, lng: -98.36,
      disposition: "goback", reason: null, dm: true, note: "come back at 6", callbackAt: Date.now() + 3600e3 });
    await STORE.addCustomer({ first: "Dana", last: "Miles", phones: [{ n: "3855803160" }],
      plan: { name: "premium", monthly: 99, initial: 450 },
      payment: { method: "card", last4: "4242", autopay: true,
        card: { name: "Dana Miles", number: "4242424242424242", exp: "12/27" },
        ach: { name: "", routing: "110000000", account: "000123456789", type: "checking" },
        billingAddress: { street: "1 Elm", city: "Wichita", state: "KS", zip: "67202" } },
      appointments: [] });
    const c = STORE.customers[0];
    await STORE.addAppointment(c, Date.now() + 86400e3, "initial", STORE.currentUser().id);
  });
  await sync(A);
  const st1 = await S(A, () => MSYNC.status());
  check("A1 first sync drains the outbox", st1.pending === 0, JSON.stringify(st1));
  check("A2 server holds A's book", mock.tables.pins.size === 1 && mock.tables.events.size === 1
    && mock.tables.territories.size === 1 && mock.tables.customers.size === 1);
  const custRow = [...mock.tables.customers.values()][0];
  check("A3 card + bank numbers never crossed the wire",
    !mock.rawBodies.some((b) => b.includes("4242424242424242") || b.includes("000123456789")));
  check("A4 server payment is the allowlist only",
    custRow.data.payment.last4 === "4242" && !custRow.data.payment.card && !custRow.data.payment.ach);
  check("A5 events carry John's identity", [...mock.tables.events.values()][0].by_user === johnId);

  // ---- B pulls the world
  const B = await device("lena@x.com");   // Lena — rep, same team
  await sync(B);
  const bView = await S(B, () => ({
    pins: STORE.pins.length, events: STORE.events.length,
    hoods: STORE.territories.map((t) => t.name),
    cust: STORE.customers.map((c) => c.first + " " + c.last),
    users: STORE.users.map((u) => u.name).sort(),
    assignedName: (() => { const t = STORE.territories[0];
      const u = t && STORE.users.find((x) => x.id === t.assignedTo);
      return u ? u.name : null; })(),
    appt: (STORE.customers[0] && (STORE.customers[0].appointments || []).length) || 0,
    callback: STORE.pins[0] && !!STORE.pins[0].callbackAt,
  }));
  check("B1 Lena sees the door, the knock, the hood, the customer",
    bView.pins === 1 && bView.events === 1 && bView.hoods[0] === "Cypress Bend" && bView.cust[0] === "Dana Miles");
  check("B2 John exists on Lena's device as a teammate", bView.users.includes("John M."), bView.users.join(","));
  check("B3 the hood's assignment survived the identity bridge", bView.assignedName === "John M.", String(bView.assignedName));
  check("B4 the appointment and callback came through", bView.appt === 1 && bView.callback === true);

  // ---- both work the same door
  await S(B, async () => {
    const pin = STORE.pins[0];
    await STORE.addKnock({ pinId: pin.id, lat: pin.lat, lng: pin.lng,
      disposition: "sold", reason: null, dm: true, note: "closed at the door" });
  });
  await sync(B);
  await sync(A);
  const aPin = await S(A, () => ({
    disp: STORE.pins[0].disposition, hist: STORE.pins[0].history.length,
    events: STORE.events.length,
    lastRepIsLena: (() => { const e = STORE.events[STORE.events.length - 1];
      const u = STORE.users.find((x) => x.id === e.repId); return u ? u.name : null; })(),
  }));
  check("C1 Lena's sale lands on John's phone", aPin.disp === "sold" && aPin.events === 2);
  check("C2 the door's history holds BOTH knocks", aPin.hist === 2, "hist=" + aPin.hist);
  check("C3 the sale is credited to Lena on John's leaderboard", aPin.lastRepIsLena === "Lena Ortiz", String(aPin.lastRepIsLena));

  // ---- offline: Lena keeps knocking in a dead zone
  await offline(B);
  await S(B, async () => {
    await STORE.addKnock({ lat: 38.481, lng: -98.361, disposition: "nothome", reason: null, dm: false, note: "" });
  });
  await sync(B);
  const stOff = await S(B, () => MSYNC.status());
  check("D1 offline knock queues instead of failing", stOff.pending > 0, "pending=" + stOff.pending);
  await online(B);
  await sync(B);
  check("D2 back online, the queue drains", (await S(B, () => MSYNC.status())).pending === 0);
  await sync(A);
  check("D3 John receives the dead-zone knock", (await S(A, () => STORE.pins.length)) === 2);

  // ---- conflict: both edit Dana, last writer wins, both converge
  await offline(A); await offline(B);
  await S(A, async () => { const c = STORE.customers[0]; c.first = "Dana-A"; await STORE.updateCustomer(c); });
  await S(B, async () => { const c = STORE.customers[0]; c.first = "Dana-B"; await STORE.updateCustomer(c); });
  await online(A); await online(B);
  await sync(A); await sync(B);       // B pushes second — B should win
  await sync(A); await sync(B);       // both settle
  const nameA = await S(A, () => STORE.customers[0].first);
  const nameB = await S(B, () => STORE.customers[0].first);
  check("E1 conflicting edits converge to one winner on both phones",
    nameA === nameB && (nameA === "Dana-A" || nameA === "Dana-B"), nameA + "/" + nameB);

  // ---- tombstone: John deletes the customer everywhere
  await S(A, async () => { await STORE.deleteCustomer(STORE.customers[0].id); });
  await sync(A); await sync(B);
  check("F1 the delete reaches Lena", (await S(B, () => STORE.customers.length)) === 0);
  check("F2 the server kept a tombstone, not a hole",
    [...mock.tables.customers.values()][0].deleted_at != null);

  // ---- import dedupe: both phones import the same three doors
  await S(A, async () => {
    const mk = (i) => ({ externalId: "door-" + i, parcelId: "p-" + i, source: "demo",
      lat: 38.5 + i * 0.001, lng: -98.4, address: (100 + i) + " Demo Ave",
      city: "Great Bend", state: "KS", zip: "67530", propertyType: "sfr" });
    await STORE.importDoors([mk(0), mk(1), mk(2)]);
  });
  await S(B, async () => {
    const mk = (i) => ({ externalId: "door-" + i, parcelId: "p-" + i, source: "demo",
      lat: 38.5 + i * 0.001, lng: -98.4, address: (100 + i) + " Demo Ave",
      city: "Great Bend", state: "KS", zip: "67530", propertyType: "sfr" });
    await STORE.importDoors([mk(0), mk(1), mk(2)]);
  });
  await sync(A); await sync(B); await sync(A);
  const dedupe = await Promise.all([S(A, () => STORE.pins.length), S(B, () => STORE.pins.length)]);
  check("G1 the same import on two phones doesn't double the doors",
    dedupe[0] === 5 && dedupe[1] === 5, "A=" + dedupe[0] + " B=" + dedupe[1]);

  // ---- stability: nothing loops, nothing rewrites the knock log
  const writes = mock.upsertWrites;
  await sync(A); await sync(B); await sync(A); await sync(B);
  check("H1 quiet cycles write nothing (no echo loop)", mock.upsertWrites === writes,
    "extra=" + (mock.upsertWrites - writes));
  check("H2 no client ever tried to rewrite the knock log", mock.eventUpdateAttempts === 0,
    "attempts=" + mock.eventUpdateAttempts);
  const pend = await Promise.all([S(A, () => MSYNC.status().pending), S(B, () => MSYNC.status().pending)]);
  check("H3 both outboxes are empty at rest", pend[0] === 0 && pend[1] === 0, pend.join("/"));

  // ---- backfill: re-armed (as after a restore), everything re-uploads sanely
  await S(A, async () => { await MDB.kvSet("syncBackfilled", null); await MDB.clear("outbox"); });
  await sync(A);
  check("I1 a re-armed backfill re-pushes without duplicating server rows",
    mock.tables.pins.size >= 5 && (await S(A, () => MSYNC.status().pending)) === 0);

  check("no page errors on either device", errors.length === 0, errors.slice(0, 3).join("|"));

  console.log("\n=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  await browser.close(); server.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
