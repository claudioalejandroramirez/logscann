const CACHE_NAME = 'velozz-flex-v6'; // Subi para v5

const ASSETS = [
  './',
  './index.html',
  './style.css',      // NOVO
  './config.js',      // NOVO
  './app.js',         // NOVO
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './screenshot-mobile.png',
  './screenshot-desktop.png',
  'https://fonts.googleapis.com/css2?family=Space+Mono&family=Barlow+Condensed:wght@400;700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key); // Apaga caches antigos
        }
      })
    ))
  );
});

// Estratégia "Network First, Falling back to Cache"
self.addEventListener('fetch', event => {
  // Ignora requisições que não sejam http/https (evita bugs internos do navegador)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se a internet funcionar, clona a resposta e atualiza o cache (garante lista nova de operadores)
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Se estiver offline no galpão, carrega da memória (Cache)
        return caches.match(event.request);
      })
  );
});