/* ============================================================
   Coach — the AI mentor. Streaming Claude chat with a playbook-
   powered offline answer engine, skill snapshot sheet, and a
   7-day improvement plan. Routes: coach, coach/plan.
   ============================================================ */

(function () {
  const esc = (s) => SMU.esc(s);

  /* ---------- small utils ---------- */
  function PB() { return (window.SMU_DATA && SMU_DATA.playbooks) || {}; }
  function TR() { return (window.SMU_DATA && SMU_DATA.training) || {}; }
  function nicheName() { return SMU.NICHE_LABELS[SMU.state.niche] || SMU.state.niche || "your niche"; }
  function goalPhrase() {
    return { grow: "grow your audience", brand: "build your brand", monetize: "monetize your audience" }[SMU.state.goal] || "level up";
  }
  function weakLabels(n) { return SMU.weakestSkills(n || 2).map((k) => SMU.SKILL_LABELS[k] || k); }

  function sample(arr, n) {
    const a = (arr || []).slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a.slice(0, n);
  }

  function fill(t) {
    const low = nicheName().toLowerCase();
    return String(t || "")
      .replace(/\{topic\}/g, low)
      .replace(/\{niche\}/g, low)
      .replace(/\{goal\}/g, goalPhrase())
      .replace(/\{number\}/g, "3")
      .replace(/\{timeframe\}/g, "30 days");
  }

  function trimLog(log) { if (log.length > 60) log.splice(0, log.length - 60); }

  function scrollBottom() { window.scrollTo({ top: document.body.scrollHeight }); }

  /* First not-done lessons targeting the weakest skills, padded with next-up lessons. */
  function recLessons(n) {
    n = n || 2;
    const all = SMU.allLessons();
    const out = [], seen = {};
    SMU.weakestSkills(2).forEach((k) => {
      const hit = all.find((x) => x.lesson.skill === k && !SMU.lessonDone(x.lesson.id) && !seen[x.lesson.id]);
      if (hit && out.length < n) { seen[hit.lesson.id] = 1; out.push(hit); }
    });
    for (let i = 0; i < all.length && out.length < n; i++) {
      const x = all[i];
      if (!SMU.lessonDone(x.lesson.id) && !seen[x.lesson.id]) { seen[x.lesson.id] = 1; out.push(x); }
    }
    return out;
  }

  /* Recent turns -> Claude messages. Merges consecutive same-role turns
     (an errored reply leaves two user turns back-to-back) and ensures
     the history starts on a user turn. */
  function buildHistory(log) {
    const recent = log.slice(-12).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.text || "") }));
    while (recent.length && recent[0].role !== "user") recent.shift();
    const out = [];
    recent.forEach((m) => {
      const last = out[out.length - 1];
      if (last && last.role === m.role) last.content += "\n\n" + m.content;
      else out.push(m);
    });
    return out.length ? out : [{ role: "user", content: "Hello coach." }];
  }

  /* ============================================================
     Offline mentor — "Ask the playbook".
     Keyword-routes the question to curated answers assembled from
     SMU_DATA.playbooks / training, with built-in fallbacks so it is
     genuinely useful even before content files load.
     ============================================================ */
  const UNLOCK = "\n\nYou're getting the playbook right now. The full conversational mentor — memory, follow-ups, custom rewrites — unlocks with a Claude API key in Settings.";

  function playbookAnswer(q) {
    const t = " " + String(q || "").toLowerCase() + " ";
    const has = function () {
      for (let i = 0; i < arguments.length; i++) if (t.indexOf(arguments[i]) >= 0) return true;
      return false;
    };
    const nl = nicheName(), low = nl.toLowerCase();
    const wl = weakLabels(2);
    const recs = recLessons(2);
    const lessonTitle = recs.length ? recs[0].lesson.title : "";
    let body;

    if (has("plan", "calendar", "schedule", "7 day", "7-day", "week")) {
      body = buildLocalPlan();

    } else if (has("hook")) {
      const hs = PB().hooks || [];
      const mine = hs.filter((h) => (h.niches || []).indexOf(SMU.state.niche) >= 0);
      const pool = mine.length >= 5 ? mine : hs;
      const five = pool.length >= 5
        ? sample(pool, 5).map((h) => fill(h.t))
        : [
            "I wasn't going to share this, but here's how I actually " + goalPhrase() + " in " + low + "…",
            "Nobody in " + low + " talks about this — and it's costing you views.",
            "POV: you finally understand why your " + low + " content isn't growing.",
            "3 " + low + " mistakes I'd never make again.",
            "If I had to start my " + low + " page from zero, this is exactly what I'd do.",
          ];
      body = "Five hooks tuned for " + nl + " — say them inside the first second, cut all throat-clearing:\n\n" +
        five.map((h, i) => (i + 1) + ". " + h).join("\n") +
        "\n\nDelivery rule: a hook is a promise. The rest of the video pays it off fast, or retention dies.";

    } else if (has("caption", "hashtag")) {
      const cs = PB().captions || [];
      if (cs.length) {
        const c = sample(cs, 1)[0];
        body = "Use the **" + c.name + "** caption formula:\n\n" + c.formula +
          (c.example ? "\n\nExample:\n\n" + c.example : "") +
          "\n\nThen 3-5 targeted hashtags. Never a wall.";
      } else {
        body = "The caption formula that pulls people in:\n\n" +
          "- **Line 1:** re-hook — restate the video's promise in new words (it's what shows before \"more\")\n" +
          "- **Lines 2-4:** one insight the video didn't say — reward the readers\n" +
          "- **Last line:** one CTA, matched to your goal\n\n" +
          "Then 3-5 targeted hashtags, never a wall. The caption's job is retention on the second viewing surface.";
      }

    } else if (has(" cta", "call to action", "call-to-action")) {
      const cts = PB().ctas || [];
      if (cts.length >= 4) {
        body = "CTAs that convert — pick ONE per post, matched to your goal:\n\n" +
          sample(cts, 5).map((c) => "- \"" + c.text + "\"" + (c.goal ? " — drives " + c.goal + "s" : "")).join("\n") +
          "\n\nGrowth wants shares, trust wants comments, monetization wants DMs.";
      } else {
        body = "CTAs that actually convert — pick ONE per post:\n\n" +
          "- \"Comment [word] and I'll send you the exact template\" — comment bait with a real payoff\n" +
          "- \"Save this — you'll need it the next time you post\" — saves tell the algorithm it mattered\n" +
          "- \"Follow for part 2 tomorrow\" — only if part 2 actually drops tomorrow\n" +
          "- \"Send this to the friend who needs it\" — shares are the strongest growth signal\n\n" +
          "Growth wants shares, trust wants comments, monetization wants DMs.";
      }

    } else if (has("idea", "what should i post", "what to post", "run out of content")) {
      const mine = (PB().ideas || []).filter((x) => x.niche === SMU.state.niche);
      const pool = mine.length >= 5 ? mine : (PB().ideas || []);
      if (pool.length >= 5) {
        body = "Five ideas you could film today:\n\n" +
          sample(pool, 5).map((x, i) => (i + 1) + ". " + x.idea + (x.format ? " (" + x.format + ")" : "")).join("\n") +
          "\n\nPick the one you can shoot within the hour. Speed of execution is a content skill.";
      } else {
        body = "Five ideas you could film today in " + nl + ":\n\n" +
          "1. The 3 biggest myths in " + low + " — bust them in 30 seconds\n" +
          "2. \"What I'd do differently if I started over\" — story and credibility in one\n" +
          "3. Before/after with the process compressed to 15 seconds\n" +
          "4. Answer the question you get asked most — one question, one video\n" +
          "5. A day in the life, but only the moments that show craft\n\n" +
          "Pick the one you can shoot within the hour. Speed of execution is a content skill.";
      }

    } else if (has("script", "talking head", "voiceover", "what do i say")) {
      const scr = PB().scripts || [];
      if (scr.length) {
        const s = sample(scr, 1)[0];
        body = "**" + s.name + "**" + (s.bestFor ? " — best for " + s.bestFor : "") + ":\n\n" +
          (s.structure || []).map((x) => "- " + x).join("\n") +
          (s.example ? "\n\nExample:\n\n" + s.example : "");
      } else {
        body = "Use **Problem → Agitate → Reveal** — the highest-percentage short-form script:\n\n" +
          "- 0-3s: Name the pain — \"Your " + low + " content isn't bad, it's skippable.\"\n" +
          "- 3-10s: Agitate — what it's costing them, fast\n" +
          "- 10-35s: Reveal the fix in 2-3 concrete steps\n" +
          "- Last 5s: One CTA — comment, save or follow, never all three\n\n" +
          "Write it in 60-90 words, read it out loud twice, then cut 20%.";
      }

    } else if (has("3 second", "three second", "first second", " die ", " dies ", " dying", " died ", "drop off", "drop-off", "retention", "watch time", "fall off", "stop watching", "swipe away")) {
      body = "Views dying at 3 seconds means one thing: the open isn't earning the next second. Three usual suspects:\n\n" +
        "1. **The hook promises nothing.** \"Hey guys, so today…\" is a skip. Open with the payoff — \"This mistake cost me 40k views\" beats any greeting.\n" +
        "2. **Visual stasis.** If the frame at second 3 looks like second 0, thumbs move on. Cut, punch in, or change angle inside the first 2 seconds.\n" +
        "3. **You start before the video does.** Trim everything before the first interesting frame — open mid-action, mid-sentence, mid-move.\n\n" +
        "The fix this week: take your last 3 videos, delete the first 2 seconds of each, and re-watch. If they still make sense, the original opens were costing you.";

    } else if (has("algorithm", "views", "reach", "shadowban", "impressions", "not growing", "stuck", "plateau")) {
      body = "The algorithm isn't hiding you — it's grading you. Every post gets a small test batch, and these decide the next batch:\n\n" +
        "- **Watch time** — the percent of the video people actually finish\n" +
        "- **Re-watches and shares** — the strongest \"show more people\" signals\n" +
        "- **Saves and comments** — proof it mattered\n\n" +
        "Stop chasing hashtags and posting times — they're rounding errors. Retention is ranking. Make the first 3 seconds undeniable, keep the pacing tight, and give one clear reason to share or save.";

    } else if (has("audit", "strategy", "pillar", "positioning")) {
      const r = SMU.rank(), p = SMU.overallProgress();
      body = "Straight audit" + (SMU.state.name ? ", " + SMU.state.name : "") + ":\n\n" +
        "- **Rank:** " + r.name + " (" + SMU.state.xp + " XP), " + p.done + "/" + p.total + " lessons complete\n" +
        "- **Bottleneck:** " + wl.join(" and ") + " — your radar is thinnest here, and it caps everything else\n" +
        "- **Niche:** " + nl + " · goal: " + goalPhrase() + "\n\n" +
        "Three moves, in order:\n\n" +
        "1. Train the bottleneck" + (lessonTitle ? " — start with **" + lessonTitle + "** in Learn" : " — hit the Learn tab today") + ".\n" +
        "2. Tighten to 3 content pillars max. If a post doesn't serve a pillar, it doesn't ship.\n" +
        "3. Lock a cadence you can hold for 30 days — 4 posts a week you sustain beats 7 you abandon.";

    } else if (has("monetiz", "money", "sell", "offer", "income", "brand deal", "sponsor", "pricing")) {
      body = "Monetization is a trust game with four rungs:\n\n" +
        "1. **Attention** — a repeatable format people recognize you for\n" +
        "2. **Authority** — proof: results, process, receipts\n" +
        "3. **Audience asset** — get them off-platform: email, DM list, community\n" +
        "4. **Offer** — one clear thing to buy that solves one clear problem\n\n" +
        "Most creators try to sell at rung 1. Build the middle first: for 30 days, end every post with a reason to DM, save or subscribe — then make the offer to the people who did.";

    } else if (has("edit", "capcut", "premiere", "davinci", "transition", "color grade", "speed ramp")) {
      const er = PB().editRecipes || [];
      if (er.length) {
        const rec = sample(er, 1)[0];
        body = "Try **" + rec.name + "**" + (rec.app ? " (" + rec.app + ")" : "") + (rec.effect ? " — " + rec.effect : "") + ":\n\n" +
          (rec.steps || []).map((x, i) => (i + 1) + ". " + x).join("\n");
      } else {
        body = "Three edits that upgrade any video instantly:\n\n" +
          "1. **Kill the air.** Cut every breath, pause and \"um\" — pace is the difference between amateur and pro.\n" +
          "2. **Punch in on the point.** A 10-20% zoom on the key sentence re-hooks attention for free.\n" +
          "3. **Sound first.** Levels, then music under the voice, then one sound effect on the reveal. Viewers forgive soft visuals — never bad audio.\n\n" +
          "Do all three to your next video before you touch a single effect.";
      }

    } else if (has("b-roll", "broll", "shot list", "shotlist", "camera", "film", "shoot", "lighting")) {
      const br = (PB().broll || []).find((b) => b.niche === SMU.state.niche) || (PB().broll || [])[0];
      if (br && (br.items || []).length) {
        body = "Bank this b-roll for " + nl + " this week — 10 seconds per clip, steady hands:\n\n" +
          sample(br.items, 6).map((x) => "- " + x).join("\n") +
          "\n\nShoot 10 seconds of everything, use 2. The cut creates the energy, not the camera move.";
      } else {
        body = "The b-roll rule: shoot 10 seconds of everything, use 2. Bank these this week:\n\n" +
          "- Hands doing the work, close up\n" +
          "- The environment establishing shot — slow push-in\n" +
          "- The detail nobody notices\n" +
          "- You mid-process, not looking at camera\n" +
          "- The result, revealed last\n\n" +
          "Steady beats fancy — brace your elbows, move slow, and let the cut create the energy.";
      }

    } else if (has("brand", "bio", "identity", "aesthetic", "logo")) {
      body = "Your brand is the one sentence people say about you when you're not in the room. Engineer it:\n\n" +
        "- **Positioning line:** \"I help [who] get [result] through [your angle]\" — if you can't fill that in, that's the work\n" +
        "- **Pick 3 pillars** and refuse everything else — famous for one thing beats known for nothing\n" +
        "- **Codify your look:** same framing, tones and type until you're recognizable at thumbnail size\n\n" +
        "Test: would a stranger scrolling your last 9 posts describe you the way you want? If not, tighten.";

    } else {
      body = "In playbook mode I answer from the University library, and I'm sharpest when you ask for **hooks, ideas, captions, CTAs, scripts, editing, shot lists, retention fixes, a strategy audit, or your 7-day plan** — use those words and I'll pull the exact play.\n\n" +
        "Fastest lever for you right now: your **" + wl[0] + "** skill. " +
        (lessonTitle ? "Start with **" + lessonTitle + "** in Learn." : "Hit the Learn tab and take the next lesson.");
    }

    return body + UNLOCK;
  }

  /* ============================================================
     7-day improvement plan
     ============================================================ */
  function buildLocalPlan() {
    const st = SMU.state;
    const weak = SMU.weakestSkills(2);
    const wl = weakLabels(2);
    const low = nicheName().toLowerCase();
    const notDone = SMU.allLessons().filter((x) => !SMU.lessonDone(x.lesson.id));
    const queue = notDone.filter((x) => weak.indexOf(x.lesson.skill) >= 0)
      .concat(notDone.filter((x) => weak.indexOf(x.lesson.skill) < 0));

    const T = TR();
    let actions = [];
    const hooks = (PB().hooks || []).filter((h) => (h.niches || []).indexOf(st.niche) >= 0);
    if (hooks.length) actions.push("Film one video that opens with this hook: \"" + fill(sample(hooks, 1)[0].t) + "\"");
    actions = actions
      .concat(sample((T.challenges || []).map((c) => c.task), 2))
      .concat(sample((T.editingDrills || []).map((d) => d.task), 1))
      .concat(sample((T.photoDrills || []).map((d) => d.task), 1))
      .concat(sample((T.marketingDrills || []).map((d) => d.task), 1))
      .filter(Boolean)
      .concat(sample([
        "Film one 20-second talking-head take on the #1 mistake you see in " + low + ". One take, no script.",
        "Rewrite your last caption three ways — curious, bold, personal — and post the strongest.",
        "Study one top creator in " + low + ": note their hook, pacing and CTA, then steal the structure, not the words.",
        "Batch-shoot 10 b-roll clips around your day. Ten seconds each, elbows braced.",
        "Reply to 15 comments in your niche with genuinely useful answers. Visibility compounds.",
        "Cut the first 3 seconds of your latest video in half, re-watch, and feel the difference.",
        "Write 5 hooks for one idea, then ask one person which stops the scroll.",
      ], 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      days.push(d.toLocaleDateString(undefined, { weekday: "long" }));
    }

    const out = ["**This week's mission:** raise your " + wl.join(" and ").toLowerCase() + " — the thinnest edges on your radar. One lesson, one rep, every day."];
    for (let i = 0; i < 7; i++) {
      const q = queue[i];
      const study = q
        ? q.lesson.title + " (" + q.school.name + ", " + (q.lesson.minutes || 8) + " min)"
        : "Deconstruct one viral " + low + " video — write down its hook, structure and CTA.";
      out.push("**Day " + (i + 1) + " — " + days[i] + "**\n\n- Study: " + study + "\n- Do: " + actions[i]);
    }
    out.push("Coach's orders: ship at least 3 of the 7 things you make. Reps in public beat drafts in folders.");
    return out.join("\n\n");
  }

  function planPrompt() {
    const st = SMU.state, r = SMU.rank(), p = SMU.overallProgress();
    const queue = SMU.allLessons().filter((x) => !SMU.lessonDone(x.lesson.id)).slice(0, 6)
      .map((x) => x.lesson.title + " (" + x.school.name + ")");
    return "Design my next 7 days as one concrete improvement plan.\n\n" +
      "Format (markdown-lite only): for each of the 7 days, a bold line like **Day 1 — Theme**, then exactly two bullets: '- Study:' one lesson or topic (pull from my lesson queue below where it fits) and '- Do:' one same-day executable action — a post to film, a drill, or reps — tailored to my niche. Close with a single line of coach's orders.\n\n" +
      "My stats: rank " + r.name + ", " + st.xp + " XP, " + p.done + "/" + p.total + " lessons complete. " +
      "Weakest skills: " + weakLabels(2).join(" and ") + ". Niche: " + nicheName() + ". Goal: " + goalPhrase() + "." +
      (queue.length ? "\nLesson queue: " + queue.join("; ") + "." : "");
  }

  function openPlanSheet() {
    const ui = SMU.ui;
    const s = SMU.sheet("Your 7-day improvement plan",
      '<div id="planBody"><div class="msg ai thinking" style="max-width:none"><i></i><i></i><i></i></div></div>' +
      '<div id="planFoot"></div>');
    const body = s.el.querySelector("#planBody");
    const foot = s.el.querySelector("#planFoot");
    s.el.addEventListener("click", (e) => { if (e.target.closest("[data-nav]")) s.close(); });

    function show(text, topNote, bottomNote) {
      body.innerHTML = (topNote || "") + '<div class="fade-lines">' + SMU.md(text) + "</div>" + (bottomNote || "");
      foot.innerHTML = '<button class="btn btn-soft btn-block btn-sm" id="planCopy" style="margin-top:16px">' + ui.icon("copy") + " Copy plan</button>";
      foot.querySelector("#planCopy").addEventListener("click", () => ui.copy(text, "Plan copied — now execute."));
    }

    if (SMU.ai.hasKey()) {
      SMU.ai.ask(planPrompt(), {
        maxTokens: 1600,
        onDelta: (d, full) => { body.innerHTML = '<div class="fade-lines">' + SMU.md(full) + "</div>"; },
      }).then((full) => { show(full); })
        .catch((err) => {
          show(buildLocalPlan(),
            '<div class="small" style="color:var(--red);margin-bottom:12px">' +
            esc(err && err.message ? err.message : "AI unavailable") +
            " — here's your plan from the playbook instead.</div>");
        });
    } else {
      show(buildLocalPlan(), "",
        '<div class="small" style="margin-top:14px;line-height:1.55">Built from your weakest skills and lesson queue. ' +
        '<button data-nav="profile" style="color:var(--gold);font-weight:650;font-size:12.5px">Add a Claude API key</button> for a fully personalized AI version.</div>');
    }
  }

  /* ============================================================
     Skill snapshot sheet
     ============================================================ */
  function openSkillSheet() {
    const ui = SMU.ui, st = SMU.state;
    const wl = weakLabels(2);
    const recs = recLessons(2);
    const rows = recs.length
      ? recs.map((x) => ui.row({
          emoji: x.school.icon || "📚", hue: x.school.hue,
          title: x.lesson.title,
          sub: x.school.name + " · " + (x.lesson.minutes || 8) + " min · trains " + (SMU.SKILL_LABELS[x.lesson.skill] || x.lesson.skill),
          nav: "learn/" + x.school.id + "/" + x.course.id + "/" + x.lesson.id,
        })).join("")
      : ui.empty("📚", "Your curriculum is on its way", "Lesson recommendations will appear here once courses load.");

    const s = SMU.sheet("Your skill profile",
      '<div class="chart-box">' + ui.radar(st.skills || {}, 250) + "</div>" +
      '<p class="small" style="line-height:1.6;margin:4px 0 6px">Every lesson, drill and quiz feeds this radar. Right now <b>' +
      esc(wl[0]) + "</b> and <b>" + esc(wl[1] || wl[0]) +
      "</b> are your thinnest edges — train them first and everything else compounds.</p>" +
      ui.sectionHead("Close the gap") + rows);
    s.el.addEventListener("click", (e) => { if (e.target.closest("[data-nav]")) s.close(); });
  }

  /* ---------- clear-chat confirm ---------- */
  function confirmClear(root) {
    const s = SMU.sheet("Start fresh?",
      '<p class="small" style="margin-bottom:16px;line-height:1.55">This clears your conversation with your mentor. Your XP, lessons and skill data stay untouched.</p>' +
      '<button class="btn btn-danger btn-block" id="ccYes">Clear conversation</button>' +
      '<button class="btn btn-ghost btn-block btn-sm" id="ccNo" style="margin-top:9px">Keep it</button>');
    s.el.querySelector("#ccYes").addEventListener("click", () => {
      SMU.state.coachLog = [];
      SMU.save();
      s.close();
      SMU.toast("Clean slate.");
      SMU.views.coach.render(root);
    });
    s.el.querySelector("#ccNo").addEventListener("click", () => s.close());
  }

  /* ============================================================
     The view
     ============================================================ */
  SMU.views.coach = {
    title: "Coach",
    render(root, params) {
      const ui = SMU.ui, st = SMU.state;
      const log = st.coachLog = st.coachLog || [];
      const hasKey = SMU.ai.hasKey();
      const wl = weakLabels(2);
      const nl = nicheName();
      const r = SMU.rank();

      /* ----- header ----- */
      const head =
        '<div class="kicker" style="margin-top:10px">Your mentor</div>' +
        '<div class="h-display" style="margin-top:0">The mentor is <span class="accent">in</span>.</div>' +
        '<p class="h-sub">' +
        esc((st.name ? st.name + ", your " : "Your ") + wl.join(" and ").toLowerCase() +
          " skills are the gap between you and the next rank. Let's close it.") +
        "</p>";

      /* ----- skill snapshot card ----- */
      const snap =
        '<div id="skillCard">' +
        ui.row({
          emoji: "📊", hue: 258,
          title: "Your skill profile",
          sub: "Focus: " + wl.join(" · ") + " — tap for your radar",
        }) + "</div>";

      /* ----- toolbar: plan + clear ----- */
      const tools =
        '<div style="display:flex;gap:8px;align-items:center;margin:12px 0 2px">' +
        '<button class="btn btn-soft btn-sm" id="planBtn">Get my weekly plan</button>' +
        (log.length
          ? '<button class="btn btn-ghost btn-sm" id="clearBtn" style="margin-left:auto;border-color:transparent;color:var(--faint)">Clear chat</button>'
          : "") +
        "</div>";

      /* ----- chat ----- */
      let msgs;
      if (log.length) {
        msgs = log.map((m) => m.role === "user"
          ? '<div class="msg user">' + esc(m.text) + "</div>"
          : '<div class="msg ai">' + SMU.md(m.text) + "</div>").join("");
      } else {
        const intro = "I've read your file" + (st.name ? ", " + st.name : "") + " — " + nl +
          " niche, " + r.name + " rank, and your **" + wl.join("** and **") +
          "** need the most reps. Ask me anything, or tap a prompt below.";
        msgs = '<div class="msg ai">' + SMU.md(intro) + "</div>";
      }
      const chat = '<div class="chat-scroll" id="chatScroll" style="margin-top:16px">' + msgs + "</div>";

      /* ----- no-key note ----- */
      const note = hasKey ? "" :
        '<div class="card" style="padding:13px 16px;margin:2px 0 12px;background:var(--gold-soft);border-color:var(--gold-line)">' +
        '<div class="small" style="color:var(--gold-hi);line-height:1.55"><b>Playbook mode.</b> I answer from the University library — hooks, scripts, plans, the lot. Add a Claude API key to unlock the full conversational mentor.</div>' +
        '<button class="btn btn-ghost btn-sm" data-nav="profile" style="margin-top:10px">Open Settings</button></div>';

      /* ----- suggestion chips ----- */
      const prompts = [
        "Audit my content strategy",
        "Write me 5 hooks for " + nl.toLowerCase(),
        "Why do my views die after 3 seconds?",
        "Build my 7-day posting plan",
      ];
      const chips = log.length < 3
        ? '<div class="chips" style="margin:0 0 10px">' +
          prompts.map((p, i) => '<button class="chip" data-chipq="' + i + '">' + esc(p) + "</button>").join("") +
          "</div>"
        : "";

      /* ----- composer ----- */
      const composer =
        '<div class="composer">' +
        '<textarea id="coachTa" rows="1" placeholder="' + (hasKey ? "Ask your mentor anything…" : "Ask the playbook…") + '"></textarea>' +
        '<button class="send-btn" id="coachSend" aria-label="Send">' + ui.icon("send") + "</button></div>";

      root.innerHTML = head + snap + tools + chat + note + chips + composer;

      /* ----- bindings ----- */
      const chatEl = root.querySelector("#chatScroll");
      const ta = root.querySelector("#coachTa");
      const sendBtn = root.querySelector("#coachSend");
      let sending = false;

      function growTa() { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }
      ta.addEventListener("input", growTa);
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(ta.value); }
      });
      sendBtn.addEventListener("click", () => send(ta.value));
      root.querySelectorAll("[data-chipq]").forEach((c) =>
        c.addEventListener("click", () => send(prompts[+c.dataset.chipq])));
      root.querySelector("#skillCard").addEventListener("click", openSkillSheet);
      root.querySelector("#planBtn").addEventListener("click", openPlanSheet);
      const clearBtn = root.querySelector("#clearBtn");
      if (clearBtn) clearBtn.addEventListener("click", () => confirmClear(root));

      if (log.length) setTimeout(scrollBottom, 40);
      if (params && params[0] === "plan") setTimeout(openPlanSheet, 120);

      function send(text) {
        text = String(text || "").trim();
        if (!text || sending) return;
        sending = true;
        sendBtn.disabled = true;
        log.push({ role: "user", text: text });
        trimLog(log);
        SMU.save();
        ta.value = "";
        growTa();
        chatEl.insertAdjacentHTML("beforeend",
          '<div class="msg user">' + esc(text) + "</div>" +
          '<div class="msg ai thinking"><i></i><i></i><i></i></div>');
        const pending = chatEl.lastElementChild;
        scrollBottom();

        if (SMU.ai.hasKey()) {
          SMU.ai.chat(buildHistory(log), {
            onDelta: (d, full) => {
              pending.classList.remove("thinking");
              pending.innerHTML = SMU.md(full);
              scrollBottom();
            },
          }).then((full) => {
            log.push({ role: "assistant", text: full || "…" });
            trimLog(log);
            SMU.save();
            SMU.views.coach.render(root);
          }).catch((err) => {
            pending.classList.remove("thinking");
            pending.innerHTML = SMU.md(err && err.message ? err.message : "Something went wrong — try again.");
            sending = false;
            sendBtn.disabled = false;
            scrollBottom();
          });
        } else {
          /* Ask the playbook — a beat of "thinking" keeps the rhythm of a real reply */
          setTimeout(() => {
            log.push({ role: "assistant", text: playbookAnswer(text) });
            trimLog(log);
            SMU.save();
            SMU.views.coach.render(root);
          }, 480);
        }
      }
    },
  };
})();
