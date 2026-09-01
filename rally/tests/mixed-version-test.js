/* RALLY — MIXED-VERSION DEPLOYMENT SAFETY.

   The realistic deployment condition: 0003 + 0004 are already applied to the
   live database, and some phones are still running v38 while v39 rolls out.

   This suite runs the REAL v38 client (checked out from git, not a mock of
   it) and the REAL v39 client side by side against ONE mock server that
   enforces the post-migration rules:

     0003  territory upsert by a rep -> 403 (verified against real Postgres:
           an INSERT .. ON CONFLICT DO UPDATE that fails the UPDATE policy's
           USING clause raises 42501, it does not silently skip)
           territory PATCH by a rep  -> 2xx, ZERO rows changed (verified: a
           plain UPDATE hidden by USING reports "UPDATE 0" with no error)
     0004  the customer payment allowlist: autopay dropped, autopayRequested
           and status kept, status clamped to the two values a client may write

   What must hold: no data loss, no payment-intent corruption, no unbounded
   dead-letter growth, no retry storm, and no silent divergence that neither
   version admits to. */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const V39_ROOT = path.join(__dirname, "..");
const V38_REF = "ac125e6";                 // the commit v38 shipped from
const V38_ROOT = "/tmp/rally-v38-tree/rally";
const PORT = 8857;
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

// ---- materialise the real v38 tree (idempotent) ----
if (!fs.existsSync(path.join(V38_ROOT, "index.html"))) {
  fs.mkdirSync("/tmp/rally-v38-tree", { recursive: true });
  execSync(`git archive ${V38_REF} rally | tar -x -C /tmp/rally-v38-tree`,
    { cwd: path.join(V39_ROOT, ".."), stdio: "pipe" });
}
const v38Build = /RALLY_BUILD = "(.*?)"/.exec(fs.readFileSync(path.join(V38_ROOT, "index.html"), "utf8"))[1];
const v39Build = /RALLY_BUILD = "(.*?)"/.exec(fs.readFileSync(path.join(V39_ROOT, "index.html"), "utf8"))[1];
if (v38Build !== "v38" || v39Build !== "v39") {
  console.error(`expected v38/v39 trees, got ${v38Build}/${v39Build}`); process.exit(1);
}

// ---------------- mock Supabase, POST-MIGRATION ----------------
const TEAM = "11111111-1111-4111-a111-111111111111";
const mock = {
  users: {}, profiles: {}, access: {},
  tables: { pins: new Map(), events: new Map(), territories: new Map(), customers: new Map() },
  rawBodies: [], upsertWrites: 0,
  territoryRefusals: 0,      // 403s issued by the 0003 gate
  territoryUpserts: 0,       // upsert ATTEMPTS on territories, storm detector
  territoryPatchNoops: 0,    // PATCHes that changed nothing because of 0003
  requests: 0,
  clock: Date.parse("2026-09-01T00:00:00Z"),
};
const tick = () => new Date(++mock.clock).toISOString();
const LEADERSHIP = ["leader", "manager", "owner"];
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

// 0004_payment_allowlist.sql, faithfully — including the rule that an
// ABSENT key is "leave it alone", so a client too old to know about a field
// cannot erase it. Key presence is the discriminator.
function scrubTrigger(row, storedRow) {
  if (row.data && row.data.payment) {
    const p = row.data.payment;
    // the stored row is the authority on a previous value — matching the
    // trigger's own lookup, which is what makes it double-fire safe
    const o = (storedRow && storedRow.data && storedRow.data.payment) || {};
    const req = Object.prototype.hasOwnProperty.call(p, "autopayRequested")
      ? p.autopayRequested === true
      : o.autopayRequested === true;
    let st = Object.prototype.hasOwnProperty.call(p, "status")
      ? p.status : (o.status || "not_configured");
    if (st !== "not_configured" && st !== "pending_setup") st = "not_configured";
    row.data.payment = { method: p.method || "", last4: p.last4 || "",
      autopayRequested: req, status: st,
      billingAddress: p.billingAddress || null };
  }
}

