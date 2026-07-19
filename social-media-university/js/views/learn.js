/* ============================================================
   Learn — The University: curriculum hub, school detail, and
   the lesson reader (inline quiz, completion, mentor apply).
   Routes: learn | learn/<schoolId> | learn/<schoolId>/<courseId>/<lessonId>
   ============================================================ */

(function () {
  const esc = SMU.esc, ui = SMU.ui;
  const LETTERS = "ABCDEF";

  function hueOf(s) { return s && typeof s.hue === "number" ? s.hue : 42; }

  /* ================= hub: #/learn ================= */
  function renderHub(root) {
    const schs = SMU.schools();
    const prog = SMU.overallProgress();
    const r = SMU.rank();
    const nx = SMU.nextLesson();

    let html =
      '<div class="kicker">The University</div>' +
      '<div class="h-display">Master every <span class="accent">craft</span>.</div>' +
      '<p class="h-sub">' +
      esc(schs.length
        ? schs.length + " schools. " + prog.total + " lessons. Five levels from Beginner to Master — the complete education behind every serious account."
        : "Your curriculum is being written.") +
      "</p>";

    if (!schs.length) {
      root.innerHTML = html + ui.empty("🏛️", "The schools open soon.", "Course content is being prepared — check back shortly.");
      return;
    }

    html +=
      '<div class="card card-hero">' +
      '<div class="row" style="align-items:center">' +
      '<div class="grow">' +
      '<div class="kicker">Your progress</div>' +
      '<div style="font-family:var(--serif);font-weight:600;font-size:21px;line-height:1.2">' +
      prog.done + " of " + prog.total + " lessons</div>" +
      '<div class="small" style="margin-top:5px">' + esc(r.name) + " rank" +
      (r.next ? " · " + r.toNext.toLocaleString() + " XP to " + esc(r.next) : " · top of the class") +
      "</div>" +
      (nx
        ? '<button class="btn btn-gold btn-sm" style="margin-top:13px" data-nav="' +
          esc("learn/" + nx.school.id + "/" + nx.course.id + "/" + nx.lesson.id) + '">' +
          (prog.done ? "Continue learning" : "Start lesson one") + "</button>"
        : (prog.total ? '<span class="tag green" style="margin-top:13px;display:inline-block">Curriculum complete</span>' : "")) +
      "</div>" +
      ui.ring(prog.pct, 86, prog.pct + "%", "complete") +
      "</div></div>";

    html += ui.sectionHead("The schools");
    html += schs.map((s) => {
      const p = SMU.schoolProgress(s);
      return (
        '<div class="card tap" data-nav="' + esc("learn/" + s.id) + '">' +
        '<div class="row">' +
        '<div class="icon-tile" style="--hue:' + hueOf(s) + '">' + esc(s.icon || "🎓") + "</div>" +
        '<div class="grow">' +
        '<div class="title">' + esc(s.name || s.id) + "</div>" +
        '<div class="sub ellip">' + esc(p.done + "/" + p.total + " lessons · " + (s.tagline || "")) + "</div>" +
        "</div>" +
        (p.total && p.done === p.total
          ? '<span class="tag green" style="flex:0 0 auto">' + ui.icon("check") + "</span>"
          : '<span class="chev">' + ui.icon("chev") + "</span>") +
        "</div>" +
        '<div style="margin-top:12px">' + ui.bar(p.pct, true) + "</div>" +
        "</div>"
      );
    }).join("");

    root.innerHTML = html;
  }

  /* ================= school: #/learn/<schoolId> ================= */
  function renderSchool(root, schoolId) {
    const s = SMU.school(schoolId);
    let html = ui.backLink("learn", "University");

    if (!s) {
      root.innerHTML = html + ui.empty("🏛️", "That school isn't in the catalog.", "Head back and choose a track from the University.");
      return;
    }

    const hue = hueOf(s), p = SMU.schoolProgress(s);
    html +=
      '<div class="row" style="margin-top:12px;align-items:center">' +
      '<div class="icon-tile" style="--hue:' + hue + ';width:60px;height:60px;font-size:29px;border-radius:19px">' + esc(s.icon || "🎓") + "</div>" +
      '<div class="grow">' +
      '<div style="font-family:var(--serif);font-weight:600;font-size:25px;line-height:1.15">' + esc(s.name || s.id) + "</div>" +
      (s.tagline ? '<div class="small" style="margin-top:4px">' + esc(s.tagline) + "</div>" : "") +
      "</div></div>" +
      (s.description ? '<p class="small" style="margin:13px 0 0;line-height:1.65">' + esc(s.description) + "</p>" : "") +
      '<div class="card" style="margin-top:16px;padding:14px 16px">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">' +
      '<span class="small">' + p.done + " of " + p.total + " lessons complete</span>" +
      '<span class="small mono" style="color:var(--gold-hi)">' + p.pct + "%</span></div>" +
      ui.bar(p.pct) +
      "</div>";

    const courses = s.courses || [];
    if (!courses.length) {
      root.innerHTML = html + ui.empty("📚", "Courses are being written.", "This school's syllabus lands shortly.");
      return;
    }

    html += courses.map((c) => {
      const cp = SMU.courseProgress(c);
      const lessons = c.lessons || [];
      return (
        '<div style="margin:30px 0 12px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
        '<span class="tag hue" style="--hue:' + hue + '">' + esc(c.level || "Course") + "</span>" +
        (cp.total && cp.done === cp.total
          ? '<span class="tag green">Complete</span>'
          : '<span class="small mono">' + cp.done + "/" + cp.total + "</span>") +
        "</div>" +
        '<div style="font-family:var(--serif);font-weight:600;font-size:19px;margin-top:9px">' + esc(c.title || "") + "</div>" +
        (c.description ? '<div class="small" style="margin-top:4px;line-height:1.55">' + esc(c.description) + "</div>" : "") +
        "</div>" +
        (lessons.length
          ? '<div class="list-tight">' +
            lessons.map((l) => ui.row({
              title: l.title || l.id,
              sub: (l.minutes || 8) + " min · +" + (l.xp || 50) + " XP",
              nav: "learn/" + s.id + "/" + c.id + "/" + l.id,
              done: SMU.lessonDone(l.id),
            })).join("") +
            "</div>"
          : '<div class="small" style="color:var(--faint)">Lessons coming soon.</div>')
      );
    }).join("");

    root.innerHTML = html;
  }

  /* ======= lesson reader: #/learn/<schoolId>/<courseId>/<lessonId> ======= */
  function renderLesson(root, schoolIdParam, lessonId) {
    const hit = SMU.findLesson(lessonId);

    if (!hit) {
      const backRoute = SMU.school(schoolIdParam) ? "learn/" + schoolIdParam : "learn";
      root.innerHTML =
        ui.backLink(backRoute, "Back") +
        ui.empty("📖", "That lesson isn't in the syllabus.", "It may still be generating — pick another and keep moving.");
      return;
    }

    const l = hit.lesson, course = hit.course, sch = hit.school;
    const hue = hueOf(sch);
    const xp = l.xp || 50;
    const skillLabel = SMU.SKILL_LABELS[l.skill] || l.skill || "";
    const wasDone = SMU.lessonDone(l.id);
    const quiz = (Array.isArray(l.quiz) ? l.quiz : []).filter((q) => q && Array.isArray(q.options) && q.options.length);
    const nicheLabel = SMU.NICHE_LABELS[SMU.state.niche] || "creator";
    const hasKey = SMU.ai.hasKey();

    function finishButtonHTML(isDone) {
      return isDone
        ? '<button class="btn btn-ghost btn-block" id="lessonDone">Log this review</button>'
        : '<button class="btn btn-gold btn-block" id="lessonDone">Complete lesson · +' + xp + " XP</button>";
    }

    let html = '<div class="reader">' + ui.backLink("learn/" + sch.id, sch.name || "Back");

    html +=
      '<div class="kicker" style="margin-top:12px">' + esc((sch.name || "") + " · " + (course.level || "")) + "</div>" +
      '<div class="lesson-title">' + esc(l.title || "") + "</div>" +
      '<div class="lesson-meta" id="lessonMeta">' +
      '<span class="tag">' + (l.minutes || 8) + " min</span>" +
      '<span class="tag gold">+' + xp + " XP</span>" +
      (skillLabel ? '<span class="tag hue" style="--hue:' + hue + '">' + esc(skillLabel) + "</span>" : "") +
      (wasDone ? '<span class="tag green">Completed</span>' : "") +
      "</div>";

    if (l.intro) html += '<div class="intro">' + esc(l.intro) + "</div>";

    html += (l.sections || []).map((sec) =>
      (sec && sec.h ? "<h3>" + esc(sec.h) + "</h3>" : "") + SMU.md(sec && sec.body || "")
    ).join("");

    if (l.takeaways && l.takeaways.length) {
      html +=
        '<div class="callout"><div class="c-k">Key takeaways</div><ul>' +
        l.takeaways.map((t) => "<li>" + esc(t) + "</li>").join("") +
        "</ul></div>";
    }

    if (l.actions && l.actions.length) {
      html +=
        '<div class="callout"><div class="c-k">Do this today</div><ol style="margin:0 0 0 18px">' +
        l.actions.map((a) => '<li style="margin-bottom:6px;color:#efeadd">' + esc(a) + "</li>").join("") +
        "</ol></div>";
    }

    if (l.drill) {
      html +=
        '<div class="callout"><div class="c-k">Practice drill</div>' +
        '<div style="font-size:14px;line-height:1.6;color:#efeadd">' + esc(l.drill) + "</div></div>";
    }

    /* mentor application card */
    html +=
      '<div class="card" style="margin:24px 0;background:linear-gradient(150deg,#141322,#14141a);border-color:rgba(150,130,220,.25)">' +
      '<div class="kicker" style="color:#b1a1e8">Mentor\'s desk</div>' +
      '<div style="font-size:14px;line-height:1.55">Knowing this is worth nothing until it ships. Turn the lesson into this week\'s moves for your ' +
      esc(nicheLabel) + " content.</div>" +
      '<button class="btn btn-ghost btn-sm" style="margin-top:12px" id="applyBtn">' +
      (hasKey ? "Have the mentor apply it" : "Build my action plan") + "</button>" +
      (hasKey ? "" :
        '<div class="small" style="margin-top:10px">Offline mode — <span style="color:var(--gold);cursor:pointer" data-nav="profile">add your API key in Settings</span> and the mentor tailors this to your brand.</div>') +
      "</div>";

    /* quiz */
    html += '<div class="divider"></div>';
    if (quiz.length) {
      html +=
        '<div class="h-sec" style="margin-top:20px"><span class="t">Prove it</span>' +
        '<span class="small">' + quiz.length + " questions</span></div>" +
        (wasDone ? '<div class="small" style="margin:-2px 0 14px">Already completed — retake to keep the edge sharp. No duplicate XP, all the retention.</div>' : "") +
        quiz.map((q, qi) =>
          '<div class="quiz-block" data-q="' + qi + '" style="margin-bottom:24px">' +
          '<div class="quiz-q"><span class="mono" style="color:var(--gold);font-size:12px;margin-right:8px">' + (qi + 1) + "</span>" + esc(q.q || "") + "</div>" +
          q.options.map((o, j) =>
            '<button class="quiz-opt" data-j="' + j + '"><span class="abc">' + (LETTERS[j] || j + 1) + "</span><span>" + esc(o) + "</span></button>"
          ).join("") +
          '<div class="qz-why"></div></div>'
        ).join("");
    }
    html +=
      '<div id="finishWrap">' +
      (quiz.length
        ? '<div class="small" style="text-align:center;padding:2px 0 14px">Answer all ' + quiz.length + " to unlock completion.</div>"
        : finishButtonHTML(wasDone)) +
      "</div>";

    html += "</div>";
    root.innerHTML = html;

    /* ----- bindings ----- */
    const finishWrap = root.querySelector("#finishWrap");
    const answers = new Array(quiz.length).fill(null);

    root.querySelectorAll(".quiz-block").forEach((block) => {
      const qi = +block.dataset.q, q = quiz[qi];
      block.querySelectorAll(".quiz-opt").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (answers[qi] !== null) return;
          const j = +btn.dataset.j, ok = j === q.answer;
          answers[qi] = ok;
          btn.classList.add(ok ? "correct" : "wrong");
          if (!ok) {
            const right = block.querySelector('[data-j="' + q.answer + '"]');
            if (right) right.classList.add("correct");
          }
          block.querySelector(".qz-why").innerHTML = '<div class="quiz-why">' + esc(q.why || "") + "</div>";
          if (answers.every((a) => a !== null)) showScore();
        });
      });
    });

    const applyBtn = root.querySelector("#applyBtn");
    if (applyBtn) applyBtn.addEventListener("click", () => openApply(hit, nicheLabel));

    bindFinish();

    function bindFinish() {
      const b = finishWrap && finishWrap.querySelector("#lessonDone");
      if (b) b.addEventListener("click", completeNow);
    }

    function showScore() {
      if (!finishWrap) return;
      const correct = answers.filter(Boolean).length;
      const verdict =
        correct === quiz.length ? "Flawless. That's how a Master answers." :
        correct >= Math.ceil(quiz.length * 2 / 3) ? "Strong instincts. Review the miss above, then bank it." :
        "The explanations above are the real lesson — reread them. The XP still counts.";
      finishWrap.innerHTML =
        '<div style="text-align:center;padding:4px 0 10px">' +
        '<div class="score-big">' + correct + "/" + quiz.length + "</div>" +
        '<div class="small" style="margin:8px 0 16px">' + esc(verdict) + "</div>" +
        finishButtonHTML(SMU.lessonDone(l.id)) +
        "</div>";
      bindFinish();
      finishWrap.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function completeNow() {
      if (!finishWrap) return;
      const first = !SMU.lessonDone(l.id);
      const correct = answers.filter(Boolean).length;
      const scorePct = quiz.length ? Math.round((correct / quiz.length) * 100) : null;
      SMU.completeLesson(l.id, scorePct);
      const meta = root.querySelector("#lessonMeta");
      if (meta && !meta.querySelector(".tag.green"))
        meta.insertAdjacentHTML("beforeend", '<span class="tag green">Completed</span>');
      const nx = SMU.nextLesson();
      finishWrap.innerHTML =
        '<div class="card card-hero celebrate" style="text-align:center;padding:26px 18px">' +
        '<div style="font-size:31px">🎓</div>' +
        '<div style="font-family:var(--serif);font-weight:600;font-size:20px;margin-top:7px">Lesson complete</div>' +
        '<div class="small" style="margin:7px 0 18px">' +
        (first
          ? "+" + xp + " XP banked" + (skillLabel ? " · your " + esc(skillLabel) + " skill just moved" : "") + "."
          : "Logged. Repetition is what separates pros from tourists.") +
        "</div>" +
        (nx
          ? '<button class="btn btn-gold btn-block" data-nav="' +
            esc("learn/" + nx.school.id + "/" + nx.course.id + "/" + nx.lesson.id) + '">Next: ' + esc(nx.lesson.title) + "</button>"
          : '<div class="tag gold">Curriculum complete — the rest is reps.</div>') +
        '<button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" data-nav="' + esc("learn/" + sch.id) + '">Back to ' + esc(sch.name || "the school") + "</button>" +
        "</div>";
      if (!nx && !first) SMU.toast("Reviewed. Sharp stays sharp.");
    }
  }

  /* ----- mentor apply sheet (AI with offline fallback) ----- */
  function openApply(hit, nicheLabel) {
    const l = hit.lesson;
    const s = SMU.sheet("Make it yours", '<div id="applyBody"></div>');
    const body = s.el.querySelector("#applyBody");

    if (SMU.ai.hasKey()) {
      body.innerHTML = '<div class="msg ai thinking" style="max-width:100%"><i></i><i></i><i></i></div>';
      const prompt = [
        'I just finished the lesson "' + (l.title || "") + '" in ' + (hit.school.name || "") + " (" + (hit.course.level || "") + " level).",
        "Its key takeaways:",
        (l.takeaways || []).map((t) => "- " + t).join("\n"),
        "",
        "Apply it to MY account this week. Give me: 3 concrete moves tailored to my niche, one ready-to-post example (a hook, caption or shot idea), and the #1 mistake to avoid. Be specific — my niche's vocabulary, not generic advice.",
      ].join("\n");
      SMU.ai.ask(prompt, { maxTokens: 900 })
        .then((text) => {
          body.innerHTML =
            '<div class="msg ai" style="max-width:100%">' + SMU.md(text) + "</div>" +
            '<button class="btn btn-soft btn-block btn-sm" style="margin-top:12px" data-copy="' + esc(text) + '">' + ui.icon("copy") + " Copy plan</button>";
        })
        .catch((e) => {
          body.innerHTML = ui.empty("📡", "The mentor line dropped.", (e && e.message) || "Try again in a moment.");
        });
    } else {
      const acts = l.actions || [];
      body.innerHTML =
        '<div class="callout" style="margin-top:2px"><div class="c-k">The principle</div>' +
        '<div style="font-size:14px;line-height:1.6;color:#efeadd">' + esc((l.takeaways || [])[0] || l.intro || l.title || "") + "</div></div>" +
        (acts.length
          ? '<div class="callout"><div class="c-k">Your ' + esc(nicheLabel) + " moves this week</div>" +
            '<ol style="margin:0 0 0 18px">' + acts.map((a) => '<li style="margin-bottom:6px;color:#efeadd">' + esc(a) + "</li>").join("") + "</ol></div>"
          : "") +
        (l.drill
          ? '<div class="callout"><div class="c-k">Rep it</div><div style="font-size:14px;line-height:1.6;color:#efeadd">' + esc(l.drill) + "</div></div>"
          : "") +
        '<div class="small" style="margin-top:14px;line-height:1.6">This plan is built straight from the lesson. Add your API key and the mentor rewrites it specifically for your ' + esc(nicheLabel) + " brand.</div>" +
        '<button class="btn btn-soft btn-block btn-sm" style="margin-top:10px" id="applyKeyBtn">Add API key in Settings</button>';
      const keyBtn = body.querySelector("#applyKeyBtn");
      if (keyBtn) keyBtn.addEventListener("click", () => { s.close(); SMU.nav("profile"); });
    }
  }

  /* ================= register ================= */
  SMU.views.learn = {
    title: "Learn",
    render(root, params) {
      params = params || (SMU.route && SMU.route.params) || [];
      if (params.length >= 3) renderLesson(root, params[0], params[2]);
      else if (params.length >= 1) renderSchool(root, params[0]);
      else renderHub(root);
    },
  };
})();
