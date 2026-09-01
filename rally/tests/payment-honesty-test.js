/* RALLY v39 — REAL REP: payment is represented honestly, and no raw
   credential can exist or return.

   The centrepiece is the LIFECYCLE test the removal was approved on: a
   pre-v39 record carrying a full PAN, expiry, routing and account number is
   planted straight into IndexedDB, and then put through

       boot  ->  normalize (open in the editor)  ->  sync merge
             ->  backup  ->  restore  ->  boot again

   with the credentials asserted absent at every step. One mechanism could
   be bypassed; the record has to get past all of them.

   It also proves the three claims v39 must never make:
     - no autopay is "active" or "requested" merely because the old record
       shape defaulted autopay to true
     - no payment is "on file" merely because a legacy last4 survived
     - no signed agreement authorizes a charge against an account that was
       never collected  */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PORT = 8855;
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

// unmistakable values: if any of these ever appears again, it came from the
// record and not from a coincidence
const PAN = "SENTINEL-PAN-4111111111111111";
const EXP = "SENTINEL-EXP-01-30";
const ROUTING = "SENTINEL-ROUTING-021000021";
const ACCOUNT = "SENTINEL-ACCOUNT-000123456789";
const SENTINELS = [PAN, EXP, ROUTING, ACCOUNT];
const hasSentinel = (s) => SENTINELS.some((v) => String(s).includes(v));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json", ".pbf": "application/x-protobuf" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(d);
  });
});

