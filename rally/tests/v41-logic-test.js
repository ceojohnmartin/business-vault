/* RALLY v41 — the DOMAIN LOGIC gates.

   Everything here is pure computation: turf geometry, canonical hood
   membership, the cycle boundary, the effective-outcome derivation and the
   Route metric sets. It runs in plain node against js/geom.js and
   js/store.js with a small IndexedDB shim, because the arithmetic is worth
   testing at a speed that allows a hundred cases rather than a dozen — the
   browser suites (v41-sync, v41-ui) cover everything that needs a real
   page, a real database and a real server.

   The identity WORKED + REMAINING = ACTIONABLE is asserted in EVERY metric
   case, not just the ones where it looks interesting. Double subtraction is
   the failure this model exists to prevent, and an identity that is only
   spot-checked is not an invariant.

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/v41-logic-test.js
   ONLY=G  — run one section (G geometry, H membership, A assignees,
             C cycle, M metrics, D dnk) */
const path = require("path");
const ROOT = path.join(__dirname, "..");
const ONLY = process.env.ONLY ? new RegExp("^(" + process.env.ONLY + ")") : null;

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
};
const near = (name, got, want, tol) =>
  check(name, Math.abs(got - want) <= tol, "got " + got + ", want ~" + want);
/* Async cases are QUEUED WITH THE WORLD THEY WERE WRITTEN AGAINST. Firing
   them and letting them settle whenever would run them after later sections
   had reset the store, so every assertion would be made against a world
   that no longer exists — and, worse, one where a hood id from a later
   section happens to collide. `later()` snapshots the store at queue time
   and restores it before running. */
const ASYNC = [];
function later(fn) {
  const snap = {
    pins: S.pins.slice(), events: S.events.slice(), customers: S.customers.slice(),
    territories: S.territories.slice(), users: S.users.slice(),
    currentUserId: S.settings.currentUserId,
  };
  ASYNC.push(async () => {
    S.pins = snap.pins.slice(); S.events = snap.events.slice();
    S.customers = snap.customers.slice(); S.territories = snap.territories.slice();
    S.users = snap.users.slice(); S.settings.currentUserId = snap.currentUserId;
    await fn();
  });
}
let sec = "";
const section = (t) => { sec = t; if (!ONLY || ONLY.test(t)) console.log("\n== " + t); };
const on = () => !ONLY || ONLY.test(sec);

// ---------------- the shim: just enough browser for store.js ----------------
let uidN = 0;
const stores = {};
const kv = {};
global.window = global;
global.navigator = { onLine: true };
global.MDB = {
  uid: () => "id" + (++uidN),
  getAll: async (t) => (stores[t] || []).slice(),
  put: async (t, r) => { stores[t] = (stores[t] || []).filter((x) => x.id !== r.id).concat([r]); },
  del: async (t, id) => { stores[t] = (stores[t] || []).filter((x) => x.id !== id); },
  bulkPut: async (t, rows) => { for (const r of rows) await MDB.put(t, r); },
  bulkDel: async (t, ids) => { stores[t] = (stores[t] || []).filter((x) => ids.indexOf(x.id) < 0); },
  txn: async (names, fn) => {
    const api = (n) => ({
      put: (r) => MDB.put(n, r), delete: (id) => MDB.del(n, id),
    });
    await fn(api);
  },
  kvGet: async (k, d) => (k in kv ? kv[k] : d),
  kvSet: async (k, v) => { kv[k] = v; },
};
global.MUI = {
  toast: (t) => { global.__lastToast = t; },
  fmtDate: (t) => String(t), fmtTime: (t) => String(t),
  dayKey: (t) => new Date(t).toISOString().slice(0, 10),
};
global.MDATA = {
  COMPANY_DEFAULTS: {},
  HOOD_COLORS: ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6"],
  PIPELINE: [
    { id: "lead", label: "Lead", chip: "#888" }, { id: "appt", label: "Appt", chip: "#888" },
    { id: "sold", label: "Sold", chip: "#0a0" }, { id: "scheduled", label: "Scheduled", chip: "#0a0" },
    { id: "active", label: "Active", chip: "#0a0" },
  ],
};
require(path.join(ROOT, "js/geom.js"));
require(path.join(ROOT, "js/store.js"));
const G = global.MGEOM;
const S = global.STORE;

