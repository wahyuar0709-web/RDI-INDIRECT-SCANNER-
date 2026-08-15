// RDI Indirect Inventory — Service Worker
// Tujuan: memenuhi syarat installability PWA (Chrome/Android butuh SW terdaftar)
// + app-shell caching supaya reload tetap jalan saat offline/koneksi lambat.
// Sengaja TIDAK mengintersep request ke Firebase/Firestore — auth & data tetap
// selalu lewat network langsung, supaya tidak mengganggu realtime sync/transaksi.

const CACHE_NAME = 'rdi-shell-v4.2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Hanya tangani request same-origin (app shell). Firebase, Google Fonts,
  // dan CDN scanner library dibiarkan lewat network normal tanpa campur tangan SW.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
