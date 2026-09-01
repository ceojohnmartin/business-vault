/* RALLY v39 — SMART SPLIT TORTURE.
 *
 * Smart Split replaces one hood with N balanced children. That is N+1 rows,
 * and until v39 they went up as N+1 independent writes, so the reachable
 * states included "children exist beside a live parent" (the hood covered
 * twice, by two sets of reps) and "parent gone, half the children missing"
 * (a hole in the map with no record of what was meant to be there). Neither
 * announces itself.
 *
 * The commit is now one PostgreSQL transaction behind one narrow function
 * (db/migrations/0005_smart_split.sql). THAT function's own correctness —
 * authorization, validation, the all-or-nothing rollback, two managers
 * racing the same parent — is proved against real PostgreSQL by
 * db/test/rls-test.sql section 17 and db/test/split-race-test.sh, because
 * those are database semantics and a JavaScript mock cannot prove them.
 *
 * What THIS file proves is the other half, which real Postgres cannot: how
 * the CLIENT behaves around that call. A proposal is not a fact. A lost
 * response is not a failure. A refusal must put the hood back exactly as it
 * was and say so. The mock server here is therefore a controllable oracle —
 * commit it, refuse it, hang it, lose the response — not a reimplementation
 * of the SQL.
 */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const PORT = 8853;
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

