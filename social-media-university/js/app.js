/* ============================================================
   SMU app boot — chrome, delegation, onboarding, service worker.
   ============================================================ */

(function () {
  const esc = SMU.esc, ui = SMU.ui;

  const TABS = [
    { id: "today", label: "Today", icon: "today" },
    { id: "learn", label: "Learn", icon: "learn" },
    { id: "coach", label: "Coach", icon: "coach" },
    { id: "studio", label: "Studio", icon: "studio" },
    { id: "intel", label: "Intel", icon: "intel" },
  ];

  function renderChrome() {
    document.getElementById("topbar").innerHTML =
      '<div class="wordmark" data-nav="today">' +
      '<span class="wm-main">Social&nbsp;Media&nbsp;University</span>' +
      '<span class="wm-ai">AI</span></div>' +
      '<div class="top-actions">' +
      '<span class="streak-pill" id="streakPill" data-nav="profile">🔥 <span id="streakN">0</span></span>' +
      '<button class="avatar-btn" id="avatarBtn" data-nav="profile" aria-label="Profile">S</button>' +
      "</div>";

    document.getElementById("tabbar").innerHTML = TABS.map((t) =>
      '<button class="tab" data-nav="' + t.id + '" data-tab="' + t.id + '" aria-label="' + t.label + '">' +
      ui.icon(t.icon) + "<span>" + t.label + '</span><span class="tab-dot"></span></button>'
    ).join("");
  }

  SMU.refreshChrome = function () {
    const streakN = document.getElementById("streakN");
    if (streakN) streakN.textContent = SMU.liveStreak();
    const av = document.getElementById("avatarBtn");
    if (av) av.textContent = (SMU.state.name || "S").trim().charAt(0).toUpperCase() || "S";
    const active = (SMU.route && SMU.route.name) || "today";
    document.querySelectorAll(".tab").forEach((el) => {
      el.classList.toggle("on", el.dataset.tab === active ||
        (active === "profile" && false));
    });
  };

  /* Global delegation: data-nav navigates, data-copy copies. */
  document.addEventListener("click", (e) => {
    const copyEl = e.target.closest("[data-copy]");
    if (copyEl) { SMU.copy(copyEl.getAttribute("data-copy")); return; }
    const navEl = e.target.closest("[data-nav]");
    if (navEl) {
      const r = navEl.getAttribute("data-nav");
      if (r) SMU.nav(r);
    }
  });

  /* ---------- onboarding ---------- */
  function onboarding() {
    const nicheChips = SMU.NICHES.map((n) =>
      '<button class="chip' + (n === "business" ? " on" : "") + '" data-niche="' + n + '">' +
      esc(SMU.NICHE_LABELS[n]) + "</button>").join("");
    const s = SMU.sheet("", [
      '<div class="kicker">Welcome to</div>',
      '<div class="h-display" style="margin-top:0">Social Media <span class="accent">University</span></div>',
      '<p class="h-sub">Your private AI mentor for content, growth and personal branding — from first post to master creator.</p>',
      '<div class="field"><label>What should your mentor call you?</label>',
      '<input class="input" id="obName" placeholder="Your name" maxlength="30" autocomplete="off"></div>',
      '<div class="field"><label>Your niche</label><div class="chips" id="obNiche">' + nicheChips + "</div></div>",
      '<div class="field"><label>Main goal</label><div class="seg" id="obGoal">',
      '<button data-g="grow" class="on">Grow audience</button>',
      '<button data-g="brand">Build my brand</button>',
      '<button data-g="monetize">Monetize</button>',
      "</div></div>",
      '<button class="btn btn-gold btn-block" id="obGo" style="margin-top:10px">Enter the University</button>',
      '<p class="small" style="text-align:center;margin-top:12px">Everything runs on your device. No account, no tracking.</p>',
    ].join(""), { sticky: true });

    let niche = "business", goal = "grow";
    s.el.querySelector("#obNiche").addEventListener("click", (e) => {
      const c = e.target.closest("[data-niche]"); if (!c) return;
      niche = c.dataset.niche;
      s.el.querySelectorAll("#obNiche .chip").forEach((x) => x.classList.toggle("on", x === c));
    });
    s.el.querySelector("#obGoal").addEventListener("click", (e) => {
      const b = e.target.closest("[data-g]"); if (!b) return;
      goal = b.dataset.g;
      s.el.querySelectorAll("#obGoal button").forEach((x) => x.classList.toggle("on", x === b));
    });
    s.el.querySelector("#obGo").addEventListener("click", () => {
      SMU.state.name = s.el.querySelector("#obName").value.trim();
      SMU.state.niche = niche;
      SMU.state.goal = goal;
      SMU.state.onboarded = true;
      SMU.save();
      s.close();
      SMU.toast("Welcome" + (SMU.state.name ? ", " + SMU.state.name : "") + " — day one starts now.");
      SMU.renderRoute();
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    renderChrome();
    if (!location.hash) location.hash = "#/today";
    SMU.renderRoute();
    if (!SMU.state.onboarded) onboarding();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
