const CACHE='private-trip-v10-fast-load';
const VERSION='10';
const ASSETS=[
  './index.html',
  './manifest.webmanifest',
  './theme.css?v='+VERSION,
  './polish.css?v='+VERSION,
  './vault-v2.js?v='+VERSION,
  './unlock-fix.js?v='+VERSION,
  './performance-fix.js?v='+VERSION,
  './enhance.js?v='+VERSION,
  './navigation-fix.js?v='+VERSION,
  './hero-art.svg',
  './app-icon.svg'
];

const inject=html=>{
  let out=html
    .replace(/<meta name="theme-color" content="[^"]*">/,'<meta name="theme-color" content="#ffffff">')
    .replace(/<meta name="apple-mobile-web-app-title" content="[^"]*">/,'<meta name="apple-mobile-web-app-title" content="Celtic Kickoff">')
    .replace(/<title>[^<]*<\/title>/,'<title>Celtic Kickoff Tour — Private Trip</title>')
    .replace(/<link rel="stylesheet" href="\.\/(?:theme|polish)\.css(?:\?v=[^"]*)?"\s*\/?>/g,'')
    .replace(/<script src="\.\/(?:vault-v2|unlock-fix|performance-fix|enhance|navigation-fix)\.js(?:\?v=[^"]*)?"><\/script>/g,'')
    .replace(/<link rel="icon" href="[^"]*"(?: type="[^"]*")?\s*\/?>/g,'')
    .replace(/<link rel="apple-touch-icon" href="[^"]*"\s*\/?>/g,'');
  out=out.replace('</head>','<link rel="stylesheet" href="./theme.css?v='+VERSION+'"><link rel="stylesheet" href="./polish.css?v='+VERSION+'"><link rel="icon" href="./app-icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="./app-icon.svg"></head>');
  out=out.replace('</body>','<script src="./vault-v2.js?v='+VERSION+'"></script><script src="./unlock-fix.js?v='+VERSION+'"></script><script src="./performance-fix.js?v='+VERSION+'"></script><script src="./enhance.js?v='+VERSION+'"></script><script src="./navigation-fix.js?v='+VERSION+'"></script></body>');
  return out;
};

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  const isPrivateNavigation=event.request.mode==='navigate'&&url.pathname.includes('/travel/ireland-scotland-2026/private');
  if(isPrivateNavigation){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const cached=await cache.match('./index.html');

      // Return the local app shell immediately when available. Refresh it in
      // the background instead of blocking the user on a network round trip.
      if(cached){
        event.waitUntil((async()=>{
          try{
            const fresh=await fetch('./index.html',{cache:'no-store'});
            if(fresh.ok)await cache.put('./index.html',fresh.clone());
          }catch{}
        })());
        return new Response(inject(await cached.text()),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      }

      try{
        const response=await fetch('./index.html',{cache:'no-store'});
        if(response.ok)await cache.put('./index.html',response.clone());
        return new Response(inject(await response.text()),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      }catch{
        return new Response('Offline trip book unavailable',{status:503});
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }))
  );
});
