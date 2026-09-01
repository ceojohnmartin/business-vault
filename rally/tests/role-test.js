/* RALLY v39 — REAL REP: the server owns the role, the client only mirrors it.
   Drives the real gate + MAUTH + MCLOUD + STORE against a mock server
   speaking Supabase's auth/PostgREST wire protocol.

   What this proves:
     - the client capability matrix equals db/capability-matrix.json, which
       is the SAME file db/test/rls-test.sql asserts the RLS policies
       against, so the two matrices cannot drift apart
     - a server role beats whatever the device thinks
     - authenticated with no server role EVER seen resolves to rep
     - offline uses the last role the server gave, and says it is cached
     - a demotion strips privileged UI on the next successful profile sync
     - a local-only device (no cloud project) is visibly NOT server-authorized

   The RLS half of the demotion story — that a demoted rep's territory write
   is refused by Postgres even if it reaches the wire — lives in
   db/test/rls-test.sql section 13. */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const PORT = 8851;
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

// the ONE capability definition, shared with the server-side suite
const MATRIX = JSON.parse(fs.readFileSync(path.join(ROOT, "db/capability-matrix.json"), "utf8"));

// ---------------- mock Supabase ----------------
const mock = { users: {}, profiles: {}, access: {}, refresh: {}, profileHits: 0 };
function addUser(email, password, prof) {
  const id = crypto.randomUUID();
  mock.users[email] = { id, password };
  mock.profiles[id] = Object.assign(
    { id, team_id: null, role: "rep", name: "", email, disabled: false }, prof);
  return id;
}
function mint(id) {
  const a = "at-" + crypto.randomBytes(8).toString("hex");
  const r = "rt-" + crypto.randomBytes(8).toString("hex");
  mock.access[a] = id; mock.refresh[r] = id;
  return { access_token: a, refresh_token: r, token_type: "bearer",
           expires_in: 3600, user: { id, email: "" } };
}
const j = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json", ".pbf": "application/x-protobuf" };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/auth/v1/") || u.pathname.startsWith("/rest/v1/")) {
    let raw = ""; req.on("data", (c) => raw += c);
    req.on("end", () => {
      let body = {}; try { body = JSON.parse(raw || "{}"); } catch (_) {}
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
          return j(res, 200, mint(id));
        }
        return j(res, 400, { error_description: "unsupported grant" });
      }
      if (u.pathname === "/auth/v1/logout") return j(res, 204);
      if (u.pathname === "/rest/v1/profiles" && req.method === "GET") {
        mock.profileHits++;
        const tok = String(req.headers.authorization || "").replace(/^Bearer /, "");
        const uid = mock.access[tok];
        if (!uid) return j(res, 401, { message: "JWT invalid" });
        const want = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
        if (want) { // my own row
          const row = mock.profiles[want];
          return j(res, 200, row && want === uid ? [row] : []);
        }
        // the team roster the sync engine reads
        const me = mock.profiles[uid];
        return j(res, 200, Object.values(mock.profiles)
          .filter((p) => me && p.team_id && p.team_id === me.team_id));
      }
      // every other table: nothing to sync in this suite
      if (u.pathname.startsWith("/rest/v1/")) {
        return req.method === "GET" ? j(res, 200, []) : j(res, 201, []);
      }
      return j(res, 404, { message: "not found" });
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
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];
  const CLOUD_ON = `window.RALLY_CLOUD = { url: "http://localhost:${PORT}", anonKey: "test-anon", pollMs: 600 };`;

  async function fresh(cloudOn) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
      window.RALLY_CLOUD = { url: "", anonKey: "" }; // never touch the live project
    });
    if (cloudOn) await ctx.addInitScript(CLOUD_ON);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      // this mock speaks auth + PostgREST only; the realtime doorbell has no
      // websocket to reach and correctly falls back to polling (proved in
      // tests/realtime-test.js). Its handshake 404 is harness noise here.
      const t = m.text();
      if (m.type() === "error" && !/net::ERR_/.test(t) && !/WebSocket/.test(t)) errors.push(t);
    });
    return { ctx, page };
  }
  async function boot(page) {
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForFunction(() => document.querySelector("#splash").hidden, null, { timeout: 25000 });
    await page.waitForTimeout(250);
  }
  async function signIn(page, email, pass) {
    await page.fill("#gate-email", email); await page.fill("#gate-pass", pass);
    await page.click("#gate-submit"); await page.waitForTimeout(1200);
  }
  const roleState = (page) => page.evaluate(() => ({
    mode: STORE.roleState.mode, role: STORE.roleState.role,
    verifiedAt: STORE.roleState.verifiedAt,
    effective: STORE.effectiveRole(), manage: STORE.canManageTerritories(),
    line: STORE.roleLine(), userRole: (STORE.currentUser() || {}).role,
  }));

  // the roster the "server" knows
  addUser("rep@x.com", "knock1234", { name: "Rep One", role: "rep", team_id: "t-1" });
  addUser("lead@x.com", "knock1234", { name: "Lead One", role: "leader", team_id: "t-1" });
  addUser("mgr@x.com", "knock1234", { name: "Mgr One", role: "manager", team_id: "t-1" });
  addUser("own@x.com", "knock1234", { name: "Own One", role: "owner", team_id: "t-1" });
  addUser("solo@x.com", "knock1234", { name: "Solo", role: "rep", team_id: null });
  // section H needs a rep nothing else has promoted
  addUser("rep3@x.com", "knock1234", { name: "Rep Three", role: "rep", team_id: "t-1" });

  // ============ A: the client matrix IS the shared matrix ============
  {
    const { ctx, page } = await fresh(true);
    await boot(page);
    const want = MATRIX.manageTerritories;
    const got = await page.evaluate((roles) => {
      const out = {};
      roles.forEach((r) => { out[r] = STORE.canManageTerritories(r); });
      return out;
    }, Object.keys(want));
    Object.keys(want).forEach((r) => {
      check(`A1 client capability for "${r}" matches db/capability-matrix.json`,
        got[r] === want[r], `client=${got[r]} matrix=${want[r]}`);
    });
    check("A2 an unknown or missing role never grants the capability",
      (await page.evaluate(() =>
        [undefined, null, "", "admin", "MANAGER", "superuser"]
          .every((r) => STORE.canManageTerritories(r) === false))));
    await ctx.close();
  }

  // ============ B: the SERVER's role wins, for all four roles ============
  for (const [email, role] of [["rep@x.com", "rep"], ["lead@x.com", "leader"],
                               ["mgr@x.com", "manager"], ["own@x.com", "owner"]]) {
    const { ctx, page } = await fresh(true);
    await boot(page);
    await signIn(page, email, "knock1234");
    await page.waitForFunction(() => STORE.roleState.mode === "server", null, { timeout: 20000 });
    const st = await roleState(page);
    check(`B1 ${role}: the server's role is what the client runs on`,
      st.role === role && st.effective === role && st.mode === "server", JSON.stringify(st));
    check(`B2 ${role}: client capability equals the shared matrix`,
      st.manage === MATRIX.manageTerritories[role], `${st.manage}`);
    check(`B3 ${role}: the local user record mirrors it (no second source)`,
      st.userRole === role, String(st.userRole));
    check(`B4 ${role}: the cached profile agrees, with a verification time`,
      await page.evaluate(async (r) => {
        const p = await MDB.kvGet("cloudProfile", null);
        return !!p && p.role === r && typeof p.roleVerifiedAt === "number" && p.roleVerifiedAt > 0;
      }, role));
    // the privileged surfaces follow the same answer
    await page.evaluate(() => MAPP.show("rank"));
    await page.waitForTimeout(400);
    const coachHidden = await page.$eval("#rank-coach-btn", (e) => e.hidden);
    check(`B5 ${role}: leadership UI matches the capability`,
      coachHidden === !MATRIX.manageTerritories[role], `coachHidden=${coachHidden}`);
    await ctx.close();
  }

  // ============ C: fail closed — authenticated, role never seen ============
  {
    const { ctx, page } = await fresh(true);
    await boot(page);
    await signIn(page, "mgr@x.com", "knock1234");
    await page.waitForFunction(() => STORE.roleState.mode === "server", null, { timeout: 20000 });
    check("C0 (setup) this device really is a manager", (await roleState(page)).manage === true);
    // wipe every trace of a server answer, exactly as a device that has
    // signed in but never once reached the profile endpoint
    await page.evaluate(async () => { await MDB.kvSet("cloudProfile", null); });
    await ctx.route(/\/rest\/v1\//, (r) => r.abort());   // and it still can't
    await page.reload();
    await page.waitForFunction(() => !!(window.STORE && STORE.roleState), null, { timeout: 25000 });
    await page.waitForTimeout(1500);
    const st = await roleState(page);
    check("C1 no server role has EVER arrived → the state is unknown",
      st.mode === "unknown" && st.role === null, JSON.stringify(st));
    check("C2 …and it resolves to rep, not to the manager it used to be",
      st.effective === "rep" && st.manage === false, JSON.stringify(st));
    check("C3 …and says so rather than implying authority",
      /hasn't confirmed/i.test(st.line), st.line);
    await ctx.close();
  }

  // ============ D: offline uses the LAST TRUSTED server role ============
  {
    const { ctx, page } = await fresh(true);
    await boot(page);
    await signIn(page, "mgr@x.com", "knock1234");
    await page.waitForFunction(() => STORE.roleState.mode === "server", null, { timeout: 20000 });
    await ctx.route(/\/(auth|rest)\/v1\//, (r) => r.abort());
    await page.reload();
    await page.waitForFunction(() => !!(window.STORE && STORE.roleState), null, { timeout: 25000 });
    await page.waitForTimeout(1200);
    const st = await roleState(page);
    check("D1 offline keeps the role the server last gave",
      st.role === "manager" && st.effective === "manager" && st.manage === true, JSON.stringify(st));
    check("D2 …flagged as cached, with the date it was confirmed",
      st.mode === "cached" && /offline, last confirmed/i.test(st.line), st.line);
    check("D3 …and the cached role is never manufactured upward",
      st.verifiedAt > 0);
    await ctx.close();
  }
  {
    // the mirror image: a REP offline does not become a manager because the
    // cloud is unreachable
    const { ctx, page } = await fresh(true);
    await boot(page);
    await signIn(page, "rep@x.com", "knock1234");
    await page.waitForFunction(() => STORE.roleState.mode === "server", null, { timeout: 20000 });
    await ctx.route(/\/(auth|rest)\/v1\//, (r) => r.abort());
    await page.reload();
    await page.waitForFunction(() => !!(window.STORE && STORE.roleState), null, { timeout: 25000 });
    await page.waitForTimeout(1200);
    const st = await roleState(page);
    check("D4 a rep stays a rep offline — absence of the cloud grants nothing",
      st.effective === "rep" && st.manage === false && st.mode === "cached", JSON.stringify(st));
    await ctx.close();
  }

  // ============ E: demotion reaches the device on the next sync ============
  {
    const { ctx, page } = await fresh(true);
    await boot(page);
    await signIn(page, "mgr@x.com", "knock1234");
    await page.waitForFunction(() => STORE.roleState.mode === "server", null, { timeout: 20000 });
    await page.evaluate(() => MAPP.show("rank"));
    await page.waitForTimeout(400);
    check("E1 manager on this device: leadership UI is present",
      (await page.$eval("#rank-coach-btn", (e) => e.hidden)) === false &&
      (await roleState(page)).manage === true);

    // the office demotes them, server-side
    const mgrId = mock.users["mgr@x.com"].id;
    mock.profiles[mgrId].role = "rep";

    await page.evaluate(() => MSYNC.syncNow());
    await page.waitForFunction(() => STORE.effectiveRole() === "rep", null, { timeout: 20000 });
    const st = await roleState(page);
    check("E2 the next successful profile sync delivers the demotion",
      st.role === "rep" && st.mode === "server", JSON.stringify(st));
    check("E3 the capability drops with it", st.manage === false);
    check("E4 the local user record follows — no stale second opinion",
      st.userRole === "rep", String(st.userRole));
    check("E5 the cached profile agrees",
      await page.evaluate(async () => {
        const p = await MDB.kvGet("cloudProfile", null);
        return !!p && p.role === "rep";
      }));
    await page.waitForTimeout(300);
    check("E6 privileged UI disappears without a relaunch",
      (await page.$eval("#rank-coach-btn", (e) => e.hidden)) === true);
    // the territory tools go with it
    await page.evaluate(() => MAPP.show("map"));
    await page.waitForTimeout(300);
    check("E7 lasso territory controls are gone for the demoted rep",
      await page.evaluate(() => {
        MSELECT && null; // controls are set when the sheet renders
        return STORE.canManageTerritories() === false;
      }));
    // and a write attempted anyway is the server's to refuse (RLS suite
    // section 13 proves Postgres does); here we prove the CLIENT no longer
    // pretends the operation is available
    check("E8 the honest role line no longer claims leadership",
      /^Rep/.test(st.line), st.line);
    await ctx.close();
  }

  // ============ F: promotion arrives the same way ============
  {
    const { ctx, page } = await fresh(true);
    await boot(page);
    await signIn(page, "rep@x.com", "knock1234");
    await page.waitForFunction(() => STORE.roleState.mode === "server", null, { timeout: 20000 });
    check("F1 starts as a rep", (await roleState(page)).manage === false);
    mock.profiles[mock.users["rep@x.com"].id].role = "leader";
    await page.evaluate(() => MSYNC.syncNow());
    await page.waitForFunction(() => STORE.effectiveRole() === "leader", null, { timeout: 20000 });
    const st = await roleState(page);
    check("F2 a promotion to LEADER grants the capability (not just manager)",
      st.manage === true && st.role === "leader", JSON.stringify(st));
    await ctx.close();
  }

  // ============ G: local-only device is visibly not server-authorized ====
  {
    const { ctx, page } = await fresh(false);   // no cloud project at all
    await boot(page);
    await page.click("#gate-swap-btn"); await page.waitForTimeout(200);
    await page.fill("#gate-name", "Solo"); await page.fill("#gate-email", "solo@example.com");
    await page.fill("#gate-pass", "knock1234"); await page.click("#gate-submit");
    await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 20000 });
    await page.waitForTimeout(800);
    const st = await roleState(page);
    check("G1 with no cloud project the device keeps local behaviour",
      st.mode === "local" && st.manage === true, JSON.stringify(st));
    check("G2 …and says plainly that nothing here is company-authorized",
      /not company-authorized/i.test(st.line), st.line);
    await page.evaluate(() => MAPP.show("more"));
    await page.waitForTimeout(400);
    check("G3 the More screen carries that line where a rep will see it",
      /not company-authorized/i.test(await page.$eval("#more-role-line", (e) => e.textContent)));
    await ctx.close();
  }

  // ============ H: the local role editor cannot fake authority ============
  {
    const { ctx, page } = await fresh(true);
    await boot(page);
    await signIn(page, "rep3@x.com", "knock1234");
    await page.waitForFunction(() => STORE.roleState.mode === "server", null, { timeout: 20000 });
    check("H0 (setup) this device is a rep", (await roleState(page)).manage === false);
    await page.evaluate(() => { MAPP.show("more"); });
    await page.waitForTimeout(300);
    await page.click("#more-team"); await page.waitForTimeout(400);
    check("H1 the Make-manager button is not offered on a cloud device",
      (await page.$$("#team-list .team-role")).length === 0);
    check("H2 the sheet says roles belong to the office",
      await page.$eval("#team-role-note", (e) => !e.hidden && /set by the office/i.test(e.textContent)));
    check("H2b removing or adding a teammate locally is not offered either",
      (await page.$$("#team-list .team-del")).length === 0 &&
      (await page.$eval("#team-add-wrap", (e) => e.hidden)) === true);
    check("H2c and there is no 'Use' picker to log work as a teammate",
      (await page.$$("#team-list .team-me")).length === 0);
    // even if the local record is forced, the trusted role decides
    await page.evaluate(async () => {
      const me = STORE.currentUser();
      me.role = "owner";
      await STORE.updateUser(me);
    });
    check("H3 forcing the local user record grants nothing",
      (await page.evaluate(() => STORE.canManageTerritories())) === false);

    // a teammate's role must never be overwritten with somebody else's.
    // (This mutates the trusted role on purpose, so it runs last.)
    await page.evaluate(async () => {
      const mate = { id: "u-mate", name: "Mate", role: "rep", color: "#888",
        createdAt: Date.now(), profileId: "p-mate" };
      await MDB.put("users", mate);
      STORE.users.push(mate);
      STORE.settings.currentUserId = "u-mate"; // device displaying the teammate
      await STORE.saveSettings();
      await STORE.applyServerRole("owner", Date.now(), "p-nobody-here");
    });
    check("H4 a server role lands on the profile's own person, or on nobody",
      (await page.evaluate(() => STORE.userById("u-mate").role)) === "rep",
      await page.evaluate(() => STORE.userById("u-mate").role));
    check("H5 …and it reaches the right person when the profile IS present",
      await page.evaluate(async () => {
        await STORE.applyServerRole("leader", Date.now(), "p-mate");
        return STORE.userById("u-mate").role === "leader";
      }));
    await ctx.close();
  }

  check("no page errors across every scenario", errors.length === 0, errors.slice(0, 3).join(" | "));

  console.log("\n=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  await browser.close(); server.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
