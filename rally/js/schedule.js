/* RALLY — Route: the day's runs, FieldRoutes-style. Within each day the
   visits group by TECH — each tech's lane shows who's booked, where, and
   the time window — with the not-yet-scheduled customers surfaced on top
   so nobody falls through the cracks. Marking a visit Serviced is what
   turns the customer's status line green everywhere. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, tick, esc } = MUI;

  let sel = null;      // {cust, ap} the appointment open in the action sheet
  let apWho = null;    // assignee picked in the sheet

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
    const callbacks = STORE.callbacksDue();

    let html = "";

    if (callbacks.length) {
      html += `<div class="sched-warn cbs">
        <div class="sw-title">⏰ Callbacks (${callbacks.length})
          <button class="cb-route-btn" id="cb-route" type="button">🧭 Re-knock route</button></div>` +
        callbacks.slice(0, 8).map((p) => {
          const overdue = p.callbackAt <= Date.now();
          const where = p.address || (p.lat.toFixed(4) + ", " + p.lng.toFixed(4));
          return `<button class="sched-un cb-row" data-pid="${p.id}" type="button">
             <span><b>${esc(where)}</b><br><span class="dim">${overdue ? "<b>Due now</b> — " : ""}${MUI.fmtDate(p.callbackAt)} ${MUI.fmtTime(p.callbackAt)}</span></span>
             <span class="su-cta">Map ›</span>
           </button>`;
        }).join("") +
        (callbacks.length > 8 ? `<div class="dim" style="font-size:12px;padding:4px 2px">+ ${callbacks.length - 8} more on the map</div>` : "") +
        `</div>`;
    }

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
    // customer must never fall off this screen. Completed and no-show
    // visits age out after 14 days to keep the list about what's next.
    // Reps see their own book (plus unassigned); managers see everything.
    const me = STORE.currentUser();
    const manager = STORE.seesWholeTeam();
    const cutoff = Date.now() - 14 * 86400e3;
    const visible = appts.filter((x) =>
      (manager || !x.ap.userId || (me && x.ap.userId === me.id)) &&
      (!["done", "noshow"].includes(x.ap.status) || (x.ap.doneAt || x.ap.ts) >= cutoff));

    if (!visible.length && !unscheduled.length && !callbacks.length) {
      wrap.innerHTML = `<div class="empty plain">Nothing on the route yet.</div>`;
      return;
    }
    // days → tech lanes → stops. A visit books a window, not a minute:
    // show start–end (default 45 min) the way the office quotes it.
    const windowOf = (ap) => {
      const mins = ap.durationMin || 45;
      return `${MUI.fmtTime(ap.ts)}–${MUI.fmtTime(ap.ts + mins * 60e3)}`;
    };
    const byDay = new Map();
    visible.forEach((x) => {
      const k = MUI.dayKey(x.ap.ts);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(x);
    });
    for (const [, items] of byDay) {
      html += `<div class="sched-day">${dayLabel(items[0].ap.ts)}</div>`;
      const lanes = new Map(); // techId -> visits
      items.forEach((x) => {
        // a deleted tech's visits belong in the one Unassigned lane, not a
        // ghost lane per stale id
        const k = (x.ap.userId && STORE.userById(x.ap.userId)) ? x.ap.userId : "";
        if (!lanes.has(k)) lanes.set(k, []);
        lanes.get(k).push(x);
      });
      // named techs first (by name), the unassigned bucket last
      const order = [...lanes.keys()].sort((a, b) => {
        if (!a) return 1;
        if (!b) return -1;
        const ua = STORE.userById(a), ub = STORE.userById(b);
        return String(ua && ua.name).localeCompare(String(ub && ub.name));
      });
      for (const techId of order) {
        const stops = lanes.get(techId).sort((a, b) => a.ap.ts - b.ap.ts);
        const tech = techId && STORE.userById(techId);
        const doneN = stops.filter((x) => x.ap.status === "done").length;
        const span = `${MUI.fmtTime(stops[0].ap.ts)} – ${MUI.fmtTime(stops[stops.length - 1].ap.ts)}`;
        html += `<div class="tech-lane">
          <span class="tl-dot" style="background:${tech ? tech.color : "var(--t3)"}"></span>
          <b>${tech ? esc(tech.name) : "Unassigned"}</b>
          <span class="dim">${stops.length} stop${stops.length === 1 ? "" : "s"} · ${span}${doneN ? ` · ${doneN} done` : ""}</span>
        </div>`;
        stops.forEach(({ ap, cust }) => {
          const done = ap.status === "done";
          const stChip =
            done ? `<span class="sr-st ok">Serviced ✓</span>` :
            ap.status === "noshow" ? `<span class="sr-st bad">No-show</span>` :
            ap.status === "confirmed" ? `<span class="sr-st ok">Confirmed</span>` :
            `<span class="sr-st">Scheduled</span>`;
          html += `<button class="sched-row lane${done ? " done" : ""}" data-cid="${cust.id}" data-ap="${ap.id}" type="button">
            <span class="sr-time num">${windowOf(ap)}</span>
            <span class="sr-body">
              <b>${esc(STORE.custName(cust))}</b>
              <span class="dim">${esc(STORE.custAddress(cust)) || "No address"}</span>
              <span class="dim">${esc(STORE.custPlanName(cust))} · ${ap.type === "initial" ? "Initial service" : "Regular service"}</span>
            </span>
            ${stChip}
          </button>`;
        });
      }
    }

    wrap.innerHTML = html;

    const routeBtn = $("#cb-route");
    if (routeBtn) routeBtn.addEventListener("click", () => {
      tick();
      if (window.MAPP) MAPP.show("map");
      MROUTE.build();
    });
    $$("#sched-list .cb-row").forEach((b) =>
      b.addEventListener("click", () => {
        if (window.MAPP) MAPP.show("map");
        if (window.MMAP) MMAP.focusPin(b.dataset.pid);
      }));
    $$("#sched-list .sched-un:not(.cb-row)").forEach((b) =>
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
    const me = STORE.currentUser();
    $("#ap-name").textContent = STORE.custName(cust);
    $("#ap-addr").textContent = STORE.custAddress(cust) || "No address";
    renderApActions(cust, ap);
    const dflt = ap ? ap.ts : nextMorning();
    $("#ap-when").value = MUI.toLocalInput(dflt);
    apWho = ap ? (ap.userId || null) : (me ? me.id : null);
    renderApWho();
    const open = ap && ["scheduled", "confirmed"].includes(ap.status);
    $("#ap-confirm").hidden = !open || ap.status === "confirmed";
    $("#ap-noshow").hidden = !open;
    $("#ap-done").hidden = !ap || ap.status === "done";
    $("#ap-undone").hidden = !ap || ap.status !== "done";
    $("#ap-save").textContent = ap ? "Reschedule" : "Schedule";
    // setter attribution: show who booked it once it exists
    $("#ap-setter").hidden = !(ap && ap.setterId);
    if (ap && ap.setterId) {
      const s = STORE.userById(ap.setterId);
      $("#ap-setter").textContent = s ? `Set by ${s.name}` : "";
    }
    openSheet("appt-sheet");
  }

  // one-tap handoffs to the phone's own apps: call, text, navigate, calendar
  function renderApActions(cust, ap) {
    const phone = STORE.custPhone(cust);
    const addr = STORE.custAddress(cust);
    const hasNav = !!addr || (cust.lat != null && cust.lng != null);
    const acts = [];
    if (phone) {
      acts.push(`<a class="ap-act" href="${MUI.telHref(phone)}"><span>📞</span>Call</a>`);
      acts.push(`<a class="ap-act" href="${MUI.smsHref(phone)}"><span>💬</span>Text</a>`);
    }
    if (hasNav) {
      acts.push(`<a class="ap-act" href="${MUI.navUrl(cust.lat, cust.lng, addr)}" target="_blank" rel="noopener"><span>🧭</span>Go</a>`);
    }
    if (ap && ap.ts) {
      acts.push(`<button class="ap-act" id="ap-ics" type="button"><span>📅</span>Calendar</button>`);
    }
    const wrap = $("#ap-actions");
    wrap.hidden = !acts.length;
    wrap.innerHTML = acts.join("");
    const ics = $("#ap-ics");
    if (ics) ics.addEventListener("click", () => { tick(); MVAULT.exportICS(cust, ap); });
  }

  // who's running this one — the setter→closer/tech handoff
  function renderApWho() {
    $("#ap-who").innerHTML = STORE.users.map((u) =>
      `<button type="button" class="reason rep-chip${apWho === u.id ? " sel" : ""}" data-u="${u.id}">
         <span class="dot" style="background:${u.color}"></span>${esc(u.name)}</button>`
    ).join("") +
      `<button type="button" class="reason rep-chip${apWho === null ? " sel" : ""}" data-u="">
         <span class="dot" style="background:#8A93A6"></span>Anyone</button>`;
    $$("#ap-who .rep-chip").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        apWho = b.dataset.u || null;
        renderApWho();
      }));
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
      const me = STORE.currentUser();
      const handoff = apWho && me && apWho !== me.id ? STORE.userById(apWho) : null;
      try {
        if (sel.ap) await STORE.setAppointment(sel.cust, sel.ap.id, { ts, status: "scheduled", userId: apWho });
        else await STORE.addAppointment(sel.cust, ts, "initial", apWho);
      } catch (_) { toast("Couldn't save — try again"); return; }
      closeSheet();
      render();
      if (window.MCUST) MCUST.renderList();
      toast(handoff ? `On the calendar — handed to ${handoff.name}` : "On the calendar");
    });

    $("#ap-confirm").addEventListener("click", async () => {
      tick();
      try { await STORE.setAppointment(sel.cust, sel.ap.id, { status: "confirmed" }); }
      catch (_) { toast("Couldn't save — try again"); return; }
      closeSheet(); render();
      toast("Confirmed with the customer ✓");
    });

    $("#ap-noshow").addEventListener("click", async () => {
      tick();
      try { await STORE.setAppointment(sel.cust, sel.ap.id, { status: "noshow" }); }
      catch (_) { toast("Couldn't save — try again"); return; }
      closeSheet(); render();
      if (window.MCUST) MCUST.renderList();
      toast("No-show — they're back in the reschedule pool");
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
