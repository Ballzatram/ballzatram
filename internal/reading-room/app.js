const CURRICULUM=Object.keys(DATA);
const NAV=[...CURRICULUM,"Finished"];
const FINISHED_MAP=Object.fromEntries(PERSONAL_FINISHED.map(b=>[b[0],b]));

const CATALOG=new Map();
const TITLE_CATEGORY={};
for(const category of CURRICULUM){
  for(const book of DATA[category]){
    if(!CATALOG.has(book[0]))CATALOG.set(book[0],book);
    if(!TITLE_CATEGORY[book[0]])TITLE_CATEGORY[book[0]]=category;
  }
}
for(const book of PERSONAL_FINISHED){
  if(!CATALOG.has(book[0]))CATALOG.set(book[0],book);
  if(!TITLE_CATEGORY[book[0]])TITLE_CATEGORY[book[0]]=(typeof PERSONAL_CATEGORIES!=="undefined"&&PERSONAL_CATEGORIES[book[0]])||"Fiction";
}
const LIBRARY_TOTAL=CATALOG.size;

const el={
  tabs:document.getElementById("tabs"),hero:document.getElementById("hero"),shelfTitle:document.getElementById("shelfTitle"),shelfBlurb:document.getElementById("shelfBlurb"),shelfQuote:document.getElementById("shelfQuote"),search:document.getElementById("search"),shelfProgress:document.getElementById("shelfProgress"),grid:document.getElementById("grid"),readCount:document.getElementById("readCount"),readingCount:document.getElementById("readingCount"),totalCount:document.getElementById("totalCount"),pct:document.getElementById("pct"),meter:document.getElementById("meter"),profile:document.getElementById("profile"),readerArchetype:document.getElementById("readerArchetype"),readerStage:document.getElementById("readerStage"),readerExact:document.getElementById("readerExact"),readerSummary:document.getElementById("readerSummary"),readerBecoming:document.getElementById("readerBecoming"),readerDestination:document.getElementById("readerDestination"),readerSuggestion:document.getElementById("readerSuggestion"),readerSuggestionWhy:document.getElementById("readerSuggestionWhy"),domainGrid:document.getElementById("domainGrid")
};

