/* RALLY — the entry sequence: splash, then the device gate.
   Both are opaque overlays above #app, so the app boots underneath
   undisturbed and simply gets revealed once the device is unlocked. */
(function () {
  const { $, $$, tick } = MUI;

  let mode = "signin";       // "signin" | "signup"
  let remember = false;
  let resolveUnlock = null;
  let busy = false;
  let armedErase = false;    // "forgot" is a two-tap confirm, never one
  let eraseTimer = null;

  const el = {};
  function cache() {
    ["splash", "splash-fill", "gate", "gate-form", "gate-title", "gate-sub",
     "gf-name", "gate-name", "gate-email", "gate-pass", "gate-eye",
     "gate-row-signin", "gate-remember", "gate-forgot", "gate-msg",
     "gate-submit", "gate-swap-btn", "gate-swap", "gate-foot"].forEach((id) => {
      el[id] = $("#" + id);
    });
  }

  // The erase confirm is only live while its warning is actually on screen.
  // Anything else the user does — submitting, swapping mode, or simply
  // waiting — takes the safety back off.
  function disarmErase() {
    armedErase = false;
    if (eraseTimer) { clearTimeout(eraseTimer); eraseTimer = null; }
  }

  function msg(text, ok) {
    const m = el["gate-msg"];
    m.hidden = !text;
    m.textContent = text || "";
    m.classList.toggle("ok", !!ok);
  }

  function setMode(m) {
    mode = m;
    disarmErase();
    msg("");
    const up = m === "signup";
    el["gate-title"].textContent = up ? "Create account" : "Sign in";
    el["gate-sub"].textContent = up
      ? "Locks RALLY to this device. Anything already saved here stays."
      : "Welcome back. Let’s get to work.";
    el["gf-name"].hidden = !up;
    el["gate-row-signin"].hidden = up;
    el["gate-submit"].textContent = up ? "Create account" : "Log in";
    el["gate-swap-btn"].textContent = up ? "Back to sign in" : "Sign up";
    el["gate-foot"].hidden = up;
    el["gate-pass"].setAttribute("autocomplete", up ? "new-password" : "current-password");
    el["gate-pass"].placeholder = up ? `Passcode (${MAUTH.MIN_PASS}+ characters)` : "Passcode";
    // Once a device is claimed there is no sign-up route — the only ways in
    // are the passcode or the (destructive, two-tap) reset.
    const claimed = MAUTH.hasAccount();
    el["gate-swap-btn"].hidden = claimed;
    el["gate-foot"].hidden = up || claimed;
    // …and with no account there is no passcode to forget yet
    el["gate-forgot"].hidden = !claimed;
    if (!up && MAUTH.emailOnFile()) el["gate-email"].value = MAUTH.emailOnFile();
  }

  async function submit() {
    if (busy) return;
    busy = true;
    disarmErase();
    el["gate-submit"].disabled = true;
    msg("");
    const email = el["gate-email"].value;
    const pass = el["gate-pass"].value;
    const name = el["gate-name"].value;
    try {
      if (mode === "signup") await MAUTH.signUp({ email, name, password: pass });
      else await MAUTH.signIn(email, pass, remember);
      el["gate-pass"].value = "";
      unlock();
    } catch (err) {
      msg((err && err.message) || "Something went wrong — try again");
      el["gate-pass"].select && el["gate-pass"].select();
    } finally {
      busy = false;
      el["gate-submit"].disabled = false;
    }
  }

  function unlock() {
    const g = el.gate;
    g.classList.add("fade");
    setTimeout(() => { g.hidden = true; g.classList.remove("fade"); }, 460);
    if (resolveUnlock) { const r = resolveUnlock; resolveUnlock = null; r(); }
  }

  function bind() {
    el["gate-form"].addEventListener("submit", (e) => { e.preventDefault(); submit(); });

    el["gate-eye"].addEventListener("click", () => {
      const shown = el["gate-pass"].type === "text";
      el["gate-pass"].type = shown ? "password" : "text";
      el["gate-eye"].setAttribute("aria-pressed", String(!shown));
      el["gate-eye"].setAttribute("aria-label", shown ? "Show passcode" : "Hide passcode");
    });

    el["gate-remember"].addEventListener("click", () => {
      tick();
      remember = !remember;
      el["gate-remember"].setAttribute("aria-checked", String(remember));
    });

    const swap = () => { tick(); setMode(mode === "signin" ? "signup" : "signin"); };
    el["gate-swap-btn"].addEventListener("click", swap);
    el["gate-swap"].addEventListener("click", swap);

    // No server, so no reset link — the honest recovery is a backup file.
    el["gate-forgot"].addEventListener("click", () => {
      tick();
      if (!MAUTH.hasAccount()) {
        msg("There’s no passcode on this device yet — create an account below");
        return;
      }
      if (!armedErase) {
        armedErase = true;
        // the arm expires on its own: a warning the rep has scrolled past
        // must never make the NEXT tap destructive
        eraseTimer = setTimeout(disarmErase, 10000);
        msg("RALLY stores your work on this device, not on a server — so there’s " +
            "no reset email to send. If you have a backup file you can erase this " +
            "device and restore it. Tap again to erase everything here.");
        return;
      }
      disarmErase();
      MAUTH.eraseAndReset()
        .then(() => location.reload())
        .catch(() => msg("Couldn’t erase — try again"));
    });
  }

  function animateSplash(ms) {
    const fill = el["splash-fill"];
    if (!fill) return Promise.resolve();
    requestAnimationFrame(() => { fill.style.width = "72%"; });
    return new Promise((r) => setTimeout(r, ms));
  }

  /* Runs between "storage is ready" and "the app is usable".
     Resolves once the device is unlocked (or when there's nothing to
     unlock). Never rejects — a broken gate must not strand the rep. */
  async function run() {
    cache();
    bind();
    const shown = Date.now();
    // WebCrypto is required to hash a passcode; without it (an insecure
    // context) we do NOT pretend to lock anything.
    const canHash = !!(window.crypto && crypto.subtle && crypto.getRandomValues);
    let gated = false;
    try {
      if (canHash) {
        await MAUTH.load();
        gated = !MAUTH.isUnlocked();
      }
    } catch (_) { gated = false; }

    await animateSplash(Math.max(0, 950 - (Date.now() - shown)));
    const fill = el["splash-fill"];
    if (fill) fill.style.width = "100%";
    await new Promise((r) => setTimeout(r, 180));

    // hand off cleanly: the splash finishes fading and leaves before the
    // gate appears, so the two never overlap on screen
    const sp = el.splash;
    sp.classList.add("fade");
    await new Promise((r) => setTimeout(r, 470));
    sp.hidden = true;
    sp.classList.remove("fade");

    if (!gated) return;

    setMode(MAUTH.hasAccount() ? "signin" : "signup");
    el.gate.hidden = false;
    requestAnimationFrame(() => {
      const first = MAUTH.hasAccount() ? el["gate-pass"] : el["gate-name"];
      try { first.focus({ preventScroll: true }); } catch (_) {}
    });
    return new Promise((r) => { resolveUnlock = r; });
  }

  // Sign out from More: re-arms the gate without touching any data.
  async function lock() {
    await MAUTH.signOut();
    location.reload();
  }

  // Failsafe: if boot dies before the gate ever runs, the splash must not
  // become a permanent wall. After 12s, reveal whatever is underneath.
  setTimeout(() => {
    const sp = document.getElementById("splash");
    const g = document.getElementById("gate");
    if (sp && !sp.hidden && g && g.hidden) {
      sp.hidden = true;
      console.warn("RALLY: boot stalled — splash released by failsafe");
    }
  }, 12000);

  window.MGATE = { run, lock };
})();
