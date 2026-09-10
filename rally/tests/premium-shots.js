/* RALLY — PREMIUM UI REVIEW SHOTS.

   Not a pass/fail suite. It boots the real app, seeds a realistic book of
   work over a REAL neighbourhood, and photographs the states John asked to
   review, at iPhone size.

   WHAT IS REAL HERE
     - The app. This is rally/index.html and its own modules, not a mockup.
     - The imagery. Google 2D Tiles, the production provider, unchanged,
       fetched live over the network for exactly the z/x/y the app asks for.
     - The houses. Every door sits on a REAL building footprint from
       OpenStreetMap, positioned by the app's own placeAt() — so "one pin per
       house, on the house" is something you can check by looking.

   WHAT IS SIMULATED
     - The book of work: 100 customers, one territory, and a day of knocks,
       generated deterministically. No production data is touched.

   TWO THINGS THIS HARNESS WORKS AROUND, both outside the app:
     1. Headless Chromium has no GPU and throws its WebGL backbuffer away
        after each frame. SwiftShader plus a forced preserveDrawingBuffer
        make the map appear in a screenshot at all.
     2. From inside this container's browser, every request to
        tile.googleapis.com dies at the egress relay, while the identical
        request from Node succeeds. So Node fetches Google's tiles and
        answers the page with them. One network hop is substituted; the
        imagery and the app are not.

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/premium-shots.js */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8899);
const SHOTS = process.env.SHOTS || "/tmp/shots";
const CACHE = "/tmp/rally-shot-cache";
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

// the demo neighbourhood: a real subdivision, real rooftops, real streets
const CENTRE = { lat: 38.8620, lng: -94.7700 };
const BOX = { s: 38.8596, w: -94.7736, n: 38.8646, e: -94.7664 };

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2", ".json": "application/json", ".pbf": "application/x-protobuf" };

async function googleSession() {
  const key = (fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8")
    .match(/DEFAULT_GOOGLE_KEY = "([^"]*)"/) || [])[1];
  if (!key) return null;
  try {
    const r = await fetch("https://tile.googleapis.com/v1/createSession?key=" + encodeURIComponent(key), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapType: "satellite", language: "en-US", region: "US",
        layerTypes: ["layerRoadmap"], highDpi: true, scale: "scaleFactor2x" }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.session ? { j, key } : null;
  } catch (_) { return null; }
}

async function buildings() {
  const f = path.join(CACHE, "buildings.json");
  if (fs.existsSync(f)) {
    const els = JSON.parse(fs.readFileSync(f, "utf8"));
    console.log(`  buildings: ${els.length} real footprints (cached)`);
    return els;
  }
  const q = `[out:json][timeout:60];way["building"](${BOX.s},${BOX.w},${BOX.n},${BOX.e});out tags geom;`;
  for (const host of ["overpass.kumi.systems", "overpass-api.de", "overpass.osm.ch"]) {
    try {
      const r = await fetch(`https://${host}/api/interpreter`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q), signal: AbortSignal.timeout(120000),
      });
      if (!r.ok) continue;
      const els = ((await r.json()).elements || []).filter((e) => (e.geometry || []).length >= 4);
      if (els.length) {
        fs.writeFileSync(f, JSON.stringify(els));
        console.log(`  buildings: ${els.length} real footprints from ${host}`);
        return els;
      }
    } catch (_) { /* next mirror */ }
  }
  console.log("  buildings: NONE — Overpass unreachable");
  return [];
}