let active=CURRICULUM[0],status={};
try{status=JSON.parse(localStorage.getItem("ballzatram-reading-room")||"{}")}catch(e){}
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const get=t=>status[slug(t)]||DEFAULTS[t]||(FINISHED_MAP[t]?"Read":"Unread");
const localCover=t=>(typeof LOCAL_COVERS!=="undefined"&&LOCAL_COVERS[t])||null;
function themeFor(track){return track==="Finished"?FINISHED_THEME:THEMES[track]}
function setTheme(track){const t=themeFor(track);document.documentElement.style.setProperty("--accent",t.accent);document.documentElement.style.setProperty("--accent2",t.accent2);document.documentElement.style.setProperty("--page",t.bg);document.documentElement.style.setProperty("--hero",t.hero);const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t.bg;}
function save(t,s){status[slug(t)]=s;try{localStorage.setItem("ballzatram-reading-room",JSON.stringify(status))}catch(e){}render()}
function finishedRows(){const seen=new Set(),out=[];PERSONAL_FINISHED.forEach(b=>{if(get(b[0])==="Read"&&!seen.has(b[0])){seen.add(b[0]);out.push(b)}});CURRICULUM.forEach(k=>DATA[k].forEach(b=>{if(get(b[0])==="Read"&&!seen.has(b[0])){seen.add(b[0]);out.push(b)}}));return out}
function readingRows(){const out=[];for(const [title,book] of CATALOG){if(get(title)==="Reading")out.push(book)}return out}
function stageFor(p){
  if(p>=100)return["Interdisciplinary World-Modeler","You’ve completed the full path."];
  if(p>=85)return["World-Model Builder","You’re integrating domains instead of reading them separately."];
  if(p>=65)return["Independent Scholar","Your reading has enough depth and breadth to form durable frameworks."];
  if(p>=45)return["Cross-Domain Synthesist","You’re connecting history, systems, markets, technology and narrative."];
  if(p>=28)return["Systems Reader","You’re moving from collecting ideas to seeing structures and incentives."];
  if(p>=14)return["Pattern Seeker","Your interests are starting to form a recognizable intellectual shape."];
  return["Explorer","You’re establishing the base layer of your reading identity."];
}
function archetypeFrom(counts){
  const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const [a,b]=[ranked[0]?.[0],ranked[1]?.[0]];
  const pair=new Set([a,b]);
  if(pair.has("Fiction")&&pair.has("Power & Institutions"))return"Narrative Systems Reader";
  if(pair.has("Fiction")&&pair.has("General History"))return"Historical Imagination Builder";
  if(pair.has("Economics & Markets")&&pair.has("Power & Institutions"))return"Institutional Systems Reader";
  if(pair.has("Economics & Markets")&&pair.has("General History"))return"Macro-Historical Thinker";
  if(pair.has("General History")&&pair.has("Western History"))return"Historical Field Reader";
  if(pair.has("Tech & AI")&&pair.has("Economics & Markets"))return"Technical Systems Builder";
  if(pair.has("Tech & AI")&&pair.has("Power & Institutions"))return"AI & Institutions Synthesist";
  if(pair.has("Western History")&&pair.has("Fiction"))return"Frontier Storyteller";
  const top=ranked[0];
  if(!top||top[1]===0)return"Curious Generalist";
  return({"Fiction":"Narrative Explorer","Economics & Markets":"Market Systems Reader","Power & Institutions":"Institutional Analyst","General History":"Historical Synthesist","Western History":"Frontier Historian","Tech & AI":"Technical Builder"})[top[0]]||"Cross-Domain Generalist";
}
function readerModel(){
  const finished=finishedRows();
  const counts=Object.fromEntries(CURRICULUM.map(c=>[c,0]));
  const available=Object.fromEntries(CURRICULUM.map(c=>[c,0]));
  for(const [title] of CATALOG){const c=TITLE_CATEGORY[title];if(c&&available[c]!==undefined)available[c]++}
  for(const [title] of finished){const c=TITLE_CATEGORY[title];if(c&&counts[c]!==undefined)counts[c]++}
  const completion=LIBRARY_TOTAL?finished.length/LIBRARY_TOTAL*100:0;
  const [stage,stageText]=stageFor(completion);
  const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const activeDomains=ranked.filter(([,n])=>n>0).length;
  const top1=ranked[0],top2=ranked[1];
  const archetype=archetypeFrom(counts);
  const nextStage=completion<14?"Pattern Seeker":completion<28?"Systems Reader":completion<45?"Cross-Domain Synthesist":completion<65?"Independent Scholar":completion<85?"World-Model Builder":"Interdisciplinary World-Modeler";
  const weak=ranked.slice().sort((a,b)=>{const ra=(a[1]/Math.max(1,available[a[0]])),rb=(b[1]/Math.max(1,available[b[0]]));return ra-rb})[0];
  let becoming=`${nextStage} — deepen ${top1?.[0]||"your strongest domain"} while adding more ${weak?.[0]||"breadth"}.`;
  const destination="Interdisciplinary World-Modeler — able to connect history, institutions, markets, technology and narrative into one coherent mental model.";

  const maxCount=Math.max(1,...Object.values(counts));
  let bestCategory=null,bestScore=-1;
  for(const c of CURRICULUM){
    const unread=DATA[c].some(([t])=>get(t)==="Unread");
    if(!unread)continue;
    const affinity=counts[c]/maxCount;
    const balance=1-(counts[c]/Math.max(1,available[c]));
    const score=.65*affinity+.35*balance;
    if(score>bestScore){bestScore=score;bestCategory=c}
  }
  const suggestion=bestCategory?DATA[bestCategory].find(([t])=>get(t)==="Unread"):null;
  const suggestionWhy=bestCategory&&suggestion?`A ${bestCategory} pick that fits your current interests while widening the model.`:"You’ve finished every tracked recommendation.";

  return{finished,counts,available,completion,stage,stageText,archetype,activeDomains,top1,top2,becoming,destination,suggestion,suggestionWhy};
}
function updateStats(){
  const model=readerModel();
  const reading=readingRows().length;
  el.readCount.textContent=model.finished.length;
  el.readingCount.textContent=reading;
  el.totalCount.textContent=LIBRARY_TOTAL;
  el.pct.textContent=model.completion.toFixed(1)+"%";
  el.meter.style.width=Math.min(100,model.completion)+"%";
  el.profile.textContent=model.stage;
  el.readerArchetype.textContent=model.archetype;
  el.readerStage.textContent=model.stage;
  el.readerExact.textContent=model.finished.length+" / "+LIBRARY_TOTAL+" finished";
  const strongest=model.top1&&model.top1[1]>0?model.top1[0]:"no dominant domain yet";
  const second=model.top2&&model.top2[1]>0?model.top2[0]:null;
  el.readerSummary.textContent=`${model.finished.length} finished books across ${model.activeDomains} of ${CURRICULUM.length} domains. Your strongest signal is ${strongest}${second?", followed by "+second:""}. ${model.stageText}`;
  el.readerBecoming.textContent=model.becoming;
  el.readerDestination.textContent=model.destination;
  el.readerSuggestion.textContent=model.suggestion?model.suggestion[0]+" — "+model.suggestion[1]:"Library complete";
  el.readerSuggestionWhy.textContent=model.suggestionWhy;
  el.domainGrid.replaceChildren(...CURRICULUM.map(c=>{
    const d=document.createElement("div");d.className="domainCard";
    const top=document.createElement("div");top.className="domainTop";
    const name=document.createElement("span");name.textContent=c;
    const val=document.createElement("b");val.textContent=model.counts[c]+" read";
    top.append(name,val);
    const bar=document.createElement("div");bar.className="domainBar";
    const fill=document.createElement("span");fill.style.width=Math.min(100,(model.counts[c]/Math.max(1,model.available[c]))*100)+"%";
    bar.append(fill);d.append(top,bar);return d;
  }));
}
function tabButton(track){const b=document.createElement("button");b.className="tab"+(track===active?" active":"");b.type="button";b.dataset.track=track;b.style.setProperty("--tabAccent",themeFor(track).accent);const strong=document.createElement("strong"),small=document.createElement("small");strong.textContent=track;small.textContent=track==="Finished"?finishedRows().length+" books":DATA[track].filter(([t])=>get(t)==="Read").length+"/30 read";b.append(strong,small);return b}
function bookCard([title,author]){const s=get(title),article=document.createElement("article");article.className="book";const wrap=document.createElement("div");wrap.className="coverWrap";const fb=document.createElement("div");fb.className="fallback";const ft=document.createElement("div");ft.className="ft";ft.textContent=title;const fa=document.createElement("div");fa.className="fa";fa.textContent=author;fb.append(ft,fa);const cover=localCover(title);if(cover){const img=document.createElement("img");img.className="cover";img.alt="Cover of "+title;img.loading="lazy";img.decoding="async";img.onload=()=>img.classList.add("loaded");img.onerror=()=>img.remove();img.src=cover;wrap.append(fb,img)}else wrap.append(fb);const pill=document.createElement("span");pill.className="statusPill"+(s==="Read"?" read":"");pill.textContent=s;wrap.append(pill);const meta=document.createElement("div");meta.className="bookMeta";const h=document.createElement("h3");h.textContent=title;const a=document.createElement("div");a.className="author";a.textContent=author;const states=document.createElement("div");states.className="states";["Unread","Reading","Read"].forEach(st=>{const b=document.createElement("button");b.type="button";b.className="state"+(s===st?" on":"");b.dataset.title=title;b.dataset.state=st;b.textContent=st;states.append(b)});meta.append(h,a,states);article.append(wrap,meta);return article}
function render(){try{setTheme(active);el.tabs.replaceChildren(...NAV.map(tabButton));const idx=NAV.indexOf(active),theme=themeFor(active),isFinished=active==="Finished";el.hero.dataset.glyph=theme.glyph;el.hero.querySelector(".kicker").textContent=isFinished?"Personal archive":"Shelf "+(idx+1)+" of "+CURRICULUM.length;el.shelfTitle.textContent=active;el.shelfBlurb.textContent=isFinished?FINISHED_BLURB:BLURBS[active];el.shelfQuote.textContent=theme.quote;const q=el.search.value.trim().toLowerCase(),source=isFinished?finishedRows():DATA[active],rows=source.filter(([t,a])=>(t+" "+a).toLowerCase().includes(q));el.grid.replaceChildren(...(rows.length?rows.map(bookCard):[Object.assign(document.createElement("div"),{className:"empty",textContent:"No books match that search."})]));el.shelfProgress.innerHTML=isFinished?"<b>"+source.length+"</b> books finished":"<b>"+DATA[active].filter(([t])=>get(t)==="Read").length+"</b> of 30 completed";updateStats()}catch(err){console.error(err);if(el.grid)el.grid.innerHTML='<div class="empty">The library hit a loading error. Refresh once to retry.</div>'}}
el.tabs.addEventListener("click",e=>{const b=e.target.closest("button[data-track]");if(!b)return;active=b.dataset.track;el.search.value="";render()});el.grid.addEventListener("click",e=>{const b=e.target.closest("button[data-state]");if(!b)return;save(b.dataset.title,b.dataset.state)});el.search.addEventListener("input",render);render();