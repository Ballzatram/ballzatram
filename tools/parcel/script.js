(function () {
  'use strict';
  const C = window.ParcelCore, $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const link = (href, title, classes = '') => C.url(href) ? `<a class="${classes}" href="${escape(C.url(href))}" target="_blank" rel="noopener noreferrer">${escape(title)}</a>` : '';
  let state = C.workspace(), editing = null, pendingImport = null, briefDirty = false, preserveSaved = false, importRead = 0;
  function notify(message) { $('status').textContent = message; $('status').hidden = false; }
  try {
    const saved = localStorage.getItem(C.STORAGE_KEY);
    if (saved) state = C.parseImport(JSON.parse(saved));
  } catch {
    preserveSaved = true;
    $('save-status').textContent = 'Saved data could not be restored or storage is blocked. Existing data is untouched; export any new work from this session.';
  }
  function save() {
    try {
      if (preserveSaved) throw new Error('Preserve unreadable or externally changed data.');
      localStorage.setItem(C.STORAGE_KEY, JSON.stringify(state));
      $('save-status').textContent = 'Saved in this browser. Export a workspace backup to keep or move your research.';
    } catch { $('save-status').textContent = 'Changes are in this session only. Export your workspace before closing this page.'; }
  }
  function requireSavedBrief() { if (state.draft) throw new Error('Save a brief with your target region and drive origin, or import a workspace and choose Replace.'); if (briefDirty) throw new Error('Save your edited brief first so this action uses the new requirements.'); }
  function fillBrief() {
    for (const [key, value] of Object.entries(state.brief)) {
      const el = $('brief-form').elements.namedItem(key); if (!el) continue;
      if (el.type === 'checkbox') el.checked = value; else el.value = value ?? '';
    }
    briefDirty = false;
  }
  function renderHeader() {
    const b = state.brief;
    $('hero-name').textContent = b.name;
    $('hero-stats').innerHTML = [ [`${b.minAcres}+`, 'total acres'], [b.minFlatAcres ?? '—', 'arena acres minimum'], [b.maxDrive, 'minutes maximum'] ].map(([v, label]) => `<div><b>${escape(v)}</b><span>${label}</span></div>`).join('');
    $('hero-region').textContent = b.region ? `${b.region} · ${b.corridorMode === 'off' ? 'No corridor preference' : b.corridor}` : 'Set your region and drive origin to begin, or import a saved workspace.';
    $('search-areas').innerHTML = C.researchPlan(b).map((area, i) => `<article class="area-card"><span class="area-number">SEARCH AREA / ${String(i + 1).padStart(2, '0')}</span><h3>${escape(area.area)}</h3><p>${escape(area.note)}</p><div class="area-links">${link(area.listings, 'Listing search ↗')}${link(area.search, 'Wider search ↗')}${link(area.records, 'County records ↗')}${link(area.map, 'View area ↗')}</div></article>`).join('');
    if (!$('search-areas').children.length) $('search-areas').innerHTML = '<p class="muted">Save a brief with your target region and drive origin to build a search plan.</p>';
  }
  function renderCard(c, a) {
    const summary = a.failed.length ? a.failed.map(x => x.label).join('; ') : a.nextQuestions[0] || 'Review the site and supporting documents before advancing.';
    return `<article class="candidate-card" data-candidate="${escape(c.id)}"><span class="badge ${a.verdict}">${escape(a.label)}</span><h3>${escape(c.title)}</h3><p class="location">${escape(c.location)}</p>
      <dl>${['acres', 'flatAcres', 'terrain', c.tenure === 'lease' ? 'annualRent' : 'price', 'driveMinutes', 'usableAcres'].map(key => `<div><dt>${escape(C.FACTS.find(f => f.key === key).label)}</dt><dd>${escape(C.factText(c, key))}</dd></div>`).join('')}</dl>
      <p class="evidence-line">${a.passed}/${a.total} required checks have a current reported fit · ${a.evidenceCount} documented by user<br>${escape(c.listingStatus.replaceAll('-', ' '))} · source snapshot ${escape(c.capturedAt || 'undated')} ${C.age(c.capturedAt) > 30 ? '· availability needs rechecking' : ''}</p>
      <p class="note"><b>${a.failed.length ? 'Conflict: ' : 'Next: '}</b>${escape(summary)}</p>
      <details><summary>Fit checks and evidence</summary><ul class="checks">${a.checks.map(x => `<li class="check-${x.state}"><b>${escape(C.STATUS[x.state])}</b> · ${escape(x.label)}${x.required ? '' : ' (preference)'}<small>${escape(x.detail || '')}</small></li>`).join('')}</ul>
      <div class="evidence-detail">${C.FACTS.filter(d => c.facts[d.key].value !== null).map(d => { const f = c.facts[d.key]; return `<p><b>${escape(d.label)}:</b> ${escape(C.factText(c, d.key))}<br>${escape(f.level)} · ${escape(f.checkedAt || 'undated')} · ${link(f.sourceUrl, 'Evidence ↗') || 'source missing'}<br>${escape(f.detail)}</p>`; }).join('')}</div><p class="note">${escape(c.notes)}</p></details>
      <div class="actions">${link(c.listingUrl, 'Source ↗', 'button')}${link(C.routeUrl(c, state.brief), 'Check drive ↗', 'button')}<button type="button" data-edit="${escape(c.id)}">Edit evidence</button><button type="button" data-shortlist="${escape(c.id)}" aria-pressed="${c.shortlisted}">${c.shortlisted ? 'Remove from shortlist' : '+ Shortlist'}</button><button type="button" data-remove="${escape(c.id)}">Remove</button></div></article>`;
  }
  function renderCandidates() {
    const rows = state.candidates.map(c => ({ c, a: C.evaluate(c, state.brief) }));
    const counts = [['Properties', rows.length], ['Shortlisted', rows.filter(({ c }) => c.shortlisted).length], ['Needs research', rows.filter(({ a }) => a.verdict === 'research').length], ['Conflicts', rows.filter(({ a }) => a.verdict === 'conflict').length]];
    $('metrics').innerHTML = counts.map(([label, value]) => `<div><b>${value}</b><span>${label}</span></div>`).join('');
    const filter = $('filter').value;
    const visible = rows.filter(({ c, a }) => filter === 'all' || (filter === 'shortlist' ? c.shortlisted : a.verdict === filter));
    visible.sort((x, y) => ({ promising: 0, research: 1, conflict: 2 }[x.a.verdict] - { promising: 0, research: 1, conflict: 2 }[y.a.verdict]));
    $('candidate-list').innerHTML = visible.map(({ c, a }) => renderCard(c, a)).join('');
    $('result-count').textContent = `${visible.length} shown / ${rows.length} saved. No automatic suitability score.`;
    $('empty').hidden = visible.length > 0;
    $('empty').querySelector('h3').textContent = rows.length ? 'No properties in this view.' : 'Your search starts with a real place.';
    $('empty').querySelector('p').textContent = rows.length ? 'Choose All properties or add more research.' : 'Add a broker link or import a sourced research file. Missing information stays unknown until you attach evidence.';
  }
  function renderComparison() {
    if (state.draft) {
      $('comparison-table').innerHTML = '<p class="muted">Save a brief or import a workspace to start comparing properties.</p>';
      $('memo-preview').textContent = 'Your diligence memo will appear after you save a research brief.';
      return;
    }
    const selected = state.candidates.filter(c => c.shortlisted);
    if (!selected.length) $('comparison-table').innerHTML = '<p class="muted">No properties shortlisted yet. Use + Shortlist on a property to compare it here.</p>';
    else {
      const rows = [ ['Screening result', c => escape(C.evaluate(c, state.brief).label)],
        ...C.FACTS.map(d => [d.label, c => `${escape(C.factText(c, d.key))}<small>${escape(c.facts[d.key].checkedAt || 'Undated')} · ${escape(c.facts[d.key].level)}</small>`]),
        ['Open questions', c => escape(C.evaluate(c, state.brief).nextQuestions.join(' '))], ['Source', c => link(c.listingUrl, 'Open listing ↗') || 'Missing'] ];
      $('comparison-table').innerHTML = `<table><thead><tr><th scope="col">Requirement / evidence</th>${selected.map(c => `<th scope="col">${escape(c.title)}</th>`).join('')}</tr></thead><tbody>${rows.map(([name, value]) => `<tr><th scope="row">${escape(name)}</th>${selected.map(c => `<td>${value(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    $('memo-preview').textContent = C.memo(state);
  }
  function render() { renderHeader(); renderCandidates(); renderComparison(); }
  $('brief-form').addEventListener('input', () => { briefDirty = true; notify('Brief changes are not saved yet. Save the brief to update screening, searches, and exports.'); });
  $('brief-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const raw = Object.fromEntries(new FormData(event.currentTarget));
      for (const key of ['requireFlat', 'requireExpansion', 'requireField', 'requireEvents']) raw[key] = event.currentTarget.elements.namedItem(key).checked;
      state.brief = C.normalizeBrief(raw); state.draft = false; briefDirty = false; $('brief-error').textContent = ''; save(); render();
      notify('Brief saved. All existing properties were screened again against these requirements.');
    } catch (error) { $('brief-error').textContent = error.message; }
  });
  $('reset-brief').addEventListener('click', () => {
    const current = state.brief; state.brief = { ...C.DEFAULT_BRIEF }; fillBrief(); state.brief = current;
    briefDirty = true; notify('Blank brief loaded into the form. Save it to apply; existing properties will be preserved.');
  });
  function editor(candidate) {
    editing = candidate || null;
    const form = $('candidate-form'); form.reset(); $('candidate-error').textContent = '';
    $('candidate-heading').textContent = candidate ? 'Edit property evidence' : 'Add a property';
    const c = candidate || { routeOrigin: state.brief.origin, corridorName: state.brief.corridor, regionName: state.brief.region, assessedUse: state.brief.use, facts: {} };
    for (const key of ['id', 'title', 'location', 'county', 'parcelId', 'listingUrl', 'capturedAt', 'routeOrigin', 'routeWhen', 'corridorName', 'regionName', 'assessedUse', 'notes']) form.elements.namedItem(key).value = c[key] || '';
    form.elements.namedItem('listingStatus').value = c.listingStatus || 'unknown'; form.elements.namedItem('tenure').value = c.tenure || 'unknown';
    $('fact-editor').innerHTML = C.FACTS.map(d => {
      const f = c.facts[d.key] || C.blankFact(), name = `fact.${d.key}`;
      const control = d.type === 'number' ? `<input name="${name}.value" type="number" min="0" step="any" value="${escape(f.value)}" placeholder="Unknown">` : `<select name="${name}.value"><option value="">Unknown</option>${(d.options || C.YES_NO).map(([v, label]) => `<option value="${v}" ${f.value === v ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
      return `<details class="fact-block" ${['acres', 'flatAcres', 'terrain', 'driveMinutes'].includes(d.key) ? 'open' : ''}><summary>${escape(d.label)}<span>${escape(candidate ? C.factText(candidate, d.key) : 'Unknown')}</span></summary><p>${escape(d.question)}</p><div class="form-grid"><label>${escape(d.label)}${control}</label><label>Evidence status<select name="${name}.level"><option value="reported">Reported — needs verification</option><option value="documented" ${f.level === 'documented' ? 'selected' : ''}>Documented by me</option></select></label><label class="source-label">Source URL<input name="${name}.sourceUrl" type="url" value="${escape(f.sourceUrl)}" placeholder="https://…"></label><label>Date you checked this source<input name="${name}.checkedAt" type="date" value="${escape(f.checkedAt)}"></label><label>Evidence / measurement notes<textarea name="${name}.detail" rows="2" maxlength="1000">${escape(f.detail)}</textarea></label></div></details>`;
    }).join('');
    $('candidate-dialog').showModal();
  }
  $('add-candidate').addEventListener('click', () => { try { requireSavedBrief(); editor(null); } catch (e) { notify(e.message); } });
  $('close-candidate').addEventListener('click', () => $('candidate-dialog').close());
  $('candidate-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget)); data.facts = {};
      for (const d of C.FACTS) data.facts[d.key] = Object.fromEntries(['value', 'level', 'sourceUrl', 'checkedAt', 'detail'].map(k => [k, data[`fact.${d.key}.${k}`]]));
      data.shortlisted = editing?.shortlisted || false;
      const next = C.normalizeCandidate(data);
      if (state.candidates.some(c => c.id !== editing?.id && C.sameCandidate(c, next))) throw new Error('This source or county/parcel ID is already in the workspace. Edit the existing property instead.');
      if (editing) state.candidates = state.candidates.map(c => c.id === editing.id ? next : c);
      else { if (state.candidates.length >= 100) throw new Error('Export this workspace and start another to research more than 100 properties.'); state.candidates.push(next); }
      save(); render(); $('candidate-dialog').close(); notify('Property saved. Screening uses only the evidence recorded here.');
    } catch (error) { $('candidate-error').textContent = error.message; }
  });
  $('candidate-list').addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    const id = button.dataset.edit || button.dataset.shortlist || button.dataset.remove;
    const c = state.candidates.find(x => x.id === id); if (!c) return;
    if (button.dataset.edit) { editor(c); return; }
    if (button.dataset.shortlist) { c.shortlisted = !c.shortlisted; save(); renderCandidates(); renderComparison(); document.querySelector(`[data-shortlist="${CSS.escape(id)}"]`)?.focus(); return; }
    if (button.dataset.remove && window.confirm(`Remove “${c.title}” and its evidence from this workspace?`)) { state.candidates = state.candidates.filter(x => x.id !== id); save(); render(); notify('Property removed from this workspace.'); }
  });
  $('filter').addEventListener('change', renderCandidates);
  function download(name, content, type) {
    const href = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = href; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  function guard(fn) { return () => { try { requireSavedBrief(); fn(); } catch (error) { notify(error.message); } }; }
  $('export-workspace').addEventListener('click', guard(() => download('parcel-workspace.json', JSON.stringify(state, null, 2), 'application/json')));
  $('export-memo').addEventListener('click', guard(() => download('parcel-diligence-memo.md', C.memo(state), 'text/markdown;charset=utf-8')));
  $('print-memo').addEventListener('click', guard(() => { $('print-output').textContent = C.memo(state); window.print(); }));
  if (window.ParcelResearch) window.ParcelResearch.mount({ getState: () => state, requireSavedBrief, applyCandidates: incoming => {
    const merged = C.mergeCandidates(state.candidates, incoming);
    state.candidates = merged.candidates; save(); render(); return merged;
  } });
  function clearImport() { pendingImport = null; $('import-preview').hidden = true; $('import-error').textContent = ''; }
  $('open-import').addEventListener('click', () => { importRead++; clearImport(); $('import-text').value = ''; $('import-file').value = ''; $('import-dialog').showModal(); });
  $('close-import').addEventListener('click', () => $('import-dialog').close());
  $('import-text').addEventListener('input', () => { importRead++; clearImport(); });
  $('import-file').addEventListener('change', async () => {
    const current = ++importRead; clearImport();
    try {
      const file = $('import-file').files[0]; if (!file) return;
      if (file.size > 1000000) throw new Error('Choose a JSON file smaller than 1 MB.');
      const content = await file.text();
      if (current !== importRead) return;
      clearImport(); $('import-text').value = content;
    } catch (error) { if (current === importRead) $('import-error').textContent = error.message; }
  });
  $('review-import').addEventListener('click', () => {
    clearImport();
    try {
      const text = $('import-text').value.trim().replace(/^```(?:json)?\s*\n/, '').replace(/\n```$/, '');
      if (text.length > 1000000) throw new Error('Keep research imports below 1 MB.');
      pendingImport = C.parseImport(JSON.parse(text));
      $('import-description').textContent = `${pendingImport.candidates.length} candidate(s). ${pendingImport.kind === 'parcel-workspace' ? `Backup of “${pendingImport.brief.name}”. Merge candidates, or explicitly replace the current workspace below.` : 'New research will be merged; existing records will not be overwritten. All imported claims are reported, not verified.'}`;
      $('import-titles').textContent = pendingImport.candidates.map(c => `${c.title} — ${c.location}`).join('\n');
      $('import-replace').checked = false; $('import-replace').closest('label').hidden = pendingImport.kind !== 'parcel-workspace'; $('import-preview').hidden = false;
    } catch (error) { $('import-error').textContent = error instanceof SyntaxError ? 'This is not valid JSON. Paste the complete Parcel research object or choose an exported workspace.' : error.message; }
  });
  $('apply-import').addEventListener('click', () => {
    try {
      if (!pendingImport) throw new Error('Review the import first.');
      if (pendingImport.kind === 'parcel-workspace' && $('import-replace').checked) {
        state = C.workspace(pendingImport.brief, C.mergeCandidates([], pendingImport.candidates).candidates); preserveSaved = false; fillBrief();
      } else {
        requireSavedBrief();
        const merged = C.mergeCandidates(state.candidates, pendingImport.candidates); state.candidates = merged.candidates;
      }
      save(); render(); $('import-dialog').close(); notify('Reviewed research imported. Existing records are retained unless you chose to replace the workspace.'); clearImport();
    } catch (error) { $('import-error').textContent = error.message; }
  });
  window.addEventListener('storage', event => { if (event.key === C.STORAGE_KEY) { preserveSaved = true; notify('This workspace changed in another tab. Export this tab’s changes or reload before saving over that version.'); } });
  fillBrief(); render();
})();
