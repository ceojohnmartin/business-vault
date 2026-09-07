/* RALLY — turf geometry (v41).

   Everything here is EXACT and SHAPE-PRESERVING. A leader's polygon is the
   record of a decision about who works which streets, so nothing in this
   file may move, clip, buffer, snap or repair a vertex the leader placed.
   The only transforms allowed are the three that provably cannot change a
   footprint:

     - closing an unclosed ring (RALLY stores rings OPEN, so this is a
       read-time concern only — the closing vertex is never persisted)
     - dropping a vertex identical to the one before it (a zero-length edge
       contributes nothing to the boundary)
     - reversing vertex order (the point set is unchanged)

   A polygon that is still invalid after those is REFUSED, never repaired.
   There is no ST_MakeValid here and none on the server: silently redrawing
   someone's turf is the failure the whole invariant exists to prevent.

   MEASUREMENT. Work happens in a local equirectangular projection anchored
   at the polygon's own latitude, so a hood is a plane figure in metres and
   intersection topology is ordinary 2-D geometry. Over a few kilometres the
   projection's area distortion is of order 1e-7 relative — far below the
   sphere-versus-spheroid difference (~0.5%) that separates any client-side
   number from PostGIS's. That is why THE CLIENT IS ADVISORY ONLY: the
   authoritative > 1.0 m² test lives in the database, on geography, and the
   numbers here exist to warn a leader before they draw rather than to
   decide anything.

   INTERSECTION AREA. General polygon clipping is a minefield of degenerate
   cases. Instead both rings are ear-clipped into triangles — a partition of
   each interior — and every triangle pair is intersected with
   Sutherland-Hodgman, which is exact for convex clip regions. Summing the
   pairwise areas gives the exact intersection area of the two simple
   polygons with none of the degeneracy handling a general clipper needs. */
