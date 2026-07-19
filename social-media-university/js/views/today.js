/* ============================================================
   Today — daily training system dashboard.
   Also the reference implementation for view conventions:
   register on SMU.views, build HTML strings, bind after paint.
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

    /* ----- hero ----- */
    const hero =
      '<div class="card card-hero">' +
      '<div class="row" style="align-items:center">' +
      '<div class="grow">' +
      '<div class="kicker">' + esc(dateStr) + "</div>" +
      '<div style="font-family:var(--serif);font-weight:600;font-size:22px;line-height:1.2">' +
      esc(greet) + (st.name ? ", " + esc(st.name) : "") + "." +
      "</div>" +
      '<div class="small" style="margin-top:5px">' +
      esc(r.name) + " · " + st.xp.toLocaleString() + " XP" +
      (r.next ? " · " + r.toNext.toLocaleString() + " XP to " + esc(r.next) : " · top rank") +
      "</div>" +
      '<div style="margin-top:10px;max-width:230px">' + ui.bar(r.pct) + "</div>" +
      "</div>" +
      ui.ring(prog.pct, 84, prog.pct + "%", "curriculum") +
      "</div></div>";

    /* ----- stats ----- */
    const stats =
      '<div class="stat-grid" style="margin-top:12px">' +
      '<div class="stat"><div class="v">🔥 ' + SMU.liveStreak() + '</div><div class="k">Streak</div></div>' +
      '<div class="stat"><div class="v">' + prog.done + '</div><div class="k">Lessons</div></div>' +
      '<div class="stat"><div class="v">' + (doneToday ? "✓" : "—") + '</div><div class="k">Trained today</div></div>' +
      "</div>";

    /* ----- continue learning ----- */
    let learnCard = "";
    if (d.lesson) {
      const L = d.lesson;
      learnCard =
        ui.sectionHead("Today's lesson", "learn", "Curriculum") +
        ui.row({
          emoji: L.school.icon, hue: L.school.hue,
          title: L.lesson.title,
          sub: L.school.name + " · " + L.course.level + " · " + L.lesson.minutes + " min · +" + L.lesson.xp + " XP",
          nav: "learn/" + L.school.id + "/" + L.course.id + "/" + L.lesson.id,
        });
    }

    /* ----- daily challenge ----- */
    let challengeCard = "";
    if (d.challenge) {
      const c = d.challenge, done = SMU.challengeDone(c.id);
      challengeCard =
        ui.sectionHead("Daily challenge") +
        '<div class="card">' +
        '<div class="row" style="align-items:flex-start">' +
        '<div class="icon-tile" style="--hue:0">⚡</div>' +
        '<div class="grow"><div class="title">' + esc(c.title) + "</div>" +
        '<div class="small" style="margin-top:4px;line-height:1.5">' + esc(c.task) + "</div>" +
        '<div style="margin-top:8px;display:flex;gap:6px"><span class="tag gold">+' + c.xp + ' XP</span>' +
        '<span class="tag">' + c.minutes + ' min</span><span class="tag hue" style="--hue:0">' + esc(SMU.SKILL_LABELS[c.skill] || c.skill) + "</span></div>" +
        "</div></div>" +
        '<button class="btn ' + (done ? "btn-ghost" : "btn-gold") + ' btn-block btn-sm" style="margin-top:14px" id="chBtn" ' + (done ? "disabled" : "") + ">" +
        (done ? "Completed today ✓" : "Mark complete") + "</button>" +
        "</div>";
    }

    /* ----- study feed: creator + viral ----- */
    let studyFeed = "";
    if (d.creator || d.viral) {
      studyFeed = ui.sectionHead("Study the greats", "intel", "Intel");
      if (d.creator) {
        studyFeed += ui.row({
          emoji: d.creator.emoji || "⭐", hue: 210,
          title: "Creator to study: " + d.creator.name,
          sub: d.creator.known || d.creator.niche,
          nav: "intel/creators/" + d.creator.id,
          tagText: "Creator file", tagClass: "gold",
        });
      }
      if (d.viral) {
        studyFeed += ui.row({
          emoji: d.viral.emoji || "🎬", hue: 320,
          title: "Viral breakdown: " + d.viral.title,
          sub: d.viral.format,
          nav: "intel/viral/" + d.viral.id,
          tagText: d.viral.platform, tagClass: "hue",
        });
      }
    }

    /* ----- craft drills ----- */
    const drills = [
      d.editingDrill && { d: d.editingDrill, label: "Editing drill", emoji: "✂️", hue: 190, skill: "editing" },
      d.photoDrill && { d: d.photoDrill, label: "Photo drill", emoji: "📸", hue: 28, skill: "photo" },
      d.marketingDrill && { d: d.marketingDrill, label: "Marketing drill", emoji: "🧠", hue: 145, skill: "marketing" },
    ].filter(Boolean);
    let drillsHtml = "";
    if (drills.length) {
      drillsHtml = ui.sectionHead("Craft drills") + drills.map((x, i) => {
        const done = SMU.challengeDone(x.d.id);
        return (
          '<div class="card" style="padding:15px 16px">' +
          '<div class="row">' +
          '<div class="icon-tile" style="--hue:' + x.hue + ';width:40px;height:40px;font-size:18px;border-radius:12px">' + x.emoji + "</div>" +
          '<div class="grow"><div class="title" style="font-size:14px">' + esc(x.d.title) + "</div>" +
          '<div class="sub" style="white-space:normal;line-height:1.45;margin-top:3px">' + esc(x.d.task) + "</div></div>" +
          '<button class="btn btn-sm ' + (done ? "btn-ghost" : "btn-soft") + '" data-drill="' + i + '" ' + (done ? "disabled" : "") + ">" +
          (done ? "✓" : "+" + (x.d.xp || 30)) + "</button>" +
          "</div></div>"
        );
      }).join("");
    }

    /* ----- daily quiz ----- */
    const quizDone = st.quizzes[SMU.dayKey()];
    let quizHtml = "";
    if (d.quiz && d.quiz.length) {
      quizHtml =
        ui.sectionHead("Daily quiz") +
        '<div class="card tap" id="quizCard">' +
        '<div class="row">' +
        '<div class="icon-tile" style="--hue:48">🎯</div>' +
        '<div class="grow"><div class="title">' + (quizDone ? "Today's score: " + quizDone.score + "/" + quizDone.total : "5 questions, 2 minutes") + "</div>" +
        '<div class="sub">' + (quizDone ? "Come back tomorrow for a fresh set" : "Sharpen your instincts · +10 XP per correct answer") + "</div></div>" +
        '<span class="chev">' + ui.icon("chev") + "</span>" +
        "</div></div>";
    }

    /* ----- focus nudge ----- */
    const weak = d.focusSkills.map((k) => SMU.SKILL_LABELS[k]).join(" and ");
    const focus =
      '<div class="card" style="margin-top:26px;background:linear-gradient(150deg,#141322,#14141a);border-color:rgba(150,130,220,.25)">' +
      '<div class="kicker" style="color:#b1a1e8">Mentor\'s note</div>' +
      '<div style="font-size:14px;line-height:1.55">Your ' + esc(weak) + " skills are lagging behind the rest. I've weighted today's training toward them — " +
      'ask me in <b>Coach</b> for a personal improvement plan any time.</div>' +
      '<button class="btn btn-ghost btn-sm" style="margin-top:12px" data-nav="coach">Talk to your coach</button>' +
      "</div>";

    root.innerHTML = hero + stats + learnCard + challengeCard + studyFeed + drillsHtml + quizHtml + focus;

    /* ----- bindings ----- */
    const chBtn = root.querySelector("#chBtn");
    if (chBtn) chBtn.addEventListener("click", () => {
      SMU.completeChallenge(d.challenge.id, d.challenge.xp, d.challenge.skill);
      SMU.toast("Challenge complete — momentum builds.");
      this.render(root);
    });
    root.querySelectorAll("[data-drill]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const x = drills[+btn.dataset.drill];
        SMU.completeChallenge(x.d.id, x.d.xp || 30, x.skill);
        SMU.toast(x.label + " done.");
        this.render(root);
      });
    });
    const quizCard = root.querySelector("#quizCard");
    if (quizCard) quizCard.addEventListener("click", () => openQuiz(d.quiz, () => this.render(root)));

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
          '<div style="text-align:center;padding:18px 0">' +
          '<div class="score-big">' + correct + "/" + questions.length + "</div>" +
          '<div class="small" style="margin:10px 0 18px">' +
          (correct === questions.length ? "Perfect. That's how a Master thinks." :
            correct >= 3 ? "Solid instincts — review the misses and come back sharper." :
            "The reps are the point. Hit a lesson and retry tomorrow.") + "</div>" +
          '<button class="btn btn-gold btn-block" id="qzDone">Collect ' + correct * 10 + " XP</button></div>";
        body.querySelector("#qzDone").addEventListener("click", () => { s.close(); onEnd(); });
      }
    }
  },
};
