/* RALLY — THE ISOLATED PREVIEW shares nothing with production.

   Builds the preview with rally/tools/build-preview.sh (a fake token in
   MAPKIT_TOKEN, so the never-persisted claim can be checked), then serves
   PRODUCTION at /rally/ and THE PREVIEW at /rally-preview/ from ONE origin
   — exactly the shape GitHub Pages gives them — and proves:

     A  the build: its own database name, its own cache family (and a
        family-scoped cleanup), cloud emptied, PREVIEW in the manifest and
        title, no tests/db/tools shipped, and the SOURCE tree untouched
     B  production writes a door; the preview boots with an EMPTY book in a
        DIFFERENT IndexedDB database, a demo team, a PREVIEW ribbon, the
        cloud bridge forced off, zero requests toward the team server, no
        demo grid on offer
     C  the preview's own territory workflow: a saved territory reads
        "Territory 1" (device-minted, marked as such — SIMULATED because
        0018 is not applied), then "Territory 2"
     D  Preview-as switches the phone to a rep: blue turf, rep role, no
        manager tools
     E  the stamped token is served to the map engine and is NOWHERE in
        storage: not in settings, not in the dev slot, not in IndexedDB,
        not in localStorage, not in a backup
     F  back in production: only production's door, none of the preview's

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/preview-test.js */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8943);
const FAKE_TOKEN = "eyJ-FAKE-PREVIEW-TOKEN-never-real." + "x".repeat(40);
const FIXTURE = fs.readFileSync(path.join(__dirname, "fixtures", "osm-buildings.json"), "utf8");

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail !== undefined ? " — " + detail : "")); }
};
const section = (t) => console.log("\n== " + t);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- A. the build ----------
section("A. The build");
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), "rally-preview-"));
const built = execFileSync("sh", [path.join(ROOT, "tools", "build-preview.sh"), ROOT, OUT, "p5"],
  { env: Object.assign({}, process.env, { MAPKIT_TOKEN: FAKE_TOKEN }), encoding: "utf8" });
check("the build script reports success and never prints the token", /preview built/.test(built) && !built.includes(FAKE_TOKEN) && !built.includes("eyJ-FAKE"), built.trim());
const rd = (f) => fs.readFileSync(path.join(OUT, f), "utf8");
const src = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
check("preview-config: its own database, its own cache family, isolated, demo, a PREVIEW label",
  /db: "rally-preview-p5"/.test(rd("js/preview-config.js")) && /cache: "rallyp5-"/.test(rd("js/preview-config.js")) && /isolated: true/.test(rd("js/preview-config.js")) && /demo: true/.test(rd("js/preview-config.js")) && /label: "PREVIEW v\d+"/.test(rd("js/preview-config.js")));
check("sw.js: CACHE, TILE_CACHE and FAMILY all moved off production's names, and the cleanup only ever deletes its own family",
  /^const CACHE = "rallyp5-v\d+";/m.test(rd("sw.js")) && /^const TILE_CACHE = "rallyp5-tiles-v1";/m.test(rd("sw.js")) && /^const FAMILY = "rallyp5-";/m.test(rd("sw.js")) && !/rally-v\d/.test(rd("sw.js")) && /k\.startsWith\(FAMILY\)/.test(rd("sw.js")));
check("production sw.js (the source) still names ITS caches and ALSO only deletes its own family — two workers on one origin cannot touch each other's caches",
  /^const CACHE = "rally-v\d+";/m.test(src("sw.js")) && /^const FAMILY = "rally-";/m.test(src("sw.js")) && /k\.startsWith\(FAMILY\)/.test(src("sw.js")) && !"rallyp5-v46".startsWith("rally-"));
