/* RALLY — THE TERRITORY WORKFLOW, end to end, on real rooftops.

     DRAW AN AREA → COMPLETE THE SHAPE → TAP THE AREA → RALLY FINDS THE HOUSES
     → PINS ON THE BUILDINGS → REVIEW → ASSIGN REPS → SAVE → THE TERRITORY,
     ITS PROPERTY IDENTITIES AND THEIR HISTORY PERSIST.

   Driven through the real app on a device with NO team server, against a
   mocked Overpass endpoint that answers with tests/fixtures/osm-buildings.json:
   341 REAL building outlines from an Overland Park subdivision (ODbL,
   © OpenStreetMap contributors), 340 of them tagged only building=yes —
   which is what a US suburb looks like in OSM, and why the inferred-home
   rule exists. Nothing synthetic is drawn: every pin here is a real roof.

   What is proved, section by section:
     A  Done completes the area and opens nothing; a tap OUTSIDE it is
        refused (no knock); a tap INSIDE opens the sheet, finds the houses,
        puts blue pins on the roofs before anything is saved, and the
        review says which homes were inferred from footprint size
     B  the area remembers its scan: close, tap again, no second request
     C  assign two reps, Save → one territory, N doors with stable ids, no
        preview left behind
     D  a manager's tap on the SAVED territory opens it with its houses —
        no re-scan, no second copy
     E  outcomes, a note and a callback survive a full reload; the same
        property ids come back
     F  a rep's tap on the same ground is a knock; a manager's is the turf
     G  editing the outline says what moves BEFORE saving, deletes nothing,
        and a scan afterwards matches every house RALLY already holds
     H  Smart Split keeps every property identity
     I  the inferred-home classifier, unit-level: sizes, tags, landuse

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/area-workflow-test.js */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8941);
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "osm-buildings.json"), "utf8"));

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail !== undefined ? " — " + detail : "")); }
};
const section = (t) => console.log("\n== " + t);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
  ".pbf": "application/x-protobuf", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(d);
  });
});

