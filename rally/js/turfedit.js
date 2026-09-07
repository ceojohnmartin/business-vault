/* RALLY v41 — editing turf that already exists.

   Drawing a hood was always possible; CHANGING one was not, and a boundary
   that cannot be moved stops describing the ground within a season. This
   adds the three things a leader actually needs:

     MOVE A CORNER   drag a handle
     ADD A CORNER    drag the faint handle on an edge's midpoint
     MOVE THE WHOLE  drag inside the shape

   SNAP TO A NEIGHBOUR. Two hoods traced to the same street by hand do not
   share a boundary — they overlap by a few square metres, which the server
   refuses. So a corner dragged near a neighbour's corner or edge snaps onto
   it exactly, producing a genuinely shared boundary that measures 0 m². The
   snap is an OFFER: it never fires unless the corner is already within a
   few metres, the leader can always place a corner by hand, and nothing is
   moved that they did not drag.

   THE ADVISORY IS NOT THE INVARIANT. The overlap shown while dragging is
   computed on this device, in a local plane, and is accurate to well within
   the tolerance — but the authority is the database, on the spheroid, in a
   deferred constraint that also serialises two leaders drawing at once.
   This is here so a leader sees the collision before they save, not so the
   client gets to decide. */
(function () {
  const { $, toast, tick, esc } = MUI;

  let live = null;   // { hood, points, handles[], bar, dirty }
  let dragging = null;
  let watching = false;

  /* HANDLES FOLLOW THE CAMERA. They are HTML over the canvas, so a pan or a
     zoom leaves every one of them pinned to where its corner used to be —
     and a leader would be dragging a handle that no longer marks anything.
     Registered ONCE, and a no-op while the editor is closed. */
  function watchCamera() {
    if (watching || !window.MMAP || !MMAP.onMapMove) return;
    watching = true;
    MMAP.onMapMove(() => { if (live && !dragging) paintHandles(); });
  }

  const TOL = () => MGEOM.OVERLAP_TOLERANCE_M2;
  const SNAP_PX = 26;   // finger-sized, converted to metres per zoom below

  // ---------- geometry helpers bound to the current camera ----------

  const toScreen = (p) => MMAP.project(p[0], p[1]);
  const toLngLat = (x, y) => { const ll = MMAP.unproject(x, y); return [ll.lng, ll.lat]; };

  // how many metres a finger-sized radius covers at the current zoom
  function snapMetres() {
    const c = MMAP.getCenter();
    if (!c) return 8;
    const a = MMAP.project(c.lng, c.lat);
    const b = MMAP.unproject(a.x + SNAP_PX, a.y);
    return Math.max(1, MGEOM.distanceM(c.lng, c.lat, b.lng, b.lat));
  }

  const neighbours = () =>
    STORE.territories.filter((t) => STORE.isLive(t) && t.id !== (live.hood && live.hood.id) &&
      t.points && t.points.length >= 3);

  /* Worst overlap against any other live hood, with the hood it hits. The
     same measurement the server makes, in a local plane rather than on the
     spheroid — close enough to warn, never the thing that decides. */
  function worstOverlap(points) {
    let worst = { m2: 0, other: null };
    neighbours().forEach((t) => {
      const m2 = MGEOM.overlapM2(points, t.points);
      if (m2 > worst.m2) worst = { m2, other: t };
    });
    return worst;
  }

  // ---------- the bar ----------

  function verdict() {
    const v = MGEOM.validate(live.points);
    if (!v.ok) return { ok: false, msg: v.reason };
    const w = worstOverlap(v.points);
    if (w.m2 > TOL()) {
      return { ok: false, msg: `Overlaps ${esc(w.other.name || "another hood")} by ` +
        `${w.m2 < 10 ? w.m2.toFixed(1) : Math.round(w.m2)} m² — hoods may share a boundary, not ground.` };
    }
    const acres = Math.max(0, v.areaM2 / 4046.86);
    return { ok: true, msg: `${live.points.length} corners · ~${acres.toFixed(acres < 10 ? 1 : 0)} acres` +
      (w.m2 > 0 ? ` · touching ${esc(w.other.name || "a neighbour")}` : "") };
  }

  function paintBar() {
    const v = verdict();
    const msg = $(".vx-msg", live.bar);
    msg.innerHTML = v.msg;
    msg.classList.toggle("bad", !v.ok);
    $("#vx-save", live.bar).disabled = !v.ok;
  }

  // ---------- handles ----------

  function clearHandles() {
    (live.handles || []).forEach((h) => h.remove());
    live.handles = [];
  }

  /* One handle per corner, plus a faint one at each edge's midpoint that
     ADDS a corner when dragged. Rebuilt on every change and every camera
     move — a handle is a position, not a thing with state, so redrawing is
     both simpler and impossible to get out of step. */
  function paintHandles() {
    clearHandles();
    const wrap = $("#mapwrap");
    const pts = live.points;
    pts.forEach((p, i) => {
      const s = toScreen(p);
      if (!s) return;
      const el = document.createElement("div");
      el.className = "vx-handle";
      el.style.cssText = `position:absolute;left:${s.x - 11}px;top:${s.y - 11}px;z-index:41;touch-action:none`;
      el.dataset.i = String(i);
      el.addEventListener("pointerdown", (e) => beginDrag(e, { kind: "vertex", i }));
      wrap.appendChild(el);
      live.handles.push(el);
    });
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const a = toScreen(p), b = toScreen(q);
      if (!a || !b) return;
      const el = document.createElement("div");
      el.className = "vx-handle mid";
      el.style.cssText = `position:absolute;left:${(a.x + b.x) / 2 - 7}px;top:${(a.y + b.y) / 2 - 7}px;z-index:41;touch-action:none`;
      el.addEventListener("pointerdown", (e) => beginDrag(e, { kind: "insert", i }));
      wrap.appendChild(el);
      live.handles.push(el);
    });
  }

  function repaint() {
    MMAP.setDraftRing(live.points);
    paintHandles();
    paintBar();
  }

  // ---------- dragging ----------

  function beginDrag(e, what) {
    e.preventDefault();
    e.stopPropagation();
    tick();
    let target = what;
    if (what.kind === "insert") {
      // materialise the new corner where the midpoint sits, then drag IT
      const p = live.points[what.i], q = live.points[(what.i + 1) % live.points.length];
      live.points.splice(what.i + 1, 0, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
      target = { kind: "vertex", i: what.i + 1 };
    }
    dragging = { target, moved: false, snapped: null };
    MMAP.setDragPan(false);
    /* Both enders are removed explicitly rather than each being `once`.
       With `once` only the one that actually fires is cleaned up, so every
       drag leaves the other bound to the window for the life of the
       session — and a stray pointercancel later (iOS raises them freely)
       would then abort an unrelated drag mid-gesture. */
    window.addEventListener("pointermove", onDrag, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    if (what.kind === "insert") repaint();
  }

  function onDrag(e) {
    if (!dragging || !live) return;
    e.preventDefault();
    dragging.moved = true;
    const wrap = $("#mapwrap").getBoundingClientRect();
    const raw = toLngLat(e.clientX - wrap.left, e.clientY - wrap.top);
    /* SNAP: a corner near a neighbour's corner or edge takes that exact
       position, so the two hoods end up sharing a boundary instead of
       crossing by a sliver. A vertex wins over an edge inside the same
       radius — matching a corner is what actually produces a shared line. */
    const s = MGEOM.snap(raw[0], raw[1], neighbours(), snapMetres());
    const pt = s ? [s.lng, s.lat] : raw;
    dragging.snapped = s ? s.kind : null;
    live.points[dragging.target.i] = pt;
    live.dirty = true;
    repaint();
  }

  function endDrag() {
    window.removeEventListener("pointermove", onDrag);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    MMAP.setDragPan(true);
    if (dragging && dragging.snapped) {
      toast(dragging.snapped === "vertex" ? "Snapped to the neighbour's corner"
                                          : "Snapped to the neighbour's edge");
    }
    dragging = null;
  }

  /* Moving the WHOLE shape. Dragging inside the polygon translates every
     corner by the same offset, so the outline keeps its exact form — a
     rotation or a scale would be a redraw, and this is a move. */
  function beginShapeDrag(e) {
    if (!live) return false;
    const wrap = $("#mapwrap").getBoundingClientRect();
    const start = toLngLat(e.clientX - wrap.left, e.clientY - wrap.top);
    if (!MGEOM.pointInRing(live.points, start[0], start[1])) return false;
    e.preventDefault();
    /* THE MAP MUST HOLD STILL. Otherwise its drag-pan runs alongside this
       one and keeps the grabbed ground under the finger, so the offset is
       always zero, the hood never moves, and the map slides away instead.
       Stopping the pointer event does not stop it: the engine listens for
       mousedown and touchstart, which are different events. */
    MMAP.setDragPan(false);
    const origin = live.points.map((p) => [p[0], p[1]]);
    const move = (ev) => {
      if (!live) return up();          // the editor closed mid-gesture
      ev.preventDefault();
      const now = toLngLat(ev.clientX - wrap.left, ev.clientY - wrap.top);
      const dx = now[0] - start[0], dy = now[1] - start[1];
      live.points = origin.map((p) => [p[0] + dx, p[1] + dy]);
      live.dirty = true;
      repaint();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      MMAP.setDragPan(true);
      if (live) live.shapeDrag = null;
    };
    /* Held on `live` so close() can end a gesture the browser never
       finished — a pointercancel that the OS swallows would otherwise leave
       `move` bound to the window, and from then on every unrelated pointer
       movement would drag the hood. */
    live.shapeDrag = up;
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return true;
  }

  // ---------- lifecycle ----------

  async function open(hood) {
    if (!hood || !hood.points || hood.points.length < 3) {
      toast("This hood has no outline to edit");
      return false;
    }
    if (window.MTURF && !(await MTURF.gate("changing an outline", false))) return false;
    if (!MMAP.isReady()) { toast("Map is still loading"); return false; }
    close(true);
    if (window.MAPP) MAPP.show("map");
    MMAP.focusHood(hood);

    const bar = document.createElement("div");
    bar.className = "vx-bar";
    // btn-gold / btn-ghost are the classes app.css actually defines;
    // `primary` and `ghost` alone render as unstyled full-width text
    bar.innerHTML = `<div class="vx-msg"></div>
      <div class="vx-btns">
        <button class="btn btn-ghost" id="vx-cancel" type="button">Cancel</button>
        <button class="btn btn-ghost" id="vx-revert" type="button">Undo all</button>
        <button class="btn btn-gold" id="vx-save" type="button">Save outline</button>
      </div>`;
    $("#mapwrap").appendChild(bar);

    live = {
      hood,
      points: hood.points.map((p) => [p[0], p[1]]),
      original: hood.points.map((p) => [p[0], p[1]]),
      handles: [], bar, dirty: false,
    };
    $("#vx-cancel", bar).addEventListener("click", () => { tick(); close(); });
    $("#vx-revert", bar).addEventListener("click", () => {
      tick();
      live.points = live.original.map((p) => [p[0], p[1]]);
      live.dirty = false;
      repaint();
    });
    $("#vx-save", bar).addEventListener("click", () => { tick(); save(); });
    $("#mapwrap").addEventListener("pointerdown", onShapePointer, true);
    watchCamera();
    repaint();
    return true;
  }

  function onShapePointer(e) {
    if (!live || dragging) return;
    if (e.target && e.target.closest && e.target.closest(".vx-handle, .vx-bar")) return;
    if (beginShapeDrag(e)) e.stopPropagation();
  }

  function close(quiet) {
    if (!live) return;
    if (live.shapeDrag) live.shapeDrag();
    if (dragging) endDrag();
    MMAP.setDragPan(true);
    clearHandles();
    if (live.bar) live.bar.remove();
    $("#mapwrap").removeEventListener("pointerdown", onShapePointer, true);
    MMAP.setDraftRing([]);
    live = null;
    dragging = null;
    if (!quiet) MMAP.refreshHoods();
  }

  async function save() {
    const v = verdict();
    if (!v.ok) { toast("Fix the outline first — " + String(v.msg).replace(/<[^>]+>/g, "")); return; }
    // guarded the same way open() is: this module must not assume its
    // sibling loaded, and the order of two script tags is not a contract
    if (window.MTURF && !(await MTURF.gate("changing an outline"))) return;
    const t = live.hood;
    const before = live.original;
    const next = MGEOM.validate(live.points).points;
    t.points = next;
    try {
      await STORE.updateTerritory(t);
    } catch (_) {
      t.points = before;
      toast("Couldn't save the outline — try again");
      return;
    }
    close();
    MMAP.refreshHoods();
    /* Doors do not move, but their HOOD may have: a corner pulled across a
       street re-homes every door it crossed. The canonical membership rule
       (STORE.hoodOf) answers that at read time, so nothing has to be
       rewritten — the Route figures and the Schedule simply tell the truth
       on their next paint. */
    if (window.MTURF) MTURF.render();
    if (window.MSCHED) MSCHED.render();
    MMAP.refreshPins();
    toast((t.name || "Hood") + " — outline saved");
  }

  window.MTEDIT = { open, close, isOpen: () => !!live };
})();