// the whole of IndexedDB, as one string to search
const DUMP = `(async () => {
  const out = {};
  for (const s of ["customers", "pins", "events", "territories", "users"]) {
    out[s] = await MDB.getAll(s).catch(() => []);
  }
  out.kv = {};
  for (const k of ["settings", "syncDead", "cloudProfile"]) {
    out.kv[k] = await MDB.kvGet(k, null).catch(() => null);
  }
  return JSON.stringify(out);
})()`;

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" };
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && !/net::ERR_/.test(t) && !/WebSocket/.test(t)) errors.push(t);
  });

  const boot = async () => {
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForFunction(() => document.querySelector("#splash").hidden, null, { timeout: 25000 });
    await page.waitForTimeout(250);
  };
  const reboot = async () => {
    await page.reload();
    await page.waitForFunction(() => !!(window.STORE && STORE.customers), null, { timeout: 25000 });
    await page.waitForTimeout(600);
  };

  await boot();
  await page.click("#gate-swap-btn"); await page.waitForTimeout(200);
  await page.fill("#gate-name", "Rep"); await page.fill("#gate-email", "rep@example.com");
  await page.fill("#gate-pass", "knock1234"); await page.click("#gate-submit");
  await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 25000 });
  await page.waitForTimeout(600);

  // ============ A: the capture surface is gone ============
  await page.click("#cust-fab"); await page.waitForTimeout(400);
  await page.fill("#ci-first", "Dana"); await page.fill("#ci-last", "Miles");
  await page.click('.ce-tab[data-t="payment"]'); await page.waitForTimeout(300);
  for (const [label, sel] of [["card number", "#cp-cc-num"], ["expiry", "#cp-cc-exp"],
                              ["ACH routing", "#cp-ach-routing"], ["ACH account", "#cp-ach-account"]]) {
    check(`A1 there is no ${label} field to type into`, !(await page.$(sel)));
  }
  check("A2 no input on the payment tab asks for a number of any kind",
    await page.$$eval("#ce-payment input", (els) =>
      els.every((e) => !/card|routing|account|cvv|cvc|exp/i.test(e.id + " " + (e.placeholder || "")) ||
        /name/i.test(e.id))));
  check("A3 nothing chosen: the record claims no method and nothing pending",
    (await page.$eval("#cp-status-line", (e) => e.textContent)).includes("No payment method chosen"));
  const autopayOn = await page.$eval("#cp-autopay", (e) => e.classList.contains("on"));
  check("A4 autopay does not start switched on", autopayOn === false, String(autopayOn));

  await page.click('.pay-m[data-m="card"]'); await page.waitForTimeout(200);
  await page.click("#cp-autopay"); await page.waitForTimeout(200);
  const line = await page.$eval("#cp-status-line", (e) => e.textContent);
  check("A5 with a method and an autopay request the UI says PENDING, never active",
    /PENDING/.test(line) && /not active yet/.test(line) && !/\bactive\b(?! yet)/i.test(line.replace("not active yet", "")),
    line);

  // ============ B: the contract cannot authorize an uncollected account ==
  await page.click('.ce-tab[data-t="agree"]'); await page.waitForTimeout(500);
  const doc = await page.evaluate(() => document.querySelector("#ca-doc").textContent);
  check("B1 the agreement does NOT authorize charging a method on file",
    !/authorizes Company to charge the payment method on file/i.test(doc));
  check("B2 it states plainly that no method was collected and nothing is authorized",
    /No payment method has been collected/i.test(doc) && /authorizes no charge/i.test(doc));
  check("B3 it records the intent instead, without turning it into a mandate",
    /intention to pay by a credit or debit card/i.test(doc) &&
    /asked to be enrolled in automatic payments/i.test(doc), doc.slice(0, 40));
  check("B4 the clause heading drops 'recurring payment authorization'",
    !/recurring payment authorization/i.test(doc));

  // a record with NO method at all gets the third state
  const noneDoc = await page.evaluate(() => {
    const c = JSON.parse(JSON.stringify(STORE.customers[0] || { first: "X", last: "Y" }));
    c.payment = { method: "", autopayRequested: false, status: "not_configured" };
    c.plan = { id: "prem", name: "Premium", monthly: 99, initial: 450 };
    return MCONTRACT.bodyHTML(c, null);
  });
  check("B5 with nothing chosen the contract still authorizes no charge",
    /authorizes no charge/i.test(noneDoc) && !/intention to pay by/i.test(noneDoc));
  // and only a server-authored status can unlock the authorization clause
  const authDoc = await page.evaluate(() => {
    const c = JSON.parse(JSON.stringify(STORE.customers[0] || { first: "X", last: "Y" }));
    c.payment = { method: "card", autopayRequested: true, status: "authorized" };
    c.plan = { id: "prem", name: "Premium", monthly: 99, initial: 450 };
    return MCONTRACT.bodyHTML(c, null);
  });
  check("B6 the authorization clause exists, but only a server-authored status reaches it",
    /authorizes Company to charge the payment method on file/i.test(authDoc));
  check("B7 …and no client path can write that status",
    await page.evaluate(() => {
      const p = MCUST.honestPayment({ method: "card", status: "authorized", autopayRequested: true });
      return p.status === "pending_setup";
    }));

  await page.click("#ce-close").catch(() => {});
  await page.waitForTimeout(300);

  // ============ C: the LIFECYCLE — a pre-v39 record, through everything ==
  const legacyId = await page.evaluate(async (S) => {
    // planted straight into IndexedDB: the v39 editor cannot create this
    const rec = {
      id: "legacy-1", first: "Pat", last: "Woo", createdAt: Date.now(), soldAt: Date.now(),
      phones: [], appointments: [], files: [], specialty: [],
      plan: { id: "prem", name: "Premium", monthly: 99, initial: 450 },
      termMonths: 24, billing: "monthly", acct: "active",
      address: { street: "9 Fern Ct", city: "Orem", state: "UT", zip: "84057" },
      payment: {
        method: "card", autopay: true, last4: "4242",           // the OLD shape
        card: { name: "Pat Woo", number: S.PAN, exp: S.EXP },
        ach: { name: "Pat Woo", routing: S.ROUTING, account: S.ACCOUNT, type: "checking" },
        billingAddress: { street: "9 Fern Ct", city: "Orem", state: "UT", zip: "84057" },
      },
    };
    await MDB.put("customers", rec);
    STORE.customers.push(rec);
    return rec.id;
  }, { PAN, EXP, ROUTING, ACCOUNT });

  check("C0 (setup) the planted record really does carry credentials",
    hasSentinel(await page.evaluate((id) => MDB.get("customers", id).then(JSON.stringify), legacyId)));

  // --- step 1: BOOT
  await reboot();
  const afterBoot = await page.evaluate(DUMP);
  check("C1 boot: the purge strips every credential from IndexedDB",
    !hasSentinel(afterBoot), SENTINELS.filter((v) => afterBoot.includes(v)).join(","));
  const bootRec = await page.evaluate((id) => MDB.get("customers", id), legacyId);
  check("C1b boot: the legacy autopay default is dropped, not migrated to intent",
    bootRec.payment.autopay === undefined, JSON.stringify(bootRec.payment));
  check("C1c boot: safe metadata survives (this is a scrub, not a deletion)",
    bootRec.payment.last4 === "4242" && bootRec.payment.billingAddress.zip === "84057" &&
    bootRec.payment.card.name === "Pat Woo", JSON.stringify(bootRec.payment));
  check("C1d boot: the purge is idempotent",
    (await page.evaluate(() => STORE.purgePaymentCredentials())) === 0);

  // --- step 2: NORMALIZE (open the record in the editor and save it)
  await page.evaluate((id) => MCUST.open(id), legacyId);
  await page.waitForTimeout(600);
  await page.click('.ce-tab[data-t="payment"]'); await page.waitForTimeout(300);
  const legacyLine = await page.$eval("#cp-legacy-line", (e) => ({ hidden: e.hidden, t: e.textContent }));
  check("C2 normalize: a legacy last4 is shown as historical reference only",
    legacyLine.hidden === false && /not a payment method on file/i.test(legacyLine.t), legacyLine.t);
  const byLast4 = await page.evaluate(() =>
    MCUST.honestPayment({ last4: "4242", autopay: true }).status);
  check("C2b normalize: a surviving last4 alone never configures the payment",
    byLast4 === "not_configured", byLast4);
  const byMethod = await page.evaluate(() =>
    MCUST.honestPayment({ method: "card", last4: "4242" }).status);
  check("C2c normalize: choosing a method reaches PENDING and stops there",
    byMethod === "pending_setup", byMethod);
  await page.click("#ce-save").catch(async () => { await page.click("#ce-close"); });
  await page.waitForTimeout(800);
  const afterNorm = await page.evaluate(DUMP);
  check("C3 normalize + save: still no credential anywhere",
    !hasSentinel(afterNorm), SENTINELS.filter((v) => afterNorm.includes(v)).join(","));
  const normRec = await page.evaluate((id) => MDB.get("customers", id), legacyId);
  check("C3b normalize: the saved record carries only the safe payment keys",
    Object.keys(normRec.payment).sort().join(",") === "ach,autopayRequested,billingAddress,card,last4,method,status",
    Object.keys(normRec.payment).sort().join(","));
  check("C3c normalize: autopay is NOT claimed from the legacy default",
    normRec.payment.autopayRequested === false, String(normRec.payment.autopayRequested));

  // --- step 3: SYNC MERGE (the wire shape, in both directions)
  const wire = await page.evaluate((id) => {
    const c = STORE.customers.find((x) => x.id === id);
    return JSON.stringify(JSON.parse(JSON.stringify(c)).payment);
  }, legacyId);
  // (the exact bytes the sync engine puts on the wire — a strictly smaller
  // allowlist again — are asserted in tests/sync-test.js, A3/A4/A4b)
  check("C4 sync: the record a push would serialize carries no credential",
    !hasSentinel(wire) && !/"number"/.test(wire) && !/"routing"/.test(wire), wire);
  // and an INBOUND record that still carries one cannot install it
  await page.evaluate(async (a) => {
    const c = STORE.customers.find((x) => x.id === a.id);
    // simulate a merge from a stale teammate device running v38
    const incoming = { payment: { method: "ach", last4: "9999", autopay: true,
      card: { name: "Pat Woo", number: a.PAN, exp: a.EXP },
      ach: { name: "Pat Woo", routing: a.ROUTING, account: a.ACCOUNT, type: "checking" },
      billingAddress: null } };
    Object.assign(c, incoming);
    await MDB.put("customers", c);
  }, { id: legacyId, PAN, EXP, ROUTING, ACCOUNT });
  await reboot();
  const afterMerge = await page.evaluate(DUMP);
  check("C5 sync: a credential arriving from a stale device is purged at the next boot",
    !hasSentinel(afterMerge), SENTINELS.filter((v) => afterMerge.includes(v)).join(","));

  // --- step 4: BACKUP
  const payload = await page.evaluate(async () => {
    const orig = MUI.shareOrDownload;
    let captured = null;
    MUI.shareOrDownload = async (text) => { captured = text; return true; };
    await MVAULT.backup();
    MUI.shareOrDownload = orig;
    return captured;
  });
  check("C6 backup: the file carries no credential", !hasSentinel(payload),
    SENTINELS.filter((v) => payload.includes(v)).join(","));
  const backedUp = JSON.parse(payload).data.customers.find((c) => c.id === legacyId);
  check("C6b backup: payment is rebuilt from the allowlist",
    Object.keys(backedUp.payment).sort().join(",") === "autopayRequested,billingAddress,last4,method,status",
    Object.keys(backedUp.payment).sort().join(","));
  check("C6c backup: no autopay claim and no configured status",
    backedUp.payment.autopayRequested === false && backedUp.payment.status === "not_configured",
    JSON.stringify(backedUp.payment));

  // --- step 5: RESTORE a LEGACY file that still carries them
  const legacyFile = JSON.parse(payload);
  legacyFile.data.customers = legacyFile.data.customers.map((c) => {
    if (c.id !== legacyId) return c;
    return Object.assign({}, c, { payment: Object.assign({}, c.payment, {
      autopay: true,
      card: { name: "Pat Woo", number: PAN, exp: EXP },
      ach: { name: "Pat Woo", routing: ROUTING, account: ACCOUNT, type: "checking" },
    }) });
  });
  await page.evaluate(async (file) => {
    window.confirm = () => true;
    const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
    await MVAULT.restoreFile(new File([blob], "old.json", { type: "application/json" }));
  }, legacyFile);
  await page.waitForTimeout(1800);
  await page.waitForFunction(() => !!(window.STORE && STORE.customers), null, { timeout: 25000 });
  const afterRestore = await page.evaluate(DUMP);
  check("C7 restore: an old backup cannot reinstall a credential",
    !hasSentinel(afterRestore), SENTINELS.filter((v) => afterRestore.includes(v)).join(","));
  const restored = await page.evaluate((id) => MDB.get("customers", id), legacyId);
  check("C7b restore: and cannot reinstate the legacy autopay claim",
    restored.payment.autopayRequested === false && restored.payment.autopay === undefined,
    JSON.stringify(restored.payment));

  // --- step 6: BOOT AGAIN, the whole way round
  await reboot();
  const finalDump = await page.evaluate(DUMP);
  check("C8 a second boot after all of that still holds no credential",
    !hasSentinel(finalDump), SENTINELS.filter((v) => finalDump.includes(v)).join(","));
  check("C8b …and no key named like a credential exists in any payment block",
    await page.evaluate(async () => {
      const bad = ["number", "cardNumber", "pan", "exp", "expiry", "cvv", "cvc",
        "routing", "routingNumber", "account", "accountNumber"];
      const cs = await MDB.getAll("customers");
      return cs.every((c) => {
        const p = c.payment || {};
        return [p, p.card || {}, p.ach || {}].every((o) => bad.every((k) => !(k in o)));
      });
    }));

  // ============ D: the office export tells the same story ============
  const exp = await page.evaluate(async () => {
    const orig = MUI.shareOrDownload;
    let captured = null;
    MUI.shareOrDownload = async (text) => { captured = text; return true; };
    await MCUST.exportAll();
    MUI.shareOrDownload = orig;
    return captured;
  });
  check("D1 the office export carries no credential", !!exp && !hasSentinel(exp));
  check("D2 …and says outright that RALLY captures none",
    /captures NO payment credentials/i.test(exp || ""));

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  console.log("\n=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  await browser.close(); server.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