check("cloud-config: url and anonKey emptied; the source still carries the real project", /url: ""/.test(rd("js/cloud-config.js")) && /anonKey: ""/.test(rd("js/cloud-config.js")) && /supabase\.co/.test(src("js/cloud-config.js")));
check("mapkit-config: the token from the environment is in the OUTPUT only; the source stays empty", rd("js/mapkit-config.js").includes(FAKE_TOKEN) && /token: ""/.test(src("js/mapkit-config.js")) && !src("js/mapkit-config.js").includes("eyJ"));
check("manifest and title say PREVIEW; tests, db and tools are not shipped", /RALLY PREVIEW/.test(rd("manifest.webmanifest")) && /RALLY P5/.test(rd("manifest.webmanifest")) && /<title>RALLY PREVIEW/.test(rd("index.html")) && !fs.existsSync(path.join(OUT, "tests")) && !fs.existsSync(path.join(OUT, "db")) && !fs.existsSync(path.join(OUT, "tools")));
check("the source preview-config is NULL — the normal RALLY path never sees a preview", /window\.RALLY_PREVIEW = window\.RALLY_PREVIEW \|\| null;/.test(src("js/preview-config.js")));
check("db.js opens the preview's database only when RALLY_PREVIEW names one, and meridian-db otherwise", /window\.RALLY_PREVIEW && window\.RALLY_PREVIEW\.db\) \|\| "meridian-db"/.test(src("js/db.js")));

