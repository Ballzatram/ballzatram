(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const apple=(from,to,mode)=>'https://maps.apple.com/?'+new URLSearchParams({saddr:from,daddr:to,dirflg:mode==='walking'?'w':'d'}).toString();
  const parseTripDate=text=>{
    const match=String(text).match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i);
    if(!match)return null;
    const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
    return new Date(Number(match[3]),months.indexOf(match[1].toLowerCase()),Number(match[2]));
  };
  const labelDate=d=>({dow:d.toLocaleDateString('en-US',{weekday:'short'}),date:d.toLocaleDateString('en-US',{month:'short',day:'numeric'})});
  const sameDay=(a,b)=>a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();

  const enhance=()=>{
    if(document.body.dataset.tripEnhanced)return;
    document.body.dataset.tripEnhanced='1';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#ffffff');

    const header=document.querySelector('.app header');
    const footer=document.querySelector('.footer');
    if(footer)footer.textContent='Your itinerary is saved for offline opening after the first successful load. Route details stay in the trip book; live map imagery and navigation depend on Apple Maps availability or maps downloaded on your device.';

    const decorate=()=>{
      const dayEls=[...document.querySelectorAll('.day')];
      if(!dayEls.length)return;

      dayEls.forEach((day,i)=>{
        const city=(day.querySelector('.dayhead p')?.textContent||'').toLowerCase();
        const isIreland=/dublin|ireland/.test(city);
        day.classList.toggle('ireland',isIreland);
        day.classList.toggle('scotland',!isIreland);
        const pill=document.querySelectorAll('#nav .pill:not(.lockout)')[i];
        if(pill){
          pill.classList.toggle('ireland-pill',isIreland);
          pill.classList.toggle('scotland-pill',!isIreland);
          const date=parseTripDate(day.querySelector('.dayhead h2')?.textContent||'');
          if(date){
            const lab=labelDate(date);
            pill.innerHTML='<span class="nav-dow">'+esc(lab.dow)+'</span><span class="nav-date">'+esc(lab.date)+'</span>';
            pill.dataset.tripDate=date.toISOString().slice(0,10);
            if(sameDay(date,new Date()))pill.classList.add('today');
          }
          pill.setAttribute('aria-label','Show '+(day.querySelector('.dayhead h2')?.textContent||'trip day'));
        }
      });

      const pills=[...document.querySelectorAll('#nav .pill:not(.lockout)')];
      const syncNav=()=>{
        pills.forEach(p=>p.setAttribute('aria-current',p.classList.contains('active')?'date':'false'));
        const active=pills.find(p=>p.classList.contains('active'));
        active?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
      };
      if(!document.getElementById('nav')?.dataset.a11yReady){
        document.getElementById('nav').dataset.a11yReady='1';
        document.getElementById('nav').addEventListener('click',()=>setTimeout(syncNav,0));
      }
      syncNav();

      if(header&&!document.querySelector('.trip-overview')){
        const overview=document.createElement('div');
        overview.className='trip-overview';
        overview.innerHTML='<div class="overview-card"><strong>'+dayEls.length+' days</strong><span>Complete daily itinerary</span></div><div class="overview-card"><strong>2 cities</strong><span>Dublin and Edinburgh</span></div><div class="overview-card apple"><strong> Apple Maps</strong><span>Routes open preloaded</span></div>';
        header.insertAdjacentElement('afterend',overview);
      }

      if(!document.body.dataset.tripDaySelected){
        document.body.dataset.tripDaySelected='1';
        const now=new Date();
        const dated=pills.map((p,i)=>({p,i,d:p.dataset.tripDate?new Date(p.dataset.tripDate+'T12:00:00'):null})).filter(x=>x.d);
        const exact=dated.find(x=>sameDay(x.d,now));
        if(exact)exact.p.click();
      }
    };

    const addMaps=()=>{
      decorate();
      document.querySelectorAll('.event').forEach((event,idx)=>{
        const link=event.querySelector('a.route');
        if(!link||event.dataset.appleDone)return;
        event.dataset.appleDone='1';
        let url;
        try{url=new URL(link.href)}catch{return}
        const p=url.searchParams;
        const origin=p.get('origin');
        const destination=p.get('destination');
        const mode=p.get('travelmode')||'walking';
        const waypoints=(p.get('waypoints')||'').split('|').filter(Boolean);
        if(!origin||!destination)return;
        const all=[origin,...waypoints,destination];

        link.href=apple(origin,waypoints[0]||destination,mode);
        link.classList.add('apple-route');
        link.dataset.mode=mode;
        link.setAttribute('aria-label',(waypoints.length?'Open the first route leg':'Open this route')+' in Apple Maps');
        link.textContent=(waypoints.length?'Open first leg':'Open route')+' in Apple Maps';

        const legacyDestination=waypoints.length?waypoints.map(x=>'to:'+x).concat(destination).join('+'):destination;
        const preview='https://maps.google.com/maps?f=d&hl=en&saddr='+encodeURIComponent(origin)+'&daddr='+encodeURIComponent(legacyDestination)+'&dirflg='+(mode==='walking'?'w':'d')+'&output=embed';
        const title=mode==='walking'?'Walking route':'Driving route';
        const legs=all.slice(0,-1).map((x,i)=>'<a class="apple-leg" target="_blank" rel="noopener" href="'+apple(x,all[i+1],mode)+'"> Leg '+(i+1)+': '+esc(all[i+1])+'</a>').join('');
        const stops=all.map((x,i)=>'<div class="route-dot">'+(i+1)+'</div><div class="route-stop"><strong>'+(i===0?'Start':i===all.length-1?'Destination':'Stop '+i)+'</strong><br>'+esc(x)+'</div>').join('');
        const note=waypoints.length?'Apple Maps links preload one leg at a time. Use the leg buttons below in order.':'This route opens with its start, destination, and travel mode already filled in Apple Maps.';
        const card=document.createElement('div');
        card.className='trip-map-card';
        card.innerHTML='<div class="trip-map-head"><span>🗺 '+title+' preview</span><span>'+(mode==='walking'?'On foot':'By car')+'</span></div><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen title="'+title+' '+idx+'" src="'+preview+'"></iframe><div class="route-summary">'+stops+'</div><div class="trip-map-note">'+note+(waypoints.length?'<div class="apple-legs">'+legs+'</div>':'')+'<div class="map-provider-note">The inline preview is for visual orientation; tapping a route button launches Apple Maps.</div></div>';
        link.insertAdjacentElement('afterend',card);
      });
    };

    new MutationObserver(addMaps).observe(document.getElementById('days')||document.body,{childList:true,subtree:true});
    addMaps();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();