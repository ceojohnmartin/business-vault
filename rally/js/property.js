/* RALLY — property data: the provider layer behind "draw an area, find
   the doors". One normalized property shape, three interchangeable
   sources behind it:

     regrid — licensed parcel + owner records (token required; More →
              Property data). The richest data: owner, year built,
              lot size, sale history.
     osm    — OpenStreetMap building footprints via the Overpass API.
              Free, real, zero setup: building centroids put pins ON
              the houses, and addr:* tags carry street addresses where
              mapped. No owner data (it doesn't exist in OSM).
     demo   — a deterministic street grid inside the polygon, clearly
              labeled demo. No fake homeowner information, ever.

   Nothing outside this file knows a vendor's response format. Swapping
   or adding a provider = one entry in PROVIDERS.

   Normalized property:
     { externalId, parcelId, source, lat, lng,
       address, city, state, zip,
       propertyType, eligible, whyExcluded,
       owner: { name, mailingAddress, occupied } | null,
       yearBuilt, sqft, lotSqft, lastSaleDate, lastSalePrice }
   Only fields the source legitimately returned are set — the UI hides
   the rest. Nothing is invented. */
(function () {
  const R = MDATA.ELIGIBILITY;

  // ---------- geometry helpers ----------
  function ringBBox(ring) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ring.forEach(([x, y]) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
    return { minX, minY, maxX, maxY };
  }

  // polygon area in km² (locally-scaled planar approximation — plenty for a guard)
  function areaKm2(ring) {
    if (!ring || ring.length < 3) return 0;
    const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const kx = 111.32 * Math.cos(lat0 * Math.PI / 180), ky = 110.57;
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      a += (ring[j][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[j][1] * ky);
    }
    return Math.abs(a / 2);
  }

  const inRing = (ring, lng, lat) => MGEO.inRing(ring, lng, lat);

  // ---------- eligibility (rules live in data.js, not here, not the UI) ----------
  function osmEligibility(tags) {
    const b = (tags.building || "").toLowerCase();
    if (R.osm.eligible[b]) return { eligible: true, propertyType: R.osm.eligible[b] };
    if (R.osm.excluded.includes(b)) return { eligible: false, whyExcluded: "building: " + b, propertyType: b };
    // building=yes with a residential address tag → treat as a home;
    // building=yes with nothing else is unknowable → excluded, counted
    if (tags["addr:housenumber"]) return { eligible: true, propertyType: "Home" };
    return { eligible: false, whyExcluded: "unclassified building", propertyType: b || "building" };
  }

  function regridEligibility(fields) {
    const desc = [fields.usedesc, fields.zoning_description, fields.struct, fields.usecode]
      .filter(Boolean).join(" · ");
    if (R.regrid.excludedPatterns.some((re) => re.test(desc))) {
      return { eligible: false, whyExcluded: desc || "excluded use", propertyType: fields.usedesc || null };
    }
    if (R.regrid.eligiblePatterns.some((re) => re.test(desc))) {
      return { eligible: true, propertyType: fields.usedesc || "Residential" };
    }
    // unknown use code: keep it visible but not auto-imported
    return { eligible: false, whyExcluded: desc || "unknown land use", propertyType: fields.usedesc || null };
  }

  // ---------- provider: OpenStreetMap (Overpass) ----------
  const OVERPASS = "https://overpass-api.de/api/interpreter";

  async function osmSearch(ring, onStatus) {
    const poly = ring.map(([lng, lat]) => lat.toFixed(6) + " " + lng.toFixed(6)).join(" ");
    const q = `[out:json][timeout:25];
(way["building"](poly:"${poly}");relation["building"](poly:"${poly}"););
out tags center;`;
    onStatus("Searching properties…");
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 28000);
    let r;
    try {
      r = await fetch(OVERPASS, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(t); }
    if (!r.ok) throw new Error("Property provider unavailable (HTTP " + r.status + ")");
    const j = await r.json();
    const els = (j && j.elements) || [];
    const out = els.map((el) => {
      const c = el.center || (el.lat != null ? { lat: el.lat, lon: el.lon } : null);
      if (!c || !inRing(ring, c.lon, c.lat)) return null;
      const tags = el.tags || {};
      const elig = osmEligibility(tags);
      const addr = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
      return {
        externalId: "osm-" + el.type + "-" + el.id,
        parcelId: null,
        source: "osm",
        lat: c.lat, lng: c.lon,
        address: addr || "",
        city: tags["addr:city"] || "", state: tags["addr:state"] || "",
        zip: tags["addr:postcode"] || "",
        propertyType: elig.propertyType || null,
        eligible: elig.eligible, whyExcluded: elig.whyExcluded || null,
        owner: null, // OSM carries no ownership data
        yearBuilt: null, sqft: null, lotSqft: null,
        lastSaleDate: null, lastSalePrice: null,
      };
    }).filter(Boolean);
    // Overpass reports its own truncation (timeout, memory) in `remark` —
    // a partial answer must never pass silently as a complete one
    if (j && j.remark) {
      out.warnings = ["The map server cut this search short — some doors may be missing. Try a smaller area."];
    }
    return out;
  }

  // ---------- provider: Regrid (licensed parcel data) ----------
  const regridToken = () =>
    (STORE.settings.regridKey || MDATA.DEFAULT_REGRID_KEY || "").trim();

  const PAGE = 1000;      // Regrid's per-request ceiling
  const MAX_PAGES = 5;    // 5,000 parcels ≫ any drawable territory

  async function regridPage(token, geojson, offset, signal) {
    // The token rides in the Authorization header, never the URL — URLs land
    // in proxy logs, HAR exports and error monitors; headers don't.
    const r = await fetch("https://app.regrid.com/api/v2/parcels/polygon", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ geojson, limit: PAGE, offset }),
      signal,
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) {
      const why = (j && (j.error || j.message)) || ("HTTP " + r.status);
      throw new Error("Regrid refused the request — " + why);
    }
    return (j.parcels && j.parcels.features) || j.features || [];
  }

  async function regridSearch(ring, onStatus) {
    const token = regridToken();
    if (!token) throw new Error("No Regrid token — add one in More → Property data");
    onStatus("Searching parcel records…");
    const geojson = {
      type: "Polygon",
      coordinates: [[...ring, ring[0]]],
    };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90000);
    let feats = [], truncated = false;
    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const batch = await regridPage(token, geojson, page * PAGE, ctrl.signal);
        if (page > 0 && batch.length && feats.length &&
            featId(batch[0]) === featId(feats[0])) {
          // the API ignored our offset — same first parcel back again.
          // Keep page one and say so rather than importing duplicates.
          truncated = true;
          break;
        }
        feats = feats.concat(batch);
        if (batch.length < PAGE) break;
        if (page === MAX_PAGES - 1) truncated = true;
        onStatus(`Searching parcel records… ${feats.length} so far`);
      }
    } finally { clearTimeout(t); }
    const out = feats.map((f) => {
      const props = f.properties || {};
      const fields = props.fields || props;
      // pin on the parcel's own point when given; polygon centroid otherwise
      let lat = Number(fields.lat), lng = Number(fields.lon);
      if ((!lat || !lng) && f.geometry) {
        const c = geomCentroid(f.geometry);
        if (c) { lng = c[0]; lat = c[1]; }
      }
      if (!lat || !lng || !inRing(ring, lng, lat)) return null;
      const elig = regridEligibility(fields);
      const situs = [fields.address, fields.saddno && !fields.address ? fields.saddno + " " + (fields.saddstr || "") : null]
        .filter(Boolean)[0] || "";
      const mail = [fields.mailadd, [fields.mail_city, fields.mail_state2].filter(Boolean).join(", "), fields.mail_zip]
        .filter(Boolean).join(", ");
      // whole-street-line comparison, and it is only ever presented as an
      // estimate — never as a licensed fact about the homeowner
      const nSitus = normAddr(situs);
      const occupied = nSitus && mail ? normAddr(mail).startsWith(nSitus) : null;
      // a missing id must NOT collapse to a shared sentinel — one bad
      // response would then dedupe every parcel into a single door
      const rid = props.ll_uuid || fields.ll_uuid || f.id || props.id || fields.ogc_fid || null;
      const apn = fields.parcelnumb || fields.apn || null;
      return {
        externalId: rid ? "regrid-" + rid : null,
        // county APNs repeat across counties — scope the key
        parcelId: apn ? [fields.state2, fields.county, apn].filter(Boolean).join(":") : null,
        source: "regrid",
        lat, lng,
        address: situs,
        city: fields.scity || fields.city || "", state: fields.state2 || "",
        zip: fields.szip || "",
        propertyType: elig.propertyType, eligible: elig.eligible, whyExcluded: elig.whyExcluded || null,
        owner: fields.owner ? { name: fields.owner, mailingAddress: mail || null, occupied } : null,
        yearBuilt: numOrNull(fields.yearbuilt),
        sqft: numOrNull(fields.ll_bldg_size || fields.sqft),
        lotSqft: numOrNull(fields.ll_gissqft || fields.lot_sqft),
        lastSaleDate: fields.saledate || null,
        lastSalePrice: numOrNull(fields.saleprice),
      };
    }).filter(Boolean);
    if (truncated) {
      out.warnings = [`Provider stopped at ${feats.length.toLocaleString()} parcels — draw a smaller area to be sure nothing was missed`];
    }
    return out;
  }

  const featId = (f) => {
    const p = (f && f.properties) || {};
    const fl = p.fields || p;
    return p.ll_uuid || fl.ll_uuid || f.id || p.id || fl.ogc_fid || JSON.stringify(fl.parcelnumb || "");
  };

  const numOrNull = (v) => {
    const n = Number(v);
    return isFinite(n) && n > 0 ? n : null;
  };

  function geomCentroid(g) {
    const ring = g.type === "Polygon" ? g.coordinates[0]
      : g.type === "MultiPolygon" ? g.coordinates[0] && g.coordinates[0][0] : null;
    if (!ring || !ring.length) return null;
    let x = 0, y = 0;
    ring.forEach(([lng, lat]) => { x += lng; y += lat; });
    return [x / ring.length, y / ring.length];
  }

  // ---------- provider: demo (deterministic grid, clearly labeled) ----------
  function demoSearch(ring, onStatus) {
    onStatus("Generating demo doors…");
    const { minX, minY, maxX, maxY } = ringBBox(ring);
    // Anchor rows/lots to a WORLD grid, not this polygon's bbox: two
    // overlapping draws must produce the exact same houses, or the dedupe
    // sees "new" doors a few meters from the old ones and doubles them up.
    const stepLat = 30 / 110570;                                   // ~30 m rows
    const latRef = Math.round(((minY + maxY) / 2) * 10) / 10;      // quantized so nearby draws share it
    const stepLng = 34 / (111320 * Math.max(0.2, Math.cos(latRef * Math.PI / 180))); // ~34 m lots
    const row0 = Math.floor(minY / stepLat), col0 = Math.floor(minX / stepLng);
    const out = [];
    for (let r = row0; r * stepLat < maxY && out.length < 2000; r++) {
      const lat = (r + 0.5) * stepLat;
      if (lat < minY) continue;
      for (let c = col0; c * stepLng < maxX && out.length < 2000; c++) {
        const lng = (c + 0.5) * stepLng;
        if (lng < minX || !inRing(ring, lng, lat)) continue;
        // stable street numbering derived from the world cell, not the draw
        const num = 100 + (((r % 90) + 90) % 90) * 100 + ((((c % 48) + 48) % 48) + 1) * 2;
        out.push({
          externalId: "demo-" + r + "-" + c,
          parcelId: null, source: "demo",
          lat, lng,
          address: num + " Demo Ave", city: "Demoville", state: "", zip: "",
          propertyType: "Single-family (demo)", eligible: true, whyExcluded: null,
          owner: null, // demo NEVER fabricates homeowner information
          yearBuilt: null, sqft: null, lotSqft: null,
          lastSaleDate: null, lastSalePrice: null,
        });
      }
    }
    if (out.length >= 2000) {
      out.warnings = ["Demo generation stopped at 2,000 doors — draw a smaller area to see them all"];
    }
    return Promise.resolve(out);
  }

  // ---------- the provider registry ----------
  const PROVIDERS = {
    regrid: { name: "Regrid parcel data", search: regridSearch, ready: () => !!regridToken() },
    osm:    { name: "OpenStreetMap buildings", search: osmSearch, ready: () => true },
    demo:   { name: "Demo data", search: demoSearch, ready: () => true },
  };

  function activeName() {
    const pick = STORE.settings.propertySource || "auto";
    if (pick !== "auto" && PROVIDERS[pick]) return pick;
    return regridToken() ? "regrid" : "osm";
  }

  /* Scan a polygon for knockable doors.
     Returns { parcels, eligible, excluded, provider, providerName,
               areaKm2, warnings } or throws with a human message. */
  async function searchByPolygon(ring, onStatus) {
    onStatus = onStatus || (() => {});
    if (!ring || ring.length < 3) throw new Error("Draw an area first");
    const km2 = areaKm2(ring);
    if (km2 < 0.0004) throw new Error("That area is a rooftop — draw the whole neighborhood");
    if (km2 > R.maxAreaKm2) {
      throw new Error(`Area is ${km2.toFixed(1)} km² — too big for one territory. Draw a tighter neighborhood.`);
    }
    const name = activeName();
    if (name !== "demo" && !navigator.onLine) {
      throw new Error("No connection — property search needs signal (knocking doesn't)");
    }
    let parcels;
    try {
      parcels = await PROVIDERS[name].search(ring, onStatus);
    } catch (err) {
      // network-layer failures come through as bare TypeErrors — translate
      if (err && (err.name === "TypeError" || err.name === "AbortError")) {
        throw new Error("Property provider unreachable — check your signal and try again");
      }
      throw err;
    }
    const eligible = parcels.filter((p) => p.eligible);
    return {
      parcels,
      eligible,
      excluded: parcels.length - eligible.length,
      provider: name,
      providerName: PROVIDERS[name].name,
      areaKm2: km2,
      warnings: parcels.warnings || [],
    };
  }

  // shared address normalizer (also used by the store's dedupe)
  function normAddr(s) {
    return String(s || "").toLowerCase()
      .replace(/[.,#]/g, " ")
      .replace(/\b(street|avenue|boulevard|drive|court|circle|place|lane|road|trail|parkway|terrace|highway)\b/g,
        (m) => ({ street: "st", avenue: "ave", boulevard: "blvd", drive: "dr", court: "ct", circle: "cir",
          place: "pl", lane: "ln", road: "rd", trail: "trl", parkway: "pkwy", terrace: "ter", highway: "hwy" }[m]))
      .replace(/\s+/g, " ").trim();
  }

  window.MPROP = { searchByPolygon, activeName, providerName: (n) => (PROVIDERS[n || activeName()] || {}).name || "", normAddr, areaKm2 };
})();