(async () => {
  console.log("== real building footprints ==");
  const blds = await buildings();
  console.log("== google tile session ==");
  const g = await googleSession();
  console.log(g ? "  session ok — tiles will be REAL Google imagery"
                : "  NO SESSION — the map will render with no imagery");

  let tiles = 0, tileFail = 0;

  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-sandbox"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" };
    // WebGL discards its backbuffer after each frame unless asked not to,
    // so a headless screenshot of the map canvas comes out blank
    const real = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") {
        attrs = Object.assign({}, attrs, { preserveDrawingBuffer: true });
      }
      return real.call(this, type, attrs);
    };
  });

  // the app, served from disk — never over the network
  await ctx.route(`http://localhost:${PORT}/**`, (route) => {
    let p = decodeURIComponent(new URL(route.request().url()).pathname);
    if (p === "/") p = "/index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return route.fulfill({ status: 404, body: "" });
    }
    route.fulfill({ status: 200, contentType: MIME[path.extname(file)] || "application/octet-stream",
      body: fs.readFileSync(file) });
  });

  // Google, fetched in Node and handed to the page (see the header)
  if (g) {
    await ctx.route(/tile\.googleapis\.com\/v1\/createSession/, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(g.j) }));
    await ctx.route(/tile\.googleapis\.com\/v1\/2dtiles/, async (route) => {
      const m = new URL(route.request().url()).pathname.match(/2dtiles\/(\d+)\/(\d+)\/(\d+)/);
      if (!m) return route.fulfill({ status: 404, body: "" });
      const [, z, x, y] = m;
      const cf = path.join(CACHE, `t-${z}-${x}-${y}.jpg`);
      if (fs.existsSync(cf)) { tiles++; return route.fulfill({ status: 200, contentType: "image/jpeg", body: fs.readFileSync(cf) }); }
      try {
        const r = await fetch(
          `https://tile.googleapis.com/v1/2dtiles/${z}/${x}/${y}` +
          `?session=${encodeURIComponent(g.j.session)}&key=${encodeURIComponent(g.key)}`,
          { signal: AbortSignal.timeout(30000) });
        if (!r.ok) { tileFail++; return route.fulfill({ status: r.status, body: "" }); }
        const buf = Buffer.from(await r.arrayBuffer());
        fs.writeFileSync(cf, buf);
        tiles++;
        route.fulfill({ status: 200, contentType: "image/jpeg", body: buf });
      } catch (_) { tileFail++; route.fulfill({ status: 504, body: "" }); }
    });
  }

  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  PAGE ERROR:", e.message));

  const shot = async (n) => {
    await page.screenshot({ path: `${SHOTS}/${n}.png` });
    console.log("  shot:", n);
  };
  const goTo = (lng, lat, zoom) =>
    page.evaluate(({ lng, lat, zoom }) => MMAP.jumpTo(lng, lat, zoom), { lng, lat, zoom });
  const settleMap = async (n) => { for (let i = 0; i < (n || 24); i++) await page.waitForTimeout(500); };

  /* THE SHOTS ARE TWO DIFFERENT PEOPLE. A rep and a manager do not see the
     same map, and photographing both as an owner would have shown the owner
     twice: the first run put "Territory 12 / John Martin" across the middle
     of what was labelled the rep's screen, which is exactly what the rep
     view must never do. applyServerRole IS the app's own role door — the
     same one a server profile comes through — so this changes who is looking,
     not what the app is willing to show them. */
  const beRole = async (role) => {
    await page.evaluate(async (r) => {
      await STORE.applyServerRole(r, Date.now());
      if (window.MAPP && MAPP.roleChanged) MAPP.roleChanged();
      if (window.MMAP) { MMAP.refreshHoods(); MMAP.refreshPins(); MMAP.updateBrandToday(); }
    }, role);
    await page.waitForTimeout(900);
  };

  try {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("#gate:not([hidden])", { timeout: 60000 });
    await page.click("#gate-swap-btn");
    await page.fill("#gate-name", "John Martin");
    await page.fill("#gate-email", "john@rallypest.com");
    await page.fill("#gate-pass", "knock1234");
    await page.click("#gate-submit");
    await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 30000 });
    await page.waitForFunction(() => window.STORE && window.MMAP && window.MGEOM, null, { timeout: 30000 });
    await page.waitForTimeout(1500);

    console.log("== seeding ==");
    const seeded = await page.evaluate(async ({ blds, BOX }) => {
      const out = { doors: 0, customers: 0, knocks: 0 };
      const me = STORE.currentUser();
      if (me) { me.name = "John Martin"; me.role = "owner"; await STORE.updateUser(me); }
      /* The review sheet's house count comes from the PROPERTY PROVIDER, not
         from the pins already on the map, and no provider key reaches this
         container — so the first run photographed "Property provider
         unreachable". The demo provider is deterministic, needs no network,
         and labels itself "via Demo data" on the sheet, which is the honest
         thing for a screenshot to say. */
      STORE.settings.propertySource = "demo";
      await STORE.saveSettings();
      const jake = await STORE.addUser({ name: "Jake Rowe", role: "rep" });
      const mia = await STORE.addUser({ name: "Mia Cole", role: "rep" });
      const dev = await STORE.addUser({ name: "Dev Patel", role: "rep" });
      window.__crew = { me: me && me.id, jake: jake.id, mia: mia.id, dev: dev.id };

      const ring = [[BOX.w, BOX.s], [BOX.e, BOX.s], [BOX.e, BOX.n], [BOX.w, BOX.n]];
      const hood = await STORE.createTerritory(
        { name: "Territory 12", homes: 0, points: ring }, [me.id]);
      window.__hood = hood.id;

      const place = window.MPROP && MPROP._placeAt;
      const props = [];
      blds.forEach((b, i) => {
        const pl = place ? place(b) : null;
        if (!pl || !pl.point) return;
        const t = b.tags || {};
        const addr = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
        props.push({
          externalId: "osm-way-" + b.id, parcelId: null, source: "osm",
          lat: pl.point.lat, lng: pl.point.lon, placement: pl.how,
          address: addr || (1200 + i * 2) + " Brougham Dr",
          city: "Olathe", state: "KS", zip: "66062",
          propertyType: "house", eligible: true, owner: null,
          yearBuilt: null, sqft: null, lotSqft: null, lastSaleDate: null, lastSalePrice: null,
        });
      });
      out.doors = (await STORE.importDoors(props, { territoryId: hood.id })).added;

      // a worked day — attributed to the signed-in rep so the panel counts it
      const OUT = ["nothome", "nothome", "notint", "goback", "sold", "unworked",
                   "unworked", "nothome", "dnk", "unworked", "notint", "unworked"];
      const now = Date.now(), HOUR = 3600e3, DAY = 24 * HOUR;
      /* Knocks go through STORE.addKnock — the SAME path a rep's thumb
         takes. Writing pins and events straight to IndexedDB looked
         equivalent and was not: the in-memory event list is what the
         counters, the Route metrics, Street Mode and the freshness view all
         read, so a hand-written row produced a map full of colour and a
         panel reading zero. */
      const mine = STORE.pins.filter((p) => p.territoryId === hood.id);
      for (let i = 0; i < mine.length; i++) {
        const d = OUT[i % OUT.length];
        if (d === "unworked") continue;
        await STORE.addKnock({
          pinId: mine[i].id, lat: mine[i].lat, lng: mine[i].lng,
          disposition: d, reason: d === "notint" ? "Not interested" : null,
          dm: d === "sold" || d === "notint", note: "",
          callbackAt: d === "goback" && i % 3 === 0 ? now + 2 * HOUR : null,
        });
        out.knocks++;
      }
      window.__gobacks = mine.filter((p) => p.disposition === "goback").map((p) => p.id);

      const FIRST = ["Marcus","Elena","Priya","Tom","Grace","Andre","Nina","Caleb","Rosa","Dmitri",
        "Hannah","Owen","Leila","Victor","Amara","Seth","Jun","Talia","Miles","Freya",
        "Dante","Ingrid","Rafael","Suki","Bram","Noor","Ezra","Carmen","Idris","Wren"];
      const LAST = ["Alvarez","Whitfield","Nakamura","Okonkwo","Petrov","Lindqvist","Moreau","Castillo",
        "Bergman","Duarte","Halloran","Iversen","Sandoval","Thackeray","Novak","Espinoza",
        "Kowalski","Beaumont","Rasmussen","Villanueva"];
      const STREETS = ["Brougham Dr","W 119th St","Falcon Ridge Rd","Meadow Lark Ln","Quail Creek Dr",
        "Sycamore Ct","Havencroft Pl","Pinehurst Dr"];
      const reps = [window.__crew.me, window.__crew.jake, window.__crew.mia, window.__crew.dev];
      for (let i = 0; i < 100; i++) {
        const c = await STORE.addCustomer({
          first: FIRST[i % FIRST.length], last: LAST[(i * 7) % LAST.length],
          phones: [{ label: "mobile", value: "913-555-" + String(1000 + i).slice(-4) }],
          appointments: [],
        });
        c.address = { street: (1100 + i * 4) + " " + STREETS[i % STREETS.length],
          city: "Olathe", state: "KS", zip: "66062" };
        c.soldAt = now - (i * 9) * HOUR;
        c.createdAt = c.soldAt;
        c.soldByUserId = reps[i % reps.length];
        c.agreement = { signedAt: c.soldAt, plan: "Quarterly Pest" };
        const bucket = i % 10;
        if (bucket === 0) c.acct = "canceled";
        else if (bucket <= 4) c.appointments = [{ id: MDB.uid(), ts: c.soldAt + 3 * DAY,
          status: "done", doneAt: c.soldAt + 3 * DAY, userId: reps[(i + 1) % reps.length] }];
        else if (bucket <= 7) c.appointments = [{ id: MDB.uid(),
          ts: now + (bucket - 4) * DAY + 5 * HOUR, status: "scheduled",
          userId: reps[(i + 2) % reps.length] }];
        await MDB.put("customers", c);
        out.customers++;
      }
      return out;
    }, { blds, BOX });
    console.log("  seeded:", JSON.stringify(seeded));

    // ---------------------------------------------------------- CUSTOMERS
    await page.evaluate(() => MAPP.show("customers"));
    await page.waitForTimeout(900);
    await shot("01-customers");

    await page.evaluate(() => document.querySelector("#cust-fab").click());
    await page.waitForTimeout(800);
    await shot("02-create-info");
    await page.evaluate(() => document.querySelector('.ce-tab[data-t="service"]').click());
    await page.waitForTimeout(500);
    await shot("03-create-service");
    await page.evaluate(() => document.querySelector('.ce-tab[data-t="payment"]').click());
    await page.waitForTimeout(500);
    await shot("04-create-payment");
    await page.evaluate(() => document.querySelector("#ce-back").click());
    await page.waitForTimeout(600);

    // ---------------------------------------------------------------- MAP
    await page.evaluate(() => MAPP.show("map"));
    await page.waitForTimeout(1200);
    // MMAP.init() runs while the map screen is display:none, so the engine
    // comes up with a zero-size container and never starts rendering
    await page.evaluate(() => MMAP.resize());
    await page.waitForTimeout(600);
    await goTo(CENTRE.lng, CENTRE.lat, 16.6);
    // wireImagery() attaches the raster source only once the style has
    // loaded and has no retry of its own — ask until Google's attribution
    // appears, which is the app's own signal that the layer really attached
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => MMAP.reloadImagery());
      await page.waitForTimeout(600);
      if (await page.evaluate(() => !document.querySelector("#gattr").hidden)) break;
    }
    // 05-07 and 12-13 are a NORMAL REP: one blue turf, no manager tools,
    // no territory label written across the imagery
    await beRole("rep");
    await goTo(CENTRE.lng, CENTRE.lat, 15.1); // the WHOLE assigned area in frame
    await page.evaluate(() => { MMAP.refreshPins(); MMAP.refreshHoods(); MMAP.updateBrandToday(); });
    await settleMap(20);
    await shot("05-map-rep-turf");

    await goTo(CENTRE.lng, CENTRE.lat, 17.3); // a whole dense block, pins uncluttered
    await settleMap(16);
    await shot("06-map-dense-pins");

    await page.evaluate(() => {
      const id = (window.__gobacks || [])[0] || (STORE.pins[0] || {}).id;
      if (id) MMAP.focusPin(id);
    });
    await page.waitForTimeout(2000);
    await shot("07-door-selected");
    await page.evaluate(() => { MMAP.clearSelection(); MUI.closeSheet && MUI.closeSheet(); });
    await page.waitForTimeout(600);

    // ------------------------------------------------------ MANAGER TOOLS
    await beRole("owner");
    await page.evaluate(() => document.querySelector("#fab-hoods").click());
    await page.waitForTimeout(900);
    await shot("08-manager-tools");

    await page.evaluate(() => document.querySelector("#mt-corners").click());
    await page.waitForTimeout(800);
    for (const [x, y] of [[95, 300], [300, 285], [325, 515], [190, 610], [80, 520]]) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(320);
    }
    await page.waitForTimeout(900);
    await shot("09-drawing-territory");

    // -------------------------------------------- TERRITORY REVIEW + ASSIGN
    await page.evaluate(() => { MHOODS.closeTools && MHOODS.closeTools(); });
    await page.evaluate(() => document.querySelector("#draw-done").click());
    await page.waitForTimeout(1400);
    /* The review sheet is the point of this shot BECAUSE of what the scan
       says — house count and how trustworthy the property source is. Shot it
       at a fixed delay once and photographed "Searching properties…". */
    await page.waitForFunction(() => {
      const el = document.querySelector("#hood-source");
      return el && !el.hidden && (el.textContent || "").trim().length > 0;
    }, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(900);
    await shot("10-territory-review");

    await page.evaluate(() => document.querySelector("#hood-assign-open").click());
    await page.waitForTimeout(900);
    /* Re-query between clicks. The panel re-renders its whole list on every
       toggle, so a NodeList captured once goes stale after the first click
       and the next two land on detached nodes — which is how a MULTI-rep
       screen photographed with exactly one rep ticked. */
    for (const i of [0, 1, 2]) {
      await page.evaluate((n) => {
        const rows = document.querySelectorAll("#assign-list .arep");
        if (rows[n]) rows[n].click();
      }, i);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(600);
    await shot("11-multi-rep-assign");
    await page.evaluate(() => window.MASSIGN && MASSIGN.close());
    await page.waitForTimeout(500);
    await page.evaluate(() => { MUI.closeSheet ? MUI.closeSheet() : null; });
    await page.waitForTimeout(500);

    // ------------------------------------------------------- STREET MODE
    // back to the rep: Street Mode and Route are their day, not a manager's
    await beRole("rep");
    // the draft polygon card belongs to the drawing that just ended
    await page.evaluate(() => { const c = document.querySelector("#polycard"); if (c) c.hidden = true; });
    await page.evaluate(() => document.querySelector("#fab-street").click());
    await page.waitForTimeout(1500);
    await shot("12-street-mode");
    await page.evaluate(() => { MUI.closeSheet ? MUI.closeSheet() : null; });
    await page.waitForTimeout(500);

    // -------------------------------------------------------------- ROUTE
    await page.evaluate(() => MAPP.show("schedule"));
    await page.waitForTimeout(1400);
    await shot("13-route");

    // ---------------------------------------------------------- FRESHNESS
    // freshness is a manager tool and says so — the rep never sees it
    await beRole("owner");
    await page.evaluate(() => MAPP.show("map"));
    await page.waitForTimeout(900);
    await page.evaluate(() => MMAP.resize());
    await goTo(CENTRE.lng, CENTRE.lat, 15.4);
    await page.evaluate(() => MMAP.setHeatMode(true));
    await settleMap(20);
    await shot("14-freshness");
    await page.evaluate(() => MMAP.setHeatMode(false));

    console.log(`== done == tiles ok: ${tiles} | tiles failed: ${tileFail}`);
  } catch (e) {
    console.log("HARNESS ERROR:", e.message);
  } finally {
    await browser.close();
  }
})();
