/* RALLY — the knocking map.

   THIS FILE NO LONGER DRAWS ANYTHING. It decides WHAT the map should
   show — which door is which colour, whose turf is emphasised, what a tap
   means, what the knock sheet says — and hands the result to a renderer
   as plain GeoJSON. Two renderers implement that contract:

     js/map-render-mk.js   Apple MapKit, satellite. The primary experience.
     js/map-render-gl.js   MapLibre over Google tiles. The fallback, and
                           the only one that works with no signal and no
                           Apple account.

   js/map-engine.js picks between them and hands one back here as R.

   THE SEAM IS GEOJSON AND LNG/LAT, deliberately. Everything a renderer is
   told is data RALLY already had, and nothing is ever read back out of an
   engine and kept — which is why swapping engines mid-session loses
   nothing: the pins, the territories, the selected door, the draft ring
   and the queued knocks all live here and in STORE, and re-issuing four
   calls repaints the lot.

   What stays here: the knock sheet, the property card, quick outcomes,
   the CRM rows, the brand panel, the Google session and its error
   wording. None of that is a map, and none of it should be written
   twice. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, tick } = MUI;
  const D = MDATA.DISPOSITIONS;

  /* THE ACTIVE RENDERER. Null until MENGINE.boot() answers, and null
     again if BOTH engines fail — every call site checks, because a
     device with no map must still be able to knock from Street Mode and
     the Customers list. */
  let R = null;
  const clickHandlers = []; // MMAP.onMapClick registrations, first-consume-wins
  /* MMAP.onMapMove registrations. The vertex editor draws its handles as
     HTML over the canvas, so it needs to know when the camera moved in
     order to re-pin them — without that, a pan would leave every handle
     floating where the corner used to be. It is a notification, not a
     hook: nothing here can steer the camera. */
  const moveHandlers = [];
  let selectedPinId = "";
  let knock = null; // {mode:'new'|'re', lat, lng, pinId, disposition, reason, dm}
  let currentLead = null;
  let lastGoogleError = ""; // Google's own explanation when imagery is refused
  let wiringP = null;
  let engineNote = null;   // what MENGINE decided, for Settings and the tests
  let stripHoodId = null;       // in-flight imagery wire-up, shared by all callers


  // ---------- Google imagery (Map Tiles API) ----------
  // the office key ships built in; a device key wins if a rep sets one
  const effectiveKey = () =>
    (STORE.settings.googleKey || MDATA.DEFAULT_GOOGLE_KEY || "").trim();

  const tileUrl = (sess) =>
    `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}` +
    `?session=${encodeURIComponent(sess)}&key=${encodeURIComponent(effectiveKey())}`;

  async function googleSession() {
    const s = STORE.settings;
    const gkey = effectiveKey();
    if (!gkey) { lastGoogleError = "No Google key on this device"; return null; }
    const cached = s.googleSessions && s.googleSessions.hybrid;
    if (cached && Number(cached.expiry) * 1000 > Date.now() + 3600e3) return cached.session;
    try {
      // never let a hanging request freeze the map or the settings screen
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      let r;
      try {
        r = await fetch(
          "https://tile.googleapis.com/v1/createSession?key=" + encodeURIComponent(gkey),
          { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mapType: "satellite", layerTypes: ["layerRoadmap"],
              language: "en-US", region: "US",
              highDpi: true, scale: "scaleFactor2x",
            }),
            signal: ctrl.signal }
        );
      } finally {
        clearTimeout(t);
      }
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !j.session) {
        // Surface Google's own words — "enable the API", "billing", "bad key" —
        // so the fix is obvious instead of a dead end.
        lastGoogleError = (j && j.error && j.error.message) || ("HTTP " + r.status);
        // an expired session still matches the tile cache → stale imagery beats none
        return cached ? cached.session : null;
      }
      lastGoogleError = "";
      s.googleSessions = Object.assign({}, s.googleSessions, {
        hybrid: { session: j.session, expiry: j.expiry },
      });
      STORE.saveSettings();
      return j.session;
    } catch (err) {
      lastGoogleError = !navigator.onLine
        ? "Offline — imagery returns when you reconnect"
        : (err && err.name === "AbortError")
          ? "Google didn't respond in time — try again"
          : "Couldn't reach Google — check your connection";
      return cached ? cached.session : null;
    }
  }

  // Wire (or re-wire) the Google layer. Runs on style load, when the key
  // changes, and when the device comes back online. Concurrent callers
  // share one in-flight attempt so a busy moment never reads as a bad key.
  function reloadImagery() {
    if (wiringP) return wiringP;
    wiringP = wireImagery().finally(() => { wiringP = null; });
    return wiringP;
  }

  /* THE SESSION IS RALLY'S; THE RASTER SOURCE IS THE ENGINE'S.

     Under MapKit there is nothing to wire at all — Apple's satellite IS
     the base map — so this reports what the renderer says and stops. It
     does not fetch a Google session on a MapKit device, because that
     would spend a quota and a round trip on imagery nothing will draw. */
  async function wireImagery() {
    const gattr = $("#gattr");
    if (!R) return false;
    if (R.name !== "maplibre") {
      /* Apple's imagery, Apple's attribution (MapKit draws its own).
         Google's error line is left alone: it belongs to the Google path
         and must not start reporting Apple's authorisation problems. */
      const im = R.imagery();
      if (gattr) gattr.hidden = true;
      updateNetHint(im.live);
      return im.live;
    }
    const sess = await googleSession();
    const ok = sess ? R.setImagery({ url: tileUrl(sess) }) : false;
    /* Google's on-screen attribution is a provider requirement whenever
       Google imagery is live — the one DOM line the engine move dropped. */
    if (gattr) gattr.hidden = !ok;
    updateNetHint(ok);
    return ok;
  }


  function updateNetHint(haveImagery) {
    const el = $("#net-hint");
    if (!el) return;
    el.hidden = haveImagery || !!(R && R.imagery().live);
    if (!el.hidden) {
      el.textContent = navigator.onLine
        ? (lastGoogleError || "Loading imagery…")
        : "Offline — knocked areas still work; imagery returns with signal";
    }
  }


  /* THE PIN, v42 — COMPACT, WHITE-HALOED, AIMED AT THE BUILDING.

     Three changes from the glossy version, all of them about reading a pin
     ON SATELLITE PHOTOGRAPHY rather than on flat cartography:

       1. A WHITE HALO. Roofs, driveways and lawns run the whole tonal
          range, so a coloured rim disappears against something. A white
          ring plus a soft drop shadow separates the pin from ANY imagery
          underneath, which is what makes a dense street readable.
       2. LESS GLOSS. The heavy 3D bloom read as a game asset next to Apple
          and Google's own map furniture. A single soft vertical gradient
          keeps the form without the shine.
       3. SMALLER, WITH A LONGER TIP. The point is the claim about which
          BUILDING this is — the head can shrink for density as long as the
          tip stays sharp and anchored.

     Everything is still drawn at 2x on canvas and registered as a map

  /* NOT-HOME DEPTH. A door nobody answered once and a door nobody answered
     four times are not the same prospect, and a rep walking past should be
     able to tell without opening anything. So not-home darkens toward
     orange with each attempt IN THE CURRENT CYCLE — a fresh pass starts
     every door back at one. Two extra images, keyed like any other. */


  /* THE ONE PLACE A DOOR'S COLOUR IS DECIDED.

     What is painted is the EFFECTIVE outcome, not the stored scalar: after
     a Clear Outcomes the doors worked before the boundary read unworked
     again, while a do-not-knock stays black and a signed household stays
     green. Nothing was rewritten to make that happen — the boundary is one
     timestamp and this is derived from it at paint time, which is why the
     reset is instant on a hood of any size and why it cannot be half-done.

     The door facts index is built ONCE per repaint and shared across every
     pin; building it per pin would be quadratic on a real book. */
  function pinsGeoJSON() {
    const facts = STORE.doorFacts ? STORE.doorFacts() : null;
    // one membership pass for the whole repaint, not one per door
    const hoods = facts && STORE.hoodIndex ? STORE.hoodIndex(facts) : null;
    const key = (p) => {
      if (!facts) return p.disposition;
      const hood = hoods ? hoods.get(p.id) : STORE.hoodOf(p);
      const eff = STORE.effectiveDisposition(p, hood, facts);
      if (eff !== "nothome") return eff;
      const n = STORE.nhDepth(p, hood, facts);
      return n >= 3 ? "nothome3" : n === 2 ? "nothome2" : "nothome";
    };
    return {
      type: "FeatureCollection",
      features: STORE.pins.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id, disposition: key(p),
          cbdue: p.callbackAt && p.callbackAt <= Date.now() ? 1 : 0,
        },
      })),
    };
  }

  // ---------- hoods (territories) ----------
  let heatMode = false;      // manager layer: color by freshness, not ownership
  let emphasizeRep = null;   // manager tapped a rep — everyone else fades

  function hoodsGeoJSON() {
    const me = STORE.currentUser();
    const manager = STORE.seesWholeTeam();
    return {
      type: "FeatureCollection",
      features: STORE.activeTerritories()
        .filter((t) => t.points && t.points.length >= 3)
        .map((t) => {
          /* WHO IS ON IT — the whole set, not the first name. A hood can
             have several reps (a shared turf), and `assignedTo` is only
             the FIRST of them: reading it here faded a rep's OWN hood on
             their own map whenever a teammate had been put on it before
             them, and a manager focusing that rep saw the hood fade too. */
          const crew = STORE.currentAssignees(t);
          const names = crew.map((id) => (STORE.userById(id) || {}).name).filter(Boolean);
          // reps see their own turf full-strength; the rest of the market
          // stays visible but faded — "THIS is my area" at a glance.
          // A manager focusing one rep gets the same fade on everyone else.
          const dim = manager
            ? (emphasizeRep && crew.indexOf(emphasizeRep) < 0 ? 1 : 0)
            : (!me || crew.indexOf(me.id) < 0 ? 1 : 0);
          return {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[...t.points, t.points[0]]] },
            properties: {
              id: t.id, name: STORE.hoodLabel(t),
              rep: names.join(", "),
              /* TURF IS BLUE ON THE REP MAP, and only on the rep map.

                 A rep sees exactly one thing here — their own area — so a
                 per-rep colour communicates nothing to them and costs a
                 colour that then cannot mean anything else. Blue is
                 RALLY's interaction colour; the blue shape IS "yours".

                 A MANAGER still gets the per-rep palette, because telling
                 four reps' areas apart is the entire job of that view. */
              color: manager ? STORE.hoodColor(t) : "#0A84FF",
              fresh: heatMode ? STORE.freshness(t).color : "#000",
              dim,
            },
          };
        }),
    };
  }

  function setHeatMode(on) {
    heatMode = !!on;
    refreshHoods();   // one repaint decides colour, opacity AND the label gate
  }


  function clearEmphasis() {
    if (!emphasizeRep) return;
    emphasizeRep = null;
    refreshHoods();
  }




  // labels ride ABOVE the pins (added after them): the dark halo keeps the
  // name readable over the densest pin clutter, which is exactly where
  /* THE LABEL IS A MANAGER'S TOOL, NOT A REP'S.

     A rep sees one blue area and it is theirs; writing "Territory 12 /
     John Martin" across the middle of it tells them nothing they do not
     know and costs the imagery they are actually reading. A MANAGER
     looking at four areas needs to tell them apart, so the label exists
     and this decides who gets it. Freshness is a manager view too, and
     there the label is how you tell which area a colour belongs to.

     It is computed on EVERY repaint rather than toggled, because a
     demotion has to take it away now: the role door calls refreshHoods(),
     and a gate that only a heat toggle could reach left a just-demoted
     rep reading a manager's label over their houses. */
  const labelsAllowed = () => STORE.canManageTerritories() || heatMode;

  const emptyFC = () => ({ type: "FeatureCollection", features: [] });

  function refreshHoods() {
    if (!R) return;
    R.setHoods(hoodsGeoJSON(), { heat: heatMode, labels: labelsAllowed() });
    const hl = $("#heat-legend");
    if (hl) hl.hidden = !heatMode;
    updateHint(); // swaps the disposition legend out while heat is on
  }

  function refreshPins() {
    if (R) R.setPins(pinsGeoJSON(), selectedPinId);
    updateHint();
    updateBrandToday();
  }

  function setSelected(id) {
    selectedPinId = id || "";
    if (R) R.setSelected(selectedPinId);
  }

  // ---------- the outline being drawn (owned here so hoods.js never
  // touches an engine; the renderer decides how a dashed ring is drawn) ----
  let draftDots = [];

  function setDraftRing(dots) {
    draftDots = Array.isArray(dots) ? dots : [];
    if (R) R.setDraft(draftDots);
  }

  // ---------- re-knock route ----------
  function showRoute(pins) {
    if (!R) return;
    R.setRoute({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {},
          geometry: { type: "LineString", coordinates: pins.map((p) => [p.lng, p.lat]) } },
        ...pins.map((p, i) => ({
          type: "Feature", properties: { n: String(i + 1) },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        })),
      ],
    });
  }

  function clearRoute() { if (R) R.setRoute(emptyFC()); }

  // ---------- camera helpers ----------
  function focusRep(userId) {
    const hoods = STORE.hoodsOf(userId).filter((t) => t.points && t.points.length);
    if (!R || !hoods.length) { toast("No hoods assigned yet — give them one"); return; }
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    hoods.forEach((t) => t.points.forEach(([lng, lat]) => {
      minX = Math.min(minX, lng); maxX = Math.max(maxX, lng);
      minY = Math.min(minY, lat); maxY = Math.max(maxY, lat);
    }));
    emphasizeRep = userId;
    refreshHoods();
    R.fitBounds([[minX, minY], [maxX, maxY]], 70, 16.5);
  }

  // jump from a customer card to their door on the map
  function focusPin(pinId) {
    const p = STORE.pins.find((x) => x.id === pinId);
    if (!p) return;
    if (R) {
      R.resize();
      R.easeTo({
        lng: p.lng, lat: p.lat, zoom: Math.max(R.getZoom(), 17.5),
        // the property card covers ~2/3 of the screen — put the pin in the
        // strip above it
        offsetY: Math.round(innerHeight * 0.22),
      });
    }
    openLead(p);
  }

  // fit the map to a hood and highlight it briefly
  function focusHood(t) {
    if (!R || !t.points || !t.points.length) return;
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    t.points.forEach(([lng, lat]) => {
      minX = Math.min(minX, lng); maxX = Math.max(maxX, lng);
      minY = Math.min(minY, lat); maxY = Math.max(maxY, lat);
    });
    R.fitBounds([[minX, minY], [maxX, maxY]], 70, 17);
  }

  // ---------- locate ----------
  function locate() {
    if (!navigator.geolocation || !R) { toast("Location not available"); return; }
    const btn = $("#fab-locate");
    btn.classList.add("armed");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        btn.classList.remove("armed");
        const { latitude, longitude } = pos.coords;
        R.easeTo({ lng: longitude, lat: latitude, zoom: Math.max(R.getZoom(), 16.5) });
        R.setPuck({ lng: longitude, lat: latitude });
      },
      () => { btn.classList.remove("armed"); toast("Couldn't get your location"); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
    );
  }









  function updateHint() {
    const hasPins = STORE.pins.length > 0;
    $("#knock-hint").hidden = hasPins;
    $("#map-legend").hidden = !hasPins || heatMode || !!STORE.settings.mapLegendHidden;
  }

  function updateBrandToday() {
    const t = STORE.todayStats(STORE.myId()); // my doors today, not the team's
    /* THREE NUMBERS. The panel used to read them as one sentence and also
       carried a hood name underneath. The locked direction is Doors, DMs,
       Sold and nothing else — a rep reading a map at arm's length wants
       three glanceable figures, not a caption. */
    $("#mb-doors").textContent = t.doors;
    $("#mb-dms").textContent = t.dms;
    $("#mb-sold").textContent = t.sales;
    const st = window.MSYNC && MSYNC.status();
    const chip = $("#sync-chip");
    if (st && st.on) { // cloud era: the chip shows work waiting to upload
      // a refused record never uploads on its own — it gets its own, louder
      // line rather than sitting silently behind a clean chip
      chip.hidden = st.pending === 0 && !st.refused;
      chip.classList.toggle("refused", !!st.refused);
      $("#sync-chip-n").textContent = st.refused
        ? st.refused + " refused" + (st.pending ? " · " + st.pending + " to sync" : "")
        : st.pending + " to sync";
    } else {
      const q = STORE.queuedCount();
      chip.hidden = q === 0;
      /* NOT "queued for FieldRoutes". FieldRoutes is a benchmark and a
         legacy-migration reference, not a destination RALLY sends work to
         (CLAUDE.md §4) — and on a device with no team server this queue is
         simply work this phone is holding. Say that. */
      $("#sync-chip-n").textContent = q + " waiting on this device";
    }
    /* The chip and the first-door hint were written to the same spot — same
       left, same bottom, same z-index — and the hint only hides once there
       are pins. So a device with no doors YET and something waiting or
       refused stacked the two pills on each other, and the hit test landed
       on whichever painted last: the "1 refused" pill could not be tapped
       on precisely the phone most likely to be showing one. The hint moves
       up out of the way whenever the chip is out. */
    document.body.classList.toggle("has-sync-chip", !chip.hidden);
    updateHoodStrip();
  }

  /* THE TERRITORY LABEL IS GONE FROM THE REP MAP, on purpose. The blue
     area IS the message; naming it in the middle of the imagery was
     clutter over the one thing the rep is actually reading. The element
     stays in the DOM so manager surfaces that do want a hood name can keep
     using it, and so nothing that reads it has to guard. */
  function updateHoodStrip() {
    const el = $("#brand-hood");
    if (el) el.hidden = true;
  }



  // ---------- knock sheet ----------
  function startKnock(lat, lng, pin) {
    knock = pin
      ? { mode: "re", pinId: pin.id, lat: pin.lat, lng: pin.lng, disposition: null, reason: null, dm: false, callbackAt: null }
      : { mode: "new", lat, lng, disposition: null, reason: null, dm: false, callbackAt: null };
    if (!pin && R) R.setTemp({ lng, lat });
    // reset sheet
    $$("#knock-sheet .disp-btn").forEach((b) => b.classList.remove("sel"));
    $$("#knock-sheet .reason").forEach((b) => b.classList.remove("sel"));
    $$("#knock-sheet .cb-chip").forEach((b) => b.classList.remove("sel"));
    $("#knock-reasons-wrap").hidden = true;
    $("#knock-cb-wrap").hidden = true;
    $("#knock-cb-custom").hidden = true;
    $("#knock-dm-wrap").hidden = true;
    $("#dm-switch").classList.remove("on");
    $("#knock-note").value = "";
    $("#knock-save").disabled = true;
    $("#knock-title").textContent = pin ? "Log another knock" : "Log this door";
    $("#knock-sub").textContent = pin
      ? (pin.address || "Same door, new visit")
      : "Pick what happened at the door";
    openSheet("knock-sheet");
  }

  // quick callback times, computed at tap time
  function cbTime(kind) {
    const d = new Date();
    if (kind === "30m") return Date.now() + 30 * 60e3;
    if (kind === "evening") {
      d.setHours(18, 0, 0, 0);
      // already evening? push two hours out instead of into the past
      if (d.getTime() < Date.now() + 30 * 60e3) return Date.now() + 2 * 3600e3;
      return d.getTime();
    }
    if (kind === "tomorrow") {
      d.setDate(d.getDate() + 1); d.setHours(9, 30, 0, 0);
      return d.getTime();
    }
    return null;
  }

  function bindKnockSheet() {
    $$("#knock-sheet .disp-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        tick();
        $$("#knock-sheet .disp-btn").forEach((b) => b.classList.remove("sel"));
        btn.classList.add("sel");
        knock.disposition = btn.dataset.d;
        // the two zero-question outcomes save on the spot — one tap, next door
        if (knock.disposition === "nothome" || knock.disposition === "dnk") {
          saveKnock();
          return;
        }
        const isNI = knock.disposition === "notint";
        $("#knock-reasons-wrap").hidden = !isNI;
        if (!isNI) { knock.reason = null; $$("#knock-sheet .reason").forEach((b) => b.classList.remove("sel")); }
        // a Go Back wants a time — chips save instantly
        const isCB = knock.disposition === "goback";
        $("#knock-cb-wrap").hidden = !isCB;
        if (!isCB) { knock.callbackAt = null; $("#knock-cb-custom").hidden = true; }
        // DM applies only when someone answered
        const contact = D[knock.disposition].contact;
        $("#knock-dm-wrap").hidden = !contact;
        if (!contact) { knock.dm = false; $("#dm-switch").classList.remove("on"); }
        if (knock.disposition === "sold" && contact) {
          // a sale is by definition a DM conversation
          knock.dm = true; $("#dm-switch").classList.add("on");
        }
        $("#knock-save").disabled = false;
      });
    });

    $$("#knock-sheet .cb-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        tick();
        const k = btn.dataset.cb;
        if (k === "custom") {
          $$("#knock-sheet .cb-chip").forEach((b) => b.classList.toggle("sel", b === btn));
          const custom = $("#knock-cb-custom");
          custom.hidden = false;
          if (!custom.value) custom.value = MUI.toLocalInput(cbTime("evening"));
          return;
        }
        knock.callbackAt = k === "none" ? null : cbTime(k);
        saveKnock(); // chip picked = door logged, keep moving
      });
    });
    $("#knock-cb-custom").addEventListener("change", (e) => {
      const ts = new Date(e.target.value).getTime();
      knock.callbackAt = isNaN(ts) ? null : ts;
    });

    $$("#knock-sheet .reason").forEach((btn) => {
      btn.addEventListener("click", () => {
        tick();
        $$("#knock-sheet .reason").forEach((b) => b.classList.remove("sel"));
        btn.classList.add("sel");
        knock.reason = btn.dataset.r;
      });
    });

    $("#dm-switch").addEventListener("click", () => {
      tick();
      knock.dm = !knock.dm;
      $("#dm-switch").classList.toggle("on", knock.dm);
    });

    $("#knock-save").addEventListener("click", saveKnock);
    $("#knock-cancel").addEventListener("click", () => { clearTemp(); closeSheet(); });
  }

  let savingKnock = false; // an impatient double-tap must not log two knocks
  async function saveKnock() {
    if (!knock || !knock.disposition || savingKnock) return;
    savingKnock = true;
    const note = $("#knock-note").value.trim();
    let pin;
    try {
      pin = await STORE.addKnock({
        lat: knock.lat, lng: knock.lng,
        pinId: knock.mode === "re" ? knock.pinId : null,
        disposition: knock.disposition, reason: knock.reason, dm: knock.dm, note,
        callbackAt: knock.callbackAt,
      });
    } catch (err) {
      savingKnock = false;
      toast("Couldn't save — storage may be full. Try again.");
      return; // sheet stays open; nothing is silently lost
    }
    savingKnock = false;
    clearTemp();
    closeSheet();
    refreshPins();
    if (window.MSTAT) MSTAT.render();

    if (knock.disposition === "sold") {
      if (window.MCUST) MCUST.startForPin(pin);
      else toast("Sold — nice.");
    } else if (knock.disposition === "goback" && pin.callbackAt) {
      toast(`Callback set — ${MUI.fmtDate(pin.callbackAt)} ${MUI.fmtTime(pin.callbackAt)}`);
    } else if (knock.reason && MDATA.REKNOCK_REASONS.includes(knock.reason)) {
      toast("Soft no logged — worth a swing-back later");
    } else {
      toast(D[knock.disposition].label + " logged");
    }
    if (knock.mode === "new" && !pin.address) reverseGeocode(pin);
    knock = null;
  }


  function clearTemp() { if (R) R.setTemp(null); }

  async function reverseGeocode(pin) {
    if (!navigator.onLine) return;
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pin.lat}&lon=${pin.lng}&zoom=18`,
        { headers: { Accept: "application/json" } }
      );
      if (!r.ok) return;
      const j = await r.json();
      // the pin may have been deleted while the request was in flight
      if (!STORE.pins.some((p) => p.id === pin.id)) return;
      const a = j.address || {};
      const line = [a.house_number, a.road].filter(Boolean).join(" ");
      const town = a.city || a.town || a.village || a.suburb || "";
      pin.address = line ? line + (town ? ", " + town : "") : (j.display_name || "").split(",").slice(0, 2).join(",");
      pin.geo = { city: town, state: a.state || "", zip: a.postcode || "" };
      await STORE.updatePin(pin);
      if (currentLead && currentLead.id === pin.id) $("#lead-addr").textContent = pin.address || "Address pending…";
      if (window.MCUST) MCUST.fillAddress(pin);
    } catch (_) { /* offline or rate-limited — address stays editable by hand */ }
  }

  // ---------- the property card ----------
  // One sheet answers three questions in order: what happened here (RALLY
  // history), what IS this place (property facts, only real fields), and
  // have we ever done business here (customer history). The knock actions
  // sit on top because at the door, speed beats reading.
  const esc = (s) => MUI.esc(s);

  function propFactRows(pin) {
    const pr = pin.prop || {};
    const rows = [];
    const add = (k, v) => { if (v != null && v !== "") rows.push([k, v]); };
    add("Type", pr.propertyType);
    if (pr.owner) {
      add("Owner", pr.owner.name);
      // derived from comparing situs vs mailing address — an estimate,
      // and labeled like one, never a licensed fact about the person
      if (pr.owner.occupied === true) add("Owner occupied", "Likely");
      else if (pr.owner.occupied === false) add("Owner occupied", "Mailing address differs");
    }
    add("Year built", pr.yearBuilt);
    if (pr.sqft) add("Square feet", Number(pr.sqft).toLocaleString());
    if (pr.lotSqft) {
      add("Lot", pr.lotSqft >= 21780
        ? (pr.lotSqft / 43560).toFixed(2) + " acres"
        : Number(pr.lotSqft).toLocaleString() + " sq ft");
    }
    if (pr.lastSaleDate) {
      add("Last sale", pr.lastSaleDate +
        (pr.lastSalePrice ? " · $" + Number(pr.lastSalePrice).toLocaleString() : ""));
    }
    add("Parcel #", pr.parcelId);
    return rows;
  }

  function renderPropFacts(pin) {
    const rows = propFactRows(pin);
    const sec = $("#prop-facts-sec");
    sec.hidden = !rows.length;
    if (!rows.length) return;
    const srcNote = { regrid: "Parcel data: Regrid", osm: "Building data: © OpenStreetMap contributors", demo: "Demo door — sample data" }[(pin.prop || {}).source];
    $("#prop-facts").innerHTML =
      rows.map(([k, v]) => `<div class="pf-row"><span>${esc(k)}</span><b>${esc(String(v))}</b></div>`).join("") +
      (srcNote ? `<div class="pf-src">${esc(srcNote)}</div>` : "");
  }

  function renderCrm(pin) {
    const m = window.MCRM ? MCRM.findByPin(pin) : null;
    const el = $("#prop-crm");
    if (!m) {
      el.innerHTML = `<div class="crm-none">No customer history at this address</div>`;
      return;
    }
    el.innerHTML =
      `<button class="crm-card" data-cid="${m.id}" type="button">
         <div class="crm-top"><b>${esc(m.name)}</b>
           <span class="stage-tag" style="color:${m.stageChip};border-color:${m.stageChip}">${esc(m.stage)}</span></div>
         <div class="dim">${esc(m.plan)} plan${m.signedAt ? " · signed " + MUI.fmtDate(m.signedAt) : ""}${m.soldBy ? " · by " + esc(m.soldBy) : ""}</div>
         ${m.lastServiced ? `<div class="dim">Last serviced ${MUI.fmtDate(m.lastServiced)}</div>` : ""}
         ${m.nextService ? `<div class="dim">Next service ${MUI.fmtDate(m.nextService)} ${MUI.fmtTime(m.nextService)}</div>` : ""}
         <span class="crm-open">Open customer ›</span>
       </button>`;
    const btn = el.querySelector(".crm-card");
    if (btn) btn.addEventListener("click", () => {
      closeSheet(); setSelected("");
      if (window.MCUST) MCUST.open(btn.dataset.cid);
    });
  }

  function renderRallyHistory(pin) {
    // who knocked last comes from the event log (events carry repId)
    const evs = STORE.events.filter((e) => e.pinId === pin.id);
    const last = evs[evs.length - 1];
    // named only when the knock is provably that person's; otherwise the
    // line simply doesn't claim an author
    const lastRep = last && STORE.isAttributed(last.repId) && STORE.userById(last.repId);
    const n = (pin.history || []).length;
    $("#prop-knockmeta").textContent = n
      ? `${n} knock${n === 1 ? "" : "s"} · last ${MUI.fmtAgo(pin.updatedAt)}${lastRep ? " by " + lastRep.name : ""}`
      : "never knocked";
    const hist = $("#lead-history");
    hist.innerHTML = (pin.history || []).slice().reverse().map((h) =>
      `<div class="h-item"><span class="sw ${h.disposition}"></span>` +
      `<span>${(D[h.disposition] || D.unworked).label}${h.reason ? " — " + esc(h.reason) : ""}${h.dm ? " · DM" : ""}` +
      `${h.note ? `<span style="color:var(--t3)"> · “${esc(h.note)}”</span>` : ""}</span>` +
      `<time>${MUI.fmtAgo(h.ts)}</time></div>`
    ).join("") || `<div class="hood-empty">Fresh door — no attempts yet</div>`;
    // notes: event-shaped, author + time; the legacy single note shows too
    const notes = [...(pin.notes || [])];
    if (pin.note) notes.unshift({ ts: pin.createdAt, name: "", text: pin.note });
    $("#prop-notes").innerHTML = notes.slice().reverse().map((nt) =>
      `<div class="note-item">“${esc(nt.text)}”<span class="nt-meta">${nt.name ? esc(nt.name) + " · " : ""}${MUI.fmtAgo(nt.ts)}</span></div>`
    ).join("");
  }

  function openLead(pin) {
    currentLead = pin;
    setSelected(pin.id);
    $("#lead-addr").textContent = pin.address || "Address pending…";
    $("#lead-coords").textContent = pin.lat.toFixed(5) + ", " + pin.lng.toFixed(5);
    /* The badge shows the EFFECTIVE outcome, so it agrees with the pin on
       the map. A door read as unworked after a fresh pass must not open a
       sheet still calling it "Not interested". */
    const facts = STORE.doorFacts ? STORE.doorFacts() : null;
    const eff = facts ? STORE.effectiveDisposition(pin, STORE.hoodOf(pin), facts) : pin.disposition;
    const d = D[eff] || D.unworked;
    const nh = facts && eff === "nothome" ? STORE.nhDepth(pin, STORE.hoodOf(pin), facts) : 0;
    $("#lead-badge").innerHTML =
      `<span class="sw ${eff}"></span>${d.label}${nh > 1 ? " ×" + nh : ""}` +
      `${pin.reason && eff === pin.disposition ? " · " + esc(pin.reason) : ""}${pin.dm ? " · DM ✓" : ""}`;
    /* The do-not-knock escape hatch: leadership only, and only on a door
       that actually carries one. A rep never sees it. */
    const dnkBtn = $("#lead-clear-dnk");
    if (dnkBtn) {
      const isDnk = facts ? STORE.isCurrentDnk(pin, facts) : pin.disposition === "dnk";
      dnkBtn.hidden = !isDnk || !STORE.canManageTerritories();
      dnkBtn.onclick = async () => {
        MUI.tick();
        if (window.MTURF && await MTURF.clearDnk(pin)) { MUI.closeSheet(); }
      };
    }
    const cb = $("#lead-cb");
    cb.hidden = !pin.callbackAt;
    if (pin.callbackAt) {
      const due = pin.callbackAt <= Date.now();
      cb.innerHTML = `${due ? "⏰ <b>Callback due</b>" : "⏰ Callback"} · ${MUI.fmtDate(pin.callbackAt)} ${MUI.fmtTime(pin.callbackAt)}`;
    }
    // explainable opportunity score — why this door is (or isn't) worth a swing
    const opp = STORE.oppScore(pin);
    const oppEl = $("#lead-opp");
    oppEl.hidden = !opp.score;
    if (opp.score) {
      oppEl.innerHTML =
        `<span class="opp-n num">${opp.score}</span>
         <span class="opp-why">${opp.why.map((w) => esc(w)).join(" · ")}</span>`;
    }
    // reset the quick-action reveals
    $("#prop-cbchips").hidden = true;
    $("#prop-nqchips").hidden = true;
    $$("#prop-quick .pq").forEach((b) => b.classList.remove("sel"));
    renderPropFacts(pin);
    renderRallyHistory(pin);
    renderCrm(pin);
    $("#lead-note-in").value = "";
    $("#lead-addr-in").value = pin.address || "";
    const sold = pin.disposition === "sold";
    const hasAgreement = STORE.customers.some((c) => c.pinId === pin.id);
    $("#lead-close-btn").hidden = hasAgreement;
    // an interested door becomes a LEAD — name and number captured now,
    // agreement whenever they're ready
    $("#lead-close-btn").textContent = sold ? "Create the customer" : "＋ Add as lead";
    openSheet("lead-sheet");
  }

  // ---------- quick knock actions on the property card ----------
  // NOT HOME and NO save on the tap. CALLBACK reveals time chips.
  // NOT QUALIFIED reveals an optional reason. SOLD runs the sale flow.
  let savingQuick = false;
  async function quickKnock(disposition, { reason, callbackAt } = {}) {
    const p = currentLead;
    if (!p || savingQuick) return;
    savingQuick = true;
    let pin;
    try {
      pin = await STORE.addKnock({
        pinId: p.id, lat: p.lat, lng: p.lng,
        disposition, reason: reason || null,
        dm: disposition === "sold", note: "", callbackAt: callbackAt || null,
      });
    } catch (_) {
      savingQuick = false;
      toast("Couldn't save — storage may be full. Try again.");
      return;
    }
    savingQuick = false;
    refreshPins();
    if (window.MSTAT) MSTAT.render();
    if (disposition === "sold") {
      closeSheet(); setSelected("");
      if (window.MCUST) MCUST.startForPin(pin);
      return;
    }
    if (disposition === "goback" && pin.callbackAt) {
      toast(`Callback set — ${MUI.fmtDate(pin.callbackAt)} ${MUI.fmtTime(pin.callbackAt)}`);
    } else {
      toast(D[disposition].label + " logged");
    }
    openLead(pin); // card refreshes in place — status, history, meta
  }

  function bindQuickActions() {
    $$("#prop-quick .pq").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        const q = b.dataset.q;
        if (q === "nothome" || q === "notint") { quickKnock(q); return; }
        if (q === "sold") { quickKnock("sold"); return; }
        if (q === "goback") {
          const w = $("#prop-cbchips");
          w.hidden = !w.hidden;
          $("#prop-nqchips").hidden = true;
          $$("#prop-quick .pq").forEach((x) => x.classList.toggle("sel", x === b && !w.hidden));
          return;
        }
        if (q === "dnk") {
          const w = $("#prop-nqchips");
          if (w.hidden) {
            w.innerHTML = ["No reason", ...MDATA.DNK_REASONS].map((r) =>
              `<button type="button" class="reason nq-chip" data-r="${esc(r)}">${esc(r)}</button>`).join("");
            $$("#prop-nqchips .nq-chip").forEach((c) =>
              c.addEventListener("click", () => {
                tick();
                quickKnock("dnk", { reason: c.dataset.r === "No reason" ? null : c.dataset.r });
              }));
          }
          w.hidden = !w.hidden;
          $("#prop-cbchips").hidden = true;
          $$("#prop-quick .pq").forEach((x) => x.classList.toggle("sel", x === b && !w.hidden));
        }
      }));
    $$("#prop-cbchips .pcb").forEach((c) =>
      c.addEventListener("click", () => {
        tick();
        const k = c.dataset.cb;
        if (k === "custom") {
          const inp = $("#prop-cb-custom");
          inp.hidden = false;
          if (!inp.value) inp.value = MUI.toLocalInput(cbTime("evening"));
          return;
        }
        quickKnock("goback", { callbackAt: cbTime(k) });
      }));
    $("#prop-cb-custom").addEventListener("change", (e) => {
      const ts = new Date(e.target.value).getTime();
      if (!isNaN(ts)) quickKnock("goback", { callbackAt: ts });
    });
  }

  function bindLeadSheet() {
    bindQuickActions();
    $("#lead-nav").addEventListener("click", () => {
      const p = currentLead; if (!p) return;
      window.open(MUI.navUrl(p.lat, p.lng, p.address), "_blank", "noopener");
    });
    $("#lead-reknock").addEventListener("click", () => {
      const p = currentLead; if (!p) return;
      startKnock(p.lat, p.lng, p);
    });
    $("#lead-close-btn").addEventListener("click", () => {
      if (currentLead && window.MCUST) { closeSheet(); MCUST.startForPin(currentLead); }
    });
    $("#lead-save").addEventListener("click", async () => {
      const p = currentLead; if (!p) return;
      const noteText = $("#lead-note-in").value.trim();
      p.address = $("#lead-addr-in").value.trim();
      try {
        await STORE.updatePin(p);
        // notes are event-shaped now: author + timestamp, appended, never overwritten
        if (noteText) await STORE.addNote(p, noteText);
      } catch (_) { toast("Couldn't save — try again"); return; }
      toast(noteText ? "Note added" : "Saved");
      closeSheet(); setSelected("");
    });
    $("#lead-delete").addEventListener("click", async () => {
      const p = currentLead; if (!p) return;
      if (!confirm("Delete this pin and its history?")) return;
      if (!(await STORE.deletePin(p.id))) return; // storage failure: nothing changed
      currentLead = null;
      refreshPins();
      if (window.MSTAT) MSTAT.render();
      closeSheet(); setSelected("");
      toast("Pin deleted");
    });
  }




  /* BOOT. Two things changed when a second engine arrived.

     It is ASYNC now. MapLibre could be constructed synchronously from a
     vendored global; MapKit has to download a script from Apple and
     complete a token handshake before a map may exist. app.js still calls
     MMAP.init() and does not await it — the sheets are bound before the
     first await so knocking works whether or not a map ever appears.

     And it can END WITH NO MAP. That is a supported state, not a crash:
     Street Mode, the Customers list, Route and the whole knock flow are
     coordinate-based and keep working. The hint says which of the three
     things went wrong — no Apple token, no engine, or no imagery — rather
     than a single blank "map failed". */
  async function init() {
    /* app.js calls this WITHOUT awaiting (and inside a try/catch that a
       rejected promise would sail straight past), so a failure here must
       never become an unhandled rejection. It resolves, always; what went
       wrong is reported in the hint and in MMAP.engineReport(). */
    try { await boot(); } catch (e) {
      const hint = $("#knock-hint");
      if (hint) { hint.hidden = false; hint.textContent = "Map engine failed to load — reopen the app"; }
      engineNote = { renderer: null, engine: "", wanted: "", fellBack: false,
                     reason: String((e && e.message) || e) };
    }
  }

  let bound = false;   // the sheets and buttons are wired exactly once

  async function boot() {
    const s = STORE.settings;

    /* init() runs again on every engine switch. The sheets, the locate
       button and the legend are DOM that survives the switch, so binding
       them again would stack a second handler on each — the property
       card's quick outcomes then fired twice and cancelled themselves. */
    if (!bound) {
      bound = true;
      bindKnockSheet();
      bindLeadSheet();
      $("#fab-locate").addEventListener("click", locate);
      // the legend teaches, then retires — tap it once and it stays gone
      $("#map-legend").addEventListener("click", () => {
        STORE.settings.mapLegendHidden = true;
        STORE.saveSettings();
        updateHint();
      });
      // signal returning is the moment to fetch a session and light imagery up
      addEventListener("online", () => reloadImagery());
      $("#brand-hood").addEventListener("click", () => {
        const t = STORE.territories.find((x) => x.id === stripHoodId);
        if (t) focusHood(t);
      });
    }
    updateHint();
    updateBrandToday();

    const res = await MENGINE.boot({
      container: "map",
      center: s.lastCenter || [-98.35, 39.5],
      zoom: s.lastZoom != null ? s.lastZoom : (s.lastCenter ? 16 : 4),
      on: { tap: onTap, move: onMove, moveEnd: onMoveEnd, dragStart: onDragStart, ready: onReady },
    });
    R = res.renderer;
    engineNote = res;
    if (!R) {
      const hint = $("#knock-hint");
      hint.hidden = false;
      hint.textContent = res.reason || "Map engine failed to load — reopen the app";
      return;
    }
    /* A fallback is never silent. A rep who thinks they are on Apple's
       imagery and is not will report the wrong bug, and an office that
       pasted a bad token needs to find out from the app. */
    if (res.fellBack) {
      toast("Apple Maps unavailable — using the offline-capable map. " + (res.reason || ""), 6000);
    }
    refreshPins();
    refreshHoods();
    setDraftRing(draftDots);
    reloadImagery();
  }

  /* ONE TAP, AND THE ORDER MATTERS. A registered handler — drawing a
     territory — consumes the tap BEFORE any door is considered, which is
     why the renderers report a tap plus what was under it rather than
     firing their own annotation-selected events. */
  function onTap(ll, hit) {
    /* THE OUTLINE EDITOR OWNS THE SURFACE. While it is open the map is a
       drawing board, not a door list, so a tap here must never open a door
       sheet on top of it. */
    if (window.MTEDIT && MTEDIT.isOpen()) return;
    for (const h of clickHandlers) {
      try { if (h(ll)) return; } catch (_) {}
    }
    clearEmphasis();
    if (hit && hit.kind === "cluster") {
      // a cluster bubble zooms in — it must never read as an empty spot
      if (R.expandCluster) R.expandCluster(hit);
      else R.easeTo({ lng: hit.lng, lat: hit.lat, zoom: Math.min(R.getZoom() + 2.3, 18) });
      return;
    }
    if (hit && hit.kind === "pin") {
      const pin = STORE.pins.find((p) => p.id === hit.id);
      if (pin) { openLead(pin); return; }
    }
    startKnock(ll.lat, ll.lng);
  }

  function onDragStart() {
    if (window.MHOODS && MHOODS.closeTools) MHOODS.closeTools();
    clearEmphasis();
  }
  /* A renderer whose layers arrived AFTER boot resolved (MapLibre's
     style.load can lose an 8 s race on a slow phone) says so here, and
     everything is painted again onto the layers that now exist. */
  function onReady() {
    refreshPins();
    refreshHoods();
    setDraftRing(draftDots);
    reloadImagery();
  }
  function onMove() {
    for (const h of moveHandlers) { try { h(); } catch (_) {} }
  }
  let saveT = null;
  function onMoveEnd() {
    updateHoodStrip();
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      if (!R) return;
      const c = R.getCenter();
      if (!c) return;
      STORE.settings.lastCenter = [c.lng, c.lat];
      STORE.settings.lastZoom = R.getZoom();
      STORE.saveSettings();
    }, 600);
  }

  window.MMAP = {
    init, refreshPins, refreshHoods, updateBrandToday, focusPin, focusHood, reloadImagery,
    startKnock, focusRep, setHeatMode, showRoute, clearRoute,
    heatMode: () => heatMode,
    googleError: () => lastGoogleError,
    usingOwnKey: () => !!STORE.settings.googleKey,
    clearSelection: () => { setSelected(""); currentLead = null; clearTemp(); },
    resize: () => { if (R) R.resize(); },
    /* Engine-neutral surface — everything an adapter must provide, and
       nothing that leaks the engine. getMap is gone on purpose, and now
       that there are genuinely two engines behind it, it stays gone: the
       whole reason a MapKit renderer could be added without touching
       hoods.js, turfedit.js, select.js, street.js or route.js is that not
       one of them was ever handed an engine object. */
    isReady: () => !!R && R.ready(),
    getCenter: () => (R ? R.getCenter() : null),
    project: (lng, lat) => (R ? R.project(lng, lat) : null),
    unproject: (x, y) => (R ? R.unproject(x, y) : null),
    jumpTo: (lng, lat, zoom) => { if (R) R.jumpTo(lng, lat, zoom); },
    onMapClick: (fn) => { if (typeof fn === "function") clickHandlers.push(fn); },
    onMapMove: (fn) => { if (typeof fn === "function") moveHandlers.push(fn); },
    /* Hand the camera over. While a leader is dragging a whole hood, the
       map must hold still — otherwise its own drag-pan runs alongside and
       keeps the grabbed ground under the finger, so the shape never moves
       and the map slides away instead. Intercepting pointer events is not
       enough: the engine listens for mousedown and touchstart, which are
       different events from the pointerdown an overlay can stop. */
    setDragPan: (on) => { if (R) R.setDragPan(on); },
    setDraftRing,
    /* WHICH MAP AM I LOOKING AT? Settings shows it, the fallback toast
       explains it, and the tests assert on it. A rep should never have to
       guess whether they are on Apple's imagery. */
    engine: () => (R ? R.name : ""),
    engineReport: () => engineNote || { renderer: null, engine: "", wanted: "", fellBack: false, reason: "" },
    imagery: () => (R ? R.imagery() : { live: false, provider: "", error: "" }),
  };
})();