(function () {
  const R = 6371008.8; // IUGG mean Earth radius, matching PostGIS's sphere
  const D2R = Math.PI / 180;
  const EPS = 1e-12;

  /* A local plane anchored at lat0. x grows east, y grows north, both in
     metres. Inverse included because the snap helpers hand coordinates back
     to the drawing code, which speaks lng/lat. */
  /* `origin` is optional and matters more than it looks. Without one, x and
     y are absolute metres from the equator and the prime meridian — four
     to seven million — and the rounding in products of numbers that size
     is ~1e-8: three exactly collinear corners no longer test as collinear
     against any tolerance small enough to mean anything. Anchoring the
     plane at one of the ring's own corners keeps every coordinate in the
     hundreds or thousands, where the same test is honest. Translation
     changes no area, no intersection and no distance. The one-argument
     form is kept for callers that only want the scale (snap radii, the
     tests' metre fixtures). */
  function project(lat0, origin) {
    const k = Math.cos(lat0 * D2R) * R * D2R;
    const m = R * D2R;
    const ox = origin ? origin[0] : 0, oy = origin ? origin[1] : 0;
    return {
      toXY: (lng, lat) => [(lng - ox) * k, (lat - oy) * m],
      toLngLat: (x, y) => [x / k + ox, y / m + oy],
    };
  }

  const ringLat0 = (ring) => {
    let s = 0;
    for (const p of ring) s += p[1];
    return ring.length ? s / ring.length : 0;
  };

  // [[lng,lat],...] -> [[x,y],...] in metres, about the ring's own latitude
  // and anchored at its first corner
  function toPlane(ring, proj) {
    const pr = proj || project(ringLat0(ring), ring[0]);
    return { pts: ring.map((p) => pr.toXY(p[0], p[1])), proj: pr };
  }

  /* Collinearity tolerance for the local plane, in m². A corner one
     millimetre off a hundred-metre edge gives a cross product of 0.1; the
     rounding noise on genuinely collinear local coordinates is ~1e-9. */
  const COL_EPS = 1e-6;

  // ---------- normalization: the three shape-preserving transforms ----------

  const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

  /* Returns { points, dropped } — the ring with consecutive duplicates and
     any closing repeat removed. RALLY's stored form is OPEN, so the closing
     vertex is dropped rather than added; every consumer here closes it
     implicitly by wrapping. Never reorders, never moves a vertex. */
  function normalizeRing(ring) {
    const src = Array.isArray(ring) ? ring : [];
    const out = [];
    let dropped = 0;
    for (const p of src) {
      if (!p || typeof p[0] !== "number" || typeof p[1] !== "number" ||
          !isFinite(p[0]) || !isFinite(p[1])) { dropped++; continue; }
      if (out.length && same(out[out.length - 1], p)) { dropped++; continue; }
      out.push([p[0], p[1]]);
    }
    while (out.length > 1 && same(out[0], out[out.length - 1])) { out.pop(); dropped++; }
    return { points: out, dropped };
  }

  // counter-clockwise in the local plane (positive signed area)
  function forceCCW(ring) {
    return signedAreaM2(ring) < 0 ? ring.slice().reverse() : ring.slice();
  }

  // ---------- area ----------

  function signedAreaPlane(pts) {
    let a = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    }
    return a / 2;
  }

  function signedAreaM2(ring) {
    if (!ring || ring.length < 3) return 0;
    return signedAreaPlane(toPlane(ring).pts);
  }

  const areaM2 = (ring) => Math.abs(signedAreaM2(ring));

  // ---------- validity ----------

  const bbox = (ring) => {
    if (!ring || !ring.length) return null;
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    for (const p of ring) {
      if (p[0] < w) w = p[0];
      if (p[0] > e) e = p[0];
      if (p[1] < s) s = p[1];
      if (p[1] > n) n = p[1];
    }
    return { w, s, e, n };
  };

  const bboxHit = (a, b) => !!(a && b && a.w <= b.e && b.w <= a.e && a.s <= b.n && b.s <= a.n);

  // proper segment crossing, in the plane. Touching endpoints do not count:
  // adjacent edges of any ring share one by construction.
  function segCross(p1, p2, p3, p4) {
    const d = (q1, q2, q3) =>
      (q2[0] - q1[0]) * (q3[1] - q1[1]) - (q2[1] - q1[1]) * (q3[0] - q1[0]);
    const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2);
    const d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      const t = d3 / (d3 - d4);
      return [p3[0] + t * (p4[0] - p3[0]), p3[1] + t * (p4[1] - p3[1])];
    }
    const on = (a, b, c) => // c collinear with ab AND inside its span
      Math.abs(d(a, b, c)) < COL_EPS &&
      Math.min(a[0], b[0]) - EPS <= c[0] && c[0] <= Math.max(a[0], b[0]) + EPS &&
      Math.min(a[1], b[1]) - EPS <= c[1] && c[1] <= Math.max(a[1], b[1]) + EPS;
    if (on(p3, p4, p1) && !same(p1, p3) && !same(p1, p4)) return p1;
    if (on(p3, p4, p2) && !same(p2, p3) && !same(p2, p4)) return p2;
    if (on(p1, p2, p3) && !same(p3, p1) && !same(p3, p2)) return p3;
    if (on(p1, p2, p4) && !same(p4, p1) && !same(p4, p2)) return p4;
    return null;
  }

  /* The first self-intersection, or null. Reported rather than repaired, so
     the leader is told WHERE their outline crosses itself instead of having
     it silently redrawn. O(n²) — a hood is tens of vertices, not thousands. */
  function selfIntersection(ring) {
    const { pts, proj } = toPlane(ring);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a1 = pts[i], a2 = pts[(i + 1) % n];
      for (let j = i + 1; j < n; j++) {
        if (j === i) continue;
        // adjacent edges (and the wrap pair) legitimately share a vertex
        if (j === (i + 1) % n || (i === 0 && j === n - 1)) continue;
        const b1 = pts[j], b2 = pts[(j + 1) % n];
        const hit = segCross(a1, a2, b1, b2);
        if (hit) {
          const ll = proj.toLngLat(hit[0], hit[1]);
          return { i, j, at: [ll[0], ll[1]] };
        }
      }
    }
    return null;
  }

  /* The single validity verdict, used by the client before it offers to
     save and mirrored by the server before it accepts. Shape-preserving
     normalization first, then a hard yes/no — never a repair. */
  function validate(ring) {
    const norm = normalizeRing(ring);
    const pts = norm.points;
    if (pts.length < 3) {
      return { ok: false, code: "too_few_points", points: pts,
        reason: "A hood needs at least 3 distinct corners — this outline has " + pts.length + "." };
    }
    /* Self-intersection is tested BEFORE area. A symmetric figure-eight has
       a signed area of exactly zero, so an area-first order would tell the
       leader their outline "encloses no area" when the real and fixable
       problem is that it crosses itself. The more specific diagnosis wins. */
    /* A corner visited TWICE with other corners in between is a pinch — a
       figure-eight tied at a point rather than crossed. The edge test below
       cannot see it, because the two edges meeting there share an endpoint
       exactly as adjacent edges legitimately do; PostGIS calls it a Ring
       Self-intersection and refuses it, so the client must say so first. */
    const seen = new Map();
    for (let i = 0; i < pts.length; i++) {
      const key = pts[i][0] + "," + pts[i][1];
      if (seen.has(key)) {
        return { ok: false, code: "self_intersection", points: pts, at: [pts[i][0], pts[i][1]],
          reason: "The outline passes through the same corner twice, near " +
            pts[i][1].toFixed(6) + ", " + pts[i][0].toFixed(6) +
            ". Move one of them so the boundary never touches itself." };
      }
      seen.set(key, i);
    }
    /* A ring whose longitudes span more than half the globe is not a hood;
       it is an outline straddling the antimeridian, which this planar
       arithmetic cannot measure. Refused rather than silently mismeasured. */
    const bb = bbox(pts);
    if (bb.e - bb.w > 180) {
      return { ok: false, code: "antimeridian", points: pts,
        reason: "This outline spans the 180° meridian, which RALLY cannot measure." };
    }
    const x = selfIntersection(pts);
    if (x) {
      return { ok: false, code: "self_intersection", points: pts, at: x.at,
        reason: "The outline crosses itself near " +
          x.at[1].toFixed(6) + ", " + x.at[0].toFixed(6) +
          ". Move a corner so the boundary never doubles back through itself." };
    }
    const area = areaM2(pts);
    if (area < EPS) {
      return { ok: false, code: "zero_area", points: pts,
        reason: "This outline encloses no area — its corners are in a straight line." };
    }
    return { ok: true, code: "valid", points: forceCCW(pts), areaM2: area, dropped: norm.dropped };
  }

  // ---------- point in ring (ONE ray-cast, shared with STORE.inHood) ----------

  function pointInRing(ring, lng, lat) {
    if (!ring || ring.length < 3) return false;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) &&
          (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  // ---------- ear clipping ----------

  const cross3 = (a, b, c) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

  function pointInTri(p, a, b, c) {
    const d1 = cross3(a, b, p), d2 = cross3(b, c, p), d3 = cross3(c, a, p);
    const neg = d1 < -COL_EPS || d2 < -COL_EPS || d3 < -COL_EPS;
    const pos = d1 > COL_EPS || d2 > COL_EPS || d3 > COL_EPS;
    return !(neg && pos);
  }

  // a triangle that encloses no area contributes nothing and must never be
  // handed to the clipper: a clip region with no interior is "everything"
  // to Sutherland-Hodgman, and would return the whole subject as overlap
  const realTri = (t) => Math.abs(cross3(t[0], t[1], t[2])) > COL_EPS;

  /* Simple-polygon ear clipping in the plane. The input is assumed simple
     (validate() has said so) and CCW. Returns a triangle list that exactly
     partitions the interior, which is what makes the pairwise-intersection
     sum below exact rather than approximate. */
  function triangulate(raw) {
    /* Normalized first, always. A repeated corner is not a corner; left in,
       it blocks every ear (a duplicate tests as "inside" each candidate)
       and the scan stalls on a ring that is perfectly simple. */
    const pts = normalizeRing(raw).points;
    const n = pts.length;
    if (n < 3) return [];
    const idx = [];
    for (let i = 0; i < n; i++) idx.push(i);
    if (signedAreaPlane(pts) < 0) idx.reverse();
    const tris = [];
    let guard = 0;
    while (idx.length > 3 && guard++ < n * n + 16) {
      let clipped = false;
      for (let k = 0; k < idx.length; k++) {
        const i0 = idx[(k + idx.length - 1) % idx.length];
        const i1 = idx[k];
        const i2 = idx[(k + 1) % idx.length];
        const a = pts[i0], b = pts[i1], c = pts[i2];
        if (cross3(a, b, c) <= COL_EPS) continue; // reflex or degenerate
        let clean = true;
        for (const m of idx) {
          if (m === i0 || m === i1 || m === i2) continue;
          if (pointInTri(pts[m], a, b, c)) { clean = false; break; }
        }
        if (!clean) continue;
        tris.push([a, b, c]);
        idx.splice(k, 1);
        clipped = true;
        break;
      }
      if (clipped) continue;
      /* No ear. On a simple ring that can only mean a corner sitting on the
         straight line between its neighbours — a zero-area "ear" the scan
         skips — so drop such corners (they change no area) and go again.
         Fanning a concave remainder instead would emit triangles that
         overlap each other and reach outside the ring, and the overlap
         sum below would count that phantom ground as a collision. */
      const before = idx.length;
      for (let k = idx.length - 1; k >= 0 && idx.length > 3; k--) {
        const a = pts[idx[(k + idx.length - 1) % idx.length]];
        const b = pts[idx[k]];
        const c = pts[idx[(k + 1) % idx.length]];
        if (Math.abs(cross3(a, b, c)) <= COL_EPS) idx.splice(k, 1);
      }
      if (idx.length === before) break; // genuinely stuck: partial, never a phantom
    }
    if (idx.length === 3) tris.push([pts[idx[0]], pts[idx[1]], pts[idx[2]]]);
    return tris.filter(realTri);
  }

  // ---------- convex clipping (Sutherland-Hodgman) ----------

  function clipConvex(subject, clip) {
    if (!clip || clip.length < 3 || Math.abs(signedAreaPlane(clip)) <= COL_EPS) return [];
    let out = subject;
    for (let i = 0; i < clip.length && out.length; i++) {
      const a = clip[i], b = clip[(i + 1) % clip.length];
      const input = out;
      out = [];
      for (let j = 0; j < input.length; j++) {
        const cur = input[j], prev = input[(j + input.length - 1) % input.length];
        const dCur = cross3(a, b, cur), dPrev = cross3(a, b, prev);
        const inCur = dCur >= -EPS, inPrev = dPrev >= -EPS;
        if (inCur) {
          if (!inPrev) {
            const t = dPrev / (dPrev - dCur);
            out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
          }
          out.push(cur);
        } else if (inPrev) {
          const t = dPrev / (dPrev - dCur);
          out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
        }
      }
    }
    return out;
  }

  const ccw = (tri) => (cross3(tri[0], tri[1], tri[2]) < 0 ? [tri[0], tri[2], tri[1]] : tri);

  const triBbox = (t) => ({
    w: Math.min(t[0][0], t[1][0], t[2][0]), e: Math.max(t[0][0], t[1][0], t[2][0]),
    s: Math.min(t[0][1], t[1][1], t[2][1]), n: Math.max(t[0][1], t[1][1], t[2][1]),
  });

  /* The INTERIOR overlap of two rings, in square metres.

     A shared edge and a corner touch both produce a zero-area intersection
     and therefore read 0 — which is the whole point: two hoods traced to
     the same street centreline are adjacent, not overlapping, and the
     invariant must not call them a collision. */
  function overlapM2(rawA, rawB) {
    // the STORED rings, as drawn — normalized here because a neighbour's
    // repeated corner must not be able to manufacture a collision
    const ringA = normalizeRing(rawA).points, ringB = normalizeRing(rawB).points;
    if (ringA.length < 3 || ringB.length < 3) return 0;
    if (!bboxHit(bbox(ringA), bbox(ringB))) return 0;
    // ONE plane for both rings, or their coordinates would not be comparable
    const proj = project((ringLat0(ringA) + ringLat0(ringB)) / 2, ringA[0]);
    const A = toPlane(ringA, proj).pts;
    const B = toPlane(ringB, proj).pts;
    const ta = triangulate(A).map(ccw);
    const tb = triangulate(B).map(ccw);
    const bb = tb.map(triBbox);
    let total = 0;
    for (const t1 of ta) {
      const b1 = triBbox(t1);
      for (let k = 0; k < tb.length; k++) {
        if (!bboxHit(b1, bb[k])) continue;
        const poly = clipConvex(t1, tb[k]);
        if (poly.length >= 3) total += Math.abs(signedAreaPlane(poly));
      }
    }
    return total;
  }

  // ---------- snapping (UX only — never applied without the leader's action) ----------

  function nearestOnSegment(p, a, b) {
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const len2 = vx * vx + vy * vy;
    if (len2 < EPS) return { pt: [a[0], a[1]], t: 0 };
    let t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2;
    t = Math.max(0, Math.min(1, t));
    return { pt: [a[0] + t * vx, a[1] + t * vy], t };
  }

  /* Nearest snap target for a point being placed or dragged, across a set of
     neighbouring rings. A VERTEX wins over an edge inside the same radius,
     because matching a corner exactly is what actually produces a shared
     boundary rather than a near-miss sliver.

     Returns null when nothing is within `withinM` metres — snapping is an
     offer, never a correction, so the caller is free to ignore it and the
     leader is always free to place the point by hand. */
  function snap(lng, lat, rings, withinM) {
    const limit = typeof withinM === "number" ? withinM : 8;
    if (!rings || !rings.length) return null;
    const proj = project(lat);
    const p = proj.toXY(lng, lat);
    let bestV = null, bestE = null;
    for (const r of rings) {
      const ring = r && r.points ? r.points : r;
      if (!ring || ring.length < 2) continue;
      const pts = ring.map((q) => proj.toXY(q[0], q[1]));
      for (let i = 0; i < pts.length; i++) {
        const dx = pts[i][0] - p[0], dy = pts[i][1] - p[1];
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= limit && (!bestV || d < bestV.d)) {
          bestV = { d, xy: pts[i], kind: "vertex", ring: r, index: i };
        }
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const { pt } = nearestOnSegment(p, a, b);
        const dx = pt[0] - p[0], dy = pt[1] - p[1];
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= limit && (!bestE || d < bestE.d)) {
          bestE = { d, xy: pt, kind: "edge", ring: r, index: i };
        }
      }
    }
    const best = bestV || bestE;
    if (!best) return null;
    const ll = proj.toLngLat(best.xy[0], best.xy[1]);
    return { lng: ll[0], lat: ll[1], kind: best.kind, distM: best.d, ring: best.ring, index: best.index };
  }

  // metres between two lng/lat points (haversine — used for snap radii in tests)
  function distanceM(lng1, lat1, lng2, lat2) {
    const dLat = (lat2 - lat1) * D2R, dLng = (lng2 - lng1) * D2R;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  window.MGEOM = {
    // the one tolerance, quoted by the client advisory and mirrored exactly
    // by the server constraint. Raising it here changes nothing on the
    // server, which is where the invariant actually lives.
    OVERLAP_TOLERANCE_M2: 1.0,
    project, normalizeRing, forceCCW, validate, selfIntersection,
    areaM2, signedAreaM2, bbox, bboxHit, pointInRing,
    triangulate, clipConvex, overlapM2, snap, nearestOnSegment, distanceM,
  };
})();
