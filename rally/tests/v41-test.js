/* RALLY v41 — the CLIENT release gates.

   Real browsers, a real sync engine, and a mock server that speaks the v41
   protocol: the assignee ledger as a server-owned column, the activation
   capability, the turf RPCs, and the do-not-knock correction a server makes
   to a client that tried to clear one.

   The three things that most needed proving here, because none of them can
   be proved in node and none of them is obvious:

     THE SERVER-OWNED MERGE. A field the server authors does not move the
     record's client clock, so the v40 merge engine returned early and threw
     it away. This suite lands an assignment and a cycle boundary through
     that exact gap, and — just as importantly — proves the bounded fix did
     NOT become "the server row wins", by editing a hood offline and
     watching those edits survive.

     THE CAPABILITY LATCH. True must stick, a later false must not
     downgrade it, and an erase must clear it.

     v40 CONVERGENCE. A client that tries to clear a do-not-knock gets the
     row back corrected and stamped above its own clock, and must apply it
     and then STOP — a correction that a device re-pushes forever is worse
     than no correction at all.

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/v41-test.js
   ONLY=H  — run one section (H merge, C capability, D dnk, A assign, Y cycle) */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8879);
const ONLY = process.env.ONLY ? new RegExp("^(" + process.env.ONLY + ")") : null;

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
};
let sec = "";
const section = (t) => { sec = t; if (!ONLY || ONLY.test(t)) console.log("\n== " + t); };
const on = () => !ONLY || ONLY.test(sec);

// ---------------- mock Supabase, v41 ----------------
const TEAM = "11111111-1111-4111-a111-111111111111";
const mock = {
  users: {}, profiles: {}, access: {},
  tables: { pins: new Map(), events: new Map(), territories: new Map(), customers: new Map() },
  clock: Date.parse("2026-09-04T00:00:00Z"),
  caps: { assignmentServerAuthoritative: false, turfRpc: true, postgis: true },
  capsStatus: 200,
  capCalls: 0,
  dnkCorrections: 0,
  forgedEventsDropped: 0,
  forgedHistoryStripped: 0,
  serverAuthoredClears: new Set(),   // the ids clear_pin_dnk itself wrote
  pinUpserts: new Map(),   // pin id -> number of upload attempts (loop detector)
};
const tick = () => new Date(++mock.clock).toISOString();
const nowMs = () => mock.clock;
function addUser(email, password, prof) {
  const id = crypto.randomUUID();
  mock.users[String(email).toLowerCase()] = { id, password };
  mock.profiles[id] = Object.assign(
    { id, team_id: TEAM, role: "rep", name: email, email: String(email).toLowerCase(), disabled: false }, prof);
  return id;
}
const j = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const authOf = (req) => mock.access[String(req.headers.authorization || "").replace(/^Bearer /, "")];

// ---- the pieces of the migrations a client can observe ----

const openEntries = (a) => ((a && a.entries) || []).filter((e) => e.unassignedAt == null);
const sortEntries = (es) => es.slice().sort((a, b) =>
  (a.assignedAt - b.assignedAt) || String(a.userId).localeCompare(String(b.userId)));
const firstOpen = (a) => (sortEntries(openEntries(a))[0] || {}).userId || null;

/* 0010's mirrors: data.assignedTo is the FIRST open assignee, data.assignments
   is every entry in the v40 five-field shape with assignedBy as a NAME. */
function mirror(row) {
  const entries = sortEntries((row.assignees && row.assignees.entries) || []);
  row.assignees = { entries };
  row.data = Object.assign({}, row.data, {
    assignedTo: firstOpen(row.assignees),
    assignments: entries.map((e) => ({
      userId: e.userId, name: e.name || "",
      assignedBy: e.assignedByName || (mock.profiles[e.assignedBy] || {}).name || "",
      assignedAt: e.assignedAt, unassignedAt: e.unassignedAt == null ? null : e.unassignedAt,
    })),
  });
}

/* 0013's do-not-knock authority, as a client sees it: an attempt to move a
   black door away from dnk, or to tombstone it, is NEUTRALISED — not
   refused, because a refusal would fail the whole batch — and the row comes
   back stamped above the incoming clock so the client accepts the fix. */
