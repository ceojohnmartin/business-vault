/* RALLY — UI primitives: sheets, toast, celebration, formatting. */
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // ---------- bottom sheets ----------
  let openSheetId = null;
  function openSheet(id) {
    closeSheet();
    const el = $("#" + id);
    if (!el) return;
    $("#veil").classList.add("open");
    el.classList.add("open");
    openSheetId = id;
  }
  function closeSheet() {
    if (!openSheetId) return;
    const el = $("#" + openSheetId);
    if (el) el.classList.remove("open");
    $("#veil").classList.remove("open");
    openSheetId = null;
  }

  // ---------- toast ----------
  let toastTimer = null;
  function toast(msg, ms) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), ms || 2400);
  }

  // ---------- haptics: one grammar — tick for select, success for a sale ----------
  const canBuzz = "vibrate" in navigator;
  const tick = () => { if (canBuzz) navigator.vibrate(8); };
  const buzzSuccess = () => { if (canBuzz) navigator.vibrate([18, 60, 30, 60, 60]); };

  // ---------- the sale celebration ----------
  function celebrate(commission, name) {
    const el = $("#celebrate");
    $("#cel-comm").textContent = commission > 0 ? "+" + fmtMoney(commission) + " commission" : "";
    $("#cel-sub").textContent = name ? name + " is on the books. It syncs from here." : "On the books. It syncs from here.";
    el.classList.add("show");
    buzzSuccess();
    confettiBurst();
    const dismiss = () => { el.classList.remove("show"); el.removeEventListener("click", dismiss); };
    el.addEventListener("click", dismiss);
    setTimeout(dismiss, 3800);
  }

  function confettiBurst() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = $("#confetti");
    const ctx = cv.getContext("2d");
    const W = (cv.width = innerWidth * devicePixelRatio);
    const H = (cv.height = innerHeight * devicePixelRatio);
    const colors = ["#22B558", "#17181A", "#9AA1AB", "#F5B301", "#FFFFFF"];
    const parts = Array.from({ length: 130 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.25,
      y: H * 0.42,
      vx: (Math.random() - 0.5) * 22 * devicePixelRatio,
      vy: (-8 - Math.random() * 14) * devicePixelRatio,
      s: (3 + Math.random() * 5) * devicePixelRatio,
      c: colors[(Math.random() * colors.length) | 0],
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    }));
    let frames = 0;
    (function step() {
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.55 * devicePixelRatio; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (++frames < 130) requestAnimationFrame(step);
      else ctx.clearRect(0, 0, W, H);
    })();
  }

  // ---------- formatting ----------
  const fmtMoney = (n) =>
    "$" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
  const fmtPct = (a, b) => (b > 0 ? Math.round((a / b) * 100) + "%" : "—");
  function fmtAgo(ts) {
    const d = Date.now() - ts;
    if (d < 60e3) return "just now";
    if (d < 3600e3) return Math.round(d / 60e3) + "m ago";
    if (d < 86400e3) return Math.round(d / 3600e3) + "h ago";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  const dayKey = (ts) => {
    const d = new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  const fmtDate = (ts) =>
    new Date(ts).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  const fmtTime = (ts) =>
    new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // value for a datetime-local input, in device-local time
  const toLocalInput = (ts) => {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  // Hand off to the phone's own apps — the integrations that always work
  const telHref = (phone) => "tel:" + String(phone).replace(/[^\d+]/g, "");
  const smsHref = (phone) => "sms:" + String(phone).replace(/[^\d+]/g, "");
  // Directions in the native maps app: address when we have one (better
  // geocoding), raw coordinates otherwise. Apple devices get Apple Maps.
  const navUrl = (lat, lng, addr) => {
    const q = addr && addr.trim()
      ? encodeURIComponent(addr.trim())
      : lat.toFixed(6) + "," + lng.toFixed(6);
    return /iPhone|iPad|Macintosh/.test(navigator.userAgent)
      ? "https://maps.apple.com/?daddr=" + q
      : "https://www.google.com/maps/dir/?api=1&destination=" + q;
  };

  // Get a file to the user: iOS home-screen apps silently ignore
  // <a download>, so the share sheet is the primary path with a blob
  // anchor as the desktop fallback. Returns true unless nothing worked.
  async function shareOrDownload(content, filename, mime, title) {
    if (navigator.canShare && window.File) {
      try {
        const file = new File([content], filename, { type: mime });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: title || filename });
          return true;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return true; // user closed the sheet
      }
    }
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  }

  window.MUI = { $, $$, openSheet, closeSheet, toast, tick, celebrate, fmtMoney, fmtPct, fmtAgo, dayKey, fmtDate, fmtTime, esc, toLocalInput, shareOrDownload, telHref, smsHref, navUrl };
})();
