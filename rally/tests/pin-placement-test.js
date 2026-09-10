/* RALLY — PIN PLACEMENT.
   One pin per house, ON the house. The case that matters is the concave
   building: an L-shaped or U-shaped house whose bounding-box centre, and
   whose area centroid, both fall OUTSIDE the roof. That is the "pin in the
   yard" a rep sees, and this proves the placement no longer does it. */
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "js", "property.js"), "utf8");
const window = {};
const STORE = { settings: {} };
const MDATA = { ELIGIBILITY: { maxAreaKm2: 9 }, DEFAULT_REGRID_KEY: "" };
// property.js reaches for MGEO.inRing; the ray cast is the same one used
// below, so the test supplies it rather than pulling in the whole geo module
const MGEO = {
  inRing: (ring, x, y) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  },
};
new Function("window", "STORE", "MDATA", "MGEO", "fetch", "AbortController", "setTimeout", "clearTimeout", src)(
  window, STORE, MDATA, MGEO, () => {}, function () { this.signal = null; this.abort = () => {}; }, () => 0, () => {});

const placeAt = window.MPROP._placeAt;
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("PASS: " + m); };
const bad = (m, d) => { fail++; console.log("FAIL: " + m + "  --  " + d); };

// ray cast, in the {lat,lon} shape Overpass uses
function inside(pts, lon, lat) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const yi = pts[i].lat, xi = pts[i].lon, yj = pts[j].lat, xj = pts[j].lon;
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const P = (lon, lat) => ({ lon, lat });

// ---- 1. a plain rectangle: the centroid is the roof ----
const rect = [P(0, 0), P(0.001, 0), P(0.001, 0.0006), P(0, 0.0006), P(0, 0)];
let r = placeAt({ geometry: rect, center: { lat: 0.0003, lon: 0.0005 } });
inside(rect, r.point.lon, r.point.lat)
  ? ok("1. a rectangular house gets a pin on its roof") : bad("1.", JSON.stringify(r));
r.how === "building_centroid" ? ok("1b. and records that it is a building centroid") : bad("1b.", r.how);

/* ---- 2. THE L-SHAPE. Vertices trace an L whose bounding-box centre and
   whose area centroid both land in the empty notch. ---- */
const L = [P(0, 0), P(0.0012, 0), P(0.0012, 0.0003), P(0.0004, 0.0003),
           P(0.0004, 0.0012), P(0, 0.0012), P(0, 0)];
const bbox = { lat: 0.0006, lon: 0.0006 };
inside(L, bbox.lon, bbox.lat)
  ? bad("2. setup", "the bbox centre is on the roof, so this fixture proves nothing")
  : ok("2. the bounding-box centre of an L-shaped house is NOT on the roof");
r = placeAt({ geometry: L, center: bbox });
inside(L, r.point.lon, r.point.lat)
  ? ok("2b. but the placed pin IS on the roof") : bad("2b.", JSON.stringify(r));
r.how === "building_centroid" || r.how === "building_surface"
  ? ok("2c. from the outline, never from the bbox") : bad("2c.", r.how);

/* ---- 2d. A THIN L, where even the AREA CENTROID misses the roof. This is
   the fixture that forces the point-on-surface tier. ---- */
const thinL = [P(0, 0), P(0.002, 0), P(0.002, 0.0001), P(0.0001, 0.0001),
               P(0.0001, 0.002), P(0, 0.002), P(0, 0)];
// the area centroid, computed the same way the module does
let A = 0, CX = 0, CY = 0;
for (let i = 0; i < thinL.length; i++) {
  const a = thinL[i], b = thinL[(i + 1) % thinL.length];
  const f = a.lon * b.lat - b.lon * a.lat;
  A += f; CX += (a.lon + b.lon) * f; CY += (a.lat + b.lat) * f;
}
const cen = { lon: CX / (3 * A), lat: CY / (3 * A) };
inside(thinL, cen.lon, cen.lat)
  ? bad("2d. setup", "the centroid is on this roof too — fixture proves nothing")
  : ok("2d. on a thin L even the area centroid misses the roof");
r = placeAt({ geometry: thinL, center: { lat: 0.001, lon: 0.001 } });
inside(thinL, r.point.lon, r.point.lat)
  ? ok("2e. and the placed pin is still on the roof") : bad("2e.", JSON.stringify(r));
