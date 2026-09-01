/* RALLY — the sync engine (Phase 2). Local-first stays law: every write
   lands in IndexedDB before this file hears about it, and the app never
   waits on the network. What this adds is convergence — each device pushes
   its changes to the team's Supabase project and pulls everyone else's,
   until every phone holds the same book.

   The moving parts:
   - OUTBOX ("outbox" store): store.js mutators call MSYNC.queue()/
     queueDelete() after each durable write. One tiny row per changed
     record ("table:id"); payloads are built fresh at push time from the
     live record, so rapid edits coalesce into one upload.
   - PUSH: batched PostgREST upserts. Mutable tables use
     resolution=merge-duplicates; the knock log is APPEND-ONLY on the
     server (no UPDATE grant — Postgres rejects ON CONFLICT DO UPDATE at
     plan time without it), so events go with resolution=ignore-duplicates.
     Deletes travel as targeted PATCHes stamping deleted_at (tombstones) —
     never row deletion, and never a column-clobbering upsert.
   - PULL: per-table cursor on the server's updated_at clock (created_at
     for events), paged in order. Pins land before events on both sides of
     the wire, so an event's door always precedes it.
   - MERGE: a record dirty in the outbox is skipped on pull — the local
     edit wins here and overwrites the server on the next push (record-
     level last-write-wins). Events only ever insert. Tombstones replay
     the same cascades the local delete ran. Remote pins that match a
     local door through the 4-tier import index merge instead of
     duplicating, and the remote id is kept as an alias so that door's
     events still find it.
   - IDENTITY: profile UUIDs are the wire format for people. Each device
     keeps a private map profileId -> local users-store id, auto-creating
     a local user per teammate, so assignments, lanes and leaderboards
     line up without the users store itself ever syncing.

   Deliberately NOT synced: users (mirrored from profiles instead), file
   blobs (a later phase brings Storage), settings/kv (device-local, and
   they hold API keys), and full payment data — payment is cut to
   {method,last4,autopay,billingAddress} before it ever leaves the phone,
   and the server trigger enforces the same cut again. */
