/* RALLY — smart re-knock route.
   Callbacks and not-homes are where D2D money hides. One tap builds an
   ordered walking route: due callbacks first, then upcoming ones, then
   aged not-homes and soft nos — greedy nearest-neighbor within each
   tier so the rep never criss-crosses the neighborhood. Rendered as a
   dashed path with numbered stops on the map. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, tick, esc } = MUI;

  let stops = []; // [{pin, tier, whyLabel, opp}]

  const toRad = Math.PI / 180;
  function meters(aLat, aLng, bLat, bLng) {
    const x = (bLng - aLng) * toRad * Math.cos(((aLat + bLat) / 2) * toRad);
    const y = (bLat - aLat) * toRad;
    return Math.sqrt(x * x + y * y) * 6371000;
  }

  // greedy nearest-neighbor ordering, tier by tier
  function order(cands, start) {
    const out = [];
    let cur = start;
    for (const tier of [1, 2, 3]) {
      const pool = cands.filter((c) => c.tier === tier);
      while (pool.length) {
        let best = 0, bestD = Infinity;
        pool.forEach((c, i) => {
          const d = meters(cur.lat, cur.lng, c.pin.lat, c.pin.lng);
          if (d < bestD) { bestD = d; best = i; }
        });
        const next = pool.splice(best, 1)[0];
        out.push(next);
        cur = next.pin;
      }
    }
    return out;
  }

  // which doors deserve another swing right now
  function candidates() {
    const me = STORE.currentUser();
    const manager = STORE.isManager();
    const myHoods = me ? STORE.hoodsOf(me.id) : [];
    const inScope = (p) =>
      manager || !myHoods.length || myHoods.some((t) => STORE.inHood(t, p.lng, p.lat));
    const now = Date.now();
    const out = [];
    STORE.pins.forEach((p) => {
      if (!inScope(p)) return;
      const attempts = (p.history || []).length;
      if (p.callbackAt && p.callbackAt <= now) {
        out.push({ pin: p, tier: 1, whyLabel: "Callback due " + MUI.fmtTime(p.callbackAt) });
      } else if (p.callbackAt) {
        out.push({ pin: p, tier: 2, whyLabel: "Callback " + MUI.fmtTime(p.callbackAt) });
      } else if (p.disposition === "nothome" && attempts < 4 && now - p.updatedAt > 3 * 3600e3) {
        out.push({ pin: p, tier: 3, whyLabel: "Not home ×" + attempts });
      } else if (p.disposition === "notint" && p.reason &&
                 MDATA.REKNOCK_REASONS.includes(p.reason) && now - p.updatedAt > 24 * 3600e3) {
        out.push({ pin: p, tier: 3, whyLabel: "Soft no — " + p.reason });
      }
    });
    return out;
  }

  function build() {
    const cands = candidates();
    if (!cands.length) { toast("Nothing to re-knock right now — go get fresh doors"); return false; }
    const m = MMAP.getMap();
    const c = m ? m.getCenter() : { lat: cands[0].pin.lat, lng: cands[0].pin.lng };
    stops = order(cands, { lat: c.lat, lng: c.lng }).slice(0, 20);
    stops.forEach((s) => { s.opp = STORE.oppScore(s.pin); });
    if (cands.length > 20) toast(`Routing the best 20 of ${cands.length} stops`);
    MMAP.showRoute(stops.map((s) => s.pin));
    renderSheet("callbacks first, then the closest door wins");
    openSheet("route-sheet");
    return true;
  }

  // route exactly these pins (bulk lasso) — nearest-neighbor from map center
  function buildFrom(pins) {
    if (!pins || !pins.length) { toast("Nothing to route"); return false; }
    const m = MMAP.getMap();
    const c = m ? m.getCenter() : { lat: pins[0].lat, lng: pins[0].lng };
    const cands = pins.map((p) => {
      const d = MDATA.DISPOSITIONS[p.disposition];
      return { pin: p, tier: 1, whyLabel: (d ? d.label : p.disposition) +
        (p.callbackAt ? " · ⏰ " + MUI.fmtTime(p.callbackAt) : "") };
    });
    stops = order(cands, { lat: c.lat, lng: c.lng }).slice(0, 20);
    stops.forEach((s) => { s.opp = STORE.oppScore(s.pin); });
    if (pins.length > 20) toast(`Routing the closest 20 of ${pins.length} doors`);
    MMAP.showRoute(stops.map((s) => s.pin));
    renderSheet("your lasso, walked in order — closest door first");
    if (window.MAPP) MAPP.show("map");
    openSheet("route-sheet");
    return true;
  }

  function renderSheet(why) {
    $("#route-sub").textContent =
      `${stops.length} stop${stops.length === 1 ? "" : "s"} — ${why}`;
    $("#route-list").innerHTML = stops.map((s, i) =>
      `<button class="route-stop" data-pid="${s.pin.id}" type="button">
         <span class="rs-n num">${i + 1}</span>
         <span class="rs-body"><b>${esc(s.pin.address || (s.pin.lat.toFixed(4) + ", " + s.pin.lng.toFixed(4)))}</b>
           <span class="dim">${esc(s.whyLabel)}</span></span>
         <span class="rs-opp num" title="Opportunity">${s.opp.score}</span>
       </button>`
    ).join("");
    $$("#route-list .route-stop").forEach((b) =>
      b.addEventListener("click", () => {
        closeSheet();
        if (window.MAPP) MAPP.show("map");
        MMAP.focusPin(b.dataset.pid);
      }));
  }

  function clear() {
    stops = [];
    MMAP.clearRoute();
    toast("Route ended");
  }

  const hasCandidates = () => candidates().length > 0;

  function bind() {
    $("#route-start").addEventListener("click", () => {
      tick();
      closeSheet();
      if (window.MAPP) MAPP.show("map");
      if (stops.length) MMAP.focusPin(stops[0].pin.id);
    });
    $("#route-end").addEventListener("click", () => { tick(); closeSheet(); clear(); });
  }

  window.MROUTE = { build, buildFrom, clear, bind, hasCandidates };
})();
