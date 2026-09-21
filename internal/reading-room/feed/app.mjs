import {TOPICS,STORAGE_KEY,emptyState,escapeHTML as e,safeURL,validateCatalog,loadState,saveState,importState,toggleSaved,recordAnswer,selectCards,explanation,softmax} from './core.mjs';

const $ = id => document.getElementById(id);
const stream = $('stream');
let catalog, state, storage, blockedStorage = false;
let view='feed', topic='all', query='', path=null, queue=[], limit=8, autoUntil=24;
let readingObserver, moreObserver, toastTimer, searchTimer;
const readingTimers = new Map();
const label = {concept:'CONCEPT',exercise:'TRY IT',resource:'GO DEEPER',video:'WATCH & BUILD'};
const titles = {feed:['Follow your<br><em>curiosity.</em>','Small ideas. Useful detours. A little further every time.'],saved:['Keep a little<br><em>something.</em>','Ideas you chose to come back to. Saved in this browser.'],paths:['Follow a<br><em>thread.</em>','Three editorial sequences. No gates, grades or mastery claims.'],sources:['Go to the<br><em>source.</em>','Books, papers, lessons and articles behind this edition.']};

function toast(message) {
  clearTimeout(toastTimer); $('toast').textContent=message; $('toast').classList.add('visible');
  toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);
}
function warning(message) { $('storage-warning').textContent=message; $('storage-warning').hidden=!message; }
function persist() {
  if (blockedStorage || !saveState(storage,state)) warning('Changes are available for this visit, but could not be saved. Export progress to keep a copy. Existing unreadable storage is not overwritten.');
  stats();
}
function stats() {
  if (!state) return;
  $('saved-count').textContent=state.saved.length;
  $('rail-stats').innerHTML=`<div><strong>${state.seen.length}</strong>viewed</div><div><strong>${Object.keys(state.answers).length}</strong>practiced</div>`;
  $('progress-summary').textContent=`${state.seen.length} viewed · ${Object.keys(state.answers).length} questions practiced · ${state.saved.length} saved. This is activity, not mastery.`;
  $('resume').hidden=!state.lastCard || view!=='feed' || Boolean(path);
  document.querySelectorAll('[data-save]').forEach(b=>{
    const saved=state.saved.includes(b.dataset.save);
    b.setAttribute('aria-pressed',String(saved)); b.textContent=saved?'◆ Saved':'◇ Save';
  });
}
function sourceMarkup(id) {
  const s=catalog.sources.find(s=>s.id===id);
  return `<div class="source-citation"><a href="${e(safeURL(s.url))}" target="_blank" rel="noopener noreferrer">${e(s.title)} ↗</a><span>${e(s.author)} · ${e(s.date)}</span><span>${e(s.access)} · Reference checked ${e(s.checked)}</span><p class="scope">Review scope: ${e(s.scope)}</p></div>`;
}
function feedback(card) {
  const a=state.answers[card.id];
  return a ? `${a.choice===card.quiz.answer?'Correct.':'Not quite.'} ${card.quiz.explanation} Attempt recorded—not a mastery score.` : '';
}
function quizMarkup(c) {
  if (!c.quiz) return '';
  return `<section class="practice" aria-label="Optional practice"><fieldset><legend>${e(c.quiz.question)}</legend>${c.quiz.options.map((option,i)=>`<label class="option"><input type="radio" name="quiz-${e(c.id)}" value="${i}"${state.answers[c.id]?.choice===i?' checked':''}><span>${e(option)}</span></label>`).join('')}</fieldset><button type="button" data-check="${e(c.id)}">Check my answer</button><p class="feedback" data-feedback="${e(c.id)}" role="status">${e(feedback(c))}</p></section>`;
}
function demoMarkup(c) {
  if(c.demo!=='attention') return '';
  return `<div class="demo"><label for="score-${e(c.id)}">Toy attention: change the first score (the second stays at 0)</label><input id="score-${e(c.id)}" type="range" min="-3" max="3" step="0.1" value="0" data-demo="${e(c.id)}"><div class="meter-row"><span>Value 10</span><meter min="0" max="1" value="0.5" aria-label="Weight on value 10"></meter><span data-weight="0">50.0%</span></div><div class="meter-row"><span>Value 30</span><meter min="0" max="1" value="0.5" aria-label="Weight on value 30"></meter><span data-weight="1">50.0%</span></div><output for="score-${e(c.id)}">0.50 × 10 + 0.50 × 30 = 20.00</output><small>Softmax over two invented scores. Scalar illustration only; not a trained model or a token-probability display.</small></div>`;
}
function videoMarkup(c) {
  if(!c.video) return '';
  return `<div class="video-slot"><button type="button" data-video="${e(c.id)}">▷ Load the video here</button><p class="fine">Connects to YouTube when selected. No autoplay. <a href="https://www.youtube.com/watch?v=${e(c.video)}" target="_blank" rel="noopener noreferrer">Open the original video ↗</a> if embedding is unavailable.</p></div>`;
}
function cardMarkup(c,index) {
  const why=explanation(state,topic,Boolean(path),view==='saved');
  const author=catalog.sources.find(s=>s.id===c.sources[0]);
  return `<article class="card" id="card-${e(c.id)}" data-card="${e(c.id)}" tabindex="-1"><header data-observe="${e(c.id)}"><div class="card-meta"><span class="topic-tag">${e(TOPICS[c.topic])}</span><span class="kind-tag">${label[c.kind]}</span><span class="card-number">${String(index+1).padStart(2,'0')}</span></div><h2>${e(c.title)}</h2></header><p class="body">${e(c.body)}</p><div class="actions"><button type="button" data-save="${e(c.id)}" aria-pressed="${state.saved.includes(c.id)}">${state.saved.includes(c.id)?'◆ Saved':'◇ Save'}</button><button type="button" data-link="${e(c.id)}">Copy card link</button></div><details class="expand"><summary>Explore this idea${c.quiz?' · optional question':''}</summary><p>${e(c.detail)}</p>${demoMarkup(c)}${videoMarkup(c)}${quizMarkup(c)}</details><details><summary>Sources & why this card</summary><p class="why">${e(why)}</p>${c.sources.map(sourceMarkup).join('')}<p class="fine">Original teaching copy and exercises. Reference scope is stated above; this is not an imported private conversation or a full-book summary.</p></details><p class="card-footer"><span data-viewed="${e(c.id)}">${state.seen.includes(c.id)?'Viewed':'New to this browser'}</span> · ${e(author.author)}</p></article>`;
}
function stopReading() { readingObserver?.disconnect(); readingTimers.forEach(clearTimeout); readingTimers.clear(); }
function observeCards() {
  stopReading();
  if(!('IntersectionObserver' in window) || document.visibilityState!=='visible') return;
  readingObserver=new IntersectionObserver(entries=>{
    for(const entry of entries) {
      const id=entry.target.dataset.observe;
      if(entry.isIntersecting && entry.intersectionRatio>=0.6) {
        if(!readingTimers.has(id)) readingTimers.set(id,setTimeout(()=>{
          readingTimers.delete(id);
          if(document.visibilityState!=='visible') return;
          if(!state.seen.includes(id)) state.seen.push(id);
          state.lastCard=id;
          const badge=document.querySelector(`[data-viewed="${id}"]`); if(badge) badge.textContent='Viewed';
          persist(); readingObserver?.unobserve(entry.target);
        },1000));
      } else {clearTimeout(readingTimers.get(id)); readingTimers.delete(id);}
    }
  },{threshold:[0,0.6]});
  stream.querySelectorAll('[data-observe]').forEach(el=>readingObserver.observe(el));
}
function setMore() {
  const remaining=limit<queue.length;
  $('more-area').hidden=false; $('more').hidden=!remaining;
  $('more-label').textContent=!remaining?'END OF THIS COLLECTION':limit>=autoUntil?'A GOOD PLACE TO PAUSE':'MORE TO EXPLORE';
  $('more-copy').textContent=!remaining?`${queue.length} matching cards. Save an idea, choose another topic, or call it a good session.`:limit>=autoUntil?`${limit} cards loaded. Keep one idea, or continue when you choose.`:`${limit} of ${queue.length} cards loaded. More appears as you scroll, or use the button.`;
  moreObserver?.disconnect();
  if(remaining && limit<autoUntil && 'IntersectionObserver' in window) {
    moreObserver=new IntersectionObserver(entries=>{
      if(entries.some(x=>x.isIntersecting) && limit<autoUntil && limit<queue.length) appendCards();
    },{rootMargin:'250px'});
    moreObserver.observe($('sentinel'));
  }
}
function appendCards() {
  const previous=Math.min(limit,queue.length); limit=Math.min(limit+8,queue.length);
  stream.insertAdjacentHTML('beforeend',queue.slice(previous,limit).map((c,i)=>cardMarkup(c,previous+i)).join(''));
  setMore(); observeCards(); stats();
}
function renderSources() {
  const relevant=new Set(catalog.cards.filter(c=>topic==='all'||c.topic===topic).flatMap(c=>c.sources));
  const q=query.trim().toLowerCase();
  const sources=catalog.sources.filter(s=>relevant.has(s.id)&&(!q||`${s.title} ${s.author} ${s.type} ${s.scope}`.toLowerCase().includes(q)));
  $('result-count').textContent=`${sources.length} references`;
  stream.innerHTML=sources.length?sources.map(s=>`<article class="card source-card"><p class="eyebrow">${e(s.type)}</p><h2>${e(s.title)}</h2><p class="body">${e(s.author)}</p>${sourceMarkup(s.id)}<p class="source-type">Only the stated reference scope was checked. Publication date and reference-check date are different.</p></article>`).join(''):emptyMarkup('No matching references.','Try another topic, title or author.');
}
function renderPaths() {
  stream.innerHTML=catalog.paths.map(p=>{
    const seen=p.cards.filter(id=>state.seen.includes(id)).length;
    const practiced=p.cards.filter(id=>state.answers[id]).length;
    return `<article class="card"><p class="eyebrow">EDITORIAL LEARNING PATH</p><h2>${e(p.title)}</h2><p class="body">${e(p.description)}</p><button class="primary" type="button" data-path="${e(p.id)}">Explore ${p.cards.length} cards →</button><p class="path-progress">${seen} viewed · ${practiced} questions practiced. No inferred mastery.</p></article>`;
  }).join('');
}
function emptyMarkup(title,detail) {return `<div class="empty"><h2>${e(title)}</h2><p>${e(detail)}</p><button type="button" data-reset-filters>Return to the full feed</button></div>`;}
function render(reset=true) {
  stopReading(); moreObserver?.disconnect(); $('more-area').hidden=true;
  const pair=titles[view]; $('page-title').innerHTML=pair[0]; $('page-description').textContent=path?path.description:pair[1];
  $('edition').textContent=path?`PATH / ${path.title}`:`${catalog.edition.toUpperCase()} · ${catalog.cards.length} CARDS`;
  $('controls').hidden=view==='paths';
  document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  document.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topic===topic)));
  $('mix-label').textContent=path?'Editorial path':view==='sources'?'Reference scope shown':state.mix==='ai-first'?'AI-first mix':'Balanced mix';
  if(view==='paths') renderPaths();
  else if(view==='sources') renderSources();
  else {
    if(reset) {queue=selectCards(catalog.cards,state,{topic,query,saved:view==='saved',path:path?.cards});limit=8;autoUntil=24;}
    $('result-count').textContent=`${queue.length} ${view==='saved'?'saved':'matching'} cards`;
    stream.innerHTML=queue.length?queue.slice(0,limit).map(cardMarkup).join(''):emptyMarkup(view==='saved'?'Nothing saved here yet.':'No matching cards.',view==='saved'?'Save an idea from the feed, then find it here. Topic and search filters also apply.':'Try a different word or clear your filters.');
    if(queue.length) setMore(); observeCards();
  }
  stream.setAttribute('aria-busy','false'); stats();
}
function goView(next) {
  if(!catalog || !['feed','saved','paths','sources'].includes(next)) return;
  view=next; topic='all';query='';path=null;$('search').value='';render();
  window.scrollTo(0,0); $('main').focus({preventScroll:true});
}
function jumpToCard(id) {
  if(!catalog.cards.some(c=>c.id===id)) {toast('That card is not in this edition.');return;}
  view='feed';topic='all';query='';path=null;$('search').value='';
  render();const index=queue.findIndex(c=>c.id===id);limit=Math.max(8,index+1);autoUntil=Math.max(24,limit);render(false);
  requestAnimationFrame(()=>{const card=$(`card-${id}`);card?.scrollIntoView({block:'start'});card?.focus({preventScroll:true});});
}
function hashCard() {return new URLSearchParams(location.hash.slice(1)).get('card');}
function clearFilters() {topic='all';query='';path=null;$('search').value='';render();}
function resetAll() {
  if(!window.confirm('Reset saved cards, viewed cards and question attempts for this feed? Your Reading Room book progress will not change.')) return;
  state=emptyState();blockedStorage=false;warning('');persist();$('mix').value=state.mix;
  $('settings-status').textContent='Feed progress reset. Reading Room progress was not touched.';
  goView('feed');
}
function setupEvents() {
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>goView(b.dataset.view)));
  $('topics').addEventListener('click',event=>{const b=event.target.closest('[data-topic]');if(!b)return;topic=b.dataset.topic;path=null;render();});
  $('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{query=$('search').value;render();},160);});
  $('clear').addEventListener('click',clearFilters);
  $('more').addEventListener('click',()=>{autoUntil=Math.max(autoUntil,limit+24);appendCards();});
  $('to-top').addEventListener('click',()=>{window.scrollTo(0,0);$('main').focus({preventScroll:true});});
  $('resume').addEventListener('click',()=>jumpToCard(state.lastCard));
  $('settings-open').addEventListener('click',()=>{$('mix').value=state.mix;stats();$('settings-status').textContent='';$('settings').showModal();});
  $('settings-close').addEventListener('click',()=>$('settings').close());
  $('mix').addEventListener('change',()=>{state.mix=$('mix').value;persist();render();$('settings-status').textContent='Mix updated. You control which topics receive more space.';});
  $('export').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='osiris-feed-progress.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);$('settings-status').textContent='Progress export created. Keep it somewhere you control.';
  });
  $('import').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try {
      if(file.size>250000)throw new Error('Progress files must be smaller than 250 KB.');
      const imported=importState(await file.text(),catalog.cards);
      if(!window.confirm('Replace this feed’s progress with the selected export? Your Reading Room book progress stays untouched.'))return;
      state=imported;blockedStorage=false;warning('');persist();$('mix').value=state.mix;render();
      $('settings-status').textContent='Progress imported. Unknown or retired card IDs were ignored.';
    }catch(error){$('settings-status').textContent=error.message;}
    finally{event.target.value='';}
  });
  $('reset').addEventListener('click',resetAll);
  stream.addEventListener('click',async event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-reset-filters')){goView('feed');return;}
    if(b.dataset.path){path=catalog.paths.find(p=>p.id===b.dataset.path);view='feed';topic='all';query='';$('search').value='';render();window.scrollTo(0,0);$('main').focus({preventScroll:true});return;}
    const id=b.dataset.save||b.dataset.check||b.dataset.video||b.dataset.link;
    const c=catalog.cards.find(c=>c.id===id);if(!c)return;
    if(b.dataset.save){
      toggleSaved(state,id);persist();toast(state.saved.includes(id)?'Saved for another visit.':'Removed from saved cards.');
      if(view==='saved'){const y=window.scrollY;render();window.scrollTo(0,y);stream.querySelector('button')?.focus({preventScroll:true});}
    }else if(b.dataset.check){
      const article=b.closest('[data-card]'),selected=article.querySelector(`input[name="quiz-${id}"]:checked`),out=article.querySelector('[data-feedback]');
      if(!selected){out.textContent='Choose an answer first. Nothing has been recorded.';return;}
      recordAnswer(state,c,Number(selected.value));persist();out.textContent=feedback(c);
    }else if(b.dataset.video){
      const iframe=document.createElement('iframe');iframe.src=`https://www.youtube-nocookie.com/embed/${c.video}?rel=0&playsinline=1`;
      iframe.title=c.title;iframe.allow='encrypted-media; fullscreen; picture-in-picture';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.style.minHeight='200px';
      b.replaceWith(iframe);toast('YouTube player requested. Use the original link if playback is unavailable.');
    }else if(b.dataset.link){
      const url=new URL(location.href);url.hash=`card=${c.id}`;
      try{await navigator.clipboard.writeText(url.href);toast('Card link copied.');}catch{window.prompt('Copy this card link:',url.href);}
    }
  });
  stream.addEventListener('input',event=>{
    if(!event.target.matches('[data-demo]'))return;
    const box=event.target.closest('.demo'),weights=softmax([Number(event.target.value),0]);
    box.querySelectorAll('meter').forEach((meter,i)=>{meter.value=weights[i];});
    box.querySelectorAll('[data-weight]').forEach((span,i)=>{span.textContent=`${(weights[i]*100).toFixed(1)}%`;});
    box.querySelector('output').textContent=`${weights[0].toFixed(2)} × 10 + ${weights[1].toFixed(2)} × 30 = ${(weights[0]*10+weights[1]*30).toFixed(2)}`;
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopReading();else if(view==='feed'||view==='saved')observeCards();});
  window.addEventListener('hashchange',()=>{const id=hashCard();if(id)jumpToCard(id);});
}
async function start() {
  try {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    let response;
    try{response=await fetch(new URL('./content.json',import.meta.url),{signal:controller.signal,cache:'no-cache'});}finally{clearTimeout(timer);}
    if(!response.ok)throw new Error(`Content request failed (${response.status}).`);
    catalog=validateCatalog(await response.json());
    try{storage=window.localStorage;}catch{storage={getItem(){throw new Error('Unavailable');},setItem(){throw new Error('Unavailable');}};}
    const loaded=loadState(storage,catalog.cards);state=loaded.state;blockedStorage=Boolean(loaded.warning);warning(loaded.warning);
    $('topics').innerHTML=[['all','For you'],...Object.entries(TOPICS)].map(([id,name])=>`<button type="button" data-topic="${e(id)}" aria-pressed="${id===topic}">${e(name)}</button>`).join('');
    setupEvents();$('settings-open').disabled=false;render();if(hashCard())jumpToCard(hashCard());
  }catch(error){
    stream.setAttribute('aria-busy','false');
    stream.innerHTML=`<div class="empty"><h2>The feed could not load.</h2><p>${e(error.name==='AbortError'?'The content request timed out.':error.message)}</p><p>Your existing saved progress has not been changed.</p><button type="button" id="retry">Try again</button><p><a href="../">Return to the Reading Room</a></p></div>`;
    $('retry').addEventListener('click',()=>location.reload());
  }
}
start();
