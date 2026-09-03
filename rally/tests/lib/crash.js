/* Crash injection at IndexedDB statement boundaries — from the TEST side.

   arm() replaces one window.MDB method in the page with a wrapper that, on
   the Nth call matching `match` (a substring of the first argument, or of the
   second when it is a string), never resolves and raises a flag. The test
   then closes the page: every transaction that had already completed is on
   disk in the context's storage, every in-memory structure is gone — exactly
   what a killed renderer leaves behind. `mode: "reject"` makes the call fail
   instead, for the "transaction aborted" boundary. `after` delays matching
   until some earlier call has been observed, so a boundary can be named
   relative to another ("the cursor write that follows the outbox commit").

   Nothing here touches production code: RALLY has no crash hook, and the
   wrapper lives only in the page being killed. */
async function arm(page, spec) {
  await page.evaluate((spec) => {
    const match = spec.match || "";
    const nth = spec.nth || 1;
    const mode = spec.mode || "hang";
    const after = spec.after || null;
    const hit = (args, want) => {
      const a0 = Array.isArray(args[0]) ? args[0].join(",") : String(args[0]);
      const a1 = args.length > 1 && typeof args[1] === "string" ? args[1] : "";
      return !want || a0.includes(want) || a1.includes(want);
    };
    window.__crash = { spec, hit: false, calls: 0, gate: !after };
    if (after) {
      const origA = MDB[after.method];
      MDB[after.method] = function (...args) {
        if (!window.__crash.gate && hit(args, after.match)) window.__crash.gate = true;
        return origA.apply(this, args);
      };
    }
    const orig = MDB[spec.method];
    let n = 0;
    MDB[spec.method] = function (...args) {
      if (window.__crash.gate && hit(args, match) && ++n === nth) {
        window.__crash.hit = true;
        window.__crash.calls = n;
        if (mode === "reject") return Promise.reject(new Error("crash-injected abort"));
        return new Promise(() => {});
      }
      return orig.apply(this, args);
    };
  }, spec);
}

async function waitHit(page, ms = 20000) {
  for (let w = 0; w < ms; w += 50) {
    const s = await page.evaluate(() => window.__crash && window.__crash.hit).catch(() => false);
    if (s) return true;
    await page.waitForTimeout(50);
  }
  return false;
}

module.exports = { arm, waitHit };
