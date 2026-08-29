/* RALLY — boot, navigation, leaderboard, field guide, settings. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, fmtMoney, esc } = MUI;

  // ---------- tabs ----------
  // Five in the bar (Home · Customers · Map · Schedule · More);
  // "guide" lives behind More, "rank" behind Home — each with a back button.
  const TABS = ["home", "customers", "map", "schedule", "more"];
  const SCREENS = [...TABS, "guide", "rank"];
  function show(name) {
    if (!SCREENS.includes(name)) name = "home";
    SCREENS.forEach((s) => $("#screen-" + s).classList.toggle("active", s === name));
    TABS.forEach((s) =>
      $("#tab-" + s).classList.toggle("active",
        s === name || (name === "guide" && s === "more") || (name === "rank" && s === "home")));
    if (name === "home") MHOME.render();
    if (name === "customers") MCUST.renderList();
    if (name === "schedule") MSCHED.render();
    if (name === "map" && window.MMAP) MMAP.resize();
    if (name === "rank") renderRankScreen();
    if (name === "guide") renderGuide($("#guide-q").value);
    if (name === "more") renderMore();
  }

  // ---------- leaderboard (team + my numbers) ----------
  let rankView = "team";
  let rankMetric = "sales";

  function renderRankScreen() {
    $("#rank-coach-btn").hidden = !STORE.isManager();
    if (rankView === "coach" && !STORE.isManager()) rankView = "team";
    $$("#rank-seg .seg-opt").forEach((b) => b.classList.toggle("sel", b.dataset.v === rankView));
    $("#rank-team").hidden = rankView !== "team";
    $("#rank-me").hidden = rankView !== "me";
    $("#rank-coach").hidden = rankView !== "coach";
    if (rankView === "team") renderRank();
    else if (rankView === "coach") renderCoach();
    else MSTAT.render();
  }

  // ---------- coaching (manager): activity vs conversion, not judgment ----------
  function coachInsight(s) {
    if (s.doors < 20) return { tag: "Small sample", note: "Under 20 doors this week — read nothing into the rates yet." };
    const convRate = s.doors ? s.convos / s.doors : 0;
    const closeRate = s.dms ? s.sales / s.dms : 0;
    if (s.doors >= 100 && closeRate < 0.08) {
      return { tag: "High activity · low conversion", note: "The doors are there — work the close. Ride-along on the pitch could pay fast." };
    }
    if (s.doors < 60 && closeRate >= 0.2) {
      return { tag: "Strong closer · low activity", note: "Closes well when in front of people — more doors is the whole game here." };
    }
    if (convRate < 0.2) {
      return { tag: "Few answers", note: "Lots of not-homes — try shifting hours toward evenings and the re-knock route." };
    }
    if (s.dms && s.convos && s.dms / s.convos < 0.4) {
      return { tag: "Low DM rate", note: "Getting conversations but not the decision-maker — coach the callback ask." };
    }
    return { tag: "Balanced", note: "Activity and conversion both healthy — keep the streak alive." };
  }

  function renderCoach() {
    const weekStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); })();
    const rows = STORE.users.map((u) => ({ u, s: STORE.repStats(u.id, weekStart) }));
    const anyData = rows.some((r) => r.s.doors > 0);
    $("#coach-list").innerHTML = (anyData ? "" :
      `<p class="demo-note" style="text-align:left">Knocks are attributed to whoever the device is set to (More → Team &amp; roles). Work a shift and this fills in.</p>`) +
      rows.map(({ u, s }) => {
        const ins = coachInsight(s);
        return `<div class="coach-card">
          <div class="cc-head">
            <span class="dot" style="background:${u.color}"></span>
            <b>${esc(u.name)}</b>
            <span class="cc-tag">${ins.tag}</span>
          </div>
          <div class="cc-nums num">${s.doors} doors · ${s.convos} convos · ${s.dms} DMs · ${s.sales} sold</div>
          <div class="cc-note">${ins.note}</div>
        </div>`;
      }).join("");
  }

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
         <div><div class="nm">${esc(r.name)}${r.me && r.name !== "You" ? " (you)" : ""}</div><div class="tm">${esc(r.team)}</div></div>
         <div class="sc num">${r[rankMetric] || 0}</div>
       </div>`
    ).join("");
  }

  // ---------- field guide ----------
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
    const s = STORE.settings;
    $("#more-company-sub").textContent = s.companyName
      ? s.companyName + (s.companyLicense ? " · lic. " + s.companyLicense : "")
      : "Set the name printed on every agreement";
    const me = STORE.currentUser();
    $("#more-team-sub").textContent = me
      ? `${STORE.users.length} teammate${STORE.users.length === 1 ? "" : "s"} · this device: ${me.name} (${me.role})`
      : "Add your reps and managers";
    $("#more-profile-sub").textContent = `${s.repName} · ${s.teamName}`;
    $("#more-goals-sub").textContent =
      `${s.doorGoal} doors/day · ${fmtMoney(s.commissionPerSale)}/sale`;
    $("#more-fr-sub").textContent = s.frSubdomain
      ? s.frSubdomain + ".pestroutes.com"
      : "Not connected — customers queue locally";
    const own = !!s.googleKey;
    const anyKey = own || !!MDATA.DEFAULT_GOOGLE_KEY;
    $("#more-gmaps-sub").textContent = s.googleSessions
      ? "Google imagery active" + (own ? " (your key)" : " (office key)")
      : (s.googleLastError ||
         (anyKey ? "Checking with Google…"
                 : "No key — imagery is off on this device"));
    $("#more-lock-sub").textContent = MAUTH.hasAccount()
      ? "Signed in as " + MAUTH.emailOnFile()
      : "No device lock set up yet";
    $("#more-export-sub").textContent = STORE.customers.length
      ? `${STORE.customers.length} customer${STORE.customers.length === 1 ? "" : "s"} · ${STORE.queuedCount()} queued for sync`
      : "Signed customers land here";
  }

  // ---------- team & roles ----------
  function renderTeam() {
    const cur = STORE.settings.currentUserId;
    $("#team-list").innerHTML = STORE.users.map((u) => {
      const hoods = STORE.hoodsOf(u.id).length;
      return `<div class="team-row">
        <span class="dot" style="background:${u.color}"></span>
        <span class="tn"><b>${esc(u.name)}</b><span class="tr">${u.role === "manager" ? "Manager" : "Rep"} · ${hoods} hood${hoods === 1 ? "" : "s"}</span></span>
        ${u.id === cur
          ? '<span class="me-chip">This device</span>'
          : `<button class="team-btn team-me" data-id="${u.id}" type="button">Use</button>`}
        <button class="team-btn team-role" data-id="${u.id}" type="button">${u.role === "manager" ? "Make rep" : "Make mgr"}</button>
        <button class="mini-x team-del" data-id="${u.id}" type="button" aria-label="Remove">✕</button>
      </div>`;
    }).join("");

    const afterChange = () => {
      renderTeam(); renderMore();
      if (window.MMAP) { MMAP.refreshHoods(); MMAP.updateBrandToday(); }
    };
    $$("#team-list .team-me").forEach((b) =>
      b.addEventListener("click", async () => {
        const u = STORE.userById(b.dataset.id);
        if (!u) return;
        STORE.settings.currentUserId = u.id;
        STORE.settings.repName = u.name; // sales + leaderboard follow the device identity
        await STORE.saveSettings();
        afterChange();
        toast(`This device is now ${u.name} (${u.role})`);
      }));
    $$("#team-list .team-role").forEach((b) =>
      b.addEventListener("click", async () => {
        const u = STORE.userById(b.dataset.id);
        if (!u) return;
        const managers = STORE.users.filter((x) => x.role === "manager");
        if (u.role === "manager" && managers.length === 1) {
          toast("Every team needs at least one manager"); return;
        }
        u.role = u.role === "manager" ? "rep" : "manager";
        await STORE.updateUser(u);
        afterChange();
      }));
    $$("#team-list .team-del").forEach((b) =>
      b.addEventListener("click", async () => {
        const u = STORE.userById(b.dataset.id);
        if (!u) return;
        if (STORE.users.length === 1) { toast("Can't remove the last teammate"); return; }
        const managers = STORE.users.filter((x) => x.role === "manager");
        if (u.role === "manager" && managers.length === 1) {
          toast("Every team needs at least one manager"); return;
        }
        if (!confirm(`Remove ${u.name}? Their hoods go back to the pool (history is kept).`)) return;
        await STORE.deleteUser(u.id);
        afterChange();
      }));
  }

  function bindMore() {
    $("#more-guide").addEventListener("click", () => show("guide"));
    $("#guide-back").addEventListener("click", () => show("more"));

    $("#more-team").addEventListener("click", () => { renderTeam(); openSheet("team-sheet"); });
    $("#team-add").addEventListener("click", async () => {
      const name = $("#team-new-name").value.trim();
      if (!name) { toast("Give them a name first"); return; }
      await STORE.addUser({ name, role: $("#team-new-role").value });
      $("#team-new-name").value = "";
      renderTeam(); renderMore();
      if (window.MMAP) MMAP.refreshHoods();
      toast(name + " is on the team");
    });

    $("#more-company").addEventListener("click", () => {
      const s = STORE.settings;
      $("#set-co-name").value = s.companyName;
      $("#set-co-phone").value = s.companyPhone;
      $("#set-co-email").value = s.companyEmail;
      $("#set-co-address").value = s.companyAddress;
      $("#set-co-license").value = s.companyLicense;
      openSheet("company-sheet");
    });
    $("#company-save").addEventListener("click", async () => {
      const s = STORE.settings;
      s.companyName = $("#set-co-name").value.trim();
      s.companyPhone = $("#set-co-phone").value.trim();
      s.companyEmail = $("#set-co-email").value.trim();
      s.companyAddress = $("#set-co-address").value.trim();
      s.companyLicense = $("#set-co-license").value.trim();
      await STORE.saveSettings();
      renderMore(); closeSheet(); toast("Saved — it prints on every agreement");
    });

    $("#more-profile").addEventListener("click", () => {
      $("#set-name").value = STORE.settings.repName;
      $("#set-team").value = STORE.settings.teamName;
      openSheet("profile-sheet");
    });
    $("#profile-save").addEventListener("click", async () => {
      STORE.settings.repName = $("#set-name").value.trim() || "You";
      STORE.settings.teamName = $("#set-team").value.trim() || "My Team";
      // the profile IS the current user — one identity, no drift
      const me = STORE.currentUser();
      if (me && STORE.settings.repName !== "You") {
        me.name = STORE.settings.repName;
        await STORE.updateUser(me);
        if (window.MMAP) MMAP.refreshHoods();
      }
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

    $("#more-gmaps").addEventListener("click", () => {
      $("#set-gkey").value = STORE.settings.googleKey;
      openSheet("gmaps-sheet");
    });
    $("#gmaps-save").addEventListener("click", async () => {
      STORE.settings.googleKey = $("#set-gkey").value.trim();
      STORE.settings.googleSessions = null; // new key → new sessions
      STORE.settings.googleLastError = "";
      await STORE.saveSettings();
      closeSheet();
      renderMore();
      if (STORE.settings.googleKey || MDATA.DEFAULT_GOOGLE_KEY) toast("Checking with Google…", 9000);
      const upgraded = window.MMAP ? await MMAP.reloadImagery() : false;
      if (upgraded) {
        toast("Google imagery is on — check Satellite or Hybrid");
      } else if (STORE.settings.googleKey) {
        // show Google's own words, and keep them on screen long enough to read
        const why = (window.MMAP && MMAP.googleError()) || "Google didn't accept the key";
        STORE.settings.googleLastError = why;
        await STORE.saveSettings();
        renderMore();
        toast(why, 7000);
      } else {
        toast(MDATA.DEFAULT_GOOGLE_KEY ? "Back on the office key" : "Key removed — imagery is off");
      }
    });

    $("#more-lock").addEventListener("click", () => {
      if (!MAUTH.hasAccount()) {
        toast("No account on this device yet");
        return;
      }
      if (!confirm("Sign out? Your work stays on this device — you'll need your passcode to get back in.")) return;
      MGATE.lock();
    });

    $("#more-export").addEventListener("click", () => MCUST.exportAll());
    $("#more-csv").addEventListener("click", () => MVAULT.exportCSV());

    $("#more-backup").addEventListener("click", async () => {
      openSheet("backup-sheet");
      const el = $("#bk-status");
      el.textContent = "Checking storage…";
      const info = await MVAULT.storageInfo();
      const mb = (n) => (n / 1048576).toFixed(n >= 104857600 ? 0 : 1) + " MB";
      const parts = [];
      if (info.persisted !== null) {
        parts.push(info.persisted
          ? "🔒 Storage is protected — the browser won't evict it"
          : "⚠️ Storage is not yet protected — install RALLY to your home screen and keep backups");
      }
      if (info.usage !== null) parts.push(`Using ${mb(info.usage)} of ${mb(info.quota)}`);
      el.textContent = parts.join(" · ") || "This browser doesn't report storage details";
    });
    $("#bk-backup").addEventListener("click", () => MVAULT.backup());
    $("#bk-restore").addEventListener("click", () => $("#bk-file").click());
    $("#bk-file").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) MVAULT.restoreFile(f);
      e.target.value = "";
    });

    $("#more-reset").addEventListener("click", async () => {
      if (!confirm("Erase every pin, knock, customer, hood and file on this device? This cannot be undone.")) return;
      await Promise.all([
        MDB.clear("pins"), MDB.clear("events"), MDB.clear("customers"),
        MDB.clear("territories"), MDB.clear("files"),
      ]);
      STORE.pins = []; STORE.events = []; STORE.customers = []; STORE.territories = [];
      MMAP.refreshPins(); MMAP.refreshHoods(); MSTAT.render(); MCUST.renderList(); renderMore();
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
    // splash, then the device gate — resolves once this device is unlocked
    try {
      await MGATE.run();
    } catch (e) {
      console.error("gate failed", e); // never strand the rep behind a broken lock
      const sp = $("#splash"), g = $("#gate");
      if (sp) sp.hidden = true;
      if (g) g.hidden = true;
    }
    TABS.forEach((s) =>
      $("#tab-" + s).addEventListener("click", () => { MUI.tick(); show(s); }));
    $("#veil").addEventListener("click", () => { closeSheet(); MMAP.clearSelection(); });
    $$(".sheet .grab").forEach((g) =>
      g.addEventListener("click", () => { closeSheet(); MMAP.clearSelection(); }));
    $("#sync-chip").addEventListener("click", () => { show("customers"); });
    $("#guide-q").addEventListener("input", (e) => renderGuide(e.target.value));
    $$(".mtab").forEach((b) =>
      b.addEventListener("click", () => {
        rankMetric = b.dataset.m;
        $$(".mtab").forEach((x) => x.classList.toggle("active", x === b));
        renderRank();
      }));
    $$("#rank-seg .seg-opt").forEach((b) =>
      b.addEventListener("click", () => {
        MUI.tick();
        rankView = b.dataset.v;
        renderRankScreen();
      }));
    $("#rank-back").addEventListener("click", () => show("home"));
    MCUST.bind();
    MSCHED.bind();
    MHOODS.bind();
    MROUTE.bind();
    MSTREET.bind();
    MSELECT.bind();
    bindMore();
    MVAULT.guard(); // ask the browser to never evict the vault
    try { MMAP.init(); } catch (e) { console.error("map init failed", e); }
    MHOME.render();
    renderGuide("");
    renderMore();
    window.MAPP = { show };

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
