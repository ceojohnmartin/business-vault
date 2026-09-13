/* 0018 LOCAL REPLICA ONLY — production does not have 0018.

   THE CLIENT'S OWN IMPORT PATH, END TO END, AGAINST THE REAL SQL.

   Every other proof of import_territory_doors drives the FUNCTION with
   psql (db/test/v42-territory-test.sh) or drives the CLIENT against an
   in-memory fake. Neither proves that the two agree on the wire: that
   what STORE.importDoorsServer actually sends is what the real 0018
   function actually accepts, and that what the function answers is what
   the client actually reads.

   This suite boots the real app, signs it in as a leader against a mock
   GoTrue/PostgREST, and then — for the three v42 RPCs — the mock does
   not fake anything: it forwards the request body, as the client sent it,
   into the REAL public.import_territory_doors / rally_territory_summary /
   rally_capabilities running on the local PostgreSQL replica, impersonated
   the way the SQL suite impersonates (request.jwt.claims), and hands the
   function's own jsonb back as the HTTP response. Assertions are made on
   the client's return value, on the raw wire, and on the REPLICA'S ROWS.

   The replica: PostgreSQL 16 on a unix socket (see PG below), database
   rally_v42_test built by db/test/v42-territory-test.sh. Each run copies
   it to a fresh rally_import_caller so the run is repeatable. NOTHING
   here talks to a remote Supabase project: RALLY_CLOUD is pointed at
   localhost before any app script runs, and every non-localhost request
   is aborted at the browser.

     NODE_PATH=/opt/node22/lib/node_modules /opt/node22/bin/node tests/import-caller-test.js
*/
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const crypto = require("crypto");
const { execFile, execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
const PORT = 8858;
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

// ---------------- the replica ----------------
const PG = {
  bin: "/usr/lib/postgresql/16/bin",
  host: process.env.PGHOST || "/tmp/pgrls/sock",
  port: process.env.PGPORT || "5544",
  user: process.env.PGUSER || "postgres",
};
const PSQL = path.join(PG.bin, "psql");
const TEMPLATE = process.env.RALLY_IMPORT_TEMPLATE || "rally_v42_test"; // built by db/test/v42-territory-test.sh
const DB = "rally_import_caller";       // a fresh copy per run
// the seed identities that suite uses
const TEAM = "dddddddd-4444-4444-a444-444444444444";
const LEAD = "00000000-0000-4000-d000-000000000003";
const JOHN = "00000000-0000-4000-d000-000000000001";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pgEnv = Object.assign({}, process.env, {
  PATH: PG.bin + ":" + (process.env.PATH || ""),
  PGHOST: PG.host, PGPORT: PG.port, PGUSER: PG.user,
});
// synchronous psql for setup and for reading rows back; throws on error
function q(db, sql) {
  return execFileSync(PSQL, ["-X", "-tA", "-v", "ON_ERROR_STOP=1", "-d", db, "-c", sql],
    { env: pgEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function qf(db, file) {
  execFileSync(PSQL, ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", db, "-f", file],
    { env: pgEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
/* Dollar-quote a literal. psql -c takes the SQL as one argv string, so
   there is no shell to escape for; the only thing that could break out of
   the quote is the tag itself, and the tag is random and asserted absent. */
function dq(s) {
  const tag = "$q" + crypto.randomBytes(4).toString("hex") + "$";
  if (String(s).includes(tag)) throw new Error("payload contains the dollar tag " + tag);
  return tag + s + tag;
}
/* Impersonate exactly like the SQL suite's as() helper: the claim and the
   call go to the server as ONE -c batch, so they share one transaction and
   auth.uid() inside the SECURITY DEFINER function sees the sub. psql 16
   prints every statement's result, so the function's jsonb is the LAST
   non-empty line of stdout. */
function asUser(db, sub, sql) {
  if (!UUID.test(sub)) return Promise.resolve({ ok: false, out: "", err: "bad sub" });
  const claim = JSON.stringify({ sub });
  const batch = "select set_config('request.jwt.claims', " + dq(claim) + ", true); " + sql;
  return new Promise((resolve) => {
    execFile(PSQL, ["-X", "-tA", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose",
      "-d", db, "-c", batch],
    { env: pgEnv, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    (e, out, err) => resolve({ ok: !e, out: String(out || ""), err: String(err || "") }));
  });
}
const lastLine = (out) => out.split("\n").map((l) => l.trim()).filter(Boolean).pop() || "";

/* THE SHIM. A PostgREST /rpc/<fn> POST body is {argName: value, ...};
   call the real function with named arguments, each dollar-quoted and
   cast to the declared type. Returns what PostgREST would: 200 + the
   function's jsonb, or 400 + {code, message, details} from the error. */
const RPC_SIG = {
  import_territory_doors: { p_territory_id: "text", p_doors: "jsonb", p_operation_id: "text" },
  rally_territory_summary: { p_territory_id: "text" },
  rally_capabilities: {},
};
async function rpcToReplica(name, body, sub) {
  const sig = RPC_SIG[name];
  if (!sig) return { status: 404, body: { message: "Could not find the function public." + name } };
  const args = Object.keys(sig).map((k) => {
    const v = body ? body[k] : undefined;
    if (v === undefined || v === null) return k + " => null";
    const lit = sig[k] === "jsonb" ? JSON.stringify(v) : String(v);
    return k + " => " + dq(lit) + "::" + sig[k];
  });
  const r = await asUser(DB, sub, "select public." + name + "(" + args.join(", ") + ");");
  if (!r.ok) {
    const m = r.err.match(/^ERROR:\s+([0-9A-Z]{5}):\s+(.*)$/m) || r.err.match(/^ERROR:\s+(.*)$/m);
    const code = m && m.length === 3 ? m[1] : null;
    const message = m ? m[m.length - 1] : r.err.trim();
    return { status: 400, body: { code, message, details: r.err.trim() } };
  }
  let data = null;
  try { data = JSON.parse(lastLine(r.out)); } catch (_) {
    return { status: 500, body: { message: "shim: unparseable psql output: " + r.out } };
  }
  return { status: 200, body: data };
}

/* If the template is missing 0018, rebuild it exactly the way
   db/test/v42-territory-test.sh's build() does, then apply
   db/APPLY_v42.sql as ONE transaction (its "1a" step). */
function rebuildTemplate() {
  const T = path.join(ROOT, "db", "test");
  q("postgres", "drop database if exists " + TEMPLATE);
  q("postgres", "create database " + TEMPLATE);
  qf(TEMPLATE, path.join(T, "supabase-shim.sql"));
  fs.readdirSync(path.join(ROOT, "db", "migrations")).filter((f) => /^000[1-8]_.*\.sql$/.test(f))
    .sort().forEach((f) => qf(TEMPLATE, path.join(ROOT, "db", "migrations", f)));
  try { q(TEMPLATE, "revoke usage on schema gis from authenticated"); } catch (_) {}
  qf(TEMPLATE, path.join(T, "v41-backfill-seed.sql"));
  ["APPLY_v41_A", "APPLY_v41_B1", "APPLY_v41_B2", "APPLY_v41_C", "APPLY_v41_FLIP"]
    .forEach((f) => qf(TEMPLATE, path.join(ROOT, "db", f + ".sql")));
  qf(TEMPLATE, path.join(ROOT, "db", "APPLY_v42.sql"));
}
const PROCS = "select string_agg(proname, ',' order by proname) from pg_proc where proname in ('import_territory_doors','save_territory','rally_territory_summary')";
const WANT_PROCS = "import_territory_doors,rally_territory_summary,save_territory";

// ---------------- mock Supabase: GoTrue + PostgREST, RPCs forwarded ----------------
const mock = { users: {}, profiles: {}, access: {}, refresh: {}, rpcLog: [], rawBodies: [] };
function mint(id) {
  const a = "at-" + crypto.randomBytes(8).toString("hex");
  const r = "rt-" + crypto.randomBytes(8).toString("hex");
  mock.access[a] = id; mock.refresh[r] = id;
  return { access_token: a, refresh_token: r, token_type: "bearer", expires_in: 3600,
    user: { id, email: "" } };
}
const j = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const authOf = (req) => mock.access[String(req.headers.authorization || "").replace(/^Bearer /, "")];

async function handleRest(req, res, u, raw, body) {
  const uid = authOf(req);
  if (!uid) return j(res, 401, { message: "JWT invalid" });
  const me = mock.profiles[uid];
  const p = u.pathname.replace("/rest/v1/", "");

  if (p.startsWith("rpc/")) {
    const name = p.slice(4);
    if (req.method !== "POST") return j(res, 405, { message: "method" });
    const t0 = Date.now();
    const r = await rpcToReplica(name, body, uid); // the token's user IS the claim
    mock.rpcLog.push({ name, sub: uid, raw, body, status: r.status, data: r.body, ms: Date.now() - t0 });
    return j(res, r.status, r.body);
  }
  if (p === "profiles") {
    const want = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    const rows = Object.values(mock.profiles).filter((x) => x.id === uid || x.team_id === me.team_id);
    return j(res, 200, want ? rows.filter((r) => r.id === want) : rows);
  }
  // every other table: an empty, accepting server. The sync engine may
  // pull (answer: nothing yet) and push (answer: stored) — none of that is
  // what this suite is about, and pins reach a device only via a pull.
  if (req.method === "GET") return j(res, 200, []);
  if (req.method === "POST") {
    const rows = Array.isArray(body) ? body : [body];
    return j(res, 201, String(req.headers.prefer || "").includes("return=minimal") ? undefined : rows);
  }
  if (req.method === "PATCH") return j(res, 200, []);
  return j(res, 404, { message: "not found" });
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2", ".woff": "font/woff" };
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
        if (u.searchParams.get("grant_type") === "password") {
          const usr = mock.users[String(body.email || "").toLowerCase()];
          if (!usr || usr.password !== body.password)
            return j(res, 400, { error_description: "Invalid login credentials" });
          const s = mint(usr.id); s.user.email = body.email;
          return j(res, 200, s);
        }
        if (u.searchParams.get("grant_type") === "refresh_token") {
          const id = mock.refresh[body.refresh_token];
          if (!id) return j(res, 400, { error_description: "Invalid Refresh Token" });
          delete mock.refresh[body.refresh_token];
          return j(res, 200, mint(id));
        }
        return j(res, 400, { error_description: "unsupported grant" });
      }
      if (u.pathname === "/auth/v1/logout") return j(res, 204);
      if (u.pathname.startsWith("/rest/v1/")) {
        return handleRest(req, res, u, raw, body).catch((e) => j(res, 500, { message: String(e) }));
      }
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

// ---------------- fixtures ----------------
// a square ring in [lng, lat] order, like the SQL suite's sq()
const sq = (x0, y0, side) => [[x0, y0], [x0 + side, y0], [x0 + side, y0 + side], [x0, y0 + side]];
const RING = sq(-94.772, 38.858, 0.004);       // lng -94.772..-94.768, lat 38.858..38.862
const TID = "import-caller-" + crypto.randomBytes(3).toString("hex");
// twelve real-looking doors inside the ring, ~24 m apart (outside tier 4's
// 12 m) with distinct street numbers (outside tier 3) and distinct ids
const DOORS = Array.from({ length: 12 }, (_, i) => ({
  lat: 38.8590 + i * 0.0002, lng: -94.7700 - i * 0.0001,
  address: "12" + (i + 1) + " Test St", city: "Olathe", state: "KS", zip: "66061",
  source: "osm", externalId: "osm-way-" + (i + 1), placement: "building_centroid",
  propertyType: "house", eligible: true,
  // NOT on the allowlist — must never reach the wire
  ethnicity: "REDACTED-TEST", raw: { everything: "else" }, household_income: "120000",
}));
const OUTSIDE = [
  { lat: 38.870, lng: -94.770, address: "1 Far North St", source: "osm", externalId: "osm-way-north", placement: "building_centroid", eligible: true },
  { lat: 38.850, lng: -94.770, address: "1 Far South St", source: "osm", externalId: "osm-way-south", placement: "building_centroid", eligible: true },
];
const DEMO = { lat: 38.8600, lng: -94.7690, address: "999 Demo Ave", source: "demo", externalId: "demo-1", placement: "building_centroid", eligible: true };
const SCHOOL = { lat: 38.8605, lng: -94.7695, address: "Parish School", source: "osm", externalId: "osm-way-school", placement: "building_centroid", eligible: false };
const ALLOW = ["lat", "lng", "address", "city", "state", "zip", "source", "externalId", "parcelId",
  "propertyType", "owner", "yearBuilt", "sqft", "lotSqft", "lastSaleDate", "lastSalePrice",
  "placement", "eligible"].sort().join(",");

const pinsIn = () => Number(q(DB, "select count(*) from public.pins where team_id='" + TEAM + "' and territory_id='" + TID + "' and deleted_at is null"));
const unworkedIn = () => Number(q(DB, "select count(*) from public.pins where team_id='" + TEAM + "' and territory_id='" + TID + "' and deleted_at is null and disposition='unworked'"));

// ---------------- the run ----------------
(async () => {
  // ---- 0. a fresh replica copy, with 0018 proven present
  if (q("postgres", "select 1 from pg_database where datname='" + TEMPLATE + "'") !== "1"
      || q(TEMPLATE, PROCS) !== WANT_PROCS) {
    console.log("template " + TEMPLATE + " lacks 0018 — rebuilding it the way v42-territory-test.sh does");
    rebuildTemplate();
  }
  q("postgres", "drop database if exists " + DB);
  q("postgres", "create database " + DB + " template " + TEMPLATE);
  check("0a fresh replica copy carries the 0018 functions", q(DB, PROCS) === WANT_PROCS, q(DB, PROCS));
  // the mock's profile row must say what the replica says, so the client's
  // role gate and the server's rally_require_leader agree on the same fact
  const leadRole = q(DB, "select role from public.profiles where id='" + LEAD + "'");
  const johnRole = q(DB, "select role from public.profiles where id='" + JOHN + "'");
  check("0b seed identities: LEAD is leadership, JOHN is a rep",
    ["leader", "manager", "owner"].includes(leadRole) && johnRole === "rep",
    "LEAD=" + leadRole + " JOHN=" + johnRole);
  // the hood, inserted the way the SQL suite's mk() does it
  q(DB, "insert into public.territories (team_id, id, name, polygon, archived, data, assignees, assignees_rev, open_assignees, created_by) values ('"
    + TEAM + "', " + dq(TID) + ", " + dq(TID) + ", " + dq(JSON.stringify(RING)) + "::jsonb, false, '{}'::jsonb, '{\"entries\":[]}'::jsonb, 0, '{}'::uuid[], '" + LEAD + "')");
  check("0c the hood exists on the replica with a usable outline",
    q(DB, "select geom is not null and seq is not null from public.territories where team_id='" + TEAM + "' and id=" + dq(TID)) === "t");
  check("0d and holds no doors yet", pinsIn() === 0);

  mock.users["lead@x.com"] = { id: LEAD, password: "knock1234" };
  mock.users["john@x.com"] = { id: JOHN, password: "knock1234" };
  mock.profiles[LEAD] = { id: LEAD, team_id: TEAM, role: leadRole, name: "Lead Three", email: "lead@x.com", disabled: false };
  mock.profiles[JOHN] = { id: JOHN, team_id: TEAM, role: johnRole, name: "John One", email: "john@x.com", disabled: false };

  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // NOTHING leaves localhost: not the shipped Supabase project in
  // cloud-config.js, not Google Fonts, not a tile server.
  const blocked = [];
  await ctx.route(/^https?:\/\/(?!localhost(?::\d+)?\/)/, (r) => { blocked.push(r.request().url()); r.abort(); });
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
  });
  // cloud-config.js honours a pre-set RALLY_CLOUD, so this replaces the
  // shipped project keys before any app script runs
  await ctx.addInitScript(`window.RALLY_CLOUD = { url: "http://localhost:${PORT}", anonKey: "test-anon" };`);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));

  // ---- 1. boot and sign in as the leader
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
  await page.fill("#gate-email", "lead@x.com"); await page.fill("#gate-pass", "knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 20000 });
  // let the first sync cycle ask the (real) rally_capabilities
  await page.waitForFunction(() => window.MSYNC && MSYNC.capability && MSYNC.capability("assignmentServerAuthoritative"),
    null, { timeout: 8000 }).catch(() => {});
  const boot = await page.evaluate(() => ({
    canManage: STORE.canManageTerritories(), enabled: MCLOUD.enabled(),
    role: STORE.roleState, online: navigator.onLine,
    gate: STORE.turfGate({ needsServer: true }),
    cloudUrl: (window.RALLY_CLOUD || {}).url,
  }));
  check("1a the app boots with a team server and a signed-in leader (canManageTerritories, MCLOUD.enabled)",
    boot.canManage === true && boot.enabled === true, JSON.stringify(boot));
  check("1b the role came from the server, not a local default",
    boot.role.mode === "server" && boot.role.role === leadRole, JSON.stringify(boot.role));
  check("1c turfGate({needsServer}) is open, and the capability latch was set by the REAL rally_capabilities",
    boot.gate.ok && boot.gate.code === "authoritative"
      && mock.rpcLog.some((r) => r.name === "rally_capabilities" && r.status === 200 && r.data.assignmentServerAuthoritative === true),
    JSON.stringify(boot.gate));
  check("1d the client is pointed at localhost only", /^http:\/\/localhost:/.test(boot.cloudUrl), boot.cloudUrl);

  const importVia = (doors, op) => page.evaluate(
    ({ doors, tid, op }) => STORE.importDoorsServer(doors, { territoryId: tid, operationId: op })
      .then((r) => ({ res: r })).catch((e) => ({ err: e.message })),
    { doors, tid: TID, op });
  const lastRpc = (name) => mock.rpcLog.filter((r) => r.name === name).pop();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // ---- 2. twelve real doors
  const OP1 = "op-" + crypto.randomBytes(4).toString("hex");
  const r1 = await importVia(DOORS, OP1);
  const s1 = lastRpc("import_territory_doors");
  check("2a importDoorsServer(12 doors) returns {added:12, matched:0, outside:0, ineligible:0, unusable:0, pages:1}",
    same(r1.res, { added: 12, matched: 0, outside: 0, ineligible: 0, unusable: 0, pages: 1 }), JSON.stringify(r1));
  check("2b the REAL function answered status ok with inserted 12 (sent 12)",
    s1 && s1.status === 200 && s1.data.status === "ok" && s1.data.counts.inserted === 12 && s1.data.counts.sent === 12,
    s1 && JSON.stringify(s1.data));
  check("2c the replica now holds 12 pins for the hood, all unworked", pinsIn() === 12 && unworkedIn() === 12,
    "pins=" + pinsIn() + " unworked=" + unworkedIn());
  check("2d the client sent the page under operation id <run>-0, as the server ledger records it",
    s1 && s1.body.p_operation_id === OP1 + "-0"
      && q(DB, "select count(*) from public.rally_operations where team_id='" + TEAM + "' and kind='territory_import' and op_id=" + dq(OP1 + "-0")) === "1",
    s1 && s1.body.p_operation_id);
  check("2e the stored doors carry the allowlisted attributes the client sent",
    q(DB, "select count(*) from public.pins where territory_id=" + dq(TID) + " and data->'prop'->>'source'='osm' and data->'prop'->>'placement'='building_centroid' and data->'geo'->>'zip'='66061' and data->'prop'->>'externalId' like 'osm-way-%'") === "12");
  check("2f the client wrote NO pin locally — doors arrive only via a pull",
    (await page.evaluate(() => STORE.pins.length)) === 0);

  // ---- 3. the same operation id again: answered from the ledger
  const r2 = await importVia(DOORS, OP1);
  const s2 = lastRpc("import_territory_doors");
  check("3a a retry with the SAME operationId returns the same counts",
    same(r2.res, r1.res), JSON.stringify(r2));
  check("3b and the server answered already_committed from rally_operations",
    s2 && s2.status === 200 && s2.data.status === "already_committed" && s2.data.counts.inserted === 12,
    s2 && JSON.stringify(s2.data));
  check("3c the replica STILL holds exactly 12 pins", pinsIn() === 12, "pins=" + pinsIn());

  // ---- 4. a new operation id, the same doors: all matched, none added
  const OP2 = "op-" + crypto.randomBytes(4).toString("hex");
  const r3 = await importVia(DOORS, OP2);
  const s3 = lastRpc("import_territory_doors");
  check("4a a NEW operationId with the same 12 doors returns matched:12, added:0",
    same(r3.res, { added: 0, matched: 12, outside: 0, ineligible: 0, unusable: 0, pages: 1 }), JSON.stringify(r3));
  check("4b the server ran the import (status ok) rather than replaying",
    s3 && s3.data.status === "ok" && s3.data.counts.matched === 12, s3 && JSON.stringify(s3.data));
  check("4c the replica STILL holds exactly 12 pins — no duplicates", pinsIn() === 12, "pins=" + pinsIn());
  check("4d …and no two pins share a provider id",
    q(DB, "select count(distinct data->'prop'->>'externalId') from public.pins where territory_id=" + dq(TID)) === "12");

  // ---- 5. two doors outside the ring, one synthetic door
  const OP3 = "op-" + crypto.randomBytes(4).toString("hex");
  const r4 = await importVia(OUTSIDE.concat([DEMO]), OP3);
  const s4 = lastRpc("import_territory_doors");
  const c4 = (s4 && s4.data && s4.data.counts) || {};
  check("5a two doors outside the ring are refused: the client reports outside:2, added:0",
    r4.res && r4.res.outside === 2 && r4.res.added === 0 && r4.res.matched === 0, JSON.stringify(r4));
  check("5b the server counted them outside:2 and did not raise", s4 && s4.status === 200 && c4.outside === 2,
    s4 && JSON.stringify(s4.data));
  check("5c the source:'demo' door: the server does NOT raise — it counts it as ineligible:1 (unusable stays 0)",
    s4 && s4.status === 200 && c4.ineligible === 1 && c4.unusable === 0 && c4.inserted === 0,
    "server counts=" + JSON.stringify(c4));
  check("5d …and the client surfaces it as ineligible:1, kept separate from unusable:0",
    r4.res && r4.res.ineligible === 1 && r4.res.unusable === 0, JSON.stringify(r4));
  check("5e the replica still holds 12 pins and no demo record",
    pinsIn() === 12 && q(DB, "select count(*) from public.pins where team_id='" + TEAM + "' and data->'prop'->>'source'='demo'") === "0",
    "pins=" + pinsIn());
  check("5f neither outside door exists anywhere on the replica",
    q(DB, "select count(*) from public.pins where address in ('1 Far North St','1 Far South St')") === "0");

  // ---- 6. a door the provider judged non-residential
  const OP4 = "op-" + crypto.randomBytes(4).toString("hex");
  const r5 = await importVia([SCHOOL], OP4);
  const s5 = lastRpc("import_territory_doors");
  const c5 = (s5 && s5.data && s5.data.counts) || {};
  check("6a eligible:false crosses the wire as boolean false", s5 && s5.body.p_doors[0].eligible === false,
    s5 && JSON.stringify(s5.body.p_doors[0]));
  check("6b the server refuses it as ineligible:1, inserted:0 (no error)",
    s5 && s5.status === 200 && c5.ineligible === 1 && c5.inserted === 0, "server counts=" + JSON.stringify(c5));
  check("6c the client reports added:0, ineligible:1, unusable:0",
    r5.res && r5.res.added === 0 && r5.res.ineligible === 1 && r5.res.unusable === 0, JSON.stringify(r5));
  check("6d it was not inserted: still 12 pins, none at 'Parish School'",
    pinsIn() === 12 && q(DB, "select count(*) from public.pins where address='Parish School'") === "0");

  // ---- 7. the rep: same SQL, JOHN's claim
  const OP5 = "op-" + crypto.randomBytes(4).toString("hex");
  const rep = await asUser(DB, JOHN, "select public.import_territory_doors(" + dq(TID) + ", "
    + dq(JSON.stringify(DOORS.slice(0, 2))) + "::jsonb, " + dq(OP5) + ");");
  check("7a a REP claim calling the RPC is refused", !rep.ok && /ERROR/.test(rep.err), rep.err.split("\n")[0]);
  check("7b …and the refusal names the leader requirement",
    /requires leader, manager or owner/.test(rep.err) && /42501/.test(rep.err), rep.err.split("\n")[0]);
  check("7c and wrote nothing: still 12 pins, no ledger row for the rep's operation",
    pinsIn() === 12 && q(DB, "select count(*) from public.rally_operations where op_id=" + dq(OP5)) === "0");

  // ---- 8. the wire: only the allowlisted keys, nothing the caller added
  const doorsOnWire = s1 ? s1.body.p_doors : [];
  const keySets = [...new Set(doorsOnWire.map((d) => Object.keys(d).sort().join(",")))];
  check("8a every door on the wire carries EXACTLY the allowlisted keys",
    doorsOnWire.length === 12 && keySets.length === 1 && keySets[0] === ALLOW, keySets.join(" | "));
  check("8b the RPC body is exactly {p_territory_id, p_doors, p_operation_id}",
    s1 && Object.keys(s1.body).sort().join(",") === "p_doors,p_operation_id,p_territory_id" && s1.body.p_territory_id === TID,
    s1 && Object.keys(s1.body).join(","));
  check("8c the junk the caller attached (ethnicity, raw, household_income) never crossed the wire",
    !mock.rawBodies.some((b) => /REDACTED-TEST|household_income|ethnicity|everything/.test(b)));
  check("8d …and is not on the replica either",
    q(DB, "select count(*) from public.pins where data::text like '%REDACTED-TEST%' or data::text like '%household_income%'") === "0");
  check("8e absent optional fields were sent as empty strings, the shape the RPC reads",
    doorsOnWire.every((d) => d.parcelId === "" && d.owner === "" && d.yearBuilt === "" && d.lat === Number(d.lat)));

  // ---- bonus: the same client path reads the hood back through the real summary RPC
  const sum = await page.evaluate((tid) => STORE.territorySummary({ id: tid }), TID);
  check("9a STORE.territorySummary through the real rally_territory_summary reports 12 houses from the server",
    sum && sum.source === "server" && sum.houses === 12 && sum.sales === 0 && sum.outlineMissing === false,
    JSON.stringify(sum));

  // ---- 9. hygiene
  check("9b no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  check("9d no request was even attempted to the shipped Supabase project (or any *.supabase.co)",
    !blocked.some((u) => /supabase\.co/.test(u)), blocked.filter((u) => /supabase\.co/.test(u)).slice(0, 3).join(" | "));
  check("9c every RPC the client made was answered by the replica (none fell to a fake)",
    mock.rpcLog.length > 0 && mock.rpcLog.every((r) => r.status === 200),
    mock.rpcLog.map((r) => r.name + ":" + r.status).join(","));

  console.log("\n0018 LOCAL REPLICA ONLY — production does not have 0018");
  console.log("hood " + TID + " on " + DB + " (copy of " + TEMPLATE + "), leader role from replica: " + leadRole);
  ok.forEach((x) => console.log("  ✓ " + x));
  bad.forEach((x) => console.log("  ✗ " + x));
  console.log("\n" + ok.length + " passed, " + bad.length + " failed");
  await browser.close(); server.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
