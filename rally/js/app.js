/* RALLY — boot, navigation, leaderboard, field guide, settings. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, fmtMoney, esc } = MUI;

  // ---------- tabs ----------
  // Five in the bar (Customers · Map · Route · Leaderboard · More);
  // "guide" and "home" live behind More, each with a back button.
  const TABS = ["customers", "map", "schedule", "rank", "more"];
  const SCREENS = [...TABS, "guide", "home"];
  function show(name) {
    if (!SCREENS.includes(name)) name = "customers";
    SCREENS.forEach((s) => $("#screen-" + s).classList.toggle("active", s === name));
    TABS.forEach((s) =>
      $("#tab-" + s).classList.toggle("active",
        s === name || ((name === "guide" || name === "home") && s === "more")));
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
    $("#rank-coach-btn").hidden = !STORE.seesWholeTeam();
    if (rankView === "coach" && !STORE.seesWholeTeam()) rankView = "team";
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
    const weekStart = STORE.weekStart();
    // only people whose work is provably theirs get a coaching card; the
    // rest of the log is reported as unattributed rather than pinned on
    // whoever happens to be nearby in the list
    const rows = STORE.users
      .filter((u) => STORE.isAttributed(u.id))
      .map((u) => ({ u, s: STORE.repStats(u.id, weekStart) }));
    const anyData = rows.some((r) => r.s.doors > 0);
    const unattributed = STORE.unattributedDoors(weekStart);
    $("#coach-list").innerHTML = (anyData ? "" :
      `<p class="demo-note" style="text-align:left">Knocks are attributed to the rep signed in on the device that logged them. Work a shift and this fills in.</p>`) +
      (unattributed
        ? `<div class="rank-unattr">${unattributed} door${unattributed === 1 ? "" : "s"} this week aren't attributed to anyone — team history, nobody's card.</div>`
        : "") +
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

  /* The board ranks REAL people on this team, by work that is provably
     theirs. Nobody is invented to pad it out, and a rep is never ranked
     against a fictional field — if there is nothing to rank, it says so. */
  function renderRank() {
    const weekStart = STORE.weekStart();
    const myId = STORE.myId();
    const rows = STORE.users
      .filter((u) => STORE.isAttributed(u.id))
      .map((u) => {
        const s = STORE.repStats(u.id, weekStart);
        return {
          name: u.name, team: STORE.settings.teamName || "My Team",
          doors: s.doors, dms: s.dms, sales: s.sales, me: u.id === myId,
        };
      })
      .sort((a, b) => (b[rankMetric] || 0) - (a[rankMetric] || 0));

    const unattributed = STORE.unattributedDoors(weekStart);
    const anyWork = rows.some((r) => r.doors || r.dms || r.sales);
    const el = $("#rank-list");
    if (!rows.length || !anyWork) {
      // an honest empty state beats a made-up one
      el.innerHTML = `<div class="empty plain">Nothing to rank this week yet.` +
        (rows.length <= 1
          ? ` Once your team is on RALLY and knocking, the board fills in.`
          : ` Knocks land here as reps work.`) +
        (unattributed ? `<br><span class="dim">${unattributed} door${unattributed === 1 ? "" : "s"} this week can't be matched to a rep.</span>` : "") +
        `</div>`;
      return;
    }
    el.innerHTML = rows.map((r, i) =>
      `<div class="rank-row${i === 0 ? " first" : ""}${r.me ? " me" : ""}">
         <div class="pos">${i === 0 ? "👑" : i + 1}</div>
         <div class="av">${esc(r.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase())}</div>
         <div><div class="nm">${esc(r.name)}${r.me ? " (you)" : ""}</div><div class="tm">${esc(r.team)}</div></div>
         <div class="sc num">${r[rankMetric] || 0}</div>
       </div>`
    ).join("") +
    // knocks that belong to nobody are shown, never folded into a person
    (unattributed
      ? `<div class="rank-unattr">${unattributed} door${unattributed === 1 ? "" : "s"} this week aren't attributed to a rep — they count for the team, not for anyone's rank.</div>`
      : "");
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
    const ofc = $("#mb-office-sub");
    if (ofc) ofc.textContent = STORE.settings.officeName
      ? "Knocking in " + STORE.settings.officeName
      : "Where you're knocking";
    const s = STORE.settings;
    $("#more-company-sub").textContent = s.companyName
      ? s.companyName + (s.companyLicense ? " · lic. " + s.companyLicense : "")
      : "Set the name printed on every agreement";
    const me = STORE.currentUser();
    $("#more-team-sub").textContent = me
      ? `${STORE.users.length} teammate${STORE.users.length === 1 ? "" : "s"} · this device: ${me.name}`
      : "Add your reps and managers";
    // where this device's authority actually comes from, said plainly
    const rl = $("#more-role-line");
    if (rl) rl.textContent = STORE.roleLine();
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
    $("#more-prop-sub").textContent = (() => {
      const n = MPROP.activeName();
      const src = MPROP.providerName(n);
      const doors = STORE.pins.filter((p) => p.disposition === "unworked").length;
      return src + (doors ? ` · ${doors} unworked doors on the map` : " · doors import when you draw a territory");
    })();
    const bv = $("#more-build");
    if (bv) bv.textContent = "Build " + (window.RALLY_BUILD || "?");
    $("#more-lock-sub").textContent = MAUTH.hasAccount()
      ? "Signed in as " + MAUTH.accountEmail()
      : "No device lock set up yet";
    const syncSt = window.MSYNC && MSYNC.status();
    // "synced" is a claim, and it is only true when nothing is waiting AND
    // nothing was refused. A record the server rejected is neither.
    const syncBit = syncSt && syncSt.on
      ? (!syncSt.loaded ? "checking sync…"
          : syncSt.refused ? `${syncSt.refused} refused by the server`
          : syncSt.pending ? `${syncSt.pending} to sync` : "synced")
      : `${STORE.queuedCount()} queued for sync`;
    $("#more-export-sub").textContent = STORE.customers.length
      ? `${STORE.customers.length} customer${STORE.customers.length === 1 ? "" : "s"} · ${syncBit}`
      : "Signed customers land here";
  }

  // ---------- team & roles ----------
  function renderTeam() {
    const cur = STORE.settings.currentUserId;
    // With a company account, roles are the OFFICE's to set: the server
    // decides them and the server enforces them (see 0003). Offering a
    // "Make mgr" button here would promise something this device cannot do
    // and the next profile sync would silently undo it.
    const serverRoles = !!(window.MCLOUD && MCLOUD.enabled());
    // adding a local person on a cloud device is theatre: the roster comes
    // from the server's profiles, and a local row would just be adopted or
    // shadowed by the next sync
    const addWrap = $("#team-add-wrap");
    if (addWrap) addWrap.hidden = serverRoles;
    const note = $("#team-role-note");
    if (note) {
      note.hidden = !serverRoles;
      note.textContent = "Roles are set by the office and enforced by the server. "
        + "This list shows what the server last told this device — people are "
        + "added and removed there, not here.";
    }
    $("#team-list").innerHTML = STORE.users.map((u) => {
      const hoods = STORE.hoodsOf(u.id).length;
      const label = STORE.ROLE_LABELS[u.role] || "Rep";
      return `<div class="team-row">
        <span class="dot" style="background:${u.color}"></span>
        <span class="tn"><b>${esc(u.name)}</b><span class="tr">${label} · ${hoods} hood${hoods === 1 ? "" : "s"}</span></span>
        ${u.id === cur ? '<span class="me-chip">This device</span>'
          : serverRoles ? ""
          : `<button class="team-btn team-me" data-id="${u.id}" type="button">Use</button>`}
        ${serverRoles ? "" : `
          <button class="team-btn team-role" data-id="${u.id}" type="button">${u.role === "manager" ? "Make rep" : "Make mgr"}</button>
          <button class="mini-x team-del" data-id="${u.id}" type="button" aria-label="Remove">✕</button>`}
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
        STORE.settings.repName = u.name; // display name only — never identity
        await STORE.saveSettings();
        await STORE.loadRoleState();
        afterChange();
        toast(`This device is now ${u.name}`);
      }));
    $$("#team-list .team-role").forEach((b) =>
      b.addEventListener("click", async () => {
        const u = STORE.userById(b.dataset.id);
        if (!u) return;
        const leads = STORE.users.filter((x) => STORE.canManageTerritories(x.role));
        if (STORE.canManageTerritories(u.role) && leads.length === 1) {
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
        const leads = STORE.users.filter((x) => STORE.canManageTerritories(x.role));
        if (STORE.canManageTerritories(u.role) && leads.length === 1) {
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
        toast("Google imagery is on");
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

    $("#more-prop").addEventListener("click", () => {
      const sel = STORE.settings.propertySource || "auto";
      $$("#pd-source .pd-chip").forEach((b) => b.classList.toggle("sel", b.dataset.s === sel));
      $("#pd-regrid-key").value = STORE.settings.regridKey || "";
      openSheet("prop-data-sheet");
    });
    $$("#pd-source .pd-chip").forEach((b) =>
      b.addEventListener("click", () => {
        MUI.tick();
        $$("#pd-source .pd-chip").forEach((x) => x.classList.toggle("sel", x === b));
      }));
    $("#pd-save").addEventListener("click", async () => {
      const sel = $$("#pd-source .pd-chip").find((b) => b.classList.contains("sel"));
      STORE.settings.propertySource = sel ? sel.dataset.s : "auto";
      STORE.settings.regridKey = $("#pd-regrid-key").value.trim();
      await STORE.saveSettings();
      renderMore(); closeSheet();
      toast("Property data: " + MPROP.providerName(MPROP.activeName()));
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
      const st = window.MSYNC && MSYNC.status();
      if (st && st.on) {
        parts.push(!st.team
          ? "Cloud sync: waiting for a team (ask your manager to add you)"
          : st.pending
            ? `Cloud sync: ${st.pending} change${st.pending === 1 ? "" : "s"} waiting`
            : st.lastSyncAt
              ? "Cloud sync: up to date · " + MUI.fmtAgo(st.lastSyncAt)
              : "Cloud sync: on");
      }
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
      if (window.MSYNC) await MSYNC.reset().catch(() => {});
      STORE.pins = []; STORE.events = []; STORE.customers = []; STORE.territories = [];
      MMAP.refreshPins(); MMAP.refreshHoods(); MSTAT.render(); MCUST.renderList(); renderMore();
      toast("All data erased");
    });
  }

  // ---------- boot ----------
  async function boot() {
    // register the SW first — and robustly, since 'load' may already have fired
    if ("serviceWorker" in navigator) {
      // A new build used to need TWO opens to land: the fresh worker installs
      // on the first, activates on the second. Reloading the moment it takes
      // control means an update reaches the phone on the very next open.
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;           // controllerchange fires once per takeover
        reloading = true;
        location.reload();
      });
      const reg = () => navigator.serviceWorker.register("sw.js")
        .then((r) => { try { r.update(); } catch (_) {} })
        .catch(() => {});
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
    // the trusted role this device last heard from the server, loaded before
    // a single privileged control can render. The gate's revalidate() and the
    // first sync cycle refresh it; until then this is what we honestly know.
    try { await STORE.loadRoleState(); } catch (_) {}
    // splash, then the device gate — resolves once this device is unlocked
    try {
      await MGATE.run();
    } catch (e) {
      console.error("gate failed", e); // never strand the rep behind a broken lock
      const sp = $("#splash"), g = $("#gate");
      if (sp) sp.hidden = true;
      if (g) g.hidden = true;
    }
    // team sync wakes up once the device is unlocked; with cloud
    // unconfigured this is a no-op and RALLY stays purely local
    try { if (window.MSYNC) MSYNC.start(); } catch (e) { console.error("sync start", e); }
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
    $("#home-back").addEventListener("click", () => show("more"));
    // More bubbles: Home, the full-filter book, and the office you're in
    $("#mb-home").addEventListener("click", () => { MUI.tick(); show("home"); });
    $("#mb-customers").addEventListener("click", () => { MUI.tick(); MCUST.openAdvanced(); });
    $("#mb-office").addEventListener("click", () => {
      MUI.tick();
      $("#of-name").value = STORE.settings.officeName || "";
      openSheet("office-sheet");
    });
    $("#of-save").addEventListener("click", async () => {
      STORE.settings.officeName = $("#of-name").value.trim();
      await STORE.saveSettings();
      closeSheet();
      renderMore();
      toast(STORE.settings.officeName ? "Office: " + STORE.settings.officeName : "Office cleared");
    });
    MCUST.bind();
    MSCHED.bind();
    MTURF.bind();
    MHOODS.bind();
    MROUTE.bind();
    MSTREET.bind();
    MSELECT.bind();
    bindMore();
    MVAULT.guard(); // ask the browser to never evict the vault
    try { MMAP.init(); } catch (e) { console.error("map init failed", e); }
    renderGuide("");
    renderMore();
    // a role change (promotion, demotion, or the first server answer landing)
    // has to reach the privileged surfaces immediately — not on next launch
    window.MAPP = { show, roleChanged: () => { renderMore(); renderRankScreen(); } };
    show("customers"); // Customers is the front tab now; Home lives in More

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
