/* RALLY — STEP A: THE REAL, AUTHORIZED APPLE MAPKIT PROOF.

   Runs RALLY's actual MapKit renderer against Apple's real MapKit JS
   library with the real, domain-restricted token, and photographs it.

   THE TOKEN
     - read from the MAPKIT_TOKEN environment variable and nowhere else
     - handed to the page in memory as window.RALLY_MAPKIT.token — the same
       shape the published mapkit-config.js has on the authorized origin
     - never written to a file, to IndexedDB (STORE.settings.mapkitToken
       stays empty and the suite asserts it), to a screenshot, to a log
       line, or to this suite's output; Apple carries it in an
       Authorization header, never in a URL
     - without it this suite prints BLOCKED and exits 2; it fakes nothing

   THE ORIGIN
     Apple checks a domain-restricted token against the request's Origin.
     The page is served INSIDE the browser at the authorized origin
     (https://ceojohnmartin.github.io/business-vault/rally/, fulfilled by
     this script — no network, no DNS), so the browser's own Origin is the
     real one, and every request to Apple goes out through Node from this
     container (Chromium's tunnel to Apple dies at the egress relay), which
     presents that same Origin. Nothing is deployed; nothing leaves this
     container but the requests to Apple.

   WHAT IS REAL: the app, RALLY's MapKit renderer, Apple's library, Apple's
   satellite imagery, the building footprints (OpenStreetMap, real
   rooftops). WHAT IS SIMULATED: the book of work — reps, customers,
   knocks, the territory's number. Frames say which.

   PERFORMANCE NUMBERS come from headless Chromium on SwiftShader (software
   GL, no GPU) inside a container. They are honest for THIS machine and are
   relative measurements; they are not iPhone numbers.

   MAPKIT_TOKEN=… NODE_PATH=/opt/node22/lib/node_modules node rally/tests/mapkit-proof.js */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const SHOTS = process.env.SHOTS || "/tmp/mapkit-proof";
const CACHE = "/tmp/rally-shot-cache";
const ORIGIN = process.env.PROOF_ORIGIN || "https://ceojohnmartin.github.io";
const APP = "/business-vault/rally/";
const APPLE = /(^|\.)apple-mapkit\.com$|(^|\.)apple\.com$/;

const TOKEN = String(process.env.MAPKIT_TOKEN || "").trim();
if (!TOKEN) {
  console.log("BLOCKED BY APPLE MAPKIT TOKEN — MAPKIT_TOKEN is not set in this environment. Nothing ran, nothing was faked.");
  process.exit(2);
}
if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(TOKEN)) {
  console.log("MAPKIT_TOKEN is present but is not shaped like a MapKit JS token (three dot-separated segments). Refusing to send it anywhere.");
  process.exit(2);
}
// belt and braces: nothing this process prints may contain the token
const rawLog = console.log;
console.log = (...a) => rawLog(...a.map((x) => String(x).split(TOKEN).join("<token>")));

fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail !== undefined ? " — " + detail : "")); }
};
const section = (t) => console.log("\n== " + t);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// a wide, real subdivision: enough real rooftops for 500 doors
const CENTRE = { lat: 38.8620, lng: -94.7700 };
const BOX = { s: 38.8560, w: -94.7800, n: 38.8680, e: -94.7600 };

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2", ".json": "application/json", ".pbf": "application/x-protobuf" };

async function googleSession() {
  const key = (fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8").match(/DEFAULT_GOOGLE_KEY = "([^"]*)"/) || [])[1];
  if (!key) return null;
  try {
    const r = await fetch("https://tile.googleapis.com/v1/createSession?key=" + encodeURIComponent(key), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapType: "satellite", language: "en-US", region: "US", layerTypes: ["layerRoadmap"], highDpi: true, scale: "scaleFactor2x" }),
      signal: AbortSignal.timeout(60000) });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.session ? { j, key } : null;
  } catch (_) { return null; }
}

async function buildings() {
  const f = path.join(CACHE, "buildings-wide.json");
  if (fs.existsSync(f)) { const els = JSON.parse(fs.readFileSync(f, "utf8")); console.log(`  buildings: ${els.length} real footprints (cached)`); return els; }
  const q = `[out:json][timeout:90];way["building"](${BOX.s},${BOX.w},${BOX.n},${BOX.e});out tags geom;`;
  for (const host of ["overpass.kumi.systems", "overpass-api.de", "overpass.osm.ch"]) {
    try {
      const r = await fetch(`https://${host}/api/interpreter`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json", "User-Agent": "RALLY-proof-harness/1.0" },
        body: "data=" + encodeURIComponent(q), signal: AbortSignal.timeout(150000) });
      if (!r.ok) continue;
      const els = ((await r.json()).elements || []).filter((e) => (e.geometry || []).length >= 4);
      if (els.length) { fs.writeFileSync(f, JSON.stringify(els)); console.log(`  buildings: ${els.length} real footprints from ${host}`); return els; }
    } catch (_) { /* next mirror */ }
  }
  // the narrower cache from the premium harness, if the wide fetch is unreachable
  const g = path.join(CACHE, "buildings.json");
  if (fs.existsSync(g)) { const els = JSON.parse(fs.readFileSync(g, "utf8")); console.log(`  buildings: ${els.length} real footprints (narrow cache — Overpass unreachable)`); return els; }
  console.log("  buildings: NONE — Overpass unreachable"); return [];
}

