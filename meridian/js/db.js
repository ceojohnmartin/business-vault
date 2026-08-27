/* Meridian — IndexedDB layer.
   Local-first: every write commits here; nothing depends on the network. */
(function () {
  const DB_NAME = "meridian-db";
  const DB_VER = 1;
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
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
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
    del: (store, key) => tx(store, "readwrite", (s) => s.delete(key)),
    get,
    getAll,
    clear: (store) => tx(store, "readwrite", (s) => s.clear()),
    kvGet: (k, dflt) => get("kv", k).then((r) => (r === undefined ? dflt : r.v)),
    kvSet: (k, v) => tx("kv", "readwrite", (s) => s.put({ k, v })).then(() => v),
  };
})();
