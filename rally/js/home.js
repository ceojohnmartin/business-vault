/* RALLY — home: the rep dashboard. One screen that answers "what do I
   do right now?" — today's numbers, my turf, what's due, where I stand —
   and one primary action: START KNOCKING. Everything is computed live
   from the store; managers see the whole market's turf, reps see theirs. */
(function () {
  const { $, $$, esc, fmtMoney, fmtPct } = MUI;

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  const dateLine = () =>
    new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // agreements signed today: count + contract value (initial + first year)
  function signedToday() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    let count = 0, value = 0;
    STORE.customers.forEach((c) => {
      const ts = STORE.custSignedAt(c);
      if (!ts || new Date(ts).getTime() < start.getTime()) return;
      count++;
      value += STORE.custInitial(c) + STORE.custMonthly(c) * 12;
    });
    return { count, value };
  }

  function turfSummary() {
    const me = STORE.currentUser();
    const manager = STORE.isManager();
    const hoods = manager ? STORE.activeTerritories() : (me ? STORE.hoodsOf(me.id) : []);
    let homes = 0, knocked = 0, sold = 0, callbacks = 0;
    hoods.forEach((t) => {
      const st = STORE.hoodStats(t);
      homes += st.homes || 0; knocked += st.knocked; sold += st.sold; callbacks += st.callbacks;
    });
    const pct = homes ? Math.min(100, Math.round((knocked / homes) * 100)) : null;
    return { hoods, homes, knocked, sold, callbacks, pct, manager };
  }

  function weekRank() {
    const w = STORE.weekStats();
    const rows = [...MDATA.DEMO_TEAM.map((r) => r.sales), w.sales].sort((a, b) => b - a);
    return { pos: rows.indexOf(w.sales) + 1, of: rows.length, sales: w.sales };
  }

  function render() {
    const t = STORE.todayStats();
    const me = STORE.currentUser();
    const first = me ? me.name.split(" ")[0] : "there";
    const per = STORE.settings.commissionPerSale || 0;
    const signed = signedToday();
    // a sale is a sale whether it came through a knock or straight into the
    // book — show whichever count is complete
    const salesToday = Math.max(t.sales, signed.count);
    const turf = turfSummary();
    const callbacks = STORE.callbacksDue();
    const dueNow = callbacks.filter((p) => p.callbackAt <= Date.now());
    const unscheduled = STORE.customers.filter(
      (c) => !STORE.nextAppointment(c) && !STORE.lastServiced(c));
    const nextAp = STORE.allAppointments().filter((x) =>
      ["scheduled", "confirmed"].includes(x.ap.status) && x.ap.ts >= Date.now() - 3600e3)[0] || null;
    const rank = weekRank();
    const streak = STORE.streak();

    let upNext = "";
    if (dueNow.length) {
      const p = dueNow[0];
      upNext += row("cb", "⏰", `<b>${dueNow.length} callback${dueNow.length === 1 ? "" : "s"} due now</b>`,
        esc(p.address || "On the map"), p.id);
    } else if (callbacks.length) {
      const p = callbacks[0];
      upNext += row("cb", "⏰", `Next callback ${MUI.fmtTime(p.callbackAt)}`,
        esc(p.address || "On the map"), p.id);
    }
    if (nextAp) {
      upNext += row("appt", "📅", `<b>${esc(STORE.custName(nextAp.cust))}</b> · ${MUI.fmtTime(nextAp.ap.ts)}`,
        `${MUI.fmtDate(nextAp.ap.ts)} · ${esc(STORE.custAddress(nextAp.cust)) || "Initial service"}`);
    }
    if (unscheduled.length) {
      upNext += row("sched", "⚠️", `<b>${unscheduled.length} customer${unscheduled.length === 1 ? "" : "s"} not scheduled</b>`,
        "Set the initial service before it goes cold");
    }
    const leads = STORE.customers.filter((c) => STORE.custStage(c).id === "lead");
    if (leads.length) {
      upNext += row("leads", "🎯", `<b>${leads.length} lead${leads.length === 1 ? "" : "s"} to work</b>`,
        "Sign them or book the sit");
    }
    if (window.MROUTE && MROUTE.hasCandidates()) {
      upNext += row("route", "🧭", `<b>Re-knock route ready</b>`,
        "Callbacks and not-homes, ordered — one tap");
    }

    // manager intelligence: where should the team knock today?
    let bestCard = "";
    if (STORE.isManager()) {
      const ranked = STORE.bestHoods();
      const best = ranked.length ? ranked[0] : null;
      if (best && best.score > 0) {
        bestCard = `<div class="ce-sec" style="margin:16px 0 8px">Best area today</div>
          <button class="panel hm-best" id="hm-best" data-tid="${best.t.id}" type="button">
            <h3><span class="dot" style="background:${STORE.hoodColor(best.t)};display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:7px"></span>
              ${esc(best.t.name)}<span class="r num">${best.score}</span></h3>
            <div class="hm-turf-line">${best.why.map(esc).join(" · ")}${best.rep ? ` · <b>${esc(best.rep)}</b>'s turf` : " · unassigned"}</div>
          </button>`;
      }
    }

    $("#home-body").innerHTML = `
      <div class="hm-greet">
        <div class="hg-hi">${greeting()}, <b>${esc(first)}</b>.</div>
        <div class="hg-date">${dateLine()}</div>
      </div>

      <button class="hm-cta" id="hm-knock" type="button">START KNOCKING</button>

      <div class="hero-stat hm-hero">
        <div class="lbl">Sales today</div>
        <div class="big num">${salesToday}</div>
        <div class="row2">
          <span>${fmtMoney(signed.value)} contract value${per ? ` · <b>${fmtMoney(salesToday * per)}</b> commission` : ""}</span>
        </div>
      </div>

      <div class="hm-chips">
        <div class="hm-chip"><div class="n num">${t.doors}</div><div class="d">Doors</div></div>
        <div class="hm-chip"><div class="n num">${t.dms}</div><div class="d">DMs</div></div>
        <div class="hm-chip"><div class="n num">${fmtPct(salesToday, t.dms)}</div><div class="d">DM close</div></div>
      </div>

      <button class="panel hm-turf" id="hm-turf" type="button">
        <h3>${turf.manager ? "The market" : "My turf"}
          <span class="r">${turf.hoods.length ? turf.hoods.length + " hood" + (turf.hoods.length === 1 ? "" : "s") : ""}</span></h3>
        ${turf.hoods.length ? `
          <div class="hm-turf-line">
            <b class="num">${turf.knocked}</b>${turf.homes ? ` / <span class="num">${turf.homes}</span> homes` : " knocked"}
            ${turf.pct != null ? ` · <b>${turf.pct}%</b> complete` : ""}
            · ${turf.sold} sold${turf.callbacks ? ` · ${turf.callbacks} callbacks` : ""}
          </div>
          ${turf.pct != null ? `<div class="hm-bar"><div class="hm-fill" style="width:${turf.pct}%"></div></div>` : ""}
          ${turf.homes ? `<div class="hm-remaining">${Math.max(0, turf.homes - turf.knocked)} doors left — go get them</div>` : ""}`
        : `<div class="hm-turf-line dim">${turf.manager
            ? "No hoods cut yet — draw the first one on the map"
            : "No turf assigned yet — ask your manager"}</div>`}
      </button>

      ${upNext ? `<div class="ce-sec" style="margin:16px 0 8px">Up next</div>${upNext}` : ""}
      ${bestCard}

      <div class="hm-foot">
        <button class="hm-chip wide" id="hm-rank" type="button">
          <div class="n">🏆 #${rank.pos}<span style="font-size:13px;color:var(--t3)"> / ${rank.of}</span></div>
          <div class="d">Sales this week ›</div>
        </button>
        <div class="hm-chip wide">
          <div class="n">🔥 ${streak}</div>
          <div class="d">Day streak at goal</div>
        </div>
      </div>
    `;

    $("#hm-knock").addEventListener("click", () => { MUI.tick(); MAPP.show("map"); });
    $("#hm-turf").addEventListener("click", () => MAPP.show("map"));
    $("#hm-rank").addEventListener("click", () => MAPP.show("rank"));
    $$("#home-body .hm-row").forEach((b) =>
      b.addEventListener("click", () => {
        const kind = b.dataset.k;
        if (kind === "cb" && b.dataset.pid) { MAPP.show("map"); MMAP.focusPin(b.dataset.pid); }
        else if (kind === "leads") { MAPP.show("customers"); MCUST.setFilter("lead"); }
        else if (kind === "route") { MAPP.show("map"); MROUTE.build(); }
        else MAPP.show("schedule");
      }));
    const bestBtn = $("#hm-best");
    if (bestBtn) bestBtn.addEventListener("click", () => {
      const t = STORE.territories.find((x) => x.id === bestBtn.dataset.tid);
      if (t) { MAPP.show("map"); MMAP.focusHood(t); }
    });
  }

  const row = (kind, ic, title, sub, pid) =>
    `<button class="hm-row" data-k="${kind}"${pid ? ` data-pid="${pid}"` : ""} type="button">
       <span class="ic">${ic}</span>
       <span class="tx">${title}<span class="sub">${sub}</span></span>
       <span class="chev">›</span>
     </button>`;

  window.MHOME = { render };
})();
