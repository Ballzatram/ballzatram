(()=>{
  'use strict';
  const A=globalThis.CelticTripApp;
  if(!A)throw new Error('Celtic trip core did not load');
  const {state,byId,normalizeKey}=A;

  const setBusy=busy=>{
    const button=byId('unlock');
    if(!button)return;
    button.disabled=busy;
    button.setAttribute('aria-busy',busy?'true':'false');
    button.textContent=busy?'Opening trip book…':'Open the trip book';
  };

  const fallbackCopy=text=>{
    const area=document.createElement('textarea');
    area.value=text;
    area.readOnly=true;
    area.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(area);
    area.select();
    const ok=document.execCommand('copy');
    area.remove();
    return ok;
  };

  const copyDetails=async button=>{
    const text=state.copyPayloads.get(button.dataset.copyId);
    if(!text)return;
    let ok=false;
    try{await navigator.clipboard.writeText(text);ok=true;}catch{ok=fallbackCopy(text);}
    const original=button.textContent;
    button.textContent=ok?'Copied':'Press and hold details to copy';
    button.classList.toggle('copied',ok);
    setTimeout(()=>{button.textContent=original;button.classList.remove('copied');},1800);
  };

  const updateCountdown=()=>{
    const target=new Date('2026-08-29T17:00:00+01:00');
    const diff=target-new Date();
    const value=byId('gameCountdown');
    const label=byId('gameCountdownLabel');
    if(!value||!label)return;
    if(diff<=-21600000){value.textContent='Frogs abroad';label.textContent='a game-day memory';return;}
    if(diff<=0){value.textContent='It’s game time';label.textContent='kickoff is here';return;}
    const days=Math.floor(diff/86400000);
    const hours=Math.floor((diff%86400000)/3600000);
    const minutes=Math.floor((diff%3600000)/60000);
    value.textContent=days>0?`${days}d ${hours}h`:`${hours}h ${minutes}m`;
    label.textContent=days===0?'until kickoff today':'until kickoff';
  };

  const updateConnectivity=()=>{
    const badge=byId('connectivity');
    const copy=badge?.querySelector('.status-copy');
    if(!badge||!copy)return;
    badge.classList.remove('online','offline','preparing');
    if(!navigator.onLine){
      badge.classList.add('offline');
      copy.textContent='Offline mode · itinerary and route text available';
    }else if(state.offlineReady){
      badge.classList.add('online');
      copy.textContent='Offline copy ready';
    }else{
      badge.classList.add('preparing');
      copy.textContent='Preparing offline copy…';
    }
    document.querySelectorAll('.map-load').forEach(button=>{
      button.disabled=!navigator.onLine;
      button.textContent=navigator.onLine?'Show map now':'Map needs a connection';
    });
    if(navigator.onLine)A.observeMaps?.();
  };

  const showApp=()=>{
    state.unlocked=true;
    document.body.classList.remove('auto-unlocking');
    byId('lock').hidden=true;
    byId('lock').setAttribute('aria-hidden','true');
    byId('app').hidden=false;
    byId('app').setAttribute('aria-hidden','false');
    byId('app').style.setProperty('display','block','important');
    document.body.classList.add('trip-unlocked');
    updateConnectivity();
    updateCountdown();
    clearInterval(state.countdownTimer);
    state.countdownTimer=setInterval(updateCountdown,60000);
    requestAnimationFrame(()=>scrollTo({top:0,behavior:'auto'}));
  };

  const unlock=async({automatic=false}={})=>{
    const input=byId('pw');
    const error=byId('err');
    const key=normalizeKey(input.value);
    input.value=key;
    error.textContent='';
    if(!key){
      document.body.classList.remove('auto-unlocking');
      error.textContent='Paste or enter the access key first.';
      input.focus();
      return;
    }

    setBusy(true);
    try{
      const trip=await A.decrypt(key);
      A.persistent.set(A.keys.saved,key);
      A.persistent.set(A.keys.credential,A.CREDENTIAL_VERSION);
      A.renderTrip(trip);
      showApp();
    }catch(cause){
      document.body.classList.remove('auto-unlocking');
      const message=cause?.message||'';
      const environmental=/unavailable|browser|too old/i.test(message);
      if(!environmental)A.persistent.remove(A.keys.saved);
      error.textContent=environmental?message:'That key did not unlock this copy. Paste the current key and try again.';
      if(!automatic||!environmental){input.focus();input.select();}
      console.warn('Trip unlock failed',cause);
    }finally{
      setBusy(false);
    }
  };

  const handleAppClick=event=>{
    const day=event.target.closest('[data-day-index]');
    if(day&&byId('app').contains(day)){
      event.preventDefault();
      A.activateDay(Number(day.dataset.dayIndex));
      return;
    }
    const load=event.target.closest('[data-action="load-map"]');
    if(load){
      event.preventDefault();
      A.loadMap(load.closest('.trip-map-card'));
      return;
    }
    const copy=event.target.closest('[data-copy-id]');
    if(copy){
      event.preventDefault();
      copyDetails(copy);
    }
  };

  const handleNavKeys=event=>{
    const target=event.target.closest('#nav .pill[data-day-index]');
    if(!target)return;
    const tabs=[...document.querySelectorAll('#nav .pill[data-day-index]')];
    const current=tabs.indexOf(target);
    let next=null;
    if(event.key==='ArrowRight')next=(current+1)%tabs.length;
    if(event.key==='ArrowLeft')next=(current-1+tabs.length)%tabs.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=tabs.length-1;
    if(next===null)return;
    event.preventDefault();
    A.activateDay(next,{scroll:false});
    tabs[next].focus();
  };

  const migrateStoredState=()=>{
    const credential=A.persistent.get(A.keys.credential);
    if(credential!==A.CREDENTIAL_VERSION){
      A.persistent.remove(A.keys.saved);
      for(const oldKey of A.legacy.saved||[])A.persistent.remove(oldKey);
      A.persistent.set(A.keys.credential,A.CREDENTIAL_VERSION);
    }

    const saved=normalizeKey(A.persistent.get(A.keys.saved));
    if(saved)A.persistent.set(A.keys.saved,saved);

    if(!A.session.get(A.keys.active)){
      for(const oldKey of A.legacy.active||[]){
        const oldValue=A.session.get(oldKey);
        if(oldValue!==null){A.session.set(A.keys.active,oldValue);break;}
      }
    }
    for(const oldKey of A.legacy.active||[])A.session.remove(oldKey);
    for(const oldKey of A.legacy.cleanup||[]){A.persistent.remove(oldKey);A.session.remove(oldKey);}
    return saved;
  };

  const offlineAssets=[
    './index.html',
    './manifest.webmanifest',
    './vault-v2.js?v=14',
    './app-core.js?v=14',
    './app-render.js?v=14',
    './app-ui.js?v=14',
    './theme.css?v=14',
    './polish.css?v=14',
    './hero-art.svg',
    './app-icon-180.png'
  ];

  const verifyOfflineCopy=async()=>{
    if(!('caches' in globalThis))return false;
    try{
      const cache=await caches.open('private-trip-v14-final');
      const matches=await Promise.all(offlineAssets.map(asset=>cache.match(asset)));
      return matches.every(Boolean);
    }catch{return false;}
  };

  const waitForOfflineCopy=async()=>{
    for(let attempt=0;attempt<28;attempt+=1){
      if(await verifyOfflineCopy())return true;
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    return false;
  };

  const setupWorker=async()=>{
    const badge=byId('connectivity');
    if(!('serviceWorker' in navigator)){
      if(badge){badge.className='connectivity-badge offline';badge.querySelector('.status-copy').textContent='Offline install is not supported in this browser';}
      return;
    }
    const refreshOfflineState=async()=>{state.offlineReady=await waitForOfflineCopy();updateConnectivity();};
    try{
      const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      registration.update().catch(()=>{});
      await navigator.serviceWorker.ready;
      await refreshOfflineState();
      navigator.serviceWorker.addEventListener('controllerchange',()=>{refreshOfflineState().catch(()=>{});});
    }catch(error){
      console.warn('Offline setup failed',error);
      if(badge){badge.className='connectivity-badge offline';badge.querySelector('.status-copy').textContent='Offline copy could not be prepared';}
    }
  };

  const initialise=()=>{
    byId('unlock').addEventListener('click',()=>unlock());
    byId('pw').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();unlock();}});
    byId('app').addEventListener('click',handleAppClick);
    byId('nav').setAttribute('role','tablist');
    byId('nav').addEventListener('keydown',handleNavKeys);
    byId('install').addEventListener('click',()=>alert('On iPhone: open this page in Safari, tap Share, choose “Add to Home Screen,” then tap Add. Once this device has been unlocked, future visits open automatically. Open the trip once online before relying on offline mode.'));
    addEventListener('online',updateConnectivity);
    addEventListener('offline',updateConnectivity);
    addEventListener('pagehide',()=>{clearInterval(state.countdownTimer);state.mapObserver?.disconnect();},{once:true});

    const saved=migrateStoredState();
    if(saved){
      byId('pw').value=saved;
      document.body.classList.add('auto-unlocking');
      unlock({automatic:true});
    }

    setupWorker();
    updateConnectivity();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialise,{once:true});
  else initialise();
})();
