/* RALLY — offline service worker.
   App shell: network-first with a short race against the cache (weak signal
   never leaves a rep staring at a blank screen), good responses only.
   Fonts + libraries: cache-first (versioned/immutable), opaque allowed.
   Map tiles: cache-first with a cap, opaque allowed, so knocked
   neighborhoods keep working offline. */
const CACHE = "rally-v40";
const TILE_CACHE = "rally-tiles-v1";
const TILE_LIMIT = 1400; // street + retina satellite + label overlays share this cache
const NET_TIMEOUT_MS = 3500;

/* RELEASE COHERENCE. Every code asset carries ?v=<release>. The app has no
   build step and no content hashing, and the shell is served network-first
   with an INDEPENDENT per-file race against cache — so with bare filenames a
   single page load could mix modules from two releases (new index.html plus
   an old cached store.js), which throws at first render rather than at load.

   The query string is part of the Cache API key (no ignoreSearch anywhere),
   so a versioned URL simply MISSES an older cache. networkFirstShell then
   takes its no-cache branch and awaits the network instead of racing it: the
   module that arrives is the one this index.html asked for, or none at all.
   A dead network therefore serves the OLD index.html from cache, which asks
   for the OLD urls, which are all cached — coherent either way, never mixed.

   Keep these in step with index.html: same paths, same ?v. */
const CORE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/app.css?v=40",
  "./vendor/maplibre-gl.js?v=40", "./vendor/maplibre-gl.css?v=40",
  "./js/db.js?v=40", "./js/geo.js?v=40", "./js/data.js?v=40", "./js/ui.js?v=40", "./js/store.js?v=40",
  "./js/cloud-config.js?v=40", "./js/cloud.js?v=40", "./js/sync.js?v=40", "./js/realtime.js?v=40",
  "./js/auth.js?v=40", "./js/gate.js?v=40",
  "./js/property.js?v=40", "./js/crm.js?v=40",
  "./js/contract.js?v=40", "./js/map.js?v=40", "./js/hoods.js?v=40", "./js/customers.js?v=40",
  "./js/route.js?v=40", "./js/street.js?v=40", "./js/select.js?v=40",
  "./js/home.js?v=40", "./js/schedule.js?v=40", "./js/stats.js?v=40",
  "./js/vault.js?v=40", "./js/app.js?v=40",
  "./fonts/Noto Sans Bold/0-255.pbf", "./fonts/Noto Sans Bold/256-511.pbf",
  "./img/wordmark.svg", "./img/topo.svg",
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

// matches only real z/x/y tile paths — style JSON, TileJSON, glyph ranges
// and sprites never match, so they can never be trimmed away
const TILE_RE = /\/\d+\/\d+\/\d+(@2x)?(\.\w+)?$/;

async function trimTiles() {
  const c = await caches.open(TILE_CACHE);
  const keys = (await c.keys()).filter((k) => TILE_RE.test(new URL(k.url).pathname));
  if (keys.length > TILE_LIMIT) {
    await Promise.all(keys.slice(0, keys.length - TILE_LIMIT).map((k) => c.delete(k)));
  }
}

// Opaque (no-cors) responses report status 0 — they're still the tile/font we asked for.
const cacheable = (r) => r && (r.ok || r.type === "opaque");

async function networkFirstShell(req) {
  const cached = await caches.match(req);
  try {
    const fetching = fetch(req).then((r) => {
      if (r && r.ok) {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return r;
    });
    const r = cached
      ? await Promise.race([
          fetching,
          new Promise((resolve) => setTimeout(() => resolve(null), NET_TIMEOUT_MS)),
        ])
      : await fetching;
    if (r && r.ok) return r;
    if (cached) return cached;
    if (r) return r; // a non-ok live response beats nothing
    throw new Error("timeout with no cache");
  } catch (_) {
    if (cached) return cached;
    if (req.mode === "navigate") {
      const shell = await caches.match("./index.html");
      if (shell) return shell;
    }
    return Response.error();
  }
}

async function cacheFirst(req, cacheName, afterPut) {
  const m = await caches.match(req);
  if (m) return m;
  const r = await fetch(req);
  if (cacheable(r)) {
    const copy = r.clone();
    caches.open(cacheName).then((c) => c.put(req, copy).then(afterPut || (() => {})));
  }
  return r;
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  if (url.origin === location.origin) {
    e.respondWith(networkFirstShell(e.request));
  } else if (url.hostname === "tile.googleapis.com") {
    // Google map tiles: cache-first with a cap, so knocked neighborhoods
    // keep rendering offline
    e.respondWith(cacheFirst(e.request, TILE_CACHE, trimTiles));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(cacheFirst(e.request, CACHE));
  }
});
