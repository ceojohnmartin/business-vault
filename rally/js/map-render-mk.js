/* RALLY — THE APPLE MAPKIT RENDERER.

   A real MapKit JS map, behind the same renderer contract map.js already
   speaks. It receives RALLY's engine-neutral GeoJSON — the very same
   FeatureCollections the MapLibre renderer gets — and turns them into real
   mapkit.PolygonOverlay, mapkit.PolylineOverlay and mapkit.Annotation
   objects on a real mapkit.Map. No RALLY logic lives here: no knock flow,
   no sheets, no dispositions decided. Geometry in, Apple objects out.

   WHAT MAPKIT GIVES US FOR FREE, and it is a lot:
     - Apple satellite and hybrid imagery (mapkit.Map.MapTypes.Satellite)
     - polygon overlays with per-overlay mapkit.Style
     - annotations with a custom DOM factory, so RALLY's own teardrop is
       the pin rather than an Apple marker
     - built-in annotation clustering via clusteringIdentifier
     - coordinate <-> page-point conversion, which is what the outline
       editor and the lasso are actually built on
     - a FIXED z-order that happens to be exactly the one RALLY wants:
       base map < tile overlays < overlays < annotations

   WHAT IT DOES NOT GIVE US, and what this file therefore has to do itself
   (every one of these is a real cost of the port, not a detail):

     1. NO STYLE EXPRESSIONS. MapLibre paints a whole layer from one
        data-driven expression. MapKit has none, so every territory needs
        its own mapkit.Style object and every repaint rebuilds them.
     2. NO TEXT LAYER. Territory names, route stop numbers and cluster
        counts are MapLibre symbol layers today. Here they are RALLY-drawn
        DOM annotations, styled by app.css.
     3. NO ZOOM-DRIVEN ICON SIZE. MapLibre interpolates icon-size against
        zoom. MapKit annotations are fixed DOM, so the same curve from
        MPIN is sampled here and pushed onto the map element as a CSS
        variable — one write repaints every pin.
     4. NO CONTINUOUS MOVE EVENT. MapKit reports region-change-start and
        region-change-end. The outline editor draws HTML handles over the
        canvas and MUST be told during the drag, or every handle slides
        away from its corner for the length of the gesture. So a rAF loop
        runs between start and end and synthesises the signal.
     5. NO TILE-ERROR STREAM. MapLibre's map.on("error") lets RALLY
        swallow dead-zone tile failures. MapKit has no equivalent; Apple
        decides what a failed tile looks like.

   AUTHORIZATION. mapkit.init() needs a signed Apple developer token
   (ES256 JWT: Team ID as iss, Key ID as kid). With no token Apple's
   bootstrap answers 401 and MapKit raises error status "Unauthorized" —
   the library still constructs maps and accepts every overlay and
   annotation, but no imagery is ever drawn. That is why boot() resolves
   with an explicit reason instead of throwing: the engine switch needs to
   know the difference between "MapKit is broken" and "this device has no
   Apple key yet", and only the second one should quietly fall back. */
