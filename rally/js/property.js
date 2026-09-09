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

  /* ---------- WHERE A PIN GOES ----------

     One pin per house, ON the house. In priority order:

       1. the building outline's point-on-surface — always inside the
          polygon, even when the shape is concave and its true centroid
          is not;
       2. the building outline's area centroid, when that point is itself
          inside the outline (the common convex case, and the most
          natural-looking of the three);
       3. the bounding-box centre Overpass hands back for anything with no
          outline — a multipolygon relation, or a node tagged as a building.

     Every door records which of the three it got, in `placement`, so a
     later audit can tell a rooftop from a fallback without guessing. */

  // area centroid of a closed or open ring; null on a degenerate (zero-area) ring
  function ringCentroid(pts) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      const f = p.lon * q.lat - q.lon * p.lat;
      a += f; cx += (p.lon + q.lon) * f; cy += (p.lat + q.lat) * f;
    }
    if (!a) return null;
    return { lon: cx / (3 * a), lat: cy / (3 * a) };
  }

  /* A point guaranteed to be inside a simple polygon: scan the horizontal
     line at the ring's mid-latitude, collect where it crosses the edges,
     and take the midpoint of the WIDEST interior span. On an L-shape that
     lands in the thickest part of the building — the roof — rather than in
     the notch. This is the same idea as PostGIS's ST_PointOnSurface, at the
     precision a door pin needs. */
  function ringPointOnSurface(pts) {
    let minLat = Infinity, maxLat = -Infinity;
    pts.forEach((p) => { if (p.lat < minLat) minLat = p.lat; if (p.lat > maxLat) maxLat = p.lat; });
    if (!(maxLat > minLat)) return null;
    const y = (minLat + maxLat) / 2;
    const xs = [];
    for (let i = 0, n = pts.length; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      if ((p.lat > y) === (q.lat > y)) continue;              // no crossing
      xs.push(p.lon + ((y - p.lat) / (q.lat - p.lat)) * (q.lon - p.lon));
    }
    if (xs.length < 2) return null;
    xs.sort((m, n) => m - n);
    let best = null, span = -1;
    for (let i = 0; i + 1 < xs.length; i += 2) {              // interior spans only
      const w = xs[i + 1] - xs[i];
      if (w > span) { span = w; best = (xs[i] + xs[i + 1]) / 2; }
    }
    return best === null ? null : { lon: best, lat: y };
  }

  // is (lon,lat) inside this building outline? same ray cast as inRing,
  // over Overpass's {lat,lon} shape
  function inGeom(pts, lon, lat) {
    let hit = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const yi = pts[i].lat, xi = pts[i].lon, yj = pts[j].lat, xj = pts[j].lon;
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }

  // clean {lat,lon} points, or null if there is no usable ring
  function ringOf(pts) {
    if (!Array.isArray(pts)) return null;
    const g = pts.filter((p) => p && typeof p.lat === "number" && typeof p.lon === "number");
    return g.length >= 4 ? g : null;
  }

  /* A multipolygon building keeps its rings on its members. The OUTER ring
     is the building; an inner ring is a courtyard, and placing a pin in one
     is the same mistake as the bounding-box centre. Take the longest outer
     ring — on the rare relation with several outer parts that is the main
     structure rather than a shed. */
  function relationRing(el) {
    if (!Array.isArray(el.members)) return null;
    let best = null;
    el.members.forEach((m) => {
      if (!m || (m.role && m.role !== "outer")) return;
      const g = ringOf(m.geometry);
      if (g && (!best || g.length > best.length)) best = g;
    });
    return best;
  }

  function placeAt(el) {
    const g = ringOf(el.geometry) || relationRing(el);
    if (g) {
      const ctr = ringCentroid(g);
      if (ctr && inGeom(g, ctr.lon, ctr.lat)) return { point: ctr, how: "building_centroid" };
      const pos = ringPointOnSurface(g);
      if (pos) return { point: pos, how: "building_surface" };
    }
    // only if the response carried one — "out tags geom" does not
    if (el.center) return { point: el.center, how: "building_bbox" };
    if (el.lat != null && el.lon != null) return { point: { lat: el.lat, lon: el.lon }, how: "node" };
    return { point: null, how: "none" };
  }

  // ---------- provider: OpenStreetMap (Overpass) ----------
  const OVERPASS = "https://overpass-api.de/api/interpreter";

  async function osmSearch(ring, onStatus) {
    const poly = ring.map(([lng, lat]) => lat.toFixed(6) + " " + lng.toFixed(6)).join(" ");
    /* `out tags geom` — and NOT "geom center".
       `out tags center` alone returns the centre of a building's BOUNDING
       BOX. On a rectangle that is the roof. On an L-shaped or U-shaped
       house, a courtyard block or a curved terrace it is the notch — the
       driveway, the garden, or the neighbour. That is the "pin in the yard"
       reps report, and it is why the outline is fetched: with the ring in
       hand, placeAt() can return a point GUARANTEED to be on the roof.

       The first version of this asked for "geom center", reasoning that a
       centre was a useful safety net. MEASURED AGAINST THE LIVE API, that
       is wrong and silently so: Overpass honours the LAST geometry modifier
       and drops the other. "out tags geom center" returned every way with
       center and NO geometry, so placeAt never saw an outline and every pin
       fell back to the bounding-box centre — the exact behaviour the change
       existed to remove. One building near the Eiffel Tower, three forms:

         out tags geom center;   geometry absent      center present
         out tags geom;          geometry 129 points  center absent
         out tags center geom;   geometry 129 points  center absent

       So: ask for geometry. A relation carries its rings on its MEMBERS
       rather than at the top level, and placeAt reads those. */
    const q = `[out:json][timeout:25];
(way["building"](poly:"${poly}");relation["building"](poly:"${poly}"););
out tags geom;`;
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
      const place = placeAt(el);
      const c = place.point;
      if (!c || !inRing(ring, c.lon, c.lat)) return null;
      const tags = el.tags || {};
      const elig = osmEligibility(tags);
      const addr = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
      return {
        externalId: "osm-" + el.type + "-" + el.id,
        parcelId: null,
        source: "osm",
        lat: c.lat, lng: c.lon,
        placement: place.how,
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
      let placement = "parcel_point";           // Regrid's own representative point
      if ((!lat || !lng) && f.geometry) {
        const c = geomCentroid(f.geometry);
        if (c) { lng = c[0]; lat = c[1]; placement = "parcel_centroid"; }
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
        placement,
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

  /* A PARCEL'S REPRESENTATIVE POINT.

     This used to average the ring's vertices. A vertex mean is not a
     centroid: it is pulled toward whichever edge the surveyor happened to
     draw with the most points, so on a lot with a detailed road frontage
     and a plain back boundary the pin drifts toward the street. The area
     centroid below does not care how the outline was digitised.

     It is still a PARCEL point, not a building point — on a large or
     irregular lot it can sit well away from the house, which is exactly why
     the OSM building outline is preferred when one exists. */
  function geomCentroid(g) {
    const ring = g.type === "Polygon" ? g.coordinates[0]
      : g.type === "MultiPolygon" ? g.coordinates[0] && g.coordinates[0][0] : null;
    if (!ring || ring.length < 4) return null;
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, n = ring.length; i < n; i++) {
      const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % n];
      const f = x1 * y2 - x2 * y1;
      a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
    }
    if (!a) {                                   // degenerate: fall back honestly
      let x = 0, y = 0;
      ring.forEach(([lng, lat]) => { x += lng; y += lat; });
      return [x / ring.length, y / ring.length];
    }
    return [cx / (3 * a), cy / (3 * a)];
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
          placement: "synthetic_grid",   // NOT a real house — see the header
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

  window.MPROP = { searchByPolygon, activeName, providerName: (n) => (PROVIDERS[n || activeName()] || {}).name || "", normAddr, areaKm2,
    // pure geometry, exported so tests/pin-placement-test.js can prove a pin
    // lands on an L-shaped roof rather than in its notch
    _placeAt: placeAt };
})();
