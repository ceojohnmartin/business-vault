/* RALLY v42 — THE REFUSAL LIST.

   v39 shipped the refusal COUNT — the red pill on the Map, the line on the
   More screen — and shipped MSYNC.refusals() to back it, described in its
   own source as "for the More screen". The screen was never built. So a rep
   could be told "6 refused" by two different surfaces and had nowhere in the
   app to find out which six, and the answer only existed in a DevTools
   console the phone that shows the pill does not have.

   This suite proves the screen tells the truth, in four ways that matter:

     IT NAMES REAL WORK. A hood the server refuses is listed by ITS NAME, not
     by its id, and the row survives the record being gone from the device.

     IT DOES NOT CRY WOLF. The engine records a delete that changed no rows
     as status 403 — its own marker, not an HTTP answer. Read back naively
     that says "permission denied, your work is gone" about a record that is
     safe and still on the server. The screen must say the opposite.

     THE COPY CARRIES NO CUSTOMER. The button exists so somebody can paste
     this into a message; ids, ops and status codes diagnose a refusal and
     customer names and addresses do not, so the report must not contain
     them even though the screen above it does.

     THE CHIP GOES WHERE IT POINTS. "6 refused" opened the customer book.

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/refusals-test.js */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8884);

let pass = 0, fail = 0;
const check = (n, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + n); }
  else { fail++; console.log("  ✗ " + n + (detail ? " — " + detail : "")); }
};
const section = (t) => console.log("\n== " + t);

// ---------------- mock Supabase: takes everything but turf ----------------
const TEAM = "11111111-1111-4111-a111-111111111111";
const mock = { users: {}, profiles: {}, access: {}, refresh: {},
               territoryPosts: 0, refuseTerritories: true, refuseTurfShape: false };
function addUser(email, password, prof) {
  const id = crypto.randomUUID();
  mock.users[String(email).toLowerCase()] = { id, password };
  mock.profiles[id] = Object.assign(
    { id, team_id: TEAM, role: "rep", name: email, email: String(email).toLowerCase(),
      disabled: false }, prof);
  return id;
}
function mint(id) {
  const a = "at-" + crypto.randomBytes(8).toString("hex");
  const r = "rt-" + crypto.randomBytes(8).toString("hex");
  mock.access[a] = id; mock.refresh[r] = id;
  return { access_token: a, refresh_token: r, token_type: "bearer",
           expires_in: 3600, user: { id, email: "" } };
}
const j = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
  ".pbf": "application/x-protobuf" };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/auth/v1/") || u.pathname.startsWith("/rest/v1/")) {
    let raw = "";
    req.on("data", (c) => raw += c);
    req.on("end", () => {
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch (_) {}
      if (u.pathname === "/auth/v1/token") {
        if (u.searchParams.get("grant_type") === "password") {
          const usr = mock.users[String(body.email || "").toLowerCase()];
          if (!usr || usr.password !== body.password)
            return j(res, 400, { error_description: "Invalid login credentials" });
          const s = mint(usr.id); s.user.email = body.email;
          return j(res, 200, s);
        }
        if (u.searchParams.get("grant_type") === "refresh_token") {
          const id = mock.refresh[body.refresh_token];
          if (!id) return j(res, 400, { error_description: "Invalid Refresh Token" });
          return j(res, 200, mint(id));
        }
        return j(res, 400, { error_description: "unsupported grant" });
      }
      if (u.pathname === "/auth/v1/signup") {
        const email = String(body.email || "").toLowerCase();
        if (mock.users[email]) return j(res, 400, { error_description: "User already registered" });
        const id = addUser(email, body.password, { name: (body.data && body.data.name) || "" });
        const s = mint(id); s.user.email = email;
        return j(res, 200, s);
      }
      if (u.pathname === "/auth/v1/logout") return j(res, 204);

      const uid = mock.access[String(req.headers.authorization || "").replace(/^Bearer /, "")];
      if (!uid) return j(res, 401, { message: "JWT invalid" });

      if (u.pathname.startsWith("/rest/v1/rpc/")) {
        // v41 capabilities: this device's server has none switched on, which
        // is the legacy path and exactly what the refusal case needs
        return j(res, 200, {});
      }
      const table = u.pathname.replace("/rest/v1/", "");
      if (u.pathname === "/rest/v1/profiles") {
        return j(res, 200, Object.values(mock.profiles).filter((p) => p.team_id === TEAM));
      }
      if (req.method === "GET") return j(res, 200, []);   // nothing to pull

      /* THE REFUSAL. Turf is the one thing this server will not take —
         which is what RLS does to a rep's territory write in production. */
      if (table === "territories") {
        mock.territoryPosts++;
        if (mock.refuseTerritories) {
          return j(res, 403, { message: "new row violates row-level security policy" });
        }
        if (mock.refuseTurfShape) {
          /* what territories_derive_geom actually raises — 22023, which
             PostgREST returns as 400, carrying English written for the rep */
          return j(res, 400, { code: "22023", message:
            "turf: the outline crosses itself or is otherwise invalid " +
            "(Self-intersection[-91.15 30.45]). Move a corner so the boundary " +
            "never doubles back through itself." });
        }
      }
      return j(res, 201, []);
    });
    return;
  }
  let p = decodeURIComponent(u.pathname); if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(d);
  });
});

