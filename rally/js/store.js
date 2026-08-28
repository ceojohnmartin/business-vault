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
    const ev = { id: MDB.uid(), ts: now, pinId: pin.id, disposition, reason: reason || null, dm: !!dm };
    S.events.push(ev);
    await MDB.put("pins", pin);
    await MDB.put("events", ev);
    return pin;
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
  S.custMonthly = (c) => (c.plan && c.plan.monthly != null ? c.plan.monthly : c.monthly) || 0;
  S.custInitial = (c) => (c.plan && c.plan.initial != null ? c.plan.initial : c.initial) || 0;
  S.custSignedAt = (c) => (c.agreement && c.agreement.signedAt) || c.signedAt || null;

  // ---------- appointments (embedded on customers) ----------
  S.addAppointment = async function (cust, ts, type) {
    cust.appointments = cust.appointments || [];
    const ap = { id: MDB.uid(), ts, type: type || "initial", status: "scheduled", doneAt: null };
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

  S.nextAppointment = function (c) {
    const up = (c.appointments || []).filter((a) => a.status === "scheduled").sort((x, y) => x.ts - y.ts);
    return up[0] || null;
  };

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

  // live territory numbers, straight from the pins inside the polygon
  S.hoodStats = function (t) {
    let knocked = 0, sold = 0, callbacks = 0;
    let lastWorked = 0;
    S.pins.forEach((p) => {
      if (!S.inHood(t, p.lng, p.lat)) return;
      knocked++;
      if (p.disposition === "sold") sold++;
      if (p.callbackAt) callbacks++;
      if (p.updatedAt > lastWorked) lastWorked = p.updatedAt;
    });
    const homes = Number(t.homes) || 0;
    const remaining = homes ? Math.max(0, homes - knocked) : null;
    const pct = homes ? Math.min(100, Math.round((knocked / homes) * 100)) : null;
    return { knocked, sold, callbacks, homes, remaining, pct, lastWorked: lastWorked || null };
  };

  // hoods belonging to a user (for rep mode and the manager panel)
  S.hoodsOf = (userId) => S.territories.filter((t) => t.assignedTo === userId);

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

  // ---------- callbacks ----------
  S.callbacksDue = function () {
    return S.pins
      .filter((p) => p.callbackAt)
      .sort((a, b) => a.callbackAt - b.callbackAt);
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
