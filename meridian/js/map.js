/* Meridian — the knocking map.
   Dark raster basemap (CARTO), GPU circle-layer pins colored by disposition,
   tap-to-knock, lead sheets, and a locate puck. All pin data is local-first. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, tick } = MUI;
  const D = MDATA.DISPOSITIONS;

  let map = null;
  let tempMarker = null;
  let puck = null;
  let selectedPinId = "";
  let knock = null; // {mode:'new'|'re', lat, lng, pinId, disposition, reason, dm}
  let currentLead = null;

  const SUBS = ["a", "b", "c", "d"];
  const STYLE = {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: SUBS.map((s) => `https://${s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png`),
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CARTO",
      },
    },
    layers: [{ id: "base", type: "raster", source: "carto" }],
  };

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
    map = new maplibregl.Map({
      container: "map",
      style: STYLE,
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

    // style.load fires as soon as the inline style parses — pins render and
    // knocking works even if the tile server is unreachable (dead zones, first run offline)
    map.on("style.load", () => {
      map.addSource("pins", { type: "geojson", data: pinsGeoJSON() });
      map.addLayer({
        id: "pins-circle",
        type: "circle",
        source: "pins",
        paint: {
          "circle-color": ["match", ["get", "disposition"],
            "sold", D.sold.color, "goback", D.goback.color, "nothome", D.nothome.color,
            "notint", D.notint.color, "dnk", D.dnk.color, "#8A93A6"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 14, 6.5, 17, 10.5],
          "circle-stroke-width": ["case", ["==", ["get", "disposition"], "dnk"], 2, 1.5],
          "circle-stroke-color": ["case", ["==", ["get", "disposition"], "dnk"], "#F3F5F9", "#0B0E14"],
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
          "circle-stroke-color": "#D9B36C",
        },
      });
      refreshPins();
    });

    map.on("click", (e) => {
      const hits = map.getLayer("pins-circle")
        ? map.queryRenderedFeatures(e.point, { layers: ["pins-circle"] })
        : [];
      if (hits.length) {
        const pin = STORE.pins.find((p) => p.id === hits[0].properties.id);
        if (pin) openLead(pin);
      } else {
        startKnock(e.lngLat.lat, e.lngLat.lng);
      }
    });

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

    $("#fab-locate").addEventListener("click", locate);
    $("#fab-knock").addEventListener("click", () => {
      const c = map.getCenter();
      startKnock(c.lat, c.lng);
    });
    updateHint();
    updateBrandToday();
    bindKnockSheet();
    bindLeadSheet();
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
    if (!navigator.geolocation) { toast("Location not available on this device"); return; }
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
            "width:16px;height:16px;border-radius:50%;background:#4D8DFF;border:3px solid #fff;box-shadow:0 0 0 6px rgba(77,141,255,.25)";
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
    if (!pin) {
      if (tempMarker) tempMarker.remove();
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:50%;background:rgba(217,179,108,.25);border:2px solid #D9B36C";
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
    const pin = await STORE.addKnock({
      lat: knock.lat, lng: knock.lng,
      pinId: knock.mode === "re" ? knock.pinId : null,
      disposition: knock.disposition, reason: knock.reason, dm: knock.dm, note,
    });
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
      const a = j.address || {};
      const line = [a.house_number, a.road].filter(Boolean).join(" ");
      const town = a.city || a.town || a.village || a.suburb || "";
      pin.address = line ? line + (town ? ", " + town : "") : (j.display_name || "").split(",").slice(0, 2).join(",");
      await STORE.updatePin(pin);
      if (currentLead && currentLead.id === pin.id) $("#lead-addr").textContent = pin.address || "Address pending…";
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

  window.MMAP = {
    init, refreshPins, updateBrandToday,
    clearSelection: () => { setSelected(""); currentLead = null; },
    resize: () => { if (map) map.resize(); },
  };
})();
