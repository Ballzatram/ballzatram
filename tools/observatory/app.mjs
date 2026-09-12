import {overviewHTML,guideHTML,recordLabel,routeFor,readRoute,dateLabel} from './citizen.mjs';
import {createTracker} from './tracker.mjs';
import {STORAGE_KEY, MAX_IMPORT, CONDUCT, OUTCOME, safeUrl, validateDossier, validateResearch, emptyResearch, parseImport, compareVersions, wordDiff, exportWorkspace, evidenceContext} from './core.mjs';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link = (url,label) => safeUrl(url) ? `<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>` : esc(label);
const options = (values,selected) => values.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');
const badge = (label,kind='') => `<span class="badge ${kind}">${esc(label)}</span>`;
const panelHead = (title,description,extra='') => `<div class="view-head"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div>${extra}</div>`;
const evidenceButton = (sourceId,locator,text,label='View evidence') => `<button data-evidence="${esc(sourceId)}" data-locator="${esc(locator)}" data-excerpt="${esc(text)}">${esc(label)} ↗</button>`;
let dossier, reference, research, tab='tracker', versionId, sectionId, beforeId, afterId;
let workspace={cases:{},activeId:null};
let imported=false, origin='saved', currentBill=null, routeRequest=0;
const partialForms=new Map();
let voteFilters={query:'',party:'All parties',state:'All states',vote:'All votes'};
function notice(message='') { $('notice').textContent=message; }
function persist() {
  workspace.cases[dossier.id]={dossier,research}; workspace.activeId=dossier.id;
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(workspace)); return true; }
  catch { notice('Changes are available in this tab, but this browser could not save them. Export the dossier to keep your work.'); return false; }
}
function version() { return dossier.versions.find(v=>v.id===versionId) || dossier.versions.at(-1); }
function section() { return version()?.sections.find(s=>s.id===sectionId) || version()?.sections[0]; }
function activate(d,r,kind='imported',bill=null) {
  dossier=validateDossier(d); research=validateResearch(r,d); origin=kind;
  imported=!['live','historical'].includes(kind);currentBill=bill;
  versionId=d.versions.at(-1)?.id;sectionId=version()?.sections[0]?.id;
  beforeId=d.versions[0]?.id;afterId=d.versions.at(-1)?.id;
  voteFilters={query:'',party:'All parties',state:'All states',vote:'All votes'};
  renderShell();
}
function renderShell() {
  const globalView=['tracker','guide','saved'].includes(tab);
  document.querySelector('main').classList.toggle('tracking',globalView);
  $('case-nav').hidden=!dossier;
  document.querySelector('.case-bar').hidden=!dossier||globalView;
  if(!dossier)return;
  $('case-title').textContent=dossier.title;
  $('case-meta').textContent=`${dossier.billLabel} · ${dossier.publicLaws.length?'Public Law '+dossier.publicLaws.join(', '):'Public-law number not recorded'} · Retrieved ${dateLabel(dossier.sources[0].retrievedAt)}`;
  $('mode-label').textContent=recordLabel(dossier,origin);
  $('mode-label').className='badge '+(origin==='live'?'':'amber');
  $('save-case').textContent=research.saved?'Saved to notebook':'Save to notebook';
  const follow=$('follow-current');follow.hidden=!dossier.tracker||!tracker.hasBill(dossier.tracker.billId);
  if(dossier.tracker){follow.dataset.followBill=dossier.tracker.billId;follow.textContent=tracker.isFollowed(dossier.tracker.billId)?'★ Following bill':'☆ Follow bill';follow.setAttribute('aria-pressed',String(tracker.isFollowed(dossier.tracker.billId)));}
  $('share-bill').hidden=origin!=='live';
}
function setTab(next,focus=false,writeHistory=true) {
  tab=next;renderShell();
  document.querySelectorAll('[data-tab]').forEach(b=>b.dataset.tab===tab?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  const hash=routeFor(tab,dossier,origin);
  if(writeHistory&&location.hash!==hash)history.pushState(null,'',hash);
  render();
  if(focus){$('panel').focus();window.scrollTo?.({top:0,behavior:'instant'});}
}
function render() {
  if(tab==='tracker'){tracker.render();return;}
  if(tab==='saved'){
    const cases=Object.values(workspace.cases);
    $('panel').innerHTML=panelHead('Saved research','Snapshots and notes you saved in this browser. Open a snapshot to continue it; browse the tracker to read the latest published record.')+
    `<p class="note">Local storage is not an account or a backup. Download research files from My notebook to keep your work.</p><div class="stack">${cases.map(x=>`<article class="card"><span class="badge amber">${esc(x.dossier.mode==='demo'?'Synthetic example':'Saved snapshot · not live')}</span><h3>${esc(x.dossier.title)}</h3><p>${esc(x.dossier.billLabel)} · ${x.research.promises.length} comparison drafts</p><button data-open-case="${esc(x.dossier.id)}">Open saved research</button></article>`).join('')||'<div class="empty"><h3>No research saved here yet.</h3><p>Open a bill and choose Save to notebook, or import a research file you downloaded earlier.</p><button data-tab="tracker">Find a bill →</button></div>'}</div><p><button id="restore-research">Import a research file</button></p>`;
    $('restore-research').onclick=()=>$('import-file').click();return;
  }
  if(tab==='guide'){
    $('panel').innerHTML=guideHTML(tracker.getCatalogue());
    $('load-example').onclick=()=>openExample();
    $('restore-research').onclick=()=>$('import-file').click();
    $('guide-saved').innerHTML=Object.values(workspace.cases).map(x=>`<p><button data-open-case="${esc(x.dossier.id)}">Open saved snapshot: ${esc(x.dossier.title)}</button></p>`).join('');
    return;
  }
  if(!dossier){$('panel').innerHTML=panelHead('Choose a bill first','Find a bill to see its text, people, actions, and your research tools.')+'<button class="primary" data-tab="tracker">Find a bill →</button>';return;}
  ({overview:()=>{$('panel').innerHTML=overviewHTML(dossier,currentBill,research,origin);if(origin==='live'&&Object.values(workspace.cases).some(x=>x.dossier.tracker?.billId===dossier.tracker.billId&&x.dossier.id!==dossier.id))$('panel').insertAdjacentHTML('afterbegin','<p class="note">You have research attached to an earlier snapshot of this bill. It has been preserved separately. <button data-tab="saved">Open saved research →</button></p>');},bill:renderBill,versions:renderVersions,congress:renderCongress,promises:renderPromises,coverage:renderCoverage,dossier:renderDossier}[tab]||renderBill)();
}
function versionOptions(selected) { return dossier.versions.map(v=>`<option value="${esc(v.id)}" ${v.id===selected?'selected':''}>${esc(v.label)} (${esc(v.id.toUpperCase())})</option>`).join(''); }
function renderBill() {
  if(!version()){
    $('panel').innerHTML=panelHead('Bill text is not available here yet','The activity record is available. Missing text is not an empty bill.')+`<div class="note">${esc(dossier.tracker?.textFailures?.length?'One or more bill text files could not be parsed or retrieved.':'No supported published XML text version was available at the last scan.')} <button id="open-activity">Read activity timeline →</button></div>${(dossier.tracker?.textVersions||[]).map(v=>`<p>${link(v.url,v.code.toUpperCase()+' · Original text')}</p>`).join('')}`;
    $('open-activity').onclick=()=>setTab('congress');return;
  }
  const v=version(),s=section();
  $('panel').innerHTML=panelHead('Bill X-Ray','Start with the words. Inspect every section, its boundaries, and the record behind it.',`<label class="controls">Bill version <select id="bill-version">${versionOptions(versionId)}</select></label>`)+`
  <div class="work-grid"><aside class="section-list" aria-label="Bill sections"><input class="section-search" id="section-search" placeholder="Find a section…" aria-label="Search sections">${v.sections.map(x=>`<button data-section="${esc(x.id)}" class="${s.id===x.id?'selected':''}" aria-pressed="${s.id===x.id}"><small>Section ${esc(x.number)}</small><strong>${esc(x.title)}</strong></button>`).join('')}</aside>
  <article class="card"><div class="card-top"><span class="eyebrow">SECTION ${esc(s.number)} · ${esc(v.id.toUpperCase())}</span>${badge('Original text')}</div><h3>${esc(s.title)}</h3>
  <div class="tags">${s.tags.map(x=>badge(x)).join('')}</div>
  ${s.analysis?`<h4>Example reading note ${badge('Draft interpretation · not reviewed','amber')}</h4><p>${esc(s.analysis)}</p>`:'<p class="muted">No interpretation supplied for this version. Read the original wording below.</p>'}
  <h4>What the text says</h4><div class="original">${esc(s.text)}</div><div class="card-actions">${evidenceButton(s.sourceId,s.locator,s.text)}<button id="compare-section">Compare versions →</button></div>
  <details class="osiris"><summary>Read this section with your AI</summary><p class="muted">Which words define the scope? What exception changes the reading? Which missing record would change your conclusion?</p><label for="osiris-question">Ask about this section</label><textarea id="osiris-question" maxlength="2500" rows="3">Explain this section in plain English. Cite its exact wording and identify what it does not establish.</textarea><p class="muted">Review this section and your question in Osiris, connect your ChatGPT account, and get an answer here. Private pilot; responses remain draft notes.</p><button id="ask-osiris">Ask Osiris here</button> <a href="../ai/index.html">AI settings</a><p id="osiris-answer" class="answer" aria-live="polite"></p><a id="osiris-continue" href="../ai/index.html?context=prepared" hidden>Choose AI &amp; review question →</a></details>
  <details class="osiris"><summary>Parsing & missing context</summary><p>${v.manifest.sectionCount} section nodes accounted for. ${v.manifest.unaccountedBlocks.length} additional body blocks flagged.</p><p>${esc(v.manifest.scope)}</p>${v.manifest.unaccountedBlocks.map(x=>`<div class="original">${esc(x)}</div>`).join('')}<p>Text completeness is not legal completeness. Incorporated law, regulations, judicial decisions, actual authorship and effects require additional records.</p>${s.references.length?`<h4>Structured cross-references (unresolved)</h4>${s.references.map(x=>`<p>${esc(x)}</p>`).join('')}`:'<p>No structured cross-reference elements were extracted. Plain-text references may still exist.</p>'}</details>
  </article></div>`;
  $('bill-version').onchange=e=>{versionId=e.target.value;sectionId=version().sections[0].id;renderShell();renderBill();};
  $('section-search').oninput=e=>{let shown=0;document.querySelectorAll('[data-section]').forEach(b=>{const found=v.sections.find(x=>x.id===b.dataset.section);b.hidden=!`${found.title} ${found.text}`.toLowerCase().includes(e.target.value.toLowerCase());b.style.display=b.hidden?'none':'';if(!b.hidden)shown++;});e.target.setAttribute('aria-description',`${shown} matching sections`);};
  $('compare-section').onclick=()=>setTab('versions',true);
  $('ask-osiris').onclick=askOsiris;
}
function askOsiris() {
  const output=$('osiris-answer');
  $('osiris-continue').hidden=true;
  try {
    const request={tool:'observatory',prompt:$('osiris-question').value,context:evidenceContext(dossier,version(),section())};
    window.OsirisPanel.open(request);
    output.textContent='Review this section and its source in Osiris. Nothing has been sent to an AI provider; connect and confirm in the panel when ready.';
  }catch(error){output.textContent=error.message;}
}

function renderVersions() {
  if(!dossier.versions.length){renderBill();return;}
  if(dossier.versions.length===1){$('panel').innerHTML=panelHead('Only one version is available','A comparison needs two different texts. No change has been inferred.')+'<button class="primary" data-tab="bill">Read the available text →</button>';return;}
  const before=dossier.versions.find(v=>v.id===beforeId),after=dossier.versions.find(v=>v.id===afterId);
  const rows=compareVersions(before,after);
  const same=before.id===after.id;
  $('panel').innerHTML=panelHead('The words that changed','Compare exact versions. Green adds wording; red removes it. This is a text comparison, not a complete legal-effect opinion.')+
  `<div class="controls"><label>Earlier artifact <select id="before-version">${versionOptions(beforeId)}</select></label><span aria-hidden="true">→</span><label>Later artifact <select id="after-version">${versionOptions(afterId)}</select></label></div>
  <div class="note">${same?'<strong>You selected the same version twice. Choose different versions to see changes.</strong><br>':''}${rows.filter(r=>r.status!=='Unchanged').length} changed or unmatched section pairs · ${rows.filter(r=>r.status==='Unchanged').length} unchanged. Sections are paired by unique section number. Renumbering needs manual reconciliation; a match does not prove authorship or policy lineage. Both artifacts retain their own original text.</div>
  ${rows.map(r=>{const sec=r.after||r.before,diff=r.before&&r.after&&r.status==='Changed'?wordDiff(r.before.text,r.after.text):null;return `<article class="card diff-row"><div class="diff-heading"><h3>§ ${esc(sec.number)} · ${esc(sec.title)}</h3>${badge(r.status,r.status==='Unchanged'?'':'amber')}</div>${r.status==='Unchanged'?'<p class="muted">No wording difference after whitespace normalization.</p>':diff?`<div class="diff-text">${diff.map(x=>x.kind==='add'?`<ins>${esc(x.text)}</ins>`:x.kind==='remove'?`<del>${esc(x.text)}</del>`:esc(x.text)).join(' ')}</div>`:`<div class="grid-two"><div><h4>Before</h4><div class="original">${esc(r.before?.text||'No matched section')}</div></div><div><h4>After</h4><div class="original">${esc(r.after?.text||'No matched section')}</div></div></div>`}<div class="card-actions">${r.before?evidenceButton(r.before.sourceId,r.before.locator,r.before.text,'Earlier source'):''}${r.after?evidenceButton(r.after.sourceId,r.after.locator,r.after.text,'Later source'):''}</div></article>`;}).join('')}`;
  $('before-version').onchange=e=>{beforeId=e.target.value;renderVersions();};
  $('after-version').onchange=e=>{afterId=e.target.value;renderVersions();};
}
function renderCongress() {
  const roll=dossier.rollcall;
  $('panel').innerHTML=panelHead('People & actions','See who introduced the bill and what happened in Congress. Use the source links to check each record.')+
  `<div class="note">${dossier.sponsors.map(s=>`${esc(s.name)} · Formal sponsor · ${esc(s.id)}`).join('<br>')||'No sponsor record imported.'}<br>Senate unanimous consent is a chamber action; it is not a recorded individual vote for every senator. Member affiliations below are from the historical roll call.</div>`+
  (roll?`<article class="card"><div class="card-top"><span class="eyebrow">HOUSE ROLL CALL ${esc(roll.roll)} · ${esc(roll.date)}</span>${badge(roll.question)}</div><h3>${esc(roll.result)} · ${esc(dossier.title)}</h3><div class="vote-total">${Object.entries(roll.totals).map(([name,n])=>`<span><strong>${n}</strong>${esc(name)}</span>`).join('')}</div><div class="bar" aria-hidden="true">${Object.entries(roll.totals).map(([name,n])=>`<span class="${name==='Yea'?'yes':name==='Nay'?'no':'abstain'}" style="width:${100*n/roll.members.length}%"></span>`).join('')}</div><div class="controls"><input id="member-query" placeholder="Find a member or Bioguide ID…" aria-label="Search members" style="max-width:280px" value="${esc(voteFilters.query)}"><select id="party-filter" aria-label="Filter party">${options(['All parties',...new Set(roll.members.map(m=>m.party))],voteFilters.party)}</select><select id="state-filter" aria-label="Filter state">${options(['All states',...[...new Set(roll.members.map(m=>m.state))].sort()],voteFilters.state)}</select><select id="vote-filter" aria-label="Filter vote">${options(['All votes','Yea','Nay','Present','Not Voting'],voteFilters.vote)}</select></div><p id="vote-count" class="search-result" aria-live="polite"></p><div class="table-wrap"><table><thead><tr><th scope="col">MEMBER</th><th scope="col">PARTY / STATE</th><th scope="col">VOTE</th><th scope="col">RECORD</th></tr></thead><tbody id="member-rows"></tbody></table></div></article>`:'<div class="empty"><h3>Individual votes are not collected here.</h3><p>The timeline below records what Congress did. It does not tell you how each member voted. Use the original government record to investigate individual votes; none are inferred here.</p></div>')+
  `<details class="card" style="margin-top:20px" open><summary>Legislative timeline · newest first</summary><p class="muted">Exact date/text duplicates are collapsed. Related chamber and Library of Congress entries can describe the same event; this is not a count of distinct decisions.</p><ol class="timeline">${[...dossier.actions].reverse().map(a=>`<li><time>${esc(a.date)}</time><p>${esc(a.text)}</p>${evidenceButton(a.sourceId,a.locator,a.text,'Action source')}</li>`).join('')}</ol></details>`;
  if(roll){renderVotes();for(const [id,key] of [['member-query','query'],['party-filter','party'],['state-filter','state'],['vote-filter','vote']])$(id).addEventListener('input',e=>{voteFilters[key]=e.target.value;renderVotes();});}
}
function renderVotes(){
  const members=dossier.rollcall.members.filter(m=>(`${m.name} ${m.id}`.toLowerCase().includes(voteFilters.query.toLowerCase()))&&(voteFilters.party==='All parties'||m.party===voteFilters.party)&&(voteFilters.state==='All states'||m.state===voteFilters.state)&&(voteFilters.vote==='All votes'||m.vote===voteFilters.vote));
  $('vote-count').textContent=`${members.length} of ${dossier.rollcall.members.length} member records shown · Not Voting does not establish a reason for absence.`;
  $('member-rows').innerHTML=members.length?members.map(m=>`<tr><td>${esc(m.name)}<br><small class="muted">${esc(m.id)}</small></td><td>${esc(m.party)} · ${esc(m.state)}</td><td>${badge(m.vote,m.vote==='Nay'?'red':m.vote==='Not Voting'?'amber':'')}</td><td>${evidenceButton(m.sourceId,`recorded-vote / legislator[@name-id='${m.id}']`,`${m.name} (${m.party}-${m.state}): ${m.vote}`,'Source')}</td></tr>`).join(''):'<tr><td colspan="4">No members match these filters.</td></tr>';
}
function actionOptions(selected=[]) { return dossier.actions.map(a=>`<option value="${esc(a.id)}" ${selected.includes(a.id)?'selected':''}>${esc(a.date+' · '+a.text.slice(0,160))}</option>`).join(''); }
function renderPromises() {
  const cards=research.promises.map(p=>{
    const member=dossier.rollcall?.members.find(m=>m.id===p.memberId);
    return `<article class="card promise"><div class="card-top"><span class="eyebrow">${esc(p.person)} · ${esc(p.date)}</span>${badge('Your draft · not independently reviewed','amber')}</div>${p.assessmentVersion!==2?'<p class="note">Older draft: identity and outcome evidence have not been checked against the current form. Edit it to complete those fields.</p>':''}<blockquote>“${esc(p.quote)}”</blockquote><p>${link(p.url,'Original promise')}</p><h4>What was promised, in context</h4><p>${esc(p.context)}</p><p>${esc(p.interpretation)}</p><p class="muted">Condition: ${esc(p.condition||'Not specified')} · Deadline: ${esc(p.deadline||'Not specified')}</p><div class="assessments"><div><span class="eyebrow">YOUR ASSESSMENT OF THEIR CONDUCT</span><strong>${esc(p.conduct)}</strong></div><div><span class="eyebrow">YOUR ASSESSMENT OF THE OUTCOME</span><strong>${esc(p.outcome)}</strong></div></div><h4>What could this person actually do?</h4><p>${esc(p.opportunity)}</p><h4>Evidence, contrary facts & remaining gaps</h4><p>${esc(p.explanation)}</p>${member?`<p>Individual record: ${esc(member.name)} (${esc(member.id)}) · ${esc(member.vote)} on ${esc(dossier.rollcall.question)}, ${esc(dossier.rollcall.date)}. ${evidenceButton(member.sourceId,`member ${member.id}`,`${member.name}: ${member.vote}`)}</p>`:''}${p.actionEvidenceUrl?`<p>${link(p.actionEvidenceUrl,'Member-specific action evidence')}</p>`:''}${p.outcomeEvidenceUrl?`<p>${link(p.outcomeEvidenceUrl,'Outcome evidence')}</p>`:''}${p.actionIds.length?'<h4>Bill-level context</h4><p>A legislative event alone does not establish this person’s conduct.</p>':''}${p.actionIds.map(id=>{const a=dossier.actions.find(x=>x.id===id);return `<p>${esc(a.date)} · ${esc(a.text)} ${evidenceButton(a.sourceId,a.locator,a.text)}</p>`;}).join('')}<div class="card-actions"><button data-edit-promise="${esc(p.id)}">Edit comparison</button><button class="danger" data-delete-promise="${esc(p.id)}">Remove draft</button></div></article>`;
  }).join('');
  $('panel').innerHTML=panelHead('My promise comparisons','What did they say? What did they do? What actually happened? Keep those questions separate and support each answer.')+
    `<div class="note"><strong>Personal research—not a published scorecard.</strong> The site has not collected campaign promises for this bill. Everything you add here is your own draft, saved in this browser. No member is rated automatically.</div>`+
    (cards?`<div class="stack">${cards}</div>`:'<div class="empty"><h3>No comparisons yet.</h3><p>Start with an exact, dated statement and its original source. Then check the person’s actions and the policy outcome. Missing evidence stays unknown; it is not a broken promise.</p></div>')+
    `<details id="promise-details" class="form-details"><summary id="promise-form-title">+ Start a sourced comparison</summary><form id="promise-form"><input type="hidden" name="id">
    <fieldset><legend>1. What did they promise?</legend><p>Keep the actual words and the context that gives them meaning. Fields stay in this tab while you check other views; save the comparison before reloading.</p><div class="form-grid">
    <label>Person, office & election year<input name="person" required maxlength="300" placeholder="Identify the speaker and their role"></label><label>Statement date<input name="date" type="date" required></label>
    <label class="wide">Original promise source<input name="url" type="url" required placeholder="https://…"><small>Link to the original statement, transcript, recording, or campaign page.</small></label>
    <label class="wide">Exact words<textarea name="quote" required maxlength="6000" placeholder="Quote the commitment, including its qualifications."></textarea></label>
    <label class="wide">Context<textarea name="context" required maxlength="4000" placeholder="Where was it said? What question were they answering?"></textarea></label>
    <label class="wide">What would count as delivery?<textarea name="interpretation" required maxlength="4000" placeholder="Define the specific action or result the promise commits to."></textarea></label><label>Conditions, if any<input name="condition" maxlength="1000" placeholder="e.g. If the bill reaches a vote"></label><label>Stated deadline, if any<input name="deadline" maxlength="300" placeholder="Leave blank if no deadline was given"></label></div></fieldset>
    <fieldset><legend>2. What did this person do?</legend><p>A sponsor, an individual voter, and Congress as a whole are different actors. Link evidence about the named person.</p><div class="form-grid">
    <label class="wide">Their authority & opportunity to act<textarea name="opportunity" required maxlength="4000" placeholder="Was this within their control? Did they have an opportunity to act?"></textarea></label>
    <label class="wide">Available individual House vote (optional)<select name="memberId"><option value="">${dossier.rollcall?'No individual vote linked':'No individual votes collected for this bill'}</option>${(dossier.rollcall?.members||[]).map(m=>`<option value="${esc(m.id)}">${esc(m.name)} · ${esc(m.id)} · ${esc(m.vote)}</option>`).join('')}</select></label>
    ${dossier.rollcall?'<label class="wide check-label"><input name="identityConfirmed" type="checkbox">I checked that the selected voter is the same person who made the promise.</label>':''}
    <label class="wide">Member-specific action source<input name="actionEvidenceUrl" type="url" placeholder="https://…"><small>Required for an action judgment without a verified individual vote. Link the named person’s vote, sponsorship record, amendment, or explanation.</small></label>
    <label class="wide">Your conduct assessment<select name="conduct">${options(CONDUCT,'Pending')}</select></label>
    <div class="wide"><p>Relevant bill events (optional context)</p><div class="checkbox-list">${[...dossier.actions].reverse().map(a=>`<label><input type="checkbox" name="actionIds" value="${esc(a.id)}"><span>${esc(a.date+' · '+a.text)}</span></label>`).join('')}</div></div></div></fieldset>
    <fieldset><legend>3. What was delivered?</legend><p>A supportive vote can fail to produce an outcome. A bill can pass while implementation remains unproven.</p><div class="form-grid">
    <label>Your outcome assessment<select name="outcome">${options(OUTCOME,'Unknown')}</select></label><label>Outcome evidence source<input name="outcomeEvidenceUrl" type="url" placeholder="https://…"><small>Required for Achieved, Not achieved, or Partially achieved. Otherwise leave the outcome Unknown or Pending.</small></label>
    <label class="wide">Explain your assessment & the contrary evidence<textarea name="explanation" required maxlength="6000" placeholder="Link the evidence to the promise. Include contrary actions, the member’s explanation, and what you still cannot establish."></textarea></label></div></fieldset>
    <p class="note">These are your judgments. A mismatch can justify further questions; it does not establish motive, deception, or corruption.</p><p id="promise-error" class="error-text" role="alert"></p><button class="primary" type="submit">Save comparison draft</button></form></details>`;
  retainForm('promise','actionIds');
  $('promise-form').onsubmit=event=>{
    event.preventDefault();const data=new FormData(event.target),id=data.get('id')||crypto.randomUUID();
    const p={...Object.fromEntries(data),id,assessmentVersion:2,identityConfirmed:data.get('identityConfirmed')==='on',actionIds:data.getAll('actionIds')};
    const next={...research,promises:[...research.promises.filter(x=>x.id!==id),p]};
    try{validateResearch(next,dossier);research=next;partialForms.delete(`${dossier.id}:promise`);const saved=persist();renderPromises();if(saved)notice('Comparison saved as your draft. Download a research file from My notebook to keep a backup.');}catch(error){$('promise-error').textContent=error.message;$('promise-error').scrollIntoView({block:'nearest'});}
  };
}
function renderCoverage(){
  const keys=dossier.versions.flatMap(v=>v.sections.map(s=>({key:`${v.id}:${s.id}`,label:`${v.id.toUpperCase()} § ${s.number} · ${s.title}`})));
  $('panel').innerHTML=panelHead('What did the coverage discuss?','Map a deliberately selected headline, article body, or official statement to exact provisions. These are manual research annotations.')+
  `<div class="note">Your sample: ${research.coverage.length} items. “Not mapped” means unassessed or outside this mapping—not false, omitted, or unreported. No outlet-wide coverage rate is inferred from this sample.</div>`+
  (research.coverage.length?`<div class="table-wrap"><table><thead><tr><th scope="col">SOURCE & SCOPE</th><th scope="col">PROVISIONS MAPPED</th><th scope="col">RESEARCH NOTE</th><th scope="col">EDIT</th></tr></thead><tbody>${research.coverage.map(c=>`<tr><td>${link(c.url,c.title)}<br><small>${esc(c.kind)} · ${esc(c.date)}</small></td><td>${c.sectionKeys.length?c.sectionKeys.map(k=>`<p class="matrix-yes">${esc(keys.find(x=>x.key===k)?.label)}</p>`).join(''):'<span class="matrix-no">Not mapped</span>'}</td><td>${esc(c.note)}</td><td><button data-edit-coverage="${esc(c.id)}">Edit</button><button class="danger" data-delete-coverage="${esc(c.id)}">Remove</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><h3>Compare the story with the text.</h3><p>Add a headline or statement you want to inspect. Keep headline and article-body mappings separate, and record the limits of your sample.</p></div>')+
  `<details id="coverage-details" class="form-details"><summary>+ Add a coverage mapping</summary><form id="coverage-form"><input name="id" type="hidden"><div class="form-grid"><label class="wide">Title or short description<input name="title" required maxlength="1000"></label><label>Source type<select name="kind">${options(['Headline','Article body','Official statement'])}</select></label><label>Publication date<input name="date" type="date" required></label><label class="wide">Source URL<input name="url" type="url" required placeholder="https://…"></label><label class="wide">Provisions actually discussed<select name="sectionKeys" multiple>${keys.map(k=>`<option value="${esc(k.key)}">${esc(k.label)}</option>`).join('')}</select></label><label class="wide">Mapping rationale, sampled passage & limits<textarea name="note" required maxlength="6000" placeholder="Describe the link in your own words; retain only excerpts you have rights to share."></textarea></label></div><p><button class="primary" type="submit">Save mapping</button></p></form></details>`;
  retainForm('coverage','sectionKeys');
  $('coverage-form').onsubmit=e=>{e.preventDefault();const data=new FormData(e.target),id=data.get('id')||crypto.randomUUID(),c=Object.fromEntries(data);c.id=id;c.sectionKeys=data.getAll('sectionKeys');const next={...research,coverage:[...research.coverage.filter(x=>x.id!==id),c]};try{validateResearch(next,dossier);research=next;partialForms.delete(`${dossier.id}:coverage`);persist();renderCoverage();}catch(error){notice(error.message);}};
}
function renderDossier(){
  $('panel').innerHTML=panelHead('My notebook','Your notes and comparisons stay in this browser. Download a research file to keep the original records and your work together.')+
  `<div class="controls notebook-tools"><button id="export-button" class="primary">Download research file</button><button id="import-button">Import research file</button><button data-tab="coverage">Compare a headline with the text</button></div><p class="note">Your drafts are not published or independently reviewed. Reopening a saved file shows its saved snapshot, not automatically the latest bill.</p>`+
  `<div class="grid-two"><article class="card"><span class="eyebrow">INVESTIGATION NOTEBOOK</span><h3>What would change your mind?</h3><label for="case-notes">Finding, competing explanations, missing records & next steps</label><textarea id="case-notes" rows="10" maxlength="50000" placeholder="Separate what the record establishes from what you infer…">${esc(research.notes)}</textarea><p id="notes-status" class="muted" aria-live="polite">Notes save in this browser as you type.</p><div class="card-actions"><button id="download-notes">Download reading brief</button><button id="print-case">Print this view</button></div></article><article class="card"><span class="eyebrow">SCOPE & METHOD</span><h3>Make the limits visible.</h3><p>${esc(dossier.selectionNote||'Imported case. Selection method not supplied.')}</p><p><strong>${research.promises.length}</strong> promise drafts · <strong>${research.coverage.length}</strong> coverage mappings</p><p>Source snapshots identify the original artifact. Hashes do not authenticate an imported file or certify interpretations. This workbench cannot grant independent review or publication status.</p><p>Potential beneficiaries, lobbying links, actual policy authors and measured outcomes are not inferred. Add evidence to your notebook before drawing those connections.</p><p>${link('https://www.congress.gov/','Browse Congress.gov')}</p></article></div>
  <h3>Source register</h3><div class="grid-two">${dossier.sources.map(s=>`<article class="card source-card"><div class="card-top"><span class="eyebrow">${esc(s.id)}</span>${badge(s.kind==='synthetic'?'Synthetic':'Source record')}</div><p>${link(s.url,'Open original record')}</p><p class="muted">Retrieved ${esc(s.retrievedAt)}</p><code>SHA-256 ${esc(s.sha256)}</code><p>${esc(s.rights)}</p><div class="card-actions">${evidenceButton(s.id,'Full source snapshot','','Inspect provenance')}</div></article>`).join('')}</div>
  <h3>Saved cases in this browser</h3><div class="controls">${Object.values(workspace.cases).map(x=>`<button data-open-case="${esc(x.dossier.id)}">${esc(x.dossier.title)}</button>`).join('')||'<p class="muted">Save this investigation to keep a local copy.</p>'}</div>`;
  $('export-button').onclick=exportCase;
  $('import-button').onclick=()=>$('import-file').click();
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
  const livePath=!imported && dossier.tracker && /^live\/snapshots\/[a-f0-9]{64}\.xml$/.test(source.path||'')?source.path:null;
  const localPath=livePath || (!imported && dossier.id===reference?.id && source.path===reference.sources.find(s=>s.id===source.id)?.path ? source.path:null);
  $('evidence-body').innerHTML=`<div class="eyebrow">FOLLOW THE EVIDENCE</div><h2 id="evidence-title">Check the original record</h2><p>${esc(source.id)}</p><p class="evidence-link">${link(source.url,'Original source')}</p>${localPath?`<p><a href="${esc(localPath)}" download>Download source XML snapshot ↓</a></p>`:''}<h4>Locator</h4><p class="evidence-hash">${esc(button.dataset.locator)}</p>${button.dataset.excerpt?`<h4>Extracted text / selected record</h4><div class="original">${esc(button.dataset.excerpt)}</div>`:''}<p class="muted">Retrieved ${esc(source.retrievedAt)}</p><p class="evidence-hash">SHA-256<br>${esc(source.sha256)}</p><p>${esc(source.rights)}</p><div class="note">${imported?'Saved or imported provenance has not been authenticated against the remote source.':'Original XML is pinned alongside this case; extracted formatting is normalized for reading.'} Interpretations remain research drafts.</div>`;
  $('evidence-dialog').showModal();
}
function retainForm(kind,multiKey){
  const form=$(`${kind}-form`),key=`${dossier.id}:${kind}`;
  if(partialForms.has(key)){fillForm(form,partialForms.get(key),multiKey);$(`${kind}-details`).open=true;}
  form.addEventListener('input',()=>{const data=new FormData(form),draft=Object.fromEntries(data);draft[multiKey]=data.getAll(multiKey);draft.identityConfirmed=data.get('identityConfirmed')==='on';partialForms.set(key,draft);});
}
function fillForm(form,record,multiKey){
  for(const [key,value] of Object.entries(record)){
    const field=form.elements.namedItem(key);if(!field)continue;
    if(key===multiKey){if(field.options)Array.from(field.options).forEach(o=>o.selected=value.includes(o.value));else form.querySelectorAll(`[name="${multiKey}"]`).forEach(o=>o.checked=value.includes(o.value));}
    else if(field.type==='checkbox')field.checked=Boolean(value);else field.value=value;
  }
}
document.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.openBill)routeRequest++;
  if(button.dataset.tab){routeRequest++;exampleRequest++;tracker.cancelOpen();setTab(button.dataset.tab,true);}
  if(button.dataset.section){sectionId=button.dataset.section;renderBill();}
  if(button.dataset.evidence)showEvidence(button);
  for(const kind of ['promise','coverage']){
    const cap=kind[0].toUpperCase()+kind.slice(1),collection=kind==='promise'?'promises':'coverage';
    if(button.dataset[`delete${cap}`]){const id=button.dataset[`delete${cap}`];research[collection]=research[collection].filter(x=>x.id!==id);persist();render();}
    if(button.dataset[`edit${cap}`]){const record=research[collection].find(x=>x.id===button.dataset[`edit${cap}`]);$(`${kind}-details`).open=true;fillForm($(`${kind}-form`),record,kind==='promise'?'actionIds':'sectionKeys');$(`${kind}-details`).scrollIntoView({behavior:'smooth'});}
  }
  if(button.dataset.openCase){routeRequest++;tracker.cancelOpen();exampleRequest++;const saved=workspace.cases[button.dataset.openCase];activate(saved.dossier,saved.research,'saved');setTab('overview',true);}
});
$('save-case').onclick=()=>{if(!dossier)return;research.saved=true;if(persist())notice('Saved to this browser. Download a research file from My notebook for a backup.');renderShell();};
function exportCase(){if(!dossier)return;try{download(`${dossier.id}-research.json`,exportWorkspace(dossier,research));}catch(error){notice(error.message);}}
$('share-bill').onclick=async()=>{try{await navigator.clipboard.writeText(new URL(routeFor('overview',dossier,origin),location.href).href);notice('Bill link copied. It opens the latest published record; your notes are not shared.');}catch{notice('Copy the address from your browser to share this bill. Your notes are not included.');}};
$('import-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;routeRequest++;tracker.cancelOpen();exampleRequest++;
  try{if(file.size>MAX_IMPORT)throw new Error('File exceeds the 4 MB limit.');const parsed=parseImport(await file.text());activate(parsed.dossier,parsed.research,'imported');persist();setTab('overview',true);notice('Research file opened. This is imported material; source claims have not been verified here.');}catch(error){notice(`Import failed: ${error.message}`);}finally{e.target.value='';}
};
let exampleRequest=0;
async function openExample(view='overview',writeHistory=true){
  if(writeHistory)routeRequest++;
  const request=++exampleRequest;
  notice('Loading the historical example…');
  try{
    if(!reference){const response=await fetch('./data/dossier.json',{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`Source returned ${response.status}`);reference=validateDossier(await response.json());}
    if(request!==exampleRequest)return;
    activate(reference,workspace.cases[reference.id]?.research||emptyResearch(),'historical');setTab(view,true,writeHistory);notice('Historical example: real 2022 records. Supplied reading notes are unreviewed interpretations.');
  }catch(error){notice(`The historical example could not be loaded: ${error.message}. The live bill tracker is still available.`);}
}
async function applyRoute(){
  const route=readRoute(location.hash),request=++routeRequest;
  tracker.cancelOpen();exampleRequest++;
  if(route.invalid)notice('That bill link is not valid. Search for the bill below.');
  if(route.bill){setTab('tracker',false,false);if(!tracker.hasBill(route.bill))await tracker.refresh();if(request!==routeRequest)return;await tracker.openBill(route.bill,{view:route.tab,writeHistory:false});}
  else if(route.example)await openExample(route.tab,false);
  else setTab(route.tab,false,false);
}
const tracker=createTracker({panel:$('panel'),onNotice:notice,isActive:()=>tab==='tracker',onFollowChange:renderShell,onOpen:(next,bill,{view='overview',writeHistory=true}={})=>{
  const saved=workspace.cases[next.id];
  activate(next,saved?.research||emptyResearch(),'live',bill);
  setTab(view,true,writeHistory);
  notice('');
}});
function init(){
  try{
    const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(stored){if(!stored.cases||typeof stored.cases!=='object'||Array.isArray(stored.cases))throw new Error('Invalid saved workspace');for(const [key,item] of Object.entries(stored.cases)){validateDossier(item.dossier);validateResearch(item.research,item.dossier);if(key!==item.dossier.id)throw new Error('Saved case identity mismatch');}workspace=stored;}
  }catch{notice('Saved research could not be read. Your browser storage has not been erased. The live tracker is still available.');}
  // Only an explicit saved-view URL restores a local snapshot. Never seed the live UI with an example.
  const route=readRoute(location.hash),active=workspace.cases[workspace.activeId];
  if(!route.bill&&!route.example&&!['tracker','guide','saved'].includes(route.tab)&&active)activate(active.dossier,active.research,'saved');
  if(route.bill)applyRoute();else{applyRoute();tracker.refresh();}
}
window.addEventListener('hashchange',applyRoute);
init();
