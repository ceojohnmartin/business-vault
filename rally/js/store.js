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
    /* before ANYTHING can read, export, back up or sync a customer — and the
       result is CONFIRMED, not assumed. A throw here must leave the app in
       the not-safe state rather than silently continuing. */
    try {
      await S.purgePaymentCredentials();
      await S.verifySanitation();
    } catch (e) {
      S.sanitation = { ok: false, checked: true, remaining: -1, stores: [],
        error: "sanitation failed: " + ((e && e.message) || e) };
    }
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

  /* ---------- sanitation is CONFIRMED, never assumed ----------
     A purge that threw, was killed mid-write, or could not open storage must
     not be mistaken for a clean device. So after purging, every object store
     is READ BACK and checked for a credential key, and the result is a fact
     the app can gate on.

     Every store is swept, not just customers, because "customers is clean"
     is not the same claim as "this device holds no credential":
       customers    the only store that ever held one by design
       pins         knock/door records
       events       the append-only knock log
       territories  polygons and assignment history
       users        people on this device
       outbox       sync queue — rows are {k,table,id,op,at}, never a payload
       kv           settings, cursors, the dead-letter, the cached profile
     The files store holds agreement blobs; the contract engine prints no card
     or bank digits at all (verified in js/contract.js), and its descriptors
     are metadata, so blob bytes are not scanned. */
  S.sanitation = { ok: false, checked: false, error: "", remaining: 0, stores: [] };

  S.verifySanitation = async function () {
    const SWEEP = ["customers", "pins", "events", "territories", "users", "outbox"];
    const state = { ok: false, checked: true, error: "", remaining: 0, stores: [] };
    try {
      for (const name of SWEEP) {
        const rows = await MDB.getAll(name);
        let hits = 0;
        for (const r of rows) if (S.stripPaymentCredentials(r)) hits++;
        // stripPaymentCredentials MUTATES, so anything it found is now gone
        // from memory; persist the repair rather than leave the two disagreeing
        if (hits) await MDB.bulkPut(name, rows).catch(() => {});
        state.remaining += hits;
        state.stores.push(name + ":" + rows.length);
      }
      const kv = await MDB.getAll("kv");
      const kvHit = kv.filter((r) => S.stripPaymentCredentials(r.v || {})).length;
      state.remaining += kvHit;
      state.stores.push("kv:" + kv.length);
      state.ok = state.remaining === 0;
      if (!state.ok) state.error = state.remaining + " record(s) still hold a payment credential";
    } catch (e) {
      state.ok = false;
      state.error = "storage unreadable: " + ((e && e.message) || e);
    }
    S.sanitation = state;
    return state;
  };

  // the gate every payment-touching surface asks before it will operate
  S.paymentSafe = () => S.sanitation.ok === true;

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
    /* Their hoods go back to the pool; history keeps the record. With
       several current reps on a hood, removing ONE leaves the others
       assigned — the whole point of the set model — so this closes only
       this person's open entry and recomputes the current set from what
       is left. */
    /* Through setAssignees, not a local edit plus a queue. Once the server
       owns the ledger an ordinary upsert cannot move it, so a local-only
       unassign would be undone by the very next pull and the deleted rep
       would reappear on their hoods. A failure here leaves the hood
       assigned, which is the safe direction: the person is gone from this
       device either way, and the turf stays visibly owned rather than
       silently orphaned. */
    for (const t of S.territories.slice()) {
      const cur = S.currentAssignees(t);
      if (cur.indexOf(id) < 0) continue;
      try { await S.setAssignees(t, cur.filter((x) => x !== id)); }
      catch (_) { /* reported by the caller's next render; never fatal here */ }
    }
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
    /* Credit the knock to the door's CANONICAL hood. One definition
       (S.hoodOf) now answers this for the knock log, the Route metrics and
       the Schedule alike — before v41 the knock log trusted any live
       stamp while the metrics used containment, so a polygon edit could
       leave a door counted in one hood and credited to another. */
    const live = S.hoodOf(pin);
    const liveTid = live ? live.id : null;
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
    /* matchTier says HOW a door was matched, because the tiers are not
       equally trustworthy: a provider's property key or a fully qualified
       address identifies a door; a parcel can hold several units; a bare
       street line or a ~30 m box only says "near". The sync merge records
       the tier so that only an identity-grade match can ever make one
       server row a proven second identity of a door (sync.js). */
    const matchTier = (prop) => {
      if (prop.externalId && byExt.has(prop.externalId)) return { pin: byExt.get(prop.externalId), tier: "ext" };
      if (prop.parcelId && byParcel.has(prop.parcelId)) return { pin: byParcel.get(prop.parcelId), tier: "parcel" };
      const street = streetOf(prop.address);
      const [scoped, loose] = addrKeys(street, scopeOf(prop.city, prop.zip, prop.address));
      if (scoped && byAddr.has(scoped)) return { pin: byAddr.get(scoped), tier: "addr" };
      if (loose && byAddr.has(loose)) {
        // an unscoped street-line match counts only when it's plausibly
        // the same physical street — cross-town twins fall through
        const p = byAddr.get(loose);
        if (nearSameStreet(p, prop)) return { pin: p, tier: "street" };
      }
      // coordinate tier: ±2 cells fully covers the accept tolerance
      const cy = Math.round(prop.lat * 7000), cx = Math.round(prop.lng * 7000);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const arr = grid.get((cy + dy) + ":" + (cx + dx));
        if (!arr) continue;
        for (const p of arr) if (nearSameSpot(p, prop)) return { pin: p, tier: "geo" };
      }
      return null;
    };
    return {
      matchTier,
      match(prop) { const m = matchTier(prop); return m ? m.pin : null; },
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

  /* ---------- deleting: one transaction, two possible outcomes ----------
     Removing a record and writing its tombstone into the outbox used to be
     two IndexedDB transactions, so a kill between them could leave the
     record gone and the tombstone gone — a deletion the team would never
     hear about, and one a later pull would quietly undo. Now they are ONE
     transaction (MDB.txn): on disk the record is either still there with no
     new tombstone, or gone with every tombstone we intended. Never half.

     Memory is updated first and the tombstones registered with the engine
     BEFORE the transaction opens, so a pull page landing in the gap can see
     the pending delete and refuse to re-insert the record; if the commit
     fails, all of it is rolled back and the failure is shown. */
  const showStorageFailure = (what) => {
    try { MUI.toast("Couldn't delete the " + what + " — storage error, nothing was changed"); } catch (_) {}
  };

  /* A logical door may have several SERVER identities: its own id and the
     rows other devices uploaded for the same door, merged in on pull. Only
     the PROVEN ones (`akaSure`, established by an identity-grade match — see
     sync.js) are retired with it. An alias that was only ever matched by
     proximity, or inherited without proof, is left alone on purpose: a false
     30 m merge must never be able to delete a neighbour's door. If such an
     alias later comes back as its own door, that is the accepted, recoverable
     failure — the destructive one is not. Never an id another live door here
     owns. */
  S.pinIdentities = function (pin) {
    const out = new Set([pin.id]);
    const taken = new Set();
    S.pins.forEach((p) => {
      if (p === pin) return;
      taken.add(p.id);
      (p.aka || []).forEach((a) => taken.add(a));
      (p.akaSure || []).forEach((a) => taken.add(a));
    });
    (pin.akaSure || []).forEach((a) => { if (a && !taken.has(a)) out.add(a); });
    return [...out];
  };

  S.deletePin = async function (id) {
    // captured BEFORE the delete: whether this row ever reached the server is
    // the only thing that later tells a refused tombstone from one for a row
    // the server never had
    const gone = S.pins.find((p) => p.id === id) || null;
    /* A do-not-knock door may not be erased by a rep. This guard is UX: it
       gives the rep a reason instead of a silent server correction. The
       AUTHORITY is the pins trigger, which neutralises the tombstone for a
       non-leadership caller whatever client sent it, plus the append-only
       events log, which no client can touch at all. */
    // dnkFromHistory reads ONE door's own history. isCurrentDnk would build
    // the whole door-facts index, which turns a lasso delete of 200 doors
    // into 200 full passes over every pin, event and customer.
    if (gone && S.dnkFromHistory(gone.history) !== null && !S.canManageTerritories()) {
      try {
        MUI.toast("This door is marked do-not-knock — a manager has to clear it first");
      } catch (_) {}
      return false;
    }
    const ids = gone ? S.pinIdentities(gone) : [id];
    const evs = S.events.filter((e) => e.pinId === id);
    const entries = window.MSYNC
      ? ids.map((x) => MSYNC.tombstoneEntry("pins", x, x === id ? gone : null, x !== id)).filter(Boolean)
      : [];
    S.pins = S.pins.filter((p) => p.id !== id);
    S.events = S.events.filter((e) => e.pinId !== id);
    if (window.MSYNC) MSYNC.register(entries);
    try {
      await MDB.txn(["pins", "events", "outbox"], (get) => {
        get("pins").delete(id);
        evs.forEach((e) => get("events").delete(e.id));
        entries.forEach((e) => get("outbox").put(e));
      });
    } catch (err) {
      if (gone) S.pins.push(gone);
      if (evs.length) { S.events.push(...evs); S.events.sort((a, b) => a.ts - b.ts); }
      if (window.MSYNC) MSYNC.unregister(entries);
      showStorageFailure("pin");
      return false;
    }
    if (window.MSYNC && entries.length) MSYNC.kick();
    // events on disk that memory did not know about — none expected
    try {
      const stale = (await MDB.getAll("events")).filter((e) => e.pinId === id);
      if (stale.length) await MDB.bulkDel("events", stale.map((e) => e.id));
    } catch (_) {}
    return true;
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
    const c = S.customers.find((x) => x.id === id) || null;
    const files = c && Array.isArray(c.files) ? c.files.filter((f) => f && f.id) : [];
    const entry = window.MSYNC ? MSYNC.tombstoneEntry("customers", id, c) : null;
    const entries = entry ? [entry] : [];
    S.customers = S.customers.filter((x) => x.id !== id);
    if (window.MSYNC) MSYNC.register(entries);
    try {
      // the customer's stored files (agreement snapshots, photos) go with it
      await MDB.txn(["customers", "files", "outbox"], (get) => {
        get("customers").delete(id);
        files.forEach((f) => get("files").delete(f.id));
        entries.forEach((e) => get("outbox").put(e));
      });
    } catch (err) {
      if (c) S.customers.push(c);
      if (window.MSYNC) MSYNC.unregister(entries);
      showStorageFailure("customer");
      return false;
    }
    if (window.MSYNC && entries.length) MSYNC.kick();
    return true;
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
    /* Assignment truth is a SET from the moment the hood exists. `entries`
       is the ledger; `assignments` and `assignedTo` below are the derived
       v40 mirrors, written by the same code that the server trigger
       mirrors, so an optimistic local hood is shaped exactly like one that
       came back from the server. */
    t.assignees = t.assignees || { entries: [] };
    t.assigneesRev = t.assigneesRev || 0;
    S.assigneeMirrors(t);
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
  /* Detaching doors is a consequence of a territory tombstone becoming a
     FACT — never of intending one. Local only, and never queued: every
     device does this for itself when it learns the territory is gone, which
     is exactly what applyTerritories already does for a tombstone that
     arrives from the server. Returns the changed pins; the caller persists. */
  S.releasePinsOf = function (territoryId) {
    const hit = S.pins.filter((p) => p.territoryId === territoryId);
    hit.forEach((p) => { p.territoryId = null; });
    return hit;
  };

  /* Deleting a territory writes exactly ONE server-visible row: its
     tombstone. It used to detach the territory's doors and queue those pins
     too — two independent server writes, one of them (pins) permitted to a
     rep and the other (territories) not. If authorization changed between
     the tap and the push, the pin half committed and the tombstone half was
     refused, leaving a live territory whose doors had all been detached: a
     partial commit across an authorization boundary, which no code path
     intended and no screen explained.

     Now the doors are not touched until the tombstone is a fact — on push
     success here, or on pull for every other device. A dangling territoryId
     in the meantime is already a tolerated state: addKnock re-homes a stale
     one to whichever live polygon actually contains the door. */
  S.deleteTerritory = async function (id) {
    const gone = S.territories.find((t) => t.id === id) || null;
    const entry = window.MSYNC ? MSYNC.tombstoneEntry("territories", id, gone) : null;
    const entries = entry ? [entry] : [];
    S.territories = S.territories.filter((t) => t.id !== id);
    // With no cloud project there is no server to refuse it, so the delete
    // IS the fact and the doors are released now — in the same commit.
    const released = (window.MCLOUD && MCLOUD.enabled()) ? [] : S.releasePinsOf(id);
    if (window.MSYNC) MSYNC.register(entries);
    try {
      await MDB.txn(["territories", "pins", "outbox"], (get) => {
        get("territories").delete(id);
        released.forEach((p) => get("pins").put(p));
        entries.forEach((e) => get("outbox").put(e));
      });
    } catch (err) {
      if (gone) S.territories.push(gone);
      released.forEach((p) => { p.territoryId = id; });
      if (window.MSYNC) MSYNC.unregister(entries);
      showStorageFailure("hood");
      return false;
    }
    if (window.MSYNC && entries.length) MSYNC.kick();
    return true;
  };

  /* Assignment is history, never an overwrite: a departing rep's run is
     closed out and the arriving one opened, so "who worked this hood when"
     survives forever. ONE hood may hold SEVERAL current reps, so the whole
     operation is expressed as a desired CURRENT SET and the diff against
     the open entries is what creates and closes history.

     Single-assignee callers keep working unchanged — this is that same
     operation with a one-element set. */
  S.assignTerritory = function (t, userId) {
    return S.setAssignees(t, userId ? [userId] : []);
  };

  /* A hood with several current reps takes the FIRST open assignee's colour.
     Deterministic (S.firstOpenAssignee orders by assignedAt then userId), so
     two devices paint the same hood the same colour, and the leader panel
     shows the full set beside it rather than hiding the others. */
  S.hoodColor = (t) => {
    const u = S.firstOpenAssignee(t) && S.userById(S.firstOpenAssignee(t));
    return u ? u.color : (t.color || "#8A93A6"); // unassigned = neutral
  };

  /* Ray-cast point-in-polygon on the hood's [lng,lat] ring. The algorithm
     lives in MGEOM so that membership, the overlap advisory and the server's
     own containment reasoning are all the same test — a door that counts as
     inside for the metrics must be inside for everything else too. */
  S.inHood = function (t, lng, lat) {
    return MGEOM.pointInRing((t && t.points) || [], lng, lat);
  };

  // Live territory numbers, straight from the pins inside the polygon.
  // "Knocked" means SOMEONE WENT TO THE DOOR (the pin has history) —
  // imported unworked inventory counts as doors, never as work done.
  S.hoodStats = function (t) {
    let doors = 0, knocked = 0, sold = 0, callbacks = 0, lastWorked = 0, imported = 0;
    const by = { unworked: 0, nothome: 0, goback: 0, notint: 0, sold: 0, dnk: 0 };
    S.pins.forEach((p) => {
      /* THE SAME membership answer Route uses. Bare containment and
         S.hoodOf disagree about a door whose stamp and polygon differ, so
         the hood sheet and the Route tab would report different door counts
         for the same hood — and both would look authoritative. */
      const hood = S.hoodOf(p);
      if (!hood || hood.id !== t.id) return;
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
  /* A hood nobody can be sent to work: archived, or set aside mid-split.
     A parent whose split has not committed yet is still a real record —
     it may still need to reach the server before the split can retire it —
     but it is not somewhere a rep knocks, and its children are already on
     the map beside it. Showing both would double-count every door. */
  S.isLive = (t) => !!t && !t.archived && !t.splitInto;
  S.activeTerritories = () => S.territories.filter(S.isLive);

  /* Hoods belonging to a user (rep mode, the manager panel, Route).
     ONE hood may have SEVERAL current reps, so this is a set membership
     test, never a scalar comparison — John and Jake both get the hood in
     their list, and removing Jake leaves John's list untouched. */
  S.hoodsOf = (userId) =>
    S.territories.filter((t) => S.isLive(t) && S.currentAssignees(t).indexOf(userId) >= 0);

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
  /* Smart Split is ONE decision, so it becomes ONE server fact.

     The geometry is unchanged — MGEO.splitPolygon still does the weighted
     balancing against the doors, and the children still come out named,
     sized and shaped exactly as before. What changed is the commit. This
     used to be N addTerritory() calls plus a deleteTerritory(), which is
     N+1 independent server writes that can each fail on their own: the
     reachable states included "children exist beside a live parent" (the
     hood covered twice) and "parent gone, half the children missing" (a
     hole in the map). Now the whole thing is one atomic command
     (db/migrations/0005_smart_split.sql), and until the server answers,
     this device holds a PROPOSAL — not a fact.

     Locally that proposal looks like the finished split, because that is
     what the manager asked for and what they will get if it commits: the
     children are on the map, the parent is set aside (splitInto), and
     nothing is queued as an independent territory write. If the server
     refuses, S.finishSplit() puts every bit of it back. */
  S.splitTerritory = async function (t, n) {
    const pins = S.pins
      .filter((p) => S.inHood(t, p.lng, p.lat))
      .map((p) => [p.lng, p.lat]);
    const { rings, shares } = MGEO.splitPolygon(t.points, n, pins);
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const operationId = MDB.uid();
    const now = Date.now();
    const kids = rings.map((ring, i) => ({
      id: MDB.uid(),
      name: `${t.name} ${letters[i] || i + 1}`,
      homes: t.homes ? Math.max(1, Math.round(t.homes * shares[i])) : null,
      points: ring,
      assignments: [],
      createdAt: now,
      updatedAt: now,
      pendingSplit: operationId,   // proposed, not yet a server fact
    }));
    S.territories.push(...kids);
    await MDB.bulkPut("territories", kids);
    /* The parent stays in the book. It is hidden from every place that
       hands out work (S.isLive), but it is still a real record, because a
       hood cut offline may itself never have reached the server — and the
       split cannot commit until its parent is there to be retired. */
    t.splitInto = operationId;
    t.updatedAt = now;
    await MDB.put("territories", t);
    /* Everything needed to undo this lives on the device, not in memory:
       a reload mid-flight, or a crash between send and response, still
       finds the proposal and the exact parent to restore. */
    const pend = (await MDB.kvGet("splitPending", null)) || {};
    pend[operationId] = { parentId: t.id, parent: JSON.parse(JSON.stringify(t)),
      childIds: kids.map((k) => k.id), at: now };
    delete pend[operationId].parent.splitInto;
    await MDB.kvSet("splitPending", pend);

    if (window.MCLOUD && MCLOUD.enabled()) {
      if (window.MSYNC) MSYNC.queueSplit(operationId, t.id);
    } else {
      // No cloud project, so there is no server to refuse it: the local act
      // IS the fact, exactly as it is for a territory delete.
      await S.finishSplit(operationId, true);
    }
    return kids;
  };

  /* The outcome of a proposed split, applied once and only once.

     committed: the parent is a server-side tombstone already, so it is
       simply gone from here too — no second write, no queued delete. The
       doors it held are re-homed into whichever child now contains them,
       which is a CONSEQUENCE of the split having happened, never a step
       towards making it happen. Every other device does the same when it
       pulls the children and the parent's tombstone.
     refused: the proposal is erased and the parent comes back exactly as
       it was. The manager sees the hood they started with, not a half
       split they have to work out for themselves. */
  S.finishSplit = async function (operationId, committed) {
    const pend = (await MDB.kvGet("splitPending", null)) || {};
    const rec = pend[operationId];
    if (!rec) return null;
    const kids = S.territories.filter((t) => t.pendingSplit === operationId);
    if (committed) {
      kids.forEach((k) => { delete k.pendingSplit; });
      if (kids.length) await MDB.bulkPut("territories", kids);
      S.territories = S.territories.filter((t) => t.id !== rec.parentId);
      await MDB.del("territories", rec.parentId).catch(() => {});
      const moved = S.rehomeInto(rec.parentId, kids);
      if (moved.length) {
        await MDB.bulkPut("pins", moved);
        // this device saw it first; the others re-home from the same
        // geometry when they pull, so only one of us needs to say so
        if (window.MSYNC) moved.forEach((p) => MSYNC.queue("pins", p.id));
      }
    } else {
      const ids = new Set(kids.map((k) => k.id));
      S.territories = S.territories.filter((t) => !ids.has(t.id));
      await MDB.bulkDel("territories", [...ids]).catch(() => {});
      const back = S.territories.find((t) => t.id === rec.parentId);
      if (back) {
        delete back.splitInto;
        await MDB.put("territories", back);
      }
      /* If the parent is no longer here, a TOMBSTONE for it arrived from the
         server while this proposal was in flight — someone else split or
         deleted the hood first. Putting it back would resurrect a territory
         the team has already retired, and this device would then push that
         resurrection at everyone. The proposal is dropped and the hood stays
         gone, which is what the server says is true. */
    }
    delete pend[operationId];
    await MDB.kvSet("splitPending", Object.keys(pend).length ? pend : null);
    return { committed, childIds: kids.map((k) => k.id) };
  };

  // every door the retired hood held moves to whichever child contains it;
  // a door in none of them is simply unhomed, the same as any orphan
  S.rehomeInto = function (parentId, kids) {
    const moved = [];
    S.pins.forEach((p) => {
      if (p.territoryId !== parentId) return;
      const home = kids.find((k) => S.inHood(k, p.lng, p.lat));
      p.territoryId = home ? home.id : null;
      p.updatedAt = Date.now();
      moved.push(p);
    });
    return moved;
  };

  // proposals this device is still waiting on, for the UI and for boot
  S.pendingSplits = async () => (await MDB.kvGet("splitPending", null)) || {};

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

  /* ==================================================================
     V41 — TURF OPERATIONS
     ==================================================================

     Three ideas live here, and each has exactly one definition so that no
     two screens can disagree about the same hood:

       1. ASSIGNMENT IS A SET.  One hood may have several current reps.
          `t.assignees.entries` is the ledger; `t.assignments` and
          `t.assignedTo` are derived v40 mirrors written by the same rule
          the server trigger uses.
       2. MEMBERSHIP IS CANONICAL.  S.hoodOf answers "which hood is this
          door in?" for the knock log, the metrics and the Schedule alike.
       3. A CYCLE IS A BOUNDARY, NOT AN EDIT.  Clear Outcomes moves one
          monotonic timestamp. It never touches a pin, a knock, a note, a
          customer or an assignment.

     None of this is authority. The server owns assignment history, DNK and
     overlap; these functions render the same answers offline and let a
     leader see what a mutation will do before the server confirms it.  */

  // ---------- assignment: the entry ledger ----------

  /* The entries for a hood, in canonical order. A hood that has never been
     through the v41 migration has only the v40 mirrors, so those are read
     back into entry shape — the SAME reconstruction the server backfill
     performs, which is what lets a client and a server that have not yet
     met agree about who is assigned. */
  S.assigneeEntries = function (t) {
    if (!t) return [];
    const src = t.assignees && Array.isArray(t.assignees.entries)
      ? t.assignees.entries
      : legacyEntries(t);
    return src.slice().sort(cmpEntry);
  };

  function legacyEntries(t) {
    const list = Array.isArray(t.assignments) ? t.assignments.filter(Boolean) : [];
    /* v40 wrote a display NAME into assignedBy. Read straight through, the
       mirror rebuild would look for a user whose id is that name, find
       nobody, and blank it — losing who made every historical assignment on
       the first render. Move it to assignedByName, exactly as the server's
       rally_legacy_to_entries does. */
    if (list.length) return list.map((a) => {
      const uuidish = /^[0-9a-fA-F-]{36}$/.test(String(a.assignedBy || ""));
      return Object.assign({}, a, {
        assignedBy: uuidish ? a.assignedBy : null,
        assignedByName: a.assignedByName || (uuidish ? "" : (a.assignedBy || "")),
      });
    });
    // the oldest shape of all: a scalar assignee and no history at all
    if (t.assignedTo) {
      return [{ userId: t.assignedTo, name: "", assignedBy: null,
        assignedAt: t.createdAt || 0, unassignedAt: null, synthesizedFrom: "assignedTo" }];
    }
    return [];
  }

  /* Total order: assignedAt, then userId. The tiebreak is not decoration —
     two reps assigned by ONE action share a millisecond, and without it
     `assignedTo` (the first open entry) would differ between devices and
     the v40 mirror would flap on every sync. */
  function cmpEntry(a, b) {
    const ta = a.assignedAt || 0, tb = b.assignedAt || 0;
    if (ta !== tb) return ta - tb;
    return String(a.userId || "").localeCompare(String(b.userId || ""));
  }

  const isOpen = (e) => !!e && (e.unassignedAt === null || e.unassignedAt === undefined);

  // the current reps, deduplicated, in canonical order
  S.currentAssignees = function (t) {
    const out = [];
    S.assigneeEntries(t).forEach((e) => {
      if (isOpen(e) && e.userId && out.indexOf(e.userId) < 0) out.push(e.userId);
    });
    return out;
  };

  S.firstOpenAssignee = (t) => S.currentAssignees(t)[0] || null;

  S.assigneeHistory = function (t) {
    return S.assigneeEntries(t).map((e) => Object.assign({}, e, {
      name: e.name || (S.userById(e.userId) || {}).name || "",
      open: isOpen(e),
    }));
  };

  /* Recompute the two v40 mirrors from the ledger. This is the client half
     of the same rule the server's assignment trigger applies, so a hood
     edited offline is byte-shaped like one the server just corrected and
     the echo compares equal instead of fighting. */
  S.assigneeMirrors = function (t) {
    const entries = S.assigneeEntries(t);
    t.assignees = { entries };
    t.assignedTo = S.firstOpenAssignee(t);
    t.assignments = entries.map((e) => ({
      userId: e.userId,
      name: e.name || (S.userById(e.userId) || {}).name || "",
      // v40 renders assignedBy as a NAME. Handing it a UUID would put a
      // raw id in the history UI of every phone that has not upgraded.
      assignedBy: e.assignedByName || (S.userById(e.assignedBy) || {}).name || "",
      assignedAt: e.assignedAt || 0,
      unassignedAt: isOpen(e) ? null : e.unassignedAt,
    }));
    return t;
  };

  /* Diff the desired current set against the open entries and write the
     difference as history. Purely local — it produces exactly what the
     server's set_territory_assignments would, so the optimistic view and
     the confirmed one match.

     Never deletes or reopens an entry: the only transition it can make is
     open -> closed, plus appending new open entries. */
  S.applyAssigneeSet = function (t, userIds, opts) {
    const o = opts || {};
    const now = o.at || Date.now();
    const want = [];
    (userIds || []).forEach((id) => { if (id && want.indexOf(id) < 0) want.push(id); });
    const entries = S.assigneeEntries(t).map((e) => Object.assign({}, e));
    const by = (S.currentUser() || {});
    let changed = false;

    entries.forEach((e) => {
      if (isOpen(e) && want.indexOf(e.userId) < 0) { e.unassignedAt = now; changed = true; }
    });
    const stillOpen = entries.filter(isOpen).map((e) => e.userId);
    want.forEach((id) => {
      if (stillOpen.indexOf(id) >= 0) return; // already current: not a second entry
      const u = S.userById(id);
      entries.push({
        userId: id,
        name: u ? u.name : "",
        assignedBy: by.id || null,
        assignedByName: by.name || "",
        assignedAt: now,
        unassignedAt: null,
      });
      changed = true;
    });
    if (!changed && !o.force) return false;
    t.assignees = { entries: entries.sort(cmpEntry) };
    S.assigneeMirrors(t);
    t.updatedAt = now;
    return true;
  };

  /* Write a new CURRENT SET.

     Once the office has activated server authority the ledger is not ours
     to move: an ordinary upsert carrying data.assignments is ignored by
     design, so the change has to go through the RPC or it would look saved
     and silently not be. The client states WHO SHOULD BE ASSIGNED; the
     server owns every timestamp, every open/closed transition and the
     history that results.

     Applied locally FIRST so the screen responds at once, and rolled back
     if the server refuses — a leader must never be shown an assignment the
     team does not have. Before activation (and with no cloud at all) the
     ordinary outbox path is still the truth, exactly as in v40. */
  S.setAssignees = async function (t, userIds) {
    /* Snapshot the RECONSTRUCTED ledger, not the raw field. A hood that has
       never been through the v41 migration has no `assignees` at all — its
       assignment lives in the v40 mirrors — so rolling back to
       `t.assignees || {entries:[]}` would roll back to EMPTY and wipe the
       assignment the hood actually had. The clock goes with it: leaving
       updatedAt advanced after a failed save would make this device win the
       next merge with a change it never made. */
    const before = { entries: S.assigneeEntries(t).map((e) => Object.assign({}, e)) };
    const beforeRev = t.assigneesRev || 0;
    const beforeAt = t.updatedAt;
    const restore = () => {
      t.assignees = before; t.assigneesRev = beforeRev; t.updatedAt = beforeAt;
      S.assigneeMirrors(t);
    };
    if (!S.applyAssigneeSet(t, userIds)) return t;

    const authoritative = !!(window.MSYNC && MSYNC.capability &&
      MSYNC.capability("assignmentServerAuthoritative"));
    const cloud = !!(window.MCLOUD && MCLOUD.enabled());

    if (authoritative && cloud) {
      // the wire speaks profile uuids; a rep with no server identity yet
      // cannot be given turf, and saying so beats a silent partial save
      const profiles = [];
      for (const id of userIds || []) {
        const pid = MSYNC.profileOf ? MSYNC.profileOf(id) : null;
        if (!pid) {
          restore();
          throw new Error("that rep has no account yet — they can't be given turf");
        }
        profiles.push(pid);
      }
      try {
        const res = await rpc("set_territory_assignments", {
          p_territory_id: t.id, p_assignees: profiles, p_operation_id: MDB.uid(),
        });
        if (res && typeof res.assignees_rev === "number") t.assigneesRev = res.assignees_rev;
      } catch (err) {
        restore();
        await MDB.put("territories", t).catch(() => {});
        throw err;
      }
      await MDB.put("territories", t);
      return t;
    }

    await MDB.put("territories", t);
    if (window.MSYNC) MSYNC.queue("territories", t.id);
    return t;
  };

  // ---------- canonical hood membership ----------

  S.hoodContains = function (t, pin) {
    return !!(t && t.points && t.points.length >= 3 && pin &&
      typeof pin.lng === "number" && typeof pin.lat === "number" &&
      S.inHood(t, pin.lng, pin.lat));
  };

  /* THE definition of which hood a door belongs to.

     A stamped id is trusted only while it names a live hood that still
     CONTAINS the door: v41 lets a leader move a boundary, so a stamp can
     go stale geometrically as well as by deletion, and a door left behind
     by an edit must follow the polygon rather than keep crediting work to
     a hood it no longer sits in.

     When no live polygon contains the door, a live stamp still beats
     nothing — a door just outside its hood through GPS drift keeps its
     home instead of becoming an orphan that flickers between hoods. */
  S.hoodOf = function (pin) {
    if (!pin) return null;
    const stamped = pin.territoryId
      ? S.territories.find((t) => t.id === pin.territoryId && S.isLive(t)) : null;
    if (stamped && S.hoodContains(stamped, pin)) return stamped;
    const found = S.territories.find((t) => S.isLive(t) && S.hoodContains(t, pin));
    return found || stamped || null;
  };

  // ---------- door facts: one pass, then O(1) per door ----------

  /* Everything the cycle rules need about a door, indexed by pin id.
     Built in one pass over events and customers so a 1,200-door hood costs
     one traversal rather than a scan per door.

     `dnkAt` and `soldAt` come from the EVENT log first and fall back to the
     pin's own history: events are append-only on the server and cannot be
     edited or deleted by any client, so where both exist the event wins. */
  S.doorFacts = function () {
    const facts = new Map();
    const get = (id) => {
      let f = facts.get(id);
      if (!f) {
        f = { dnkAt: null, dnkClearedAt: null, soldAt: null, lastKnockAt: null,
          knockTs: [], nhTs: [], cust: null };
        facts.set(id, f);
      }
      return f;
    };
    const note = (f, disposition, ts) => {
      if (!ts) return;
      if (disposition === "dnk_clear") {
        if (f.dnkClearedAt === null || ts > f.dnkClearedAt) f.dnkClearedAt = ts;
        return; // a clear is not a knock
      }
      f.knockTs.push(ts);
      if (f.lastKnockAt === null || ts > f.lastKnockAt) f.lastKnockAt = ts;
      if (disposition === "dnk" && (f.dnkAt === null || ts > f.dnkAt)) f.dnkAt = ts;
      if (disposition === "sold" && (f.soldAt === null || ts > f.soldAt)) f.soldAt = ts;
      if (disposition === "nothome") f.nhTs.push(ts);
    };
    /* A knock exists TWICE by design — once in the door's history and once
       in the append-only event log — so the two sources are unioned on
       (door, ts, disposition) rather than concatenated. Counting a knock
       twice would double every not-home depth and every worked total. */
    const seen = new Set();
    const once = (id, disposition, ts) => {
      const k = id + "|" + ts + "|" + disposition;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    };
    S.pins.forEach((p) => {
      const f = get(p.id);
      (p.history || []).forEach((h) => {
        if (once(p.id, h.disposition, h.ts)) note(f, h.disposition, h.ts);
      });
    });
    const alias = new Map();
    S.pins.forEach((p) => (p.aka || []).forEach((a) => alias.set(a, p.id)));
    S.events.forEach((e) => {
      const id = facts.has(e.pinId) ? e.pinId : (alias.get(e.pinId) || e.pinId);
      if (!facts.has(id)) return; // an event whose door is gone
      if (!once(id, e.disposition, e.ts)) return;
      note(get(id), e.disposition, e.ts);
    });
    facts.forEach((f) => {
      f.knockTs.sort((a, b) => a - b);
      f.nhTs.sort((a, b) => a - b);
    });
    S.customers.forEach((c) => {
      if (!c || !c.pinId) return;
      const f = facts.get(c.pinId);
      if (!f) return;
      // the most recently signed linked customer represents the door
      const at = S.custSignedAt(c);
      if (!f.cust || (at || 0) > (S.custSignedAt(f.cust) || 0)) f.cust = c;
    });
    return facts;
  };

  const factFor = (facts, pin) =>
    (facts && facts.get(pin.id)) ||
    { dnkAt: null, dnkClearedAt: null, soldAt: null, lastKnockAt: null,
      knockTs: [], nhTs: [], cust: null };

  /* A door is CURRENTLY do-not-knock when it carries a dnk that no explicit
     leadership clear has superseded. `pin.disposition === 'dnk'` alone is
     not enough: a later ordinary knock overwrites the scalar while the
     do-not-knock fact stands, and no ordinary edit — by anyone, of any
     role — may clear black. Only clear_pin_dnk writes a dnk_clear. */
  /* Sentinel for "this fact is true but we cannot date it" — a door whose
     scalar says dnk but whose knock that set it never reached this device.
     Real clocks are ms since 1970 and always vastly greater, so 0 can never
     be mistaken for a genuine timestamp. UNKNOWN is deliberately NOT the
     same as absent: an undateable do-not-knock is still a do-not-knock. */
  S.TS_UNKNOWN = 0;

  S.dnkAtOf = function (pin, facts) {
    const f = factFor(facts || S.doorFacts(), pin);
    const raw = f.dnkAt !== null ? f.dnkAt
      : (pin.disposition === "dnk" ? S.TS_UNKNOWN : null);
    if (raw === null) return null;
    if (f.dnkClearedAt !== null && f.dnkClearedAt >= raw) return null;
    return raw;
  };

  S.isCurrentDnk = function (pin, facts) {
    return !!pin && S.dnkAtOf(pin, facts) !== null;
  };

  /* The same verdict from ONE door's history alone, with no index to build.
     The sync engine calls this once per delivered row, where walking every
     event for every row would be quadratic. It works because a dnk_clear is
     written into the door's history as well as the event log, exactly like
     a knock — so the history union that already carries knocks across
     devices carries the clear too. */
  S.dnkFromHistory = function (history) {
    let dnkAt = null, clearedAt = null;
    (history || []).forEach((h) => {
      if (!h) return;
      if (h.disposition === "dnk") { if (dnkAt === null || h.ts > dnkAt) dnkAt = h.ts; }
      else if (h.disposition === "dnk_clear") {
        if (clearedAt === null || h.ts > clearedAt) clearedAt = h.ts;
      }
    });
    if (dnkAt === null) return null;
    if (clearedAt !== null && clearedAt >= dnkAt) return null;
    return dnkAt;
  };

  // an active or frozen linked customer — a signed household, not a prospect
  S.activeCustomerOf = function (pin, facts) {
    const c = factFor(facts || S.doorFacts(), pin).cust;
    if (!c) return null;
    const acct = c.acct || "active";
    return acct === "canceled" ? null : c;
  };

  // ---------- the cycle boundary ----------

  /* null means FIRST CYCLE — conceptually -infinity, i.e. all history is in
     the window. It does NOT mean "since the hood was created": a Smart
     Split child is created long after the knocks on the doors it inherits,
     so anchoring at createdAt would show a fully-worked child as 0%. */
  S.cycleStart = (t) => (t && t.cycleStartedAt) || null;
  const inWindow = (ts, C) => ts !== null && ts !== undefined && (C === null || ts >= C);
  const beforeWindow = (ts, C) => C !== null && ts !== null && ts !== undefined && ts < C;

  /* What colour a door should read on the map for this hood's current
     cycle. Clear Outcomes writes NO pins, so the reset is expressed here:
     everything worked before the boundary reads unworked again, while the
     two facts that outlive a cycle keep their colour.

       BLACK  do-not-knock — never cleared by a boundary
       GREEN  a signed, non-cancelled household — still their customer
       else   the last outcome AT OR AFTER the boundary, or unworked */
  // the six things that can happen AT a door — the only values any screen
  // may paint, and the only ones the map has an image for
  const OUTCOMES = { unworked: 1, nothome: 1, goback: 1, notint: 1, sold: 1, dnk: 1 };

  S.effectiveDisposition = function (pin, t, facts) {
    const f = facts || S.doorFacts();
    if (S.isCurrentDnk(pin, f)) return "dnk";
    if (S.activeCustomerOf(pin, f)) return "sold";
    const C = S.cycleStart(t || S.hoodOf(pin));
    if (C === null) return OUTCOMES[pin.disposition] ? pin.disposition : "unworked";
    let best = null;
    (pin.history || []).forEach((h) => {
      /* Only real OUTCOMES. A dnk_clear is a record of an administrative
         act, not something that happened at the door — and returning it
         here would ask the map for a pin image that does not exist, which
         renders as nothing at all: the door would silently vanish. */
      if (!OUTCOMES[h.disposition]) return;
      if (h.ts >= C && (!best || h.ts >= best.ts)) best = h;
    });
    return best ? best.disposition : "unworked";
  };

  /* Not-home depth for the CURRENT cycle: 1 -> yellow, 2 -> darker,
     3+ -> near orange. Counted from post-boundary knocks only, so a fresh
     cycle starts every door back at zero without touching a single pin. */
  S.nhDepth = function (pin, t, facts) {
    const f = factFor(facts || S.doorFacts(), pin);
    const C = S.cycleStart(t || S.hoodOf(pin));
    let n = 0;
    f.nhTs.forEach((ts) => { if (C === null || ts >= C) n++; });
    return n;
  };

  // ---------- Route metrics ----------

  /* Disjoint sets, computed once per door. Every inventory door lands in
     exactly one of PRIOR_NON_PROSPECT / WORKED / REMAINING, so
     WORKED + REMAINING = ACTIONABLE is an identity rather than an
     arithmetic hope — nothing is ever subtracted twice because nothing is
     subtracted at all.

     EVIDENCE RULES. A signed household and a do-not-knock door must never
     appear as remaining prospect turf, and that has to hold when the
     timestamp evidence is missing. So an UNKNOWN signedAt or dnkAt is
     treated as PRIOR: the door leaves the denominator conservatively
     instead of being offered to a rep to knock. Incomplete evidence can
     cost a door its place in the percentage; it can never turn a customer
     back into a prospect.

     FIRST CYCLE (C = null): nothing is "before" the window, so a customer
     or a do-not-knock with a KNOWN timestamp counts as worked — the work
     that produced it really did happen inside the window. */
  /* Doors grouped by their canonical hood, computed ONCE and cached on the
     facts object the caller is already sharing. Without it every hood
     re-scans every door, which is O(hoods x doors) — invisible on twenty
     hoods and a visible hitch on a book with a hundred. */
  /* Which hood each door belongs to, resolved ONCE and cached on the shared
     facts object. Asking S.hoodOf per door costs a ray cast against every
     live hood — fine once, and a real hitch when the map repaints every
     pin and the Route block recomputes every hood on the same tick. */
  S.hoodIndex = function (facts) {
    const f = facts || S.doorFacts();
    if (f.__hoodOf) return f.__hoodOf;
    const by = new Map();
    S.pins.forEach((pin) => { by.set(pin.id, S.hoodOf(pin)); });
    try { Object.defineProperty(f, "__hoodOf", { value: by, enumerable: false }); }
    catch (_) { f.__hoodOf = by; }
    return by;
  };

  function doorsByHood(f) {
    if (f.__byHood) return f.__byHood;
    const by = new Map();
    const idx = S.hoodIndex(f);
    S.pins.forEach((pin) => {
      const hood = idx.get(pin.id);
      if (!hood) return;
      let arr = by.get(hood.id);
      if (!arr) { arr = []; by.set(hood.id, arr); }
      arr.push(pin);
    });
    try { Object.defineProperty(f, "__byHood", { value: by, enumerable: false }); }
    catch (_) { f.__byHood = by; }
    return by;
  }

  S.routeMetrics = function (t, facts) {
    const f = facts || S.doorFacts();
    const C = S.cycleStart(t);
    const m = {
      inventory: 0, actionable: 0, worked: 0, remaining: 0, pct: null,
      priorCustomers: 0, priorDnk: 0, priorUnknown: 0,
      salesThisCycle: 0, salesUnknown: 0, dnkThisCycle: 0,
      callbacks: 0, lastWorked: null, cycleStartedAt: C,
    };
    (doorsByHood(f).get(t.id) || []).forEach((pin) => {
      m.inventory++;
      const fact = factFor(f, pin);
      const dnkAt = S.dnkAtOf(pin, f);
      const cust = S.activeCustomerOf(pin, f);
      const signedAt = cust ? S.custSignedAt(cust) : null;

      /* SALES ANALYTICS FIRST, and for EVERY inventory door — including the
         ones the prospect arithmetic is about to exclude. Counting sales
         inside the actionable branch would let a customer with an
         undateable signature disappear from the sales figure as well as
         from the denominator, which is exactly the corruption these two
         numbers are kept apart to prevent. */
      if (inWindow(fact.soldAt, C)) m.salesThisCycle++;
      else if (cust && inWindow(signedAt, C)) m.salesUnknown++;

      // --- PRIOR NON-PROSPECT: out of the denominator entirely ---
      const custPrior = !!cust && (signedAt === null || beforeWindow(signedAt, C));
      const dnkPrior = dnkAt !== null && (dnkAt === S.TS_UNKNOWN || beforeWindow(dnkAt, C));
      if (custPrior || dnkPrior) {
        if (custPrior) m.priorCustomers++;
        else m.priorDnk++;
        if ((custPrior && signedAt === null) || (dnkPrior && dnkAt === S.TS_UNKNOWN)) m.priorUnknown++;
        return;
      }

      // --- ACTIONABLE: worked this cycle, or still to do ---
      m.actionable++;
      if (pin.callbackAt) m.callbacks++;
      const knocked = fact.knockTs.some((ts) => inWindow(ts, C));
      const soldNow = !!cust && inWindow(signedAt, C);
      const dnkNow = dnkAt !== null && dnkAt !== S.TS_UNKNOWN && inWindow(dnkAt, C);
      if (knocked || soldNow || dnkNow) {
        m.worked++;
        if (fact.lastKnockAt !== null &&
            (m.lastWorked === null || fact.lastKnockAt > m.lastWorked)) {
          m.lastWorked = fact.lastKnockAt;
        }
      } else {
        m.remaining++;
      }
      if (dnkNow) m.dnkThisCycle++;
    });
    m.pct = m.actionable > 0 ? Math.round((m.worked / m.actionable) * 100) : null;
    return m;
  };

  // ---------- capability gate for leadership turf work ----------

  /* Leadership turf management may require connectivity, and on a v41
     client it does. Until this device has SEEN the server say assignment
     authority is live, a new turf mutation made offline would be written
     under legacy rules with nothing able to correct it — so it is refused
     with a reason instead. Rep field work is untouched and stays fully
     offline-first: knocks, notes, callbacks, outcomes and customers never
     ask this question. */
  S.turfGate = function (opts) {
    const o = opts || {};
    if (!S.canManageTerritories()) {
      return { ok: false, code: "role", reason: "Turf is managed by a leader or manager." };
    }
    const cloud = !!(window.MCLOUD && MCLOUD.enabled());
    if (!cloud) return { ok: true, code: "solo" }; // no team server: nothing to disagree with
    const offline = navigator.onLine === false;
    /* Some operations ARE a server call — starting a cycle, clearing a
       do-not-knock, moving the assignment ledger. Being latched does not
       make those possible offline; it only means the device knows who owns
       the answer. So they refuse rather than pretend. */
    if (o.needsServer && offline) {
      return { ok: false, code: "offline",
        reason: "Connect to manage turf — this change is confirmed by the server." };
    }
    if (window.MSYNC && MSYNC.capability && MSYNC.capability("assignmentServerAuthoritative")) {
      return { ok: true, code: "authoritative" };
    }
    if (offline) {
      return { ok: false, code: "offline",
        reason: "Connect to manage turf — turf changes are confirmed by the server." };
    }
    return { ok: true, code: "online" };
  };

  /* ---------- the two server-confirmed turf operations ----------

     Both go through an RPC whenever there is a team server, because both
     are decisions the server records and no client may author. With no
     cloud configured at all there is nobody to ask, so the device is the
     record and they apply locally. */

  const rpc = async (name, body) => {
    const r = await MCLOUD.api("/rest/v1/rpc/" + name, { method: "POST", body });
    if (!r || !r.ok) {
      const msg = (r && r.data && (r.data.message || r.data.hint)) || ("rpc " + name + " failed");
      throw new Error(msg);
    }
    return r.data;
  };

  /* CLEAR OUTCOMES — move one monotonic boundary. Writes no pins: every
     door that appears to reset is derived from this timestamp at read
     time. Instant on a hood of any size, and nothing it does can be lost. */
  S.startCycle = async function (t, at) {
    const when = at || Date.now();
    if (window.MCLOUD && MCLOUD.enabled()) {
      const res = await rpc("start_territory_cycle", {
        p_territory_id: t.id,
        p_at: new Date(when).toISOString(),
        p_operation_id: MDB.uid(),
      });
      const server = res && res.cycle_started_at ? Date.parse(res.cycle_started_at) : when;
      // MONOTONE: the server refuses a backwards boundary, so its answer is
      // never older than ours — but take the max anyway rather than trust it
      t.cycleStartedAt = Math.max(t.cycleStartedAt || 0, server);
    } else {
      t.cycleStartedAt = Math.max(t.cycleStartedAt || 0, when);
    }
    await MDB.put("territories", t);
    return t;
  };

  /* CLEAR A DO-NOT-KNOCK — the ONLY route that clears black. The server
     writes an indelible event; here the same clear is appended to the
     door's history so the ordinary history union carries it to every other
     device, including one too old to know what a dnk_clear is. */
  S.clearPinDnk = async function (pin, reason) {
    const now = Date.now();
    const opId = MDB.uid();
    if (window.MCLOUD && MCLOUD.enabled()) {
      await rpc("clear_pin_dnk", {
        p_pin_id: pin.id, p_reason: reason, p_operation_id: opId,
      });
    }
    const entry = { ts: now, disposition: "dnk_clear", reason, dm: false, note: "" };
    pin.history = (pin.history || []).concat([entry]);
    pin.disposition = "unworked";
    pin.updatedAt = now;
    /* The SAME id the server's own clear event carries. The server refuses
       a client-written dnk_clear (0013) precisely so a forged one cannot
       clear a door — and because this copy shares the server's id, its push
       is an ordinary ignore-duplicate no-op rather than something lost. */
    const ev = { id: "dnkclear-" + opId, ts: now, pinId: pin.id, disposition: "dnk_clear",
      reason, dm: false, repId: (S.currentUser() || {}).id || null,
      territoryId: (S.hoodOf(pin) || {}).id || null };
    S.events.push(ev);
    await MDB.put("pins", pin);
    await MDB.put("events", ev);
    if (window.MSYNC) { MSYNC.queue("pins", pin.id); MSYNC.queue("events", ev.id); }
    return pin;
  };

  window.STORE = S;
})();
