/* Meridian — boot, navigation, rankings, field guide, settings. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, fmtMoney } = MUI;

  // ---------- tabs ----------
  const SCREENS = ["customers", "map", "stats", "rank", "guide", "more"];
  function show(name) {
    SCREENS.forEach((s) => {
      $("#screen-" + s).classList.toggle("active", s === name);
      $("#tab-" + s).classList.toggle("active", s === name);
    });
    if (name === "customers") renderCustomers();
    if (name === "map" && window.MMAP) MMAP.resize();
    if (name === "stats") MSTAT.render();
    if (name === "rank") renderRank();
    if (name === "guide") renderGuide($("#guide-q").value);
    if (name === "more") renderMore();
  }

  // ---------- customers (the launch screen) ----------
  function renderCustomers() {
    const q = ($("#cust-q").value || "").trim().toLowerCase();
    const all = STORE.customers.slice().reverse();
    const list = all.filter((c) =>
      !q || (c.first + " " + c.last).toLowerCase().includes(q) ||
      (c.address || "").toLowerCase().includes(q));

    const firstYear = (c) => (c.initial || 0) + (c.monthly || 0) * (c.termMonths || 12);
    $("#cust-summary").hidden = all.length === 0;
    $("#cust-export").hidden = all.length === 0;
    $("#cust-count").textContent = all.length;
    $("#cust-value").textContent = MUI.fmtMoney(all.reduce((s, c) => s + firstYear(c), 0));
    $("#cust-queued").textContent = STORE.queuedCount();

    if (!all.length) {
      $("#cust-list").innerHTML =
        `<div class="empty"><div class="ic">🗺️</div>No customers yet.<br>Hit the Map, knock some doors, and your book builds itself.</div>`;
      return;
    }
    $("#cust-list").innerHTML = list.map((c) =>
      `<button class="cust-card" data-cid="${c.id}" type="button">
         <div class="top"><span class="nm">${esc(c.first)} ${esc(c.last)}</span>
           <span class="val num">${MUI.fmtMoney(firstYear(c))}/yr</span></div>
         <div class="meta">${esc(c.address) || "No address"}${c.phone ? " · " + esc(c.phone) : ""}</div>
         <div class="meta">${esc(c.planName)} · ${MUI.fmtMoney(c.initial)} first + ${MUI.fmtMoney(c.monthly)}/mo · signed ${new Date(c.signedAt).toLocaleDateString()}</div>
         <div class="row2">
           <span class="q-status ${c.status === "queued" ? "queued" : "sold"}">${c.status === "queued" ? "Queued for FieldRoutes" : "Synced"}</span>
           ${c.pinId ? '<span class="q-status sold" style="background:transparent;border-color:var(--line);color:var(--t3)">View on map ›</span>' : ""}
         </div>
       </button>`
    ).join("") || `<div class="empty">Nothing matches “${esc(q)}”.</div>`;

    $$("#cust-list .cust-card").forEach((b) =>
      b.addEventListener("click", () => {
        const c = STORE.customers.find((x) => x.id === b.dataset.cid);
        if (c && c.pinId && window.MMAP) {
          show("map");
          MMAP.focusPin(c.pinId);
        }
      }));
  }

  // ---------- rankings ----------
  let rankMetric = "sales";
  function renderRank() {
    const w = STORE.weekStats();
    const me = {
      name: STORE.settings.repName || "You",
      team: STORE.settings.teamName || "My Team",
      doors: w.doors, dms: w.dms, sales: w.sales, me: true,
    };
    const rows = [...MDATA.DEMO_TEAM, me].sort((a, b) => (b[rankMetric] || 0) - (a[rankMetric] || 0));
    $("#rank-list").innerHTML = rows.map((r, i) =>
      `<div class="rank-row${i === 0 ? " first" : ""}${r.me ? " me" : ""}">
         <div class="pos">${i === 0 ? "👑" : i + 1}</div>
         <div class="av">${r.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</div>
         <div><div class="nm">${r.name}${r.me && r.name !== "You" ? " (you)" : ""}</div><div class="tm">${r.team}</div></div>
         <div class="sc num">${r[rankMetric] || 0}</div>
       </div>`
    ).join("");
  }

  // ---------- field guide ----------
  const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function renderGuide(q) {
    q = (q || "").trim().toLowerCase();
    const list = MDATA.PESTS.filter((p) =>
      !q || p.name.toLowerCase().includes(q) || p.latin.toLowerCase().includes(q) ||
      p.signs.toLowerCase().includes(q));
    $("#guide-grid").innerHTML = list.map((p) =>
      `<button class="pest-card" data-pest="${p.id}" type="button">
         <div class="ic">${p.icon}</div>
         <div class="nm">${p.name}</div>
         <div class="season">${p.season}</div>
       </button>`
    ).join("") || `<div class="empty" style="grid-column:1/-1">Nothing matches “${esc(q)}”.</div>`;
    $$("#guide-grid .pest-card").forEach((b) =>
      b.addEventListener("click", () => openPest(b.dataset.pest)));
  }

  function openPest(id) {
    const p = MDATA.PESTS.find((x) => x.id === id);
    if (!p) return;
    $("#pest-body").innerHTML =
      `<div class="pest-detail">
         <div class="ic">${p.icon}</div>
         <h2>${p.name}</h2>
         <div class="latin">${p.latin} · ${p.season}</div>
         <div class="pd-block"><h4>What to look for</h4><p>${p.signs}</p></div>
         <div class="pd-block"><h4>Credibility fact</h4><p>${p.fact}</p></div>
         <div class="pd-block pitch"><h4>Say it at the door</h4><p>“${p.pitch}”</p></div>
         <div class="pd-block"><h4>What we do</h4><p>${p.treatment}</p></div>
       </div>`;
    openSheet("pest-sheet");
  }

  // ---------- more ----------
  function renderMore() {
    $("#more-queue-sub").textContent =
      STORE.customers.length
        ? `${STORE.customers.length} agreement${STORE.customers.length === 1 ? "" : "s"} · ${STORE.queuedCount()} queued`
        : "Signed customers land here";
    $("#more-profile-sub").textContent = `${STORE.settings.repName} · ${STORE.settings.teamName}`;
    $("#more-goals-sub").textContent =
      `${STORE.settings.doorGoal} doors/day · ${fmtMoney(STORE.settings.commissionPerSale)}/sale`;
    $("#more-fr-sub").textContent = STORE.settings.frSubdomain
      ? STORE.settings.frSubdomain + ".pestroutes.com"
      : "Not connected — agreements queue locally";
  }

  function bindMore() {
    $("#more-queue").addEventListener("click", () => MCLOSE.openQueue());
    $("#more-profile").addEventListener("click", () => {
      $("#set-name").value = STORE.settings.repName;
      $("#set-team").value = STORE.settings.teamName;
      openSheet("profile-sheet");
    });
    $("#profile-save").addEventListener("click", async () => {
      STORE.settings.repName = $("#set-name").value.trim() || "You";
      STORE.settings.teamName = $("#set-team").value.trim() || "My Team";
      await STORE.saveSettings();
      renderMore(); closeSheet(); toast("Saved");
    });

    $("#more-goals").addEventListener("click", () => {
      $("#set-goal").value = STORE.settings.doorGoal;
      $("#set-comm").value = STORE.settings.commissionPerSale;
      openSheet("goals-sheet");
    });
    $("#goals-save").addEventListener("click", async () => {
      STORE.settings.doorGoal = Math.max(1, Number($("#set-goal").value) || 75);
      STORE.settings.commissionPerSale = Math.max(0, Number($("#set-comm").value) || 0);
      await STORE.saveSettings();
      renderMore(); MSTAT.render(); closeSheet(); toast("Saved");
    });

    $("#more-fr").addEventListener("click", () => {
      $("#set-fr-sub").value = STORE.settings.frSubdomain;
      $("#set-fr-key").value = STORE.settings.frKey;
      $("#set-fr-token").value = STORE.settings.frToken;
      openSheet("fr-sheet");
    });
    $("#fr-save").addEventListener("click", async () => {
      STORE.settings.frSubdomain = $("#set-fr-sub").value.trim();
      STORE.settings.frKey = $("#set-fr-key").value.trim();
      STORE.settings.frToken = $("#set-fr-token").value.trim();
      await STORE.saveSettings();
      renderMore(); closeSheet(); toast("Connection details saved");
    });

    $("#more-reset").addEventListener("click", async () => {
      if (!confirm("Erase every pin, knock, and agreement on this device? This cannot be undone.")) return;
      await Promise.all([MDB.clear("pins"), MDB.clear("events"), MDB.clear("customers")]);
      STORE.pins = []; STORE.events = []; STORE.customers = [];
      MMAP.refreshPins(); MSTAT.render(); renderMore();
      toast("All data erased");
    });
  }

  // ---------- boot ----------
  async function boot() {
    // register the SW first — and robustly, since 'load' may already have fired
    if ("serviceWorker" in navigator) {
      const reg = () => navigator.serviceWorker.register("sw.js").catch(() => {});
      if (document.readyState === "complete") reg();
      else addEventListener("load", reg);
    }
    try {
      await STORE.ready;
    } catch (e) {
      // storage refused (rare private modes) — run in-memory rather than die blank
      console.error("storage unavailable", e);
      MUI.toast("Storage unavailable — running without saving");
    }
    SCREENS.forEach((s) =>
      $("#tab-" + s).addEventListener("click", () => { MUI.tick(); show(s); }));
    $("#veil").addEventListener("click", () => { closeSheet(); MMAP.clearSelection(); });
    $$(".sheet .grab").forEach((g) =>
      g.addEventListener("click", () => { closeSheet(); MMAP.clearSelection(); }));
    $("#sync-chip").addEventListener("click", () => MCLOSE.openQueue());
    $("#guide-q").addEventListener("input", (e) => renderGuide(e.target.value));
    $("#cust-q").addEventListener("input", renderCustomers);
    $$(".mtab").forEach((b) =>
      b.addEventListener("click", () => {
        rankMetric = b.dataset.m;
        $$(".mtab").forEach((x) => x.classList.toggle("active", x === b));
        renderRank();
      }));
    MCLOSE.bind();
    bindMore();
    try { MMAP.init(); } catch (e) { console.error("map init failed", e); }
    MSTAT.render();
    renderCustomers();
    renderGuide("");
    renderMore();
    window.MAPP = { show, renderCustomers };

    // keep a focused input visible above the on-screen keyboard inside sheets
    document.addEventListener("focusin", (e) => {
      const t = e.target;
      if (t && t.closest && t.closest(".sheet") && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
        setTimeout(() => { try { t.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (_) {} }, 320);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
