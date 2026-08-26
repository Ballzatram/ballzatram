const VERSION='13';
const CACHE=`private-trip-v${VERSION}-final`;
const CORE=[
  './index.html',
  './manifest.webmanifest',
  `./theme.css?v=${VERSION}`,
  `./polish.css?v=${VERSION}`,
  `./vault-v2.js?v=${VERSION}`,
  `./app-core.js?v=${VERSION}`,
  `./app-render.js?v=${VERSION}`,
  `./app-ui.js?v=${VERSION}`,
  './hero-art.svg',
  './apple-touch-icon.png',
  './app-icon-192.png',
  './app-icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const requests=CORE.map(asset=>new Request(new URL(asset,self.location.href).href,{cache:'reload'}));
      await cache.addAll(requests);
      await self.skipWaiting();
    }catch(error){
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    const legacyFound=keys.some(key=>key.startsWith('private-trip-')&&key!==CACHE);
    await Promise.all(keys.filter(key=>key.startsWith('private-trip-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();

    if(legacyFound){
      const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      await Promise.all(windows.map(async client=>{
        try{
          const url=new URL(client.url);
          if(url.searchParams.get('swv')!==VERSION){
            url.searchParams.set('swv',VERSION);
            await client.navigate(url.href);
          }
        }catch{}
      }));
    }
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  const isTripNavigation=event.request.mode==='navigate'&&url.pathname.includes('/travel/ireland-scotland-2026/private');
  if(isTripNavigation){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const cached=await cache.match('./index.html');
      if(cached)return cached;
      try{
        const response=await fetch(event.request,{cache:'no-store'});
        if(response.ok)await cache.put('./index.html',response.clone());
        return response;
      }catch{
        return new Response(
          '<!doctype html><meta name="viewport" content="width=device-width"><title>Trip unavailable</title><p style="font:16px/1.5 system-ui;padding:24px">The Celtic Kickoff Tour is not saved on this device yet. Connect once, open the trip book, and try again.</p>',
          {status:503,headers:{'Content-Type':'text/html; charset=utf-8'}}
        );
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    try{
      const response=await fetch(event.request);
      if(response.ok){
        const cache=await caches.open(CACHE);
        cache.put(event.request,response.clone()).catch(()=>{});
      }
      return response;
    }catch{
      return new Response('',{status:504,statusText:'Offline'});
    }
  })());
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING')self.skipWaiting();
});
