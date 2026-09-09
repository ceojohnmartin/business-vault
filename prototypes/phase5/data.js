/* PHASE 5 PROTOTYPE — SYNTHETIC DEMONSTRATION DATA ONLY.
   No production record, no Supabase call, no real address. Every name,
   street and door below is invented for design review. The basemap is
   drawn from this file too: the prototype never contacts a tile server. */
(function () {
  const C = [-92.0405, 30.2240];              // fictional origin
  const mLng = 1 / (111320 * Math.cos(C[1] * Math.PI / 180));
  const mLat = 1 / 110540;
  const P = (x, y) => [C[0] + x * mLng, C[1] + y * mLat];

  // ---------- synthetic cartography ----------
  const roads = [], blocks = [];
  const AV = ["Cypress Ave", "Magnolia Ave", "Bayou Ave", "Live Oak Ave"];
  const ST = ["1st St", "2nd St", "3rd St", "4th St", "5th St", "6th St"];
  AV.forEach((name, i) => roads.push({ name, cls: i === 1 ? "major" : "minor",
    geo: [P(-460, -300 + i * 200), P(760, -300 + i * 200)] }));
  ST.forEach((name, i) => roads.push({ name, cls: "minor",
    geo: [P(-380 + i * 200, -380), P(-380 + i * 200, 560)] }));
  roads.push({ name: "Parish Hwy", cls: "hwy", geo: [P(-460, 620), P(760, 590)] });

  for (let bx = 0; bx < 5; bx++) for (let by = 0; by < 4; by++) {
    const x0 = -360 + bx * 200, y0 = -280 + by * 200;
    for (let k = 0; k < 8; k++) {
      const jx = ((bx * 7 + by * 3 + k * 11) % 5) - 2;      // deterministic jitter
      const jy = ((bx * 5 + by * 13 + k * 7) % 5) - 2;
      const w = 24 + ((k + bx) % 3) * 5, hgt = 34 + ((k + by) % 3) * 7;
      const px = x0 + 20 + (k % 4) * 40 + jx, py = y0 + (k < 4 ? 24 : 116) + jy;
      blocks.push([[P(px, py), P(px + w, py), P(px + w, py + hgt), P(px, py + hgt), P(px, py)]]);
    }
  }
  const park = [[P(560, -300), P(760, -300), P(760, 100), P(560, 100), P(560, -300)]];

  // ---------- hoods (turf) ----------
  const hoods = [
    { id: "h-14b", label: "14B", name: "Hood 14 B", color: "#17181A",
      ring: [P(-380, -300), P(20, -300), P(20, 300), P(-380, 300), P(-380, -300)] },
    { id: "h-14a", label: "14A", name: "Hood 14 A", color: "#7C5CFC",
      ring: [P(20, -300), P(420, -300), P(420, 300), P(20, 300), P(20, -300)] },
    { id: "h-15", label: "15", name: "Hood 15", color: "#2E86FF",
      ring: [P(-380, 300), P(420, 300), P(420, 560), P(-380, 560), P(-380, 300)] },
  ];

  // ---------- doors ----------
  const DISP = ["unworked", "nothome", "notint", "goback", "sold", "dnk"];
  const W = [0.42, 0.20, 0.14, 0.09, 0.09, 0.06];
  let seed = 20260909;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = () => { let r = rnd(), a = 0; for (let i = 0; i < W.length; i++) { a += W[i]; if (r < a) return DISP[i]; } return "unworked"; };

  const NAMES = ["R. Boudreaux", "T. Landry", "M. Guidry", "A. Hebert", "C. Thibodeaux",
    "J. Fontenot", "D. Broussard", "S. Melancon", "K. Arceneaux", "P. Trahan"];
  const NOTES = ["Blue door, big dog in back", "Works nights — try after 6",
    "Wants a quote in writing", "Renter — owner lives out of parish",
    "Two kids, saw ants in kitchen", "Asked us to come back with spouse"];

  const doors = [];
  let n = 0;
  for (let bx = 0; bx < 5; bx++) for (let by = 0; by < 4; by++) {
    for (let k = 0; k < 8; k++) {
      const x = -360 + bx * 200 + 35 + (k % 4) * 38;
      const y = -280 + by * 200 + (k < 4 ? 18 : 110);
      const ll = P(x, y);
      // hood 15 is the northern band across the full width; 14B/14A split
      // the southern band at x = 20 m
      const hood = ll[1] > P(0, 300)[1] ? "h-15"
                 : (ll[0] < P(20, 0)[0] ? "h-14b" : "h-14a");
      const d = pick();
      const attempts = d === "nothome" ? 1 + Math.floor(rnd() * 3) : (d === "unworked" ? 0 : 1);
      doors.push({
        id: "d" + (++n), lng: ll[0], lat: ll[1], hood, disp: d, attempts,
        addr: (100 + bx * 100 + k * 4) + " " + AV[by % AV.length],
        name: d === "sold" || rnd() > 0.72 ? NAMES[n % NAMES.length] : "",
        note: rnd() > 0.62 ? NOTES[n % NOTES.length] : "",
        when: ["Today 9:41a", "Today 11:07a", "Yesterday 6:12p", "Sat 4:30p", "3 days ago"][n % 5],
        by: ["You", "You", "J. Rivera", "You", "J. Rivera"][n % 5],
        cb: d === "goback" ? ["This evening 6:30p", "Tomorrow 10:00a"][n % 2] : "",
      });
    }
  }
  // one deliberate DNK next to the demo selection so the warning is visible
  doors[19].disp = "dnk"; doors[19].note = "Owner asked us not to return"; doors[19].name = "";

  window.DEMO = { C, roads, blocks, park, hoods, doors, P };
})();