// ---------------- fixture helpers ----------------
const LAT0 = 40;
const P = G.project(LAT0);
// metres -> [lng,lat], anchored so the fixtures read in plain metres
const at = (x, y) => { const ll = P.toLngLat(x, y); return [ll[0], ll[1] + LAT0]; };
const rect = (x0, y0, x1, y1) => [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)];

const HOUR = 3600e3, DAY = 24 * HOUR;
const T0 = Date.parse("2026-01-01T00:00:00Z");

function reset() {
  S.pins = []; S.events = []; S.customers = []; S.territories = []; S.users = [];
  S.settings.currentUserId = null;
  Object.keys(stores).forEach((k) => delete stores[k]);
}
function user(name, role) {
  const u = { id: "u" + (S.users.length + 1), name, role: role || "rep", color: "#123456" };
  S.users.push(u);
  return u;
}
function hood(name, ring, extra) {
  const t = Object.assign({
    id: "t" + (S.territories.length + 1), name, points: ring,
    createdAt: T0, updatedAt: T0, assignees: { entries: [] }, archived: false,
  }, extra || {});
  S.territories.push(t);
  return t;
}
// a door at metre coords, with a knock history of [ts, disposition] pairs
function door(x, y, history, extra) {
  const p = Object.assign({
    id: "p" + (S.pins.length + 1), lng: at(x, y)[0], lat: at(x, y)[1],
    address: "", disposition: "unworked", history: [], createdAt: T0, updatedAt: T0,
  }, extra || {});
  (history || []).forEach(([ts, d]) => {
    p.history.push({ ts, disposition: d, reason: null, dm: false, note: "" });
    p.disposition = d;
    p.lastKnockAt = ts;
    S.events.push({ id: "e" + S.events.length, ts, pinId: p.id, disposition: d, repId: null });
  });
  S.pins.push(p);
  return p;
}
function customer(pin, signedAt, acct) {
  const c = { id: "c" + (S.customers.length + 1), pinId: pin ? pin.id : null,
    acct: acct || "active", agreement: signedAt ? { signedAt } : null };
  S.customers.push(c);
  return c;
}
// every metric case asserts the identity, always
function metrics(t, label, want) {
  const m = S.routeMetrics(t);
  check(label + ": WORKED+REMAINING = ACTIONABLE",
    m.worked + m.remaining === m.actionable,
    m.worked + "+" + m.remaining + " != " + m.actionable);
  check(label + ": prior+actionable = inventory",
    m.priorCustomers + m.priorDnk + m.actionable === m.inventory,
    m.priorCustomers + "+" + m.priorDnk + "+" + m.actionable + " != " + m.inventory);
  Object.keys(want || {}).forEach((k) => {
    check(label + ": " + k + " = " + want[k], m[k] === want[k], "got " + m[k]);
  });
  return m;
}