r.how === "building_surface"
  ? ok("2f. by falling through to point-on-surface, and saying so") : bad("2f.", r.how);

// ---- 3. a U-shaped block, the courtyard case ----
const U = [P(0, 0), P(0.0015, 0), P(0.0015, 0.0012), P(0.0011, 0.0012),
           P(0.0011, 0.0004), P(0.0004, 0.0004), P(0.0004, 0.0012),
           P(0, 0.0012), P(0, 0)];
r = placeAt({ geometry: U, center: { lat: 0.0006, lon: 0.00075 } });
inside(U, r.point.lon, r.point.lat)
  ? ok("3. a U-shaped block gets a pin on the building, not in the courtyard")
  : bad("3.", JSON.stringify(r));

/* ---- 3b. A MULTIPOLYGON RELATION. Its rings live on its members, and the
   query now asks for geometry rather than a centre, so a relation with no
   top-level geometry must still be placed from its OUTER ring — not dropped,
   and not placed in its courtyard. ---- */
const outer = [P(0, 0), P(0.0015, 0), P(0.0015, 0.0015), P(0, 0.0015), P(0, 0)];
const inner = [P(0.0005, 0.0005), P(0.001, 0.0005), P(0.001, 0.001), P(0.0005, 0.001), P(0.0005, 0.0005)];
r = placeAt({ type: "relation", members: [
  { role: "inner", geometry: inner },
  { role: "outer", geometry: outer },
] });
inside(outer, r.point.lon, r.point.lat)
  ? ok("3b. a multipolygon building is placed from its outer ring")
  : bad("3b.", JSON.stringify(r));
r.how === "building_centroid" || r.how === "building_surface"
  ? ok("3c. from the ring, not from a bounding box") : bad("3c.", r.how);

// a relation whose members carry nothing usable is nothing, not a guess
r = placeAt({ type: "relation", members: [{ role: "outer", geometry: [] }] });
r.point === null ? ok("3d. a relation with no usable ring yields no pin") : bad("3d.", JSON.stringify(r));

// ---- 4. no outline: the bbox centre is used, and labelled as such ----
r = placeAt({ center: { lat: 5, lon: 6 } });
r.point.lat === 5 && r.how === "building_bbox"
  ? ok("4. a relation with no outline falls back to the bbox centre, labelled")
  : bad("4.", JSON.stringify(r));

// ---- 5. nothing usable is nothing, never a guess ----
r = placeAt({});
r.point === null && r.how === "none"
  ? ok("5. an element with no geometry at all yields no pin") : bad("5.", JSON.stringify(r));

// ---- 6. a degenerate zero-area ring does not produce a NaN pin ----
r = placeAt({ geometry: [P(1, 1), P(1, 1), P(1, 1), P(1, 1)], center: { lat: 2, lon: 2 } });
r.point && Number.isFinite(r.point.lat) && Number.isFinite(r.point.lon)
  ? ok("6. a degenerate outline falls through to a finite point") : bad("6.", JSON.stringify(r));

/* ---- 7. THE QUERY. Overpass honours the LAST geometry modifier and drops
   the other, so "out tags geom center" returns centres and no outlines —
   measured against the live API — and every pin silently falls back to the
   bounding box. This asserts the shipped query asks for geometry and does
   not ask for a centre after it. ---- */
// the line inside the query template, not a sentence in a comment above it
const out = (src.match(/^out tags[^;\n]*;/m) || [""])[0];
/geom/.test(out) ? ok("7. the query asks for building geometry: " + out)
                 : bad("7. the query asks for building geometry", out);
!/geom\s+center/.test(out)
  ? ok("7b. and does not put center after geom, which would drop it")
  : bad("7b. 'geom center' returns centres and NO geometry", out);

/* ---- 8. THE FOOTPRINT DECIDES THE COORDINATE ----
   Regrid answers with the LOT's representative point. On a big lot that is
   the middle of the field, not the house — and the file used to claim the
   building outline was "preferred when one exists" while no code path
   implemented any such preference. snapToBuildings is that preference. */
const snap = window.MPROP._snapToBuildings;
const ringArea = window.MPROP._ringArea;
const inGeoJson = window.MPROP._inGeoJson;

