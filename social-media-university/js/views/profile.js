/* ============================================================
   Profile — identity, progress analytics, achievements, settings.
   Route: profile
   ============================================================ */

(function () {
  const esc = SMU.esc, ui = SMU.ui;

  function rerender() {
    const root = document.getElementById("view");
    if (root) SMU.views.profile.render(root);
  }

  /* ---------- achievements ---------- */
  function badges() {
    const st = SMU.state;
    const lessonsDone = Object.keys(st.lessons).filter((k) => st.lessons[k] && st.lessons[k].done).length;
    const perfectQuiz = Object.keys(st.quizzes).some((d) => {
      const q = st.quizzes[d];
      return q && q.total > 0 && q.score === q.total;
    });
    const anySchoolDone = SMU.schools().some((s) => {
      const p = SMU.schoolProgress(s);
      return p.total > 0 && p.done === p.total;
    });
    return [
      { e: "👣", n: "First Steps", req: "Complete your first lesson", ok: lessonsDone >= 1 },
      { e: "📆", n: "Study Habit", req: "Hold a 7-day streak", ok: st.bestStreak >= 7 },
      { e: "🔥", n: "On Fire", req: "Hold a 30-day streak", ok: st.bestStreak >= 30 },
      { e: "🥉", n: "Ten Deep", req: "Complete 10 lessons", ok: lessonsDone >= 10 },
      { e: "🥈", n: "Half Century", req: "Complete 50 lessons", ok: lessonsDone >= 50 },
      { e: "🥇", n: "Centurion", req: "Complete 100 lessons", ok: lessonsDone >= 100 },
      { e: "🎯", n: "Quiz Ace", req: "Score a perfect daily quiz", ok: perfectQuiz },
      { e: "🔬", n: "Analyzer", req: "Run your first content analysis", ok: (st.analyses || []).length >= 1 },
      { e: "🏛️", n: "Brand Architect", req: "Build your brand profile", ok: !!st.brand },
      { e: "🎓", n: "School's Out", req: "Finish an entire school", ok: anySchoolDone },
      { e: "👑", n: "The Master", req: "Reach Master rank", ok: SMU.rank().name === "Master" },
      { e: "🔖", n: "Curator", req: "Save 10 items to your collection", ok: (st.saved || []).length >= 10 },
    ];
  }

  /* ---------- weekly activity ---------- */
  function weeklyData() {
    const st = SMU.state;
    const stamps = [];
    Object.keys(st.lessons).forEach((k) => { const r = st.lessons[k]; if (r && r.at) stamps.push(r.at); });
    Object.keys(st.challenges).forEach((k) => { const v = st.challenges[k]; if (typeof v === "number") stamps.push(v); });
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({ key: SMU.dayKey(d), label: d.toLocaleDateString(undefined, { weekday: "narrow" }), n: 0 });
    }
    stamps.forEach((t) => {
      const k = SMU.dayKey(new Date(t));
      const hit = days.find((d) => d.key === k);
      if (hit) hit.n++;
    });
    return days;
  }

  /* ---------- confirm reset (typed) ---------- */
  function confirmReset() {
    const s = SMU.sheet("Reset everything?",
      '<p class="small" style="line-height:1.6;margin-bottom:14px">This permanently wipes your progress, XP, streaks, brand profile, saved items and settings on this device. There is no undo. Export a backup first if in doubt.</p>' +
      '<div class="field"><label>Type RESET to confirm</label><input class="input" id="rsIn" autocomplete="off" autocapitalize="characters"></div>' +
      '<button class="btn btn-danger btn-block" id="rsGo" disabled>Erase everything</button>' +
      '<button class="btn btn-ghost btn-block btn-sm" id="rsNo" style="margin-top:9px">Keep my data</button>');
    const input = s.el.querySelector("#rsIn"), go = s.el.querySelector("#rsGo");
    input.addEventListener("input", () => { go.disabled = input.value.trim().toUpperCase() !== "RESET"; });
    go.addEventListener("click", () => SMU.resetAll());
    s.el.querySelector("#rsNo").addEventListener("click", () => s.close());
  }

  /* ---------- edit name ---------- */
  function editName() {
    const s = SMU.sheet("Your name",
      '<div class="field"><input class="input" id="nmIn" maxlength="30" value="' + esc(SMU.state.name || "") + '" placeholder="Your name"></div>' +
      '<button class="btn btn-gold btn-block" id="nmGo">Save</button>');
    const input = s.el.querySelector("#nmIn");
    input.focus();
    s.el.querySelector("#nmGo").addEventListener("click", () => {
      SMU.state.name = input.value.trim();
      SMU.save();
      s.close();
      if (SMU.refreshChrome) SMU.refreshChrome();
      rerender();
    });
  }

  /* ================= view ================= */
  SMU.views.profile = {
    title: "Profile",
    render(root) {
      const st = SMU.state;
      const r = SMU.rank();
      const prog = SMU.overallProgress();
      const lessonsDone = prog.done;

      /* quiz average */
      const quizzes = Object.keys(st.quizzes).map((k) => st.quizzes[k]).filter((q) => q && q.total);
      const quizAvg = quizzes.length
        ? Math.round(quizzes.reduce((a, q) => a + q.score / q.total, 0) / quizzes.length * 100)
        : null;
      const daysIn = Math.max(1, Math.round((Date.now() - new Date(st.firstDay + "T00:00:00").getTime()) / 86400000) + 0);

      /* ----- identity ----- */
      let html =
        '<div class="card card-hero" style="margin-top:8px">' +
        '<div class="row" style="align-items:center">' +
        '<div style="flex:0 0 auto;width:62px;height:62px;border-radius:50%;background:var(--gold-grad);color:#231708;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:26px">' +
        esc((st.name || "S").trim().charAt(0).toUpperCase() || "S") + "</div>" +
        '<div class="grow">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
        '<span style="font-family:var(--serif);font-weight:600;font-size:22px;line-height:1.15">' + esc(st.name || "Student") + "</span>" +
        '<button id="editName" aria-label="Edit name" style="color:var(--faint);font-size:13px;padding:4px">✎</button></div>' +
        '<div class="small" style="margin-top:3px">' +
        esc((SMU.NICHE_LABELS[st.niche] || st.niche) + " · " +
          ({ grow: "Growing the audience", brand: "Building the brand", monetize: "Monetizing" }[st.goal] || st.goal)) +
        "</div>" +
        '<div style="margin-top:9px;display:flex;align-items:center;gap:9px">' +
        '<span class="tag gold">' + esc(r.name) + "</span>" +
        '<span class="small mono">' + st.xp.toLocaleString() + " XP</span></div>" +
        "</div></div>" +
        '<div style="margin-top:13px">' + ui.bar(r.pct) + "</div>" +
        '<div class="small" style="margin-top:7px">' +
        (r.next ? r.toNext.toLocaleString() + " XP to " + esc(r.next) : "Top rank — now defend it with reps.") + "</div>" +
        "</div>";

      /* ----- stats ----- */
      html +=
        '<div class="stat-grid" style="margin-top:12px">' +
        '<div class="stat"><div class="v">🔥 ' + SMU.liveStreak() + '</div><div class="k">Streak</div></div>' +
        '<div class="stat"><div class="v">' + st.bestStreak + '</div><div class="k">Best streak</div></div>' +
        '<div class="stat"><div class="v">' + st.xp.toLocaleString() + '</div><div class="k">Total XP</div></div>' +
        "</div>" +
        '<div class="stat-grid" style="margin-top:10px">' +
        '<div class="stat"><div class="v">' + lessonsDone + '</div><div class="k">Lessons</div></div>' +
        '<div class="stat"><div class="v">' + (quizAvg == null ? "—" : quizAvg + "%") + '</div><div class="k">Quiz avg</div></div>' +
        '<div class="stat"><div class="v">' + daysIn + '</div><div class="k">Days in</div></div>' +
        "</div>";

      /* ----- skills ----- */
      html += ui.sectionHead("Skill profile");
      html += '<div class="card"><div class="chart-box">' + ui.radar(st.skills, 260) + "</div>";
      const maxSkill = Math.max(1, ...Object.keys(st.skills).map((k) => st.skills[k]));
      const sorted = Object.keys(st.skills).sort((a, b) => st.skills[b] - st.skills[a]);
      html += sorted.map((k) =>
        '<div style="display:flex;align-items:center;gap:10px;margin-top:9px">' +
        '<span class="small" style="flex:0 0 84px;font-weight:650">' + esc(SMU.SKILL_LABELS[k]) + "</span>" +
        '<div style="flex:1">' + ui.bar(Math.round((st.skills[k] / maxSkill) * 100), true) + "</div>" +
        '<span class="small mono" style="flex:0 0 auto">' + st.skills[k] + "</span></div>"
      ).join("");
      html += "</div>";

      /* ----- weekly activity ----- */
      const days = weeklyData();
      const thisWeek = days.slice(7).reduce((a, d) => a + d.n, 0);
      const lastWeek = days.slice(0, 7).reduce((a, d) => a + d.n, 0);
      const maxN = Math.max(1, ...days.slice(7).map((d) => d.n));
      const delta = thisWeek - lastWeek;
      html += ui.sectionHead("This week");
      html +=
        '<div class="card">' +
        '<div style="display:flex;align-items:flex-end;gap:8px;height:78px;padding:4px 2px 0">' +
        days.slice(7).map((d) =>
          '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end">' +
          '<div style="width:100%;max-width:26px;border-radius:6px 6px 3px 3px;height:' +
          Math.max(5, Math.round((d.n / maxN) * 54)) + "px;background:" +
          (d.n ? "var(--gold-grad)" : "rgba(255,255,255,.07)") + '"></div>' +
          '<span class="small" style="font-size:10px;color:var(--faint)">' + esc(d.label) + "</span></div>"
        ).join("") +
        "</div>" +
        '<div class="small" style="margin-top:12px">' +
        thisWeek + " completions this week · " +
        (delta > 0 ? "up " + delta + " on last week — momentum." :
          delta < 0 ? Math.abs(delta) + " behind last week — one lesson fixes that." :
          "level with last week — consistency counts.") +
        "</div></div>";

      /* ----- achievements ----- */
      const bs = badges();
      const earned = bs.filter((b) => b.ok).length;
      html += ui.sectionHead("Achievements · " + earned + "/" + bs.length);
      html += '<div class="grid-2">' + bs.map((b) =>
        '<div class="card" style="padding:14px;text-align:center;' +
        (b.ok ? "border-color:var(--gold-line)" : "opacity:.45") + '">' +
        '<div style="font-size:26px">' + b.e + "</div>" +
        '<div style="font-weight:700;font-size:13.5px;margin-top:6px">' + esc(b.n) + "</div>" +
        '<div class="small" style="font-size:11px;margin-top:3px;line-height:1.4">' + esc(b.req) + "</div></div>"
      ).join("") + "</div>";

      /* ----- settings ----- */
      html += ui.sectionHead("Settings");
      html +=
        '<div class="card">' +
        '<div class="field"><label>Niche</label><select class="select" id="setNiche">' +
        SMU.NICHES.map((n) => '<option value="' + n + '"' + (n === st.niche ? " selected" : "") + ">" + esc(SMU.NICHE_LABELS[n]) + "</option>").join("") +
        "</select></div>" +
        '<div class="field"><label>Main goal</label><select class="select" id="setGoal">' +
        [["grow", "Grow my audience"], ["brand", "Build my brand"], ["monetize", "Monetize"]].map(([v, l]) =>
          '<option value="' + v + '"' + (v === st.goal ? " selected" : "") + ">" + l + "</option>").join("") +
        "</select></div>" +
        '<div class="divider"></div>' +
        '<div class="kicker">AI mentor</div>' +
        '<p class="small" style="margin:2px 0 12px;line-height:1.6">Your Claude API key is stored only on this device and sent only to Anthropic. Every feature also works without one — the key upgrades the mentor from playbook to fully personal.</p>' +
        '<div class="field"><label>Claude API key</label>' +
        '<input class="input" type="password" id="setKey" placeholder="sk-ant-…" value="' + esc(st.settings.apiKey || "") + '" autocomplete="off"></div>' +
        '<div class="field"><label>Model</label><select class="select" id="setModel">' +
        [["claude-opus-4-8", "Opus 4.8 — most capable (default)"],
         ["claude-sonnet-5", "Sonnet 5 — fast + smart"],
         ["claude-haiku-4-5", "Haiku 4.5 — fastest"]].map(([v, l]) =>
          '<option value="' + v + '"' + (v === (st.settings.model || "claude-opus-4-8") ? " selected" : "") + ">" + l + "</option>").join("") +
        "</select></div>" +
        '<div style="display:flex;gap:9px">' +
        '<button class="btn btn-gold btn-sm" id="keySave">Save key</button>' +
        '<button class="btn btn-soft btn-sm" id="keyTest">Test connection</button></div>' +
        '<div class="divider"></div>' +
        '<div class="kicker">Your data</div>' +
        '<div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:10px">' +
        '<button class="btn btn-ghost btn-sm" id="dataExport">Export backup</button>' +
        '<button class="btn btn-ghost btn-sm" id="dataImport">Import backup</button>' +
        '<button class="btn btn-danger btn-sm" id="dataReset" style="margin-left:auto">Reset</button></div>' +
        '<input type="file" id="importFile" accept="application/json" class="sr-only">' +
        "</div>";

      /* ----- about ----- */
      html +=
        '<div class="card" style="margin-top:12px;text-align:center;padding:22px">' +
        '<div class="wordmark" style="justify-content:center"><span class="wm-main">Social&nbsp;Media&nbsp;University</span><span class="wm-ai">AI</span></div>' +
        '<p class="small" style="margin-top:10px;line-height:1.6">Your private AI mentor for content, growth and personal branding.<br>' +
        "Built as a private, installable web app — your data never leaves your device.</p>" +
        '<div class="small mono" style="margin-top:8px;color:var(--faint)">Version 1.0</div></div>';

      root.innerHTML = html;

      /* ----- bindings ----- */
      root.querySelector("#editName").addEventListener("click", editName);
      root.querySelector("#setNiche").addEventListener("change", (e) => {
        SMU.state.niche = e.target.value; SMU.save(); SMU.toast("Niche updated — tools retuned.");
      });
      root.querySelector("#setGoal").addEventListener("change", (e) => {
        SMU.state.goal = e.target.value; SMU.save(); SMU.toast("Goal updated.");
      });
      root.querySelector("#setModel").addEventListener("change", (e) => {
        SMU.state.settings.model = e.target.value; SMU.save(); SMU.toast("Model updated.");
      });
      root.querySelector("#keySave").addEventListener("click", () => {
        SMU.state.settings.apiKey = root.querySelector("#setKey").value.trim();
        SMU.save();
        SMU.toast(SMU.state.settings.apiKey ? "Key saved — the mentor is fully awake." : "Key removed — playbook mode.");
      });
      root.querySelector("#keyTest").addEventListener("click", (e) => {
        const btn = e.currentTarget;
        SMU.state.settings.apiKey = root.querySelector("#setKey").value.trim();
        SMU.save();
        if (!SMU.ai.hasKey()) { SMU.toast("Paste a key first."); return; }
        btn.disabled = true; btn.textContent = "Testing…";
        SMU.ai.ask("Reply with exactly: Connected.", { maxTokens: 64 })
          .then((t) => SMU.toast(/connected/i.test(t) ? "✓ Connected — mentor online." : "Reached Claude: " + t.slice(0, 40)))
          .catch((err) => SMU.toast(err.message || "Connection failed"))
          .finally(() => { btn.disabled = false; btn.textContent = "Test connection"; });
      });
      root.querySelector("#dataExport").addEventListener("click", () => SMU.exportData());
      const fileIn = root.querySelector("#importFile");
      root.querySelector("#dataImport").addEventListener("click", () => fileIn.click());
      fileIn.addEventListener("change", () => {
        const f = fileIn.files && fileIn.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          try { SMU.importData(String(rd.result)); SMU.toast("Backup restored."); }
          catch (err) { SMU.toast(err.message || "That file isn't a valid backup."); }
        };
        rd.readAsText(f);
      });
      root.querySelector("#dataReset").addEventListener("click", confirmReset);
    },
  };
})();