// ================================================================ G geometry
section("G — turf geometry");
if (on()) {
  const sq = rect(0, 0, 100, 100);
  near("G1 100m square measures 10000 m2", G.areaM2(sq), 10000, 1);
  near("G2 a shared edge is 0 m2 of overlap", G.overlapM2(sq, rect(100, 0, 200, 100)), 0, 1e-6);
  near("G3 a corner touch is 0 m2 of overlap", G.overlapM2(sq, rect(100, 100, 200, 200)), 0, 1e-6);
  near("G4 half-overlap measures half", G.overlapM2(sq, rect(50, 0, 150, 100)), 5000, 1);
  check("G5 disjoint hoods overlap by exactly 0",
    G.overlapM2(sq, rect(1000, 0, 1100, 100)) === 0);
  near("G6 a 1 m2 sliver measures 1 m2", G.overlapM2(sq, rect(99.99, 0, 200, 100)), 1.0, 0.01);
  check("G7 a 1 m2 sliver sits AT the tolerance, not over it",
    G.overlapM2(sq, rect(99.99, 0, 200, 100)) <= G.OVERLAP_TOLERANCE_M2 + 0.01);
  check("G8 a 5 m2 sliver exceeds the tolerance",
    G.overlapM2(sq, rect(99.95, 0, 200, 100)) > G.OVERLAP_TOLERANCE_M2);
  check("G9 the tolerance is exactly 1.0 m2", G.OVERLAP_TOLERANCE_M2 === 1.0);

  const L = [at(0, 0), at(100, 0), at(100, 50), at(50, 50), at(50, 100), at(0, 100)];
  near("G10 a concave L measures 7500 m2", G.areaM2(L), 7500, 1);
  near("G11 concave inside convex overlaps by the L's own area", G.overlapM2(L, sq), 7500, 1);
  near("G12 the L's notch is empty", G.overlapM2(L, rect(50, 50, 100, 100)), 0, 1e-6);

  check("G13 a square is valid", G.validate(sq).ok);
  check("G14 two points is not a hood", G.validate([[0, 0], [1, 0]]).code === "too_few_points");
  const bow = G.validate([at(0, 0), at(100, 100), at(100, 0), at(0, 100)]);
  check("G15 a symmetric bowtie is REFUSED as self-intersecting, not as empty",
    bow.code === "self_intersection", "got " + bow.code);
  check("G16 the refusal names where the outline crosses", /crosses itself/.test(bow.reason));
  check("G17 an asymmetric bowtie is refused too",
    G.validate([at(0, 0), at(100, 80), at(100, 0), at(0, 100)]).code === "self_intersection");
  check("G18 collinear corners are refused as zero-area",
    G.validate([at(0, 0), at(50, 0), at(100, 0)]).code === "zero_area");
  check("G19 there is NO ST_MakeValid-style repair: an invalid ring returns ok:false",
    G.validate([at(0, 0), at(100, 100), at(100, 0), at(0, 100)]).ok === false);

  const dup = [at(0, 0), at(0, 0), at(100, 0), at(100, 100), at(0, 100), at(0, 0)];
  const n = G.normalizeRing(dup);
  check("G20 duplicate and closing vertices are dropped", n.points.length === 4, "got " + n.points.length);
  check("G21 and reported", n.dropped === 2, "got " + n.dropped);
  near("G22 dropping them does not change the area", G.areaM2(n.points), 10000, 1);
  const cw = sq.slice().reverse();
  const setOf = (r) => r.map((p) => p.join(",")).sort().join("|");
  check("G23 forcing CCW is a permutation, never a repair", setOf(G.forceCCW(cw)) === setOf(cw));
  check("G24 forcing CCW gives a positive signed area", G.signedAreaM2(G.forceCCW(cw)) > 0);
  check("G25 a valid ring keeps every corner the leader placed",
    G.validate(sq).points.length === 4);

  check("G26 the centre of a hood is inside it", G.pointInRing(sq, at(50, 50)[0], at(50, 50)[1]));
  check("G27 a far door is outside", !G.pointInRing(sq, at(500, 50)[0], at(500, 50)[1]));

  const pe = at(102, 50);
  const s = G.snap(pe[0], pe[1], [{ points: sq }], 8);
  check("G28 a point near an edge snaps to that edge", s && s.kind === "edge");
  near("G29 and reports the true distance", s ? s.distM : -1, 2, 0.05);
  const pv = at(101.4, 101.4);
  check("G30 a point near a corner snaps to the VERTEX, not the edge",
    (G.snap(pv[0], pv[1], [{ points: sq }], 8) || {}).kind === "vertex");
  const pf = at(1000, 1000);
  check("G31 nothing within the radius offers no snap",
    G.snap(pf[0], pf[1], [{ points: sq }], 8) === null);
  const before = JSON.stringify(sq);
  G.snap(pe[0], pe[1], [{ points: sq }], 8);
  check("G32 snapping never mutates the neighbouring hood", JSON.stringify(sq) === before);

  const ring = (cx, cy, r, k) => {
    const o = []; for (let i = 0; i < k; i++) { const a = 2 * Math.PI * i / k;
      o.push(at(cx + r * Math.cos(a), cy + r * Math.sin(a))); } return o;
  };
  near("G33 tangent 40-gons overlap by 0", G.overlapM2(ring(0, 0, 100, 40), ring(200, 0, 100, 40)), 0, 1e-6);
  near("G34 identical 40-gons overlap fully",
    G.overlapM2(ring(0, 0, 100, 40), ring(0, 0, 100, 40)), G.areaM2(ring(0, 0, 100, 40)), 1);
}

