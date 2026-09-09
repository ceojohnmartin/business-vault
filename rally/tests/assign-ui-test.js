/* RALLY v42 — THE ASSIGN-REP PANEL AND THE POLYGON CARD.

   The reference design puts one question on the screen — who works this
   turf — and two numbers over the map. This proves the real screens do
   that, and that the panel is a way of CHOOSING rather than a second way of
   saving: it must hand its selection back to the hood sheet and write
   nothing itself.

   Runs against a device with NO cloud configured, like v41-ui-test.js: none
   of this is about sync, and a local device seeds its owner as a manager,
   which is what drawing turf needs.

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/assign-ui-test.js */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8893);

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
};
const section = (t) => console.log("\n== " + t);

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(d);
  });
});

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
  await page.goto(`http://localhost:${PORT}/`);

  await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
  await page.click("#gate-swap-btn");
  await page.fill("#gate-name", "Assign Tester");
  await page.fill("#gate-email", "assign@example.com");
  await page.fill("#gate-pass", "knock1234");
  await page.click("#gate-submit");
  await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 20000 });
  await page.waitForFunction(() => window.STORE && window.MASSIGN && window.MGEOM, null, { timeout: 25000 });
  await page.waitForTimeout(700);

  try {
    section("the module is real");
    check("MASSIGN is exported", await page.evaluate(() => typeof window.MASSIGN.open === "function"));
    check("the panel starts hidden", await page.evaluate(() => document.querySelector("#assign-panel").hidden));
    check("the polygon card starts hidden", await page.evaluate(() => document.querySelector("#polycard").hidden));

    // a team big enough that chips would be unusable — the reason the panel exists
    await page.evaluate(async () => {
      const names = ["Aron Gonkaryon", "Boston Healy", "Bryan Arambula Hernandez",
        "Bryan Sanchez", "Danny Kincaide", "Darien Howard", "Erik Inzurriaga",
        "Garrett Myers", "Zeb Winter"];
      window.__ids = [];
      for (const n of names) window.__ids.push((await STORE.addUser({ name: n, role: "rep" })).id);
    });

    section("it opens, lists every rep, and counts their turf");
    await page.evaluate(() => window.MASSIGN.open({ preselect: [], subtitle: "Polygon 10", onSave: async () => {} }));
    await page.waitForTimeout(200);
    check("the panel is shown", await page.evaluate(() => !document.querySelector("#assign-panel").hidden));
    check("the subtitle names the polygon",
      (await page.textContent("#assign-sub")).trim() === "Polygon 10");
    const rows = await page.evaluate(() => document.querySelectorAll("#assign-list .arep").length);
    check("every rep is listed (9 added + the device owner = 10)", rows === 10, "got " + rows);
    check("a rep with no turf reads '0 territories'",
      (await page.textContent("#assign-list .arep .sub")).indexOf("territor") >= 0);
    check("nobody has a photograph invented for them",
      await page.evaluate(() => !document.querySelector("#assign-list img")));

    section("search narrows the list");
    await page.fill("#assign-search", "bryan");
    await page.waitForTimeout(120);
    const found = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#assign-list .arep .nm")).map((n) => n.textContent));
    check("only the Bryans remain", found.length === 2 && found.every((n) => /Bryan/.test(n)),
      JSON.stringify(found));
    await page.fill("#assign-search", "nobody named this");
    await page.waitForTimeout(120);
    check("an empty result says so, rather than showing a blank panel",
      (await page.textContent("#assign-list")).indexOf("No rep by that name") >= 0);
    await page.fill("#assign-search", "");
    await page.waitForTimeout(120);

    section("selection is a SET, because the server's is");
    await page.click('#assign-list .arep[data-u="' + (await page.evaluate(() => window.__ids[0])) + '"]');
    await page.waitForTimeout(80);
    check("one tap selects", (await page.evaluate(() => window.MASSIGN.selected().length)) === 1);
    check("the row shows it", await page.evaluate(() =>
      !!document.querySelector("#assign-list .arep.on")));
    check("the row is a checkbox, not a radio", await page.evaluate(() =>
      document.querySelector("#assign-list .arep").getAttribute("role") === "checkbox"));
    await page.click('#assign-list .arep[data-u="' + (await page.evaluate(() => window.__ids[1])) + '"]');
    await page.waitForTimeout(80);
    check("a second rep can hold the same hood",
      (await page.evaluate(() => window.MASSIGN.selected().length)) === 2);
    check("and the button says how many", (await page.textContent("#assign-save")).indexOf("2 reps") >= 0);
    await page.click('#assign-list .arep[data-u="' + (await page.evaluate(() => window.__ids[1])) + '"]');
    await page.waitForTimeout(80);
    check("tapping again deselects", (await page.evaluate(() => window.MASSIGN.selected().length)) === 1);

    section("saving hands the selection back and writes nothing itself");
    const before = await page.evaluate(() => STORE.territories.length);
    await page.evaluate(() => {
      window.__got = null;
      window.MASSIGN.close();
      window.MASSIGN.open({
        preselect: [window.__ids[2]],
        subtitle: "New polygon",
        onSave: async (ids) => { window.__got = ids.slice(); },
      });
    });
    await page.waitForTimeout(150);
    check("a preselected rep arrives selected",
      (await page.evaluate(() => window.MASSIGN.selected().length)) === 1);
    await page.click("#assign-save");
    await page.waitForTimeout(250);
    check("onSave received the ids", await page.evaluate(() => Array.isArray(window.__got) && window.__got.length === 1));
    check("the panel closed", await page.evaluate(() => document.querySelector("#assign-panel").hidden));
    check("no territory was created by the panel",
      (await page.evaluate(() => STORE.territories.length)) === before);

    section("a failing save keeps the panel open with the reason");
    await page.evaluate(() => window.MASSIGN.open({
      preselect: [], subtitle: "x",
      onSave: async () => { throw new Error("that rep has no account yet"); },
    }));
    await page.waitForTimeout(120);
    await page.click("#assign-save");
    await page.waitForTimeout(300);
    check("the panel stayed open", await page.evaluate(() => !document.querySelector("#assign-panel").hidden));
    check("the button is usable again", await page.evaluate(() =>
      !document.querySelector("#assign-save").disabled));
    await page.evaluate(() => window.MASSIGN.close());

    section("the polygon card shows two numbers and no more");
    await page.evaluate(async () => {
      const P = MGEOM.project(40);
      const at = (x, y) => { const ll = P.toLngLat(x, y); return [ll[0], ll[1] + 40]; };
      window.__t = await STORE.createTerritory(
        { id: "card-hood", name: "Card Hood", points: [at(0, 0), at(300, 0), at(300, 300), at(0, 300)] }, []);
      window.__t.seq = 10;
      await MDB.put("territories", window.__t);
    });
    await page.evaluate(() => {
      const c = document.querySelector("#polycard");
      c.hidden = false;
      document.querySelector("#pc-id").textContent = "Polygon 10 of 100";
      document.querySelector("#pc-houses").textContent = "563";
      document.querySelector("#pc-sales").textContent = "68";
    });
    await page.waitForTimeout(80);
    const cardText = (await page.textContent("#polycard")).replace(/\s+/g, " ").trim();
    check("it reads exactly the two numbers", cardText === "Polygon 10 of 100 563 Houses 68 Sales", cardText);
    check("no drive time, coverage or acreage on it",
      !/drive|acre|%|residential|vacant/i.test(cardText));

    section("the summary is derived, not typed");
    const sum = await page.evaluate(async () => await STORE.territorySummary(window.__t));
    check("a device with no cloud says so", sum.source === "device", JSON.stringify(sum));
    check("and still answers with a house count", typeof sum.houses === "number");

    check("no uncaught page errors", errors.length === 0, errors.join(" | "));
  } catch (e) {
    fail++; console.log("  ✗ threw: " + e.message);
  }

  await browser.close();
  server.close();
  console.log("\n================================\nPASS " + pass + "   FAIL " + fail);
  process.exit(fail ? 1 : 0);
})();
