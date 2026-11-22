// Service worker : l'application fonctionne hors ligne (cache d'abord), la météo passe par le réseau.
const CACHE = 'kronos-v0.2.0';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/ui/dom.js', './js/ui/format.js', './js/ui/tir.js', './js/ui/table.js', './js/ui/armes.js', './js/ui/reglages.js', './js/ui/sheets.js',
  './js/engine/solver.js', './js/engine/drag.js', './js/engine/atmo.js', './js/engine/units.js',
  './js/data/model.js', './js/data/store.js', './js/data/catalog.js', './js/data/meteo.js',
  './icons/favicon-64.png', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // Open-Meteo : réseau direct
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match('./index.html'))));
});
