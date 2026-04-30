const stages={search:document.getElementById('stage-search'),processing:document.getElementById('stage-processing'),results:document.getElementById('stage-results')};
const form=document.getElementById('search-form');const processingText=document.getElementById('processing-text');const summary=document.getElementById('summary');const resultsEl=document.getElementById('results');
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const activate=(k)=>{Object.values(stages).forEach(s=>s.classList.remove('stage-active'));stages[k].classList.add('stage-active')};

function queryFromForm(){
  const city=document.getElementById('city').value.trim();
  const state=document.getElementById('state').value.trim();
  const county=document.getElementById('county').value.trim();
  const minAcres=document.getElementById('min-acres').value.trim();
  const maxPrice=document.getElementById('max-price').value.trim();
  const goal=document.getElementById('goal').value.trim();
  const source=document.getElementById('source').value.trim();
  const geo=[city,county,state].filter(Boolean).join(' ');
  const sourceClause=source==='all'?'site:landsearch.com OR site:land.com OR site:loopnet.com':`site:${source}.com`;
  return `land for sale ${geo} ${goal} ${minAcres} acres max ${maxPrice} ${sourceClause}`.trim();
}

function parseJinaSearch(text){
  const lines=text.split('\n').filter(Boolean);
  const out=[];
  for(const ln of lines){
    const m=ln.match(/\[(.*?)\]\((https?:\/\/[^)]+)\)/);
    if(!m) continue;
    const title=m[1].trim(); const url=m[2].trim();
    if(/landsearch|land\.com|loopnet/i.test(url)){
      out.push({title,url,domain:(new URL(url)).hostname.replace('www.','')});
    }
  }
  return out;
}

function render(rows){
  resultsEl.innerHTML='';
  rows.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${r.title}</td><td>${r.domain}</td><td><a href="${r.url}" target="_blank" rel="noreferrer">Open Listing</a></td>`;resultsEl.appendChild(tr);});
}

form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  activate('processing');
  const q=queryFromForm();
  processingText.textContent='Searching provider indexes...'; await wait(400);
  const proxyUrl=`https://r.jina.ai/http://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  let rows=[];
  try{const txt=await fetch(proxyUrl,{cache:'no-store'}).then(r=>r.text()); rows=parseJinaSearch(txt);}catch(err){rows=[];}
  summary.textContent=rows.length?`Found ${rows.length} web listings for query: ${q}`:'No listings found from web search. Try broader geography or fewer constraints.';
  render(rows);
  activate('results');
});
