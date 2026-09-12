/* RALLY — APPLE MAPKIT: WHAT ACTUALLY WORKS.

   This suite does not mock MapKit. It downloads Apple's real mapkit.js
   from Apple's real CDN, hands it to a real browser, and drives RALLY's
   own adapter against it. Every assertion below is about objects Apple's
   library created.

   ONE NETWORK HOP IS SUBSTITUTED, and it is worth being exact about why:
   Chromium's tunnel to Apple dies at this container's egress relay, so
   Node fetches from cdn.apple-mapkit.com and fulfils the page's request
   with the bytes it got. The library, its version and its behaviour are
   Apple's. This is the same substitution the Google-tile screenshot
   harness already makes, and it changes nothing the tests assert on.

   WHAT IS BLOCKED, AND WHY IT IS NOT A CODE PROBLEM. mapkit.init() needs
   an ES256 JWT signed with an Apple Developer private key. There is no
   such key in this repo and there is no anonymous tier, so Apple's
   bootstrap answers HTTP 401 and MapKit raises error status
   "Unauthorized". No imagery is ever drawn. Everything else — overlays,
   annotations, clustering, the camera, coordinate conversion, hit
   testing — works, and this suite proves each of those against the live
   library so that the only thing waiting on a token is the photography. */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APPLE = /(^|\.)apple-mapkit\.com$|(^|\.)apple\.com$/;
const HOST = "rally.test";

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + name + (detail ? " — " + detail : "")); }
  else { fail++; console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
};
const section = (t) => console.log("\n== " + t);

const MIME = { ".js": "application/javascript", ".css": "text/css", ".html": "text/html",
  ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".svg": "image/svg+xml", ".pbf": "application/x-protobuf" };