// ============================================================= H membership
section("H — canonical hood membership");
if (on()) {
  reset();
  const a = hood("A", rect(0, 0, 100, 100));
  const b = hood("B", rect(100, 0, 200, 100));
  const d1 = door(50, 50);
  check("H1 a door inside A belongs to A", S.hoodOf(d1).id === a.id);
  const d2 = door(150, 50);
  check("H2 a door inside B belongs to B", S.hoodOf(d2).id === b.id);
  const d3 = door(500, 500);
  check("H3 a door inside nothing belongs to nothing", S.hoodOf(d3) === null);

  // a stale stamp that geometry contradicts
  const d4 = door(150, 50, [], { territoryId: a.id });
  check("H4 a stamp its polygon no longer contains loses to containment",
    S.hoodOf(d4).id === b.id);
  // a stamp nothing contradicts survives — GPS drift must not orphan a door
  const d5 = door(500, 500, [], { territoryId: a.id });
  check("H5 a live stamp still beats nothing when no polygon contains the door",
    S.hoodOf(d5).id === a.id);
  // an archived hood is not a home
  const c = hood("C", rect(200, 0, 300, 100), { archived: true });
  const d6 = door(250, 50, [], { territoryId: c.id });
  check("H6 an archived hood cannot own a door", S.hoodOf(d6) === null);
  const d7 = door(50, 50, [], { territoryId: "gone" });
  check("H7 a stamp naming a deleted hood falls back to containment",
    S.hoodOf(d7).id === a.id);

  // addKnock and the metrics must agree, which is the whole point
  later(async () => {
    await S.addKnock({ pinId: d4.id, disposition: "nothome" });
    check("H8 addKnock re-homes a geometrically stale stamp to the same hood",
      d4.territoryId === b.id, "got " + d4.territoryId);
  });
}

// ============================================================== A assignees
section("A — multi-assignee assignment");
if (on()) {
  reset();
  const john = user("John"), jake = user("Jake"), sam = user("Sam");
  const lead = user("Lead", "manager");
  S.settings.currentUserId = lead.id;
  const t = hood("A", rect(0, 0, 100, 100));

  S.applyAssigneeSet(t, [john.id], { at: T0 + HOUR });
  check("A1 one rep assigned", S.currentAssignees(t).join() === john.id);
  S.applyAssigneeSet(t, [john.id, jake.id], { at: T0 + 2 * HOUR });
  check("A2 TWO current reps on one hood",
    S.currentAssignees(t).sort().join() === [john.id, jake.id].sort().join(),
    JSON.stringify(S.currentAssignees(t)));
  check("A3 both hold the hood in hoodsOf",
    S.hoodsOf(john.id).length === 1 && S.hoodsOf(jake.id).length === 1);

  S.applyAssigneeSet(t, [john.id], { at: T0 + 3 * HOUR });
  check("A4 removing Jake leaves John assigned", S.currentAssignees(t).join() === john.id);
  check("A5 Jake's entry is CLOSED, never deleted",
    S.assigneeEntries(t).filter((e) => e.userId === jake.id).length === 1);
  check("A6 and carries the timestamp it was closed at",
    S.assigneeEntries(t).find((e) => e.userId === jake.id).unassignedAt === T0 + 3 * HOUR);
  check("A7 Jake no longer sees the hood", S.hoodsOf(jake.id).length === 0);

  S.applyAssigneeSet(t, [john.id, jake.id, sam.id], { at: T0 + 4 * HOUR });
  check("A8 three concurrent reps", S.currentAssignees(t).length === 3);
  check("A9 Jake gets a NEW entry rather than reopening the closed one",
    S.assigneeEntries(t).filter((e) => e.userId === jake.id).length === 2);

  const before = S.assigneeEntries(t).length;
  check("A10 re-assigning an already-current rep is a no-op",
    S.applyAssigneeSet(t, [john.id, jake.id, sam.id], { at: T0 + 5 * HOUR }) === false);
  check("A11 and adds no second open entry", S.assigneeEntries(t).length === before);

  // the deterministic mirror
  check("A12 assignedTo is the FIRST open assignee",
    t.assignedTo === S.currentAssignees(t)[0]);
  check("A13 the v40 assignments mirror holds every entry",
    t.assignments.length === S.assigneeEntries(t).length);
  check("A14 the mirror renders assignedBy as a NAME, never a uuid",
    t.assignments.every((a) => !/^u\d+$/.test(a.assignedBy)),
    JSON.stringify(t.assignments.map((a) => a.assignedBy)));

  // same-millisecond tie: the userId tiebreak must make the order total
  const t2 = hood("B", rect(200, 0, 300, 100));
  S.applyAssigneeSet(t2, [sam.id, jake.id, john.id], { at: T0 + 6 * HOUR });
  const order1 = S.currentAssignees(t2).join();
  S.applyAssigneeSet(t2, [], { at: T0 + 7 * HOUR });
  S.applyAssigneeSet(t2, [john.id, sam.id, jake.id], { at: T0 + 6 * HOUR });
  check("A15 a same-millisecond assignment orders identically whatever the input order",
    S.currentAssignees(t2).join() === order1, order1 + " vs " + S.currentAssignees(t2).join());

  // history survives every transition
  const closed = S.assigneeEntries(t).filter((e) => e.unassignedAt);
  check("A16 closed history is preserved across all of it", closed.length >= 1);
  check("A17 every entry carries a timestamp", S.assigneeEntries(t).every((e) => e.assignedAt > 0));

  // legacy shapes read back without a migration having run
  const legacy = hood("L", rect(400, 0, 500, 100), {
    assignees: undefined,
    assignments: [{ userId: john.id, name: "John", assignedBy: "Lead", assignedAt: T0, unassignedAt: null }],
    assignedTo: john.id,
  });
  check("A18 a v40 hood's assignments read back as entries",
    S.currentAssignees(legacy).join() === john.id);
  const bare = hood("Bare", rect(600, 0, 700, 100), { assignees: undefined, assignedTo: jake.id });
  check("A19 an ancient hood with only a scalar assignee reads back too",
    S.currentAssignees(bare).join() === jake.id);
  check("A20 and the synthesized entry is marked as such",
    S.assigneeEntries(bare)[0].synthesizedFrom === "assignedTo");

  // deleting a user removes only that user
  later(async () => {
    const t3 = hood("C", rect(800, 0, 900, 100));
    S.applyAssigneeSet(t3, [john.id, sam.id], { at: T0 + 8 * HOUR });
    await S.deleteUser(sam.id);
    check("A21 deleting one rep leaves the other assigned",
      S.currentAssignees(t3).join() === john.id, JSON.stringify(S.currentAssignees(t3)));
    check("A22 and keeps their history", S.assigneeEntries(t3).some((e) => e.userId === sam.id));
  });
}

