const CACHE_NAME = 'p6-sample-manager';
const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
const FALLBACK_DOCUMENT = './index.html';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function storeResponse(request, response) {
  if (!response.ok) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
}

async function staleWhileRevalidate(event) {
  const cached = await caches.match(event.request);
  const fromNetwork = fetch(event.request).then(async (response) => {
    await storeResponse(event.request, response.clone());
    return response;
  });
  if (!cached) return fromNetwork;
  event.waitUntil(fromNetwork.catch(() => undefined));
  return cached;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  await storeResponse(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    await storeResponse(request, response.clone());
    return response;
  } catch (networkError) {
    const cached = (await caches.match(request)) ?? (await caches.match(FALLBACK_DOCUMENT));
    if (cached) return cached;
    throw networkError;
  }
}

async function cacheMissing(urls) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(urls.map(async (url) => {
    if (await cache.match(url)) return;
    try {
      const response = await fetch(url);
      if (response.ok) await cache.put(url, response);
    } catch (networkError) {
      console.warn('Ressource absente du cache hors-ligne', url, networkError);
    }
  }));
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache-urls') return;
  event.waitUntil(cacheMissing(event.data.urls));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const origin = new URL(event.request.url).origin;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }
  if (FONT_ORIGINS.includes(origin)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  if (origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
