/* Deal Vault service worker — offline-first app shell */
const CACHE = 'deal-vault-v1';
const ASSETS = [
  './', 'index.html', 'css/app.css',
  'js/core.js', 'js/calc.js', 'js/industries.js', 'js/score.js', 'js/charts.js', 'js/demo.js',
  'js/views/wizard.js', 'js/views/deal.js', 'js/views/lists.js', 'js/views/tools.js', 'js/app.js',
  'manifest.webmanifest', 'favicon.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* network-first for the app shell (so updates land), cache fallback for offline */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
