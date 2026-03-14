// FinDash Service Worker — stale-while-revalidate para shell, network-only para APIs
const CACHE_NAME = 'findash-v31';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/pdf.worker.min.js',
  '/manifest.json'
];

// Install: pre-cache o app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-only para APIs, stale-while-revalidate para shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora requests não-GET
  if (event.request.method !== 'GET') return;

  // Network-only para APIs internas e externas
  if (url.pathname.startsWith('/api/')) return;

  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    return;
  }

  // Stale-while-revalidate para assets do app shell
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        // Sempre tenta buscar do network em background
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok && url.origin === self.location.origin) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => null); // ignora erro de rede (offline)

        // Retorna cached imediatamente se disponível, senão espera a rede
        return cached || fetchPromise;
      })
    ).catch(() => {
      // Offline fallback — retorna o index.html cacheado para navegação
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
