/* Business Vault University — offline service worker.
   Network-first for the app (updates arrive when online),
   cache fallback when offline. Fonts cached on first use. */
const CACHE = "bvu-v16";
/* Cache Storage is per-ORIGIN, and this origin now hosts more than one app
   (RALLY at /business-vault/rally/ and its isolated preview beside it). The
   cleanup below used to delete every cache that was not this worker's own —
   which, on a shared origin, is another app's offline shell. It now removes
   only this app's own family. */
const FAMILY = "bvu-";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(FAMILY) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  if (url.origin === location.origin) {
    // network-first: fresh when online, cached when not
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return r;
        })
        .catch(() =>
          caches.match(e.request).then(m => m || caches.match("./index.html"))
        )
    );
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // fonts: cache-first, they never change
    e.respondWith(
      caches.match(e.request).then(m =>
        m || fetch(e.request).then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return r;
        })
      )
    );
  }
  // everything else (YouTube, Anthropic API) passes through untouched
});
