const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = require("path").join(__dirname, "..");
const SHOTS = require("path").join(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".png":"image/png",
  ".svg":"image/svg+xml", ".webmanifest":"application/manifest+json", ".json":"application/json", ".pbf":"application/x-protobuf" };
const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split("?")[0]); if (p==="/") p="/index.html";
  fs.readFile(path.join(ROOT,p),(e,d)=>{
    if(e){res.writeHead(404);res.end("nope");return;}
    res.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream"});res.end(d);
  });
});
const ok = [], bad = [];
const check = (name, cond, extra="") => (cond?ok:bad).push(name + (extra?" — "+extra:""));

(async () => {
  await new Promise(r=>server.listen(8815,r));
  const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  // Cloud OFF: this suite exercises the device gate itself and must never
  // create users in the live Supabase project. Set before cloud-config.js
  // runs, whose `||` leaves an existing value alone.
  // This sandbox has no egress to fonts.googleapis.com: the connection is
  // blackholed and resets after ~12.6s. Aborting instantly saves the suite
  // that wait. Boot no longer DEPENDS on it — index.html loads the font
  // non-blocking now, proved by tests/font-boot-test.js.
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript(() => { window.RALLY_CLOUD = { url: "", anonKey: "" }; });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
  page.on("console", m => { if (m.type()==="error" && !/net::ERR_/.test(m.text())) errors.push("CONSOLE: "+m.text()); });
  const sleep = ms => page.waitForTimeout(ms);
  // The service worker claims the page on first load and we deliberately
  // reload on controllerchange, so an evaluate right after goto can lose its
  // execution context. Retry through that instead of failing the run.
  const ev = async (fn, tries = 6) => {
    for (let i = 0; i < tries; i++) {
      try { return await page.evaluate(fn); }
      catch (e) {
        if (!/context was destroyed|Execution context/i.test(e.message) || i === tries - 1) throw e;
        await page.waitForTimeout(250);
      }
    }
  };

  // ---------- 1. fresh device: splash then SIGN IN (always) ----------
  await page.goto("http://localhost:8815/");
  await sleep(250);
  const splashUp = await ev(()=>!document.querySelector("#splash").hidden);
  check("splash covers first paint", splashUp);
  await page.screenshot({ path: `${SHOTS}/A1-splash.png` });

  await page.waitForSelector("#gate:not([hidden])", { timeout: 15000 });
  const m0 = await ev(()=>({
    title: document.querySelector("#gate-title").textContent,
    nameShown: !document.querySelector("#gf-name").hidden,
    splashGone: document.querySelector("#splash").hidden,
    footHidden: document.querySelector("#gate-foot").hidden,
  }));
  // Sign in is the front door on EVERY launch, fresh device included.
  check("fresh device opens in sign-in mode", m0.title === "Sign in", m0.title);
  check("name field hidden on sign-in", !m0.nameShown);
  check("splash hands off to gate", m0.splashGone);
  check("sign-up route offered on an unclaimed device", !m0.footHidden);
  await page.screenshot({ path: `${SHOTS}/A2-signin.png` });

  // swap to create-account and back proves the toggle
  await page.click("#gate-swap-btn");
  await sleep(120);
  const swapped = await page.evaluate(()=>document.querySelector("#gate-title").textContent);
  check("can swap to create account", swapped === "Create account", swapped);
  await page.screenshot({ path: `${SHOTS}/A3-create.png` });

  // short passcode is refused
  await page.fill("#gate-name","John Martin");
  await page.fill("#gate-email","john@example.com");
  await page.fill("#gate-pass","abc");
  await page.click("#gate-submit");
  await sleep(400);
  const shortMsg = await page.evaluate(()=>document.querySelector("#gate-msg").textContent);
  check("short passcode rejected", /at least/i.test(shortMsg), shortMsg);

  // bad email is refused
  await page.fill("#gate-email","not-an-email");
  await page.fill("#gate-pass","knock1234");
  await page.click("#gate-submit");
  await sleep(400);
  const badEmail = await page.evaluate(()=>document.querySelector("#gate-msg").textContent);
  check("invalid email rejected", /valid email/i.test(badEmail), badEmail);

  // real signup unlocks
  await page.fill("#gate-email","john@example.com");
  await page.fill("#gate-pass","knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(()=>document.querySelector("#gate").hidden, null, { timeout: 10000 });
  const afterSignup = await page.evaluate(()=>({
    gateHidden: document.querySelector("#gate").hidden,
    homeActive: document.querySelector("#screen-customers").classList.contains("active"), // Customers is the front tab now
    user: (STORE.currentUser()||{}).name,
    stored: !!STORE.settings.currentUserId,
  }));
  check("signup unlocks the app", afterSignup.gateHidden && afterSignup.homeActive);
  check("signup names the device user", afterSignup.user === "John Martin", afterSignup.user);
  await page.screenshot({ path: `${SHOTS}/A4-unlocked.png` });

  // passcode is NOT stored in the clear anywhere
  const secretLeak = await page.evaluate(async () => {
    const acct = await MDB.kvGet("account", null);
    return {
      hasHash: !!(acct && acct.hash), hasSalt: !!(acct && acct.salt),
      iterations: acct && acct.iterations,
      leaks: JSON.stringify(acct).includes("knock1234"),
    };
  });
  check("passcode never stored in clear", !secretLeak.leaks);
  check("salt + derived hash stored", secretLeak.hasHash && secretLeak.hasSalt);
  check("PBKDF2 iterations >= 200k", secretLeak.iterations >= 200000, String(secretLeak.iterations));

  // ---------- 2. make some data, then verify it survives lock/unlock ----------
  await page.evaluate(async () => {
    await STORE.addKnock({ lat: 38.48, lng: -98.36, disposition: "nothome", dm: false, note: "" });
  });
  const pinsBefore = await page.evaluate(()=>STORE.pins.length);

  // ---------- 3. sign in ONCE — every later launch sails straight in ----------
  await page.reload();
  await page.waitForFunction(()=>window.STORE && window.MAUTH, null, { timeout: 15000 });
  await page.waitForTimeout(2200); // splash settles
  const relaunch = await page.evaluate(()=>({
    gateHidden: document.querySelector("#gate").hidden,
    unlocked: MAUTH.isUnlocked(),
    pins: STORE.pins.length,
  }));
  check("relaunch stays signed in — no gate", relaunch.gateHidden && relaunch.unlocked, JSON.stringify(relaunch));
  check("data survives reload", relaunch.pins === pinsBefore, `${relaunch.pins} vs ${pinsBefore}`);

  // ---------- 4. sign out re-arms the gate, data untouched ----------
  await page.evaluate(()=>MAUTH.signOut());
  await page.reload();
  await page.waitForSelector("#gate:not([hidden])", { timeout: 15000 });
  const locked = await page.evaluate(()=>({
    title: document.querySelector("#gate-title").textContent,
    emailPrefilled: document.querySelector("#gate-email").value,
    pins: STORE.pins.length,
  }));
  check("sign out re-arms the gate", locked.title === "Sign in", locked.title);
  check("email is prefilled on return", locked.emailPrefilled === "john@example.com", locked.emailPrefilled);
  check("sign out keeps the data", locked.pins === pinsBefore, `${locked.pins}`);
  await page.screenshot({ path: `${SHOTS}/A5-locked.png` });

  // ---------- 5. wrong passcode does not unlock ----------
  await page.fill("#gate-pass","wrongpass");
  await page.click("#gate-submit");
  await sleep(700);
  const wrong = await page.evaluate(()=>({
    stillGated: !document.querySelector("#gate").hidden,
    msg: document.querySelector("#gate-msg").textContent,
  }));
  check("wrong passcode stays locked", wrong.stillGated);
  check("failure message is generic", /don.t match/i.test(wrong.msg), wrong.msg);

  // wrong email + right passcode also fails
  await page.fill("#gate-email","someone@else.com");
  await page.fill("#gate-pass","knock1234");
  await page.click("#gate-submit");
  await sleep(700);
  check("wrong email stays locked", await page.evaluate(()=>!document.querySelector("#gate").hidden));

  // ---------- 6. lockout backoff after repeated failures ----------
  await page.fill("#gate-email","john@example.com");
  for (let i=0;i<4;i++){
    await page.fill("#gate-pass","nope"+i);
    await page.click("#gate-submit");
    await sleep(600);
  }
  const lockMsg = await page.evaluate(()=>({
    msg: document.querySelector("#gate-msg").textContent,
    remaining: MAUTH.lockRemainingMs(),
  }));
  check("repeated failures trigger backoff", lockMsg.remaining > 0 || /wait/i.test(lockMsg.msg),
        `${lockMsg.msg} / ${lockMsg.remaining}ms`);
  await page.screenshot({ path: `${SHOTS}/A6-lockout.png` });

  // clear the lock to test the happy path
  await page.evaluate(async () => {
    const a = await MDB.kvGet("account", null);
    a.fails = 0; a.lockedUntil = 0; await MDB.kvSet("account", a);
  });
  await page.reload();
  await page.waitForSelector("#gate:not([hidden])", { timeout: 15000 });

  // ---------- 7. correct passcode WITHOUT remember -> gate returns next launch ----------
  await page.fill("#gate-email","john@example.com");
  await page.fill("#gate-pass","knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(()=>document.querySelector("#gate").hidden, null, { timeout: 10000 });
  check("correct passcode unlocks", await page.evaluate(()=>document.querySelector("#gate").hidden));
  const dataAfter = await page.evaluate(()=>STORE.pins.length);
  check("unlock preserves the knock history", dataAfter === pinsBefore, String(dataAfter));

  // ---------- 7b. once signed in, a relaunch NEVER shows the gate again ----------
  await page.reload();
  await page.waitForFunction(()=>window.MAUTH && window.STORE, null, { timeout: 15000 });
  await page.waitForTimeout(2200);
  check("signed-in session survives relaunch", await page.evaluate(()=>document.querySelector("#gate").hidden && MAUTH.isUnlocked()));

  // ---------- 8. "remember me" = remember my EMAIL on the sign-out screen ----------
  // sign out with remember OFF: the gate shouldn't prefill the email
  await page.evaluate(()=>MAUTH.signOut());
  await page.reload();
  await page.waitForSelector("#gate:not([hidden])", { timeout: 15000 });
  const wasChecked = await page.evaluate(()=>document.querySelector("#gate-remember").getAttribute("aria-checked"));
  if (wasChecked === "true") await page.click("#gate-remember");
  await page.fill("#gate-email","john@example.com");
  await page.fill("#gate-pass","knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(()=>document.querySelector("#gate").hidden, null, { timeout: 10000 });
  await page.evaluate(()=>MAUTH.signOut());
  await page.reload();
  await page.waitForSelector("#gate:not([hidden])", { timeout: 15000 });
  const noRemember = await page.evaluate(()=>({
    email: document.querySelector("#gate-email").value,
  }));
  check("remember off means no email prefill", noRemember.email === "", `"${noRemember.email}"`);

  // sign in with remember ON, sign out again: the email comes back prefilled
  await page.click("#gate-remember");
  await page.fill("#gate-email","john@example.com");
  await page.fill("#gate-pass","knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(()=>document.querySelector("#gate").hidden, null, { timeout: 10000 });
  await page.evaluate(()=>MAUTH.signOut());
  await page.reload();
  await page.waitForSelector("#gate:not([hidden])", { timeout: 15000 });
  const withRemember = await page.evaluate(()=>({
    email: document.querySelector("#gate-email").value,
    checked: document.querySelector("#gate-remember").getAttribute("aria-checked"),
  }));
  check("remember on prefills the email", withRemember.email === "john@example.com", withRemember.email);
  check("remember box comes back checked", withRemember.checked === "true", withRemember.checked);
  await page.fill("#gate-pass","knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(()=>document.querySelector("#gate").hidden, null, { timeout: 10000 });

  // ---------- 8b. leaving the app NEVER locks it — sign in once, stay in ----------
  const trip = await page.evaluate(async () => {
    const set = (v) => Object.defineProperty(document, "hidden", { configurable: true, get: () => v });
    set(true);  document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pagehide"));
    await new Promise(r => setTimeout(r, 150));
    set(false); document.dispatchEvent(new Event("visibilitychange"));
    const ps = new Event("pageshow"); ps.persisted = true; window.dispatchEvent(ps);
    await new Promise(r => setTimeout(r, 120));
    return { gated: !document.querySelector("#gate").hidden, unlocked: MAUTH.isUnlocked(), pins: STORE.pins.length };
  });
  check("a trip away does NOT lock the app", trip.gated === false && trip.unlocked === true, JSON.stringify(trip));
  check("the trip keeps the data", trip.pins === pinsBefore, String(trip.pins));
  const whoAmI = await page.evaluate(()=>MAUTH.accountEmail());
  check("More still shows the signed-in address", whoAmI === "john@example.com", whoAmI);

  // a stray resume signal with no preceding hide must NOT lock a live app
  const stray = await page.evaluate(async () => {
    const before = !document.querySelector("#gate").hidden;
    const set = (v) => Object.defineProperty(document, "hidden", { configurable: true, get: () => v });
    set(false);
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
    await new Promise(r => setTimeout(r, 80));
    return { before, gated: !document.querySelector("#gate").hidden, unlocked: MAUTH.isUnlocked() };
  });
  check("a stray resume event does not lock a running app", stray.gated === false,
        `gatedBefore=${stray.before} gatedAfter=${stray.gated} unlocked=${stray.unlocked}`);


  // ---------- 9. eye toggle ----------
  await page.evaluate(()=>MAUTH.signOut());
  await page.reload();
  await page.waitForSelector("#gate:not([hidden])", { timeout: 15000 });
  const t0 = await page.evaluate(()=>document.querySelector("#gate-pass").type);
  await page.click("#gate-eye");
  const t1 = await page.evaluate(()=>document.querySelector("#gate-pass").type);
  check("eye reveals the passcode", t0==="password" && t1==="text", `${t0}->${t1}`);

  // ---------- 10. forgot is a two-tap confirm, not one ----------
  await page.click("#gate-forgot");
  await sleep(200);
  const warn = await page.evaluate(()=>({
    msg: document.querySelector("#gate-msg").textContent,
    pins: STORE.pins.length,
  }));
  check("forgot explains there is no reset email", /no reset email/i.test(warn.msg), warn.msg.slice(0,60));
  check("first forgot tap erases nothing", warn.pins === pinsBefore);
  await page.screenshot({ path: `${SHOTS}/A7-forgot.png` });

  // ================= REGRESSIONS FROM THE ADVERSARIAL REVIEW =================
  // Each of these reproduces a confirmed defect; they must stay red-proof.

  // --- R1: a claimed device offers NO sign-up route, and MAUTH refuses one ---
  await page.reload();
  await page.waitForSelector("#gate:not([hidden])", { timeout: 15000 });
  const routes = await page.evaluate(()=>({
    swapHidden: document.querySelector("#gate-swap-btn").hidden,
    footHidden: document.querySelector("#gate-foot").hidden,
    forgotShown: !document.querySelector("#gate-forgot").hidden,
  }));
  check("R1 claimed device hides the Sign up button", routes.swapHidden);
  check("R1 claimed device hides 'Create an account'", routes.footHidden);
  check("R1 claimed device still offers Forgot", routes.forgotShown);

  const reKey = await page.evaluate(async () => {
    const before = await MDB.kvGet("account", null);
    let threw = null;
    try { await MAUTH.signUp({ email:"thief@example.com", name:"Thief", password:"stolen123" }); }
    catch (e) { threw = e.message; }
    const after = await MDB.kvGet("account", null);
    return { threw, sameHash: before && after && before.hash === after.hash,
             email: after && after.email, unlocked: MAUTH.isUnlocked() };
  });
  check("R1 signUp refuses to re-key a claimed device", !!reKey.threw, reKey.threw || "did NOT throw");
  check("R1 stored credential is untouched", reKey.sameHash);
  check("R1 owner's email survives the attempt", reKey.email === "john@example.com", reKey.email);
  check("R1 failed re-key does not unlock", reKey.unlocked === false);
  await page.screenshot({ path: `${SHOTS}/A8-claimed-no-signup.png` });

  // --- R2: a failed sign-in disarms the erase confirm ---
  await page.click("#gate-forgot");                       // arm
  await sleep(150);
  const armedMsg = await page.evaluate(()=>document.querySelector("#gate-msg").textContent);
  check("R2 forgot arms with a warning", /Tap again/i.test(armedMsg));
  await page.fill("#gate-email","john@example.com");
  await page.fill("#gate-pass","definitelywrong");        // fail a login in between
  await page.click("#gate-submit");
  await sleep(800);
  await page.click("#gate-forgot");                       // the dangerous second tap
  await sleep(600);
  const afterDisarm = await page.evaluate(()=>({
    msg: document.querySelector("#gate-msg").textContent,
    pins: (window.STORE && STORE.pins.length),
    stillGated: !document.querySelector("#gate").hidden,
  }));
  check("R2 failed login disarms the erase", /Tap again/i.test(afterDisarm.msg),
        "re-warned instead of wiping: " + afterDisarm.msg.slice(0,40));
  check("R2 nothing was erased", afterDisarm.pins === pinsBefore, String(afterDisarm.pins));
  check("R2 device is still locked", afterDisarm.stillGated);

  // --- R3: the device credential never leaves in a backup ---
  await page.evaluate(()=>{ const m=document.querySelector("#gate-msg"); m.hidden=true; });
  await page.fill("#gate-pass","knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(()=>document.querySelector("#gate").hidden, null, { timeout: 10000 });
  const backupKeys = await page.evaluate(async () => {
    let payload = null;
    const orig = MUI.shareOrDownload;
    MUI.shareOrDownload = async (content) => { payload = JSON.parse(content); return true; };
    await MVAULT.backup();
    MUI.shareOrDownload = orig;
    return { keys: (payload.data.kv || []).map(r => r.k),
             hasSettings: (payload.data.kv||[]).some(r => r.k === "settings") };
  });
  check("R3 backup excludes the account credential", !backupKeys.keys.includes("account"), JSON.stringify(backupKeys.keys));
  check("R3 backup excludes the session", !backupKeys.keys.includes("session"));
  check("R3 backup still carries settings", backupKeys.hasSettings);

  // --- R4: restoring a foreign backup cannot re-key or unlock this device ---
  const restored = await page.evaluate(async () => {
    window.confirm = () => true;
    const mine = await MDB.kvGet("account", null);
    const foreign = {
      rally: 1, exportedAt: new Date().toISOString(),
      data: {
        users: [], territories: [], pins: [], events: [], customers: [], files: [],
        kv: [
          { k: "account", v: { email:"attacker@example.com", salt:"AAAA", hash:"BBBB",
                               iterations: 1, userId:"x", fails:0, lockedUntil:0 } },
          { k: "session", v: { userId:"x", at: Date.now(), remember: true } },
        ],
      },
    };
    const f = new File([JSON.stringify(foreign)], "evil.json", { type:"application/json" });
    await MVAULT.restoreFile(f);
    await new Promise(r => setTimeout(r, 300));
    const after = await MDB.kvGet("account", null);
    const sess = await MDB.kvGet("session", null);
    return { emailStill: after && after.email, hashSame: mine && after && mine.hash === after.hash,
             sessionUserId: sess && sess.userId, myHashPrefix: mine && mine.hash.slice(0,6) };
  });
  check("R4 restore cannot overwrite the device credential",
        restored.emailStill === "john@example.com" && restored.hashSame,
        `email=${restored.emailStill} hashSame=${restored.hashSame}`);
  check("R4 restore cannot inject a session", restored.sessionUserId !== "x",
        String(restored.sessionUserId));

  // --- R5: with no account, Forgot is hidden and refuses to erase ---
  await page.evaluate(async () => { await MAUTH.eraseAndReset(); });
  await page.reload();
  await page.waitForSelector("#gate:not([hidden])", { timeout: 20000 });
  const fresh = await page.evaluate(()=>({
    title: document.querySelector("#gate-title").textContent,
    forgotHidden: document.querySelector("#gate-forgot").hidden,
  }));
  check("R5 erased device returns to sign in", fresh.title === "Sign in", fresh.title);
  check("R5 no account means no Forgot control", fresh.forgotHidden);

  // --- R6: the focus ring is visible on the black gate ---
  const ring = await page.evaluate(() => {
    const i = document.querySelector("#gate-email");
    i.focus();
    const cs = getComputedStyle(i.closest(".gf") || i);
    const probe = document.createElement("button");
    document.querySelector("#gate-form").appendChild(probe);
    const oc = getComputedStyle(probe).outlineColor;
    probe.remove();
    return { entryRule: [...document.styleSheets].some(ss => {
      try { return [...ss.cssRules].some(r => r.selectorText === ".entry :focus-visible"); }
      catch(_) { return false; }
    })};
  });
  check("R6 dark entry screens define their own focus ring", ring.entryRule);

  await b.close(); server.close();
  console.log("\n=== PASS (" + ok.length + ") ===");
  ok.forEach(s=>console.log("  ✓ " + s));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach(s=>console.log("  ✗ " + s)); }
  console.log("\nERRORS:", errors.length ? "\n"+errors.join("\n") : "none");
  process.exit(bad.length || errors.length ? 2 : 0);
})();
