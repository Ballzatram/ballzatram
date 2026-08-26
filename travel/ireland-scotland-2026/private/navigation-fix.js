(()=>{
  const ACTIVE_DAY_KEY='celtic-kickoff-active-day';

  const forceUnlockedState=()=>{
    const app=document.getElementById('app');
    const lock=document.getElementById('lock');
    if(!app||app.style.display!=='block')return;
    document.body.classList.add('trip-unlocked');
    app.style.setProperty('display','block','important');
    app.style.setProperty('pointer-events','auto','important');
    if(lock){
      lock.hidden=true;
      lock.setAttribute('aria-hidden','true');
      lock.style.setProperty('display','none','important');
      lock.style.setProperty('pointer-events','none','important');
    }
  };

  const activateDay=index=>{
    const days=[...document.querySelectorAll('.day')];
    const pills=[...document.querySelectorAll('#nav .pill:not(.lockout)')];
    if(!Number.isInteger(index)||index<0||index>=days.length)return;
    days.forEach((day,i)=>day.classList.toggle('active',i===index));
    pills.forEach((pill,i)=>{
      const active=i===index;
      pill.classList.toggle('active',active);
      pill.setAttribute('aria-current',active?'date':'false');
    });
    sessionStorage.setItem(ACTIVE_DAY_KEY,String(index));
    forceUnlockedState();
    pills[index]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    requestAnimationFrame(()=>{
      const nav=document.getElementById('nav');
      const offset=(nav?.getBoundingClientRect().height||0)+14;
      const top=days[index].getBoundingClientRect().top+window.scrollY-offset;
      window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
    });
  };

  const install=()=>{
    forceUnlockedState();

    // Replace the legacy day switcher with a lightweight in-app switcher.
    try{window.show=index=>activateDay(Number(index));}catch{}

    const app=document.getElementById('app');
    if(app){
      new MutationObserver(()=>forceUnlockedState()).observe(app,{attributes:true,attributeFilter:['style','class']});
    }

    document.addEventListener('click',event=>{
      const lockButton=event.target.closest('#nav .lockout');
      if(lockButton)return;
      setTimeout(forceUnlockedState,0);
    });

    const saved=Number(sessionStorage.getItem(ACTIVE_DAY_KEY));
    if(Number.isInteger(saved)&&saved>=0){
      setTimeout(()=>{
        if(document.getElementById('app')?.style.display==='block')activateDay(saved);
      },0);
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();