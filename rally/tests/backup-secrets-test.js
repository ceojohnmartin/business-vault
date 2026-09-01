/* Security hotfix — a backup file is a data archive, not a key ring, and
   not a wallet either.
   Drives the real app: seeds distinctive sentinel credentials into
   settings AND raw card/ACH numbers onto a customer, exports a real backup
   through MVAULT.backup(), and proves no credential field name and no
   credential VALUE — provider key or payment instrument — survives the
   export. Then proves the restore side: a legacy backup that still carries
   either kind cannot overwrite or install them on this device, while
   ordinary settings and records restore exactly as before. */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PORT = 8856;
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

// sentinels: if any of these strings appear anywhere in the export, a
// secret leaked — they are deliberately unmistakable
const SENT = {
  frKey: "SENTINEL-FR-KEY-a1b2c3",
  frToken: "SENTINEL-FR-TOKEN-d4e5f6",
  regridKey: "SENTINEL-REGRID-g7h8i9",
  googleKey: "SENTINEL-GOOGLE-j1k2l3",
  googleSession: "SENTINEL-GSESSION-m4n5o6",
};
const CRED_FIELDS = ["frKey", "frToken", "regridKey", "googleKey", "googleSessions"];

// Raw payment instruments. Same rule: an unmistakable value that must
// never appear in a backup file, and a field name that must never appear
// under a customer's payment object. RALLY captures no CVV/security code
// anywhere, so there is no such field to test for.
const PAY = {
  cardName: "SENTINEL-CARDNAME-Dana-Miles",
  number: "SENTINEL-PAN-4111111111111111",
  exp: "SENTINEL-EXP-12-29",
  achName: "SENTINEL-ACHNAME-Dana-Miles",
  routing: "SENTINEL-ROUTING-021000021",
  account: "SENTINEL-ACCOUNT-000123456789",
};
// the raw containers and their fields: none may survive an export. Matched
// as JSON KEYS ("card":) not bare strings — "method":"card" is a legitimate
// value and must not read as a leak.
const PAY_FIELDS = ["card", "ach", "number", "exp", "routing", "account"];
// what a backup IS allowed to carry — the same safe shape the FieldRoutes
// export, the sync engine and the server-side trigger all reduce to
const PAY_SAFE = { method: "card", last4: "4242",
  billingAddress: { street: "18 Vine St", city: "Provo", state: "UT", zip: "84604" } };
