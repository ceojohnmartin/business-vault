/* Phase 1 — cloud auth bridge test. Drives the REAL gate + MAUTH + MCLOUD
   against a mock server speaking Supabase's auth/rest wire protocol
   (password grant, refresh, signup, logout, PostgREST profile reads).

   "Offline" is emulated by aborting only the cloud routes: in the field
   the app shell comes from the service worker cache, so what offline
   actually means to the auth logic is "the cloud is unreachable". */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const PORT = 8846;
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

// ---------------- mock Supabase (auth + one PostgREST table) ----------------
const mock = {
  users: {},      // email -> { id, password, name, confirmRequired }
  profiles: {},   // id -> { id, team_id, role, name, email, disabled }
  access: {},     // token -> userId
  refresh: {},    // token -> userId
  authHits: 0, logoutHits: 0,
};
function addUser(email, password, prof) {
  const id = crypto.randomUUID();
  mock.users[email] = { id, password, name: (prof && prof.name) || "" };
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
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
  ".pbf": "application/x-protobuf" };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/auth/v1/") || u.pathname.startsWith("/rest/v1/")) {
    let raw = "";
    req.on("data", (c) => raw += c);
    req.on("end", () => {
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch (_) {}
      if (u.pathname === "/auth/v1/token") {
        mock.authHits++;
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
      if (u.pathname === "/auth/v1/signup") {
        mock.authHits++;
        const email = String(body.email || "").toLowerCase();
        if (mock.users[email]) return j(res, 400, { error_description: "User already registered" });
        const id = addUser(email, body.password, { name: (body.data && body.data.name) || "" });
        if (mock.confirmRequired) return j(res, 200, { id, email }); // no session
        const s = mint(id); s.user.email = email;
        return j(res, 200, s);
      }
      if (u.pathname === "/auth/v1/logout") { mock.logoutHits++; return j(res, 204); }
      if (u.pathname === "/rest/v1/profiles" && req.method === "GET") {
        const tok = String(req.headers.authorization || "").replace(/^Bearer /, "");
        const uid = mock.access[tok];
        if (!uid) return j(res, 401, { message: "JWT invalid" });
        const want = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
        const row = mock.profiles[want];
        // RLS shape: you only ever get your own row back in Phase 1
        return j(res, 200, row && want === uid ? [row] : []);
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

// ---------------- the run ----------------
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];

  const CLOUD_ON = `window.RALLY_CLOUD = { url: "http://localhost:${PORT}", anonKey: "test-anon" };`;
  async function fresh(cloudOn) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    });
    if (cloudOn) await ctx.addInitScript(CLOUD_ON);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    return { ctx, page };
  }
  const goOffline = (ctx) => ctx.route(/\/(auth|rest)\/v1\//, (r) => r.abort());
  const goOnline = (ctx) => ctx.unroute(/\/(auth|rest)\/v1\//);
  const gateOpen = (page) => page.$eval("#gate", (e) => !e.hidden).catch(() => false);
  const gateMsg = (page) => page.$eval("#gate-msg", (e) => e.textContent.trim());
  async function boot(page) {
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForFunction(() => document.querySelector("#splash").hidden, null, { timeout: 25000 });
    await page.waitForTimeout(250);
  }
  async function trySignIn(page, email, pass) {
    await page.fill("#gate-email", email); await page.fill("#gate-pass", pass);
    await page.click("#gate-submit"); await page.waitForTimeout(900);
  }
  const kv = (page, k) => page.evaluate((key) => MDB.kvGet(key, null), k);

  // the roster the "server" knows
  const repId = addUser("rep@x.com", "knock1234", { name: "Rep One", role: "rep", team_id: "t-1" });
  addUser("dana@x.com", "knock1234", { name: "Dana", role: "rep", team_id: "t-1", disabled: true });
  const rep2Id = addUser("rep2@x.com", "knock1234", { name: "Rep Two", role: "rep", team_id: "t-1" });

  // ============ A: main online/offline lifecycle on one device ============
  {
    const { ctx, page } = await fresh(true);
    await boot(page);
    check("A1 fresh device lands on the sign-in gate", await gateOpen(page));
    await trySignIn(page, "rep@x.com", "knock1234");
    check("A2 online sign-in unlocks", !(await gateOpen(page)));
    const t = await kv(page, "cloudSession");
    check("A3 cloud tokens stored after sign-in", !!(t && t.access && t.refresh && t.userId === repId));
    const p = await kv(page, "cloudProfile");
    check("A4 profile cached (role comes from the server)", !!(p && p.role === "rep" && p.id === repId));
    const acct = await kv(page, "account");
    check("A5 device verifier bound to the cloud user", !!(acct && acct.cloudUserId === repId && acct.hash && !acct.hash.includes("knock1234")));

    await page.reload(); await page.waitForTimeout(1200);
    check("A6 reload stays signed in (session persistence)", !(await gateOpen(page)));

    await goOffline(ctx);
    await page.reload(); await page.waitForTimeout(1200);
    check("A7 offline reopen after prior auth stays signed in", !(await gateOpen(page)));

    await goOnline(ctx);
    const beforeLogout = mock.logoutHits;
    await page.evaluate(() => { MGATE.lock(); }).catch(() => {});
    await page.waitForSelector("#gate:not([hidden])", { timeout: 15000 });
    await page.waitForTimeout(600);
    check("A8 sign out returns to the gate", await gateOpen(page));
    check("A9 sign out clears cloud tokens", (await kv(page, "cloudSession")) === null);
    check("A10 sign out told the server", mock.logoutHits > beforeLogout);

    await goOffline(ctx);
    await trySignIn(page, "rep@x.com", "knock1234");
    check("A11 OFFLINE sign-in works on a previously-authenticated device", !(await gateOpen(page)));
    await page.evaluate(() => { MGATE.lock(); }).catch(() => {});
    await page.waitForSelector("#gate:not([hidden])", { timeout: 15000 });
    await trySignIn(page, "rep@x.com", "wrong-pass");
    check("A12 offline sign-in with a wrong passcode is refused", await gateOpen(page),
      await gateMsg(page));

    await goOnline(ctx);
    await trySignIn(page, "rep@x.com", "wrong-pass");
    check("A13 online sign-in with bad credentials is refused generically",
      (await gateOpen(page)) && /don't match/.test(await gateMsg(page)));
    await trySignIn(page, "rep@x.com", "knock1234");
    check("A14 correct credentials recover after failures", !(await gateOpen(page)));
    await ctx.close();
  }

  // ============ B: brand-new device, offline — no way in ============
  {
    const { ctx, page } = await fresh(true);
    await goOffline(ctx);
    await boot(page);
    await trySignIn(page, "rep@x.com", "knock1234");
    check("B1 first-time device offline: sign-in blocked", await gateOpen(page));
    check("B2 …with an honest explanation", /offline/i.test(await gateMsg(page)),
      await gateMsg(page));
    await page.click("#gate-swap-btn"); await page.waitForTimeout(200);
    await page.fill("#gate-name", "Stranger");
    await trySignIn(page, "stranger@x.com", "knock1234");
    check("B3 first-time device offline: account creation blocked",
      (await gateOpen(page)) && /connection/i.test(await gateMsg(page)),
      await gateMsg(page));
    await ctx.close();
  }

  // ============ C: disabled accounts + confirm-email signup ============
  {
    const { ctx, page } = await fresh(true);
    await boot(page);
    await trySignIn(page, "dana@x.com", "knock1234");
    check("C1 a disabled account cannot sign in even with the right passcode",
      (await gateOpen(page)) && /disabled/i.test(await gateMsg(page)),
      await gateMsg(page));
    check("C2 no cloud tokens survive a disabled sign-in", (await kv(page, "cloudSession")) === null);

    mock.confirmRequired = true;
    await page.click("#gate-swap-btn"); await page.waitForTimeout(200);
    await page.fill("#gate-name", "New Rep");
    await trySignIn(page, "newrep@x.com", "knock1234");
    const cmsg = await gateMsg(page);
    check("C3 signup with email-confirmation on: told to confirm, still gated",
      (await gateOpen(page)) && /email/i.test(cmsg), cmsg);
    check("C4 …and the form swapped back to sign-in",
      (await page.$eval("#gate-title", (e) => e.textContent)) === "Sign in");
    mock.confirmRequired = false;
    await ctx.close();
  }

  // ============ D: disabled AFTER sign-in → next online open locks ============
  {
    const { ctx, page } = await fresh(true);
    await boot(page);
    await trySignIn(page, "rep2@x.com", "knock1234");
    check("D1 rep2 signs in fine while enabled", !(await gateOpen(page)));

    // while we're signed in: the backup must carry NO cloud secrets
    const payload = await page.evaluate(async () => {
      const orig = MUI.shareOrDownload;
      let captured = null;
      MUI.shareOrDownload = async (text) => { captured = text; return true; };
      await MVAULT.backup();
      MUI.shareOrDownload = orig;
      return captured;
    });
    const tok = await kv(page, "cloudSession");
    check("D2 backup excludes cloud tokens and profile",
      !!payload && !payload.includes("cloudSession") && !payload.includes("cloudProfile")
      && !!tok && !payload.includes(tok.access) && !payload.includes(tok.refresh));

    mock.profiles[rep2Id].disabled = true;
    await page.reload();
    await page.waitForSelector("#gate:not([hidden])", { timeout: 20000 });
    check("D3 an account disabled server-side is locked out at next online open", true);
    check("D4 …and its cloud tokens are gone", (await kv(page, "cloudSession")) === null);
    mock.profiles[rep2Id].disabled = false;
    await ctx.close();
  }

  // ============ E: legacy local account predating the cloud ============
  {
    const { ctx, page } = await fresh(false); // cloud OFF — the old world
    const h0 = mock.authHits;
    await boot(page);
    await page.click("#gate-swap-btn"); await page.waitForTimeout(200);
    await page.fill("#gate-name", "Legacy John");
    await trySignIn(page, "john@y.com", "legacy-pass-1");
    check("E1 cloud off: local account creation still works", !(await gateOpen(page)));
    check("E2 cloud off: ZERO cloud requests were made", mock.authHits === h0);
    await page.evaluate(() => { MGATE.lock(); }).catch(() => {});
    await page.waitForSelector("#gate:not([hidden])", { timeout: 15000 });

    // now the company flips cloud ON, but the server has no john@y.com yet
    await ctx.addInitScript(CLOUD_ON);
    await page.reload(); await page.waitForTimeout(400);
    await trySignIn(page, "john@y.com", "legacy-pass-1");
    check("E3 legacy device account still unlocks after cloud turns on", !(await gateOpen(page)));
    check("E4 …and the server WAS consulted first", mock.authHits > h0);
    await ctx.close();
  }

  check("no page errors across every scenario", errors.length === 0, errors.slice(0, 3).join("|"));

  console.log("\n=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  await browser.close(); server.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
