/* Meridian — in-memory store backed by IndexedDB.
   Reads are instant (memory); every mutation persists before it reports done. */
(function () {
  const S = {
    pins: [],        // {id,lat,lng,address,disposition,reason,dm,note,history[],createdAt,updatedAt}
    events: [],      // {id,ts,pinId,disposition,reason,dm}
    customers: [],   // agreements
    settings: {
      repName: "You",
      teamName: "My Team",
      doorGoal: 75,
      commissionPerSale: 150,
      frSubdomain: "", frKey: "", frToken: "",
      lastCenter: null, lastZoom: null,
    },
    ready: null,
  };

  S.ready = Promise.all([
    MDB.getAll("pins").then((r) => (S.pins = r)),
    MDB.getAll("events").then((r) => (S.events = r.sort((a, b) => a.ts - b.ts))),
    MDB.getAll("customers").then((r) => (S.customers = r)),
    MDB.kvGet("settings", null).then((r) => { if (r) Object.assign(S.settings, r); }),
  ]);

  S.saveSettings = () => MDB.kvSet("settings", S.settings);

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

  S.addCustomer = async function (cust) {
    cust.id = MDB.uid();
    cust.createdAt = Date.now();
    cust.status = "queued";
    S.customers.push(cust);
    await MDB.put("customers", cust);
    return cust;
  };

  S.updateCustomer = async function (cust) {
    await MDB.put("customers", cust);
    return cust;
  };

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