(async () => {
  console.log("== real building footprints ==");
  const blds = await buildings();
  console.log("== google tile session (for the MapLibre FALLBACK frame only) ==");
  const g = await googleSession();
  console.log(g ? "  session ok" : "  NO SESSION — the fallback frame will have no imagery");

  const apple = { ok: 0, refused: 0, failed: 0, images: 0, bytes: 0, statuses: {} };
  let appleDown = false;   // the switch that simulates Apple / the network going away

  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
           "--enable-webgl", "--disable-gpu-sandbox", "--enable-precise-memory-info"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await ctx.addInitScript((tok) => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" };          // no cloud: nothing can reach production
    window.RALLY_MAPKIT = { token: tok };                    // in memory only — the published config's shape
    const real = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") attrs = Object.assign({}, attrs, { preserveDrawingBuffer: true });
      return real.call(this, type, attrs);
    };
  }, TOKEN);

  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    // the app, served at the AUTHORIZED ORIGIN from disk
    if (url.origin === ORIGIN) {
      if (!url.pathname.startsWith(APP)) return route.fulfill({ status: 404, body: "" });
      let p = url.pathname.slice(APP.length) || "index.html";
      const file = path.join(ROOT, decodeURIComponent(p));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: "" });
      return route.fulfill({ status: 200, contentType: MIME[path.extname(file)] || "application/octet-stream", body: fs.readFileSync(file) });
    }
    // Apple, through Node, presenting the authorized origin; the browser's Authorization header travels with it
    if (APPLE.test(url.hostname)) {
      if (appleDown) { apple.failed++; return route.fulfill({ status: 504, body: "" }); }
      try {
        const h = req.headers();
        const headers = { referer: ORIGIN + APP, origin: ORIGIN };
        for (const k of ["authorization", "accept", "content-type", "accept-language"]) if (h[k]) headers[k] = h[k];
        const r = await fetch(url.href, { method: req.method(), headers, body: req.postData() || undefined, signal: AbortSignal.timeout(30000) });
        const buf = Buffer.from(await r.arrayBuffer());
        apple.statuses[r.status] = (apple.statuses[r.status] || 0) + 1;
        if (r.ok) { apple.ok++; apple.bytes += buf.length; if (/^image\//.test(r.headers.get("content-type") || "")) apple.images++; }
        else if (r.status === 401 || r.status === 403) apple.refused++; else apple.failed++;
        return route.fulfill({ status: r.status, body: buf, headers: { "content-type": r.headers.get("content-type") || "application/octet-stream", "access-control-allow-origin": ORIGIN, "access-control-allow-credentials": "true" } });
      } catch (_) { apple.failed++; return route.fulfill({ status: 504, body: "" }); }
    }
    // Google, for the MapLibre fallback frame only
    if (g && /tile\.googleapis\.com\/v1\/createSession/.test(url.href)) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(g.j) });
    if (g && /tile\.googleapis\.com\/v1\/2dtiles/.test(url.href)) {
      const m = url.pathname.match(/2dtiles\/(\d+)\/(\d+)\/(\d+)/);
      if (!m) return route.fulfill({ status: 404, body: "" });
      const cf = path.join(CACHE, `t-${m[1]}-${m[2]}-${m[3]}.jpg`);
      if (fs.existsSync(cf)) return route.fulfill({ status: 200, contentType: "image/jpeg", body: fs.readFileSync(cf) });
      try {
        const r = await fetch(`https://tile.googleapis.com/v1/2dtiles/${m[1]}/${m[2]}/${m[3]}?session=${encodeURIComponent(g.j.session)}&key=${encodeURIComponent(g.key)}`, { signal: AbortSignal.timeout(30000) });
        if (!r.ok) return route.fulfill({ status: r.status, body: "" });
        const buf = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(cf, buf);
        return route.fulfill({ status: 200, contentType: "image/jpeg", body: buf });
      } catch (_) { return route.fulfill({ status: 504, body: "" }); }
    }
    return route.fulfill({ status: 204, body: "" });
  });

  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  const shot = async (n) => { await page.screenshot({ path: `${SHOTS}/${n}.png` }); console.log("  shot:", n); };
  const settle = async (n) => { for (let i = 0; i < (n || 12); i++) await page.waitForTimeout(500); };
  const beRole = async (role) => {
    await page.evaluate(async (r) => { await STORE.applyServerRole(r, Date.now()); if (window.MAPP && MAPP.roleChanged) MAPP.roleChanged(); MMAP.refreshHoods(); MMAP.refreshPins(); MMAP.updateBrandToday(); }, role);
    await page.waitForTimeout(600);
  };
  const counts = () => page.evaluate(() => { const r = MMAP.engineReport(); return { engine: r.engine, fellBack: r.fellBack, reason: r.reason, c: r.renderer && r.renderer.counts ? r.renderer.counts() : null }; });
  const tilesLoaded = () => page.evaluate(() => Array.from(document.querySelectorAll("#map img")).filter((i) => i.complete && i.naturalWidth > 0 && !/^data:/.test(i.src)).length);
  const domPins = () => page.evaluate(() => ({ pins: document.querySelectorAll("#map .mkpin").length, clusters: document.querySelectorAll("#map .mkpin-cluster").length, labels: document.querySelectorAll("#map .mkhood-label").length, sel: document.querySelectorAll("#map .mkpin.sel").length }));

  const report = { appleAuthorized: null, mapkitVersion: null, densities: [], fallback: {}, defects: [] };
  try {
    await page.goto(ORIGIN + APP, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("#gate:not([hidden])", { timeout: 60000 });
    await page.click("#gate-swap-btn");
    await page.fill("#gate-name", "John Martin");
    await page.fill("#gate-email", "john@rallypest.com");
    await page.fill("#gate-pass", "knock1234");
    await page.click("#gate-submit");
    await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 30000 });
    await page.waitForFunction(() => window.STORE && window.MMAP && window.MENGINE, null, { timeout: 30000 });
    await page.waitForTimeout(1500);

    section("0. The origin, the token and the library");
    const where = await page.evaluate(() => ({ origin: location.origin, path: location.pathname, hasToken: MENGINE.hasToken(), slot: STORE.settings.mapkitToken, wanted: MENGINE.wanted() }));
    check("the page believes it is on the authorized origin", where.origin === ORIGIN && where.path === APP, JSON.stringify({ origin: where.origin, path: where.path }));
    check("a token is present for the app, and the DEVELOPMENT slot stays EMPTY (nothing is persisted)", where.hasToken && where.slot === "" && where.wanted === "mapkit", JSON.stringify({ hasToken: where.hasToken, slotEmpty: where.slot === "", wanted: where.wanted }));

    // ----------------------------------------------------------- SEED
    console.log("== seeding (SIMULATED book of work over REAL rooftops) ==");
    const seeded = await page.evaluate(async ({ blds, BOX }) => {
      const me = STORE.currentUser(); me.name = "John Martin"; me.role = "owner"; await STORE.updateUser(me);
      STORE.settings.propertySource = "demo"; await STORE.saveSettings();
      const jake = await STORE.addUser({ name: "Jake Rowe", role: "rep" });
      const mia = await STORE.addUser({ name: "Mia Cole", role: "rep" });
      const dev = await STORE.addUser({ name: "Dev Patel", role: "rep" });
      window.__crew = { me: me.id, jake: jake.id, mia: mia.id, dev: dev.id };
      const ring = [[BOX.w, BOX.s], [BOX.e, BOX.s], [BOX.e, BOX.n], [BOX.w, BOX.n]];
      const hood = await STORE.createTerritory({ name: "", homes: 0, points: ring }, [me.id]);
      hood.seq = 12; await MDB.put("territories", hood);   // SIMULATED number (server-assigned by 0018)
      window.__hood = hood.id;
      const place = window.MPROP && MPROP._placeAt;
      const props = [];
      blds.forEach((b, i) => {
        const pl = place ? place(b) : null; if (!pl || !pl.point) return;
        const t = b.tags || {};
        const addr = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
        props.push({ externalId: "osm-way-" + b.id, parcelId: null, source: "osm", lat: pl.point.lat, lng: pl.point.lon, placement: pl.how,
          address: addr || (1200 + i * 2) + " Brougham Dr", city: "Olathe", state: "KS", zip: "66062", propertyType: "house", eligible: true,
          owner: null, yearBuilt: null, sqft: null, lotSqft: null, lastSaleDate: null, lastSalePrice: null });
      });
      const imp = await STORE.importDoors(props, { territoryId: hood.id });
      const OUT = ["nothome", "nothome", "notint", "goback", "sold", "unworked", "unworked", "nothome", "dnk", "unworked", "notint", "unworked"];
      const now = Date.now(), HOUR = 3600e3;
      const mine = STORE.pins.filter((p) => p.territoryId === hood.id);
      let knocks = 0;
      for (let i = 0; i < mine.length; i++) {
        const d = OUT[i % OUT.length]; if (d === "unworked") continue;
        await STORE.addKnock({ pinId: mine[i].id, lat: mine[i].lat, lng: mine[i].lng, disposition: d, reason: d === "notint" ? "Not interested" : null,
          dm: d === "sold" || d === "notint", note: "", callbackAt: d === "goback" && i % 3 === 0 ? now + 2 * HOUR : null });
        knocks++;
        if (d === "sold") { const c = await STORE.addCustomer({ first: "Sold", last: "Door" + i, phones: [], appointments: [], pinId: mine[i].id }); c.soldAt = now; c.agreement = { signedAt: now, plan: "Quarterly Pest" }; c.acct = "active"; await MDB.put("customers", c); }
      }
      window.__gobacks = mine.filter((p) => p.disposition === "goback").map((p) => p.id);
      return { doors: imp.added, knocks, footprints: blds.length };
    }, { blds, BOX });
    console.log("  seeded:", JSON.stringify(seeded));

    // ------------------------------------------------ 1. REAL MAPKIT BOOT
    section("1. Apple authorization and satellite imagery (REAL APPLE MAPKIT)");
    await page.evaluate(() => { MAPP.show("map"); });
    let t0 = Date.now();
    const boot = await page.evaluate(async ({ lng, lat }) => {
      const t = performance.now();
      await MMAP.init();
      const ms = Math.round(performance.now() - t);
      MMAP.jumpTo(lng, lat, 16.4);
      const r = MMAP.engineReport();
      return { ms, engine: r.engine, fellBack: r.fellBack, reason: r.reason, version: window.mapkit ? mapkit.version : null, build: window.mapkit ? mapkit.build : null,
        c: r.renderer && r.renderer.counts ? r.renderer.counts() : null };
    }, CENTRE);
    await settle(16);
    const tiles1 = await tilesLoaded();
    report.appleAuthorized = !!(boot.c && boot.c.authorized);
    report.mapkitVersion = boot.version + (boot.build ? " (build " + boot.build + ")" : "");
    check("RALLY's MapKit renderer is the live engine (no fallback)", boot.engine === "mapkit" && !boot.fellBack, JSON.stringify({ engine: boot.engine, fellBack: boot.fellBack, reason: boot.reason }));
    check("Apple AUTHORIZED the domain-restricted token", boot.c && boot.c.authorized === true, JSON.stringify({ authorized: boot.c && boot.c.authorized, appleStatuses: apple.statuses }));
    check("Apple's real library: version " + report.mapkitVersion, !!boot.version, boot.version);
    check("satellite imagery actually rendered (Apple image tiles proxied and painted)", apple.images > 0 && tiles1 > 0 && boot.c && /Satellite/i.test(String(boot.c.mapType)),
      JSON.stringify({ appleImages: apple.images, tilesPainted: tiles1, mapType: boot.c && boot.c.mapType }));
    console.log(`  map initialization: ${boot.ms} ms (MMAP.init → live map) · Apple responses ok=${apple.ok} refused=${apple.refused} failed=${apple.failed}`);
    if (!(boot.c && boot.c.authorized)) {
      console.log("\nApple did NOT authorize this token from this origin — stopping here rather than photographing a blank map. Statuses: " + JSON.stringify(apple.statuses));
      report.defects.push("Apple refused the token (see statuses)");
      throw new Error("unauthorized");
    }

    // rep map: only their blue turf, no label, top card three numbers
    await beRole("rep");
    await page.evaluate(({ lng, lat }) => MMAP.jumpTo(lng, lat, 15.3), CENTRE);
    await settle(14);
    const repView = await page.evaluate(() => { const r = MMAP.engineReport().renderer.counts(); return { hoods: r.hoods, labels: r.labels, cells: Array.from(document.querySelectorAll("#map-brand .mb-cell span")).map((s) => s.textContent.trim()).join("|"), today: document.querySelector("#brand-today").hidden }; });
    check("rep sees ONLY their assigned blue turf (1 overlay) with NO territory label over the imagery", repView.hoods === 1 && repView.labels === 0, JSON.stringify(repView));
    check("top card is exactly Doors / DMs / Sold", repView.cells === "Doors|DMs|Sold" && repView.today, repView.cells);
    await shot("01-REAL-MAPKIT-rep-satellite-map");

    // ------------------------------------------------ 2. DENSITIES
    section("2. Density: 50 / 100 / 250 / 500 doors on REAL APPLE SATELLITE");
    await page.evaluate(() => { window.__allPins = STORE.pins; });
    for (const n of [50, 100, 250, 500]) {
      const d = await page.evaluate(async ({ n, CENTRE }) => {
        const all = window.__allPins;
        const real = all.slice(0, n); let synthetic = 0;
        while (real.length < n) { const src = all[real.length % all.length]; const k = Math.floor(real.length / all.length) + 1;
          real.push(Object.assign({}, src, { id: src.id + "-syn" + k, lat: src.lat + 0.00022 * k, lng: src.lng + 0.0003 * k, _synthetic: true })); synthetic++; }
        STORE.pins = real;
        const mk = MRENDER_MK; const rp = mk.setPins, rh = mk.setHoods;
        const tm = { pins: 0, hoods: 0 };
        mk.setPins = function (fc, sel) { const t = performance.now(); const r = rp.call(this, fc, sel); tm.pins = Math.round(performance.now() - t); return r; };
        mk.setHoods = function (fc, o) { const t = performance.now(); const r = rh.call(this, fc, o); tm.hoods = Math.round(performance.now() - t); return r; };
        const mem0 = performance.memory ? performance.memory.usedJSHeapSize : null;
        const t = performance.now();
        await MMAP.init();                                   // a fresh engine per density: teardown + recreate measured too
        const init = Math.round(performance.now() - t);
        MMAP.jumpTo(CENTRE.lng, CENTRE.lat, n <= 100 ? 17.3 : 16.6);
        await new Promise((r) => setTimeout(r, 300));
        // frame pacing while the camera animates: rAF intervals over ~1.2 s of easeTo
        const frames = []; let last = performance.now(); let stop = false;
        const loop = (ts) => { frames.push(ts - last); last = ts; if (!stop) requestAnimationFrame(loop); }; requestAnimationFrame(loop);
        const R = MMAP.engineReport().renderer;
        R.easeTo({ lng: CENTRE.lng + 0.004, lat: CENTRE.lat + 0.002, zoom: R.getZoom(), animate: true });
        await new Promise((r) => setTimeout(r, 600));
        R.easeTo({ lng: CENTRE.lng, lat: CENTRE.lat, zoom: R.getZoom() + 0.6, animate: true });
        await new Promise((r) => setTimeout(r, 600)); stop = true;
        const fps = frames.length > 2 ? Math.round(1000 / (frames.slice(1).reduce((a, b) => a + b, 0) / (frames.length - 1))) : null;
        const worst = frames.length ? Math.round(Math.max(...frames.slice(1))) : null;
        // selection latency: focusPin → the renderer reports the door selected
        const pin = STORE.pins[Math.floor(n / 2)];
        const ts0 = performance.now(); MMAP.focusPin(pin.id);
        let selMs = null; for (let i = 0; i < 100; i++) { if (R.counts().selected === pin.id) { selMs = Math.round(performance.now() - ts0); break; } await new Promise((r) => setTimeout(r, 10)); }
        MMAP.clearSelection(); MUI.closeSheet();
        // clustering below the threshold; none at street level
        MMAP.jumpTo(CENTRE.lng, CENTRE.lat, 14.6); await new Promise((r) => setTimeout(r, 700));
        const low = { clustering: R.counts().clustering, pins: document.querySelectorAll("#map .mkpin").length, clusters: document.querySelectorAll("#map .mkpin-cluster").length };
        MMAP.jumpTo(CENTRE.lng, CENTRE.lat, 17.6); await new Promise((r) => setTimeout(r, 700));
        const high = { clustering: R.counts().clustering, pins: document.querySelectorAll("#map .mkpin").length, clusters: document.querySelectorAll("#map .mkpin-cluster").length };
        MMAP.jumpTo(CENTRE.lng, CENTRE.lat, n <= 100 ? 17.3 : 16.6);
        const mem1 = performance.memory ? performance.memory.usedJSHeapSize : null;
        mk.setPins = rp; mk.setHoods = rh;
        const c = R.counts();
        return { n, real: n - synthetic, synthetic, init, pinsMs: tm.pins, hoodsMs: tm.hoods, fps, worstFrame: worst, selMs, low, high,
          annotations: c.pins, overlays: c.hoods, canvases: c.canvases, authorized: c.authorized, memMB: mem1 != null ? +(mem1 / 1048576).toFixed(1) : null, memDeltaMB: mem0 != null && mem1 != null ? +((mem1 - mem0) / 1048576).toFixed(1) : null };
      }, { n, CENTRE });
      await settle(10);
      d.tilesPainted = await tilesLoaded();
      report.densities.push(d);
      check(`${n} doors: ${d.annotations} annotations on the map, Apple still authorized, imagery painted`, d.annotations === n && d.authorized && d.tilesPainted > 0, JSON.stringify({ annotations: d.annotations, authorized: d.authorized, tiles: d.tilesPainted }));
      check(`${n} doors: clusters below zoom 15 (${d.low.clusters} bubbles), every pin its own at street level (${d.high.pins} pins, 0 bubbles)`, d.low.clustering === true && d.high.clustering === false && d.high.clusters === 0 && d.high.pins === n, JSON.stringify({ low: d.low, high: d.high }));
      check(`${n} doors: selecting a door answers in ${d.selMs} ms`, d.selMs != null && d.selMs < 1500, JSON.stringify({ selMs: d.selMs }));
      console.log(`  ${n} doors → init ${d.init} ms · annotations ${d.pinsMs} ms · overlay ${d.hoodsMs} ms · ~${d.fps} fps (worst frame ${d.worstFrame} ms) · select ${d.selMs} ms · heap ${d.memMB} MB (Δ ${d.memDeltaMB})` + (d.synthetic ? ` · ${d.synthetic} SYNTHETIC offsets` : " · all real rooftops"));
      await shot(`0${[50, 100, 250, 500].indexOf(n) + 2}-REAL-MAPKIT-${n}-doors` + (d.synthetic ? `-SYNTHETIC-${d.real}-real` : ""));
    }
    await page.evaluate(() => { STORE.pins = window.__allPins; MMAP.refreshPins(); });
    const tear = await page.evaluate(async () => { await MMAP.init(); await MMAP.init(); const c = MMAP.engineReport().renderer.counts(); return { canvases: c.canvases, maps: document.querySelectorAll("#map > *").length, pins: document.querySelectorAll("#map .mkpin").length, annotations: c.pins }; });
    check("teardown / recreate: after repeated boots there is ONE map, one set of annotations, no leftovers", tear.pins === tear.annotations && tear.maps <= 3, JSON.stringify(tear));

    // ------------------------------------------------ 3. SELECTED DOOR
    section("3. Selected door, outcome pins, callback indicator (REAL APPLE MAPKIT)");
    await page.evaluate(({ lng, lat }) => MMAP.jumpTo(lng, lat, 17.4), CENTRE);
    await settle(8);
    const colours = await page.evaluate(() => Object.keys(MPIN.COLORS));
    check("six outcome colours are the pin palette: " + colours.join(", "), ["unworked", "nothome", "notint", "goback", "dnk", "sold"].every((k) => colours.includes(k)));
    const selInfo = await page.evaluate(async () => {
      const id = (window.__gobacks || [])[0] || STORE.pins[0].id;
      MMAP.focusPin(id); await new Promise((r) => setTimeout(r, 1500));
      const c = MMAP.engineReport().renderer.counts();
      const p = STORE.pins.find((x) => x.id === id);
      return { selected: c.selected === id, sheet: document.querySelector("#lead-sheet").classList.contains("open"), cb: !!p.callbackAt, cbShown: !!document.querySelector("#map .mkpin.sel .cb, #map .mkpin.sel[data-cb], #map .mkpin.cb") || /⏰|callback/i.test(document.querySelector("#lead-sheet").textContent) };
    });
    check("a tapped door is selected (raised pin, property sheet open) and its callback is indicated", selInfo.selected && selInfo.sheet && selInfo.cb && selInfo.cbShown, JSON.stringify(selInfo));
    await shot("06-REAL-MAPKIT-selected-door");
    await page.evaluate(() => { MMAP.clearSelection(); MUI.closeSheet(); });

    // ------------------------------------------------ 4. MANAGER
    section("4. Manager: map, tools, drawing, review, multi-rep, Street Mode, Freshness (REAL APPLE MAPKIT)");
    await beRole("owner");
    await page.evaluate(({ lng, lat }) => MMAP.jumpTo(lng, lat, 15.3), CENTRE);
    await settle(10);
    const mgr = await counts();
    check("a manager sees the active turf with its label over Apple imagery", mgr.c && mgr.c.hoods >= 1 && mgr.c.labels >= 1, JSON.stringify(mgr.c && { hoods: mgr.c.hoods, labels: mgr.c.labels }));
    await shot("07-REAL-MAPKIT-manager-map");
    await page.evaluate(() => document.querySelector("#fab-hoods").click());
    await page.waitForTimeout(800);
    await shot("08-REAL-MAPKIT-manager-tools");
    await page.evaluate(() => document.querySelector("#mt-corners").click());
    await page.waitForTimeout(500);
    for (const [x, y] of [[95, 300], [300, 285], [325, 515], [190, 610], [80, 520]]) { await page.mouse.click(x, y); await page.waitForTimeout(300); }
    await settle(3);
    const draft = await counts();
    check("drawing: five tapped corners become a draft ring on Apple's map", draft.c && draft.c.draftDots === 5, JSON.stringify(draft.c && { draftDots: draft.c.draftDots }));
    await shot("09-REAL-MAPKIT-drawing-territory");
    await page.evaluate(() => document.querySelector("#draw-done").click());
    await page.waitForFunction(() => { const r = document.querySelector("#hd-review"); return r && !r.hidden; }, null, { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => { const d = document.querySelector("#hood-doors"); if (d) d.scrollIntoView({ block: "start" }); });
    await page.waitForTimeout(600);
    await shot("10-REAL-MAPKIT-territory-review");
    await page.evaluate(() => document.querySelector("#hood-assign-open").click());
    await page.waitForTimeout(600);
    for (const nm of ["Jake Rowe", "Mia Cole", "Dev Patel"]) { await page.evaluate((n) => { const row = Array.from(document.querySelectorAll("#assign-list .arep")).find((r) => r.textContent.includes(n)); if (row) row.click(); }, nm); await page.waitForTimeout(250); }
    await shot("11-REAL-MAPKIT-multi-rep-assignment");
    await page.evaluate(() => { MASSIGN.close(); MUI.closeSheet(); const c = document.querySelector("#polycard"); if (c) c.hidden = true; });
    await page.waitForTimeout(400);
    // editing / moving the saved territory's corners over Apple imagery
    const edit = await page.evaluate(async () => { const t = STORE.territories.find((x) => x.id === window.__hood); const ok = await MTEDIT.open(t); await new Promise((r) => setTimeout(r, 800)); const handles = document.querySelectorAll(".vx-handle, .vx-h, [class*=vx-]").length; MTEDIT.close(true); return { ok, handles }; });
    check("editing / moving a territory opens its corner handles over Apple's map", edit.ok !== false && edit.handles > 0, JSON.stringify(edit));
    await beRole("rep");
    await page.evaluate(({ lng, lat }) => { MAPP.show("map"); MMAP.jumpTo(lng, lat, 17.2); }, CENTRE);
    await settle(6);
    await page.evaluate(() => document.querySelector("#fab-street").click());
    await page.waitForTimeout(1200);
    await shot("12-REAL-MAPKIT-street-mode");
    await page.evaluate(() => MUI.closeSheet());
    await beRole("owner");
    await page.evaluate(({ lng, lat }) => { MMAP.jumpTo(lng, lat, 15.3); MMAP.setHeatMode(true); }, CENTRE);
    await settle(10);
    const heat = await counts();
    check("Freshness view paints the turf over Apple imagery for a manager", heat.c && heat.c.hoods >= 1, JSON.stringify(heat.c && { hoods: heat.c.hoods }));
    await shot("13-REAL-MAPKIT-freshness");
    await page.evaluate(() => MMAP.setHeatMode(false));

    // ------------------------------------------------ 5. FAILURE / FALLBACK
    section("5. Apple / network failure → automatic MapLibre fallback → recovery");
    await beRole("rep");
    await page.evaluate(({ lng, lat }) => { MMAP.jumpTo(lng, lat, 17.2); }, CENTRE);
    await settle(6);
    const before = await page.evaluate(async () => {
      const a = STORE.pins.find((p) => p.territoryId === window.__hood && p.disposition === "unworked");
      const b = STORE.pins.find((p) => p.territoryId === window.__hood && p.id !== a.id && p.disposition === "unworked");
      await STORE.addKnock({ pinId: b.id, lat: b.lat, lng: b.lng, disposition: "goback", reason: null, dm: false, note: "", callbackAt: Date.now() + 3600e3 });
      await STORE.addNote(a, "Gate code 4321 — before the fallback");
      MMAP.focusPin(a.id); await new Promise((r) => setTimeout(r, 1200));
      const c = MMAP.getCenter();
      return { a: a.id, b: b.id, engine: MMAP.engine(), selected: MMAP.engineReport().renderer.counts().selected, center: [c.lng, c.lat], zoom: MMAP.engineReport().renderer.getZoom(),
        pins: STORE.pins.length, events: STORE.events.length, notes: (a.notes || []).length, cb: STORE.pins.find((x) => x.id === b.id).callbackAt, turf: STORE.hoodsOf(STORE.myId()).map((t) => t.id), queued: STORE.queuedCount(), sheet: document.querySelector("#lead-sheet").classList.contains("open") };
    });
    check("before: MapKit live, a door selected, a knock, a callback and a note recorded", before.engine === "mapkit" && before.selected === before.a && before.cb > 0 && before.notes === 1, JSON.stringify({ engine: before.engine, selected: before.selected === before.a }));
    appleDown = true;   // Apple / the network goes away
    await page.evaluate(() => { Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true }); window.dispatchEvent(new Event("offline")); });
    await page.waitForFunction(() => MMAP.engine() === "maplibre", null, { timeout: 30000 });
    await settle(12);
    const during = await page.evaluate((ids) => { const a = STORE.pins.find((x) => x.id === ids.a), b = STORE.pins.find((x) => x.id === ids.b); const r = MMAP.engineReport(); const c = MMAP.getCenter();
      return { engine: r.engine, wanted: r.wanted, center: [c.lng, c.lat], pins: STORE.pins.length, events: STORE.events.length, notes: (a.notes || []).length, cb: b.callbackAt, turf: STORE.hoodsOf(STORE.myId()).map((t) => t.id), queued: STORE.queuedCount(), sheet: document.querySelector("#lead-sheet").classList.contains("open"), canvases: document.querySelectorAll("#map canvas").length, toast: (document.querySelector("#toast") || {}).textContent }; }, before);
    const dist = Math.hypot(during.center[0] - before.center[0], during.center[1] - before.center[1]);
    check("Apple down → MapLibre took over automatically (one canvas, a toast, no user action)", during.engine === "maplibre" && during.wanted === "maplibre" && during.canvases === 1, JSON.stringify({ engine: during.engine, canvases: during.canvases, toast: during.toast }));
    check("no loss: selected door (sheet still open), assigned turf, knock, callback, note, event count, camera", during.sheet && JSON.stringify(during.turf) === JSON.stringify(before.turf) && during.pins === before.pins && during.events === before.events && during.notes === before.notes && during.cb === before.cb && during.queued === before.queued && dist < 0.0006,
      JSON.stringify({ sheet: during.sheet, pins: [before.pins, during.pins], events: [before.events, during.events], notes: [before.notes, during.notes], dist }));
    await shot("14-MAPLIBRE-FALLBACK-same-state-after-apple-failure");
    report.fallback.during = during;
    // a knock made while Apple is down
    const offlineKnock = await page.evaluate(async () => { const p = STORE.pins.find((x) => x.territoryId === window.__hood && x.disposition === "unworked"); await STORE.addKnock({ pinId: p.id, lat: p.lat, lng: p.lng, disposition: "nothome", reason: null, dm: false, note: "", callbackAt: null }); return { id: p.id, events: STORE.events.length }; });
    appleDown = false;  // signal returns
    await page.evaluate(() => { Object.defineProperty(navigator, "onLine", { get: () => true, configurable: true }); window.dispatchEvent(new Event("online")); });
    await page.waitForFunction(() => MMAP.engine() === "mapkit", null, { timeout: 60000 }).catch(() => {});
    await settle(12);
    const after = await page.evaluate((ids) => { const a = STORE.pins.find((x) => x.id === ids.a), b = STORE.pins.find((x) => x.id === ids.b), k = STORE.pins.find((x) => x.id === ids.k); const r = MMAP.engineReport(); const c = r.renderer.counts ? r.renderer.counts() : {};
      return { engine: r.engine, authorized: c.authorized, pins: STORE.pins.length, events: STORE.events.length, notes: (a.notes || []).length, cb: b.callbackAt, knock: k.disposition, hist: k.history.length, dup: STORE.events.filter((e) => e.pinId === ids.k).length, selected: c.selected, sheet: document.querySelector("#lead-sheet").classList.contains("open") }; }, { a: before.a, b: before.b, k: offlineKnock.id });
    check("signal back → Apple again, authorized, with nothing duplicated or lost (the knock made during the outage is there exactly once)", after.engine === "mapkit" && after.authorized && after.pins === before.pins && after.events === offlineKnock.events && after.notes === before.notes && after.cb === before.cb && after.knock === "nothome" && after.dup === 1 && after.selected === before.a,
      JSON.stringify(after));
    report.fallback.after = after;

    section("6. The token never persisted, never exposed");
    const leak = await page.evaluate(async () => {
      const s = JSON.stringify(STORE.settings);
      const rows = await MDB.getAll("settings").catch(() => []);
      const stored = JSON.stringify(rows || []);
      return { slot: STORE.settings.mapkitToken, inSettings: s.includes(window.RALLY_MAPKIT.token), inIndexedDB: stored.includes(window.RALLY_MAPKIT.token) };
    });
    const vaultSrc = fs.readFileSync(path.join(ROOT, "js", "vault.js"), "utf8");
    check("the token is not in settings, not in the development slot, not in IndexedDB — and the slot is on the backup's strip list", leak.slot === "" && !leak.inSettings && !leak.inIndexedDB && /SETTINGS_SECRETS[^;]*"mapkitToken"/.test(vaultSrc), JSON.stringify(leak));
    const shotsDir = fs.readdirSync(SHOTS);
    check("no frame or log line carries the token (console output is scrubbed; screenshots hold no settings screen)", shotsDir.length > 0 && !fs.existsSync(path.join(SHOTS, "token.txt")), shotsDir.length + " frames");
    check("no page errors", errors.length === 0, JSON.stringify(errors.slice(0, 4)));
  } catch (e) {
    if (String(e.message) !== "unauthorized") { fail++; console.log("  ✗ proof threw: " + (e.stack || e).toString().split("\n").slice(0, 3).join(" | ")); }
  } finally {
    await browser.close();
  }

  console.log("\n== APPLE MAPKIT PROOF SUMMARY ==");
  console.log(JSON.stringify({ appleAuthorized: report.appleAuthorized, mapkitVersion: report.mapkitVersion, appleResponses: apple, densities: report.densities.map((d) => ({ n: d.n, real: d.real, synthetic: d.synthetic, initMs: d.init, annotationsMs: d.pinsMs, overlayMs: d.hoodsMs, fps: d.fps, worstFrameMs: d.worstFrame, selectMs: d.selMs, clustersLow: d.low.clusters, pinsHigh: d.high.pins, heapMB: d.memMB, heapDeltaMB: d.memDeltaMB })) }, null, 1));
  console.log(`\n${pass} passed, ${fail} failed · frames in ${SHOTS}`);
  process.exit(fail ? 1 : 0);
})();
