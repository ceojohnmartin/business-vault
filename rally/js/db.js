/* RALLY — IndexedDB layer.
   Local-first: every write commits here; nothing depends on the network.
   DB name is unchanged from the Meridian era ON PURPOSE: IndexedDB is
   origin-scoped, so keeping the name is what carries every existing pin,
   knock and customer across the rebrand. */
(function () {
  const DB_NAME = "meridian-db";
  const DB_VER = 4;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("pins")) {
          const pins = db.createObjectStore("pins", { keyPath: "id" });
          pins.createIndex("byUpdated", "updatedAt");
        }
        if (!db.objectStoreNames.contains("events")) {
          const ev = db.createObjectStore("events", { keyPath: "id" });
          ev.createIndex("byTs", "ts");
        }
        if (!db.objectStoreNames.contains("customers")) {
          db.createObjectStore("customers", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("kv")) {
          db.createObjectStore("kv", { keyPath: "k" });
        }
        // v2: rep territories ("hoods") and file blobs (signed agreements, photos)
        if (!db.objectStoreNames.contains("territories")) {
          db.createObjectStore("territories", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
        // v3: people — reps and managers with roles and territory colors
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "id" });
        }
        // v4: the sync outbox — one row per locally-changed record awaiting
        // a push to the team cloud. k = "table:id"; the record's payload is
        // built fresh at push time, so entries here are tiny and coalesce.
        if (!db.objectStoreNames.contains("outbox")) {
          db.createObjectStore("outbox", { keyPath: "k" });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // another tab (or a future version) wants to upgrade: release the
        // connection so nobody hangs, and reopen lazily on the next call
        db.onversionchange = () => { try { db.close(); } catch (_) {} dbp = null; };
        resolve(db);
      };
      // an old cached Meridian tab still holds v1 open — fail fast (boot
      // falls back to in-memory + a toast) instead of hanging forever
      req.onblocked = () => reject(new Error("database blocked by an old app tab"));
      req.onerror = () => reject(req.error);
    });
    // never cache a failed open — a later retry may succeed (transient quota/lock)
    dbp.catch(() => { dbp = null; });
    return dbp;
  }

  function tx(store, mode, fn) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction(store, mode);
          const s = t.objectStore(store);
          let out;
          try {
            out = fn(s);
          } catch (err) {
            reject(err);
            return;
          }
          t.oncomplete = () => resolve(out && "result" in out ? out.result : out);
          t.onerror = () => reject(t.error);
          t.onabort = () => reject(t.error || new Error("tx aborted"));
        })
    );
  }

  /* ONE readwrite transaction across several stores. Commits everything the
     callback issued, or nothing — the point is a delete that removes a record
     from its store and writes its tombstone into the outbox in the SAME
     commit, so a crash can never leave "record gone, tombstone gone" on disk.

     `fn(get)` receives an accessor from store name to object store and MUST
     issue every request synchronously: an IndexedDB transaction that goes idle
     for a turn auto-commits, so an `await` inside the callback would commit a
     partial write and then fail on the rest. Callers compute every key list
     before opening the transaction. */
  function txn(stores, fn) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction(stores, "readwrite");
          let out;
          try {
            out = fn((name) => t.objectStore(name));
          } catch (err) {
            try { t.abort(); } catch (_) {}
            reject(err);
            return;
          }
          t.oncomplete = () => resolve(out);
          t.onerror = () => reject(t.error);
          t.onabort = () => reject(t.error || new Error("tx aborted"));
        })
    );
  }

  function getAll(store) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db.transaction(store, "readonly").objectStore(store).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        })
    );
  }

  function get(store, key) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db.transaction(store, "readonly").objectStore(store).get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        })
    );
  }

  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

  window.MDB = {
    uid,
    put: (store, val) => tx(store, "readwrite", (s) => s.put(val)).then(() => val),
    // one transaction for a whole batch — the sync engine applies remote
    // pages and enqueues backfills in bulk, and per-row transactions there
    // would grind a large first sync to a halt
    bulkPut: (store, vals) => tx(store, "readwrite", (s) => { vals.forEach((v) => s.put(v)); }).then(() => vals),
    bulkDel: (store, keys) => tx(store, "readwrite", (s) => { keys.forEach((k) => s.delete(k)); }),
    del: (store, key) => tx(store, "readwrite", (s) => s.delete(key)),
    get,
    getAll,
    clear: (store) => tx(store, "readwrite", (s) => s.clear()),
    // all-or-nothing across stores; see txn() above for the contract
    txn,
    kvGet: (k, dflt) => get("kv", k).then((r) => (r === undefined ? dflt : r.v)),
    kvSet: (k, v) => tx("kv", "readwrite", (s) => s.put({ k, v })).then(() => v),
  };
})();