(function () {
  const NS = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";

  let map = null;                 // mapkit.Map
  let el = null;                  // its container element
  let booted = false;
  let authorized = false;
  let lastError = "";
  let on = {};                    // {tap, move, moveEnd, dragStart}

  // live object registries — MapKit has no id-keyed source lookup, so the
  // renderer keeps its own and swaps whole sets on each repaint
  let hoodOverlays = [];
  let hoodLabels = [];
  let pinAnnos = [];
  let pinById = new Map();
  let routeOverlay = null, routeStops = [];
  let draftOverlay = null, draftDots = [];
  let puckAnno = null, tempAnno = null;
  let selectedId = "";
  let heat = false, labelsOn = false;
  let lastPinFC = null;

  const C = (lng, lat) => new mapkit.Coordinate(lat, lng); // ORDER FLIPS HERE
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ZOOM. MapKit has no zoom number; it has a region. RALLY's callers all
     speak MapLibre zoom and STORE.settings.lastZoom is persisted in it, so
     the two are converted rather than redefined — MapLibre's world is
     512px at z0, which is the whole of the relationship. */
  const W = () => (el && el.clientWidth) || 390;
  const H = () => (el && el.clientHeight) || 780;

  function zoomFromSpan(lngDelta) {
    if (!lngDelta || lngDelta <= 0) return 16;
    return Math.log2((360 * W()) / (512 * lngDelta));
  }
  function spanFromZoom(zoom, lat) {
    const lngDelta = (360 * W()) / (512 * Math.pow(2, zoom));
    const latDelta = lngDelta * (H() / W()) * Math.cos((lat * Math.PI) / 180);
    return new mapkit.CoordinateSpan(
      clamp(latDelta, 0.00005, 170), clamp(lngDelta, 0.00005, 350));
  }

  // ---------- the script, loaded only when this engine is actually chosen ----------
  let loadP = null;
  function loadLibrary() {
    if (window.mapkit) return Promise.resolve(true);
    if (loadP) return loadP;
    let s = null;
    loadP = new Promise((res) => {
      s = document.createElement("script");
      s.src = NS;
      s.crossOrigin = "anonymous";
      s.async = true;
      s.onload = () => res(!!window.mapkit);
      s.onerror = () => { lastError = "Apple MapKit could not be downloaded"; res(false); };
      document.head.appendChild(s);
      /* A phone on a dead cell keeps a <script> pending for a long time.
         RALLY must not sit on a blank map waiting for Apple: the fallback
         engine is same-origin and already cached. */
      setTimeout(() => { if (!window.mapkit) { lastError = "Apple MapKit timed out"; res(false); } }, 12000);
    }).then((ok) => {
      /* A FAILED load is not remembered. The first version cached the
         promise either way, so a rep who opened RALLY in a dead zone could
         never get Apple Maps back that day without a reload. */
      if (!ok) { loadP = null; try { s && s.remove(); } catch (_) {} }
      return ok;
    });
    return loadP;
  }

  /* THE TOKEN. Apple's authorizationCallback wants a signed JWT. RALLY has
     no signing service, and it must never have the .p8 private key on a
     phone, so the token is a DEVICE SETTING pasted by the office — stored
     beside googleKey and stripped from every backup by the same list. */
  const token = () => (STORE.settings.mapkitToken || "").trim();

  /* MapKit initialises ONCE per page: a second mapkit.init() dispatches
     "Refreshed", never "Initialized", and there is no mapkit.destroy(). So
     Apple is asked exactly once and its answer — whenever it arrives — is
     kept in ONE promise that every boot awaits. Two things follow:

       - a boot that gives up after 12 s has TIMED OUT; it has not been
         refused. If Apple's "Initialized" lands at second 15, the next boot
         finds the promise resolved and Apple Maps comes up. The first
         version labelled that timeout "Unauthorized" and then persisted
         the false diagnosis, which parked a working token on the fallback
         map for the rest of the day.
       - a token Apple actually rejected stays rejected for this page:
         there is no way to hand MapKit a second token without a reload,
         and the message says exactly that. */
  let initP = null;         // Apple's one answer, resolved to true/false
  let initSettled = false;

  function askApple() {
    if (initP) return initP;
    initP = new Promise((res) => {
      const done = (ok, why) => {
        if (initSettled) return;
        initSettled = true;
        authorized = ok;
        if (!ok) lastError = why || lastError;
        res(ok);
      };
      mapkit.addEventListener("error", (e) => {
        const st = (e && e.status) || "error";
        done(false, st === "Unauthorized"
          ? "Apple rejected the MapKit token (Unauthorized) — reload RALLY to try a new one"
          : "Apple MapKit error: " + st);
      });
      mapkit.addEventListener("configuration-change", (e) => {
        if (e && e.status === "Initialized") done(true);
      });
      try {
        mapkit.init({ authorizationCallback: (give) => give(token()), language: "en" });
      } catch (err) { done(false, "MapKit init threw: " + (err && err.message)); }
    });
    return initP;
  }

  function initMapKit() {
    const answer = askApple();
    if (initSettled) return answer;
    // this boot waits up to 12 s; Apple's answer keeps arriving into initP regardless
    return Promise.race([
      answer,
      new Promise((res) => setTimeout(() => {
        if (!initSettled) lastError = "Apple MapKit did not answer in time — check the signal and try again";
        res(false);
      }, 12000)),
    ]);
  }

  // ---------- boot ----------
  async function boot(o) {
    on = (o && o.on) || {};
    el = document.getElementById((o && o.container) || "map");
    if (!el) return { ok: false, reason: "no-container" };
    if (!token()) {
      lastError = "No Apple MapKit token on this device";
      return { ok: false, reason: "no-token", detail: lastError };
    }
    if (!(await loadLibrary())) return { ok: false, reason: "no-library", detail: lastError };
    const ok = await initMapKit();

    /* THE MAP IS BUILT EVEN WHEN APPLE REFUSED THE TOKEN, and that is a
       deliberate diagnosis rather than optimism. Unauthorized MapKit still
       constructs maps and still accepts every overlay and annotation — it
       simply never draws imagery. Building it anyway lets boot() answer
       three different questions apart: Apple could not be reached, Apple
       rejected the token, or Apple is fine. The engine switch throws this
       map away and falls back; Settings gets to say which of the three
       happened instead of one useless "map failed". */
    const center = (o && o.center) || [-98.35, 39.5];
    const zoom = (o && o.zoom != null) ? o.zoom : 4;
    map = new mapkit.Map(el, {
      mapType: mapkit.Map.MapTypes.Satellite,
      // RALLY draws its own chrome; Apple's furniture would fight the glass
      showsCompass: mapkit.FeatureVisibility.Hidden,
      showsScale: mapkit.FeatureVisibility.Hidden,
      showsZoomControl: false,
      showsMapTypeControl: false,
      showsUserLocationControl: false,
      showsPointsOfInterest: false,
      // a door-knocking map is north-up and flat, on every engine
      isRotationEnabled: false,
      colorScheme: mapkit.Map.ColorSchemes.Light,
    });
    map.region = new mapkit.CoordinateRegion(C(center[0], center[1]), spanFromZoom(zoom, center[1]));

    /* CLUSTERING. MapKit collides annotations that share a clustering
       identifier and asks this hook what the bubble looks like. It is NOT
       MapLibre's model — MapLibre stops clustering above a zoom, MapKit
       clusters whenever the glyphs would overlap — so the two maps will
       not always bubble at the same moment. Reported, not hidden. */
    map.annotationForCluster = (clusterAnno) => {
      const n = clusterAnno.memberAnnotations.length;
      return new mapkit.Annotation(clusterAnno.coordinate, () => {
        const d = document.createElement("div");
        d.className = "mkpin-cluster";
        d.textContent = n > 999 ? Math.round(n / 1000) + "k" : String(n);
        return d;
      }, { data: { cluster: true, n }, collisionMode: mapkit.Annotation.CollisionMode.Circle });
    };

    wireEvents();
    applyPinScale();
    booted = true;
    return ok
      ? { ok: true, constructed: true }
      : { ok: false, reason: "unauthorized", detail: lastError, constructed: true };
  }

  function wireEvents() {
    /* THE CONTINUOUS MOVE SIGNAL MapKit does not have. Between
       region-change-start and region-change-end a rAF loop stands in for
       MapLibre's "move" event, because the outline editor's HTML handles
       are re-pinned from it and would otherwise drift for the whole drag. */
    let raf = 0;
    const pump = () => {
      if (on.move) { try { on.move(); } catch (_) {} }
      raf = requestAnimationFrame(pump);
    };
    map.addEventListener("region-change-start", () => {
      if (!raf) raf = requestAnimationFrame(pump);
    });
    map.addEventListener("region-change-end", () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      applyPinScale();
      applyClusterMode();
      if (on.move) { try { on.move(); } catch (_) {} }
      if (on.moveEnd) { try { on.moveEnd(); } catch (_) {} }
    });
    /* "dragStart" means A FINGER moved the map — that is when the tools
       sheet closes and a manager's rep emphasis clears. region-change-start
       also fires for every PROGRAMMATIC move, so wiring it there made
       "focus this rep" cancel its own emphasis on arrival. MapKit's
       scroll-start and zoom-start are the gesture events. */
    map.addEventListener("scroll-start", () => { if (on.dragStart) { try { on.dragStart(); } catch (_) {} } });
    map.addEventListener("zoom-start", () => { if (on.dragStart) { try { on.dragStart(); } catch (_) {} } });
    stopPump = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    /* TAP. Deliberately NOT MapKit's annotation "select" event: RALLY's
       rule is that a registered handler (drawing a territory) consumes a
       tap BEFORE any door is considered, and annotation selection would
       fire first and jump the queue. So the renderer hit-tests the same
       way the MapLibre one does — a tolerance box in page pixels — and
       hands map.js one tap with what was under it. */
    clickHandler = (ev) => {
      if (!map) return;
      const pt = new DOMPoint(ev.clientX, ev.clientY);
      let ll;
      try { const c = map.convertPointOnPageToCoordinate(pt); ll = { lng: c.longitude, lat: c.latitude }; }
      catch (_) { return; }
      const hit = hitTest(ev.clientX, ev.clientY);
      if (on.tap) { try { on.tap(ll, hit); } catch (_) {} }
    };
    el.addEventListener("click", clickHandler, true);
  }
  let clickHandler = null;   // kept so destroy() can take it off again
  let stopPump = null;

  const TOL = 16; // the same fat-finger box the MapLibre renderer uses

  function hitTest(x, y) {
    if (!map) return null;
    let best = null, bestD = TOL * TOL;
    // clusters win: a bubble must never read as empty ground
    map.annotations.forEach((a) => {
      if (!a.data) return;
      let p;
      try { p = map.convertCoordinateToPointOnPage(a.coordinate); } catch (_) { return; }
      // move the tap DOWN to where this pin's tip would be if the thumb
      // landed on its head, then compare tips
      const dx = p.x - x, dy = p.y - (y + headToTip(a));
      const d = dx * dx + dy * dy;
      if (d > bestD) return;
      if (a.data.cluster) { best = { kind: "cluster", lng: a.coordinate.longitude, lat: a.coordinate.latitude }; bestD = d; }
      else if (a.data.pinId) { best = { kind: "pin", id: a.data.pinId }; bestD = d; }
    });
    return best;
  }

  /* An annotation's coordinate is its TIP (MapKit anchors a custom
     element at bottom-centre); the head a thumb aims at sits ABOVE it, by
     0.63 of the pin's height at the current scale. The first version
     subtracted this instead of adding it, which put the hit box a full
     pin-height BELOW the door: a tap on the head missed and logged a
     duplicate door instead. Settled against Apple's source, not guessed. */
  function headToTip(a) {
    if (!a.data || a.data.cluster) return 0;
    // an imported door drawn as a dot is CENTRED on the coordinate — no head above it
    if (a.data.unworked && a.data.pinId !== selectedId && el && el.classList.contains("mk-dots")) return 0;
    return Math.round(MPIN.SIZE_PX * MPIN.scaleAt(getZoom()) * 0.63);
  }

  // ---------- pins ----------
  /* One CSS variable carries the zoom curve to every pin at once. Setting
     a transform on 900 elements per frame is what makes a DOM-annotation
     map feel slow; setting one custom property does not. */
  function applyPinScale() {
    if (!el) return;
    const z = getZoom();
    el.style.setProperty("--mkpin-s", MPIN.scaleAt(z).toFixed(3));
    el.style.setProperty("--mkpin-ssel", MPIN.scaleAtSelected(z).toFixed(3));
    el.classList.toggle("mk-dots", z < 16.5);
  }

  function pinElement(f, sel) {
    const d = document.createElement("div");
    d.className = "mkpin" + (sel ? " sel" : "") +
      (f.properties.disposition === "unworked" ? " unworked" : "") +
      (f.properties.cbdue ? " cbdue" : "");
    const img = document.createElement("img");
    img.src = MPIN.dataURL(MPIN.COLORS[f.properties.disposition] || MPIN.COLORS.unworked);
    img.alt = "";
    d.appendChild(img);
    return d;
  }

  function setPins(fc, sel) {
    lastPinFC = fc;
    selectedId = sel || "";
    if (!map) return;
    if (pinAnnos.length) map.removeAnnotations(pinAnnos);
    pinAnnos = []; pinById = new Map();
    (fc.features || []).forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const isSel = f.properties.id === selectedId;
      /* MapKit calls the factory SYNCHRONOUSLY inside the constructor, so
         the annotation variable is not assigned yet when it runs; a
         holder the factory fills in is what an in-place selection change
         reads later. */
      const held = { el: null };
      const a = new mapkit.Annotation(C(lng, lat), () => {
        held.el = pinElement(f, isSel);
        return held.el;
      }, {
        data: { pinId: f.properties.id, unworked: f.properties.disposition === "unworked" },
        /* THE ANCHOR IS DECLARED, NOT MEASURED. MapKit anchors a custom
           element at (width/2, height) of the size it MEASURES at creation
           — and it measures with the CSS zoom transform applied, so at
           scale 0.44 it anchored a 21px box and every pin sat 13x29 px
           south-east of its door. Declaring the untransformed size pins
           the anchor at (24,48): the box's bottom-centre is the coordinate,
           the transform scales around that same bottom-centre, and the tip
           — drawn 2.6 px inside the canvas edge — lands within 2.6*scale
           px of the door at every zoom, never below it. */
        size: { width: MPIN.SIZE_PX, height: MPIN.SIZE_PX },
        anchorOffset: new DOMPoint(0, 0),
        /* The selected door rides above everything, exactly as it does on
           the other engine, and never collides away. */
        displayPriority: priorityFor(isSel, f.properties.disposition === "unworked"),
        collisionMode: mapkit.Annotation.CollisionMode.None,
        clusteringIdentifier: null,   // applyClusterMode() decides, by zoom
      });
      a._rally = held;
      pinAnnos.push(a);
      pinById.set(f.properties.id, a);
    });
    if (pinAnnos.length) map.addAnnotations(pinAnnos);
    clusterMode = null;      // fresh annotations start out non-colliding
    applyPinScale();
    applyClusterMode();
  }

  const priorityFor = (sel, unworked) => (sel ? 1000 : unworked ? 250 : 750);

  /* CLUSTERING, BY ZOOM. MapKit only clusters annotations that take part
     in collision, and a colliding annotation can be HIDDEN by a neighbour
     — which is why the door pins are built with CollisionMode.None: at
     street level every worked door must stay visible, exactly as
     MapLibre's icon-allow-overlap keeps them. That also meant they never
     clustered, so a zoomed-out book was two thousand live annotations.
     Below the same zoom MapLibre stops clustering at (15), the pins are
     flipped into collision so Apple bubbles them; at and above it they are
     flipped back out. One pass per region change, only when the mode
     actually changes. */
  const CLUSTER_BELOW = 15;
  let clusterMode = null;   // true = clustering, false = every pin shown
  function applyClusterMode() {
    if (!map) return;
    const want = getZoom() < CLUSTER_BELOW;
    if (want === clusterMode) return;
    clusterMode = want;
    const CM = mapkit.Annotation.CollisionMode;
    pinAnnos.forEach((a) => {
      const sel = !!(a.data && a.data.pinId === selectedId);
      try {
        a.collisionMode = want && !sel ? CM.Circle : CM.None;
        a.clusteringIdentifier = want && !sel ? "door" : null;
      } catch (_) {}
    });
  }

  /* SELECTION CHANGES TWO PINS, NOT TWO THOUSAND. The first version
     re-issued setPins() for a tap, which tore down and rebuilt every
     annotation on the map — a visible blink of the whole book on every
     door, and thousands of objects churned for one class toggle. Now the
     old selected pin and the new one are edited in place. */
  function setSelected(id) {
    const next = id || "";
    if (!map) { selectedId = next; return; }
    const flip = (pinId, sel) => {
      const a = pinById.get(pinId);
      if (!a) return;
      if (a._rally && a._rally.el) a._rally.el.classList.toggle("sel", sel);
      try {
        a.displayPriority = priorityFor(sel, !!(a.data && a.data.unworked));
        if (sel) { a.collisionMode = mapkit.Annotation.CollisionMode.None; a.clusteringIdentifier = null; }
        else if (clusterMode) { a.collisionMode = mapkit.Annotation.CollisionMode.Circle; a.clusteringIdentifier = "door"; }
        /* z-index is trapped inside MapKit's per-annotation stacking
           context and displayPriority does not reorder the DOM, so the one
           way to draw the chosen door above its neighbours is to make it
           the newest annotation on the map. One object, not the book. */
        if (sel) { map.removeAnnotation(a); map.addAnnotation(a); }
      } catch (_) {}
    };
    if (selectedId && selectedId !== next) flip(selectedId, false);
    if (next) flip(next, true);
    selectedId = next;
  }

  // ---------- territories ----------
  function ringOf(f) {
    const ring = (f.geometry.coordinates && f.geometry.coordinates[0]) || [];
    return ring.map(([lng, lat]) => C(lng, lat));
  }

  function hoodStyle(p) {
    const color = heat ? p.fresh : p.color;
    const dim = p.dim === 1 || p.dim === true;
    /* THE LOCKED LOOK: translucent fill, STRONG outline. Over satellite
       photography a weak edge disappears into rooftops, and the edge is
       the part that answers "am I still on my turf?". These are the same
       numbers the MapLibre paint properties use. */
    return new mapkit.Style({
      strokeColor: color,
      strokeOpacity: heat ? 0.75 : (dim ? 0.28 : 0.92),
      lineWidth: lineWidthAt(getZoom()),
      lineJoin: "round",
      fillColor: color,
      fillOpacity: heat ? 0.25 : (dim ? 0.04 : 0.15),
    });
  }
  // MapLibre interpolates 12 -> 2.0 and 17 -> 3.6; same curve, sampled
  const lineWidthAt = (z) => +(2.0 + ((clamp(z, 12, 17) - 12) / 5) * 1.6).toFixed(2);

  function setHoods(fc, opts) {
    heat = !!(opts && opts.heat);
    labelsOn = !!(opts && opts.labels);
    if (!map) return;
    if (hoodOverlays.length) map.removeOverlays(hoodOverlays);
    if (hoodLabels.length) map.removeAnnotations(hoodLabels);
    hoodOverlays = []; hoodLabels = [];
    (fc.features || []).forEach((f) => {
      const ring = ringOf(f);
      if (ring.length < 3) return;
      hoodOverlays.push(new mapkit.PolygonOverlay(ring, {
        style: hoodStyle(f.properties), data: { hoodId: f.properties.id },
      }));
      if (labelsOn && f.properties.name) hoodLabels.push(labelAnno(ring, f.properties));
    });
    if (hoodOverlays.length) map.addOverlays(hoodOverlays);
    if (hoodLabels.length) map.addAnnotations(hoodLabels);
  }

  /* THE TERRITORY NAME. MapKit has no text layer at all, so RALLY draws
     its own label as a DOM annotation at the ring's centroid — and it is
     only ever added when the manager gate says so, which is the same rule
     the other engine applies to its symbol layer's visibility. */
  function labelAnno(ring, p) {
    let x = 0, y = 0;
    ring.forEach((c) => { x += c.longitude; y += c.latitude; });
    const c = C(x / ring.length, y / ring.length);
    return new mapkit.Annotation(c, () => {
      const d = document.createElement("div");
      d.className = "mkhood-label";
      d.innerHTML = `<b></b><i></i>`;
      d.querySelector("b").textContent = p.name || "";
      d.querySelector("i").textContent = p.rep || "";
      return d;
    }, { data: { label: true }, collisionMode: mapkit.Annotation.CollisionMode.Rectangle });
  }

  // ---------- the outline being drawn ----------
  function setDraft(dots) {
    if (!map) return;
    if (draftOverlay) { map.removeOverlay(draftOverlay); draftOverlay = null; }
    if (draftDots.length) { map.removeAnnotations(draftDots); draftDots = []; }
    if (!dots || !dots.length) return;
    const pts = dots.map(([lng, lat]) => C(lng, lat));
    if (pts.length >= 2) {
      draftOverlay = new mapkit.PolylineOverlay(pts.concat(pts.length >= 3 ? [pts[0]] : []), {
        style: new mapkit.Style({ strokeColor: "#0A84FF", lineWidth: 3, lineDash: [6, 5] }),
      });
      map.addOverlay(draftOverlay);
    }
    draftDots = pts.map((c) => new mapkit.Annotation(c, () => {
      const d = document.createElement("div"); d.className = "mkdot"; return d;
    }, { data: { draft: true }, collisionMode: mapkit.Annotation.CollisionMode.None }));
    map.addAnnotations(draftDots);
  }

  // ---------- the walking route ----------
  function setRoute(fc) {
    if (!map) return;
    if (routeOverlay) { map.removeOverlay(routeOverlay); routeOverlay = null; }
    if (routeStops.length) { map.removeAnnotations(routeStops); routeStops = []; }
    if (!fc || !fc.features || !fc.features.length) return;
    const line = fc.features.find((f) => f.geometry.type === "LineString");
    if (line) {
      routeOverlay = new mapkit.PolylineOverlay(
        line.geometry.coordinates.map(([lng, lat]) => C(lng, lat)),
        { style: new mapkit.Style({ strokeColor: "#5EA0FF", lineWidth: 3, lineDash: [4, 8], strokeOpacity: 0.9 }) });
      map.addOverlay(routeOverlay);
    }
    // stop numbers are text, so again they are RALLY's own DOM
    fc.features.filter((f) => f.geometry.type === "Point").forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      routeStops.push(new mapkit.Annotation(C(lng, lat), () => {
        const d = document.createElement("div");
        d.className = "mkstop";
        d.textContent = String(f.properties && f.properties.n != null ? f.properties.n : "");
        return d;
      }, { data: { stop: true }, collisionMode: mapkit.Annotation.CollisionMode.None }));
    });
    if (routeStops.length) map.addAnnotations(routeStops);
  }

  // ---------- puck and the pending knock ----------
  function simpleAnno(ll, cls) {
    return new mapkit.Annotation(C(ll.lng, ll.lat), () => {
      const d = document.createElement("div"); d.className = cls; return d;
    }, { data: { chrome: true }, collisionMode: mapkit.Annotation.CollisionMode.None });
  }
  function setPuck(ll) {
    if (!map) return;
    if (puckAnno) { map.removeAnnotation(puckAnno); puckAnno = null; }
    if (ll) { puckAnno = simpleAnno(ll, "mkpuck"); map.addAnnotation(puckAnno); }
  }
  function setTemp(ll) {
    if (!map) return;
    if (tempAnno) { map.removeAnnotation(tempAnno); tempAnno = null; }
    if (ll) { tempAnno = simpleAnno(ll, "mktemp"); map.addAnnotation(tempAnno); }
  }

  // ---------- camera ----------
  function getCenter() {
    if (!map) return null;
    const c = map.center;
    return { lng: c.longitude, lat: c.latitude };
  }
  function getZoom() {
    if (!map) return 16;
    try { return zoomFromSpan(map.region.span.longitudeDelta); } catch (_) { return 16; }
  }
  function project(lng, lat) {
    if (!map) return null;
    try { const p = map.convertCoordinateToPointOnPage(C(lng, lat)); return { x: p.x, y: p.y }; }
    catch (_) { return null; }
  }
  function unproject(x, y) {
    if (!map) return null;
    try { const c = map.convertPointOnPageToCoordinate(new DOMPoint(x, y)); return { lng: c.longitude, lat: c.latitude }; }
    catch (_) { return null; }
  }
  function jumpTo(lng, lat, zoom) {
    if (!map) return;
    const z = zoom != null ? zoom : getZoom();
    map.setRegionAnimated(new mapkit.CoordinateRegion(C(lng, lat), spanFromZoom(z, lat)), false);
    // a programmatic move does not always end in region-change-end; decide now
    applyPinScale();
    applyClusterMode();
  }
  function easeTo(o) {
    if (!map) return;
    const z = o.zoom != null ? o.zoom : getZoom();
    let lat = o.lat, lng = o.lng;
    /* offsetY is "put the pin in the strip above the sheet". MapKit has
       map.padding for exactly this, but padding is sticky state and this
       is a one-shot nudge, so the centre is shifted instead. */
    if (o.offsetY) {
      /* Centre on the ground BELOW the door, so the door rides above the
         centre and clear of the sheet — measured in the TARGET zoom's
         degrees per pixel, not the current one. Converting the offset
         through the current camera and then changing the zoom scaled the
         nudge by 2^(target-current): focusPin from a zoomed-out Route
         screen sent the door a screen and a half off the top. */
      const span = spanFromZoom(z, lat);
      lat = lat - (o.offsetY / H()) * span.latitudeDelta;
    }
    map.setRegionAnimated(new mapkit.CoordinateRegion(C(lng, lat), spanFromZoom(z, lat)), o.animate !== false);
    setTimeout(() => { applyPinScale(); applyClusterMode(); }, 60);
  }
  function fitBounds(bbox, padding, maxZoom) {
    if (!map) return;
    const [[w, s], [e, n]] = bbox;
    const lat = (s + n) / 2, lng = (w + e) / 2;
    const pad = 1 + ((padding || 0) / Math.max(W(), 1)) * 2;
    const span = new mapkit.CoordinateSpan(
      clamp(Math.abs(n - s) * pad, 0.00005, 170), clamp(Math.abs(e - w) * pad, 0.00005, 350));
    map.setRegionAnimated(new mapkit.CoordinateRegion(C(lng, lat), span), true);
    if (maxZoom != null) setTimeout(() => {
      if (getZoom() > maxZoom) jumpTo(lng, lat, maxZoom);
      applyPinScale();
      applyClusterMode();
    }, 320);
  }
  function resize() { if (map) { try { map.updateSize(); } catch (_) {} applyPinScale(); } }
  function setDragPan(enable) { if (map) map.isScrollEnabled = !!enable; }

  function destroy() {
    if (stopPump) { try { stopPump(); } catch (_) {} }
    if (el && clickHandler) { try { el.removeEventListener("click", clickHandler, true); } catch (_) {} }
    clickHandler = null; stopPump = null;
    if (map) { try { map.destroy(); } catch (_) {} }
    if (el) {
      el.classList.remove("mk-dots");
      el.style.removeProperty("--mkpin-s");
      el.style.removeProperty("--mkpin-ssel");
      // MapKit leaves its own DOM behind; the next engine draws into a clean box
      try { el.innerHTML = ""; } catch (_) {}
    }
    map = null; booted = false;
    hoodOverlays = []; hoodLabels = []; pinAnnos = []; pinById = new Map();
    routeOverlay = null; routeStops = []; draftOverlay = null; draftDots = [];
    puckAnno = null; tempAnno = null; selectedId = ""; lastPinFC = null; clusterMode = null;
  }

  window.MRENDER_MK = {
    name: "mapkit",
    boot, destroy,
    ready: () => !!map && booted,
    /* Apple's imagery is the base map itself, so there is nothing to wire
       and nothing that can half-succeed: if the token authorized, the
       satellite is live. */
    imagery: () => ({ live: authorized, provider: "apple", error: lastError }),
    lastError: () => lastError,
    setPins, setSelected, setHoods, setDraft, setRoute, setPuck, setTemp,
    getCenter, getZoom, project, unproject, jumpTo, easeTo, fitBounds, resize, setDragPan,
    /* WHAT APPLE ACTUALLY HOLDS. Counting DOM elements is not the same
       question: MapKit materialises an annotation's element lazily, and
       an UNAUTHORIZED map never runs the render loop that would do it. So
       the truthful measure of "did the overlays and pins attach" is the
       live map's own arrays, and this is where Settings and the capability
       test both read it. */
    counts: () => (map ? {
      overlays: map.overlays.length,
      annotations: map.annotations.length,
      hoods: hoodOverlays.length,
      labels: hoodLabels.length,
      pins: pinAnnos.length,
      routeStops: routeStops.length,
      draftDots: draftDots.length,
      selected: selectedId,
      mapType: map.mapType,
      authorized,
      anchorY: pinAnnos[0] ? pinAnnos[0].anchorOffset.y : null,
      declaredSize: pinAnnos[0] && pinAnnos[0].size ? pinAnnos[0].size.width : null,
      clustering: clusterMode,
      canvases: el ? el.querySelectorAll("canvas").length : 0,
    } : null),
    _zoomMath: { zoomFromSpan, spanFromZoom },
    _hitTest: hitTest,
  };
})();
