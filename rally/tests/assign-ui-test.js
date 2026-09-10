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

    section("the button says what it does — this panel chooses, it does not save");
    await page.evaluate(() => { window.MASSIGN.close(); window.MASSIGN.open({
      preselect: [], subtitle: "x", onSave: async () => {} }); });
    await page.waitForTimeout(120);
    check("with nobody picked it offers to assign nobody",
      (await page.textContent("#assign-save")).trim() === "Assign nobody",
      await page.textContent("#assign-save"));
    check("and it never claims to be saving anything",
      !/save/i.test(await page.textContent("#assign-save")),
      await page.textContent("#assign-save"));
    check("the hint says where the save actually happens",
      /save the hood/i.test(await page.textContent("#assign-hint")));
    await page.evaluate(() => window.MASSIGN.close());

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
    /* THE REAL RENDERER, NOT THE MARKUP. This section used to type
       "Polygon 10 of 100 / 563 / 68" into the DOM itself and then assert it
       back, so it passed with showCard() deleted and tested nothing but
       index.html. It now stubs the SUMMARY — the one thing that would
       otherwise need a server — and calls hoods.js's own showCard. */
    await page.evaluate(async () => {
      const P = MGEOM.project(40);
      const at = (x, y) => { const ll = P.toLngLat(x, y); return [ll[0], ll[1] + 40]; };
      window.__t = await STORE.createTerritory(
        { id: "card-hood", name: "Card Hood", points: [at(0, 0), at(300, 0), at(300, 300), at(0, 300)] }, []);
      window.__t.seq = 10;
      await MDB.put("territories", window.__t);
      window.__realSummary = STORE.territorySummary;
    });
    await page.evaluate(async () => {
      STORE.territorySummary = async () => ({
        source: "server", outlineMissing: false,
        seq: 10, of: 100, houses: 563, sales: 68,
      });
      await window.MHOODS._showCard(window.__t, null);
    });
    await page.waitForTimeout(80);
    // innerText, not textContent: the "this device only" note is in the
    // markup at all times and hidden, and only innerText respects that
    /* Read the VISIBLE text. innerText would be the natural way to skip the
       hidden "this device only" note, but the card sits in a view the
       harness never lays out, so Chromium falls back to textContent for the
       whole subtree. Walking the card's own unhidden children is exact. */
    const visibleCardText = () => page.evaluate(() =>
      [...document.querySelector("#polycard").children]
        .filter((el) => !el.hidden)
        .map((el) => el.textContent).join(" ").replace(/\s+/g, " ").trim());
    const cardText = await visibleCardText();
    check("it reads exactly the two numbers", cardText === "Polygon 10 of 100 563 Houses 68 Sales", cardText);
    check("no drive time, coverage or acreage on it",
      !/drive|acre|%|residential|vacant/i.test(cardText));
    check("the card is actually visible", await page.evaluate(() =>
      !document.querySelector("#polycard").hidden));

    /* A SCAN'S OWN COUNT IS NOT THE TEAM'S COUNT. showCard used to render
       scan.eligible.length — every roof the vendor just returned, including
       the ones the team already holds as pins — over the top of the
       server's number, so the same hood read two different house counts one
       second apart. */
    await page.evaluate(async () => {
      await window.MHOODS._showCard(window.__t, { eligible: new Array(999) });
    });
    await page.waitForTimeout(80);
    check("a fresh scan does not overwrite the team's house count with its own",
      (await page.textContent("#pc-houses")).trim() === "563",
      await page.textContent("#pc-houses"));

    section("a count this device made on its own says so");
    await page.evaluate(async () => {
      STORE.territorySummary = async () => ({
        source: "device", outlineMissing: false,
        seq: 10, of: null, houses: 4, sales: 1,
      });
      await window.MHOODS._showCard(window.__t, null);
    });
    await page.waitForTimeout(80);
    check("the card is labelled as this device's own",
      await page.evaluate(() => !document.querySelector("#pc-note").hidden));
    check("and it does not invent an 'of M' the server never issued",
      (await page.textContent("#pc-id")).trim() === "Polygon 10",
      await page.textContent("#pc-id"));
    await page.evaluate(async () => {
      STORE.territorySummary = async () => ({
        source: "server", outlineMissing: false, seq: 10, of: 100, houses: 563, sales: 68 });
      await window.MHOODS._showCard(window.__t, null);
    });
    await page.waitForTimeout(80);
    check("and the label goes away again on the team's answer",
      await page.evaluate(() => document.querySelector("#pc-note").hidden));
    await page.evaluate(() => { STORE.territorySummary = window.__realSummary; });

    section("the summary is derived, not typed");
    const sum = await page.evaluate(async () => await STORE.territorySummary(window.__t));
    check("a device with no cloud says so", sum.source === "device", JSON.stringify(sum));
    check("and still answers with a house count", typeof sum.houses === "number");
    check("and does NOT guess at the team's denominator", sum.of === null, JSON.stringify(sum));

    check("no uncaught page errors", errors.length === 0, errors.join(" | "));
  } catch (e) {
    fail++; console.log("  ✗ threw: " + e.message);
  }

  await browser.close();
  server.close();
  console.log("\n================================\nPASS " + pass + "   FAIL " + fail);
  process.exit(fail ? 1 : 0);
})();
