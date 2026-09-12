/* RALLY — THE MAPLIBRE RENDERER.

   This is the map RALLY has shipped since v38, moved out of map.js and put
   behind the renderer contract so a second engine could exist beside it.
   The layers, the expressions, the cluster radii and the paint values are
   the ones that were already there and already tested — the move is a
   move, not a redesign. What changed is the shape of the seam: map.js now
   hands this file GeoJSON and gets camera answers back, and no longer
   touches a maplibregl object itself.

   IT REMAINS THE FALLBACK, and that is a deliberate capability rather than
   a leftover. The engine bytes are vendored same-origin and precached by
   the service worker, and Google's tiles are cached per URL, so this
   renderer draws a usable map on a phone with no signal. Apple's MapKit
   is a CDN script plus an authorized live service; it cannot do that.
   Until that changes, taking this out would cost RALLY offline knocking. */
(function () {
  const emptyFC = () => ({ type: "FeatureCollection", features: [] });

  let map = null;
  let on = {};
  let puck = null, tempMarker = null;
  let draftDots = [];
  let imageryLive = false;
  let lastImageryError = "";
  let wired = false;            // the style has loaded and RALLY's layers exist
  let pendingImagery = null;    // a tile URL that arrived before the layers did
  let selectedPinId = "";
  let heat = false;

  // ---------- the flat ground under everything ----------
  // Light grey, so that in a dead zone with no cached tiles the pins and
  // territories float on a deliberate surface rather than a void.
  function baseStyle() {
    const dir = new URL(".", location.href).href;
    return {
      version: 8,
      glyphs: dir + "fonts/{fontstack}/{range}.pbf",
      sources: {},
      layers: [{ id: "bg", type: "background", paint: { "background-color": "#DDDEE0" } }],
    };
  }

  function registerPinImages() {
    Object.keys(MPIN.COLORS).forEach((k) => {
      const id = "pin-" + k;
      if (!map.hasImage(id)) map.addImage(id, MPIN.imageData(MPIN.COLORS[k]), { pixelRatio: 2 });
    });
  }

  // ---------- boot ----------
  function boot(o) {
    on = (o && o.on) || {};
    if (typeof maplibregl === "undefined") {
      return Promise.resolve({ ok: false, reason: "no-library",
        detail: "Map engine failed to load — reopen the app" });
    }
    const center = (o && o.center) || [-98.35, 39.5];
    const zoom = (o && o.zoom != null) ? o.zoom : 4;
    map = new maplibregl.Map({
      container: (o && o.container) || "map",
      style: baseStyle(),
      center, zoom,
      attributionControl: { compact: true },
      maxPitch: 0,
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    // Failed tile fetches are routine in dead zones — never surface them as errors.
    map.on("error", (e) => {
      if (e && e.error && /tile|source|ajax|fetch|glyph/i.test(String(e.error.message || ""))) return;
    });

    wired = false; pendingImagery = null;
    return new Promise((res) => {
      map.on("style.load", () => {
        if (wired) return;
        wired = true;
        registerPinImages();
        addHoodLayers();
        addPinLayers();
        addRouteLayers();
        addHoodLabelLayer();
        /* Imagery asked for before the layers existed is wired now. The
           old gate was map.isStyleLoaded(), which also waits for every
           SOURCE to finish — and after an engine switch the Google
           session is already cached, so the request arrived while the
           pins' GeoJSON worker was still busy, bounced, and nothing ever
           asked again: a grey map reading "Loading imagery…" for good. */
        if (pendingImagery) { const u = pendingImagery; pendingImagery = null; setImagery({ url: u }); }
        /* If the 8 s timer won, boot has already resolved and map.js has
           painted onto layers that did not exist yet. on.ready tells it
           the layers are here now, and it paints again. */
        if (on.ready) { try { on.ready(); } catch (_) {} }
        res({ ok: true });
      });
      wireEvents();
      setTimeout(() => res({ ok: true }), 8000); // a slow style is not a dead map
    });
  }

  function wireEvents() {
    map.on("click", (e) => {
      const ll = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      const T = 16; // fat-finger box: tapping near a pin opens it, never duplicates it
      const bbox = [[e.point.x - T, e.point.y - T], [e.point.x + T, e.point.y + T]];
      let hit = null;
      const clusters = map.getLayer("pins-clusters")
        ? map.queryRenderedFeatures(bbox, { layers: ["pins-clusters"] }) : [];
      if (clusters.length) {
        hit = { kind: "cluster", clusterId: clusters[0].properties.cluster_id,
          lng: clusters[0].geometry.coordinates[0], lat: clusters[0].geometry.coordinates[1] };
      } else {
        const layers = ["pins-icon", "pins-icon-unworked", "pins-dots"].filter((l) => map.getLayer(l));
        const hits = layers.length ? map.queryRenderedFeatures(bbox, { layers }) : [];
        if (hits.length) hit = { kind: "pin", id: hits[0].properties.id };
      }
      if (on.tap) { try { on.tap(ll, hit); } catch (_) {} }
    });
    map.on("dragstart", () => { if (on.dragStart) { try { on.dragStart(); } catch (_) {} } });
    /* "move", not "moveend": a handle that only catches up when the pan
       STOPS visibly slides away from its corner for the whole gesture. */
    map.on("move", () => { if (on.move) { try { on.move(); } catch (_) {} } });
    map.on("moveend", () => {
      if (on.move) { try { on.move(); } catch (_) {} }
      if (on.moveEnd) { try { on.moveEnd(); } catch (_) {} }
    });
  }

  /* CLUSTER EXPANSION. MapLibre can say what zoom a bubble breaks apart
     at; the renderer answers with a camera move so map.js never has to
     know a cluster id exists. */
  function expandCluster(hit) {
    const go = (z) => map.easeTo({
      center: [hit.lng, hit.lat],
      zoom: Math.min((z != null ? z : map.getZoom() + 2) + 0.3, 18),
    });
    try {
      const r = map.getSource("pins").getClusterExpansionZoom(hit.clusterId, (err, z) => { if (!err) go(z); });
      if (r && typeof r.then === "function") r.then(go).catch(() => go());
    } catch (_) { go(); }
  }

  // ---------- imagery ----------
  /* map.js owns the Google session, the key and the error wording; this
     owns the raster source. Re-pointing an existing source keeps the layer
     identity and z-order (no removeLayer/addLayer churn) and leaves the
     on-screen textures up while replacements arrive. */
  function setImagery(o) {
    const url = o && o.url;
    if (!map || !url) { imageryLive = false; return false; }
    // adding a source and a layer is legal once the STYLE has loaded; it
    // does not have to wait for every other source's data to arrive
    if (!wired) { pendingImagery = url; return imageryLive; }
    try {
      const src = map.getSource("g-hyb");
      if (src) { src.setTiles([url]); imageryLive = true; return true; }
      map.addSource("g-hyb", { type: "raster", tiles: [url], tileSize: 512, maxzoom: 22 });
      map.addLayer({ id: "g-hyb", type: "raster", source: "g-hyb" },
        map.getLayer("hoods-fill") ? "hoods-fill" : undefined);
      imageryLive = true;
      return true;
    } catch (e) {
      lastImageryError = String((e && e.message) || e);
      return false;
    }
  }

  // ---------- pins ----------
  function addPinLayers() {
    /* Clustered source: a full territory import can drop thousands of
       doors at once — street level shows every pin, zoomed out they
       collapse into count bubbles so the map never turns to soup. */
    map.addSource("pins", {
      type: "geojson", data: emptyFC(),
      cluster: true, clusterMaxZoom: 15, clusterRadius: 54,
    });
    const single = ["!", ["has", "point_count"]];
    /* Imported inventory ("unworked") draws as a small flat dot until the
       rep is basically on the street — hundreds of full teardrops at
       neighborhood zoom is what made the map feel crowded. Worked doors
       keep their teardrops at every zoom: they're the story of the day. */
    const DOT_MAX_ZOOM = 16.5;
    const isUnworked = ["==", ["get", "disposition"], "unworked"];
    const notUnworked = ["!=", ["get", "disposition"], "unworked"];
    const SIZE = MPIN.sizeExpr(), SIZE_SEL = MPIN.sizeExprSelected();

    map.addLayer({
      id: "pins-dots", type: "circle", source: "pins", maxzoom: DOT_MAX_ZOOM,
      filter: ["all", single, isUnworked],
      paint: {
        "circle-color": "#2E86FF",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 2.5, 15, 4, 16.4, 5],
        "circle-stroke-width": 1.25, "circle-stroke-color": "#FFFFFF", "circle-opacity": 0.85,
      },
    });
    // soft contact shadow at the pin's tip so it floats on any ground
    map.addLayer({
      id: "pins-shadow", type: "circle", source: "pins",
      filter: ["all", single, notUnworked],
      paint: {
        "circle-color": "rgba(0,0,0,.35)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 14, 4.5, 17, 7],
        "circle-blur": 1.1, "circle-translate": [1, 1],
      },
    });
    map.addLayer({
      id: "pins-selected", type: "circle", source: "pins",
      filter: ["all", single, ["==", ["get", "id"], ""]],
      paint: {
        "circle-color": "rgba(10,132,255,.20)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 14, 13, 17, 18],
        "circle-stroke-width": 2.5, "circle-stroke-color": "#FFFFFF",
      },
    });
    // a due callback pulses: purple ring under the pin says "go NOW"
    map.addLayer({
      id: "pins-cbdue", type: "circle", source: "pins",
      filter: ["all", single, ["==", ["get", "cbdue"], 1]],
      paint: {
        "circle-color": "rgba(124,92,252,.16)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 8, 16, 13, 18, 17],
        "circle-stroke-width": 2, "circle-stroke-color": "#7C5CFC", "circle-stroke-opacity": 0.85,
      },
    });
    map.addLayer({
      id: "pins-icon", type: "symbol", source: "pins",
      filter: ["all", single, notUnworked],
      layout: {
        "icon-image": ["concat", "pin-", ["get", "disposition"]], "icon-size": SIZE,
        "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true,
      },
    });
    map.addLayer({
      id: "pins-shadow-unworked", type: "circle", source: "pins", minzoom: DOT_MAX_ZOOM,
      filter: ["all", single, isUnworked],
      paint: { "circle-color": "rgba(0,0,0,.35)", "circle-radius": 7,
        "circle-blur": 1.1, "circle-translate": [1, 1] },
    });
    map.addLayer({
      id: "pins-icon-unworked", type: "symbol", source: "pins", minzoom: DOT_MAX_ZOOM,
      filter: ["all", single, isUnworked],
      layout: {
        "icon-image": ["concat", "pin-", ["get", "disposition"]], "icon-size": SIZE,
        "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true,
      },
    });
    map.addLayer({
      id: "pins-clusters", type: "circle", source: "pins", filter: ["has", "point_count"],
      paint: {
        /* A cluster is a NAVIGATION affordance — tap it and the map goes
           there — so it takes the interaction colour rather than the
           charcoal used for primary actions. Charcoal bubbles also read
           as do-not-knock pins at a glance, which is the one colour on
           this map that must never be ambiguous. */
        "circle-color": "#0A84FF",
        "circle-radius": ["step", ["get", "point_count"], 13, 25, 17, 100, 21, 500, 26],
        "circle-stroke-width": 2.5, "circle-stroke-color": "#FFFFFF", "circle-opacity": 0.94,
      },
    });
    map.addLayer({
      id: "pins-cluster-n", type: "symbol", source: "pins", filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true,
      },
      paint: { "text-color": "#FFFFFF" },
    });
    /* THE SELECTED DOOR, DRAWN AGAIN AND LARGER, above everything else.
       A size expression on the shared layer cannot do this — the whole
       layer would grow — and the emphasis has to survive at every zoom,
       because "which pin did I just tap" is the question a rep asks most
       often on a dense street. Same image, same anchor, so the tip does
       not move a pixel when a door is selected. */
    map.addLayer({
      id: "pins-icon-sel", type: "symbol", source: "pins",
      filter: ["all", single, ["==", ["get", "id"], ""]],
      layout: {
        "icon-image": ["concat", "pin-", ["get", "disposition"]], "icon-size": SIZE_SEL,
        "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true,
      },
    });
  }

  function setPins(fc, sel) {
    const src = map && map.getSource("pins");
    if (src) src.setData(fc);
    if (sel !== undefined) setSelected(sel);
  }

  function setSelected(id) {
    selectedPinId = id || "";
    const f = ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], selectedPinId]];
    if (map && map.getLayer("pins-icon-sel")) map.setFilter("pins-icon-sel", f);
    if (map && map.getLayer("pins-selected")) map.setFilter("pins-selected", f);
  }

  // ---------- territories ----------
  function addHoodLayers() {
    /* The label rides a SEPARATE source on purpose: MapLibre parses all of
       a source's layers in one worker job, so a symbol layer waiting on
       glyphs would stall the fill and line of the same source. */
    map.addSource("hoods", { type: "geojson", data: emptyFC() });
    map.addSource("hoods-labels", { type: "geojson", data: emptyFC() });
    const dimmed = (full, faded) => ["case", ["==", ["get", "dim"], 1], faded, full];
    map.addLayer({
      id: "hoods-fill", type: "fill", source: "hoods",
      paint: { "fill-color": ["get", "color"], "fill-opacity": dimmed(0.16, 0.05) },
    });
    map.addLayer({
      id: "hoods-line", type: "line", source: "hoods",
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 2.0, 17, 3.6],
        "line-opacity": dimmed(0.92, 0.28),
      },
    });
  }

  function addHoodLabelLayer() {
    const dimmed = (full, faded) => ["case", ["==", ["get", "dim"], 1], faded, full];
    map.addLayer({
      id: "hoods-label", type: "symbol", source: "hoods-labels",
      minzoom: 11, // a name on a hood the size of a fingernail is noise
      layout: {
        "text-field": ["case", ["!=", ["get", "rep"], ""],
          ["format", ["get", "name"], {}, "\n", {}, ["get", "rep"], { "font-scale": 0.82 }],
          ["get", "name"]],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 12, 11, 16, 14],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#FFFFFF", "text-halo-color": "rgba(11,15,22,.75)", "text-halo-width": 1.6,
        // a faded hood's name fades with it, or the focus-on-one-rep view reads as a label soup
        "text-opacity": dimmed(1, 0.35),
      },
    });
  }

  // One Point per hood at the ring centroid: MapLibre anchors the label
  // there instead of once per tile-clipped polygon slice.
  function labelsFC(data) {
    return {
      type: "FeatureCollection",
      features: data.features.map((f) => {
        const ring = f.geometry.coordinates[0];
        let x = 0, y = 0;
        ring.forEach(([lng, lat]) => { x += lng; y += lat; });
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [x / ring.length, y / ring.length] },
          properties: f.properties,
        };
      }),
    };
  }

  function setHoods(fc, opts) {
    heat = !!(opts && opts.heat);
    if (!map) return;
    const src = map.getSource("hoods");
    if (src) src.setData(fc);
    const lsrc = map.getSource("hoods-labels");
    if (lsrc) lsrc.setData(labelsFC(fc));
    if (!map.getLayer("hoods-fill")) return;
    const colorProp = ["get", heat ? "fresh" : "color"];
    const dimmed = (full, faded) => ["case", ["==", ["get", "dim"], 1], faded, full];
    map.setPaintProperty("hoods-fill", "fill-color", colorProp);
    map.setPaintProperty("hoods-line", "line-color", colorProp);
    /* Translucent fill, STRONG outline — the locked look. Over satellite
       photography a weak edge disappears into rooftops, and the edge is the
       part that answers "am I still on my turf?". */
    map.setPaintProperty("hoods-fill", "fill-opacity", heat ? 0.25 : dimmed(0.15, 0.04));
    map.setPaintProperty("hoods-line", "line-opacity", heat ? 0.75 : dimmed(0.92, 0.28));
    if (map.getLayer("hoods-label")) {
      map.setLayoutProperty("hoods-label", "visibility",
        (opts && opts.labels) ? "visible" : "none");
    }
  }

  // ---------- the outline being drawn ----------
  function draftData() {
    const pts = draftDots.map((p) => ({
      type: "Feature", geometry: { type: "Point", coordinates: p }, properties: {},
    }));
    const shapes = [];
    if (draftDots.length >= 2) {
      shapes.push({ type: "Feature", properties: {},
        geometry: { type: "LineString", coordinates: draftDots } });
    }
    if (draftDots.length >= 3) {
      shapes.push({ type: "Feature", properties: {},
        geometry: { type: "Polygon", coordinates: [[...draftDots, draftDots[0]]] } });
    }
    return { type: "FeatureCollection", features: [...shapes, ...pts] };
  }

  function ensureDraftLayers() {
    if (map.getSource("hood-draft")) return;
    map.addSource("hood-draft", { type: "geojson", data: draftData() });
    map.addLayer({ id: "hood-draft-fill", type: "fill", source: "hood-draft",
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": "#0A6CF0", "fill-opacity": 0.12 } });
    map.addLayer({ id: "hood-draft-line", type: "line", source: "hood-draft",
      filter: ["!=", ["geometry-type"], "Point"],
      paint: { "line-color": "#0A6CF0", "line-width": 2.5, "line-dasharray": [1.6, 1.2] } });
    map.addLayer({ id: "hood-draft-pts", type: "circle", source: "hood-draft",
      filter: ["==", ["geometry-type"], "Point"],
      paint: { "circle-color": "#FFFFFF", "circle-radius": 6,
        "circle-stroke-color": "#0A6CF0", "circle-stroke-width": 3 } });
  }

  function setDraft(dots) {
    draftDots = Array.isArray(dots) ? dots : [];
    if (!map) return;
    if (!draftDots.length && !map.getSource("hood-draft")) return; // nothing to clear
    try {
      ensureDraftLayers();
      map.getSource("hood-draft").setData(draftData());
    } catch (_) { /* style mid-reload — the next set repaints it */ }
  }

  // ---------- the walking route ----------
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
      paint: { "circle-color": "#0A6CF0", "circle-radius": 9.5,
        "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2 },
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

  function setRoute(fc) {
    if (map && map.getSource("route")) map.getSource("route").setData(fc || emptyFC());
  }

  // ---------- puck and the pending knock ----------
  function marker(ll, css, ref) {
    if (!map) return null;
    if (ref) { ref.setLngLat([ll.lng, ll.lat]); return ref; }
    const el = document.createElement("div");
    el.style.cssText = css;
    return new maplibregl.Marker({ element: el }).setLngLat([ll.lng, ll.lat]).addTo(map);
  }
  function setPuck(ll) {
    if (!ll) { if (puck) { puck.remove(); puck = null; } return; }
    puck = marker(ll,
      "width:16px;height:16px;border-radius:50%;background:#0A6CF0;border:3px solid #fff;" +
      "box-shadow:0 0 0 6px rgba(10,108,240,.22),0 1px 4px rgba(16,24,40,.3)", puck);
  }
  function setTemp(ll) {
    if (!ll) { if (tempMarker) { tempMarker.remove(); tempMarker = null; } return; }
    tempMarker = marker(ll,
      "width:18px;height:18px;border-radius:50%;background:rgba(94,160,255,.25);border:2px solid #5EA0FF",
      tempMarker);
  }

  // ---------- camera ----------
  const getCenter = () => { if (!map) return null; const c = map.getCenter(); return { lng: c.lng, lat: c.lat }; };
  const getZoom = () => (map ? map.getZoom() : 16);
  const project = (lng, lat) => { if (!map) return null; const p = map.project([lng, lat]); return { x: p.x, y: p.y }; };
  const unproject = (x, y) => { if (!map) return null; const l = map.unproject([x, y]); return { lng: l.lng, lat: l.lat }; };
  const jumpTo = (lng, lat, zoom) => {
    if (map) map.jumpTo({ center: [lng, lat], zoom: zoom != null ? zoom : map.getZoom() });
  };
  function easeTo(o) {
    if (!map) return;
    map.flyTo({
      center: [o.lng, o.lat],
      zoom: o.zoom != null ? o.zoom : map.getZoom(),
      offset: o.offsetY ? [0, -o.offsetY] : [0, 0],
    });
  }
  const fitBounds = (bbox, padding, maxZoom) => {
    if (map) map.fitBounds(bbox, { padding: padding || 70, maxZoom: maxZoom != null ? maxZoom : 17 });
  };
  const resize = () => { if (map) map.resize(); };
  /* Hand the camera over. While a leader is dragging a whole hood, the map
     must hold still — otherwise its own drag-pan runs alongside and keeps
     the grabbed ground under the finger, so the shape never moves and the
     map slides away instead. */
  const setDragPan = (enable) => {
    if (!map || !map.dragPan) return;
    if (enable) map.dragPan.enable(); else map.dragPan.disable();
  };
  function destroy() {
    if (map) { try { map.remove(); } catch (_) {} }
    map = null; puck = null; tempMarker = null; draftDots = []; imageryLive = false;
    wired = false; pendingImagery = null;
  }

  window.MRENDER_GL = {
    name: "maplibre",
    boot, destroy, expandCluster,
    ready: () => !!map,
    setImagery,
    imagery: () => ({ live: imageryLive, provider: "google", error: lastImageryError }),
    lastError: () => lastImageryError,
    setPins, setSelected, setHoods, setDraft, setRoute, setPuck, setTemp,
    getCenter, getZoom, project, unproject, jumpTo, easeTo, fitBounds, resize, setDragPan,
  };
})();
