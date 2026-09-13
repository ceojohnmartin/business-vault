/* RALLY — hoods: rep territories drawn on the map.
   Two ways to cut an area, matching how the big apps do it:
     ✏️  Pencil — freehand-trace the boundary with a finger (Aptive-style)
     📍  Corners — tap dot-to-dot and close the box (FieldRoutes-style)
   A hood gets a name, a rep, and a color; it renders as a tinted polygon
   with a label, under the pins. All local-first in IndexedDB. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, tick } = MUI;

  let mode = null;          // null | "pencil" | "dots" | "lasso"
  let dots = [];            // [[lng,lat],...] while tap-drawing
  /* REDO. Undo alone punishes a slip: a manager who removes one corner too
     many had to re-place it by eye, and on a traced boundary "by eye" is a
     different shape. The stack holds the corners undo took, newest last,
     and ANY new corner clears it — the standard rule, and the only one that
     cannot resurrect a corner from a shape the manager has moved on from. */
  let redoStack = [];
  let pending = null;       // points awaiting the save sheet
  let editingId = null;     // hood being edited in the sheet
  /* The reps this hood WILL have when the sheet is saved. A SET: one hood
     may be worked by several people at once, and picking a second rep adds
     them rather than replacing the first. */
  let assignSet = [];
  let draftId = null;       // the id a NEW hood will be created under — kept across retries
  let preAssign = null;     // "Give area" flow: the rep the new hood is for

  // ---------- draft rendering (dot mode) ----------
  // The shapes live behind the MMAP facade — this module only owns the
  // corner list and the toolbar state.
  function refreshDraft() {
    MMAP.setDraftRing(dots);
    $("#draw-done").disabled = dots.length < 3;
    $("#draw-undo").disabled = dots.length === 0;
    const r = $("#draw-redo");
    if (r) r.disabled = redoStack.length === 0;
    setToolState();
  }

  function undoDot() {
    if (!dots.length) return;
    redoStack.push(dots.pop());
    refreshDraft();
  }
  function redoDot() {
    if (!redoStack.length) return;
    dots.push(redoStack.pop());
    refreshDraft();
  }
  function addDot(pt) {
    dots.push(pt);
    redoStack = [];      // a new corner ends the old branch
    refreshDraft();
  }

  // the territory under the map centre — what "Move" acts on
  function hoodAtCentre() {
    const c = MMAP.getCenter ? MMAP.getCenter() : null;
    if (!c) return null;
    return STORE.activeTerritories().find((t) =>
      t.points && t.points.length >= 3 && STORE.inHood(t, c.lng, c.lat)) || null;
  }

  function clearDraft() {
    dots = [];
    redoStack = [];
    MMAP.setDraftRing(dots);
  }

  // ---------- mode lifecycle ----------
  function startMode(m) {
    if (!MMAP.isReady()) { toast("Map is still loading"); return; }
    stopMode();
    mode = m;
    closeToolsIfOpen();
    $("#draw-bar").hidden = false;
    const dotMode = m === "dots";
    $("#draw-undo").hidden = !dotMode;
    const r = $("#draw-redo");
    if (r) r.hidden = !dotMode;
    $("#draw-done").hidden = !dotMode;
    $("#draw-msg").textContent =
      m === "lasso" ? "Circle the doors you want to work with" :
      dotMode ? "Tap each corner of the area — then Done"
              : "Trace the area with your finger";
    if (dotMode) {
      refreshDraft();
    } else {
      startPencil();
    }
  }

  function stopMode() {
    mode = null;
    $("#draw-bar").hidden = true;
    clearDraft();
    stopPencil();
  }

  // ---------- pencil (freehand) ----------
  let cv = null, ctx = null, tracing = false, trace = [];

  function startPencil() {
    cv = $("#draw-canvas");
    cv.hidden = false;
    const rect = cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0A6CF0";
    ctx.setLineDash([7, 6]);
    trace = [];
  }

  function stopPencil() {
    if (cv) { cv.hidden = true; }
    tracing = false;
    trace = [];
  }

  function pencilPos(e) {
    const r = cv.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  function pencilDown(e) {
    if (mode !== "pencil" && mode !== "lasso") return;
    e.preventDefault();
    tracing = true;
    trace = [pencilPos(e)];
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.beginPath();
    ctx.moveTo(trace[0].x, trace[0].y);
  }

  function pencilMove(e) {
    if (!tracing) return;
    e.preventDefault();
    const p = pencilPos(e);
    const last = trace[trace.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < 3) return;
    trace.push(p);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function pencilUp(e) {
    if (!tracing) return;
    e.preventDefault();
    tracing = false;
    if (trace.length < 12) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      toast("Keep the finger down and trace the whole area");
      return;
    }
    // close the shape visually, simplify in screen space, convert to lng/lat
    const pts = simplify(trace, 6);
    const coords = pts.map((p) => {
      const ll = MMAP.unproject(p.x, p.y);
      return [ll.lng, ll.lat];
    });
    const finished = mode; // stopMode clears it
    stopMode();
    if (finished === "lasso") MSELECT.open(coords);
    else openHoodSheet(coords, null);
  }

  // Ramer–Douglas–Peucker in screen pixels — keeps the drawn shape's
  // character with ~10x fewer vertices.
  function simplify(points, tol) {
    if (points.length < 3) return points.slice();
    const keep = new Array(points.length).fill(false);
    keep[0] = keep[points.length - 1] = true;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const A = points[a], B = points[b];
      let maxD = 0, idx = -1;
      const dx = B.x - A.x, dy = B.y - A.y;
      const len = Math.hypot(dx, dy);
      for (let i = a + 1; i < b; i++) {
        const P = points[i];
        // a loop closed exactly on its start makes A≈B: the line formula
        // degenerates to 0 for every point — fall back to point distance
        const d = len < 1e-6
          ? Math.hypot(P.x - A.x, P.y - A.y)
          : Math.abs(dy * P.x - dx * P.y + B.x * A.y - B.y * A.x) / len;
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (maxD > tol && idx > 0) {
        keep[idx] = true;
        stack.push([a, idx], [idx, b]);
      }
    }
    return points.filter((_, i) => keep[i]);
  }

  // ---------- dot mode: map clicks land here first ----------
  function handleMapClick(e) {
    if (mode !== "dots") return false;
    tick();
    addDot([e.lng, e.lat]);
    return true; // consumed — no knock behind a draw tap
  }

  // ---------- save sheet ----------
  /* ---------- THE POLYGON CARD ----------
     Two numbers over the map while turf is being drawn or reviewed, and
     nothing else. A saved hood reads its number and its counts from the
     SERVER, so "Polygon 10 of 100" is the team's answer rather than this
     phone's partial copy; an unsaved draft says so plainly instead of
     guessing at a number the server has not issued yet. */
  let cardGen = 0;
  function hideCard() { cardGen++; const c = $("#polycard"); if (c) c.hidden = true; }
  /* Every close in this module goes through here. The card describes the
     sheet's polygon, so leaving it up after the sheet has gone would put a
     stale house count over a map showing something else. */
  function closeHoodSheet() { hideCard(); closeSheet(); }

  /* THE REVIEW STRIP AND THE SOURCE LINE.

     Three numbers and one sentence about where the houses came from. The
     numbers are the server's when it can be reached — the same call the
     polygon card makes, so the sheet and the card can never disagree — and
     this device's own count when it cannot, said plainly.

     The source line is the part a manager actually needs before handing
     turf out: a scan that placed every door on a building footprint is a
     different proposition from one that fell back to parcel points, and
     after the fact nobody can tell by looking at the map. */
  async function fillReview(hood, scan) {
    const id = $("#hr-id"), houses = $("#hr-houses"), sales = $("#hr-sales");
    if (!id) return;
    const src = $("#hood-source");
    id.textContent = hood && hood.seq ? hood.seq : "New";
    houses.textContent = scan ? scan.eligible.length : "…";
    sales.textContent = "…";

    if (scan) {
      const n = scan.eligible.length;
      const roof = scan.eligible.filter((d) =>
        d.placement === "building_centroid" || d.placement === "building_surface").length;
      const demo = scan.eligible.filter((d) => d.placement === "synthetic_grid").length;
      const bits = [`${n.toLocaleString()} eligible ${n === 1 ? "house" : "houses"}`];
      /* A demo grid is not "parcel-level placement" — it is not placement
         at all. The strip used to file it under that wording, which made
         invented houses read as a weak-but-real provider result. */
      if (demo === n && n) bits.push(`demo grid via ${scan.providerName || "Demo data"} — not real houses`);
      else if (roof === n && n) bits.push("every one on a building outline");
      else if (roof) bits.push(`${roof} on a building outline, ${n - roof} at a parcel or block point`);
      else if (n) bits.push("none on a building outline — parcel-level placement only");
      if (scan.warnings && scan.warnings.length) bits.push(scan.warnings[0]);
      src.textContent = bits.join(" · ");
      src.hidden = false;
      src.classList.toggle("warn", roof < n || demo > 0 || !!(scan.warnings && scan.warnings.length));
    } else {
      /* No scan for THIS sheet: the strip is blank until one runs. It used
         to keep the previous polygon's sentence when the hood was a saved
         one, so "8 eligible houses · demo grid" followed the manager from
         a draft into Territory 12's sheet. */
      src.hidden = true;
      src.classList.remove("warn");
    }

    if (!hood) { sales.textContent = "0"; if (!scan) houses.textContent = "—"; return; }
    try {
      const sum = await STORE.territorySummary(hood);
      id.textContent = sum.seq ? sum.seq + (sum.of ? " of " + sum.of : "") : "—";
      if (!scan) houses.textContent = sum.houses;
      sales.textContent = sum.sales;
      const local = sum.source === "device";
      $("#hood-review").classList.toggle("local", local);
      if (local && src.hidden) {
        src.textContent = "Counted on this device — the team's numbers need a connection";
        src.hidden = false; src.classList.add("warn");
      }
    } catch (_) {
      if (!scan) houses.textContent = "—";
      sales.textContent = "—";
    }
  }

  async function showCard(hood, scan) {
    const c = $("#polycard");
    if (!c) return;
    const gen = ++cardGen;
    const houses = scan ? scan.eligible.length : null;
    c.hidden = false;
    if (!hood) {
      // A draft has no number: the server assigns it on insert, and
      // predicting one that a concurrent manager might take is worse than
      // not showing one.
      $("#pc-id").textContent = "New polygon";
      $("#pc-houses").textContent = houses == null ? "—" : houses;
      $("#pc-sales").textContent = "0";
      $("#pc-note").hidden = true;
      return;
    }
    $("#pc-id").textContent = hood.seq ? "Polygon " + hood.seq : "Polygon";
    $("#pc-houses").textContent = "…";
    $("#pc-sales").textContent = "…";
    try {
      const sum = await STORE.territorySummary(hood);
      if (gen !== cardGen) return;                 // another polygon since
      $("#pc-id").textContent = sum.seq
        ? "Polygon " + sum.seq + (sum.of ? " of " + sum.of : "") : "Polygon";
      /* ONE DEFINITION OF "N HOUSES", AND IT IS THE TEAM'S.

         This line used to read `houses == null ? sum.houses : houses`,
         where `houses` is scan.eligible.length — the raw count of roofs the
         vendor just returned, which includes every house the team already
         holds as a pin. So a hood with 40 doors, re-scanned, read "N
         Houses" as 40-something one second and 40 the next, and neither
         number was the one the server counts by. The scan's count is a
         property of the SCAN and it already has a home in the status line;
         the card is the team's answer or it is nothing.

         `source: "device"` means the RPC could not be reached and the
         numbers are this phone's own partial copy. It is labelled rather
         than shown as if it were the team's, because a leader deciding
         whether a hood is worked cannot tell the difference otherwise. */
      const local = sum.source === "device";
      $("#pc-houses").textContent = sum.outlineMissing ? "—" : sum.houses;
      $("#pc-sales").textContent = sum.sales;
      $("#polycard").classList.toggle("local", local);
      $("#pc-note").hidden = !local;
    } catch (_) {
      if (gen !== cardGen) return;
      $("#pc-houses").textContent = "—";
      $("#pc-sales").textContent = "—";
      $("#pc-note").hidden = true;
    }
  }

  function openHoodSheet(points, hood) {
    pending = points;
    editingId = hood ? hood.id : null;
    assignSet = hood ? STORE.currentAssignees(hood).slice()
                     : (preAssign ? [preAssign] : []);
    preAssign = null;
    /* A saved hood is named by its NUMBER, here as everywhere. "Edit
       territory" was the one screen that still said what the sheet was
       for instead of which turf it was about. */
    $("#hood-sheet-title").textContent = hood ? STORE.hoodLabel(hood) : "New territory";
    $("#hood-sheet-sub").textContent = hood
      ? "Change who works it, or reshape it on the map"
      : "Review what is in it, then hand it out";
    fillReview(hood, null);
    $("#hood-name").value = hood ? hood.name : "";
    $("#hood-homes").value = hood && hood.homes ? hood.homes : "";
    $("#hood-delete").hidden = !hood;
    $("#hood-archive").hidden = !hood;
    if (hood) $("#hood-archive").textContent = hood.archived ? "Unarchive territory" : "🗄 Archive territory";
    $("#hood-newrep-wrap").hidden = true;
    $("#hood-newrep").value = "";
    // Editing the OUTLINE happens on the map, not in a sheet — so this is
    // a door out of the sheet rather than a control inside it.
    const edit = $("#hood-edit-shape");
    if (edit) edit.hidden = !hood || !STORE.canManageTerritories() ||
      !hood.points || hood.points.length < 3;
    // Smart Split only makes sense on a saved hood, and only for managers
    $("#hood-split-wrap").hidden = !hood || !STORE.canManageTerritories();
    $("#hood-split-n").hidden = true;
    splitN = 0;
    renderRepChips();
    renderHoodHistory(hood);
    setupDoorsBlock(points, hood);
    showCard(hood, null);
    openSheet("hood-sheet");
  }

  // ---------- doors: scan the polygon, confirm, import ----------
  // The signature flow: draw an area → "N eligible doors found" → import
  // turns every eligible residential property into an unworked pin.
  // Nothing is written until the manager confirms (toggle+Save on a new
  // territory, an explicit button on a saved one), and the dedupe means
  // an overlapping draw can never duplicate a door or touch history.
  let lastScan = null;   // { fresh: [props], res: search result, forId }
  let importOn = false;  // pending-mode toggle: import on save
  let scanGen = 0;       // a scan is only valid for the sheet that started it

  async function scanDoors(points, hood) {
    const st = $("#hd-status");
    const gen = ++scanGen;
    lastScan = null; importOn = false;
    $("#hd-import-row").hidden = true;
    st.textContent = "Searching properties…";
    let res;
    try {
      res = await MPROP.searchByPolygon(points, (m) => { if (gen === scanGen) st.textContent = m; });
    } catch (err) {
      if (gen !== scanGen) return;
      st.innerHTML = `⚠️ ${MUI.esc(err.message)}<br><span class="dim">Knocking works without this — doors can be pinned by hand.</span>`;
      return;
    }
    // an Overpass round trip can take 25s — if the manager has since closed
    // this sheet or opened another territory, these results belong to a
    // polygon that is no longer on screen. Importing them would pin one
    // hood's doors under another hood's id. Drop them.
    if (gen !== scanGen) return;
    const idx = STORE.buildDoorIndex();
    const fresh = res.eligible.filter((p) => !idx.match(p));
    const dupes = res.eligible.length - fresh.length;
    /* ONE operation id per scan, minted here and kept across Save retries:
       the server's import ledger answers a repeated id instead of importing
       twice, so a dropped response can never double a territory's doors. */
    lastScan = { fresh, res, forId: hood ? hood.id : null, opId: MDB.uid() };
    showCard(hood, res);                 // the card's house count is the scan's
    fillReview(hood, res);               // …and so is the review strip's
    const acres = Math.max(1, Math.round(res.areaKm2 * 247.105));
    renderReview(res, fresh, dupes, acres);
    if (!res.eligible.length) return;
    if (fresh.length) {
      importOn = !hood; // creating: import is the point, default ON
      const btn = $("#hd-import-btn");
      btn.textContent = hood
        ? `⬇️ Import ${fresh.length} new door${fresh.length === 1 ? "" : "s"}`
        : `⬇️ Import ${fresh.length} door${fresh.length === 1 ? "" : "s"} when I save`;
      btn.classList.toggle("sel", importOn);
      $("#hd-import-row").hidden = false;
    }
  }

  /* THE REVIEW. What the scan found, where it came from, how sure it is
     about each house, what it left out, and the number that will actually
     become doors — every figure the manager needs BEFORE handing the turf
     out. "N eligible doors found" on its own hid all of that.

     PLACEMENT is the provider's own word for where the point came from:
       building_centroid / building_surface  the house's outline — exact
       parcel_centroid                       the lot, not the house
       parcel_point                          a representative point the
                                             provider chose — treated as
                                             uncertain
       synthetic_grid                        NOT a house (demo), and refused
                                             by every team server */
  const EXACT = { building_centroid: 1, building_surface: 1 };
  const PARCEL = { parcel_centroid: 1 };

  function renderReview(res, fresh, dupes, acres) {
    const st = $("#hd-status");
    const rv = $("#hd-review");
    const all = res.eligible || [];
    const finite = (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng);
    let exact = 0, parcel = 0, uncertain = 0, demo = 0;
    all.forEach((p) => {
      if (!finite(p)) { uncertain++; return; }
      if (p.placement === "synthetic_grid") { demo++; return; }
      if (EXACT[p.placement]) exact++;
      else if (PARCEL[p.placement]) parcel++;
      else uncertain++;
    });
    // the top reasons houses were left out, so "excluded 14" is a sentence
    const why = {};
    (res.parcels || []).forEach((p) => {
      if (p.eligible) return;
      const k = (p.whyExcluded || "not residential").replace(/^building: /, "");
      why[k] = (why[k] || 0) + 1;
    });
    const reasons = Object.keys(why).sort((a, b) => why[b] - why[a]).slice(0, 3)
      .map((k) => `${why[k]} ${MUI.esc(k)}`).join(" · ");
    const team = !!(window.MCLOUD && MCLOUD.enabled());
    const willImport = team ? fresh.filter((p) => p.placement !== "synthetic_grid").length : fresh.length;

    if (!all.length) {
      st.innerHTML = `No residential doors found in this area` +
        `<br><span class="dim">${(res.parcels || []).length} structure${(res.parcels || []).length === 1 ? "" : "s"} checked · ~${acres} acres · ${MUI.esc(res.providerName)}</span>`;
      if (rv) rv.hidden = true;
      return;
    }
    st.innerHTML = `<b>${all.length} eligible house${all.length === 1 ? "" : "s"} found</b>` +
      ` <span class="dim">· ~${acres} acres</span>`;
    if (!rv) return;
    const line = (k, v, cls) => `<div class="hr-line${cls ? " " + cls : ""}"><span>${k}</span><b>${v}</b></div>`;
    rv.innerHTML =
      line("Source", MUI.esc(res.providerName || res.provider || "—")) +
      line("On the building outline", exact, exact === all.length ? "good" : "") +
      line("Parcel-level (lot, not house)", parcel, parcel ? "warn" : "") +
      line("Uncertain coordinates", uncertain, uncertain ? "warn" : "") +
      (demo ? line("Demo grid — not real houses", demo, "bad") : "") +
      line("Excluded (not residential)", res.excluded + (reasons ? ` <i>${reasons}</i>` : "")) +
      line("Already in RALLY (matched, not duplicated)", dupes) +
      line("Will be imported", willImport, "total") +
      (res.warnings || []).map((w) => `<div class="hr-warn">${MUI.esc(w)}</div>`).join("") +
      (demo && team ? `<div class="hr-warn">Demo houses are refused by the team server — pick a real provider in More → Property data.</div>` : "");
    rv.hidden = false;
  }

  /* THE IMPORT, AND WHO RECORDS IT.

     A door is a permanent, shared property record, so on a team the SERVER
     creates it: STORE.importDoorsServer submits the scan as an intent, the
     0018 RPC matches every house against what the team already holds,
     refuses anything outside the outline or not residential, and the doors
     arrive on the next pull carrying the ids every phone will use. With no
     team server at all this device is the record and STORE.importDoors
     pins them here.

     WHAT IT NEVER DOES: quietly pin doors on this phone when the server
     was supposed to. A server that REFUSES (a rep, a bad outline, a demo
     grid) is an answer, shown as one, and the scan is kept for a retry. A
     server that does not HAVE the import yet — migration 0018 unapplied —
     is the one case that falls back to a device import, and it says so in
     the toast and the status line rather than pretending it was confirmed. */
  async function runImport(territoryId) {
    const none = { added: 0, matched: 0, failed: 0, where: "none" };
    if (!lastScan || !lastScan.fresh.length) return none;
    // an edit-mode scan is bound to its territory; never import it into another
    if (lastScan.forId && lastScan.forId !== territoryId) return none;
    const fresh = lastScan.fresh;
    const opId = lastScan.opId || (lastScan.opId = MDB.uid());
    const st = $("#hd-status");
    const progress = (i, n) => { if (st) st.textContent = `Importing ${i} of ${n} doors…`; };

    const gate = STORE.turfGate({ needsServer: true });
    if (!gate.ok) {
      toast(gate.reason, 6000);
      return Object.assign({}, none, { refused: gate.reason });
    }
    let r;
    if (gate.code === "solo") {
      const l = await STORE.importDoors(fresh, { territoryId, onProgress: progress });
      r = { added: l.added, matched: l.skipped, failed: l.failed, synthetic: l.synthetic, where: "device" };
    } else {
      try {
        const s = await STORE.importDoorsServer(fresh, { territoryId, operationId: opId, onProgress: progress });
        r = { added: s.added, matched: s.matched, outside: s.outside, ineligible: s.ineligible,
              unusable: s.unusable, pages: s.pages, where: "server" };
        // the doors exist on the server now; ask for them rather than waiting for the next wake
        if (window.MSYNC && MSYNC.syncNow) { try { MSYNC.syncNow(); } catch (_) {} }
      } catch (err) {
        const msg = String((err && err.message) || err);
        if (/could not find the function|PGRST202|does not exist/i.test(msg)) {
          const l = await STORE.importDoors(fresh, { territoryId, onProgress: progress });
          r = { added: l.added, matched: l.skipped, failed: l.failed, synthetic: l.synthetic, where: "device-fallback" };
        } else {
          if (st) st.innerHTML = `<b>Import refused</b> — ${MUI.esc(msg)}`;
          toast("Import refused — " + msg, 7000);
          return Object.assign({}, none, { refused: msg });   // lastScan is kept: Save again retries
        }
      }
    }
    lastScan = null;
    MMAP.refreshPins();
    const n = (k) => `${k} door${k === 1 ? "" : "s"}`;
    if (r.synthetic) {
      /* The demo grid previews the flow on a solo device and is refused on a
         team, because those doors would be permanent shared property records
         for houses that do not exist. */
      toast(`Demo data is a preview, not real houses — it cannot be imported into a team. ` +
        `Pick a real provider in More → Property data.`);
    } else if (r.where === "server") {
      const bits = [`${n(r.added)} imported`];
      if (r.matched) bits.push(`${r.matched} matched, not duplicated`);
      if (r.outside) bits.push(`${r.outside} outside the outline`);
      // the server's own refusals: demo-grid doors and non-residential ones
      if (r.ineligible) bits.push(`${r.ineligible} refused as not residential or demo`);
      if (r.unusable) bits.push(`${r.unusable} unusable`);
      if (st) st.innerHTML = `<b>Server confirmed</b> — ${bits.join(" · ")}`;
      toast(`Server confirmed — ${bits.join(" · ")}`);
    } else if (r.where === "device-fallback") {
      if (st) st.innerHTML = `<b>Imported on this device</b> — queued to sync. The server-confirmed import needs migration 0018.`;
      toast(`Imported ${n(r.added)} on this device and queued to sync — the server-confirmed import needs migration 0018`, 7000);
    } else if (r.failed) toast(`Imported ${n(r.added)} — ${r.failed} failed (storage may be full)`);
    else toast(`Import complete — ${n(r.added)} pinned` + (r.matched ? ` · ${r.matched} already existed` : ""));
    return r;
  }

  function setupDoorsBlock(points, hood) {
    const wrap = $("#hood-doors");
    const manager = STORE.canManageTerritories();
    scanGen++; // sheet context changed: any scan still in flight is void
    lastScan = null; importOn = false;
    $("#hd-import-row").hidden = true;
    /* The review describes ONE scan of ONE polygon. Opening a saved hood's
       sheet after drawing a new one left the new polygon's review — its
       source line and its "Will be imported" — sitting under the saved
       hood's title until a rescan replaced it. Nothing survives a change
       of sheet. */
    const rv = $("#hd-review");
    if (rv) { rv.hidden = true; rv.innerHTML = ""; }
    if (!manager || !points || points.length < 3) { wrap.hidden = true; return; }
    wrap.hidden = false;
    $("#hd-redraw").hidden = !!hood;
    if (hood) {
      const st = STORE.hoodStats(hood);
      $("#hd-status").innerHTML = st.doors
        ? `${st.doors} door${st.doors === 1 ? "" : "s"} on the map · ${st.by.unworked} untouched · ${st.sold} sold` +
          (st.pct != null ? ` · <b>${st.pct}%</b> worked` : "")
        : "No doors pinned in this territory yet";
      $("#hd-scan").hidden = false;
      $("#hd-scan").textContent = st.doors ? "🔍 Scan for new doors" : "🔍 Find the doors in this territory";
    } else {
      $("#hd-scan").hidden = true;
      scanDoors(points, null); // creating: the door count IS the headline
    }
  }

  // ---------- smart split ----------
  let splitN = 0;
  function bindSplit() {
    $("#hood-split").addEventListener("click", () => {
      tick();
      const nWrap = $("#hood-split-n");
      nWrap.hidden = !nWrap.hidden;
      if (!nWrap.hidden) {
        nWrap.innerHTML = [2, 3, 4, 5, 6].map((n) =>
          `<button type="button" class="reason split-chip" data-n="${n}">${n} reps</button>`).join("");
        $$("#hood-split-n .split-chip").forEach((b) =>
          b.addEventListener("click", () => runSplit(+b.dataset.n)));
      }
    });
  }

  async function runSplit(n) {
    tick();
    const t = STORE.territories.find((x) => x.id === editingId);
    if (!t) return;
    if (!confirm(`Split “${STORE.hoodLabel(t)}” into ${n} balanced hoods? The original is replaced (pins keep their history).`)) return;
    let kids;
    try {
      kids = await STORE.splitTerritory(t, n);
    } catch (_) {
      toast("Split failed — try a simpler shape");
      return;
    }
    editingId = null; pending = null; draftId = null;
    MMAP.refreshHoods();
    closeHoodSheet();
    renderHoodList();
    /* Say which of the two things actually happened. With a team project
       configured the split is a PROPOSAL until the server commits it in one
       transaction, and the manager should not be told the hood is cut when
       the answer has not come back yet — least of all if they are about to
       hand the new turf out. */
    const cloud = window.MCLOUD && MCLOUD.enabled();
    toast(cloud
      ? `Cut into ${kids.length} hoods — sending to the team, hand them out once it lands`
      : `Cut into ${kids.length} hoods — hand them out from the hoods list`);
  }

  /* Assignment chips. MULTI-SELECT: a hood may be worked by John AND Jake,
     so tapping a second rep adds them and tapping a selected rep takes only
     that one off. "Unassigned" is the clear-all, and lights up only when
     nobody is on the hood.

     The rep's territory colour rides on the chip so the manager sees what
     the map will paint — with several reps the map takes the FIRST one, in
     the same deterministic order the server uses, and the chip row shows
     the whole set. */
  /* The chips are fine for four reps and unusable for forty. This opens the
     searchable picker over them, and hands back the same assignSet the save
     path below already reads — the panel is a better way to choose, not a
     second way to save. */
  function openAssignPanel() {
    if (!window.MASSIGN) return;
    const hood = editingId ? STORE.territories.find((x) => x.id === editingId) : null;
    MASSIGN.open({
      preselect: assignSet.slice(),
      subtitle: hood && hood.seq ? "Polygon " + hood.seq
              : hood ? STORE.hoodLabel(hood) : "New polygon — not saved yet",
      onSave: async (ids) => {
        assignSet = ids.slice();
        renderRepChips();
        // Nothing is written here. A new hood commits its geometry and its
        // assignment together when the sheet is saved; an existing one goes
        // through the assignment RPC on the same button. Writing from two
        // places is how a half-saved hood happens.
      },
    });
  }

  function renderRepChips() {
    const on = (id) => assignSet.indexOf(id) >= 0;
    const chips = [
      `<button type="button" class="reason rep-chip${assignSet.length === 0 ? " sel" : ""}" data-u="">
         <span class="dot" style="background:#8A93A6"></span>Unassigned</button>`,
      ...STORE.users.map((u) =>
        `<button type="button" class="reason rep-chip${on(u.id) ? " sel" : ""}" data-u="${u.id}">
           <span class="dot" style="background:${u.color}"></span>${MUI.esc(u.name)}</button>`),
      `<button type="button" class="reason rep-chip" data-u="+">+ New rep</button>`,
    ];
    $("#hood-reps").innerHTML = chips.join("");
    const note = $("#hood-reps-note");
    if (note) {
      note.textContent = assignSet.length > 1
        ? assignSet.length + " reps work this hood — it shows up in every one of their lists"
        : "";
      note.hidden = assignSet.length < 2;
    }
    $$("#hood-reps .rep-chip").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        if (b.dataset.u === "+") {
          $("#hood-newrep-wrap").hidden = false;
          $("#hood-newrep").focus();
          return;
        }
        const id = b.dataset.u;
        if (!id) assignSet = [];
        else if (on(id)) assignSet = assignSet.filter((x) => x !== id);
        else assignSet = assignSet.concat([id]);
        renderRepChips();
      }));
  }

  function renderHoodHistory(hood) {
    const el = $("#hood-history");
    if (!hood) { el.innerHTML = ""; return; }
    let html = "";

    // area history: what actually happened at the doors in here
    const h = STORE.hoodHistory(hood);
    if (h.doors) {
      html += `<div class="ce-sec" style="margin-top:14px">Area history</div>
        <div class="hood-hist-sum">
          Last worked <b>${h.daysSince === 0 ? "today" : h.daysSince + "d ago"}</b> ·
          ${h.sessions.length} session${h.sessions.length === 1 ? "" : "s"} ·
          ${h.doors} doors · ${h.sales} sold${h.closeRate != null ? ` · <b>${h.closeRate}%</b> close` : ""}
        </div>` +
        h.sessions.slice(0, 3).map((s) =>
          `<div class="h-item" style="font-size:12.5px;color:var(--t3)">
             ${MUI.fmtDate(s.ts)}${s.rep ? " · " + MUI.esc(s.rep) : ""} · ${s.doors} doors · ${s.sales} sold</div>`
        ).join("");
    }

    /* Assignment history, newest first, from the LEDGER — so a hood worked
       by two reps at once shows both open runs rather than only the first.
       An entry whose rep can no longer be resolved still shows: it is a
       fact about who worked this turf, and history is never dropped to make
       a name look tidy. */
    const hist = STORE.assigneeHistory(hood).slice().reverse().slice(0, 6);
    if (hist.length) {
      html += `<div class="ce-sec" style="margin-top:14px">Assignment history</div>` +
        hist.map((a) =>
          `<div class="h-item" style="font-size:12.5px;color:var(--t3)">${MUI.esc(a.name || "Former rep")}
             · ${MUI.fmtDate(a.assignedAt)}${a.open ? " → now" : " → " + MUI.fmtDate(a.unassignedAt)}` +
          (a.viaSplit ? ` <span class="dim">· inherited from a split</span>` : "") + `</div>`
        ).join("");
    }
    el.innerHTML = html;
  }

  let saving = false; // a double-tap on Save must not mint a second hood

  async function saveHood() {
    if (saving) return;
    // …and a tap that lands AFTER the first save finished must not mint a
    // phantom either: by then pending is cleared and the sheet is closed, so
    // a second create would file a territory with no boundary at all.
    if (!editingId && (!pending || pending.length < 3)) return;
    saving = true;
    const saveBtn = $("#hood-save");
    if (saveBtn) saveBtn.disabled = true;
    try {
      await saveHoodInner();
    } finally {
      saving = false;
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  async function saveHoodInner() {
    const creating = !editingId;
    /* THE OUTLINE IS CHECKED WHEN IT IS DRAWN, not only when it is reshaped.

       MGEOM.validate has always existed and has always been thorough — a
       boundary that crosses itself, a corner visited twice, a ring with no
       area, one straddling the antimeridian — and its wording was written to
       mirror the server's refusal word for word. It was wired into the
       vertex editor and NOWHERE ELSE, so the path that CREATES a hood never
       asked. A shaky finger drew a bowtie, the hood saved locally without a
       murmur, and territories_derive_geom refused it (22023, which PostgREST
       returns as 400) on the next sync: the hood lived on that one phone,
       invisible to the team, forever. Three of the seven hoods drawn on
       these devices in late August are in exactly that state.

       It runs BEFORE the connectivity gate on purpose. Whether a ring can
       ever be stored is a local question with a local answer, and asking the
       server for permission to save a shape no server will accept earns the
       rep "connect to manage turf" — true, useless, and not the problem.
       The normalised ring (CCW, duplicate corners dropped) is what gets
       saved, exactly as the editor saves it. */
    if (creating && window.MGEOM) {
      const ring = MGEOM.validate(pending);
      if (!ring.ok) {
        toast(ring.reason || "That outline isn't a shape RALLY can save — reshape it and try again", 6000);
        return;
      }
      pending = ring.points;
    }
    /* Creating a hood — or moving who works one — is confirmed by the
       server whenever there is one. Offline, that is a clean "Connect to
       manage turf", not an RPC error after the sheet has closed. A plain
       rename keeps working offline: it is a client-authored field. */
    if (window.MTURF) {
      const cur = creating ? [] : STORE.currentAssignees(
        STORE.territories.find((x) => x.id === editingId) || {});
      const moving = creating || assignSet.slice().sort().join() !== cur.slice().sort().join();
      if (!(await MTURF.gate(creating ? "creating a hood" : "changing who works it", moving))) return;
    }
    /* NO AUTO-NAME. This used to mint "Hood 7" when the field was blank,
       which is exactly the device-local auto-name the numbering is meant to
       replace — and it then showed up on every screen as though a person
       had chosen it. A blank nickname stays blank; the territory is
       identified by its server-assigned number. */
    const name = $("#hood-name").value.trim();
    const homes = Math.max(0, Math.min(100000, Number($("#hood-homes").value) || 0)) || null;
    // a typed-but-unadded new rep still counts — nobody loses that keystroke
    const newRepName = $("#hood-newrep-wrap").hidden ? "" : $("#hood-newrep").value.trim();
    let t;
    try {
      if (newRepName) {
        // a retry must not mint a SECOND rep with the same name
        const existing = STORE.users.find((u) =>
          u.name.trim().toLowerCase() === newRepName.toLowerCase());
        const u = existing || await STORE.addUser({ name: newRepName, role: "rep" });
        // ADDED to the set, not swapped in: naming a new rep on a hood that
        // already has one is how a second person joins it
        if (assignSet.indexOf(u.id) < 0) assignSet = assignSet.concat([u.id]);
      }
      if (editingId) {
        t = STORE.territories.find((x) => x.id === editingId);
        if (t) { t.name = name; t.homes = homes; await STORE.updateTerritory(t); }
      } else {
        /* ONE id per draft, minted before the first attempt and kept across
           retries: save_territory is an upsert on the id, so a retry after a
           dropped response lands on the SAME hood instead of drawing a
           second one over it. */
        draftId = draftId || MDB.uid();
        t = await STORE.createTerritory({
          id: draftId, name, homes, points: pending,
          createdBy: (STORE.currentUser() || {}).id || null,
        }, assignSet);
        /* THE HOOD NOW EXISTS. Should anything after this fail, a retry
           must EDIT this hood, not mint a second one beside it — the toast
           said "couldn't save", but the turf is already on the map. */
        editingId = t.id;
        draftId = null;
      }
      // a NEW hood was created with its reps in one call above; an EDITED
      // one has its reps moved through the assignment RPC here
      if (t && !creating) await STORE.setAssignees(t, assignSet);
    } catch (err) {
      // the reason, when there is one — a rep with no account can never be
      // given turf, and "try again" is a loop with no exit
      toast((err && err.message) || "Couldn't save the hood — try again");
      return;
    }
    // the confirmed door import runs against the freshly saved territory,
    // with progress in the sheet's status line
    let imported = null;
    if (creating && t && importOn && lastScan && lastScan.fresh.length) {
      try { imported = await runImport(t.id); }
      catch (_) { toast("Import hit an error — scan the territory again to retry"); }
    }
    // name every rep the hood went to, not just the first — "assigned to
    // John" on a hood John and Jake share is a wrong answer
    const names = assignSet
      .map((id) => (STORE.userById(id) || {}).name)
      .filter(Boolean);
    const who = names.length === 0 ? ""
      : names.length === 1 ? names[0]
      : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
    pending = null; editingId = null;
    MMAP.refreshHoods();
    closeHoodSheet();
    renderHoodList();
    const label = STORE.hoodLabel(t) + (name ? ` (${name})` : "");
    toast(imported && imported.added
      ? `${label} — ${imported.added} doors ${imported.where === "server" ? "confirmed by the server" : "pinned"}${who ? ", assigned to " + who : ""}`
      : (who ? `${label} — assigned to ${who}` : `${label} saved`));
  }

  // ---------- manager rep panel ----------
  // The whole team at a glance: turf, progress, sold — tap to fly to a
  // rep's areas, or hand them fresh turf on the spot.
  function renderRepsPanel(manager) {
    const wrap = $("#hood-reps-panel");
    wrap.hidden = !manager || !STORE.users.length;
    if (wrap.hidden) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = `<div class="hood-sec">Reps</div>` + STORE.users.map((u) => {
      const hoods = STORE.hoodsOf(u.id);
      let knocked = 0, homes = 0, sold = 0;
      hoods.forEach((t) => {
        const st = STORE.hoodStats(t);
        knocked += st.knocked; homes += st.homes || 0; sold += st.sold;
      });
      const meta = hoods.length
        ? `${hoods.length} hood${hoods.length === 1 ? "" : "s"} · ${knocked}${homes ? "/" + homes : ""} knocked · ${sold} sold`
        : "No turf yet";
      return `<div class="hood-row rep-row" data-id="${u.id}">
        <span class="dot" style="background:${u.color}"></span>
        <span class="hn">${MUI.esc(u.name)}<span class="hr">${meta}</span></span>
        <button class="hood-edit hood-give" data-id="${u.id}" aria-label="Give area">＋</button>
      </div>`;
    }).join("");
    $$("#hood-reps-panel .rep-row").forEach((row) =>
      row.addEventListener("click", (e) => {
        if (e.target.closest(".hood-give")) return;
        tick();
        closeToolsIfOpen();
        MMAP.focusRep(row.dataset.id);
      }));
    $$("#hood-reps-panel .hood-give").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        const u = STORE.userById(b.dataset.id);
        if (!u) return;
        preAssign = u.id;
        startMode("pencil"); // Quick Draw is the fast path for handing turf
        $("#draw-msg").textContent = `Draw ${u.name}'s new area`;
        toast(`Trace the turf for ${u.name}`);
      }));
  }

  // ---------- hoods panel ----------
  function renderHoodList() {
    const wrap = $("#hood-list");
    const manager = STORE.seesWholeTeam();
    const me = STORE.currentUser();
    // reps see their own turf; managers see the whole board
    const active = STORE.activeTerritories();
    const list = manager ? active
      : active.filter((t) => me && t.assignedTo === me.id);
    const archived = manager ? STORE.territories.filter((t) => t.archived) : [];
    if (!list.length && !archived.length) {
      wrap.innerHTML = `<div class="hood-empty">${manager
        ? "No hoods yet — cut your first area"
        : "No turf assigned to you yet — ask your manager"}</div>`;
      return;
    }
    wrap.innerHTML = list.map((t) => {
      const u = t.assignedTo && STORE.userById(t.assignedTo);
      const st = STORE.hoodStats(t);
      const prog = st.pct != null ? `${st.pct}%` : `${st.knocked} knocked`;
      const doors = st.doors ? `${st.doors} doors · ` : "";
      // a child of a split the server has not confirmed says so, rather
      // than sitting in the list looking like turf that is ready to give out
      const sub = t.pendingSplit
        ? "waiting on the team — not confirmed yet"
        : `${u ? MUI.esc(u.name) + " · " : ""}${doors}${prog}`;
      return `<div class="hood-row${t.pendingSplit ? " pending" : ""}" data-id="${t.id}">
         <span class="dot" style="background:${STORE.hoodColor(t)}"></span>
         <span class="hn">${MUI.esc(STORE.hoodLabel(t))}<span class="hr">${sub}</span></span>
         ${manager ? `<button class="hood-edit" data-id="${t.id}" aria-label="Edit hood">✎</button>` : ""}
       </div>`;
    }).join("") +
    (archived.length
      ? `<div class="hood-sec">Archived</div>` + archived.map((t) =>
          `<div class="hood-row archived" data-id="${t.id}">
             <span class="dot" style="background:#B9BEC7"></span>
             <span class="hn">${MUI.esc(STORE.hoodLabel(t))}<span class="hr">archived</span></span>
             <button class="hood-edit" data-id="${t.id}" aria-label="Edit hood">✎</button>
           </div>`).join("")
      : "");
    $$("#hood-list .hood-row").forEach((row) =>
      row.addEventListener("click", (e) => {
        if (e.target.closest(".hood-edit")) return;
        const t = STORE.territories.find((x) => x.id === row.dataset.id);
        if (t) { closeToolsIfOpen(); MMAP.focusHood(t); }
      }));
    $$("#hood-list .hood-edit").forEach((b) =>
      b.addEventListener("click", () => {
        const t = STORE.territories.find((x) => x.id === b.dataset.id);
        if (t) { closeToolsIfOpen(); openHoodSheet(t.points, t); }
      }));
  }

  /* ---------- MANAGER MAP TOOLS (the glass sheet) ----------

     The dropdown this replaces was four emoji rows over the imagery. The
     sheet is the same tools with room to say what each one does, and it is
     the place the drawing verbs now live so a manager is not hunting for
     Undo in a toolbar that only appears mid-draw.

     GATING IS UNCHANGED AND STILL SERVER-BACKED: canManageTerritories()
     decides, RLS (0003) decides again, and a rep never sees the sheet at
     all — their turf list opens instead. */
  function toolsOpen() { return !$("#mtools").hidden; }
  function closeToolsIfOpen() { if (toolsOpen()) closeTools(); }

  function openTools() {
    const manager = STORE.canManageTerritories();
    $("#mtools-sub").textContent = manager
      ? "Manager tools — reps never see these"
      : "Your turf";
    // the leadership half is hidden wholesale for a rep, not merely disabled
    $$("#mtools .mt-group").forEach((g, i) => { if (i < 2) g.hidden = !manager; });
    $("#mt-heat").hidden = !manager;
    $("#mt-assign").hidden = !manager;
    $("#mt-clear").hidden = mode === null;
    $("#mt-heat").querySelector(".mtr-t").innerHTML = MMAP.heatMode()
      ? `Ownership view<i>Back to who works which area</i>`
      : `Freshness view<i>How long since each area was worked</i>`;
    setToolState();
    renderRepsPanel(manager);
    renderHoodList();
    $("#mtools-veil").hidden = false;
    $("#mtools").hidden = false;
    requestAnimationFrame(() => {
      $("#mtools-veil").classList.add("open");
      $("#mtools").classList.add("open");
    });
  }

  function closeTools() {
    $("#mtools-veil").classList.remove("open");
    $("#mtools").classList.remove("open");
    setTimeout(() => {
      if (!$("#mtools").classList.contains("open")) {
        $("#mtools").hidden = true; $("#mtools-veil").hidden = true;
      }
    }, 220);
  }

  /* Undo and Redo are only meaningful while corners are being tapped, and
     Move/Select only on a saved shape. A tool that cannot do anything says
     so by being dim rather than by doing nothing when pressed. */
  function setToolState() {
    const dotMode = mode === "dots";
    const t = (id, on) => { const b = $(id); if (b) b.classList.toggle("off", !on); };
    t("#mt-undo", dotMode && dots.length > 0);
    t("#mt-redo", dotMode && redoStack.length > 0);
    t("#mt-select", !!STORE.activeTerritories().length);
    t("#mt-move", !!STORE.activeTerritories().length);
    const b = $("#draw-redo");
    if (b) b.disabled = redoStack.length === 0;
  }

  function bind() {
    $("#fab-hoods").addEventListener("click", () => {
      tick();
      if (toolsOpen()) closeTools(); else openTools();
    });
    $("#mtools-veil").addEventListener("click", closeTools);
    $("#mtools .grab").addEventListener("click", closeTools);

    $("#mt-heat").addEventListener("click", () => {
      tick();
      MMAP.setHeatMode(!MMAP.heatMode());
      closeTools();
      toast(MMAP.heatMode()
        ? "Freshness view — red and pink turf is ready to work"
        : "Back to ownership colors");
    });
    $("#mt-trace").addEventListener("click", () => { tick(); closeTools(); startMode("pencil"); });
    $("#mt-corners").addEventListener("click", () => { tick(); closeTools(); startMode("dots"); });
    $("#mt-lasso").addEventListener("click", () => { tick(); closeTools(); startMode("lasso"); });
    $("#mt-undo").addEventListener("click", () => { tick(); undoDot(); setToolState(); });
    $("#mt-redo").addEventListener("click", () => { tick(); redoDot(); setToolState(); });
    $("#mt-clear").addEventListener("click", () => { tick(); stopMode(); closeTools(); });
    $("#mt-assign").addEventListener("click", () => {
      tick();
      // the reps panel is already rendered in the sheet; scroll it into view
      const p = $("#hood-reps-panel");
      if (p) p.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    /* SELECT and MOVE both mean "pick a shape, then edit its outline", which
       is what MTEDIT already does — Select arms the picking, Move opens the
       editor on the hood under the map centre. Neither invents a second
       editor. */
    $("#mt-select").addEventListener("click", () => {
      tick(); closeTools();
      toast("Tap a territory outline to select it");
    });
    $("#mt-move").addEventListener("click", async () => {
      tick();
      const t = hoodAtCentre();
      if (!t) { toast("Centre the map on a territory first"); return; }
      closeTools();
      if (window.MTEDIT) await MTEDIT.open(t);
    });

    $("#draw-cancel").addEventListener("click", () => { tick(); stopMode(); });
    $("#draw-undo").addEventListener("click", () => { tick(); undoDot(); });
    $("#draw-redo").addEventListener("click", () => { tick(); redoDot(); });
    const ap = $("#hood-assign-open");
    if (ap) ap.addEventListener("click", () => { tick(); openAssignPanel(); });
    $("#draw-done").addEventListener("click", () => {
      tick();
      if (dots.length < 3) return;
      const pts = dots.slice();
      stopMode();
      openHoodSheet(pts, null);
    });
    bindSplit();
    MMAP.onMapClick(handleMapClick); // dot-drawing consumes taps before knocks
    $("#hood-save").addEventListener("click", saveHood);
    const editBtn = $("#hood-edit-shape");
    if (editBtn) editBtn.addEventListener("click", async () => {
      tick();
      const t = editingId && STORE.territories.find((x) => x.id === editingId);
      if (!t) return;
      closeHoodSheet();
      if (window.MTEDIT) await MTEDIT.open(t);
    });
    $("#hood-delete").addEventListener("click", async () => {
      if (!editingId) return;
      if (!confirm("Delete this territory? The houses inside it are not affected.")) return;
      if (!(await STORE.deleteTerritory(editingId))) return; // storage failure: nothing changed
      editingId = null;
      MMAP.refreshHoods();
      closeHoodSheet();
      toast("Territory deleted");
    });
    $("#hood-archive").addEventListener("click", async () => {
      const t = editingId && STORE.territories.find((x) => x.id === editingId);
      if (!t) return;
      t.archived = !t.archived;
      await STORE.updateTerritory(t);
      editingId = null;
      MMAP.refreshHoods();
      closeHoodSheet();
      renderHoodList();
      toast(t.archived
        ? `${STORE.hoodLabel(t)} archived — doors and history are untouched`
        : `${STORE.hoodLabel(t)} is back on the map`);
    });
    // doors block: scan an existing territory, import, or go back to drawing
    $("#hd-scan").addEventListener("click", () => {
      tick();
      const t = editingId && STORE.territories.find((x) => x.id === editingId);
      if (pending && pending.length >= 3) scanDoors(pending, t || null);
    });
    $("#hd-import-btn").addEventListener("click", async () => {
      tick();
      if (!lastScan || !lastScan.fresh.length) return;
      if (editingId) {
        // saved territory: the button IS the confirmation
        const btn = $("#hd-import-btn");
        btn.disabled = true;
        try { await runImport(editingId); }
        catch (_) { toast("Import hit an error — scan the territory again to retry"); }
        finally { btn.disabled = false; }
        const t = STORE.territories.find((x) => x.id === editingId);
        setupDoorsBlock(pending, t || null);
      } else {
        // creating: toggle whether Save also imports
        importOn = !importOn;
        $("#hd-import-btn").classList.toggle("sel", importOn);
      }
    });
    $("#hd-redraw").addEventListener("click", () => {
      tick();
      const pts = (pending || []).slice();
      closeHoodSheet();
      startMode("dots");
      dots = pts; // the drawn ring becomes editable corners — undo works
      refreshDraft();
    });

    const cvEl = $("#draw-canvas");
    cvEl.addEventListener("mousedown", pencilDown);
    cvEl.addEventListener("mousemove", pencilMove);
    cvEl.addEventListener("mouseup", pencilUp);
    cvEl.addEventListener("touchstart", pencilDown, { passive: false });
    cvEl.addEventListener("touchmove", pencilMove, { passive: false });
    cvEl.addEventListener("touchend", pencilUp, { passive: false });
  }

  window.MHOODS = {
    bind,
    isDrawing: () => mode !== null,
    createFromPoints: (pts) => openHoodSheet(pts, null), // lasso → hood
    // the saved territory's own sheet, for the screenshot harness and tests
    openExisting: (id) => {
      const t = STORE.territories.find((x) => x.id === id);
      if (t && t.points) openHoodSheet(t.points, t);
      return !!t;
    },
    closeTools: () => closeToolsIfOpen(),
    // the real renderer, exported so a test can drive it rather than type
    // the card's own text into the DOM and assert it back
    _showCard: showCard,
  };
})();
