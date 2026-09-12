const PREFIX = 'econ-arcade-living-world-';
const CACHE = `${PREFIX}v4`;
const ASSETS = ['./', './index.html', './world.css', './world.js', './manifest.webmanifest'];
const SHARED = new Set(ASSETS.map(asset => new URL(asset, self.location.href).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  // This origin also hosts other offline apps. Never delete their caches.
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(PREFIX) && key !== CACHE)
    .map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const scope = new URL('./', self.location.href).href;
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      !(url.href.startsWith(scope) || SHARED.has(url.href))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
