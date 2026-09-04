/* RALLY v41 — Route screens, captured, and the map repaint measured.

   Not a pass/fail suite: it produces the pictures for the implementation
   report and one honest number for the paint cost of the new effective-
   outcome derivation at a realistic book size. Same harness as
   v41-ui-test.js, same cloud-off device.

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/v41-shots.js */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8893);
const SHOTS = process.env.SHOTS ||
  "/tmp/claude-0/-home-user-business-vault/11606f9d-a3ab-5bea-8159-07ef2ce6f0b0/scratchpad/v41shots";
fs.mkdirSync(SHOTS, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(d);
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" };
  });
  const page = await ctx.newPage();
  const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
  try {
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
    await page.click("#gate-swap-btn");
    await page.fill("#gate-name", "Turf Tester");
    await page.fill("#gate-email", "shots@example.com");
    await page.fill("#gate-pass", "knock1234");
    await page.click("#gate-submit");
    await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 20000 });
    await page.waitForFunction(() => window.STORE && window.MTURF && window.MGEOM, null, { timeout: 25000 });
    await page.waitForTimeout(800);

    // ------------------------------------------------------------ seed
    await page.evaluate(async () => {
      const P = MGEOM.project(40);
      const at = (x, y) => { const ll = P.toLngLat(x, y); return [ll[0], ll[1] + 40]; };
      const rect = (x0, y0, x1, y1) => [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)];
      window.__at = at; window.__rect = rect;
      const john = await STORE.addUser({ name: "John", role: "rep" });
      const jake = await STORE.addUser({ name: "Jake", role: "rep" });
      const mia = await STORE.addUser({ name: "Mia", role: "rep" });
      window.__john = john.id; window.__jake = jake.id; window.__mia = mia.id;
      const a = await STORE.addTerritory({ name: "Maple Ridge", points: rect(0, 0, 300, 240) });
      const b = await STORE.addTerritory({ name: "Cedar Park", points: rect(320, 0, 620, 240) });
      const c = await STORE.addTerritory({ name: "Old Town", points: rect(0, 260, 300, 500) });
      window.__a = a.id; window.__b = b.id; window.__c = c.id;
      const D = ["nothome", "notinterested", "callback", "sold", "dnk", "nothome"];
      let n = 0;
      for (const t of [a, b, c]) {
        const o = t === a ? [0, 0] : t === b ? [320, 0] : [0, 260];
        for (let i = 0; i < 14; i++) {
          const p = at(o[0] + 20 + (i % 7) * 35, o[1] + 30 + Math.floor(i / 7) * 60);
          if (i % 4 === 3) {
            await STORE.importDoors([{ lat: p[1], lng: p[0], address: (100 + n) + " Elm St",
              externalId: "seed" + n }], { territoryId: t.id }).catch(() => {});
          } else {
            await STORE.addKnock({ lat: p[1], lng: p[0], disposition: D[n % D.length],
              note: "" });
          }
          n++;
        }
      }
      await STORE.setAssignees(a, [john.id, jake.id]);
      await STORE.setAssignees(b, [mia.id]);
    });

    // ------------------------------------------------- leader's Route
    await page.click("#tab-schedule");
    await page.waitForTimeout(600);
    await page.evaluate(() => MTURF.render());
    await page.waitForTimeout(200);
    await shot("01-route-leader");

    // the multi-assignee sheet, mid-selection
    await page.click('.turf-actions .mini[data-act="assign"]');
    await page.waitForTimeout(400);
    await shot("02-assign-sheet");
    await page.evaluate(() => MUI.closeSheet("turf-assign-sheet"));
    await page.waitForTimeout(300);

    /* Clear outcomes asks with the platform's own confirm(), so there is no
       DOM to photograph — capture the exact words instead, which is the
       part that matters: it has to promise what it actually does. */
    let cycleMsg = "";
    page.once("dialog", async (d) => { cycleMsg = d.message(); await d.dismiss(); });
    await page.click('.turf-actions .mini[data-act="cycle"]');
    await page.waitForTimeout(500);
    console.log("CLEAR-OUTCOMES PROMPT:\n" + cycleMsg);
    await page.waitForTimeout(200);

    // ---------------------------------------------------- rep's Route
    await page.evaluate(() => {
      const me = STORE.currentUser();
      STORE.roleState = { mode: "server", role: "rep", verifiedAt: Date.now() };
      // stand the device account on one of the assigned hoods
      const t = STORE.territories.find((x) => x.id === __a);
      return STORE.setAssignees(t, [__john, me.id]);
    });
    await page.evaluate(() => MTURF.render());
    await page.waitForTimeout(400);
    await shot("04-route-rep");

    // ------------------------------------------------------ the map
    await page.evaluate(() => {
      STORE.roleState = { mode: "server", role: "manager", verifiedAt: Date.now() };
    });
    await page.click("#tab-map");
    /* The basemap cannot load here — this sandbox has no egress to a tile
       server — so the map screens photograph as the app's own layers over
       an empty ground. The hood outlines, the door pins and the editor
       handles are all RALLY's, and they are what these shots are for. */
    await page.waitForTimeout(3000);
    await page.evaluate(() => MMAP.focusHood(STORE.territories.find((t) => t.id === __a)));
    await page.waitForTimeout(2500);
    console.log("MAP ready=" + await page.evaluate(() => String(MMAP.isReady())));
    await shot("05-map-hoods");

    // the outline editor, with its corner handles live
    await page.evaluate(() => MTEDIT.open(STORE.territories.find((t) => t.id === __a)));
    await page.waitForTimeout(2000);
    console.log("EDITOR handles=" + await page.evaluate(
      () => document.querySelectorAll(".vx-handle").length));
    await shot("06-editor-open");

    // door sheet with the leadership Clear DNK
    const dnkId = await page.evaluate(async () => {
      await MTEDIT.close(true);
      const p = STORE.pins.find((x) => STORE.effectiveDisposition(x) === "dnk");
      return p ? p.id : null;
    });
    if (dnkId) {
      await page.evaluate((id) => MMAP.focusPin(id), dnkId);
      await page.waitForTimeout(700);
      await shot("07-door-clear-dnk");
      await page.evaluate(() => document.querySelectorAll(".sheet.open")
        .forEach((s) => MUI.closeSheet(s.id)));
      await page.waitForTimeout(300);
    }

    // ------------------------------------------------ paint at scale
    const perf = await page.evaluate(async () => {
      const P = MGEOM.project(40);
      const at = (x, y) => { const ll = P.toLngLat(x, y); return [ll[0], ll[1] + 40]; };
      const D = ["nothome", "notinterested", "callback", "sold", "dnk", "unworked"];
      const pins = [];
      for (let i = 0; i < 1200; i++) {
        const p = at((i % 40) * 15 + 5, Math.floor(i / 40) * 15 + 5);
        pins.push({ id: "perf" + i, lat: p[1], lng: p[0], disposition: D[i % D.length],
          createdAt: Date.now() - i * 1000, updatedAt: Date.now() - i * 1000,
          history: [{ at: Date.now() - i * 1000, disposition: D[i % D.length] }] });
      }
      STORE.pins = STORE.pins.concat(pins);
      const t0 = performance.now();
      MMAP.refreshPins();
      const paint = performance.now() - t0;
      const t1 = performance.now();
      const f = STORE.doorFacts();
      const facts = performance.now() - t1;
      const t2 = performance.now();
      STORE.territories.filter(STORE.isLive).forEach((t) => STORE.routeMetrics(t, f));
      const metrics = performance.now() - t2;
      return { pins: STORE.pins.length, hoods: STORE.territories.length,
        paintMs: Math.round(paint), factsMs: Math.round(facts), metricsMs: Math.round(metrics) };
    });
    console.log("PERF " + JSON.stringify(perf));
    await page.waitForTimeout(400);
    await shot("08-map-scale");
    console.log("shots in " + SHOTS);
  } finally {
    await ctx.close();
    await browser.close();
    server.close();
  }
})();
