/* Meridian — the knocking map.
   Street view is a custom light vector cartography (OpenFreeMap positron
   tiles restyled to a clean Apple-Maps-like palette — crisp at every zoom).
   Satellite/Hybrid ride Esri imagery. Pins are GPU circle layers with a
   soft shadow and white ring. All pin data is local-first; if the style
   can't be fetched offline on first run, a raster fallback loads instead. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, tick } = MUI;
  const D = MDATA.DISPOSITIONS;

  let map = null;
  let tempMarker = null;
  let puck = null;
  let selectedPinId = "";
  let knock = null; // {mode:'new'|'re', lat, lng, pinId, disposition, reason, dm}
  let currentLead = null;
  let BASEMAPS = { street: [], satellite: ["base-sat"], hybrid: ["base-sat", "base-hyb-labels"] };
  let HYB_FALLBACK = ["base-sat", "base-hyb-labels"]; // what hybrid uses without a Google key
  let lastGoogleError = ""; // Google's own explanation when imagery is refused
  const ALL_BASE = new Set(); // every basemap layer id ever registered

  const SUBS = ["a", "b", "c", "d"];
  const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
  const VECTOR_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

  // ---------- the Apple-2026 light palette ----------
  const APPLE = {
    land: "#F6F5F1", residential: "#EFEEE8", park: "#CBE7B9", wood: "#C6E2B0",
    water: "#A5CDF5", building: "#ECEAE3", buildingLine: "#E1DED6",
    road: "#FFFFFF", roadCasing: "#E2DFD7",
    motorway: "#FBD879", motorwayCasing: "#EFBC50",
    tunnel: "#F7F0DE", tunnelCasing: "#EDE3C8",
    rail: "#DDD9E4", boundary: "#C8C2D4", runway: "#ECEAE3",
    placeText: "#26303E", minorPlaceText: "#5A6575",
    roadText: "#6E7A8A", waterText: "#4A80C4", halo: "#FFFFFF",
  };

  // Recolor the positron layer set into the palette above.
  function appleize(style) {
    const set = (l, prop, val) => { (l.paint = l.paint || {})[prop] = val; };
    style.layers.forEach((l) => {
      const id = l.id;
      if (id === "background") set(l, "background-color", APPLE.land);
      else if (id === "park") { set(l, "fill-color", APPLE.park); set(l, "fill-opacity", 0.75); }
      else if (id === "landuse_residential") { set(l, "fill-color", APPLE.residential); set(l, "fill-opacity", 0.6); }
      else if (id === "landcover_wood") { set(l, "fill-color", APPLE.wood); set(l, "fill-opacity", 0.35); }
      else if (id === "water" || id === "waterway") {
        set(l, l.type === "line" ? "line-color" : "fill-color", APPLE.water);
      } else if (id === "building") {
        set(l, "fill-color", APPLE.building); set(l, "fill-outline-color", APPLE.buildingLine);
      } else if (/aeroway/.test(id)) {
        set(l, l.type === "line" ? "line-color" : "fill-color", APPLE.runway);
      } else if (/^railway/.test(id)) set(l, "line-color", APPLE.rail);
      else if (/^boundary/.test(id)) set(l, "line-color", APPLE.boundary);
      else if (l.type === "line" && /motorway/.test(id) && /casing/.test(id)) {
        set(l, "line-color", /tunnel/.test(id) ? APPLE.tunnelCasing : APPLE.motorwayCasing);
      } else if (l.type === "line" && /motorway/.test(id)) {
        set(l, "line-color", /tunnel/.test(id) ? APPLE.tunnel : APPLE.motorway);
      } else if (l.type === "line" && /casing/.test(id)) set(l, "line-color", APPLE.roadCasing);
      else if (/^highway|^road_pier/.test(id) && l.type === "line") set(l, "line-color", APPLE.road);
      else if (id === "road_area_pier") set(l, "fill-color", APPLE.land);
      else if (l.type === "symbol") {
        const txt = /highway|road_shield/.test(id) ? APPLE.roadText
          : /water/.test(id) ? APPLE.waterText
          : /label_state|label_other|airport/.test(id) ? APPLE.minorPlaceText
          : APPLE.placeText;
        set(l, "text-color", txt);
        set(l, "text-halo-color", APPLE.halo);
        set(l, "text-halo-width", 1.1);
      }
    });
    return style;
  }

  function rasterFallbackStyle() {
    return {
      version: 8,
      sources: {
        carto: {
          type: "raster",
          tiles: SUBS.map((s) => `https://${s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png`),
          tileSize: 256,
          attribution: "© OpenStreetMap contributors © CARTO",
        },
      },
      layers: [{ id: "base-street", type: "raster", source: "carto" }],
    };
  }

  async function buildStyle() {
    let style = null;
    let vector = false;
    try {
      // hard timeout: a hanging fetch on flaky signal must never delay the map.
      // The timer stays armed through the BODY read too — an abort mid-body
      // rejects json() and drops us to the raster fallback.
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      try {
        const r = await fetch(VECTOR_STYLE_URL, { signal: ctrl.signal });
        if (r.ok) { style = appleize(await r.json()); vector = true; }
      } finally {
        clearTimeout(t);
      }
    } catch (_) { /* offline or slow first run — raster fallback below */ }
    if (!style) style = rasterFallbackStyle();
    BASEMAPS.street = style.layers.map((l) => l.id);

    // imagery modes ride on top of the street layers
    style.sources.sat = {
      type: "raster",
      tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 128, maxzoom: 19, // half tileSize = retina oversampling
      attribution: "© Esri, Maxar, Earthstar Geographics",
    };
    style.layers.push(
      // color-graded toward the vivid Google look: more saturation + contrast
      { id: "base-sat", type: "raster", source: "sat", layout: { visibility: "none" },
        paint: { "raster-contrast": 0.14, "raster-saturation": 0.15, "raster-brightness-min": 0.02 } }
    );

    if (vector) {
      // Google-style hybrid labels: clone the vector label layers and set
      // them bold-white with a dark casing — crisp at every zoom over imagery
      const hybIds = [];
      const clones = [];
      style.layers.forEach((l) => {
        if (l.type !== "symbol" || l.id.startsWith("hyb-")) return;
        const c = JSON.parse(JSON.stringify(l));
        c.id = "hyb-" + l.id;
        c.layout = c.layout || {};
        c.layout.visibility = "none";
        c.paint = Object.assign({}, c.paint, {
          "text-color": "#FFFFFF",
          "text-halo-color": "rgba(18,22,30,.80)",
          "text-halo-width": 1.6,
        });
        clones.push(c);
        hybIds.push(c.id);
      });
      style.layers.push(...clones); // above the imagery layer
      HYB_FALLBACK = ["base-sat", ...hybIds];
    } else {
      // raster fallback labels (white text, prerendered) when vector is unavailable
      style.sources["hyb-labels"] = {
        type: "raster",
        tiles: SUBS.map((s) => `https://${s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png`),
        tileSize: 256,
      };
      style.layers.push(
        { id: "base-hyb-labels", type: "raster", source: "hyb-labels", layout: { visibility: "none" } }
      );
      HYB_FALLBACK = ["base-sat", "base-hyb-labels"];
    }
    BASEMAPS.satellite = ["base-sat"];
    BASEMAPS.hybrid = HYB_FALLBACK.slice();
    style.layers.forEach((l) => ALL_BASE.add(l.id));
    return style;
  }

  // ---------- Google imagery (Map Tiles API) ----------
  // With the office's own Google key, Satellite/Hybrid become actual Google
  // tiles — the same imagery+labels the big competitor apps render.
  // the office key wins; otherwise the app ships with one
  const effectiveKey = () =>
    (STORE.settings.googleKey || MDATA.DEFAULT_GOOGLE_KEY || "").trim();

  async function googleSession(kind) {
    const s = STORE.settings;
    const gkey = effectiveKey();
    if (!gkey) return null;
    const cached = s.googleSessions && s.googleSessions[kind];
    if (cached && Number(cached.expiry) * 1000 > Date.now() + 3600e3) return cached.session;
    try {
      const body = {
        mapType: "satellite", language: "en-US", region: "US",
        highDpi: true, scale: "scaleFactor2x",
      };
      if (kind === "hybrid") body.layerTypes = ["layerRoadmap"];
      // never let a hanging request freeze the settings screen
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      let r;
      try {
        r = await fetch(
          "https://tile.googleapis.com/v1/createSession?key=" + encodeURIComponent(gkey),
          { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body), signal: ctrl.signal }
        );
      } finally {
        clearTimeout(t);
      }
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !j.session) {
        // Surface Google's own words — "enable the API", "billing", "bad key" —
        // so the fix is obvious instead of a dead end.
        lastGoogleError = (j && j.error && j.error.message) || ("HTTP " + r.status);
        return null;
      }
      lastGoogleError = "";
      s.googleSessions = Object.assign({}, s.googleSessions, {
        [kind]: { session: j.session, expiry: j.expiry },
      });
      STORE.saveSettings();
      return j.session;
    } catch (err) {
      lastGoogleError = !navigator.onLine
        ? "You're offline — connect and try again"
        : (err && err.name === "AbortError")
          ? "Google didn't respond in time — try again"
          : "Couldn't reach Google — check your connection";
      return null;
    }
  }

  // Called after map load and whenever the key changes: swaps Satellite and
  // Hybrid onto Google tiles when a session is available. Fallback stays wired.
  async function reloadImagery() {
    const key = effectiveKey();
    const kinds = [["satellite", "g-sat"], ["hybrid", "g-hyb"]];
    let keyWorks = false;
    // Validate the key FIRST, independent of the map — the map can still be
    // building its style when a rep saves a key, and a valid key must never
    // be reported as rejected just because we weren't ready yet.
    const sessions = await Promise.all(
      kinds.map(([kind]) => (key ? googleSession(kind) : Promise.resolve(null)))
    );
    for (let i = 0; i < kinds.length; i++) {
      const [kind, layerId] = kinds[i];
      const sess = sessions[i];
      if (!sess) {
        BASEMAPS[kind] = kind === "hybrid" ? HYB_FALLBACK.slice() : ["base-sat"];
        continue;
      }
      keyWorks = true;
      const styleReady = map && map.isStyleLoaded && map.isStyleLoaded();
      if (!styleReady) continue; // style.load re-runs this with the cached session
      if (!map.getSource(layerId)) {
        try {
          map.addSource(layerId, {
            type: "raster",
            tiles: [`https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(sess)}&key=${encodeURIComponent(key)}`],
            tileSize: 512, maxzoom: 22,
            attribution: "© Google",
          });
          map.addLayer(
            { id: layerId, type: "raster", source: layerId, layout: { visibility: "none" } },
            map.getLayer("pins-shadow") ? "pins-shadow" : undefined
          );
        } catch (_) { continue; }
      }
      if (map.getLayer(layerId)) {
        BASEMAPS[kind] = [layerId];
        ALL_BASE.add(layerId);
      }
    }
    if (map) applyBasemap(STORE.settings.basemap);
    return keyWorks;
  }

  function applyBasemap(mode) {
    if (!BASEMAPS[mode]) mode = "street";
    STORE.settings.basemap = mode;
    STORE.saveSettings();
    if (map) {
      const on = BASEMAPS[mode];
      // ALL_BASE holds every basemap layer ever registered, so a layer
      // dropped from BASEMAPS (e.g. Google key removed) still gets hidden
      ALL_BASE.forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", on.includes(id) ? "visible" : "none");
        }
      });
    }
    $$("#layer-menu .lm-opt").forEach((b) =>
      b.classList.toggle("sel", b.dataset.bm === mode));
    // Google attribution is required whenever Google tiles are on screen
    const gattr = $("#gattr");
    if (gattr) gattr.hidden = !BASEMAPS[mode].some((id) => id.startsWith("g-"));
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

  const PIN_RADIUS = ["interpolate", ["linear"], ["zoom"], 10, 3, 14, 6.5, 17, 10.5];

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
    // one-time migration: the clean vector street map becomes the default view
    if (!s.mapV2) { s.mapV2 = true; s.basemap = "street"; STORE.saveSettings(); }

    bindKnockSheet();
    bindLeadSheet();
    $("#fab-locate").addEventListener("click", locate);
    $("#fab-knock").addEventListener("click", () => {
      if (!map) return;
      const c = map.getCenter();
      startKnock(c.lat, c.lng);
    });
    $("#fab-layers").addEventListener("click", () => {
      tick();
      $("#layer-menu").hidden = !$("#layer-menu").hidden;
    });
    $$("#layer-menu .lm-opt").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        applyBasemap(b.dataset.bm);
        $("#layer-menu").hidden = true;
      }));
    updateHint();
    updateBrandToday();

    buildStyle().then((style) => {
      map = new maplibregl.Map({
        container: "map",
        style,
        center: s.lastCenter || [-98.35, 39.5],
        zoom: s.lastZoom != null ? s.lastZoom : (s.lastCenter ? 16 : 4),
        attributionControl: { compact: true },
        maxPitch: 0,
        dragRotate: false,
      });
      map.touchZoomRotate.disableRotation();
      // Failed tile fetches are routine in dead zones — never surface them as errors.
      map.on("error", (e) => {
        if (e && e.error && /tile|source|ajax|fetch/i.test(String(e.error.message || ""))) return;
      });

      map.on("style.load", () => {
        map.addSource("pins", { type: "geojson", data: pinsGeoJSON() });
        // soft drop shadow so pins float, Apple-style, on any ground
        map.addLayer({
          id: "pins-shadow",
          type: "circle",
          source: "pins",
          paint: {
            "circle-color": "rgba(16,24,40,.28)",
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4.5, 14, 8.5, 17, 13],
            "circle-blur": 0.9,
            "circle-translate": [0, 1.5],
          },
        });
        map.addLayer({
          id: "pins-circle",
          type: "circle",
          source: "pins",
          paint: {
            "circle-color": ["match", ["get", "disposition"],
              "sold", D.sold.color, "goback", D.goback.color, "nothome", D.nothome.color,
              "notint", D.notint.color, "dnk", D.dnk.color, "#8A93A6"],
            "circle-radius": PIN_RADIUS,
            "circle-stroke-width": ["case", ["==", ["get", "disposition"], "dnk"], 2.25, 1.75],
            "circle-stroke-color": "#FFFFFF",
          },
        });
        map.addLayer({
          id: "pins-selected",
          type: "circle",
          source: "pins",
          filter: ["==", ["get", "id"], ""],
          paint: {
            "circle-color": "rgba(0,0,0,0)",
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 14, 12, 17, 16],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#0A6CF0",
          },
        });
        applyBasemap(STORE.settings.basemap);
        refreshPins();
        reloadImagery(); // upgrades Satellite/Hybrid to Google tiles if a key is set
      });

      map.on("click", (e) => {
        // 14px tolerance box: fat-fingering near a pin opens it instead of
        // silently creating a duplicate door
        const T = 14;
        const bbox = [[e.point.x - T, e.point.y - T], [e.point.x + T, e.point.y + T]];
        const hits = map.getLayer("pins-circle")
          ? map.queryRenderedFeatures(bbox, { layers: ["pins-circle"] })
          : [];
        if (hits.length) {
          const pin = STORE.pins.find((p) => p.id === hits[0].properties.id);
          if (pin) openLead(pin);
        } else {
          startKnock(e.lngLat.lat, e.lngLat.lng);
        }
      });

      map.on("dragstart", () => { $("#layer-menu").hidden = true; });

      let saveT = null;
      map.on("moveend", () => {
        clearTimeout(saveT);
        saveT = setTimeout(() => {
          const c = map.getCenter();
          STORE.settings.lastCenter = [c.lng, c.lat];
          STORE.settings.lastZoom = map.getZoom();
          STORE.saveSettings();
        }, 600);
      });
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
    $("#map-legend").hidden = !hasPins;
  }

  function updateBrandToday() {
    const t = STORE.todayStats();
    $("#brand-today").innerHTML =
      `${t.doors} doors · ${t.dms} DMs · <b>${t.sales} sold</b> today`;
    const q = STORE.queuedCount();
    const chip = $("#sync-chip");
    chip.hidden = q === 0;
    $("#sync-chip-n").textContent = q + " queued for FieldRoutes";
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
      ? { mode: "re", pinId: pin.id, lat: pin.lat, lng: pin.lng, disposition: null, reason: null, dm: false }
      : { mode: "new", lat, lng, disposition: null, reason: null, dm: false };
    if (!pin && map) {
      if (tempMarker) tempMarker.remove();
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:50%;background:rgba(10,108,240,.2);border:2px solid #0A6CF0";
      tempMarker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    }
    // reset sheet
    $$("#knock-sheet .disp-btn").forEach((b) => b.classList.remove("sel"));
    $$("#knock-sheet .reason").forEach((b) => b.classList.remove("sel"));
    $("#knock-reasons-wrap").hidden = true;
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

  function bindKnockSheet() {
    $$("#knock-sheet .disp-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        tick();
        $$("#knock-sheet .disp-btn").forEach((b) => b.classList.remove("sel"));
        btn.classList.add("sel");
        knock.disposition = btn.dataset.d;
        const isNI = knock.disposition === "notint";
        $("#knock-reasons-wrap").hidden = !isNI;
        if (!isNI) { knock.reason = null; $$("#knock-sheet .reason").forEach((b) => b.classList.remove("sel")); }
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
      if (window.MCLOSE) MCLOSE.start(pin);
      else toast("Sold — nice.");
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
      await STORE.updatePin(pin);
      if (currentLead && currentLead.id === pin.id) $("#lead-addr").textContent = pin.address || "Address pending…";
      if (window.MCLOSE) MCLOSE.fillAddress(pin);
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
    const hist = $("#lead-history");
    hist.innerHTML = pin.history.slice().reverse().map((h) =>
      `<div class="h-item"><span class="sw ${h.disposition}"></span>` +
      `<span>${D[h.disposition].label}${h.reason ? " — " + h.reason : ""}${h.dm ? " · DM" : ""}` +
      `${h.note ? `<span style="color:var(--t3)"> · “${escapeHtml(h.note)}”</span>` : ""}</span>` +
      `<time>${MUI.fmtAgo(h.ts)}</time></div>`
    ).join("");
    $("#lead-note-in").value = pin.note || "";
    $("#lead-addr-in").value = pin.address || "";
    const sold = pin.disposition === "sold";
    const hasAgreement = STORE.customers.some((c) => c.pinId === pin.id);
    $("#lead-close-btn").hidden = hasAgreement;
    $("#lead-close-btn").textContent = sold ? "Write the agreement" : "Sold — start agreement";
    openSheet("lead-sheet");
  }

  function bindLeadSheet() {
    $("#lead-reknock").addEventListener("click", () => {
      const p = currentLead; if (!p) return;
      startKnock(p.lat, p.lng, p);
    });
    $("#lead-close-btn").addEventListener("click", () => {
      if (currentLead && window.MCLOSE) MCLOSE.start(currentLead);
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

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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

  window.MMAP = {
    init, refreshPins, updateBrandToday, focusPin, reloadImagery,
    googleError: () => lastGoogleError,
    usingOwnKey: () => !!STORE.settings.googleKey,
    clearSelection: () => { setSelected(""); currentLead = null; clearTemp(); },
    resize: () => { if (map) map.resize(); },
  };
})();