function handleRest(req, res, u, body) {
  const uid = authOf(req);
  if (!uid) return j(res, 401, { message: "JWT invalid" });
  const me = mock.profiles[uid];
  const table = u.pathname.replace("/rest/v1/", "");
  const canManage = LEADERSHIP.indexOf(me.role) >= 0;

  if (table === "profiles") {
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
    const reqClock = tick();
    for (const row of rows) {
      if (row.team_id !== me.team_id)
        return j(res, 401, { code: "42501", message: "row-level security" });
      // ---- 0003: an upsert RAISES for a rep, whether the row exists or not
      if (table === "territories") mock.territoryUpserts++;
      if (table === "territories" && !canManage) {
        mock.territoryRefusals++;
        return j(res, 403, { code: "42501",
          message: "new row violates row-level security policy for table \"territories\"" });
      }
      if (table === "events" && row.by_user && row.by_user !== uid)
        return j(res, 401, { code: "42501", message: "row-level security (by_user)" });
      const key = row.team_id + "|" + row.id;
      const existing = t.get(key);
      if (existing) {
        if (prefer.includes("ignore-duplicates")) continue;
        if (table === "events") return j(res, 401, { code: "42501" });
        /* A PostgREST upsert is INSERT .. ON CONFLICT DO UPDATE, and Postgres
           fires a BEFORE INSERT OR UPDATE trigger TWICE for it: once on the
           proposed tuple (whose output becomes EXCLUDED) and once as the
           UPDATE. Firing it once here would hide exactly the class of bug
           where the first pass injects a value the second pass then trusts. */
        const proposed = JSON.parse(JSON.stringify(row));
        if (table === "customers") scrubTrigger(proposed, existing);   // BEFORE INSERT
        const merged = Object.assign({}, existing, proposed,
          { created_at: existing.created_at, updated_at: reqClock });
        if (table === "customers") scrubTrigger(merged, existing);     // BEFORE UPDATE
        t.set(key, merged); mock.upsertWrites++;
      } else {
        const fresh = Object.assign({}, row, { created_at: reqClock });
        if (table !== "events") fresh.updated_at = fresh.created_at;
        if (table === "customers") scrubTrigger(fresh, null);
        t.set(key, fresh); mock.upsertWrites++;
      }
    }
    return j(res, 201, prefer.includes("return=minimal") ? undefined : rows);
  }

  if (req.method === "PATCH") {
    if (table === "events") return j(res, 401, { code: "42501" });
    const id = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    const teamQ = String(u.searchParams.get("team_id") || "").replace(/^eq\./, "");
    if (teamQ !== me.team_id) return j(res, 200, undefined);
    const key = teamQ + "|" + id;
    const row = t.get(key);
    // ---- 0003: for a rep the row is HIDDEN by the USING clause, so the
    // ---- statement succeeds and changes nothing. No error is raised.
    const wantRep = String(req.headers.prefer || "").includes("return=representation");
    if (table === "territories" && !canManage) {
      if (row) mock.territoryPatchNoops++;
      return j(res, 200, wantRep ? [] : undefined);   // 2xx, zero rows changed
    }
    if (row) {
      const before = JSON.parse(JSON.stringify(row));
      Object.assign(row, body, { updated_at: tick() });
      if (table === "customers") scrubTrigger(row, before);
      mock.upsertWrites++;
      return j(res, 200, wantRep ? [row] : undefined);
    }
    return j(res, 200, wantRep ? [] : undefined);
  }

  let rows = [...t.values()].filter((r) => r.team_id === me.team_id);
  // PostgREST honours an id filter on GET; the sync engine's tombstone probe
  // depends on it, so the mock must too
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
  ".png": "image/png", ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json", ".pbf": "application/x-protobuf" };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/auth/v1/") || u.pathname.startsWith("/rest/v1/")) {
    let raw = ""; req.on("data", (c) => raw += c);
    req.on("end", () => {
      mock.requests++;
      if (raw) mock.rawBodies.push(raw);
      let body = {}; try { body = JSON.parse(raw || "{}"); } catch (_) {}
      if (u.pathname === "/auth/v1/token") {
        const usr = mock.users[String(body.email || "").toLowerCase()];
        if (u.searchParams.get("grant_type") === "refresh_token")
          return j(res, 400, { error_description: "Invalid Refresh Token" });
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
  // two document roots: the real v38 tree under /v38/, v39 at the root
  const v38 = u.pathname.startsWith("/v38/");
  let p = decodeURIComponent(v38 ? u.pathname.slice(4) : u.pathname);
  if (p === "/" || p === "") p = "/index.html";
  fs.readFile(path.join(v38 ? V38_ROOT : V39_ROOT, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(d);
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];

  addUser("rep@x.com", "knock1234", { name: "Rep Old", role: "rep" });
  addUser("rep2@x.com", "knock1234", { name: "Rep New", role: "rep" });
  addUser("boss@x.com", "knock1234", { name: "Boss", role: "owner" });

  async function device(which, email) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript((port) => {
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
      window.RALLY_CLOUD = { url: "http://localhost:" + port, anonKey: "test-anon", pollMs: 900 };
    }, PORT);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`[${which}] PAGEERROR ${e.message}`));
    page.on("console", (m) => {
      const t = m.text();
      if (m.type() === "error" && !/net::ERR_/.test(t) && !/WebSocket/.test(t))
        errors.push(`[${which}] ${t}`);
    });
    await page.goto(`http://localhost:${PORT}${which === "v38" ? "/v38/" : "/"}`);
    await page.waitForFunction(() => document.querySelector("#splash").hidden, null, { timeout: 25000 });
    await page.fill("#gate-email", email); await page.fill("#gate-pass", "knock1234");
    await page.click("#gate-submit");
    await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 25000 });
    await page.waitForTimeout(800);
    return { which, ctx, page };
  }
  const S = (d, fn, arg) => d.page.evaluate(fn, arg);
  const sync = async (d) => {
    await d.page.evaluate(async () => {
      for (let i = 0; i < 200 && MSYNC.status().running; i++) await new Promise((r) => setTimeout(r, 50));
      await MSYNC.syncNow();
    });
    await d.page.waitForTimeout(300);
  };

  const OLD = await device("v38", "rep@x.com");
  const NEW = await device("v39", "rep2@x.com");
  check("S0 both clients booted and report their own build",
    (await S(OLD, () => window.RALLY_BUILD)) === "v38" &&
    (await S(NEW, () => window.RALLY_BUILD)) === "v39");
  await sync(OLD); await sync(NEW);

  /* ===== 1. a v38 client pushes the OLD payment shape ===== */
  await S(OLD, async () => {
    await STORE.addCustomer({ first: "Old", last: "Shape", phones: [], appointments: [],
      plan: { id: "prem", name: "Premium", monthly: 99, initial: 450 },
      payment: { method: "card", autopay: true, last4: "4242",
        card: { name: "Old Shape", number: "4111111111111111", exp: "01/30" },
        ach: { name: "", routing: "021000021", account: "000123456789", type: "checking" },
        billingAddress: { street: "1 Elm", city: "Provo", state: "UT", zip: "84604" } } });
  });
  await sync(OLD);
  const stored = [...mock.tables.customers.values()].find((r) => r.data.last === "Shape");
  check("1a a v38 push carries no credential (its own scrub still runs)",
    !mock.rawBodies.some((b) => b.includes("4111111111111111") || b.includes("000123456789")));
  check("1b the 0004 trigger stores the safe allowlist and nothing else",
    Object.keys(stored.data.payment).sort().join(",") ===
      "autopayRequested,billingAddress,last4,method,status",
    Object.keys(stored.data.payment).sort().join(","));
  check("1c v38's autopay:true — the OLD DEFAULT — is not promoted to a request",
    stored.data.payment.autopayRequested === false && stored.data.payment.status === "not_configured",
    JSON.stringify(stored.data.payment));
  check("1d the customer's real, non-payment data is intact",
    stored.data.first === "Old" && stored.data.plan.monthly === 99 &&
    stored.data.payment.billingAddress.zip === "84604" && stored.data.payment.last4 === "4242");

  await sync(NEW);
  const seenByNew = await S(NEW, () => {
    const c = STORE.customers.find((x) => x.last === "Shape");
    return { pay: c && c.payment, name: c && c.first };
  });
  check("1e v39 reads it as an honest unconfigured record",
    seenByNew.pay && seenByNew.pay.autopayRequested === false &&
    seenByNew.pay.status === "not_configured" && seenByNew.pay.method === "card",
    JSON.stringify(seenByNew.pay));

  /* ===== 2. a v38 client RECEIVES a v39 customer ===== */
  const newCustId = await S(NEW, async () => {
    const c = await STORE.addCustomer({ first: "New", last: "Shape", phones: [], appointments: [],
      plan: { id: "prem", name: "Premium", monthly: 99, initial: 450 },
      soldByUserId: STORE.myId(), soldBy: "Rep New",
      payment: MCUST.honestPayment({ method: "ach", autopayRequested: true }) });
    return c.id;
  });
  await sync(NEW);
  const onServer = mock.tables.customers.get(TEAM + "|" + newCustId);
  check("2a v39's record reaches the server with the request intact",
    onServer.data.payment.autopayRequested === true &&
    onServer.data.payment.status === "pending_setup",
    JSON.stringify(onServer.data.payment));
  await sync(OLD);
  const v38Sees = await S(OLD, () => {
    const c = STORE.customers.find((x) => x.last === "Shape" && x.first === "New");
    return c ? { pay: JSON.stringify(c.payment), soldBy: c.soldByUserId } : null;
  });
  check("2b a v38 device pulls the v39 record without error", !!v38Sees, JSON.stringify(v38Sees));
  check("2c …and does not lose the fields it does not understand",
    v38Sees && /autopayRequested/.test(v38Sees.pay) && !!v38Sees.soldBy, v38Sees && v38Sees.pay);

  // now the dangerous part: the v38 rep OPENS and SAVES that v39 customer
  const v38RoundTrip = await S(OLD, async (id) => {
    MCUST.open(id);
    await new Promise((r) => setTimeout(r, 700));
    document.querySelector("#ce-save").click();
    await new Promise((r) => setTimeout(r, 1200));
    const e = document.querySelector("#celebrate"); if (e) e.hidden = true;
    const c = STORE.customers.find((x) => x.id === id);
    return { pay: JSON.stringify(c.payment), soldBy: c.soldByUserId || null };
  }, newCustId);
  await sync(OLD); await sync(NEW);
  const afterRoundTrip = mock.tables.customers.get(TEAM + "|" + newCustId);
  const v39AfterRT = await S(NEW, (id) => {
    const c = STORE.customers.find((x) => x.id === id);
    return c ? { autopayRequested: c.payment.autopayRequested, status: c.payment.status,
      method: c.payment.method, soldBy: c.soldByUserId || null } : null;
  }, newCustId);
  // v38's scrubPayment rebuilds payment as {method,last4,autopay,billingAddress} —
  // it drops autopayRequested and status entirely, because it has never heard
  // of them. 0004 therefore has to treat an ABSENT key as "leave it alone".
  check("2d a v38 open+save does NOT erase the customer's autopay request",
    afterRoundTrip.data.payment.autopayRequested === true,
    JSON.stringify({ server: afterRoundTrip.data.payment, v38Local: v38RoundTrip.pay }));
  check("2e …and does NOT destroy the v39 authorship id",
    !!afterRoundTrip.data.soldByUserId, String(afterRoundTrip.data.soldByUserId));
  check("2f …and v39 still sees an honest record afterwards",
    v39AfterRT && v39AfterRT.autopayRequested === true && v39AfterRT.status === "pending_setup",
    JSON.stringify(v39AfterRT));

  /* ===== 3. a v38 rep attempts territory writes under 0003 ===== */
  const refusalsBefore = mock.territoryRefusals;
  const upsertsBefore = mock.territoryUpserts;
  const v38Managerish = await S(OLD, () => STORE.isManager());
  check("3a a v38 device still believes it is a manager (stale UI is expected)",
    v38Managerish === true, String(v38Managerish));
  await S(OLD, async () => {
    await STORE.addTerritory({ id: MDB.uid(), name: "Rep Made This", points: [[0,0],[1,0],[1,1]],
      createdAt: Date.now(), assignments: [] });
  });
  await sync(OLD);
  const t3 = await S(OLD, () => ({
    local: STORE.territories.length,
    pending: MSYNC.status().pending,
    dead: MSYNC.status().refused,
  }));
  check("3b the server refused it — nothing was written",
    mock.tables.territories.size === 0 && mock.territoryRefusals > refusalsBefore,
    `serverRows=${mock.tables.territories.size} refusals=${mock.territoryRefusals - refusalsBefore}`);
  check("3c the v38 queue is NOT wedged — the row is parked, not retried forever",
    t3.pending === 0, JSON.stringify(t3));
  const deadV38 = await S(OLD, () => MDB.kvGet("syncDead", []));
  check("3d v38 dead-letters it (bounded), but shows the rep nothing",
    deadV38.length === 1, `dead=${deadV38.length}`);
  check("3e the rep's phone now shows a territory the server does not have",
    t3.local === 1, `local=${t3.local}`);
  // the honest storm measure: a ONE-row batch must be attempted exactly once.
  // (Raw request counts vary with which background cycles happen to fire.)
  check("3f one refused row is attempted exactly once — no retry storm",
    mock.territoryUpserts - upsertsBefore === 1,
    `attempts=${mock.territoryUpserts - upsertsBefore}`);

  /* ===== 4. the rep's KNOCKING work is untouched by 0003 ===== */
  const knockBefore = mock.tables.events.size;
  await S(OLD, async () => {
    await STORE.addKnock({ lat: 38.4, lng: -98.3, disposition: "sold", reason: null, dm: true, note: "" });
    await STORE.addCustomer({ first: "Mid", last: "Shift", phones: [], appointments: [] });
  });
  await sync(OLD);
  check("4a a v38 rep mid-shift keeps logging doors and customers",
    mock.tables.events.size === knockBefore + 1 &&
    [...mock.tables.customers.values()].some((r) => r.data.last === "Shift"),
    `events=${mock.tables.events.size}`);
  check("4b …and the refused territory did not block them",
    (await S(OLD, () => MSYNC.status().pending)) === 0);

  /* ===== 5. the tombstone path: a refusal the server reports as success ===== */
  // seed a territory as the OWNER so one actually exists on the server
  const BOSS = await device("v39", "boss@x.com");
  const hoodId = await S(BOSS, async () => {
    const t = await STORE.addTerritory({ id: MDB.uid(), name: "Real Hood",
      points: [[0,0],[2,0],[2,2]], createdAt: Date.now(), assignments: [] });
    return t.id;
  });
  await sync(BOSS);
  check("5a a leader CAN create a territory under 0003",
    mock.tables.territories.size === 1, `rows=${mock.tables.territories.size}`);
  await sync(OLD);
  const noopsBefore = mock.territoryPatchNoops;
  await S(OLD, async (id) => { await STORE.deleteTerritory(id); }, hoodId);
  await sync(OLD);
  const t5 = await S(OLD, () => ({ local: STORE.territories.length,
    pending: MSYNC.status().pending, dead: (MSYNC.status().refused || 0) }));
  const stillOnServer = mock.tables.territories.has(TEAM + "|" + hoodId) &&
    !mock.tables.territories.get(TEAM + "|" + hoodId).deleted_at;
  check("5b the server correctly refuses the rep's tombstone (row untouched)",
    stillOnServer && mock.territoryPatchNoops > noopsBefore,
    `alive=${stillOnServer} noops=${mock.territoryPatchNoops - noopsBefore}`);
  check("5c BUT the PATCH returned 2xx, so the client believes it synced",
    t5.pending === 0, JSON.stringify(t5));
  check("5d …leaving a SILENT divergence: gone locally, alive on the server",
    !(await S(OLD, (id) => STORE.territories.some((t) => t.id === id), hoodId)) && stillOnServer,
    JSON.stringify(t5));

  /* ===== 6. does v39 have the same silent hole? ===== */
  const noops2 = mock.territoryPatchNoops;
  const v39Silent = await S(NEW, async (id) => {
    // a v39 rep cannot reach the button, but a queued tombstone from before a
    // demotion takes the same code path — drive it directly
    await STORE.deleteTerritory(id);
    for (let i = 0; i < 200 && MSYNC.status().running; i++) await new Promise((r) => setTimeout(r, 50));
    await MSYNC.syncNow();
    await new Promise((r) => setTimeout(r, 300));
    const st = MSYNC.status();
    const dead = await MSYNC.refusals();
    return { pending: st.pending, refused: st.refused, lastRefusal: st.lastRefusal,
      dead: dead.map((d) => d.table + ":" + d.id + ":" + d.status),
      gone: !STORE.territories.some((t) => t.id === id) };
  }, hoodId);
  check("6a v39 does NOT accept a refused tombstone as synced — it surfaces it",
    v39Silent.pending === 0 && v39Silent.refused === 1 &&
    mock.territoryPatchNoops > noops2, JSON.stringify(v39Silent));
  check("6b …and names the refused table and row",
    !!v39Silent.lastRefusal && v39Silent.lastRefusal.table === "territories" &&
    v39Silent.lastRefusal.id === hoodId, JSON.stringify(v39Silent.lastRefusal));
  // a tombstone for a row that was NEVER uploaded is still a legitimate no-op
  const neverUploaded = await S(NEW, async () => {
    // written straight to IndexedDB, never queued, so the server has never
    // heard of it. (addTerritory would itself be refused for a rep — the
    // point here is a tombstone with no server row behind it.)
    const t = { id: "local-only-1", name: "Local Only", points: [[0,0],[1,0],[1,1]],
      createdAt: 1, updatedAt: 1, assignments: [] };
    await MDB.put("territories", t);
    STORE.territories.push(t);
    const before = MSYNC.status().refused;
    await STORE.deleteTerritory(t.id);
    for (let i = 0; i < 200 && MSYNC.status().running; i++) await new Promise((r) => setTimeout(r, 50));
    await MSYNC.syncNow();
    await new Promise((r) => setTimeout(r, 300));
    return { before, after: MSYNC.status().refused, pending: MSYNC.status().pending };
  });
  check("6c a tombstone for a row the server never had is NOT called a refusal",
    neverUploaded.after === neverUploaded.before && neverUploaded.pending === 0,
    JSON.stringify(neverUploaded));

  /* ===== 6d. a rep never re-queues a territory the server will refuse =====
     The pull heals a server copy that is older than ours by re-queuing a
     push. For a rep under 0003 that push can only ever be refused — and
     because the pull re-delivers on every leader edit, it would dead-letter
     again each time and keep telling the rep their work was rejected. */
  const reQueue = await S(NEW, async () => {
    // a territory whose LOCAL copy carries a newer client clock than the
    // server's — exactly what a refused local edit leaves behind
    const t = { id: "older-on-server", name: "Local Newer",
      points: [[0,0],[3,0],[3,3]], createdAt: 1, updatedAt: Date.now() + 60e3,
      assignments: [] };
    await MDB.put("territories", t);
    STORE.territories.push(t);
    return t.id;
  });
  mock.tables.territories.set(TEAM + "|" + reQueue, {
    team_id: TEAM, id: reQueue, name: "Server Copy", polygon: [], archived: false,
    data: { id: reQueue, name: "Server Copy", points: [], createdAt: 1, updatedAt: 1 },
    created_at: new Date(++mock.clock).toISOString(),
    updated_at: new Date(++mock.clock).toISOString(),
  });
  const refusalsBefore6d = mock.territoryRefusals;
  const before6d = await S(NEW, () => MSYNC.status().refused);
  await sync(NEW); await sync(NEW);
  const after6d = await S(NEW, () => ({
    refused: MSYNC.status().refused, pending: MSYNC.status().pending,
    name: (STORE.territories.find((t) => t.id === "older-on-server") || {}).name }));
  check("6d a rep does not re-queue a territory push the server must refuse",
    after6d.refused === before6d && mock.territoryRefusals === refusalsBefore6d,
    JSON.stringify({ ...after6d, serverRefusals: mock.territoryRefusals - refusalsBefore6d }));
  check("6e …and takes the server's copy instead of keeping a divergent one",
    after6d.name === "Server Copy", String(after6d.name));

  /* ===== 7. convergence: no write loop between the two versions ===== */
  const writesBefore = mock.upsertWrites;
  for (let i = 0; i < 3; i++) { await sync(OLD); await sync(NEW); }
  check("7a repeated idle syncs across versions write nothing (no loop)",
    mock.upsertWrites === writesBefore, `writes=${mock.upsertWrites - writesBefore}`);
  const both = await Promise.all([
    S(OLD, () => ({ c: STORE.customers.length, p: STORE.pins.length })),
    S(NEW, () => ({ c: STORE.customers.length, p: STORE.pins.length })),
  ]);
  check("7b both versions converged on the same book",
    both[0].c === both[1].c && both[0].p === both[1].p, JSON.stringify(both));

  /* ===== 8c. the happy path still works, in cloud mode =====
     Deferring the door release until the tombstone is a fact must not mean
     it never happens. */
  const hood8 = await S(BOSS, async () => {
    const t = await STORE.addTerritory({ id: MDB.uid(), name: "Eighth Hood",
      points: [[20, 20], [22, 20], [22, 22]], createdAt: Date.now(), assignments: [] });
    for (let i = 0; i < 2; i++) {
      const p = { id: "door-8-" + i, lat: 21, lng: 21, address: "8 Eighth St " + i,
        disposition: "unworked", territoryId: t.id, history: [], notes: [],
        createdAt: 1, updatedAt: 1 };
      await MDB.put("pins", p);
      STORE.pins.push(p);
      MSYNC.queue("pins", p.id);
    }
    return t.id;
  });
  await sync(BOSS); await sync(BOSS);
  await S(BOSS, async (id) => { await STORE.deleteTerritory(id); }, hood8);
  const stillHeld = await S(BOSS, () =>
    STORE.pins.filter((p) => /^door-8-/.test(p.id) && p.territoryId).length);
  check("8c1 doors stay attached while the tombstone is only queued",
    stillHeld === 2, String(stillHeld));
  await sync(BOSS);
  const done8 = await S(BOSS, (id) => ({
    released: STORE.pins.filter((p) => /^door-8-/.test(p.id) && !p.territoryId).length,
    gone: !STORE.territories.some((t) => t.id === id),
    refused: MSYNC.status().refused, pending: MSYNC.status().pending }), hood8);
  const row8 = mock.tables.territories.get(TEAM + "|" + hood8);
  check("8c2 a leader's delete IS accepted and tombstoned on the server",
    !!row8 && !!row8.deleted_at, JSON.stringify({ has: !!row8, del: row8 && row8.deleted_at }));
  check("8c3 …and only then are the doors released, locally",
    done8.released === 2 && done8.gone === true, JSON.stringify(done8));
  check("8c4 …with nothing refused and nothing left queued",
    done8.pending === 0, JSON.stringify(done8));

  /* ===== 9. PARTIAL COMMIT ACROSS AN AUTHORIZATION CHANGE =====
     A leader queues a territory deletion while authorized. Before it syncs,
     the office demotes them to rep. The tombstone is leadership-only and is
     refused — but the doors the delete would detach are rep-writable, so
     that half used to commit, leaving a live territory whose every door had
     been detached. v39 makes the delete a single server-visible row: the
     doors are not touched until the tombstone is a FACT. */
  const hood9 = await S(BOSS, async () => {
    const t = await STORE.addTerritory({ id: MDB.uid(), name: "Ninth Hood",
      points: [[10, 10], [12, 10], [12, 12]], createdAt: Date.now(), assignments: [] });
    // three doors that belong to it
    for (let i = 0; i < 3; i++) {
      const p = { id: "door-9-" + i, lat: 11 + i * 0.1, lng: 11, address: "9 Ninth St " + i,
        disposition: "unworked", territoryId: t.id, history: [], notes: [],
        createdAt: 1, updatedAt: 1 };
      await MDB.put("pins", p);
      STORE.pins.push(p);
      MSYNC.queue("pins", p.id);
    }
    return t.id;
  });
  await sync(BOSS); await sync(BOSS);   // push, then pull them back
  check("9a a leader's territory and its doors are on the server",
    mock.tables.territories.has(TEAM + "|" + hood9) &&
    [...mock.tables.pins.values()].filter((r) => r.territory_id === hood9).length === 3,
    `pins=${[...mock.tables.pins.values()].filter((r) => r.territory_id === hood9).length}`);

  // the exact state of every affected door, before the attempt
  const doorsBefore = await S(BOSS, (id) => JSON.stringify(
    STORE.pins.filter((p) => p.territoryId === id || /^door-9-/.test(p.id))
      .sort((a, b) => (a.id < b.id ? -1 : 1))), hood9);

  // still a leader: queue the deletion, do NOT sync
  await S(BOSS, async (id) => { await STORE.deleteTerritory(id); }, hood9);
  const queuedState = await S(BOSS, (id) => ({
    gone: !STORE.territories.some((t) => t.id === id),
    pins: JSON.stringify(STORE.pins.filter((p) => /^door-9-/.test(p.id))
      .sort((a, b) => (a.id < b.id ? -1 : 1))),
    outbox: MSYNC.status().pending,
  }), hood9);
  check("9b the queued delete does not touch the doors at all",
    queuedState.pins === doorsBefore, "doors changed while merely queued");
  check("9c …and queues exactly ONE server-visible row",
    queuedState.outbox === 1, `outbox=${queuedState.outbox}`);

  // THE OFFICE DEMOTES THEM, between the tap and the delivery
  const bossId = mock.users["boss@x.com"].id;
  mock.profiles[bossId].role = "rep";
  const refusedBefore9 = await S(BOSS, () => MSYNC.status().refused);
  await sync(BOSS);
  await BOSS.page.waitForFunction(() => STORE.effectiveRole() === "rep", null, { timeout: 20000 });
  await sync(BOSS);

  const after9 = await S(BOSS, (id) => ({
    role: STORE.effectiveRole(),
    refused: MSYNC.status().refused,
    lastRefusal: MSYNC.status().lastRefusal,
    pending: MSYNC.status().pending,
    pins: JSON.stringify(STORE.pins.filter((p) => /^door-9-/.test(p.id))
      .sort((a, b) => (a.id < b.id ? -1 : 1))),
    restored: STORE.territories.some((t) => t.id === id),
  }), hood9);
  const serverRow9 = mock.tables.territories.get(TEAM + "|" + hood9);
  const serverPins9 = [...mock.tables.pins.values()].filter((r) => r.territory_id === hood9).length;

  check("9d the demotion reached the device before its push",
    after9.role === "rep", after9.role);
  check("9e the territory tombstone is REFUSED",
    after9.refused === refusedBefore9 + 1 && after9.lastRefusal &&
    after9.lastRefusal.id === hood9, JSON.stringify(after9.lastRefusal));
  if (after9.pins !== doorsBefore) {
    const A = JSON.parse(doorsBefore), B = JSON.parse(after9.pins);
    const diffs = [];
    A.forEach((a, i) => {
      const b = B[i] || {};
      new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => {
        if (JSON.stringify(a[k]) !== JSON.stringify(b[k]))
          diffs.push(`${a.id}.${k}: ${JSON.stringify(a[k])} -> ${JSON.stringify(b[k])}`);
      });
    });
    console.log("  [diag 9f] " + diffs.join(" | "));
  }
  check("9f EVERY affected door is byte-for-byte what it was before the attempt",
    after9.pins === doorsBefore, "see diag above");
  check("9g the server's territory is untouched and still owns its doors",
    !!serverRow9 && !serverRow9.deleted_at && serverPins9 === 3,
    `alive=${!!serverRow9 && !serverRow9.deleted_at} pins=${serverPins9}`);
  check("9h the refused delete is rolled back locally — no half-applied state",
    after9.restored === true, String(after9.restored));
  check("9i …and nothing is left queued to retry forever",
    after9.pending === 0, String(after9.pending));

  /* The only console noise allowed is the browser reporting the 403 the
     server correctly issued for the v38 rep's territory push. That is the
     refusal working, not an app fault — but v38 shows the rep nothing, which
     is precisely why it must not be left running. */
  const refusalNoise = errors.filter((e) => /403 \(Forbidden\)/.test(e));
  const realErrors = errors.filter((e) => !/403 \(Forbidden\)/.test(e));
  check("8a the only console error is the server's honest 403 refusal",
    refusalNoise.length > 0 && /^\[v38\]/.test(refusalNoise[0]), refusalNoise[0] || "none");
  check("8b no application errors on either version",
    realErrors.length === 0, realErrors.slice(0, 4).join(" | "));

  console.log("\n=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  await browser.close(); server.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
