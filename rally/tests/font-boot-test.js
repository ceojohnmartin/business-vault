/* Boot resilience — the app must start when Google Fonts does not answer.

   A <link rel="stylesheet"> in <head> is render-blocking, and the browser
   also blocks every subsequent <script> on it. RALLY's fonts come from a
   third-party CDN, so before the fix an unreachable fonts.googleapis.com
   held the entire app on the splash for as long as the network took to give
   up (measured ~12.6s to ERR_CONNECTION_RESET in this sandbox — and
   unbounded on a captive portal or a hostile network that simply never
   answers).

   This suite proves boot no longer depends on that request. The font route
   is fulfilled by a handler that NEVER responds — strictly worse than a
   fast failure, and the case a plain abort could not catch — and the app
   must still reach a usable sign-in gate inside a tight budget while that
   request is still hanging. */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PORT = 8861;
const ok = [], bad = [];
const check = (n, c, x = "") => c ? ok.push(n) : bad.push(n + (x ? " — " + x : ""));

// Boot must complete well inside this. The real-world stall being defended
// against was ~12.6s here and unbounded elsewhere; a healthy boot in this
// sandbox is ~2s, so 6s is generous without being meaningless.
const BUDGET = 6000;

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

// One cold boot. `fontMode` decides what the font CDN does:
//   "hang"  — the request is accepted and never answered (worst case)
//   "abort" — instant failure (the control: a fast, clean error)
async function boot(browser, fontMode) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let fontRequests = 0, fontSettled = 0;
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (route) => {
    fontRequests++;
    if (fontMode === "abort") { fontSettled++; route.abort(); return; }
    // hang: hold the route handle forever and never call fulfill/abort
  });
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
    window.RALLY_CLOUD = { url: "", anonKey: "" }; // local-only; no cloud in this suite
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const t0 = Date.now();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "commit" });
  // scripts running at all is the thing the render-blocking <link> gated
  await page.waitForFunction(() => !!(window.MDB && window.MAUTH && window.STORE),
    null, { timeout: BUDGET + 20000 });
  const scriptsAt = Date.now() - t0;
  await page.waitForSelector("#gate:not([hidden])", { timeout: BUDGET + 20000 });
  const gateAt = Date.now() - t0;

  const state = await page.evaluate(() => {
    const l = document.querySelector('link[href*="fonts.googleapis.com"][rel="stylesheet"]');
    const cs = getComputedStyle(document.body);
    return {
      linkPresent: !!l,
      linkMedia: l ? l.media : null,
      // the CSS variable the whole UI draws from
      uiVar: cs.getPropertyValue("--ui").trim(),
      bodyFont: cs.fontFamily,
      // did the gate actually render with real geometry, not a 0-height stub
      gateBox: (() => { const r = document.querySelector("#gate").getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
      splashHidden: !!document.querySelector("#splash").hidden ||
        getComputedStyle(document.querySelector("#splash")).display === "none",
    };
  });
  await ctx.close();
  return { scriptsAt, gateAt, fontRequests, fontSettled, errors, state };
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

  // ---- the case that matters: the font CDN accepts and never answers
  const hung = await boot(browser, "hang");
  console.log(`\n  cold boot, font CDN HANGING (never answers):`);
  console.log(`    scripts executing: ${hung.scriptsAt}ms`);
  console.log(`    sign-in gate visible: ${hung.gateAt}ms`);
  console.log(`    font requests made: ${hung.fontRequests}, settled: ${hung.fontSettled}`);

  check("1. scripts execute even though the font request never answers",
    hung.scriptsAt < BUDGET, hung.scriptsAt + "ms >= " + BUDGET + "ms");
  check("2. the sign-in gate is usable even though the font request never answers",
    hung.gateAt < BUDGET, hung.gateAt + "ms >= " + BUDGET + "ms");
  check("3. the font request really was still outstanding during boot",
    hung.fontRequests > 0 && hung.fontSettled === 0,
    `requested ${hung.fontRequests}, settled ${hung.fontSettled}`);
  check("4. the splash handed off — the app is not stuck on it", hung.state.splashHidden);
  check("5. the gate rendered with real geometry",
    hung.state.gateBox.w > 300 && hung.state.gateBox.h > 500,
    JSON.stringify(hung.state.gateBox));

  // ---- the fix itself: the font <link> must be non-blocking
  check("6. the Google Fonts stylesheet is loaded non-blocking",
    hung.state.linkPresent && hung.state.linkMedia === "print",
    "media=" + hung.state.linkMedia);
  check("7. a real fallback stack renders text while the font is missing",
    /Helvetica|Arial|sans-serif/i.test(hung.state.uiVar) &&
    /Helvetica|Arial|sans-serif/i.test(hung.state.bodyFont),
    hung.state.uiVar + " | " + hung.state.bodyFont);
  check("8. no page errors during a fontless boot",
    hung.errors.length === 0, hung.errors.slice(0, 3).join("|"));

  // ---- control: a fast font failure must be no faster than the hang.
  // If the two diverge, boot is still waiting on the font somewhere.
  const fast = await boot(browser, "abort");
  console.log(`\n  cold boot, font CDN FAILING FAST (control):`);
  console.log(`    scripts executing: ${fast.scriptsAt}ms`);
  console.log(`    sign-in gate visible: ${fast.gateAt}ms`);
  const delta = hung.gateAt - fast.gateAt;
  console.log(`\n  hang vs fail-fast delta: ${delta >= 0 ? "+" : ""}${delta}ms\n`);
  check("9. a hanging font CDN costs no more boot time than a failing one",
    Math.abs(delta) < 2000, `delta ${delta}ms`);
  check("10. the control boot is itself inside budget",
    fast.gateAt < BUDGET, fast.gateAt + "ms");

  console.log("=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  await browser.close(); server.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
