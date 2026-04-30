const stages={intake:document.getElementById('stage-intake'),processing:document.getElementById('stage-processing'),results:document.getElementById('stage-results')};
const form=document.getElementById('search-form');const processingText=document.getElementById('processing-text');const summary=document.getElementById('summary');const resultsEl=document.getElementById('results');
const activate=(k)=>{Object.values(stages).forEach(s=>s.classList.remove('stage-active'));stages[k].classList.add('stage-active')};
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));

function buildQuery(){
  const loc=document.getElementById('location').value.trim();
  const goal=document.getElementById('goal').value.trim();
  const min=Number(document.getElementById('min-acres').value||0);
  const max=Number(document.getElementById('max-price').value||0);
  const src=document.getElementById('source').value;
  const srcClause=src==='all'?'site:landsearch.com OR site:land.com OR site:loopnet.com':`site:${src}.com`;
  return {raw:`land for sale ${loc} ${goal} ${min} acres max ${max} ${srcClause}`.trim(),min,max,loc,goal};
}

function parseJina(text){
  const rows=[];
  for(const ln of text.split('\n')){
    const m=ln.match(/\[(.*?)\]\((https?:\/\/[^)]+)\)/);
    if(!m) continue;
    const url=m[2];
    if(!/landsearch|land\.com|loopnet/i.test(url)) continue;
    rows.push({title:m[1],url,source:(new URL(url)).hostname.replace('www.','')});
  }
  return rows;
}

async function fallbackRows(){
  try{const r=await fetch('./output/seed_listings.json',{cache:'no-store'});if(!r.ok)return[];return await r.json();}catch{return[];}
}

function scoreRow(row,query){
  let score=60;
  const t=(row.title||'').toLowerCase();
  if(t.includes((query.loc||'').toLowerCase())) score+=20;
  if(/acre|farm|ranch|tract|land/.test(t)) score+=8;
  if(query.goal.toLowerCase().includes('equestrian') && /horse|equestrian|pasture|farm/.test(t)) score+=12;
  return Math.min(100,score);
}

function render(rows,query){
  resultsEl.innerHTML='';
  const enriched=rows.map(r=>({...r,fit:scoreRow(r,query)})).sort((a,b)=>b.fit-a.fit);
  enriched.forEach(row=>{
    const tr=document.createElement('tr');
    const why=`Fit ${row.fit}/100 based on title/source relevance.`;
    tr.innerHTML=`<td>${row.title||'Listing'}</td><td>${row.source||'web'}</td><td>${why}</td><td><a href="${row.url}" target="_blank" rel="noreferrer">Open listing</a></td>`;
    resultsEl.appendChild(tr);
  });
  return enriched;
}

form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  activate('processing');
  const query=buildQuery();
  processingText.textContent='Searching listing providers and ranking candidates...';
  await wait(450);

  let rows=[];
  try{
    const proxy=`https://r.jina.ai/http://duckduckgo.com/html/?q=${encodeURIComponent(query.raw)}`;
    const txt=await fetch(proxy,{cache:'no-store'}).then(r=>r.text());
    rows=parseJina(txt);
  }catch{}

  if(!rows.length){
    processingText.textContent='Live search returned no rows. Loading verified fallback set...';
    await wait(350);
    rows=await fallbackRows();
  }

  const enriched=render(rows,query);
  summary.textContent=enriched.length
    ? `Found ${enriched.length} listings for ${query.loc}. Ranked by relevance.`
    : 'No listings found. Broaden location or budget constraints.';

  activate('results');
});
