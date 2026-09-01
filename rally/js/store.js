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
        // With a cloud project configured the SERVER owns this role — the
        // device seeds itself least-privileged and the first profile sync
        // raises it. Only a cloud-less install (no server to ask) keeps the
        // old "device owner runs everything" behaviour.
        role: (window.MCLOUD && MCLOUD.enabled()) ? "rep" : "manager",
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
    // before ANYTHING can read, export, back up or sync a customer
    await S.purgePaymentCredentials();
  });

  /* ---------- v39: raw payment credentials leave this device ----------
     RALLY no longer captures card or bank numbers anywhere. Records written
     by v38 and earlier still hold them in IndexedDB, so they are stripped
     once at boot, in place, before anything can read, export, back up or
     sync them.

     Deleting keys (rather than rebuilding the object) is deliberate: the
     list below is the definition of "credential", and anything on it is
     removed from a payment block wherever it sits. MCUST.honestPayment()
     independently REBUILDS the block from an allowlist on every read and
     write, so a credential has to survive two different mechanisms — one
     naming what is forbidden, one naming what is permitted — to come back.
     Neither the editor, normalize(), a restore, nor a sync merge has a path
     that reintroduces one.

     Local only. It never queues a sync push: the server never held these
     fields (a trigger has always stripped them), so there is nothing to
     tell it, and marking every customer dirty would push the whole book. */
  const CREDENTIAL_KEYS = [
    "number", "cardNumber", "pan", "exp", "expiry", "expiration",
    "cvv", "cvc", "securityCode", "cardCode",
    "routing", "routingNumber", "account", "accountNumber", "bankAccount",
  ];

  S.stripPaymentCredentials = function (rec) {
    const p = rec && rec.payment;
    if (!p || typeof p !== "object") return false;
    let hit = false;
    const scrub = (o) => {
      if (!o || typeof o !== "object") return;
      CREDENTIAL_KEYS.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(o, k)) { delete o[k]; hit = true; }
      });
    };
    scrub(p); scrub(p.card); scrub(p.ach);
    // The pre-v39 shape defaulted autopay to TRUE, so an old `true` records
    // a software default and not a customer's request. It is dropped, never
    // migrated into autopayRequested — inventing intent is the failure this
    // whole change exists to avoid.
    if (Object.prototype.hasOwnProperty.call(p, "autopay")) {
      delete p.autopay; hit = true;
    }
    return hit;
  };

  S.purgePaymentCredentials = async function () {
    const dirty = S.customers.filter((c) => S.stripPaymentCredentials(c));
    if (dirty.length) await MDB.bulkPut("customers", dirty).catch(() => {});
    return dirty.length; // 0 on every run after the first — idempotent
  };

  S.saveSettings = () => MDB.kvSet("settings", S.settings);

  // ---------- people ----------
  S.currentUser = () =>
    S.users.find((u) => u.id === S.settings.currentUserId) || S.users[0] || null;
  S.userById = (id) => S.users.find((u) => u.id === id) || null;

  /* ---------- role: the server decides, the client only mirrors ----------
     ONE trusted role state, period. The durable copy lives in the
     cloudProfile record (written only by MCLOUD); this is the in-memory
     view of it, and users[].role for THIS device is kept equal to it so
     nothing derived from the people list can disagree.

       mode "server"  a profile row was read from the server this session
       mode "cached"  a role the server gave us earlier; we're offline now
       mode "unknown" authenticated, but no server role has EVER arrived
       mode "local"   no cloud project configured — there is no server

     "unknown" resolves to rep. Absence of an answer is never permission. */
  const LEADERSHIP = ["leader", "manager", "owner"];
  S.roleState = { mode: "unknown", role: null, verifiedAt: 0 };

  // called at boot; also whenever the cloud session changes
  S.loadRoleState = async function () {
    if (!(window.MCLOUD && MCLOUD.enabled())) {
      const u = S.currentUser();
      S.roleState = { mode: "local", role: (u && u.role) || "manager", verifiedAt: 0 };
      return S.roleState;
    }
    const p = await MCLOUD.getProfile().catch(() => null);
    if (!p || !p.role) {
      S.roleState = { mode: "unknown", role: null, verifiedAt: 0 };
      return S.roleState;
    }
    // if this IS the answer we already got from the server this session,
    // don't demote it to "cached" and start telling the rep they're offline
    const sameAnswer = S.roleState.mode === "server" &&
      S.roleState.verifiedAt === (p.roleVerifiedAt || 0);
    S.roleState = { mode: sameAnswer ? "server" : "cached", role: p.role,
      verifiedAt: p.roleVerifiedAt || 0 };
    return S.roleState;
  };

  /* The ONLY door a server role comes through. MCLOUD.fetchProfile calls
     this the moment it persists a profile row, so the cached record, its
     verification timestamp and the local user all move together — there is
     never a window where cloudProfile says one thing and users[] another. */
  S.applyServerRole = async function (role, verifiedAt, profileId) {
    if (!role) return S.roleState;
    const before = S.roleState.role;
    S.roleState = { mode: "server", role, verifiedAt: verifiedAt || Date.now() };
    // the role belongs to the PERSON the profile identifies. Writing it onto
    // whoever the device is currently displaying would hand one teammate
    // another's role the moment a device showed someone else's view.
    /* With a profile id the role goes to THAT person. The one exception is
       the very first bind: this device's person has no server identity yet,
       and the profile we just authenticated as is about to become theirs —
       so adopt it here rather than leave users[] a version behind. A person
       who already carries a DIFFERENT profileId is never touched, which is
       what stops one teammate's role landing on another. */
    let me = null;
    if (profileId) {
      me = S.users.find((u) => u.profileId === profileId) || null;
      if (!me) {
        const c = S.currentUser();
        if (c && !c.profileId) { c.profileId = profileId; me = c; }
      }
    } else {
      me = S.currentUser(); // local-only device: no profiles exist
    }
    if (me && (me.role !== role || me.profileId === profileId)) {
      me.role = role;
      await MDB.put("users", me).catch(() => {});
    }
    // a demotion has to strip privileged controls NOW, not next launch
    if (before !== role) {
      const go = (f) => { try { f(); } catch (_) {} };
      go(() => window.MAPP && MAPP.roleChanged && MAPP.roleChanged());
      go(() => window.MMAP && MMAP.refreshHoods && MMAP.refreshHoods());
      go(() => window.MHOME && MHOME.render());
    }
    return S.roleState;
  };

  // how the role reads to a human, including WHERE it came from — a device
  // running with no company account must never look server-authorized
  S.ROLE_LABELS = { rep: "Rep", leader: "Leader", manager: "Manager", owner: "Owner" };
  S.roleLine = function () {
    const st = S.roleState;
    const label = S.ROLE_LABELS[S.effectiveRole()] || "Rep";
    if (st.mode === "local") return "Local device only — roles here are not company-authorized";
    if (st.mode === "server") return label + " · confirmed with the office";
    if (st.mode === "cached") {
      const when = st.verifiedAt ? new Date(st.verifiedAt).toLocaleDateString() : "earlier";
      return label + " · offline, last confirmed " + when;
    }
    return "Rep · the office hasn't confirmed your role on this device yet";
  };

  // authenticated-but-unverified resolves to rep: fail closed
  S.effectiveRole = () => S.roleState.role || "rep";
  S.roleIsTrusted = () => S.roleState.mode === "server" || S.roleState.mode === "local";

  /* Mirrors db/migrations/0003_territory_authorization.sql. The SERVER is
     what actually stops a rep from writing a territory; this only decides
     whether showing the control would be a lie. Both sides are tested
     against db/capability-matrix.json so they cannot drift. */
  S.canManageTerritories = function (role) {
    return LEADERSHIP.indexOf(role === undefined ? S.effectiveRole() : role) >= 0;
  };

  // view scope, not authorization: does this person look at the whole
  // board or just their own turf? Same role set today, different question.
  S.seesWholeTeam = () => S.canManageTerritories();

  S.addUser = async function ({ name, role }) {
    const u = {
      id: MDB.uid(), name: name.trim(),
      // the server's vocabulary, verbatim — collapsing leader/owner into
      // "manager" is how a client matrix drifts from the RLS one
      role: ["rep", "leader", "manager", "owner"].indexOf(role) >= 0 ? role : "rep",
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
      if (window.MSYNC) MSYNC.queue("territories", t.id);
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
      pin.lastKnockAt = now; // notes and edits bump updatedAt; only a knock bumps this
    } else {
      pin = {
        id: MDB.uid(), lat, lng, address: "",
        disposition, reason: reason || null, dm: !!dm, note: note || "",
        history: [entry], createdAt: now, updatedAt: now, lastKnockAt: now,
      };
      S.pins.push(pin);
    }
    // a callback either gets a fresh time or is cleared by the new outcome
    pin.callbackAt = disposition === "goback" ? (callbackAt || pin.callbackAt || null) : null;
    const me = S.currentUser();
    // credit the knock to a LIVE territory: a stale id from a deleted or
    // split hood must not siphon this work into a ghost
    const liveTid = (() => {
      const t0 = pin.territoryId &&
        S.territories.find((t) => t.id === pin.territoryId && !t.archived);
      if (t0) return t0.id;
      const t1 = S.territories.find((t) => !t.archived && t.points && t.points.length >= 3 &&
        S.inHood(t, pin.lng, pin.lat));
      return t1 ? t1.id : null;
    })();
    if (pin.territoryId && liveTid !== pin.territoryId) pin.territoryId = liveTid;
    const ev = { id: MDB.uid(), ts: now, pinId: pin.id, disposition, reason: reason || null, dm: !!dm,
      repId: me ? me.id : null,
      territoryId: liveTid };
    S.events.push(ev);
    await MDB.put("pins", pin);
    await MDB.put("events", ev);
    if (window.MSYNC) { MSYNC.queue("pins", pin.id); MSYNC.queue("events", ev.id); }
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
    // "123 maple st" exists in every town in America, so the address tier
    // is scoped by zip (or city) — a bare street line only ever matches a
    // pin on the SAME street nearby, never one across the state.
    const streetOf = (addr) => MPROP.normAddr(String(addr || "").split(",")[0]);
    const scopeOf = (city, zip, addr) => {
      const tail = String(addr || "").split(",").slice(1).join(",");
      return String(zip || city || tail || "").trim().toLowerCase();
    };
    const addrKeys = (street, scope) => (street ? [scope ? street + "|" + scope : null, street] : [null, null]);
    const gridAdd = (p) => {
      const k = cell(p.lat, p.lng);
      const arr = grid.get(k);
      if (arr) arr.push(p); else grid.set(k, [p]);
    };
    const nearSameSpot = (p, prop) =>
      Math.abs(p.lat - prop.lat) < 0.00014 && Math.abs(p.lng - prop.lng) < 0.0002;
    const nearSameStreet = (p, prop) =>
      Math.abs(p.lat - prop.lat) < 0.005 && Math.abs(p.lng - prop.lng) < 0.007; // ~½ mile
    S.pins.forEach((p) => {
      if (p.prop && p.prop.externalId) byExt.set(p.prop.externalId, p);
      if (p.prop && p.prop.parcelId) byParcel.set(p.prop.parcelId, p);
      const g = p.geo || {};
      const [scoped, loose] = addrKeys(streetOf(p.address), scopeOf(g.city, g.zip, p.address));
      if (scoped) byAddr.set(scoped, p);
      if (loose && !byAddr.has(loose)) byAddr.set(loose, p);
      gridAdd(p);
    });
    return {
      match(prop) {
        if (prop.externalId && byExt.has(prop.externalId)) return byExt.get(prop.externalId);
        if (prop.parcelId && byParcel.has(prop.parcelId)) return byParcel.get(prop.parcelId);
        const street = streetOf(prop.address);
        const [scoped, loose] = addrKeys(street, scopeOf(prop.city, prop.zip, prop.address));
        if (scoped && byAddr.has(scoped)) return byAddr.get(scoped);
        if (loose && byAddr.has(loose)) {
          // an unscoped street-line match counts only when it's plausibly
          // the same physical street — cross-town twins fall through
          const p = byAddr.get(loose);
          if (nearSameStreet(p, prop)) return p;
        }
        // coordinate tier: ±2 cells fully covers the accept tolerance
        const cy = Math.round(prop.lat * 7000), cx = Math.round(prop.lng * 7000);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const arr = grid.get((cy + dy) + ":" + (cx + dx));
          if (!arr) continue;
          for (const p of arr) if (nearSameSpot(p, prop)) return p;
        }
        return null;
      },
      add(pin) {
        if (pin.prop && pin.prop.externalId) byExt.set(pin.prop.externalId, pin);
        if (pin.prop && pin.prop.parcelId) byParcel.set(pin.prop.parcelId, pin);
        const g = pin.geo || {};
        const [scoped, loose] = addrKeys(streetOf(pin.address), scopeOf(g.city, g.zip, pin.address));
        if (scoped) byAddr.set(scoped, pin);
        if (loose && !byAddr.has(loose)) byAddr.set(loose, pin);
        gridAdd(pin);
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
        if (window.MSYNC) MSYNC.queue("pins", pin.id);
        added++;
      } catch (_) { failed++; }
      if (onProgress && (i % 25 === 24 || i === props.length - 1)) onProgress(i + 1, props.length);
    }
    return { added, skipped, failed };
  };

  S.updatePin = async function (pin) {
    pin.updatedAt = Date.now();
    await MDB.put("pins", pin);
    if (window.MSYNC) MSYNC.queue("pins", pin.id);
    return pin;
  };

  S.deletePin = async function (id) {
    S.pins = S.pins.filter((p) => p.id !== id);
    S.events = S.events.filter((e) => e.pinId !== id);
    await MDB.del("pins", id);
    if (window.MSYNC) MSYNC.queueDelete("pins", id);
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
    if (window.MSYNC) MSYNC.queue("customers", cust.id);
    return cust;
  };

  S.updateCustomer = async function (cust) {
    cust.updatedAt = Date.now();
    // deleted out from under an open editor (a teammate's tombstone
    // synced in mid-edit): the save wins — an active edit beats a delete
    if (!S.customers.find((c) => c.id === cust.id)) S.customers.push(cust);
    await MDB.put("customers", cust);
    if (window.MSYNC) MSYNC.queue("customers", cust.id);
    return cust;
  };

  S.deleteCustomer = async function (id) {
    const c = S.customers.find((x) => x.id === id);
    S.customers = S.customers.filter((x) => x.id !== id);
    await MDB.del("customers", id);
    if (window.MSYNC) MSYNC.queueDelete("customers", id);
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
    t.updatedAt = Date.now(); // territories need a clock for sync LWW
    t.assignments = t.assignments || [];
    S.territories.push(t);
    await MDB.put("territories", t);
    if (window.MSYNC) MSYNC.queue("territories", t.id);
    return t;
  };
  S.updateTerritory = async function (t) {
    t.updatedAt = Date.now();
    await MDB.put("territories", t);
    if (window.MSYNC) MSYNC.queue("territories", t.id);
    return t;
  };
  S.deleteTerritory = async function (id) {
    S.territories = S.territories.filter((t) => t.id !== id);
    await MDB.del("territories", id);
    if (window.MSYNC) MSYNC.queueDelete("territories", id);
    // release the pins that pointed here — future knocks re-attribute by
    // whichever live polygon actually contains them
    const orphans = S.pins.filter((p) => p.territoryId === id);
    for (const p of orphans) {
      p.territoryId = null;
      await MDB.put("pins", p);
      if (window.MSYNC) MSYNC.queue("pins", p.id);
    }
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
    t.updatedAt = now;
    await MDB.put("territories", t);
    if (window.MSYNC) MSYNC.queue("territories", t.id);
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
    let doors = 0, knocked = 0, sold = 0, callbacks = 0, lastWorked = 0, imported = 0;
    const by = { unworked: 0, nothome: 0, goback: 0, notint: 0, sold: 0, dnk: 0 };
    S.pins.forEach((p) => {
      if (!S.inHood(t, p.lng, p.lat)) return;
      doors++;
      if (p.importedAt || p.prop) imported++;
      if (by[p.disposition] != null) by[p.disposition]++;
      if (p.history && p.history.length) {
        knocked++;
        // adding a note bumps updatedAt; only an actual knock counts as work
        const ts = p.lastKnockAt ||
          (p.history[p.history.length - 1] && p.history[p.history.length - 1].ts) || 0;
        if (ts > lastWorked) lastWorked = ts;
      }
      if (p.disposition === "sold") sold++;
      if (p.callbackAt) callbacks++;
    });
    // real imported inventory beats a manual estimate as the denominator —
    // and stays the denominator even once the last unworked door is worked,
    // so a finished territory keeps its 100% instead of losing the bar
    const homes = Math.max(Number(t.homes) || 0, imported ? doors : 0);
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

  /* ---------- attribution ----------
     Personal numbers are computed from the stable id stored ON the record
     (event.repId, customer.soldByUserId) and from nothing else — never a
     display name, never settings.repName, never "whoever this device is".
     Renaming a person moves no history.

     A record only counts toward an individual when its owner is bound to a
     server profile, because the profile id is the identity every device
     agrees on. An unbound owner is UNATTRIBUTED on every device including
     the one that authored the record — device-local attribution would make
     two phones compute two different histories from the same data. */
  S.isAttributed = function (userId) {
    if (!userId) return false;
    const u = S.userById(userId);
    if (!u) return false;
    // no cloud project = no profiles to bind to and only one device in
    // existence: the local user IS the stable identity
    if (!(window.MCLOUD && MCLOUD.enabled())) return true;
    return !!u.profileId;
  };

  /* Whose sale is this? The stable id, or nobody. A legacy record carrying
     only a soldBy NAME stays unattributed: names are mutable and were never
     unique, so a name that happens to match a current teammate today is not
     evidence of who signed the customer two seasons ago. */
  S.custIsMine = function (c) {
    const me = S.myId();
    return !!(me && c && c.soldByUserId === me && S.isAttributed(c.soldByUserId));
  };
  S.custIsAttributed = (c) => !!(c && S.isAttributed(c.soldByUserId));

  // the plain name for a printed document: resolve the stable id first,
  // fall back to whatever name the record was signed with
  S.custSoldByName = function (c) {
    if (!c) return "";
    const u = c.soldByUserId && S.userById(c.soldByUserId);
    return (u && u.name) || c.soldBy || "";
  };

  // display only — the historical name is shown, and shown as unverified
  S.custSoldByLabel = function (c) {
    if (!c) return "—";
    if (S.custIsAttributed(c)) {
      const u = S.userById(c.soldByUserId);
      if (u) return u.name;
    }
    // a name with no stable id is history we cannot verify — shown, and
    // shown as unverified, but it counts toward nobody's numbers
    return c.soldBy ? c.soldBy + " · legacy/unverified" : "";
  };

  // ---------- per-rep activity ----------
  S.repStats = function (userId, fromTs) {
    return S.statsFor(fromTs || 0, null, userId);
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

  /* repId undefined = the whole team's activity, unattributed history and
     all. repId given = only knocks provably that person's. */
  S.statsFor = function (fromTs, toTs, repId) {
    const mine = repId !== undefined && repId !== null;
    const ok = mine && S.isAttributed(repId);
    const evs = S.events.filter((e) =>
      e.ts >= fromTs && (!toTs || e.ts < toTs) &&
      (!mine || (ok && e.repId === repId)));
    const doors = evs.length;
    const convos = evs.filter(isContact).length;
    const dms = evs.filter((e) => e.dm).length;
    const sales = evs.filter((e) => e.disposition === "sold").length;
    return { doors, convos, dms, sales };
  };

  // knocks nobody can be proved to have made — surfaced, never reassigned
  S.unattributedDoors = function (fromTs, toTs) {
    return S.events.filter((e) =>
      e.ts >= (fromTs || 0) && (!toTs || e.ts < toTs) && !S.isAttributed(e.repId)).length;
  };

  // this device's own person, as a stable id (null when there isn't one)
  S.myId = () => { const me = S.currentUser(); return me ? me.id : null; };

  S.todayStats = function (repId) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return S.statsFor(d.getTime(), null, repId);
  };

  S.weekStart = function () {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const day = (d.getDay() + 6) % 7; // Monday start
    d.setDate(d.getDate() - day);
    return d.getTime();
  };

  S.weekStats = function (repId) {
    return S.statsFor(S.weekStart(), null, repId);
  };

  S.dayseries = function (nDays, repId) {
    const out = [];
    for (let i = nDays - 1; i >= 0; i--) {
      // setDate arithmetic is DST-safe where fixed 86400e3 steps are not
      const a = new Date(); a.setHours(0, 0, 0, 0); a.setDate(a.getDate() - i);
      const b = new Date(a); b.setDate(b.getDate() + 1);
      const s = S.statsFor(a.getTime(), b.getTime(), repId);
      out.push({ start: a.getTime(), ...s });
    }
    return out;
  };

  // Streak: consecutive days (ending today or yesterday) hitting the door goal.
  // a PERSONAL streak: only doors provably this device's person counts
  S.streak = function () {
    const goal = Math.max(1, S.settings.doorGoal | 0);
    const me = S.myId();
    const byDay = {};
    S.events.forEach((e) => {
      if (!me || e.repId !== me || !S.isAttributed(e.repId)) return;
      const k = MUI.dayKey(e.ts); byDay[k] = (byDay[k] || 0) + 1;
    });
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
