const CACHE='private-trip-v4-white';
const VERSION='4';
const ASSETS=['./index.html','./manifest.webmanifest','./theme.css?v='+VERSION,'./enhance.js?v='+VERSION,'../icon.svg'];
const inject=html=>{
  let out=html.replace(/<meta name="theme-color" content="[^"]*">/,'<meta name="theme-color" content="#ffffff">');
  if(!out.includes('theme.css'))out=out.replace('</head>','<link rel="stylesheet" href="./theme.css?v='+VERSION+'"></head>');
  if(!out.includes('enhance.js'))out=out.replace('</body>','<script src="./enhance.js?v='+VERSION+'"></script></body>');
  return out;
};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const isPrivateNavigation=event.request.mode==='navigate'&&url.pathname.includes('/travel/ireland-scotland-2026/private');
  if(isPrivateNavigation){
    event.respondWith((async()=>{
      try{
        const response=await fetch('./index.html',{cache:'no-store'});
        return new Response(inject(await response.text()),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      }catch{
        const response=await caches.match('./index.html');
        if(!response)return new Response('Offline trip book unavailable',{status:503});
        return new Response(inject(await response.text()),{headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match('./index.html'))));
});