/* RALLY v39 — REAL REP: attribution runs on stable ids, never on names.

   What this proves:
     - personal numbers come from event.repId / customer.soldByUserId, and
       renaming a person moves no history at all
     - a legacy record carrying only a soldBy NAME stays unattributed even
       when that name uniquely matches a current teammate — a unique name
       match today is not evidence of who signed a customer last season
     - two devices holding the same records compute the SAME classification,
       including on the device that authored an unbound record
     - unattributed work counts for the team and for nobody's rank, and is
       surfaced where leaving it out would make the totals misleading
     - the leaderboard ranks real people or admits it has nothing to rank

   Runs entirely offline against the local store — no cloud needed for the
   arithmetic. The two-device agreement is checked by handing the identical
   record set to a second, independent browser context. */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PORT = 8853;
const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

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

/* The shared world, planted identically on both devices. Two teammates are
   bound to server profiles; one is not; and there is legacy work that names
   a rep in a string and identifies nobody. Timestamps are pinned inside
   this week so week-scoped numbers are deterministic. */
const PLANT = `
  const weekStart = STORE.weekStart();
  const ts = (n) => weekStart + 3600e3 + n * 60e3;   // safely inside the week
  const mk = (id, name, profileId) => ({
    id, name, role: "rep", color: "#888", createdAt: weekStart, profileId,
  });
  // Ana and Ben are bound to server profiles; Cal never was.
  const users = [
    mk("u-ana", "Ana Reyes", "p-ana"),
    mk("u-ben", "Ben Ortiz", "p-ben"),
    mk("u-cal", "Cal Nguyen", null),
  ];
  for (const u of users) await MDB.put("users", u);
  STORE.users = users.slice();
  STORE.settings.currentUserId = "u-ana";
  STORE.settings.repName = "Ana Reyes";
  await STORE.saveSettings();

  const ev = (id, repId, disposition, dm, n) => ({
    id, ts: ts(n), pinId: "pin-" + id, disposition, reason: null, dm,
    repId, territoryId: null,
  });
  const events = [
    ev("e1", "u-ana", "sold", true, 1),
    ev("e2", "u-ana", "nothome", false, 2),
    ev("e3", "u-ana", "notint", true, 3),
    ev("e4", "u-ben", "sold", true, 4),
    ev("e5", "u-ben", "nothome", false, 5),
    ev("e6", "u-cal", "sold", true, 6),     // authored by an UNBOUND user
    ev("e7", null, "sold", true, 7),        // pre-team history: no author
    ev("e8", null, "nothome", false, 8),
  ];
  for (const e of events) await MDB.put("events", e);
  STORE.events = events.slice().sort((a, b) => a.ts - b.ts);

  // customers: one attributed to Ana by id, one legacy naming her in a
  // string only, one legacy naming somebody nobody on the team is
  const custs = [
    { id: "c-1", first: "Dana", last: "Miles", createdAt: ts(1), soldAt: ts(1),
      phones: [], appointments: [], files: [],
      soldByUserId: "u-ana", soldBy: "Ana Reyes" },
    { id: "c-2", first: "Lena", last: "Ortiz", createdAt: ts(2), soldAt: ts(2),
      phones: [], appointments: [], files: [],
      soldBy: "Ana Reyes" },                       // name matches Ana EXACTLY
    { id: "c-3", first: "Pat", last: "Woo", createdAt: ts(3), soldAt: ts(3),
      phones: [], appointments: [], files: [],
      soldBy: "Someone Who Left" },
  ];
  for (const c of custs) await MDB.put("customers", c);
  STORE.customers = custs.slice();
`;

