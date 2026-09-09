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
new Function("window", "STORE", "MDATA", "fetch", "AbortController", "setTimeout", "clearTimeout", src)(
  window, STORE, MDATA, () => {}, function () { this.signal = null; this.abort = () => {}; }, () => 0, () => {});

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

console.log("\n================================\nPASS " + pass + "   FAIL " + fail);
process.exit(fail ? 1 : 0);