(function () {
  const TABLES = ["pins", "events", "territories", "customers"];
  const K_CURSORS = "syncCursors";     // { table: iso }
  const K_USERMAP = "syncUserMap";     // { profileId: localUserId }
  const K_BACKFILL = "syncBackfilled"; // one-time whole-book enqueue done
  const K_LAST = "syncLastAt";         // last fully-clean cycle, ms
  const PUSH_BATCH = 200;
  const PULL_PAGE = 500;
  const EPOCH = "1970-01-01T00:00:00+00:00";
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let started = false;
  let running = false;
  let queued = new Set();      // in-memory mirror of outbox keys
  let loaded = false;          // has start() finished reading stored state?
  let deadCount = 0;           // rows the server refused outright
  let deadTables = {};         // which tables they were in
  let lastRefusal = null;      // { table, id, status, at }
  let requeued = [];           // entries queued while a push was in flight
  let userMap = {};            // profileId -> local user id
  let cursors = null;
  let pendingEvents = [];      // pulled events whose door hasn't arrived yet
  let lastSyncAt = 0;
  let lastError = "";
  let timer = null, kickT = null;
  let profileWait = 0;         // next allowed profile re-fetch when team-less
  let profileCache = null;

  const S = () => window.STORE;
  const teamId = () =>
    profileCache && !profileCache.disabled ? profileCache.teamId : null;

  const active = () => started && !!(window.MCLOUD && MCLOUD.enabled());
  const eligible = () =>
    active() && window.MAUTH && MAUTH.isUnlocked() && navigator.onLine !== false;

  // ---------- outbox ----------
  // Fire-and-forget by design: mutators must never block or fail on sync.
  function enqueue(entry) {
    queued.add(entry.k);
    // an edit landing while a push is in flight could have its outbox row
    // swept by that push's cleanup — remember it and put it back after
    if (running) requeued.push(entry);
    MDB.put("outbox", entry).catch(() => {});
    kick();
  }
  function queue(table, id) {
    if (!active() || !table || !id) return;
    enqueue({ k: table + ":" + id, table, id, op: "upsert", at: Date.now() });
  }
  function queueDelete(table, id) {
    if (!active() || !table || !id) return;
    enqueue({ k: table + ":" + id, table, id, op: "delete", at: Date.now() });
  }
  const isDirty = (table, id) => queued.has(table + ":" + id);
  function dropEntry(table, id) {
    const k = table + ":" + id;
    if (!queued.has(k)) return;
    queued.delete(k);
    MDB.del("outbox", k).catch(() => {});
  }

  // Record-level last-write-wins on the RECORD's own clock (client-stamped
  // updatedAt). Strict: an echo of our own push compares equal and is
  // skipped, records without clocks (legacy territories etc.) fall back to
  // apply-if-not-dirty.
  const clockOf = (r) => (r && (r.updatedAt || r.createdAt)) || 0;
  function cmpClock(data, local) {
    const r = clockOf(data), l = clockOf(local);
    if (!r || !l) return "unknown"; // legacy record without a clock
    return r > l ? "newer" : r < l ? "older" : "same";
  }

  // ---------- identity ----------
  function toProfile(localId) {
    if (!localId) return null;
    for (const pid in userMap) if (userMap[pid] === localId) return pid;
    return null;
  }
  function toLocal(profileId) {
    return (profileId && userMap[profileId]) || null;
  }
  // A user-ref inside pulled data may be a profile UUID (wire format) or a
  // foreign device's local id (legacy rep with no account). Map what we
  // can; leave the rest — every consumer already tolerates dangling ids.
  function localizeRef(ref) {
    if (!ref) return ref;
    if (UUID_RE.test(ref)) return toLocal(ref) || ref;
    return ref;
  }

  async function syncProfiles() {
    const r = await MCLOUD.api("/rest/v1/profiles?select=id,team_id,role,name,email,disabled");
    if (!r.ok || !Array.isArray(r.data)) return false;
    const mine = window.MCLOUD && (await MCLOUD.getProfile());
    let changed = false;
    // my own binding comes FIRST — otherwise a teammate who shares my name
    // could name-match onto this device's own user before my row is seen
    const meFirst = mine && S().currentUser && S().currentUser();
    if (mine && meFirst && userMap[mine.id] !== meFirst.id) {
      userMap[mine.id] = meFirst.id;
      changed = true;
    }
    for (const p of r.data) {
      if (mine && p.id === mine.id) {
        // The server's answer about ME goes through MCLOUD's single writer:
        // it stamps roleVerifiedAt and mirrors the role onto users[] in the
        // same step, so the cached profile and the local user can't disagree.
        const applied = await MCLOUD.applyProfileRow(p).catch(() => null);
        profileCache = applied
          ? { id: applied.id, teamId: applied.teamId, role: applied.role, disabled: applied.disabled }
          : { id: p.id, teamId: p.team_id, role: p.role, disabled: !!p.disabled };
        // my own mapping: this device's current user IS me
        const me = S().currentUser && S().currentUser();
        if (me && userMap[p.id] !== me.id) { userMap[p.id] = me.id; changed = true; }
        // the binding also lives ON the user record: attribution has to be
        // decidable at boot, before the sync engine has loaded anything
        if (me && me.profileId !== p.id) {
          me.profileId = p.id;
          await S().updateUser(me).catch(() => {});
        }
        continue;
      }
      if (p.disabled) continue;
      let localId = userMap[p.id];
      let local = localId && S().users.find((u) => u.id === localId);
      if (!local) {
        // adopt a pre-cloud local rep by name before minting a new one
        const name = (p.name || p.email || "Teammate").trim();
        local = S().users.find((u) =>
          !Object.values(userMap).includes(u.id) &&
          u.name.trim().toLowerCase() === name.toLowerCase());
        if (!local) {
          // the server's role verbatim: flattening leader/owner into
          // "manager" would hide leadership tools from leaders and owners
          local = await S().addUser({ name, role: p.role });
        }
        userMap[p.id] = local.id;
        changed = true;
      }
      if (local && local.profileId !== p.id) {
        local.profileId = p.id;
        await S().updateUser(local).catch(() => {});
        changed = true;
      }
      // a bound teammate's role is whatever the server says it is, now
      if (local && local.role !== p.role &&
          ["rep", "leader", "manager", "owner"].indexOf(p.role) >= 0) {
        local.role = p.role;
        await S().updateUser(local).catch(() => {});
        changed = true;
      }
    }
    if (changed) await MDB.kvSet(K_USERMAP, userMap);
    return changed;
  }

  // ---------- payloads (push) ----------
  const iso = (ms) => new Date(ms || Date.now()).toISOString();
  /* The safe payment shape, matching the server trigger's allowlist
     (db/migrations/0004_payment_allowlist.sql). Rebuilt from named fields,
     so a key that isn't listed cannot ride along — and there are no
     credential keys to list, because v39 never captures any. */
  const scrubPayment = (c) => {
    if (!c || !c.payment) return c;
    const p = c.payment;
    c.payment = {
      method: p.method || "", last4: p.last4 || "",
      autopayRequested: p.autopayRequested === true,
      status: p.status === "pending_setup" ? "pending_setup" : "not_configured",
      billingAddress: p.billingAddress || null,
    };
    return c;
  };

  function rowFor(table, rec, team) {
    const me = profileCache ? profileCache.id : null;
    if (table === "pins") {
      // a copy, because note authorship is rewritten into server identity
      // on the way out and the live record must not be touched
      const data = JSON.parse(JSON.stringify(rec));
      (data.notes || []).forEach((n) => {
        if (n.userId) n.userId = toProfile(n.userId) || n.userId;
      });
      return {
        team_id: team, id: rec.id, lat: rec.lat, lng: rec.lng,
        address: rec.address || "", disposition: rec.disposition || "",
        territory_id: rec.territoryId || null,
        created_by: me, deleted_at: null, data,
      };
    }
    if (table === "events") {
      const data = Object.assign({}, rec);
      const by = toProfile(rec.repId);
      if (by) data.repId = by;
      return {
        team_id: team, id: rec.id, pin_id: rec.pinId || null, type: "knock",
        disposition: rec.disposition || "", at_ms: rec.ts || 0,
        // RLS only lets a client write events AS ITSELF; a restored backup
        // can hold teammates' knocks, so their attribution rides in data
        // and the column stays null rather than poisoning the whole batch
        by_user: by === me ? by : null, data,
      };
    }
    if (table === "territories") {
      const data = JSON.parse(JSON.stringify(rec));
      if (data.assignedTo) data.assignedTo = toProfile(data.assignedTo) || data.assignedTo;
      (data.assignments || []).forEach((a) => {
        if (a.userId) a.userId = toProfile(a.userId) || a.userId;
      });
      return {
        team_id: team, id: rec.id, name: rec.name || "",
        polygon: rec.points || [], homes: rec.homes || null,
        archived: !!rec.archived, created_by: me, deleted_at: null, data,
      };
    }
    if (table === "customers") {
      const data = scrubPayment(JSON.parse(JSON.stringify(rec)));
      // file blobs never sync (Storage is a later phase) — shipping the
      // descriptor list without the bytes would make other devices
      // regenerate agreements instead of admitting they don't have them
      delete data.files;
      // who sold it travels as the SERVER's id — the one identity every
      // device agrees on. The soldBy name rides along as display text only.
      if (data.soldByUserId) {
        data.soldByUserId = toProfile(data.soldByUserId) || data.soldByUserId;
      }
      (data.appointments || []).forEach((a) => {
        if (a.userId) a.userId = toProfile(a.userId) || a.userId;
        if (a.setterId) a.setterId = toProfile(a.setterId) || a.setterId;
      });
      return {
        team_id: team, id: rec.id, first: rec.first || "", last: rec.last || "",
        email: rec.email || "", phones: rec.phones || [],
        created_by: me, deleted_at: null, data,
      };
    }
    return null;
  }

  const localRec = (table, id) => {
    const s = S();
    const arr = table === "pins" ? s.pins : table === "events" ? s.events :
      table === "territories" ? s.territories : s.customers;
    return arr.find((r) => r.id === id) || null;
  };

  // ---------- push ----------
  async function push(team) {
    const entries = await MDB.getAll("outbox");
    queued = new Set(entries.map((e) => e.k));
    if (!entries.length) return { pushed: 0 };
    let pushed = 0;
    const pinsFailed = { v: false };

    for (const table of TABLES) {
      if (table === "events" && pinsFailed.v) continue; // a knock's door goes first
      const mine = entries.filter((e) => e.table === table);
      const ups = mine.filter((e) => e.op === "upsert");
      const dels = mine.filter((e) => e.op === "delete");

      // One malformed or RLS-rejected row must not wedge the whole queue
      // forever: a failed batch splits in half and retries, and a single
      // row that still fails with a 4xx is set aside (dead-letter) so the
      // work behind it keeps flowing. Network errors keep everything
      // queued for the next cycle, as before.
      const postRows = async (rows) => {
        const prefer = table === "events"
          ? "resolution=ignore-duplicates,return=minimal"
          : "resolution=merge-duplicates,return=minimal";
        return MCLOUD.api("/rest/v1/" + table + "?on_conflict=team_id,id", {
          method: "POST", body: rows, headers: { Prefer: prefer },
        });
      };
      let netDown = false;
      const pushSlice = async (rows, ents) => {
        if (!rows.length || netDown) return;
        let r;
        try { r = await postRows(rows); }
        catch (e) { netDown = true; lastError = "push " + table + " offline"; return; }
        if (r.ok) {
          await MDB.bulkDel("outbox", ents.map((e) => e.k));
          ents.forEach((e) => queued.delete(e.k));
          pushed += rows.length;
          return;
        }
        if (r.status >= 500) { netDown = true; lastError = "push " + table + " " + r.status; return; }
        if (rows.length === 1) { // the poison row: park it, keep the line moving
          lastError = "push " + table + " rejected " + ents[0].id + " (" + r.status + ")";
          const entry = {
            k: ents[0].k, table, id: ents[0].id, status: r.status, at: Date.now(),
          };
          const dead = (await MDB.kvGet("syncDead", null)) || [];
          dead.push(entry);
          await MDB.kvSet("syncDead", dead.slice(-200));
          await MDB.del("outbox", ents[0].k).catch(() => {});
          queued.delete(ents[0].k);
          // the refusal becomes VISIBLE — a parked row is not a synced row
          deadCount++;
          deadTables[table] = (deadTables[table] || 0) + 1;
          lastRefusal = entry;
          return;
        }
        const mid = Math.ceil(rows.length / 2);
        await pushSlice(rows.slice(0, mid), ents.slice(0, mid));
        await pushSlice(rows.slice(mid), ents.slice(mid));
      };
      for (let i = 0; i < ups.length && !netDown; i += PUSH_BATCH) {
        const slice = ups.slice(i, i + PUSH_BATCH);
        const rows = [], live = [];
        for (const e of slice) {
          const rec = localRec(table, e.id);
          if (!rec) continue; // deleted since queued; its delete entry handles it
          rows.push(rowFor(table, rec, team));
          live.push(e);
        }
        const gone = slice.filter((e) => !live.includes(e));
        await pushSlice(rows, live);
        if (gone.length) {
          await MDB.bulkDel("outbox", gone.map((e) => e.k));
          gone.forEach((e) => queued.delete(e.k));
        }
      }
      if (netDown && table === "pins") pinsFailed.v = true;

      for (const e of dels) {
        if (table === "events") { // server log is append-only; pin tombstones cascade
          await MDB.del("outbox", e.k).catch(() => {});
          queued.delete(e.k);
          continue;
        }
        // a deleted customer's tombstone keeps the id, not the person —
        // no reason for names/phones to sit on the server forever
        const body = table === "customers"
          ? { deleted_at: iso(), data: {}, first: "", last: "", email: "", phones: [] }
          : { deleted_at: iso() };
        const where = "?team_id=eq." + encodeURIComponent(team) +
          "&id=eq." + encodeURIComponent(e.id);
        const r = await MCLOUD.api("/rest/v1/" + table + where,
          { method: "PATCH", body, headers: { Prefer: "return=representation" } });
        if (!r.ok) { lastError = "delete " + table + " " + r.status; break; }
        /* A tombstone that changes NOTHING still returns 2xx. Until 0003 that
           could only mean "the row was never uploaded", so treating it as done
           was right. Now a row can also be hidden from us by a role policy —
           an authorization refusal that arrives dressed as success. The two
           are indistinguishable from the PATCH alone, so ask: SELECT is not
           role-gated, and a row we can still READ but could not WRITE was
           refused. Only on the zero-row path, which is rare. */
        const changed = Array.isArray(r.data) ? r.data.length : 1;
        if (!changed) {
          const probe = await MCLOUD.api("/rest/v1/" + table + where + "&select=id")
            .catch(() => null);
          const stillThere = probe && probe.ok && Array.isArray(probe.data) && probe.data.length;
          if (stillThere) {
            lastError = "delete " + table + " refused " + e.id + " (no rows changed)";
            const entry = { k: e.k, table, id: e.id, status: 403, at: Date.now() };
            const dead = (await MDB.kvGet("syncDead", null)) || [];
            dead.push(entry);
            await MDB.kvSet("syncDead", dead.slice(-200));
            await MDB.del("outbox", e.k).catch(() => {});
            queued.delete(e.k);
            deadCount++;
            deadTables[table] = (deadTables[table] || 0) + 1;
            lastRefusal = entry;
            continue;
          }
        }
        await MDB.del("outbox", e.k).catch(() => {});
        queued.delete(e.k);
        pushed++;
      }
    }
    return { pushed };
  }

  // ---------- pull + merge ----------
  function patchInPlace(target, src) {
    // keep object identity — open sheets and the map hold references
    Object.keys(target).forEach((k) => { if (!(k in src)) delete target[k]; });
    Object.assign(target, src);
  }

  function localizeCustomer(data) {
    data.soldByUserId = localizeRef(data.soldByUserId);
    (data.appointments || []).forEach((a) => {
      a.userId = localizeRef(a.userId);
      a.setterId = localizeRef(a.setterId);
    });
    return data;
  }
  function localizePin(data) {
    (data.notes || []).forEach((n) => { n.userId = localizeRef(n.userId); });
    return data;
  }
  function localizeTerritory(data) {
    data.assignedTo = localizeRef(data.assignedTo);
    (data.assignments || []).forEach((a) => { a.userId = localizeRef(a.userId); });
    return data;
  }

  async function applyPins(rows) {
    const s = S();
    let changed = 0;
    const puts = [], delEvents = [];
    const doorIdx = rows.some((r) => !r.deleted_at && !s.pins.find((p) => p.id === r.id))
      ? s.buildDoorIndex() : null;
    const byAka = new Map();
    s.pins.forEach((p) => (p.aka || []).forEach((a) => byAka.set(a, p)));

    for (const row of rows) {
      let pin = s.pins.find((p) => p.id === row.id) || byAka.get(row.id);
      if (row.deleted_at) {
        if (!pin) continue;
        if (pin.id !== row.id) {
          // a teammate deleted THEIR duplicate row of a door we merged —
          // drop the alias, never the door or its knock history
          pin.aka = (pin.aka || []).filter((a) => a !== row.id);
          puts.push(pin);
          continue;
        }
        // a pending upsert for a deleted door must not resurrect it
        dropEntry("pins", pin.id);
        // replay deletePin's cascade, without re-queueing
        s.pins = s.pins.filter((p) => p !== pin);
        s.events = s.events.filter((e) => e.pinId !== pin.id && e.pinId !== row.id);
        await MDB.del("pins", pin.id).catch(() => {});
        const stale = await MDB.getAll("events");
        stale.filter((e) => e.pinId === pin.id || e.pinId === row.id)
          .forEach((e) => delEvents.push(e.id));
        changed++;
        continue;
      }
      const data = row.data && row.data.id ? localizePin(row.data) : null;
      if (!data) continue;
      if (!pin) {
        // brand-new to this device — but is it the same DOOR imported twice?
        const match = doorIdx && doorIdx.match({
          externalId: data.prop && data.prop.externalId,
          parcelId: data.prop && data.prop.parcelId,
          address: data.address, lat: data.lat, lng: data.lng,
          city: data.geo && data.geo.city, state: data.geo && data.geo.state,
          zip: data.geo && data.geo.zip,
        });
        if (!match) {
          s.pins.push(data);
          // a fresh device pulls BOTH copies of a team-duplicated door in
          // one page — the first must be in the index before the second
          if (doorIdx) doorIdx.add(data);
          puts.push(data);
          changed++;
          continue;
        }
        pin = match;
        byAka.set(data.id, pin);
      }
      // merge into the local door: our id survives, remote ids become
      // aliases, knock histories UNION (append-only entries never fight),
      // and the newer record's scalar fields win — unless a local edit is
      // still waiting to push, in which case scalars stay ours for now
      pin.aka = pin.aka || [];
      if (data.id !== pin.id && !pin.aka.includes(data.id)) pin.aka.push(data.id);
      const seen = new Set((pin.history || []).map((h) => h.ts + "|" + h.disposition));
      const freshKnocks = (data.history || []).filter((h) => !seen.has(h.ts + "|" + h.disposition));
      const merged = (pin.history || []).concat(freshKnocks);
      merged.sort((a, b) => a.ts - b.ts);
      const cmp = cmpClock(data, pin);
      const dirty = isDirty("pins", pin.id);
      // a restored stale copy loses to the team's newer version outright
      if (cmp === "newer" && dirty) dropEntry("pins", pin.id);
      // the server holds an OLDER version than ours (a late offline push
      // from another device): re-queue ours so the server heals too
      if (cmp === "older" && !dirty) queue("pins", pin.id);
      if (cmp === "newer" || (cmp === "unknown" && !dirty)) {
        const keep = { id: pin.id, aka: pin.aka };
        patchInPlace(pin, data);
        Object.assign(pin, keep);
        pin.history = merged;
        puts.push(pin);
        changed++;
      } else if (freshKnocks.length || data.id !== pin.id) {
        // scalars stay ours, but knock history always unions — two reps
        // hitting the same door in one afternoon both keep their work
        pin.history = merged;
        puts.push(pin);
        changed++;
      } // else: pure echo — touch nothing, repaint nothing
    }
    if (puts.length) await MDB.bulkPut("pins", puts);
    if (delEvents.length) await MDB.bulkDel("events", delEvents);
    return changed;
  }

  async function applyEvents(rows) {
    const s = S();
    const byAka = new Map();
    s.pins.forEach((p) => (p.aka || []).forEach((a) => byAka.set(a, p.id)));
    const have = new Set(s.events.map((e) => e.id));
    const fresh = [];
    for (const row of rows) {
      if (have.has(row.id)) continue;
      const data = row.data && row.data.id ? row.data : null;
      if (!data) continue;
      const pinId = byAka.get(data.pinId) || data.pinId;
      if (!s.pins.find((p) => p.id === pinId)) {
        // Its door isn't here YET. Usually that means the pin was
        // tombstoned — but it can also be a knock whose door lands next
        // cycle (the pin pull finished before the other device pushed).
        // The cursor has moved past this row, so stash it and retry each
        // cycle; a knock must never be lost to timing. Capped: beyond 500
        // the oldest (which by then are genuinely tombstoned doors) drop.
        pendingEvents.push(row);
        if (pendingEvents.length > 500) pendingEvents = pendingEvents.slice(-500);
        continue;
      }
      const ev = Object.assign({}, data, { pinId, repId: localizeRef(data.repId) });
      fresh.push(ev);
      have.add(ev.id);
    }
    if (fresh.length) {
      await MDB.bulkPut("events", fresh);
      s.events.push(...fresh);
      s.events.sort((a, b) => a.ts - b.ts); // renderers assume chronological order
    }
    return fresh.length;
  }

  // events stashed above get another chance once their door has arrived
  async function retryPendingEvents() {
    if (!pendingEvents.length) return 0;
    const rows = pendingEvents;
    pendingEvents = [];
    const n = await applyEvents(rows); // still-doorless rows re-stash themselves
    await MDB.kvSet("syncPendingEvents", pendingEvents.length ? pendingEvents : null);
    return n;
  }

  async function applyTerritories(rows) {
    const s = S();
    let changed = 0;
    const puts = [], pinPuts = [];
    for (const row of rows) {
      const t = s.territories.find((x) => x.id === row.id);
      if (row.deleted_at) {
        dropEntry("territories", row.id);
        if (t) {
          s.territories = s.territories.filter((x) => x !== t);
          await MDB.del("territories", row.id).catch(() => {});
          // same release deleteTerritory does: pins fall back to the pool
          s.pins.forEach((p) => {
            if (p.territoryId === row.id) { p.territoryId = null; pinPuts.push(p); }
          });
          changed++;
        }
        continue;
      }
      const data = row.data && row.data.id ? localizeTerritory(row.data) : null;
      if (!data) continue;
      if (t) {
        const cmp = cmpClock(data, t);
        const dirty = isDirty("territories", t.id);
        if (cmp === "newer" && dirty) dropEntry("territories", t.id);
        /* The server holds an older copy than ours: normally we re-queue so
           the server heals. But territory writes are leadership-only (0003),
           and a client without that capability re-queuing here would push a
           row the server refuses — on EVERY delivery, dead-lettering each
           time and telling the rep their work is being rejected when the
           real answer is that territories were never theirs to edit. For
           them the server's copy simply wins, which also repairs whatever
           divergence a refused local edit left behind. */
        const mayWrite = !S().canManageTerritories || S().canManageTerritories();
        if (cmp === "older" && !dirty && mayWrite) { queue("territories", t.id); continue; }
        if (cmp === "same" || (cmp !== "newer" && dirty)) continue;
        patchInPlace(t, data);
        puts.push(t);
        changed++;
      } else {
        s.territories.push(data);
        puts.push(data);
        changed++;
      }
    }
    if (puts.length) await MDB.bulkPut("territories", puts);
    if (pinPuts.length) await MDB.bulkPut("pins", pinPuts);
    return changed;
  }

  async function applyCustomers(rows) {
    const s = S();
    let changed = 0;
    const puts = [];
    for (const row of rows) {
      const c = s.customers.find((x) => x.id === row.id);
      if (row.deleted_at) {
        dropEntry("customers", row.id);
        if (c) {
          s.customers = s.customers.filter((x) => x !== c);
          await MDB.del("customers", row.id).catch(() => {});
          if (Array.isArray(c.files)) { // local blobs for a customer that no longer exists
            await Promise.all(c.files.map((f) => MDB.del("files", f.id).catch(() => {})));
          }
          changed++;
        }
        continue;
      }
      const data = row.data && row.data.id ? localizeCustomer(row.data) : null;
      if (!data) continue;
      if (c) {
        const cmp = cmpClock(data, c);
        const dirty = isDirty("customers", c.id);
        if (cmp === "newer" && dirty) dropEntry("customers", c.id);
        if (cmp === "older" && !dirty) { queue("customers", c.id); continue; }
        if (cmp === "same" || (cmp !== "newer" && dirty)) continue;
        // apply — file blobs stay local (Storage is a later phase), so the
        // descriptor list must survive the patch. Payment does NOT get a
        // carve-out any more: there is no credential on this phone worth
        // preserving, and preserving one would be the hidden local
        // fallback v39 exists to remove.
        const localFiles = c.files;
        patchInPlace(c, data);
        if (localFiles) c.files = localFiles;
        puts.push(c);
        changed++;
      } else {
        s.customers.push(data);
        puts.push(data);
        changed++;
      }
    }
    if (puts.length) await MDB.bulkPut("customers", puts);
    return changed;
  }

  const APPLY = { pins: applyPins, events: applyEvents,
    territories: applyTerritories, customers: applyCustomers };

  async function pull(team, live) {
    let applied = 0;
    for (const table of TABLES) {
      const clock = table === "events" ? "created_at" : "updated_at";
      // COMPOUND cursor {t, id}: Postgres stamps every row of one batched
      // insert with the same transaction now(), so timestamp ties are the
      // NORM, not the exception — a bare gt.timestamp cursor would skip
      // every tied row past a page boundary, silently losing knocks. The
      // id tiebreak makes pagination total. (Old string cursors migrate.)
      let cur = cursors[table] || { t: EPOCH, id: "" };
      if (typeof cur === "string") cur = { t: cur, id: "" };
      for (;;) {
        const filt = "or=" + encodeURIComponent(
          "(" + clock + ".gt." + cur.t +
          ",and(" + clock + ".eq." + cur.t + ",id.gt." + cur.id + "))");
        const r = await MCLOUD.api(
          "/rest/v1/" + table + "?team_id=eq." + encodeURIComponent(team) +
          "&" + filt + "&order=" + clock + ".asc,id.asc&limit=" + PULL_PAGE);
        if (!r.ok || !Array.isArray(r.data)) {
          // abort the WHOLE pull: applying later tables against a table
          // that didn't finish (events without their pins) mis-stashes
          // rows; cursors already persist per page, so nothing is lost
          lastError = "pull " + table + " " + r.status;
          return applied;
        }
        if (!r.data.length) break;
        if (live && !live()) return applied; // reset/erase raced us — stop
        applied += await APPLY[table](r.data);
        const last = r.data[r.data.length - 1];
        cur = { t: last[clock], id: last.id };
        cursors[table] = cur;
        await MDB.kvSet(K_CURSORS, cursors);
        await MDB.kvSet("syncPendingEvents", pendingEvents.length ? pendingEvents : null);
        if (r.data.length < PULL_PAGE) break;
      }
    }
    return applied;
  }

  // ---------- backfill ----------
  // The one-time migration: this device's whole existing book gets queued
  // for upload the first time sync becomes possible. Restore resets the
  // flag, so a restored backup re-uploads too.
  async function backfill() {
    if (await MDB.kvGet(K_BACKFILL, false)) return;
    const s = S();
    const entries = [];
    const add = (table, arr) => arr.forEach((r) =>
      entries.push({ k: table + ":" + r.id, table, id: r.id, op: "upsert", at: Date.now() }));
    add("pins", s.pins); add("events", s.events);
    add("territories", s.territories); add("customers", s.customers);
    if (entries.length) {
      await MDB.bulkPut("outbox", entries);
      entries.forEach((e) => queued.add(e.k));
    }
    await MDB.kvSet(K_BACKFILL, true);
  }

  // ---------- repaint ----------
  function repaint() {
    const go = (f) => { try { f(); } catch (_) {} };
    if (window.MMAP && MMAP.isReady && MMAP.isReady()) {
      go(() => MMAP.refreshPins());
      go(() => MMAP.refreshHoods());
    }
    if (window.MMAP) go(() => MMAP.updateBrandToday && MMAP.updateBrandToday());
    if (window.MSTAT) go(() => MSTAT.render());
    if (window.MCUST) go(() => MCUST.renderList());
    if (window.MSCHED) go(() => MSCHED.render());
    if (window.MHOME) go(() => MHOME.render());
  }

  // ---------- the cycle ----------
  let gen = 0; // bumped by reset(): a dying cycle must not write stale state
  async function cycle() {
    if (running || !eligible()) return;
    running = true;
    const g = gen;
    const live = () => g === gen;
    try {
      // team-less accounts idle quietly, re-checking every few minutes so a
      // rep placed on the team by the office starts syncing without a
      // re-login
      if (!teamId()) {
        if (Date.now() < profileWait) return;
        profileWait = Date.now() + 3 * 60e3;
        try { await syncProfiles(); } catch (_) { return; }
        if (!teamId()) return;
      }
      const team = teamId();
      // moved to another team? the old cursors, backfill flag and pending
      // stash describe the old world — start clean against the new one
      const t0 = await MDB.kvGet("syncTeam", null);
      if (t0 !== team) {
        cursors = {}; pendingEvents = [];
        await MDB.kvSet(K_CURSORS, null);
        await MDB.kvSet("syncPendingEvents", null);
        if (t0 !== null) await MDB.kvSet(K_BACKFILL, null);
        await MDB.kvSet("syncTeam", team);
      }
      await backfill();
      if (!live()) return;
      // the doorbell follows the SERVER-resolved team (never a client claim)
      try { if (window.MREALTIME) MREALTIME.ensure(team); } catch (_) {}
      let usersChanged = false;
      try { usersChanged = await syncProfiles(); } catch (_) {}
      // PULL FIRST: the team's newer records land and retire stale outbox
      // entries BEFORE this device pushes — so a week-old restored backup
      // (or any stale phone) can never roll the whole server back
      let applied = await retryPendingEvents();
      applied += await pull(team, live);
      if (!live()) return;
      const { pushed } = await push(team);
      if (!live()) return;
      await MDB.kvSet("syncPendingEvents", pendingEvents.length ? pendingEvents : null);
      lastSyncAt = Date.now();
      lastError = queued.size ? lastError : "";
      await MDB.kvSet(K_LAST, lastSyncAt);
      if (applied || usersChanged) repaint();
      else if (pushed) { // pushed-count chips need a refresh even with no pulls
        try { window.MMAP && MMAP.updateBrandToday && MMAP.updateBrandToday(); } catch (_) {}
      }
    } catch (e) {
      lastError = (e && e.message) || "sync failed";
    } finally {
      // edits that raced the push had their outbox rows swept — restore them
      if (requeued.length) {
        const back = requeued; requeued = [];
        back.forEach((e) => queued.add(e.k));
        MDB.bulkPut("outbox", back).catch(() => {});
        kick();
      }
      running = false;
      if (wakeAgain) { // doorbell rang mid-cycle: one follow-up, not a storm
        wakeAgain = false;
        setTimeout(cycle, 300);
      }
    }
  }

  function kick() { // debounced "something changed, push soon"
    if (!active()) return;
    clearTimeout(kickT);
    // 800ms: rapid edits still coalesce (an import's whole loop lands as
    // one push), but a knock reaches teammates inside the 2-second promise
    kickT = setTimeout(cycle, 800);
  }

  // ---------- the doorbell (Phase 3) ----------
  // Realtime pings land here and NOWHERE else: a wake is only ever a
  // request to run the normal Phase 2 cycle soon. Bursts collapse — the
  // first ping pulls almost immediately (that's the sub-2s promise), pings
  // hot on its heels fold into one trailing pull, and pings that arrive
  // while a cycle is running earn exactly one follow-up cycle.
  let wakeT = null, wakeAgain = false, lastWakeRun = 0;
  function wake() {
    if (!eligible()) return;
    if (running) { wakeAgain = true; return; }
    clearTimeout(wakeT);
    const since = Date.now() - lastWakeRun;
    wakeT = setTimeout(() => {
      lastWakeRun = Date.now();
      cycle();
    }, since > 1500 ? 150 : 1200);
  }

  // ---------- lifecycle ----------
  async function start() {
    if (started || !(window.MCLOUD && MCLOUD.enabled())) return;
    started = true;
    userMap = (await MDB.kvGet(K_USERMAP, null)) || {};
    cursors = (await MDB.kvGet(K_CURSORS, null)) || {};
    pendingEvents = (await MDB.kvGet("syncPendingEvents", null)) || [];
    lastSyncAt = await MDB.kvGet(K_LAST, 0);
    const box = await MDB.getAll("outbox").catch(() => []);
    queued = new Set(box.map((e) => e.k));
    // a refusal from a previous session is still a refusal
    const dead = (await MDB.kvGet("syncDead", null)) || [];
    deadCount = dead.length;
    deadTables = {};
    dead.forEach((d) => {
      const t = d.table || "record";
      deadTables[t] = (deadTables[t] || 0) + 1;
    });
    lastRefusal = dead[dead.length - 1] || null;
    // only now is a "0 refused" answer trustworthy — before this the counts
    // are simply unknown, and a screen must not read them as "all clear"
    loaded = true;
    profileCache = await MCLOUD.getProfile();
    window.addEventListener("online", () => cycle());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") cycle();
    });
    timer = setInterval(() => {
      if (document.visibilityState === "visible") cycle();
    }, (window.RALLY_CLOUD && RALLY_CLOUD.pollMs) || 45000);
    setTimeout(cycle, 1500); // let boot settle first
  }

  // wipe every trace of sync state — reset/erase flows call this so the
  // next account on this device starts from a clean slate
  async function reset() {
    gen++; // any in-flight cycle stops writing at its next checkpoint
    try { if (window.MREALTIME) MREALTIME.stop(); } catch (_) {}
    clearTimeout(kickT); clearTimeout(wakeT); wakeAgain = false;
    if (timer) clearInterval(timer);
    started = false; running = false;
    queued = new Set(); requeued = []; userMap = {}; cursors = {};
    pendingEvents = []; profileCache = null;
    lastSyncAt = 0; lastError = "";
    await MDB.clear("outbox").catch(() => {});
    await MDB.kvSet(K_CURSORS, null);
    await MDB.kvSet(K_USERMAP, null);
    await MDB.kvSet(K_BACKFILL, null);
    await MDB.kvSet(K_LAST, null);
    await MDB.kvSet("syncPendingEvents", null);
    await MDB.kvSet("syncTeam", null);
    await MDB.kvSet("syncDead", null);
    deadCount = 0; deadTables = {}; lastRefusal = null;
  }

  /* A record the server REFUSED is not synced, and RALLY must never let a
     screen imply otherwise. Refusals are dead-lettered so the rest of the
     queue keeps flowing (that behaviour is unchanged); status() now reports
     them so the UI can say "3 records the server refused" instead of a
     clean checkmark. `refused` counts rows that will never upload without
     someone doing something — most often an RLS denial, which is exactly
     what a rep hitting the new territory gate produces. */
  const status = () => ({
    on: active(), team: !!teamId(), pending: queued.size,
    lastSyncAt, lastError, running,
    loaded,
    refused: deadCount,
    refusedTables: Object.keys(deadTables).sort(),
    lastRefusal: lastRefusal,
  });

  // everything the server has refused on this device, for the More screen
  const refusals = async () => (await MDB.kvGet("syncDead", null)) || [];

  window.MSYNC = {
    start, queue, queueDelete, syncNow: cycle, wake, status, reset, isDirty,
    refusals,
    // read-only view of the identity bridge, for diagnostics and tests
    profileOf: (localId) => toProfile(localId),
  };
})();
