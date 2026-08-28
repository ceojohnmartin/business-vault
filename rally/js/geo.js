/* RALLY — dependency-free territory geometry.
   Smart Split: divide a hand-drawn polygon into N contiguous parts of
   ~equal house weight. Approach: recursive weighted bisection — sample
   the interior on a grid (area proxy), blend in knocked-pin locations
   (evidence of real doors), pick the cut position as the exact weighted
   quantile along the longer axis, and clip with a half-plane. Point
   quantiles make balance exact-by-construction for the sampled weight;
   axis-aligned cuts keep shapes rectangular-ish with no slivers.
   All coordinates are [lng,lat]; work happens in a locally-scaled plane
   (lng * cos(lat0)) so distances are honest. */
(function () {
  const area = (ring) => {
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
    }
    return Math.abs(a / 2);
  };

  const inRing = (ring, x, y) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };

  // Sutherland–Hodgman against the half-plane {p[axis] <= c} (or >= when keepHigh)
  function clip(ring, axis, c, keepHigh) {
    const keep = (p) => (keepHigh ? p[axis] >= c : p[axis] <= c);
    const out = [];
    for (let i = 0; i < ring.length; i++) {
      const cur = ring[i], prev = ring[(i + ring.length - 1) % ring.length];
      const curIn = keep(cur), prevIn = keep(prev);
      if (curIn !== prevIn) {
        const t = (c - prev[axis]) / (cur[axis] - prev[axis]);
        out.push(axis === 0
          ? [c, prev[1] + t * (cur[1] - prev[1])]
          : [prev[0] + t * (cur[0] - prev[0]), c]);
      }
      if (curIn) out.push(cur);
    }
    return out;
  }

  // interior grid samples, ~target points regardless of polygon size
  function sample(ring, target) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ring.forEach(([x, y]) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
    const step = Math.sqrt(((maxX - minX) * (maxY - minY)) / Math.max(1, target)) || 1e-9;
    const pts = [];
    for (let y = minY + step / 2; y < maxY; y += step) {
      for (let x = minX + step / 2; x < maxX; x += step) {
        if (inRing(ring, x, y)) pts.push([x, y]);
      }
    }
    return pts;
  }

  // split scaled ring into n parts; pts = [{x, y, w}] weight points
  function splitRec(ring, pts, n, depth) {
    if (n <= 1 || ring.length < 3 || depth > 8) return [ring];
    const nL = Math.floor(n / 2), nR = n - nL;
    const targetFrac = nL / n;
    // longer bbox side decides the cut axis; ties go to x for determinism
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ring.forEach(([x, y]) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
    const axis = (maxX - minX) >= (maxY - minY) ? 0 : 1;
    const total = pts.reduce((s, p) => s + p.w, 0);
    let c;
    if (total <= 0) {
      c = (axis === 0 ? minX : minY) + (axis === 0 ? maxX - minX : maxY - minY) * targetFrac;
    } else {
      // exact weighted quantile along the axis
      const sorted = pts.slice().sort((a, b) => (axis === 0 ? a.x - b.x : a.y - b.y));
      let acc = 0;
      c = axis === 0 ? sorted[sorted.length - 1].x : sorted[sorted.length - 1].y;
      for (const p of sorted) {
        acc += p.w;
        if (acc >= total * targetFrac) { c = axis === 0 ? p.x : p.y; break; }
      }
      // clamp away from the edges so no cut produces an empty sliver
      const lo = (axis === 0 ? minX : minY), hi = (axis === 0 ? maxX : maxY);
      const pad = (hi - lo) * 0.06;
      c = Math.min(hi - pad, Math.max(lo + pad, c));
    }
    const left = clip(ring, axis, c, false);
    const right = clip(ring, axis, c, true);
    if (left.length < 3 || right.length < 3 ||
        area(left) < 1e-12 || area(right) < 1e-12) {
      // degenerate cut (extreme concavity) — fall back to midpoint on the other axis
      const oAxis = axis === 0 ? 1 : 0;
      const mid = oAxis === 0 ? (minX + maxX) / 2 : (minY + maxY) / 2;
      const l2 = clip(ring, oAxis, mid, false), r2 = clip(ring, oAxis, mid, true);
      if (l2.length < 3 || r2.length < 3) return [ring]; // give up gracefully, keep whole
      return [
        ...splitRec(l2, pts.filter((p) => (oAxis === 0 ? p.x : p.y) <= mid), nL, depth + 1),
        ...splitRec(r2, pts.filter((p) => (oAxis === 0 ? p.x : p.y) > mid), nR, depth + 1),
      ];
    }
    return [
      ...splitRec(left, pts.filter((p) => (axis === 0 ? p.x : p.y) <= c), nL, depth + 1),
      ...splitRec(right, pts.filter((p) => (axis === 0 ? p.x : p.y) > c), nR, depth + 1),
    ];
  }

  /* Split `ring` ([[lng,lat],...]) into n parts.
     `pins` = [[lng,lat],...] of known doors inside; when present they carry
     half the total weight (evidence beats uniform-area assumption), when
     absent pure area decides. Returns { rings: [ [[lng,lat],...] x n ],
     shares: [0..1 weight fraction per part] }. */
  function splitPolygon(ring, n, pins) {
    n = Math.max(2, Math.min(8, Math.round(n)));
    // normalize hand input: drop a duplicated closing vertex and any
    // double-tapped consecutive duplicates
    ring = ring.filter((p, i) => {
      const q = ring[(i + ring.length - 1) % ring.length];
      return Math.abs(p[0] - q[0]) > 1e-9 || Math.abs(p[1] - q[1]) > 1e-9;
    });
    if (ring.length < 3) return { rings: [ring], shares: [1] };
    const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const k = Math.max(0.2, Math.cos(lat0 * Math.PI / 180));
    const scale = ([lng, lat]) => [lng * k, lat];
    const unscale = ([x, y]) => [x / k, y];
    const sRing = ring.map(scale);
    const gridPts = sample(sRing, 700).map(([x, y]) => ({ x, y, w: 1 }));
    const sPins = (pins || []).map(scale)
      .filter(([x, y]) => inRing(sRing, x, y));
    // pin evidence ramps in with pin count: 2 pins barely nudge an
    // area-driven split, 30 pins dominate it (judge-panel graft)
    const ramp = sPins.length / (sPins.length + 8);
    const pinPts = sPins.length && gridPts.length
      ? sPins.map(([x, y]) => ({ x, y, w: (gridPts.length * ramp / (1 - ramp)) / sPins.length }))
      : [];
    const parts = splitRec(sRing, [...gridPts, ...pinPts], n, 0);
    const totalW = gridPts.length + pinPts.reduce((s, p) => s + p.w, 0);
    const shares = parts.map((p) => {
      let w = 0;
      [...gridPts, ...pinPts].forEach((pt) => { if (inRing(p, pt.x, pt.y)) w += pt.w; });
      return totalW ? w / totalW : 1 / parts.length;
    });
    return { rings: parts.map((p) => p.map(unscale)), shares };
  }

  window.MGEO = { splitPolygon, area, inRing };
})();