function protectDnk(existing, proposed) {
  const dnkOf = (d) => {
    let at = null, cleared = null;
    ((d && d.history) || []).forEach((h) => {
      if (h.disposition === "dnk") at = Math.max(at || 0, h.ts);
      if (h.disposition === "dnk_clear") cleared = Math.max(cleared || 0, h.ts);
    });
    if (at === null) return null;
    return cleared !== null && cleared >= at ? null : at;
  };
  const wasDnk = existing.disposition === "dnk" || dnkOf(existing.data) !== null;
  if (!wasDnk) return proposed;
  let touched = false;
  if (proposed.disposition !== "dnk") { proposed.disposition = "dnk"; touched = true; }
  if (!proposed.data) proposed.data = {};
  if (proposed.data.disposition !== "dnk") { proposed.data.disposition = "dnk"; touched = true; }
  if (proposed.deleted_at && !existing.deleted_at) { proposed.deleted_at = existing.deleted_at; touched = true; }
  if (dnkOf(proposed.data) === null) {
    proposed.data.history = (proposed.data.history || []).concat([
      { ts: dnkOf(existing.data) || nowMs(), disposition: "dnk", reason: null, dm: false,
        note: "do-not-knock restored by the server" }]);
    touched = true;
  }
  if (touched) {
    mock.dnkCorrections++;
    // the authoritative-correction stamp: strictly above what arrived
    proposed.data.updatedAt = Math.max(nowMs(), (proposed.data.updatedAt || 0) + 1);
  }
  return proposed;
}

function handleRpc(req, res, u, body, me) {
  const name = u.pathname.replace("/rest/v1/rpc/", "");
  if (name === "rally_capabilities") {
    mock.capCalls++;
    if (mock.capsStatus !== 200) return j(res, mock.capsStatus, { message: "not found" });
    return j(res, 200, mock.caps);
  }
  const leader = ["leader", "manager", "owner"].includes(me.role) && !me.disabled;
  if (name === "set_territory_assignments") {
    if (!leader) return j(res, 403, { code: "42501", message: "turf: requires leader" });
    const row = mock.tables.territories.get(TEAM + "|" + body.p_territory_id);
    if (!row) return j(res, 400, { message: "turf: hood not found" });
    const at = nowMs();
    const want = body.p_assignees || [];
    const entries = ((row.assignees && row.assignees.entries) || []).map((e) => Object.assign({}, e));
    entries.forEach((e) => { if (e.unassignedAt == null && want.indexOf(e.userId) < 0) e.unassignedAt = at; });
    const stillOpen = entries.filter((e) => e.unassignedAt == null).map((e) => e.userId);
    want.forEach((uid) => {
      if (stillOpen.indexOf(uid) >= 0) return;
      entries.push({ userId: uid, name: (mock.profiles[uid] || {}).name || "",
        assignedBy: me.id, assignedByName: me.name || "", assignedAt: at, unassignedAt: null,
        viaOperation: body.p_operation_id });
    });
    row.assignees = { entries };
    row.assignees_rev = (row.assignees_rev || 0) + 1;
    mirror(row);
    row.updated_at = tick();
    return j(res, 200, { status: "ok", territory_id: row.id, assignees: row.assignees });
  }
  if (name === "start_territory_cycle") {
    if (!leader) return j(res, 403, { code: "42501", message: "turf: requires leader" });
    const row = mock.tables.territories.get(TEAM + "|" + body.p_territory_id);
    if (!row) return j(res, 400, { message: "turf: hood not found" });
    const at = body.p_at || new Date(nowMs()).toISOString();
    if (row.cycle_started_at && at <= row.cycle_started_at) {
      return j(res, 200, { status: "already_current", cycle_started_at: row.cycle_started_at });
    }
    row.cycle_started_at = at;
    row.updated_at = tick();
    return j(res, 200, { status: "ok", territory_id: row.id, cycle_started_at: at });
  }
  if (name === "clear_pin_dnk") {
    if (!leader) return j(res, 403, { code: "42501", message: "turf: requires leader" });
    const row = mock.tables.pins.get(TEAM + "|" + body.p_pin_id);
    if (!row) return j(res, 400, { message: "turf: door not found" });
    if (!body.p_reason) return j(res, 400, { message: "turf: needs a reason" });
    const at = nowMs();
    row.data = Object.assign({}, row.data, {
      history: (row.data.history || []).concat([{ ts: at, disposition: "dnk_clear",
        reason: body.p_reason, dm: false, note: "" }]),
      disposition: "unworked",
      updatedAt: Math.max(at, (row.data.updatedAt || 0) + 1),
    });
    row.disposition = "unworked";
    row.updated_at = tick();
    mock.serverAuthoredClears.add("dnkclear-" + body.p_operation_id);
    mock.tables.events.set(TEAM + "|dnkclear-" + body.p_operation_id, {
      team_id: TEAM, id: "dnkclear-" + body.p_operation_id, pin_id: row.id,
      type: "dnk_clear", disposition: "dnk_clear", at_ms: at, by_user: me.id,
      data: { id: "dnkclear-" + body.p_operation_id, ts: at, pinId: row.id,
              disposition: "dnk_clear", reason: body.p_reason },
      created_at: tick(),
    });
    return j(res, 200, { status: "ok", pin_id: row.id, cleared_at: at });
  }
  return j(res, 404, { message: "no function " + name });
}