// v39 payment keys a backup MAY carry. No credential key is on this list,
// and none can be: the block is rebuilt from the allowlist, not filtered.
const PAY_SAFE_KEYS = "autopayRequested,billingAddress,last4,method,status";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(d);
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // This sandbox has no egress to fonts.googleapis.com: the connection is
  // blackholed and resets after ~12.6s. Aborting instantly keeps the suite
  // from paying that every run. (index.html now loads the font
  // non-blocking, so boot no longer depends on this — see font-boot-test.)
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" }; // local-only; no cloud in this suite
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
  await page.click("#gate-swap-btn"); await page.waitForTimeout(200);
  await page.fill("#gate-name", "Sec"); await page.fill("#gate-email", "sec@example.com");
  await page.fill("#gate-pass", "knock1234"); await page.click("#gate-submit");
  await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 20000 });
  await page.waitForTimeout(600);

  // ---- seed real-looking credentials + ordinary settings, and one customer
  await page.evaluate(async (S) => {
    Object.assign(STORE.settings, {
      frSubdomain: "homewise", frKey: S.frKey, frToken: S.frToken,
      regridKey: S.regridKey, googleKey: S.googleKey,
      googleSessions: { hybrid: { session: S.googleSession, expiry: "9999999999" } },
      companyName: "Home Wise Pest", companyLicense: "0051HP",
      companyPhone: "385-580-3160", doorGoal: 88, teamName: "The Crew",
    });
    await STORE.saveSettings();
    await STORE.addKnock({ lat: 38.48, lng: -98.36, disposition: "nothome",
      reason: null, dm: false, note: "" });
  }, SENT);

  // a real customer carrying RAW card + ACH credentials, exactly as the
  // sale screen stores them on this device
  const custId = await page.evaluate(async (P) => {
    const c = await STORE.addCustomer({
      first: "Dana", last: "Miles", phones: [], appointments: [],
      address: { street: "18 Vine St", city: "Provo", state: "UT", zip: "84604" },
      plan: { id: "prem", name: "Premium", monthly: 69, initial: 149 },
      payment: {
        method: "card", autopay: true, last4: "4242",
        card: { name: P.cardName, number: P.number, exp: P.exp },
        ach: { name: P.achName, routing: P.routing, account: P.account, type: "checking" },
        billingAddress: { street: "18 Vine St", city: "Provo", state: "UT", zip: "84604" },
      },
    });
    return c.id;
  }, PAY);

  // ---- capture a REAL export (intercept the share/download step)
  const payload = await page.evaluate(async () => {
    const orig = MUI.shareOrDownload;
    let captured = null;
    MUI.shareOrDownload = async (text) => { captured = text; return true; };
    await MVAULT.backup();
    MUI.shareOrDownload = orig;
    return captured;
  });
  check("export produced a backup payload", !!payload && payload.length > 100);

  const parsed = JSON.parse(payload);
  const kvSettings = (parsed.data.kv || []).find((r) => r.k === "settings");

  // 1. zero credential FIELD NAMES anywhere in the export
  const fieldHits = CRED_FIELDS.filter((f) => payload.includes('"' + f + '"'));
  check("1. exported backup contains zero credential field names",
    fieldHits.length === 0, fieldHits.join(","));

  // 2. zero credential VALUES anywhere in the export
  const valueHits = Object.entries(SENT).filter(([, v]) => payload.includes(v)).map(([k]) => k);
  check("2. exported backup contains zero secret values",
    valueHits.length === 0, valueHits.join(","));

  // 3. ordinary settings still export
  check("3. ordinary settings still export",
    !!kvSettings && kvSettings.v.companyName === "Home Wise Pest" &&
    kvSettings.v.companyLicense === "0051HP" && kvSettings.v.doorGoal === 88 &&
    kvSettings.v.teamName === "The Crew" && kvSettings.v.frSubdomain === "homewise",
    JSON.stringify(kvSettings && kvSettings.v).slice(0, 160));
  check("3b. the live settings object was NOT mutated by exporting",
    await page.evaluate((S) => STORE.settings.frKey === S.frKey &&
      STORE.settings.googleKey === S.googleKey, SENT));

  // ---- payment: the export must carry metadata only
  const expCust = (parsed.data.customers || []).find((c) => c.id === custId);
  check("P1. the customer is present in the export", !!expCust);
  const payKeys = expCust && expCust.payment ? Object.keys(expCust.payment).sort() : [];
  check("P1b. exported payment carries ONLY the v39 safe keys",
    payKeys.join(",") === PAY_SAFE_KEYS, payKeys.join(","));

  // 1. no raw payment field name appears anywhere in the serialized backup
  const payFieldHits = PAY_FIELDS.filter((f) => payload.includes('"' + f + '":'));
  check("P2. exported backup contains zero raw payment field names",
    payFieldHits.length === 0, payFieldHits.join(","));

  // 2. no raw payment VALUE appears anywhere in the serialized backup
  const payValueHits = Object.entries(PAY).filter(([, v]) => payload.includes(v)).map(([k]) => k);
  check("P3. exported backup contains zero payment sentinel values",
    payValueHits.length === 0, payValueHits.join(","));
  check("P3b. the whole payload contains no SENTINEL-PAN/ROUTING/ACCOUNT at all",
    !/SENTINEL-(PAN|ROUTING|ACCOUNT|EXP|CARDNAME|ACHNAME)/.test(payload));

  // 3. the safe metadata DID survive — this is a scrub, not a deletion
  check("P4. safe payment metadata still exports",
    expCust && expCust.payment && expCust.payment.method === PAY_SAFE.method &&
    expCust.payment.last4 === PAY_SAFE.last4 &&
    expCust.payment.billingAddress &&
    expCust.payment.billingAddress.zip === PAY_SAFE.billingAddress.zip,
    JSON.stringify(expCust && expCust.payment));
  // the legacy record carried autopay:true — the OLD DEFAULT. It must not
  // come out the other side as a customer request, and status must not be
  // inferred from the surviving last4.
  check("P4b. legacy autopay:true is NOT exported as a customer request",
    expCust && expCust.payment.autopayRequested === false,
    String(expCust && expCust.payment.autopayRequested));
  check("P4c. a legacy last4 does not make the payment look configured",
    expCust && expCust.payment.status === "not_configured",
    String(expCust && expCust.payment.status));
  check("P5. ordinary customer data still exports",
    expCust && expCust.first === "Dana" && expCust.last === "Miles" &&
    expCust.address && expCust.address.street === "18 Vine St" &&
    expCust.plan && expCust.plan.monthly === 69);

  // 4. v39 INVERTS v38 here. v38 kept the raw card on the device so the rep
  // could run the sale; v39 keeps no credential anywhere, so a reload must
  // leave the pre-v39 record stripped in IndexedDB itself.
  await page.reload();
  await page.waitForFunction(() => !!(window.MDB && window.STORE && STORE.customers), null, { timeout: 20000 });
  const purged = await page.evaluate(async (id) => {
    const c = await MDB.get("customers", id);
    return { raw: JSON.stringify(c && c.payment), keys: Object.keys((c && c.payment) || {}).sort().join(",") };
  }, custId);
  check("P6. the boot purge strips a pre-v39 record's raw payment from IndexedDB",
    !/SENTINEL-(PAN|ROUTING|ACCOUNT|EXP)/.test(purged.raw), purged.raw.slice(0, 160));
  check("P6b. and drops the legacy autopay default rather than migrating it",
    !/"autopay":/.test(purged.raw), purged.keys);
  // idempotent: a second run changes nothing and reports nothing to do
  const second = await page.evaluate(() => STORE.purgePaymentCredentials());
  check("P6c. the purge is idempotent — a second pass finds nothing",
    second === 0, String(second));

  // ---- 4. a LEGACY backup (still carrying credentials) must not overwrite
  const legacy = JSON.parse(payload);
  legacy.data.kv = [{ k: "settings", v: {
    companyName: "Restored Co", companyLicense: "9999XX", doorGoal: 42,
    teamName: "Old Team", frSubdomain: "oldsub",
    // the dangerous part: an old file from before this fix
    frKey: "ATTACKER-FR-KEY", frToken: "ATTACKER-FR-TOKEN",
    regridKey: "ATTACKER-REGRID", googleKey: "ATTACKER-GOOGLE",
    googleSessions: { hybrid: { session: "ATTACKER-SESSION", expiry: "1" } },
  } }];
  // ...and the other dangerous part: an old file that still carries raw
  // card/ACH numbers, both for a customer this device ALREADY has (must not
  // be overwritten) and for one it has never seen (must not be installed).
  const ATK = {
    card: { name: "ATTACKER-CARDNAME", number: "ATTACKER-PAN-5555444433332222", exp: "ATTACKER-EXP-01-30" },
    ach: { name: "ATTACKER-ACHNAME", routing: "ATTACKER-ROUTING-999999999",
      account: "ATTACKER-ACCOUNT-987654321", type: "savings" },
  };
  legacy.data.customers = [
    { id: "restored-cust-1", first: "Lena", last: "Ortiz",
      createdAt: Date.now(), phones: [], appointments: [],
      address: { street: "9 Fern Ct", city: "Orem", state: "UT", zip: "84057" },
      payment: { method: "ach", autopay: false, last4: "2222",
        card: ATK.card, ach: ATK.ach,
        billingAddress: { street: "9 Fern Ct", city: "Orem", state: "UT", zip: "84057" } } },
    { id: custId, first: "Dana", last: "Miles",
      createdAt: Date.now(), phones: [], appointments: [],
      payment: { method: "ach", autopay: false, last4: "9999",
        card: ATK.card, ach: ATK.ach, billingAddress: null } },
  ];

  await page.evaluate(async (file) => {
    window.confirm = () => true;            // the restore prompt
    const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
    await MVAULT.restoreFile(new File([blob], "old-backup.json", { type: "application/json" }));
  }, legacy);
  // restoreFile reloads the page 900ms later by design — ride it out and
  // wait for the app to come back before inspecting storage
  await page.waitForTimeout(1600);
  await page.waitForFunction(() => !!(window.MDB && window.STORE), null, { timeout: 20000 });

  const after = await page.evaluate(() => MDB.kvGet("settings", null));
  check("4. legacy credentials in a backup cannot overwrite this device's keys",
    after.frKey === SENT.frKey && after.frToken === SENT.frToken &&
    after.regridKey === SENT.regridKey && after.googleKey === SENT.googleKey &&
    after.googleSessions && after.googleSessions.hybrid.session === SENT.googleSession,
    JSON.stringify({ fr: after.frKey, g: after.googleKey }).slice(0, 120));
  check("4b. no attacker value was written into settings",
    !JSON.stringify(after).includes("ATTACKER"));

  // 5. a normal restore still works — ordinary settings and records land
  check("5. ordinary settings restored from the backup",
    after.companyName === "Restored Co" && after.companyLicense === "9999XX" &&
    after.doorGoal === 42 && after.teamName === "Old Team",
    JSON.stringify({ n: after.companyName, g: after.doorGoal }));
  const restoredCust = await page.evaluate(() => MDB.get("customers", "restored-cust-1"));
  check("5b. records restore normally", !!restoredCust && restoredCust.last === "Ortiz");

  // ---- payment, restore side
  const dana = await page.evaluate((id) => MDB.get("customers", id), custId);
  check("P7. a legacy backup cannot restore payment credentials onto an EXISTING record",
    !!dana && dana.payment && !dana.payment.card && !dana.payment.ach &&
    !JSON.stringify(dana).includes("ATTACKER"),
    JSON.stringify(dana && dana.payment));
  check("P8. a legacy backup cannot INSTALL payment credentials for a new customer",
    !!restoredCust && restoredCust.payment &&
    !restoredCust.payment.card && !restoredCust.payment.ach &&
    Object.keys(restoredCust.payment).sort().join(",") === PAY_SAFE_KEYS,
    JSON.stringify(restoredCust && restoredCust.payment));
  check("P9. no ATTACKER payment value landed in ANY customer record",
    !(await page.evaluate(() => MDB.getAll("customers")))
      .some((c) => JSON.stringify(c).includes("ATTACKER")));
  check("P10. safe payment metadata DOES restore for the new customer",
    !!restoredCust && restoredCust.payment.method === "ach" &&
    restoredCust.payment.last4 === "2222" && restoredCust.payment.autopayRequested === false &&
    restoredCust.payment.billingAddress && restoredCust.payment.billingAddress.zip === "84057",
    JSON.stringify(restoredCust && restoredCust.payment));
  check("P11. ordinary customer fields still restore alongside",
    !!restoredCust && restoredCust.first === "Lena" &&
    restoredCust.address && restoredCust.address.street === "9 Fern Ct");

  // a device with NO keys yet must not gain any from a legacy file either
  await page.evaluate(async () => {
    const s = await MDB.kvGet("settings", null);
    ["frKey", "frToken", "regridKey", "googleKey", "googleSessions"].forEach((k) => { delete s[k]; });
    await MDB.kvSet("settings", s);
  });
  await page.evaluate(async (file) => {
    window.confirm = () => true;
    const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
    await MVAULT.restoreFile(new File([blob], "old-backup.json", { type: "application/json" }));
  }, legacy);
  await page.waitForTimeout(1600);
  await page.waitForFunction(() => !!(window.MDB && window.STORE), null, { timeout: 20000 });
  const clean = await page.evaluate(() => MDB.kvGet("settings", null));
  check("6. a key-less device gains NO credentials from a legacy backup",
    !clean.frKey && !clean.frToken && !clean.regridKey && !clean.googleKey && !clean.googleSessions
    && !JSON.stringify(clean).includes("ATTACKER"),
    JSON.stringify(clean).slice(0, 140));

  check("no page errors", errors.length === 0, errors.slice(0, 3).join("|"));

  console.log("\n=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  await browser.close(); server.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
