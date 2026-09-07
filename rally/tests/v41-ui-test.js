/* RALLY v41 — the TURF SCREENS.

   A rep and a leader open the same Route tab and must see different things,
   because they are answering different questions: a rep asks where to go
   next, a leader asks which hoods are behind and who is on them. And the
   outline editor has to refuse the thing the server would refuse, at the
   moment the leader is dragging — not after they tap Save and get an error
   they cannot act on.

   Runs against a device with NO cloud configured: none of this is about
   sync, and a local device seeds its owner as a manager, which is what the
   leader half needs. The rep half switches the server-authored role the
   same way MCLOUD would.

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/v41-ui-test.js */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8881);

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
    // Cloud OFF: this suite is about the turf SCREENS, not the account
    // system, and must never touch a live project. Set before
    // cloud-config.js runs, whose `||` leaves an existing value alone.
    window.RALLY_CLOUD = { url: "", anonKey: "" };
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/`);
  // the device gate is the front door: create the device account once, or
  // every click below lands on the gate instead of the app
  await page.waitForSelector("#gate:not([hidden])", { timeout: 25000 });
  await page.click("#gate-swap-btn");
  await page.fill("#gate-name", "Turf Tester");
  await page.fill("#gate-email", "turf@example.com");
  await page.fill("#gate-pass", "knock1234");
  await page.click("#gate-submit");
  try {
    await page.waitForFunction(() => document.querySelector("#gate").hidden, null, { timeout: 20000 });
  } catch (e) {
    const why = await page.evaluate(() => ({
      err: (document.querySelector("#gate-msg") || {}).textContent,
      msgHidden: (document.querySelector("#gate-msg") || {}).hidden,
      title: (document.querySelector("#gate-title") || {}).textContent,
      html: document.querySelector("#gate").className,
      fields: Array.from(document.querySelectorAll("#gate input")).map((i) => i.id + "=" + i.value),
    }));
    console.log("GATE STUCK: " + JSON.stringify(why));
    throw e;
  }
  await page.waitForFunction(() => window.STORE && window.MTURF && window.MGEOM, null, { timeout: 25000 });
  await page.waitForTimeout(800);

  try {
    /* Fixtures in METRES, through the app's own projection, so the shapes
       read as they are described rather than as decimal degrees. */
    await page.evaluate(async () => {
      const P = MGEOM.project(40);
      window.__at = (x, y) => { const ll = P.toLngLat(x, y); return [ll[0], ll[1] + 40]; };
      window.__rect = (x0, y0, x1, y1) =>
        [__at(x0, y0), __at(x1, y0), __at(x1, y1), __at(x0, y1)];
      const john = await STORE.addUser({ name: "John", role: "rep" });
      const jake = await STORE.addUser({ name: "Jake", role: "rep" });
      window.__john = john.id; window.__jake = jake.id;
      const a = await STORE.addTerritory({ name: "Alpha", points: __rect(0, 0, 200, 200) });
      const b = await STORE.addTerritory({ name: "Bravo", points: __rect(300, 0, 500, 200) });
      window.__a = a.id; window.__b = b.id;
      // 5 doors in Alpha: 2 worked, 3 not
      for (let i = 0; i < 2; i++) {
        const p = __at(20 + i * 20, 20);
        await STORE.addKnock({ lat: p[1], lng: p[0], disposition: "nothome" });
      }
      for (let i = 0; i < 3; i++) {
        const p = __at(100 + i * 20, 20);
        await STORE.importDoors([{ lat: p[1], lng: p[0], address: "door " + i,
          externalId: "d" + i }], { territoryId: a.id }).catch(async () => {
          await STORE.addKnock({ lat: p[1], lng: p[0], disposition: "unworked" });
        });
      }
      await STORE.setAssignees(a, [john.id]);
    });

    // ------------------------------------------------------------ leader
    section("L — the leader's Route");
    await page.click("#tab-schedule");
    await page.waitForTimeout(500);
    await page.evaluate(() => MTURF.render());
    const leader = await page.evaluate(() => {
      const w = document.querySelector("#sched-turf");
      return { hidden: w.hidden, rows: w.querySelectorAll(".turf-row").length,
        role: STORE.effectiveRole(), manage: STORE.canManageTerritories(),
        text: w.textContent.replace(/\s+/g, " ").trim().slice(0, 260),
        acts: Array.from(w.querySelectorAll(".turf-actions .mini")).map((b) => b.dataset.act) };
    });
    check("L1 the turf block shows on the Route tab", !leader.hidden);
    check("L2 a leader sees EVERY live hood", leader.rows === 2, JSON.stringify(leader));
    check("L3 with the leader-only actions", leader.acts.includes("assign") && leader.acts.includes("cycle"),
      JSON.stringify(leader.acts));
    check("L4 and the headline is doors LEFT, not a percentage",
      /doors? left/i.test(leader.text), leader.text);

    const nums = await page.evaluate(() => {
      const m = STORE.routeMetrics(STORE.territories.find((t) => t.id === __a));
      return { a: m.actionable, w: m.worked, r: m.remaining, pct: m.pct };
    });
    check("L5 the metric identity holds on screen too",
      nums.w + nums.r === nums.a, JSON.stringify(nums));

    // ------------------------------------------------------- assignment
    section("A — who works it");
    await page.evaluate(() => MTURF.openAssign(STORE.territories.find((t) => t.id === __a)));
    await page.waitForTimeout(300);
    check("A1 the sheet opens",
      await page.evaluate(() => !document.querySelector("#turf-assign-sheet").hidden));
    const chips = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#turf-assign-chips .rep-chip"))
        .map((b) => ({ u: b.dataset.u, sel: b.classList.contains("sel") })));
    check("A2 John is already selected",
      chips.some((c) => c.u === "" ? false : c.sel), JSON.stringify(chips));
    // add Jake — a SECOND rep, not a replacement
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("#turf-assign-chips .rep-chip"))
        .find((x) => x.dataset.u === __jake);
      b.click();
    });
    await page.waitForTimeout(150);
    const both = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#turf-assign-chips .rep-chip"))
        .filter((b) => b.dataset.u && b.classList.contains("sel")).length);
    check("A3 picking a second rep ADDS them", both === 2, "selected=" + both);
    check("A4 and the sheet says so",
      /2 reps/.test(await page.textContent("#turf-assign-note")));
    await page.click("#turf-assign-save");
    await page.waitForTimeout(400);
    check("A5 both are current after saving", await page.evaluate(() =>
      STORE.currentAssignees(STORE.territories.find((t) => t.id === __a)).length === 2));
    check("A6 and both see the hood in their own list", await page.evaluate(() =>
      STORE.hoodsOf(__john).length === 1 && STORE.hoodsOf(__jake).length === 1));

    // ------------------------------------------------------------- rep
    section("R — the rep's Route");
    await page.evaluate(() => {
      STORE.roleState = { mode: "server", role: "rep", verifiedAt: Date.now() };
      STORE.settings.currentUserId = __jake;
      MTURF.render();
    });
    await page.waitForTimeout(200);
    const rep = await page.evaluate(() => {
      const w = document.querySelector("#sched-turf");
      return { rows: w.querySelectorAll(".turf-row").length,
        acts: Array.from(w.querySelectorAll(".turf-actions .mini")).map((b) => b.dataset.act) };
    });
    check("R1 a rep sees only the hoods they are on", rep.rows === 1, JSON.stringify(rep));
    check("R2 and gets no leadership controls",
      !rep.acts.includes("assign") && !rep.acts.includes("cycle"), JSON.stringify(rep.acts));
    check("R3 a rep is refused turf management outright",
      await page.evaluate(() => STORE.turfGate().ok === false));
    await page.evaluate(() => {
      STORE.roleState = { mode: "server", role: "manager", verifiedAt: Date.now() };
    });

    // -------------------------------------------------- clear outcomes
    section("Y — Clear Outcomes from the screen");
    const beforeY = await page.evaluate(() => {
      const m = STORE.routeMetrics(STORE.territories.find((t) => t.id === __a));
      return { worked: m.worked, pins: STORE.pins.length,
        hist: STORE.pins.reduce((n, p) => n + (p.history || []).length, 0) };
    });
    await page.evaluate(async () => {
      await STORE.startCycle(STORE.territories.find((t) => t.id === __a));
      MTURF.render();
    });
    const afterY = await page.evaluate(() => {
      const t = STORE.territories.find((x) => x.id === __a);
      const m = STORE.routeMetrics(t);
      return { worked: m.worked, remaining: m.remaining, pins: STORE.pins.length,
        hist: STORE.pins.reduce((n, p) => n + (p.history || []).length, 0),
        pctText: document.querySelector("#sched-turf .turf-pct").textContent };
    });
    check("Y1 worked doors go back to remaining", afterY.worked === 0, JSON.stringify(afterY));
    check("Y2 no pin was deleted", afterY.pins === beforeY.pins);
    check("Y3 no knock was deleted", afterY.hist === beforeY.hist);
    check("Y4 the bar reads 0% on screen", afterY.pctText.trim() === "0%", afterY.pctText);

    // ------------------------------------------------ the outline editor
    section("E — reshaping a hood");
    const opened = await page.evaluate(async () =>
      MTEDIT.open(STORE.territories.find((t) => t.id === __a)));
    await page.waitForTimeout(600);
    check("E1 the editor opens", opened === true);
    const handles = await page.evaluate(() => ({
      vx: document.querySelectorAll(".vx-handle:not(.mid)").length,
      mid: document.querySelectorAll(".vx-handle.mid").length,
      bar: !!document.querySelector(".vx-bar"),
    }));
    check("E2 one handle per corner", handles.vx === 4, JSON.stringify(handles));
    check("E3 plus a midpoint handle per edge, for adding one", handles.mid === 4);
    check("E4 and a bar with the verdict", handles.bar);
    check("E5 which starts valid",
      await page.evaluate(() => document.querySelector("#vx-save").disabled === false));

    /* THE ADVISORY, DRIVEN BY A REAL DRAG. A leader must learn that two
       hoods collide while their finger is still down — not from a server
       error after they tap Save, which they cannot act on and which costs
       a round trip to discover. */
    const TOL = await page.evaluate(() => MGEOM.OVERLAP_TOLERANCE_M2);
    check("E6 the client quotes the SAME 1.0 m² tolerance the server enforces", TOL === 1.0);

    /* Frame BOTH hoods first. focusHood fits Alpha alone, which leaves
       Bravo — and therefore the collision — off screen, and a drag to a
       coordinate outside the viewport is not a drag. */
    await page.evaluate(() => {
      const mid = __at(250, 100);
      MMAP.jumpTo(mid[0], mid[1], 15);
    });
    await page.waitForTimeout(400);

    const before = await page.evaluate(() => document.querySelector("#vx-save").disabled);
    // Alpha's ring is [(0,0),(200,0),(200,200),(0,200)] — index 2 is the
    // corner nearest Bravo. Take the handle's REAL box rather than
    // recomputing the projection by hand.
    const box = await page.locator(".vx-handle:not(.mid)").nth(2).boundingBox();
    const target = await page.evaluate(() => {
      const p = MMAP.project(__at(400, 200)[0], __at(400, 200)[1]);
      const r = document.querySelector("#mapwrap").getBoundingClientRect();
      return { x: r.left + p.x, y: r.top + p.y };
    });
    const vp = page.viewportSize();
    check("E7a both the handle and the target are on screen — otherwise the " +
      "drag below would prove nothing", !!box && target.x > 0 && target.x < vp.width &&
      target.y > 0 && target.y < vp.height, JSON.stringify({ box, target, vp }));
    /* The handle must actually BE at the point we are about to press. It
       was not, once: the editor drew its handles as HTML over the canvas
       but never listened for camera moves, so a pan left every one of them
       pinned to where its corner used to be. */
    const hit = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? String(el.className || el.tagName) : "none";
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    check("E7b the handle follows the camera — it is really under the press point",
      /vx-handle/.test(hit), "elementFromPoint=" + hit);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 14 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const bad = await page.evaluate(() => ({
      disabled: document.querySelector("#vx-save").disabled,
      msg: document.querySelector(".vx-msg").textContent,
      isBad: document.querySelector(".vx-msg").classList.contains("bad"),
    }));
    check("E7 dragging a corner onto a neighbour DISABLES save", bad.disabled && before === false,
      JSON.stringify(bad));
    check("E8 with the reason, naming the hood it hit", /Overlaps .*Bravo/i.test(bad.msg), bad.msg);
    check("E9 and the message is styled as a problem", bad.isBad);

    await page.click("#vx-revert");
    await page.waitForTimeout(200);
    const good = await page.evaluate(() => ({
      disabled: document.querySelector("#vx-save").disabled,
      msg: document.querySelector(".vx-msg").textContent,
      pts: STORE.territories.find((t) => t.id === __a).points.length,
    }));
    check("E10 Undo all puts the outline back and re-enables save",
      good.disabled === false, JSON.stringify(good));
    check("E11 and the stored hood was never modified by the drag", good.pts === 4,
      JSON.stringify(good));

    // adjacency is NOT collision — the whole reason the tolerance exists
    const adjacency = await page.evaluate(() => {
      const shared = __rect(200, 0, 300, 200);   // sits exactly between them
      return {
        left: MGEOM.overlapM2(shared, STORE.territories.find((x) => x.id === __a).points),
        right: MGEOM.overlapM2(shared, STORE.territories.find((x) => x.id === __b).points),
      };
    });
    check("E12 a hood sharing an EDGE with both neighbours overlaps neither",
      adjacency.left === 0 && adjacency.right === 0, JSON.stringify(adjacency));

    // snapping turns a near-miss into a shared boundary
    const snapped = await page.evaluate(() => {
      const near = __at(202, 0);                 // 2 m off Alpha's corner
      const s = MGEOM.snap(near[0], near[1],
        [STORE.territories.find((x) => x.id === __a)], 8);
      if (!s) return null;
      const beforeM2 = MGEOM.overlapM2(__rect(198, 0, 300, 200),
        STORE.territories.find((x) => x.id === __a).points);
      const ring = [[s.lng, s.lat], __at(300, 0), __at(300, 200), __at(200, 200)];
      return { kind: s.kind, before: beforeM2,
        after: MGEOM.overlapM2(ring, STORE.territories.find((x) => x.id === __a).points) };
    });
    check("E13 a corner near a neighbour snaps to it", snapped && snapped.kind === "vertex",
      JSON.stringify(snapped));
    check("E14 a hand-drawn near-miss really does overlap", snapped.before > TOL,
      "m2=" + (snapped && snapped.before));
    check("E15 and snapping removes it entirely", snapped.after === 0,
      "m2=" + (snapped && snapped.after));

    /* MOVING THE WHOLE HOOD. This did not work at all: the map's own
       drag-pan ran alongside and kept the grabbed ground under the finger,
       so the offset stayed zero and the map slid away instead of the
       outline moving. Stopping the pointer event was not enough — the
       engine listens for mousedown and touchstart, which are different
       events — so the editor now takes the camera for the gesture. */
    const beforeMove = await page.evaluate(() =>
      STORE.territories.find((t) => t.id === __a).points.map((p) => p.slice()));
    const inside = await page.evaluate(() => {
      const c = __at(100, 100);
      const p = MMAP.project(c[0], c[1]);
      const r = document.querySelector("#mapwrap").getBoundingClientRect();
      return { x: r.left + p.x, y: r.top + p.y };
    });
    await page.mouse.move(inside.x, inside.y);
    await page.mouse.down();
    await page.mouse.move(inside.x - 40, inside.y - 25, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const moved = await page.evaluate(([b]) => {
      const el = document.querySelectorAll(".vx-handle:not(.mid)");
      const now = window.__vxPoints || null;
      return { handles: el.length, same: JSON.stringify(now) === JSON.stringify(b) };
    }, [beforeMove]);
    const shifted = await page.evaluate(() => {
      // the DRAFT ring is what the editor is holding; compare its centroid
      const hs = Array.from(document.querySelectorAll(".vx-handle:not(.mid)"))
        .map((h) => ({ x: parseFloat(h.style.left), y: parseFloat(h.style.top) }));
      const cx = hs.reduce((n, h) => n + h.x, 0) / hs.length;
      const cy = hs.reduce((n, h) => n + h.y, 0) / hs.length;
      return { cx, cy, n: hs.length };
    });
    check("E17 dragging INSIDE the outline moves the whole hood",
      shifted.n === 4 && shifted.cx > 0, JSON.stringify(shifted));
    const nudged = await page.evaluate(([b]) => {
      const t = STORE.territories.find((x) => x.id === __a);
      // the STORED hood is untouched until Save — the drag is a draft
      return JSON.stringify(t.points) === JSON.stringify(b);
    }, [beforeMove]);
    check("E18 while the stored hood stays untouched until Save", nudged);
    /* And the gesture is NOT a door tap. It used to be: preventDefault on
       the pointerdown suppresses the compatibility mousedown, the engine's
       tap test has nothing to measure the travel against, and a 40-pixel
       hood move ended with a door sheet open over the editor. */
    check("E19 moving the hood does not open a door sheet",
      await page.evaluate(() =>
        !document.querySelector("#knock-sheet").classList.contains("open")));
    await page.click("#vx-revert");
    await page.waitForTimeout(200);

    /* A gesture the browser never finishes must not leave the window
       listening. Close mid-drag, then move the pointer: nothing may react. */
    await page.mouse.move(inside.x, inside.y);
    await page.mouse.down();
    await page.mouse.move(inside.x - 10, inside.y - 10, { steps: 3 });
    await page.evaluate(() => MTEDIT.close(true));
    await page.mouse.move(inside.x - 200, inside.y - 200, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    check("E20 closing mid-gesture leaves nothing listening on the window",
      await page.evaluate(() => document.querySelectorAll(".vx-handle").length === 0
        && !MTEDIT.isOpen()));
    check("E21 and the hood is unchanged by the abandoned drag",
      await page.evaluate(([b]) =>
        JSON.stringify(STORE.territories.find((x) => x.id === __a).points) === JSON.stringify(b),
        [beforeMove]));

    await page.evaluate(() => MTEDIT.close(true));
    check("E16 closing the editor removes every handle",
      await page.evaluate(() => document.querySelectorAll(".vx-handle").length === 0));

    // ------------------------------------------------------- clear DNK
    section("D — clearing a do-not-knock from the door");
    const dnkId = await page.evaluate(async () => {
      const p = await STORE.addKnock({ lat: __at(30, 30)[1], lng: __at(30, 30)[0], disposition: "dnk" });
      return p.id;
    });
    await page.evaluate(() => {
      STORE.roleState = { mode: "server", role: "rep", verifiedAt: Date.now() };
    });
    await page.click("#tab-map");
    await page.waitForTimeout(400);
    await page.evaluate((id) => MMAP.focusPin(id), dnkId);
    await page.waitForTimeout(500);
    check("D1 a REP is not offered the clear",
      await page.evaluate(() => document.querySelector("#lead-clear-dnk").hidden));
    await page.evaluate((id) => {
      STORE.roleState = { mode: "server", role: "manager", verifiedAt: Date.now() };
      MMAP.focusPin(id);
    }, dnkId);
    await page.waitForTimeout(500);
    check("D2 a MANAGER is",
      await page.evaluate(() => document.querySelector("#lead-clear-dnk").hidden === false));
    check("D3 the badge reads the effective outcome",
      /Do Not Knock/i.test(await page.textContent("#lead-badge")),
      await page.textContent("#lead-badge"));

    check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  } finally {
    await ctx.close();
    await browser.close();
    server.close();
  }
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
