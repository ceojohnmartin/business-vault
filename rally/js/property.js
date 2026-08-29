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
    return els.map((el) => {
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
  }

  // ---------- provider: Regrid (licensed parcel data) ----------
  const regridToken = () =>
    (STORE.settings.regridKey || MDATA.DEFAULT_REGRID_KEY || "").trim();

  async function regridSearch(ring, onStatus) {
    const token = regridToken();
    if (!token) throw new Error("No Regrid token — add one in More → Property data");
    onStatus("Searching parcel records…");
    const geojson = {
      type: "Polygon",
      coordinates: [[...ring, ring[0]]],
    };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 28000);
    let r;
    try {
      r = await fetch("https://app.regrid.com/api/v2/parcels/polygon?token=" + encodeURIComponent(token), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geojson, limit: 1000 }),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(t); }
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) {
      const why = (j && (j.error || j.message)) || ("HTTP " + r.status);
      throw new Error("Regrid refused the request — " + why);
    }
    const feats = (j.parcels && j.parcels.features) || j.features || [];
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
      const occupied = situs && mail
        ? normAddr(situs) !== "" && normAddr(mail).startsWith(normAddr(situs).slice(0, 12))
        : null;
      return {
        externalId: "regrid-" + (props.ll_uuid || fields.ll_uuid || props.id || fields.ogc_fid || ""),
        parcelId: fields.parcelnumb || fields.apn || null,
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
    if (feats.length >= 1000) {
      out.warnings = ["Provider returned its 1,000-parcel cap — draw a smaller area to be sure nothing was missed"];
    }
    return out;
  }

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
    const lat0 = (minY + maxY) / 2;
    const stepLat = 30 / 110570;                                   // ~30 m rows
    const stepLng = 34 / (111320 * Math.max(0.2, Math.cos(lat0 * Math.PI / 180))); // ~34 m lots
    const out = [];
    let row = 0;
    for (let lat = minY + stepLat / 2; lat < maxY && out.length < 2000; lat += stepLat, row++) {
      let num = 100 + row * 100;
      for (let lng = minX + stepLng / 2; lng < maxX && out.length < 2000; lng += stepLng) {
        num += 2;
        if (!inRing(ring, lng, lat)) continue;
        out.push({
          externalId: "demo-" + lat.toFixed(6) + "-" + lng.toFixed(6),
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