// ---------- the one-origin server: /rally/ = source, /rally-preview/ = build ----------
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".pbf": "application/x-protobuf" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let base = null;
  if (p.startsWith("/rally-preview/")) { base = OUT; p = p.slice("/rally-preview".length); }
  else if (p.startsWith("/rally/")) { base = ROOT; p = p.slice("/rally".length); }
  if (!base) { res.writeHead(404); res.end(); return; }
  if (p === "/") p = "/index.html";
  fs.readFile(path.join(base, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(d);
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let cloudHits = 0, appleHits = 0;
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => {
    if (/supabase\.co/.test(r.request().url())) cloudHits++;
    if (/apple/.test(r.request().url())) appleHits++;
    r.abort();
  });
  await ctx.route(/overpass-api\.de/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: FIXTURE }));
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    // PRODUCTION runs cloud-less in this container (as every suite does);
    // the PREVIEW is left alone so its own built config is what decides
    if (location.pathname.startsWith("/rally/")) window.RALLY_CLOUD = { url: "", anonKey: "" };
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/net::ERR|Failed to load resource|401|fetch/i.test(m.text())) errors.push("console: " + m.text()); });

  const boot = async (url, signup) => {
    await page.goto(url);
    // a remembered session unlocks straight through; a fresh database asks
    await page.waitForFunction(() => { const g = document.querySelector("#gate"); return g && (!g.hidden || (window.MAUTH && MAUTH.isUnlocked())); }, null, { timeout: 30000 });
    if (await page.evaluate(() => !document.querySelector("#gate").hidden)) {
      if (signup) {
        await page.click("#gate-swap-btn");
        await page.fill("#gate-name", signup.name); await page.fill("#gate-email", signup.email);
      }
      await page.fill("#gate-pass", "knock1234");
      await page.click("#gate-submit");
    }
    await page.waitForFunction(() => document.querySelector("#gate").hidden && window.STORE && window.MMAP && MMAP.isReady(), null, { timeout: 30000 });
    await sleep(500);
  };
  const dbNames = () => page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name).sort());

  try {
    // ---------- B. production first, then the preview ----------
    section("B. Production writes a door; the preview boots empty, apart, and offline from the team");
    await boot(`http://localhost:${PORT}/rally/`, { name: "Prod Person", email: "prod@example.com" });
    const prod = await page.evaluate(async () => {
      await STORE.addKnock({ lat: 38.862, lng: -94.77, pinId: null, disposition: "nothome", reason: null, dm: false, note: "production door", callbackAt: null });
      return { pins: STORE.pins.length, preview: window.RALLY_PREVIEW, ribbon: document.querySelector("#preview-ribbon").hidden, users: STORE.users.map((u) => u.name) };
    });
    check("production: one door written, RALLY_PREVIEW is null, no ribbon, the device user is the person who signed up", prod.pins === 1 && prod.preview === null && prod.ribbon && prod.users.join() === "Prod Person", JSON.stringify(prod));
    const dbs1 = await dbNames();
    check("production's database is meridian-db", dbs1.includes("meridian-db") && !dbs1.includes("rally-preview-p5"), dbs1.join());

    await boot(`http://localhost:${PORT}/rally-preview/`, { name: "Preview Tester", email: "preview@example.com" });
    const pv = await page.evaluate(() => ({
      preview: window.RALLY_PREVIEW, cloud: window.RALLY_CLOUD, enabled: MCLOUD.enabled(), pins: STORE.pins.length, terr: STORE.territories.length,
      users: STORE.users.map((u) => u.name + ":" + u.role), me: STORE.currentUser().name, role: STORE.effectiveRole(), roleLine: STORE.roleLine(),
      ribbon: { hidden: document.querySelector("#preview-ribbon").hidden, text: document.querySelector("#preview-ribbon").textContent }, bodyClass: document.body.className,
      demoChip: document.querySelector('#pd-source .pd-chip[data-s="demo"]').hidden, build: document.querySelector("#more-build").textContent,
      title: document.title, token: !!(window.RALLY_MAPKIT && window.RALLY_MAPKIT.token), hasToken: MENGINE.hasToken(), engine: MMAP.engine(),
    }));
    check("the preview boots with RALLY_PREVIEW set (isolated, demo), an EMPTY book, and the PREVIEW ribbon on screen", pv.preview && pv.preview.isolated && pv.preview.demo && pv.pins === 0 && pv.terr === 0 && !pv.ribbon.hidden && /PREVIEW/.test(pv.ribbon.text) && /isolated demo data/.test(pv.ribbon.text) && /is-preview/.test(pv.bodyClass), JSON.stringify({ pins: pv.pins, ribbon: pv.ribbon }));
    check("the cloud bridge is OFF twice over: the built config is empty AND MCLOUD.enabled() is false; nothing was sent toward the team server", pv.cloud && pv.cloud.url === "" && pv.enabled === false && cloudHits === 0, JSON.stringify({ cloud: pv.cloud, enabled: pv.enabled, cloudHits }));
    check("a named demo team was seeded — the person who signed up IS the demo manager — and the role line says local, not company-authorized", pv.users.length === 4 && /Demo Rep A:rep/.test(pv.users.join()) && /Demo Rep B:rep/.test(pv.users.join()) && pv.me === "Preview Tester" && pv.role === "manager" && /Local device only/.test(pv.roleLine), JSON.stringify({ users: pv.users, me: pv.me, role: pv.role }));
    check("the demo grid is not on offer, the More screen names the build as an ISOLATED PREVIEW, the tab title says PREVIEW", pv.demoChip && /ISOLATED PREVIEW/.test(pv.build) && /rally-preview-p5/.test(pv.build) && /PREVIEW/.test(pv.title), JSON.stringify({ chip: pv.demoChip, build: pv.build, title: pv.title }));
    check("the stamped token reached the map engine (Apple's library is unreachable from this container, so the engine fell back — with the token present)", pv.token && pv.hasToken && pv.engine === "maplibre", JSON.stringify({ token: pv.token, hasToken: pv.hasToken, engine: pv.engine }));
    const dbs2 = await dbNames();
    check("the preview opened ITS database, beside production's, on the same origin", dbs2.includes("rally-preview-p5") && dbs2.includes("meridian-db"), dbs2.join());
    const demoForced = await page.evaluate(async () => { STORE.settings.propertySource = "demo"; const n = MPROP.activeName(); STORE.settings.propertySource = "auto"; return n; });
    check("even a setting that asks for the demo grid gets real houses in the preview (OpenStreetMap)", demoForced === "osm", demoForced);

    // ---------- C. the territory workflow in the preview: a NUMBER on the territory ----------
    section("C. A saved territory in the preview reads 'Territory 1' — a device-minted number, marked as such (SIMULATED: 0018 not applied)");
    const RING = [[-94.7712, 38.8610], [-94.7690, 38.8610], [-94.7690, 38.8630], [-94.7712, 38.8630]];
    await page.evaluate((ring) => { MAPP.show("map"); MMAP.jumpTo(-94.7701, 38.862, 16.6); MHOODS.createFromPoints(ring); }, RING);
    await page.waitForFunction(() => { const r = document.querySelector("#hd-review"); return r && !r.hidden; }, null, { timeout: 30000 });
    await sleep(300);
    const found = await page.evaluate(() => ({ preview: MMAP.previewDoors().length, card: document.querySelector("#pc-id").textContent.trim(), title: document.querySelector("#hood-sheet-title").textContent }));
    check("the area's houses are found from real footprints and shown before Save; the card says New territory", found.preview > 10 && found.card === "New territory" && /New territory/.test(found.title), JSON.stringify(found));
    await page.evaluate(() => document.querySelector("#hood-save").click());
    await page.waitForFunction(() => STORE.territories.length === 1 && STORE.pins.length > 10, null, { timeout: 30000 });
    await sleep(600);
    const t1 = await page.evaluate(() => { const t = STORE.territories[0]; return { seq: t.seq, src: t.seqSource, label: STORE.hoodLabel(t), pins: STORE.pins.length, list: Array.from(document.querySelectorAll("#hood-list .hn")).map((e) => e.textContent) }; });
    check("saved: seq 1, minted by the device and marked 'device-preview', so every screen reads 'Territory 1'", t1.seq === 1 && t1.src === "device-preview" && t1.label === "Territory 1" && t1.pins === found.preview, JSON.stringify(t1));
    await page.evaluate(async (ring) => { MHOODS.createFromPoints(ring.map(([x, y]) => [x + 0.004, y])); }, RING);
    await page.waitForFunction(() => { const r = document.querySelector("#hd-review"); return r && !r.hidden; }, null, { timeout: 30000 });
    await page.evaluate(() => document.querySelector("#hood-save").click());
    await page.waitForFunction(() => STORE.territories.length === 2, null, { timeout: 30000 });
    await sleep(400);
    const t2 = await page.evaluate(() => STORE.territories.map((t) => STORE.hoodLabel(t)).join("|"));
    check("the next one is Territory 2 — numbers are never reused, exactly as the server would issue them", t2 === "Territory 1|Territory 2", t2);
    // tap the saved territory: the card names it by number
    await page.evaluate(() => { MUI.closeSheet(); MHOODS.openExisting(STORE.territories[0].id); });
    await sleep(500);
    const card = await page.evaluate(() => ({ id: document.querySelector("#pc-id").textContent.trim(), houses: document.querySelector("#pc-houses").textContent.trim(), sel: MMAP.selectedHood() === STORE.territories[0].id }));
    check("opening it: 'Territory 1 · N Houses' on the card and the boundary selected on the map", /^Territory 1/.test(card.id) && Number(card.houses) === t1.pins && card.sel, JSON.stringify(card));
    await page.evaluate(() => MUI.closeSheet()); await sleep(300);

    // ---------- D. Preview-as ----------
    section("D. Preview-as: the same phone, seen as a rep");
    await page.evaluate(async () => { const t = STORE.territories[0]; const rep = STORE.users.find((u) => u.name === "Demo Rep A"); await STORE.setAssignees(t, [rep.id]); MAPP.show("more"); });
    await sleep(300);
    const chips = await page.evaluate(() => ({ hidden: document.querySelector("#preview-as").hidden, n: document.querySelectorAll("#preview-as-chips .pv-chip").length }));
    check("More shows a Preview-as row with one chip per demo teammate", !chips.hidden && chips.n === 4, JSON.stringify(chips));
    await page.evaluate(() => { Array.from(document.querySelectorAll("#preview-as-chips .pv-chip")).find((b) => /Demo Rep A/.test(b.textContent)).click(); });
    await sleep(600);
    const asRep = await page.evaluate(() => ({ me: STORE.currentUser().name, role: STORE.effectiveRole(), can: STORE.canManageTerritories(), ribbon: document.querySelector("#preview-ribbon").textContent,
      mine: STORE.hoodsOf(STORE.myId()).length, toast: document.querySelector("#toast").textContent }));
    check("as Demo Rep A: role rep, no territory management, the ribbon names the rep, their one assigned territory is theirs", asRep.me === "Demo Rep A" && asRep.role === "rep" && !asRep.can && /Demo Rep A/.test(asRep.ribbon) && asRep.mine === 1 && /Previewing as Demo Rep A/.test(asRep.toast), JSON.stringify(asRep));
    await page.evaluate(() => { MAPP.show("map"); });
    await sleep(600);
    const repMap = await page.evaluate(() => { const c = MMAP.engineReport().renderer.counts ? MMAP.engineReport().renderer.counts() : null; return { hoods: c ? c.hoods : null, pins: STORE.pins.length }; });
    check("their map: the assigned turf and its saved pins are already there", (repMap.hoods === null || repMap.hoods === 1) && repMap.pins === t1.pins + (await page.evaluate(() => STORE.pins.length - STORE.pins.filter((p) => p.territoryId === STORE.territories[0].id).length)), JSON.stringify(repMap));
    await page.evaluate(() => { MAPP.show("more"); Array.from(document.querySelectorAll("#preview-as-chips .pv-chip")).find((b) => /Preview Tester/.test(b.textContent)).click(); });
    await sleep(400);
    check("…and back to the manager", (await page.evaluate(() => STORE.effectiveRole())) === "manager");

    // ---------- E. the token is nowhere ----------
    section("E. The token is served to the engine and persisted NOWHERE");
    const tok = await page.evaluate(async (fake) => {
      const settings = await MDB.kvGet("settings", {});
      const kv = [];
      // every kv row, stringified, searched for the token
      for (const k of ["settings", "account", "session", "cloudSession", "cloudProfile", "splitPending"]) { const v = await MDB.kvGet(k, null); kv.push(JSON.stringify(v) || ""); }
      const ls = Object.keys(localStorage).map((k) => k + "=" + localStorage.getItem(k)).join("\n");
      const backup = window.MVAULT && MVAULT.exportPayload ? JSON.stringify(await MVAULT.exportPayload()) : (window.MVAULT && MVAULT.buildBackup ? JSON.stringify(await MVAULT.buildBackup()) : "");
      return { inSettings: settings.mapkitToken || "", devSlot: STORE.settings.mapkitToken || "", inKv: kv.some((s) => s.includes(fake)), inLs: ls.includes(fake), backupHasIt: backup.includes(fake), backupChecked: !!backup };
    }, FAKE_TOKEN);
    check("not in settings, not in the development slot, not in any IndexedDB kv row, not in localStorage" + (tok.backupChecked ? ", not in a backup" : ""), tok.inSettings === "" && tok.devSlot === "" && !tok.inKv && !tok.inLs && !tok.backupHasIt, JSON.stringify(tok));
    check("and no request carried it anywhere but Apple's own CDN attempt (blocked here)", cloudHits === 0, JSON.stringify({ cloudHits, appleHits }));

    // ---------- F. production again ----------
    section("F. Back in production: only production's own door");
    await boot(`http://localhost:${PORT}/rally/`);
    const prod2 = await page.evaluate(() => ({ pins: STORE.pins.length, note: STORE.pins[0] && STORE.pins[0].note, terr: STORE.territories.length, users: STORE.users.map((u) => u.name), preview: window.RALLY_PREVIEW, ribbon: document.querySelector("#preview-ribbon").hidden }));
    check("production still has exactly its one door and none of the preview's territories, pins or demo reps", prod2.pins === 1 && prod2.note === "production door" && prod2.terr === 0 && prod2.users.join() === "Prod Person" && prod2.preview === null && prod2.ribbon, JSON.stringify(prod2));

    check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  } catch (e) {
    fail++;
    console.log("  ✗ suite crashed — " + (e && e.stack || e));
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  server.close();
  fs.rmSync(OUT, { recursive: true, force: true });
  process.exit(fail ? 1 : 0);
})();
