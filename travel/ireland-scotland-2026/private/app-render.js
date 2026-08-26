(()=>{
  'use strict';
  const A=globalThis.CelticTripApp;
  if(!A)throw new Error('Celtic trip core did not load');
  const {state,esc,appleMaps,previewUrl,profile,parseDate,sameDay,byId}=A;

  const renderRoute=route=>{
    if(!route?.origin||!route?.destination)return '';
    const mode=route.mode||'walking';
    const stops=[route.origin,...(route.waypoints||[]),route.destination];
    const routeStops=stops.map((stop,index)=>`<div class="route-dot">${index+1}</div><div class="route-stop"><strong>${index===0?'Start':index===stops.length-1?'Destination':'Stop '+index}</strong><br>${esc(stop)}</div>`).join('');
    const legs=stops.slice(0,-1).map((start,index)=>`<a class="apple-leg" target="_blank" rel="noopener" href="${esc(appleMaps(start,stops[index+1],mode))}"> Leg ${index+1}: ${esc(stops[index+1])}</a>`).join('');
    const mapTitle=mode==='walking'?'Walking route':'Driving route';
    const note=(route.waypoints||[]).length?'Apple Maps opens each segment separately. Use the numbered leg buttons in order.':'The start, destination, and travel mode are prefilled when Apple Maps opens.';
    return `<div class="trip-map-card" data-map-src="${esc(previewUrl(route))}" data-map-title="${mapTitle}">
      <div class="trip-map-head"><span>🗺 ${mapTitle} preview</span><span>${mode==='walking'?'On foot':'By car'}</span></div>
      <div class="map-preview"><div class="map-placeholder"><span class="map-placeholder-icon">🗺️</span><strong>Visual route map</strong><span>Loads only when this map comes into view</span><button class="map-load" type="button" data-action="load-map">Show map now</button></div></div>
      <div class="route-summary">${routeStops}</div>
      <div class="trip-map-actions"><a class="route apple-route" target="_blank" rel="noopener" href="${esc(appleMaps(route.origin,stops[1]||route.destination,mode))}">${(route.waypoints||[]).length?'Open first leg':'Open route'} in Apple Maps</a></div>
      <div class="trip-map-note">${note}${legs?`<div class="apple-legs">${legs}</div>`:''}<div class="map-provider-note">Route text remains available offline. The visual map and turn-by-turn navigation need a connection or downloaded maps.</div></div>
    </div>`;
  };

  const renderEvent=(event,isGameDay)=>{
    state.eventSerial+=1;
    const [type,icon]=profile(event.title);
    const details=Array.isArray(event.details)?event.details:[];
    const booking=details.filter(text=>/reservation|booking|confirmation|ticket|record locator|seat|code|hilton honors|frequent flyer/i.test(text));
    const gameRelated=isGameDay||/game|pregame|kickoff|aviva|pep rally|band/i.test(event.title||'');
    const copyId='copy-'+state.eventSerial;
    if(booking.length)state.copyPayloads.set(copyId,[event.title,...booking].join('\n'));
    return `<article class="event type-${type}"><div class="time">${esc(event.time||'')}</div><div><span class="event-icon" aria-hidden="true">${icon}</span><h3>${esc(event.title||'Trip moment')}</h3>${details.length?`<ul class="details">${details.map(detail=>`<li>${esc(detail)}</li>`).join('')}</ul>`:''}${(booking.length||gameRelated)?`<div class="event-chips">${booking.length?'<span class="event-chip booked">✓ Details saved</span>':''}${gameRelated?'<span class="event-chip game">Go Frogs</span>':''}${booking.length?`<button class="copy-details" type="button" data-copy-id="${copyId}">Copy booking details</button>`:''}</div>`:''}${renderRoute(event.route)}</div></article>`;
  };

  const renderDay=(day,index,meta,gameIndex,total)=>{
    let content='';
    if(Array.isArray(day.sections)){
      for(const section of day.sections){
        content+=`<h3 class="sectionTitle">${esc(section.name)}</h3>`+(section.events||[]).map(event=>renderEvent(event,index===gameIndex)).join('');
      }
    }else content=(day.events||[]).map(event=>renderEvent(event,index===gameIndex)).join('');
    const previous=index>0?`<button class="day-control prev ${index-1===gameIndex?'game-control':''}" type="button" data-day-index="${index-1}"><span>← Previous chapter</span><strong>${esc(state.trip.days[index-1].date)}</strong></button>`:'<button class="day-control prev" type="button" disabled><span>← Previous chapter</span><strong>Trip begins here</strong></button>';
    const next=index<total-1?`<button class="day-control next ${index+1===gameIndex?'game-control':''}" type="button" data-day-index="${index+1}"><span>Next chapter →</span><strong>${esc(state.trip.days[index+1].date)}</strong></button>`:'<button class="day-control next" type="button" disabled><span>Next chapter →</span><strong>Homeward bound</strong></button>';
    return `<section class="day ${meta.type==='game'?'game-day':meta.type}" id="trip-day-${index}" role="tabpanel" aria-labelledby="trip-day-tab-${index}"><div class="dayhead"><h2 id="trip-day-title-${index}">${esc(day.date)}</h2><p>${esc(day.city||'')}</p><span class="day-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span></div>${content}<div class="day-controls">${previous}${next}</div></section>`;
  };

  const metaFor=(day,index,gameIndex,firstScotland)=>{
    const isGame=index===gameIndex;
    const isScotland=!isGame&&(index>=firstScotland||/edinburgh|scotland/i.test(day.city||''));
    const type=isGame?'game':isScotland?'scotland':'ireland';
    const date=parseDate(day.date);
    let icon=type==='game'?'🏈':type==='scotland'?'✦':'☘';
    if(/August 26|September 2/i.test(day.date))icon='✈️';
    if(/August 28/i.test(day.date))icon='⛳';
    if(/August 30/i.test(day.date))icon='🏰';
    if(/September 1/i.test(day.date))icon='🥾';
    return {type,date,icon};
  };

  const loadMap=card=>{
    if(!card||card.dataset.mapLoaded==='1')return;
    const preview=card.querySelector('.map-preview');
    if(!preview||!card.dataset.mapSrc)return;
    if(!navigator.onLine){const button=preview.querySelector('.map-load');if(button){button.disabled=true;button.textContent='Map needs a connection';}return;}
    card.dataset.mapLoaded='1';
    const iframe=document.createElement('iframe');
    iframe.loading='lazy';iframe.referrerPolicy='no-referrer-when-downgrade';iframe.allowFullscreen=true;iframe.title=card.dataset.mapTitle||'Route preview';iframe.src=card.dataset.mapSrc;
    preview.replaceChildren(iframe);
  };

  const observeMaps=()=>{
    state.mapObserver?.disconnect();
    const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;if(!navigator.onLine||connection?.saveData||/2g/.test(connection?.effectiveType||''))return;
    const cards=[...document.querySelectorAll('.day.active .trip-map-card:not([data-map-loaded="1"])')];
    if(!cards.length||!('IntersectionObserver' in window))return;
    state.mapObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){loadMap(entry.target);state.mapObserver?.unobserve(entry.target);}}),{rootMargin:'40px 0px',threshold:.1});
    cards.forEach(card=>state.mapObserver.observe(card));
  };

  const activateDay=(index,{scroll=true,behavior='smooth'}={})=>{
    const days=[...document.querySelectorAll('.day')];
    const pills=[...document.querySelectorAll('#nav .pill[data-day-index]')];
    if(!Number.isInteger(index)||index<0||index>=days.length)return;
    state.activeDay=index;A.session.set(A.keys.active,String(index));
    days.forEach((day,i)=>{const active=i===index;day.classList.toggle('active',active);day.setAttribute('aria-hidden',active?'false':'true');});
    pills.forEach((pill,i)=>{const active=i===index;pill.classList.toggle('active',active);pill.setAttribute('aria-current',active?'date':'false');pill.setAttribute('aria-selected',active?'true':'false');});
    pills[index]?.scrollIntoView({behavior,block:'nearest',inline:'center'});observeMaps();
    if(scroll)requestAnimationFrame(()=>{const navHeight=byId('nav')?.getBoundingClientRect().height||0;const top=days[index].getBoundingClientRect().top+scrollY-navHeight-18;scrollTo({top:Math.max(0,top),behavior});});
  };

  const renderTrip=trip=>{
    state.trip=trip;state.copyPayloads.clear();state.eventSerial=0;
    const days=trip.days||[];
    const gameIndex=Math.max(0,days.findIndex(day=>/August 29/i.test(day.date||'')||/Aviva Stadium|Game at Aviva/i.test(JSON.stringify(day))));
    let firstScotland=days.findIndex(day=>/August 30|August 31|September 1|Edinburgh/i.test((day.date||'')+' '+(day.city||'')));
    if(firstScotland<0)firstScotland=Math.min(gameIndex+1,days.length-1);
    const nav=byId('nav'),container=byId('days');nav.innerHTML='';container.innerHTML='';
    days.forEach((day,index)=>{
      const meta=metaFor(day,index,gameIndex,firstScotland),date=meta.date;
      const button=document.createElement('button');button.type='button';button.id='trip-day-tab-'+index;button.className=`pill ${meta.type==='game'?'game-pill':meta.type+'-pill'}`;button.dataset.dayIndex=String(index);button.setAttribute('role','tab');button.setAttribute('aria-controls','trip-day-'+index);button.setAttribute('aria-selected','false');button.setAttribute('aria-label','Show '+(date?date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}):day.date));
      if(date&&sameDay(date,new Date()))button.classList.add('today');
      button.innerHTML=`<span class="nav-icon">${meta.icon}</span><span class="nav-dow">${date?esc(date.toLocaleDateString('en-US',{weekday:'short'})):''}</span><span class="nav-date">${date?esc(date.toLocaleDateString('en-US',{month:'short',day:'numeric'})):esc(day.date)}</span>`;
      nav.appendChild(button);container.insertAdjacentHTML('beforeend',renderDay(day,index,meta,gameIndex,days.length));
    });
    const saved=Number(A.session.get(A.keys.active)),now=new Date(),today=days.findIndex(day=>sameDay(parseDate(day.date),now));
    const lastDate=parseDate(days.at(-1)?.date);
    const fallback=today>=0?today:(lastDate&&now>lastDate?days.length-1:0);
    state.activeDay=Number.isInteger(saved)&&saved>=0&&saved<days.length?saved:fallback;
    activateDay(state.activeDay,{scroll:false,behavior:'auto'});
  };

  Object.assign(A,{renderTrip,activateDay,loadMap,observeMaps});
})();
