import {WATCH_KEY,CATALOGUE_KEY,validateCatalogue,validateWatchlist,followBill,markSeen,changesSince,filterBills,freshness} from './tracker-core.mjs';
import {validateDossier} from './core.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when=value=>value?new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'No successful scan yet';
export function createTracker({panel,onOpen,onNotice,isActive,onFollowChange=()=>{}}) {
  let catalogue=null,watch={schemaVersion:1,bills:[]},error='',loading=false,opening='',requestId=0,visible=40;
  const filters={query:'',chamber:'All chambers',status:'All stages',followedOnly:false};
  try{const raw=localStorage.getItem(WATCH_KEY);if(raw)watch=validateWatchlist(JSON.parse(raw));}catch{error='Your saved watchlist could not be read. Existing browser storage has not been erased.';}
  try{const raw=localStorage.getItem(CATALOGUE_KEY);if(raw)catalogue=validateCatalogue(JSON.parse(raw));}catch{/* An invalid cache is never displayed as live data. */}
  function saveWatch(){try{localStorage.setItem(WATCH_KEY,JSON.stringify(watch));}catch{onNotice('Following is active in this tab, but this browser could not save the watchlist.');}onFollowChange();}
  function render(){
    const sourceOld=!catalogue?.lastSuccessfulDiscoveryAt||Date.now()-Date.parse(catalogue.lastSuccessfulDiscoveryAt)>12*3600000;
    panel.innerHTML=`<section class="tracker-hero"><div class="eyebrow">THE LIVING LEGISLATIVE RECORD</div><h1>Congress, in motion<span>.</span></h1><p>Find a bill. Follow its progress. See what changed.</p></section>
    <div class="tracker-toolbar"><div class="tracker-switch"><button id="browse-bills" aria-pressed="${!filters.followedOnly}" class="${!filters.followedOnly?'primary':''}">Browse bills</button><button id="watch-bills" aria-pressed="${filters.followedOnly}" class="${filters.followedOnly?'primary':''}">Following (${watch.bills.length})</button></div><button id="refresh-tracker" ${loading?'disabled':''}>${loading?'Checking catalogue…':'↻ Check for updates'}</button></div>
    <div class="note ${sourceOld?'tracker-stale':''}"><strong>${catalogue?`${catalogue.bills.length.toLocaleString()} bills indexed · ${catalogue.congress}th Congress`:'Connecting to the bill catalogue…'}</strong><br>${catalogue?`Official sources last scanned ${escape(when(catalogue.lastSuccessfulDiscoveryAt))}. Scheduled every four hours; this page checks for published updates every five minutes.`:''}${sourceOld&&catalogue?'<br><strong>Source discovery is overdue. These are the last available records.</strong>':''}${catalogue?.failures.length?`<br>${catalogue.failures.length} source request(s) failed during the last scan; older successful records are retained.`:''}${error?`<br><strong>${escape(error)}</strong>`:''}</div>
    <div class="tracker-filters"><label>Find a bill<input id="bill-query" type="search" value="${escape(filters.query)}" placeholder="Bill number, title, sponsor, or topic…"></label><label>Chamber<select id="bill-chamber">${['All chambers','House','Senate'].map(x=>`<option ${x===filters.chamber?'selected':''}>${x}</option>`).join('')}</select></label><label>Stage<select id="bill-stage">${['All stages',...[...new Set(catalogue?.bills.map(b=>b.status)||[])]].map(x=>`<option ${x===filters.status?'selected':''}>${escape(x)}</option>`).join('')}</select></label></div>
    <p id="tracker-count" class="search-result" aria-live="polite"></p><div id="tracker-bills" class="tracker-grid"></div><button id="more-bills" hidden>Show more bills</button>
    <details class="tracker-method"><summary>Coverage, refreshes & following</summary><p>The catalogue discovers House and Senate bills from official GPO sitemaps, then indexes a bounded batch each refresh. ${catalogue?`${catalogue.bills.length.toLocaleString()} of ${catalogue.discoveredCount.toLocaleString()} discovered records are currently searchable.`:''} Resolutions are outside this first scope. No match means “not indexed here,” not “no such bill.”</p><p>Following saves a watchlist on this browser. New records are highlighted when you return. It does not send email, push notifications, or synchronize across devices. An upstream metadata correction can update a record without a new vote.</p><p>“Check for updates” fetches the latest published catalogue; it cannot make GPO publish faster. The schedule can be delayed by source availability or hosting. Each bill retains its own successful check time. Unchanged source timestamps can be confirmed from the official sitemap; the reading view separately shows when the underlying record was retrieved.</p><p><a href="https://www.govinfo.gov/bulkdata/BILLSTATUS" target="_blank" rel="noopener noreferrer">Official source repository ↗</a> · <a href="https://www.congress.gov/" target="_blank" rel="noopener noreferrer">Search all legislation on Congress.gov ↗</a></p></details>`;
    for(const [id,key] of [['bill-query','query'],['bill-chamber','chamber'],['bill-stage','status']])panel.querySelector('#'+id).oninput=e=>{filters[key]=e.target.value;visible=40;renderRows();};
    panel.querySelector('#browse-bills').onclick=()=>{filters.followedOnly=false;visible=40;render();};
    panel.querySelector('#watch-bills').onclick=()=>{filters.followedOnly=true;visible=40;render();};
    panel.querySelector('#refresh-tracker').onclick=()=>refresh();
    panel.querySelector('#more-bills').onclick=()=>{visible+=40;renderRows();};
    renderRows();
  }
  function renderRows(){
    const node=panel.querySelector('#tracker-bills');if(!node)return;
    const bills=filterBills(catalogue?.bills||[],filters,watch);
    panel.querySelector('#tracker-count').textContent=`${bills.length} matching bills${filters.followedOnly?' in your watchlist':''}`;
    const missing=filters.followedOnly?watch.bills.filter(w=>!catalogue?.bills.some(b=>b.id===w.id)):[];
    node.innerHTML=bills.slice(0,visible).map(b=>{
      const saved=watch.bills.find(x=>x.id===b.id),changes=changesSince(b,saved),health=freshness(b);
      return `<article class="card tracker-bill"><div class="card-top"><span class="eyebrow">${escape(b.billLabel)}</span>${changes.length?'<span class="badge amber">New since viewed</span>':''}</div><h3>${escape(b.title)}</h3><div class="tags"><span class="badge">${escape(b.status)}</span><span class="badge">${escape(b.topic)}</span></div><p class="muted">${escape(b.sponsor)}</p><div class="tracker-activity"><time>${escape(b.latestAction.date)}</time><p>${escape(b.latestAction.text)}</p></div>${changes.length?`<p class="tracker-change">${changes.map(escape).join(' · ')}</p>`:''}<p class="tracker-freshness ${health!=='Checked recently'?'overdue':''}">${escape(health)} · ${escape(when(b.activityCheckedAt||b.checkedAt))}</p><div class="card-actions"><button class="primary" data-open-bill="${escape(b.id)}" ${opening===b.id?'disabled':''}>${opening===b.id?'Opening…':'Open bill →'}</button><button data-follow-bill="${escape(b.id)}" aria-pressed="${Boolean(saved)}">${saved?'★ Following':'☆ Follow bill'}</button></div></article>`;
    }).join('')+missing.map(x=>`<article class="card"><h3>${escape(x.title||x.id)}</h3><p>This followed bill is not in the current published catalogue. Its previous record has not been treated as new activity.</p><button data-unfollow-missing="${escape(x.id)}">Unfollow</button></article>`).join('');
    if(!bills.length&&!missing.length)node.innerHTML=`<div class="empty"><h3>${filters.followedOnly?'Your watchlist starts here.':catalogue?'No indexed bills match.':'No catalogue is available yet.'}</h3><p>${filters.followedOnly?'Browse bills and select Follow bill to see future activity here.':catalogue?'Try a bill number, a broader topic, or check the official source. Catalogue coverage expands automatically.':'You can retry the refresh or inspect the original historical reference case from Bill X-Ray.'}</p></div>`;
    panel.querySelector('#more-bills').hidden=bills.length<=visible;
  }
  async function refresh(){
    if(loading)return;loading=true;if(isActive())render();
    try{
      const response=await fetch('./live/index.json',{cache:'no-store',signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error(`Catalogue returned ${response.status}`);
      const next=validateCatalogue(await response.json());catalogue=next;error='';
      try{localStorage.setItem(CATALOGUE_KEY,JSON.stringify(next));}catch{/* Cache is optional; the watchlist reports its own persistence errors. */}
    }catch(exc){error=`Could not check for updates: ${exc.message}. ${catalogue?'Showing the last available catalogue.':'The source may still be refreshing.'}`;}
    finally{loading=false;if(isActive())render();}
  }
  async function openBill(id){
    const bill=catalogue?.bills.find(x=>x.id===id);if(!bill)return;
    const ownRequest=++requestId;opening=id;renderRows();
    try{
      const response=await fetch('./live/'+bill.detailPath,{signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw new Error(`Bill file returned ${response.status}; refresh the catalogue and try again`);
      const raw=await response.arrayBuffer();
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),x=>x.toString(16).padStart(2,'0')).join('');
      if(digest!==bill.detailSha256)throw new Error('Bill file does not match the catalogue fingerprint');
      const dossier=validateDossier(JSON.parse(new TextDecoder().decode(raw)));
      if(dossier.tracker?.billId!==bill.id||dossier.id!==`${bill.id}@${bill.fingerprint.slice(0,16)}`)throw new Error('Bill identity mismatch');
      if(ownRequest!==requestId)return;
      onOpen(dossier,bill);watch=markSeen(watch,bill);saveWatch();
    }catch(exc){if(ownRequest===requestId)onNotice(`Could not open bill: ${exc.message}. Your existing investigation is unchanged.`);}
    finally{if(ownRequest===requestId){opening='';if(isActive())renderRows();}}
  }
  function follow(id){
    const bill=catalogue?.bills.find(x=>x.id===id);if(!bill)return;
    try{watch=watch.bills.some(x=>x.id===id)?{...watch,bills:watch.bills.filter(x=>x.id!==id)}:followBill(watch,bill);saveWatch();if(isActive())render();}catch(exc){onNotice(exc.message);}
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.openBill)openBill(button.dataset.openBill);
    if(button.dataset.followBill)follow(button.dataset.followBill);
    if(button.dataset.unfollowMissing){watch={...watch,bills:watch.bills.filter(x=>x.id!==button.dataset.unfollowMissing)};saveWatch();render();}
  });
  const timer=window.setInterval(()=>{if(!document.hidden)refresh();},5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  return {render,refresh,openBill,follow,isFollowed:id=>watch.bills.some(x=>x.id===id),hasBill:id=>Boolean(catalogue?.bills.some(b=>b.id===id)),destroy:()=>window.clearInterval(timer)};
}