// ---------------- mock Supabase ----------------
const TEAM = "11111111-1111-4111-a111-111111111111";
const TEAM2 = "22222222-2222-4222-a222-222222222222";
const mock = {
  users: {}, profiles: {}, access: {},
  tables: { pins: new Map(), events: new Map(), territories: new Map(), customers: new Map() },
  splits: new Map(),          // "team|operationId" -> { parent_id, child_ids }
  splitCalls: [],             // every RPC body, in order
  rpc: { mode: "normal" },    // normal | refuse | lose | hang | 500
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

/* The oracle. It applies the SAME ORDER of checks as the SQL, because the
   client's behaviour depends on WHICH refusal it gets — but it is not a
   reimplementation, and the SQL is the authority for whether those checks
   are correct. mock.rpc.mode overrides it to stage the failures a real
   server cannot be asked to produce on demand. */
function handleSplit(req, res, body) {
  const uid = authOf(req);
  if (!uid) return j(res, 401, { message: "JWT invalid" });
  const me = mock.profiles[uid];
  mock.splitCalls.push({ uid, body });

  if (mock.rpc.mode === "hang") return;                       // never answers
  if (mock.rpc.mode === "500") return j(res, 500, { message: "boom" });
  // PostgREST's answer when the FUNCTION does not exist — i.e. a v39 client
  // against a database that has not had 0005 applied yet
  if (mock.rpc.mode === "404")
    return j(res, 404, { code: "PGRST202",
      message: "Could not find the function public.smart_split_territory" });

  const opKey = me.team_id + "|" + body.p_operation_id;
  const prior = mock.splits.get(opKey);
  if (prior) {   // idempotent: the operation already committed
    // in "lose" mode the answer never gets back, however many times it is
    // asked — that is what a client stuck behind a broken link experiences
    if (mock.rpc.mode === "lose") { res.destroy(); return; }
    return j(res, 200, { status: "already_committed",
      operation_id: body.p_operation_id, parent_id: prior.parent_id,
      child_ids: prior.child_ids });
  }
  if (mock.rpc.mode === "refuse")
    return j(res, 403, { code: "42501", message: "smart split: refused (staged)" });
  if (me.disabled)
    return j(res, 403, { code: "42501", message: "smart split: user is disabled" });
  if (!["leader", "manager", "owner"].includes(me.role))
    return j(res, 403, { code: "42501", message: "smart split: requires leader, manager or owner" });

  const pkey = me.team_id + "|" + body.p_parent_id;
  const parent = mock.tables.territories.get(pkey);
  if (!parent)
    return j(res, 403, { code: "42501", message: "smart split: parent not found for this team" });
  if (parent.deleted_at)
    return j(res, 400, { code: "55000", message: "smart split: parent is already deleted or split" });
  const kids = body.p_children;
  if (!Array.isArray(kids) || kids.length < 2 || kids.length > 8)
    return j(res, 400, { code: "22023", message: "smart split: bad child count" });
  for (const k of kids) {
    if (!k.id || !Array.isArray(k.polygon) || k.polygon.length < 3)
      return j(res, 400, { code: "22023", message: "smart split: bad child" });
  }
  // ---- the transaction
  const when = tick();
  for (const k of kids) {
    mock.tables.territories.set(me.team_id + "|" + k.id, {
      team_id: me.team_id, id: k.id, name: k.name || "", polygon: k.polygon,
      homes: k.homes == null ? null : k.homes, archived: false, data: k.data || {},
      created_by: uid, deleted_at: null, created_at: when, updated_at: when,
    });
  }
  parent.deleted_at = when;
  parent.updated_at = when;
  const child_ids = kids.map((k) => k.id);
  mock.splits.set(opKey, { parent_id: body.p_parent_id, child_ids });
  const out = { status: "committed", operation_id: body.p_operation_id,
    parent_id: body.p_parent_id, child_ids };
  // "lose": the server DID the work and the client never hears about it
  if (mock.rpc.mode === "lose") { res.destroy(); return; }
  return j(res, 200, out);
}

function handleRest(req, res, u, body) {
  const uid = authOf(req);
  if (!uid) return j(res, 401, { message: "JWT invalid" });
  const me = mock.profiles[uid];
  if (u.pathname === "/rest/v1/rpc/smart_split_territory")
    return handleSplit(req, res, body);
  const table = u.pathname.replace("/rest/v1/", "");

  if (table === "profiles") {
    if (me.disabled) return j(res, 200, [me]);
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
      // 0003: territories are leadership-only
      if (table === "territories" && !mayWriteTerritory)
        return j(res, 403, { code: "42501", message: "row-level security (territories)" });
      const key = row.team_id + "|" + row.id;
      const existing = t.get(key);
      if (existing && prefer.includes("ignore-duplicates")) continue;
      t.set(key, Object.assign({}, existing, row, {
        created_at: (existing && existing.created_at) || reqClock,
        updated_at: reqClock,
      }));
    }
    return prefer.includes("return=minimal") ? j(res, 201) : j(res, 201, rows);
  }

  if (req.method === "PATCH") {
    const team = String(u.searchParams.get("team_id") || "").replace(/^eq\./, "");
    const id = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    const row = t.get(team + "|" + id);
    // an RLS-hidden UPDATE reports zero rows with NO error (Postgres fact 2)
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

// ---------------- the run ----------------
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const bossId = addUser("boss@x.com", "knock1234", { name: "Boss", role: "manager" });
  const repId = addUser("rep@x.com", "knock1234", { name: "Rep", role: "rep" });

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
    await page.waitForTimeout(800);
    return { ctx, page, email };
  }
  const S = (d, fn, arg) => d.page.evaluate(fn, arg);
  const sync = async (d) => {
    await d.page.evaluate(async () => {
      for (let i = 0; i < 200 && MSYNC.status().running; i++) await new Promise((r) => setTimeout(r, 50));
      await MSYNC.syncNow();
    });
    await d.page.waitForTimeout(250);
  };
  const offline = (d) => d.ctx.route(/\/(auth|rest)\/v1\//, (r) => r.abort());
  const online = (d) => d.ctx.unroute(/\/(auth|rest)\/v1\//);
  const srv = () => [...mock.tables.territories.values()];
  const liveOnServer = (pred) => srv().filter((r) => !r.deleted_at && pred(r)).length;

  // a square hood with four doors inside it, one per quadrant
  const makeHood = async (d, name, id) => S(d, async (a) => {
    const t = await STORE.addTerritory({ id: a.id, name: a.name, homes: 40,
      points: [[-98.40, 38.40], [-98.30, 38.40], [-98.30, 38.50], [-98.40, 38.50]] });
    const spots = [[-98.38, 38.42], [-98.32, 38.42], [-98.38, 38.48], [-98.32, 38.48]];
    for (let i = 0; i < spots.length; i++) {
      const p = { id: a.id + "-door-" + i, lat: spots[i][1], lng: spots[i][0],
        address: "Door " + i, disposition: "unworked", territoryId: t.id,
        history: [], notes: [], createdAt: 1, updatedAt: 1 };
      await MDB.put("pins", p); STORE.pins.push(p); MSYNC.queue("pins", p.id);
    }
    return t.id;
  }, { name, id });

  const BOSS = await device("boss@x.com");

  // ======================================================== 1. the happy path
  const h1 = await makeHood(BOSS, "First Hood", "hood-1");
  await sync(BOSS);
  check("1a (setup) the parent hood reached the server",
    !!mock.tables.territories.get(TEAM + "|" + h1));

  const split1 = await S(BOSS, async (id) => {
    const t = STORE.territories.find((x) => x.id === id);
    const kids = await STORE.splitTerritory(t, 2);
    return { kids: kids.map((k) => ({ id: k.id, name: k.name, pending: k.pendingSplit })),
      parentHidden: !STORE.activeTerritories().some((x) => x.id === id),
      parentStillHere: STORE.territories.some((x) => x.id === id),
      live: STORE.activeTerritories().length };
  }, h1);
  check("1b the children appear immediately, marked as not yet confirmed",
    split1.kids.length === 2 && split1.kids.every((k) => !!k.pending),
    JSON.stringify(split1.kids));
  check("1c the parent is hidden from every screen that hands out work",
    split1.parentHidden && split1.live === 2, JSON.stringify(split1));
  check("1d …but the parent record is still HERE, so it can still be retired",
    split1.parentStillHere);
  check("1e nothing was committed to the server yet",
    liveOnServer((r) => r.id === h1) === 1 && liveOnServer((r) => r.id !== h1) === 0,
    "live=" + liveOnServer(() => true));

  await sync(BOSS);
  const after1 = await S(BOSS, async (id) => ({
    kids: STORE.territories.filter((t) => !t.pendingSplit && t.id !== id).length,
    stillPending: STORE.territories.some((t) => t.pendingSplit),
    parentGone: !STORE.territories.some((t) => t.id === id),
    proposals: Object.keys(await STORE.pendingSplits()).length,
    doors: STORE.pins.filter((p) => /^hood-1-door-/.test(p.id))
      .map((p) => p.territoryId).sort().join(","),
  }), h1);
  check("1f the split committed and the children are plain territories now",
    after1.kids === 2 && !after1.stillPending, JSON.stringify(after1));
  check("1g the parent is gone from the device without a second write",
    after1.parentGone && after1.proposals === 0, JSON.stringify(after1));
  check("1h the server holds exactly the two children and a retired parent",
    liveOnServer(() => true) === 2 &&
    !!mock.tables.territories.get(TEAM + "|" + h1).deleted_at,
    "live=" + liveOnServer(() => true));
  check("1i every door re-homed into a child — none was left in the ghost",
    !after1.doors.includes(h1) && after1.doors.split(",").every((x) => x && x !== "null"),
    after1.doors);
  check("1j the whole split was ONE server call",
    mock.splitCalls.length === 1, String(mock.splitCalls.length));

  // ======================================================== 2. a 3-way split
  const h2 = await makeHood(BOSS, "Second Hood", "hood-2");
  await sync(BOSS);
  await S(BOSS, async (id) => {
    await STORE.splitTerritory(STORE.territories.find((x) => x.id === id), 3);
  }, h2);
  await sync(BOSS);
  check("2a a three-way split commits as one fact",
    mock.splits.size === 2 &&
    liveOnServer((r) => r.name.indexOf("Second Hood ") === 0) === 3,
    "splits=" + mock.splits.size);
  const kids2 = await S(BOSS, (id) => ({
    live: STORE.activeTerritories().filter((t) => t.name.indexOf("Second Hood ") === 0).length,
    parentGone: !STORE.territories.some((t) => t.id === id),
  }), h2);
  check("2b three children exist and the parent is retired",
    kids2.live === 3 && kids2.parentGone, JSON.stringify(kids2));

  // ================================================ 3. the geometry is intact
  /* The commit changed; the algorithm did not. Split the same hood shape
     with the same doors and the rings must be identical to what
     MGEO.splitPolygon produces on its own. */
  const geom = await S(BOSS, () => {
    const pts = [[-98.40, 38.40], [-98.30, 38.40], [-98.30, 38.50], [-98.40, 38.50]];
    const doors = [[-98.38, 38.42], [-98.32, 38.42], [-98.38, 38.48], [-98.32, 38.48]];
    const a = MGEO.splitPolygon(pts, 3, doors);
    const b = MGEO.splitPolygon(pts, 3, doors);
    return { same: JSON.stringify(a.rings) === JSON.stringify(b.rings),
      rings: a.rings.length, shares: a.shares.length };
  });
  check("3a the split algorithm itself is untouched and deterministic",
    geom.same && geom.rings === 3 && geom.shares === 3, JSON.stringify(geom));

  // ============================================ 4. a REP is refused, honestly
  const REP = await device("rep@x.com");
  await sync(REP);
  const h4 = await makeHood(BOSS, "Rep Hood", "hood-4");
  await sync(BOSS); await sync(REP);
  const before4 = await S(REP, () => ({
    live: STORE.activeTerritories().length,
    canManage: STORE.canManageTerritories(STORE.effectiveRole()),
  }));
  await S(REP, async (id) => {
    const t = STORE.territories.find((x) => x.id === id);
    if (t) await STORE.splitTerritory(t, 2);
  }, h4);
  await sync(REP); await sync(REP);
  const after4 = await S(REP, async (id) => ({
    live: STORE.activeTerritories().length,
    parentBack: STORE.activeTerritories().some((t) => t.id === id),
    pendingKids: STORE.territories.filter((t) => t.pendingSplit).length,
    proposals: Object.keys(await STORE.pendingSplits()).length,
    refusals: (await MSYNC.refusals()).filter((r) => r.table === "splits").length,
  }), h4);
  check("4a a rep never had the capability in the first place",
    before4.canManage === false, String(before4.canManage));
  check("4b the server refuses the rep's split and the hood comes BACK",
    after4.parentBack && after4.live === before4.live, JSON.stringify(after4));
  check("4c no half-split survives on the device",
    after4.pendingKids === 0 && after4.proposals === 0, JSON.stringify(after4));
  check("4d and the refusal is SURFACED, not swallowed",
    after4.refusals === 1, String(after4.refusals));
  check("4e the server created nothing for the refused attempt",
    liveOnServer((r) => r.id === h4) === 1, "parent alive=" + liveOnServer((r) => r.id === h4));

  // ===================================== 5. a LOST RESPONSE is not a failure
  /* The server committed and the connection died before the answer arrived.
     A retry sends the SAME operation id, the server recognises it, and the
     device must accept the split rather than roll back a server fact. */
  const h5 = await makeHood(BOSS, "Lost Hood", "hood-5");
  await sync(BOSS);
  mock.rpc.mode = "lose";
  await S(BOSS, async (id) => {
    await STORE.splitTerritory(STORE.territories.find((x) => x.id === id), 2);
  }, h5);
  await sync(BOSS);
  const mid5 = await S(BOSS, async (id) => ({
    pendingKids: STORE.territories.filter((t) => t.pendingSplit).length,
    parentHere: STORE.territories.some((t) => t.id === id),
    proposals: Object.keys(await STORE.pendingSplits()).length,
  }), h5);
  check("5a with no answer the device keeps the proposal — it does not guess",
    mid5.pendingKids === 2 && mid5.parentHere && mid5.proposals === 1,
    JSON.stringify(mid5));
  check("5b …even though the server actually committed it",
    !!mock.tables.territories.get(TEAM + "|" + h5).deleted_at);
  const callsBefore5 = mock.splitCalls.length;
  mock.rpc.mode = "normal";
  await sync(BOSS);
  const after5 = await S(BOSS, async (id) => ({
    kids: STORE.territories.filter((t) => t.name.indexOf("Lost Hood ") === 0).length,
    pendingKids: STORE.territories.filter((t) => t.pendingSplit).length,
    parentGone: !STORE.territories.some((t) => t.id === id),
    proposals: Object.keys(await STORE.pendingSplits()).length,
  }), h5);
  const retryOp = mock.splitCalls[mock.splitCalls.length - 1].body.p_operation_id;
  const firstOp = mock.splitCalls[callsBefore5 - 1].body.p_operation_id;
  check("5c the retry carries the SAME operation id, so it is the same operation",
    retryOp === firstOp, retryOp + " vs " + firstOp);
  check("5d the device accepts the committed fact instead of rolling it back",
    after5.kids === 2 && after5.parentGone && after5.proposals === 0,
    JSON.stringify(after5));
  check("5e and the retry created ZERO extra children on the server",
    liveOnServer((r) => r.name.indexOf("Lost Hood ") === 0) === 2,
    "children=" + srv().filter((r) => !r.deleted_at && r.name.indexOf("Lost Hood ") === 0).length);

  // ============================================= 6. OFFLINE, then DEMOTED
  /* The manager cuts the hood on a dead phone. The office demotes them. The
     phone comes back. Nothing may commit, and the hood must be exactly as
     it was — including its doors. */
  const h6 = await makeHood(BOSS, "Offline Hood", "hood-6");
  /* Snapshot after a FULL round trip, not just a push. The pull adds its own
     bookkeeping to a pin the first time it sees it back (aka: [] for the
     merge index), and a snapshot taken before that would report sync's
     housekeeping as damage the split did — hiding real damage in the noise. */
  await sync(BOSS); await sync(BOSS);
  const doors6Before = await S(BOSS, () => JSON.stringify(
    STORE.pins.filter((p) => /^hood-6-door-/.test(p.id))
      .sort((a, b) => (a.id < b.id ? -1 : 1))));
  await offline(BOSS);
  await S(BOSS, async (id) => {
    await STORE.splitTerritory(STORE.territories.find((x) => x.id === id), 2);
  }, h6);
  const offline6 = await S(BOSS, async (id) => ({
    kids: STORE.territories.filter((t) => t.pendingSplit).length,
    parentHidden: !STORE.activeTerritories().some((t) => t.id === id),
    proposals: Object.keys(await STORE.pendingSplits()).length,
  }), h6);
  check("6a offline, the proposal is held and shown as unconfirmed",
    offline6.kids === 2 && offline6.parentHidden && offline6.proposals === 1,
    JSON.stringify(offline6));
  check("6b nothing reached the server while offline",
    !mock.tables.territories.get(TEAM + "|" + h6).deleted_at);
  mock.profiles[bossId].role = "rep";            // demoted while they were out
  await online(BOSS);
  await sync(BOSS);
  await BOSS.page.waitForFunction(() => STORE.effectiveRole() === "rep", null, { timeout: 20000 });
  await sync(BOSS); await sync(BOSS);
  const after6 = await S(BOSS, async (id) => ({
    role: STORE.effectiveRole(),
    parentBack: STORE.activeTerritories().some((t) => t.id === id),
    pendingKids: STORE.territories.filter((t) => t.pendingSplit).length,
    proposals: Object.keys(await STORE.pendingSplits()).length,
    doors: JSON.stringify(STORE.pins.filter((p) => /^hood-6-door-/.test(p.id))
      .sort((a, b) => (a.id < b.id ? -1 : 1))),
  }), h6);
  check("6c the demotion reached the device", after6.role === "rep", after6.role);
  check("6d the server refuses the stale intent and the hood comes back whole",
    after6.parentBack && after6.pendingKids === 0 && after6.proposals === 0,
    JSON.stringify({ p: after6.parentBack, k: after6.pendingKids, o: after6.proposals }));
  check("6e the parent is untouched on the server",
    !mock.tables.territories.get(TEAM + "|" + h6).deleted_at);
  if (after6.doors !== doors6Before) {
    const A = JSON.parse(doors6Before), B = JSON.parse(after6.doors), diffs = [];
    A.forEach((a, i) => {
      const b = B[i] || {};
      new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => {
        if (JSON.stringify(a[k]) !== JSON.stringify(b[k]))
          diffs.push(`${a.id}.${k}: ${JSON.stringify(a[k])} -> ${JSON.stringify(b[k])}`);
      });
    });
    console.log("  [diag 6f] " + diffs.join(" | "));
  }
  check("6f EVERY door is byte-for-byte what it was before the attempt",
    after6.doors === doors6Before, "see diag above");
  mock.profiles[bossId].role = "manager";
  await sync(BOSS);
  await BOSS.page.waitForFunction(() => STORE.effectiveRole() === "manager", null, { timeout: 20000 });

  // ================================ 7. the device DIES between send and answer
  /* Kill the app after the request goes out. On reboot the proposal is still
     on disk, the command is re-queued from it, and the same operation id
     resolves against whatever the server actually did. */
  const h7 = await makeHood(BOSS, "Crash Hood", "hood-7");
  await sync(BOSS);
  mock.rpc.mode = "hang";
  await S(BOSS, async (id) => {
    await STORE.splitTerritory(STORE.territories.find((x) => x.id === id), 2);
  }, h7);
  S(BOSS, () => { MSYNC.syncNow(); }).catch(() => {});   // fire, never answered
  await BOSS.page.waitForTimeout(600);
  await BOSS.page.reload();                              // the app dies here
  await BOSS.page.waitForFunction(() => window.STORE && STORE.territories, null, { timeout: 25000 });
  // the boot recovery lives in MSYNC.start(); reading before it has loaded
  // its stored state measures the test's patience, not the app's behaviour
  await BOSS.page.waitForFunction(
    () => window.MSYNC && MSYNC.status().loaded, null, { timeout: 25000 });
  await BOSS.page.waitForTimeout(600);
  const boot7 = await S(BOSS, async (id) => ({
    proposals: Object.keys(await STORE.pendingSplits()).length,
    pendingKids: STORE.territories.filter((t) => t.pendingSplit).length,
    parentHidden: !STORE.activeTerritories().some((t) => t.id === id),
    queued: MSYNC.status().pending,
  }), h7);
  check("7a the proposal survived the kill and is still unconfirmed",
    boot7.proposals === 1 && boot7.pendingKids === 2 && boot7.parentHidden,
    JSON.stringify(boot7));
  check("7b and the command was re-queued from it on boot",
    boot7.queued >= 1, String(boot7.queued));
  mock.rpc.mode = "normal";
  await sync(BOSS); await sync(BOSS);
  const after7 = await S(BOSS, async (id) => ({
    kids: STORE.activeTerritories().filter((t) => t.name.indexOf("Crash Hood ") === 0).length,
    parentGone: !STORE.territories.some((t) => t.id === id),
    proposals: Object.keys(await STORE.pendingSplits()).length,
  }), h7);
  check("7c after the reboot the same operation resolves cleanly",
    after7.kids === 2 && after7.parentGone && after7.proposals === 0,
    JSON.stringify(after7));

  // ==================================== 8. a second device sees only facts
  const OTHER = await device("boss@x.com");
  await sync(OTHER);
  const seen8 = await S(OTHER, () => ({
    crashKids: STORE.activeTerritories().filter((t) => t.name.indexOf("Crash Hood ") === 0).length,
    ghosts: STORE.territories.filter((t) => /^hood-(1|2|5|7)$/.test(t.id)).length,
    pending: STORE.territories.filter((t) => t.pendingSplit).length,
  }));
  check("8a another device pulls the children as ordinary territories",
    seen8.crashKids === 2, JSON.stringify(seen8));
  check("8b it never sees a retired parent or a pending marker",
    seen8.ghosts === 0 && seen8.pending === 0, JSON.stringify(seen8));

  // ======================== 9. a hood cut OFFLINE that never reached the server
  /* The parent itself is brand new. The split cannot commit until the parent
     is a server fact, and the engine must WAIT rather than throw the
     proposal away over "no such parent". */
  await offline(BOSS);
  const h9 = await makeHood(BOSS, "Fresh Hood", "hood-9");
  await S(BOSS, async (id) => {
    await STORE.splitTerritory(STORE.territories.find((x) => x.id === id), 2);
  }, h9);
  const off9 = await S(BOSS, async () => ({
    proposals: Object.keys(await STORE.pendingSplits()).length,
    kids: STORE.territories.filter((t) => t.pendingSplit).length,
  }));
  check("9a a brand-new hood can be proposed for splitting while offline",
    off9.proposals === 1 && off9.kids === 2, JSON.stringify(off9));
  await online(BOSS);
  await sync(BOSS); await sync(BOSS);
  const after9 = await S(BOSS, async (id) => ({
    kids: STORE.activeTerritories().filter((t) => t.name.indexOf("Fresh Hood ") === 0).length,
    parentGone: !STORE.territories.some((t) => t.id === id),
    proposals: Object.keys(await STORE.pendingSplits()).length,
  }), h9);
  check("9b on reconnect the parent lands first, then the split commits",
    after9.kids === 2 && after9.parentGone && after9.proposals === 0,
    JSON.stringify(after9));
  check("9c the server holds the parent as a retired row, not a missing one",
    !!mock.tables.territories.get(TEAM + "|" + h9) &&
    !!mock.tables.territories.get(TEAM + "|" + h9).deleted_at);

  // ============================= 10. a server that is UNWELL, not UNWILLING
  const h10 = await makeHood(BOSS, "Sick Hood", "hood-10");
  await sync(BOSS);
  mock.rpc.mode = "500";
  await S(BOSS, async (id) => {
    await STORE.splitTerritory(STORE.territories.find((x) => x.id === id), 2);
  }, h10);
  await sync(BOSS); await sync(BOSS);
  const sick10 = await S(BOSS, async (id) => ({
    proposals: Object.keys(await STORE.pendingSplits()).length,
    parentHere: STORE.territories.some((t) => t.id === id),
    refusals: (await MSYNC.refusals()).filter((r) => r.table === "splits").length,
  }), h10);
  check("10a a 500 keeps the proposal for the next cycle — it is not a refusal",
    sick10.proposals === 1 && sick10.parentHere && sick10.refusals === 1,
    JSON.stringify(sick10));
  mock.rpc.mode = "normal";
  await sync(BOSS);
  const well10 = await S(BOSS, async (id) => ({
    kids: STORE.activeTerritories().filter((t) => t.name.indexOf("Sick Hood ") === 0).length,
    parentGone: !STORE.territories.some((t) => t.id === id),
    proposals: Object.keys(await STORE.pendingSplits()).length,
  }), h10);
  check("10b and it commits normally once the server recovers",
    well10.kids === 2 && well10.parentGone && well10.proposals === 0,
    JSON.stringify(well10));

  // ================================== 11. a hood already split by someone else
  const h11 = await makeHood(BOSS, "Raced Hood", "hood-11");
  await sync(BOSS);
  await S(BOSS, async (id) => {
    await STORE.splitTerritory(STORE.territories.find((x) => x.id === id), 2);
  }, h11);
  // another manager gets there first, with a DIFFERENT operation
  mock.tables.territories.get(TEAM + "|" + h11).deleted_at = tick();
  mock.splits.set(TEAM + "|someone-elses-op",
    { parent_id: h11, child_ids: ["theirs-a", "theirs-b"] });
  await sync(BOSS); await sync(BOSS);
  const after11 = await S(BOSS, async (id) => ({
    mine: STORE.territories.filter((t) => t.name.indexOf("Raced Hood ") === 0).length,
    pendingKids: STORE.territories.filter((t) => t.pendingSplit).length,
    proposals: Object.keys(await STORE.pendingSplits()).length,
  }), h11);
  check("11a losing the race erases this device's proposal entirely",
    after11.mine === 0 && after11.pendingKids === 0 && after11.proposals === 0,
    JSON.stringify(after11));
  check("11b and never leaves a second set of children on the server",
    liveOnServer((r) => r.name.indexOf("Raced Hood ") === 0) === 0);

  // ============================================ 12. repeated splits, no growth
  const grow = { before: 0, after: 0 };
  grow.before = await S(BOSS, () => MSYNC.status().pending);
  const loopIds = [];
  for (let i = 0; i < 4; i++) {
    loopIds.push(await makeHood(BOSS, "Loop Hood " + i, "hood-loop-" + i));
    await sync(BOSS);
    await S(BOSS, async (hid) => {
      await STORE.splitTerritory(STORE.territories.find((x) => x.id === hid), 2);
    }, loopIds[i]);
    await sync(BOSS); await sync(BOSS);
  }
  const loop = await S(BOSS, async (ids) => ({
    pending: MSYNC.status().pending,
    proposals: Object.keys(await STORE.pendingSplits()).length,
    kids: STORE.activeTerritories().filter((t) => /^Loop Hood \d /.test(t.name)).length,
    ghosts: STORE.territories.filter((t) => ids.indexOf(t.id) >= 0).length,
  }), loopIds);
  check("12a four splits in a row all commit",
    loop.kids === 8 && loop.ghosts === 0, JSON.stringify(loop));
  check("12b and leave nothing behind in the queue or the proposal store",
    loop.pending === 0 && loop.proposals === 0, JSON.stringify(loop));
  const loopCalls = mock.splitCalls.filter((c) => loopIds.includes(c.body.p_parent_id)).length;
  check("12c one server call per split, never a retry storm",
    loopCalls === 4, String(loopCalls));

  // ============== 13. the migration has not been applied yet (0005 missing)
  /* This is the fleet's real state for the whole window between publishing
     v39 and running APPLY_v39.sql. The manager must not be told they were
     refused — they were not; the operation does not exist on the server yet.
     And the hood must come back, because retrying will not help. */
  const h13 = await makeHood(BOSS, "Unmigrated Hood", "hood-13");
  await sync(BOSS);
  mock.rpc.mode = "404";
  await S(BOSS, async (id) => {
    await STORE.splitTerritory(STORE.territories.find((x) => x.id === id), 2);
  }, h13);
  await sync(BOSS); await sync(BOSS);
  const after13 = await S(BOSS, async (id) => ({
    parentBack: STORE.activeTerritories().some((t) => t.id === id),
    pendingKids: STORE.territories.filter((t) => t.pendingSplit).length,
    proposals: Object.keys(await STORE.pendingSplits()).length,
    lastRefusal: MSYNC.status().lastRefusal,
    err: MSYNC.status().lastError,
  }), h13);
  check("13a a database without 0005 leaves the hood exactly as it was",
    after13.parentBack && after13.pendingKids === 0 && after13.proposals === 0,
    JSON.stringify(after13));
  /* Assert on the DURABLE record, not on lastError: a later clean cycle
     clears lastError by design, so testing it would be testing how fast the
     assertion ran. The dead-letter entry is what the More screen reads. */
  const dead13 = await S(BOSS, () => MSYNC.refusals());
  check("13b …and records it as a 404 rather than retrying forever",
    dead13.some((r) => r.table === "splits" && r.status === 404),
    JSON.stringify(dead13.filter((r) => r.table === "splits")));
  check("13c …and the server was left untouched",
    !mock.tables.territories.get(TEAM + "|" + h13).deleted_at &&
    liveOnServer((r) => r.name.indexOf("Unmigrated Hood ") === 0) === 0);
  mock.rpc.mode = "normal";

  // ========================================= 14. nothing local leaks upstream
  const wire = mock.splitCalls[mock.splitCalls.length - 1].body;
  check("14a the command names the parent, the operation and the children only",
    Object.keys(wire).sort().join(",") === "p_children,p_operation_id,p_parent_id",
    Object.keys(wire).sort().join(","));
  check("14b no device-local split bookkeeping crosses the wire",
    !JSON.stringify(wire.p_children).includes("pendingSplit") &&
    !JSON.stringify([...mock.tables.territories.values()]).includes("pendingSplit") &&
    !JSON.stringify([...mock.tables.territories.values()]).includes("splitInto"));

  // ===================== 15. a proposal does not travel in a backup
  /* A pending split belongs to the device and the moment that made it.
     Restored somewhere else it would describe an operation that has since
     committed, been refused, or been made by somebody else — naming a parent
     the restored book may not even contain. */
  const h15 = await makeHood(BOSS, "Backup Hood", "hood-15");
  await sync(BOSS);
  mock.rpc.mode = "hang";
  await S(BOSS, async (id) => {
    await STORE.splitTerritory(STORE.territories.find((x) => x.id === id), 2);
  }, h15);
  const backup = await S(BOSS, async () => {
    let captured = null;
    const orig = MUI.shareOrDownload;
    MUI.shareOrDownload = async (text) => { captured = text; return true; };
    await MVAULT.backup();
    MUI.shareOrDownload = orig;
    return captured;
  });
  mock.rpc.mode = "normal";
  check("15a a backup taken mid-proposal carries no split proposal",
    typeof backup === "string" && !backup.includes("splitPending"),
    typeof backup === "string" ? "no splitPending key" : "no backup produced");
  check("15b …and no per-record split markers reach the file",
    typeof backup === "string" && !backup.includes("pendingSplit")
      && !backup.includes("splitInto"),
    (backup || "").includes("pendingSplit") ? "pendingSplit leaked" : "clean");
  await sync(BOSS); await sync(BOSS);   // let the held proposal resolve

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();
  server.close();
  ok.forEach((n) => console.log("  ✓ " + n));
  if (bad.length) {
    console.log("=== FAIL (" + bad.length + ") ===");
    bad.forEach((n) => console.log("  ✗ " + n));
    process.exit(1);
  }
  console.log("ALL GREEN");
})();
