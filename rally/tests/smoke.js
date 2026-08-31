const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = require("path").join(__dirname, "..");
const SHOTS = "/tmp/claude-0/-home-user-business-vault/11606f9d-a3ab-5bea-8159-07ef2ce6f0b0/scratchpad/shots";
fs.mkdirSync(SHOTS, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end("nope"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
    res.end(data);
  });
});

(async () => {
  await new Promise((r) => server.listen(8811, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    // net:: resource failures are environment noise (no outbound net in the
    // sandbox; the restore-reload also kills in-flight tile/geocode fetches)
    if (m.type() === "error" && !/net::ERR_/.test(m.text())) errors.push("CONSOLE: " + m.text());
  });

  const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
  const sleep = (ms) => page.waitForTimeout(ms);

  // The SW claims the page shortly after first load and the app deliberately
  // reloads on controllerchange (that's how updates reach phones). Mid-test
  // that re-locks the gate under our clicks — so stub SW out; this suite
  // tests the app, not the worker.
  // This sandbox has no egress to fonts.googleapis.com: the connection is
  // blackholed and resets after ~12.6s. Aborting instantly saves the suite
  // that wait. Boot no longer DEPENDS on it — index.html loads the font
  // non-blocking now, proved by tests/font-boot-test.js.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = () => Promise.reject(new Error("sw off in test"));
    }
    // Cloud OFF for this suite: it tests the app, not the account system, and
    // must never create users in the live Supabase project. Set before
    // cloud-config.js runs, whose `||` leaves an existing value alone.
    window.RALLY_CLOUD = { url: "", anonKey: "" };
    // Test-only engine seam: the app's MMAP facade no longer exposes the raw
    // map (getMap is gone on purpose), but a few smoke assertions inspect
    // engine internals (source data, isMoving, rendered clusters). Capture
    // the instance at construction — the app itself never sees this.
    const iv = setInterval(() => {
      if (!window.maplibregl || maplibregl.Map.__seamed) return;
      const Orig = maplibregl.Map;
      maplibregl.Map = class extends Orig {
        constructor(...a) { super(...a); window.__testMap = this; }
      };
      maplibregl.Map.__seamed = true;
      clearInterval(iv);
    }, 5);
  });
  await page.goto("http://localhost:8811/");
  // the device gate is the front door now: create the device account once
  await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
  await page.click("#gate-swap-btn"); // sign-in is default; swap to create
  await page.waitForTimeout(250);
  await page.fill("#gate-name", "Smoke Tester");
  await page.fill("#gate-email", "smoke@example.com");
  await page.fill("#gate-pass", "knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 20000 });
  await sleep(2000);
  await shot("00-home-empty");
  await page.click("#tab-customers");
  await sleep(300);
  await shot("01-customers-empty");

  // ---- create a customer end-to-end ----
  await page.click("#cust-fab");
  await sleep(400);
  await page.fill("#ci-first", "Dana");
  await page.fill("#ci-last", "Whitfield");
  await page.fill("#ci-email", "dana@example.com");
  await page.fill("#ci-street", "4207 Cypress Bend Ave");
  await page.fill("#ci-city", "Baton Rouge");
  await page.fill("#ci-state", "LA");
  await page.fill("#ci-zip", "70820");
  await page.fill(".ci-phone", "2255550142");
  await shot("02-editor-info");

  await page.click('.ce-tab[data-t="service"]');
  await sleep(300);
  // Premium is already the default; discount the sticker down
  await page.fill("#cs-initial", "99");
  await page.fill("#cs-monthly", "119");
  await shot("03-editor-service");

  await page.click('.ce-tab[data-t="payment"]');
  await page.click('.pay-m[data-m="card"]');
  await page.fill("#cp-cc-name", "Dana Whitfield");
  await page.fill("#cp-cc-num", "4242424242424242");
  await page.fill("#cp-cc-exp", "1227");
  await page.click("#cp-copy-addr");
  await shot("05-editor-payment");

  await page.click('.ce-tab[data-t="agree"]');
  await sleep(500);
  await shot("06-editor-agree");
  // scroll-to-sign gate: read the whole agreement to unlock the button
  const gateLocked = await page.evaluate(() => document.querySelector("#ca-sign-save").disabled);
  await page.evaluate(() => { const d = document.querySelector("#ca-doc"); d.scrollTop = d.scrollHeight; });
  await sleep(400);
  const gateOpen = await page.evaluate(() => !document.querySelector("#ca-sign-save").disabled);
  console.log("sign gate locked-then-open:", gateLocked, gateOpen);
  // scroll the doc a bit for the screenshot of the contract itself
  await page.evaluate(() => { document.querySelector("#ca-doc").scrollTop = 300; });
  await shot("06b-agree-contract");
  await page.check("#ca-consent1");
  await page.check("#ca-consent2");
  // draw a signature
  const sig = await page.locator("#ca-sig").boundingBox();
  if (sig) {
    await page.evaluate(() => { document.querySelector(".ce-body").scrollTop = 1e6; });
    await sleep(200);
    const b = await page.locator("#ca-sig").boundingBox();
    await page.mouse.move(b.x + 30, b.y + 80);
    await page.mouse.down();
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(b.x + 30 + i * 20, b.y + 80 + Math.sin(i) * 24, { steps: 3 });
    }
    await page.mouse.up();
  }
  await shot("07-agree-signed-pad");
  await page.click("#ca-sign-save");
  await sleep(900);
  await shot("08-celebrate");
  await page.click("#celebrate");
  await sleep(400);
  await shot("09-customers-with-row");

  // ---- schedule ----
  await page.click("#tab-schedule");
  await sleep(300);
  await shot("10-schedule");
  const row = page.locator(".sched-row").first();
  if (await row.count()) {
    await row.click();
    await sleep(300);
    await page.click("#ap-done");
    await sleep(300);
    await page.click("#tab-customers");
    await sleep(300);
    await shot("11-customers-serviced");
  }

  // ---- map: knock + teardrop pins ----
  await page.click("#tab-map");
  await sleep(3500);
  await shot("12-map");
  await page.mouse.click(195, 420);
  await sleep(400);
  await shot("13-knock-sheet");
  await page.click('.disp-btn[data-d="nothome"]'); // one tap = saved
  await sleep(600);
  await page.mouse.click(240, 380);
  await sleep(300);
  const gb = page.locator('#knock-sheet .disp-btn[data-d="goback"]');
  if (await gb.isVisible()) { await gb.click(); await page.click('.cb-chip[data-cb="tomorrow"]'); }
  await sleep(500);
  const cbCount = await page.evaluate(() => STORE.callbacksDue().length);
  console.log("callbacks due:", cbCount);
  await shot("14-map-pins");

  // ---- hoods: tap-the-corners ----
  await page.click("#fab-hoods");
  await sleep(300);
  await shot("15-hood-menu");
  await page.click("#hood-dots");
  await sleep(300);
  await page.mouse.click(90, 300);
  await page.mouse.click(300, 290);
  await page.mouse.click(310, 560);
  await page.mouse.click(100, 570);
  await sleep(300);
  await shot("16-hood-draft");
  await page.click("#draw-done");
  await sleep(400);
  await page.fill("#hood-name", "Cypress Bend");
  await page.fill("#hood-homes", "184");
  await page.click('.rep-chip[data-u="+"]');
  await page.fill("#hood-newrep", "John M.");
  await page.click("#hood-save");
  await sleep(600);
  await shot("17-hood-on-map");

  // ---- phases 5-7: rep panel, area history, heat view ----
  await page.click("#fab-hoods");
  await sleep(300);
  await shot("25-rep-panel");
  const hist = await page.evaluate(() => {
    const t = STORE.territories[0];
    const h = STORE.hoodHistory(t);
    return { doors: h.doors, sales: h.sales, sessions: h.sessions.length, rep0: h.sessions[0] && h.sessions[0].rep };
  });
  console.log("area history:", JSON.stringify(hist));
  await page.click("#hood-heat");
  await sleep(600);
  await shot("26-heat-view");
  const heat = await page.evaluate(() => ({
    on: MMAP.heatMode(),
    legend: !document.querySelector("#heat-legend").hidden,
  }));
  console.log("heat:", JSON.stringify(heat));
  await page.click("#fab-hoods");
  await page.click("#hood-heat"); // back to ownership
  await sleep(300);
  // tap the rep row -> zoom to their turf with others faded
  await page.click("#fab-hoods");
  await sleep(200);
  const repRows = await page.locator("#hood-reps-panel .rep-row").count();
  console.log("rep rows:", repRows);
  await page.locator("#hood-reps-panel .rep-row").last().click();
  await sleep(900);
  await shot("27-focus-rep");

  // ---- phase 8: home dashboard ----
  await page.click("#tab-more");
  await sleep(250);
  await page.click("#mb-home");
  await sleep(400);
  await shot("28-home");
  const home = await page.evaluate(() => ({
    sales: document.querySelector(".hm-hero .big").textContent.trim(),
    chips: [...document.querySelectorAll(".hm-chip .n")].slice(0,3).map(e => e.textContent.trim()),
    upnext: document.querySelectorAll(".hm-row").length,
    turf: document.querySelector(".hm-turf-line").textContent.replace(/\s+/g," ").trim().slice(0,80),
  }));
  console.log("home:", JSON.stringify(home));
  await page.click("#hm-rank");
  await sleep(300);
  await shot("29-leaderboard-via-home");
  await page.click("#tab-more");
  await sleep(250);
  await page.click("#mb-home");
  await sleep(300);
  await page.click("#hm-knock");
  await sleep(400);
  const onMap = await page.evaluate(() => document.querySelector("#screen-map").classList.contains("active"));
  console.log("START KNOCKING -> map:", onMap);

  // ---- phases 9-11: lead -> appointment handoff -> pipeline ----
  await page.click("#tab-customers");
  await sleep(300);
  await shot("30-pipeline-chips");
  const danaStage = await page.evaluate(() =>
    document.querySelector(".cust-row .stage-tag").textContent.trim());
  console.log("Dana stage:", danaStage);
  // create a lead: name only, no agreement
  await page.click("#cust-fab");
  await sleep(300);
  await page.fill("#ci-first", "Lena");
  await page.fill("#ci-last", "Ortiz");
  await page.click("#ce-save");
  await sleep(400);
  // the modern dropdown filter replaces the chip strip
  await page.click("#cf-filter");
  await sleep(200);
  await page.click('.pop-menu button[data-v="notsched"]');
  await sleep(200);
  const leadRows = await page.locator(".cust-row").count();
  console.log("not-scheduled rows:", leadRows);
  await shot("31-filter-dropdown");
  await page.click("#cf-filter");
  await sleep(200);
  await page.click('.pop-menu button[data-v="all"]');
  await sleep(200);

  // appointment handoff: schedule Lena's sit, hand it to John M.
  await page.click("#tab-schedule");
  await sleep(300);
  // Dana no longer auto-schedules from the editor, so BOTH customers sit in
  // Not scheduled — pick Lena's row by name
  await page.locator(".sched-un:not(.cb-row)", { hasText: "Lena" }).first().click();
  await sleep(300);
  await shot("32-appt-sheet");
  await page.locator('#ap-who .rep-chip').nth(1).click(); // John M.
  await page.click("#ap-save");
  await sleep(400);
  const handRow = await page.evaluate(() => {
    const r = [...document.querySelectorAll(".sched-row")].find((x) => x.textContent.includes("Lena"));
    return r ? r.textContent.replace(/\s+/g, " ").slice(0, 120) : "MISSING";
  });
  console.log("handoff row:", handRow);
  // confirm it
  const lenaRow = page.locator(".sched-row", { hasText: "Lena" });
  await lenaRow.click();
  await sleep(300);
  await page.click("#ap-confirm");
  await sleep(300);
  const confirmed = await page.evaluate(() => {
    const r = [...document.querySelectorAll(".sched-row")].find((x) => x.textContent.includes("Lena"));
    return r && r.textContent.includes("Confirmed");
  });
  console.log("confirmed:", confirmed);
  // Lena is now stage "appt"
  await page.click("#tab-customers");
  await sleep(300);
  const lenaStage = await page.evaluate(() => {
    const r = [...document.querySelectorAll(".cust-row")].find((x) => x.textContent.includes("Lena"));
    return r ? r.querySelector(".stage-tag").textContent.trim() : "MISSING";
  });
  console.log("Lena stage:", lenaStage);
  // home shows the leads row? (Lena has an appointment now, so leads row may be gone — check upnext includes appointment)
  await page.click("#tab-more");
  await sleep(250);
  await page.click("#mb-home");
  await sleep(300);
  const upnextTxt = await page.evaluate(() =>
    [...document.querySelectorAll(".hm-row .tx")].map((e) => e.textContent.replace(/\s+/g, " ").trim().slice(0, 60)));
  console.log("home upnext:", JSON.stringify(upnextTxt));
  await shot("33-home-final");

  // ---- phases 12-15 ----
  // best area card (manager)
  const best = await page.evaluate(() => {
    const b = document.querySelector("#hm-best");
    return b ? b.textContent.replace(/\s+/g, " ").trim().slice(0, 110) : "MISSING";
  });
  console.log("best area:", best);
  // coaching seg on leaderboard
  await page.click("#hm-rank");
  await sleep(300);
  await page.click('#rank-seg .seg-opt[data-v="coach"]');
  await sleep(300);
  const coach = await page.evaluate(() =>
    [...document.querySelectorAll(".coach-card .cc-head")].map((e) => e.textContent.replace(/\s+/g, " ").trim()));
  console.log("coach cards:", JSON.stringify(coach));
  await shot("34-coaching");
  // opportunity score on a pin (the go-back has a callback → score should exist)
  await page.click("#tab-map");
  await sleep(600);
  const gbPin = await page.evaluate(() => STORE.pins.find((p) => p.disposition === "goback").id);
  await page.evaluate((id) => MMAP.focusPin(id), gbPin);
  await sleep(700);
  const opp = await page.evaluate(() => {
    const el = document.querySelector("#lead-opp");
    return el && !el.hidden ? el.textContent.replace(/\s+/g, " ").trim().slice(0, 90) : "MISSING";
  });
  console.log("opportunity:", opp);
  await shot("35-pin-opportunity");
  await page.evaluate(() => MUI.closeSheet());
  await sleep(300);
  // re-knock route from schedule
  await page.click("#tab-schedule");
  await sleep(300);
  await page.click("#cb-route");
  await sleep(800);
  const route = await page.evaluate(() => ({
    stops: document.querySelectorAll(".route-stop").length,
    sub: document.querySelector("#route-sub").textContent.trim(),
    mapPts: window.__testMap.getSource("route")._data.features.length,
  }));
  console.log("route:", JSON.stringify(route));
  await shot("36-route-sheet");
  await page.click("#route-start");
  await sleep(600);
  await shot("37-route-on-map");
  await page.evaluate(() => MUI.closeSheet());
  await sleep(300);
  // smart split: split Cypress Bend into 3
  await page.click("#fab-hoods");
  await sleep(200);
  await page.locator("#hood-list .hood-edit").first().click();
  await sleep(300);
  await page.click("#hood-split");
  await sleep(200);
  page.once("dialog", (d) => d.accept());
  await page.click('.split-chip[data-n="3"]');
  await sleep(800);
  const hoods = await page.evaluate(() =>
    STORE.territories.map((t) => t.name + ":" + (t.homes || 0)));
  console.log("after split:", JSON.stringify(hoods));
  await shot("38-split-hoods");

  // ---- leaderboard (behind Home since Phase 8) + more ----
  await page.click("#tab-more");
  await sleep(250);
  await page.click("#mb-home");
  await sleep(300);
  await page.click("#hm-rank");
  await sleep(300);
  await shot("18-leaderboard");
  await page.click('#rank-seg .seg-opt[data-v="me"]');
  await sleep(300);
  await shot("19-my-numbers");
  await page.click("#tab-more");
  await sleep(200);
  await shot("20-more");
  await page.click("#more-company");
  await sleep(300);
  await page.fill("#set-co-name", "Guardian Pest Solutions LLC");
  await page.fill("#set-co-address", "12 Commerce Park Dr, Baton Rouge, LA 70809");
  await page.fill("#set-co-phone", "(225) 555-0100");
  await page.fill("#set-co-email", "office@guardianpest.example");
  await page.fill("#set-co-license", "8842-C");
  await page.click("#company-save");
  await sleep(300);
  await shot("21-more-company-set");
  await page.click("#more-guide");
  await sleep(300);
  await shot("22-guide");

  // ---- reopen customer, verify agreement state + files ----
  await page.click("#guide-back");
  await page.click("#tab-customers");
  await sleep(300);
  await page.click(".cust-row");
  await sleep(400);
  await page.click('.ce-tab[data-t="agree"]');
  await sleep(300);
  await shot("23-agree-signed");
  await page.click('.ce-tab[data-t="files"]');
  await sleep(300);
  await shot("24-files");
  await page.click("#ce-back");
  await sleep(300);

  // ---- street mode + bulk lasso ----
  await page.click("#tab-map");
  await sleep(400);
  // the sandbox has no reverse geocoding — seed the addresses it would give
  await page.evaluate(async () => {
    const nums = [4207, 4210];
    for (let i = 0; i < STORE.pins.length; i++) {
      STORE.pins[i].address = (nums[i] || 4212 + i * 2) + " Cypress Bend Ave, Baton Rouge";
      await STORE.updatePin(STORE.pins[i]);
    }
  });
  await page.click("#fab-street");
  await sleep(400);
  const streetInfo = await page.evaluate(() => ({
    sub: document.querySelector("#street-sub").textContent,
    chips: Array.from(document.querySelectorAll("#street-streets .st-chip")).map((b) => b.textContent.trim()),
    filters: Array.from(document.querySelectorAll("#street-filters .sf-chip")).map((b) => b.textContent.trim()),
    rows: document.querySelectorAll("#street-list .street-row").length,
  }));
  console.log("street:", JSON.stringify(streetInfo));
  await shot("42-street-mode");
  // odd/even filter narrows the list
  await page.click('#street-filters .sf-chip[data-f="odd"]');
  await sleep(200);
  const oddRows = await page.evaluate(() =>
    document.querySelectorAll("#street-list .street-row").length);
  console.log("street odd rows:", oddRows);
  // tap a door -> pin sheet opens
  await page.click('#street-filters .sf-chip[data-f="all"]');
  await sleep(200);
  await page.locator("#street-list .street-row").first().click();
  await sleep(500);
  const streetToPin = await page.evaluate(() =>
    document.querySelector("#lead-sheet").classList.contains("open"));
  console.log("street row -> pin sheet:", streetToPin);
  await page.evaluate(() => { MUI.closeSheet(); MMAP.clearSelection(); });
  // let the focusPin flyTo land before drawing — the lasso unprojects
  // screen points against the live camera
  await page.waitForFunction(() => !window.__testMap.isMoving(), null, { timeout: 10000 }).catch(() => {});
  await sleep(300);

  // lasso: circle everything via the pencil gesture in lasso mode
  await page.evaluate(() => {
    window.__coords = null;
    const orig = MSELECT.open;
    MSELECT.open = (c) => { window.__coords = c; return orig(c); };
  });
  await page.click("#fab-hoods");
  await sleep(200);
  await page.click("#hood-lasso");
  await sleep(300);
  // circle around where the pin actually sits on screen (focusPin offsets
  // the camera so the pin rides above the sheet area, not dead center)
  const pinPt = await page.evaluate(() => {
    const p = STORE.pins[0];
    const q = MMAP.project(p.lng, p.lat);
    return { x: q.x, y: q.y };
  });
  const cx = Math.min(Math.max(pinPt.x, 130), 260),
        cy = Math.min(Math.max(pinPt.y, 130), 640), R = 110;
  await page.mouse.move(cx + R, cy);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    await page.mouse.move(cx + R * Math.cos(a), cy + R * Math.sin(a), { steps: 2 });
  }
  await page.mouse.up();
  await sleep(500);
  const lasso = await page.evaluate(() => ({
    open: document.querySelector("#lasso-sheet").classList.contains("open"),
    title: document.querySelector("#lasso-title").textContent,
    chips: Array.from(document.querySelectorAll("#lasso-break .lb-chip")).map((c) => c.textContent.trim()),
    ringPts: (window.__coords || []).length,
  }));
  console.log("lasso:", JSON.stringify(lasso));
  await shot("43-lasso");
  // route the selection
  await page.click("#lasso-route");
  await sleep(500);
  const lassoRoute = await page.evaluate(() => ({
    open: document.querySelector("#route-sheet").classList.contains("open"),
    sub: document.querySelector("#route-sub").textContent,
    stops: document.querySelectorAll("#route-list .route-stop").length,
  }));
  console.log("lasso route:", JSON.stringify(lassoRoute));
  await shot("44-lasso-route");
  await page.click("#route-end");
  await sleep(300);

  // ---- Phases 16–17: integrations + vault ----
  // appt sheet contact actions (Dana has phone + address + a booked visit)
  await page.click("#tab-schedule");
  await sleep(300);
  await page.locator("#sched-list .sched-row").first().click();
  await sleep(300);
  const apActs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#ap-actions .ap-act")).map((a) =>
      a.textContent.trim().replace(/^\S+\s*/, "") || a.id));
  console.log("appt actions:", JSON.stringify(apActs));
  await shot("39-appt-actions");
  // .ics generation (capture instead of downloading)
  const ics = await page.evaluate(async () => {
    let got = null;
    const orig = MUI.shareOrDownload;
    MUI.shareOrDownload = async (content, name, mime) => { got = { name, mime, ok: /BEGIN:VCALENDAR/.test(content) && /DTSTART:\d{8}T\d{6}/.test(content) }; return true; };
    document.querySelector("#ap-ics").click();
    await new Promise((r) => setTimeout(r, 200));
    MUI.shareOrDownload = orig;
    return got;
  });
  console.log("ics:", JSON.stringify(ics));
  await page.evaluate(() => MUI.closeSheet());

  // lead sheet has the directions button
  await page.click("#tab-map");
  await sleep(400);
  const navBtn = await page.evaluate(() => {
    const p = STORE.pins[0];
    MMAP.focusPin(p.id);
    const b = document.querySelector("#lead-nav");
    return b && b.offsetParent !== null;
  });
  console.log("lead nav visible:", navBtn);
  await page.evaluate(() => { MUI.closeSheet(); MMAP.clearSelection(); });

  // CSV export (captured)
  const csv = await page.evaluate(async () => {
    let got = null;
    const orig = MUI.shareOrDownload;
    MUI.shareOrDownload = async (content, name, mime) => {
      const lines = String(content).split("\r\n");
      got = { name, mime, header: lines[0].split(",").slice(0, 4).join("|"), rows: lines.length - 1 };
      return true;
    };
    await MVAULT.exportCSV();
    MUI.shareOrDownload = orig;
    return got;
  });
  console.log("csv:", JSON.stringify(csv));

  // backup sheet + storage status
  await page.click("#tab-more");
  await sleep(200);
  await page.click("#more-backup");
  await sleep(600);
  const bkStatus = await page.evaluate(() => document.querySelector("#bk-status").textContent);
  console.log("storage status:", bkStatus);
  await shot("40-backup-sheet");
  // backup payload shape (captured)
  const bk = await page.evaluate(async () => {
    let got = null;
    const orig = MUI.shareOrDownload;
    MUI.shareOrDownload = async (content, name) => {
      const p = JSON.parse(content);
      got = { name, rally: p.rally, customers: p.data.customers.length, pins: p.data.pins.length, files: p.data.files.length, kv: p.data.kv.length };
      return true;
    };
    await MVAULT.backup();
    MUI.shareOrDownload = orig;
    return got;
  });
  console.log("backup:", JSON.stringify(bk));
  await page.evaluate(() => MUI.closeSheet());

  // restore round-trip: snapshot -> wipe customers -> restore -> app reloads
  const beforeRestore = await page.evaluate(async () => {
    window.confirm = () => true;
    const data = {};
    for (const s of ["users", "territories", "pins", "events", "customers"]) data[s] = await MDB.getAll(s);
    data.kv = await MDB.getAll("kv");
    data.files = [];
    const n = data.customers.length;
    await MDB.clear("customers");
    const f = new File([JSON.stringify({ rally: 1, exportedAt: new Date().toISOString(), data })],
      "rally-backup.json", { type: "application/json" });
    MVAULT.restoreFile(f); // reloads the page ~0.9s after the puts land
    return n;
  });
  await sleep(2500); // restore + reload — the session persists right through it
  await page.waitForFunction(() => window.MAPP && window.STORE && STORE.customers.length > 0,
    null, { timeout: 20000 }).catch(() => {});
  const afterRestore = await page.evaluate(() => window.STORE ? STORE.customers.length : -1);
  console.log("restore round-trip:", beforeRestore, "->", afterRestore,
    beforeRestore === afterRestore ? "OK" : "MISMATCH");
  await shot("41-after-restore");

  // ==== TERRITORY DOORS: draw → detect → import → knock → persist ====
  // demo provider = deterministic, no network needed
  await page.click("#tab-map");
  await sleep(600);
  await page.evaluate(async () => {
    STORE.settings.propertySource = "demo";
    await STORE.saveSettings();
    MMAP.jumpTo(-98.362, 38.481, 16);
  });
  await sleep(500);
  const pinsBefore = await page.evaluate(() => STORE.pins.length);

  // CREATE TERRITORY → tap corners → done
  await page.click("#fab-hoods");
  await sleep(200);
  await page.click("#hood-dots");
  await sleep(300);
  await page.mouse.click(70, 250);
  await page.mouse.click(330, 250);
  await page.mouse.click(330, 600);
  await page.mouse.click(70, 600);
  await sleep(200);
  await page.click("#draw-done");
  await sleep(1200); // demo scan is instant, give the UI a beat
  const scan1 = await page.evaluate(() => ({
    status: document.querySelector("#hd-status").textContent,
    importRow: !document.querySelector("#hd-import-row").hidden,
    toggleOn: document.querySelector("#hd-import-btn").classList.contains("sel"),
    toggleTxt: document.querySelector("#hd-import-btn").textContent,
  }));
  console.log("territory scan:", JSON.stringify(scan1));
  await shot("45-territory-scan");
  await page.fill("#hood-name", "Demo Meadows");
  await page.click("#hood-save");
  await sleep(2500);
  const afterImport = await page.evaluate(() => ({
    pins: STORE.pins.length,
    unworked: STORE.pins.filter((p) => p.disposition === "unworked").length,
    withTerritory: STORE.pins.filter((p) => p.territoryId).length,
    withAddr: STORE.pins.filter((p) => p.disposition === "unworked" && p.address).length,
  }));
  console.log("imported:", JSON.stringify(afterImport), "pins before:", pinsBefore);
  await shot("46-doors-pinned");

  // tap a house → property card
  const doorId = await page.evaluate(() => {
    const p = STORE.pins.find((x) => x.disposition === "unworked");
    MMAP.focusPin(p.id);
    return p.id;
  });
  await sleep(800);
  const card1 = await page.evaluate(() => ({
    open: document.querySelector("#lead-sheet").classList.contains("open"),
    addr: document.querySelector("#lead-addr").textContent,
    badge: document.querySelector("#lead-badge").textContent.trim(),
    facts: !document.querySelector("#prop-facts-sec").hidden,
    factsTxt: document.querySelector("#prop-facts").textContent.replace(/\s+/g, " ").slice(0, 80),
    knockmeta: document.querySelector("#prop-knockmeta").textContent,
    crm: document.querySelector("#prop-crm").textContent.trim().slice(0, 40),
    quick: document.querySelectorAll("#prop-quick .pq").length,
  }));
  console.log("property card:", JSON.stringify(card1));
  await shot("47-property-card");

  // NOT HOME in one tap → pin flips yellow, history gains the entry
  await page.click('#prop-quick .pq[data-q="nothome"]');
  await sleep(600);
  const afterNH = await page.evaluate((id) => {
    const p = STORE.pins.find((x) => x.id === id);
    return { disp: p.disposition, hist: p.history.map((h) => h.disposition),
      meta: document.querySelector("#prop-knockmeta").textContent };
  }, doorId);
  console.log("after NOT HOME:", JSON.stringify(afterNH));

  // close, reopen — history shows NOT HOME
  await page.evaluate(() => { MUI.closeSheet(); MMAP.clearSelection(); });
  await sleep(200);
  await page.evaluate((id) => MMAP.focusPin(id), doorId);
  await sleep(500);
  const reopened = await page.evaluate(() =>
    document.querySelector("#lead-history").textContent.includes("Not Home"));
  console.log("reopen shows history:", reopened);
  await shot("48-card-after-knock");

  // CALLBACK → tomorrow chip → persisted on the pin
  await page.click('#prop-quick .pq[data-q="goback"]');
  await sleep(200);
  await page.click('#prop-cbchips .pcb[data-cb="tomorrow"]');
  await sleep(600);
  const cbSet = await page.evaluate((id) => {
    const p = STORE.pins.find((x) => x.id === id);
    return { disp: p.disposition, cb: !!p.callbackAt, hist: p.history.length };
  }, doorId);
  console.log("callback:", JSON.stringify(cbSet));
  await page.evaluate(() => { MUI.closeSheet(); MMAP.clearSelection(); });

  // NOT QUALIFIED with a reason on another door
  await page.evaluate(() => {
    const p = STORE.pins.find((x) => x.disposition === "unworked");
    MMAP.focusPin(p.id);
  });
  await sleep(500);
  await page.click('#prop-quick .pq[data-q="dnk"]');
  await sleep(200);
  const nqChips = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#prop-nqchips .nq-chip")).map((c) => c.textContent));
  console.log("nq reasons:", JSON.stringify(nqChips));
  await page.click('#prop-nqchips .nq-chip[data-r="Renter"]');
  await sleep(500);
  const nqDone = await page.evaluate(() => {
    const p = STORE.pins.filter((x) => x.disposition === "dnk").pop();
    return p && p.reason;
  });
  console.log("nq saved with reason:", nqDone);
  await page.evaluate(() => { MUI.closeSheet(); MMAP.clearSelection(); });

  // duplicate protection: rescan the same territory → all dupes, 0 new
  await page.click("#fab-hoods");
  await sleep(300);
  await page.evaluate(() => {
    const t = STORE.territories.find((x) => x.name === "Demo Meadows");
    document.querySelector(`#hood-list .hood-edit[data-id="${t.id}"]`).click();
  });
  await sleep(400);
  const doorsBlock = await page.evaluate(() => document.querySelector("#hd-status").textContent);
  console.log("existing-hood doors line:", doorsBlock);
  await page.click("#hd-scan");
  await sleep(1200);
  const rescan = await page.evaluate(() => ({
    status: document.querySelector("#hd-status").textContent,
    importHidden: document.querySelector("#hd-import-row").hidden,
  }));
  console.log("duplicate rescan:", JSON.stringify(rescan));
  await shot("49-duplicate-scan");
  await page.evaluate(() => MUI.closeSheet());

  // territory metrics: imported doors count as inventory, not as knocks
  const tstats = await page.evaluate(() => {
    const t = STORE.territories.find((x) => x.name === "Demo Meadows");
    const s = STORE.hoodStats(t);
    return { doors: s.doors, knocked: s.knocked, unworked: s.by.unworked, pct: s.pct };
  });
  console.log("territory stats:", JSON.stringify(tstats));

  // clustering at low zoom with a big pin count
  await page.evaluate(() => MMAP.jumpTo(-98.362, 38.481, 12));
  await sleep(900);
  const clusters = await page.evaluate(() =>
    window.__testMap.queryRenderedFeatures({ layers: ["pins-clusters"] }).length);
  console.log("clusters at z12:", clusters);
  await shot("50-clusters");

  // error states: rooftop-sized area, and a provider that can't reach its API
  const tinyErr = await page.evaluate(async () => {
    try { await MPROP.searchByPolygon([[-98.3, 38.4], [-98.3001, 38.4], [-98.3001, 38.4001]]); return "no-error"; }
    catch (e) { return e.message; }
  });
  console.log("tiny-area error:", tinyErr);
  const apiErr = await page.evaluate(async () => {
    STORE.settings.propertySource = "osm"; // sandbox has no network → must fail loudly
    try { await MPROP.searchByPolygon([[-98.37, 38.47], [-98.35, 38.47], [-98.35, 38.49], [-98.37, 38.49]]); return "no-error"; }
    catch (e) { return e.message; }
    finally { STORE.settings.propertySource = "demo"; }
  });
  console.log("provider-failure error:", apiErr);

  // reload → everything persists
  await page.reload();
  // the session persists: a relaunch sails straight past the gate
  await sleep(2500);
  const gateAfterReload = await page.evaluate(() => document.querySelector("#gate").hidden);
  console.log("gate stays hidden after reload:", gateAfterReload);
  await page.waitForFunction(() => window.MAPP && window.STORE && STORE.pins.length > 0,
    null, { timeout: 20000 }).catch(() => {});
  const persisted = await page.evaluate((id) => {
    const p = STORE.pins.find((x) => x.id === id);
    const t = STORE.territories.find((x) => x.name === "Demo Meadows");
    return {
      pin: p ? { disp: p.disposition, cb: !!p.callbackAt, hist: p.history.length, prop: !!p.prop } : null,
      territory: !!t,
      unworked: STORE.pins.filter((x) => x.disposition === "unworked").length,
    };
  }, doorId);
  console.log("persisted after reload:", JSON.stringify(persisted));

  console.log("ERRORS:", errors.length ? "\n" + errors.join("\n") : "none");
  await browser.close();
  server.close();
  process.exit(errors.length ? 2 : 0);
})();