// a 100 m-ish square lot, with a small house in one corner and a shed in
// another; the parcel point is dead centre, in the grass between them
const lot = { type: "Polygon", coordinates: [[[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]]] };
const house = [P(0.0001, 0.0001), P(0.0004, 0.0001), P(0.0004, 0.0004), P(0.0001, 0.0004), P(0.0001, 0.0001)];
const shed  = [P(0.0008, 0.0008), P(0.0009, 0.0008), P(0.0009, 0.0009), P(0.0008, 0.0009), P(0.0008, 0.0008)];
const bOf = (ring) => {
  const pl = placeAt({ geometry: ring });
  return { point: pl.point, how: pl.how, area: ringArea(ring) };
};
const buildings = [bOf(shed), bOf(house)];      // shed first, on purpose

let doors = [{ lat: 0.0005, lng: 0.0005, placement: "parcel_point", _parcel: lot }];
let moved = snap(doors, buildings);
moved === 1 ? ok("8. a parcel door is moved onto a building inside its own lot")
            : bad("8.", JSON.stringify(doors));
inside(house, doors[0].lng, doors[0].lat)
  ? ok("8b. and onto the HOUSE, not the shed — the largest outline in the lot wins")
  : bad("8b. it landed off the house", JSON.stringify(doors[0]));
doors[0].placement === "building_centroid"
  ? ok("8c. and the door now says it is on a building, not on a parcel point")
  : bad("8c.", doors[0].placement);

// a lot with no building in it keeps exactly the point it came with
doors = [{ lat: 0.0005, lng: 0.0005, placement: "parcel_point", _parcel: lot }];
snap(doors, [bOf([P(9, 9), P(9.0001, 9), P(9.0001, 9.0001), P(9, 9.0001), P(9, 9)])]);
doors[0].lat === 0.0005 && doors[0].placement === "parcel_point"
  ? ok("8d. a lot with no outline in it keeps its parcel point, unchanged")
  : bad("8d.", JSON.stringify(doors[0]));

// no buildings at all — a provider outage must not move or lose a door
doors = [{ lat: 0.0005, lng: 0.0005, placement: "parcel_point", _parcel: lot }];
snap(doors, []);
doors[0].lat === 0.0005 && doors[0].placement === "parcel_point"
  ? ok("8e. a failed building lookup leaves every door where it was")
  : bad("8e.", JSON.stringify(doors[0]));

// an OSM door has no parcel; it is already on its roof and must not move
doors = [{ lat: 1, lng: 1, placement: "building_surface" }];
snap(doors, buildings);
doors[0].lat === 1 && doors[0].placement === "building_surface"
  ? ok("8f. a door with no parcel is never moved") : bad("8f.", JSON.stringify(doors[0]));

// a MultiPolygon lot is a lot too
const multi = { type: "MultiPolygon", coordinates: [lot.coordinates] };
inGeoJson(multi, 0.0005, 0.0005) && !inGeoJson(multi, 0.5, 0.5)
  ? ok("8g. a MultiPolygon parcel is tested against its outer rings")
  : bad("8g. MultiPolygon containment", "in=" + inGeoJson(multi, 0.0005, 0.0005));

/* ---- 9. PLACEMENT IS STORED. property.js computes it for every door and
   store.js used to drop it, so the audit trail the file promises existed
   nowhere. ---- */
const storeSrc = fs.readFileSync(path.join(__dirname, "..", "js", "store.js"), "utf8");
/placement:\s*prop\.placement/.test(storeSrc)
  ? ok("9. the imported pin records how its coordinate was chosen")
  : bad("9. store.js drops `placement` on the floor", "no `placement: prop.placement` in importDoors");

/* ---- 10. THE DEMO GRID IS NOT A PROPERTY RECORD ---- */
/SYNTHETIC\[prop\.source\]/.test(storeSrc)
  ? ok("10. importDoors refuses synthetic demo doors")
  : bad("10. the demo grid can still become permanent pins", "no source guard in importDoors");
const mig = fs.readFileSync(path.join(__dirname, "..", "db", "migrations",
  "0018_territory_properties.sql"), "utf8");
/v_src = 'demo'/.test(mig)
  ? ok("10b. and so does the server, for a client that routes around it")
  : bad("10b. import_territory_doors accepts source='demo'", "no demo guard in 0018");

console.log("\n================================\nPASS " + pass + "   FAIL " + fail);
process.exit(fail ? 1 : 0);
