(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const apple=(from,to,mode)=>'https://maps.apple.com/?'+new URLSearchParams({saddr:from,daddr:to,dirflg:mode==='walking'?'w':'d'}).toString();
  const monthNames=['january','february','march','april','may','june','july','august','september','october','november','december'];
  const parseTripDate=text=>{
    const match=String(text).match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i);
    if(!match)return null;
    return new Date(Number(match[3]),monthNames.indexOf(match[1].toLowerCase()),Number(match[2]),12,0,0);
  };
  const sameDay=(a,b)=>a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const compactDate=date=>date?date.toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
  const fullDate=date=>date?date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}):'';

  const setUnlockScene=()=>{
    const lock=document.getElementById('lock');
    if(!lock)return;
    const badge=lock.querySelector('.badge');
    const heading=lock.querySelector('h1');
    const copy=lock.querySelector('.sub');
    const button=document.getElementById('unlock');
    if(badge)badge.textContent='Private trip pass';
    if(heading)heading.textContent='The Celtic Kickoff Tour';
    if(copy)copy.textContent='Unlock your private Dublin, TCU game-day, and Edinburgh travel book — complete with reservations, route previews, and Apple Maps directions.';
    if(button)button.textContent='Open the trip book';
    if(!lock.querySelector('.lock-stickers')&&copy){
      copy.insertAdjacentHTML('afterend','<div class="lock-stickers" aria-label="Trip themes"><span class="lock-sticker ireland">☘ Dublin</span><span class="lock-sticker tcu">🏈 TCU in Ireland</span><span class="lock-sticker scotland">✦ Edinburgh</span></div>');
    }
  };

  const eventProfile=title=>{
    const text=String(title).toLowerCase();
    if(/flight|airport|land at|depart|arrival/.test(text))return {type:'flight',icon:'✈️'};
    if(/taxi|uber|pickup|drive|car /.test(text))return {type:'transport',icon:'🚕'};
    if(/game|pregame|kickoff|aviva|pep rally|band marches|band & spirit|post-game/.test(text))return {type:'game',icon:'🏈'};
    if(/breakfast|lunch|dinner|restaurant|afternoon tea|vintage kitchen|old mill|larder|rhubarb|palm court/.test(text))return {type:'food',icon:'🍽️'};
    if(/guinness|jameson|pub|bar|whiski|world.s end|ensign|deacon/.test(text))return {type:'pub',icon:'🍻'};
    if(/golf|links/.test(text))return {type:'golf',icon:'⛳'};
    if(/hotel|check.?in|rest|hilton|address connolly/.test(text))return {type:'hotel',icon:'🛎️'};
    if(/walk|hike|seat|loch|arthur|viewpoint|water of leith|garden|hill|ruins|grassmarket|victoria street|circus lane/.test(text))return {type:'outdoors',icon:'🥾'};
    if(/tour|trinity|book of kells|palace|parliament|kirkyard|castle|holyrood|close|lawnmarket/.test(text))return {type:'culture',icon:'🎟️'};
    if(/shop|grafton/.test(text))return {type:'shopping',icon:'🛍️'};
    return {type:'moment',icon:'✦'};
  };

  const dayIcon=(dateText,isGame,isScotland)=>{
    if(isGame)return '🏈';
    if(/August 26|September 2/.test(dateText))return '✈️';
    if(/August 28/.test(dateText))return '⛳';
    if(/August 30/.test(dateText))return '🏰';
    if(/September 1/.test(dateText))return '🥾';
    if(isScotland)return '✦';
    return '☘';
  };

  const enhance=()=>{
    if(document.body.dataset.celticKickoffEnhanced)return;
    document.body.dataset.celticKickoffEnhanced='1';
    setUnlockScene();
    document.title='Celtic Kickoff Tour — Private Trip';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#ffffff');

    const toolbar=document.querySelector('.toolbar');
    if(toolbar){
      const install=document.getElementById('install');
      const forget=document.getElementById('forget');
      if(install)install.textContent='Add trip to Home Screen';
      if(forget)forget.textContent='Forget saved trip key';
    }
    const footer=document.querySelector('.footer');
    if(footer)footer.textContent='The full trip book is available after the first successful offline save. Route details remain in the app; live map imagery and turn-by-turn navigation depend on Apple Maps or maps downloaded on your device.';

    let prepared=false;
    let countdownTimer=null;

    const selectDay=index=>{
      const pill=[...document.querySelectorAll('#nav .pill:not(.lockout)')][index];
      if(pill){
        pill.click();
        setTimeout(()=>pill.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}),30);
      }
    };

    const makeHero=(dayEls,gameIndex,firstScotlandIndex)=>{
      const header=document.querySelector('.app header');
      if(!header||header.classList.contains('trip-hero'))return;
      header.className='trip-hero';
      header.innerHTML=`
        <div class="hero-copy">
          <div class="hero-kicker">Frogs across the pond · 2026</div>
          <h1>Celtic Kickoff Tour</h1>
          <p class="hero-route"><span>Dublin</span><span class="route-arrow">→</span><span>Aviva Stadium</span><span class="route-arrow">→</span><span>Edinburgh</span></p>
          <div class="hero-tags">
            <span class="hero-tag ireland">☘ Ireland</span>
            <span class="hero-tag game">🏈 TCU vs UNC</span>
            <span class="hero-tag scotland">✦ Scotland</span>
          </div>
          <div class="hero-privacy">🔒 Encrypted private trip book · offline-ready</div>
        </div>
        <div class="hero-visual">
          <img src="./hero-art.svg" alt="Illustrated route from Dublin through the TCU game at Aviva Stadium to Edinburgh">
          <div class="hero-stamp" aria-hidden="true"><div><span>☘</span>Passport<br>approved</div></div>
        </div>`;

      if(!document.querySelector('.trip-overview')){
        const overview=document.createElement('div');
        overview.className='trip-overview';
        overview.setAttribute('aria-label','Jump to a trip chapter');
        overview.innerHTML=`
          <button class="story-card ireland" type="button" data-day="1"><span class="story-go">→</span><span class="story-icon">☘</span><strong>Dublin</strong><span>Pubs, Trinity, game-week energy</span></button>
          <button class="story-card game" type="button" data-day="${gameIndex}"><span class="story-go">→</span><span class="story-icon">🏈</span><strong>Game Day</strong><span>TCU vs UNC at Aviva Stadium</span></button>
          <button class="story-card scotland" type="button" data-day="${firstScotlandIndex}"><span class="story-go">→</span><span class="story-icon">🏰</span><strong>Edinburgh</strong><span>Royal Mile, Arthur’s Seat, tea</span></button>`;
        header.insertAdjacentElement('afterend',overview);
        overview.addEventListener('click',event=>{
          const button=event.target.closest('[data-day]');
          if(button)selectDay(Number(button.dataset.day));
        });
      }
    };

    const makeGameBanner=gameIndex=>{
      if(document.querySelector('.game-banner'))return;
      const overview=document.querySelector('.trip-overview');
      if(!overview)return;
      const banner=document.createElement('section');
      banner.className='game-banner';
      banner.setAttribute('aria-label','TCU versus North Carolina game-day details');
      banner.innerHTML=`
        <div class="game-banner-copy">
          <div class="game-eyebrow">Aer Lingus College Football Classic</div>
          <h2>TCU <span class="vs">vs</span> UNC</h2>
          <div class="game-meta">
            <span>📍 <strong>Aviva Stadium</strong></span>
            <span>🗓 Saturday, Aug 29</span>
            <span>⏰ 5:00 PM IST</span>
          </div>
        </div>
        <div class="game-banner-side">
          <div class="game-countdown"><strong id="gameCountdown">Loading…</strong><span id="gameCountdownLabel">until kickoff</span></div>
          <button class="game-jump" type="button">Open Game Day →</button>
          <div class="game-wear">Wear purple</div>
        </div>`;
      overview.insertAdjacentElement('afterend',banner);
      banner.querySelector('.game-jump')?.addEventListener('click',()=>selectDay(gameIndex));

      const updateCountdown=()=>{
        const target=new Date('2026-08-29T17:00:00+01:00');
        const now=new Date();
        const diff=target-now;
        const value=document.getElementById('gameCountdown');
        const label=document.getElementById('gameCountdownLabel');
        if(!value||!label)return;
        if(diff<=-6*60*60*1000){value.textContent='Frogs abroad';label.textContent='a game-day memory';return;}
        if(diff<=0){value.textContent='It’s game time';label.textContent='kickoff is here';return;}
        const days=Math.floor(diff/86400000);
        const hours=Math.floor((diff%86400000)/3600000);
        const mins=Math.floor((diff%3600000)/60000);
        value.textContent=days>0?`${days}d ${hours}h`:`${hours}h ${mins}m`;
        label.textContent=days===0?'until kickoff today':'until kickoff';
      };
      updateCountdown();
      countdownTimer=setInterval(updateCountdown,60000);
    };

    const decorateNav=(dayEls,gameIndex)=>{
      const pills=[...document.querySelectorAll('#nav .pill:not(.lockout)')];
      const today=new Date();
      dayEls.forEach((day,index)=>{
        const pill=pills[index];
        if(!pill)return;
        const dateText=day.querySelector('.dayhead h2')?.textContent||'';
        const date=parseTripDate(dateText);
        const isGame=index===gameIndex;
        const isScotland=day.classList.contains('scotland');
        pill.classList.toggle('ireland-pill',day.classList.contains('ireland'));
        pill.classList.toggle('scotland-pill',isScotland);
        pill.classList.toggle('game-pill',isGame);
        const icon=dayIcon(dateText,isGame,isScotland);
        const dow=date?date.toLocaleDateString('en-US',{weekday:'short'}):'';
        const label=date?compactDate(date):pill.textContent;
        pill.innerHTML=`<span class="nav-icon">${icon}</span><span class="nav-dow">${esc(dow)}</span><span class="nav-date">${esc(label)}</span>`;
        pill.dataset.tripDate=date?date.toISOString().slice(0,10):'';
        if(date&&sameDay(date,today))pill.classList.add('today');
        pill.setAttribute('aria-label','Show '+(date?fullDate(date):dateText));
      });

      const sync=()=>{
        pills.forEach(pill=>pill.setAttribute('aria-current',pill.classList.contains('active')?'date':'false'));
        pills.find(pill=>pill.classList.contains('active'))?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
      };
      const nav=document.getElementById('nav');
      if(nav&&!nav.dataset.celticReady){
        nav.dataset.celticReady='1';
        nav.addEventListener('click',()=>setTimeout(sync,0));
      }
      sync();

      if(!document.body.dataset.autoDaySelected){
        document.body.dataset.autoDaySelected='1';
        const match=pills.findIndex(pill=>pill.classList.contains('today'));
        if(match>=0)selectDay(match);
      }
    };

    const decorateEvent=(event,isGameDay)=>{
      if(event.dataset.storyReady)return;
      event.dataset.storyReady='1';
      const title=event.querySelector('h3')?.textContent||'Trip moment';
      const profile=eventProfile(title);
      event.classList.add('type-'+profile.type);
      if(isGameDay&&profile.type==='moment')event.classList.add('type-game');
      const content=event.querySelector(':scope > div:last-child');
      if(!content)return;
      const icon=document.createElement('span');
      icon.className='event-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent=profile.icon;
      content.prepend(icon);

      const details=[...event.querySelectorAll('.details li')].map(li=>li.textContent.trim()).filter(Boolean);
      const bookingDetails=details.filter(text=>/reservation|booking|confirmation|ticket|record locator|seat|code|hilton honors|frequent flyer/i.test(text));
      const isGame=/game|pregame|kickoff|aviva|pep rally|band/i.test(title);
      if(bookingDetails.length||isGame){
        const chips=document.createElement('div');
        chips.className='event-chips';
        if(bookingDetails.length)chips.insertAdjacentHTML('beforeend','<span class="event-chip booked">✓ Details saved</span>');
        if(isGame)chips.insertAdjacentHTML('beforeend','<span class="event-chip game">Go Frogs</span>');
        if(bookingDetails.length){
          const copy=document.createElement('button');
          copy.type='button';
          copy.className='copy-details';
          copy.textContent='Copy booking details';
          copy.addEventListener('click',async()=>{
            const text=[title,...bookingDetails].join('\n');
            try{
              await navigator.clipboard.writeText(text);
              copy.textContent='Copied';
              copy.classList.add('copied');
              setTimeout(()=>{copy.textContent='Copy booking details';copy.classList.remove('copied')},1800);
            }catch{
              copy.textContent='Press and hold details to copy';
            }
          });
          chips.appendChild(copy);
        }
        content.appendChild(chips);
      }
    };

    const addMap=(event,index)=>{
      const link=event.querySelector('a.route');
      if(!link||event.dataset.appleMapReady)return;
      event.dataset.appleMapReady='1';
      let url;
      try{url=new URL(link.href)}catch{return;}
      const params=url.searchParams;
      const origin=params.get('origin');
      const destination=params.get('destination');
      const mode=params.get('travelmode')||'walking';
      const waypoints=(params.get('waypoints')||'').split('|').filter(Boolean);
      if(!origin||!destination)return;
      const stops=[origin,...waypoints,destination];

      link.href=apple(origin,waypoints[0]||destination,mode);
      link.classList.add('apple-route');
      link.textContent=waypoints.length?'Open first leg in Apple Maps':'Open route in Apple Maps';
      link.setAttribute('aria-label',(waypoints.length?'Open the first route leg':'Open this route')+' in Apple Maps');

      const legacyDestination=waypoints.length?waypoints.map(point=>'to:'+point).concat(destination).join('+'):destination;
      const preview='https://maps.google.com/maps?f=d&hl=en&saddr='+encodeURIComponent(origin)+'&daddr='+encodeURIComponent(legacyDestination)+'&dirflg='+(mode==='walking'?'w':'d')+'&output=embed';
      const title=mode==='walking'?'Walking route':'Driving route';
      const routeStops=stops.map((stop,stopIndex)=>`<div class="route-dot">${stopIndex+1}</div><div class="route-stop"><strong>${stopIndex===0?'Start':stopIndex===stops.length-1?'Destination':'Stop '+stopIndex}</strong><br>${esc(stop)}</div>`).join('');
      const legs=stops.slice(0,-1).map((start,legIndex)=>`<a class="apple-leg" target="_blank" rel="noopener" href="${apple(start,stops[legIndex+1],mode)}"> Leg ${legIndex+1}: ${esc(stops[legIndex+1])}</a>`).join('');
      const note=waypoints.length?'Apple Maps preloads each segment separately. Open the numbered legs in order.':'The start, destination, and travel mode are already filled in when Apple Maps opens.';

      const card=document.createElement('div');
      card.className='trip-map-card';
      card.innerHTML=`
        <div class="trip-map-head"><span>🗺 ${title} preview</span><span>${mode==='walking'?'On foot':'By car'}</span></div>
        <iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen title="${title} ${index}" src="${preview}"></iframe>
        <div class="route-summary">${routeStops}</div>
        <div class="trip-map-actions"></div>
        <div class="trip-map-note">${note}${waypoints.length?`<div class="apple-legs">${legs}</div>`:''}<div class="map-provider-note">The inline map is a visual route preview. Navigation launches in Apple Maps.</div></div>`;
      link.insertAdjacentElement('afterend',card);
      card.querySelector('.trip-map-actions')?.appendChild(link);
    };

    const addDayControls=(dayEls,gameIndex)=>{
      dayEls.forEach((day,index)=>{
        if(day.querySelector('.day-controls'))return;
        const controls=document.createElement('div');
        controls.className='day-controls';
        const prevDate=index>0?dayEls[index-1].querySelector('.dayhead h2')?.textContent||'Previous day':'';
        const nextDate=index<dayEls.length-1?dayEls[index+1].querySelector('.dayhead h2')?.textContent||'Next day':'';
        controls.innerHTML=`
          <button class="day-control prev ${index-1===gameIndex?'game-control':''}" type="button" ${index===0?'disabled':''}><span>← Previous chapter</span><strong>${esc(prevDate)}</strong></button>
          <button class="day-control next ${index+1===gameIndex?'game-control':''}" type="button" ${index===dayEls.length-1?'disabled':''}><span>Next chapter →</span><strong>${esc(nextDate)}</strong></button>`;
        controls.querySelector('.prev')?.addEventListener('click',()=>index>0&&selectDay(index-1));
        controls.querySelector('.next')?.addEventListener('click',()=>index<dayEls.length-1&&selectDay(index+1));
        day.appendChild(controls);
      });
    };

    const prepare=()=>{
      const dayEls=[...document.querySelectorAll('.day')];
      if(!dayEls.length)return;

      const gameIndex=Math.max(0,dayEls.findIndex(day=>/August 29/i.test(day.querySelector('.dayhead h2')?.textContent||'')||/Aviva Stadium|Game at Aviva/i.test(day.textContent)));
      let firstScotlandIndex=dayEls.findIndex(day=>/August 30|August 31|September 1|Edinburgh/i.test((day.querySelector('.dayhead h2')?.textContent||'')+' '+(day.querySelector('.dayhead p')?.textContent||'')));
      if(firstScotlandIndex<0)firstScotlandIndex=Math.min(gameIndex+1,dayEls.length-1);

      dayEls.forEach((day,index)=>{
        const dateText=day.querySelector('.dayhead h2')?.textContent||'';
        const city=(day.querySelector('.dayhead p')?.textContent||'').toLowerCase();
        const isGame=index===gameIndex;
        const isScotland=index>=firstScotlandIndex||/edinburgh|scotland/.test(city);
        day.classList.toggle('game-day',isGame);
        day.classList.toggle('scotland',isScotland&&!isGame);
        day.classList.toggle('ireland',!isScotland&&!isGame);
        const head=day.querySelector('.dayhead');
        if(head&&!head.querySelector('.day-number')){
          const number=document.createElement('span');
          number.className='day-number';
          number.textContent=String(index+1).padStart(2,'0');
          head.appendChild(number);
        }
        day.querySelectorAll('.event').forEach(event=>decorateEvent(event,isGame));
      });

      if(!prepared){
        makeHero(dayEls,gameIndex,firstScotlandIndex);
        makeGameBanner(gameIndex);
        decorateNav(dayEls,gameIndex);
        addDayControls(dayEls,gameIndex);
        prepared=true;
      }
      dayEls.forEach(day=>day.querySelectorAll('.event').forEach((event,index)=>addMap(event,index)));
    };

    const observer=new MutationObserver(prepare);
    observer.observe(document.getElementById('days')||document.body,{childList:true,subtree:true});
    prepare();

    window.addEventListener('pagehide',()=>{if(countdownTimer)clearInterval(countdownTimer)},{once:true});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
