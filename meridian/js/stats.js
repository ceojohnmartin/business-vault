/* Meridian — the numbers screen: funnel, DM counter, streak, commission. */
(function () {
  const { $, fmtMoney, fmtPct } = MUI;

  function bar(el, val, max, color) {
    const pct = max > 0 ? Math.max((val / max) * 100, val > 0 ? 3 : 0) : 0;
    el.style.width = pct + "%";
    el.style.background = color;
  }

  function render() {
    const t = STORE.todayStats();
    const w = STORE.weekStats();
    const per = STORE.settings.commissionPerSale || 0;

    $("#st-sales-today").textContent = t.sales;
    $("#st-week-line").innerHTML =
      `This week: <b>${w.sales} sold</b> · <b>${fmtMoney(w.sales * per)}</b> commission`;

    $("#st-doors").textContent = t.doors;
    const goal = STORE.settings.doorGoal || 0;
    $("#st-doors-sub").textContent = goal ? `Goal ${goal} · ${Math.min(100, Math.round((t.doors / goal) * 100))}% there` : "Set a goal in More";
    $("#st-dms").textContent = t.dms;
    $("#st-dms-sub").textContent = `${fmtPct(t.dms, t.convos)} of convos · ${w.dms} this week`;

    // funnel (today)
    bar($("#f-doors"), t.doors, t.doors, "#CBD7E8");
    bar($("#f-convos"), t.convos, t.doors, "#8FA6C9");
    bar($("#f-dms"), t.dms, t.doors, "var(--accent)");
    bar($("#f-sales"), t.sales, t.doors, "var(--sold)");
    $("#fv-doors").textContent = t.doors;
    $("#fv-convos").textContent = t.convos;
    $("#fv-dms").textContent = t.dms;
    $("#fv-sales").textContent = t.sales;
    $("#fc-convos").textContent = t.doors ? `${fmtPct(t.convos, t.doors)} answered` : "";
    $("#fc-dms").textContent = t.convos ? `${fmtPct(t.dms, t.convos)} of convos were the decision-maker` : "";
    $("#fc-sales").textContent = t.dms ? `${fmtPct(t.sales, t.dms)} of DMs closed` : "";

    // 14-day chart
    const series = STORE.dayseries(14);
    const maxDoors = Math.max(1, ...series.map((d) => d.doors));
    $("#chart").innerHTML = series.map((d) => {
      const hd = Math.round((d.doors / maxDoors) * 100);
      const hs = Math.round((d.sales / maxDoors) * 100);
      return `<div class="col" title="${d.doors} doors, ${d.sales} sold">` +
        `<div class="b sales" style="height:${Math.max(hs, d.sales ? 4 : 0)}%"></div>` +
        `<div class="b doors" style="height:${Math.max(hd, d.doors ? 4 : 2)}%"></div></div>`;
    }).join("");
    $("#chart-x").innerHTML = series.map((d, i) => {
      const dt = new Date(d.start);
      return `<span>${i % 2 === 0 ? dt.toLocaleDateString("en-US", { weekday: "narrow" }) : ""}</span>`;
    }).join("");

    // streak
    const st = STORE.streak();
    $("#st-streak").textContent = st;
    $("#st-streak-sub").textContent = st === 1 ? "day at goal" : "days at goal";

    // commission
    const all = STORE.statsFor(0);
    $("#st-money-week").textContent = fmtMoney(w.sales * per);
    $("#st-money-all").textContent =
      `${fmtMoney(all.sales * per)} all-time · at ${fmtMoney(per)} per sale`;
  }

  window.MSTAT = { render };
})();
