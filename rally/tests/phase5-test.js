/* RALLY — PHASE 5 (while Apple MapKit membership activates).

   Everything the owner asked to see proven WITHOUT an Apple token, run
   against the real app on a device with NO team server (RALLY_CLOUD is
   emptied before any script loads). What each section is:

     A  the Customers screen at 100 / 1,000 / 10,000 customers, the four
        operational statuses and nothing else, every filter
     B  the Create Customer screen — five tabs, and a PAYMENT tab with no
        raw-credential field (the raw-credential invariant, CLAUDE.md §5)
     C  the manager draw: tap corners, undo, redo, Done → the property
        review before anything is saved
     D  Save → the import caller. On this device the gate answers "solo"
        and the doors are pinned here; the SERVER path of the same caller
        (STORE.importDoorsServer → import_territory_doors, idempotent,
        refuses a rep, refuses demo/non-residential doors) is proven in
        tests/import-caller-test.js against the 0018 LOCAL REPLICA ONLY
     E  a rescan matches every door already in RALLY and imports none
     F  a hood saved to two reps; one removed, the other kept, history kept
     G  the territory NUMBER on every screen that names a hood
     H  the reset / re-knock preview: counts before confirmation, Go Back
        parked, Sold and Do Not Knock protected, history untouched
     I  a knock made offline survives a reload
     J  switching map engines keeps the selected door, the callback, the
        note, the turf and the camera; MapKit → MapLibre falls back loudly
     K  a rep: no manager tools, no token field, other turf faded, labels off
     L  the top card is Doors / DMs / Sold and nothing else; the three map
        buttons do not overlap; the service worker precache carries every
        new module and never Apple's CDN; the black pin is named honestly

   WHAT IS SYNTHETIC, said plainly:
     - every customer, rep, knock and territory here is generated
     - the houses come from the DEMO property provider (a deterministic
       grid, placement "synthetic_grid", source "demo") because no real
       provider key reaches this container; the review sheet says so on
       its own "Demo grid — not real houses" line, and this suite asserts
       that line is there. A team server refuses these doors; a solo
       device previews with them, which is what is exercised here.
     - the territory number is stamped by the test (seq is server-assigned
       by 0018 §H and this device has no server)
     - Apple's CDN is unreachable from this browser, so the MapKit →
       MapLibre fallback in J is the "library could not load" reason; the
       401 "no token" reason is proven against Apple's real library in
       tests/mapkit-test.js

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/phase5-test.js */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8897);

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail !== undefined ? " — " + detail : "")); }
};
const section = (t) => console.log("\n== " + t);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
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

