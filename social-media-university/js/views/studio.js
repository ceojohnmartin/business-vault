/* ============================================================
   Studio — the creator toolroom: generators (hooks, ideas,
   scripts, captions, calendar, shot lists, b-roll, recipes),
   the Content Analyzer, Thumbnail Critique, and Brand Builder.
   Routes: studio | studio/<toolId>
   ============================================================ */

(function () {
  const esc = SMU.esc, ui = SMU.ui;
  const PB = () => (window.SMU_DATA && SMU_DATA.playbooks) || {};

  /* ---------- shared helpers ---------- */
  function nicheLabel() { return SMU.NICHE_LABELS[SMU.state.niche] || SMU.state.niche; }
  function sample(arr, n) {
    const a = (arr || []).slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a.slice(0, n);
  }
  function fill(t, topic) {
    const low = (topic || nicheLabel()).toLowerCase();
    const goal = { grow: "grow", brand: "build a real brand", monetize: "get paid" }[SMU.state.goal] || "level up";
    return String(t || "")
      .replace(/\{topic\}/g, low)
      .replace(/\{niche\}/g, nicheLabel().toLowerCase())
      .replace(/\{goal\}/g, goal)
      .replace(/\{number\}/g, String(2 + Math.floor(Math.random() * 6)))
      .replace(/\{timeframe\}/g, sample(["30 days", "90 days", "one week", "a year"], 1)[0]);
  }

  function toolHead(title, sub) {
    return ui.backLink("studio", "Studio") +
      '<div style="font-family:var(--serif);font-weight:600;font-size:24px;line-height:1.15;margin-top:10px">' + esc(title) + "</div>" +
      (sub ? '<p class="small" style="margin:7px 0 16px;line-height:1.6">' + esc(sub) + "</p>" : "");
  }

  function outCard(text, saveType) {
    return (
      '<div class="card" style="padding:15px 16px;margin-top:10px">' +
      '<div style="display:flex;gap:10px;align-items:flex-start">' +
      '<div class="grow" style="font-size:14.5px;line-height:1.55;white-space:pre-wrap;overflow-wrap:break-word">' + esc(text) + "</div>" +
      '<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:6px">' +
      '<button style="padding:7px;color:var(--muted)" data-copy="' + esc(text) + '" aria-label="Copy">' + ui.icon("copy") + "</button>" +
      '<button style="padding:7px;color:var(--faint)" data-save-type="' + esc(saveType) + '" data-save="' + esc(text) + '" aria-label="Save">' + ui.icon("bookmark") + "</button>" +
      "</div></div></div>"
    );
  }
  function bindSaves(root) {
    root.querySelectorAll("[data-save]").forEach((b) => {
      b.addEventListener("click", () => {
        SMU.saveText(b.dataset.saveType || "idea", b.dataset.save, nicheLabel());
        b.style.color = "var(--gold)";
        b.innerHTML = ui.icon("bookmarkFill");
        SMU.toast("Saved to Intel → Saved");
      });
    });
  }

  function chipRow(id, options, active, allLabel) {
    let html = '<div class="chips scroll" id="' + id + '">';
    if (allLabel) html += '<button class="chip' + (active === "all" ? " on" : "") + '" data-v="all">' + esc(allLabel) + "</button>";
    html += options.map(([v, l]) =>
      '<button class="chip' + (v === active ? " on" : "") + '" data-v="' + esc(v) + '">' + esc(l) + "</button>").join("");
    return html + "</div>";
  }

  function aiNote() {
    if (SMU.ai.hasKey()) return "";
    return '<p class="small" style="margin-top:14px;line-height:1.55">Generating from the playbook library. ' +
      '<span style="color:var(--gold);cursor:pointer" data-nav="profile">Add a Claude API key</span> and every tool writes custom for your brand.</p>';
  }

  function streamSheet(title, prompt, maxTokens) {
    const s = SMU.sheet(title, '<div id="ssBody"><div class="msg ai thinking" style="max-width:none"><i></i><i></i><i></i></div></div><div id="ssFoot"></div>');
    const body = s.el.querySelector("#ssBody"), foot = s.el.querySelector("#ssFoot");
    SMU.ai.ask(prompt, {
      maxTokens: maxTokens || 1200,
      onDelta: (d, full) => { body.innerHTML = '<div class="fade-lines">' + SMU.md(full) + "</div>"; },
    }).then((full) => {
      body.innerHTML = '<div class="fade-lines">' + SMU.md(full) + "</div>";
      foot.innerHTML = '<button class="btn btn-soft btn-block btn-sm" style="margin-top:14px" id="ssCopy">' + ui.icon("copy") + " Copy</button>";
      foot.querySelector("#ssCopy").addEventListener("click", () => ui.copy(full));
    }).catch((e) => {
      body.innerHTML = ui.empty("📡", "The line dropped.", e.message || "Try again in a moment.");
    });
  }

  function brandContext() {
    const b = SMU.state.brand;
    if (!b) return "Niche: " + nicheLabel() + ".";
    return "Brand: " + (b.name || "") + " — " + (b.oneliner || "") + ". Adjectives: " + (b.adjectives || []).join(", ") +
      ". Audience: " + (b.audience || "") + ". Known for: " + (b.knownFor || "") +
      ". Pillars: " + (b.pillars || []).join(", ") + ". Voice: " + (b.voice || "") + ". Niche: " + nicheLabel() + ".";
  }

  /* ================= hub ================= */
  const TOOLS = {
    create: [
      ["hooks", "🪝", "Hook Lab", "120+ scroll-stopping opens, tuned to your niche"],
      ["ideas", "💡", "Idea Engine", "Never run out of things to film"],
      ["scripts", "📝", "Script Writer", "10 viral frameworks, drafted for you"],
      ["captions", "✍️", "Caption Studio", "Formulas + CTAs matched to your goal"],
      ["calendar", "🗓️", "Content Calendar", "A week of posts, planned in a minute"],
      ["shotlist", "🎬", "Shot Lists", "Storyboards for shoots that look expensive"],
      ["broll", "📹", "B-Roll Bank", "The clips to capture this week"],
      ["recipes", "🎛️", "Edit Recipes", "Step-by-step signature edits"],
    ],
    analyze: [
      ["analyzer", "🔬", "Content Analyzer", "Score your video 0–100 and fix what leaks"],
      ["thumbnail", "🖼️", "Thumbnail Critique", "CTR psychology on your packaging"],
    ],
    brand: [
      ["brand", "🏛️", "Brand Builder", "Your identity, pillars and voice — engineered"],
    ],
  };

  function renderHub(root) {
    let html =
      '<div class="kicker" style="margin-top:10px">Creator studio</div>' +
      '<div class="h-display" style="margin-top:0">Make it. <span class="accent">Ship it.</span></div>' +
      '<p class="h-sub">Every tool works out of the box — and gets personal once your brand profile exists.</p>';

    if (!SMU.state.brand) {
      html +=
        '<div class="card tap card-hero" data-nav="studio/brand" style="padding:15px 18px;margin-bottom:6px">' +
        '<div class="row"><div class="grow">' +
        '<div class="title" style="color:var(--gold-hi)">Build your brand profile</div>' +
        '<div class="sub" style="white-space:normal">5 minutes — then every tool and the mentor personalize to it.</div></div>' +
        '<span class="chev">' + ui.icon("chev") + "</span></div></div>";
    }

    const section = (label, key) =>
      ui.sectionHead(label) +
      '<div class="list-tight">' +
      TOOLS[key].map(([id, emoji, title, sub]) => ui.row({
        emoji, hue: { create: 42, analyze: 190, brand: 48 }[key],
        title, sub, nav: "studio/" + id,
      })).join("") + "</div>";

    html += section("Create", "create") + section("Analyze", "analyze") + section("Brand", "brand");
    root.innerHTML = html;
  }

  /* ================= hooks ================= */
  const HOOK_CATS = [["curiosity", "Curiosity"], ["status", "Status"], ["fear", "Fear"], ["desire", "Desire"], ["controversy", "Controversy"], ["tutorial", "Tutorial"], ["story", "Story"], ["proof", "Proof"]];
  let hookState = { niche: null, cat: "all" };

  function renderHooks(root) {
    hookState.niche = hookState.niche || SMU.state.niche;
    let html = toolHead("Hook Lab", "The first second decides everything. Generate five, say them out loud, keep the one you'd stop for.");
    html += chipRow("hkNiche", SMU.NICHES.map((n) => [n, SMU.NICHE_LABELS[n]]), hookState.niche);
    html += '<div style="height:8px"></div>' + chipRow("hkCat", HOOK_CATS, hookState.cat, "All types");
    html += '<div class="field" style="margin-top:14px"><label>Topic (optional)</label>' +
      '<input class="input" id="hkTopic" placeholder="e.g. cold DMs, morning routine, pricing"></div>' +
      '<button class="btn btn-gold btn-block" id="hkGo">Generate 5 hooks</button>' +
      (SMU.ai.hasKey() ? '<button class="btn btn-soft btn-block btn-sm" id="hkAI" style="margin-top:9px">✦ AI custom hooks</button>' : "") +
      '<div id="hkOut"></div>' + aiNote();
    root.innerHTML = html;

    const out = root.querySelector("#hkOut");
    function generate() {
      const topic = root.querySelector("#hkTopic").value.trim();
      const all = PB().hooks || [];
      let pool = all.filter((h) =>
        (hookState.cat === "all" || h.cat === hookState.cat) &&
        (h.niches || []).indexOf(hookState.niche) >= 0);
      if (pool.length < 5) pool = all.filter((h) => hookState.cat === "all" || h.cat === hookState.cat);
      if (pool.length < 5) pool = all;
      if (!pool.length) { out.innerHTML = ui.empty("🪝", "The hook library is loading."); return; }
      out.innerHTML = '<div style="margin-top:16px">' +
        sample(pool, 5).map((h) => outCard(fill(h.t, topic), "hook")).join("") + "</div>" +
        '<button class="btn btn-ghost btn-block btn-sm" id="hkAgain" style="margin-top:12px">Generate again</button>';
      bindSaves(out);
      out.querySelector("#hkAgain").addEventListener("click", generate);
    }
    root.querySelector("#hkGo").addEventListener("click", generate);
    const aiBtn = root.querySelector("#hkAI");
    if (aiBtn) aiBtn.addEventListener("click", () => {
      const topic = root.querySelector("#hkTopic").value.trim() || nicheLabel();
      streamSheet("Custom hooks", "Write 7 scroll-stopping short-form hooks about \"" + topic + "\" for my brand. " + brandContext() +
        " Mix hook types (curiosity, proof, story, controversy). One line each, numbered, no explanations — every hook speakable in under 3 seconds.", 700);
    });
    ["hkNiche", "hkCat"].forEach((id) => {
      root.querySelector("#" + id).addEventListener("click", (e) => {
        const c = e.target.closest("[data-v]"); if (!c) return;
        if (id === "hkNiche") hookState.niche = c.dataset.v; else hookState.cat = c.dataset.v;
        renderHooks(root);
      });
    });
  }

  /* ================= ideas ================= */
  let ideaState = { niche: null, platform: "all" };
  function renderIdeas(root) {
    ideaState.niche = ideaState.niche || SMU.state.niche;
    const plats = ["Instagram", "TikTok", "YouTube", "YouTube Shorts", "LinkedIn", "X"];
    let html = toolHead("Idea Engine", "Six ideas per pull. Pick the one you can film within the hour — speed is a content skill.");
    html += chipRow("idNiche", SMU.NICHES.map((n) => [n, SMU.NICHE_LABELS[n]]), ideaState.niche);
    html += '<div style="height:8px"></div>' + chipRow("idPlat", plats.map((p) => [p, p]), ideaState.platform, "Any platform");
    html += '<button class="btn btn-gold btn-block" id="idGo" style="margin-top:14px">Generate ideas</button><div id="idOut"></div>' + aiNote();
    root.innerHTML = html;

    const out = root.querySelector("#idOut");
    function generate() {
      const all = PB().ideas || [];
      let pool = all.filter((x) => x.niche === ideaState.niche && (ideaState.platform === "all" || x.platform === ideaState.platform));
      if (pool.length < 6) pool = all.filter((x) => x.niche === ideaState.niche);
      if (pool.length < 6) pool = all;
      if (!pool.length) { out.innerHTML = ui.empty("💡", "The idea library is loading."); return; }
      out.innerHTML = '<div style="margin-top:16px">' + sample(pool, 6).map((x) =>
        '<div class="card" style="padding:15px 16px;margin-top:10px">' +
        '<div style="font-size:14.5px;line-height:1.55">' + esc(x.idea) + "</div>" +
        '<div style="margin-top:9px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
        '<span class="tag gold">' + esc(x.format || "") + "</span>" +
        '<span class="tag">' + esc(x.platform || "") + "</span>" +
        '<span style="margin-left:auto;display:flex;gap:4px">' +
        '<button style="padding:6px;color:var(--muted)" data-copy="' + esc(x.idea) + '">' + ui.icon("copy") + "</button>" +
        '<button style="padding:6px;color:var(--faint)" data-save-type="idea" data-save="' + esc(x.idea) + '">' + ui.icon("bookmark") + "</button>" +
        "</span></div></div>").join("") + "</div>" +
        '<button class="btn btn-ghost btn-block btn-sm" id="idAgain" style="margin-top:12px">Generate again</button>';
      bindSaves(out);
      out.querySelector("#idAgain").addEventListener("click", generate);
    }
    root.querySelector("#idGo").addEventListener("click", generate);
    ["idNiche", "idPlat"].forEach((id) => {
      root.querySelector("#" + id).addEventListener("click", (e) => {
        const c = e.target.closest("[data-v]"); if (!c) return;
        if (id === "idNiche") ideaState.niche = c.dataset.v; else ideaState.platform = c.dataset.v;
        renderIdeas(root);
      });
    });
  }

  /* ================= scripts ================= */
  function renderScripts(root) {
    const scripts = PB().scripts || [];
    let html = toolHead("Script Writer", "Pick a proven framework, feed it a topic, ship a 60-second script.");
    if (!scripts.length) { root.innerHTML = html + ui.empty("📝", "Script frameworks are loading."); return; }
    html += '<div class="field"><label>Framework</label><select class="select" id="scSel">' +
      scripts.map((s, i) => '<option value="' + i + '">' + esc(s.name) + "</option>").join("") + "</select></div>" +
      '<div id="scInfo"></div>' +
      '<div class="field"><label>Your topic</label><input class="input" id="scTopic" placeholder="e.g. why most reels die at 3 seconds"></div>' +
      '<button class="btn btn-gold btn-block" id="scGo">' + (SMU.ai.hasKey() ? "✦ Draft my script" : "Build my script skeleton") + "</button>" +
      '<div id="scOut"></div>' + aiNote();
    root.innerHTML = html;

    const info = root.querySelector("#scInfo"), out = root.querySelector("#scOut");
    function showInfo() {
      const s = scripts[+root.querySelector("#scSel").value];
      info.innerHTML =
        '<div class="callout" style="margin-top:2px"><div class="c-k">' + esc(s.name) + (s.bestFor ? " — best for " + esc(s.bestFor) : "") + "</div>" +
        '<ol style="margin:0 0 0 18px">' + (s.structure || []).map((b) => '<li style="margin-bottom:6px;color:#efeadd">' + esc(b) + "</li>").join("") + "</ol>" +
        (s.example ? '<div class="small" style="margin-top:10px;line-height:1.6"><b style="color:var(--gold-hi)">Example:</b> ' + esc(s.example) + "</div>" : "") +
        "</div>";
    }
    showInfo();
    root.querySelector("#scSel").addEventListener("change", showInfo);
    root.querySelector("#scGo").addEventListener("click", () => {
      const s = scripts[+root.querySelector("#scSel").value];
      const topic = root.querySelector("#scTopic").value.trim() || ("winning at " + nicheLabel().toLowerCase());
      if (SMU.ai.hasKey()) {
        streamSheet("Your script", "Write a 60-second short-form video script about \"" + topic + "\" using the \"" + s.name +
          "\" framework with these beats:\n" + (s.structure || []).join("\n") +
          "\n\n" + brandContext() + " Format: each beat as a bold time-stamped line then the exact words to say. 90-140 spoken words total. Add one [B-ROLL] note per beat.", 1100);
      } else {
        const text = s.name + " — \"" + topic + "\"\n\n" +
          (s.structure || []).map((b) => "• " + fill(b, topic)).join("\n") +
          "\n\nWrite 90–140 words following those beats, read it out loud twice, cut 20%.";
        out.innerHTML = outCard(text, "script");
        bindSaves(out);
      }
    });
  }

  /* ================= captions ================= */
  function renderCaptions(root) {
    const caps = PB().captions || [], ctas = PB().ctas || [];
    let html = toolHead("Caption Studio", "The caption is your second hook — it runs the comment section.");
    if (!caps.length) { root.innerHTML = html + ui.empty("✍️", "Caption formulas are loading."); return; }
    html += '<div class="field"><label>Formula</label><select class="select" id="cpSel">' +
      caps.map((c, i) => '<option value="' + i + '">' + esc(c.name) + "</option>").join("") + "</select></div>" +
      '<div class="field"><label>Topic</label><input class="input" id="cpTopic" placeholder="What\'s the post about?"></div>' +
      '<div class="field"><label>CTA goal</label><select class="select" id="cpGoal">' +
      [["comment", "Comments"], ["save", "Saves"], ["share", "Shares"], ["follow", "Follows"], ["dm", "DMs"], ["link", "Link clicks"]].map(([v, l]) =>
        '<option value="' + v + '">' + l + "</option>").join("") + "</select></div>" +
      '<button class="btn btn-gold btn-block" id="cpGo">' + (SMU.ai.hasKey() ? "✦ Write my caption" : "Build my caption") + "</button>" +
      '<div id="cpOut"></div>' + aiNote();
    root.innerHTML = html;

    const out = root.querySelector("#cpOut");
    root.querySelector("#cpGo").addEventListener("click", () => {
      const c = caps[+root.querySelector("#cpSel").value];
      const topic = root.querySelector("#cpTopic").value.trim() || nicheLabel().toLowerCase();
      const goal = root.querySelector("#cpGoal").value;
      const goalCtas = ctas.filter((x) => x.goal === goal);
      const picks = sample(goalCtas.length ? goalCtas : ctas, 3);
      if (SMU.ai.hasKey()) {
        streamSheet("Your caption", "Write an Instagram/TikTok caption about \"" + topic + "\" using the \"" + c.name +
          "\" formula:\n" + (c.formula || "") + "\n\n" + brandContext() +
          " End with ONE CTA aimed at " + goal + "s. Then suggest 4 targeted hashtags on the final line. Keep it tight and human.", 700);
      } else {
        const text = c.name + " — \"" + topic + "\"\n\n" + (c.formula || "") +
          (c.example ? "\n\nExample:\n" + c.example : "");
        out.innerHTML = outCard(text, "caption") +
          ui.sectionHead("CTAs that drive " + goal + "s") +
          picks.map((x) => outCard(x.text, "caption")).join("");
        bindSaves(out);
      }
    });
  }

  /* ================= calendar ================= */
  function renderCalendar(root) {
    const cals = PB().calendars || [];
    let html = toolHead("Content Calendar", "A cadence you can hold beats a burst you abandon. Pick a template, make it yours.");
    if (!cals.length) { root.innerHTML = html + ui.empty("🗓️", "Calendar templates are loading."); return; }
    html += '<div class="field"><label>Template</label><select class="select" id="clSel">' +
      cals.map((c, i) => '<option value="' + i + '">' + esc(c.name) + " · " + esc(c.cadence || "") + "</option>").join("") + "</select></div>" +
      '<div id="clOut"></div>' +
      '<div style="display:flex;gap:9px;margin-top:14px">' +
      '<button class="btn btn-soft btn-sm" id="clCopy">' + ui.icon("copy") + " Copy week</button>" +
      (SMU.ai.hasKey() ? '<button class="btn btn-gold btn-sm" id="clAI">✦ Personalize with AI</button>' : "") +
      "</div>" + aiNote();
    root.innerHTML = html;

    const out = root.querySelector("#clOut");
    function show() {
      const c = cals[+root.querySelector("#clSel").value];
      out.innerHTML = (c.days || []).map((d) =>
        '<div class="card" style="padding:13px 16px;margin-top:9px"><div class="row">' +
        '<span class="tag gold" style="flex:0 0 52px;text-align:center">' + esc(d.day) + "</span>" +
        '<div class="grow" style="font-size:14px;line-height:1.5">' + esc(d.post) + "</div></div></div>").join("");
    }
    function weekText() {
      const c = cals[+root.querySelector("#clSel").value];
      return c.name + " (" + (c.cadence || "") + ")\n" + (c.days || []).map((d) => d.day + ": " + d.post).join("\n");
    }
    show();
    root.querySelector("#clSel").addEventListener("change", show);
    root.querySelector("#clCopy").addEventListener("click", () => ui.copy(weekText(), "Week copied — schedule it."));
    const aiBtn = root.querySelector("#clAI");
    if (aiBtn) aiBtn.addEventListener("click", () => {
      streamSheet("Your week, personalized", "Rewrite this weekly content calendar with concrete, ready-to-film post ideas for my brand — keep the same structure and days:\n\n" +
        weekText() + "\n\n" + brandContext() + " Each day: the day, the specific idea, and the hook line to open with.", 1100);
    });
  }

  /* ================= shotlist ================= */
  function renderShotlist(root) {
    const lists = PB().shotlists || [];
    let html = toolHead("Shot Lists", "Walk on set knowing every frame. That's what expensive looks like.");
    if (!lists.length) { root.innerHTML = html + ui.empty("🎬", "Shot lists are loading."); return; }
    html += '<div class="field"><label>Scenario</label><select class="select" id="slSel">' +
      lists.map((l, i) => '<option value="' + i + '">' + esc(l.name) + "</option>").join("") + "</select></div>" +
      '<div id="slOut"></div>' +
      '<button class="btn btn-ghost btn-block btn-sm" style="margin-top:14px" data-nav="studio/broll">Need b-roll ideas instead?</button>';
    root.innerHTML = html;

    const out = root.querySelector("#slOut");
    function show() {
      const l = lists[+root.querySelector("#slSel").value];
      out.innerHTML =
        (l.scenario ? '<p class="small" style="margin:2px 0 12px;line-height:1.6">' + esc(l.scenario) + "</p>" : "") +
        (l.shots || []).map((s, i) =>
          '<div class="card" style="padding:14px 16px;margin-top:9px">' +
          '<div style="display:flex;gap:11px">' +
          '<span class="mono" style="color:var(--gold);font-weight:700;flex:0 0 auto">' + String(i + 1).padStart(2, "0") + "</span>" +
          '<div class="grow"><div style="font-weight:650;font-size:14px">' + esc(s.shot) + "</div>" +
          '<div class="small" style="margin-top:4px;line-height:1.5">' + esc((s.angle || "") + " · " + (s.movement || "")) + "</div>" +
          (s.purpose ? '<div class="small" style="margin-top:4px;color:var(--gold-hi);line-height:1.45">Why: ' + esc(s.purpose) + "</div>" : "") +
          "</div></div></div>").join("");
    }
    show();
    root.querySelector("#slSel").addEventListener("change", show);
  }

  /* ================= broll ================= */
  let brollNiche = null;
  function renderBroll(root) {
    brollNiche = brollNiche || SMU.state.niche;
    const banks = PB().broll || [];
    let html = toolHead("B-Roll Bank", "Shoot 10 seconds of everything, use 2. Bank these this week.");
    if (!banks.length) { root.innerHTML = html + ui.empty("📹", "The b-roll bank is loading."); return; }
    html += chipRow("brNiche", SMU.NICHES.map((n) => [n, SMU.NICHE_LABELS[n]]), brollNiche);
    const bank = banks.find((b) => b.niche === brollNiche) || banks[0];
    const items = (bank && bank.items) || [];
    html += '<div style="margin-top:14px">' + items.map((x) =>
      '<div class="card" style="padding:12px 16px;margin-top:8px"><div class="row">' +
      '<span style="color:var(--gold)">▸</span>' +
      '<div class="grow" style="font-size:14px;line-height:1.5">' + esc(x) + "</div></div></div>").join("") + "</div>" +
      '<button class="btn btn-soft btn-block btn-sm" id="brCopy" style="margin-top:14px">' + ui.icon("copy") + " Copy the list</button>";
    root.innerHTML = html;
    root.querySelector("#brNiche").addEventListener("click", (e) => {
      const c = e.target.closest("[data-v]"); if (!c) return;
      brollNiche = c.dataset.v;
      renderBroll(root);
    });
    root.querySelector("#brCopy").addEventListener("click", () =>
      ui.copy("B-roll — " + (SMU.NICHE_LABELS[brollNiche] || brollNiche) + ":\n" + items.map((x) => "• " + x).join("\n"), "List copied — go shoot."));
  }

  /* ================= recipes ================= */
  function renderRecipes(root) {
    const recs = PB().editRecipes || [];
    let html = toolHead("Edit Recipes", "Signature edits, step by step. Master three and your feed stops looking like everyone else's.");
    if (!recs.length) { root.innerHTML = html + ui.empty("🎛️", "Edit recipes are loading."); return; }
    html += recs.map((r, i) =>
      '<div class="card tap" data-rec="' + i + '" style="margin-top:10px">' +
      '<div class="row"><div class="grow">' +
      '<div class="title">' + esc(r.name) + "</div>" +
      '<div class="sub ellip">' + esc(r.effect || "") + "</div></div>" +
      '<span class="tag gold" style="flex:0 0 auto">' + esc(r.app || "Any app") + "</span></div>" +
      '<div class="rec-steps" style="display:none;margin-top:12px"><ol style="margin:0 0 0 18px">' +
      (r.steps || []).map((s) => '<li style="margin-bottom:7px;font-size:14px;line-height:1.5;color:#e8e4d9">' + esc(s) + "</li>").join("") +
      "</ol></div></div>").join("");
    root.innerHTML = html;
    root.querySelectorAll("[data-rec]").forEach((card) => {
      card.addEventListener("click", () => {
        const st = card.querySelector(".rec-steps");
        st.style.display = st.style.display === "none" ? "block" : "none";
      });
    });
  }

  /* ================= analyzer ================= */
  const AUDIT = [
    { dim: "Hook", w: 2, q: "Does something move, change or surprise in the first second?", opts: [["Yes — instantly", 10], ["Around second 2-3", 5], ["Not really", 0]] },
    { dim: "Hook", w: 2, q: "Could a stranger say what the video promises within 3 seconds?", opts: [["Yes, it's explicit", 10], ["It's implied", 5], ["They'd have to wait", 0]] },
    { dim: "Retention", w: 2, q: "How many cuts / visual changes in the first 10 seconds?", opts: [["5 or more", 10], ["2–4", 6], ["0–1", 0]] },
    { dim: "Retention", w: 2, q: "Is there an open loop (a promised payoff) held until the end?", opts: [["Yes, and it pays off", 10], ["Sort of", 5], ["No", 0]] },
    { dim: "Story", w: 1, q: "Does the video follow a structure (setup → tension → payoff)?", opts: [["Clearly", 10], ["Loosely", 5], ["It rambles", 0]] },
    { dim: "Editing", w: 1, q: "Dead air, ums and pauses — are they cut?", opts: [["Ruthlessly", 10], ["Mostly", 6], ["There's air", 0]] },
    { dim: "Visuals", w: 1, q: "Lighting and framing — how do they read?", opts: [["Clean and intentional", 10], ["Acceptable", 5], ["Dark / cluttered", 0]] },
    { dim: "Audio", w: 1, q: "Voice level, music bed and clarity?", opts: [["Voice clear, music under", 10], ["Usable", 5], ["Muddy or clipping", 0]] },
    { dim: "Captions", w: 1, q: "On-screen captions / text?", opts: [["Styled and synced", 10], ["Auto-captions", 6], ["None", 0]] },
    { dim: "CTA", w: 1, q: "Is there exactly ONE clear call to action?", opts: [["One, matched to my goal", 10], ["Several competing", 4], ["None", 0]] },
    { dim: "Packaging", w: 1, q: "Cover / thumbnail and first frame — chosen deliberately?", opts: [["Designed", 10], ["Picked from frames", 5], ["Whatever it defaulted to", 0]] },
    { dim: "Pacing", w: 1, q: "Watch it back: does any moment make YOU reach to skip?", opts: [["Never", 10], ["Once", 5], ["More than once", 0]] },
  ];
  const FIXES = {
    Hook: "Rebuild the open: start mid-action or mid-sentence, state the payoff in the first line, and make something move in frame within second one. Steal five opens from Hook Lab and test them.",
    Retention: "Add a cut, punch-in or angle change every 2–3 seconds for the first 10, and open a loop early (\"wait for the third one\") that only closes at the end.",
    Story: "Force the structure: one line of setup, one escalation, one payoff. If a beat doesn't serve the promise in the hook, cut the beat.",
    Editing: "Do a silence pass: delete every breath, um and gap. Then a pacing pass: anything that doesn't add, goes. Pace is the difference between amateur and pro.",
    Visuals: "Face a window or add one soft light at 45°. Clear the background or step further from it. Frame with headroom and eyes on the top third.",
    Audio: "Voice first: record closer to the mic, duck the music -18dB under speech, and add one sound accent on the reveal. Viewers forgive soft visuals, never bad audio.",
    Captions: "Add styled captions synced to speech — 70%+ of feed viewing is muted. Two lines max on screen, keywords emphasized.",
    CTA: "Pick ONE action matched to your goal (comment, save, share, follow, DM) and ask for it plainly in the last 3 seconds. Competing CTAs cancel each other.",
    Packaging: "Design the cover before you post: readable at thumbnail size, 4 words max, one face or one object, colors that pop against the feed.",
    Pacing: "Watch with your thumb on the screen. The moment you feel the pull to skip, cut 20% around it. Repeat until the pull is gone.",
  };

  function renderAnalyzer(root) {
    let html = toolHead("Content Analyzer", "Answer honestly while re-watching your video. Twelve questions, a score out of 100, and exactly what to fix first.");
    const last = (SMU.state.analyses || [])[0];
    if (last) {
      html += '<div class="card" style="padding:13px 16px;margin-bottom:6px"><div class="row">' +
        '<div class="grow"><div class="small">Last analysis</div>' +
        '<div style="font-weight:700;font-size:16px;margin-top:2px">' + last.score + '/100 · <span style="color:var(--gold-hi)">' + esc(last.verdict) + "</span></div></div></div></div>";
    }
    html += '<div id="anBody"></div>';
    root.innerHTML = html;
    const body = root.querySelector("#anBody");

    const answers = new Array(AUDIT.length).fill(null);
    let idx = 0;

    function step() {
      if (idx >= AUDIT.length) return results();
      const q = AUDIT[idx];
      body.innerHTML =
        '<div style="margin-top:8px">' + ui.bar(Math.round((idx / AUDIT.length) * 100), true) + "</div>" +
        '<div class="small" style="margin:10px 0 6px">' + (idx + 1) + " of " + AUDIT.length + ' · <span class="tag gold" style="font-size:9.5px">' + esc(q.dim) + "</span></div>" +
        '<div class="quiz-q">' + esc(q.q) + "</div>" +
        q.opts.map(([label], j) =>
          '<button class="quiz-opt" data-j="' + j + '"><span class="abc">' + "ABC"[j] + "</span><span>" + esc(label) + "</span></button>").join("") +
        (idx > 0 ? '<button class="btn btn-ghost btn-sm" id="anBack" style="margin-top:6px">Back</button>' : "");
      body.querySelectorAll(".quiz-opt").forEach((b) => {
        b.addEventListener("click", () => { answers[idx] = +b.dataset.j; idx++; step(); });
      });
      const back = body.querySelector("#anBack");
      if (back) back.addEventListener("click", () => { idx--; step(); });
    }

    function results() {
      /* per-dimension scores */
      const dims = {};
      AUDIT.forEach((q, i) => {
        const pts = q.opts[answers[i]][1];
        if (!dims[q.dim]) dims[q.dim] = { total: 0, n: 0, w: q.w };
        dims[q.dim].total += pts; dims[q.dim].n++;
      });
      let weighted = 0, weightSum = 0;
      Object.keys(dims).forEach((d) => {
        dims[d].avg = dims[d].total / dims[d].n;
        weighted += dims[d].avg * dims[d].w;
        weightSum += 10 * dims[d].w;
      });
      const score = Math.round((weighted / weightSum) * 100);
      const verdict = score >= 85 ? "Elite" : score >= 70 ? "Strong — sharpen the edges" : score >= 50 ? "Solid but leaking viewers" : "Needs surgery";
      const sorted = Object.keys(dims).sort((a, b) => (dims[a].avg * 1) - (dims[b].avg * 1));
      const worst = sorted.filter((d) => dims[d].avg < 8).slice(0, 3);

      /* save */
      SMU.state.analyses = SMU.state.analyses || [];
      SMU.state.analyses.unshift({
        at: Date.now(), score, verdict,
        breakdown: Object.keys(dims).map((d) => ({ dim: d, score: Math.round(dims[d].avg * 10) / 10 })),
      });
      SMU.state.analyses = SMU.state.analyses.slice(0, 10);
      SMU.save();
      SMU.addXP(25, "analytics");

      const hooks = sample((PB().hooks || []).filter((h) => (h.niches || []).indexOf(SMU.state.niche) >= 0), 3);
      const hookPool = hooks.length ? hooks : sample(PB().hooks || [], 3);

      body.innerHTML =
        '<div style="text-align:center;padding:16px 0 8px">' +
        '<div class="score-big">' + score + '<span style="font-size:22px">/100</span></div>' +
        '<div style="font-family:var(--serif);font-weight:600;font-size:18px;margin-top:8px">' + esc(verdict) + "</div>" +
        '<div class="small" style="margin-top:4px">+25 XP for auditing like a pro</div></div>' +
        '<div class="card" style="padding:16px">' +
        sorted.map((d) =>
          '<div style="display:flex;align-items:center;gap:10px;margin:8px 0">' +
          '<span class="small" style="flex:0 0 82px;font-weight:650">' + esc(d) + "</span>" +
          '<div style="flex:1">' + ui.bar(Math.round(dims[d].avg * 10), true) + "</div>" +
          '<span class="small mono" style="flex:0 0 auto">' + Math.round(dims[d].avg * 10) + "</span></div>").join("") +
        "</div>" +
        (worst.length
          ? '<div class="callout"><div class="c-k">Fix these first — in order</div><ol style="margin:0 0 0 18px">' +
            worst.map((d) => '<li style="margin-bottom:9px;color:#efeadd"><b>' + esc(d) + ":</b> " + esc(FIXES[d] || "") + "</li>").join("") + "</ol></div>"
          : '<div class="callout"><div class="c-k">Verdict</div><div style="color:#efeadd;font-size:14px;line-height:1.6">Nothing is bleeding. Now it\'s a volume game — same standard, more reps.</div></div>') +
        (hookPool.length && dims.Hook && dims.Hook.avg < 8
          ? ui.sectionHead("Stronger opens to test") + hookPool.map((h) => outCard(fill(h.t), "hook")).join("")
          : "") +
        '<div style="display:flex;gap:9px;margin-top:16px">' +
        '<button class="btn btn-ghost btn-sm" id="anAgain">Analyze another</button>' +
        (SMU.ai.hasKey() ? '<button class="btn btn-gold btn-sm" id="anAI">✦ AI deep critique</button>' : "") +
        "</div>" +
        (SMU.ai.hasKey() ? "" :
          '<p class="small" style="margin-top:14px;line-height:1.55"><span style="color:var(--gold);cursor:pointer" data-nav="profile">Add a Claude API key</span> for a scene-by-scene AI critique of your script.</p>');

      bindSaves(body);
      body.querySelector("#anAgain").addEventListener("click", () => renderAnalyzer(root));
      const aiBtn = body.querySelector("#anAI");
      if (aiBtn) aiBtn.addEventListener("click", () => {
        const s = SMU.sheet("AI deep critique",
          '<div class="field"><label>Paste your script, voiceover or a beat-by-beat description</label>' +
          '<textarea class="input" id="dcIn" rows="6" placeholder="0-3s: I open on… 3-10s: …"></textarea></div>' +
          '<button class="btn btn-gold btn-block" id="dcGo">Critique it</button><div id="dcOut" style="margin-top:14px"></div>');
        s.el.querySelector("#dcGo").addEventListener("click", () => {
          const txt = s.el.querySelector("#dcIn").value.trim();
          if (!txt) return;
          const outEl = s.el.querySelector("#dcOut");
          outEl.innerHTML = '<div class="msg ai thinking" style="max-width:none"><i></i><i></i><i></i></div>';
          SMU.ai.ask("Critique this short-form video like a world-class retention editor. My self-audit scored " + score +
            "/100, weakest areas: " + worst.join(", ") + ". " + brandContext() +
            "\n\nTHE VIDEO:\n" + txt +
            "\n\nGive: the strongest beat, the 3 biggest leaks with timestamps, a rewritten hook line, and one structural change that would lift retention most. Be surgical.", {
            maxTokens: 1200,
            onDelta: (d, full) => { outEl.innerHTML = '<div class="msg ai" style="max-width:none">' + SMU.md(full) + "</div>"; },
          }).catch((e) => { outEl.innerHTML = ui.empty("📡", "The line dropped.", e.message); });
        });
      });
    }

    step();
  }

  /* ================= thumbnail ================= */
  const THUMB_CHECKS = [
    "High contrast — subject pops from the background",
    "Three elements max (face / object / text)",
    "A face with a real expression (or one hero object)",
    "Text is 4 words or fewer",
    "Colors stand out against the platform's UI (not red/white/black only)",
    "It opens a curiosity gap the title doesn't close",
    "Still legible scaled down to 120px",
    "On-brand: same style as your last covers",
  ];
  function renderThumbnail(root) {
    let html = toolHead("Thumbnail Critique", "Packaging decides whether great content gets a chance. Audit it like a stranger.");
    html +=
      '<div class="field"><label>Your thumbnail / cover</label>' +
      '<input type="file" id="thFile" accept="image/*" class="input" style="padding:10px"></div>' +
      '<div id="thPrev"></div><div id="thOut"></div>';
    root.innerHTML = html;

    const prev = root.querySelector("#thPrev"), out = root.querySelector("#thOut");
    let imgData = null, imgType = null;

    root.querySelector("#thFile").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const url = String(rd.result);
        imgType = f.type || "image/png";
        imgData = url.split(",")[1] || null;
        prev.innerHTML = '<div class="card" style="padding:10px;margin-bottom:6px"><img src="' + url + '" style="width:100%;border-radius:12px;display:block"></div>';
        showActions();
      };
      rd.readAsDataURL(f);
    });

    function showActions() {
      if (SMU.ai.hasKey() && imgData) {
        out.innerHTML = '<button class="btn btn-gold btn-block" id="thAI">✦ Critique this thumbnail</button><div id="thAIOut" style="margin-top:14px"></div>';
        out.querySelector("#thAI").addEventListener("click", () => {
          const o = out.querySelector("#thAIOut");
          o.innerHTML = '<div class="msg ai thinking" style="max-width:none"><i></i><i></i><i></i></div>';
          SMU.ai.askWithImage(
            "Critique this thumbnail/cover as a CTR expert. Score it /10. Then: what the eye hits first, what's working, the 3 highest-impact fixes (be specific: contrast, text, faces, color vs platform UI, curiosity gap, legibility at small size), and one alternative concept. " + brandContext(),
            imgType, imgData, {
              maxTokens: 900,
              onDelta: (d, full) => { o.innerHTML = '<div class="msg ai" style="max-width:none">' + SMU.md(full) + "</div>"; },
            }).catch((e) => { o.innerHTML = ui.empty("📡", "The line dropped.", e.message); });
        });
      } else {
        checklist();
      }
    }

    function checklist() {
      out.innerHTML = ui.sectionHead("The 8-point packaging audit") +
        THUMB_CHECKS.map((c, i) =>
          '<div class="card tap" data-chk="' + i + '" style="padding:13px 16px;margin-top:8px"><div class="row">' +
          '<span class="abc" style="flex:0 0 26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);font-family:var(--mono);font-size:12px;color:var(--muted)">○</span>' +
          '<div class="grow" style="font-size:14px;line-height:1.5">' + esc(c) + "</div></div></div>").join("") +
        '<div class="card card-hero" style="margin-top:14px;text-align:center;padding:18px" id="thScore">' +
        '<div class="small">Tap each check that\'s true</div></div>' +
        (SMU.ai.hasKey() ? "" :
          '<p class="small" style="margin-top:12px;line-height:1.55"><span style="color:var(--gold);cursor:pointer" data-nav="profile">Add a Claude API key</span> and I\'ll look at the image itself.</p>');
      const on = new Set();
      out.querySelectorAll("[data-chk]").forEach((card) => {
        card.addEventListener("click", () => {
          const i = +card.dataset.chk, mark = card.querySelector(".abc");
          if (on.has(i)) { on.delete(i); mark.textContent = "○"; mark.style.background = "rgba(255,255,255,.07)"; mark.style.color = "var(--muted)"; }
          else { on.add(i); mark.textContent = "✓"; mark.style.background = "var(--gold)"; mark.style.color = "#231708"; }
          const n = on.size;
          out.querySelector("#thScore").innerHTML =
            '<div class="score-big" style="font-size:38px">' + n + "/8</div>" +
            '<div class="small" style="margin-top:6px">' +
            (n >= 7 ? "Ship it — this packaging competes." : n >= 5 ? "Close. Fix the unchecked items before posting." : "Redesign before you post — packaging is half the video's fate.") +
            "</div>";
        });
      });
    }
    checklist();
  }

  /* ================= brand builder ================= */
  const ADJECTIVES = ["Refined", "Bold", "Warm", "Direct", "Playful", "Premium", "Raw", "Minimal", "Cinematic", "Rebellious", "Trustworthy", "Ambitious"];
  const PILLARS = {
    luxury: ["Behind the craft", "The lifestyle", "Taste & curation", "Client stories", "The numbers behind luxury"],
    cars: ["The machines", "Ownership real talk", "Builds & mods", "Industry inside", "Drives & reviews"],
    realestate: ["Property tours", "Market breakdowns", "Deal stories", "Buyer education", "Behind the hustle"],
    fitness: ["Training", "Nutrition simplified", "Transformations", "Mindset", "Myth-busting"],
    business: ["Lessons from the trenches", "Frameworks", "Numbers & proof", "Behind the build", "Industry takes"],
    sales: ["Objection clinics", "Live breakdowns", "Mindset & reps", "Scripts that work", "Wins & losses"],
    lifestyle: ["A day designed", "Spaces & things", "Habits", "Places", "Honest reflections"],
    fashion: ["Fits & styling", "The craft", "Trends decoded", "Wardrobe systems", "Taste education"],
    food: ["Recipes", "Technique", "Behind the kitchen", "Reviews & finds", "Food stories"],
    travel: ["Destinations", "How I travel", "Hidden gems", "Travel systems", "The real costs"],
    creator: ["Behind the content", "Growth breakdowns", "Tools & workflow", "Monetization", "Creator life"],
  };
  const VOICES = [["refined", "Refined — measured, precise, quietly confident"], ["bold", "Bold — punchy, provocative, certain"], ["warm", "Warm — human, encouraging, close"], ["direct", "Direct — no fluff, straight talk"]];

  function renderBrand(root) {
    const existing = SMU.state.brand;
    if (existing && !renderBrand._editing) return brandCard(root, existing);
    const b = renderBrand._draft || (renderBrand._draft = {
      name: SMU.state.name || "", oneliner: "", adjectives: [], audience: "", dream: "", pain: "",
      niche: SMU.state.niche, knownFor: "", pillars: [], voice: "refined", doWords: "", dontWords: "",
    });
    const step = renderBrand._step || 1;

    let html = toolHead("Brand Builder", "Five steps. At the end you'll have the one-page brand that every tool and the mentor build from.");
    html += '<div class="ladder">' + [1, 2, 3, 4, 5].map((i) => "<i" + (i <= step ? ' class="on"' : "") + "></i>").join("") + "</div>";
    html += '<div class="small" style="margin:8px 0 16px">Step ' + step + " of 5 · " +
      ["Identity", "Audience", "Positioning", "Content pillars", "Voice"][step - 1] + "</div>";

    if (step === 1) {
      html += '<div class="field"><label>Brand / creator name</label><input class="input" id="bbName" value="' + esc(b.name) + '" placeholder="Your name or brand"></div>' +
        '<div class="field"><label>One-liner — what you do, for whom</label><input class="input" id="bbOne" value="' + esc(b.oneliner) + '" placeholder="I help X get Y through Z"></div>' +
        '<div class="field"><label>Pick 3 adjectives</label><div class="chips" id="bbAdj">' +
        ADJECTIVES.map((a) => '<button class="chip' + (b.adjectives.indexOf(a) >= 0 ? " on" : "") + '" data-a="' + a + '">' + a + "</button>").join("") +
        "</div></div>";
    } else if (step === 2) {
      html += '<div class="field"><label>Who is it for? Be narrow.</label><input class="input" id="bbWho" value="' + esc(b.audience) + '" placeholder="e.g. first-year real estate agents in big cities"></div>' +
        '<div class="field"><label>Their dream outcome</label><input class="input" id="bbDream" value="' + esc(b.dream) + '" placeholder="What do they actually want?"></div>' +
        '<div class="field"><label>Their biggest pain</label><input class="input" id="bbPain" value="' + esc(b.pain) + '" placeholder="What keeps them stuck?"></div>';
    } else if (step === 3) {
      html += '<div class="field"><label>Niche</label><select class="select" id="bbNiche">' +
        SMU.NICHES.map((n) => '<option value="' + n + '"' + (n === b.niche ? " selected" : "") + ">" + esc(SMU.NICHE_LABELS[n]) + "</option>").join("") + "</select></div>" +
        '<div class="field"><label>The ONE thing you want to be known for</label><input class="input" id="bbKnown" value="' + esc(b.knownFor) + '" placeholder="Famous for one thing beats known for nothing"></div>';
    } else if (step === 4) {
      const sugg = PILLARS[b.niche] || PILLARS.creator;
      html += '<div class="field"><label>Pick 3–5 content pillars</label><div class="chips" id="bbPil">' +
        sugg.map((p) => '<button class="chip' + (b.pillars.indexOf(p) >= 0 ? " on" : "") + '" data-p="' + esc(p) + '">' + esc(p) + "</button>").join("") +
        "</div></div>" +
        '<div class="field"><label>Add your own (optional)</label><div style="display:flex;gap:8px">' +
        '<input class="input" id="bbCustomPil" placeholder="Custom pillar" style="flex:1">' +
        '<button class="btn btn-soft btn-sm" id="bbAddPil">Add</button></div></div>' +
        (b.pillars.length ? '<div class="small" style="margin-top:6px">Selected: ' + b.pillars.map(esc).join(" · ") + "</div>" : "");
    } else {
      html += '<div class="field"><label>Voice</label><div class="seg" id="bbVoice" style="flex-wrap:wrap">' +
        VOICES.map(([v, l]) => '<button data-v="' + v + '" class="' + (v === b.voice ? "on" : "") + '" style="flex:1 1 45%">' + esc(l.split(" — ")[0]) + "</button>").join("") +
        "</div><div class='small' style='margin-top:8px'>" + esc((VOICES.find((x) => x[0] === b.voice) || VOICES[0])[1]) + "</div></div>" +
        '<div class="field"><label>Words you\'d use</label><input class="input" id="bbDo" value="' + esc(b.doWords) + '" placeholder="e.g. craft, momentum, reps"></div>' +
        '<div class="field"><label>Words you\'d never use</label><input class="input" id="bbDont" value="' + esc(b.dontWords) + '" placeholder="e.g. hack, grind, secret"></div>';
    }

    html += '<div style="display:flex;gap:9px;margin-top:18px">' +
      (step > 1 ? '<button class="btn btn-ghost" id="bbBack">Back</button>' : "") +
      '<button class="btn btn-gold" id="bbNext" style="flex:1">' + (step === 5 ? "Build my brand" : "Continue") + "</button></div>";

    root.innerHTML = html;

    /* capture current inputs into draft */
    function capture() {
      const g = (id) => { const el = root.querySelector(id); return el ? el.value.trim() : null; };
      if (step === 1) { b.name = g("#bbName") ?? b.name; b.oneliner = g("#bbOne") ?? b.oneliner; }
      if (step === 2) { b.audience = g("#bbWho") ?? b.audience; b.dream = g("#bbDream") ?? b.dream; b.pain = g("#bbPain") ?? b.pain; }
      if (step === 3) { const n = root.querySelector("#bbNiche"); if (n) b.niche = n.value; b.knownFor = g("#bbKnown") ?? b.knownFor; }
      if (step === 5) { b.doWords = g("#bbDo") ?? b.doWords; b.dontWords = g("#bbDont") ?? b.dontWords; }
    }

    const adj = root.querySelector("#bbAdj");
    if (adj) adj.addEventListener("click", (e) => {
      const c = e.target.closest("[data-a]"); if (!c) return;
      const a = c.dataset.a, i = b.adjectives.indexOf(a);
      if (i >= 0) b.adjectives.splice(i, 1);
      else if (b.adjectives.length < 3) b.adjectives.push(a);
      else { SMU.toast("Three max — trade one out."); return; }
      capture(); renderBrand(root);
    });
    const pil = root.querySelector("#bbPil");
    if (pil) pil.addEventListener("click", (e) => {
      const c = e.target.closest("[data-p]"); if (!c) return;
      const p = c.dataset.p, i = b.pillars.indexOf(p);
      if (i >= 0) b.pillars.splice(i, 1);
      else if (b.pillars.length < 5) b.pillars.push(p);
      else { SMU.toast("Five max."); return; }
      renderBrand(root);
    });
    const addPil = root.querySelector("#bbAddPil");
    if (addPil) addPil.addEventListener("click", () => {
      const v = root.querySelector("#bbCustomPil").value.trim();
      if (v && b.pillars.length < 5 && b.pillars.indexOf(v) < 0) { b.pillars.push(v); renderBrand(root); }
    });
    const voiceSeg = root.querySelector("#bbVoice");
    if (voiceSeg) voiceSeg.addEventListener("click", (e) => {
      const c = e.target.closest("[data-v]"); if (!c) return;
      capture(); b.voice = c.dataset.v; renderBrand(root);
    });

    const backB = root.querySelector("#bbBack");
    if (backB) backB.addEventListener("click", () => { capture(); renderBrand._step = step - 1; renderBrand(root); });
    root.querySelector("#bbNext").addEventListener("click", () => {
      capture();
      if (step === 1 && (!b.name || b.adjectives.length < 3)) { SMU.toast("Name + 3 adjectives to continue."); return; }
      if (step === 2 && !b.audience) { SMU.toast("Name your audience — narrow wins."); return; }
      if (step === 3 && !b.knownFor) { SMU.toast("Commit to the one thing."); return; }
      if (step === 4 && b.pillars.length < 3) { SMU.toast("Pick at least 3 pillars."); return; }
      if (step < 5) { renderBrand._step = step + 1; renderBrand(root); return; }
      SMU.state.brand = {
        name: b.name, oneliner: b.oneliner, adjectives: b.adjectives.slice(),
        audience: b.audience, dream: b.dream, pain: b.pain,
        niche: b.niche, knownFor: b.knownFor, pillars: b.pillars.slice(),
        voice: b.voice, doWords: b.doWords, dontWords: b.dontWords, at: Date.now(),
      };
      SMU.state.niche = b.niche;
      SMU.save();
      SMU.addXP(75, "branding");
      renderBrand._editing = false;
      renderBrand._step = 1;
      renderBrand._draft = null;
      SMU.toast("Brand locked. Every tool just got personal.");
      brandCard(root, SMU.state.brand);
    });
  }

  function brandCard(root, b) {
    let html = toolHead("Your brand", "This is the one-pager the whole studio builds from.");
    html +=
      '<div class="card card-hero" style="padding:22px">' +
      '<div class="kicker">' + esc((SMU.NICHE_LABELS[b.niche] || b.niche) + " · " + b.voice) + "</div>" +
      '<div style="font-family:var(--serif);font-weight:600;font-size:25px;line-height:1.15">' + esc(b.name) + "</div>" +
      (b.oneliner ? '<div style="margin-top:8px;font-size:15px;line-height:1.55;color:var(--gold-hi)">' + esc(b.oneliner) + "</div>" : "") +
      '<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">' +
      (b.adjectives || []).map((a) => '<span class="tag gold">' + esc(a) + "</span>").join("") + "</div>" +
      '<div class="divider"></div>' +
      '<div class="small" style="line-height:1.7">' +
      "<b style='color:var(--gold-hi)'>For:</b> " + esc(b.audience || "—") + "<br>" +
      "<b style='color:var(--gold-hi)'>They want:</b> " + esc(b.dream || "—") + " · <b style='color:var(--gold-hi)'>stuck on:</b> " + esc(b.pain || "—") + "<br>" +
      "<b style='color:var(--gold-hi)'>Known for:</b> " + esc(b.knownFor || "—") + "<br>" +
      "<b style='color:var(--gold-hi)'>Pillars:</b> " + esc((b.pillars || []).join(" · ")) + "<br>" +
      (b.doWords ? "<b style='color:var(--gold-hi)'>Say:</b> " + esc(b.doWords) + " · " : "") +
      (b.dontWords ? "<b style='color:var(--gold-hi)'>Never:</b> " + esc(b.dontWords) : "") +
      "</div></div>" +
      '<div style="display:flex;gap:9px;margin-top:14px">' +
      '<button class="btn btn-ghost btn-sm" id="bcEdit">Edit</button>' +
      '<button class="btn btn-soft btn-sm" id="bcCopy">' + ui.icon("copy") + " Copy</button>" +
      (SMU.ai.hasKey() ? '<button class="btn btn-gold btn-sm" id="bcAI" style="margin-left:auto">✦ AI polish</button>' : "") +
      "</div>";
    root.innerHTML = html;

    root.querySelector("#bcEdit").addEventListener("click", () => {
      renderBrand._editing = true;
      renderBrand._step = 1;
      renderBrand._draft = Object.assign({}, b, { adjectives: (b.adjectives || []).slice(), pillars: (b.pillars || []).slice() });
      renderBrand(root);
    });
    root.querySelector("#bcCopy").addEventListener("click", () => {
      ui.copy(b.name + " — " + b.oneliner + "\nAdjectives: " + (b.adjectives || []).join(", ") +
        "\nAudience: " + b.audience + "\nKnown for: " + b.knownFor +
        "\nPillars: " + (b.pillars || []).join(", ") + "\nVoice: " + b.voice, "Brand copied.");
    });
    const aiBtn = root.querySelector("#bcAI");
    if (aiBtn) aiBtn.addEventListener("click", () => {
      streamSheet("Brand polish", "Here is my brand one-pager:\n" + brandContext() +
        "\n\nDo three things: 1) Rewrite my positioning one-liner 3 ways (sharper, each under 15 words). 2) For each of my pillars, give one specific angle I should own. 3) Name the single riskiest weakness in this brand and how to fix it this month.", 1100);
    });
  }

  /* ================= register ================= */
  const ROUTES = {
    hooks: renderHooks, ideas: renderIdeas, scripts: renderScripts, captions: renderCaptions,
    calendar: renderCalendar, shotlist: renderShotlist, broll: renderBroll, recipes: renderRecipes,
    analyzer: renderAnalyzer, thumbnail: renderThumbnail, brand: renderBrand,
  };

  SMU.views.studio = {
    title: "Studio",
    render(root, params) {
      params = params || (SMU.route && SMU.route.params) || [];
      const tool = params[0];
      if (tool && ROUTES[tool]) return ROUTES[tool](root);
      return renderHub(root);
    },
  };
})();
