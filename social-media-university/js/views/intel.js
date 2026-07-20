/* ============================================================
   Intel — viral database, creator library, trend intelligence,
   saved inspiration. Routes:
   intel | intel/viral[/id] | intel/creators[/id] | intel/trends[/id] | intel/saved
   ============================================================ */

(function () {
  const esc = SMU.esc, ui = SMU.ui;

  const TABS = [
    ["viral", "Viral"],
    ["creators", "Creators"],
    ["trends", "Trends"],
    ["saved", "Saved"],
  ];
  const NICHE_HUE = { luxury: 42, business: 145, sales: 210, fitness: 0, cars: 258, lifestyle: 320 };
  const DIFF = { 1: "Easy", 2: "Medium", 3: "Hard" };

  const D = () => window.SMU_DATA || {};
  let viralFilter = "all";

  /* ---------- shared bits ---------- */
  function segTabs(active) {
    return (
      '<div class="seg" style="margin:14px 0 18px">' +
      TABS.map(([id, label]) =>
        '<button class="' + (id === active ? "on" : "") + '" data-nav="intel/' + id + '">' + label + "</button>"
      ).join("") +
      "</div>"
    );
  }

  function head(sub) {
    return (
      '<div class="kicker" style="margin-top:10px">Intelligence</div>' +
      '<div class="h-display" style="margin-top:0">Study what <span class="accent">works</span>.</div>' +
      '<p class="h-sub">' + esc(sub) + "</p>"
    );
  }

  function block(label, body) {
    if (!body) return "";
    return (
      '<div style="margin-bottom:16px">' +
      '<div class="kicker" style="margin-bottom:4px;font-size:9.5px">' + esc(label) + "</div>" +
      '<div style="font-size:14.5px;line-height:1.6;color:#e8e4d9">' + esc(body) + "</div></div>"
    );
  }

  function bookmarkHeader(backRoute, backLabel, type, id, label) {
    const saved = SMU.isSaved(type, id);
    return (
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
      ui.backLink(backRoute, backLabel) +
      '<button id="bmBtn" aria-label="Save" style="padding:8px;color:' + (saved ? "var(--gold)" : "var(--faint)") + '">' +
      ui.icon(saved ? "bookmarkFill" : "bookmark") + "</button></div>"
    );
  }
  function bindBookmark(root, type, id, label) {
    const b = root.querySelector("#bmBtn");
    if (!b) return;
    b.addEventListener("click", () => {
      const now = SMU.toggleSave(type, id, label);
      SMU.toast(now ? "Saved to your collection" : "Removed from saved");
      b.style.color = now ? "var(--gold)" : "var(--faint)";
      b.innerHTML = ui.icon(now ? "bookmarkFill" : "bookmark");
    });
  }

  /* ================= viral ================= */
  function renderViralList(root) {
    const items = D().viral || [];
    let html = head("Break down the formats that print views — then film your version.") + segTabs("viral");

    if (!items.length) {
      root.innerHTML = html + ui.empty("🎬", "The viral database is loading.", "Format breakdowns land here shortly.");
      return;
    }

    const niches = [];
    items.forEach((v) => { if (niches.indexOf(v.niche) < 0) niches.push(v.niche); });
    html +=
      '<div class="chips scroll" id="vnChips">' +
      '<button class="chip' + (viralFilter === "all" ? " on" : "") + '" data-n="all">All</button>' +
      niches.map((n) =>
        '<button class="chip' + (viralFilter === n ? " on" : "") + '" data-n="' + esc(n) + '">' +
        esc(SMU.NICHE_LABELS[n] || n) + "</button>"
      ).join("") +
      "</div>";

    const list = viralFilter === "all" ? items : items.filter((v) => v.niche === viralFilter);
    html += '<div style="margin-top:14px">' + list.map((v) => ui.row({
      emoji: v.emoji || "🎬",
      hue: NICHE_HUE[v.niche] != null ? NICHE_HUE[v.niche] : 42,
      title: v.title,
      sub: v.format || "",
      nav: "intel/viral/" + v.id,
      tagText: v.platform + " · " + (DIFF[v.difficulty] || "Medium"),
      tagClass: "hue",
    })).join("") + "</div>";

    root.innerHTML = html;
    root.querySelector("#vnChips").addEventListener("click", (e) => {
      const c = e.target.closest("[data-n]");
      if (!c) return;
      viralFilter = c.dataset.n;
      SMU.views.intel.render(root, ["viral"]);
    });
  }

  function renderViralDetail(root, id) {
    const v = (D().viral || []).find((x) => x.id === id);
    if (!v) { root.innerHTML = ui.backLink("intel/viral", "Viral database") + ui.empty("🎬", "Breakdown not found."); return; }

    const hue = NICHE_HUE[v.niche] != null ? NICHE_HUE[v.niche] : 42;
    let html = bookmarkHeader("intel/viral", "Viral database", "viral", v.id, v.title);
    html +=
      '<div class="row" style="margin-top:10px;align-items:center">' +
      '<div class="icon-tile" style="--hue:' + hue + ';width:56px;height:56px;font-size:27px;border-radius:18px">' + esc(v.emoji || "🎬") + "</div>" +
      '<div class="grow"><div style="font-family:var(--serif);font-weight:600;font-size:23px;line-height:1.15">' + esc(v.title) + "</div></div></div>" +
      '<div class="lesson-meta" style="margin:12px 0 20px">' +
      '<span class="tag hue" style="--hue:' + hue + '">' + esc(SMU.NICHE_LABELS[v.niche] || v.niche) + "</span>" +
      '<span class="tag">' + esc(v.platform || "") + "</span>" +
      '<span class="tag gold">' + (DIFF[v.difficulty] || "Medium") + "</span>" +
      (v.tags || []).slice(0, 3).map((t) => '<span class="tag">' + esc(t) + "</span>").join("") +
      "</div>";

    html += '<div class="card" style="padding:20px">' +
      block("The format", v.format) +
      block("The hook", v.hook) +
      block("First 3 seconds", v.first3) +
      block("Retention engineering", v.retention) +
      block("The edit", v.editing) +
      block("Camera", v.camera) +
      block("Story structure", v.storytelling) +
      block("Emotional trigger", v.emotion) +
      block("Caption", v.caption) +
      block("CTA", v.cta) +
      "</div>";

    if (v.whyItWorks) {
      html += '<div class="callout"><div class="c-k">Why it works</div>' +
        '<div style="font-size:14px;line-height:1.6;color:#efeadd">' + esc(v.whyItWorks) + "</div></div>";
    }
    if (v.recreate && v.recreate.length) {
      html += '<div class="callout"><div class="c-k">Recreate it</div><ol style="margin:0 0 0 18px">' +
        v.recreate.map((s) => '<li style="margin-bottom:7px;color:#efeadd">' + esc(s) + "</li>").join("") +
        "</ol></div>";
    }
    html +=
      '<div class="card card-hero" style="margin-top:18px;text-align:center;padding:22px 18px">' +
      '<div style="font-family:var(--serif);font-weight:600;font-size:17px">Watching is studying. Filming is learning.</div>' +
      '<button class="btn btn-gold btn-sm" style="margin-top:13px" data-nav="studio/shotlist">Film your version today</button></div>';

    root.innerHTML = html;
    bindBookmark(root, "viral", v.id, v.title);
  }

  /* ================= creators ================= */
  function renderCreatorsList(root) {
    const items = D().creators || [];
    let html = head("Eighteen files on the greats. Steal principles, never posts.") + segTabs("creators");
    if (!items.length) {
      root.innerHTML = html + ui.empty("⭐", "Creator files are loading.");
      return;
    }
    html += items.map((c) => ui.row({
      emoji: c.emoji || "⭐",
      hue: NICHE_HUE[c.niche] != null ? NICHE_HUE[c.niche] : 210,
      title: c.name,
      sub: (c.handle ? c.handle + " · " : "") + (c.known || ""),
      nav: "intel/creators/" + c.id,
      tagText: SMU.NICHE_LABELS[c.niche] || c.niche,
      tagClass: "hue",
    })).join("");
    root.innerHTML = html;
  }

  function renderCreatorDetail(root, id) {
    const c = (D().creators || []).find((x) => x.id === id);
    if (!c) { root.innerHTML = ui.backLink("intel/creators", "Creator library") + ui.empty("⭐", "Creator file not found."); return; }

    const hue = NICHE_HUE[c.niche] != null ? NICHE_HUE[c.niche] : 210;
    let html = bookmarkHeader("intel/creators", "Creator library", "creator", c.id, c.name);
    html +=
      '<div class="row" style="margin-top:10px;align-items:center">' +
      '<div class="icon-tile" style="--hue:' + hue + ';width:56px;height:56px;font-size:27px;border-radius:18px">' + esc(c.emoji || "⭐") + "</div>" +
      '<div class="grow"><div style="font-family:var(--serif);font-weight:600;font-size:23px;line-height:1.15">' + esc(c.name) + "</div>" +
      '<div class="small" style="margin-top:3px">' + esc(c.handle || "") + "</div></div></div>" +
      '<div class="lesson-meta" style="margin:12px 0 6px">' +
      (c.platforms || []).map((p) => '<span class="tag">' + esc(p) + "</span>").join("") +
      '<span class="tag hue" style="--hue:' + hue + '">' + esc(SMU.NICHE_LABELS[c.niche] || c.niche) + "</span></div>" +
      (c.known ? '<p class="small" style="margin:6px 0 18px;line-height:1.6">' + esc(c.known) + "</p>" : "");

    html += '<div class="card" style="padding:20px">' +
      block("The brand", c.brand) +
      block("Content style", c.contentStyle) +
      block("The edit", c.editingStyle) +
      block("Storytelling", c.storytelling) +
      block("Growth strategy", c.growth) +
      block("Monetization", c.monetization) +
      block("Audience psychology", c.audience) +
      "</div>";

    if (c.lessons && c.lessons.length) {
      html += '<div class="callout"><div class="c-k">Steal these</div><ul style="margin:0 0 0 18px">' +
        c.lessons.map((x) => '<li style="margin-bottom:7px;color:#efeadd">' + esc(x) + "</li>").join("") +
        "</ul></div>";
    }
    if (c.studyThis) {
      html += '<div class="callout" style="border-color:var(--gold)"><div class="c-k">This week\'s homework</div>' +
        '<div style="font-size:14px;line-height:1.6;color:#efeadd">' + esc(c.studyThis) + "</div></div>";
    }

    root.innerHTML = html;
    bindBookmark(root, "creator", c.id, c.name);
  }

  /* ================= trends ================= */
  function renderTrendsList(root) {
    const items = D().trends || [];
    let html = head("Why each trend works, how to adapt it — and whether it fits your brand.") + segTabs("trends");
    if (!items.length) {
      root.innerHTML = html + ui.empty("📡", "Trend intelligence is loading.");
      return;
    }
    const order = { rising: 0, peak: 1, evergreen: 2 };
    const sorted = items.slice().sort((a, b) => (order[a.status] || 0) - (order[b.status] || 0));
    html += sorted.map((t) => {
      const statusTag =
        t.status === "rising" ? '<span class="tag green">Rising</span>' :
        t.status === "peak" ? '<span class="tag gold">Peak</span>' :
        '<span class="tag">Evergreen</span>';
      return (
        '<div class="card tap" data-nav="' + esc("intel/trends/" + t.id) + '">' +
        '<div class="row"><div class="grow">' +
        '<div class="title">' + esc(t.name) + "</div>" +
        '<div class="sub ellip">' + esc((t.platforms || []).join(" · ")) + "</div>" +
        '<div style="margin-top:8px;display:flex;gap:6px">' + statusTag +
        '<span class="tag">' + esc(t.type || "") + "</span></div>" +
        '</div><span class="chev">' + ui.icon("chev") + "</span></div></div>"
      );
    }).join("");
    root.innerHTML = html;
  }

  function renderTrendDetail(root, id) {
    const t = (D().trends || []).find((x) => x.id === id);
    if (!t) { root.innerHTML = ui.backLink("intel/trends", "Trends") + ui.empty("📡", "Trend not found."); return; }

    let html = bookmarkHeader("intel/trends", "Trends", "trend", t.id, t.name);
    html +=
      '<div style="font-family:var(--serif);font-weight:600;font-size:23px;line-height:1.2;margin-top:10px">' + esc(t.name) + "</div>" +
      '<div class="lesson-meta" style="margin:12px 0 18px">' +
      (t.status === "rising" ? '<span class="tag green">Rising</span>' :
        t.status === "peak" ? '<span class="tag gold">Peak</span>' : '<span class="tag">Evergreen</span>') +
      '<span class="tag">' + esc(t.type || "") + "</span>" +
      (t.platforms || []).map((p) => '<span class="tag">' + esc(p) + "</span>").join("") +
      "</div>" +
      '<div class="card" style="padding:20px">' +
      block("The trend", t.description) +
      block("Why it works", t.whyItWorks) +
      "</div>";

    if (t.adapt && t.adapt.length) {
      html += '<div class="callout"><div class="c-k">Adapt it</div><ol style="margin:0 0 0 18px">' +
        t.adapt.map((s) => '<li style="margin-bottom:7px;color:#efeadd">' + esc(s) + "</li>").join("") +
        "</ol></div>";
    }
    if (t.fitsIf) {
      html += '<div class="card" style="padding:14px 16px;border-color:rgba(126,208,154,.35);background:var(--green-soft)">' +
        '<div class="small" style="color:var(--green);line-height:1.55"><b>Fits you if…</b> ' + esc(t.fitsIf) + "</div></div>";
    }
    if (t.skipIf) {
      html += '<div class="card" style="padding:14px 16px;border-color:rgba(226,105,95,.32);background:var(--red-soft)">' +
        '<div class="small" style="color:var(--red);line-height:1.55"><b>Skip it if…</b> ' + esc(t.skipIf) + "</div></div>";
    }
    if (t.example) {
      html += '<div class="callout" style="margin-top:14px"><div class="c-k">Example execution</div>' +
        '<div style="font-size:14px;line-height:1.6;color:#efeadd">' + esc(t.example) + "</div></div>";
    }

    root.innerHTML = html;
    bindBookmark(root, "trend", t.id, t.name);
  }

  /* ================= saved ================= */
  function renderSaved(root) {
    const items = SMU.state.saved || [];
    let html = head("Your private collection — breakdowns, creators, trends and everything you've generated.") + segTabs("saved");

    if (!items.length) {
      root.innerHTML = html + ui.empty("🔖", "Nothing saved yet.",
        "Tap the bookmark on any breakdown, creator or trend — or save hooks and scripts from the Studio.");
      return;
    }

    const routeOf = { viral: "intel/viral/", creator: "intel/creators/", trend: "intel/trends/" };
    html += items.map((s, i) => {
      if (s.id && routeOf[s.type]) {
        return ui.row({
          emoji: s.type === "viral" ? "🎬" : s.type === "creator" ? "⭐" : "📡",
          hue: 42,
          title: s.label || s.id,
          sub: s.type.charAt(0).toUpperCase() + s.type.slice(1),
          nav: routeOf[s.type] + s.id,
        });
      }
      const text = s.text || "";
      return (
        '<div class="card" style="padding:15px 16px">' +
        '<div style="display:flex;gap:10px;align-items:flex-start">' +
        '<div class="grow"><span class="tag gold" style="margin-bottom:7px;display:inline-block">' + esc(s.type) + "</span>" +
        '<div style="font-size:14px;line-height:1.55;white-space:pre-wrap;overflow-wrap:break-word">' + esc(text) + "</div></div>" +
        '<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:6px">' +
        '<button style="padding:7px;color:var(--muted)" data-copy="' + esc(text) + '" aria-label="Copy">' + ui.icon("copy") + "</button>" +
        '<button style="padding:7px 9px;color:var(--faint);font-size:15px" data-rm="' + i + '" aria-label="Remove">✕</button>' +
        "</div></div></div>"
      );
    }).join("");

    root.innerHTML = html;
    root.querySelectorAll("[data-rm]").forEach((b) => {
      b.addEventListener("click", () => {
        SMU.state.saved.splice(+b.dataset.rm, 1);
        SMU.save();
        SMU.toast("Removed");
        SMU.views.intel.render(root, ["saved"]);
      });
    });
  }

  /* ================= register ================= */
  SMU.views.intel = {
    title: "Intel",
    render(root, params) {
      params = params || (SMU.route && SMU.route.params) || [];
      const tab = params[0] || "viral";
      const id = params[1];
      if (tab === "viral") return id ? renderViralDetail(root, id) : renderViralList(root);
      if (tab === "creators") return id ? renderCreatorDetail(root, id) : renderCreatorsList(root);
      if (tab === "trends") return id ? renderTrendDetail(root, id) : renderTrendsList(root);
      if (tab === "saved") return renderSaved(root);
      return renderViralList(root);
    },
  };
})();
