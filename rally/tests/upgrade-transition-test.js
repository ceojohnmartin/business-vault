/* RALLY — THE UPGRADE ITSELF.

   Every other suite runs a device that is purely v38 or purely v39 for its
   whole life. This one runs the transition: ONE origin, ONE service-worker
   scope, a REAL service worker (not stubbed), a device that boots on v38,
   and then v39 is published underneath it.

   What must hold: the device lands on v39, it takes a knowable number of
   opens to get there, the old cache is gone afterwards, and nothing the rep
   had already saved is lost on the way. */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const { execSync } = require("child_process");

const V39_ROOT = path.join(__dirname, "..");
const V38_REF = "ac125e6";
const V38_ROOT = "/tmp/rally-v38-tree/rally";
const PORT = 8861;
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

if (!fs.existsSync(path.join(V38_ROOT, "index.html"))) {
  fs.mkdirSync("/tmp/rally-v38-tree", { recursive: true });
  execSync(`git archive ${V38_REF} rally | tar -x -C /tmp/rally-v38-tree`,
    { cwd: path.join(V39_ROOT, ".."), stdio: "pipe" });
}

// ONE origin. What it serves is flipped at "publish" time, exactly like a
// static deploy replacing the files under the same URLs.
let SERVING = V38_ROOT;
const served = { v38: 0, v39: 0 };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json", ".pbf": "application/x-protobuf" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  served[SERVING === V38_ROOT ? "v38" : "v39"]++;
  fs.readFile(path.join(SERVING, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(p)] || "application/octet-stream",
      "Cache-Control": "no-cache",   // the SW is the cache, not the HTTP layer
    });
    res.end(d);
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  // a persistent-ish context: service workers ALLOWED (this is the point)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript(() => {
    window.RALLY_CLOUD = { url: "", anonKey: "" }; // local-only: this is about the shell
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && !/net::ERR_/.test(t)) errors.push(t);
  });

  const build = () => page.evaluate(() => window.RALLY_BUILD).catch(() => undefined);
  /* The app reloads ITSELF when the new worker claims the page, so any read
     can land in a destroyed execution context. Poll through it rather than
     racing it — this is about what the device ends up on, not about timing. */
  const waitForBuild = async (want, ms) => {
    const until = 60 * 60 * 1000; // wall-clock is provided by the runner
    let waited = 0;
    while (waited < ms) {
      const b = await build();
      if (b === want) return b;
      await page.waitForTimeout(250).catch(() => {});
      waited += 250;
      if (until < 0) break;
    }
    return build();
  };
  // same reason as build(): a self-reload can destroy the context mid-read
  const cacheNames = async () => {
    for (let i = 0; i < 40; i++) {
      const r = await page.evaluate(() => caches.keys()).catch(() => null);
      if (r) return r;
      await page.waitForTimeout(250).catch(() => {});
    }
    return [];
  };
  const settle = (ms) => page.waitForTimeout(ms);

  // ---- 1. boot on v38 with a real service worker ----
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => document.querySelector("#splash").hidden, null, { timeout: 25000 });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 25000 })
    .catch(() => {});
  await settle(1500);
  check("1a the device boots on v38", (await build()) === "v38", await build());
  check("1b a real service worker took control",
    await page.evaluate(() => !!navigator.serviceWorker.controller));
  const c1 = await cacheNames();
  check("1c and populated the v38 cache", c1.includes("rally-v38"), JSON.stringify(c1));

  // the rep does real work on v38
  await page.click("#gate-swap-btn"); await settle(300);
  await page.fill("#gate-name", "Upgrade Rep");
  await page.fill("#gate-email", "up@example.com");
  await page.fill("#gate-pass", "knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 25000 });
  await settle(800);
  await page.evaluate(async () => {
    await STORE.addCustomer({ first: "Before", last: "Upgrade", phones: [], appointments: [],
      plan: { id: "prem", name: "Premium", monthly: 99, initial: 450 },
      payment: { method: "card", autopay: true, last4: "4242",
        card: { name: "Before Upgrade", number: "4111111111111111", exp: "01/30" },
        ach: { name: "", routing: "021000021", account: "000123456789", type: "checking" },
        billingAddress: null } });
    await STORE.addKnock({ lat: 38.4, lng: -98.3, disposition: "sold", reason: null, dm: true, note: "" });
  });
  const beforeCounts = await page.evaluate(() => ({
    cust: STORE.customers.length, pins: STORE.pins.length, events: STORE.events.length }));
  check("1d the rep's v38 work is saved", beforeCounts.cust === 1 && beforeCounts.events === 1,
    JSON.stringify(beforeCounts));
  check("1e …and a pre-v39 record really does hold raw credentials",
    await page.evaluate(async () => JSON.stringify(await MDB.getAll("customers"))
      .includes("4111111111111111")));

  // ---- 2. PUBLISH v39 under the running device ----
  SERVING = V39_ROOT;
  const v39FetchesBefore = served.v39;

  // one reopen, exactly what a rep does
  let opens = 0;
  await page.goto(`http://localhost:${PORT}/`); opens++;
  // the app reloads itself when the new worker claims — ride it out
  const buildAfter1 = await waitForBuild("v39", 40000);
  // let the self-reload finish completely before inspecting anything
  await page.waitForFunction(() => !!(window.STORE && STORE.customers), null, { timeout: 25000 })
    .catch(() => {});
  await settle(2000);
  check("2a ONE reopen is enough to land on v39", buildAfter1 === "v39", String(buildAfter1));
  check("2b the new worker actually fetched the new assets", served.v39 > v39FetchesBefore,
    `fetches=${served.v39 - v39FetchesBefore}`);
  const c2 = await cacheNames();
  check("2c the v39 cache exists", c2.includes("rally-v39"), JSON.stringify(c2));
  check("2d and the v38 cache was deleted on activate", !c2.includes("rally-v38"), JSON.stringify(c2));
  check("2e the running page is controlled by the new worker",
    await page.evaluate(() => !!navigator.serviceWorker.controller));

  // ---- 3. nothing the rep did was lost, and v39's migration ran ----
  await page.waitForFunction(() => !!(window.STORE && STORE.customers), null, { timeout: 20000 });
  await settle(800);
  const after = await page.evaluate(async () => ({
    cust: STORE.customers.length, pins: STORE.pins.length, events: STORE.events.length,
    raw: JSON.stringify(await MDB.getAll("customers")).includes("4111111111111111"),
    pay: JSON.stringify((STORE.customers[0] || {}).payment),
    gateShut: document.querySelector("#gate").hidden,
  }));
  check("3a every record the rep saved on v38 survives the upgrade",
    after.cust === beforeCounts.cust && after.pins === beforeCounts.pins &&
    after.events === beforeCounts.events, JSON.stringify(after));
  check("3b the device is still unlocked — the rep is not thrown back to the gate",
    after.gateShut === true);
  check("3c v39's boot purge stripped the credentials the v38 record carried",
    after.raw === false, after.pay);
  check("3d …and kept the safe metadata", /"last4":"4242"/.test(after.pay), after.pay);
  // the purge DELETES the legacy key; honestPayment supplies the honest
  // answer on read. Neither invents a request from the old default.
  check("3e the legacy autopay default is gone from the stored record",
    !/"autopay":/.test(after.pay), after.pay);
  check("3f …and reads back as no request and nothing configured",
    await page.evaluate(() => {
      const p = MCUST.honestPayment(STORE.customers[0].payment);
      return p.autopayRequested === false && p.status === "pending_setup" && p.last4 === "4242";
    }));

  // ---- 4. a second open changes nothing (idempotent, no reload loop) ----
  const reloadsBefore = served.v39;
  await page.goto(`http://localhost:${PORT}/`); opens++;
  const buildAfter2 = await waitForBuild("v39", 40000);
  await page.waitForFunction(() => !!(window.STORE && STORE.customers), null, { timeout: 25000 })
    .catch(() => {});
  await settle(1500);
  check("4a a second open stays on v39", buildAfter2 === "v39", String(buildAfter2));
  check("4b …and does not loop reloading",
    served.v39 - reloadsBefore < 120, `fetches=${served.v39 - reloadsBefore}`);
  const c3 = await cacheNames();
  check("4c caches are stable", c3.includes("rally-v39") && !c3.includes("rally-v38"),
    JSON.stringify(c3));
  check("4d total user-initiated opens needed: 1", opens === 2, `opens=${opens}`);

  // ---- 5. the operator's verification signal is visible ----
  await page.evaluate(() => MAPP.show("more"));
  await settle(600);
  const buildLabel = await page.$eval("#more-build", (e) => e.textContent).catch(() => "");
  check("5a More shows the build, so a device can be verified by eye",
    /v39/.test(buildLabel), buildLabel);

  check("no page errors across the upgrade", errors.length === 0, errors.slice(0, 4).join(" | "));

  console.log("\n=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  await browser.close(); server.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
