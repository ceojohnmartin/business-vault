/* Phase 0 contract test: the MMAP facade is complete and airtight, and the
   dot-draw draft ring renders through it exactly as before. */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = require("path").join(__dirname, "..");
const SHOTS = require("path").join(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".png":"image/png",
  ".svg":"image/svg+xml", ".webmanifest":"application/manifest+json", ".pbf":"application/x-protobuf" };
const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split("?")[0]); if (p==="/") p="/index.html";
  fs.readFile(path.join(ROOT,p),(e,d)=>{ if(e){res.writeHead(404);res.end();return;}
    res.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream"});res.end(d); });
});
const ok=[],bad=[]; const check=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));

(async () => {
  await new Promise(r=>server.listen(8841,r));
  const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" });
  const page = await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
  // This sandbox's proxy makes fonts.googleapis.com HANG rather than fail
  // fast. That <link> is render-blocking, so a hung font request stalls
  // every script and freezes the app on the splash. Fail it instantly.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" }; // never touch the live project
  });
  const errors=[]; page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://localhost:8841/");
  await page.waitForSelector("#gate:not([hidden])",{timeout:25000});
  await page.click("#gate-swap-btn"); await page.waitForTimeout(200);
  await page.fill("#gate-name","T"); await page.fill("#gate-email","t@example.com");
  await page.fill("#gate-pass","knock1234"); await page.click("#gate-submit");
  await page.waitForFunction(()=>document.querySelector("#gate").hidden,null,{timeout:20000});
  await page.click("#tab-map"); await page.waitForTimeout(2500);

  // ---- the contract ----
  const api = await page.evaluate(() => {
    const out = { hasGetMap: "getMap" in MMAP, isReady: MMAP.isReady() };
    MMAP.jumpTo(-98.362, 38.481, 16);
    const c = MMAP.getCenter();
    out.center = c && Math.abs(c.lng - -98.362) < 1e-6 && Math.abs(c.lat - 38.481) < 1e-6;
    const p = MMAP.project(-98.362, 38.481);
    out.projectCenter = p && Math.abs(p.x - innerWidth / 2) < 2;
    const ll = MMAP.unproject(p.x, p.y);
    out.roundTrip = ll && Math.abs(ll.lng - -98.362) < 1e-6 && Math.abs(ll.lat - 38.481) < 1e-6;
    out.fns = ["isReady","getCenter","project","unproject","jumpTo","onMapClick","setDraftRing"]
      .every((k) => typeof MMAP[k] === "function");
    return out;
  });
  check("getMap is GONE from the facade", api.hasGetMap === false);
  check("all 7 new facade methods exist", api.fns);
  check("isReady true after init", api.isReady);
  check("jumpTo/getCenter agree", api.center);
  check("project puts center mid-screen", api.projectCenter);
  check("project→unproject round-trips exactly", api.roundTrip);

  // ---- dot-draw goes through onMapClick, draft ring renders ----
  await page.click("#fab-hoods"); await page.waitForTimeout(350);
  await page.click("#hood-dots"); await page.waitForTimeout(300);
  for (const [x,y] of [[90,320],[300,320],[300,520],[90,520]]) {
    await page.mouse.click(x,y); await page.waitForTimeout(140);
  }
  const draft = await page.evaluate(() => ({
    doneEnabled: !document.querySelector("#draw-done").disabled,
    drawing: MHOODS.isDrawing(),
  }));
  check("4 taps register through onMapClick (Done unlocks)", draft.doneEnabled);
  check("draw mode active", draft.drawing);
  await page.screenshot({ path: SHOTS + "/p0-draft-ring.png" });
  // taps while drawing must NOT create knock pins (consume semantics)
  const pinsNow = await page.evaluate(() => STORE.pins.length);
  check("draw taps created no knock pins", pinsNow === 0, "pins="+pinsNow);
  await page.click("#draw-done"); await page.waitForTimeout(400);
  check("Done opens the territory sheet", await page.$eval("#hood-sheet", e => e.classList.contains("open") || !e.hidden));
  // cancel out, then let the sheet finish sliding away — a tap during the
  // close animation lands on the sheet, not the map (same settle every
  // other suite gives closeSheet)
  await page.evaluate(() => MUI.closeSheet());
  await page.waitForTimeout(400);
  const modeAfter = await page.evaluate(() => MHOODS.isDrawing());
  check("draw mode ended after Done", modeAfter === false);
  await page.mouse.click(200, 430); await page.waitForTimeout(600);
  const sheetOpen = await page.evaluate(() => document.querySelector("#knock-sheet").classList.contains("open"));
  check("normal map tap opens knock sheet again", sheetOpen === true);

  check("no page errors", errors.length === 0, errors.slice(0,3).join("|"));
  console.log("\n=== PASS ("+ok.length+") ==="); ok.forEach(x=>console.log("  ✓ "+x));
  if (bad.length){ console.log("\n=== FAIL ("+bad.length+") ==="); bad.forEach(x=>console.log("  ✗ "+x)); }
  console.log(bad.length?"FAILED":"ALL GREEN");
  await b.close(); server.close(); process.exit(bad.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
