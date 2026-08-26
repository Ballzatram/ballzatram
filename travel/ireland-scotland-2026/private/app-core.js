(()=>{
  'use strict';
  const VERSION='14';
  const CREDENTIAL_VERSION='2';
  const makeStore=name=>{
    const memory=new Map();
    const native=()=>{try{return globalThis[name];}catch{return null;}};
    return {
      get:key=>{try{return native()?.getItem(key)??(memory.has(key)?memory.get(key):null);}catch{return memory.has(key)?memory.get(key):null;}},
      set:(key,value)=>{const text=String(value);memory.set(key,text);try{native()?.setItem(key,text);}catch{}},
      remove:key=>{memory.delete(key);try{native()?.removeItem(key);}catch{}}
    };
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalizeKey=value=>String(value??'').trim().replace(/^`+|`+$/g,'').replace(/[–—−]/g,'-').replace(/\s+/g,'').toLowerCase();
  const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
  const parseDate=text=>{
    const m=String(text).match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,\s*(\d{4}))?/i);
    return m?new Date(Number(m[3]||2026),months.indexOf(m[1].toLowerCase()),Number(m[2]),12):null;
  };
  const sameDay=(a,b)=>a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const appleMaps=(from,to,mode)=>'https://maps.apple.com/?'+new URLSearchParams({saddr:from,daddr:to,dirflg:mode==='walking'?'w':'d'}).toString();
  const previewUrl=route=>{
    const waypoints=route.waypoints||[];
    const destination=waypoints.length?waypoints.map(point=>'to:'+point).concat(route.destination).join('+'):route.destination;
    return 'https://maps.google.com/maps?f=d&hl=en&saddr='+encodeURIComponent(route.origin)+'&daddr='+encodeURIComponent(destination)+'&dirflg='+(route.mode==='walking'?'w':'d')+'&output=embed';
  };
  const profile=title=>{
    const text=String(title).toLowerCase();
    if(/flight|airport|land at|depart|arrival/.test(text))return ['flight','✈️'];
    if(/taxi|uber|pickup|drive|car /.test(text))return ['transport','🚕'];
    if(/game|pregame|kickoff|aviva|pep rally|band marches|band & spirit|post-game/.test(text))return ['game','🏈'];
    if(/breakfast|lunch|dinner|restaurant|afternoon tea|vintage kitchen|old mill|larder|rhubarb|palm court/.test(text))return ['food','🍽️'];
    if(/guinness|jameson|pub|bar|whiski|world.s end|ensign|deacon/.test(text))return ['pub','🍻'];
    if(/golf|links/.test(text))return ['golf','⛳'];
    if(/hotel|check.?in|rest|hilton|address connolly/.test(text))return ['hotel','🛎️'];
    if(/walk|hike|seat|loch|arthur|viewpoint|water of leith|garden|hill|ruins|grassmarket|victoria street|circus lane/.test(text))return ['outdoors','🥾'];
    if(/tour|trinity|book of kells|palace|parliament|kirkyard|castle|holyrood|close|lawnmarket/.test(text))return ['culture','🎟️'];
    if(/shop|grafton/.test(text))return ['shopping','🛍️'];
    return ['moment','✦'];
  };
  const decrypt=async key=>{
    const vault=globalThis.CELTIC_VAULT_V2;
    if(!vault)throw new Error('Encrypted trip data is unavailable. Reload once while online.');
    if(!crypto?.subtle)throw new Error('This browser does not support local trip decryption.');
    if(typeof DecompressionStream!=='function')throw new Error('This browser is too old to open the offline trip book.');
    const bytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
    const source=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),'PBKDF2',false,['deriveKey']);
    const derived=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(vault.salt),iterations:vault.iterations,hash:'SHA-256'},source,{name:'AES-GCM',length:256},false,['decrypt']);
    const packed=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(vault.iv)},derived,bytes(vault.ciphertext));
    const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  };

  globalThis.CelticTripApp={
    VERSION,
    CREDENTIAL_VERSION,
    keys:{saved:'celtic-kickoff-key',credential:'celtic-kickoff-credential-version',active:'celtic-kickoff-active-day'},
    legacy:{
      saved:['celtic-kickoff-key-v12','celtic-kickoff-key-v3','celtic-kickoff-key-v2','trip-key'],
      active:['celtic-kickoff-active-day-v12'],
      cleanup:['trip-key-version','celtic-kickoff-manual-lock-v12','celtic-kickoff-sw-reload-v12']
    },
    persistent:makeStore('localStorage'),
    session:makeStore('sessionStorage'),
    state:{trip:null,activeDay:0,unlocked:false,offlineReady:false,mapObserver:null,copyPayloads:new Map(),countdownTimer:null,eventSerial:0},
    byId:id=>document.getElementById(id),esc,normalizeKey,parseDate,sameDay,appleMaps,previewUrl,profile,decrypt
  };
})();
