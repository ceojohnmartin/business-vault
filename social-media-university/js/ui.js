/* ============================================================
   SMU ui — shared components: icons, toast, sheet, rings,
   radar chart, xp burst, copy. Views build HTML strings and use
   these helpers; global click delegation lives in app.js.
   ============================================================ */

window.SMU = window.SMU || {};
SMU.ui = (function () {
  const esc = (s) => SMU.esc(s);

  /* ---------- icons (stroke = currentColor) ---------- */
  const I = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.4"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"/></svg>',
    learn: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 9.2 12 4.6l9.2 4.6L12 13.8 2.8 9.2Z"/><path d="M6.5 11.5v4.6c0 1.2 2.5 2.6 5.5 2.6s5.5-1.4 5.5-2.6v-4.6"/><path d="M21.2 9.6v5"/></svg>',
    coach: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 13.9 8.6 19.3 10.5 13.9 12.4 12 17.8 10.1 12.4 4.7 10.5 10.1 8.6 12 3.2Z"/><path d="M18.8 15.8l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></svg>',
    studio: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="5.4" width="13.4" height="13.2" rx="2.6"/><path d="m16.6 10.2 4.2-2.6v8.8l-4.2-2.6"/><circle cx="7.6" cy="9.8" r="1.5"/></svg>',
    intel: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.8"/><path d="M12 12 17 7.2"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M12 3.2v3M20.8 12h-3"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 5.5-6.5 6.5 6.5 6.5"/></svg>',
    chev: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 5.5 6.5 6.5-6.5 6.5"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6 12l6-6 6 6"/></svg>',
    check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"/></svg>',
    bookmark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.8h11a.7.7 0 0 1 .7.7v15.7L12 16.6l-6.2 3.6V4.5a.7.7 0 0 1 .7-.7Z"/></svg>',
    bookmarkFill: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.8h11a.7.7 0 0 1 .7.7v15.7L12 16.6l-6.2 3.6V4.5a.7.7 0 0 1 .7-.7Z"/></svg>',
    copy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8.6" y="8.6" width="11" height="11" rx="2.2"/><path d="M15.4 5.4v-.3A2.1 2.1 0 0 0 13.3 3H6.1A2.1 2.1 0 0 0 4 5.1v7.2a2.1 2.1 0 0 0 2.1 2.1h.3"/></svg>',
  };
  function icon(name) { return I[name] || ""; }

  /* ---------- toast ---------- */
  let toastEl = null, toastTimer = null;
  function toast(msg) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    toastEl.textContent = msg;
    document.body.appendChild(toastEl);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (!toastEl) return;
      toastEl.classList.add("out");
      setTimeout(() => { if (toastEl) { toastEl.remove(); toastEl = null; } }, 320);
    }, 2100);
  }

  /* ---------- xp burst ---------- */
  function xpBurst(n) {
    const el = document.createElement("div");
    el.className = "xp-burst";
    el.textContent = "+" + n + " XP";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  /* ---------- bottom sheet ---------- */
  function sheet(title, bodyHTML, opts) {
    opts = opts || {};
    const veil = document.createElement("div");
    veil.className = "sheet-veil";
    veil.innerHTML =
      '<div class="sheet" role="dialog" aria-modal="true">' +
      '<div class="sheet-grab"></div>' +
      (title ? '<div class="sheet-title">' + esc(title) + "</div>" : "") +
      '<div class="sheet-body">' + bodyHTML + "</div></div>";
    function close() {
      veil.style.opacity = "0";
      veil.style.transition = "opacity .22s";
      setTimeout(() => veil.remove(), 220);
      document.body.style.overflow = "";
    }
    veil.addEventListener("click", (e) => { if (e.target === veil && !opts.sticky) close(); });
    document.body.appendChild(veil);
    document.body.style.overflow = "hidden";
    return { el: veil.querySelector(".sheet-body"), close, veil };
  }

  /* ---------- progress ring ---------- */
  function ring(pct, size, label, sub) {
    size = size || 92;
    const sw = Math.max(6, Math.round(size * 0.085));
    const r = (size - sw) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
    return (
      '<span class="ring-wrap" style="width:' + size + "px;height:" + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '">' +
      '<circle class="ring-bg" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + sw + '"/>' +
      '<circle class="ring-fg" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + sw +
      '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
      '<span class="ring-label" style="font-size:' + Math.round(size * 0.2) + 'px">' + esc(label != null ? label : pct + "%") +
      (sub ? '<div style="font-size:9px;color:var(--faint);font-weight:600;letter-spacing:.06em">' + esc(sub) + "</div>" : "") +
      "</span></span>"
    );
  }

  /* ---------- skill radar (8 axes) ---------- */
  function radar(skills, size) {
    size = size || 250;
    const keys = Object.keys(SMU.SKILL_LABELS);
    const cx = size / 2, cy = size / 2, R = size / 2 - 34;
    const max = Math.max(100, ...keys.map((k) => skills[k] || 0));
    const pt = (i, v) => {
      const a = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
      return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
    };
    let gridRings = "";
    [0.25, 0.5, 0.75, 1].forEach((g) => {
      const pts = keys.map((_, i) => pt(i, g).map((n) => n.toFixed(1)).join(",")).join(" ");
      gridRings += '<polygon points="' + pts + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="1"/>';
    });
    let spokes = "", labels = "";
    keys.forEach((k, i) => {
      const [x, y] = pt(i, 1);
      spokes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="rgba(255,255,255,.05)"/>';
      let [lx, ly] = pt(i, 1.17);
      lx = Math.max(34, Math.min(size - 34, lx));
      labels += '<text class="radar-label" x="' + lx.toFixed(1) + '" y="' + (ly + 3).toFixed(1) + '" text-anchor="middle">' + esc(SMU.SKILL_LABELS[k]) + "</text>";
    });
    const valPts = keys.map((k, i) => {
      const v = Math.max(0.035, Math.min(1, (skills[k] || 0) / max));
      return pt(i, v).map((n) => n.toFixed(1)).join(",");
    }).join(" ");
    return (
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '">' +
      gridRings + spokes +
      '<polygon points="' + valPts + '" fill="rgba(217,179,108,.22)" stroke="url(#goldGrad)" stroke-width="2" stroke-linejoin="round"/>' +
      labels + "</svg>"
    );
  }

  /* ---------- building blocks ---------- */
  function bar(pct, thin) {
    return '<div class="bar' + (thin ? " thin" : "") + '"><i style="width:' + Math.min(100, Math.max(0, pct)) + '%"></i></div>';
  }

  function row(o) {
    // o: {emoji, hue, title, sub, nav, tagText, tagClass, right, done}
    return (
      '<div class="card tap" ' + (o.nav ? 'data-nav="' + esc(o.nav) + '"' : "") + ">" +
      '<div class="row">' +
      (o.emoji != null
        ? '<div class="icon-tile" style="--hue:' + (o.hue != null ? o.hue : 42) + '">' + esc(o.emoji) + "</div>"
        : "") +
      '<div class="grow">' +
      '<div class="title">' + esc(o.title) +
      (o.done ? ' <span class="tag green" style="vertical-align:2px">' + icon("check") + "</span>" : "") +
      "</div>" +
      (o.sub ? '<div class="sub ellip">' + esc(o.sub) + "</div>" : "") +
      (o.tagText ? '<div style="margin-top:6px"><span class="tag ' + (o.tagClass || "") + '">' + esc(o.tagText) + "</span></div>" : "") +
      "</div>" +
      (o.right != null ? '<div style="flex:0 0 auto">' + o.right + "</div>" : '<span class="chev">' + icon("chev") + "</span>") +
      "</div></div>"
    );
  }

  function backLink(route, label) {
    return '<button class="back-link" data-nav="' + esc(route) + '">' + icon("back") + esc(label || "Back") + "</button>";
  }

  function sectionHead(title, moreRoute, moreLabel) {
    return (
      '<div class="h-sec"><span class="t">' + esc(title) + "</span>" +
      (moreRoute ? '<button class="more" data-nav="' + esc(moreRoute) + '">' + esc(moreLabel || "See all") + "</button>" : "") +
      "</div>"
    );
  }

  function empty(ico, text, sub) {
    return '<div class="empty"><div class="e-ico">' + esc(ico) + "</div><div>" + esc(text) + "</div>" +
      (sub ? '<div class="small" style="margin-top:6px">' + esc(sub) + "</div>" : "") + "</div>";
  }

  /* ---------- clipboard ---------- */
  function copy(text, msg) {
    const done = () => toast(msg || "Copied to clipboard");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallback());
    } else fallback();
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("Couldn't copy"); }
      ta.remove();
    }
  }

  return { icon, toast, xpBurst, sheet, ring, radar, bar, row, backLink, sectionHead, empty, copy };
})();

SMU.toast = SMU.ui.toast;
SMU.sheet = SMU.ui.sheet;
SMU.copy = SMU.ui.copy;
