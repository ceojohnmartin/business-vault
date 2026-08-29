/* RALLY — in-memory store backed by IndexedDB.
   Reads are instant (memory); every mutation persists before it reports done. */
(function () {
  const S = {
    pins: [],        // properties: {id,lat,lng,address,disposition,reason,dm,note,callbackAt,history[],createdAt,updatedAt}
    events: [],      // interactions: {id,ts,pinId,disposition,reason,dm}
    customers: [],   // full customer records (see MCUST) — legacy flat agreements still readable
    territories: [], // hoods: {id,name,assignedTo,assignments[],homes,color,points:[[lng,lat],...],createdAt}
    users: [],       // people: {id,name,role:'manager'|'rep',color,createdAt}
    settings: {
      repName: "You",
      teamName: "My Team",
      doorGoal: 75,
      commissionPerSale: 150,
      // company identity — printed on every agreement (state-neutral;
      // COMPANY_DEFAULTS in data.js fills name + license after load)
      companyName: "", companyPhone: "", companyEmail: "",
      companyAddress: "", companyLicense: "",
      frSubdomain: "", frKey: "", frToken: "",
      googleKey: "", googleSessions: null, googleLastError: "",
      propertySource: "auto", regridKey: "", // door-import provider (More → Property data)
      lastCenter: null, lastZoom: null,
      currentUserId: null, // whose device this is
    },
    ready: null,
  };

  S.ready = Promise.all([
    MDB.getAll("pins").then((r) => (S.pins = r)),
    MDB.getAll("events").then((r) => (S.events = r.sort((a, b) => a.ts - b.ts))),
    MDB.getAll("customers").then((r) => (S.customers = r)),
    MDB.getAll("territories").then((r) => (S.territories = r)),
    MDB.getAll("users").then((r) => (S.users = r)),
    MDB.kvGet("settings", null).then((r) => {
      if (r) Object.assign(S.settings, r);
      // devices that saved settings before the company shipped as a
      // built-in hold empty strings — those must not mask the default
      Object.keys(MDATA.COMPANY_DEFAULTS).forEach((k) => {
        if (!S.settings[k]) S.settings[k] = MDATA.COMPANY_DEFAULTS[k];
      });
    }),
  ]).then(async () => {
    // one-time seed: the device owner becomes the first user — a manager,
    // so everything stays visible until they build out the team
    if (!S.users.length) {
      const me = {
        id: MDB.uid(),
        name: S.settings.repName === "You" ? "Me" : S.settings.repName,
        role: "manager",
        color: MDATA.HOOD_COLORS[0],
        createdAt: Date.now(),
      };
      S.users.push(me);
      S.settings.currentUserId = me.id;
      await MDB.put("users", me).catch(() => {});
      await S.saveSettings().catch(() => {});
      // adopt any legacy hoods that carry a bare rep-name string
      await Promise.all(S.territories.map(async (t) => {
        if (t.rep && !t.assignedTo) {
          let u = S.users.find((x) => x.name.toLowerCase() === t.rep.toLowerCase());
          if (!u) {
            u = { id: MDB.uid(), name: t.rep, role: "rep",
              color: MDATA.HOOD_COLORS[S.users.length % MDATA.HOOD_COLORS.length],
              createdAt: Date.now() };
            S.users.push(u);
            await MDB.put("users", u).catch(() => {});
          }
          t.assignedTo = u.id;
          t.assignments = t.assignments || [{
            userId: u.id, name: u.name, assignedBy: me.name,
            assignedAt: t.createdAt || Date.now(), unassignedAt: null,
          }];
          await MDB.put("territories", t).catch(() => {});
        }
      }));
    }
    if (!S.settings.currentUserId || !S.users.some((u) => u.id === S.settings.currentUserId)) {
      S.settings.currentUserId = S.users[0] ? S.users[0].id : null;
      await S.saveSettings().catch(() => {});
    }
  });

  S.saveSettings = () => MDB.kvSet("settings", S.settings);

  // ---------- people ----------
  S.currentUser = () =>
    S.users.find((u) => u.id === S.settings.currentUserId) || S.users[0] || null;
  S.isManager = () => {
    const u = S.currentUser();
    return !u || u.role === "manager"; // a device with no team yet sees everything
  };
  S.userById = (id) => S.users.find((u) => u.id === id) || null;

  S.addUser = async function ({ name, role }) {
    const u = {
      id: MDB.uid(), name: name.trim(), role: role === "manager" ? "manager" : "rep",
      color: MDATA.HOOD_COLORS[S.users.length % MDATA.HOOD_COLORS.length],
      createdAt: Date.now(),
    };
    S.users.push(u);
    await MDB.put("users", u);
    return u;
  };
  S.updateUser = async function (u) {
    await MDB.put("users", u);
    return u;
  };
  S.deleteUser = async function (id) {
    S.users = S.users.filter((u) => u.id !== id);
    await MDB.del("users", id);
    // their hoods go back to the pool; history keeps the record
    await Promise.all(S.territories.map((t) => {
      if (t.assignedTo !== id) return null;
      t.assignedTo = null;
      (t.assignments || []).forEach((a) => { if (a.userId === id && !a.unassignedAt) a.unassignedAt = Date.now(); });
      return MDB.put("territories", t);
    }));
    if (S.settings.currentUserId === id) {
      S.settings.currentUserId = S.users[0] ? S.users[0].id : null;
      await S.saveSettings();
    }
  };

  // ---------- knocks & pins ----------
  S.addKnock = async function ({ lat, lng, pinId, disposition, reason, dm, note, callbackAt }) {
    const now = Date.now();
    let pin = pinId ? S.pins.find((p) => p.id === pinId) : null;
    const entry = { ts: now, disposition, reason: reason || null, dm: !!dm, note: note || "" };
    if (pin) {
      pin.disposition = disposition;
      pin.reason = reason || null;
      pin.dm = !!dm;
      if (note) pin.note = note;
      pin.history.push(entry);
      pin.updatedAt = now;
    } else {
      pin = {
        id: MDB.uid(), lat, lng, address: "",
        disposition, reason: reason || null, dm: !!dm, note: note || "",
        history: [entry], createdAt: now, updatedAt: now,
      };
      S.pins.push(pin);
    }
    // a callback either gets a fresh time or is cleared by the new outcome
    pin.callbackAt = disposition === "goback" ? (callbackAt || pin.callbackAt || null) : null;
    const me = S.currentUser();
    const ev = { id: MDB.uid(), ts: now, pinId: pin.id, disposition, reason: reason || null, dm: !!dm,
      repId: me ? me.id : null,
      territoryId: pin.territoryId ||
        (S.territories.find((t) => !t.archived && t.points && t.points.length >= 3 &&
          S.inHood(t, pin.lng, pin.lat)) || {}).id || null };
    S.events.push(ev);
    await MDB.put("pins", pin);
    await MDB.put("events", ev);
    return pin;
  };

  // ---------- notes (event-shaped: author + timestamp + text, never overwritten) ----------
  S.addNote = async function (pin, text) {
    text = String(text || "").trim();
    if (!text) return pin;
    const me = S.currentUser();
    pin.notes = pin.notes || [];
    pin.notes.push({ ts: Date.now(), userId: me ? me.id : null, name: me ? me.name : "", text });
    return S.updatePin(pin);
  };

  // ---------- imported doors: dedupe + bulk import ----------
  // Matching order (strongest first): external property id → parcel id →
  // normalized address → coordinates within ~15 m. Existing pins are NEVER
  // touched by an import — history is sacred.
  S.buildDoorIndex = function () {
    const byExt = new Map(), byParcel = new Map(), byAddr = new Map(), grid = new Map();
    const cell = (lat, lng) => Math.round(lat * 7000) + ":" + Math.round(lng * 7000); // ~15m cells
    S.pins.forEach((p) => {
      if (p.prop && p.prop.externalId) byExt.set(p.prop.externalId, p);
      if (p.prop && p.prop.parcelId) byParcel.set(p.prop.parcelId, p);
      const a = MPROP.normAddr(p.address);
      if (a) byAddr.set(a, p);
      grid.set(cell(p.lat, p.lng), p);
    });
    return {
      match(prop) {
        if (prop.externalId && byExt.has(prop.externalId)) return byExt.get(prop.externalId);
        if (prop.parcelId && byParcel.has(prop.parcelId)) return byParcel.get(prop.parcelId);
        const a = MPROP.normAddr(prop.address);
        if (a && byAddr.has(a)) return byAddr.get(a);
        // check the 9 surrounding ~15m cells
        const cy = Math.round(prop.lat * 7000), cx = Math.round(prop.lng * 7000);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const p = grid.get((cy + dy) + ":" + (cx + dx));
          if (p && Math.abs(p.lat - prop.lat) < 0.00014 && Math.abs(p.lng - prop.lng) < 0.0002) return p;
        }
        return null;
      },
      add(pin) {
        if (pin.prop && pin.prop.externalId) byExt.set(pin.prop.externalId, pin);
        if (pin.prop && pin.prop.parcelId) byParcel.set(pin.prop.parcelId, pin);
        const a = MPROP.normAddr(pin.address);
        if (a) byAddr.set(a, pin);
        grid.set(cell(pin.lat, pin.lng), pin);
      },
    };
  };

  // Import eligible properties as unworked doors. Idempotent: a re-run of
  // the same import matches everything and adds nothing, so a retry after
  // a dropped connection can never duplicate a door.
  S.importDoors = async function (props, { territoryId, onProgress } = {}) {
    const idx = S.buildDoorIndex();
    const now = Date.now();
    let added = 0, skipped = 0, failed = 0;
    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      if (idx.match(prop)) { skipped++; continue; }
      const pin = {
        id: MDB.uid(), lat: prop.lat, lng: prop.lng,
        address: prop.address || "",
        geo: { city: prop.city || "", state: prop.state || "", zip: prop.zip || "" },
        disposition: "unworked", reason: null, dm: false, note: "",
        history: [], callbackAt: null,
        territoryId: territoryId || null,
        prop: {
          externalId: prop.externalId || null, parcelId: prop.parcelId || null,
          source: prop.source, propertyType: prop.propertyType || null,
          owner: prop.owner || null,
          yearBuilt: prop.yearBuilt || null, sqft: prop.sqft || null,
          lotSqft: prop.lotSqft || null,
          lastSaleDate: prop.lastSaleDate || null, lastSalePrice: prop.lastSalePrice || null,
        },
        importedAt: now, createdAt: now, updatedAt: now,
      };
      try {
        await MDB.put("pins", pin);
        S.pins.push(pin);
        idx.add(pin);
        added++;
      } catch (_) { failed++; }
      if (onProgress && (i % 25 === 24 || i === props.length - 1)) onProgress(i + 1, props.length);
    }
    return { added, skipped, failed };
  };

  S.updatePin = async function (pin) {
    pin.updatedAt = Date.now();
    await MDB.put("pins", pin);
    return pin;
  };

  S.deletePin = async function (id) {
    S.pins = S.pins.filter((p) => p.id !== id);
    S.events = S.events.filter((e) => e.pinId !== id);
    await MDB.del("pins", id);
    // events for the pin are removed from memory; purge from disk too
    const stale = await MDB.getAll("events");
    await Promise.all(stale.filter((e) => e.pinId === id).map((e) => MDB.del("events", e.id)));
  };

  // ---------- customers ----------
  S.addCustomer = async function (cust) {
    cust.id = cust.id || MDB.uid();
    cust.createdAt = cust.createdAt || Date.now();
    cust.status = cust.status || "queued";
    S.customers.push(cust);
    await MDB.put("customers", cust);
    return cust;
  };

  S.updateCustomer = async function (cust) {
    cust.updatedAt = Date.now();
    await MDB.put("customers", cust);
    return cust;
  };

  S.deleteCustomer = async function (id) {
    const c = S.customers.find((x) => x.id === id);
    S.customers = S.customers.filter((x) => x.id !== id);
    await MDB.del("customers", id);
    // sweep the customer's stored files (agreement snapshots, photos)
    if (c && Array.isArray(c.files)) {
      await Promise.all(c.files.map((f) => MDB.del("files", f.id).catch(() => {})));
    }
  };

  // Legacy-tolerant accessors: pre-RALLY records were flat
  // {first,last,address:"str",planName,initial,monthly,...}.
  S.custName = (c) => ((c.first || "") + " " + (c.last || "")).trim() || "Unnamed";
  S.custAddress = (c) => {
    if (typeof c.address === "string") return c.address || "";
    const a = c.address || {};
    return [a.street, [a.city, a.state].filter(Boolean).join(", "), a.zip]
      .filter(Boolean).join(a.street ? ", " : " ").replace(", ,", ",").trim();
  };
  S.custPlanName = (c) => (c.plan && c.plan.name) || c.planName || "—";
  S.custPhone = (c) =>
    ((c.phones || []).map((p) => p.n).find((n) => n && n.trim()) || c.phone || "").trim();
  S.custMonthly = (c) => (c.plan && c.plan.monthly != null ? c.plan.monthly : c.monthly) || 0;
  S.custInitial = (c) => (c.plan && c.plan.initial != null ? c.plan.initial : c.initial) || 0;
  S.custSignedAt = (c) => (c.agreement && c.agreement.signedAt) || c.signedAt || null;

  // ---------- appointments (embedded on customers) ----------
  // status: scheduled | confirmed | done | noshow. setterId = who booked it
  // (attribution survives reassignment); userId = who runs it.
  S.addAppointment = async function (cust, ts, type, userId) {
    cust.appointments = cust.appointments || [];
    const me = S.currentUser();
    const ap = {
      id: MDB.uid(), ts, type: type || "initial", status: "scheduled", doneAt: null,
      userId: userId || (me ? me.id : null),
      setterId: me ? me.id : null,
    };
    cust.appointments.push(ap);
    await S.updateCustomer(cust);
    return ap;
  };

  S.setAppointment = async function (cust, apId, patch) {
    const ap = (cust.appointments || []).find((a) => a.id === apId);
    if (!ap) return null;
    Object.assign(ap, patch);
    await S.updateCustomer(cust);
    return ap;
  };

  // Every appointment across the book, joined to its customer.
  S.allAppointments = function () {
    const out = [];
    S.customers.forEach((c) => {
      (c.appointments || []).forEach((a) => out.push({ ap: a, cust: c }));
    });
    return out.sort((x, y) => x.ap.ts - y.ap.ts);
  };

  S.lastServiced = function (c) {
    let t = 0;
    (c.appointments || []).forEach((a) => { if (a.status === "done" && a.doneAt > t) t = a.doneAt; });
    return t || null;
  };

  const UPCOMING = ["scheduled", "confirmed"];
  S.nextAppointment = function (c) {
    const up = (c.appointments || []).filter((a) => UPCOMING.includes(a.status)).sort((x, y) => x.ts - y.ts);
    return up[0] || null;
  };

  // ---------- pipeline stage (derived, never hand-set) ----------
  S.custStage = function (c) {
    const signed = !!STORE.custSignedAt(c);
    const next = S.nextAppointment(c);
    const serviced = !!S.lastServiced(c);
    if (signed) {
      if (serviced) return stageInfo("active", "Active customer ✓", null);
      if (next) return stageInfo("scheduled",
        `Initial service ${MUI.fmtDate(next.ts)} ${MUI.fmtTime(next.ts)}`, "service");
      return stageInfo("sold", "→ Schedule the initial service", "service");
    }
    if (next) return stageInfo("appt",
      `→ Run the sit · ${MUI.fmtDate(next.ts)} ${MUI.fmtTime(next.ts)}`, "agree");
    return stageInfo("lead", "→ Sign them, or book the sit", "agree");
  };
  function stageInfo(id, nextLabel, nextTab) {
    const st = MDATA.PIPELINE.find((s) => s.id === id);
    return { id, label: st.label, chip: st.chip, idx: MDATA.PIPELINE.indexOf(st), nextLabel, nextTab };
  }

  // ---------- territories (hoods) ----------
  S.addTerritory = async function (t) {
    t.id = MDB.uid();
    t.createdAt = Date.now();
    t.assignments = t.assignments || [];
    S.territories.push(t);
    await MDB.put("territories", t);
    return t;
  };
  S.updateTerritory = async function (t) {
    await MDB.put("territories", t);
    return t;
  };
  S.deleteTerritory = async function (id) {
    S.territories = S.territories.filter((t) => t.id !== id);
    await MDB.del("territories", id);
  };

  // Assignment is history, never an overwrite: the old rep's run is closed
  // out and the new one opened, so "who worked this hood when" survives.
  S.assignTerritory = async function (t, userId) {
    if (t.assignedTo === userId) return t;
    const now = Date.now();
    t.assignments = t.assignments || [];
    t.assignments.forEach((a) => { if (!a.unassignedAt) a.unassignedAt = now; });
    t.assignedTo = userId || null;
    if (userId) {
      const u = S.userById(userId);
      t.assignments.push({
        userId, name: u ? u.name : "?",
        assignedBy: (S.currentUser() || {}).name || "",
        assignedAt: now, unassignedAt: null,
      });
    }
    await MDB.put("territories", t);
    return t;
  };

  S.hoodColor = (t) => {
    const u = t.assignedTo && S.userById(t.assignedTo);
    return u ? u.color : (t.color || "#8A93A6"); // unassigned = neutral
  };

  // ray-cast point-in-polygon on the hood's [lng,lat] ring
  S.inHood = function (t, lng, lat) {
    const pts = t.points || [];
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > lat) !== (yj > lat)) &&
          (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };

  // Live territory numbers, straight from the pins inside the polygon.
  // "Knocked" means SOMEONE WENT TO THE DOOR (the pin has history) —
  // imported unworked inventory counts as doors, never as work done.
  S.hoodStats = function (t) {
    let doors = 0, knocked = 0, sold = 0, callbacks = 0, lastWorked = 0;
    const by = { unworked: 0, nothome: 0, goback: 0, notint: 0, sold: 0, dnk: 0 };
    S.pins.forEach((p) => {
      if (!S.inHood(t, p.lng, p.lat)) return;
      doors++;
      if (by[p.disposition] != null) by[p.disposition]++;
      if (p.history && p.history.length) {
        knocked++;
        if (p.updatedAt > lastWorked) lastWorked = p.updatedAt;
      }
      if (p.disposition === "sold") sold++;
      if (p.callbackAt) callbacks++;
    });
    // real imported inventory beats a manual estimate as the denominator
    const homes = Math.max(Number(t.homes) || 0, by.unworked ? doors : 0);
    const remaining = homes ? Math.max(0, homes - knocked) : null;
    const pct = homes ? Math.min(100, Math.round((knocked / homes) * 100)) : null;
    return { doors, by, knocked, sold, callbacks, homes, remaining, pct, lastWorked: lastWorked || null };
  };

  // territories that should render and count — archived ones sit out
  S.activeTerritories = () => S.territories.filter((t) => !t.archived);

  // hoods belonging to a user (for rep mode and the manager panel)
  S.hoodsOf = (userId) => S.territories.filter((t) => !t.archived && t.assignedTo === userId);

  // every interaction that happened inside a hood, joined through pins
  S.eventsInHood = function (t) {
    const byPin = {};
    S.pins.forEach((p) => { byPin[p.id] = p; });
    return S.events.filter((e) => {
      const p = byPin[e.pinId];
      return p && S.inHood(t, p.lng, p.lat);
    });
  };

  // Area history: door-by-door work grouped into day sessions, each
  // attributed to whoever held the assignment that day.
  S.hoodHistory = function (t) {
    const evs = S.eventsInHood(t);
    const byDay = new Map();
    evs.forEach((e) => {
      const k = MUI.dayKey(e.ts);
      let d = byDay.get(k);
      if (!d) { d = { ts: e.ts, doors: 0, sales: 0 }; byDay.set(k, d); }
      d.doors++;
      if (e.disposition === "sold") d.sales++;
      if (e.ts > d.ts) d.ts = e.ts;
    });
    const repFor = (ts) => {
      const a = (t.assignments || []).find((x) =>
        x.assignedAt <= ts && (!x.unassignedAt || ts <= x.unassignedAt));
      return a ? a.name : "";
    };
    const sessions = [...byDay.values()].sort((a, b) => b.ts - a.ts)
      .map((d) => ({ ...d, rep: repFor(d.ts) }));
    const doors = evs.length;
    const sales = evs.filter((e) => e.disposition === "sold").length;
    const lastWorked = sessions.length ? sessions[0].ts : null;
    return {
      sessions, doors, sales,
      closeRate: doors ? Math.round((sales / doors) * 1000) / 10 : null,
      lastWorked,
      daysSince: lastWorked != null ? Math.floor((Date.now() - lastWorked) / 86400e3) : null,
    };
  };

  // freshness bucket for the heat view — driven by the FRESH_SCALE table
  S.freshness = function (t) {
    const st = S.hoodStats(t);
    if (!st.lastWorked) return MDATA.FRESH_NEVER;
    const days = Math.floor((Date.now() - st.lastWorked) / 86400e3);
    return MDATA.FRESH_SCALE.find((b) => days <= b.max) ||
      MDATA.FRESH_SCALE[MDATA.FRESH_SCALE.length - 1];
  };

  // Smart Split: replace one hood with N weight-balanced children.
  // The parent is retired (deleted) — its knock history lives on the pins,
  // which fall inside whichever child contains them.
  S.splitTerritory = async function (t, n) {
    const pins = S.pins
      .filter((p) => S.inHood(t, p.lng, p.lat))
      .map((p) => [p.lng, p.lat]);
    const { rings, shares } = MGEO.splitPolygon(t.points, n, pins);
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const kids = [];
    for (let i = 0; i < rings.length; i++) {
      kids.push(await S.addTerritory({
        name: `${t.name} ${letters[i] || i + 1}`,
        homes: t.homes ? Math.max(1, Math.round(t.homes * shares[i])) : null,
        points: rings[i],
        assignments: [],
      }));
    }
    await S.deleteTerritory(t.id);
    return kids;
  };

  // ---------- callbacks ----------
  S.callbacksDue = function () {
    return S.pins
      .filter((p) => p.callbackAt)
      .sort((a, b) => a.callbackAt - b.callbackAt);
  };

  // ---------- per-rep activity (events carry repId going forward) ----------
  S.repStats = function (userId, fromTs) {
    const evs = S.events.filter((e) =>
      e.repId === userId && (!fromTs || e.ts >= fromTs));
    const doors = evs.length;
    const convos = evs.filter(isContact).length;
    const dms = evs.filter((e) => e.dm).length;
    const sales = evs.filter((e) => e.disposition === "sold").length;
    return { doors, convos, dms, sales };
  };

  // ---------- opportunity score (house level, explainable) ----------
  // Property + sales-history factors only — never personal traits.
  S.oppScore = function (pin) {
    let score = 50;
    const why = [];
    const attempts = (pin.history || []).length;
    if (pin.disposition === "unworked") {
      // imported, never knocked: fresh ground is the whole point.
      // No freshness penalty — updatedAt is the import time, not a knock.
      score += 12; why.push("Never knocked");
      const nearSold = S.pins.filter((p) =>
        p.disposition === "sold" && p.id !== pin.id &&
        Math.abs(p.lat - pin.lat) < 0.0014 &&
        Math.abs(p.lng - pin.lng) < 0.0014 / Math.max(0.2, Math.cos(pin.lat * Math.PI / 180))).length;
      if (nearSold) { score += Math.min(15, nearSold * 5); why.push(nearSold + " customer" + (nearSold === 1 ? "" : "s") + " nearby"); }
      return { score: Math.max(0, Math.min(99, Math.round(score))), why };
    }
    if (pin.disposition === "goback") {
      score += 22; why.push("They asked for a comeback");
      if (pin.callbackAt && pin.callbackAt <= Date.now()) { score += 10; why.push("Callback is due"); }
    } else if (pin.disposition === "nothome") {
      score += 10; why.push("Never answered — still uncontacted");
      if (attempts >= 3) { score -= 8; why.push(attempts + " attempts already"); }
    } else if (pin.disposition === "notint") {
      score -= 25; why.push("Said no" + (pin.reason ? " — " + pin.reason : ""));
      if (pin.reason && MDATA.REKNOCK_REASONS.includes(pin.reason)) {
        score += 18; why.push("…but it was a soft no");
      }
    } else if (pin.disposition === "sold") {
      return { score: 0, why: ["Already a customer"] };
    } else if (pin.disposition === "dnk") {
      return { score: 0, why: ["Do Not Knock"] };
    }
    // social proof: sold doors nearby (~150m box)
    const near = S.pins.filter((p) =>
      p.disposition === "sold" && p.id !== pin.id &&
      Math.abs(p.lat - pin.lat) < 0.0014 &&
      Math.abs(p.lng - pin.lng) < 0.0014 / Math.max(0.2, Math.cos(pin.lat * Math.PI / 180))).length;
    if (near) { score += Math.min(15, near * 5); why.push(near + " customer" + (near === 1 ? "" : "s") + " nearby"); }
    // freshness: knocked today is cold
    const ageH = (Date.now() - pin.updatedAt) / 3600e3;
    if (ageH < 4) { score -= 12; why.push("Hit " + Math.max(1, Math.round(ageH)) + "h ago"); }
    else if (ageH > 72) { score += 6; why.push("Cooled off " + Math.round(ageH / 24) + " days"); }
    return { score: Math.max(0, Math.min(99, Math.round(score))), why };
  };

  // ---------- best area today (manager recommendation, explainable) ----------
  S.bestHoods = function () {
    return S.activeTerritories()
      .filter((t) => t.points && t.points.length >= 3)
      .map((t) => {
        const st = S.hoodStats(t);
        const h = S.hoodHistory(t);
        let score = 0;
        const why = [];
        const days = h.daysSince;
        if (days == null) { score += 40; why.push("Never worked"); }
        else { score += Math.min(35, days * 1.2); why.push(days === 0 ? "Worked today" : "Rested " + days + "d"); }
        if (st.homes) {
          const remaining = Math.max(0, st.homes - st.knocked);
          score += Math.min(30, remaining / Math.max(1, st.homes) * 30);
          why.push(remaining + " doors available");
        }
        if (h.closeRate != null && h.doors >= 10) {
          score += Math.min(20, h.closeRate * 2.5);
          why.push(h.closeRate + "% historical close");
        }
        if (st.callbacks) { score += Math.min(10, st.callbacks * 2); why.push(st.callbacks + " callbacks waiting"); }
        const u = t.assignedTo && S.userById(t.assignedTo);
        return { t, score: Math.round(score), why, rep: u ? u.name : null, st };
      })
      .sort((a, b) => b.score - a.score);
  };

  // ---------- files (blobs: signed agreements, photos) ----------
  S.putFile = async function (blob, meta) {
    const rec = { id: MDB.uid(), blob, name: meta.name, type: meta.type, addedAt: Date.now() };
    await MDB.put("files", rec);
    return rec;
  };
  S.getFile = (id) => MDB.get("files", id);
  S.deleteFile = (id) => MDB.del("files", id);

  // ---------- derived stats ----------
  const isContact = (e) => MDATA.DISPOSITIONS[e.disposition] && MDATA.DISPOSITIONS[e.disposition].contact;

  S.statsFor = function (fromTs, toTs) {
    const evs = S.events.filter((e) => e.ts >= fromTs && (!toTs || e.ts < toTs));
    const doors = evs.length;
    const convos = evs.filter(isContact).length;
    const dms = evs.filter((e) => e.dm).length;
    const sales = evs.filter((e) => e.disposition === "sold").length;
    return { doors, convos, dms, sales };
  };

  S.todayStats = function () {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return S.statsFor(d.getTime());
  };

  S.weekStats = function () {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const day = (d.getDay() + 6) % 7; // Monday start
    d.setDate(d.getDate() - day);
    return S.statsFor(d.getTime());
  };

  S.dayseries = function (nDays) {
    const out = [];
    for (let i = nDays - 1; i >= 0; i--) {
      // setDate arithmetic is DST-safe where fixed 86400e3 steps are not
      const a = new Date(); a.setHours(0, 0, 0, 0); a.setDate(a.getDate() - i);
      const b = new Date(a); b.setDate(b.getDate() + 1);
      const s = S.statsFor(a.getTime(), b.getTime());
      out.push({ start: a.getTime(), ...s });
    }
    return out;
  };

  // Streak: consecutive days (ending today or yesterday) hitting the door goal.
  S.streak = function () {
    const goal = Math.max(1, S.settings.doorGoal | 0);
    const byDay = {};
    S.events.forEach((e) => { const k = MUI.dayKey(e.ts); byDay[k] = (byDay[k] || 0) + 1; });
    let streak = 0;
    const d = new Date(); d.setHours(12, 0, 0, 0); // noon anchor sidesteps DST edges
    // today counts if already at goal; otherwise start from yesterday
    if ((byDay[MUI.dayKey(d.getTime())] || 0) >= goal) { streak++; }
    for (let i = 1; i < 366; i++) {
      d.setDate(d.getDate() - 1);
      if ((byDay[MUI.dayKey(d.getTime())] || 0) >= goal) streak++;
      else break;
    }
    return streak;
  };

  S.queuedCount = () => S.customers.filter((c) => c.status === "queued").length;

  window.STORE = S;
})();
