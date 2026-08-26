(()=>{
  const ACTIVE_DAY_KEY='celtic-kickoff-active-day';
  let restored=false;

  const elements=()=>({
    lock:document.getElementById('lock'),
    app:document.getElementById('app'),
    nav:document.getElementById('nav'),
    days:[...document.querySelectorAll('.day')],
    pills:[...document.querySelectorAll('#nav .pill:not(.lockout)')]
  });

  const isUnlocked=()=>{
    const {app}=elements();
    return Boolean(app&&(app.style.display==='block'||document.body.classList.contains('trip-unlocked')));
  };

  const activateDay=(index,{behavior='smooth',scroll=true}={})=>{
    const {nav,days,pills}=elements();
    if(!Number.isInteger(index)||index<0||index>=days.length||!pills[index])return;

    days.forEach((day,dayIndex)=>day.classList.toggle('active',dayIndex===index));
    pills.forEach((pill,pillIndex)=>{
      const active=pillIndex===index;
      pill.classList.toggle('active',active);
      pill.setAttribute('aria-current',active?'date':'false');
    });

    sessionStorage.setItem(ACTIVE_DAY_KEY,String(index));
    pills[index].scrollIntoView({behavior,block:'nearest',inline:'center'});

    if(scroll){
      requestAnimationFrame(()=>{
        const navHeight=nav?.getBoundingClientRect().height||0;
        const top=days[index].getBoundingClientRect().top+window.scrollY-navHeight-16;
        window.scrollTo({top:Math.max(0,top),behavior});
      });
    }
  };

  const lockInUnlockedState=()=>{
    const {lock,app,pills}=elements();
    if(!app||app.style.display!=='block')return;

    document.body.classList.add('trip-unlocked');
    if(lock){
      lock.hidden=true;
      lock.setAttribute('aria-hidden','true');
      lock.style.setProperty('display','none','important');
      lock.style.setProperty('visibility','hidden','important');
      lock.style.setProperty('pointer-events','none','important');
    }
    app.style.setProperty('display','block','important');
    app.setAttribute('aria-hidden','false');

    if(!restored&&pills.length){
      restored=true;
      const saved=Number(sessionStorage.getItem(ACTIVE_DAY_KEY));
      if(Number.isInteger(saved)&&saved>=0&&saved<pills.length){
        requestAnimationFrame(()=>activateDay(saved,{behavior:'auto',scroll:false}));
      }
    }
  };

  const installNavigationGuard=()=>{
    const {nav}=elements();
    if(!nav||nav.dataset.stableDayNavigation==='true')return;
    nav.dataset.stableDayNavigation='true';

    nav.addEventListener('click',event=>{
      const pill=event.target.closest('.pill:not(.lockout)');
      if(!pill||!nav.contains(pill)||!isUnlocked())return;

      const pills=[...nav.querySelectorAll('.pill:not(.lockout)')];
      const index=pills.indexOf(pill);
      if(index<0)return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      activateDay(index);
    },true);
  };

  const stabilize=()=>{
    lockInUnlockedState();
    installNavigationGuard();
  };

  const observer=new MutationObserver(stabilize);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});

  // The legacy itinerary calls show(index), which scrolls to page top. Replace it
  // with the stable in-app chapter switcher while retaining a capture fallback.
  const replaceLegacyShow=()=>{
    if(typeof window.show==='function'&&!window.__legacyTripShow){
      window.__legacyTripShow=window.show;
      window.show=index=>activateDay(Number(index));
    }
  };

  replaceLegacyShow();
  stabilize();
  setTimeout(()=>{replaceLegacyShow();stabilize()},0);
})();