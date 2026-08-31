const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = require("path").join(__dirname, "..");
const SHOTS = require("path").join(__dirname, "shots");
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
const t = (page, sel) => page.$eval(sel, e => e.textContent.trim());

(async () => {
  await new Promise(r=>server.listen(8823,r));
  const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" });
  const page = await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
  // This sandbox has no egress to fonts.googleapis.com: the connection is
  // blackholed and resets after ~12.6s. Aborting instantly saves the suite
  // that wait. Boot no longer DEPENDS on it — index.html loads the font
  // non-blocking now, proved by tests/font-boot-test.js.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" }; // never touch the live project
  });
  const errors=[]; page.on("pageerror",e=>errors.push("PAGE: "+e.message));
  page.on("console",m=>{ if(m.type()==="error" && !/net::ERR_/.test(m.text())) errors.push("CON: "+m.text()); });

  await page.goto("http://localhost:8823/");
  await page.waitForSelector("#gate:not([hidden])",{timeout:25000});
  await page.click("#gate-swap-btn"); await page.waitForTimeout(200);
  await page.fill("#gate-name","Flow"); await page.fill("#gate-email","f@example.com");
  await page.fill("#gate-pass","knock1234"); await page.click("#gate-submit");
  await page.waitForFunction(()=>document.querySelector("#gate").hidden,null,{timeout:20000});
  await page.waitForTimeout(1200);

  // ---- boot: lands on Customers, plain empty state, correct tab bar ----
  check("boots to Customers tab", await page.$eval("#screen-customers", e=>e.classList.contains("active")));
  check("empty state is exactly 'No customers yet.'", (await t(page,"#cust-list")) === "No customers yet.", await t(page,"#cust-list"));
  const tabs = await page.$$eval("#tabbar .tab", els => els.map(e=>e.textContent.trim()));
  check("tab order Customers·Map·Route·Leaderboard·More", JSON.stringify(tabs)===JSON.stringify(["Customers","Map","Route","Leaderboard","More"]), tabs.join(","));
  check("R mark present", !!(await page.$(".rmark svg")));
  await page.screenshot({path:SHOTS+"/f2-01-customers-empty.png"});

  // ---- More: bubbles ----
  await page.click("#tab-more"); await page.waitForTimeout(300);
  check("More has Home/Customers/Office bubbles",
    !!(await page.$("#mb-home")) && !!(await page.$("#mb-customers")) && !!(await page.$("#mb-office")));
  await page.screenshot({path:SHOTS+"/f2-02-more.png"});
  await page.click("#mb-home"); await page.waitForTimeout(300);
  check("Home opens from More", await page.$eval("#screen-home", e=>e.classList.contains("active")));
  await page.click("#home-back"); await page.waitForTimeout(200);

  // ---- new customer ----
  await page.click("#tab-customers"); await page.waitForTimeout(200);
  await page.click("#cust-fab"); await page.waitForTimeout(400);
  check("editor opens", await page.$eval("#screen-custedit", e=>e.classList.contains("active")));
  check("no pipeline dashes/quote", !(await page.$("#ce-pipe .pipe-track")), "");
  const tabsCE = await page.$$eval(".ce-tab", els=>els.map(e=>e.textContent.trim()));
  check("REFERRALS tab is gone", !tabsCE.includes("REFERRALS"), tabsCE.join(","));

  await page.fill("#ci-first","Dana"); await page.fill("#ci-last","Whitfield");
  // phone formats with dashes as you type
  await page.fill("#ci-phones .ci-phone","3855803160");
  const ph = await page.$eval("#ci-phones .ci-phone", e=>e.value);
  check("phone formats 385-580-3160", ph === "385-580-3160", ph);
  // + adds another phone row
  await page.click("#ci-add-phone"); await page.waitForTimeout(150);
  check("+ adds second phone", (await page.$$("#ci-phones .ci-phone")).length === 2);
  await page.fill("#ci-email","dana@example.com");
  await page.fill("#ci-street","4207 Cypress Bend Ave");
  await page.fill("#ci-city","Baton Rouge"); await page.fill("#ci-state","LA"); await page.fill("#ci-zip","70816");
  check("map code field is gone", !(await page.$("#ci-mapcode")));
  check("source field is gone", !(await page.$("#ci-source")));
  check("GPS button exists", !!(await page.$("#ci-gps")));

  // additional contact via sheet
  await page.click("#ci-add-contact"); await page.waitForTimeout(350);
  await page.fill("#cc-name","Jordan W"); await page.fill("#cc-phone","2255551234");
  await page.click("#cc-save"); await page.waitForTimeout(300);
  check("contact added via bubble sheet", (await t(page,"#ci-contacts")).includes("Jordan W"));

  // pest chip → forever notes autotext, toggle off removes
  await page.click('#ci-pests .pchip[data-p="fireants"]'); await page.waitForTimeout(120);
  let notes = await page.$eval("#ci-notes-forever", e=>e.value);
  check("fire ants note lands in Forever Notes", notes.includes("Fire ants: fire ants in the front and back yard"), notes.slice(0,60));
  await page.click('#ci-pests .pchip[data-p="spiders"]'); await page.waitForTimeout(120);
  notes = await page.$eval("#ci-notes-forever", e=>e.value);
  check("second pest appends", notes.includes("Spiders:") && notes.includes("Fire ants:"));
  await page.click('#ci-pests .pchip[data-p="fireants"]'); await page.waitForTimeout(120);
  notes = await page.$eval("#ci-notes-forever", e=>e.value);
  check("toggling off removes its text, keeps the rest", !notes.includes("Fire ants:") && notes.includes("Spiders:"), notes.slice(0,50));
  await page.click('#ci-props .pchip[data-p="Dog on Property"]');
  await page.fill("#ci-notes-initial","Gate code 4482");
  // switch over toggle
  await page.click("#ci-switch");
  await page.screenshot({path:SHOTS+"/f2-03-info.png"});

  // ---- SERVICE ----
  await page.click('.ce-tab[data-t="service"]'); await page.waitForTimeout(350);
  check("plan defaults to Premium", (await t(page,"#cs-plan-cur")).includes("Premium"), await t(page,"#cs-plan-cur"));
  check("sticker shows 450 in the card", (await page.$eval("#cs-initial", e=>e.value)) === "450");
  check("sticker shows 99 in the card", (await page.$eval("#cs-monthly", e=>e.value)) === "99");
  check("no 'floors'/'min' text visible", !(await page.$eval("#ce-service", e=>/floor|min\b|minimum/i.test(e.textContent))), "");
  check("initial appointment block gone", !(await page.$("#cs-appt")));
  // plan dropdown opens on tap
  await page.click("#cs-plan-cur"); await page.waitForTimeout(200);
  check("plan dropdown opens", !(await page.$eval("#cs-plans", e=>e.hidden)));
  await page.click("#cs-plan-cur"); await page.waitForTimeout(150);
  // the big number IS the input — type straight into it
  await page.fill("#cs-initial","99"); await page.waitForTimeout(150);
  check("prices render green", (await page.$eval("#cs-initial", e=>getComputedStyle(e).color)) === "rgb(21, 128, 61)" &&
        (await page.$eval("#cs-monthly", e=>getComputedStyle(e).color)) === "rgb(21, 128, 61)");
  check("tap clears the field for typing", await page.evaluate(()=>{
    const el = document.querySelector("#cs-monthly");
    el.focus();
    const cleared = el.value === "";
    el.blur();
    return cleared && el.value === "99"; // blank blur restores the old number
  }));
  const disc = await t(page,"#cs-discount");
  check("discount line is just the number", disc === "Discount given: $351", disc);
  // below floor → inline UNPROFITABLE while typing, popup box on blur
  await page.fill("#cs-monthly","49"); await page.waitForTimeout(150);
  check("below-floor shows UNPROFITABLE", !(await page.$eval("#cs-unprofitable", e=>e.hidden)));
  await page.evaluate(()=>document.querySelector("#cs-monthly").blur());
  await page.waitForTimeout(250);
  check("blur pops the UNPROFITABLE box", !(await page.$eval("#unprof-veil", e=>e.hidden)));
  await page.screenshot({path:SHOTS+"/f2-unprof.png"});
  await page.click("#unprof-clear"); await page.waitForTimeout(200);
  check("Clear snaps back to sticker", (await page.$eval("#cs-monthly", e=>e.value)) === "99",
        await page.$eval("#cs-monthly", e=>e.value));
  check("box dismissed", await page.$eval("#unprof-veil", e=>e.hidden));
  check("UNPROFITABLE inline clears too", await page.$eval("#cs-unprofitable", e=>e.hidden));
  check("full sticker shows no green line", (await t(page,"#cs-discount")) === "" ||
        (await t(page,"#cs-discount")).startsWith("Discount given"), await t(page,"#cs-discount"));
  check("price card says RECURRING", (await page.$eval("#cs-monthly", e=>e.closest(".price-big").querySelector(".pb-label").textContent.trim().toLowerCase())) === "recurring");
  // set the discounted initial back the way this test had it
  await page.fill("#cs-initial","99"); await page.waitForTimeout(150);
  // additional services chips
  await page.click('#cs-addsvc .pchip[data-p="Garage"]');
  await page.click('#cs-addsvc .pchip[data-p="Back Fence"]');
  // specialty: expand the band, select Interior Rodents, adjust price in sheet
  await page.click("#cs-spec-toggle"); await page.waitForTimeout(250);
  check("specialty band drops open", !(await page.$eval("#cs-spec-body", e=>e.hidden)));
  await page.click('#cs-specialty .spec-main[data-s="rodent"]'); await page.waitForTimeout(200);
  check("rodent card selected", await page.$eval('#cs-specialty .spec-card.sel', e=>e.textContent.includes("Interior Rodents")));
  await page.click('#cs-specialty .sp-price[data-s="rodent"]'); await page.waitForTimeout(350);
  await page.fill("#sp-initial","29"); await page.fill("#sp-monthly","35"); await page.waitForTimeout(120);
  check("spec price within floor OK", await page.$eval("#sp-unprofitable", e=>e.hidden));
  await page.fill("#sp-monthly","10"); await page.waitForTimeout(120);
  check("spec below floor → UNPROFITABLE + save blocked",
    !(await page.$eval("#sp-unprofitable", e=>e.hidden)) && await page.$eval("#sp-save", e=>e.disabled));
  await page.fill("#sp-monthly","35"); await page.waitForTimeout(120);
  await page.click("#sp-save"); await page.waitForTimeout(250);
  check("spec card shows adjusted price", (await t(page,'#cs-specialty .sp-price[data-s="rodent"]')).includes("$29"), await t(page,'#cs-specialty .sp-price[data-s="rodent"]'));
  check("band summary shows the pick", (await t(page,"#cs-spec-meta")).includes("1 added"), await t(page,"#cs-spec-meta"));
  // follow-ups: a dropdown band too — expand it first
  await page.click("#cs-fup-toggle"); await page.waitForTimeout(250);
  check("follow-ups band drops open", !(await page.$eval("#cs-fup-body", e=>e.hidden)));
  check("follow-ups band has no summary text", (await t(page,"#cs-fup-meta")) === "", await t(page,"#cs-fup-meta"));
  const selTerm = await page.$eval("#cs-term .seg-opt.sel", e=>e.dataset.m);
  check("contract defaults to 24 months", selTerm === "24", selTerm);
  await page.click('#cs-billing .seg-opt[data-b="quarterly"]'); await page.waitForTimeout(150);
  check("billing math box is gone", !(await page.$("#cs-billing-math")));
  await page.screenshot({path:SHOTS+"/f2-04-service.png"});

  // ---- PAYMENT ----
  await page.click('.ce-tab[data-t="payment"]'); await page.waitForTimeout(300);
  check("CC and ACH bubbles, no collect", (await page.$$(".pay-m")).length === 2 && !(await page.$('[data-m="collect"]')));
  await page.click('.pay-m[data-m="card"]'); await page.waitForTimeout(150);
  await page.fill("#cp-cc-name","Dana Whitfield");
  await page.fill("#cp-cc-num","4242424242424242");
  check("card number formats in groups", (await page.$eval("#cp-cc-num", e=>e.value)) === "4242 4242 4242 4242");
  check("luhn check passes", (await t(page,"#cp-cc-check")).includes("checks out"));
  await page.fill("#cp-cc-exp","1227");
  check("expiry formats MM/YY", (await page.$eval("#cp-cc-exp", e=>e.value)) === "12/27");
  await page.click("#cp-copy-addr"); await page.waitForTimeout(150);
  check("billing address copies service address", (await page.$eval("#cp-b-street", e=>e.value)) === "4207 Cypress Bend Ave");
  const due = await t(page,"#cp-due");
  check("initial due = plan + specialty ($128)", due === "$128", due);
  await page.screenshot({path:SHOTS+"/f2-05-payment.png"});

  // ---- AGREE ----
  await page.click('.ce-tab[data-t="agree"]'); await page.waitForTimeout(500);
  const sum = await t(page,"#ca-summary");
  check("summary keeps agreement summary", sum.includes("Dana"));
  check("no First-year value", !sum.includes("First-year value"));
  check("spray frequency shown", sum.toLowerCase().includes("visits"));
  check("24-month term in summary", sum.includes("24 months"), "");
  check("scroll-through sentence deleted", !(await page.$eval("#ce-agree", e=>e.textContent.includes("scroll it with the customer"))));
  check("consent says 24-month", (await t(page,"#ca-consent1-label")).includes("24-month"));
  check("billed quarterly noted", sum.includes("every quarter"), sum.slice(-140));
  // sign
  const doc = page.locator("#ca-doc");
  await page.evaluate(()=>{const d=document.querySelector("#ca-doc"); d.scrollTop=d.scrollHeight;});
  await page.waitForTimeout(400);
  await page.check("#ca-consent1"); await page.check("#ca-consent2");
  const bb = await page.locator("#ca-sig").boundingBox();
  await page.evaluate(()=>{document.querySelector(".ce-body").scrollTop=1e6;});
  await page.waitForTimeout(200);
  const b2 = await page.locator("#ca-sig").boundingBox();
  await page.mouse.move(b2.x+30,b2.y+60); await page.mouse.down();
  for(let i=0;i<10;i++) await page.mouse.move(b2.x+30+i*18,b2.y+60+Math.sin(i)*20,{steps:2});
  await page.mouse.up();
  await page.click("#ca-sign-save"); await page.waitForTimeout(1200);
  const celebrated = await page.$eval("#celebrate", e=>!e.hidden).catch(()=>false);
  if (celebrated) { await page.click("#celebrate"); await page.waitForTimeout(300); }
  check("agreement signed & saved", (await page.evaluate(()=>STORE.customers.length)) === 1);
  const rec = await page.evaluate(()=>{
    const c = STORE.customers[0];
    return { term: c.agreement.termMonths, billing: c.billing, spec: c.specialty, switch: c.switchOver,
      pests: c.pests, props: c.propNotes, notesF: c.notesForever.slice(0,20), notesI: c.notesInitial,
      card4: c.payment.last4, badd: c.payment.billingAddress.street, addSvc: c.addServices, status: c.status };
  });
  check("record: 24mo term", rec.term === 24, JSON.stringify(rec.term));
  check("record: quarterly billing", rec.billing === "quarterly");
  check("record: specialty saved at $29/$35", rec.spec.length===1 && rec.spec[0].initial===29 && rec.spec[0].monthly===35, JSON.stringify(rec.spec));
  check("record: switch-over flag", rec.switch === true);
  check("record: pests + property chips", rec.pests.includes("spiders") && rec.props.includes("Dog on Property"));
  check("record: two note fields", rec.notesF.length>0 && rec.notesI === "Gate code 4482");
  check("record: card last4 + billing addr", rec.card4 === "4242" && rec.badd === "4207 Cypress Bend Ave");
  check("record: additional services", rec.addSvc.includes("Garage") && rec.addSvc.includes("Back Fence"));

  // ---- agreement doc says 24 months and quarterly ----
  const docTxt = await page.evaluate(()=>MCONTRACT.bodyHTML(STORE.customers[0], null));
  check("contract says 24 months", docTxt.includes("24 months"));
  check("contract shows quarterly charge", docTxt.includes("every quarter"), "");

  // ---- customers list: filter pill + long-press delete ----
  await page.waitForTimeout(400);
  check("row appears in list", (await t(page,"#cust-list")).includes("Dana"));
  await page.click("#cf-filter"); await page.waitForTimeout(200);
  const menu = await page.$$eval(".pop-menu button", els=>els.map(e=>e.textContent.trim()));
  check("filter menu options", menu.some(m=>m.startsWith("Sold")) && menu.some(m=>m.startsWith("Canceled")) && !menu.some(m=>/lead/i.test(m)), menu.join(","));
  await page.click('.pop-menu button[data-v="all"]'); await page.waitForTimeout(150);

  // long-press delete with double confirm
  let confirms = 0;
  await page.evaluate(()=>{ window.confirm = (m)=>{ window.__c=(window.__c||0)+1; return true; }; });
  const row = await page.$("#cust-list .cust-row");
  const rb = await row.boundingBox();
  await page.mouse.move(rb.x+rb.width/2, rb.y+20);
  await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up();
  await page.waitForTimeout(400);
  confirms = await page.evaluate(()=>window.__c||0);
  check("long-press asks twice", confirms === 2, "confirms="+confirms);
  check("customer deleted", (await page.evaluate(()=>STORE.customers.length)) === 0);
  check("back to plain empty state", (await t(page,"#cust-list")) === "No customers yet.");

  // ---- Route tab renders ----
  await page.click("#tab-schedule"); await page.waitForTimeout(300);
  check("Route tab shows", await page.$eval("#screen-schedule", e=>e.classList.contains("active")));
  check("Route empty state", (await t(page,"#sched-list")).includes("Nothing on the route yet"));
  // ---- Leaderboard tab direct ----
  await page.click("#tab-rank"); await page.waitForTimeout(300);
  check("Leaderboard is a tab now", await page.$eval("#screen-rank", e=>e.classList.contains("active")));

  check("no page errors", errors.length===0, errors.slice(0,4).join(" | "));
  console.log("\n=== PASS ("+ok.length+") ==="); ok.forEach(x=>console.log("  ✓ "+x));
  if(bad.length){ console.log("\n=== FAIL ("+bad.length+") ==="); bad.forEach(x=>console.log("  ✗ "+x)); }
  console.log(bad.length?"FAILED":"ALL GREEN");
  await b.close(); server.close(); process.exit(bad.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
