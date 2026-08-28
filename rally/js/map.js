/* RALLY — the knocking map.
   One view, on purpose: Google hybrid — vivid satellite imagery with
   Google's own street labels, 512px retina tiles, the same look the top
   competitor apps run. No basemap menu, no fallback cartography; the
   built-in office key makes imagery a given, not a setting. Glyphs for
   hood labels are bundled with the app, so the map has exactly one
   external dependency: Google tiles. Offline, cached tiles keep knocked
   neighborhoods rendering; brand-new ground waits for signal.
   Pins are glossy 3D teardrop markers in the disposition colors; hoods
   (rep territories) render as tinted polygons under the pins. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, tick } = MUI;
  const D = MDATA.DISPOSITIONS;

  let map = null;
  let tempMarker = null;
  let puck = null;
  let selectedPinId = "";
  let knock = null; // {mode:'new'|'re', lat, lng, pinId, disposition, reason, dm}
  let currentLead = null;
  let lastGoogleError = ""; // Google's own explanation when imagery is refused
  let wiringP = null;       // in-flight imagery wire-up, shared by all callers

  // ---------- style ----------
  // Near-black ground: in dead zones with no cached tiles, pins and hoods
  // float on premium dark instead of a beige void.
  function baseStyle() {
    const dir = new URL(".", location.href).href;
    return {
      version: 8,
      glyphs: dir + "fonts/{fontstack}/{range}.pbf",
      sources: {},
      layers: [
        { id: "bg", type: "background", paint: { "background-color": "#10141B" } },
      ],
    };
  }

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

  async function wireImagery() {
    {
      const sess = await googleSession();
      updateNetHint(!!sess);
      const styleReady = map && map.isStyleLoaded && map.isStyleLoaded();
      if (!sess || !styleReady) return !!sess;
      const src = map.getSource("g-hyb");
      if (src) {
        // session rotated → point the existing source at the new URL
        try { src.setTiles([tileUrl(sess)]); } catch (_) {}
      } else {
        try {
          map.addSource("g-hyb", {
            type: "raster", tiles: [tileUrl(sess)],
            tileSize: 512, maxzoom: 22, attribution: "© Google",
          });
          map.addLayer(
            { id: "g-hyb", type: "raster", source: "g-hyb" },
            map.getLayer("hoods-fill") ? "hoods-fill" : undefined
          );
        } catch (_) { return false; }
      }
      const gattr = $("#gattr");
      if (gattr) gattr.hidden = false; // Google attribution is required on-screen
      return true;
    }
  }

  function updateNetHint(haveImagery) {
    const el = $("#net-hint");
    if (!el) return;
    el.hidden = haveImagery || !!(map && map.getSource("g-hyb"));
    if (!el.hidden) {
      el.textContent = navigator.onLine
        ? (lastGoogleError || "Loading imagery…")
        : "Offline — knocked areas still work; imagery returns with signal";
    }
  }

  // ---------- teardrop pin images ----------
  // Glossy 3D map pins (the classic teardrop with a white hole), one per
  // disposition color, drawn on canvas at 2x and registered as map images.
  function shade(hex, f) {
    // f > 0 lightens toward white, f < 0 darkens toward black
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return `rgb(${r},${g},${b})`;
  }

  function makePinImage(color) {
    const S = 96; // 48 CSS px @2x
    const cv = document.createElement("canvas");
    cv.width = S; cv.height = S;
    const ctx = cv.getContext("2d");
    const x = S / 2, headR = S * 0.30, headCy = S * 0.335, tipY = S * 0.955;

    const tear = () => {
      ctx.beginPath();
      ctx.moveTo(x, tipY);
      ctx.bezierCurveTo(x - headR * 0.52, tipY - S * 0.24, x - headR, headCy + headR * 0.72, x - headR, headCy);
      ctx.arc(x, headCy, headR, Math.PI, 0); // top semicircle (sweeps through 12 o'clock)
      ctx.bezierCurveTo(x + headR, headCy + headR * 0.72, x + headR * 0.52, tipY - S * 0.24, x, tipY);
      ctx.closePath();
    };

    // body
    tear();
    ctx.fillStyle = color;
    ctx.fill();

    // 3D shading: darker toward the lower-right…
    tear();
    const dark = ctx.createLinearGradient(x - headR, headCy - headR, x + headR, tipY);
    dark.addColorStop(0, "rgba(0,0,0,0)");
    dark.addColorStop(1, "rgba(0,0,0,.30)");
    ctx.fillStyle = dark;
    ctx.fill();

    // …and a soft gloss bloom on the upper-left
    tear();
    ctx.save();
    ctx.clip();
    const gloss = ctx.createRadialGradient(
      x - headR * 0.42, headCy - headR * 0.48, headR * 0.08,
      x - headR * 0.2, headCy - headR * 0.2, headR * 1.5);
    gloss.addColorStop(0, "rgba(255,255,255,.85)");
    gloss.addColorStop(0.35, "rgba(255,255,255,.28)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.fill();
    ctx.restore();

    // rim — light on dark pins (DNK black), dark on bright pins
    tear();
    const lum = parseInt(color.slice(1), 16);
    const isDark = (((lum >> 16) & 255) + ((lum >> 8) & 255) + (lum & 255)) / 3 < 70;
    ctx.strokeStyle = isDark ? "rgba(255,255,255,.5)" : shade(color, -0.28);
    ctx.lineWidth = 2;
    ctx.stroke();

    // the white hole
    ctx.beginPath();
    ctx.arc(x, headCy, headR * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    // faint inner shadow at the hole's top edge sells the depth
    ctx.beginPath();
    ctx.arc(x, headCy, headR * 0.42 - 1, Math.PI * 1.05, Math.PI * 1.95);
    ctx.strokeStyle = "rgba(0,0,0,.18)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    return ctx.getImageData(0, 0, S, S);
  }

  function registerPinImages() {
    Object.keys(D).forEach((k) => {
      const id = "pin-" + k;
      if (!map.hasImage(id)) map.addImage(id, makePinImage(D[k].color), { pixelRatio: 2 });
    });
  }

  function pinsGeoJSON() {
    return {
      type: "FeatureCollection",
      features: STORE.pins.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: { id: p.id, disposition: p.disposition },
      })),
    };
  }

  // ---------- hoods (territories) ----------
  let heatMode = false;      // manager layer: color by freshness, not ownership
  let emphasizeRep = null;   // manager tapped a rep — everyone else fades

  function hoodsGeoJSON() {
    const me = STORE.currentUser();
    const manager = STORE.isManager();
    return {
      type: "FeatureCollection",
      features: STORE.territories
        .filter((t) => t.points && t.points.length >= 3)
        .map((t) => {
          const u = t.assignedTo && STORE.userById(t.assignedTo);
          // reps see their own turf full-strength; the rest of the market
          // stays visible but faded — "THIS is my area" at a glance.
          // A manager focusing one rep gets the same fade on everyone else.
          const dim = manager
            ? (emphasizeRep && t.assignedTo !== emphasizeRep ? 1 : 0)
            : (!me || t.assignedTo !== me.id ? 1 : 0);
          return {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[...t.points, t.points[0]]] },
            properties: {
              id: t.id, name: t.name || "Hood",
              rep: u ? u.name : "",
              color: STORE.hoodColor(t),
              fresh: STORE.freshness(t).color,
              dim,
            },
          };
        }),
    };
  }

  function applyHeatPaint() {
    if (!map || !map.getLayer("hoods-fill")) return;
    const colorProp = ["get", heatMode ? "fresh" : "color"];
    const dimmed = (full, faded) => ["case", ["==", ["get", "dim"], 1], faded, full];
    map.setPaintProperty("hoods-fill", "fill-color", colorProp);
    map.setPaintProperty("hoods-line", "line-color", colorProp);
    map.setPaintProperty("hoods-fill", "fill-opacity", heatMode ? 0.3 : dimmed(0.16, 0.05));
    map.setPaintProperty("hoods-line", "line-opacity", heatMode ? 0.95 : dimmed(0.9, 0.3));
    const heatLegend = $("#heat-legend");
    if (heatLegend) heatLegend.hidden = !heatMode;
    updateHint(); // swaps the disposition legend out while heat is on
  }

  function setHeatMode(on) {
    heatMode = !!on;
    refreshHoods();
    applyHeatPaint();
  }

  // manager taps a rep: fit their turf, fade everyone else until the next
  // map touch
  function focusRep(userId) {
    const hoods = STORE.hoodsOf(userId).filter((t) => t.points && t.points.length);
    if (!map || !hoods.length) { toast("No hoods assigned yet — give them one"); return; }
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    hoods.forEach((t) => t.points.forEach(([lng, lat]) => {
      minX = Math.min(minX, lng); maxX = Math.max(maxX, lng);
      minY = Math.min(minY, lat); maxY = Math.max(maxY, lat);
    }));
    emphasizeRep = userId;
    refreshHoods();
    map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 70, maxZoom: 16.5 });
  }

  function clearEmphasis() {
    if (!emphasizeRep) return;
    emphasizeRep = null;
    refreshHoods();
  }

  function refreshHoods() {
    if (!map) return;
    const data = hoodsGeoJSON();
    const src = map.getSource("hoods");
    if (src) src.setData(data);
    const lsrc = map.getSource("hoods-labels");
    if (lsrc) lsrc.setData(data);
  }

  function addHoodLayers() {
    // The label rides a SEPARATE source on purpose: MapLibre parses all of
    // a source's layers in one worker job, so a symbol layer waiting on
    // glyphs would stall the fill and line of the same source. Split
    // sources = the tint always renders (glyphs are bundled locally now,
    // but the isolation stays cheap insurance).
    map.addSource("hoods", { type: "geojson", data: hoodsGeoJSON() });
    map.addSource("hoods-labels", { type: "geojson", data: hoodsGeoJSON() });
    const dimmed = (full, faded) =>
      ["case", ["==", ["get", "dim"], 1], faded, full];
    map.addLayer({
      id: "hoods-fill", type: "fill", source: "hoods",
      paint: { "fill-color": ["get", "color"], "fill-opacity": dimmed(0.16, 0.05) },
    });
    map.addLayer({
      id: "hoods-line", type: "line", source: "hoods",
      paint: { "line-color": ["get", "color"], "line-width": 2.25, "line-opacity": dimmed(0.9, 0.3) },
    });
    map.addLayer({
      id: "hoods-label", type: "symbol", source: "hoods-labels",
      layout: {
        "text-field": ["case", ["!=", ["get", "rep"], ""],
          ["concat", ["get", "name"], "\n", ["get", "rep"]], ["get", "name"]],
        "text-font": ["Noto Sans Bold"],
        "text-size": 13,
        "text-line-height": 1.25,
      },
      paint: {
        // white labels with a dark casing read on imagery at any zoom
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(14,17,22,.78)",
        "text-halo-width": 1.8,
        "text-opacity": dimmed(1, 0.45),
      },
    });
  }

  // ---------- re-knock route rendering ----------
  const emptyFC = () => ({ type: "FeatureCollection", features: [] });

  function addRouteLayers() {
    map.addSource("route", { type: "geojson", data: emptyFC() });
    map.addLayer({
      id: "route-line", type: "line", source: "route",
      filter: ["==", ["geometry-type"], "LineString"],
      paint: { "line-color": "#5EA0FF", "line-width": 3, "line-dasharray": [0.8, 1.6], "line-opacity": 0.9 },
    });
    map.addLayer({
      id: "route-stops", type: "circle", source: "route",
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": "#0A6CF0", "circle-radius": 9.5,
        "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2,
      },
    });
    map.addLayer({
      id: "route-nums", type: "symbol", source: "route",
      filter: ["==", ["geometry-type"], "Point"],
      layout: {
        "text-field": ["get", "n"], "text-font": ["Noto Sans Bold"], "text-size": 11,
        "text-allow-overlap": true,
      },
      paint: { "text-color": "#FFFFFF" },
    });
  }

  function showRoute(pins) {
    if (!map || !map.getSource("route")) return;
    map.getSource("route").setData({
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

  function clearRoute() {
    if (map && map.getSource("route")) map.getSource("route").setData(emptyFC());
  }

  const PIN_ICON_SIZE = ["interpolate", ["linear"], ["zoom"], 10, 0.30, 14, 0.52, 16, 0.72, 18, 0.95];

  function init() {
    if (typeof maplibregl === "undefined") {
      const hint = $("#knock-hint");
      hint.hidden = false;
      hint.textContent = "Map engine failed to load — reopen the app";
      bindKnockSheet();
      bindLeadSheet();
      return;
    }
    const s = STORE.settings;

    bindKnockSheet();
    bindLeadSheet();
    $("#fab-locate").addEventListener("click", locate);
    $("#fab-knock").addEventListener("click", () => {
      if (!map) return;
      const c = map.getCenter();
      startKnock(c.lat, c.lng);
    });
    // signal returning is the moment to fetch a session and light imagery up
    addEventListener("online", () => reloadImagery());
    updateHint();
    updateBrandToday();

    map = new maplibregl.Map({
      container: "map",
      style: baseStyle(),
      center: s.lastCenter || [-98.35, 39.5],
      zoom: s.lastZoom != null ? s.lastZoom : (s.lastCenter ? 16 : 4),
      attributionControl: { compact: true },
      maxPitch: 0,
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    // Failed tile fetches are routine in dead zones — never surface them as errors.
    map.on("error", (e) => {
      if (e && e.error && /tile|source|ajax|fetch|glyph/i.test(String(e.error.message || ""))) return;
    });

    map.on("style.load", () => {
      registerPinImages();
      addHoodLayers();
      map.addSource("pins", { type: "geojson", data: pinsGeoJSON() });
      // soft contact shadow at the pin's tip so it floats on any ground
      map.addLayer({
        id: "pins-shadow",
        type: "circle",
        source: "pins",
        paint: {
          "circle-color": "rgba(0,0,0,.35)",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 14, 4.5, 17, 7],
          "circle-blur": 1.1,
          "circle-translate": [1, 1],
        },
      });
      map.addLayer({
        id: "pins-selected",
        type: "circle",
        source: "pins",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-color": "rgba(94,160,255,.18)",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 7, 14, 11, 17, 15],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#5EA0FF",
        },
      });
      map.addLayer({
        id: "pins-icon",
        type: "symbol",
        source: "pins",
        layout: {
          "icon-image": ["concat", "pin-", ["get", "disposition"]],
          "icon-size": PIN_ICON_SIZE,
          "icon-anchor": "bottom",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
      addRouteLayers();
      refreshPins();
      refreshHoods();
      reloadImagery();
      if (window.MHOODS) MHOODS.onMapReady(map);
    });

    map.on("click", (e) => {
      // hood drawing (dot mode) consumes clicks first
      if (window.MHOODS && MHOODS.handleMapClick(e)) return;
      clearEmphasis();
      // 16px tolerance box: fat-fingering near a pin opens it instead of
      // silently creating a duplicate door
      const T = 16;
      const bbox = [[e.point.x - T, e.point.y - T], [e.point.x + T, e.point.y + T]];
      const hits = map.getLayer("pins-icon")
        ? map.queryRenderedFeatures(bbox, { layers: ["pins-icon"] })
        : [];
      if (hits.length) {
        const pin = STORE.pins.find((p) => p.id === hits[0].properties.id);
        if (pin) openLead(pin);
      } else {
        startKnock(e.lngLat.lat, e.lngLat.lng);
      }
    });

    map.on("dragstart", () => { $("#hood-menu").hidden = true; clearEmphasis(); });

    let saveT = null;
    map.on("moveend", () => {
      updateHoodStrip();
      clearTimeout(saveT);
      saveT = setTimeout(() => {
        const c = map.getCenter();
        STORE.settings.lastCenter = [c.lng, c.lat];
        STORE.settings.lastZoom = map.getZoom();
        STORE.saveSettings();
      }, 600);
    });
    $("#brand-hood").addEventListener("click", () => {
      const t = STORE.territories.find((x) => x.id === stripHoodId);
      if (t) focusHood(t);
    });
  }

  function refreshPins() {
    const src = map && map.getSource("pins");
    if (src) src.setData(pinsGeoJSON());
    updateHint();
    updateBrandToday();
  }

  function updateHint() {
    const hasPins = STORE.pins.length > 0;
    $("#knock-hint").hidden = hasPins;
    $("#map-legend").hidden = !hasPins || heatMode; // heat legend takes the slot
  }

  function updateBrandToday() {
    const t = STORE.todayStats();
    $("#brand-today").innerHTML =
      `${t.doors} doors · ${t.dms} DMs · <b>${t.sales} sold</b> today`;
    const q = STORE.queuedCount();
    const chip = $("#sync-chip");
    chip.hidden = q === 0;
    $("#sync-chip-n").textContent = q + " queued for FieldRoutes";
    updateHoodStrip();
  }

  // "THIS IS MY AREA": the hood under the map center, with live progress.
  let stripHoodId = null;
  function updateHoodStrip() {
    const el = $("#brand-hood");
    if (!el) return;
    let hood = null;
    if (map) {
      const c = map.getCenter();
      hood = STORE.territories.find((t) =>
        t.points && t.points.length >= 3 && STORE.inHood(t, c.lng, c.lat)) || null;
    }
    if (!hood) {
      // off-turf: fall back to the rep's own first hood so the goal stays visible
      const me = STORE.currentUser();
      if (me && !STORE.isManager()) hood = STORE.hoodsOf(me.id)[0] || null;
    }
    stripHoodId = hood ? hood.id : null;
    el.hidden = !hood;
    if (!hood) return;
    const st = STORE.hoodStats(hood);
    const u = hood.assignedTo && STORE.userById(hood.assignedTo);
    el.innerHTML =
      `<span class="bh-dot" style="background:${STORE.hoodColor(hood)}"></span>` +
      `<b>${MUI.esc(hood.name)}</b> · ` +
      (st.homes
        ? `${st.knocked}/${st.homes} knocked · <b>${st.pct}%</b>`
        : `${st.knocked} knocked`) +
      (u ? ` · ${MUI.esc(u.name)}` : "");
  }

  function setSelected(id) {
    selectedPinId = id || "";
    if (map && map.getLayer("pins-selected")) {
      map.setFilter("pins-selected", ["==", ["get", "id"], selectedPinId]);
    }
  }

  // ---------- locate ----------
  function locate() {
    if (!navigator.geolocation || !map) { toast("Location not available"); return; }
    const btn = $("#fab-locate");
    btn.classList.add("armed");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        btn.classList.remove("armed");
        const { latitude, longitude } = pos.coords;
        map.flyTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 16.5), essential: true });
        if (!puck) {
          const el = document.createElement("div");
          el.style.cssText =
            "width:16px;height:16px;border-radius:50%;background:#0A6CF0;border:3px solid #fff;box-shadow:0 0 0 6px rgba(10,108,240,.22),0 1px 4px rgba(16,24,40,.3)";
          puck = new maplibregl.Marker({ element: el }).setLngLat([longitude, latitude]).addTo(map);
        } else {
          puck.setLngLat([longitude, latitude]);
        }
      },
      () => { btn.classList.remove("armed"); toast("Couldn't get your location"); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
    );
  }

  // ---------- knock sheet ----------
  function startKnock(lat, lng, pin) {
    knock = pin
      ? { mode: "re", pinId: pin.id, lat: pin.lat, lng: pin.lng, disposition: null, reason: null, dm: false, callbackAt: null }
      : { mode: "new", lat, lng, disposition: null, reason: null, dm: false, callbackAt: null };
    if (!pin && map) {
      if (tempMarker) tempMarker.remove();
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:50%;background:rgba(94,160,255,.25);border:2px solid #5EA0FF";
      tempMarker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    }
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

  async function saveKnock() {
    if (!knock || !knock.disposition) return;
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
      toast("Couldn't save — storage may be full. Try again.");
      return; // sheet stays open; nothing is silently lost
    }
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

  function clearTemp() {
    if (tempMarker) { tempMarker.remove(); tempMarker = null; }
  }

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

  // ---------- lead sheet ----------
  function openLead(pin) {
    currentLead = pin;
    setSelected(pin.id);
    $("#lead-addr").textContent = pin.address || "Address pending…";
    $("#lead-coords").textContent = pin.lat.toFixed(5) + ", " + pin.lng.toFixed(5);
    const d = D[pin.disposition];
    $("#lead-badge").innerHTML =
      `<span class="sw ${pin.disposition}"></span>${d.label}${pin.reason ? " · " + pin.reason : ""}${pin.dm ? " · DM ✓" : ""}`;
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
         <span class="opp-why">${opp.why.map((w) => MUI.esc(w)).join(" · ")}</span>`;
    }
    const hist = $("#lead-history");
    hist.innerHTML = pin.history.slice().reverse().map((h) =>
      `<div class="h-item"><span class="sw ${h.disposition}"></span>` +
      `<span>${D[h.disposition].label}${h.reason ? " — " + h.reason : ""}${h.dm ? " · DM" : ""}` +
      `${h.note ? `<span style="color:var(--t3)"> · “${MUI.esc(h.note)}”</span>` : ""}</span>` +
      `<time>${MUI.fmtAgo(h.ts)}</time></div>`
    ).join("");
    $("#lead-note-in").value = pin.note || "";
    $("#lead-addr-in").value = pin.address || "";
    const sold = pin.disposition === "sold";
    const hasAgreement = STORE.customers.some((c) => c.pinId === pin.id);
    $("#lead-close-btn").hidden = hasAgreement;
    // an interested door becomes a LEAD — name and number captured now,
    // agreement whenever they're ready
    $("#lead-close-btn").textContent = sold ? "Create the customer" : "＋ Add as lead";
    openSheet("lead-sheet");
  }

  function bindLeadSheet() {
    $("#lead-reknock").addEventListener("click", () => {
      const p = currentLead; if (!p) return;
      startKnock(p.lat, p.lng, p);
    });
    $("#lead-close-btn").addEventListener("click", () => {
      if (currentLead && window.MCUST) { closeSheet(); MCUST.startForPin(currentLead); }
    });
    $("#lead-save").addEventListener("click", async () => {
      const p = currentLead; if (!p) return;
      p.note = $("#lead-note-in").value.trim();
      p.address = $("#lead-addr-in").value.trim();
      await STORE.updatePin(p);
      toast("Saved");
      closeSheet(); setSelected("");
    });
    $("#lead-delete").addEventListener("click", async () => {
      const p = currentLead; if (!p) return;
      if (!confirm("Delete this pin and its history?")) return;
      await STORE.deletePin(p.id);
      currentLead = null;
      refreshPins();
      if (window.MSTAT) MSTAT.render();
      closeSheet(); setSelected("");
      toast("Pin deleted");
    });
  }

  // jump from a customer card to their door on the map
  function focusPin(pinId) {
    const p = STORE.pins.find((x) => x.id === pinId);
    if (!p) return;
    if (map) {
      map.resize();
      map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 17.5), essential: true });
    }
    openLead(p);
  }

  // fit the map to a hood and highlight it briefly
  function focusHood(t) {
    if (!map || !t.points || !t.points.length) return;
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    t.points.forEach(([lng, lat]) => {
      minX = Math.min(minX, lng); maxX = Math.max(maxX, lng);
      minY = Math.min(minY, lat); maxY = Math.max(maxY, lat);
    });
    map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 70, maxZoom: 17 });
  }

  window.MMAP = {
    init, refreshPins, refreshHoods, updateBrandToday, focusPin, focusHood, reloadImagery,
    startKnock, focusRep, setHeatMode, showRoute, clearRoute,
    heatMode: () => heatMode,
    googleError: () => lastGoogleError,
    usingOwnKey: () => !!STORE.settings.googleKey,
    clearSelection: () => { setSelected(""); currentLead = null; clearTemp(); },
    resize: () => { if (map) map.resize(); },
    getMap: () => map,
  };
})();
