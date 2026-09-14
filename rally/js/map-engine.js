/* RALLY — WHICH MAP ENGINE, AND WHAT HAPPENS WHEN IT CANNOT START.

   Two renderers exist. Apple MapKit is the intended primary experience;
   MapLibre over Google tiles is the fallback. This file is the only place
   that decides between them, and the only place that knows a fallback
   happened.

   WHY A FALLBACK AT ALL, given MapKit is the direction:

     - MapKit JS is a CDN script. It cannot go in the service worker's
       precache: that install is caches.addAll(CORE), all-or-nothing, so
       one cross-origin entry would put every offline capability behind
       Apple's uptime. A cold launch with no signal therefore has no
       MapKit at all, while the vendored MapLibre bundle is already there.
     - MapKit is an authorized live service. With no valid token Apple
       answers 401 and draws no imagery — and a rep whose token expired
       mid-shift must not be handed a blank screen.
     - Google tiles are cached per URL by the service worker, so already
       -seen ground keeps rendering offline. Apple's imagery is not ours
       to cache.

   THE SWITCH IS SAFE BECAUSE THE RENDERERS HOLD NO STATE THAT MATTERS.
   Pins, territories, the selected door, the draft outline and the queued
   knocks all live in map.js and STORE. A renderer is handed GeoJSON and
   gives back camera answers; swapping one for the other is re-issuing the
   same four calls. Nothing is read back out of an engine to be kept.

   RALLY's business behaviour does not depend on either engine: knocking,
   outcomes, notes, callbacks and the customer flow are recorded against
   coordinates the app already has, and the outbox does not care what drew
   the map. A rep with no map at all can still work a door from the
   Customers list and Street Mode. */
(function () {
  const GL = () => window.MRENDER_GL;
  const MK = () => window.MRENDER_MK;

  let active = null;      // the renderer in use
  let chosen = "";        // what we tried first
  let fellBack = false;
  let why = "";
  let quiet = false;      // a fallback that is a standing configuration, not news

  /* THE USER SELECTS NOTHING. MapKit is the primary online renderer
     whenever a token is present on the origin (mapkit-config.js) or in
     the development slot; MapLibre otherwise, and MapLibre whenever
     MapKit cannot start — a rep in a dead zone with no map cannot knock.
     A fallback is never quiet: fellBack and reason are set and the app
     toasts them. There is no engine setting; the old mapEngine key, if a
     device still carries one, is ignored. */
  const token = () => ((window.RALLY_MAPKIT && window.RALLY_MAPKIT.token) || STORE.settings.mapkitToken || "").trim();
  /* APPLE IS A LIVE SERVICE. When the signal goes, or Apple stops
     answering mid-shift, the map does not sit blank: map.js flags Apple
     as lost and re-boots, and this answers MapLibre until the signal is
     back. Apple's imagery is never claimed to work offline — the
     offline-capable map is the one drawing cached ground. */
  let appleLost = false;
  const online = () => (typeof navigator === "undefined" || navigator.onLine !== false);
  function wanted() { return token() && !appleLost && online() ? "mapkit" : "maplibre"; }

  let inflight = null;    // the boot running now
  let queued = null;      // the opts of a boot asked for while one was running

  /* A boot that arrives while one is running is NOT handed the running
     boot's answer. That was the first guard, and it silently threw away a
     Settings save made during the (up to 24 s) MapKit handshake: the rep's
     new engine or token was never booted and the toast described the old
     attempt. Now the later request is remembered and ONE follow-up boot
     runs after the current one settles, reading the settings as they are
     then — so the last thing the rep asked for is the thing that runs. */
  function boot(opts) {
    if (inflight) {
      queued = opts;
      return inflight.catch(() => {}).then(() => {
        if (queued) { const o = queued; queued = null; return boot(o); }
        /* Another waiter already started the follow-up boot: ride along
           with it. Answering from report() here handed the THIRD caller a
           null renderer — bootOnce destroys the old map before its first
           await — and the rep read "No map could be started" while the
           map was, in fact, starting. */
        return inflight ? inflight.catch(() => {}).then(report) : report();
      });
    }
    inflight = bootOnce(opts).finally(() => { inflight = null; });
    return inflight;
  }

  async function bootOnce(opts) {
    /* THE OLD MAP COMES DOWN FIRST. Every boot after the first is a
       switch, and a renderer that is not destroyed keeps its canvas in
       #map, its listeners on it and its rAF loop running underneath the
       new one — two maps answering one tap at two different coordinates. */
    if (active) { try { active.destroy(); } catch (_) {} active = null; }

    const want = wanted();
    chosen = want;
    fellBack = false;
    why = "";
    quiet = false;

    if (want === "mapkit" && MK()) {
      const r = await MK().boot(opts);
      if (r.ok) { active = MK(); return report(); }
      why = r.detail || r.reason || "MapKit could not start";
      /* It may have got as far as a live map with no imagery. Tear that
         down before the fallback builds its own into the same element. */
      if (r.constructed) { try { MK().destroy(); } catch (_) {} }
      /* No token is a CONFIGURATION, not a failure: it is the same on
         every launch until someone pastes one, so it is recorded for
         Settings (which says exactly that) but not toasted at every open
         — a rep who picked Apple Maps on a phone with no token would
         otherwise be nagged for six seconds a launch with no way to act. */
      quiet = r.reason === "no-token";
      if (STORE.settings.mapkitLastError !== why) {
        STORE.settings.mapkitLastError = why;
        try { await STORE.saveSettings(); } catch (_) {}
      }
      fellBack = true;
    }

    if (!GL()) { active = null; why = why || "No map renderer available"; return report(); }
    const r = await GL().boot(opts);
    active = r.ok ? GL() : null;
    if (!r.ok) why = r.detail || r.reason || why;
    return report();
  }

  const report = () => ({
    renderer: active,
    engine: active ? active.name : "",
    wanted: chosen,
    fellBack,
    quiet,
    reason: why,
  });

  window.MENGINE = {
    boot,
    active: () => active,
    name: () => (active ? active.name : ""),
    wanted,
    fellBack: () => fellBack,
    reason: () => why,
    /* Both renderers are always present as objects; whether MapKit can
       actually start is a runtime question about Apple, a token and the
       network, which is exactly what boot() answers. */
    available: () => ({ maplibre: !!GL(), mapkit: !!MK() }),
    hasToken: () => !!token(),
    appleLost: (v) => { if (typeof v === "boolean") appleLost = v; return appleLost; },
    /* DEVELOPMENT ONLY — the one injection point, and it is not a screen.
       From the console: MENGINE.devToken("<token>") to try Apple on this
       device, MENGINE.devToken("") to clear. The value is written to the
       settings slot vault.js strips from every backup, is never logged,
       and no product UI reads it back. */
    devToken: async (t) => {
      STORE.settings.mapkitToken = String(t || "").trim();
      STORE.settings.mapkitLastError = "";
      await STORE.saveSettings();
      if (window.MMAP) await MMAP.init();
      return { engine: active ? active.name : "", fellBack, reason: why };
    },
  };
})();