const CENTRE = { lat: 38.8620, lng: -94.7700 };
const CORNERS = [[95, 300], [300, 285], [325, 515], [190, 610], [80, 520]];

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let overpassCalls = 0;
  // routes match newest-first: the catch-all abort goes on FIRST so the
  // Overpass mock registered after it is the one that answers
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await ctx.route(/overpass-api\.de/, (route) => { overpassCalls++; route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIXTURE) }); });
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" };
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/net::ERR|Failed to load resource|401|fetch/i.test(m.text())) errors.push("console: " + m.text()); });
  const dialogs = [];
  page.on("dialog", async (d) => { dialogs.push(d.message()); await d.accept(); });

  const bootApp = async () => {
    await page.waitForFunction(() => document.querySelector("#gate") && document.querySelector("#gate").hidden, null, { timeout: 30000 });
    await page.waitForFunction(() => window.STORE && window.MMAP && window.MHOODS && window.MTEDIT, null, { timeout: 30000 });
    await page.waitForFunction(() => MMAP.isReady(), null, { timeout: 30000 });
    await sleep(500);
  };
  const beUser = async (id) => {
    await page.evaluate(async (uid) => {
      STORE.settings.currentUserId = uid; await STORE.saveSettings(); await STORE.loadRoleState();
      if (window.MAPP && MAPP.roleChanged) MAPP.roleChanged();
      MMAP.clearSelection(); MMAP.refreshHoods(); MMAP.refreshPins(); MMAP.updateBrandToday();
    }, id);
    await sleep(300);
  };
  const sheetOpen = (id) => page.evaluate((i) => document.querySelector("#" + i).classList.contains("open"), id);
  const reviewLines = () => page.evaluate(() => {
    const o = {};
    document.querySelectorAll("#hd-review .hr-line").forEach((l) => {
      const k = l.querySelector("span").textContent.trim();
      const b = l.querySelector("b");
      const m = b && b.textContent.trim().match(/^\d+/);
      o[k] = m ? Number(m[0]) : (b ? b.textContent.trim() : null);
    });
    return o;
  });
  const pinShape = () => page.evaluate(() => ({
    n: STORE.pins.length, ids: STORE.pins.map((p) => p.id).sort(),
    ext: new Set(STORE.pins.map((p) => p.prop && p.prop.externalId)).size,
    sources: [...new Set(STORE.pins.map((p) => p.prop && p.prop.source))],
    placements: [...new Set(STORE.pins.map((p) => p.prop && p.prop.placement))],
    territoryIds: [...new Set(STORE.pins.map((p) => p.territoryId))],
  }));
  // a spot inside the ring with no pin within a thumb of it, in screen px
  const groundInside = (ring) => page.evaluate((ring) => {
    const pts = STORE.pins.map((p) => MMAP.project(p.lng, p.lat)).filter(Boolean);
    let best = null, bestD = 0;
    for (let y = 120; y < 700; y += 6) for (let x = 30; x < 360; x += 6) {
      const ll = MMAP.unproject(x, y);
      if (!MGEOM.pointInRing(ring, ll.lng, ll.lat)) continue;
      let d = 1e9;
      for (const q of pts) { const dd = Math.hypot(q.x - x, q.y - y); if (dd < d) d = dd; }
      if (d > bestD) { bestD = d; best = { x, y, d: Math.round(d) }; }
    }
    return best;
  }, ring);

  // tap bare ground inside a ring (the pending area, or a saved territory's)
  const tapInside = async (ringOrId) => {
    const ring = typeof ringOrId === "string"
      ? await page.evaluate((id) => STORE.territories.find((t) => t.id === id).points, ringOrId)
      : ringOrId;
    const g = await groundInside(ring);
    if (!g) throw new Error("no bare ground inside the ring");
    await page.mouse.click(g.x, g.y);
    return g;
  };

  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
  await page.click("#gate-swap-btn");
  await page.fill("#gate-name", "Area Manager");
  await page.fill("#gate-email", "area@example.com");
  await page.fill("#gate-pass", "knock1234");
  await page.click("#gate-submit");
  await bootApp();

  try {
    const seed = await page.evaluate(async ({ CENTRE }) => {
      const me = STORE.currentUser();
      me.name = "Area Manager"; me.role = "owner"; await STORE.updateUser(me);
      await STORE.loadRoleState();
      const jake = await STORE.addUser({ name: "Jake Rowe", role: "rep" });
      const mia = await STORE.addUser({ name: "Mia Cole", role: "rep" });
      window.__crew = { me: me.id, jake: jake.id, mia: mia.id };
      MAPP.show("map");
      MMAP.jumpTo(CENTRE.lng, CENTRE.lat, 16.6);
      return { me: me.id, jake: jake.id, mia: mia.id, role: STORE.effectiveRole(), provider: MPROP.activeName() };
    }, { CENTRE });
    check("seed: a manager on a device with no team server, real-provider (OpenStreetMap) by default", seed.role === "owner" && seed.provider === "osm", JSON.stringify(seed));
    await sleep(900);

    // =============================================== A. DRAW → COMPLETE → TAP
    section("A. Draw corners → Done completes the area → the TAP finds the houses");
    await page.evaluate(() => document.querySelector("#fab-hoods").click());
    await sleep(400);
    await page.evaluate(() => document.querySelector("#mt-corners").click());
    await sleep(400);
    for (const [x, y] of CORNERS) { await page.mouse.click(x, y); await sleep(160); }
    await page.evaluate(() => document.querySelector("#draw-done").click());
    await sleep(400);
    const done = await page.evaluate(() => ({
      sheet: document.querySelector("#hood-sheet").classList.contains("open"),
      knock: document.querySelector("#knock-sheet").classList.contains("open"),
      area: (MMAP.pendingArea() || []).length, drawing: MHOODS.isDrawing(),
      bar: !document.querySelector("#draw-bar").hidden, msg: document.querySelector("#draw-msg").textContent,
      find: !document.querySelector("#draw-find").hidden, undo: document.querySelector("#draw-undo").hidden,
      pins: STORE.pins.length, preview: MMAP.previewDoors().length }));
    check("Done: the completed area is on the map (5 corners), draw mode is over, NO sheet opened, no houses yet", !done.sheet && !done.knock && done.area === 5 && !done.drawing && done.pins === 0 && done.preview === 0, JSON.stringify(done));
    check("the bar says what to do next — tap inside the area — and offers Find houses as the button form", done.bar && /tap inside/i.test(done.msg) && done.find && done.undo, JSON.stringify(done));
    const ring = await page.evaluate(() => MMAP.pendingArea());

    await page.mouse.click(40, 240);    // outside the five corners, on bare map
    await sleep(500);
    const outside = await page.evaluate(() => ({ sheet: document.querySelector("#hood-sheet").classList.contains("open"), knock: document.querySelector("#knock-sheet").classList.contains("open"), toast: document.querySelector("#toast").textContent, pins: STORE.pins.length, area: (MMAP.pendingArea() || []).length }));
    check("a tap OUTSIDE the waiting area is refused in words — no knock, no sheet, no pin, the area stays", !outside.sheet && !outside.knock && outside.pins === 0 && outside.area === 5 && /tap inside/i.test(outside.toast), JSON.stringify(outside));

    const before = overpassCalls;
    await page.mouse.click(200, 450);   // inside
    await page.waitForFunction(() => { const r = document.querySelector("#hd-review"); return r && !r.hidden; }, null, { timeout: 30000 });
    await sleep(400);
    const rv = await reviewLines();
    const found = await page.evaluate(() => ({
      sheet: document.querySelector("#hood-sheet").classList.contains("open"), title: document.querySelector("#hood-sheet-title").textContent,
      status: document.querySelector("#hd-status").textContent.trim(), source: document.querySelector("#hood-source").textContent.trim(),
      card: { hidden: document.querySelector("#polycard").hidden, id: document.querySelector("#pc-id").textContent.trim(), houses: document.querySelector("#pc-houses").textContent.trim(), sales: document.querySelector("#pc-sales").textContent.trim() },
      preview: MMAP.previewDoors().length, pins: STORE.pins.length,
      btn: document.querySelector("#hd-import-btn").textContent.trim(), on: document.querySelector("#hd-import-btn").classList.contains("sel"),
      assign: !document.querySelector("#hood-assign-open").hidden, edit: !document.querySelector("#hd-redraw").hidden, save: !!document.querySelector("#hood-save"),
      allInside: MMAP.previewDoors().every((p) => MGEOM.pointInRing(MMAP.pendingArea(), p.lng, p.lat)),
    }));
    check("the tap INSIDE opens the territory sheet for the new area and asked the provider exactly once", found.sheet && /New territory/.test(found.title) && overpassCalls === before + 1, JSON.stringify({ title: found.title, calls: overpassCalls - before }));
    const N = rv["Will be imported"];
    check(`RALLY found the residential houses inside that exact boundary — ${N} real roofs, every one on a building outline, none already in RALLY`, N >= 12 && rv["On the building outline"] === N + (rv["Already in RALLY (matched, not duplicated)"] || 0) && rv["Already in RALLY (matched, not duplicated)"] === 0 && rv["Parcel-level (lot, not house)"] === 0, JSON.stringify(rv));
    check("the inferred-home rule is what found them, and the review SAYS so (house-sized outline, no address) — nothing is passed off as classified", rv["Inferred homes (house-sized outline, no address)"] >= N - 5 && /inferred from footprint size/.test(found.source) && /every one on a building outline/.test(found.source), JSON.stringify({ inferred: rv["Inferred homes (house-sized outline, no address)"], source: found.source }));
    check("no demo grid, no parcel centroid: the source is OpenStreetMap buildings and every placement is a rooftop", rv.Source === "OpenStreetMap buildings" && !("Demo grid — not real houses" in rv), JSON.stringify(rv));
    check(`the ${N} houses are on the map NOW as blue pins on the buildings — before anything is saved — and all inside the boundary`, found.preview === N && found.pins === 0 && found.allInside, JSON.stringify({ preview: found.preview, pins: found.pins, allInside: found.allInside }));
    check("the compact summary reads New territory · N Houses · 0 Sales", !found.card.hidden && found.card.id === "New territory" && Number(found.card.houses) === N && found.card.sales === "0", JSON.stringify(found.card));
    check("the sheet offers Assign reps, Edit the area, Save — and the import is ON with the count in the button", found.assign && found.edit && found.save && found.on && new RegExp("Import " + N + " doors when I save").test(found.btn), JSON.stringify({ btn: found.btn, on: found.on }));

    // a tap on one of the found houses says what it is, and logs no knock
    const spot = await page.evaluate(() => { const d = MMAP.previewDoors()[0]; const s = MMAP.project(d.lng, d.lat); return { x: s.x, y: s.y }; });
    await page.evaluate(() => MUI.closeSheet()); await sleep(400);
    await page.mouse.click(spot.x, spot.y - 4); await sleep(400);
    const tapPin = await page.evaluate(() => ({ toast: document.querySelector("#toast").textContent, knock: document.querySelector("#knock-sheet").classList.contains("open"), pins: STORE.pins.length }));
    check("tapping a found house says it becomes a door when the territory is saved — no knock, no pin", /save the territory/i.test(tapPin.toast) && !tapPin.knock && tapPin.pins === 0, JSON.stringify(tapPin));

    // =============================================== B. THE AREA REMEMBERS ITS SCAN
    section("B. Close the sheet, tap the area again: same houses, no second request");
    const calls2 = overpassCalls;
    await tapInside(ring);   // bare ground: the found houses are pins now, and a pin's tap is its own
    await page.waitForFunction(() => document.querySelector("#hood-sheet").classList.contains("open"), null, { timeout: 10000 });
    await sleep(500);
    const again = await page.evaluate(() => ({ preview: MMAP.previewDoors().length, review: !document.querySelector("#hd-review").hidden, houses: document.querySelector("#pc-houses").textContent.trim() }));
    check("the second tap presents the same scan (same houses, same card) without asking the provider again", again.preview === N && again.review && Number(again.houses) === N && overpassCalls === calls2, JSON.stringify({ again, calls: overpassCalls - calls2 }));
    // the manager's import choice rides on the scan
    await page.evaluate(() => document.querySelector("#hd-import-btn").click());
    const off = await page.evaluate(() => document.querySelector("#hd-import-btn").classList.contains("sel"));
    await page.evaluate(() => MUI.closeSheet()); await sleep(400);
    await tapInside(ring);
    await page.waitForFunction(() => document.querySelector("#hood-sheet").classList.contains("open"), null, { timeout: 10000 }); await sleep(300);
    const stillOff = await page.evaluate(() => document.querySelector("#hd-import-btn").classList.contains("sel"));
    check("switching 'Import when I save' OFF survives closing and re-tapping the area (the choice rides on the scan)", off === false && stillOff === false, JSON.stringify({ off, stillOff }));
    await page.evaluate(() => document.querySelector("#hd-import-btn").click());   // back ON for the save below
    check("…and it switches back on", await page.evaluate(() => document.querySelector("#hd-import-btn").classList.contains("sel")));
    await page.evaluate(() => MUI.closeSheet()); await sleep(400);
    // on the MapLibre engine the area is painted UNDER the pins, like every territory
    const order = await page.evaluate(() => { const ids = MMAP.engineReport().renderer._layerOrder ? MMAP.engineReport().renderer._layerOrder() : null; return ids; });
    if (order) check("the completed area's layers sit below the pin layers on the fallback engine", order.indexOf("pending-area-fill") < order.indexOf("pins-dots") && order.indexOf("pending-area-line") < order.indexOf("pins-dots"), order.join(" > "));
    // a NEW draw replaces the waiting area instead of leaving it behind, un-clearable
    await page.evaluate(() => { document.querySelector("#fab-hoods").click(); }); await sleep(300);
    const toolsClear = await page.evaluate(() => !document.querySelector("#mt-clear").hidden);
    check("with an area waiting, the tools sheet offers Clear", toolsClear);
    await page.evaluate(() => document.querySelector("#mt-corners").click()); await sleep(300);
    const replaced = await page.evaluate(() => ({ area: MHOODS.pendingArea(), facade: MMAP.pendingArea(), preview: MMAP.previewDoors().length, drawing: MHOODS.isDrawing() }));
    check("starting a new draw takes the waiting area and its found houses off the map", replaced.area === null && replaced.facade === null && replaced.preview === 0 && replaced.drawing, JSON.stringify(replaced));
    await page.evaluate(() => document.querySelector("#draw-cancel").click()); await sleep(200);
    // …so redraw the same five corners and find the houses again for the save
    await page.evaluate(() => { document.querySelector("#fab-hoods").click(); }); await sleep(300);
    await page.evaluate(() => document.querySelector("#mt-corners").click()); await sleep(300);
    for (const [x, y] of CORNERS) { await page.mouse.click(x, y); await sleep(120); }
    await page.evaluate(() => document.querySelector("#draw-done").click()); await sleep(300);
    await page.evaluate(() => document.querySelector("#draw-find").click());
    await page.waitForFunction(() => { const r = document.querySelector("#hd-review"); return r && !r.hidden; }, null, { timeout: 30000 }); await sleep(300);
    check("the redrawn area finds the same houses", (await page.evaluate(() => MMAP.previewDoors().length)) === N);

    // =============================================== C. ASSIGN → SAVE
    section("C. Assign two reps and Save: one territory, N doors, stable identities");
    await page.evaluate(() => document.querySelector("#hood-assign-open").click());
    await sleep(400);
    for (const who of ["Jake Rowe", "Mia Cole"]) {
      await page.evaluate((nm) => { const row = Array.from(document.querySelectorAll("#assign-list .arep")).find((r) => r.textContent.includes(nm)); if (row) row.click(); }, who);
      await sleep(150);
    }
    await page.evaluate(() => document.querySelector("#assign-save").click());
    await sleep(400);
    const chips = await page.evaluate(() => Array.from(document.querySelectorAll("#hood-reps .rep-chip.sel")).map((c) => c.textContent.trim()));
    check("two reps are ticked on the sheet", chips.join("|") === "Jake Rowe|Mia Cole", chips.join("|"));
    await page.evaluate(() => document.querySelector("#hood-save").click());
    await page.waitForFunction((n) => STORE.pins.length >= n, N, { timeout: 30000 });
    await sleep(800);
    const saved = await page.evaluate(() => {
      const t = STORE.territories[0];
      return { terr: STORE.territories.length, id: t && t.id, reps: t ? STORE.currentAssignees(t).length : 0,
        preview: MMAP.previewDoors().length, area: MMAP.pendingArea(), bar: document.querySelector("#draw-bar").hidden,
        sheet: document.querySelector("#hood-sheet").classList.contains("open"), toast: document.querySelector("#toast").textContent,
        inside: STORE.pins.filter((p) => STORE.hoodOf(p) && STORE.hoodOf(p).id === t.id).length };
    });
    const shape1 = await pinShape();
    check("Save made ONE territory with the two reps, and the completed area is done with (no preview pins, no waiting ring, bar gone)", saved.terr === 1 && saved.reps === 2 && saved.preview === 0 && saved.area === null && saved.bar && !saved.sheet, JSON.stringify(saved));
    check(`the ${N} found houses are the territory's doors now: N pins, N distinct property ids, all stamped with the territory, source osm, rooftop placements`, shape1.n === N && shape1.ext === N && saved.inside === N && shape1.sources.join() === "osm" && shape1.territoryIds.length === 1 && shape1.territoryIds[0] === saved.id && shape1.placements.every((p) => /^building_/.test(p)), JSON.stringify({ n: shape1.n, ext: shape1.ext, inside: saved.inside, placements: shape1.placements }));
    check("the toast confirms the doors were pinned with the reps named", /doors pinned/.test(saved.toast) && /Jake Rowe and Mia Cole/.test(saved.toast), saved.toast);

    // =============================================== D. TAP THE SAVED TERRITORY
    section("D. A manager's tap on the SAVED territory opens it — its houses are already there, nothing is re-scanned");
    const calls3 = overpassCalls;
    await tapInside(saved.id);
    await page.waitForFunction(() => document.querySelector("#hood-sheet").classList.contains("open"), null, { timeout: 10000 });
    await sleep(500);
    const opened = await page.evaluate(() => {
      const t = STORE.territories[0];
      const fc = (function () { try { return MMAP.engineReport().renderer.counts(); } catch (_) { return null; } })();
      return { sel: MMAP.selectedHood(), id: t.id, title: document.querySelector("#hood-sheet-title").textContent, status: document.querySelector("#hd-status").textContent.trim(),
        scanBtn: document.querySelector("#hd-scan").textContent.trim(), scanHidden: document.querySelector("#hd-scan").hidden, review: document.querySelector("#hd-review").hidden,
        card: document.querySelector("#pc-id").textContent.trim() + " · " + document.querySelector("#pc-houses").textContent.trim(), preview: MMAP.previewDoors().length, counts: fc };
    });
    const shape2 = await pinShape();
    check("the tap selects the territory on the map and opens ITS sheet, not a new one", opened.sel === opened.id && /^Territory/.test(opened.title), JSON.stringify({ sel: opened.sel, id: opened.id, title: opened.title }));
    check(`its houses are simply there: "${N} doors on the map", no provider request, no preview pins, scan offered only as a button for NEW houses`, new RegExp("^" + N + " doors on the map").test(opened.status) && overpassCalls === calls3 && opened.preview === 0 && !opened.scanHidden && /new houses/i.test(opened.scanBtn) && opened.review, JSON.stringify({ status: opened.status, calls: overpassCalls - calls3, scanBtn: opened.scanBtn }));
    check("no second copy of any house was made by opening it", shape2.n === N && shape2.ext === N && JSON.stringify(shape2.ids) === JSON.stringify(shape1.ids));
    check("the summary card names the territory with its house count", /Territory · [0-9]+|Territory \d+ · [0-9]+/.test(opened.card) && new RegExp("· " + N + "$").test(opened.card), opened.card);
    const knockHere = await page.evaluate(() => !document.querySelector("#hd-knock-here").hidden);
    check("the sheet opened by a tap offers to log a door at that very spot (hand-pinning inside turf still exists)", knockHere);
    await page.click("#hood-sheet .grab"); await sleep(400);   // the way a thumb closes it
    check("closing the sheet clears the selection", (await page.evaluate(() => MMAP.selectedHood())) === null);
    // a saved territory's "scan for new houses" pins are a view of that sheet and leave with it
    await tapInside(saved.id);
    await page.waitForFunction(() => document.querySelector("#hood-sheet").classList.contains("open"), null, { timeout: 10000 });
    await page.evaluate(() => document.querySelector("#hd-scan").click());
    await page.waitForFunction(() => { const r = document.querySelector("#hd-review"); return r && !r.hidden; }, null, { timeout: 30000 }); await sleep(300);
    const scanned = await page.evaluate(() => MMAP.previewDoors().length);
    await page.click("#hood-sheet .grab"); await sleep(400);
    check("a saved territory's scan found nothing new (every house matched) and any preview pins leave with the sheet", scanned === 0 && (await page.evaluate(() => MMAP.previewDoors().length)) === 0, JSON.stringify({ scanned }));
    await page.evaluate(() => document.querySelector("#hd-knock-here") && null);

    // =============================================== E. OUTCOMES SURVIVE A RELOAD
    section("E. Outcomes, a note and a callback, then a full reload: the SAME properties with the SAME history");
    const work = await page.evaluate(async () => {
      const ps = STORE.pins.slice(0, 6);
      const cb = Date.now() + 3 * 3600e3;
      await STORE.addKnock({ pinId: ps[0].id, lat: ps[0].lat, lng: ps[0].lng, disposition: "nothome", reason: null, dm: false, note: "", callbackAt: null });
      await STORE.addKnock({ pinId: ps[1].id, lat: ps[1].lat, lng: ps[1].lng, disposition: "nothome", reason: null, dm: false, note: "", callbackAt: null });
      await STORE.addKnock({ pinId: ps[2].id, lat: ps[2].lat, lng: ps[2].lng, disposition: "notint", reason: "Has a guy", dm: true, note: "", callbackAt: null });
      await STORE.addKnock({ pinId: ps[3].id, lat: ps[3].lat, lng: ps[3].lng, disposition: "goback", reason: null, dm: true, note: "", callbackAt: cb });
      await STORE.addKnock({ pinId: ps[4].id, lat: ps[4].lat, lng: ps[4].lng, disposition: "dnk", reason: null, dm: false, note: "", callbackAt: null });
      await STORE.addKnock({ pinId: ps[5].id, lat: ps[5].lat, lng: ps[5].lng, disposition: "sold", reason: null, dm: true, note: "", callbackAt: null });
      await STORE.addNote(ps[0], "Gate code 4321");
      MMAP.refreshPins();
      const t = STORE.territories[0];
      return { ids: ps.map((p) => p.id), cb, events: STORE.events.length, stats: STORE.hoodStats(t), terr: t.id, note: (STORE.pins.find((p) => p.id === ps[0].id).notes || []).length };
    });
    check("six outcomes recorded (2 Not Home, Not Interested, Go Back with a callback, Do Not Knock, Sold) and a note", work.events === 6 && work.stats.knocked === 6 && work.stats.sold === 1 && work.stats.callbacks === 1 && work.note === 1, JSON.stringify(work.stats));

    await page.reload();
    // a remembered session unlocks straight through; a fresh one asks for the passcode
    await page.waitForFunction(() => { const g = document.querySelector("#gate"); return g && (!g.hidden || (window.MAUTH && MAUTH.isUnlocked())); }, null, { timeout: 30000 });
    if (await page.evaluate(() => !document.querySelector("#gate").hidden)) {
      await page.fill("#gate-pass", "knock1234");
      await page.click("#gate-submit");
    }
    await bootApp();
    await page.evaluate(({ CENTRE }) => { MAPP.show("map"); MMAP.jumpTo(CENTRE.lng, CENTRE.lat, 16.6); }, { CENTRE });
    await sleep(900);
    const back = await page.evaluate((w) => {
      const t = STORE.territories.find((x) => x.id === w.terr);
      const by = (id) => STORE.pins.find((p) => p.id === id);
      return { terr: !!t, reps: t ? STORE.currentAssignees(t).length : 0, pins: STORE.pins.length, ids: STORE.pins.map((p) => p.id).sort(),
        d: w.ids.map((id) => (by(id) || {}).disposition), cb: (by(w.ids[3]) || {}).callbackAt, note: ((by(w.ids[0]) || {}).notes || []).map((n) => n.text),
        hist: w.ids.map((id) => ((by(id) || {}).history || []).length), events: STORE.events.length, stats: t ? STORE.hoodStats(t) : null,
        history: t ? STORE.assigneeHistory(t).filter((a) => a.open).length : 0 };
    }, work);
    check("after the reload the territory is back with both reps and every one of its N doors under the SAME ids", back.terr && back.reps === 2 && back.pins === N && JSON.stringify(back.ids) === JSON.stringify(shape1.ids), JSON.stringify({ terr: back.terr, reps: back.reps, pins: back.pins }));
    check("the outcomes are exactly what was recorded: Not Home, Not Home, Not Interested, Go Back, Do Not Knock, Sold — one knock each", back.d.join() === "nothome,nothome,notint,goback,dnk,sold" && back.hist.every((h) => h === 1) && back.events === 6, JSON.stringify(back.d));
    check("the callback, the note and the assignment history came back too", back.cb === work.cb && back.note.join() === "Gate code 4321" && back.history === 2, JSON.stringify({ cb: back.cb === work.cb, note: back.note, hist: back.history }));
    check("and the territory's numbers are the same numbers", back.stats.knocked === 6 && back.stats.sold === 1 && back.stats.callbacks === 1 && back.stats.doors === N, JSON.stringify(back.stats));

    // open it again after the reload — by the tap
    await tapInside(work.terr);
    await page.waitForFunction(() => document.querySelector("#hood-sheet").classList.contains("open"), null, { timeout: 10000 });
    await sleep(400);
    const reopen = await page.evaluate(() => ({ sel: MMAP.selectedHood(), status: document.querySelector("#hd-status").textContent.trim(), sales: document.querySelector("#pc-sales").textContent.trim() }));
    check("tapping the saved territory after the reload opens the same territory with its worked doors and its sale", reopen.sel === work.terr && /6 knocked|untouched · 1 sold/.test(reopen.status) && new RegExp("^" + N + " doors on the map").test(reopen.status), JSON.stringify(reopen));
    await page.evaluate(() => MUI.closeSheet()); await sleep(400);

    // =============================================== F. REP VS MANAGER TAP
    section("F. The same ground: a rep's tap is a knock, a manager's is the territory");
    const crew = await page.evaluate(() => ({ jake: STORE.users.find((u) => u.name === "Jake Rowe").id, me: STORE.users.find((u) => u.name === "Area Manager").id }));
    /* A manager leaves an area waiting WITH its found houses on the map; a
       rep must never see either. The shape is handed to the same
       completeArea the corners path calls (section A drove that path with a
       thumb) — what is under test here is the role change, not the taps. */
    await page.evaluate((r) => { MAPP.show("map"); MHOODS.completeArea(r.map(([x, y]) => [x + 0.0016, y - 0.0016])); }, ring);
    await sleep(300);
    await page.evaluate(() => document.querySelector("#draw-find").click());
    await page.waitForFunction(() => { const r = document.querySelector("#hd-review"); return r && !r.hidden; }, null, { timeout: 30000 }).catch(() => {});
    await sleep(500);
    await page.evaluate(() => MUI.closeSheet()); await sleep(400);
    const waitingBefore = await page.evaluate(() => ({ area: !!MHOODS.pendingArea(), bar: !document.querySelector("#draw-bar").hidden, preview: MMAP.previewDoors().length }));
    check("the manager has an area waiting, its houses found and on the map, and the bar offering Review", waitingBefore.area && waitingBefore.bar && waitingBefore.preview > 0, JSON.stringify(waitingBefore));
    await beUser(crew.jake);
    const repSees = await page.evaluate(() => ({ area: MHOODS.pendingArea(), facade: MMAP.pendingArea(), preview: MMAP.previewDoors().length, bar: document.querySelector("#draw-bar").hidden,
      inFC: STORE.pins.length }));
    check("a manager's unsaved area, its found houses and the Find-houses bar are gone the moment the phone is a rep's", repSees.area === null && repSees.facade === null && repSees.preview === 0 && repSees.bar && repSees.inFC === N, JSON.stringify({ waitingBefore, repSees }));
        const ground = await groundInside(ring);
    const repView = await page.evaluate(() => ({ role: STORE.effectiveRole(), hoods: MMAP.engineReport().renderer.counts ? MMAP.engineReport().renderer.counts().hoods : null, pins: STORE.pins.length }));
    check("as the rep: role rep, the assigned turf is the one blue area on the map with its saved pins", repView.role === "rep" && repView.pins === N && (repView.hoods === null || repView.hoods === 1), JSON.stringify(repView));
    await page.mouse.click(ground.x, ground.y); await sleep(600);
    const repTap = await page.evaluate(() => ({ knock: document.querySelector("#knock-sheet").classList.contains("open"), hood: document.querySelector("#hood-sheet").classList.contains("open") }));
    check("the rep's tap on ground inside their turf starts a KNOCK, never a territory sheet", repTap.knock && !repTap.hood, JSON.stringify({ repTap, ground }));
    await page.evaluate(() => { document.querySelector("#knock-cancel").click(); }); await sleep(400);
    await beUser(crew.me);
    await page.mouse.click(ground.x, ground.y); await sleep(600);
    const mgrTap = await page.evaluate(() => ({ knock: document.querySelector("#knock-sheet").classList.contains("open"), hood: document.querySelector("#hood-sheet").classList.contains("open"), sel: MMAP.selectedHood() }));
    check("the manager's tap on the same ground opens the TERRITORY (selected on the map), not a knock", !mgrTap.knock && mgrTap.hood && mgrTap.sel === work.terr, JSON.stringify(mgrTap));
    await page.evaluate(() => MUI.closeSheet()); await sleep(400);

    // =============================================== G. EDIT THE OUTLINE
    section("G. Editing the outline says what moves before saving; nothing is deleted; a scan afterwards matches what RALLY holds");
    /* A door pinned BY HAND, inside the territory, near the corner that is
       about to move: the kind of door the sheet's own copy promises can be
       pinned when the provider has never heard of the house. It carries no
       territoryId — membership is pure containment — which is exactly what
       makes it the interesting case for an outline edit. */
    const hand = await page.evaluate(async (id) => {
      window.__terr = id;
      const t = STORE.territories.find((x) => x.id === id);
      const c = t.points.reduce((a, p) => [a[0] + p[0] / t.points.length, a[1] + p[1] / t.points.length], [0, 0]);
      const at = [t.points[0][0] + (c[0] - t.points[0][0]) * 0.2, t.points[0][1] + (c[1] - t.points[0][1]) * 0.2];
      const pin = await STORE.addKnock({ lat: at[1], lng: at[0], pinId: null, disposition: "nothome", reason: null, dm: false, note: "", callbackAt: null });
      MMAP.refreshPins();
      return { id: pin.id, stamped: !!pin.territoryId, home: (STORE.hoodOf(pin) || {}).id || null, doors: STORE.hoodStats(t).doors };
    }, work.terr);
    check(`a door pinned by hand inside the territory carries no stamp and counts as the territory's by containment (${hand.doors} doors now)`, !hand.stamped && hand.home === work.terr && hand.doors === N + 1, JSON.stringify(hand));

    const opened2 = await page.evaluate(async (id) => { const t = STORE.territories.find((x) => x.id === id); const ok = await MTEDIT.open(t); await new Promise((r) => setTimeout(r, 600)); return { ok, handles: document.querySelectorAll(".vx-handle:not(.mid)").length }; }, work.terr);
    check("the outline editor opens with a handle per corner", opened2.ok && opened2.handles === 5, JSON.stringify(opened2));
    // pull corner 0 INWARD toward the middle of the shape: houses fall outside the line
    const h0 = await page.evaluate(() => { const el = document.querySelector('.vx-handle[data-i="0"]'); const r = el.getBoundingClientRect(); const c = document.querySelector("#mapwrap").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, cx: c.left + c.width / 2, cy: c.top + c.height / 2 }; });
    const toward = (p, q, f) => ({ x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f });
    const target = toward(h0, { x: h0.cx, y: h0.cy }, 0.55);
    await page.mouse.move(h0.x, h0.y); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { const m = toward(h0, target, i / 8); await page.mouse.move(m.x, m.y); await sleep(30); }
    await page.mouse.up(); await sleep(300);
    const dirty = await page.evaluate(() => ({ msg: document.querySelector(".vx-msg").textContent, saveOff: document.querySelector("#vx-save").disabled }));
    check("the corner moved and the outline is still valid to save", !dirty.saveOff && /corners/.test(dirty.msg), JSON.stringify(dirty));
    const dlgBefore = dialogs.length;
    await page.evaluate(() => document.querySelector("#vx-save").click());
    await sleep(900);
    const msg = dialogs[dlgBefore] || "";
    const afterEdit = await page.evaluate((id) => {
      const t = STORE.territories.find((x) => x.id === id);
      const inside = STORE.pins.filter((p) => MGEOM.pointInRing(t.points, p.lng, p.lat)).length;
      const out = STORE.pins.filter((p) => !MGEOM.pointInRing(t.points, p.lng, p.lat));
      return { pins: STORE.pins.length, inside, outside: out.length, outHist: out.reduce((a, p) => a + (p.history || []).length, 0), events: STORE.events.length,
        sheet: document.querySelector("#hood-sheet").classList.contains("open"), rc: (document.querySelector(".hd-reconcile") || {}).textContent || "", stats: STORE.hoodStats(t) };
    }, work.terr);
    check("BEFORE saving, the manager was told what the new line does: how many stay, how many are now outside, and that they are kept with their history", dialogs.length === dlgBefore + 1 && /now outside/.test(msg) && /kept/.test(msg) && /Nothing is deleted/.test(msg) && new RegExp(afterEdit.inside + " houses stay").test(msg), msg);
    check(`after the save every one of the ${N + 1} properties still exists — ${afterEdit.outside} are outside the new line with their events intact — and the sheet says so`, afterEdit.pins === N + 1 && afterEdit.outside > 1 && afterEdit.events === 7 && afterEdit.sheet && /Outline changed/.test(afterEdit.rc), JSON.stringify({ pins: afterEdit.pins, outside: afterEdit.outside, rc: afterEdit.rc }));
    /* THE CANONICAL MEMBERSHIP RULE, and the two kinds of "outside".
       An IMPORTED door carries the territory's stamp, and STORE.hoodOf keeps
       a stamped door with its territory until another live outline contains
       it — a door just outside through GPS drift never becomes an orphan. A
       door a rep pinned BY HAND has no stamp: outside every outline it is
       nobody's. Both keep every outcome and knock; only the second stops
       counting, and the manager was told which is which BEFORE saving. */
    check(`the ${N} imported houses outside the line are still this territory's, so its door count is unchanged at ${N}; the hand-pinned door is not, so its knock stops counting here (6, not 7); the dialog said both`,
      afterEdit.stats.doors === N && afterEdit.stats.knocked === 6 && /still listed with this territory/.test(msg) &&
      /1 hand-pinned door is now outside the line/.test(msg) && /no longer counted for any territory/.test(msg),
      JSON.stringify({ doors: afterEdit.stats.doors, knocked: afterEdit.stats.knocked, inside: afterEdit.inside }));
    const handAfter = await page.evaluate((h) => {
      const p = STORE.pins.find((x) => x.id === h);
      return { exists: !!p, stamped: !!(p && p.territoryId), home: (STORE.hoodOf(p) || {}).id || null, hist: (p.history || []).length, disp: p.disposition };
    }, hand.id);
    check("the hand-pinned door still exists with its knock — it simply belongs to no territory now", handAfter.exists && !handAfter.stamped && handAfter.home === null && handAfter.hist === 1 && handAfter.disp === "nothome", JSON.stringify(handAfter));
    check("and the sheet's own line says the same", /1 hand-pinned door now outside/.test(afterEdit.rc) && /no longer counted for any territory/.test(afterEdit.rc), afterEdit.rc);

    // now pull the same corner OUT past where it was: everything comes back
    await page.evaluate(() => MUI.closeSheet()); await sleep(300);
    const opened3 = await page.evaluate(async (id) => { const t = STORE.territories.find((x) => x.id === id); return await MTEDIT.open(t); }, work.terr);
    await sleep(600);
    const h0b = await page.evaluate(() => { const el = document.querySelector('.vx-handle[data-i="0"]'); const r = el.getBoundingClientRect(); const c = document.querySelector("#mapwrap").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, cx: c.left + c.width / 2, cy: c.top + c.height / 2 }; });
    const away = toward(h0b, { x: h0b.cx, y: h0b.cy }, -1.6);
    await page.mouse.move(h0b.x, h0b.y); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { const m = toward(h0b, away, i / 8); await page.mouse.move(m.x, m.y); await sleep(30); }
    await page.mouse.up(); await sleep(300);
    const dlg2 = dialogs.length;
    await page.evaluate(() => document.querySelector("#vx-save").click());
    await sleep(900);
    const msg2 = dialogs[dlg2] || "";
    const back2 = await page.evaluate((h) => {
      const t = STORE.territories.find((x) => x.id === window.__terr);
      return { inside: STORE.pins.filter((p) => MGEOM.pointInRing(t.points, p.lng, p.lat)).length,
        handHome: (STORE.hoodOf(STORE.pins.find((x) => x.id === h)) || {}).id || null,
        handHist: (STORE.pins.find((x) => x.id === h).history || []).length,
        doors: STORE.hoodStats(t).doors, rc: (document.querySelector(".hd-reconcile") || {}).textContent || "",
        sheet: document.querySelector("#hood-sheet").classList.contains("open") };
    }, hand.id);
    check("pulling the line back out: the manager is told the hand-pinned door comes back inside and keeps its history", opened3 && dialogs.length === dlg2 + 1 && /come inside and keep their history/.test(msg2), msg2);
    check("after the save it is the territory's again, with its knock, and every imported house is inside too", back2.handHome === work.terr && back2.handHist === 1 && back2.inside === N + 1 && back2.doors === N + 1 && back2.sheet, JSON.stringify(back2));

    const heldBefore = (await pinShape()).n;
    const calls4 = overpassCalls;
    await page.evaluate(() => document.querySelector("#hd-scan").click());
    await page.waitForFunction(() => { const r = document.querySelector("#hd-review"); return r && !r.hidden; }, null, { timeout: 30000 });
    await sleep(400);
    const rv2 = await reviewLines();
    const rescan = await page.evaluate(() => ({ preview: MMAP.previewDoors().length, btn: document.querySelector("#hd-import-btn").textContent.trim(), row: document.querySelector("#hd-import-row").hidden }));
    check(`the scan of the edited territory matched every house RALLY already holds (${rv2["Already in RALLY (matched, not duplicated)"]}) and offers only the new ones (${rv2["Will be imported"]}) as blue pins`, overpassCalls === calls4 + 1 && rv2["Already in RALLY (matched, not duplicated)"] >= N - 2 && rescan.preview === rv2["Will be imported"], JSON.stringify({ rv2, rescan }));
    if (rv2["Will be imported"] > 0) {
      await page.evaluate(() => document.querySelector("#hd-import-btn").click());
      await sleep(1500);
      const shape3 = await pinShape();
      check("importing the new houses adds exactly them — no duplicate of any existing property, and the preview pins become doors", shape3.n === heldBefore + rv2["Will be imported"] && (await page.evaluate(() => MMAP.previewDoors().length)) === 0, JSON.stringify({ before: heldBefore, n: shape3.n, added: rv2["Will be imported"] }));
    } else {
      check("the added ground held no new houses, so nothing was offered and nothing was duplicated", (await pinShape()).n === heldBefore);
    }
    await page.evaluate(() => MUI.closeSheet()); await sleep(300);

    // =============================================== H. SMART SPLIT
    section("H. Smart Split keeps every property identity");
    const beforeSplit = await pinShape();
    const split = await page.evaluate(async (id) => {
      const t = STORE.territories.find((x) => x.id === id);
      const kids = await STORE.splitTerritory(t, 2);
      MMAP.refreshHoods();
      const live = STORE.activeTerritories().map((x) => x.id);
      const homes = STORE.pins.map((p) => { const h = STORE.hoodOf(p); return h ? h.id : null; });
      return { kids: kids.length, live, parentLive: STORE.isLive(t), inKids: homes.filter((h) => h && live.indexOf(h) >= 0).length, ids: STORE.pins.map((p) => p.id).sort() };
    }, work.terr);
    check("the territory is cut into two live children and the parent retires", split.kids === 2 && split.live.length === 2 && !split.parentLive, JSON.stringify({ kids: split.kids, live: split.live.length }));
    check("every pin keeps its id and now belongs to one of the children", JSON.stringify(split.ids) === JSON.stringify(beforeSplit.ids) && split.inKids >= beforeSplit.n - 2, JSON.stringify({ inKids: split.inKids, n: beforeSplit.n }));

    // =============================================== I. THE CLASSIFIER
    section("I. The inferred-home rule, unit-level");
    const cls = await page.evaluate(() => {
      const e = MPROP._osmEligibility;
      const sq = (m) => { // a square of ~m metres per side, as [{lat,lon}]
        const d = m / 110570, dx = m / (111320 * Math.cos(38.86 * Math.PI / 180));
        return [{ lat: 38.86, lon: -94.77 }, { lat: 38.86 + d, lon: -94.77 }, { lat: 38.86 + d, lon: -94.77 + dx }, { lat: 38.86, lon: -94.77 + dx }];
      };
      const m2 = (m) => Math.round(MPROP._ringM2(sq(m)));
      return {
        m2_12: m2(12), m2_30: m2(30),
        house: e({ building: "house" }, { areaM2: 180 }), yes180: e({ building: "yes" }, { areaM2: 180 }),
        yes20: e({ building: "yes" }, { areaM2: 20 }), yes900: e({ building: "yes" }, { areaM2: 900 }),
        named: e({ building: "yes", name: "First Baptist" }, { areaM2: 300 }), shop: e({ building: "yes", shop: "convenience" }, { areaM2: 200 }),
        retail: e({ building: "yes" }, { areaM2: 200, landuse: "retail" }), res: e({ building: "yes" }, { areaM2: 200, landuse: "residential" }),
        addr: e({ building: "yes", "addr:housenumber": "12" }, { areaM2: 900 }), noCtx: e({ building: "yes" }), apartments: e({ building: "apartments" }, { areaM2: 200 }),
      };
    });
    check("the size band is measured in real metres (a 12 m square ≈ 144 m², a 30 m square ≈ 900 m²)", Math.abs(cls.m2_12 - 144) < 3 && Math.abs(cls.m2_30 - 900) < 12, JSON.stringify({ a: cls.m2_12, b: cls.m2_30 }));
    check("building=house is a home outright; building=yes at 180 m² is a home INFERRED and labelled as such", cls.house.eligible && !cls.house.inferred && cls.yes180.eligible && cls.yes180.inferred && /inferred/i.test(cls.yes180.propertyType), JSON.stringify({ house: cls.house, yes180: cls.yes180 }));
    check("a 20 m² outline is an outbuilding, a 900 m² one a large building — neither is a door", !cls.yes20.eligible && /outbuilding/.test(cls.yes20.whyExcluded) && !cls.yes900.eligible && /large building/.test(cls.yes900.whyExcluded), JSON.stringify({ small: cls.yes20, big: cls.yes900 }));
    check("a named bare building, a shop, and a house-sized outline in a retail area are excluded; the same outline in a residential area is a home", !cls.named.eligible && !cls.shop.eligible && !cls.retail.eligible && cls.res.eligible, JSON.stringify({ named: cls.named.whyExcluded, shop: cls.shop.whyExcluded, retail: cls.retail.whyExcluded }));
    check("an address makes a home regardless of size; without any outline context nothing is inferred; building=apartments stays excluded", cls.addr.eligible && !cls.addr.inferred && !cls.noCtx.eligible && !cls.apartments.eligible, JSON.stringify({ addr: cls.addr, noCtx: cls.noCtx, apartments: cls.apartments }));

    check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  } catch (e) {
    fail++;
    console.log("  ✗ suite crashed — " + (e && e.stack || e));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
})();
