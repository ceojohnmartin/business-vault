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

  /* auto     — MapKit when this device has a token, MapLibre otherwise
     mapkit   — MapKit first. If it cannot start, the fallback still runs,
                because a rep in a dead zone with no map cannot knock —
                but it is never quiet: fellBack and reason are set, the
                app toasts them and Settings shows them. The honesty is in
                the report, not in leaving the rep with nothing.
     maplibre — MapLibre, full stop */
  function wanted() {
    const s = (STORE.settings.mapEngine || "auto").toLowerCase();
    if (s === "mapkit" || s === "maplibre") return s;
    return (STORE.settings.mapkitToken || "").trim() ? "mapkit" : "maplibre";
  }

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
        if (!queued) return report();
        const o = queued; queued = null;
        return boot(o);
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

    if (want === "mapkit" && MK()) {
      const r = await MK().boot(opts);
      if (r.ok) { active = MK(); return report(); }
      why = r.detail || r.reason || "MapKit could not start";
      /* It may have got as far as a live map with no imagery. Tear that
         down before the fallback builds its own into the same element. */
      if (r.constructed) { try { MK().destroy(); } catch (_) {} }
      STORE.settings.mapkitLastError = why;
      try { await STORE.saveSettings(); } catch (_) {}
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
  };
})();
