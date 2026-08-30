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
    for (const p of r.data) {
      if (mine && p.id === mine.id) {
        profileCache = { id: p.id, teamId: p.team_id, role: p.role, disabled: !!p.disabled };
        // my own mapping: this device's current user IS me
        const me = S().currentUser && S().currentUser();
        if (me && userMap[p.id] !== me.id) { userMap[p.id] = me.id; changed = true; }
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
          local = await S().addUser({
            name, role: (p.role === "manager" || p.role === "owner") ? "manager" : "rep",
          });
        }
        userMap[p.id] = local.id;
        changed = true;
      }
    }
    if (changed) await MDB.kvSet(K_USERMAP, userMap);
    return changed;
  }

  // ---------- payloads (push) ----------
  const iso = (ms) => new Date(ms || Date.now()).toISOString();
  const scrubPayment = (c) => {
    if (!c || !c.payment) return c;
    const p = c.payment;
    c.payment = {
      method: p.method || "", last4: p.last4 || "",
      autopay: !!p.autopay, billingAddress: p.billingAddress || null,
    };
    return c;
  };

  function rowFor(table, rec, team) {
    const me = profileCache ? profileCache.id : null;
    if (table === "pins") {
      return {
        team_id: team, id: rec.id, lat: rec.lat, lng: rec.lng,
        address: rec.address || "", disposition: rec.disposition || "",
        territory_id: rec.territoryId || null,
        created_by: me, deleted_at: null, data: rec,
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

      for (let i = 0; i < ups.length; i += PUSH_BATCH) {
        const slice = ups.slice(i, i + PUSH_BATCH);
        const rows = [], live = [];
        for (const e of slice) {
          const rec = localRec(table, e.id);
          if (!rec) continue; // deleted since queued; its delete entry handles it
          rows.push(rowFor(table, rec, team));
          live.push(e);
        }
        const gone = slice.filter((e) => !live.includes(e));
        if (rows.length) {
          const prefer = table === "events"
            ? "resolution=ignore-duplicates,return=minimal"
            : "resolution=merge-duplicates,return=minimal";
          const r = await MCLOUD.api("/rest/v1/" + table + "?on_conflict=team_id,id", {
            method: "POST", body: rows, headers: { Prefer: prefer },
          });
          if (!r.ok) {
            if (table === "pins") pinsFailed.v = true;
            lastError = "push " + table + " " + r.status;
            break; // leave the batch queued; next cycle retries
          }
          await MDB.bulkDel("outbox", live.map((e) => e.k));
          live.forEach((e) => queued.delete(e.k));
          pushed += rows.length;
        }
        if (gone.length) {
          await MDB.bulkDel("outbox", gone.map((e) => e.k));
          gone.forEach((e) => queued.delete(e.k));
        }
      }

      for (const e of dels) {
        if (table === "events") { // server log is append-only; pin tombstones cascade
          await MDB.del("outbox", e.k).catch(() => {});
          queued.delete(e.k);
          continue;
        }
        const r = await MCLOUD.api(
          "/rest/v1/" + table + "?team_id=eq." + encodeURIComponent(team) +
          "&id=eq." + encodeURIComponent(e.id),
          { method: "PATCH", body: { deleted_at: iso() },
            headers: { Prefer: "return=minimal" } });
        // 2xx = tombstoned (or matched nothing: never uploaded — done either way)
        if (!r.ok) { lastError = "delete " + table + " " + r.status; break; }
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
    (data.appointments || []).forEach((a) => {
      a.userId = localizeRef(a.userId);
      a.setterId = localizeRef(a.setterId);
    });
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
        if (pin) {
          // replay deletePin's cascade, without re-queueing
          s.pins = s.pins.filter((p) => p !== pin);
          s.events = s.events.filter((e) => e.pinId !== pin.id && e.pinId !== row.id);
          await MDB.del("pins", pin.id).catch(() => {});
          const stale = await MDB.getAll("events");
          stale.filter((e) => e.pinId === pin.id || e.pinId === row.id)
            .forEach((e) => delEvents.push(e.id));
          changed++;
        }
        continue;
      }
      const data = row.data && row.data.id ? row.data : null;
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
      const merged = (pin.history || []).concat(
        (data.history || []).filter((h) => !seen.has(h.ts + "|" + h.disposition)));
      merged.sort((a, b) => a.ts - b.ts);
      if (!isDirty("pins", pin.id) && (data.updatedAt || 0) >= (pin.updatedAt || 0)) {
        const keep = { id: pin.id, aka: pin.aka };
        patchInPlace(pin, data);
        Object.assign(pin, keep);
      }
      pin.history = merged;
      puts.push(pin);
      changed++;
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
        if (isDirty("territories", t.id)) continue;
        patchInPlace(t, data);
        puts.push(t);
      } else {
        s.territories.push(data);
        puts.push(data);
      }
      changed++;
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
        if (isDirty("customers", c.id)) continue;
        patchInPlace(c, data);
        puts.push(c);
      } else {
        s.customers.push(data);
        puts.push(data);
      }
      changed++;
    }
    if (puts.length) await MDB.bulkPut("customers", puts);
    return changed;
  }

  const APPLY = { pins: applyPins, events: applyEvents,
    territories: applyTerritories, customers: applyCustomers };

  async function pull(team) {
    let applied = 0;
    for (const table of TABLES) {
      const clock = table === "events" ? "created_at" : "updated_at";
      let cursor = cursors[table] || EPOCH;
      for (;;) {
        const r = await MCLOUD.api(
          "/rest/v1/" + table + "?team_id=eq." + encodeURIComponent(team) +
          "&" + clock + "=gt." + encodeURIComponent(cursor) +
          "&order=" + clock + ".asc&limit=" + PULL_PAGE);
        if (!r.ok || !Array.isArray(r.data)) { lastError = "pull " + table + " " + r.status; break; }
        if (!r.data.length) break;
        applied += await APPLY[table](r.data);
        cursor = r.data[r.data.length - 1][clock];
        cursors[table] = cursor;
        await MDB.kvSet(K_CURSORS, cursors);
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
  async function cycle() {
    if (running || !eligible()) return;
    running = true;
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
      await backfill();
      let usersChanged = false;
      try { usersChanged = await syncProfiles(); } catch (_) {}
      const { pushed } = await push(team);
      let applied = await retryPendingEvents();
      applied += await pull(team);
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
    }
  }

  function kick() { // debounced "something changed, push soon"
    if (!active()) return;
    clearTimeout(kickT);
    kickT = setTimeout(cycle, 2500);
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
    profileCache = await MCLOUD.getProfile();
    window.addEventListener("online", () => cycle());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") cycle();
    });
    timer = setInterval(() => {
      if (document.visibilityState === "visible") cycle();
    }, 45000);
    setTimeout(cycle, 1500); // let boot settle first
  }

  // wipe every trace of sync state — reset/erase flows call this so the
  // next account on this device starts from a clean slate
  async function reset() {
    clearTimeout(kickT); if (timer) clearInterval(timer);
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
  }

  const status = () => ({
    on: active(), team: !!teamId(), pending: queued.size,
    lastSyncAt, lastError, running,
  });

  window.MSYNC = { start, queue, queueDelete, syncNow: cycle, status, reset, isDirty };
})();
