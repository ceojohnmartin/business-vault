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
  let pending = null;       // points awaiting the save sheet
  let editingId = null;     // hood being edited in the sheet
  let assignTo = null;      // userId picked in the sheet (null = unassigned)
  let preAssign = null;     // "Give area" flow: the rep the new hood is for

  // ---------- draft rendering (dot mode) ----------
  // The shapes live behind the MMAP facade — this module only owns the
  // corner list and the toolbar state.
  function refreshDraft() {
    MMAP.setDraftRing(dots);
    $("#draw-done").disabled = dots.length < 3;
    $("#draw-undo").disabled = dots.length === 0;
  }

  function clearDraft() {
    dots = [];
    MMAP.setDraftRing(dots);
  }

  // ---------- mode lifecycle ----------
  function startMode(m) {
    if (!MMAP.isReady()) { toast("Map is still loading"); return; }
    stopMode();
    mode = m;
    $("#hood-menu").hidden = true;
    $("#draw-bar").hidden = false;
    const dotMode = m === "dots";
    $("#draw-undo").hidden = !dotMode;
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
    dots.push([e.lng, e.lat]);
    refreshDraft();
    return true; // consumed — no knock behind a draw tap
  }

  // ---------- save sheet ----------
  function openHoodSheet(points, hood) {
    pending = points;
    editingId = hood ? hood.id : null;
    assignTo = hood ? (hood.assignedTo || null) : preAssign;
    preAssign = null;
    $("#hood-sheet-title").textContent = hood ? "Edit territory" : "New territory";
    $("#hood-name").value = hood ? hood.name : "";
    $("#hood-homes").value = hood && hood.homes ? hood.homes : "";
    $("#hood-delete").hidden = !hood;
    $("#hood-archive").hidden = !hood;
    if (hood) $("#hood-archive").textContent = hood.archived ? "Unarchive territory" : "🗄 Archive territory";
    $("#hood-newrep-wrap").hidden = true;
    $("#hood-newrep").value = "";
    // Smart Split only makes sense on a saved hood, and only for managers
    $("#hood-split-wrap").hidden = !hood || !STORE.isManager();
    $("#hood-split-n").hidden = true;
    splitN = 0;
    renderRepChips();
    renderHoodHistory(hood);
    setupDoorsBlock(points, hood);
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
    lastScan = { fresh, res, forId: hood ? hood.id : null };
    const acres = Math.max(1, Math.round(res.areaKm2 * 247.105));
    if (!res.eligible.length) {
      st.innerHTML = `No residential doors found in this area` +
        `<br><span class="dim">${res.parcels.length} structure${res.parcels.length === 1 ? "" : "s"} checked · ~${acres} acres · ${MUI.esc(res.providerName)}</span>`;
      return;
    }
    st.innerHTML =
      `<b>${res.eligible.length} eligible door${res.eligible.length === 1 ? "" : "s"} found</b>` +
      `<br>${dupes ? `${dupes} already in RALLY · ` : ""}<b>${fresh.length} new</b>` +
      `${res.excluded ? ` · ${res.excluded} non-residential skipped` : ""} · ~${acres} acres` +
      `<br><span class="dim">via ${MUI.esc(res.providerName)}</span>` +
      (res.warnings || []).map((w) => `<br><span class="dim">⚠️ ${MUI.esc(w)}</span>`).join("");
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

  async function runImport(territoryId) {
    if (!lastScan || !lastScan.fresh.length) return { added: 0, skipped: 0, failed: 0 };
    // an edit-mode scan is bound to its territory; never import it into another
    if (lastScan.forId && lastScan.forId !== territoryId) return { added: 0, skipped: 0, failed: 0 };
    const fresh = lastScan.fresh;
    const st = $("#hd-status");
    const r = await STORE.importDoors(fresh, {
      territoryId,
      onProgress: (i, n) => { if (st) st.textContent = `Importing ${i} of ${n} doors…`; },
    });
    lastScan = null;
    MMAP.refreshPins();
    if (r.failed) toast(`Imported ${r.added} doors — ${r.failed} failed (storage may be full)`);
    else toast(`Import complete — ${r.added} door${r.added === 1 ? "" : "s"} pinned` +
      (r.skipped ? ` · ${r.skipped} already existed` : ""));
    return r;
  }

  function setupDoorsBlock(points, hood) {
    const wrap = $("#hood-doors");
    const manager = STORE.isManager();
    scanGen++; // sheet context changed: any scan still in flight is void
    lastScan = null; importOn = false;
    $("#hd-import-row").hidden = true;
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
    if (!confirm(`Split “${t.name}” into ${n} balanced hoods? The original is replaced (pins keep their history).`)) return;
    let kids;
    try {
      kids = await STORE.splitTerritory(t, n);
    } catch (_) {
      toast("Split failed — try a simpler shape");
      return;
    }
    editingId = null; pending = null;
    MMAP.refreshHoods();
    closeSheet();
    renderHoodList();
    toast(`Cut into ${kids.length} hoods — hand them out from the hoods list`);
  }

  // Assignment chips: the rep's territory color rides on the chip, so the
  // manager sees exactly what the map will paint.
  function renderRepChips() {
    const chips = [
      `<button type="button" class="reason rep-chip${assignTo === null ? " sel" : ""}" data-u="">
         <span class="dot" style="background:#8A93A6"></span>Unassigned</button>`,
      ...STORE.users.map((u) =>
        `<button type="button" class="reason rep-chip${assignTo === u.id ? " sel" : ""}" data-u="${u.id}">
           <span class="dot" style="background:${u.color}"></span>${MUI.esc(u.name)}</button>`),
      `<button type="button" class="reason rep-chip" data-u="+">+ New rep</button>`,
    ];
    $("#hood-reps").innerHTML = chips.join("");
    $$("#hood-reps .rep-chip").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        if (b.dataset.u === "+") {
          $("#hood-newrep-wrap").hidden = false;
          $("#hood-newrep").focus();
          return;
        }
        assignTo = b.dataset.u || null;
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

    const hist = (hood.assignments || []).slice(-3).reverse();
    if (hist.length) {
      html += `<div class="ce-sec" style="margin-top:14px">Assignment history</div>` +
        hist.map((a) =>
          `<div class="h-item" style="font-size:12.5px;color:var(--t3)">${MUI.esc(a.name)}
             · ${MUI.fmtDate(a.assignedAt)}${a.unassignedAt ? " → " + MUI.fmtDate(a.unassignedAt) : " → now"}</div>`
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
    const name = $("#hood-name").value.trim() || "Hood " + (STORE.territories.length + 1);
    const homes = Math.max(0, Math.min(100000, Number($("#hood-homes").value) || 0)) || null;
    // a typed-but-unadded new rep still counts — nobody loses that keystroke
    const newRepName = $("#hood-newrep-wrap").hidden ? "" : $("#hood-newrep").value.trim();
    let t;
    try {
      if (newRepName) {
        const u = await STORE.addUser({ name: newRepName, role: "rep" });
        assignTo = u.id;
      }
      if (editingId) {
        t = STORE.territories.find((x) => x.id === editingId);
        if (t) { t.name = name; t.homes = homes; await STORE.updateTerritory(t); }
      } else {
        t = await STORE.addTerritory({
          name, homes, points: pending,
          createdBy: (STORE.currentUser() || {}).id || null,
        });
      }
      if (t) await STORE.assignTerritory(t, assignTo);
    } catch (_) {
      toast("Couldn't save the hood — try again");
      return;
    }
    // the confirmed door import runs against the freshly saved territory,
    // with progress in the sheet's status line
    let imported = null;
    if (creating && t && importOn && lastScan && lastScan.fresh.length) {
      try { imported = await runImport(t.id); }
      catch (_) { toast("Import hit an error — scan the territory again to retry"); }
    }
    const who = assignTo && STORE.userById(assignTo);
    pending = null; editingId = null;
    MMAP.refreshHoods();
    closeSheet();
    renderHoodList();
    toast(imported && imported.added
      ? `${name} — ${imported.added} doors pinned${who ? ", assigned to " + who.name : ""}`
      : (who ? `${name} — assigned to ${who.name}` : `${name} saved`));
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
        $("#hood-menu").hidden = true;
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
    const manager = STORE.isManager();
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
      return `<div class="hood-row" data-id="${t.id}">
         <span class="dot" style="background:${STORE.hoodColor(t)}"></span>
         <span class="hn">${MUI.esc(t.name)}<span class="hr">${u ? MUI.esc(u.name) + " · " : ""}${doors}${prog}</span></span>
         ${manager ? `<button class="hood-edit" data-id="${t.id}" aria-label="Edit hood">✎</button>` : ""}
       </div>`;
    }).join("") +
    (archived.length
      ? `<div class="hood-sec">Archived</div>` + archived.map((t) =>
          `<div class="hood-row archived" data-id="${t.id}">
             <span class="dot" style="background:#B9BEC7"></span>
             <span class="hn">${MUI.esc(t.name)}<span class="hr">archived</span></span>
             <button class="hood-edit" data-id="${t.id}" aria-label="Edit hood">✎</button>
           </div>`).join("")
      : "");
    $$("#hood-list .hood-row").forEach((row) =>
      row.addEventListener("click", (e) => {
        if (e.target.closest(".hood-edit")) return;
        const t = STORE.territories.find((x) => x.id === row.dataset.id);
        if (t) { $("#hood-menu").hidden = true; MMAP.focusHood(t); }
      }));
    $$("#hood-list .hood-edit").forEach((b) =>
      b.addEventListener("click", () => {
        const t = STORE.territories.find((x) => x.id === b.dataset.id);
        if (t) { $("#hood-menu").hidden = true; openHoodSheet(t.points, t); }
      }));
  }

  function bind() {
    $("#fab-hoods").addEventListener("click", () => {
      tick();
      const menu = $("#hood-menu");
      menu.hidden = !menu.hidden;
      if (!menu.hidden) {
        // drawing and the heat view are manager tools; reps get their turf list only
        const manager = STORE.isManager();
        $("#hood-pencil").hidden = !manager;
        $("#hood-dots").hidden = !manager;
        $("#hood-heat").hidden = !manager;
        // lasso stays for everyone — reps use it to route a pocket of doors
        $("#hood-heat").textContent = MMAP.heatMode() ? "🎨 Ownership view" : "🔥 Freshness view";
        renderRepsPanel(manager);
        renderHoodList();
      }
    });
    $("#hood-heat").addEventListener("click", () => {
      tick();
      MMAP.setHeatMode(!MMAP.heatMode());
      $("#hood-menu").hidden = true;
      toast(MMAP.heatMode()
        ? "Freshness view — red and pink turf is ready to work"
        : "Back to ownership colors");
    });
    $("#hood-pencil").addEventListener("click", () => { tick(); startMode("pencil"); });
    $("#hood-dots").addEventListener("click", () => { tick(); startMode("dots"); });
    $("#hood-lasso").addEventListener("click", () => { tick(); startMode("lasso"); });
    $("#draw-cancel").addEventListener("click", () => { tick(); stopMode(); });
    $("#draw-undo").addEventListener("click", () => { tick(); dots.pop(); refreshDraft(); });
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
    $("#hood-delete").addEventListener("click", async () => {
      if (!editingId) return;
      if (!confirm("Delete this hood? Pins inside it are not affected.")) return;
      await STORE.deleteTerritory(editingId);
      editingId = null;
      MMAP.refreshHoods();
      closeSheet();
      toast("Hood deleted");
    });
    $("#hood-archive").addEventListener("click", async () => {
      const t = editingId && STORE.territories.find((x) => x.id === editingId);
      if (!t) return;
      t.archived = !t.archived;
      await STORE.updateTerritory(t);
      editingId = null;
      MMAP.refreshHoods();
      closeSheet();
      renderHoodList();
      toast(t.archived
        ? `${t.name} archived — doors and history are untouched`
        : `${t.name} is back on the map`);
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
      closeSheet();
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
  };
})();
