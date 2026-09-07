/* RALLY v41 — TURF OPERATIONS on the Route tab.

   Two views of the same hoods, decided by what the person is:

     REP     the hoods assigned to me, each with what is LEFT to knock this
             cycle. A rep opens Route to answer one question — where do I
             go next — so the number that leads is doors remaining, not a
             percentage.

     LEADER  every live hood, who is on it, how far through the cycle it
             is, and the two operations that move a hood forward: change
             who works it, and start a fresh cycle.

   THE NUMBERS COME FROM STORE.routeMetrics, and nothing is computed twice
   here. A door is prior non-prospect (a signed household or a standing
   do-not-knock), worked this cycle, or remaining — exactly one of the
   three — so "worked + remaining" always equals the actionable total and
   the bar can never disagree with the count beside it.

   CLEAR OUTCOMES moves one monotonic boundary and writes no pins. Every
   door it appears to reset is derived at read time, which is why it is
   instant on a hood of any size and why nothing it does can be lost.

   CLEARING A DO-NOT-KNOCK is deliberately not a disposition tap. It takes
   an explicit action with a written reason, and the server refuses every
   other route to it — including an ordinary edit by a manager. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, tick, esc } = MUI;

  let sheetHood = null;   // the hood open in the assignment sheet
  let sheetSet = [];      // the reps it will have when saved

  const CAP = "assignmentServerAuthoritative";

  // ---------- the connectivity gate ----------

  /* Leadership turf work is confirmed by the server. Until this device has
     SEEN the server say assignment authority is live, a turf change made
     offline would be written under legacy rules with nothing able to
     correct it — so it is refused with a reason rather than accepted and
     quietly lost. Rep field work never asks this question: knocks, notes,
     callbacks, outcomes and customers stay fully offline-first. */
  async function gate(what, needsServer) {
    if (window.MSYNC && MSYNC.recheckCapability) {
      try { await MSYNC.recheckCapability(CAP); } catch (_) {}
    }
    const g = STORE.turfGate({ needsServer: needsServer !== false });
    if (!g.ok) {
      toast(g.code === "offline" ? "Connect to manage turf — " + (what || "this change") +
        " is confirmed by the server" : g.reason);
      return false;
    }
    return true;
  }

  // ---------- rendering ----------

  const pctBar = (m) => {
    if (m.pct === null) {
      return `<div class="turf-bar none"><span style="width:0%"></span></div>`;
    }
    return `<div class="turf-bar"><span style="width:${m.pct}%"></span></div>`;
  };

  function evidenceNote(m) {
    if (!m.priorUnknown) return "";
    return `<div class="turf-note dim">${m.priorUnknown} door${m.priorUnknown === 1 ? "" : "s"} ` +
      `held back — a customer or a do-not-knock we can't date. They are never offered as fresh turf.</div>`;
  }

  function hoodRow(t, m, opts) {
    const o = opts || {};
    const names = STORE.currentAssignees(t)
      .map((id) => (STORE.userById(id) || {}).name || "—");
    const who = names.length ? names.join(" · ") : "Unassigned";
    const cycle = m.cycleStartedAt
      ? "cycle started " + MUI.fmtDate(m.cycleStartedAt)
      : "first pass — all history counts";
    const left = m.pct === null
      ? "no prospect doors"
      : `<b>${m.remaining}</b> left of ${m.actionable}`;
    return `<div class="turf-row" data-tid="${t.id}">
        <div class="turf-head">
          <span class="turf-name"><span class="dot" style="background:${STORE.hoodColor(t)}"></span>${esc(t.name || "Hood")}</span>
          <span class="turf-pct num">${m.pct === null ? "—" : m.pct + "%"}</span>
        </div>
        ${pctBar(m)}
        <div class="turf-meta dim">${left} · ${esc(who)}</div>
        <div class="turf-meta dim">${cycle}${m.callbacks ? ` · ⏰ ${m.callbacks} callback${m.callbacks === 1 ? "" : "s"}` : ""}${
          m.salesThisCycle ? ` · ${m.salesThisCycle} sold this cycle` : ""}${
          m.salesUnknown ? ` <span title="signed, but no recoverable sale event">(+${m.salesUnknown} unconfirmed)</span>` : ""}</div>
        ${evidenceNote(m)}
        ${o.actions ? `<div class="turf-actions">
          <button class="mini" type="button" data-act="go" data-tid="${t.id}">Map</button>
          <button class="mini" type="button" data-act="assign" data-tid="${t.id}">Who works it</button>
          <button class="mini" type="button" data-act="cycle" data-tid="${t.id}">Clear outcomes</button>
        </div>` : `<div class="turf-actions">
          <button class="mini" type="button" data-act="go" data-tid="${t.id}">Take me there</button>
        </div>`}
      </div>`;
  }

  /* The whole block, rendered into the Route tab above the day's visits.
     Built in ONE pass over the door facts: the index is expensive to build
     and cheap to reuse, and a hood list that rebuilt it per hood would be
     quadratic on a real book. */
  function render() {
    const wrap = $("#sched-turf");
    if (!wrap) return;
    const me = STORE.currentUser();
    const leader = STORE.canManageTerritories();
    const hoods = leader
      ? STORE.territories.filter(STORE.isLive)
      : (me ? STORE.hoodsOf(me.id) : []);
    if (!hoods.length) {
      wrap.innerHTML = leader
        ? `<div class="turf-block"><div class="sw-title">Turf</div>
             <div class="empty plain">No hoods yet — draw one on the map.</div></div>`
        : "";
      wrap.hidden = !leader;
      return;
    }
    const facts = STORE.doorFacts();
    const rows = hoods.map((t) => ({ t, m: STORE.routeMetrics(t, facts) }));
    // the hood with the most left to do leads: that is where a rep goes next
    rows.sort((a, b) => (b.m.remaining - a.m.remaining) || (a.t.name || "").localeCompare(b.t.name || ""));
    const totalLeft = rows.reduce((n, r) => n + r.m.remaining, 0);
    wrap.hidden = false;
    wrap.innerHTML = `<div class="turf-block">
        <div class="sw-title">${leader ? "Turf" : "My turf"}
          <span class="dim" style="font-weight:500">${totalLeft} door${totalLeft === 1 ? "" : "s"} left</span></div>
        ${rows.map((r) => hoodRow(r.t, r.m, { actions: leader })).join("")}
      </div>`;
    bindRows(wrap);
  }

  function bindRows(wrap) {
    $$(".turf-actions .mini", wrap).forEach((b) =>
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        tick();
        const t = STORE.territories.find((x) => x.id === b.dataset.tid);
        if (!t) return;
        if (b.dataset.act === "go") {
          if (window.MAPP) MAPP.show("map");
          if (window.MMAP && MMAP.focusHood) MMAP.focusHood(t);
          return;
        }
        if (b.dataset.act === "assign") return openAssign(t);
        if (b.dataset.act === "cycle") return confirmCycle(t);
      }));
  }

  // ---------- who works it ----------

  function openAssign(t) {
    sheetHood = t;
    sheetSet = STORE.currentAssignees(t).slice();
    $("#turf-assign-title").textContent = t.name || "Hood";
    renderAssignChips();
    renderAssignHistory(t);
    openSheet("turf-assign-sheet");
  }

  function renderAssignChips() {
    const on = (id) => sheetSet.indexOf(id) >= 0;
    $("#turf-assign-chips").innerHTML = [
      `<button type="button" class="reason rep-chip${sheetSet.length === 0 ? " sel" : ""}" data-u="">
         <span class="dot" style="background:#8A93A6"></span>Nobody</button>`,
      ...STORE.users.map((u) =>
        `<button type="button" class="reason rep-chip${on(u.id) ? " sel" : ""}" data-u="${u.id}">
           <span class="dot" style="background:${u.color}"></span>${esc(u.name)}</button>`),
    ].join("");
    $("#turf-assign-note").textContent = sheetSet.length > 1
      ? sheetSet.length + " reps on this hood — it appears in all of their lists"
      : (sheetSet.length ? "" : "Nobody is working this hood right now");
    $$("#turf-assign-chips .rep-chip").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        const id = b.dataset.u;
        if (!id) sheetSet = [];
        else if (on(id)) sheetSet = sheetSet.filter((x) => x !== id);
        else sheetSet = sheetSet.concat([id]);
        renderAssignChips();
      }));
  }

  function renderAssignHistory(t) {
    const hist = STORE.assigneeHistory(t).slice().reverse().slice(0, 8);
    $("#turf-assign-history").innerHTML = hist.length
      ? `<div class="ce-sec" style="margin-top:14px">History</div>` + hist.map((a) =>
          `<div class="h-item" style="font-size:12.5px;color:var(--t3)">${esc(a.name || "Former rep")}
             · ${MUI.fmtDate(a.assignedAt)}${a.open ? " → now" : " → " + MUI.fmtDate(a.unassignedAt)}` +
          (a.viaSplit ? ` <span class="dim">· inherited from a split</span>` : "") + `</div>`).join("")
      : "";
  }

  async function saveAssign() {
    if (!sheetHood) return;
    if (!(await gate("who works a hood"))) return;
    try {
      await STORE.setAssignees(sheetHood, sheetSet);
    } catch (err) {
      /* Say what is actually wrong. "Try again" on a save that can NEVER
         succeed — a rep with no account cannot be given turf — sends a
         leader round a loop with no way out, and the one message that
         tells them what to fix is the one being thrown away. */
      toast((err && err.message) || "Couldn't save that — try again");
      return;
    }
    const names = sheetSet.map((id) => (STORE.userById(id) || {}).name).filter(Boolean);
    closeSheet();
    if (window.MMAP && MMAP.isReady && MMAP.isReady()) MMAP.refreshHoods();
    render();
    toast(names.length ? (sheetHood.name || "Hood") + " → " + names.join(", ")
                       : (sheetHood.name || "Hood") + " is unassigned");
    sheetHood = null;
  }

  // ---------- clear outcomes ----------

  async function confirmCycle(t) {
    const m = STORE.routeMetrics(t);
    const msg = `Start a fresh pass on ${t.name || "this hood"}?\n\n` +
      `${m.worked} worked door${m.worked === 1 ? "" : "s"} go back to unworked so the hood can be ` +
      `run again.\n\nNothing is deleted: every knock, note, callback and customer stays, ` +
      `do-not-knock doors stay black, and your ${m.priorCustomers} customer` +
      `${m.priorCustomers === 1 ? "" : "s"} here stay green.`;
    if (!confirm(msg)) return;
    if (!(await gate("starting a fresh pass"))) return;
    try {
      await STORE.startCycle(t);
    } catch (err) {
      toast((err && err.message) || "Couldn't start the pass — try again");
      return;
    }
    if (window.MMAP && MMAP.isReady && MMAP.isReady()) MMAP.refreshPins();
    render();
    toast((t.name || "Hood") + " — fresh pass started");
  }

  // ---------- clearing a do-not-knock ----------

  /* Never a disposition tap. The rep-facing app has no path to this at all;
     a leader gets here from the door itself, types why, and the server
     records an event that no client can edit or delete. */
  async function clearDnk(pin) {
    if (!STORE.canManageTerritories()) {
      toast("Only a manager can clear a do-not-knock");
      return false;
    }
    const reason = prompt(
      "Clearing a do-not-knock is recorded permanently.\n\n" +
      "Why is this door knockable again? (e.g. new owner, request withdrawn in writing)");
    if (reason === null) return false;
    if (!reason.trim()) { toast("A reason is required"); return false; }
    if (!(await gate("clearing a do-not-knock"))) return false;
    try {
      await STORE.clearPinDnk(pin, reason.trim());
    } catch (err) {
      toast((err && err.message) || "Couldn't clear it — try again");
      return false;
    }
    if (window.MMAP && MMAP.isReady && MMAP.isReady()) MMAP.refreshPins();
    toast("Do-not-knock cleared and recorded");
    return true;
  }

  function bind() {
    const save = $("#turf-assign-save");
    if (save) save.addEventListener("click", () => { tick(); saveAssign(); });
    const cancel = $("#turf-assign-cancel");
    if (cancel) cancel.addEventListener("click", () => { tick(); closeSheet(); sheetHood = null; });
  }

  window.MTURF = { render, bind, openAssign, confirmCycle, clearDnk, gate };
})();
