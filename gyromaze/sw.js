const CACHE_NAME = 'gyro-maze-v3-fix';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then((keys) => Promise.all(
        keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null)
    )));
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});