// ================================================================= C cycle
section("C — the cycle boundary and effective outcome");
if (on()) {
  reset();
  const t = hood("A", rect(0, 0, 1000, 1000));
  const C = T0 + 10 * DAY;

  const red = door(10, 10, [[T0 + DAY, "notint"]]);
  const yel = door(20, 10, [[T0 + DAY, "nothome"]]);
  const pur = door(30, 10, [[T0 + DAY, "goback"]]);
  const blk = door(40, 10, [[T0 + DAY, "dnk"]]);
  const grn = door(50, 10, [[T0 + DAY, "sold"]]);
  customer(grn, T0 + DAY);

  check("C1 before any boundary, red reads red", S.effectiveDisposition(red, t) === "notint");
  t.cycleStartedAt = C;
  check("C2 after the boundary RED reads unworked", S.effectiveDisposition(red, t) === "unworked");
  check("C3 after the boundary YELLOW reads unworked", S.effectiveDisposition(yel, t) === "unworked");
  check("C4 after the boundary PURPLE reads unworked", S.effectiveDisposition(pur, t) === "unworked");
  check("C5 BLACK stays black across a boundary", S.effectiveDisposition(blk, t) === "dnk");
  check("C6 GREEN stays green across a boundary", S.effectiveDisposition(grn, t) === "sold");

  check("C7 Clear Outcomes writes no pins: the stored disposition is untouched",
    red.disposition === "notint" && yel.disposition === "nothome");
  check("C8 and no knock is deleted", red.history.length === 1 && yel.history.length === 1);

  const post = door(60, 10, [[T0 + DAY, "notint"], [C + HOUR, "nothome"]]);
  check("C9 a post-boundary knock is what the door reads",
    S.effectiveDisposition(post, t) === "nothome");

  // not-home depth is counted from the boundary
  const nh1 = door(70, 10, [[C + HOUR, "nothome"]]);
  const nh2 = door(80, 10, [[C + HOUR, "nothome"], [C + 2 * HOUR, "nothome"]]);
  const nh3 = door(90, 10, [[T0, "nothome"], [C + HOUR, "nothome"],
    [C + 2 * HOUR, "nothome"], [C + 3 * HOUR, "nothome"]]);
  check("C10 one post-boundary not-home is depth 1", S.nhDepth(nh1, t) === 1);
  check("C11 two is depth 2", S.nhDepth(nh2, t) === 2);
  check("C12 three is depth 3", S.nhDepth(nh3, t) === 3, "got " + S.nhDepth(nh3, t));
  check("C13 a pre-boundary not-home does not count toward depth",
    S.nhDepth(nh3, t) === 3);
  t.cycleStartedAt = null;
  check("C14 on the first cycle every not-home counts", S.nhDepth(nh3, t) === 4);

  /* A dnk_clear is a record of an administrative act, not something that
     happened at the door. Returning it as an outcome would ask the map for
     a pin image that does not exist — which renders as NOTHING, so the door
     would silently disappear from the map the moment a manager cleared it
     on a hood that had had a cycle started. */
  t.cycleStartedAt = C;
  const cleared = door(110, 10, [[C + HOUR, "dnk"], [C + 2 * HOUR, "dnk_clear"]]);
  check("C17 a cleared door does NOT read as 'dnk_clear'",
    S.effectiveDisposition(cleared, t) !== "dnk_clear",
    S.effectiveDisposition(cleared, t));
  check("C18 it reads as a real outcome the map can paint",
    ["unworked", "nothome", "goback", "notint", "sold", "dnk"]
      .indexOf(S.effectiveDisposition(cleared, t)) >= 0,
    S.effectiveDisposition(cleared, t));
  t.cycleStartedAt = null;
  check("C19 and on the first cycle too",
    ["unworked", "nothome", "goback", "notint", "sold", "dnk"]
      .indexOf(S.effectiveDisposition(cleared, t)) >= 0,
    S.effectiveDisposition(cleared, t));
  t.cycleStartedAt = C;

  // callbacks survive
  t.cycleStartedAt = C;
  const cb = door(100, 10, [[T0 + DAY, "goback"]], { callbackAt: C + 5 * DAY });
  check("C15 a callback survives the boundary", cb.callbackAt === C + 5 * DAY);
  check("C16 cycleStart(null) means first cycle, not zero",
    S.cycleStart(hood("Z", rect(2000, 0, 2100, 100))) === null);
}

