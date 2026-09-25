const PREFIX = 'family-business-';
const CACHE = `${PREFIX}native-v3`;
const ASSETS = ['./', './index.html', './campaign.css?v=1', './campaign-data.js?v=1', './campaign-engine.js?v=2', './campaign.js?v=ai-runtime-3', './manifest.webmanifest',
  '../../assets/family-business/meridian.svg', '../../assets/family-business/osiris.svg', '../../assets/family-business/press-start-2p.woff',
  '../../assets/ai-panel.css?v=ai-runtime-3', '../../assets/ai-config.js?v=ai-runtime-3', '../../assets/ai-features.js?v=ai-runtime-3', '../../assets/subscription-client.js?v=ai-runtime-3', '../../assets/ai-client.js?v=ai-runtime-3', '../../assets/ai-panel.js?v=ai-runtime-3'];
const ALLOWED = new Set(ASSETS.map(asset => new URL(asset, self.location.href).href));
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith(PREFIX) || key.startsWith('econ-arcade-living-world-')) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !ALLOWED.has(event.request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try { const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response; }
    catch { return (await cache.match(event.request)) || Response.error(); }
  })());
});
