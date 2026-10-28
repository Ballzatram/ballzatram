/* Scroll animates the scenery only; links, native scrolling and reduced-motion fallback remain usable. */
(() => {
  const ride = document.querySelector('.frontier-ride');
  if (!ride || !('requestAnimationFrame' in window)) return;

  const signs = [...ride.querySelectorAll('.ride-sign')];
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)') ??
    { matches: true, addEventListener() {} };
  let active = false;
  let queued = false;

  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };

  function moveSign(sign, progress) {
    const start = Number(sign.dataset.start);
    const end = Number(sign.dataset.end);
    const visible = progress >= start && progress < end;
    // Each sign gets a short entrance, a reading moment and a clear departure.
    // The long stretches between windows are intentionally empty.
    const phase = clamp((progress - start) / (end - start));
    const enter = ease(phase / .23);
    const leave = ease((1 - phase) / .23);
    const opacity = Math.min(enter, leave);
    const offset = phase < .23 ? 76 * (1 - enter) :
      phase > .77 ? -115 * (1 - leave) : 0;

    sign.style.setProperty('--sign-shift', `${offset.toFixed(2)}vw`);
    sign.style.setProperty('--sign-opacity', opacity.toFixed(3));
    sign.classList.toggle('is-current', visible);
    sign.inert = !visible;
  }

  function update() {
    queued = false;
    if (!active) return;
    const rect = ride.getBoundingClientRect();
    const distance = Math.max(1, rect.height - window.innerHeight);
    const progress = clamp(-rect.top / distance);
    ride.style.setProperty('--ride-progress', progress.toFixed(4));
    ride.classList.toggle(
      'is-riding',
      progress > .025 && progress < .98 &&
        rect.bottom > 0 && rect.top < window.innerHeight
    );
    signs.forEach(sign => moveSign(sign, progress));
  }

  function onScroll() {
    if (active && !queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }

  function configure() {
    active = !preference.matches;
    ride.classList.toggle('has-ride-motion', active);
    ride.classList.remove('is-riding');
    if (active) {
      onScroll();
    } else {
      ride.style.removeProperty('--ride-progress');
      signs.forEach(sign => {
        sign.inert = false;
        sign.classList.remove('is-current');
        sign.style.removeProperty('--sign-shift');
        sign.style.removeProperty('--sign-opacity');
      });
    }
  }

  // Small-screen Main Street can be panned with real buttons or a native swipe.
  // Do not trap document scrolling or change what the buildings link to.
  const townFrame=document.querySelector('.town-frame');
  const townRail=document.querySelector('.town-rail');
  if(townFrame&&townRail){
    const buildings=[...townFrame.querySelectorAll('a.town-building')];
    const left=document.getElementById('town-pan-left');
    const right=document.getElementById('town-pan-right');
    const position=document.getElementById('town-position');
    const centerOf=building=>{
      const bounds=building.getBoundingClientRect();
      return townFrame.scrollLeft+bounds.left-townFrame.getBoundingClientRect().left+bounds.width/2;
    };
    const indexAtCenter=()=>{
      const maximum=Math.max(0,townFrame.scrollWidth-townFrame.clientWidth);
      // At the edges, show the actual first/last stop even when the viewport
      // cannot center the building. Otherwise the final arrow can be disabled
      // while the counter still says 5 / 6.
      if(townFrame.scrollLeft<=3)return 0;
      if(townFrame.scrollLeft>=maximum-3)return buildings.length-1;
      const center=townFrame.scrollLeft+townFrame.clientWidth/2;
      let index=0,delta=Infinity;
      buildings.forEach((building,i)=>{
        const distance=Math.abs(centerOf(building)-center);
        if(distance<delta){delta=distance;index=i;}
      });
      return index;
    };
    const updateTown=()=>{
      const maximum=Math.max(0,townFrame.scrollWidth-townFrame.clientWidth);
      townRail.hidden=maximum<20;
      if(townRail.hidden)return;
      const index=indexAtCenter();
      position.textContent=(index+1)+' / '+buildings.length+' · '+buildings[index].querySelector('.town-building__sign').textContent.trim();
      left.disabled=townFrame.scrollLeft<3;
      right.disabled=townFrame.scrollLeft>=maximum-3;
    };
    const pan=direction=>{
      const index=Math.max(0,Math.min(buildings.length-1,indexAtCenter()+direction));
      const target=Math.max(0,centerOf(buildings[index])-townFrame.clientWidth/2);
      if(townFrame.scrollTo)townFrame.scrollTo({left:target,behavior:preference.matches?'auto':'smooth'});
      else townFrame.scrollLeft=target;
      updateTown();
    };
    left.addEventListener('click',()=>pan(-1));
    right.addEventListener('click',()=>pan(1));
    townFrame.addEventListener('scroll',updateTown,{passive:true});
    window.addEventListener('resize',updateTown,{passive:true});
    updateTown();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  preference.addEventListener?.('change', configure);
  configure();
})();
