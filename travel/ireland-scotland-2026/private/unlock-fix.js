(()=>{
  const KEY_STATE_VERSION='celtic-kickoff-key-v3';
  const normalizeKey=value=>String(value??'')
    .trim()
    .replace(/^`+|`+$/g,'')
    .replace(/\s+/g,'')
    .toLowerCase();

  const b64=value=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));
  const decryptCurrentVault=async key=>{
    const vault=globalThis.CELTIC_VAULT_V2;
    if(!vault)throw new Error('Current trip vault has not loaded');
    const sourceKey=await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const derivedKey=await crypto.subtle.deriveKey(
      {name:'PBKDF2',salt:b64(vault.salt),iterations:vault.iterations,hash:'SHA-256'},
      sourceKey,
      {name:'AES-GCM',length:256},
      false,
      ['decrypt']
    );
    const packed=await crypto.subtle.decrypt(
      {name:'AES-GCM',iv:b64(vault.iv)},
      derivedKey,
      b64(vault.ciphertext)
    );
    const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  };

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
      if(typeof render!=='function')throw new Error('Trip renderer unavailable');
      const data=await decryptCurrentVault(key);

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
      if(error)error.textContent='That key did not unlock this copy. Paste the current key and try again.';
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

    if(!document.querySelector('.trip-key-help')){
      const help=document.createElement('div');
      help.className='trip-key-help';
      help.textContent='Capitalization and accidental spaces are ignored.';
      help.style.cssText='margin:-7px 2px 12px;color:#77817b;font-size:11px;line-height:1.4';
      input.insertAdjacentElement('afterend',help);
    }

    // Clear values saved by older encrypted builds before they can keep
    // submitting the wrong key in the background.
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
