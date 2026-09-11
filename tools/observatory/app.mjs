import {STORAGE_KEY, MAX_IMPORT, CONDUCT, OUTCOME, safeUrl, validateDossier, validateResearch, emptyResearch, parseImport, compareVersions, wordDiff, exportWorkspace, evidenceContext} from './core.mjs';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link = (url,label) => safeUrl(url) ? `<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>` : esc(label);
const options = (values,selected) => values.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');
const badge = (label,kind='') => `<span class="badge ${kind}">${esc(label)}</span>`;
const panelHead = (title,description,extra='') => `<div class="view-head"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div>${extra}</div>`;
const evidenceButton = (sourceId,locator,text,label='View evidence') => `<button data-evidence="${esc(sourceId)}" data-locator="${esc(locator)}" data-excerpt="${esc(text)}">${esc(label)} ↗</button>`;
let dossier, reference, research, tab='bill', versionId, sectionId, beforeId, afterId;
let workspace={cases:{},activeId:null};
let imported=false;
let voteFilters={query:'',party:'All parties',state:'All states',vote:'All votes'};
function notice(message='') { $('notice').textContent=message; }
function persist() {
  workspace.cases[dossier.id]={dossier,research}; workspace.activeId=dossier.id;
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(workspace)); return true; }
  catch { notice('Changes are available in this tab, but this browser could not save them. Export the dossier to keep your work.'); return false; }
}
function version() { return dossier.versions.find(v=>v.id===versionId) || dossier.versions.at(-1); }
function section() { return version().sections.find(s=>s.id===sectionId) || version().sections[0]; }
function activate(d,r,isImport=false) {
  dossier=validateDossier(d); research=validateResearch(r,d); imported=isImport;
  versionId=d.versions.at(-1).id;sectionId=version().sections[0].id;
  beforeId=d.versions[0].id;afterId=d.versions.at(-1).id;
  voteFilters={query:'',party:'All parties',state:'All states',vote:'All votes'};
  renderShell(); render();
}
function renderShell() {
  $('case-title').textContent=dossier.title;
  $('case-meta').textContent=`${dossier.billLabel} · ${dossier.publicLaws.length?'Public Law '+dossier.publicLaws.join(', '):'No enactment record in this case'} · Historical snapshot`;
  $('mode-label').textContent=dossier.mode==='demo'?'SYNTHETIC DEMO':(imported?'Imported research draft':'Official records · draft analysis');
  $('save-case').textContent=research.saved?'★ Investigation saved':'☆ Save investigation';
  $('reference-case').hidden=dossier.id===reference?.id;
  const cards=[['SECTIONS',version().sections.length,'in selected version'],['BILL VERSIONS',dossier.versions.length,'exact artifacts retained'],['HOUSE RECORDS',dossier.rollcall?.members.length ?? '—',dossier.rollcall?'one recorded roll call':'no roll call imported'],['SOURCE SNAPSHOTS',dossier.sources.length,'with SHA-256 fingerprints']];
  $('metrics').innerHTML=cards.map(([title,value,sub])=>`<div class="metric"><span class="eyebrow">${title}</span><strong>${value}</strong><small>${sub}</small></div>`).join('');
}
function setTab(next,focus=false) {
  tab=next;
  document.querySelectorAll('[data-tab]').forEach(b=>b.dataset.tab===tab?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  history.replaceState(null,'',`#${tab}`);render();
  if(focus)$('panel').focus();
}
function render() {
  if(!dossier)return;
  ({bill:renderBill,versions:renderVersions,congress:renderCongress,promises:renderPromises,coverage:renderCoverage,dossier:renderDossier}[tab]||renderBill)();
}
function versionOptions(selected) { return dossier.versions.map(v=>`<option value="${esc(v.id)}" ${v.id===selected?'selected':''}>${esc(v.label)} (${esc(v.id.toUpperCase())})</option>`).join(''); }
function renderBill() {
  const v=version(),s=section();
  $('panel').innerHTML=panelHead('Bill X-Ray','Start with the words. Inspect every section, its boundaries, and the record behind it.',`<label class="controls">Bill version <select id="bill-version">${versionOptions(versionId)}</select></label>`)+`
  <div class="work-grid"><aside class="section-list" aria-label="Bill sections"><input class="section-search" id="section-search" placeholder="Find a section…" aria-label="Search sections">${v.sections.map(x=>`<button data-section="${esc(x.id)}" class="${s.id===x.id?'selected':''}" aria-pressed="${s.id===x.id}"><small>Section ${esc(x.number)}</small><strong>${esc(x.title)}</strong></button>`).join('')}</aside>
  <article class="card"><div class="card-top"><span class="eyebrow">SECTION ${esc(s.number)} · ${esc(v.id.toUpperCase())}</span>${badge('Original text')}</div><h3>${esc(s.title)}</h3>
  <div class="tags">${s.tags.map(x=>badge(x)).join('')}</div>
  ${s.analysis?`<h4>Reading note ${badge('Draft interpretation','amber')}</h4><p>${esc(s.analysis)}</p>`:'<p class="muted">No interpretation supplied for this version. Read the original wording below.</p>'}
  <h4>What the text says</h4><div class="original">${esc(s.text)}</div><div class="card-actions">${evidenceButton(s.sourceId,s.locator,s.text)}<button id="compare-section">Compare versions →</button></div>
  <details class="osiris"><summary>✧ Read with Osiris</summary><p class="muted">Which words define the scope? What exception changes the reading? Which missing record would change your conclusion?</p><label for="osiris-question">Ask about this section</label><textarea id="osiris-question" maxlength="2500" rows="3">Explain this section in plain English. Cite its exact wording and identify what it does not establish.</textarea><p class="muted">Asking sends this section and question through your configured Ballzatram AI bridge. Responses remain draft notes.</p><button id="ask-osiris">Ask Osiris</button> <a href="../ai/index.html">AI settings</a><p id="osiris-answer" class="answer" aria-live="polite"></p></details>
  <details class="osiris"><summary>Parsing & missing context</summary><p>${v.manifest.sectionCount} section nodes accounted for. ${v.manifest.unaccountedBlocks.length} additional body blocks flagged.</p><p>${esc(v.manifest.scope)}</p>${v.manifest.unaccountedBlocks.map(x=>`<div class="original">${esc(x)}</div>`).join('')}<p>Text completeness is not legal completeness. Incorporated law, regulations, judicial decisions, actual authorship and effects require additional records.</p>${s.references.length?`<h4>Structured cross-references (unresolved)</h4>${s.references.map(x=>`<p>${esc(x)}</p>`).join('')}`:'<p>No structured cross-reference elements were extracted. Plain-text references may still exist.</p>'}</details>
  </article></div>`;
  $('bill-version').onchange=e=>{versionId=e.target.value;sectionId=version().sections[0].id;renderShell();renderBill();};
  $('section-search').oninput=e=>{let shown=0;document.querySelectorAll('[data-section]').forEach(b=>{const found=v.sections.find(x=>x.id===b.dataset.section);b.hidden=!`${found.title} ${found.text}`.toLowerCase().includes(e.target.value.toLowerCase());b.style.display=b.hidden?'none':'';if(!b.hidden)shown++;});e.target.setAttribute('aria-description',`${shown} matching sections`);};
  $('compare-section').onclick=()=>setTab('versions',true);
  $('ask-osiris').onclick=askOsiris;
}
async function askOsiris() {
  const output=$('osiris-answer'),button=$('ask-osiris');
  const question=$('osiris-question').value.trim();
  if(!question){output.textContent='Enter a question first.';return;}
  let settings;
  try { settings=JSON.parse(localStorage.getItem('ballzatram:ai-bridge-settings:v1')||'{}'); } catch { settings={}; }
  if(!safeUrl(settings.url)||!settings.token){output.textContent='Configure an HTTPS bridge URL and access token in AI settings first. The bill workbench works without an AI connection.';return;}
  const current=evidenceContext(dossier,version(),section());
  button.disabled=true;output.textContent='Reading the selected evidence…';
  try {
    const response=await fetch(`${settings.url.replace(/\/$/,'')}/v1/assist`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${settings.token}`},body:JSON.stringify({tool:'observatory',prompt:question,context:current}),signal:AbortSignal.timeout(45000)});
    const data=await response.json();if(!response.ok)throw new Error(data.error||`Bridge returned ${response.status}`);
    if(typeof data.answer!=='string')throw new Error('Bridge returned no answer.');
    output.textContent=`DRAFT · Check every claim against the source\n\n${data.answer}`;
  } catch(error){output.textContent=`Could not get an answer: ${error.message}`;} finally{button.disabled=false;}
}
function renderVersions() {
  const before=dossier.versions.find(v=>v.id===beforeId),after=dossier.versions.find(v=>v.id===afterId);
  const rows=compareVersions(before,after);
  $('panel').innerHTML=panelHead('The words that changed','Compare exact versions. Green adds wording; red removes it. This is a text comparison, not a complete legal-effect opinion.')+
  `<div class="controls"><label>Earlier artifact <select id="before-version">${versionOptions(beforeId)}</select></label><span aria-hidden="true">→</span><label>Later artifact <select id="after-version">${versionOptions(afterId)}</select></label></div>
  <div class="note">${rows.filter(r=>r.status!=='Unchanged').length} changed or unmatched section pairs · ${rows.filter(r=>r.status==='Unchanged').length} unchanged. Sections are paired by unique section number. Renumbering needs manual reconciliation; a match does not prove authorship or policy lineage. Both artifacts retain their own original text.</div>
  ${rows.map(r=>{const sec=r.after||r.before,diff=r.before&&r.after&&r.status==='Changed'?wordDiff(r.before.text,r.after.text):null;return `<article class="card diff-row"><div class="diff-heading"><h3>§ ${esc(sec.number)} · ${esc(sec.title)}</h3>${badge(r.status,r.status==='Unchanged'?'':'amber')}</div>${r.status==='Unchanged'?'<p class="muted">No wording difference after whitespace normalization.</p>':diff?`<div class="diff-text">${diff.map(x=>x.kind==='add'?`<ins>${esc(x.text)}</ins>`:x.kind==='remove'?`<del>${esc(x.text)}</del>`:esc(x.text)).join(' ')}</div>`:`<div class="grid-two"><div><h4>Before</h4><div class="original">${esc(r.before?.text||'No matched section')}</div></div><div><h4>After</h4><div class="original">${esc(r.after?.text||'No matched section')}</div></div></div>`}<div class="card-actions">${r.before?evidenceButton(r.before.sourceId,r.before.locator,r.before.text,'Earlier source'):''}${r.after?evidenceButton(r.after.sourceId,r.after.locator,r.after.text,'Later source'):''}</div></article>`;}).join('')}`;
  $('before-version').onchange=e=>{beforeId=e.target.value;renderVersions();};
  $('after-version').onchange=e=>{afterId=e.target.value;renderVersions();};
}
function renderCongress() {
  const roll=dossier.rollcall;
  $('panel').innerHTML=panelHead('Congress & the record','Trace recorded actions and inspect individual House votes. A recorded decision does not establish motive or a campaign commitment.')+
  `<div class="note">${dossier.sponsors.map(s=>`${esc(s.name)} · Formal sponsor · ${esc(s.id)}`).join('<br>')||'No sponsor record imported.'}<br>Senate unanimous consent is a chamber action; it is not a recorded individual vote for every senator. Member affiliations below are from the historical roll call.</div>`+
  (roll?`<article class="card"><div class="card-top"><span class="eyebrow">HOUSE ROLL CALL ${esc(roll.roll)} · ${esc(roll.date)}</span>${badge(roll.question)}</div><h3>${esc(roll.result)} · ${esc(dossier.title)}</h3><div class="vote-total">${Object.entries(roll.totals).map(([name,n])=>`<span><strong>${n}</strong>${esc(name)}</span>`).join('')}</div><div class="bar" aria-hidden="true">${Object.entries(roll.totals).map(([name,n])=>`<span class="${name==='Yea'?'yes':name==='Nay'?'no':'abstain'}" style="width:${100*n/roll.members.length}%"></span>`).join('')}</div><div class="controls"><input id="member-query" placeholder="Find a member or Bioguide ID…" aria-label="Search members" style="max-width:280px" value="${esc(voteFilters.query)}"><select id="party-filter" aria-label="Filter party">${options(['All parties',...new Set(roll.members.map(m=>m.party))],voteFilters.party)}</select><select id="state-filter" aria-label="Filter state">${options(['All states',...[...new Set(roll.members.map(m=>m.state))].sort()],voteFilters.state)}</select><select id="vote-filter" aria-label="Filter vote">${options(['All votes','Yea','Nay','Present','Not Voting'],voteFilters.vote)}</select></div><p id="vote-count" class="search-result" aria-live="polite"></p><div class="table-wrap"><table><thead><tr><th scope="col">MEMBER</th><th scope="col">PARTY / STATE</th><th scope="col">VOTE</th><th scope="col">RECORD</th></tr></thead><tbody id="member-rows"></tbody></table></div></article>`:'<div class="empty"><h3>No individual roll call imported.</h3><p>The action timeline remains available. Missing votes are not abstentions.</p></div>')+
  `<details class="card" style="margin-top:20px" open><summary>Legislative timeline · ${dossier.actions.length} source records</summary><p class="muted">Exact date/text duplicates are collapsed. Related chamber and Library of Congress entries can describe the same event; this is not a count of distinct decisions.</p><ol class="timeline">${dossier.actions.map(a=>`<li><time>${esc(a.date)}</time><p>${esc(a.text)}</p>${evidenceButton(a.sourceId,a.locator,a.text,'Action source')}</li>`).join('')}</ol></details>`;
  if(roll){renderVotes();for(const [id,key] of [['member-query','query'],['party-filter','party'],['state-filter','state'],['vote-filter','vote']])$(id).addEventListener('input',e=>{voteFilters[key]=e.target.value;renderVotes();});}
}
function renderVotes(){
  const members=dossier.rollcall.members.filter(m=>(`${m.name} ${m.id}`.toLowerCase().includes(voteFilters.query.toLowerCase()))&&(voteFilters.party==='All parties'||m.party===voteFilters.party)&&(voteFilters.state==='All states'||m.state===voteFilters.state)&&(voteFilters.vote==='All votes'||m.vote===voteFilters.vote));
  $('vote-count').textContent=`${members.length} of ${dossier.rollcall.members.length} member records shown · Not Voting does not establish a reason for absence.`;
  $('member-rows').innerHTML=members.length?members.map(m=>`<tr><td>${esc(m.name)}<br><small class="muted">${esc(m.id)}</small></td><td>${esc(m.party)} · ${esc(m.state)}</td><td>${badge(m.vote,m.vote==='Nay'?'red':m.vote==='Not Voting'?'amber':'')}</td><td>${evidenceButton(m.sourceId,`recorded-vote / legislator[@name-id='${m.id}']`,`${m.name} (${m.party}-${m.state}): ${m.vote}`,'Source')}</td></tr>`).join(''):'<tr><td colspan="4">No members match these filters.</td></tr>';
}
function actionOptions(selected=[]) { return dossier.actions.map(a=>`<option value="${esc(a.id)}" ${selected.includes(a.id)?'selected':''}>${esc(a.date+' · '+a.text.slice(0,160))}</option>`).join(''); }
function renderPromises() {
  const cards=research.promises.map(p=>{const member=dossier.rollcall?.members.find(m=>m.id===p.memberId);return `<article class="card promise"><div class="card-top"><span class="eyebrow">${esc(p.person)} · ${esc(p.date)}</span>${badge('Your research draft','amber')}</div><blockquote>“${esc(p.quote)}”</blockquote><p>${link(p.url,'Original statement')}</p><h4>Context & measurable interpretation</h4><p>${esc(p.context)}</p><p>${esc(p.interpretation)}</p><p class="muted">Condition / deadline: ${esc(p.condition||'Not specified')} · ${esc(p.deadline||'Not specified')}</p><div class="assessments"><div><span class="eyebrow">CONDUCT VS. COMMITMENT</span><strong>${esc(p.conduct)}</strong></div><div><span class="eyebrow">POLICY OUTCOME</span><strong>${esc(p.outcome)}</strong></div></div><h4>Opportunity to act</h4><p>${esc(p.opportunity)}</p><h4>Reasoning, contrary evidence & gaps</h4><p>${esc(p.explanation)}</p>${member?`<p>Linked record: ${esc(member.name)} (${esc(member.id)}) · ${esc(member.vote)} on House passage. ${evidenceButton(member.sourceId,`member ${member.id}`,`${member.name}: ${member.vote}`)}</p>`:''}${p.actionIds.map(id=>{const a=dossier.actions.find(x=>x.id===id);return `<p>${esc(a.date)} · ${esc(a.text)} ${evidenceButton(a.sourceId,a.locator,a.text)}</p>`;}).join('')}<div class="card-actions"><button data-edit-promise="${esc(p.id)}">Edit assessment</button><button class="danger" data-delete-promise="${esc(p.id)}">Remove draft</button></div></article>`;}).join('');
  $('panel').innerHTML=panelHead('Promises deserve a paper trail','Capture the original commitment, then assess conduct and outcomes on separate tracks. Your assessments stay in this browser until you export them.')+
  (cards?`<div class="stack">${cards}</div>`:'<div class="empty"><h3>A vote is a starting point.</h3><p>No campaign promises have been inferred from the roll call. Add an explicit, sourced statement, its context, and an opportunity to act to begin a case.</p></div>')+
  `<details id="promise-details" class="form-details"><summary id="promise-form-title">+ Add a sourced promise</summary><form id="promise-form"><input type="hidden" name="id"><div class="form-grid">
  <label>Person & office sought<input name="person" required maxlength="300" placeholder="Name, office, election year"></label><label>Statement date<input name="date" type="date" required></label>
  <label class="wide">Original statement URL<input name="url" type="url" required placeholder="https://…"></label><label class="wide">Exact commitment<textarea name="quote" required maxlength="6000" placeholder="Quote the specific commitment, with enough context to preserve its meaning."></textarea></label>
  <label class="wide">Context<textarea name="context" required maxlength="4000" placeholder="Where was this said? Who was the audience? Include relevant qualifications."></textarea></label>
  <label class="wide">Measurable interpretation<textarea name="interpretation" required maxlength="4000" placeholder="What action or result would count, and why?"></textarea></label><label>Condition<input name="condition" maxlength="1000" placeholder="If elected, if a vote occurs…"></label><label>Deadline<input name="deadline" maxlength="300" placeholder="Stated deadline, or not specified"></label>
  <label class="wide">Opportunity to act<textarea name="opportunity" required maxlength="4000" placeholder="What was within this person's authority? Was there an observed opportunity?"></textarea></label>
  <label>Conduct vs. commitment<select name="conduct">${options(CONDUCT,'Pending')}</select></label><label>Policy outcome<select name="outcome">${options(OUTCOME,'Unknown')}</select></label>
  <label class="wide">Link the member’s House roll-call record (optional)<select name="memberId"><option value="">No individual vote linked</option>${(dossier.rollcall?.members||[]).map(m=>`<option value="${esc(m.id)}">${esc(m.name)} · ${esc(m.party)}-${esc(m.state)} · ${esc(m.id)} · ${esc(m.vote)}</option>`).join('')}</select><small>Verify identity from the original statement. The linked vote does not automatically set either assessment.</small></label>
  <label class="wide">Link relevant legislative actions (optional)<select name="actionIds" multiple>${actionOptions()}</select><small>Use Ctrl / Command to select multiple records on desktop.</small></label>
  <label class="wide">Reasoning, contrary evidence & remaining gaps<textarea name="explanation" required maxlength="6000" placeholder="Explain your judgment. Include member explanations, contrary actions, and what remains unknown."></textarea></label>
  </div><p class="note">A bill’s passage does not automatically fulfill a promise. An omnibus vote is not an endorsement of every provision. This form does not confer editorial review.</p><button class="primary" type="submit">Save promise draft</button></form></details>`;
  $('promise-form').onsubmit=e=>{
    e.preventDefault();const data=new FormData(e.target),id=data.get('id')||crypto.randomUUID();
    const p=Object.fromEntries(data);p.id=id;p.actionIds=data.getAll('actionIds');
    const next={...research,promises:[...research.promises.filter(x=>x.id!==id),p]};
    try{validateResearch(next,dossier);research=next;persist();renderPromises();}catch(error){notice(error.message);}
  };
}
function renderCoverage(){
  const keys=dossier.versions.flatMap(v=>v.sections.map(s=>({key:`${v.id}:${s.id}`,label:`${v.id.toUpperCase()} § ${s.number} · ${s.title}`})));
  $('panel').innerHTML=panelHead('What did the coverage discuss?','Map a deliberately selected headline, article body, or official statement to exact provisions. These are manual research annotations.')+
  `<div class="note">Your sample: ${research.coverage.length} items. “Not mapped” means unassessed or outside this mapping—not false, omitted, or unreported. No outlet-wide coverage rate is inferred from this sample.</div>`+
  (research.coverage.length?`<div class="table-wrap"><table><thead><tr><th scope="col">SOURCE & SCOPE</th><th scope="col">PROVISIONS MAPPED</th><th scope="col">RESEARCH NOTE</th><th scope="col">EDIT</th></tr></thead><tbody>${research.coverage.map(c=>`<tr><td>${link(c.url,c.title)}<br><small>${esc(c.kind)} · ${esc(c.date)}</small></td><td>${c.sectionKeys.length?c.sectionKeys.map(k=>`<p class="matrix-yes">${esc(keys.find(x=>x.key===k)?.label)}</p>`).join(''):'<span class="matrix-no">Not mapped</span>'}</td><td>${esc(c.note)}</td><td><button data-edit-coverage="${esc(c.id)}">Edit</button><button class="danger" data-delete-coverage="${esc(c.id)}">Remove</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><h3>Compare the story with the text.</h3><p>Add a headline or statement you want to inspect. Keep headline and article-body mappings separate, and record the limits of your sample.</p></div>')+
  `<details id="coverage-details" class="form-details"><summary>+ Add a coverage mapping</summary><form id="coverage-form"><input name="id" type="hidden"><div class="form-grid"><label class="wide">Title or short description<input name="title" required maxlength="1000"></label><label>Source type<select name="kind">${options(['Headline','Article body','Official statement'])}</select></label><label>Publication date<input name="date" type="date" required></label><label class="wide">Source URL<input name="url" type="url" required placeholder="https://…"></label><label class="wide">Provisions actually discussed<select name="sectionKeys" multiple>${keys.map(k=>`<option value="${esc(k.key)}">${esc(k.label)}</option>`).join('')}</select></label><label class="wide">Mapping rationale, sampled passage & limits<textarea name="note" required maxlength="6000" placeholder="Describe the link in your own words; retain only excerpts you have rights to share."></textarea></label></div><p><button class="primary" type="submit">Save mapping</button></p></form></details>`;
  $('coverage-form').onsubmit=e=>{e.preventDefault();const data=new FormData(e.target),id=data.get('id')||crypto.randomUUID(),c=Object.fromEntries(data);c.id=id;c.sectionKeys=data.getAll('sectionKeys');const next={...research,coverage:[...research.coverage.filter(x=>x.id!==id),c]};try{validateResearch(next,dossier);research=next;persist();renderCoverage();}catch(error){notice(error.message);}};
}
function renderDossier(){
  $('panel').innerHTML=panelHead('Your investigation','A portable case file: bill text, versioned sources, congressional records, research notes, and the questions still open.')+
  `<div class="grid-two"><article class="card"><span class="eyebrow">INVESTIGATION NOTEBOOK</span><h3>What would change your mind?</h3><label for="case-notes">Finding, competing explanations, missing records & next steps</label><textarea id="case-notes" rows="10" maxlength="50000" placeholder="Separate what the record establishes from what you infer…">${esc(research.notes)}</textarea><p id="notes-status" class="muted" aria-live="polite">Notes save in this browser as you type.</p><div class="card-actions"><button id="download-notes">Download reading brief</button><button id="print-case">Print this view</button></div></article><article class="card"><span class="eyebrow">SCOPE & METHOD</span><h3>Make the limits visible.</h3><p>${esc(dossier.selectionNote||'Imported case. Selection method not supplied.')}</p><p><strong>${research.promises.length}</strong> promise drafts · <strong>${research.coverage.length}</strong> coverage mappings</p><p>Source snapshots identify the original artifact. Hashes do not authenticate an imported file or certify interpretations. This workbench cannot grant independent review or publication status.</p><p>Potential beneficiaries, lobbying links, actual policy authors and measured outcomes are not inferred. Add evidence to your notebook before drawing those connections.</p><p>${link('https://www.congress.gov/','Browse Congress.gov')}</p></article></div>
  <h3>Source register</h3><div class="grid-two">${dossier.sources.map(s=>`<article class="card source-card"><div class="card-top"><span class="eyebrow">${esc(s.id)}</span>${badge(s.kind==='synthetic'?'Synthetic':'Source record')}</div><p>${link(s.url,'Open original record')}</p><p class="muted">Retrieved ${esc(s.retrievedAt)}</p><code>SHA-256 ${esc(s.sha256)}</code><p>${esc(s.rights)}</p><div class="card-actions">${evidenceButton(s.id,'Full source snapshot','','Inspect provenance')}</div></article>`).join('')}</div>
  <h3>Saved cases in this browser</h3><div class="controls">${Object.values(workspace.cases).map(x=>`<button data-open-case="${esc(x.dossier.id)}">${esc(x.dossier.title)}</button>`).join('')||'<p class="muted">Save this investigation to keep a local copy.</p>'}</div>`;
  $('case-notes').oninput=e=>{research.notes=e.target.value;$('notes-status').textContent=persist()?'Saved in this browser.':'Could not save; export to keep your work.';};
  $('download-notes').onclick=()=>download(`${dossier.id}-reading-brief.md`,readingBrief(),'text/markdown');
  $('print-case').onclick=()=>window.print();
}
function readingBrief(){
  return `# ${dossier.title}\n\nRESEARCH DRAFT · ${dossier.billLabel}\n\n${dossier.selectionNote||''}\n\n## Notebook\n\n${research.notes||'No notes yet.'}\n\n## Promise assessments\n\n${research.promises.map(p=>`### ${p.person}\n\n${p.quote}\n\nSource: ${p.url}\nContext: ${p.context}\nInterpretation: ${p.interpretation}\nCondition: ${p.condition||'Unspecified'}\nDeadline: ${p.deadline||'Unspecified'}\nOpportunity: ${p.opportunity}\nConduct: ${p.conduct}\nOutcome: ${p.outcome}\n\n${p.explanation}`).join('\n\n')}\n\n## Sources\n\n${dossier.sources.map(s=>`- ${s.id}: ${s.url}\n  Retrieved: ${s.retrievedAt}\n  SHA-256: ${s.sha256}`).join('\n')}\n\nThe full JSON dossier contains the section text, vote records, coverage mappings and evidence references. Interpretations have no authenticated editorial review.\n`;
}
function download(name,content,type='application/json'){
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showEvidence(button){
  const source=dossier.sources.find(s=>s.id===button.dataset.evidence);if(!source)return;
  const localPath=!imported && dossier.id===reference?.id && source.path===reference.sources.find(s=>s.id===source.id)?.path ? source.path:null;
  $('evidence-body').innerHTML=`<div class="eyebrow">FOLLOW THE EVIDENCE</div><h2>${esc(source.id)}</h2><p class="evidence-link">${link(source.url,'Original source')}</p>${localPath?`<p><a href="${esc(localPath)}" download>Download pinned XML snapshot ↓</a></p>`:''}<h4>Locator</h4><p class="evidence-hash">${esc(button.dataset.locator)}</p>${button.dataset.excerpt?`<h4>Extracted text / selected record</h4><div class="original">${esc(button.dataset.excerpt)}</div>`:''}<p class="muted">Retrieved ${esc(source.retrievedAt)}</p><p class="evidence-hash">SHA-256<br>${esc(source.sha256)}</p><p>${esc(source.rights)}</p><div class="note">${imported?'Imported provenance has not been authenticated against the remote source.':'Original XML is pinned alongside this case; extracted formatting is normalized for reading.'} Interpretations remain research drafts.</div>`;
  $('evidence-dialog').showModal();
}
function fillForm(form,record,multiKey){
  for(const [key,value] of Object.entries(record)){
    const field=form.elements.namedItem(key);if(!field)continue;
    if(key===multiKey)Array.from(field.options).forEach(o=>o.selected=value.includes(o.value));else field.value=value;
  }
}
document.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.tab)setTab(button.dataset.tab,true);
  if(button.dataset.section){sectionId=button.dataset.section;renderBill();}
  if(button.dataset.evidence)showEvidence(button);
  for(const kind of ['promise','coverage']){
    const cap=kind[0].toUpperCase()+kind.slice(1),collection=kind==='promise'?'promises':'coverage';
    if(button.dataset[`delete${cap}`]){const id=button.dataset[`delete${cap}`];research[collection]=research[collection].filter(x=>x.id!==id);persist();render();}
    if(button.dataset[`edit${cap}`]){const record=research[collection].find(x=>x.id===button.dataset[`edit${cap}`]);$(`${kind}-details`).open=true;fillForm($(`${kind}-form`),record,kind==='promise'?'actionIds':'sectionKeys');$(`${kind}-details`).scrollIntoView({behavior:'smooth'});}
  }
  if(button.dataset.openCase){const saved=workspace.cases[button.dataset.openCase];activate(saved.dossier,saved.research,true);persist();setTab('bill');}
});
$('save-case').onclick=()=>{if(!dossier)return;research.saved=true;if(persist())notice('Investigation saved in this browser. Export a dossier for a portable backup.');renderShell();};
$('export-button').onclick=()=>{if(!dossier)return;try{download(`${dossier.id}-dossier.json`,exportWorkspace(dossier,research));}catch(error){notice(error.message);}};
$('reference-case').onclick=()=>{const saved=workspace.cases[reference.id];activate(reference,saved?.research||emptyResearch(),false);setTab('bill');};
$('import-button').onclick=()=>$('import-file').click();
$('import-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>MAX_IMPORT)throw new Error('File exceeds the 4 MB limit.');const parsed=parseImport(await file.text());activate(parsed.dossier,parsed.research,true);persist();setTab('bill');notice('Case imported as a research draft. Verify its sources before relying on it.');}catch(error){notice(`Import failed: ${error.message}`);}finally{e.target.value='';}
};
async function init(){
  try{
    const response=await fetch('./data/dossier.json');if(!response.ok)throw new Error(`Source file returned ${response.status}`);
    reference=validateDossier(await response.json());
    let stored;
    try{stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(stored){if(!stored.cases||typeof stored.cases!=='object')throw new Error('Invalid saved workspace');for(const item of Object.values(stored.cases)){validateDossier(item.dossier);validateResearch(item.research,item.dossier);}workspace=stored;}}catch{notice('Saved workspace could not be read. The pinned reference case is open; existing browser storage has not been erased.');}
    const active=workspace.cases[workspace.activeId];
    activate(active?.dossier||reference,active?.research||emptyResearch(),Boolean(active));
    const hash=location.hash.slice(1);setTab(['bill','versions','congress','promises','coverage','dossier'].includes(hash)?hash:'bill');
  }catch(error){$('panel').innerHTML=`<div class="empty"><h3>The case could not be loaded.</h3><p>${esc(error.message)}</p><p>Reload the page or use Import case to open a saved Observatory JSON dossier.</p></div>`;$('case-title').textContent='Source unavailable';notice('The workbench has not substituted demo data for a failed source.');}
}
init();
