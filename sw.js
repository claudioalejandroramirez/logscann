const CACHE_NAME = 'velozz-flex-v15';

const ASSETS = [
  './',
  './index.html',
  './src/css/style.css',
  './src/config.js',
  './src/js/ui.js',
  './src/js/registry.js',
  './src/js/session.js',
  './src/js/scanner.js',
  './src/js/collage.js',
  './src/js/audio.js',
  './src/js/export.js',
  './src/js/main.js',
  './manifest.json',
  './public/icons/icon-192.png',
  './public/icons/icon-512.png',
  './public/images/screenshot-mobile.png',
  './public/images/screenshot-desktop.png',
  'https://fonts.googleapis.com/css2?family=Space+Mono&family=Barlow+Condensed:wght@400;700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
