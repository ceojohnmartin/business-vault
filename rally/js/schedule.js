/* RALLY — schedule: every service appointment across the book, grouped by
   day, with the not-yet-scheduled customers surfaced on top so nobody
   falls through the cracks. Marking a visit Serviced is what turns the
   customer's status line green everywhere. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, tick, esc } = MUI;

  let sel = null; // {cust, ap} the appointment open in the action sheet

  function dayLabel(ts) {
    const d = new Date(ts); d.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / 86400e3);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }

  function render() {
    const wrap = $("#sched-list");
    const unscheduled = STORE.customers.filter(
      (c) => !STORE.nextAppointment(c) && !STORE.lastServiced(c));
    const appts = STORE.allAppointments();

    let html = "";

    if (unscheduled.length) {
      html += `<div class="sched-warn">
        <div class="sw-title">⚠️ Not scheduled (${unscheduled.length})</div>` +
        unscheduled.map((c) =>
          `<button class="sched-un" data-cid="${c.id}" type="button">
             <span><b>${esc(STORE.custName(c))}</b><br><span class="dim">${esc(STORE.custAddress(c)) || "No address"}</span></span>
             <span class="su-cta">Schedule ›</span>
           </button>`).join("") +
        `</div>`;
    }

    // Scheduled visits ALWAYS show, however overdue — an unserviced
    // customer must never fall off this screen. Completed visits age out
    // after 14 days to keep the list about what's next.
    const cutoff = Date.now() - 14 * 86400e3;
    const visible = appts.filter((x) =>
      x.ap.status !== "done" || (x.ap.doneAt || x.ap.ts) >= cutoff);

    if (!visible.length && !unscheduled.length) {
      wrap.innerHTML = `<div class="empty"><div class="ic">📅</div>Nothing on the calendar yet.<br>Close a customer and the initial service lands here.</div>`;
      return;
    }
    let lastKey = "";
    visible.forEach(({ ap, cust }) => {
      const key = MUI.dayKey(ap.ts);
      if (key !== lastKey) {
        html += `<div class="sched-day">${dayLabel(ap.ts)}</div>`;
        lastKey = key;
      }
      const done = ap.status === "done";
      html += `<button class="sched-row${done ? " done" : ""}" data-cid="${cust.id}" data-ap="${ap.id}" type="button">
        <span class="sr-time num">${MUI.fmtTime(ap.ts)}</span>
        <span class="sr-body">
          <b>${esc(STORE.custName(cust))}</b>
          <span class="dim">${esc(STORE.custAddress(cust)) || "No address"}</span>
          <span class="dim">${esc(STORE.custPlanName(cust))} · ${ap.type === "initial" ? "Initial service" : "Regular service"}</span>
        </span>
        <span class="sr-st ${done ? "ok" : ""}">${done ? "Serviced ✓" : "Scheduled"}</span>
      </button>`;
    });

    wrap.innerHTML = html;

    $$("#sched-list .sched-un").forEach((b) =>
      b.addEventListener("click", () => {
        const c = STORE.customers.find((x) => x.id === b.dataset.cid);
        if (!c) return;
        sel = { cust: c, ap: null };
        openApptSheet();
      }));
    $$("#sched-list .sched-row").forEach((b) =>
      b.addEventListener("click", () => {
        const c = STORE.customers.find((x) => x.id === b.dataset.cid);
        const a = c && (c.appointments || []).find((x) => x.id === b.dataset.ap);
        if (!c || !a) return;
        sel = { cust: c, ap: a };
        openApptSheet();
      }));
  }

  function openApptSheet() {
    const { cust, ap } = sel;
    $("#ap-name").textContent = STORE.custName(cust);
    $("#ap-addr").textContent = STORE.custAddress(cust) || "No address";
    const dflt = ap ? ap.ts : nextMorning();
    $("#ap-when").value = MUI.toLocalInput(dflt);
    $("#ap-done").hidden = !ap || ap.status === "done";
    $("#ap-undone").hidden = !ap || ap.status !== "done";
    $("#ap-save").textContent = ap ? "Reschedule" : "Schedule";
    openSheet("appt-sheet");
  }

  const nextMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    return d.getTime();
  };

  function bind() {
    $("#ap-save").addEventListener("click", async () => {
      const v = $("#ap-when").value;
      const ts = v ? new Date(v).getTime() : NaN;
      if (isNaN(ts)) { toast("Pick a date and time"); return; }
      try {
        if (sel.ap) await STORE.setAppointment(sel.cust, sel.ap.id, { ts, status: "scheduled" });
        else await STORE.addAppointment(sel.cust, ts, "initial");
      } catch (_) { toast("Couldn't save — try again"); return; }
      closeSheet();
      render();
      if (window.MCUST) MCUST.renderList();
      toast("On the calendar");
    });

    $("#ap-done").addEventListener("click", async () => {
      tick();
      try {
        await STORE.setAppointment(sel.cust, sel.ap.id, { status: "done", doneAt: Date.now() });
      } catch (_) { toast("Couldn't save — try again"); return; }
      closeSheet();
      render();
      if (window.MCUST) MCUST.renderList();
      toast("Marked serviced ✓");
    });

    $("#ap-undone").addEventListener("click", async () => {
      tick();
      try {
        await STORE.setAppointment(sel.cust, sel.ap.id, { status: "scheduled", doneAt: null });
      } catch (_) { toast("Couldn't save — try again"); return; }
      closeSheet();
      render();
      if (window.MCUST) MCUST.renderList();
    });

    $("#ap-open").addEventListener("click", () => {
      closeSheet();
      if (sel && window.MCUST) MCUST.open(sel.cust.id);
    });
  }

  window.MSCHED = { render, bind };
})();