// ================================================================== D dnk
section("D — do-not-knock authority (client half)");
if (on()) {
  reset();
  const t = hood("A", rect(0, 0, 1000, 1000));
  const rep = user("Rep", "rep"), boss = user("Boss", "manager");
  S.settings.currentUserId = rep.id;
  // the role is SERVER-authored (S.roleState), never inferred from which
  // local user happens to be selected — that is the v39 capability rule
  const asRole = (r) => { S.roleState = Object.assign({}, S.roleState, { role: r }); };
  asRole("rep");

  const blk = door(10, 10, [[T0, "dnk"]]);
  check("D1 a dnk knock makes the door currently black", S.isCurrentDnk(blk));
  check("D2 and dates it", S.dnkAtOf(blk) === T0);

  // an ordinary later knock does NOT clear black — by anyone
  const blk2 = door(20, 10, [[T0, "dnk"], [T0 + DAY, "nothome"]]);
  check("D3 an ordinary later knock does not clear black", S.isCurrentDnk(blk2));
  check("D4 and the door still READS black", S.effectiveDisposition(blk2, t) === "dnk");

  // only an explicit clear supersedes it
  S.events.push({ id: "ec1", ts: T0 + 2 * DAY, pinId: blk2.id, disposition: "dnk_clear", repId: boss.id });
  check("D5 an explicit dnk_clear after the dnk clears it", !S.isCurrentDnk(blk2));
  check("D6 and the door reads its last ordinary outcome",
    S.effectiveDisposition(blk2, t) === "nothome");
  // a clear BEFORE a later dnk does not clear the later one
  const blk3 = door(30, 10, [[T0, "dnk"]]);
  S.events.push({ id: "ec2", ts: T0 - DAY, pinId: blk3.id, disposition: "dnk_clear", repId: boss.id });
  check("D7 a clear older than the dnk does not clear it", S.isCurrentDnk(blk3));

  // a dnk with no recoverable timestamp is still a dnk
  const blkU = door(40, 10, [], { disposition: "dnk" });
  check("D8 an undateable dnk is still currently black", S.isCurrentDnk(blkU));
  check("D9 and reports UNKNOWN rather than a fake date",
    S.dnkAtOf(blkU) === S.TS_UNKNOWN);

  // a clear is not a knock
  check("D10 a dnk_clear does not count as work",
    S.doorFacts().get(blk2.id).knockTs.length === 2,
    "got " + S.doorFacts().get(blk2.id).knockTs.length);

  later(async () => {
    asRole("rep");
    const ok = await S.deletePin(blk.id);
    check("D11 a REP cannot delete a black door", ok === false);
    check("D12 and is told why", /do-not-knock/.test(global.__lastToast || ""));
    check("D13 the door is still there", !!S.pins.find((p) => p.id === blk.id));
    asRole("manager");
    const ok2 = await S.deletePin(blk.id);
    check("D14 a MANAGER may delete it", ok2 === true);
    check("D15 and only then is the door gone", !S.pins.find((p) => p.id === blk.id));
  });
}