// a real subdivision's coordinates, used only as a place to put the grid
const CENTRE = { lat: 38.8620, lng: -94.7700 };

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // nothing leaves this container: no fonts, no Google, no Apple, no Supabase
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" };
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/net::ERR|Failed to load resource|401|fetch/i.test(m.text())) errors.push("console: " + m.text()); });

  const bootApp = async () => {
    await page.waitForFunction(() => document.querySelector("#gate") && document.querySelector("#gate").hidden, null, { timeout: 30000 });
    await page.waitForFunction(() => window.STORE && window.MMAP && window.MHOODS && window.MRESET && window.MCUST, null, { timeout: 30000 });
    await page.waitForFunction(() => MMAP.isReady(), null, { timeout: 30000 });
    await sleep(500);
  };
  const beRole = async (role) => {
    await page.evaluate(async (r) => {
      await STORE.applyServerRole(r, Date.now());
      if (window.MAPP && MAPP.roleChanged) MAPP.roleChanged();
      MMAP.refreshHoods(); MMAP.refreshPins(); MMAP.updateBrandToday();
    }, role);
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
    o._warn = Array.from(document.querySelectorAll("#hd-review .hr-warn")).map((w) => w.textContent.trim());
    o._hidden = document.querySelector("#hd-review").hidden;
    return o;
  });

  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
  await page.click("#gate-swap-btn");
  await page.fill("#gate-name", "Phase Five");
  await page.fill("#gate-email", "phase5@example.com");
  await page.fill("#gate-pass", "knock1234");
  await page.click("#gate-submit");
  await bootApp();

  try {
    // ------------------------------------------------------------ seed
    const seed = await page.evaluate(async ({ CENTRE }) => {
      const me = STORE.currentUser();
      me.name = "Phase Five"; me.role = "owner"; await STORE.updateUser(me);
      STORE.settings.propertySource = "demo";   // SYNTHETIC houses, labelled by the sheet
      await STORE.saveSettings();
      const jake = await STORE.addUser({ name: "Jake Rowe", role: "rep" });
      const mia = await STORE.addUser({ name: "Mia Cole", role: "rep" });
      window.__crew = { me: me.id, jake: jake.id, mia: mia.id };
      MMAP.jumpTo(CENTRE.lng, CENTRE.lat, 16.4);
      return { me: me.id, jake: jake.id, mia: mia.id, solo: STORE.turfGate({ needsServer: true }) };
    }, { CENTRE });
    check("seed: this device has no team server — turfGate answers solo", seed.solo.ok && seed.solo.code === "solo", JSON.stringify(seed.solo));
    await sleep(1200);

    // ========================================================== A. CUSTOMERS
    section("A. Customers screen at 100 / 1,000 / 10,000 (SYNTHETIC customers)");
    const seedCustomers = (n) => page.evaluate(async (n) => {
      const FIRST = ["Marcus","Elena","Priya","Tom","Grace","Andre","Nina","Caleb","Rosa","Dmitri","Hannah","Owen"];
      const LAST = ["Alvarez","Whitfield","Nakamura","Okonkwo","Petrov","Lindqvist","Moreau","Castillo"];
      const STREETS = ["Brougham Dr","W 119th St","Falcon Ridge Rd","Meadow Lark Ln","Quail Creek Dr"];
      const reps = [window.__crew.me, window.__crew.jake, window.__crew.mia];
      const now = Date.now(), HOUR = 3600e3, DAY = 24 * HOUR;
      const have = STORE.customers.length;
      const batch = [];
      for (let i = have; i < n; i++) {
        const soldAt = now - (i * 3) * HOUR;
        const c = {
          id: MDB.uid(), createdAt: soldAt, status: "queued",
          first: FIRST[i % FIRST.length], last: LAST[(i * 7) % LAST.length],
          phones: [{ label: "mobile", value: "913-555-" + String(1000 + (i % 9000)).slice(-4) }],
          appointments: [],
          address: { street: (1100 + i * 4) + " " + STREETS[i % STREETS.length], city: "Olathe", state: "KS", zip: "66062" },
          soldAt, soldByUserId: reps[i % reps.length],
          agreement: { signedAt: soldAt, plan: "Quarterly Pest" },
        };
        const bucket = i % 10;
        if (bucket === 0) c.acct = "canceled";
        else if (bucket <= 4) c.appointments = [{ id: MDB.uid(), ts: soldAt + 3 * DAY, status: "done", doneAt: soldAt + 3 * DAY, userId: reps[(i + 1) % 3] }];
        else if (bucket <= 7) c.appointments = [{ id: MDB.uid(), ts: now + (bucket - 4) * DAY + 5 * HOUR, status: "scheduled", userId: reps[(i + 2) % 3] }];
        batch.push(c);
      }
      // persisted through the same store the app reads at boot, in one transaction
      await MDB.bulkPut("customers", batch);
      batch.forEach((c) => STORE.customers.push(c));
      return STORE.customers.length;
    }, n);
    const renderTimed = () => page.evaluate(() => {
      MAPP.show("customers");
      const t0 = performance.now();
      MCUST.setFilter("all");
      MCUST.renderList();
      const ms = performance.now() - t0;
      const rows = document.querySelectorAll("#cust-list .cust-row");
      const more = document.querySelector("#cust-list .cust-more");
      return { ms: Math.round(ms), rows: rows.length, more: more ? more.textContent.trim() : "", moreHidden: more ? more.hidden : null,
        count: document.querySelector("#cust-count") ? document.querySelector("#cust-count").textContent.trim() : "" };
    });

    const timings = {};
    for (const n of [100, 1000, 10000]) {
      const total = await seedCustomers(n);
      const r = await renderTimed();
      timings[n] = r.ms;
      check(`${n.toLocaleString()} customers: the list paints in ${r.ms} ms (limit ${n === 10000 ? 2500 : 800})`, total === n && r.ms < (n === 10000 ? 2500 : 800), JSON.stringify(r));
      check(`${n.toLocaleString()} customers: first page is 60 rows and the rest arrive as you scroll`,
        r.rows === 60 && !r.moreHidden && r.more === (n - 60).toLocaleString() + " more", JSON.stringify(r));
    }
    console.log("    render times (ms): " + JSON.stringify(timings));
    /* Three UNSIGNED drafts (no agreement — the records Home counts as
       leads) and one legacy-shaped record with no address object, added on
       top of the book: their rows must read NOT SCHEDULED / "Added", never
       a LEAD word. */
    await page.evaluate(async () => {
      const now = Date.now(), HOUR = 3600e3, extra = [];
      for (let k = 0; k < 3; k++) extra.push({ id: MDB.uid(), createdAt: now - k * HOUR, status: "queued",
        first: "Draft", last: "Unsigned" + k, phones: [], appointments: [], address: { street: (900 + k) + " Draft Ln", city: "Olathe", state: "KS", zip: "66062" },
        soldAt: now - k * HOUR, soldByUserId: window.__crew.me, agreement: null });
      extra.push({ id: MDB.uid(), createdAt: now - 50 * HOUR, status: "queued", first: "Legacy", last: "Record", phones: [], appointments: [], soldAt: now - 50 * HOUR });
      await MDB.bulkPut("customers", extra); extra.forEach((c) => STORE.customers.push(c)); MCUST.renderList();
    });

    const rowShape = await page.evaluate(() => {
      // a SIGNED customer's row (the drafts added above sort to the top)
      const el = Array.from(document.querySelectorAll("#cust-list .cust-row")).find((r) => !/Draft Unsigned|Legacy Record/.test(r.querySelector(".cr-name").textContent));
      const c = STORE.customers.find((x) => x.id === el.dataset.cid);
      const meta = el.querySelector(".cr-meta").textContent;
      return {
        name: el.querySelector(".cr-name").textContent.trim(), expectName: STORE.custName(c),
        addr: el.querySelector(".cr-addr").textContent.trim(), expectAddr: STORE.custAddress(c),
        meta, rep: STORE.custSoldByLabel(c),
        badge: el.querySelector(".opst").textContent.trim(), badgeCls: el.querySelector(".opst").className,
        status: STORE.custOpStatus(c),
      };
    });
    check("a row shows the name", rowShape.name === rowShape.expectName, JSON.stringify(rowShape));
    check("a row shows the full address (street, city, state, zip)", rowShape.addr === rowShape.expectAddr && /Brougham Dr/.test(rowShape.addr) && /Olathe/.test(rowShape.addr) && /KS/.test(rowShape.addr) && /66062/.test(rowShape.addr), rowShape.addr);
    check("a row shows the sold date and the rep who sold it", /^Sold /.test(rowShape.meta) && rowShape.meta.includes(rowShape.rep), rowShape.meta);
    check("a row carries the operational status badge", rowShape.badge.startsWith(rowShape.status.label) && rowShape.badgeCls.includes(rowShape.status.cls), rowShape.badge);

    const statuses = await page.evaluate(() => {
      const seen = {};
      STORE.customers.forEach((c) => { const s = STORE.custOpStatus(c); seen[s.id] = s.label; });
      const ids = Object.keys(STORE.OP_STATUSES).sort();
      const labelsInMenu = (() => { document.querySelector("#cf-filter").click(); const m = document.querySelector(".pop-menu"); const t = m ? m.textContent : ""; if (m) m.remove(); return t; })();
      return { seen, ids, labelsInMenu, anyLead: JSON.stringify(seen).toUpperCase().includes("LEAD") };
    });
    check("exactly four operational statuses exist: NOT SCHEDULED, PENDING, CANCELED, SERVICED",
      statuses.ids.join() === "canceled,notsched,pending,serviced" &&
      statuses.seen.notsched === "NOT SCHEDULED" && statuses.seen.pending === "PENDING" &&
      statuses.seen.canceled === "CANCELED" && statuses.seen.serviced === "SERVICED", JSON.stringify(statuses.seen));
    check("no LEAD status anywhere in the book or the filter menu", !statuses.anyLead && !/LEAD/i.test(statuses.labelsInMenu), statuses.labelsInMenu);
    const drafts = await page.evaluate(() => {
      MCUST.setFilter("all");
      const rows = Array.from(document.querySelectorAll("#cust-list .cust-row"));
      const want = rows.filter((el) => /Draft Unsigned|Legacy Record/.test(el.querySelector(".cr-name").textContent));
      return { n: want.length, rows: want.map((el) => ({ meta: el.querySelector(".cr-meta").textContent.trim(), badge: el.querySelector(".opst").textContent.trim(), addr: el.querySelector(".cr-addr").textContent.trim() })),
        leadWord: rows.some((el) => /\bLead\b/i.test(el.textContent)) };
    });
    check("unsigned drafts and a legacy record render as NOT SCHEDULED with an 'Added' date — no row anywhere says Lead",
      drafts.n === 4 && drafts.rows.every((r) => /^Added /.test(r.meta) && /^NOT SCHEDULED/.test(r.badge)) && drafts.rows.some((r) => r.addr === "No address") && !drafts.leadWord, JSON.stringify(drafts));
    const unsigned = await page.evaluate(() => { MCUST.showUnsigned(); const rows = document.querySelectorAll("#cust-list .cust-row"); const out = { n: rows.length, names: Array.from(rows).map((r) => r.querySelector(".cr-name").textContent) }; MCUST.clearFilters(); return out; });
    check("Home's 'leads to work' lands on exactly the unsigned customers (Agreement needed), with no LEAD status", unsigned.n === 4 && unsigned.names.every((n) => /Draft Unsigned|Legacy Record/.test(n)), JSON.stringify(unsigned));
    check("the filter menu offers All + the four statuses and nothing else",
      /All statuses/.test(statuses.labelsInMenu) && /Not scheduled/.test(statuses.labelsInMenu) && /Pending/.test(statuses.labelsInMenu) &&
      /Serviced/.test(statuses.labelsInMenu) && /Canceled/.test(statuses.labelsInMenu) && !/Sold|Active/.test(statuses.labelsInMenu), statuses.labelsInMenu);

    const colours = await page.evaluate(() => {
      const probe = (cls) => { const s = document.createElement("span"); s.className = "opst " + cls; document.body.appendChild(s); const c = getComputedStyle(s); const out = { bg: c.backgroundColor, fg: c.color }; s.remove(); return out; };
      return { notsched: probe("notsched"), pending: probe("pending"), canceled: probe("canceled"), serviced: probe("serviced") };
    });
    const distinct = new Set(Object.values(colours).map((c) => c.bg + "/" + c.fg)).size;
    check("the four badges paint four distinct colours (charcoal / blue / red / green)", distinct === 4, JSON.stringify(colours));

    for (const id of ["notsched", "pending", "serviced", "canceled"]) {
      const r = await page.evaluate(async (id) => {
        MCUST.setFilter(id);
        await new Promise((r) => setTimeout(r, 50));
        const rows = Array.from(document.querySelectorAll("#cust-list .cust-row"));
        const want = STORE.customers.filter((c) => STORE.custOpStatus(c).id === id).length;
        const bad = rows.filter((el) => !el.querySelector(".opst").classList.contains(id)).length;
        const more = document.querySelector("#cust-list .cust-more");
        const shown = rows.length + (more && !more.hidden ? Number(more.textContent.replace(/[^\d]/g, "")) : 0);
        return { want, bad, shown };
      }, id);
      check(`filter "${id}" at 10,000: every visible row wears it and the total equals the book's count (${r.want})`, r.bad === 0 && r.shown === r.want && r.want > 0, JSON.stringify(r));
    }
    const svc = await page.evaluate(() => {
      // reach the Service lever the way the More → Customers panel does, then read what is listed
      MCUST.openAdvanced();
      const pick = (id) => { const pill = document.querySelector('#cust-panel .fp[data-f="service"]'); if (!pill) return false; pill.click(); const b = document.querySelector(`.pop-menu button[data-v="${id}"]`); if (b) b.click(); else { const m = document.querySelector(".pop-menu"); if (m) m.remove(); } return !!b; };
      const out = {};
      for (const id of ["needed", "pending", "serviced"]) {
        if (!pick(id)) { out[id] = "no-control"; continue; }
        const rows = Array.from(document.querySelectorAll("#cust-list .cust-row"));
        out[id] = rows.filter((el) => /CANCELED/.test(el.querySelector(".opst").textContent)).length;
      }
      pick("all"); MCUST.clearFilters();
      return out;
    });
    check("the Service filters never list a CANCELED account under needed / pending / serviced", Object.values(svc).every((v) => v === 0 || v === "no-control") && Object.values(svc).some((v) => v === 0), JSON.stringify(svc));
    const sortChk = await page.evaluate(async () => {
      // a draft saved Monday and signed Friday must sort by the Friday it prints
      const c = STORE.customers.find((x) => x.last === "Unsigned0");
      c.soldAt = Date.now() - 400 * 3600e3; c.agreement = { signedAt: Date.now() + 1000, plan: "Q" }; await MDB.put("customers", c);
      MCUST.setFilter("all");
      const first = document.querySelector("#cust-list .cust-row");
      const out = { top: first.dataset.cid === c.id, meta: first.querySelector(".cr-meta").textContent.trim() };
      c.agreement = null; c.soldAt = Date.now(); await MDB.put("customers", c); MCUST.clearFilters();
      return out;
    });
    check("'Newest sold' sorts by the date the row prints (the agreement's), not the draft's creation", sortChk.top && /^Sold /.test(sortChk.meta), JSON.stringify(sortChk));
    await page.evaluate(() => MCUST.setFilter("all"));

    // ================================================== B. CREATE CUSTOMER
    section("B. Create Customer — five tabs, PAYMENT obeys the raw-credential invariant");
    await page.evaluate(() => document.querySelector("#cust-fab").click());
    await sleep(500);
    const editor = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(".ce-tab")).map((t) => t.textContent.trim());
      const shown = (() => { const el = document.querySelector(".ce-tabs"); return !!(el && el.offsetParent); })();
      document.querySelector('.ce-tab[data-t="payment"]').click();
      const pane = document.querySelector("#ce-payment");
      const inputs = Array.from(pane.querySelectorAll("input, textarea, select")).map((i) => ({
        id: i.id, name: i.name, type: i.type, ac: i.getAttribute("autocomplete") || "", ph: i.placeholder || "", im: i.inputMode || "" }));
      const suspicious = inputs.filter((i) => /card ?number|cc-num|cvv|cvc|csc|routing|account ?number|\bpan\b|acct-num|expir/i.test(
        [i.id, i.name, i.ac, i.ph].join(" ")));
      const text = pane.textContent;
      return { tabs, shown, inputs, suspicious, text: text.replace(/\s+/g, " ").slice(0, 400),
        honest: MCUST.honestPayment({ method: "card", autopayRequested: true,
          card: { name: "Pat Smith", number: "4111111111111111", cvv: "123", exp: "12/29" },
          ach: { name: "Pat Smith", routing: "021000021", account: "000123456789", type: "checking" } }) };
    });
    check("the editor opens full-screen with exactly INFO / SERVICE / PAYMENT / AGREE / FILES", editor.shown && editor.tabs.join("|") === "INFO|SERVICE|PAYMENT|AGREE|FILES", editor.tabs.join("|"));
    check("PAYMENT has NO field for a card number, CVV, expiry, routing number or account number", editor.suspicious.length === 0, JSON.stringify(editor.suspicious));
    check("PAYMENT fields are method, autopay, name on the account and billing address only",
      editor.inputs.every((i) => /^cp-(cc-name|ach-name|ach-type|autopay|b-street|b-city|b-state|b-zip|due|copy-addr)$/.test(i.id) || i.type === "radio" || i.type === "checkbox"), JSON.stringify(editor.inputs.map((i) => i.id)));
    const hp = JSON.stringify(editor.honest);
    check("the payment shape the editor can save carries no PAN, CVV, expiry, routing or account number even when handed them",
      !/4111|123|12\/29|021000021|000123456789|number|cvv|routing|account"/i.test(hp) && editor.honest.status !== "active", hp);
    check("payment status can only be not_configured or pending_setup from the client", /^(not_configured|pending_setup)$/.test(editor.honest.status), editor.honest.status);
    await page.evaluate(() => { document.querySelector("#ce-back").click(); });
    await sleep(300);

    // ================================================= C. MANAGER DRAW
    section("C. Manager draws: corners, undo, redo, Done → property review BEFORE saving");
    await page.evaluate(() => { MAPP.show("map"); });
    await sleep(500);
    await page.evaluate(() => { window.__draft = []; const real = MRENDER_GL.setDraft; MRENDER_GL.setDraft = function (d) { window.__draft = (d || []).slice(); return real.call(this, d); }; });
    await page.evaluate(() => document.querySelector("#fab-hoods").click());
    await sleep(400);
    const tools = await page.evaluate(() => ({
      open: !document.querySelector("#mtools").hidden,
      sub: document.querySelector("#mtools-sub").textContent,
      ids: ["mt-trace", "mt-corners", "mt-select", "mt-move", "mt-undo", "mt-redo", "mt-clear", "mt-lasso", "mt-heat", "mt-assign", "mt-hoods"].filter((id) => !document.querySelector("#" + id)),
      emoji: /[\u{1F300}-\u{1FAFF}]/u.test(document.querySelector("#mtools").textContent),
    }));
    check("the manager tools open: Trace, Tap corners, Select, Move, Undo, Redo, Clear, Lasso, Freshness, Manage reps, territories", tools.open && tools.ids.length === 0 && /Manager tools/.test(tools.sub), JSON.stringify(tools));
    check("the tools are typographic, not emoji-driven", !tools.emoji);
    await page.evaluate(() => document.querySelector("#mt-corners").click());
    await sleep(400);
    const taps = [[95, 300], [300, 285], [325, 515], [190, 610], [80, 520]];
    for (const [x, y] of taps) { await page.mouse.click(x, y); await sleep(200); }
    await sleep(300);
    const d5 = await page.evaluate(() => ({ n: window.__draft.length, undo: document.querySelector("#draw-undo").disabled, redo: document.querySelector("#draw-redo").disabled, done: document.querySelector("#draw-done").disabled, msg: document.querySelector("#draw-msg").textContent }));
    check("five taps → five corners on the draft ring; Undo enabled, Redo not, Done enabled", d5.n === 5 && !d5.undo && d5.redo && !d5.done, JSON.stringify(d5));
    await page.evaluate(() => document.querySelector("#draw-undo").click());
    await page.evaluate(() => document.querySelector("#draw-undo").click());
    const d3 = await page.evaluate(() => ({ n: window.__draft.length, redo: document.querySelector("#draw-redo").disabled }));
    check("Undo twice → three corners, Redo enabled", d3.n === 3 && !d3.redo, JSON.stringify(d3));
    await page.evaluate(() => document.querySelector("#draw-redo").click());
    const d4 = await page.evaluate(() => window.__draft.length);
    check("Redo → four corners", d4 === 4, d4);
    await page.mouse.click(60, 400); await sleep(200);
    const d5b = await page.evaluate(() => ({ n: window.__draft.length, redo: document.querySelector("#draw-redo").disabled }));
    check("a new corner after Undo ends the redo branch (five corners, Redo off)", d5b.n === 5 && d5b.redo, JSON.stringify(d5b));
    const noKnock = await page.evaluate(() => document.querySelector("#knock-sheet").classList.contains("open"));
    check("drawing taps never opened a knock sheet — the draw consumes the tap first", !noKnock);

    await page.evaluate(() => document.querySelector("#draw-done").click());
    await page.waitForFunction(() => { const r = document.querySelector("#hd-review"); return r && !r.hidden; }, null, { timeout: 30000 });
    await sleep(300);
    const rv = await reviewLines();
    const card = await page.evaluate(() => ({ hidden: document.querySelector("#polycard").hidden, houses: document.querySelector("#pc-houses").textContent.trim(), id: document.querySelector("#pc-id").textContent.trim(),
      btn: document.querySelector("#hd-import-btn").textContent.trim(), on: document.querySelector("#hd-import-btn").classList.contains("sel"),
      rowHidden: document.querySelector("#hd-import-row").hidden, status: document.querySelector("#hd-status").textContent.trim(),
      source: document.querySelector("#hood-source") ? document.querySelector("#hood-source").textContent.trim() : "" }));
    const KEYS = ["Source", "On the building outline", "Parcel-level (lot, not house)", "Uncertain coordinates", "Excluded (not residential)", "Already in RALLY (matched, not duplicated)", "Will be imported"];
    check("the review shows source, exact-building, parcel-level, uncertain, excluded, already-in-RALLY and will-be-imported", KEYS.every((k) => k in rv), Object.keys(rv).join(" | "));
    check("SYNTHETIC houses are named as such on the sheet: a 'Demo grid — not real houses' line, a demo Source, and the strip says 'not real houses'", "Demo grid — not real houses" in rv && /demo/i.test(String(rv.Source)) && /demo grid .* not real houses/i.test(card.source), JSON.stringify({ rv, src: card.source }));
    check("'Will be imported' is the count that will actually become doors, and none are already in RALLY", rv["Will be imported"] > 0 && rv["Already in RALLY (matched, not duplicated)"] === 0, JSON.stringify(rv));
    const willImport = rv["Will be imported"];
    check("the import toggle is ON by default when creating and says how many", card.on && !card.rowHidden && new RegExp("Import " + willImport + " doors when I save").test(card.btn), JSON.stringify(card));
    check("the polygon card shows the scan's house count and says the number is not issued yet", !card.hidden && Number(card.houses) === rv["Will be imported"] + rv["Already in RALLY (matched, not duplicated)"] && /not saved|new polygon|—/i.test(card.id), JSON.stringify(card));

    // ============================================ F(part 1). MULTI-REP CHOICE
    section("F1. Choosing two reps from the assign panel hands the set back to the sheet (writes nothing)");
    const terrBefore = await page.evaluate(() => STORE.territories.length);
    await page.evaluate(() => document.querySelector("#hood-assign-open").click());
    await sleep(400);
    for (const who of ["Jake Rowe", "Mia Cole"]) {
      await page.evaluate((nm) => { const row = Array.from(document.querySelectorAll("#assign-list .arep")).find((r) => r.textContent.includes(nm)); if (row) row.click(); }, who);
      await sleep(200);
    }
    const sub = await page.evaluate(() => document.querySelector("#assign-sub").textContent.trim());
    check("the panel names the draft honestly (no number yet)", /New polygon — not saved yet/.test(sub), sub);
    await page.evaluate(() => document.querySelector("#assign-save").click());
    await sleep(400);
    const chips = await page.evaluate(() => ({ sel: Array.from(document.querySelectorAll("#hood-reps .rep-chip.sel")).map((c) => c.textContent.trim()), terr: STORE.territories.length, note: document.querySelector("#hood-reps-note").textContent }));
    check("two reps are ticked on the sheet and NO territory was written by the panel", chips.sel.join("|") === "Jake Rowe|Mia Cole" && chips.terr === terrBefore, JSON.stringify(chips));
    check("the sheet says the hood will appear in both reps' lists", /2 reps/.test(chips.note), chips.note);

    // ==================================================== D. SAVE → IMPORT
    section("D. Save → the import caller (solo device: pinned here; server path proven on the 0018 replica)");
    const pinsBefore = await page.evaluate(() => STORE.pins.length);
    await page.evaluate(() => { window.__toasts = []; const t = document.querySelector("#toast"); if (t) new MutationObserver(() => { if (t.textContent.trim()) window.__toasts.push(t.textContent.trim()); }).observe(t, { childList: true, characterData: true, subtree: true }); });
    await page.evaluate(() => document.querySelector("#hood-save").click());
    // the save's deterministic end: the sheet closes only after the import loop has finished
    await page.waitForFunction(() => !document.querySelector("#hood-sheet").classList.contains("open") && window.__toasts.some((t) => /doors pinned/.test(t)), null, { timeout: 60000 });
    await sleep(200);
    const saved = await page.evaluate(({ willImport, pinsBefore }) => {
      const t = STORE.territories[STORE.territories.length - 1];
      const mine = STORE.pins.filter((p) => p.territoryId === t.id);
      const inside = mine.filter((p) => STORE.inHood(t, p.lng, p.lat)).length;
      const ids = new Set(mine.map((p) => (p.prop || {}).externalId));
      return { added: STORE.pins.length - pinsBefore, willImport, mine: mine.length, inside, uniqueExt: ids.size,
        allUnworked: mine.every((p) => p.disposition === "unworked" && (p.history || []).length === 0),
        synthetic: mine.every((p) => p.prop && p.prop.source === "demo"),
        reps: STORE.currentAssignees(t).slice().sort(), jake: window.__crew.jake, mia: window.__crew.mia,
        sheet: document.querySelector("#hood-sheet").classList.contains("open"), card: document.querySelector("#polycard").hidden,
        toasts: window.__toasts, id: t.id, name: t.name };
    }, { willImport, pinsBefore });
    const T1 = saved.id;
    await page.evaluate((id) => { window.__t1 = id; }, T1);
    check(`Save pinned exactly the number the review promised (${willImport}) — no more, no fewer`, saved.added === willImport && saved.mine === willImport, JSON.stringify({ added: saved.added, mine: saved.mine, willImport }));
    check("every imported door is inside the outline, unworked, with no history, and carries a unique provider id", saved.inside === saved.mine && saved.allUnworked && saved.uniqueExt === saved.mine, JSON.stringify(saved));
    check("SYNTHETIC: the doors are demo-provider doors (source 'demo') — a team server would refuse them", saved.synthetic);
    check("the hood went to BOTH reps in the same save", saved.reps.join() === [saved.jake, saved.mia].sort().join(), JSON.stringify(saved.reps));
    check("the sheet and the polygon card close after the save", !saved.sheet && saved.card);
    check("the toast names the pinned count and both reps", saved.toasts.some((t) => new RegExp(willImport + " doors pinned").test(t) && /Jake Rowe and Mia Cole/.test(t)), JSON.stringify(saved.toasts));
    check("no nickname was minted for the blank name field", saved.name === "", JSON.stringify(saved.name));

    // ===================================================== E. DUPLICATES
    section("E. Rescan the saved hood: every door matches, none are imported twice");
    await page.evaluate((id) => MHOODS.openExisting(id), saved.id);
    await sleep(400);
    const stale = await page.evaluate(() => { const src = document.querySelector("#hood-source"); return { review: document.querySelector("#hd-review").hidden, reviewText: document.querySelector("#hd-review").textContent.trim(), srcHidden: src.hidden, src: src.textContent.trim() }; });
    // on a solo device the strip may say the counts are this device's — that is current, not stale
    check("opening the saved hood shows NO review from the earlier draft scan (nothing stale until this hood is scanned)",
      stale.review && stale.reviewText === "" && (stale.srcHidden || (/Counted on this device/.test(stale.src) && !/eligible|demo/i.test(stale.src))), JSON.stringify(stale));
    await page.evaluate(() => document.querySelector("#hd-scan").click());
    await page.waitForFunction(() => { const r = document.querySelector("#hd-review"); return r && !r.hidden && /Already in RALLY/.test(r.textContent); }, null, { timeout: 30000 });
    await sleep(300);
    const rv2 = await reviewLines();
    const imp2 = await page.evaluate(() => ({ rowHidden: document.querySelector("#hd-import-row").hidden, pins: STORE.pins.length }));
    check(`the rescan reports every house as already in RALLY (${rv2["Already in RALLY (matched, not duplicated)"]}) and 0 to import`,
      rv2["Already in RALLY (matched, not duplicated)"] === willImport && rv2["Will be imported"] === 0, JSON.stringify(rv2));
    check("with nothing new the import button is not offered at all", imp2.rowHidden);
    const idx = await page.evaluate((id) => {
      const idx = STORE.buildDoorIndex();
      const p = STORE.pins.find((x) => x.territoryId === id);
      const byExt = idx.match({ lat: p.lat + 0.01, lng: p.lng + 0.01, externalId: p.prop.externalId, address: "" });
      const byCoord = idx.match({ lat: p.lat + 0.00003, lng: p.lng + 0.00003, externalId: "other-id", address: "" });
      const byAddr = idx.match({ lat: p.lat + 0.01, lng: p.lng, externalId: "", address: p.address, city: (p.geo || {}).city, state: (p.geo || {}).state, zip: (p.geo || {}).zip });
      const far = idx.match({ lat: p.lat + 0.02, lng: p.lng + 0.02, externalId: "nope", address: "9999 Nowhere Rd" });
      return { byExt: !!byExt, byCoord: !!byCoord, byAddr: !!byAddr, far: !!far };
    }, saved.id);
    check("the door index matches by provider id, by address, and by coordinates within ~15 m — and not a house 2 km away", idx.byExt && idx.byCoord && idx.byAddr && !idx.far, JSON.stringify(idx));
    await page.evaluate(async () => { await STORE.importDoors(STORE.pins.filter((p) => p.territoryId === window.__t1).map((p) => Object.assign({}, p.prop, { lat: p.lat, lng: p.lng, address: p.address })), { territoryId: window.__t1 }); });
    const dupPins = await page.evaluate(() => STORE.pins.length);
    check("re-importing the same properties through the store adds nothing", dupPins === imp2.pins, dupPins);
    await page.evaluate(() => MUI.closeSheet());
    await sleep(200);

    // ============================= D2. THE CALLER'S VERDICT BRANCHES (mocked server)
    section("D2. The import caller's four server verdicts, driven through the real button (server mocked at STORE)");
    const verdicts = await page.evaluate(async (id) => {
      const realGate = STORE.turfGate, realSrv = STORE.importDoorsServer, realDev = STORE.importDoors;
      STORE.turfGate = () => ({ ok: true, code: "authoritative" });   // pretend: a team device, online, capability latched
      const out = {};
      const scanAgain = async () => {
        MHOODS.openExisting(id);
        // a rescan of a hood that already holds its doors matches everything, so hand it fresh ones
        await new Promise((r) => setTimeout(r, 200));
        document.querySelector("#hd-scan").click();
        await new Promise((r) => setTimeout(r, 900));
      };
      const fakeFresh = () => { /* the scan matched everything; give runImport something to send by shifting the hood */ };
      const run = async (label, srv) => {
        STORE.importDoorsServer = srv;
        // make the scan see "fresh" doors: temporarily hide this hood's pins from the door index
        const mine = STORE.pins.filter((p) => p.territoryId === id); const rest = STORE.pins.filter((p) => p.territoryId !== id);
        STORE.pins = rest;
        await scanAgain();
        // the hood's own doors stay hidden until the import has answered, so a device-side import has something to pin
        const pinsBefore = STORE.pins.length; window.__toasts = [];
        const btn = document.querySelector("#hd-import-btn");
        btn.click();
        await new Promise((r) => setTimeout(r, 900));
        out[label] = { status: document.querySelector("#hd-status").textContent.trim().slice(0, 200), rowHidden: document.querySelector("#hd-import-row").hidden,
          btnEnabled: !btn.disabled, scanEnabled: !document.querySelector("#hd-scan").disabled, pinsAdded: STORE.pins.length - pinsBefore, toast: (window.__toasts.slice(-1)[0] || "").slice(0, 200) };
        STORE.pins = STORE.pins.concat(mine);
        MUI.closeSheet();
        // any device-imported doors are cleaned up so the next case starts equal
        for (const p of STORE.pins.filter((p) => p.territoryId === id && !mine.includes(p))) { await MDB.del("pins", p.id); }
        STORE.pins = STORE.pins.filter((p) => p.territoryId !== id || mine.includes(p));
      };
      await run("net", async () => { const e = new Error("Can't reach RALLY cloud"); e.cloud = "net"; e.partial = { added: 400, matched: 0, outside: 0, ineligible: 0, unusable: 0, pages: 1 }; throw e; });
      await run("refused", async () => { const e = new Error("turf: requires leader, manager or owner (role rep)"); e.code = "42501"; e.status = 400; throw e; });
      await run("missing", async () => { const e = new Error("Could not find the function public.import_territory_doors in the schema cache"); e.code = "PGRST202"; e.status = 404; throw e; });
      await run("ok", async (props) => ({ added: props.length - 1, matched: 1, outside: 0, ineligible: 0, unusable: 0, pages: 1 }));
      STORE.turfGate = realGate; STORE.importDoorsServer = realSrv; STORE.importDoors = realDev;
      return out;
    }, saved.id);
    check("connection dropped mid-run → 'Import not confirmed', the committed pages named, the button and the scan kept for a retry, nothing pinned locally",
      /Import not confirmed/.test(verdicts.net.status) && /400 doors confirmed before it dropped/.test(verdicts.net.status) && !verdicts.net.rowHidden && verdicts.net.btnEnabled && verdicts.net.scanEnabled && verdicts.net.pinsAdded === 0, JSON.stringify(verdicts.net));
    check("server REFUSAL (42501) → 'Import refused' with the server's reason, the retry kept, nothing pinned locally",
      /Import refused/.test(verdicts.refused.status) && /requires leader/.test(verdicts.refused.status) && !verdicts.refused.rowHidden && verdicts.refused.pinsAdded === 0 && /Import refused/.test(verdicts.refused.toast), JSON.stringify(verdicts.refused));
    check("server WITHOUT the import (PGRST202) → pinned on this device, queued to sync, and the toast says the server-confirmed import needs 0018",
      verdicts.missing.pinsAdded > 0 && new RegExp("Imported " + verdicts.missing.pinsAdded + " doors on this device").test(verdicts.missing.toast) && /needs migration 0018/.test(verdicts.missing.toast) && verdicts.missing.rowHidden, JSON.stringify(verdicts.missing));
    check("server CONFIRMED → the confirmation stays on the sheet (not overwritten by local counts), the import row closes, no local pin is written",
      /Server confirmed/.test(verdicts.ok.status) && /matched, not duplicated/.test(verdicts.ok.status) && verdicts.ok.rowHidden && verdicts.ok.pinsAdded === 0, JSON.stringify(verdicts.ok));

    // ============================================= F(part 2). REMOVE ONE REP
    section("F2. Remove one rep, keep the other; the assignment history survives");
    await page.evaluate((id) => MTURF.openAssign(STORE.territories.find((t) => t.id === id)), saved.id);
    await sleep(300);
    const asg = await page.evaluate(() => ({ title: document.querySelector("#turf-assign-title").textContent, sel: document.querySelectorAll("#turf-assign-chips .rep-chip.sel").length, note: document.querySelector("#turf-assign-note").textContent }));
    check("the assign sheet opens with both reps ticked and says so", asg.sel === 2 && /2 reps/.test(asg.note), JSON.stringify(asg));
    await page.evaluate((jake) => document.querySelector(`#turf-assign-chips .rep-chip[data-u="${jake}"]`).click(), saved.jake);
    await page.evaluate(() => document.querySelector("#turf-assign-save").click());
    await sleep(500);
    const after = await page.evaluate(({ id, jake, mia }) => {
      const t = STORE.territories.find((x) => x.id === id);
      const hist = STORE.assigneeHistory(t);
      return { cur: STORE.currentAssignees(t), jakeHas: STORE.hoodsOf(jake).some((h) => h.id === id), miaHas: STORE.hoodsOf(mia).some((h) => h.id === id),
        hist: hist.map((h) => ({ u: h.userId, open: !!h.open })), sheet: document.querySelector("#turf-assign-sheet").classList.contains("open") };
    }, { id: saved.id, jake: saved.jake, mia: saved.mia });
    check("Jake is off the hood, Mia is still on it", after.cur.length === 1 && after.cur[0] === saved.mia && !after.jakeHas && after.miaHas, JSON.stringify(after));
    check("the history keeps Jake's closed spell and Mia's open one", after.hist.some((h) => h.u === saved.jake && !h.open) && after.hist.some((h) => h.u === saved.mia && h.open), JSON.stringify(after.hist));

    // =============================================== G. THE NUMBER EVERYWHERE
    section("G. The territory number on every screen (seq is SIMULATED — server-assigned by 0018)");
    await page.evaluate(async (id) => { const t = STORE.territories.find((x) => x.id === id); t.seq = 12; await MDB.put("territories", t); }, saved.id);
    const lbl = await page.evaluate((id) => {
      const t = STORE.territories.find((x) => x.id === id);
      const withNick = Object.assign({}, t, { name: "Old Hood Name" });
      const noSeq = Object.assign({}, t, { seq: null, name: "" });
      return { long: STORE.hoodLabel(t), short: STORE.hoodShortLabel(t), nick: STORE.hoodLabel(withNick), nickShort: STORE.hoodShortLabel(withNick), none: STORE.hoodLabel(noSeq), id: t.id };
    }, saved.id);
    check('hoodLabel → "Territory 12", hoodShortLabel → "12"', lbl.long === "Territory 12" && lbl.short === "12", JSON.stringify(lbl));
    check("an old nickname never wins over the number", lbl.nick === "Territory 12" && lbl.nickShort === "12", JSON.stringify(lbl));
    check('without a number and without a name the label degrades to "Territory", never an invented one', lbl.none === "Territory" && lbl.id === saved.id, lbl.none);
    // the map label feature collection
    await page.evaluate(() => { window.__hoodsFC = null; const real = MRENDER_GL.setHoods; MRENDER_GL.setHoods = function (fc, o) { window.__hoodsFC = fc; window.__hoodsOpts = o; return real.call(this, fc, o); }; MMAP.refreshHoods(); });
    const mapLbl = await page.evaluate((id) => { const f = (window.__hoodsFC.features || []).find((x) => x.properties.id === id); return f ? f.properties.name : null; }, saved.id);
    check('the map label feature carries "Territory 12"', mapLbl === "Territory 12", mapLbl);
    // Route (turf list)
    await page.evaluate(() => { MAPP.show("route"); MTURF.render(); });
    await sleep(300);
    const routeLbl = await page.evaluate(() => Array.from(document.querySelectorAll(".turf-name")).map((e) => e.textContent.trim()));
    check('Route lists the hood as "Territory 12"', routeLbl.some((t) => t === "Territory 12"), JSON.stringify(routeLbl));
    // assign sheet + assign panel + hood list + saved sheet
    await page.evaluate((id) => MTURF.openAssign(STORE.territories.find((t) => t.id === id)), saved.id);
    const asgT = await page.evaluate(() => document.querySelector("#turf-assign-title").textContent.trim());
    check('the assignment sheet is titled "Territory 12"', asgT === "Territory 12", asgT);
    await page.evaluate(() => MUI.closeSheet());
    await page.evaluate(() => { MAPP.show("map"); document.querySelector("#fab-hoods").click(); });
    await sleep(400);
    const listLbl = await page.evaluate(() => Array.from(document.querySelectorAll("#hood-list .hn")).map((e) => e.childNodes[0].textContent.trim()));
    check('the manager territory list shows "Territory 12"', listLbl.includes("Territory 12"), JSON.stringify(listLbl));
    await page.evaluate(() => MHOODS.closeTools());
    await sleep(300);
    await page.evaluate((id) => MHOODS.openExisting(id), saved.id);
    await sleep(400);
    const sheetLbl = await page.evaluate(() => ({ title: document.querySelector("#hood-sheet-title").textContent.trim(), card: document.querySelector("#pc-id").textContent.trim(), ph: document.querySelector("#hood-name").placeholder }));
    check('the saved hood\'s own sheet is titled "Territory 12" and its polygon card reads "Polygon 12"', sheetLbl.title === "Territory 12" && sheetLbl.card === "Polygon 12", JSON.stringify(sheetLbl));
    check("the nickname field is optional and says the number is the name", /Optional/i.test(sheetLbl.ph) && /number is the name/i.test(sheetLbl.ph), sheetLbl.ph);
    await page.evaluate(() => document.querySelector("#hood-assign-open").click());
    await sleep(300);
    const panelSub = await page.evaluate(() => document.querySelector("#assign-sub").textContent.trim());
    check('the assign panel subtitle reads "Polygon 12"', panelSub === "Polygon 12", panelSub);
    await page.evaluate(() => { MASSIGN.close(); MUI.closeSheet(); });
    await sleep(200);
    // Street Mode: the house number once
    await page.evaluate(() => MSTREET.open());
    await sleep(400);
    const street = await page.evaluate(() => ({ open: document.querySelector("#street-sheet").classList.contains("open"), sub: document.querySelector("#street-sub").textContent,
      rows: Array.from(document.querySelectorAll("#street-list .st-row, #street-list button")).slice(0, 12).map((r) => r.textContent.replace(/\s+/g, " ").trim()) }));
    check('Street Mode opens on the imported street and leads with "Territory 12 ·"', street.open && /^Territory 12 · \d+ known doors? on/.test(street.sub), street.sub);
    check("Street Mode shows each house number ONCE (no '1200 1200 Brougham')", street.rows.length > 0 && street.rows.every((r) => !/^(\d+)\s+\1\b/.test(r)), JSON.stringify(street.rows.slice(0, 3)));
    await page.evaluate(() => MUI.closeSheet());

    // ============================================== H. RESET / RE-KNOCK
    section("H. Reset / re-knock preview — counts first, Go Back parked, Sold and DNK protected, history kept");
    const knocked = await page.evaluate(async (id) => {
      const mine = STORE.pins.filter((p) => p.territoryId === id);
      const OUT = ["nothome", "nothome", "notint", "goback", "sold", "unworked", "nothome", "dnk", "unworked", "notint"];
      const now = Date.now();
      const by = {};
      for (let i = 0; i < mine.length; i++) {
        const d = OUT[i % OUT.length];
        if (d === "unworked") continue;
        await STORE.addKnock({ pinId: mine[i].id, lat: mine[i].lat, lng: mine[i].lng, disposition: d, reason: d === "notint" ? "Not interested" : null, dm: d === "sold", note: "", callbackAt: d === "goback" ? now + 7200e3 : null });
        if (d === "sold") {
          const c = await STORE.addCustomer({ first: "Sold", last: "Door" + i, phones: [], appointments: [], pinId: mine[i].id });
          c.soldAt = now; c.agreement = { signedAt: now, plan: "Quarterly Pest" }; c.acct = "active"; await MDB.put("customers", c);
        }
        by[d] = (by[d] || 0) + 1;
      }
      const t = STORE.territories.find((x) => x.id === id);
      const facts = STORE.doorFacts();
      const eff = {};
      mine.forEach((p) => { const e = STORE.effectiveDisposition(p, t, facts); eff[e] = (eff[e] || 0) + 1; });
      return { by, eff, events: STORE.events.length };
    }, saved.id);
    check("a worked day is on the hood: not home, not interested, go back, sold and a do-not-knock (SYNTHETIC knocks)", knocked.eff.nothome > 0 && knocked.eff.notint > 0 && knocked.eff.goback > 0 && knocked.eff.sold > 0 && knocked.eff.dnk > 0, JSON.stringify(knocked));
    const prev = await page.evaluate((id) => MRESET.preview(STORE.territories.find((x) => x.id === id)), saved.id);
    check("MRESET.preview: the list Confirm would send is exactly ['nothome','notint'], never 'dnk', never 'sold', never 'goback'", prev.reset.join() === "nothome,notint" && prev.includeDnk === false, JSON.stringify(prev));
    check("the preview counts agree with the map's effective outcomes (every Sold here is customer-record-backed)", JSON.stringify(prev.counts) === JSON.stringify({ unworked: knocked.eff.unworked || 0, nothome: knocked.eff.nothome, notint: knocked.eff.notint, goback: knocked.eff.goback, sold: knocked.eff.sold, soldKnock: 0, dnk: knocked.eff.dnk }), JSON.stringify([prev.counts, knocked.eff]));
    check("with Go Back doors present the reset is PARKED", prev.parked === true);
    await page.evaluate((id) => { window.__resetCalls = 0; const real = STORE.resetForReknock; STORE.resetForReknock = async function () { window.__resetCalls++; return real.apply(this, arguments); }; MAPP.show("route"); MTURF.render(); }, saved.id);
    await sleep(300);
    await page.evaluate((id) => document.querySelector(`.mini[data-act="cycle"][data-tid="${id}"]`).click(), saved.id);
    await sleep(400);
    const rs = await page.evaluate(() => {
      const row = (cls) => { const r = document.querySelector(`#rs-rows .rs-row.${cls}`); return r ? { n: Number(r.querySelector(".rs-n").textContent), to: r.querySelector(".rs-to").textContent.trim() } : null; };
      return { open: document.querySelector("#reset-sheet").classList.contains("open"), title: document.querySelector("#rs-title").textContent, sub: document.querySelector("#rs-sub").textContent,
        reset: row("reset"), pending: row("pending"), sold: row("sold"), dnk: row("dnk"), same: row("same"),
        btn: document.querySelector("#rs-confirm").textContent, disabled: document.querySelector("#rs-confirm").disabled, note: document.querySelector("#rs-note").textContent };
    });
    check("Route → fresh pass opens the preview sheet titled with the number", rs.open && rs.title === "Territory 12", JSON.stringify({ open: rs.open, title: rs.title }));
    check(`the preview reads "${rs.reset && rs.reset.n} Not Home / Not Interested → Unworked"`, rs.reset && rs.reset.n === prev.counts.nothome + prev.counts.notint && rs.reset.to === "Unworked", JSON.stringify(rs.reset));
    check(`"${rs.pending && rs.pending.n} Go Back → DECISION PENDING"`, rs.pending && rs.pending.n === prev.counts.goback && rs.pending.to === "DECISION PENDING", JSON.stringify(rs.pending));
    check(`"${rs.sold && rs.sold.n} Sold → protected" and "${rs.dnk && rs.dnk.n} Do Not Knock → protected"`, rs.sold && rs.sold.n === prev.counts.sold && /protected/.test(rs.sold.to) && rs.dnk && rs.dnk.n === prev.counts.dnk && /protected/.test(rs.dnk.to), JSON.stringify([rs.sold, rs.dnk]));
    check("the sheet says a fresh pass moves one date and deletes nothing", /moves one date and deletes nothing/.test(rs.sub), rs.sub);
    check("Confirm is disabled and says it is waiting on the Go Back decision", rs.disabled && /waiting on the Go Back decision/.test(rs.btn) && /product decision/.test(rs.note), JSON.stringify({ btn: rs.btn, note: rs.note }));
    const forced = await page.evaluate(async () => { const b = document.querySelector("#rs-confirm"); b.disabled = false; b.dispatchEvent(new MouseEvent("click", { bubbles: true })); await new Promise((r) => setTimeout(r, 300)); return { calls: window.__resetCalls, cycle: STORE.territories.find((t) => t.seq === 12).cycleStartedAt || null }; });
    check("even a forced click on the parked Confirm calls STORE.resetForReknock ZERO times and moves no cycle boundary", forced.calls === 0 && forced.cycle === null, JSON.stringify(forced));
    await page.evaluate(() => document.querySelector("#rs-cancel").click());
    await sleep(200);

    // a second hood with NO Go Back doors: the reset actually runs (solo device)
    const t2 = await page.evaluate(async ({ CENTRE }) => {
      const dx = 0.006, dy = 0.004, cx = CENTRE.lng + 0.012, cy = CENTRE.lat;
      const ring = [[cx - dx, cy - dy], [cx + dx, cy - dy], [cx + dx, cy + dy], [cx - dx, cy + dy]];
      const t = await STORE.createTerritory({ name: "", homes: 0, points: ring }, [window.__crew.jake]);
      t.seq = 13; await MDB.put("territories", t);   // SIMULATED number
      const now = Date.now();
      // "soldknock": a door green only by its last knock — no customer record
      const OUT = ["nothome", "nothome", "notint", "sold", "dnk", "unworked", "nothome", "soldknock"];
      const ids = [];
      for (let i = 0; i < OUT.length; i++) {
        const lat = cy - dy * 0.6 + (i * dy * 1.2) / OUT.length, lng = cx - dx * 0.5 + (i % 3) * dx * 0.4;
        const p = await STORE.addKnock({ lat, lng, disposition: OUT[i] === "unworked" ? "nothome" : OUT[i] === "soldknock" ? "sold" : OUT[i], reason: null, dm: false, note: "", callbackAt: null });
        if (OUT[i] === "unworked") { p.disposition = "unworked"; p.history = []; await MDB.put("pins", p); }
        if (OUT[i] === "sold") { const c = await STORE.addCustomer({ first: "Green", last: "Door", phones: [], appointments: [], pinId: p.id }); c.soldAt = now; c.agreement = { signedAt: now, plan: "Quarterly" }; c.acct = "active"; await MDB.put("customers", c); }
        ids.push(p.id);
      }
      const snap = (id) => { const p = STORE.pins.find((x) => x.id === id); return { disp: p.disposition, hist: (p.history || []).length }; };
      const facts = STORE.doorFacts();
      const knockOnly = ids[OUT.indexOf("soldknock")], recordSold = ids[OUT.indexOf("sold")];
      return { id: t.id, ids, before: ids.map(snap), events: STORE.events.length, preview: MRESET.preview(t), knockOnly, recordSold,
        effKnockOnly: STORE.effectiveDisposition(STORE.pins.find((x) => x.id === knockOnly), t, facts) };
    }, { CENTRE });
    check("Territory 13 (SYNTHETIC) has no Go Back doors, so its preview is NOT parked", t2.preview.parked === false && t2.preview.counts.goback === 0, JSON.stringify(t2.preview));
    // a door green only by its last knock — no customer record — is NOT protected, and the sheet says so
    const knockOnly = await page.evaluate((id) => {
      const t = STORE.territories.find((x) => x.id === id);
      const before = MRESET.preview(t);
      MRESET.open(t);
      const row = Array.from(document.querySelectorAll("#rs-rows .rs-row")).find((r) => /no customer record/.test(r.textContent));
      const out = { soldKnock: before.counts.soldKnock, sold: before.counts.sold, willReset: before.willReset,
        row: row ? row.textContent.replace(/\s+/g, " ").trim() : null, btn: document.querySelector("#rs-confirm").textContent };
      document.querySelector("#rs-cancel").click();
      return out;
    }, t2.id);
    check("a knock-only Sold (no customer record) paints green but is NOT protected: its own row says → Unworked and it is in the reset count",
      t2.effKnockOnly === "sold" && knockOnly.soldKnock === 1 && knockOnly.sold === 1 && /Sold at the door, no customer record/.test(knockOnly.row) && /Unworked/.test(knockOnly.row) && new RegExp("reset " + knockOnly.willReset + " doors").test(knockOnly.btn), JSON.stringify({ knockOnly, eff: t2.effKnockOnly }));
    // a team server WITHOUT 0018 answers "function not found": the sheet refuses, never falls back to the every-outcome reset
    const no18 = await page.evaluate(async (id) => {
      const t = STORE.territories.find((x) => x.id === id);
      const realReset = STORE.resetForReknock, realCycle = STORE.startCycle;
      let cycleCalls = 0;
      STORE.resetForReknock = async () => { const e = new Error("Could not find the function public.reset_territory_outcomes(p_include_dnk, p_operation_id, p_reset, p_territory_id) in the schema cache"); e.code = "PGRST202"; throw e; };
      STORE.startCycle = async () => { cycleCalls++; return realCycle.apply(STORE, arguments); };
      MRESET.open(t);
      document.querySelector("#rs-confirm").click();
      await new Promise((r) => setTimeout(r, 400));
      const out = { cycleCalls, note: document.querySelector("#rs-note").textContent, open: document.querySelector("#reset-sheet").classList.contains("open"),
        enabled: !document.querySelector("#rs-confirm").disabled, cycle: t.cycleStartedAt || null, toast: window.__toasts.slice(-1)[0] };
      STORE.resetForReknock = realReset; STORE.startCycle = realCycle;
      document.querySelector("#rs-cancel").click();
      return out;
    }, t2.id);
    check("without 0018 on the server the sheet REFUSES ('needs migration 0018'), calls start_territory_cycle zero times, moves no boundary, and stays open for a retry",
      no18.cycleCalls === 0 && /needs migration 0018/.test(no18.note) && no18.open && no18.enabled && no18.cycle === null && /needs migration 0018/.test(no18.toast), JSON.stringify(no18));
    await page.evaluate((id) => MRESET.open(STORE.territories.find((x) => x.id === id)), t2.id);
    await sleep(300);
    const rs2 = await page.evaluate(() => ({ btn: document.querySelector("#rs-confirm").textContent, disabled: document.querySelector("#rs-confirm").disabled, note: document.querySelector("#rs-note").textContent }));
    check(`Confirm is live and says "Start a fresh pass — reset ${t2.preview.willReset} doors" (Not Home + Not Interested + the knock-only Sold)`, !rs2.disabled && t2.preview.willReset === t2.preview.counts.nothome + t2.preview.counts.notint + 1 && new RegExp("reset " + t2.preview.willReset + " doors").test(rs2.btn) && /Sold stays green and Do Not Knock stays black/.test(rs2.note), JSON.stringify(rs2));
    await page.evaluate(() => document.querySelector("#rs-confirm").click());
    await sleep(700);
    const done = await page.evaluate(({ id, ids, before, events }) => {
      const t = STORE.territories.find((x) => x.id === id);
      const facts = STORE.doorFacts();
      const after = ids.map((pid) => { const p = STORE.pins.find((x) => x.id === pid); return { disp: p.disposition, hist: (p.history || []).length, eff: STORE.effectiveDisposition(p, t, facts) }; });
      return { calls: window.__resetCalls, cycle: t.cycleStartedAt || null, keep: t.cycleKeep, after, sameRaw: JSON.stringify(after.map((a) => ({ disp: a.disp, hist: a.hist }))) === JSON.stringify(before),
        events: STORE.events.length === events, sheet: document.querySelector("#reset-sheet").classList.contains("open"), toasts: window.__toasts.slice(-3) };
    }, t2);
    check("Confirm called STORE.resetForReknock exactly once with the solo device recording the boundary", done.calls === 1 && done.cycle > 0, JSON.stringify({ calls: done.calls, cycle: done.cycle }));
    check("the kept list never contains 'dnk' and never the two outcomes being reset", Array.isArray(done.keep) && !done.keep.includes("dnk") && !done.keep.includes("nothome") && !done.keep.includes("notint"), JSON.stringify(done.keep));
    check("after the pass: Not Home and Not Interested doors are effectively Unworked", done.after.filter((a) => a.disp === "nothome" || a.disp === "notint").every((a) => a.eff === "unworked"), JSON.stringify(done.after));
    check("after the pass: the customer-record Sold door is still Sold, the knock-only Sold door is Unworked, and the Do Not Knock door is still black",
      done.after[t2.ids.indexOf(t2.recordSold)].eff === "sold" && done.after[t2.ids.indexOf(t2.knockOnly)].eff === "unworked" && done.after.some((a) => a.eff === "dnk"), JSON.stringify(done.after));
    check("HISTORY STAYS: every pin's raw disposition and history length are unchanged, and no event was deleted", done.sameRaw && done.events, JSON.stringify(done.after));
    check("the sheet closes and the toast says how many doors went back to unworked", !done.sheet && done.toasts.some((x) => /Territory 13 — fresh pass started/.test(x)), JSON.stringify(done.toasts));

    // ================================================ I. OFFLINE KNOCKING
    section("I. A knock made offline is kept and survives a reload");
    const off = await page.evaluate(() => { const p = STORE.pins.find((x) => x.territoryId === window.__t1 && x.disposition === "unworked"); return { id: p.id, hist: p.history.length, ev: STORE.events.length }; });
    await ctx.setOffline(true);
    const offRes = await page.evaluate(async (id) => {
      const p = STORE.pins.find((x) => x.id === id);
      await STORE.addKnock({ pinId: id, lat: p.lat, lng: p.lng, disposition: "notint", reason: "Renter", dm: true, note: "", callbackAt: null });
      await STORE.addNote(p, "Gate code 4321 — offline note");
      return { online: navigator.onLine, disp: p.disposition, hist: p.history.length, notes: (p.notes || []).length };
    }, off.id);
    check("offline: the knock and the note are recorded on the device immediately", offRes.online === false && offRes.disp === "notint" && offRes.hist === off.hist + 1 && offRes.notes === 1, JSON.stringify(offRes));
    await ctx.setOffline(false);
    await page.reload();
    await bootApp();
    // a reload empties window.*: hand the ids back to the page
    await page.evaluate(({ T1, crew }) => { window.__t1 = T1; window.__crew = crew; }, { T1, crew: { me: seed.me, jake: seed.jake, mia: seed.mia } });
    const back = await page.evaluate((id) => { const p = STORE.pins.find((x) => x.id === id); return { disp: p.disposition, hist: p.history.length, note: (p.notes || []).map((n) => n.text).join(), ev: STORE.events.length, seq: (STORE.territories.find((t) => t.seq === 12) || {}).seq, pins: STORE.pins.length }; }, off.id);
    check("after a reload the offline knock, its event and the note are all still there", back.disp === "notint" && back.hist === off.hist + 1 && /Gate code 4321/.test(back.note) && back.ev === off.ev + 1, JSON.stringify(back));
    check("the numbered territory and every door survived the reload too", back.seq === 12 && back.pins > 0, JSON.stringify(back));

    // =============================================== J. ENGINE SWITCH
    section("J. Switching engines keeps the door, callback, note, turf and camera; MapKit → MapLibre falls back loudly");
    await page.evaluate(() => { MAPP.show("map"); window.__crew = window.__crew || {}; });
    await sleep(500);
    const j0 = await page.evaluate(async ({ CENTRE }) => {
      window.__toasts = []; const t = document.querySelector("#toast"); if (t) new MutationObserver(() => { if (t.textContent.trim()) window.__toasts.push(t.textContent.trim()); }).observe(t, { childList: true, characterData: true, subtree: true });
      const a = STORE.pins.find((x) => x.territoryId === window.__t1 && x.disposition === "unworked");
      const b = STORE.pins.find((x) => x.territoryId === window.__t1 && x.id !== a.id && x.disposition === "unworked");
      await STORE.addKnock({ pinId: b.id, lat: b.lat, lng: b.lng, disposition: "goback", reason: null, dm: false, note: "", callbackAt: Date.now() + 3600e3 });
      await STORE.addNote(a, "Blue door, dog in yard");
      MMAP.jumpTo(CENTRE.lng + 0.002, CENTRE.lat + 0.001, 17.2);
      await new Promise((r) => setTimeout(r, 400));
      MMAP.focusPin(a.id);
      await new Promise((r) => setTimeout(r, 900));
      // capture what the renderer is handed on the switch
      window.__sel = null; window.__hoodN = null;
      const gl = MRENDER_GL; const rp = gl.setPins, rh = gl.setHoods;
      gl.setPins = function (fc, sel) { window.__sel = sel; return rp.call(this, fc, sel); };
      gl.setHoods = function (fc, o) { window.__hoodN = (fc.features || []).length; window.__hoodOpts = o; return rh.call(this, fc, o); };
      const c = MMAP.getCenter();
      const hoodsNow = (window.MRENDER_GL && STORE.activeTerritories().filter((t) => t.points && t.points.length >= 3).length);
      return { a: a.id, b: b.id, lead: document.querySelector("#lead-sheet").classList.contains("open"), center: [c.lng, c.lat], engine: MMAP.engine(), pins: STORE.pins.length, events: STORE.events.length,
        cb: STORE.pins.find((x) => x.id === b.id).callbackAt, notes: (a.notes || []).length, hoods: hoodsNow, mia: STORE.hoodsOf(window.__crew.mia).length, queued: STORE.queuedCount(), gate: STORE.turfGate({ needsServer: true }).code };
    }, { CENTRE });
    check("before the switch: MapLibre is up, a door is selected with its sheet open, a callback and a note exist", j0.engine === "maplibre" && j0.lead && j0.cb > 0 && j0.notes === 1, JSON.stringify(j0));
    const j1 = await page.evaluate(async () => {
      STORE.settings.mapEngine = "maplibre"; await STORE.saveSettings();
      await MMAP.init();   // the same path the Settings save button takes: destroy, re-boot
      await new Promise((r) => setTimeout(r, 600));
      const c = MMAP.getCenter();
      return { engine: MMAP.engine(), report: MMAP.engineReport(), sel: window.__sel, hoodN: window.__hoodN, center: [c.lng, c.lat], lead: document.querySelector("#lead-sheet").classList.contains("open"),
        pins: STORE.pins.length, events: STORE.events.length, canvases: document.querySelectorAll("#map canvas").length };
    });
    const jb = await page.evaluate((ids) => ({ cb: STORE.pins.find((x) => x.id === ids.b).callbackAt, notes: (STORE.pins.find((x) => x.id === ids.a).notes || []).length, mia: STORE.hoodsOf(window.__crew.mia).length, queued: STORE.queuedCount() }), { a: j0.a, b: j0.b });
    check("the engine re-booted (one canvas — the old renderer was destroyed first)", j1.engine === "maplibre" && j1.canvases === 1 && !j1.report.fellBack, JSON.stringify({ engine: j1.engine, canvases: j1.canvases }));
    check("the selected door is handed to the new renderer as selected, and its sheet is still open", j1.sel === j0.a && j1.lead, JSON.stringify({ sel: j1.sel, a: j0.a, lead: j1.lead }));
    check("the assigned turf is re-drawn in full (same hood count) and Mia still holds hers", j1.hoodN === j0.hoods && jb.mia === j0.mia && jb.mia > 0, JSON.stringify({ hoodN: j1.hoodN, hoods: j0.hoods, mia: jb.mia }));
    check("the callback and the note survived the switch untouched", jb.cb === j0.cb && jb.notes === j0.notes, JSON.stringify({ before: [j0.cb, j0.notes], after: [jb.cb, jb.notes] }));
    check("no knock or event was lost or duplicated", j1.pins === j0.pins && j1.events === j0.events, JSON.stringify({ pins: [j0.pins, j1.pins], events: [j0.events, j1.events] }));
    const overlay = await page.evaluate(async () => {
      // a route on screen and a located puck, then a switch: both must be re-issued to the new renderer
      window.__route = null; window.__puck = null;
      const gl = MRENDER_GL; const rr = gl.setRoute, rp = gl.setPuck;
      gl.setRoute = function (fc) { window.__route = fc; return rr.call(this, fc); };
      gl.setPuck = function (ll) { window.__puck = ll; return rp.call(this, ll); };
      const pins = STORE.pins.filter((p) => p.territoryId === window.__t1).slice(0, 5);
      MMAP.showRoute(pins);
      const c = MMAP.getCenter();
      navigator.geolocation.getCurrentPosition = (ok) => ok({ coords: { latitude: c.lat, longitude: c.lng } });
      document.querySelector("#fab-locate").click();
      await new Promise((r) => setTimeout(r, 300));
      const before = { route: window.__route && window.__route.features.length, puck: !!window.__puck };
      window.__route = null; window.__puck = null;
      await MMAP.init();
      await new Promise((r) => setTimeout(r, 500));
      const after = { route: window.__route && window.__route.features.length, puck: !!window.__puck, engine: MMAP.engine() };
      MMAP.clearRoute();
      return { before, after, cleared: window.__route && window.__route.features.length };
    });
    check("the re-knock route (line + 5 stops) and the location puck survive the switch, and clearRoute still clears", overlay.before.route === 6 && overlay.before.puck && overlay.after.route === 6 && overlay.after.puck && overlay.after.engine === "maplibre" && overlay.cleared === 0, JSON.stringify(overlay));
    const triple = await page.evaluate(async () => {
      // launch-style boot with two more requests while it runs: every caller gets the map, none a null renderer
      const opts = { container: "map", center: [-94.77, 38.862], zoom: 16, on: {} };
      const rs = await Promise.all([MENGINE.boot(opts), MENGINE.boot(opts), MENGINE.boot(opts)]);
      await MMAP.init();   // hand the map back to map.js's own callbacks
      return { engines: rs.map((r) => r.engine), renderers: rs.map((r) => !!r.renderer), canvases: document.querySelectorAll("#map canvas").length };
    });
    check("three overlapping boots all answer with a live renderer (never a null 'No map could be started'), one canvas", triple.renderers.every(Boolean) && triple.engines.every((e) => e === "maplibre") && triple.canvases === 1, JSON.stringify(triple));
    const dist = Math.hypot(j1.center[0] - j0.center[0], j1.center[1] - j0.center[1]);
    check("the map position is kept (camera within ~30 m of where it was)", dist < 0.0004, JSON.stringify({ before: j0.center, after: j1.center, dist }));
    check("queued work is unchanged by a renderer swap", jb.queued === j0.queued, JSON.stringify([j0.queued, jb.queued]));

    const fb = await page.evaluate(async () => {
      STORE.settings.mapEngine = "mapkit"; STORE.settings.mapkitToken = ""; STORE.settings.mapkitLastError = "";
      await STORE.saveSettings();
      const t0 = performance.now();
      await MMAP.init();
      await new Promise((r) => setTimeout(r, 400));
      const r = MMAP.engineReport();
      MAPP.roleChanged();  // re-renders More → the engine line
      return { ms: Math.round(performance.now() - t0), engine: MMAP.engine(), wanted: r.wanted, fellBack: r.fellBack, reason: r.reason, lastError: STORE.settings.mapkitLastError,
        more: document.querySelector("#more-mapengine-sub").textContent, toasts: window.__toasts.slice(-2), canvases: document.querySelectorAll("#map canvas").length, sel: window.__sel, lead: document.querySelector("#lead-sheet").classList.contains("open") };
    });
    check("MapKit requested with NO TOKEN: MapLibre runs instead and the report says exactly that (fellBack, wanted mapkit, reason = no token; Apple is never contacted)", fb.engine === "maplibre" && fb.wanted === "mapkit" && fb.fellBack === true && /No Apple MapKit token/.test(fb.reason), JSON.stringify(fb));
    check("no token is a standing configuration, not news: the Settings line says why, and there is NO six-second toast on every launch", !fb.toasts.some((t) => /Apple Maps unavailable/.test(t)) && /Offline-capable map —/.test(fb.more) && /token/i.test(fb.more), JSON.stringify({ toasts: fb.toasts, more: fb.more }));
    const badTok = await page.evaluate(async () => {
      window.__toasts = [];
      STORE.settings.mapEngine = "mapkit"; STORE.settings.mapkitToken = "not-a-token-apple-will-accept"; await STORE.saveSettings();
      await MMAP.init(); await new Promise((r) => setTimeout(r, 400));
      const r = MMAP.engineReport(); STORE.settings.mapkitToken = ""; await STORE.saveSettings();
      return { engine: r.engine, fellBack: r.fellBack, quiet: r.quiet, toasts: window.__toasts.slice(-2) };
    });
    check("a token present but Apple's library UNREACHABLE (this container blocks the CDN) IS toasted — the real 401 refusal is proven against Apple's library in mapkit-test.js", badTok.engine === "maplibre" && badTok.fellBack && !badTok.quiet && badTok.toasts.some((t) => /Apple Maps unavailable/.test(t)), JSON.stringify(badTok));
    check("the reason is recorded for Settings and never faked as imagery (one live canvas, the selection kept)", fb.lastError === fb.reason && fb.canvases === 1 && fb.sel === j0.a, JSON.stringify({ lastError: fb.lastError, canvases: fb.canvases }));
    console.log("    NOTE: in this container Apple's CDN is unreachable, so the reason is a load failure; the real 401 'Unauthorized' path is proven in tests/mapkit-test.js");
    const auto = await page.evaluate(async () => { STORE.settings.mapEngine = "auto"; await STORE.saveSettings(); return MENGINE.wanted(); });
    check("engine 'auto' with no token on the device wants MapLibre (never a blank Apple map)", auto === "maplibre", auto);
    await page.evaluate(async () => { await MMAP.init(); MMAP.clearSelection(); MUI.closeSheet(); });
    await sleep(400);

    // ==================================================== K. THE REP VIEW
    section("K. A rep: no manager tools, no token field, other turf faded, no labels");
    // give this device's user Territory 12 alongside Mia, so the rep view has exactly one hood of their own
    await page.evaluate(async () => { const t = STORE.territories.find((x) => x.seq === 12); await STORE.setAssignees(t, [window.__crew.mia, STORE.myId()]); });
    await beRole("rep");
    const rep = await page.evaluate(() => {
      window.__hoodsFC = null; window.__hoodsOpts = null;
      const real = MRENDER_GL.setHoods; MRENDER_GL.setHoods = function (fc, o) { window.__hoodsFC = fc; window.__hoodsOpts = o; return real.call(this, fc, o); };
      document.querySelector("#fab-hoods").click();
      const groups = Array.from(document.querySelectorAll("#mtools .mt-group")).map((g) => g.hidden);
      const out = { can: STORE.canManageTerritories(), sub: document.querySelector("#mtools-sub").textContent, groups,
        heat: document.querySelector("#mt-heat").hidden, assign: document.querySelector("#mt-assign").hidden,
        corners: !!document.querySelector("#mt-corners").closest(".mt-group") && document.querySelector("#mt-corners").closest(".mt-group").hidden };
      MHOODS.closeTools();
      MMAP.refreshHoods();
      const fc = window.__hoodsFC || { features: [] };
      out.labels = window.__hoodsOpts ? window.__hoodsOpts.labels : null;
      out.dims = fc.features.map((f) => ({ seq: (STORE.territories.find((t) => t.id === f.properties.id) || {}).seq, dim: f.properties.dim, color: f.properties.color }));
      out.mine = STORE.hoodsOf(STORE.myId()).length;
      document.querySelector("#more-mapengine").click();
      out.tokenRow = document.querySelector("#mapengine-token-row").hidden;
      out.tokenValue = document.querySelector("#set-mapkit-token").value;
      MUI.closeSheet();
      MAPP.show("route"); MTURF.render();
      out.turfRows = document.querySelectorAll(".turf-name").length;
      MAPP.show("home");
      const r = document.querySelector("#hm-turf h3 .r");
      out.home = r ? r.textContent.trim() : null;
      return out;
    });
    check('the rep\'s Home names their one hood "Territory 12" (never "1 hood")', rep.home === "Territory 12", rep.home);
    check("a rep cannot manage territories and the tools sheet reads 'Your turf'", !rep.can && /Your turf/.test(rep.sub), rep.sub);
    check("the two leadership tool groups (draw / edit) are hidden wholesale, Freshness and Manage reps too", rep.groups[0] === true && rep.groups[1] === true && rep.heat && rep.assign && rep.corners, JSON.stringify(rep.groups));
    check("the Apple token field is DEV/leader-only: hidden for a rep, and the hidden input holds NO token", rep.tokenRow === true && rep.tokenValue === "", JSON.stringify({ row: rep.tokenRow, value: rep.tokenValue }));
    const demoted = await page.evaluate(async () => {
      await STORE.applyServerRole("owner", Date.now()); MAPP.roleChanged();
      await STORE.saveSettings();
      STORE.settings.mapkitToken = "left-over-token"; MMAP.setHeatMode(true);
      const on = { heat: MMAP.heatMode(), opts: (window.__hoodsOpts || {}).heat };
      await STORE.applyServerRole("rep", Date.now()); MAPP.roleChanged(); MMAP.refreshHoods();
      const off = { heat: MMAP.heatMode(), opts: (window.__hoodsOpts || {}).heat, labels: (window.__hoodsOpts || {}).labels };
      document.querySelector("#more-mapengine").click(); const tok = document.querySelector("#set-mapkit-token").value; MUI.closeSheet();
      STORE.settings.mapkitToken = "";
      return { on, off, tok };
    });
    check("a manager demoted with the freshness view on loses it (no heat, no labels) — and the leftover token never reaches their DOM", demoted.on.heat === true && demoted.off.heat === false && demoted.off.opts === false && demoted.off.labels === false && demoted.tok === "", JSON.stringify(demoted));
    check("territory labels are off for a rep; their own hood is full-strength blue and every other hood is faded",
      rep.labels === false && rep.mine === 1 && rep.dims.length === 2 &&
      rep.dims.every((d) => (d.seq === 12 ? d.dim === 0 : d.dim === 1) && d.color === "#0A84FF"), JSON.stringify({ labels: rep.labels, dims: rep.dims, mine: rep.mine }));
    console.log("    NOTE: a rep's map keeps other turf visible but FADED (the documented design); hiding it outright is a product call, flagged in the report");
    check("Route lists only the rep's own turf", rep.turfRows === rep.mine, JSON.stringify({ rows: rep.turfRows, mine: rep.mine }));
    await beRole("owner");
    const own = await page.evaluate(() => {
      document.querySelector("#more-mapengine").click(); const h = document.querySelector("#mapengine-token-row").hidden; const st = document.querySelector("#mapengine-state").textContent; MUI.closeSheet();
      MMAP.refreshHoods();
      const f = (window.__hoodsFC.features || []).find((x) => (STORE.territories.find((t) => t.id === x.properties.id) || {}).seq === 12);
      return { h, st, labels: window.__hoodsOpts.labels, rep: f ? f.properties.rep : null, dim: f ? f.properties.dim : null };
    });
    check("…and shown for a leader, with the engine state line beside it", own.h === false && own.st.length > 0, JSON.stringify(own));
    check("a manager's map labels the shared hood with BOTH reps and fades nothing", own.labels === true && /Mia Cole/.test(own.rep) && /Phase Five/.test(own.rep) && own.dim === 0, JSON.stringify(own));

    // ======================================================= L. CLEANUP
    section("L. Cleanup: top card, no FAB overlap, one product header, black pin, service worker");
    await page.evaluate(() => MAPP.show("map"));
    await sleep(300);
    const cl = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll("#map-brand .mb-cell span")).map((s) => s.textContent.trim());
      const r = (sel) => { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, hidden: e.hidden || b.width === 0 }; };
      const boxes = { locate: r("#fab-locate"), hoods: r("#fab-hoods"), street: r("#fab-street"), brand: r("#map-brand") };
      const hit = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
      const pairs = [["locate", "hoods"], ["locate", "street"], ["hoods", "street"], ["brand", "locate"], ["brand", "hoods"], ["brand", "street"]];
      const overlaps = pairs.filter(([a, b]) => !boxes[a].hidden && !boxes[b].hidden && hit(boxes[a], boxes[b]));
      const heads = Array.from(document.querySelectorAll(".screen")).map((s) => ({ id: s.id, head: !!s.querySelector(".pscr-head") }));
      return { cells, today: document.querySelector("#brand-today").hidden, hoodStrip: document.querySelector("#brand-hood").hidden, overlaps, heads,
        dnk: MDATA.DISPOSITIONS.dnk.label, dnkColor: MDATA.DISPOSITIONS.dnk.color, legend: (document.querySelector("#map-legend") || {}).textContent || "" };
    });
    check("the map top card is exactly Doors / DMs / Sold", cl.cells.join("|") === "Doors|DMs|Sold" && cl.today && cl.hoodStrip, JSON.stringify(cl.cells));
    check("the three map buttons and the top card do not overlap", cl.overlaps.length === 0, JSON.stringify(cl.overlaps));
    check("every tab screen uses the one product header", cl.heads.filter((h) => /customers|route|schedule|stats|more|home/.test(h.id)).every((h) => h.head), JSON.stringify(cl.heads));
    check('the black pin is "Do Not Knock / Danger"', cl.dnk === "Do Not Knock / Danger" && /^#0/.test(cl.dnkColor), cl.dnk);

    const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
    const core = (sw.match(/CORE\s*=\s*\[([\s\S]*?)\]/) || ["", ""])[1].match(/"([^"]+)"/g).map((s) => s.replace(/"/g, ""));
    const need = ["js/reset.js", "js/map-pin.js", "js/map-render-gl.js", "js/map-render-mk.js", "js/map-engine.js", "js/hoods.js", "js/turf.js", "js/assign.js", "js/street.js", "js/route.js", "js/customers.js"];
    const missing = need.filter((n) => !core.some((c) => c.replace(/^\.\//, "").split("?")[0] === n));
    const notOnDisk = core.filter((c) => !/^(install|activate)$/.test(c)).map((c) => c.replace(/^\.\//, "").split("?")[0]).filter((c) => c && !fs.existsSync(path.join(ROOT, c === "" ? "index.html" : c)));
    check("the service worker precache carries reset.js and every map module", missing.length === 0, JSON.stringify(missing));
    check("every precached asset exists on disk", notOnDisk.length === 0, JSON.stringify(notOnDisk));
    // the comment in sw.js may NAME Apple's CDN to say it is excluded; no precache entry or cache-put may reference it
    const swCode = sw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    check("Apple's CDN is never precached (offline never depends on Apple's uptime)", !core.some((c) => /apple-mapkit|mapkit\.js/i.test(c)) && !/apple-mapkit/.test(swCode), core.filter((c) => /apple/i.test(c)).join());
    const scriptVers = (fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/src="js\/[^"]+\?v=(\d+)"/g) || []).map((s) => s.match(/v=(\d+)/)[1]);
    check("index.html loads reset.js and every script at one cache version", /js\/reset\.js\?v=/.test(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")) && new Set(scriptVers).size === 1, JSON.stringify(Array.from(new Set(scriptVers))));

    section("page errors");
    check("no page errors", errors.length === 0, JSON.stringify(errors.slice(0, 5)));
  } catch (e) {
    fail++;
    console.log("  ✗ suite threw: " + (e.stack || e));
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
