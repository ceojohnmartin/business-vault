/* Phase 3 — realtime doorbell test. The mock now speaks THREE protocols:
   GoTrue auth, PostgREST (as in sync-test), and Phoenix-over-WebSocket
   (hand-rolled RFC6455 framing) mirroring the server pieces exactly:
   - a write statement rings `team:<id>` ONCE with an EMPTY payload
   - joining a topic is authorized like the realtime.messages RLS policy:
     the token's own profile team must equal the topic — never the claim
   Four devices: A (John) drives; B (Lena, same team) proves sub-2s
   propagation, burst-collapse, socket-loss recovery and hide/resume;
   P (Lena on a REST-only port) proves the polling floor; D (a rep on
   ANOTHER team) proves isolation and that a forged join is refused. */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const PORT = 8852, PORT_NO_WS = 8853;
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

// ---------------- shared state ----------------
const TEAM1 = "11111111-1111-4111-a111-111111111111";
const TEAM2 = "22222222-2222-4222-a222-222222222222";
const mock = {
  users: {}, profiles: {}, access: {},
  tables: { pins: new Map(), events: new Map(), territories: new Map(), customers: new Map() },
  clock: Date.parse("2026-08-31T00:00:00Z"),
  pulls: {},            // uid -> data-table GET count (the only data path)
  wsClients: new Set(), wsBlocked: false, wsJoinRejects: 0, wsUpgrades: 0,
};
const tick = () => new Date(++mock.clock).toISOString();
function addUser(email, password, prof) {
  const id = crypto.randomUUID();
  mock.users[email] = { id, password };
  mock.profiles[id] = Object.assign(
    { id, team_id: TEAM1, role: "rep", name: "", email, disabled: false }, prof);
  return id;
}
const j = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const authOf = (req) => mock.access[String(req.headers.authorization || "").replace(/^Bearer /, "")];

// ---------------- REST (same semantics as sync-test's mock) ----------------
function handleRest(req, res, u, body) {
  const uid = authOf(req);
  if (!uid) return j(res, 401, { message: "JWT invalid" });
  const me = mock.profiles[uid];
  const table = u.pathname.replace("/rest/v1/", "");
  if (table === "profiles") {
    const rows = Object.values(mock.profiles).filter((p) =>
      p.id === uid || (p.team_id === me.team_id && p.team_id && !me.disabled));
    return j(res, 200, rows);
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
      const key = row.team_id + "|" + row.id;
      const existing = t.get(key);
      if (existing) {
        if (prefer.includes("ignore-duplicates")) continue;
        if (table === "events") return j(res, 401, { code: "42501" });
        t.set(key, Object.assign({}, existing, row,
          { created_at: existing.created_at, updated_at: reqClock }));
      } else {
        const fresh = Object.assign({}, row, { created_at: reqClock });
        if (table !== "events") fresh.updated_at = fresh.created_at;
        t.set(key, fresh);
      }
    }
    ringTeam(me.team_id, table); // the statement trigger: ONE ring per request
    return j(res, 201, undefined);
  }
  if (req.method === "PATCH") {
    if (table === "events") return j(res, 401, { code: "42501" });
    const id = String(u.searchParams.get("id") || "").replace(/^eq\./, "");
    const row = t.get(me.team_id + "|" + id);
    if (row) { Object.assign(row, body, { updated_at: tick() }); ringTeam(me.team_id, table); }
    return j(res, 200, undefined);
  }
  // GET — the ONLY path data travels to a client
  mock.pulls[uid] = (mock.pulls[uid] || 0) + 1;
  let rows = [...t.values()].filter((r) => r.team_id === me.team_id);
  const clockCol = table === "events" ? "created_at" : "updated_at";
  const or = u.searchParams.get("or");
  if (or) {
    const m = or.match(/\(\w+\.gt\.(.*?),and\(\w+\.eq\.(.*?),id\.gt\.(.*)\)\)/);
    if (!m) return j(res, 400, { message: "bad or=" });
    rows = rows.filter((r) => r[clockCol] > m[1] || (r[clockCol] === m[2] && r.id > m[3]));
  }
  rows.sort((a, b) => a[clockCol] < b[clockCol] ? -1 : a[clockCol] > b[clockCol] ? 1
    : a.id < b.id ? -1 : 1);
  const limit = Number(u.searchParams.get("limit") || 0);
  if (limit) rows = rows.slice(0, limit);
  return j(res, 200, rows);
}

