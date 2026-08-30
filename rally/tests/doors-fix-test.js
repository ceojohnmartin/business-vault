const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = require("path").join(__dirname, "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".png":"image/png",
  ".svg":"image/svg+xml", ".webmanifest":"application/manifest+json", ".json":"application/json", ".pbf":"application/x-protobuf" };
const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split("?")[0]); if (p==="/") p="/index.html";
  fs.readFile(path.join(ROOT,p),(e,d)=>{
    if(e){res.writeHead(404);res.end("nope");return;}
    res.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream"});res.end(d);
  });
});
const ok=[],bad=[]; const check=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));

(async () => {
  await new Promise(r=>server.listen(8821,r));
  const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" });
  const page = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  await page.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" }; // never touch the live project
  });
  const errors=[]; page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://localhost:8821/");
  await page.waitForSelector("#gate:not([hidden])",{timeout:25000});
  await page.click("#gate-swap-btn"); await page.waitForTimeout(200);
  await page.fill("#gate-name","T"); await page.fill("#gate-email","t@example.com");
  await page.fill("#gate-pass","knock1234"); await page.click("#gate-submit");
  await page.waitForFunction(()=>document.querySelector("#gate").hidden,null,{timeout:20000});
  await page.waitForFunction(()=>window.STORE && window.MPROP && window.MMAP,null,{timeout:20000});
  await page.waitForTimeout(800);

  const r = await page.evaluate(async () => {
    const out = {};

    // --- 1. cross-town same street line must NOT dedupe ---
    await STORE.addKnock({ lat: 30.45, lng: -91.10, disposition: "nothome" });
    const handPin = STORE.pins[STORE.pins.length-1];
    handPin.address = "123 Maple St, Baton Rouge"; handPin.geo = { city:"Baton Rouge", state:"LA", zip:"70808" };
    await STORE.updatePin(handPin);
    const far = { externalId:null, parcelId:null, source:"osm", lat: 32.50, lng: -93.75,
      address:"123 Maple St", city:"Shreveport", state:"LA", zip:"71101",
      propertyType:"Home", eligible:true, whyExcluded:null, owner:null,
      yearBuilt:null,sqft:null,lotSqft:null,lastSaleDate:null,lastSalePrice:null };
    const r1 = await STORE.importDoors([far], {});
    out.crossTown = { added: r1.added, skipped: r1.skipped }; // want added=1

    // --- 2. same street line SAME town nearby MUST dedupe ---
    const near = { ...far, lat: 30.4501, lng: -91.1001, city:"Baton Rouge", zip:"70808", externalId:null };
    const r2 = await STORE.importDoors([near], {});
    out.sameTown = { added: r2.added, skipped: r2.skipped }; // want skipped=1

    // --- 3. two regrid parcels with NO ids must not collapse into one ---
    const g1 = { externalId:null, parcelId:null, source:"regrid", lat: 30.20, lng: -91.20,
      address:"10 Oak Ln", city:"X", state:"LA", zip:"70001", propertyType:"Res", eligible:true,
      whyExcluded:null, owner:null, yearBuilt:null,sqft:null,lotSqft:null,lastSaleDate:null,lastSalePrice:null };
    const g2 = { ...g1, lat: 30.21, lng: -91.21, address:"12 Oak Ln" };
    const r3 = await STORE.importDoors([g1, g2], {});
    out.noIds = { added: r3.added, skipped: r3.skipped }; // want added=2

    // --- 4. overlapping demo draws: second import must find 0 new in overlap ---
    const ringA = [[-98.3660,38.4790],[-98.3560,38.4790],[-98.3560,38.4860],[-98.3660,38.4860]];
    const ringB = [[-98.3640,38.4810],[-98.3540,38.4810],[-98.3540,38.4880],[-98.3640,38.4880]]; // shifted overlap
    STORE.settings.propertySource = "demo"; await STORE.saveSettings();
    const sA = await MPROP.searchByPolygon(ringA, ()=>{});
    const rA = await STORE.importDoors(sA.eligible, {});
    const sB = await MPROP.searchByPolygon(ringB, ()=>{});
    const idx = STORE.buildDoorIndex();
    const freshB = sB.eligible.filter(p => !idx.match(p));
    // every B door inside A's ring must already be matched
    const inA = sB.eligible.filter(p => MGEO.inRing(ringA, p.lng, p.lat));
    const inANew = freshB.filter(p => MGEO.inRing(ringA, p.lng, p.lat));
    out.overlap = { aImported: rA.added, bTotal: sB.eligible.length, bInsideA: inA.length, bInsideANew: inANew.length }; // want bInsideANew=0

    // --- 5. re-import same set is still a no-op ---
    const rAgain = await STORE.importDoors(sA.eligible, {});
    out.rescan = { added: rAgain.added, skipped: rAgain.skipped }; // want added=0

    // --- 6. deleting a territory releases pins + knock re-attributes ---
    const t = await STORE.addTerritory({ name:"Ghost", points: ringA, homes: null });
    const pin0 = STORE.pins.find(p => p.territoryId === null && p.prop && MGEO.inRing(ringA, p.lng, p.lat));
    pin0.territoryId = t.id; await STORE.updatePin(pin0);
    await STORE.deleteTerritory(t.id);
    const released = STORE.pins.find(p => p.id === pin0.id).territoryId;
    await STORE.addKnock({ pinId: pin0.id, disposition: "nothome" });
    const ev = STORE.events[STORE.events.length-1];
    out.ghost = { released, evTid: ev.territoryId }; // want released=null, evTid=null (no live hood there)

    // --- 7. notes don't fake freshness ---
    const t2 = await STORE.addTerritory({ name:"FreshTest", points: ringA, homes: null });
    const knockTs = STORE.hoodStats(t2).lastWorked;
    await new Promise(r=>setTimeout(r, 30));
    await STORE.addNote(pin0, "note should not count as work");
    const afterNote = STORE.hoodStats(t2).lastWorked;
    out.freshness = { moved: afterNote !== knockTs, before: knockTs, after: afterNote }; // want moved=false

    // --- 8. finished territory keeps its denominator ---
    const mini = [[-98.9000,38.9000],[-98.8985,38.9000],[-98.8985,38.9012],[-98.9000,38.9012]];
    const sM = await MPROP.searchByPolygon(mini, ()=>{});
    const t3 = await STORE.addTerritory({ name:"Tiny", points: mini, homes: null });
    await STORE.importDoors(sM.eligible, { territoryId: t3.id });
    const stBefore = STORE.hoodStats(t3);
    for (const p of STORE.pins.filter(p => MGEO.inRing(mini, p.lng, p.lat))) {
      await STORE.addKnock({ pinId: p.id, disposition: "nothome" });
    }
    const stAfter = STORE.hoodStats(t3);
    out.denominator = { homesBefore: stBefore.homes, homesAfter: stAfter.homes, pctAfter: stAfter.pct }; // homes stable, pct=100

    // --- 9. demo warning surfaces at the cap (big ring) ---
    const big = [[-98.40,38.40],[-98.372,38.40],[-98.372,38.418],[-98.40,38.418]];
    const sBig = await MPROP.searchByPolygon(big, ()=>{});
    out.demoCap = { n: sBig.parcels.length, warned: (sBig.warnings||[]).length > 0 };

    return out;
  });

  check("cross-town same street imports as NEW", r.crossTown.added === 1, JSON.stringify(r.crossTown));
  check("same-town same street dedupes", r.sameTown.skipped === 1 && r.sameTown.added === 0, JSON.stringify(r.sameTown));
  check("id-less regrid parcels don't collapse", r.noIds.added === 2, JSON.stringify(r.noIds));
  check("overlapping demo draw finds 0 new in the overlap", r.overlap.bInsideANew === 0 && r.overlap.bInsideA > 10, JSON.stringify(r.overlap));
  check("identical re-import is a no-op", r.rescan.added === 0, JSON.stringify(r.rescan));
  check("deleted territory releases its pins", r.ghost.released === null, JSON.stringify(r.ghost));
  check("knock on released pin doesn't credit the ghost", r.ghost.evTid === null, JSON.stringify(r.ghost));
  check("a note does not move 'last worked'", r.freshness.moved === false, JSON.stringify(r.freshness));
  check("fully-worked territory keeps homes denominator", r.denominator.homesAfter === r.denominator.homesBefore && r.denominator.pctAfter === 100, JSON.stringify(r.denominator));
  check("demo cap surfaces a warning", r.demoCap.warned === true, JSON.stringify(r.demoCap));

  // --- 10. double-tap Save Hood cannot mint two territories (UI level) ---
  const dbl = await page.evaluate(async () => {
    const before = STORE.territories.length;
    document.querySelector("#tab-map").click();
    await new Promise(r=>setTimeout(r, 600));
    return { before };
  });
  await page.click("#fab-hoods");
  await page.waitForTimeout(400);
  const dotsBtn = await page.$("#hood-dots");
  if (dotsBtn) {
    await page.click("#hood-dots");
    await page.waitForTimeout(300);
    for (const [x,y] of [[80,300],[300,300],[300,500],[80,500]]) {
      await page.mouse.click(x,y); await page.waitForTimeout(120);
    }
    await page.click("#draw-done");
    await page.waitForSelector("#hood-name", {timeout: 8000});
    await page.fill("#hood-name", "DoubleTap");
    // two immediate taps on Save
    await page.click("#hood-save");
    await page.click("#hood-save", {force: true}).catch(()=>{});
    await page.waitForTimeout(2500);
    const after = await page.evaluate(() => STORE.territories.filter(t=>t.name==="DoubleTap").length);
    check("double-tap Save creates exactly one hood", after === 1, "count="+after);
  } else {
    check("double-tap Save creates exactly one hood", false, "hood sheet didn't open");
  }

  check("no page errors", errors.length === 0, errors.slice(0,3).join(" | "));
  console.log("\n=== PASS ("+ok.length+") ==="); ok.forEach(s=>console.log("  ✓ "+s));
  if (bad.length){ console.log("\n=== FAIL ("+bad.length+") ==="); bad.forEach(s=>console.log("  ✗ "+s)); }
  console.log(bad.length?"FAILED":"ALL GREEN");
  await b.close(); server.close(); process.exit(bad.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
