/* Meridian — offline service worker.
   App shell: network-first (fresh when online, cached when not).
   Fonts + libraries: cache-first (they're versioned/immutable).
   Map tiles: cache-first with a cap, so knocked neighborhoods keep working offline. */
const CACHE = "meridian-v1";
const TILE_CACHE = "meridian-tiles-v1";
const TILE_LIMIT = 600;

const CORE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/app.css",
  "./vendor/maplibre-gl.js", "./vendor/maplibre-gl.css",
  "./js/db.js", "./js/data.js", "./js/ui.js", "./js/store.js",
  "./js/map.js", "./js/stats.js", "./js/close.js", "./js/app.js",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./favicon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE && k !== TILE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimTiles() {
  const c = await caches.open(TILE_CACHE);
  const keys = await c.keys();
  if (keys.length > TILE_LIMIT) {
    await Promise.all(keys.slice(0, keys.length - TILE_LIMIT).map((k) => c.delete(k)));
  }
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  if (url.origin === location.origin) {
    // app shell: network-first
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return r;
        })
        .catch(() => caches.match(e.request).then((m) => m || caches.match("./index.html")))
    );
  } else if (url.hostname.endsWith("basemaps.cartocdn.com")) {
    // map tiles: cache-first with cap
    e.respondWith(
      caches.match(e.request).then(
        (m) =>
          m ||
          fetch(e.request).then((r) => {
            if (r.ok) {
              const copy = r.clone();
              caches.open(TILE_CACHE).then((c) => c.put(e.request, copy).then(trimTiles));
            }
            return r;
          })
      )
    );
  } else if (
    /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) ||
    url.hostname === "unpkg.com"
  ) {
    // fonts + pinned libraries: cache-first
    e.respondWith(
      caches.match(e.request).then(
        (m) =>
          m ||
          fetch(e.request).then((r) => {
            if (r.ok) {
              const copy = r.clone();
              caches.open(CACHE).then((c) => c.put(e.request, copy));
            }
            return r;
          })
      )
    );
  }
});