function requestHandler(req, res) {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/auth/v1/") || u.pathname.startsWith("/rest/v1/")) {
    let raw = "";
    req.on("data", (c) => raw += c);
    req.on("end", () => {
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch (_) {}
      if (u.pathname === "/auth/v1/token" && u.searchParams.get("grant_type") === "password") {
        const usr = mock.users[String(body.email || "").toLowerCase()];
        if (!usr || usr.password !== body.password)
          return j(res, 400, { error_description: "Invalid login credentials" });
        const a = "at-" + crypto.randomBytes(8).toString("hex");
        mock.access[a] = usr.id;
        return j(res, 200, { access_token: a, refresh_token: "rt-" + a, token_type: "bearer",
          expires_in: 3600, user: { id: usr.id, email: body.email } });
      }
      if (u.pathname === "/auth/v1/logout") return j(res, 204);
      if (u.pathname === "/rest/v1/profiles" && req.method === "GET")
        return handleRest(req, res, u, body);
      if (u.pathname.startsWith("/rest/v1/")) return handleRest(req, res, u, body);
      return j(res, 404, {});
    });
    return;
  }
  let p = decodeURIComponent(u.pathname); if (p === "/") p = "/index.html";
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(d);
  });
}

// ---------------- Phoenix over hand-rolled RFC6455 ----------------
function wsSend(client, obj) {
  const payload = Buffer.from(JSON.stringify(obj));
  let header;
  if (payload.length < 126) header = Buffer.from([0x81, payload.length]);
  else { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(payload.length, 2); }
  try { client.socket.write(Buffer.concat([header, payload])); } catch (_) {}
}
function ringTeam(teamId, table) {
  for (const c of mock.wsClients) {
    if (c.team === teamId) {
      c.pings++;
      wsSend(c, { topic: "realtime:team:" + teamId, event: "broadcast",
        payload: { type: "broadcast", event: table, payload: {} }, ref: null });
    }
  }
}
function handleWsMessage(client, text) {
  let m; try { m = JSON.parse(text); } catch (_) { return; }
  if (m.topic === "phoenix" && m.event === "heartbeat")
    return wsSend(client, { topic: "phoenix", event: "phx_reply",
      payload: { status: "ok", response: {} }, ref: m.ref });
  if (m.event === "phx_join") {
    // the realtime.messages RLS policy, mirrored: token -> profile ->
    // OWN team must equal the requested topic; disabled reps refused
    const uid = mock.access[(m.payload && m.payload.access_token) || ""];
    const prof = uid && mock.profiles[uid];
    const want = (String(m.topic).match(/^realtime:team:(.+)$/) || [])[1];
    const okJoin = prof && !prof.disabled && prof.team_id && prof.team_id === want
      && m.payload && m.payload.config && m.payload.config.private === true;
    if (!okJoin) {
      mock.wsJoinRejects++;
      return wsSend(client, { topic: m.topic, event: "phx_reply",
        payload: { status: "error", response: { reason: "unauthorized" } }, ref: m.ref });
    }
    client.team = want;
    return wsSend(client, { topic: m.topic, event: "phx_reply",
      payload: { status: "ok", response: {} }, ref: m.ref });
  }
  if (m.event === "access_token") return; // accepted silently
}
function attachWs(server) {
  server.on("upgrade", (req, socket) => {
    if (mock.wsBlocked) { socket.destroy(); return; }
    mock.wsUpgrades++;
    const key = req.headers["sec-websocket-key"];
    const accept = crypto.createHash("sha1")
      .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
    socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n" +
      "Connection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
    const client = { socket, team: null, pings: 0 };
    mock.wsClients.add(client);
    let buf = Buffer.alloc(0);
    socket.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        if (buf.length < 2) return;
        const op = buf[0] & 0x0f;
        let len = buf[1] & 0x7f, off = 2;
        const masked = buf[1] & 0x80;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        const maskLen = masked ? 4 : 0;
        if (buf.length < off + maskLen + len) return;
        const mask = masked ? buf.slice(off, off + 4) : null;
        let data = buf.slice(off + maskLen, off + maskLen + len);
        if (mask) data = Buffer.from(data.map((b, i) => b ^ mask[i % 4]));
        buf = buf.slice(off + maskLen + len);
        if (op === 8) { try { socket.end(); } catch (_) {} mock.wsClients.delete(client); return; }
        if (op === 1) handleWsMessage(client, data.toString());
      }
    });
    socket.on("close", () => mock.wsClients.delete(client));
    socket.on("error", () => mock.wsClients.delete(client));
  });
}

