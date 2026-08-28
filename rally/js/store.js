/* RALLY — in-memory store backed by IndexedDB.
   Reads are instant (memory); every mutation persists before it reports done. */
(function () {
  const S = {
    pins: [],        // {id,lat,lng,address,disposition,reason,dm,note,history[],createdAt,updatedAt}
    events: [],      // {id,ts,pinId,disposition,reason,dm}
    customers: [],   // full customer records (see MCUST) — legacy flat agreements still readable
    territories: [], // hoods: {id,name,rep,color,points:[[lng,lat],...],createdAt}
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
    },
    ready: null,
  };

  S.ready = Promise.all([
    MDB.getAll("pins").then((r) => (S.pins = r)),
    MDB.getAll("events").then((r) => (S.events = r.sort((a, b) => a.ts - b.ts))),
    MDB.getAll("customers").then((r) => (S.customers = r)),
    MDB.getAll("territories").then((r) => (S.territories = r)),
    MDB.kvGet("settings", null).then((r) => {
      if (r) Object.assign(S.settings, r);
      // devices that saved settings before the company shipped as a
      // built-in hold empty strings — those must not mask the default
      Object.keys(MDATA.COMPANY_DEFAULTS).forEach((k) => {
        if (!S.settings[k]) S.settings[k] = MDATA.COMPANY_DEFAULTS[k];
      });
    }),
  ]);

  S.saveSettings = () => MDB.kvSet("settings", S.settings);

  // ---------- knocks & pins ----------
  S.addKnock = async function ({ lat, lng, pinId, disposition, reason, dm, note }) {
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
