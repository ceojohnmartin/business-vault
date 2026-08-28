/* RALLY — bulk lasso: circle doors on the map, then act on all of them.
   The gesture itself is the hoods pencil (no duplicated draw code — hoods.js
   hands the closed ring here in "lasso" mode). What you get: a status
   breakdown of everything inside, one-tap routing through the selection,
   and for managers a hood cut to exactly that circle or a confirmed bulk
   delete. */
(function () {
  const { $, openSheet, closeSheet, toast, tick, esc } = MUI;

  let sel = [];    // pins inside the last lasso
  let ring = null; // the lasso polygon, [[lng,lat],...]

  function open(coords) {
    ring = coords;
    sel = STORE.pins.filter((p) => MGEO.inRing(coords, p.lng, p.lat));
    if (!sel.length) { toast("No doors inside that circle"); return; }

    $("#lasso-title").textContent = `${sel.length} door${sel.length === 1 ? "" : "s"} selected`;
    const counts = {};
    sel.forEach((p) => { counts[p.disposition] = (counts[p.disposition] || 0) + 1; });
    const cbs = sel.filter((p) => p.callbackAt).length;
    $("#lasso-break").innerHTML =
      Object.keys(counts).map((d) => {
        const disp = MDATA.DISPOSITIONS[d];
        return `<span class="lb-chip"><span class="sw ${d}"></span>${disp ? disp.label : esc(d)} <b class="num">${counts[d]}</b></span>`;
      }).join("") +
      (cbs ? `<span class="lb-chip">⏰ Callbacks <b class="num">${cbs}</b></span>` : "");

    const manager = STORE.isManager();
    $("#lasso-hood").hidden = !manager;
    $("#lasso-delete").hidden = !manager;
    openSheet("lasso-sheet");
  }

  function bind() {
    $("#lasso-route").addEventListener("click", () => {
      tick();
      closeSheet();
      MROUTE.buildFrom(sel);
    });
    $("#lasso-hood").addEventListener("click", () => {
      tick();
      closeSheet();
      MHOODS.createFromPoints(ring);
    });
    $("#lasso-delete").addEventListener("click", async () => {
      if (!confirm(`Delete ${sel.length} pin${sel.length === 1 ? "" : "s"} and their whole knock history? This cannot be undone.`)) return;
      for (const p of sel) {
        try { await STORE.deletePin(p.id); } catch (_) {}
      }
      sel = [];
      MMAP.refreshPins();
      if (window.MSTAT) MSTAT.render();
      closeSheet();
      toast("Pins deleted");
    });
  }

  window.MSELECT = { bind, open };
})();