// ---------------- the run ----------------
(async () => {
  const server = http.createServer(requestHandler);
  attachWs(server); // full server: REST + realtime
  const restOnly = http.createServer(requestHandler); // no upgrade handler at all
  await new Promise((r) => server.listen(PORT, r));
  await new Promise((r) => restOnly.listen(PORT_NO_WS, r));

  const johnId = addUser("john@x.com", "knock1234", { name: "John M.", role: "owner" });
  addUser("lena@x.com", "knock1234", { name: "Lena Ortiz" });
  const otherId = addUser("other@x.com", "knock1234", { name: "Other Rep", team_id: TEAM2 });

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];
  async function device(email, port, pollMs) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    // This sandbox's proxy makes fonts.googleapis.com HANG rather than fail
    // fast. That <link> is render-blocking, so a hung font request stalls
    // every script and freezes the app on the splash. Fail it instantly.
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    });
    await ctx.addInitScript(`window.RALLY_CLOUD = { url: "http://localhost:${port}",
      anonKey: "test-anon", pollMs: ${pollMs} };`);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(email + ": " + e.message));
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
    await page.fill("#gate-email", email); await page.fill("#gate-pass", "knock1234");
    await page.click("#gate-submit");
    await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 20000 });
    await page.waitForTimeout(2200); // let the boot cycle (1.5s) run and settle
    return { ctx, page };
  }
  const S = (d, fn) => d.page.evaluate(fn);
  const sync = (d) => d.page.evaluate(() => MSYNC.syncNow());
  const until = async (d, fn, ms) => { // poll a device-side condition
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await S(d, fn)) return Date.now() - t0;
      await d.page.waitForTimeout(60);
    }
    return -1;
  };

  // polling parked at 5 minutes on A and B: whatever propagates in-test is
  // realtime's doing, never a lucky poll tick
  const A = await device("john@x.com", PORT, 300000);
  await S(A, async () => {
    window.__pin = await STORE.addKnock({ lat: 38.48, lng: -98.36,
      disposition: "goback", reason: null, dm: true, note: "", callbackAt: null });
  });
  await sync(A);
  const B = await device("lena@x.com", PORT, 300000);
  await sync(B);
  const rt0 = await S(B, () => MREALTIME.status());
  check("R1 B's doorbell is connected and joined to its own team",
    rt0.connected && rt0.joined && rt0.team === "11111111-1111-4111-a111-111111111111",
    JSON.stringify(rt0));
  check("R2 B starts with A's door", (await S(B, () => STORE.pins.length)) === 1);

  // ---- the 2-second promise: change on A -> visible on B, no syncNow on B
  const lenaId = mock.users["lena@x.com"].id;
  const pullsBefore = mock.pulls[lenaId] || 0;
  const t0 = Date.now();
  await S(A, async () => {
    const pin = STORE.pins[0];
    await STORE.addKnock({ pinId: pin.id, lat: pin.lat, lng: pin.lng,
      disposition: "sold", reason: null, dm: true, note: "sold live" });
  }); // no sync(A): the 800ms kick must carry it
  const propMs = await until(B, () => STORE.pins[0] && STORE.pins[0].disposition === "sold", 5000);
  check("R3 A's knock appears on B in under 2 seconds, hands off",
    propMs > 0 && propMs < 2000, propMs + "ms");
  check("R4 it arrived through the normal pull path (REST GETs grew)",
    (mock.pulls[lenaId] || 0) > pullsBefore,
    "pulls " + pullsBefore + " -> " + mock.pulls[lenaId]);
  check("R5 B's doorbell actually rang", (await S(B, () => MREALTIME.status())).pings > 0);

  // ---- burst: several pushes in quick succession, few pulls on B
  const pullsB4 = mock.pulls[lenaId] || 0;
  for (let i = 0; i < 4; i++) {
    await S(A, async () => {
      const pin = STORE.pins[0];
      pin.note = "burst " + Date.now();
      await STORE.updatePin(pin);
    });
    await sync(A);
    await A.page.waitForTimeout(120);
  }
  await B.page.waitForTimeout(2800);
  // one pull CYCLE = one GET per table (4) — so cycles = GETs / 4
  const pullsDelta = (mock.pulls[lenaId] || 0) - pullsB4;
  const cycles = pullsDelta / 4;
  check("R6 four rapid pushes collapse into few pull cycles on B (no storm)",
    cycles >= 1 && cycles <= 3, "cycles=" + cycles + " (GETs=" + pullsDelta + ")");
  check("R7 ...and B still converged",
    await S(B, () => STORE.pins[0].note.startsWith("burst")));

  // ---- socket loss: no realtime, no silent second data path; reconnect catches up
  mock.wsBlocked = true;
  for (const c of [...mock.wsClients]) { try { c.socket.destroy(); } catch (_) {} }
  await B.page.waitForTimeout(400);
  await S(A, async () => {
    await STORE.addKnock({ lat: 38.49, lng: -98.37, disposition: "nothome",
      reason: null, dm: false, note: "" });
  });
  await sync(A);
  await B.page.waitForTimeout(2500);
  check("R8 with the socket dead (and polling parked), the change waits",
    (await S(B, () => STORE.pins.length)) === 1, "pins=" + (await S(B, () => STORE.pins.length)));
  mock.wsBlocked = false;
  const recovMs = await until(B, () => STORE.pins.length === 2, 12000);
  check("R9 reconnect performs the catch-up pull — nothing missed matters",
    recovMs > 0, recovMs + "ms after unblock");

  // ---- hide / resume
  await S(B, () => {
    Object.defineProperty(document, "visibilityState", { get: () => "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await B.page.waitForTimeout(500);
  check("R10 hidden app closes its socket (no background battery spend)",
    !(await S(B, () => MREALTIME.status())).connected);
  await S(A, async () => {
    const pin = STORE.pins[0];
    pin.note = "while-you-were-away";
    await STORE.updatePin(pin);
  });
  await sync(A);
  await B.page.waitForTimeout(1500);
  check("R11 hidden device stays quiet (no pull, no data)",
    !(await S(B, () => STORE.pins[0].note === "while-you-were-away")));
  await S(B, () => {
    Object.defineProperty(document, "visibilityState", { get: () => "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const resumeMs = await until(B, () => STORE.pins[0].note === "while-you-were-away", 8000);
  check("R12 becoming visible reconnects and catches up immediately",
    resumeMs > 0, resumeMs + "ms");

  // ---- polling floor: a device whose server has NO websocket at all
  const P = await device("lena@x.com", PORT_NO_WS, 1500);
  await sync(P);
  const baseP = await S(P, () => STORE.pins.length);
  await S(A, async () => {
    await STORE.addKnock({ lat: 38.50, lng: -98.38, disposition: "goback",
      reason: null, dm: false, note: "", callbackAt: null });
  });
  await sync(A);
  const pollMs = await until(P, () => STORE.pins.length >= 3, 8000);
  check("R13 no realtime at all: polling still catches everything",
    pollMs > 0 && baseP === 2, pollMs + "ms (poll floor), base=" + baseP);
  check("R14 the no-websocket device never joined a channel",
    !(await S(P, () => MREALTIME.status())).joined);

  // ---- cross-team isolation + forged join
  const D = await device("other@x.com", PORT, 300000);
  await sync(D);
  const dRt = await S(D, () => MREALTIME.status());
  check("R15 the other team's rep joins only THEIR topic",
    dRt.joined && dRt.team === "22222222-2222-4222-a222-222222222222", JSON.stringify(dRt));
  const dPings0 = dRt.pings;
  await S(A, async () => {
    const pin = STORE.pins[0];
    pin.note = "team1 only";
    await STORE.updatePin(pin);
  });
  await sync(A);
  await D.page.waitForTimeout(1500);
  check("R16 team 1's changes ring ZERO bells on team 2",
    (await S(D, () => MREALTIME.status())).pings === dPings0
    && (await S(D, () => STORE.pins.length)) === 0);
  // a malicious client asks for team 1's topic with team 2's token
  const forged = await S(D, () => new Promise((resolve) => {
    MDB.kvGet("cloudSession", null).then((tok) => {
      const ws = new WebSocket(RALLY_CLOUD.url.replace("http", "ws") +
        "/realtime/v1/websocket?apikey=" + RALLY_CLOUD.anonKey + "&vsn=1.0.0");
      const timer = setTimeout(() => resolve("timeout"), 4000);
      ws.onopen = () => ws.send(JSON.stringify({
        topic: "realtime:team:11111111-1111-4111-a111-111111111111",
        event: "phx_join", ref: "1",
        payload: { config: { broadcast: { self: false }, presence: { key: "" },
          postgres_changes: [], private: true }, access_token: tok.access },
      }));
      ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.event === "phx_reply") { clearTimeout(timer); ws.close(); resolve(msg.payload.status); }
      };
      ws.onerror = () => { clearTimeout(timer); resolve("socket-error"); };
    });
  }));
  // the server's phx_reply must come back status "error" — an "ok" would
  // mean the authorization mirror let a cross-team join through
  check("R17 a forged cross-team join is refused at the socket",
    forged === "error", "join status=" + forged);
  check("R18 the server logged the rejection", mock.wsJoinRejects >= 1,
    "rejects=" + mock.wsJoinRejects);

  check("no page errors on any device", errors.length === 0, errors.slice(0, 3).join("|"));

  console.log("\nPropagation (change on A -> visible on B): " + propMs + "ms");
  console.log("\n=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  await browser.close(); server.close(); restOnly.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