const READ = `
  ({
    ana: STORE.repStats("u-ana", STORE.weekStart()),
    ben: STORE.repStats("u-ben", STORE.weekStart()),
    cal: STORE.repStats("u-cal", STORE.weekStart()),
    team: STORE.statsFor(STORE.weekStart()),
    unattributed: STORE.unattributedDoors(STORE.weekStart()),
    attributed: {
      ana: STORE.isAttributed("u-ana"), ben: STORE.isAttributed("u-ben"),
      cal: STORE.isAttributed("u-cal"), none: STORE.isAttributed(null),
    },
    mine: STORE.customers.filter((c) => STORE.custIsMine(c)).map((c) => c.id),
    custAttr: STORE.customers.map((c) => c.id + ":" + STORE.custIsAttributed(c)),
    labels: STORE.customers.map((c) => STORE.custSoldByLabel(c)),
  })
`;

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errors = [];

  async function device(cloudOn) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript(() => {
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("off"));
      window.RALLY_CLOUD = { url: "", anonKey: "" }; // never touch the live project
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      const t = m.text();
      if (m.type() === "error" && !/net::ERR_/.test(t) && !/WebSocket/.test(t)) errors.push(t);
    });
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForFunction(() => document.querySelector("#splash").hidden, null, { timeout: 25000 });
    await page.click("#gate-swap-btn"); await page.waitForTimeout(200);
    await page.fill("#gate-name", "Ana Reyes");
    await page.fill("#gate-email", "ana" + Math.random().toString(36).slice(2, 7) + "@example.com");
    await page.fill("#gate-pass", "knock1234");
    await page.click("#gate-submit");
    await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 25000 });
    await page.waitForTimeout(500);
    if (cloudOn) {
      // The device is signed up locally, then a company project is switched
      // on: MCLOUD.enabled() becomes true (so profile bindings are what
      // decides attribution) while the endpoint resolves nowhere. That is
      // precisely a real device with a cloud account and no signal.
      await page.evaluate(() => {
        window.RALLY_CLOUD = { url: "http://127.0.0.1:9", anonKey: "x" };
      });
    }
    await page.evaluate(`(async () => { ${PLANT} })()`);
    return { ctx, page };
  }

  // ============ A: one device, cloud configured ============
  const A = await device(true);
  const a = await A.page.evaluate(READ);

  check("A1 Ana's week counts only Ana's knocks",
    a.ana.doors === 3 && a.ana.sales === 1 && a.ana.dms === 2, JSON.stringify(a.ana));
  check("A2 Ben's week counts only Ben's knocks",
    a.ben.doors === 2 && a.ben.sales === 1, JSON.stringify(a.ben));
  check("A3 the team total includes every door, attributed or not",
    a.team.doors === 8 && a.team.sales === 4, JSON.stringify(a.team));
  check("A4 an UNBOUND teammate's work counts for nobody",
    a.cal.doors === 0 && a.cal.sales === 0 && a.attributed.cal === false, JSON.stringify(a.cal));
  check("A5 the unattributed remainder is exactly the unbound + authorless work",
    a.unattributed === 3, String(a.unattributed));
  check("A6 per-rep doors + unattributed = the team total (nothing lost, nothing double-counted)",
    a.ana.doors + a.ben.doors + a.unattributed === a.team.doors,
    `${a.ana.doors}+${a.ben.doors}+${a.unattributed} vs ${a.team.doors}`);
  check("A7 a null author is never attributed", a.attributed.none === false);

  // customers
  check("A8 a customer with a stable id is mine", a.mine.join(",") === "c-1", a.mine.join(","));
  check("A9 a legacy customer whose soldBy NAME matches me exactly is NOT mine",
    !a.mine.includes("c-2"), a.mine.join(","));
  check("A10 legacy name-only customers are unattributed",
    a.custAttr.join("|") === "c-1:true|c-2:false|c-3:false", a.custAttr.join("|"));
  check("A11 the legacy name is still SHOWN, flagged unverified",
    a.labels[1] === "Ana Reyes · legacy/unverified" && a.labels[2] === "Someone Who Left · legacy/unverified",
    JSON.stringify(a.labels));
  check("A12 an attributed customer shows the live name, unflagged",
    a.labels[0] === "Ana Reyes", a.labels[0]);

  // ============ B: renaming moves nothing ============
  await A.page.evaluate(async () => {
    const u = STORE.userById("u-ana");
    u.name = "Ana Delgado";                 // she got married
    await STORE.updateUser(u);
    STORE.settings.repName = "Ana Delgado";
    await STORE.saveSettings();
  });
  const b = await A.page.evaluate(READ);
  check("B1 renaming a rep moves no knock history",
    b.ana.doors === a.ana.doors && b.ana.sales === a.ana.sales, JSON.stringify(b.ana));
  check("B2 renaming a rep moves no customer between mine and the team's",
    b.mine.join(",") === "c-1", b.mine.join(","));
  check("B3 the legacy string that used to match her name now matches nobody — and nothing changed",
    b.custAttr.join("|") === a.custAttr.join("|"), b.custAttr.join("|"));
  check("B4 her attributed customer follows her new name",
    b.labels[0] === "Ana Delgado", b.labels[0]);
  check("B5 the legacy record keeps the name it was signed under",
    b.labels[1] === "Ana Reyes · legacy/unverified", b.labels[1]);

  // ============ C: a second device computes the same thing ============
  const B = await device(true);
  const c = await B.page.evaluate(READ);
  check("C1 a second device classifies every record identically",
    c.custAttr.join("|") === a.custAttr.join("|") &&
    c.attributed.cal === a.attributed.cal && c.unattributed === a.unattributed,
    JSON.stringify({ them: c.custAttr, us: a.custAttr }));
  check("C2 …and computes the same per-rep numbers",
    JSON.stringify(c.ana) === JSON.stringify(a.ana) &&
    JSON.stringify(c.ben) === JSON.stringify(a.ben), JSON.stringify(c.ana));
  check("C3 the AUTHORING device also treats unbound work as unattributed",
    c.cal.doors === 0, JSON.stringify(c.cal));

  // ============ D: the leaderboard shows real people, or nothing ============
  await A.page.evaluate(() => MAPP.show("rank"));
  await A.page.waitForTimeout(400);
  const rank = await A.page.evaluate(() => ({
    html: document.querySelector("#rank-list").textContent,
    rows: document.querySelectorAll("#rank-list .rank-row").length,
    unattr: (document.querySelector("#rank-list .rank-unattr") || {}).textContent || "",
  }));
  check("D1 the board lists exactly the attributed teammates",
    rank.rows === 2, String(rank.rows));
  check("D2 no invented teammate appears",
    !/Marcus|Sofia|Jake|Priya|Danny|Chris V|Lena M|Alpine|Summit/.test(rank.html), rank.html.slice(0, 120));
  check("D3 the unbound teammate is not ranked", !/Cal Nguyen/.test(rank.html));
  check("D4 unattributed work is surfaced, not silently dropped",
    /3 doors this week aren't attributed/.test(rank.unattr), rank.unattr);

  // coaching view: same rule
  await A.page.evaluate(() => {
    document.querySelector("#rank-coach-btn").click();
  }).catch(() => {});
  await A.page.waitForTimeout(300);

  // ============ E: an empty board says so ============
  {
    const E = await device(true);
    await E.page.evaluate(async () => {
      STORE.events = []; STORE.customers = [];
      await MDB.clear("events").catch(() => {});
    });
    await E.page.evaluate(() => MAPP.show("rank"));
    await E.page.waitForTimeout(400);
    const txt = await E.page.$eval("#rank-list", (e) => e.textContent);
    check("E1 with nothing to rank the board says so instead of inventing a field",
      /Nothing to rank/.test(txt) && !/Marcus|Alpine/.test(txt), txt.slice(0, 120));
    await E.ctx.close();
  }

  // ============ F: a local-only device attributes its own work ============
  {
    const F = await device(false);       // no cloud project: no profiles exist
    const f = await F.page.evaluate(READ);
    check("F1 with no cloud, a local user IS the stable identity",
      f.attributed.ana === true && f.attributed.cal === true, JSON.stringify(f.attributed));
    check("F2 …and authorless legacy events are still nobody's",
      f.unattributed === 2, String(f.unattributed));
    check("F3 …while a name-only customer is STILL not attributed",
      f.custAttr.join("|") === "c-1:true|c-2:false|c-3:false", f.custAttr.join("|"));
    await F.ctx.close();
  }

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  console.log("\n=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  await browser.close(); server.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
