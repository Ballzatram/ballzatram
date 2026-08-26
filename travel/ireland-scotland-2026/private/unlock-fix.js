(()=>{
  const KEY_STATE_VERSION='celtic-kickoff-key-v2';
  const normalizeKey=value=>String(value??'')
    .trim()
    .replace(/^`+|`+$/g,'')
    .replace(/\s+/g,'');

  const getElements=()=>({
    input:document.getElementById('pw'),
    unlockButton:document.getElementById('unlock'),
    remember:document.getElementById('remember'),
    error:document.getElementById('err'),
    lock:document.getElementById('lock'),
    app:document.getElementById('app')
  });

  const setBusy=(button,busy)=>{
    if(!button)return;
    button.disabled=busy;
    button.setAttribute('aria-busy',busy?'true':'false');
    button.textContent=busy?'Opening trip book…':'Open the trip book';
  };

  const unlockWithNormalizedKey=async()=>{
    const {input,unlockButton,remember,error,lock,app}=getElements();
    if(!input||!unlockButton||!lock||!app)return;

    const key=normalizeKey(input.value);
    input.value=key;
    if(error)error.textContent='';

    if(!key){
      if(error)error.textContent='Paste or enter the access key first.';
      input.focus();
      return;
    }

    setBusy(unlockButton,true);
    try{
      if(typeof decrypt!=='function'||typeof render!=='function')throw new Error('Trip decoder unavailable');
      const data=await decrypt(key);

      if(remember?.checked){
        localStorage.setItem('trip-key',key);
        localStorage.setItem('trip-key-version',KEY_STATE_VERSION);
      }else{
        localStorage.removeItem('trip-key');
        localStorage.removeItem('trip-key-version');
      }

      render(data);
      lock.hidden=true;
      lock.setAttribute('aria-hidden','true');
      lock.style.setProperty('display','none','important');
      app.style.setProperty('display','block','important');
      app.setAttribute('aria-hidden','false');
      document.body.classList.add('trip-unlocked');
      if(error)error.textContent='';
    }catch(cause){
      localStorage.removeItem('trip-key');
      localStorage.removeItem('trip-key-version');
      if(error)error.textContent='That key did not unlock this copy. Re-paste the full key with no extra characters.';
      input.focus();
      input.select();
      console.warn('Trip unlock failed',cause);
    }finally{
      setBusy(unlockButton,false);
    }
  };

  const install=()=>{
    const {input,unlockButton,error,app}=getElements();
    if(!input||!unlockButton)return;

    input.setAttribute('autocapitalize','none');
    input.setAttribute('autocomplete','off');
    input.setAttribute('spellcheck','false');
    input.setAttribute('enterkeyhint','go');

    // A saved key from an older cached build can make the current screen look
    // broken before the user has a chance to enter the correct key. Clear it
    // once when the key-handling version changes.
    if(localStorage.getItem('trip-key-version')!==KEY_STATE_VERSION){
      localStorage.removeItem('trip-key');
      localStorage.setItem('trip-key-version',KEY_STATE_VERSION);
      if(app?.style.display!=='block')input.value='';
      if(error)error.textContent='';
    }

    unlockButton.onclick=event=>{
      event?.preventDefault();
      unlockWithNormalizedKey();
    };
    input.onkeydown=event=>{
      if(event.key==='Enter'){
        event.preventDefault();
        unlockWithNormalizedKey();
      }
    };

    const saved=normalizeKey(localStorage.getItem('trip-key'));
    if(saved&&app?.style.display!=='block'){
      input.value=saved;
      const remember=document.getElementById('remember');
      if(remember)remember.checked=true;
      unlockWithNormalizedKey();
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