function handleRest(req, res, u, body) {
  const uid = authOf(req);
  if (!uid) return j(res, 401, { message: "JWT invalid" });
  const me = mock.profiles[uid];
  if (u.pathname.startsWith("/rest/v1/rpc/")) return handleRpc(req, res, u, body, me);
  const table = u.pathname.replace("/rest/v1/", "");

  if (table === "profiles") {
    const rows = Object.values(mock.profiles).filter((p) => p.id === uid || p.team_id === me.team_id);
    /* PostgREST honours ?id=eq.<uid>, and MCLOUD.getProfile() relies on it
       to fetch THIS account's row. A mock that ignores the filter hands
       every device the first profile in the team — which silently made a
       rep look like a manager and quietly passed the role checks. */
    const want = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    return j(res, 200, want ? rows.filter((r) => r.id === want) : rows);
  }
  const t = mock.tables[table];
  if (!t) return j(res, 404, { message: "not found" });

  if (req.method === "POST") {
    const prefer = String(req.headers.prefer || "");
    const rows = Array.isArray(body) ? body : [body];
    const reqClock = tick();
    for (const row of rows) {
      if (row.team_id !== me.team_id) return j(res, 401, { code: "42501", message: "rls" });
      const key = row.team_id + "|" + row.id;
      if (table === "pins") mock.pinUpserts.set(row.id, (mock.pinUpserts.get(row.id) || 0) + 1);
      /* 0013's forged-clear guard. A dnk_clear EVENT written by a client is
         dropped; a dnk_clear the client added to a pin's HISTORY is stripped
         unless the server already had it. Without this the mock would be
         more permissive than the real server and the client below would
         never actually be constrained. */
      if (table === "events" && (row.disposition === "dnk_clear" || row.type === "dnk_clear")
          && !mock.serverAuthoredClears.has(row.id)) {
        mock.forgedEventsDropped++;
        continue;
      }
      if (table === "pins" && row.data && Array.isArray(row.data.history)) {
        const had = ((t.get(row.team_id + "|" + row.id) || {}).data || {}).history || [];
        const kept = row.data.history.filter((h) => h.disposition !== "dnk_clear" ||
          had.some((o) => o.disposition === "dnk_clear" && o.ts === h.ts));
        if (kept.length !== row.data.history.length) mock.forgedHistoryStripped++;
        row.data.history = kept;
      }
      const existing = t.get(key);
      if (existing) {
        if (prefer.includes("ignore-duplicates")) continue;
        if (table === "events") return j(res, 401, { code: "42501", message: "events are append-only" });
        let proposed = JSON.parse(JSON.stringify(row));
        if (table === "pins") proposed = protectDnk(existing, proposed);
        const merged = Object.assign({}, existing, proposed,
          { created_at: existing.created_at, updated_at: reqClock });
        if (table === "territories") {
          /* 0010: a CLIENT UPSERT never moves the ledger once the server
             owns it; either way the mirrors are rebuilt from the ledger. */
          merged.assignees = existing.assignees;
          merged.assignees_rev = existing.assignees_rev;
          merged.cycle_started_at = existing.cycle_started_at;
          if (mock.caps.assignmentServerAuthoritative) {
            const sentTo = proposed.data ? proposed.data.assignedTo : undefined;
            mirror(merged);
            if (merged.data.assignedTo !== sentTo) {
              merged.data.updatedAt = Math.max(nowMs(), (proposed.data.updatedAt || 0) + 1);
            }
          } else {
            // legacy authority: the ledger follows data.assignments
            merged.assignees = { entries: sortEntries((proposed.data && proposed.data.assignments || [])
              .map((a) => ({ userId: a.userId, name: a.name, assignedByName: a.assignedBy,
                assignedAt: a.assignedAt, unassignedAt: a.unassignedAt }))) };
            merged.assignees_rev = (existing.assignees_rev || 0) + 1;
            mirror(merged);
          }
        }
        t.set(key, merged);
      } else {
        const fresh = Object.assign({}, row, { created_at: reqClock });
        if (table !== "events") fresh.updated_at = fresh.created_at;
        if (table === "territories") {
          fresh.assignees = { entries: sortEntries(((fresh.data && fresh.data.assignments) || [])
            .map((a) => ({ userId: a.userId, name: a.name, assignedByName: a.assignedBy,
              assignedAt: a.assignedAt, unassignedAt: a.unassignedAt }))) };
          fresh.assignees_rev = 1;
          fresh.cycle_started_at = null;
          mirror(fresh);
        }
        t.set(key, fresh);
      }
    }
    return j(res, 201, prefer.includes("return=minimal") ? undefined : rows);
  }

  if (req.method === "PATCH") {
    if (table === "events") return j(res, 401, { code: "42501" });
    const id = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    const teamQ = String(u.searchParams.get("team_id") || "").replace(/^eq\./, "");
    if (teamQ !== me.team_id) return j(res, 200, undefined);
    const row = t.get(teamQ + "|" + id);
    const wantRep = String(req.headers.prefer || "").includes("return=representation");
    if (row) {
      let next = Object.assign({}, row, body);
      if (table === "pins") next = protectDnk(row, next);
      Object.assign(row, next, { updated_at: tick() });
      return j(res, 200, wantRep ? [row] : undefined);
    }
    return j(res, 200, wantRep ? [] : undefined);
  }

  let rows = [...t.values()].filter((r) => r.team_id === me.team_id);
  const idEq = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
  if (idEq) rows = rows.filter((r) => r.id === idEq);
  const clockCol = table === "events" ? "created_at" : "updated_at";
  const or = u.searchParams.get("or");
  if (or) {
    const m = or.match(/\(\w+\.gt\.(.*?),and\(\w+\.eq\.(.*?),id\.gt\.(.*)\)\)/);
    if (!m) return j(res, 400, { message: "bad or= filter" });
    rows = rows.filter((r) => r[clockCol] > m[1] || (r[clockCol] === m[2] && r.id > m[3]));
  }
  rows.sort((a, b) => a[clockCol] < b[clockCol] ? -1 : a[clockCol] > b[clockCol] ? 1 : a.id < b.id ? -1 : 1);
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
        if (!usr || usr.password !== body.password)
          return j(res, 400, { error_description: "Invalid login credentials" });
        const a = "at-" + crypto.randomBytes(8).toString("hex");
        mock.access[a] = usr.id;
        return j(res, 200, { access_token: a, refresh_token: "rt-" + a, token_type: "bearer",
          expires_in: 3600, user: { id: usr.id, email: body.email } });
      }
      if (u.pathname === "/auth/v1/logout") return j(res, 204);
      return handleRest(req, res, u, body);
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
  const boss = addUser("boss@v41.com", "knock1234", { name: "Boss", role: "manager" });
  const john = addUser("john@v41.com", "knock1234", { name: "John", role: "rep" });
  const jake = addUser("jake@v41.com", "knock1234", { name: "Jake", role: "rep" });

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];
  async function device(email) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
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
    await page.waitForTimeout(900);
    return { ctx, page };
  }
  const sync = (d) => d.page.evaluate(async () => {
    for (let i = 0; i < 200 && MSYNC.status().running; i++) await new Promise((r) => setTimeout(r, 50));
    await MSYNC.syncNow();
  });
  async function syncUntil(d, fn, tries = 12) {
    for (let i = 0; i < tries; i++) {
      await sync(d);
      if (await d.page.evaluate(fn)) return true;
      await d.page.waitForTimeout(250);
    }
    return false;
  }
  // put a hood on the server directly, the way a teammate's push would
  function seedHood(id, name, ring, extra) {
    const row = Object.assign({
      team_id: TEAM, id, name, polygon: ring, homes: null, archived: false,
      created_by: null, deleted_at: null,
      data: { id, name, points: ring, createdAt: nowMs(), updatedAt: nowMs() },
      assignees: { entries: [] }, assignees_rev: 1, cycle_started_at: null,
      created_at: tick(), updated_at: tick(),
    }, extra || {});
    mirror(row);
    mock.tables.territories.set(TEAM + "|" + id, row);
    return row;
  }
  const RING = [[0, 40], [0.002, 40], [0.002, 40.002], [0, 40.002]];

  try {
    // ======================================================== H merge
    section("H — the server-owned merge");
    if (on()) {
      mock.caps.assignmentServerAuthoritative = true;
      const row = seedHood("h-merge", "Merge Hood", RING);
      const d = await device("boss@v41.com");
      await syncUntil(d, () => STORE.territories.some((t) => t.id === "h-merge"));
      check("H0 the hood arrives", await d.page.evaluate(() =>
        STORE.territories.some((t) => t.id === "h-merge")));

      /* THE GAP. Move the ledger WITHOUT touching data.updatedAt — exactly
         what a server-authored assignment looks like — and the v40 engine
         would compare clocks, see "same", and discard the row. */
      const before = row.data.updatedAt;
      row.assignees = { entries: [{ userId: john, name: "John", assignedBy: boss,
        assignedByName: "Boss", assignedAt: nowMs(), unassignedAt: null }] };
      row.assignees_rev = 2;
      mirror(row);
      row.data.updatedAt = before;          // deliberately UNCHANGED
      row.updated_at = tick();
      const landed = await syncUntil(d, () =>
        (STORE.territories.find((t) => t.id === "h-merge") || {}).assigneesRev === 2);
      check("H1 an assignment with an UNCHANGED record clock still lands", landed);
      check("H2 and the local record shows the new assignee",
        await d.page.evaluate(() => {
          const t = STORE.territories.find((x) => x.id === "h-merge");
          return STORE.currentAssignees(t).length === 1;
        }));

      // a cycle boundary, likewise
      row.cycle_started_at = new Date(nowMs()).toISOString();
      row.updated_at = tick();
      const cyc = await syncUntil(d, () =>
        !!(STORE.territories.find((t) => t.id === "h-merge") || {}).cycleStartedAt);
      check("H3 a cycle boundary lands through the same gap", cyc);

      /* MONOTONE. A stale page replayed from an earlier cursor position
         carries a LOWER rev and must be ignored, or a replay would undo a
         newer assignment. */
      const good = JSON.parse(JSON.stringify(row.assignees));
      row.assignees = { entries: [] };
      row.assignees_rev = 1;                 // LOWER than what the device has
      row.updated_at = tick();
      await sync(d); await sync(d);
      check("H4 a LOWER assignees_rev is ignored", await d.page.evaluate(() => {
        const t = STORE.territories.find((x) => x.id === "h-merge");
        return STORE.currentAssignees(t).length === 1;
      }));
      row.assignees = good; row.assignees_rev = 3; mirror(row); row.updated_at = tick();
      await syncUntil(d, () =>
        (STORE.territories.find((t) => t.id === "h-merge") || {}).assigneesRev === 3);

      /* THE SAME GUARD, ON THE PATCH PATH. When the record clock DOES move,
         applyTerritories runs patchInPlace — which deletes every key the
         wire copy lacks, and the server-owned fields are stripped from the
         wire on purpose. If they are not carried across, the merge compares
         against a wiped record, every rev looks newer than nothing, and a
         replayed page rolls the ledger back. */
      row.assignees = { entries: [] };
      row.assignees_rev = 1;                       // LOWER
      row.data.updatedAt = (row.data.updatedAt || 0) + 10000;   // but a NEWER clock
      row.updated_at = tick();
      await sync(d); await sync(d);
      check("H4b a stale ledger is still ignored when the record clock moves " +
        "(the patch path must not wipe the guard)", await d.page.evaluate(() => {
          const t = STORE.territories.find((x) => x.id === "h-merge");
          return STORE.currentAssignees(t).length === 1 && t.assigneesRev === 3;
        }), await d.page.evaluate(() => {
          const t = STORE.territories.find((x) => x.id === "h-merge");
          return JSON.stringify({ rev: t.assigneesRev, n: STORE.currentAssignees(t).length });
        }));
      row.assignees = good; row.assignees_rev = 3; mirror(row); row.updated_at = tick();

      /* THE BOUNDED-CHANGE PROOF. The merge must NOT have become "the
         server row wins": a hood edited offline keeps every client-authored
         field while the server-owned ones update underneath it. */
      await d.page.evaluate(() => window.__off = (MCLOUD.setOnline ? null : null));
      await d.page.evaluate(async () => {
        const t = STORE.territories.find((x) => x.id === "h-merge");
        t.name = "Renamed offline";
        t.homes = 4242;
        t.points = t.points.concat([[0.001, 40.003]]);
        await STORE.updateTerritory(t);
      });
      row.assignees = { entries: [
        { userId: john, name: "John", assignedBy: boss, assignedByName: "Boss", assignedAt: nowMs(), unassignedAt: null },
        { userId: jake, name: "Jake", assignedBy: boss, assignedByName: "Boss", assignedAt: nowMs(), unassignedAt: null }] };
      row.assignees_rev = 4;
      mirror(row);
      row.updated_at = tick();
      await syncUntil(d, () =>
        (STORE.territories.find((t) => t.id === "h-merge") || {}).assigneesRev === 4);
      const kept = await d.page.evaluate(() => {
        const t = STORE.territories.find((x) => x.id === "h-merge");
        return { name: t.name, homes: t.homes, pts: t.points.length,
          reps: STORE.currentAssignees(t).length };
      });
      check("H5 a DIRTY local hood keeps its name through the merge",
        kept.name === "Renamed offline", JSON.stringify(kept));
      check("H6 and its door count", kept.homes === 4242, JSON.stringify(kept));
      check("H7 and its outline", kept.pts === 5, JSON.stringify(kept));
      check("H8 while the server-owned assignee set DID update", kept.reps === 2, JSON.stringify(kept));

      // a hood arriving for the FIRST time takes them too
      const fresh = seedHood("h-first", "First Delivery", RING.map((p) => [p[0] + 1, p[1]]), {
        assignees: { entries: [{ userId: jake, name: "Jake", assignedBy: boss,
          assignedByName: "Boss", assignedAt: nowMs(), unassignedAt: null }] },
        assignees_rev: 7, cycle_started_at: new Date(nowMs()).toISOString(),
      });
      mirror(fresh);
      await syncUntil(d, () => STORE.territories.some((t) => t.id === "h-first"));
      check("H9 a hood delivered for the FIRST time carries its ledger",
        await d.page.evaluate(() => {
          const t = STORE.territories.find((x) => x.id === "h-first");
          return !!t && STORE.currentAssignees(t).length === 1 && !!t.cycleStartedAt;
        }));
      await d.ctx.close();
    }

    // ==================================================== C capability
    section("C — the capability latch");
    if (on()) {
      mock.caps.assignmentServerAuthoritative = false;
      const d = await device("boss@v41.com");
      await sync(d);
      check("C1 an un-activated server leaves the latch false",
        await d.page.evaluate(() => MSYNC.capability("assignmentServerAuthoritative") === false));

      mock.caps.assignmentServerAuthoritative = true;
      await syncUntil(d, () => MSYNC.capability("assignmentServerAuthoritative"));
      check("C2 activation latches true",
        await d.page.evaluate(() => MSYNC.capability("assignmentServerAuthoritative")));

      /* NEVER DOWNGRADE. False is the MORE permissive state — the one where
         this device may still author assignment truth — so a false arriving
         after a true is a stale read, not a fact. */
      mock.caps.assignmentServerAuthoritative = false;
      await sync(d); await sync(d);
      check("C3 a later false does NOT downgrade the latch",
        await d.page.evaluate(() => MSYNC.capability("assignmentServerAuthoritative")));

      await d.page.reload();
      // wait for the ENGINE to have read its stored state, not for a guess:
      // `loaded` is set at the end of start(), which is where the latch is
      // read back from kv
      await d.page.waitForFunction(
        () => window.MSYNC && MSYNC.status && MSYNC.status().loaded === true,
        null, { timeout: 25000 });
      check("C4 and the latch survives a reload",
        await d.page.evaluate(() => MSYNC.capability("assignmentServerAuthoritative")));

      // a server with no v41 migrations answers 404 — probe ONCE, not forever
      mock.capsStatus = 404;
      mock.capCalls = 0;
      const d2 = await device("john@v41.com");
      await sync(d2); await sync(d2); await sync(d2);
      check("C5 an unmigrated server is probed once, not on every cycle",
        mock.capCalls <= 2, "calls=" + mock.capCalls);
      mock.capsStatus = 200;
      mock.caps.assignmentServerAuthoritative = true;
      await d.ctx.close(); await d2.ctx.close();
    }

    // ========================================================== A assign
    section("A — multi-assignee through the RPC");
    if (on()) {
      seedHood("h-assign", "Assign Hood", RING.map((p) => [p[0] + 2, p[1]]));
      const d = await device("boss@v41.com");
      await syncUntil(d, () => STORE.territories.some((t) => t.id === "h-assign"));
      const two = await d.page.evaluate(async ([a, b]) => {
        const t = STORE.territories.find((x) => x.id === "h-assign");
        const map = {};
        STORE.users.forEach((u) => { if (u.profileId) map[u.profileId] = u.id; });
        await MSYNC.syncNow();
        return { local: STORE.users.length, want: [map[a], map[b]] };
      }, [john, jake]);
      check("A0 the teammates are mirrored locally", two.local >= 3, JSON.stringify(two));

      const res = await d.page.evaluate(async ([a, b]) => {
        const t = STORE.territories.find((x) => x.id === "h-assign");
        const local = (pid) => (STORE.users.find((u) => u.profileId === pid) || {}).id;
        await STORE.setAssignees(t, [local(a), local(b)]);
        return STORE.currentAssignees(t).length;
      }, [john, jake]);
      check("A1 two reps assigned locally", res === 2, "got " + res);
      await syncUntil(d, () => true, 3);
      const srv = mock.tables.territories.get(TEAM + "|h-assign");
      check("A2 both reach the server's ledger",
        openEntries(srv.assignees).length === 2, JSON.stringify(srv.assignees));
      check("A3 and the v40 mirror names the first of them",
        srv.data.assignedTo === firstOpen(srv.assignees));
      check("A4 the mirror carries EVERY entry, not just the open ones",
        srv.data.assignments.length === openEntries(srv.assignees).length);

      // removing one leaves the other, and keeps the closed entry
      await d.page.evaluate(async (a) => {
        const t = STORE.territories.find((x) => x.id === "h-assign");
        const local = (pid) => (STORE.users.find((u) => u.profileId === pid) || {}).id;
        await STORE.setAssignees(t, [local(a)]);
      }, john);
      await syncUntil(d, () => true, 3);
      check("A5 removing one rep leaves the other assigned",
        await d.page.evaluate(() =>
          STORE.currentAssignees(STORE.territories.find((x) => x.id === "h-assign")).length === 1));
      check("A6 and the departed rep's entry is CLOSED, never deleted",
        await d.page.evaluate(() =>
          STORE.assigneeEntries(STORE.territories.find((x) => x.id === "h-assign")).length === 2));
      await d.ctx.close();
    }

    // ========================================================== Y cycle
    section("Y — Clear Outcomes");
    if (on()) {
      seedHood("h-cycle", "Cycle Hood", RING.map((p) => [p[0] + 3, p[1]]));
      const d = await device("boss@v41.com");
      await syncUntil(d, () => STORE.territories.some((t) => t.id === "h-cycle"));
      const before = await d.page.evaluate(async () => {
        const t = STORE.territories.find((x) => x.id === "h-cycle");
        // three doors inside the hood, all worked
        for (let i = 0; i < 3; i++) {
          await STORE.addKnock({ lat: 40.001, lng: 3.001 + i * 0.0001, disposition: "nothome" });
        }
        const m = STORE.routeMetrics(t);
        return { worked: m.worked, remaining: m.remaining, pins: STORE.pins.length };
      });
      check("Y1 three worked doors", before.worked === 3, JSON.stringify(before));

      const after = await d.page.evaluate(async () => {
        const t = STORE.territories.find((x) => x.id === "h-cycle");
        await STORE.startCycle(t);
        const m = STORE.routeMetrics(t);
        return { worked: m.worked, remaining: m.remaining, pins: STORE.pins.length,
          hist: STORE.pins.reduce((n, p) => n + (p.history || []).length, 0),
          cyc: !!t.cycleStartedAt };
      });
      check("Y2 the boundary moved", after.cyc);
      check("Y3 every worked door is back to remaining",
        after.worked === 0 && after.remaining === 3, JSON.stringify(after));
      check("Y4 NO pin was deleted", after.pins === before.pins, JSON.stringify(after));
      check("Y5 and NO knock was deleted", after.hist === 3, JSON.stringify(after));
      const srv = mock.tables.territories.get(TEAM + "|h-cycle");
      check("Y6 the server holds the boundary", !!srv.cycle_started_at);

      // monotone: an older boundary is refused
      const at = srv.cycle_started_at;
      await d.page.evaluate(async () => {
        const t = STORE.territories.find((x) => x.id === "h-cycle");
        await STORE.startCycle(t, 1000);   // long before the current one
      });
      check("Y7 an OLDER boundary is refused by the server",
        mock.tables.territories.get(TEAM + "|h-cycle").cycle_started_at === at);
      await d.ctx.close();
    }

    // ============================================================ D dnk
    section("D — do-not-knock, and v40-shaped convergence");
    if (on()) {
      const d = await device("john@v41.com");
      const pid = await d.page.evaluate(async () => {
        const p = await STORE.addKnock({ lat: 40.0011, lng: 0.0011, disposition: "dnk" });
        return p.id;
      });
      await syncUntil(d, () => true, 4);
      check("D1 the black door reaches the server",
        (mock.tables.pins.get(TEAM + "|" + pid) || {}).disposition === "dnk");

      /* A CLIENT THAT TRIES TO CLEAR IT. The v41 client refuses in its own
         UI, so this reaches past that and writes the record the way a v40
         client — or a tampered one — would, then pushes. */
      mock.dnkCorrections = 0;
      mock.pinUpserts.clear();
      /* A v41 CLIENT CANNOT EXERCISE THIS. Its own field-level merge puts
         the scalar back before the row is ever pushed, which is the point
         of that merge — so the row the server receives is already black and
         no correction is needed. The write that needs neutralising comes
         from a client WITHOUT that merge: a v40 phone, or a tampered one
         talking to PostgREST directly. So it is sent directly, in exactly
         the shape such a client would send. */
      const tok = Object.keys(mock.access).find((k) => mock.access[k] === john);
      const srvPin = mock.tables.pins.get(TEAM + "|" + pid);
      const v40Body = JSON.parse(JSON.stringify(srvPin));
      v40Body.disposition = "nothome";
      v40Body.data.disposition = "nothome";
      v40Body.data.updatedAt = (v40Body.data.updatedAt || 0) + 5000;
      delete v40Body.created_at; delete v40Body.updated_at;
      const resp = await fetch(`http://localhost:${PORT}/rest/v1/pins?on_conflict=team_id,id`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok,
                   Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([v40Body]),
      });
      check("D2a the v40-shaped write is ACCEPTED, not refused (a refusal would " +
        "fail the whole batch and dead-letter unrelated knocks)", resp.status < 400,
        "status=" + resp.status);
      check("D2 the server NEUTRALISES it",
        mock.dnkCorrections > 0, "corrections=" + mock.dnkCorrections);
      check("D3 the server's copy is still black",
        (mock.tables.pins.get(TEAM + "|" + pid) || {}).disposition === "dnk");
      check("D3b and the correction is stamped ABOVE the incoming clock, so a " +
        "client that compares record clocks accepts it",
        (mock.tables.pins.get(TEAM + "|" + pid).data.updatedAt || 0) > v40Body.data.updatedAt);

      const converged = await syncUntil(d, (id) => {
        const p = STORE.pins.find((x) => x.id === id);
        return !!p && p.disposition === "dnk";
      }, 8, pid).catch(() => false);
      const isBlack = await d.page.evaluate((id) => {
        const p = STORE.pins.find((x) => x.id === id);
        return !!p && p.disposition === "dnk";
      }, pid);
      check("D4 the client CONVERGES — the door is black again on the device", isBlack);

      /* AND THEN STOPS. A correction a device re-pushes on every cycle is
         worse than no correction: it is a permanent loop against the
         server. Three quiet cycles must add no new uploads. */
      const at1 = mock.pinUpserts.get(pid) || 0;
      await sync(d); await sync(d); await sync(d);
      const at2 = mock.pinUpserts.get(pid) || 0;
      check("D5 and does NOT re-push it forever", at2 === at1,
        "uploads went " + at1 + " -> " + at2);

      /* THE FORGED CLEAR. The clearing signal lives in two client-written
         places, and both were open: a rep could clear ANY black door by
         pushing a pin whose history carries a dnk_clear, or by inserting
         one event straight into PostgREST. Found by adversarial review. */
      mock.forgedEventsDropped = 0; mock.forgedHistoryStripped = 0;
      const forgeTok = Object.keys(mock.access).find((k) => mock.access[k] === john);
      const evResp = await fetch(`http://localhost:${PORT}/rest/v1/events?on_conflict=team_id,id`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + forgeTok,
                   Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify([{ team_id: TEAM, id: "forged-ev", pin_id: pid, type: "knock",
          disposition: "dnk_clear", at_ms: 9999999999999, by_user: null,
          data: { id: "forged-ev", ts: 9999999999999, pinId: pid, disposition: "dnk_clear" } }]),
      });
      check("D5c a forged dnk_clear EVENT is dropped by the server",
        evResp.status < 400 && !mock.tables.events.get(TEAM + "|forged-ev"),
        "status=" + evResp.status);

      const forgePin = JSON.parse(JSON.stringify(mock.tables.pins.get(TEAM + "|" + pid)));
      forgePin.data.history = (forgePin.data.history || []).concat([
        { ts: 9999999999998, disposition: "dnk_clear", reason: "forged", dm: false, note: "" }]);
      forgePin.data.updatedAt = (forgePin.data.updatedAt || 0) + 9000;
      delete forgePin.created_at; delete forgePin.updated_at;
      await fetch(`http://localhost:${PORT}/rest/v1/pins?on_conflict=team_id,id`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + forgeTok,
                   Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([forgePin]),
      });
      const stored = mock.tables.pins.get(TEAM + "|" + pid);
      check("D5d a forged dnk_clear in the pushed HISTORY is stripped",
        !(stored.data.history || []).some((h) => h.disposition === "dnk_clear"),
        JSON.stringify(stored.data.history));
      check("D5e so the door is still black after both forgeries",
        stored.disposition === "dnk");

      // a rep may not delete a black door
      check("D5b the device really is a REP — the guard is not passing by accident",
        await d.page.evaluate(() => STORE.effectiveRole() === "rep" &&
          STORE.canManageTerritories() === false));
      const del = await d.page.evaluate((id) => STORE.deletePin(id), pid);
      check("D6 a rep cannot delete a black door", del === false);
      check("D7 and it is still on the device",
        await d.page.evaluate((id) => !!STORE.pins.find((p) => p.id === id), pid));

      // a manager clears it explicitly, with a reason
      const d2 = await device("boss@v41.com");
      await syncUntil(d2, (id) => !!STORE.pins.find((p) => p.id === id), 10, pid);
      const cleared = await d2.page.evaluate(async (id) => {
        const p = STORE.pins.find((x) => x.id === id);
        if (!p) return "missing";
        await STORE.clearPinDnk(p, "new owner asked us back");
        return p.disposition;
      }, pid);
      check("D8 a manager's explicit clear DOES clear it", cleared === "unworked", cleared);
      check("D9 and it is recorded as an event, not a silent edit",
        await d2.page.evaluate((id) =>
          STORE.events.some((e) => e.pinId === id && e.disposition === "dnk_clear"), pid));
      check("D10 the server agrees",
        (mock.tables.pins.get(TEAM + "|" + pid) || {}).disposition === "unworked");
      await d.ctx.close(); await d2.ctx.close();
    }

    check("no page errors anywhere", errors.length === 0, errors.slice(0, 3).join(" | "));
  } finally {
    await browser.close();
    server.close();
  }
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