const sub = () => "#more-refused-sub";
/* The sheet covers the More screen behind a veil, so the row that opens it
   is only reachable once it is shut. Every re-open in this suite goes
   through the real row and the real veil, not through an internal call. */
async function reopen(page) {
  if (await page.$eval("#refused-sheet", (e) => e.classList.contains("open"))) {
    await page.click("#refused-sheet .grab");
    await page.waitForTimeout(200);
  }
  await page.click("#more-refused");
  await page.waitForTimeout(300);
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript(`window.RALLY_CLOUD = { url: "http://localhost:${PORT}", anonKey: "test-anon" };`);
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));

  addUser("rep@x.com", "knock1234", { name: "Rep One", role: "rep" });

  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
  await page.fill("#gate-email", "rep@x.com");
  await page.fill("#gate-pass", "knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 25000 });
  await page.waitForFunction(() => window.MSYNC && MSYNC.status().loaded, null, { timeout: 25000 });

  // ================= A: a clean device says so =================
  section("A — nothing refused");
  await page.click("#tab-more");
  await page.waitForTimeout(150);
  check("A1 the row is on the More screen once the cloud is on",
    await page.isVisible("#more-refused"));
  /* `.hidden` is not proof on its own: .more-item sets display:flex, which
     outranks the UA stylesheet's [hidden] rule. It works only because
     app.css carries [hidden]{display:none!important} — so this asserts what
     the eye sees, not what the property says. */
  check("A1b and a local-only device would not show it at all",
    await page.evaluate(() => {
      const el = document.querySelector("#more-refused");
      el.hidden = true;
      const shown = getComputedStyle(el).display !== "none";
      el.hidden = false;
      return !shown;
    }));
  check("A2 and it says nothing was refused",
    /Nothing refused/i.test(await page.$eval(sub(), (e) => e.textContent)),
    await page.$eval(sub(), (e) => e.textContent));
  await page.click("#more-refused");
  await page.waitForTimeout(200);
  check("A3 the sheet opens", await page.$eval("#refused-sheet", (e) => e.classList.contains("open")));
  check("A4 with an honest empty state",
    /Nothing has been refused/i.test(await page.$eval("#refused-list", (e) => e.textContent)));
  check("A5 and both actions are disabled — there is nothing to copy",
    await page.$eval("#refused-copy", (e) => e.disabled)
    && await page.$eval("#refused-share", (e) => e.disabled));
  await page.click("#refused-sheet .grab");
  await page.waitForTimeout(150);

  // ============ B: a real refusal, end to end through the engine ============
  section("B — the server refuses a hood");
  const hoodId = await page.evaluate(async () => {
    const t = await STORE.addTerritory({
      name: "Cypress Bend", color: "#2E86FF",
      points: [[-91.1, 30.4], [-91.0, 30.4], [-91.0, 30.5], [-91.1, 30.5]],
    });
    await MSYNC.syncNow();
    return t.id;
  });
  await page.waitForFunction(() => MSYNC.status().refused > 0, null, { timeout: 20000 });
  check("B1 the server was actually asked", mock.territoryPosts > 0, String(mock.territoryPosts));
  check("B2 the engine parked exactly one refusal",
    (await page.evaluate(() => MSYNC.status().refused)) === 1);
  const dead = await page.evaluate(() => MSYNC.refusals());
  check("B3 the dead-letter records the op it was refused doing",
    dead.length === 1 && dead[0].op === "upsert", JSON.stringify(dead[0]));

  await page.click("#tab-more");
  await page.waitForTimeout(200);
  check("B4 More reports the count",
    /1 record the server would not accept/.test(await page.$eval(sub(), (e) => e.textContent)),
    await page.$eval(sub(), (e) => e.textContent));
  check("B5 and the row is dressed as a refusal, not as ordinary settings",
    await page.$eval("#more-refused", (e) => e.classList.contains("refused")));

  await reopen(page);
  const rowText = await page.$eval("#refused-list", (e) => e.textContent);
  check("B6 the hood is named, not shown as an id", /Cypress Bend/.test(rowText), rowText.slice(0, 200));
  check("B7 the reason is the one a rep can act on",
    /role may not save hoods/i.test(rowText), rowText.slice(0, 300));
  check("B8 the op is shown as a save", /Save/.test(rowText));
  check("B9 the raw detail is there for whoever is diagnosing",
    rowText.includes(hoodId) && /territories/.test(rowText) && /403/.test(rowText));
  check("B10 both actions are live now",
    !(await page.$eval("#refused-copy", (e) => e.disabled))
    && !(await page.$eval("#refused-share", (e) => e.disabled)));

  /* The Map chip repaints every cycle and the More row did not, so a refusal
     landing while More was open left the two quoting different numbers. */
  section("B* — the count updates under the rep's eyes");
  await page.evaluate(async () => {
    await STORE.addTerritory({ name: "Second Hood", color: "#F5B301",
      points: [[-91.3, 30.4], [-91.2, 30.4], [-91.2, 30.5], [-91.3, 30.5]] });
    await MSYNC.syncNow();
  });
  await page.waitForTimeout(600);
  check("B11 the More row followed a refusal that landed while it was open",
    /2 records the server would not accept/.test(await page.$eval(sub(), (e) => e.textContent)),
    await page.$eval(sub(), (e) => e.textContent));
  check("B12 and the Map chip agrees, without the rep navigating anywhere",
    /2 refused/.test(await page.$eval("#sync-chip-n", (e) => e.textContent)),
    await page.$eval("#sync-chip-n", (e) => e.textContent));

  // ================= C: the copy, and what it must not carry =================
  section("C — the copy is diagnostics, not customer data");
  await page.evaluate(async () => {
    // a customer with a real name and address, refused, so the report has
    // something to leak if it is going to leak anything
    await STORE.addCustomer({ first: "Marguerite", last: "Thibodeaux",
      address: { street: "4417 Perkins Rd", city: "Baton Rouge", state: "LA", zip: "70808" } });
  }).catch(() => {});
  await page.evaluate(async () => {
    const cust = STORE.customers[0];
    const dead = (await MDB.kvGet("syncDead", null)) || [];
    dead.push({ k: "customers:" + (cust ? cust.id : "c1"), table: "customers",
                id: cust ? cust.id : "c1", status: 403, at: Date.now(), op: "upsert" });
    await MDB.kvSet("syncDead", dead);
  });
  await reopen(page);
  const withCust = await page.$eval("#refused-list", (e) => e.textContent);
  check("C1 the screen DOES name the customer — a rep needs to know which one",
    /Marguerite Thibodeaux/.test(withCust));
  await page.click("#refused-copy");
  await page.waitForTimeout(300);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  check("C2 something was copied", copied.length > 40, copied.slice(0, 80));
  check("C3 the copy carries the ids", copied.includes(hoodId));
  // read from the page, not written here: a release bump must not fail this
  const liveBuild = await page.evaluate(() => window.RALLY_BUILD);
  check("C4 the copy carries the build", copied.includes(liveBuild), liveBuild);
  check("C5 the copy names NO customer", !/Marguerite|Thibodeaux/.test(copied), copied);
  check("C6 the copy carries NO address", !/Perkins/.test(copied) && !/Baton Rouge/.test(copied), copied);
  check("C7 and it says so, so nobody goes looking for more",
    /no customer details/i.test(copied));

  // ================= D: the delete that is not a loss =================
  section("D — a refused delete is not a permission denial");
  await page.evaluate(async () => {
    await MDB.kvSet("syncDead", [{ k: "pins:p-deleted", table: "pins", id: "p-deleted",
      status: 403, at: Date.now(), op: "delete" }]);
  });
  await reopen(page);
  const delText = await page.$eval("#refused-list", (e) => e.textContent);
  check("D1 it is shown as a delete", /Delete/.test(delText), delText.slice(0, 200));
  check("D2 and says the record is SAFE, not that it was denied",
    /still on the server/i.test(delText) && /nothing was lost/i.test(delText),
    delText.slice(0, 300));
  check("D3 it never reads as a permission refusal",
    !/role may not/i.test(delText), delText.slice(0, 300));

  // ================= E: entries written before v42 =================
  section("E — a refusal parked by an older build");
  await page.evaluate(async () => {
    await MDB.kvSet("syncDead", [{ k: "territories:t-old", table: "territories",
      id: "t-old", status: 403, at: Date.now() }]);   // no `op`: pre-v42
  });
  await reopen(page);
  const oldText = await page.$eval("#refused-list", (e) => e.textContent);
  check("E1 it still lists", /A hood/.test(oldText), oldText.slice(0, 200));
  check("E2 and says 'Sent' rather than inventing an op",
    /Sent/.test(oldText) && !/Save|Delete/.test(oldText), oldText.slice(0, 200));
  check("E3 a record the device no longer holds is said plainly",
    /no longer on this device/i.test(oldText), oldText.slice(0, 250));

  // ================= F: a split =================
  section("F — a refused Smart Split");
  await page.evaluate(async () => {
    await MDB.kvSet("syncDead", [{ k: "splits:op-1", table: "splits", id: "op-1",
      status: 404, at: Date.now(), op: "split" }]);
  });
  await reopen(page);
  const splitText = await page.$eval("#refused-list", (e) => e.textContent);
  check("F1 a 404 split is a deployment fact, not a permission one",
    /not switched on/i.test(splitText), splitText.slice(0, 250));
  check("F2 and the rep is told the hood is intact",
    /nothing was lost/i.test(splitText) || /back exactly as it was/i.test(splitText));

  // ============ I: a refusal the rep has since worked on again ============
  section("I — changed since, and queued to try again");
  await page.evaluate(async () => {
    await MDB.kvSet("syncDead", [{ k: "territories:t-retry", table: "territories",
      id: "t-retry", status: 403, at: Date.now(), op: "upsert" }]);
  });
  await reopen(page);
  check("I1 a parked row with nothing queued says nothing about retrying",
    !/offered again/i.test(await page.$eval("#refused-list", (e) => e.textContent)));
  /* A refusal empties the outbox of that row. If it is queued NOW the rep
     has changed it since — and the list must say so, or it reads as an
     outstanding problem when it is already on its way back up. */
  await ctx.route(/\/(auth|rest)\/v1\//, (r) => r.abort());
  await page.evaluate(() => MSYNC.queue("territories", "t-retry"));
  await page.waitForTimeout(200);
  await reopen(page);
  const retryText = await page.$eval("#refused-list", (e) => e.textContent);
  check("I2 once it is queued again, the row says so",
    /offered again on the next sync/i.test(retryText), retryText.slice(0, 300));
  await page.click("#refused-copy");
  await page.waitForTimeout(300);
  const retryCopy = await page.evaluate(() => navigator.clipboard.readText());
  check("I3 and the copy carries the same fact", /\(queued again\)/.test(retryCopy), retryCopy);
  await ctx.unroute(/\/(auth|rest)\/v1\//);

  // ============ J: the server's own sentence reaches the screen ============
  section("J — the words the server actually sent");
  await page.evaluate(async () => {
    await MDB.kvSet("syncDead", [
      { k: "territories:t-geom", table: "territories", id: "t-geom", status: 400,
        at: Date.now(), op: "upsert", msg: "turf: the outline crosses itself or is " +
          "otherwise invalid (Self-intersection[-91.15 30.45]). Move a corner so the " +
          "boundary never doubles back through itself." },
      { k: "territories:t-rls", table: "territories", id: "t-rls", status: 403,
        at: Date.now() - 1000, op: "upsert",
        msg: 'new row violates row-level security policy for table "territories"' },
    ]);
  });
  await reopen(page);
  const jText = await page.$eval("#refused-list", (e) => e.textContent);
  check("J1 our own trigger's sentence becomes the headline reason",
    /outline crosses itself/.test(jText) && /Move a corner/.test(jText), jText.slice(0, 300));
  check("J2 and its `turf:` prefix is not shown to the rep", !/turf:/.test(jText));
  check("J3 PostgREST's own jargon does NOT become the headline",
    /role may not save hoods/.test(jText), jText.slice(0, 400));
  check("J4 but it is still there on the diagnostic line",
    /row-level security policy/.test(jText));
  await page.click("#refused-copy");
  await page.waitForTimeout(300);
  const jCopy = await page.evaluate(() => navigator.clipboard.readText());
  check("J5 the copy carries OUR message — it is ours and it diagnoses",
    /outline crosses itself/.test(jCopy), jCopy);
  /* Anything the server says that is NOT one of our two prefixes could in
     principle echo a column value, and this text is going into a message. */
  check("J6 the copy carries no message we did not write",
    !/row-level security/.test(jCopy), jCopy);

  // ============ K: dismissing a refusal that cannot be acted on ============
  section("K — dismissing a refusal that has been read");
  check("K1 both rows are listed before dismissing",
    (await page.$$("#refused-list .ref-row")).length === 2);
  const pendingBeforeDismiss = await page.evaluate(() => MSYNC.status().pending);
  const hoodsBeforeDismiss = await page.evaluate(() => STORE.territories.length);
  await page.click("#refused-list .ref-row:first-child .ref-x");
  await page.waitForTimeout(400);
  check("K2 the row is gone from the list",
    (await page.$$("#refused-list .ref-row")).length === 1);
  check("K3 the engine's count agrees",
    (await page.evaluate(() => MSYNC.status().refused)) === 1);
  check("K4 the dead-letter really lost it, not just the screen",
    (await page.evaluate(() => MSYNC.refusals())).length === 1);
  /* Dismissing clears the LOG. It must never touch the record, and must
     never put the row back in the outbox — so the queue is compared with
     what it held a moment ago, not with zero (section I deliberately left
     one row queued). */
  check("K5 dismissing queued nothing and un-queued nothing",
    (await page.evaluate(() => MSYNC.status().pending)) === pendingBeforeDismiss,
    "before=" + pendingBeforeDismiss + " after=" + (await page.evaluate(() => MSYNC.status().pending)));
  await page.click("#refused-list .ref-row:first-child .ref-x");
  await page.waitForTimeout(400);
  check("K6 dismissing the last one empties the list honestly",
    /Nothing has been refused/i.test(await page.$eval("#refused-list", (e) => e.textContent)));
  check("K6b dismissing never touched the records themselves",
    (await page.evaluate(() => STORE.territories.length)) === hoodsBeforeDismiss);
  check("K7 and More says so too",
    /Nothing refused/i.test(await page.$eval(sub(), (e) => e.textContent)),
    await page.$eval(sub(), (e) => e.textContent));

  // ============ L: a bad outline never gets saved in the first place ============
  /* Driven through MHOODS.createFromPoints -> the real hood sheet -> the real
     #hood-save, which is the same saveHoodInner every drawing path ends in.
     Asserting on the source text would have proved only that a string is
     present in a file. */
  section("L — the outline is checked when it is drawn");
  if (await page.$eval("#refused-sheet", (e) => e.classList.contains("open"))) {
    await page.click("#refused-sheet .grab");
    await page.waitForTimeout(200);
  }
  const BOWTIE = [[-91.20, 30.40], [-91.10, 30.50], [-91.10, 30.40], [-91.20, 30.50]];
  const CLEAN  = [[-91.90, 30.90], [-91.88, 30.90], [-91.88, 30.92], [-91.90, 30.92]];
  const hoodsBefore = await page.evaluate(() => STORE.territories.length);
  await page.evaluate((pts) => MHOODS.createFromPoints(pts), BOWTIE);
  await page.waitForTimeout(300);
  await page.click("#hood-save");
  await page.waitForTimeout(700);
  check("L1 the bowtie was NOT saved",
    (await page.evaluate(() => STORE.territories.length)) === hoodsBefore,
    "before=" + hoodsBefore + " after=" + (await page.evaluate(() => STORE.territories.length)));
  const toastText = await page.$eval("#toast", (e) => e.textContent);
  check("L2 and the rep was told what is wrong, in words they can act on",
    /crosses itself/i.test(toastText), toastText);
  check("L3 the message names the corner, as the server's does",
    /-91\.|30\./.test(toastText), toastText);
  /* The check must not have become a wall in front of ordinary drawing. */
  const cleanOk = await page.evaluate((pts) => MGEOM.validate(pts).ok, CLEAN);
  check("L4 a clean outline still passes the same checker", cleanOk === true);
  check("L5 nothing was queued for a hood that was never made",
    (await page.evaluate(() => MSYNC.status().pending)) === pendingBeforeDismiss);
  /* Refusing the save must NOT close the sheet. The outline is still drawn,
     still on screen and still draggable — telling someone their boundary
     crosses itself and then throwing the boundary away would be worse than
     saving it broken. */
  check("L6 the sheet stays open so the outline can be fixed, not lost",
    await page.$eval("#hood-sheet", (e) => e.classList.contains("open")));
  await page.click("#hood-sheet .grab");
  await page.waitForTimeout(250);

  // ================= G: the chip answers its own question =================
  section("G — the Map chip");
  if (await page.$eval("#refused-sheet", (e) => e.classList.contains("open"))) {
    await page.click("#refused-sheet .grab");
    await page.waitForTimeout(200);
  }
  /* A REAL refusal, not a seeded row: the chip reads the engine's own
     counter, which only a genuine dead-letter moves. Section I left a
     territory queued and the network is live again, so one cycle is enough
     — and it exercises the whole path the rep's phone actually walks. */
  await page.evaluate(async () => {
    await MDB.kvSet("syncDead", []);
    // a real hood with a clean outline: the mock refuses ALL turf, so this
    // walks the whole push -> refusal -> dead-letter -> repaint path
    await STORE.addTerritory({ name: "Chip Hood", color: "#7C5CFC",
      points: [[-92.5, 31.0], [-92.4, 31.0], [-92.4, 31.1], [-92.5, 31.1]] });
    await MSYNC.syncNow();
  });
  await page.waitForFunction(() => MSYNC.status().refused > 0, null, { timeout: 20000 });
  await page.click("#tab-map");
  await page.waitForTimeout(400);
  await page.waitForTimeout(500);
  check("G1 the chip is showing the refusal",
    /refused/.test(await page.$eval("#sync-chip-n", (e) => e.textContent)),
    await page.$eval("#sync-chip-n", (e) => e.textContent));
  /* This device has no doors yet, so the first-door hint is out too — and it
     used to be written to the chip's exact spot at the same z-index, which
     made the chip untappable on the very phone most likely to show one. */
  check("G1b the chip is not buried under the first-door hint",
    await page.evaluate(() => {
      const c = document.querySelector("#sync-chip").getBoundingClientRect();
      const top = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
      return !!(top && top.closest("#sync-chip"));
    }));
  await page.click("#sync-chip");
  await page.waitForTimeout(300);
  check("G2 tapping it opens the list, not the customer book",
    await page.$eval("#refused-sheet", (e) => e.classList.contains("open")));
  check("G3 and the map is still the screen behind it",
    await page.$eval("#screen-map", (e) => e.classList.contains("active")));

  // ============ M: the turf menu stays on the screen ============
  /* It lived in the .map-actions flex column, so the column was as wide as
     the menu and the menu was as wide as its longest line — and a rep who
     has signed in is listed by their EMAIL. One long address pushed the
     whole panel off the right edge of the phone with its buttons
     unreachable. Nothing in the battery looked at whether a control was
     still ON the screen, so nothing caught it. */
  section("M — the turf menu fits the phone");
  if (await page.$eval("#refused-sheet", (e) => e.classList.contains("open"))) {
    await page.click("#refused-sheet .grab");
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => {
    // a manager sees the rep panel; the long address is the whole point
    STORE.roleState = Object.assign({}, STORE.roleState, { role: "owner" });
    STORE.users = [{ id: "u-long", name: "johnmartin24@icloud.com",
                     role: "rep", color: "#2E86FF", createdAt: Date.now() }];
    if (window.MMAP) MMAP.refreshHoods();
  });
  await page.click("#tab-map");
  await page.waitForTimeout(300);
  await page.click("#fab-hoods");
  await page.waitForTimeout(400);
  const box = await page.evaluate(() => {
    const el = document.querySelector("#hood-menu");
    if (!el || el.hidden) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, width: r.width, vw: window.innerWidth };
  });
  check("M1 the menu is open", !!box, JSON.stringify(box));
  check("M2 its right edge is on the screen",
    box && box.right <= box.vw + 0.5, JSON.stringify(box));
  check("M3 and so is its left edge — it did not just overflow the other way",
    box && box.left >= -0.5, JSON.stringify(box));
  check("M4 it is never wider than the phone",
    box && box.width <= box.vw, JSON.stringify(box));
  /* Reachability is the thing the owner actually lost: a button whose
     centre is off-screen cannot be tapped, whatever the box says. */
  const reachable = await page.evaluate(() => {
    const out = [];
    for (const sel of ["#hood-pencil", "#hood-dots", "#hood-lasso", "#hood-heat"]) {
      const el = document.querySelector(sel);
      if (!el) { out.push([sel, "missing"]); continue; }
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      out.push([sel, cx > 0 && cx < window.innerWidth && hit && el.contains(hit) ? "ok" : "unreachable"]);
    }
    return out;
  });
  check("M5 every option in the menu can actually be tapped",
    reachable.every((r) => r[1] === "ok"), JSON.stringify(reachable));
  const repRow = await page.evaluate(() => {
    const el = document.querySelector("#hood-reps-panel .rep-row");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { right: r.right, vw: window.innerWidth };
  });
  check("M6 a rep row carrying a long email stays on the screen too",
    !repRow || repRow.right <= repRow.vw + 0.5, JSON.stringify(repRow));

  section("H — no console errors anywhere in the run");
  check("H1 the page threw nothing", errors.length === 0, errors.join(" | "));

  await browser.close();
  server.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
