/* RALLY — street mode: work one street door by door.
   The map answers "where?"; this answers "which door is next on THIS
   street?" Doors are grouped by street name parsed from the pin address,
   sorted by house number, filterable by status and by odd/even side —
   the classic D2D pattern of working one side of the road at a time.
   Tapping a door opens the exact same pin sheet the map uses. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, tick, esc } = MUI;

  let street = null;   // selected street name
  let filter = "all";  // all | nothome | cb | odd | even

  // "4207 Cypress Bend Ave, Baton Rouge" -> { num: 4207, street: "Cypress Bend Ave" }
  function parse(p) {
    const first = (p.address || "").split(",")[0].trim();
    const m = /^(\d+)[A-Za-z]?\s+(.{2,})$/.exec(first);
    return m ? { num: parseInt(m[1], 10), street: m[2] } : null;
  }

  function groups() {
    const by = new Map();
    STORE.pins.forEach((p) => {
      const g = parse(p);
      if (!g) return;
      const key = g.street.toLowerCase();
      if (!by.has(key)) by.set(key, { name: g.street, doors: [] });
      by.get(key).doors.push({ pin: p, num: g.num });
    });
    return [...by.values()].sort((a, b) => b.doors.length - a.doors.length);
  }

  function open() {
    const gs = groups();
    if (!gs.length) {
      toast("No addressed doors yet — knock a few and street mode lights up");
      return;
    }
    if (!street || !gs.some((g) => g.name === street)) street = gs[0].name;
    render(gs);
    openSheet("street-sheet");
  }

  const matches = (d) =>
    filter === "all" ? true :
    filter === "odd" ? d.num % 2 === 1 :
    filter === "even" ? d.num % 2 === 0 :
    filter === "cb" ? !!d.pin.callbackAt :
    d.pin.disposition === filter;

  function render(gs) {
    gs = gs || groups();
    const g = gs.find((x) => x.name === street) || gs[0];
    street = g.name;

    $("#street-streets").innerHTML = gs.slice(0, 10).map((x) =>
      `<button type="button" class="reason st-chip${x.name === street ? " sel" : ""}" data-s="${esc(x.name)}">
         ${esc(x.name)} <b class="num">${x.doors.length}</b></button>`).join("");

    const F = [["all", "All"], ["unworked", "Untouched"], ["nothome", "Not home"], ["cb", "Callbacks"], ["odd", "Odd"], ["even", "Even"]];
    $("#street-filters").innerHTML = F.map(([id, label]) =>
      `<button type="button" class="reason sf-chip${filter === id ? " sel" : ""}" data-f="${id}">${label}</button>`).join("");

    const doors = g.doors.slice().sort((a, b) => a.num - b.num).filter(matches);
    $("#street-sub").textContent =
      `${g.doors.length} known door${g.doors.length === 1 ? "" : "s"} on ${g.name} — unpinned houses between them are fresh`;
    $("#street-list").innerHTML = doors.map((d) => {
      const p = d.pin;
      const disp = MDATA.DISPOSITIONS[p.disposition];
      return `<button class="street-row" data-pid="${p.id}" type="button">
        <span class="stn num">${d.num}</span>
        <span class="stb"><b>${esc((p.address || "").split(",")[0])}</b>
          <span class="dim"><span class="sw ${p.disposition}"></span>${disp ? disp.label : esc(p.disposition)}${p.callbackAt ? " · ⏰ " + MUI.fmtTime(p.callbackAt) : ""} · ${MUI.fmtAgo(p.updatedAt)}</span></span>
        <span class="su-cta">Map ›</span>
      </button>`;
    }).join("") || `<div class="hood-empty">No doors match that filter</div>`;

    $$("#street-streets .st-chip").forEach((b) =>
      b.addEventListener("click", () => { tick(); street = b.dataset.s; render(); }));
    $$("#street-filters .sf-chip").forEach((b) =>
      b.addEventListener("click", () => { tick(); filter = b.dataset.f; render(); }));
    $$("#street-list .street-row").forEach((b) =>
      b.addEventListener("click", () => {
        closeSheet();
        MMAP.focusPin(b.dataset.pid);
      }));
  }

  function bind() {
    $("#fab-street").addEventListener("click", () => { tick(); open(); });
  }

  window.MSTREET = { bind, open };
})();