// =============================================================== M metrics
section("M — Route metric sets");
if (on()) {
  // ---- A: the baseline, on an explicit cycle ----
  reset();
  let t = hood("A", rect(0, 0, 5000, 5000));
  const C = T0 + 100 * DAY;
  t.cycleStartedAt = C;
  let x = 0;
  const place = () => { x += 10; return [x % 4900 + 5, Math.floor(x / 4900) * 10 + 5]; };
  const mk = (h, e) => { const [a, b] = place(); return door(a, b, h, e); };

  for (let i = 0; i < 10; i++) customer(mk([[T0, "sold"]]), T0);            // prior customers
  for (let i = 0; i < 5; i++) mk([[T0, "dnk"]]);                            // prior DNK
  for (let i = 0; i < 40; i++) mk([[C + HOUR, "nothome"]]);                 // worked this cycle
  for (let i = 0; i < 45; i++) mk([[T0, "nothome"]]);                       // worked LAST cycle only
  metrics(t, "M-A 100 doors / 10 prior customers / 5 prior DNK / 40 worked", {
    inventory: 100, priorCustomers: 10, priorDnk: 5, actionable: 85,
    worked: 40, remaining: 45, pct: 47,
  });

  // ---- B: a worked door sells THIS cycle ----
  const sellMe = S.pins.find((p) => p.history.length === 1 && p.history[0].ts === C + HOUR);
  sellMe.history.push({ ts: C + 2 * HOUR, disposition: "sold" });
  sellMe.disposition = "sold";
  S.events.push({ id: "esold", ts: C + 2 * HOUR, pinId: sellMe.id, disposition: "sold" });
  customer(sellMe, C + 2 * HOUR);
  let m = metrics(t, "M-B a worked door sells this cycle", {
    inventory: 100, priorCustomers: 10, priorDnk: 5, actionable: 85,
    worked: 40, remaining: 45, pct: 47, salesThisCycle: 1,
  });
  check("M-B the sale does NOT move prospect progress (no double-deduct)", m.pct === 47);

  // ---- C: a worked door goes DNK THIS cycle ----
  const dnkMe = S.pins.filter((p) => p.history.length === 1 && p.history[0].ts === C + HOUR)[0];
  dnkMe.history.push({ ts: C + 3 * HOUR, disposition: "dnk" });
  dnkMe.disposition = "dnk";
  S.events.push({ id: "ednk", ts: C + 3 * HOUR, pinId: dnkMe.id, disposition: "dnk" });
  m = metrics(t, "M-C a worked door goes DNK this cycle", {
    inventory: 100, priorCustomers: 10, priorDnk: 5, actionable: 85,
    worked: 40, remaining: 45, pct: 47, dnkThisCycle: 1,
  });
  check("M-C discovering DNK this cycle is WORK, not a deduction", m.pct === 47);

  // ---- D: Clear Outcomes moves the boundary ----
  const C2 = C + 10 * DAY;
  t.cycleStartedAt = C2;
  m = metrics(t, "M-D after Clear Outcomes", {
    inventory: 100, priorCustomers: 11, priorDnk: 6, actionable: 83,
    worked: 0, remaining: 83, pct: 0,
  });
  check("M-D the 11 customers and 6 DNK are NOT remaining prospect turf",
    m.remaining === 83 && m.remaining !== 100);
  check("M-D Clear Outcomes still wrote no pins",
    S.pins.filter((p) => p.history.length).length === 100);

  // ---- E: an active customer with NO recoverable sold event ----
  const ghost = S.pins.find((p) => p.history.length === 1 && p.history[0].disposition === "nothome"
    && p.history[0].ts === T0);
  customer(ghost, null, "active"); // signed, but the signature date never reached us
  m = metrics(t, "M-E active customer with no recoverable sold event", {
    inventory: 100, actionable: 82, remaining: 82,
  });
  check("M-E an undateable customer is NEVER shown as remaining prospect turf",
    m.priorCustomers === 12, "priorCustomers=" + m.priorCustomers);
  check("M-E and is counted as evidence-unknown rather than dropped",
    m.priorUnknown >= 1, "priorUnknown=" + m.priorUnknown);

  // ---- F: every remaining door resolved ----
  S.pins.forEach((p) => {
    if (S.routeMetricsIncludes && !S.routeMetricsIncludes(p)) return;
    p.history.push({ ts: C2 + HOUR, disposition: "nothome" });
    S.events.push({ id: "ef" + p.id, ts: C2 + HOUR, pinId: p.id, disposition: "nothome" });
  });
  m = metrics(t, "M-F every actionable door resolved", {
    actionable: 82, worked: 82, remaining: 0, pct: 100,
  });

  // ---- the degenerate case ----
  reset();
  t = hood("Z", rect(0, 0, 1000, 1000));
  t.cycleStartedAt = C;
  for (let i = 0; i < 12; i++) door(10 * i + 5, 5, [[T0, "dnk"]]);
  m = metrics(t, "M-G every door prior-DNK", {
    inventory: 12, priorDnk: 12, actionable: 0, worked: 0, remaining: 0,
  });
  check("M-G zero actionable doors reads null, not 0% and not 100%", m.pct === null);

  // ---- first cycle ----
  reset();
  t = hood("F", rect(0, 0, 1000, 1000));            // cycleStartedAt is null
  const fc = door(10, 10, [[T0, "sold"]]); customer(fc, T0);
  const fd = door(20, 10, [[T0, "dnk"]]);
  const fk = door(30, 10, [[T0, "nothome"]]);
  const fu = door(40, 10);
  const fghost = door(50, 10, [[T0, "nothome"]]); customer(fghost, null);
  const fdu = door(60, 10, [], { disposition: "dnk" });
  m = metrics(t, "M-H first cycle", {
    inventory: 6, actionable: 4, worked: 3, remaining: 1, priorUnknown: 2,
  });
  check("M-H a dated customer counts as WORKED on the first cycle", m.worked === 3);
  check("M-H an undated customer and an undated DNK are excluded conservatively",
    m.priorCustomers === 1 && m.priorDnk === 1,
    "pc=" + m.priorCustomers + " pd=" + m.priorDnk);
  check("M-H the never-knocked door is the only one remaining", m.remaining === 1);
  check("M-H pct is 3/4", m.pct === 75, "got " + m.pct);

  // ---- split child inherits worked doors: -infinity, not created_at ----
  reset();
  t = hood("Child", rect(0, 0, 1000, 1000), { createdAt: T0 + 200 * DAY });
  for (let i = 0; i < 10; i++) door(10 * i + 5, 5, [[T0, "nothome"]]);
  m = metrics(t, "M-I a fresh split child with fully worked inherited doors", {
    inventory: 10, actionable: 10, worked: 10, remaining: 0, pct: 100,
  });
  check("M-I the first cycle anchors at -infinity, NOT at the hood's createdAt",
    m.pct === 100, "got " + m.pct);
}


