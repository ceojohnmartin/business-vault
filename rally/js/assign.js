/* RALLY — ASSIGN A TERRITORY TO A REP.

   One screen, one question: who works this turf?

   WHY IT IS A SET AND NOT A RADIO. The reference design shows a single
   chosen rep. RALLY's server does not model it that way and has not since
   v41: territories.assignees is an append-only ledger and open_assignees is
   a uuid[], because two reps genuinely do share a hood on a big night. So
   the control is a checkable row, not a radio, and the button says how many
   are going to get it. Presenting a set as a radio would either lie about
   what is saved or silently drop somebody's turf.

   WHY IT WRITES NOTHING ITSELF. This module collects a selection and hands
   it back. The write is STORE.createTerritory (new hood: geometry and
   assignment commit together in one save_territory call) or
   STORE.setAssignees (existing hood). Both are server-authoritative RPCs
   with an append-only ledger behind them; a second writer here would be a
   second version of the truth. */
(function () {
  const { $, esc, toast } = window.MUI;

  let sel = [];            // chosen user ids, in click order
  let onSave = null;       // (ids) => Promise
  let subtitle = "";
  let busy = false;

  const el = () => $("#assign-panel");

  /* How many live hoods each rep currently holds. Counted from the ledger
     through STORE.currentAssignees, never from the legacy assignedTo
     mirror, so a hood shared by two reps counts for both of them. */
  function territoryCount(userId) {
    return STORE.territories.filter(
      (t) => STORE.isLive(t) && STORE.currentAssignees(t).indexOf(userId) >= 0).length;
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }

  function reps() {
    const q = ($("#assign-search").value || "").trim().toLowerCase();
    return STORE.users
      .filter((u) => !u.disabled)
      .filter((u) => !q || u.name.toLowerCase().indexOf(q) >= 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function render() {
    const list = reps();
    const rows = list.map((u) => {
      const n = territoryCount(u.id);
      const on = sel.indexOf(u.id) >= 0;
      /* No photographs. RALLY stores none, and inventing a face for a real
         person is not a placeholder, it is a fabrication. The initials tile
         carries the rep's own hood colour, which is the same colour their
         turf is painted on the map — so the list and the map agree. */
      return `<button type="button" class="arep${on ? " on" : ""}" data-u="${esc(u.id)}"
                 role="checkbox" aria-checked="${on ? "true" : "false"}">
        <span class="av" style="background:${esc(u.color || "#8A93A6")}">${esc(initials(u.name))}</span>
        <span class="who">
          <span class="nm">${esc(u.name)}</span>
          <span class="sub">${n === 1 ? "1 territory" : n + " territories"}</span>
        </span>
        <span class="tick" aria-hidden="true"></span>
      </button>`;
    }).join("");

    $("#assign-list").innerHTML = rows ||
      `<div class="aempty">${$("#assign-search").value.trim()
        ? "No rep by that name."
        : "No reps yet — add one from the hood sheet."}</div>`;

    const btn = $("#assign-save");
    btn.disabled = busy;
    btn.textContent = busy ? "Saving…"
      : sel.length === 0 ? "Save with nobody assigned"
      : sel.length === 1 ? "Save assignment"
      : "Save assignment — " + sel.length + " reps";
    $("#assign-sub").textContent = subtitle;
  }

  function toggle(id) {
    const i = sel.indexOf(id);
    if (i >= 0) sel.splice(i, 1); else sel.push(id);
    render();
  }

  /* open({ preselect, subtitle, onSave })
       preselect  user ids already on the hood
       subtitle   the line under the title — "Polygon 10", say
       onSave     async (ids) => void; throwing leaves the panel open with
                  the reason, because the alternative is a panel that
                  closes on a failure and a manager who thinks it saved */
  function open(opts) {
    const o = opts || {};
    sel = (o.preselect || []).slice();
    subtitle = o.subtitle || "";
    onSave = o.onSave || null;
    busy = false;
    $("#assign-search").value = "";
    el().hidden = false;
    document.body.classList.add("assigning");
    render();
    // focus the search only on a pointer-capable screen: on a phone it
    // would throw the keyboard up over the list the manager wants to read
    if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      setTimeout(() => $("#assign-search").focus(), 60);
    }
  }

  function close() {
    el().hidden = true;
    document.body.classList.remove("assigning");
    sel = []; onSave = null; busy = false;
  }

  async function save() {
    if (busy || !onSave) return;
    busy = true; render();
    try {
      await onSave(sel.slice());
      close();
    } catch (err) {
      busy = false; render();
      toast((err && err.message) || "Couldn't save the assignment — try again", 6000);
    }
  }

  function wire() {
    if (!el()) return;
    $("#assign-list").addEventListener("click", (e) => {
      const b = e.target.closest(".arep");
      if (b) toggle(b.dataset.u);
    });
    $("#assign-search").addEventListener("input", render);
    $("#assign-save").addEventListener("click", save);
    $("#assign-close").addEventListener("click", close);
    $("#assign-scrim").addEventListener("click", close);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else { wire(); }

  window.MASSIGN = { open, close, selected: () => sel.slice() };
})();
