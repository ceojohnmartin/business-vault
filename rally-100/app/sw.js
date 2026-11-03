/* RALLY 100 service worker: keeps the app shell on the phone so it opens without signal. Data is never
   cached here; it always comes from the server (and rep writes wait in the app's outbox). Bump VERSION on
   every release so phones pick up the new files. */
var VERSION = 'r100-v1.0.1';
var SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css?v=1.0.1', 'css/rep.css?v=1.0.1', 'css/lead.css?v=1.0.1',
  'js/config.js?v=1.0.1', 'js/cloud.js?v=1.0.1', 'js/core.js?v=1.0.1', 'js/rep.js?v=1.0.1', 'js/lead.js?v=1.0.1', 'js/owner.js?v=1.0.1', 'js/main.js?v=1.0.1',
  'img/panther-192.jpg', 'img/panther-384.jpg', 'img/icon-192.png', 'img/icon-512.png', 'img/apple-touch-icon.png', 'img/favicon.png'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('r100-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            /* Supabase and fonts go straight to the network */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(function () { return caches.match('index.html'); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
});
