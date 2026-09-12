import {WATCH_KEY,CATALOGUE_KEY,validateCatalogue,validateWatchlist,followBill,markSeen,changesSince,filterBills,freshness} from './tracker-core.mjs';
import {validateDossier,MAX_IMPORT} from './core.mjs';
import {escape as e,dateLabel as when,sourceLink} from './citizen.mjs';

export function createTracker({panel,onOpen,onNotice,isActive,onFollowChange=()=>{}}) {
  let catalogue=null,watch={schemaVersion:1,bills:[]},error='',loading=false,opening='',requestId=0,visible=20,openController;
  const filters={query:'',chamber:'All chambers',status:'All stages',followedOnly:false};
  try{const raw=localStorage.getItem(WATCH_KEY);if(raw)watch=validateWatchlist(JSON.parse(raw));}catch{error='Your saved watchlist could not be read. Existing browser storage has not been erased.';}
  try{const raw=localStorage.getItem(CATALOGUE_KEY);if(raw)catalogue=validateCatalogue(JSON.parse(raw));}catch{/* Unvalidated cache is never displayed as a source record. */}
  function saveWatch(){
    try{localStorage.setItem(WATCH_KEY,JSON.stringify(watch));}catch{onNotice('Following is active in this tab, but this browser could not save it.');}
    onFollowChange();
  }
  function render(){
    const active=panel.contains(document.activeElement)?document.activeElement:null;
    const focus=active?.id,selection=active?.id==='bill-query'?[active.selectionStart,active.selectionEnd]:null;
    const sourceOld=!catalogue?.lastSuccessfulDiscoveryAt||Date.now()-Date.parse(catalogue.lastSuccessfulDiscoveryAt)>12*3600000;
    panel.innerHTML=`<section class="tracker-hero"><div><p class="eyebrow">CONGRESSIONAL ACCOUNTABILITY <span class="beta-label">PUBLIC BETA</span></p><h1>Follow the bill.<br><em>Question the promise.</em></h1><p class="hero-copy">See what Congress puts on the record. Then test public promises against documented actions—not assumptions.</p></div><aside class="hero-note"><span class="record-mark" aria-hidden="true">CA / 01</span><strong>Real records.<br>Room for questions.</strong><p>Bill activity comes from government sources. Personal comparisons are clearly labeled drafts.</p><button class="text-button" data-tab="guide">What’s real here? ↗</button></aside></section>
    <ol class="start-strip" aria-label="How to get started"><li><span>1</span><div><strong>Find a bill</strong><small>Search by number, issue, or sponsor.</small></div></li><li><span>2</span><div><strong>Read the record</strong><small>Open the overview, text, and timeline.</small></div></li><li><span>3</span><div><strong>Follow & compare</strong><small>Watch for activity. Build a sourced comparison.</small></div></li></ol>
    <section class="catalogue-section" aria-label="Bill search"><div class="tracker-toolbar"><div class="tracker-switch"><button id="browse-bills" aria-pressed="${!filters.followedOnly}" class="${!filters.followedOnly?'primary':''}">Browse bills</button><button id="watch-bills" aria-pressed="${filters.followedOnly}" class="${filters.followedOnly?'primary':''}">Following (${watch.bills.length})</button></div><button id="refresh-tracker" class="quiet" ${loading?'disabled':''}>${loading?'Checking for updates…':'Check for updates'}</button></div>
    <div class="tracker-filters"><label>Search bills<input id="bill-query" type="search" value="${e(filters.query)}" placeholder="Try a bill number, topic, or sponsor" autocomplete="off"></label><label>Introduced in<select id="bill-chamber">${['All chambers','House','Senate'].map(x=>`<option ${x===filters.chamber?'selected':''}>${x}</option>`).join('')}</select></label><label>Stage<select id="bill-stage">${['All stages',...[...new Set(catalogue?.bills.map(b=>b.status)||[])]].map(x=>`<option ${x===filters.status?'selected':''}>${e(x)}</option>`).join('')}</select></label></div>
    <div class="catalogue-health ${sourceOld&&catalogue?'tracker-stale':''}"><span class="source-dot" aria-hidden="true"></span><div><strong>${catalogue?`${catalogue.bills.length.toLocaleString()} bills searchable · ${catalogue.congress}th Congress`:'Connecting to official records…'}</strong><p>${catalogue?`Scanned ${e(when(catalogue.lastSuccessfulDiscoveryAt))}. Scheduled every four hours.`:'No uploads needed.'} ${sourceOld&&catalogue?'<strong>The source scan is overdue; showing the last available records.</strong>':''}</p><p>${catalogue?`Partial coverage: ${catalogue.bills.length.toLocaleString()} of ${catalogue.discoveredCount.toLocaleString()} discovered bills. More are added automatically.`:''} <button class="inline-link" data-tab="guide">Sources & limits</button></p>${catalogue?.failures.length?`<p class="error-text">${catalogue.failures.length} source requests failed. Older successful records are retained.</p>`:''}${error?`<p class="error-text" role="alert">${e(error)}</p>`:''}</div></div>
    <div class="results-heading"><p id="tracker-count" aria-live="polite"></p><span>Latest recorded action first</span><button id="clear-filters" class="inline-link">Clear filters</button></div><div id="tracker-bills" class="tracker-grid" ${loading&&!catalogue?'aria-busy="true"':''}></div><button id="more-bills" hidden>Show more bills</button></section>
    <aside class="watch-explainer"><strong>What happens when I follow?</strong><p>The bill appears under Following in this browser. Changed records get a “New since viewed” label. Open the bill to mark the update as seen. This page checks for published updates every five minutes while visible. Email alerts and device sync are not included.</p></aside>`;
    for(const [id,key] of [['bill-query','query'],['bill-chamber','chamber'],['bill-stage','status']])panel.querySelector('#'+id).oninput=event=>{filters[key]=event.target.value;visible=20;renderRows();};
    panel.querySelector('#browse-bills').onclick=()=>{filters.followedOnly=false;visible=20;render();};
    panel.querySelector('#watch-bills').onclick=()=>{filters.followedOnly=true;visible=20;render();};
    panel.querySelector('#refresh-tracker').onclick=()=>refresh();
    panel.querySelector('#more-bills').onclick=()=>{visible+=20;renderRows();};
    panel.querySelector('#clear-filters').onclick=()=>{filters.query='';filters.chamber='All chambers';filters.status='All stages';visible=20;render();panel.querySelector('#bill-query').focus();};
    renderRows();
    const restored=focus&&panel.querySelector('#'+focus);
    if(restored){restored.focus();if(selection)restored.setSelectionRange(...selection);}
  }
  function renderRows(){
    const node=panel.querySelector('#tracker-bills');if(!node)return;
    const bills=filterBills(catalogue?.bills||[],filters,watch);
    panel.querySelector('#tracker-count').textContent=`${bills.length} ${bills.length===1?'bill':'bills'}${filters.followedOnly?' in your watchlist':' found'}`;
    const missing=filters.followedOnly?watch.bills.filter(w=>!catalogue?.bills.some(b=>b.id===w.id)):[];
    node.innerHTML=bills.slice(0,visible).map(b=>{
      const saved=watch.bills.find(x=>x.id===b.id),changes=changesSince(b,saved),health=freshness(b);
      return `<article class="card tracker-bill"><div class="card-top"><span class="eyebrow">${e(b.billLabel)}</span>${changes.length?'<span class="badge amber">New since viewed</span>':'<span class="source-label">Official record</span>'}</div><h3>${e(b.title)}</h3><div class="tags"><span class="badge">${e(b.status)}</span><span class="topic-label">${e(b.topic)}</span></div><p class="sponsor-line"><strong>Sponsor</strong> ${e(b.sponsor)}</p><div class="tracker-activity"><span class="eyebrow">LATEST ACTION</span><time>${e(b.latestAction.date)}</time><p>${e(b.latestAction.text)}</p></div>${changes.length?`<p class="tracker-change">${changes.map(e).join(' · ')}</p>`:''}<p class="tracker-freshness ${health!=='Checked recently'?'overdue':''}">${e(health)} · ${e(when(b.activityCheckedAt||b.checkedAt))}</p><div class="card-actions"><button class="primary" data-open-bill="${e(b.id)}" aria-label="Open ${e(b.billLabel)}" ${opening===b.id?'disabled':''}>${opening===b.id?'Opening…':'Open bill →'}</button><button data-follow-bill="${e(b.id)}" aria-label="${saved?'Unfollow':'Follow'} ${e(b.billLabel)}" aria-pressed="${Boolean(saved)}">${saved?'★ Following':'☆ Follow'}</button>${sourceLink(b.sourceUrl,'Source')}</div></article>`;
    }).join('')+missing.map(x=>`<article class="card"><h3>${e(x.title||x.id)}</h3><p>This followed bill is not in the current catalogue. Your follow is saved; no new activity is inferred.</p><button data-unfollow-missing="${e(x.id)}">Unfollow unavailable bill</button></article>`).join('');
    if(!bills.length&&!missing.length)node.innerHTML=`<div class="empty"><h3>${!catalogue&&loading?'Loading bill records…':filters.followedOnly&&!watch.bills.length?'Your watchlist is ready.':catalogue?'No indexed bills match these filters.':'The catalogue could not be loaded.'}</h3><p>${!catalogue&&loading?'This may take a moment.':filters.followedOnly&&!watch.bills.length?'Choose Browse bills, then select Follow on a bill you care about.':catalogue?'Clear the filters or try a broader search. A missing result may mean this bill is not indexed yet.':'Use Check for updates to retry. No sample data has been substituted.'}</p>${catalogue?`<p>${sourceLink('https://www.congress.gov/','Search all legislation on Congress.gov')}</p>`:''}</div>`;
    panel.querySelector('#more-bills').hidden=bills.length<=visible;
    panel.querySelector('#clear-filters').hidden=!filters.query&&filters.chamber==='All chambers'&&filters.status==='All stages';
  }
  let refreshPromise;
  function refresh(){
    if(loading)return refreshPromise;
    loading=true;if(isActive())render();
    refreshPromise=(async()=>{
      try{
        const response=await fetch('./live/index.json',{cache:'no-store',signal:AbortSignal.timeout(20000)});
        if(!response.ok)throw new Error(`Catalogue returned ${response.status}`);
        const next=validateCatalogue(await response.json());catalogue=next;error='';
        try{localStorage.setItem(CATALOGUE_KEY,JSON.stringify(next));}catch{/* Cache is optional. */}
      }catch(exc){error=`Could not check for updates: ${exc.message}. ${catalogue?'Showing the last available catalogue.':'Please retry shortly.'}`;}
      finally{loading=false;if(isActive())render();}
    })();
    return refreshPromise;
  }
  function cancelOpen(){requestId++;openController?.abort();opening='';}
  async function openBill(id,options={}){
    const bill=catalogue?.bills.find(x=>x.id===id);
    if(!bill){onNotice('This bill is not in the current catalogue. Search for another bill or check Congress.gov.');return false;}
    cancelOpen();const ownRequest=requestId;opening=id;const controller=new AbortController();openController=controller;
    const timeout=setTimeout(()=>controller.abort(),30000);
    if(isActive())renderRows();
    try{
      const response=await fetch('./live/'+bill.detailPath,{signal:controller.signal});
      if(!response.ok)throw new Error(`Bill file returned ${response.status}; refresh the catalogue and try again`);
      const raw=await response.arrayBuffer();if(raw.byteLength>MAX_IMPORT)throw new Error('Bill file exceeds the reading limit');
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),x=>x.toString(16).padStart(2,'0')).join('');
      if(digest!==bill.detailSha256)throw new Error('Bill file does not match the catalogue fingerprint');
      const dossier=validateDossier(JSON.parse(new TextDecoder().decode(raw)));
      if(dossier.tracker?.billId!==bill.id||dossier.id!==`${bill.id}@${bill.fingerprint.slice(0,16)}`)throw new Error('Bill identity mismatch');
      if(ownRequest!==requestId)return false;
      onOpen(dossier,bill,options);watch=markSeen(watch,bill);saveWatch();return true;
    }catch(exc){if(ownRequest===requestId)onNotice(`Could not open bill: ${exc.message}. Your existing research is unchanged.`);return false;}
    finally{clearTimeout(timeout);if(ownRequest===requestId){opening='';if(isActive())renderRows();}}
  }
  function follow(id){
    const bill=catalogue?.bills.find(x=>x.id===id);if(!bill)return;
    try{watch=watch.bills.some(x=>x.id===id)?{...watch,bills:watch.bills.filter(x=>x.id!==id)}:followBill(watch,bill);saveWatch();if(isActive())render();}catch(exc){onNotice(exc.message);}
  }
  function click(event){
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.openBill)openBill(button.dataset.openBill);
    if(button.dataset.followBill)follow(button.dataset.followBill);
    if(button.dataset.unfollowMissing){watch={...watch,bills:watch.bills.filter(x=>x.id!==button.dataset.unfollowMissing)};saveWatch();render();}
  }
  const visibility=()=>{if(!document.hidden)refresh();};
  document.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);
  const timer=window.setInterval(visibility,5*60*1000);
  return {render,refresh,openBill,follow,cancelOpen,getCatalogue:()=>catalogue,getBill:id=>catalogue?.bills.find(b=>b.id===id),isFollowed:id=>watch.bills.some(x=>x.id===id),hasBill:id=>Boolean(catalogue?.bills.some(b=>b.id===id)),destroy:()=>{window.clearInterval(timer);cancelOpen();document.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);}};
}