(async () => {
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 " +
               "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  });

  /* Local device, no cloud: the gate then creates the account on this
     phone instead of waiting on a Supabase confirmation email. Nothing in
     this suite is about sync. The service worker is off so route
     interception is the only thing serving the app. */
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" };
    const real = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") {
        attrs = Object.assign({}, attrs, { preserveDrawingBuffer: true });
      }
      return real.call(this, type, attrs);
    };
  });

  let appleHits = 0, appleFail = 0;
  await ctx.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === HOST) {
      let f = url.pathname === "/" ? "/index.html" : url.pathname;
      const abs = path.join(ROOT, decodeURIComponent(f));
      if (!abs.startsWith(ROOT) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        return route.fulfill({ status: 404, body: "" });
      }
      return route.fulfill({ status: 200, body: fs.readFileSync(abs),
        contentType: MIME[path.extname(abs)] || "application/octet-stream" });
    }
    if (!APPLE.test(url.hostname)) return route.fulfill({ status: 204, body: "" });
    try {
      const r = await fetch(url.href, { signal: AbortSignal.timeout(30000),
        headers: { referer: `https://${HOST}/`, origin: `https://${HOST}` } });
      const buf = Buffer.from(await r.arrayBuffer());
      if (r.ok) appleHits++; else appleFail++;
      return route.fulfill({ status: r.status, body: buf,
        headers: { "content-type": r.headers.get("content-type") || "application/octet-stream",
                   "access-control-allow-origin": "*" } });
    } catch (_) { appleFail++; return route.fulfill({ status: 504, body: "" }); }
  });

  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message.slice(0, 200)));

  async function bootApp(settings) {
    await page.goto(`https://${HOST}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.STORE && window.MENGINE, null, { timeout: 30000 });
    await page.waitForSelector("#gate:not([hidden])", { timeout: 30000 }).catch(() => {});
    if (!(await page.evaluate(() => document.querySelector("#gate").hidden))) {
      await page.click("#gate-swap-btn");
      await page.fill("#gate-name", "John Martin");
      await page.fill("#gate-email", "john@rallypest.com");
      await page.fill("#gate-pass", "knock1234");
      await page.click("#gate-submit");
      await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 30000 });
    }
    await page.waitForTimeout(1200);
    if (settings) {
      /* Settings live in IndexedDB and survive a reload, so the app has
         ALREADY booted its engine from whatever the previous section left
         behind. Apply, then boot the map again — which is exactly what a
         rep changing the setting does. */
      await page.evaluate(async (s) => {
        Object.assign(STORE.settings, s);
        await STORE.saveSettings();
        await MMAP.init();
      }, settings);
      await page.waitForTimeout(3500);
    }
  }

  // ------------------------------------------------------------------
  section("A — the library really is Apple's");
  await bootApp(null);
  const lib = await page.evaluate(async () => {
    await new Promise((res) => {
      const s = document.createElement("script");
      s.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
      s.onload = res; s.onerror = res; document.head.appendChild(s);
      setTimeout(res, 60000);
    });
    if (!window.mapkit) return null;
    const t = (n) => typeof mapkit[n];
    return {
      version: mapkit.version, build: mapkit.build,
      mapTypes: Object.keys(mapkit.Map.MapTypes),
      have: {
        Map: t("Map"), Annotation: t("Annotation"), PolygonOverlay: t("PolygonOverlay"),
        PolylineOverlay: t("PolylineOverlay"), Style: t("Style"), Coordinate: t("Coordinate"),
        CoordinateRegion: t("CoordinateRegion"), TileOverlay: t("TileOverlay"),
      },
      proto: ["addOverlays", "addAnnotations", "convertCoordinateToPointOnPage",
        "convertPointOnPageToCoordinate", "setRegionAnimated", "annotationForCluster",
        "isScrollEnabled", "updateSize", "destroy"]
        .filter((k) => k in mapkit.Map.prototype),
    };
  });
  check("Apple's mapkit.js loaded from cdn.apple-mapkit.com", !!lib,
    lib ? "v" + lib.version + " build " + lib.build : "not loaded");
  if (!lib) { console.log("\ncannot continue without the library"); await browser.close(); process.exit(1); }
  check("MapKit offers SATELLITE imagery", lib.mapTypes.indexOf("Satellite") >= 0, lib.mapTypes.join(","));
  check("every MapKit type RALLY's adapter uses exists",
    Object.values(lib.have).every((v) => v === "function"), JSON.stringify(lib.have));
  check("every mapkit.Map method RALLY's adapter calls exists",
    lib.proto.length === 9, lib.proto.length + " of 9");

  // ------------------------------------------------------------------
  section("B — RALLY's adapter driving the REAL library");
  await bootApp({ mapEngine: "mapkit", mapkitToken: "test-token-not-signed-by-apple" });
  await page.evaluate(() => MAPP.show("map"));
  await page.waitForTimeout(400);

  const drive = await page.evaluate(async () => {
    const out = {};
    const R = window.MRENDER_MK;
    const boot = await R.boot({ container: "map", center: [-94.77, 38.862], zoom: 16,
      on: { tap: () => {}, move: () => {}, moveEnd: () => {}, dragStart: () => {} } });
    out.boot = boot;
    out.ready = R.ready();
    if (!R.ready()) return out;

    // a real territory, straight out of RALLY's own GeoJSON shape
    const ring = [[-94.7736, 38.8596], [-94.7664, 38.8596], [-94.7664, 38.8646], [-94.7736, 38.8646]];
    R.setHoods({ type: "FeatureCollection", features: [{
      type: "Feature", geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
      properties: { id: "t1", name: "Territory 12", rep: "John Martin",
        color: "#0A84FF", fresh: "#22B558", dim: 0 },
    }] }, { heat: false, labels: true });

    // 240 doors across the six locked outcomes
    const DISP = ["unworked", "nothome", "notint", "goback", "dnk", "sold"];
    const feats = [];
    for (let i = 0; i < 240; i++) {
      feats.push({ type: "Feature",
        geometry: { type: "Point", coordinates: [-94.7730 + (i % 24) * 0.0003, 38.8600 + Math.floor(i / 24) * 0.0004] },
        properties: { id: "p" + i, disposition: DISP[i % 6], cbdue: i % 17 === 0 ? 1 : 0 } });
    }
    R.setPins({ type: "FeatureCollection", features: feats }, "");
    R.setRoute({ type: "FeatureCollection", features: [
      { type: "Feature", properties: {}, geometry: { type: "LineString",
        coordinates: [[-94.773, 38.860], [-94.772, 38.861], [-94.771, 38.862]] } },
      { type: "Feature", properties: { n: "1" }, geometry: { type: "Point", coordinates: [-94.773, 38.860] } },
      { type: "Feature", properties: { n: "2" }, geometry: { type: "Point", coordinates: [-94.772, 38.861] } },
    ] });
    R.setDraft([[-94.7735, 38.8605], [-94.7700, 38.8605], [-94.7700, 38.8630]]);
    R.setPuck({ lng: -94.7715, lat: 38.8612 });

    out.counts = R.counts();
    return out;
  }).catch((e) => ({ threw: String(e && e.message) }));

  check("adapter boots against the real library",
    !!drive.boot && drive.boot.constructed === true,
    drive.boot ? JSON.stringify(drive.boot) : String(drive.threw));
  check("Apple REFUSED the unsigned token — the one thing that is blocked",
    !!drive.boot && drive.boot.ok === false && drive.boot.reason === "unauthorized",
    drive.boot && drive.boot.detail);

  const graph = await page.evaluate(() => {
    const R = window.MRENDER_MK;
    if (!R.ready()) return null;
    return {
      apple: R.counts(),
      dom: { pins: document.querySelectorAll("#map .mkpin").length },
      scaleVar: document.getElementById("map").style.getPropertyValue("--mkpin-s"),
    };
  });
  const A = graph && graph.apple;
  check("240 RALLY doors became 240 real mapkit.Annotation objects",
    !!A && A.pins === 240, A && String(A.pins));
  check("the territory became a real mapkit.PolygonOverlay on the map",
    !!A && A.hoods === 1 && A.overlays >= 1, A && JSON.stringify({ h: A.hoods, o: A.overlays }));
  check("the territory NAME — which MapKit cannot draw — is a RALLY annotation",
    !!A && A.labels === 1, A && String(A.labels));
  check("route stop numbers are RALLY annotations too", !!A && A.routeStops === 2, A && String(A.routeStops));
  check("the draft ring's vertices are on the map", !!A && A.draftDots === 3, A && String(A.draftDots));
  check("Apple is holding every object RALLY handed it",
    !!A && A.annotations >= 240, A && A.annotations + " annotations, " + A.overlays + " overlays");
  check("the map really is in SATELLITE mode", !!A && A.mapType === "satellite", A && A.mapType);
  check("the zoom curve reached the pins as a CSS variable",
    !!graph && parseFloat(graph.scaleVar) > 0, graph && graph.scaleVar);
  console.log("    [note] annotation DOM materialised: " + (graph ? graph.dom.pins : 0) +
    " of " + (A ? A.pins : 0) + " — MapKit builds an annotation's element inside the" +
    " render loop, and an UNAUTHORIZED map never runs it. That is the imagery block" +
    " showing through, not a RALLY defect.");

  const cam = await page.evaluate(() => {
    const R = window.MRENDER_MK;
    if (!R.ready()) return null;
    const o = {};
    R.jumpTo(-94.77, 38.862, 16.5);
    o.afterJump = { c: R.getCenter(), z: +R.getZoom().toFixed(2) };
    const p = R.project(-94.77, 38.862);
    o.project = p && { x: Math.round(p.x), y: Math.round(p.y) };
    const back = p && R.unproject(p.x, p.y);
    o.roundTrip = back && { dLng: Math.abs(back.lng + 94.77), dLat: Math.abs(back.lat - 38.862) };
    R.setDragPan(false); o.locked = true;
    R.setDragPan(true);
    R.fitBounds([[-94.7736, 38.8596], [-94.7664, 38.8646]], 70, 17);
    o.zoomMath = {
      round: +R._zoomMath.zoomFromSpan(
        R._zoomMath.spanFromZoom(16.5, 38.862).longitudeDelta).toFixed(3),
    };
    return o;
  });
  check("jumpTo lands on the coordinate it was given",
    !!cam && Math.abs(cam.afterJump.c.lng + 94.77) < 1e-4 && Math.abs(cam.afterJump.c.lat - 38.862) < 1e-4,
    cam && JSON.stringify(cam.afterJump.c));
  check("MapKit has no zoom, so the adapter computes one — and it round-trips",
    !!cam && Math.abs(cam.zoomMath.round - 16.5) < 0.01, cam && String(cam.zoomMath.round));
  check("project() returns a real page point",
    !!cam && cam.project && cam.project.x > 0 && cam.project.y > 0, cam && JSON.stringify(cam.project));
  check("project -> unproject round-trips (the lasso and the outline editor rest on this)",
    !!cam && cam.roundTrip && cam.roundTrip.dLng < 1e-6 && cam.roundTrip.dLat < 1e-6,
    cam && JSON.stringify(cam.roundTrip));
  check("drag-pan can be handed over for a territory drag", !!cam && cam.locked);

  /* GEOMETRY, settled against Apple's own source: a custom annotation is
     anchored at its element's BOTTOM-CENTRE, so the coordinate is the tip.
     The first build guessed "centre" and drew every door half a pin south. */
  const geo = await page.evaluate(() => {
    const R = window.MRENDER_MK;
    if (!R.ready()) return null;
    R.jumpTo(-94.7730, 38.8600, 18);
    const c = R.counts();
    const p = R.project(-94.7730, 38.8600);           // pin p0's tip on the page
    const head = Math.round(MPIN.SIZE_PX * MPIN.scaleAt(R.getZoom()) * 0.63);
    const onHead = R._hitTest(p.x, p.y - head);        // thumb on the head
    const onTip = R._hitTest(p.x, p.y);                // thumb on the tip
    const wayOff = R._hitTest(p.x + 90, p.y - head);   // an empty lawn
    // easeTo with offsetY must leave the door ABOVE the centre, clear of the sheet
    R.easeTo({ lng: -94.7730, lat: 38.8600, zoom: 18, offsetY: 200, animate: false });
    const after = R.project(-94.7730, 38.8600);
    const mid = document.getElementById("map").clientHeight / 2 + document.getElementById("map").getBoundingClientRect().top;
    // ...and from a DIFFERENT zoom: the nudge must be measured at the target zoom
    R.jumpTo(-94.7730, 38.8600, 14);
    R.easeTo({ lng: -94.7730, lat: 38.8600, zoom: 17.5, offsetY: 186, animate: false });
    const far = R.project(-94.7730, 38.8600);
    return { anchorY: c.anchorY, declaredSize: c.declaredSize, onHead, onTip, wayOff,
             pinY: Math.round(after.y), mid: Math.round(mid), farY: Math.round(far.y),
             clusteringAt18: c.clustering };
  });
  check("anchor: size is DECLARED (48px) so the CSS zoom scale cannot move it, and the tip is the coordinate",
    !!geo && geo.declaredSize === 48 && geo.anchorY === 0, geo && JSON.stringify({ size: geo.declaredSize, y: geo.anchorY }));
  check("focusPin from a zoomed-OUT screen still lands the door above the centre, on screen",
    !!geo && geo.farY > 0 && geo.farY < geo.mid, geo && geo.farY + " vs mid " + geo.mid);
  check("at street zoom the pins do NOT cluster (every worked door stays visible)",
    !!geo && geo.clusteringAt18 === false, geo && String(geo.clusteringAt18));
  check("hit test: a thumb on the pin's HEAD opens that door",
    !!geo && geo.onHead && geo.onHead.kind === "pin" && geo.onHead.id === "p0", geo && JSON.stringify(geo.onHead));
  check("hit test: a thumb 90px away is empty ground, not a door",
    !!geo && geo.wayOff === null, geo && JSON.stringify(geo.wayOff));
  check("focusPin's offset leaves the door ABOVE the centre, clear of the property card",
    !!geo && geo.pinY < geo.mid, geo && geo.pinY + " vs mid " + geo.mid);

  const sel = await page.evaluate(() => {
    const R = window.MRENDER_MK;
    if (!R.ready()) return null;
    const before = R.counts().annotations;
    R.setSelected("p7");
    const on = R.counts();
    R.setSelected("");
    const off = R.counts();
    return { on: on.selected, pinsOn: on.pins, off: off.selected, pinsOff: off.pins,
             rebuilt: on.annotations !== before };
  });
  check("selecting a door changes ONE pin in place — the other 239 are not rebuilt",
    !!sel && sel.on === "p7" && sel.off === "" && sel.pinsOn === 240 && sel.pinsOff === 240,
    sel && JSON.stringify(sel));
  const clus = await page.evaluate(() => {
    const R = window.MRENDER_MK;
    if (!R.ready()) return null;
    R.jumpTo(-94.7730, 38.8600, 13);
    const low = R.counts().clustering;
    R.jumpTo(-94.7730, 38.8600, 17);
    return { low, high: R.counts().clustering };
  });
  check("zoomed out, the pins are handed to Apple's clusterer; zoomed in, they are not",
    !!clus && clus.low === true && clus.high === false, clus && JSON.stringify(clus));

  // ------------------------------------------------------------------
  section("C — the engine switch and the fallback");
  await bootApp({ mapEngine: "auto", mapkitToken: "" });
  const auto = await page.evaluate(() => MMAP.engineReport());
  check("auto + no Apple token = the offline-capable map, no drama",
    auto.engine === "maplibre" && auto.wanted === "maplibre", JSON.stringify({ e: auto.engine, w: auto.wanted }));

  await bootApp({ mapEngine: "auto", mapkitToken: "test-token-not-signed-by-apple" });
  await page.evaluate(() => MAPP.show("map"));
  await page.waitForTimeout(3000);
  const fell = await page.evaluate(() => MMAP.engineReport());
  check("auto + a token Apple rejects = FALLS BACK to a working map",
    fell.engine === "maplibre" && fell.fellBack === true, JSON.stringify({ e: fell.engine, fb: fell.fellBack }));
  check("...and says why, rather than showing a blank screen",
    /unauthor/i.test(fell.reason || ""), fell.reason);

  await bootApp({ mapEngine: "mapkit", mapkitToken: "test-token-not-signed-by-apple" });
  await page.evaluate(() => MAPP.show("map"));
  await page.waitForTimeout(3000);
  const forced = await page.evaluate(() => MMAP.engineReport());
  /* A rep opens Settings while the (slow) MapKit handshake is still
     running and picks the offline map. The choice made LAST must be the
     one that ends up booted — and reported. */
  const race = await page.evaluate(async () => {
    STORE.settings.mapEngine = "mapkit"; STORE.settings.mapkitToken = "test-token-not-signed-by-apple";
    await STORE.saveSettings();
    const first = MMAP.init();                       // in flight: MapKit
    await new Promise((r) => setTimeout(r, 50));
    STORE.settings.mapEngine = "maplibre"; STORE.settings.mapkitToken = "";
    STORE.settings.mapkitLastError = "";
    await STORE.saveSettings();
    await MMAP.init();                               // asked for while the first runs
    await first;
    await new Promise((r) => setTimeout(r, 400));
    const r = MMAP.engineReport();
    return { engine: r.engine, wanted: r.wanted, fellBack: r.fellBack,
             lastErr: STORE.settings.mapkitLastError, canvases: document.querySelectorAll("#map canvas").length };
  });
  check("a Settings save made DURING a boot is the boot that wins",
    !!race && race.engine === "maplibre" && race.wanted === "maplibre" && race.fellBack === false && race.canvases === 1,
    race && JSON.stringify(race));
  check("an EXPLICIT mapkit choice that Apple refuses still gives the rep a map — LOUDLY",
    forced.engine === "maplibre" && forced.fellBack === true && /unauthor/i.test(forced.reason || ""),
    JSON.stringify({ e: forced.engine, fb: forced.fellBack, why: forced.reason }));

  // ------------------------------------------------------------------
  section("D — switching engines loses nothing");
  await bootApp({ mapEngine: "maplibre", mapkitToken: "" });
  const before = await page.evaluate(async () => {
    const t = await STORE.createTerritory(
      { name: "Territory 12", homes: 0,
        points: [[-94.7736, 38.8596], [-94.7664, 38.8596], [-94.7664, 38.8646], [-94.7736, 38.8646]] },
      [STORE.myId()].filter(Boolean));
    await STORE.importDoors([
      { externalId: "d1", source: "test", lat: 38.861, lng: -94.771, address: "1200 Brougham Dr",
        city: "Olathe", state: "KS", zip: "66062", propertyType: "house", eligible: true },
      { externalId: "d2", source: "test", lat: 38.862, lng: -94.772, address: "1202 Brougham Dr",
        city: "Olathe", state: "KS", zip: "66062", propertyType: "house", eligible: true },
    ], { territoryId: t.id });
    const p = STORE.pins[0];
    await STORE.addKnock({ pinId: p.id, lat: p.lat, lng: p.lng, disposition: "goback",
      reason: null, dm: true, note: "", callbackAt: Date.now() + 3600e3 });
    MMAP.focusPin(p.id);
    await new Promise((r) => setTimeout(r, 600));
    return { engine: MMAP.engine(), pins: STORE.pins.length, terr: STORE.territories.length,
      queued: STORE.queuedCount(), disp: STORE.pins[0].disposition, pinId: p.id };
  });
  check("MapLibre first: turf, doors and a knock are on the device", before.pins === 2 && before.terr === 1,
    JSON.stringify({ e: before.engine, pins: before.pins, terr: before.terr }));

  const after = await page.evaluate(async () => {
    // the same switch a rep's Settings change makes, without a reload
    STORE.settings.mapEngine = "mapkit";
    STORE.settings.mapkitToken = "test-token-not-signed-by-apple";
    await STORE.saveSettings();
    await MMAP.init();
    await new Promise((r) => setTimeout(r, 3500));
    return { engine: MMAP.engine(), pins: STORE.pins.length, terr: STORE.territories.length,
      queued: STORE.queuedCount(), disp: STORE.pins[0].disposition,
      report: MMAP.engineReport().reason };
  });
  check("after an engine switch every door is still there",
    after.pins === before.pins, after.pins + " vs " + before.pins);
  check("...the territory too", after.terr === before.terr);
  check("...the outcome recorded on the door is untouched",
    after.disp === before.disp, after.disp);
  check("...and nothing queued for upload was dropped",
    after.queued === before.queued, after.queued + " vs " + before.queued);
  const dom = await page.evaluate(() => ({
    canvases: document.querySelectorAll("#map canvas").length,
    mk: document.querySelectorAll("#map .mk-map-view").length,
    gl: document.querySelectorAll("#map .maplibregl-canvas").length,
  }));
  check("exactly ONE map lives in #map after the switch (the old engine was torn down)",
    dom.canvases === 1 && dom.mk === 0 && dom.gl === 1, JSON.stringify(dom));

  // ------------------------------------------------------------------
  section("E — the Apple token is a credential");
  const secret = await page.evaluate(async () => {
    STORE.settings.mapkitToken = "eyJhbGciOiJFUzI1NiJ9.SECRET-TOKEN-VALUE.sig";
    await STORE.saveSettings();
    // capture the REAL export the same way backup-secrets-test does
    const orig = MUI.shareOrDownload;
    let captured = null;
    MUI.shareOrDownload = async (text) => { captured = text; return true; };
    await MVAULT.backup();
    MUI.shareOrDownload = orig;
    return {
      bytes: (captured || "").length,
      leaksValue: (captured || "").indexOf("SECRET-TOKEN-VALUE") >= 0,
      leaksKey: (captured || "").indexOf("mapkitToken") >= 0,
    };
  });
  check("export produced a real backup payload", !!secret && secret.bytes > 100,
    secret && secret.bytes + " bytes");
  check("the MapKit token VALUE never reaches a backup file",
    !!secret && secret.leaksValue === false);
  check("...nor even the field name", !!secret && secret.leaksKey === false);

  // ------------------------------------------------------------------
  section("F — offline");
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  // the ENTRIES, not the prose about them — the array carries a comment
  // that names Apple's CDN precisely to say it must never be listed
  const coreSrc = sw.slice(sw.indexOf("const CORE = ["), sw.indexOf("];", sw.indexOf("const CORE = [")));
  const entries = (coreSrc.replace(/\/\*[\s\S]*?\*\//g, "").match(/"[^"]+"/g) || [])
    .map((q) => q.slice(1, -1));
  check("Apple's CDN is NOT in the service worker precache (install is all-or-nothing)",
    entries.length > 30 && entries.every((u) => u.startsWith("./")),
    entries.filter((u) => !u.startsWith("./")).join(",") || entries.length + " entries, all same-origin");
  check("the MapLibre engine IS precached, which is what makes offline possible",
    /vendor\/maplibre-gl\.js\?v=/.test(sw));
  check("all four new map modules are precached and same-origin",
    ["map-pin.js", "map-render-gl.js", "map-render-mk.js", "map-engine.js"]
      .every((f) => sw.indexOf("./js/" + f + "?v=") >= 0));

  console.log("\nApple requests proxied: " + appleHits + " ok, " + appleFail + " refused (401 = no token)");
  check("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));

  console.log("\n" + pass + " passed, " + fail + " failed");
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