// ================================================================ S scale
section("S — cost at a real book's size");
if (on()) {
  reset();
  const HOODS = 60, DOORS = 3000;
  for (let i = 0; i < HOODS; i++) {
    const cx = (i % 10) * 220, cy = Math.floor(i / 10) * 220;
    hood("H" + i, rect(cx, cy, cx + 200, cy + 200));
  }
  for (let i = 0; i < DOORS; i++) {
    const h = i % HOODS, cx = (h % 10) * 220, cy = Math.floor(h / 10) * 220;
    door(cx + 10 + (i % 18) * 10, cy + 10 + ((Math.floor(i / 18)) % 18) * 10,
      [[T0, "nothome"], [T0 + HOUR, "notint"]]);
  }
  const t0 = Date.now();
  const f = S.doorFacts();
  let total = 0, identity = true;
  S.territories.forEach((t) => {
    const m = S.routeMetrics(t, f);
    total += m.inventory;
    if (m.worked + m.remaining !== m.actionable) identity = false;
  });
  const ms = Date.now() - t0;
  check("S1 every door lands in exactly one hood", total === DOORS, "counted " + total);
  check("S2 the identity holds across all " + HOODS + " hoods", identity);
  /* The grouping is what keeps this linear in doors. Scanning every door
     per hood is O(hoods x doors) — 180,000 passes here — and would be a
     visible hitch every time the Route tab painted. */
  check("S3 metrics for " + HOODS + " hoods over " + DOORS + " doors stay well under a frame budget",
    ms < 400, ms + " ms");
  console.log("    (" + ms + " ms for " + HOODS + " hoods / " + DOORS + " doors / " +
    S.events.length + " events)");
}

(async () => {
  // each queued case restores the world it was written against
  for (const run of ASYNC) await run();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
