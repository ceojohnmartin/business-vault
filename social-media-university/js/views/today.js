/* ============================================================
   Today — daily training system dashboard.
   Compact, scannable hierarchy: lesson → challenge → study →
   drills → quiz → mentor note.
   ============================================================ */

SMU.views.today = {
  title: "Today",
  render(root) {
    const esc = SMU.esc, ui = SMU.ui, st = SMU.state;
    const d = SMU.daily();
    const r = SMU.rank();
    const prog = SMU.overallProgress();
    const hour = new Date().getHours();
    const greet = hour < 5 ? "Late night grind" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const dateStr = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    const doneToday = st.lastXPDay === SMU.dayKey();

    /* ----- compact hero: greeting + rank + curriculum ring ----- */
    const hero =
      '<div class="card card-hero" style="padding:13px 15px;margin-top:2px">' +
      '<div class="row" style="align-items:center;gap:14px">' +
      '<div class="grow">' +
      '<div class="kicker" style="margin-bottom:4px;font-size:9.5px">' + esc(dateStr) + "</div>" +
      '<div style="font-family:var(--serif);font-weight:600;font-size:18px;line-height:1.2">' +
      esc(greet) + (st.name ? ", " + esc(st.name) : "") + "." +
      "</div>" +
      '<div class="small" style="font-size:11.5px;margin-top:3px">' +
      esc(r.name) + " · " + st.xp.toLocaleString() + " XP" +
      (r.next ? " · " + r.toNext.toLocaleString() + " to " + esc(r.next) : "") +
      "</div>" +
      '<div style="margin-top:8px;max-width:210px">' + ui.bar(r.pct, true) + "</div>" +
      "</div>" +
      ui.ring(prog.pct, 54, prog.pct + "%") +
      "</div></div>";

    /* ----- slim stat strip ----- */
    const stats =
      '<div class="stat-strip">' +
      '<div><div class="v">🔥 ' + SMU.liveStreak() + '</div><div class="k">Streak</div></div>' +
      '<div><div class="v">' + prog.done + '</div><div class="k">Lessons</div></div>' +
      '<div><div class="v">' + (doneToday ? "✓" : "—") + '</div><div class="k">Today</div></div>' +
      "</div>";

    /* ----- 1 · today's lesson (primary) ----- */
    let learnCard = "";
    if (d.lesson) {
      const L = d.lesson;
      learnCard =
        ui.sectionHead("Today's lesson", "learn", "Curriculum") +
        '<div class="card tap" data-nav="' + esc("learn/" + L.school.id + "/" + L.course.id + "/" + L.lesson.id) + '" style="border-color:var(--gold-line)">' +
        '<div class="row">' +
        '<div class="icon-tile" style="--hue:' + L.school.hue + '">' + esc(L.school.icon) + "</div>" +
        '<div class="grow">' +
        '<div class="title" style="font-size:15px">' + esc(L.lesson.title) + "</div>" +
        '<div class="sub">' + esc(L.school.name + " · " + L.course.level) + "</div>" +
        '<div style="margin-top:6px;display:flex;gap:5px">' +
        '<span class="tag">' + L.lesson.minutes + ' min</span>' +
        '<span class="tag gold">+' + L.lesson.xp + " XP</span></div>" +
        "</div>" +
        '<span class="btn btn-gold btn-sm" style="flex:0 0 auto;padding:7px 13px">' +
        (SMU.lessonDone(L.lesson.id) ? "Review" : "Start") + "</span>" +
        "</div></div>";
    }

    /* ----- 2 · daily challenge ----- */
    let challengeCard = "";
    if (d.challenge) {
      const c = d.challenge, done = SMU.challengeDone(c.id);
      challengeCard =
        ui.sectionHead("Daily challenge") +
        '<div class="card">' +
        '<div class="row" style="align-items:flex-start">' +
        '<div class="icon-tile" style="--hue:0;width:34px;height:34px;font-size:16px;border-radius:11px">⚡</div>' +
        '<div class="grow">' +
        '<div class="title" style="font-size:14px">' + esc(c.title) + "</div>" +
        '<div class="small" style="margin-top:3px;line-height:1.5;font-size:12.5px">' + esc(c.task) + "</div>" +
        "</div></div>" +
        '<div style="display:flex;align-items:center;gap:5px;margin-top:10px">' +
        '<span class="tag gold">+' + c.xp + ' XP</span><span class="tag">' + c.minutes + " min</span>" +
        '<button class="btn ' + (done ? "btn-ghost" : "btn-soft") + ' btn-sm" id="chBtn" style="margin-left:auto" ' + (done ? "disabled" : "") + ">" +
        (done ? "Done ✓" : "Mark complete") + "</button></div>" +
        "</div>";
    }

    /* ----- 3 · study the greats ----- */
    let studyFeed = "";
    if (d.creator || d.viral) {
      studyFeed = ui.sectionHead("Study the greats", "intel", "Intel");
      if (d.creator) {
        studyFeed += ui.row({
          emoji: d.creator.emoji || "⭐", hue: 210,
          title: d.creator.name,
          sub: d.creator.known || d.creator.niche,
          nav: "intel/creators/" + d.creator.id,
        });
      }
      if (d.viral) {
        studyFeed += ui.row({
          emoji: d.viral.emoji || "🎬", hue: 320,
          title: d.viral.title,
          sub: (d.viral.platform || "") + " · " + (d.viral.format || ""),
          nav: "intel/viral/" + d.viral.id,
        });
      }
    }

    /* ----- 4 · craft drills ----- */
    const drills = [
      d.editingDrill && { d: d.editingDrill, label: "Editing", emoji: "✂️", hue: 190, skill: "editing" },
      d.photoDrill && { d: d.photoDrill, label: "Photo", emoji: "📸", hue: 28, skill: "photo" },
      d.marketingDrill && { d: d.marketingDrill, label: "Marketing", emoji: "🧠", hue: 145, skill: "marketing" },
    ].filter(Boolean);
    let drillsHtml = "";
    if (drills.length) {
      drillsHtml = ui.sectionHead("Craft drills") + drills.map((x, i) => {
        const done = SMU.challengeDone(x.d.id);
        return (
          '<div class="card" style="padding:11px 13px">' +
          '<div class="row" style="gap:11px">' +
          '<div class="icon-tile" style="--hue:' + x.hue + ';width:32px;height:32px;font-size:15px;border-radius:10px">' + x.emoji + "</div>" +
          '<div class="grow"><div class="title" style="font-size:13px">' + esc(x.d.title) + "</div>" +
          '<div class="sub" style="white-space:normal;line-height:1.45;margin-top:2px;font-size:11.5px">' + esc(x.d.task) + "</div></div>" +
          '<button class="btn btn-sm ' + (done ? "btn-ghost" : "btn-soft") + '" style="padding:6px 11px" data-drill="' + i + '" ' + (done ? "disabled" : "") + ">" +
          (done ? "✓" : "+" + (x.d.xp || 30)) + "</button>" +
          "</div></div>"
        );
      }).join("");
    }

    /* ----- 5 · daily quiz ----- */
    const quizDone = st.quizzes[SMU.dayKey()];
    let quizHtml = "";
    if (d.quiz && d.quiz.length) {
      quizHtml =
        ui.sectionHead("Daily quiz") +
        '<div class="card tap" id="quizCard" style="padding:12px 14px">' +
        '<div class="row">' +
        '<div class="icon-tile" style="--hue:48;width:34px;height:34px;font-size:16px;border-radius:11px">🎯</div>' +
        '<div class="grow"><div class="title" style="font-size:13.5px">' + (quizDone ? "Today's score: " + quizDone.score + "/" + quizDone.total : "5 questions, 2 minutes") + "</div>" +
        '<div class="sub" style="font-size:11.5px">' + (quizDone ? "Fresh set tomorrow" : "+10 XP per correct answer") + "</div></div>" +
        '<span class="chev">' + ui.icon("chev") + "</span>" +
        "</div></div>";
    }

    /* ----- 6 · mentor note (quiet) ----- */
    const weak = d.focusSkills.map((k) => SMU.SKILL_LABELS[k]).join(" & ");
    const focus =
      '<div class="card" style="margin-top:20px;padding:12px 14px;background:linear-gradient(150deg,#141322,#14141a);border-color:rgba(150,130,220,.22)">' +
      '<div class="small" style="font-size:12px;line-height:1.55"><span style="color:#b1a1e8;font-weight:700">Mentor\'s note</span> — your ' +
      esc(weak) + " skills lag the rest, so today's training leans into them. " +
      '<span data-nav="coach" style="color:var(--gold);font-weight:650;cursor:pointer">Ask your coach →</span></div>' +
      "</div>";

    root.innerHTML = hero + stats + learnCard + challengeCard + studyFeed + drillsHtml + quizHtml + focus;

    /* ----- bindings ----- */
    const chBtn = root.querySelector("#chBtn");
    if (chBtn) chBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      SMU.completeChallenge(d.challenge.id, d.challenge.xp, d.challenge.skill);
      SMU.toast("Challenge complete — momentum builds.");
      SMU.views.today.render(root);
    });
    root.querySelectorAll("[data-drill]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const x = drills[+btn.dataset.drill];
        SMU.completeChallenge(x.d.id, x.d.xp || 30, x.skill);
        SMU.toast(x.label + " drill done.");
        SMU.views.today.render(root);
      });
    });
    const quizCard = root.querySelector("#quizCard");
    if (quizCard) quizCard.addEventListener("click", () => openQuiz(d.quiz, () => SMU.views.today.render(root)));

    /* ----- quiz sheet flow ----- */
    function openQuiz(questions, onEnd) {
      let i = 0, correct = 0, answered = false;
      const s = SMU.sheet("Daily quiz", "<div id='qzBody'></div>");
      const body = s.el.querySelector("#qzBody");
      step();
      function step() {
        if (i >= questions.length) return finish();
        const q = questions[i];
        answered = false;
        body.innerHTML =
          '<div class="small" style="margin-bottom:10px">Question ' + (i + 1) + " of " + questions.length + "</div>" +
          '<div class="quiz-q">' + esc(q.q) + "</div>" +
          q.options.map((o, j) =>
            '<button class="quiz-opt" data-j="' + j + '"><span class="abc">' + "ABCD"[j] + "</span><span>" + esc(o) + "</span></button>"
          ).join("") +
          '<div id="qzWhy"></div>';
        body.querySelectorAll(".quiz-opt").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (answered) return;
            answered = true;
            const j = +btn.dataset.j, ok = j === q.answer;
            if (ok) correct++;
            btn.classList.add(ok ? "correct" : "wrong");
            if (!ok) body.querySelector('[data-j="' + q.answer + '"]').classList.add("correct");
            body.querySelector("#qzWhy").innerHTML =
              '<div class="quiz-why">' + esc(q.why || "") + "</div>" +
              '<button class="btn btn-gold btn-block btn-sm" id="qzNext">' + (i === questions.length - 1 ? "Finish" : "Next") + "</button>";
            body.querySelector("#qzNext").addEventListener("click", () => { i++; step(); });
          });
        });
      }
      function finish() {
        SMU.state.quizzes[SMU.dayKey()] = { score: correct, total: questions.length };
        SMU.save();
        if (correct > 0) SMU.addXP(correct * 10, questions[Math.max(0, correct - 1)].skill);
        body.innerHTML =
          '<div style="text-align:center;padding:14px 0">' +
          '<div class="score-big">' + correct + "/" + questions.length + "</div>" +
          '<div class="small" style="margin:10px 0 16px">' +
          (correct === questions.length ? "Perfect. That's how a Master thinks." :
            correct >= 3 ? "Solid instincts — review the misses and come back sharper." :
            "The reps are the point. Hit a lesson and retry tomorrow.") + "</div>" +
          '<button class="btn btn-gold btn-block" id="qzDone">Collect ' + correct * 10 + " XP</button></div>";
        body.querySelector("#qzDone").addEventListener("click", () => { s.close(); onEnd(); });
      }
    }
  },
};
