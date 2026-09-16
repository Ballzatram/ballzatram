const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const C = require('../tools/parcel/core.js');
const { JSDOM } = createRequire(path.join(root, 'frontend/package.json'))('jsdom');
const now = new Date('2026-09-16T12:00:00Z');
const fact = value => ({ value, sourceUrl: 'https://example.com/evidence', checkedAt: '2026-09-16', level: 'reported' });
const TEST_BRIEF = { ...C.DEFAULT_BRIEF, name: 'Test research', use: 'Equestrian events', region: 'Example County', origin: 'Example Central Station', corridor: 'Example highway', corridorMode: 'preferred', searchAreas: 'Example County', minAcres: 40, minFlatAcres: 5, targetFlatAcres: 6, preferredDrive: 20, maxDrive: 60, requireFlat: true, requireExpansion: true, requireField: true, requireEvents: true, eventGuests: 250 };
const brief = () => C.normalizeBrief(TEST_BRIEF);
function candidate(overrides = {}) {
  return C.normalizeCandidate({ title: 'A real test property', location: 'Example County', listingUrl: 'https://example.com/property', capturedAt: '2026-09-16', listingStatus: 'reported-active', tenure: 'sale',
    routeOrigin: TEST_BRIEF.origin, routeWhen: 'Saturday 10 am; typical traffic', corridorName: TEST_BRIEF.corridor, regionName: TEST_BRIEF.region, assessedUse: TEST_BRIEF.use,
    facts: Object.fromEntries(C.FACTS.map(d => [d.key, fact(({ acres: 50, usableAcres: 40, flatAcres: 6, terrain: 'flat', driveMinutes: 50, slope: 1, price: 750000, annualRent: 30000, eventCapacity: 300 })[d.key] ?? 'yes')])), ...overrides });
}
function setFact(c, key, value) { c.facts[key] = fact(value); return c; }
test('The blank public brief contains no private search and separates footprint, drive limits, and budgets', () => {
  const b = C.workspace().brief; assert.equal(b.region, ''); assert.equal(b.origin, ''); assert.equal(b.minFlatAcres, null); assert.equal(b.maxDrive, 60); assert.equal(b.purchaseBudget, null); assert.equal(b.tenure, 'either');
  for (const bad of [{ minAcres: 0 }, { maxDrive: -1 }, { minAcres: 50, maxAcres: 40 }, { preferredDrive: 70 }, { maxSlope: 101 }, { eventGuests: 2.5 }]) assert.throws(() => C.normalizeBrief({ ...brief(), ...bad }));
});
test('Hard acreage, terrain, drive, event-size, and budget failures cannot be offset by other strengths', () => {
  assert.equal(C.evaluate(candidate(), brief(), now).verdict, 'promising');
  for (const [key, value] of [['acres', 39.99], ['flatAcres', 4.99], ['terrain', 'rolling'], ['terrain', 'mixed'], ['driveMinutes', 61], ['eventCapacity', 200], ['zoning', 'no']]) {
    const result = C.evaluate(setFact(candidate(), key, value), brief(), now); assert.equal(result.verdict, 'conflict', key); assert.ok(result.failed.some(f => f.key === key));
  }
  assert.equal(C.evaluate(candidate(), { ...brief(), purchaseBudget: 500000 }, now).verdict, 'conflict');
  const lease = candidate({ tenure: 'lease' });
  assert.equal(C.evaluate(lease, { ...brief(), purchaseBudget: 1, annualLeaseBudget: 50000 }, now).verdict, 'promising');
  assert.equal(C.evaluate(lease, { ...brief(), annualLeaseBudget: 20000 }, now).verdict, 'conflict');
});
test('Corridor preference is distinct from a required geographic boundary', () => {
  const c = setFact(candidate(), 'corridor', 'no');
  assert.equal(C.evaluate(c, brief(), now).verdict, 'promising');
  assert.equal(C.evaluate(c, { ...brief(), corridorMode: 'required' }, now).verdict, 'conflict');
  assert.equal(C.evaluate(setFact(candidate(), 'region', 'no'), brief(), now).verdict, 'conflict');
});
test('Unknown, stale, undated, future-dated, and unsourced positive claims never pass', () => {
  for (const patch of [{ value: null }, { checkedAt: '' }, { sourceUrl: '' }, { checkedAt: '2025-01-01' }, { checkedAt: '2026-10-01' }]) {
    const c = candidate(); Object.assign(c.facts.terrain, patch); const a = C.evaluate(c, brief(), now);
    assert.equal(a.verdict, 'research'); assert.equal(a.checks.find(x => x.key === 'terrain').state, 'unknown');
  }
  const c = setFact(candidate(), 'terrain', 'rolling'); c.facts.terrain.checkedAt = '2025-01-01';
  assert.equal(C.evaluate(c, brief(), now).verdict, 'conflict');
  assert.equal(C.evaluate(candidate({ capturedAt: '2026-01-01' }), brief(), now).verdict, 'research');
  assert.equal(C.evaluate(candidate({ listingStatus: 'unavailable' }), brief(), now).verdict, 'conflict');
});
test('Changing origin, geography, use, attendance, or maximum drive rescreens existing evidence', () => {
  const c = candidate();
  for (const patch of [{ origin: 'Another city center' }, { region: 'Arizona' }, { use: 'Industrial park' }]) assert.equal(C.evaluate(c, { ...brief(), ...patch }, now).verdict, 'research');
  assert.equal(C.evaluate(c, { ...brief(), maxDrive: 35 }, now).verdict, 'conflict');
  assert.equal(C.evaluate(c, { ...brief(), eventGuests: 400 }, now).verdict, 'conflict');
  assert.equal(C.evaluate(c, { ...brief(), eventGuests: null }, now).verdict, 'research');
  assert.equal(C.evaluate(candidate({ routeWhen: '' }), brief(), now).checks.find(c => c.key === 'driveMinutes').state, 'unknown');
});
test('Import keeps unknowns null, rejects impossible acreage and unsafe URLs, and demotes AI verification claims', () => {
  const c = candidate(); c.facts.terrain.level = 'documented';
  const imported = C.parseImport({ kind: 'parcel-research', schemaVersion: 1, candidates: [c] });
  assert.equal(imported.candidates[0].facts.terrain.level, 'reported');
  const empty = C.normalizeCandidate({ title: 'Unknown', location: 'Somewhere' }); assert.equal(empty.facts.acres.value, null);
  for (const facts of [{ acres: { value: false } }, { acres: { value: -1 } }, { acres: { value: 'NaN' } }, { acres: fact(10), usableAcres: fact(20) }, { acres: fact(10), flatAcres: fact(11) }]) assert.throws(() => C.normalizeCandidate({ title: 'Bad', location: 'Test', facts }));
  for (const listingUrl of ['javascript:alert(1)', 'data:text/html,test', 'https://user:pass@example.com']) assert.throws(() => C.normalizeCandidate({ title: 'Bad', location: 'Test', listingUrl }));
  assert.throws(() => C.normalizeCandidate({ title: 'Bad', location: 'Test', facts: { terrain: { value: 'flat', level: 'documented' } } }));
  assert.throws(() => C.parseImport({ schemaVersion: 2, kind: 'parcel-research', candidates: [] }));
  assert.throws(() => C.parseImport({ schemaVersion: 1, kind: 'parcel-workspace', candidates: [] }));
});
test('Duplicate imports preserve edited evidence; identical titles in different counties are not merged', () => {
  const old = candidate(); old.notes = 'My reviewed evidence';
  const incoming = candidate({ listingUrl: 'https://example.com/property?utm_source=mail', notes: 'Changed', id: old.id });
  const result = C.mergeCandidates([old], [incoming]); assert.equal(result.added, 0); assert.equal(result.candidates[0].notes, 'My reviewed evidence');
  const other = candidate({ listingUrl: 'https://example.com/another-property', location: 'Another county', id: old.id });
  const merged = C.mergeCandidates([old], [other]); assert.equal(merged.added, 1); assert.notEqual(merged.candidates[1].id, old.id);
});
test('Research plan follows new geography and does not pretend search URLs are actual property results', () => {
  const rows = C.researchPlan({ ...brief(), region: 'Tucson, AZ', searchAreas: 'Tucson, AZ', minAcres: 60, tenure: 'lease' });
  assert.equal(rows.length, 1); assert.match(rows[0].query, /Tucson.*60\+ acres land for lease/); assert.doesNotMatch(rows[0].query, /Example County/); assert.match(rows[0].note, /Search area only/);
});
test('Workspace backup roundtrips and memo preserves sources, unknowns, failures, and active requirements', () => {
  const c = setFact(candidate(), 'terrain', 'rolling'); c.shortlisted = true;
  const state = C.workspace(brief(), [c]); const restored = C.parseImport(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.candidates[0].shortlisted, true);
  const memo = C.memo(restored, now); assert.match(memo, /Conflicts with brief/); assert.match(memo, /https:\/\/example.com\/evidence/); assert.match(memo, /60 minutes/); assert.match(memo, /250/); assert.match(memo, /40\+ acres/);
});
test('AI handoff includes only explicitly shortlisted properties and bounds the context', () => {
  const chosen = candidate({ shortlisted: true }); const hidden = candidate({ title: 'Private unselected lead', notes: 'Never share this', listingUrl: 'https://example.com/hidden' });
  const context = C.aiContext(C.workspace(brief(), [chosen, hidden]));
  assert.equal(context.selectedCandidates.length, 1); assert.doesNotMatch(JSON.stringify(context), /Private unselected|Never share/);
  assert.equal(C.aiContext(C.workspace(brief(), [hidden])).selectedCandidates.length, 0);
  const giant = candidate({ shortlisted: true, notes: 'x'.repeat(4000) }); for (const f of Object.values(giant.facts)) f.detail = 'x'.repeat(1000);
  assert.throws(() => C.aiContext(C.workspace(brief(), [giant])), /too large/);
});
function page(prepare = () => {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'tools/parcel/index.html'), 'utf8'), { url: 'https://dgallemore.com/tools/parcel/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; w.AbortSignal = AbortSignal; w.CSS = { escape: v => v }; w.HTMLElement.prototype.scrollIntoView = function () {};
  w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  w.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  w.fetch = async () => { throw new Error('Unexpected request'); }; w.confirm = () => true;
  w.URL.createObjectURL = () => 'blob:parcel-test'; w.URL.revokeObjectURL = () => {};
  prepare(w);
  for (const file of ['assets/ai-config.js', 'assets/ai-features.js', 'assets/subscription-client.js', 'assets/ai-client.js', 'tools/parcel/core.js', 'tools/parcel/research.js', 'tools/parcel/script.js']) w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  return dom;
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function submit(w, id) { w.document.getElementById(id).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); }
test('A blank public workspace accepts a private backup only after reviewed replacement', () => {
  const dom = page(); const w = dom.window, d = w.document;
  d.getElementById('research-ai').click(); assert.equal(d.querySelector('[data-app=form]'), null); assert.equal(d.getElementById('research-run').disabled, true);
  d.getElementById('open-import').click();
  d.getElementById('import-text').value = JSON.stringify(C.workspace(brief(), [candidate()]));
  d.getElementById('review-import').click(); d.getElementById('apply-import').click();
  assert.equal(d.querySelectorAll('.candidate-card').length, 0); assert.match(d.getElementById('import-error').textContent, /Save a brief/);
  d.getElementById('import-replace').checked = true; d.getElementById('apply-import').click();
  assert.equal(d.querySelectorAll('.candidate-card').length, 1); assert.equal(d.getElementById('hero-name').textContent, TEST_BRIEF.name); assert.match(d.getElementById('save-status').textContent, /Saved in this browser/);
  dom.window.close();
});
test('UI starts empty, imports reviewed source records, deduplicates, shortlists, and restores after reload', () => {
  const source = { kind: 'parcel-research', schemaVersion: 1, candidates: [candidate()] };
  const dom = page(w => w.localStorage.setItem(C.STORAGE_KEY, JSON.stringify(C.workspace(brief())))); const w = dom.window, d = w.document;
  assert.equal(d.querySelectorAll('.candidate-card').length, 0);
  for (let i = 0; i < 2; i++) {
    d.getElementById('open-import').click(); d.getElementById('import-text').value = JSON.stringify(source); d.getElementById('review-import').click(); d.getElementById('apply-import').click();
    assert.equal(d.querySelectorAll('.candidate-card').length, 1);
  }
  d.querySelector('[data-shortlist]').click(); assert.equal(d.querySelectorAll('#comparison-table thead th').length, 2);
  const saved = w.localStorage.getItem(C.STORAGE_KEY); const restored = page(win => win.localStorage.setItem(C.STORAGE_KEY, saved));
  assert.equal(restored.window.document.querySelectorAll('.candidate-card').length, 1); assert.match(restored.window.document.getElementById('comparison-table').textContent, /A real test property/);
  restored.window.close(); dom.window.close();
});
test('UI edits hard criteria and candidate evidence, then updates shortlist and memo without stale scores', () => {
  const c = candidate({ shortlisted: true }); const dom = page(w => w.localStorage.setItem(C.STORAGE_KEY, JSON.stringify(C.workspace(brief(), [c])))); const w = dom.window, d = w.document;
  d.querySelector('[name=minAcres]').value = '55'; submit(w, 'brief-form');
  assert.match(d.getElementById('comparison-table').textContent, /Conflicts with brief/); assert.match(d.getElementById('memo-preview').textContent, /55\+ acres/);
  d.querySelector('[data-edit]').click(); d.querySelector('[name="fact.acres.value"]').value = '60'; submit(w, 'candidate-form');
  assert.equal(d.getElementById('candidate-dialog').open, false); assert.match(d.getElementById('memo-preview').textContent, /60 acres/);
  d.querySelector('[data-shortlist]').click(); assert.match(d.getElementById('comparison-table').textContent, /No properties shortlisted/);
  dom.window.close();
});
test('UI treats HTML payloads as text and does not inherit a searched location for a new property', () => {
  const dom = page(w => w.localStorage.setItem(C.STORAGE_KEY, JSON.stringify(C.workspace(brief())))); const w = dom.window, d = w.document; d.getElementById('add-candidate').click();
  assert.equal(d.querySelector('#candidate-form [name=location]').value, '');
  d.querySelector('#candidate-form [name=title]').value = '<img src=x onerror=alert(1)>';
  d.querySelector('#candidate-form [name=location]').value = 'Actual place'; submit(w, 'candidate-form');
  assert.equal(d.querySelector('#candidate-list img'), null); assert.match(d.getElementById('candidate-list').textContent, /<img src=x/); dom.window.close();
});
test('UI import is reviewed, invalidated on edits, and does not replace an existing workspace by default', () => {
  const dom = page(w => w.localStorage.setItem(C.STORAGE_KEY, JSON.stringify(C.workspace(brief())))); const w = dom.window, d = w.document;
  d.getElementById('open-import').click();
  d.getElementById('import-text').value = JSON.stringify(C.workspace({ ...brief(), name: 'Imported brief' }, [candidate()]));
  d.getElementById('review-import').click(); assert.equal(d.getElementById('import-preview').hidden, false);
  d.getElementById('apply-import').click(); assert.equal(d.getElementById('hero-name').textContent, TEST_BRIEF.name); assert.equal(d.querySelectorAll('.candidate-card').length, 1);
  d.getElementById('open-import').click(); d.getElementById('import-text').value = '{bad'; d.getElementById('review-import').click(); assert.match(d.getElementById('import-error').textContent, /valid JSON/); assert.equal(d.querySelectorAll('.candidate-card').length, 1);
  dom.window.close();
});
test('Blocked or malformed storage leaves a usable session and preserves the original saved data', () => {
  for (const blocked of [true, false]) {
    const dom = page(w => { if (blocked) Object.defineProperty(w, 'localStorage', { get() { throw new Error('Blocked'); } }); else w.localStorage.setItem(C.STORAGE_KEY, '{broken'); });
    const w = dom.window, d = w.document; assert.equal(d.querySelectorAll('.area-card').length, 0);
    d.querySelector('[name=name]').value = 'Session project'; d.querySelector('[name=region]').value = 'Example County'; d.querySelector('[name=origin]').value = 'Example city center'; submit(w, 'brief-form'); assert.match(d.getElementById('save-status').textContent, /session only/);
    if (!blocked) assert.equal(w.localStorage.getItem(C.STORAGE_KEY), '{broken'); dom.window.close();
  }
});
test('Parcel shows an inline setup state without opening AI apps or making requests', () => {
  let requests = 0; const dom = page(w => { w.fetch = async () => { requests++; throw new Error('Unexpected'); }; w.localStorage.setItem('unrelated-private-data', 'DO NOT SHARE'); w.localStorage.setItem(C.STORAGE_KEY, JSON.stringify(C.workspace(brief()))); }); const w = dom.window, d = w.document;
  w.BallzatramAI.saveSettings({ mode: 'subscription' }); w.BallzatramSubscription.configure({ endpoint: 'https://runtime.example.com', model: 'test' });
  d.getElementById('research-ai').click(); assert.equal(d.querySelector('[data-app=form]'), null); assert.equal(requests, 0);
  assert.equal(d.getElementById('research-connection').open, true); assert.equal(d.getElementById('research-run').disabled, true);
  assert.doesNotMatch(d.getElementById('research-workbench').textContent, /DO NOT SHARE|Copy prompt/);
  assert.match(w.BallzatramAIFeatures.instructions('parcel', 'research'), /publicly accessible sources/);
  assert.match(w.BallzatramAIFeatures.instructions('observatory', 'research'), /cannot browse/);
  dom.window.close();
});
test('Unsaved brief edits stop research and preset loading preserves existing candidates', () => {
  const dom = page(w => w.localStorage.setItem(C.STORAGE_KEY, JSON.stringify(C.workspace(brief(), [candidate()])))); const w = dom.window, d = w.document;
  const min = d.querySelector('[name=minAcres]'); min.value = '80'; min.dispatchEvent(new w.Event('input', { bubbles: true }));
  submit(w, 'research-form'); assert.equal(d.querySelector('[data-app=form]'), null); assert.match(d.getElementById('research-error').textContent, /Save your edited brief first/);
  d.getElementById('reset-brief').click(); assert.equal(min.value, '1'); assert.equal(d.querySelectorAll('.candidate-card').length, 1); dom.window.close();
});

const researchAnswer = candidates => JSON.stringify({ kind: 'parcel-research', schemaVersion: 1, summary: 'Source-reported findings. Confirm flatness and travel time.', candidates });
async function connectedPage({ answer = researchAnswer([candidate()]), compatible = true, assist, state = C.workspace(brief()) } = {}) {
  const calls = [], endpoint = 'https://runtime.example.com';
  const dom = page(w => {
    w.TextDecoder = TextDecoder;
    w.localStorage.setItem(C.STORAGE_KEY, JSON.stringify(state));
    w.localStorage.setItem('unrelated-private-data', 'NEVER SHARE THIS');
    w.localStorage.setItem('ballzatram:subscription-settings:v1', JSON.stringify({ endpoint, model: 'test-model' }));
    w.sessionStorage.setItem('ballzatram:subscription-session:v1', JSON.stringify({ endpoint, token: 't'.repeat(43), expiresAt: Date.now() + 3600000, account: { type: 'chatgpt', email: 'test@example.org', planType: 'plus' } }));
    w.open = () => { throw new Error('Research must not open another window'); };
    w.fetch = async (url, options = {}) => {
      const route = new URL(url).pathname; calls.push({ route, options });
      if (route === '/v1/account') return Response.json({ account: { type: 'chatgpt', email: 'test@example.org', planType: 'plus' } });
      if (route === '/v1/models') return Response.json({ models: [{ id: 'test-model', name: 'Test model', isDefault: true }] });
      if (route === '/health') return Response.json({ protocol: 3, billing: 'user-chatgpt-only', service: 'osiris-subscription', capabilities: compatible ? ['parcel-research-v1'] : [] });
      if (route === '/v1/assist') {
        if (assist) return assist(options);
        return new Response(`event: status\ndata: ${JSON.stringify({ message: 'Checking sources…' })}\n\nevent: done\ndata: ${JSON.stringify({ kind: 'answer', answer, model: 'test-model', billing: 'chatgpt-subscription' })}\n\n`, { headers: { 'Content-Type': 'text/event-stream' } });
      }
      throw new Error(`Unexpected route ${route}`);
    };
  });
  for (let i = 0; i < 4; i++) await flush();
  return { dom, w: dom.window, d: dom.window.document, calls };
}

test('In-page research uses the signed-in subscription, returns cards, and adds only selected findings', async () => {
  const privateLead = candidate({ listingUrl: 'https://example.com/private', notes: 'UNSELECTED RESEARCH' });
  const unsafeTitle = candidate({ title: '<img src=x onerror=alert(1)>', shortlisted: true });
  const other = candidate({ title: 'Second result', listingUrl: 'https://example.com/second' });
  const f = await connectedPage({ answer: researchAnswer([unsafeTitle, other]), state: C.workspace(brief(), [privateLead]) });
  const { w, d, calls } = f;
  assert.equal(calls.filter(c => c.route === '/v1/assist').length, 0);
  d.getElementById('research-ai').click(); assert.equal(d.querySelector('dialog[open]'), null);
  submit(w, 'research-form'); for (let i = 0; i < 4; i++) await flush();
  const requests = calls.filter(c => c.route === '/v1/assist'); assert.equal(requests.length, 1);
  const body = JSON.parse(requests[0].options.body); assert.equal(body.tool, 'parcel'); assert.equal(body.consent, true); assert.equal(body.context.selectedCandidates.length, 0);
  assert.doesNotMatch(requests[0].options.body, /NEVER SHARE THIS|UNSELECTED RESEARCH/);
  assert.equal(d.querySelectorAll('.research-finding').length, 2); assert.equal(d.querySelector('#research-findings img'), null);
  assert.equal(d.querySelectorAll('#candidate-list .candidate-card').length, 1);
  d.querySelector('[data-research-pick="1"]').checked = false; d.getElementById('research-apply').click();
  assert.equal(d.querySelectorAll('#candidate-list .candidate-card').length, 2);
  const saved = JSON.parse(w.localStorage.getItem(C.STORAGE_KEY)); assert.equal(saved.candidates[1].shortlisted, false);
  assert.equal(saved.candidates[1].facts.acres.level, 'reported'); assert.equal(saved.candidates[0].notes, 'UNSELECTED RESEARCH');
  d.getElementById('research-apply').click(); assert.equal(d.querySelectorAll('#candidate-list .candidate-card').length, 2);
  w.close();
});

test('An older service fails before any model request and never falls back to another app', async () => {
  const { w, d, calls } = await connectedPage({ compatible: false });
  submit(w, 'research-form'); for (let i = 0; i < 3; i++) await flush();
  assert.equal(calls.filter(c => c.route === '/v1/assist').length, 0); assert.match(d.getElementById('research-error').textContent, /needs the Parcel research update/);
  assert.equal(d.querySelectorAll('[data-app]').length, 0); assert.equal(d.querySelectorAll('.candidate-card').length, 0); w.close();
});

test('Stopped research and duplicate submissions do not add late results or retry', async () => {
  let finish;
  const { w, d, calls } = await connectedPage({ assist: () => new Promise(resolve => { finish = resolve; }) });
  submit(w, 'research-form'); await flush(); submit(w, 'research-form');
  assert.equal(calls.filter(c => c.route === '/v1/assist').length, 1);
  const request = calls.find(c => c.route === '/v1/assist'); d.getElementById('research-stop').click();
  assert.equal(request.options.signal.aborted, true);
  finish(new Response(`event: done\ndata: ${JSON.stringify({ answer: researchAnswer([candidate()]), model: 'test-model', billing: 'chatgpt-subscription' })}\n\n`, { headers: { 'Content-Type': 'text/event-stream' } }));
  for (let i = 0; i < 3; i++) await flush();
  assert.equal(d.getElementById('research-results').hidden, true); assert.equal(d.querySelectorAll('.candidate-card').length, 0);
  assert.match(d.getElementById('research-status').textContent, /stopped/); w.close();
});

test('Changed briefs block applying old research, while duplicate properties retain existing evidence', async () => {
  const original = candidate({ notes: 'Evidence I reviewed', facts: { acres: { ...fact(50), level: 'documented' } } });
  const second = candidate({ title: 'Another property', listingUrl: 'https://example.com/other' });
  const { w, d } = await connectedPage({ state: C.workspace(brief(), [original]), answer: researchAnswer([candidate(), second]) });
  submit(w, 'research-form'); for (let i = 0; i < 3; i++) await flush();
  assert.equal(d.querySelector('[data-research-pick="0"]').disabled, true);
  d.querySelector('[name=minAcres]').value = '75'; submit(w, 'brief-form'); d.getElementById('research-apply').click();
  assert.match(d.getElementById('research-error').textContent, /brief changed/);
  const saved = JSON.parse(w.localStorage.getItem(C.STORAGE_KEY)); assert.equal(saved.candidates.length, 1); assert.equal(saved.candidates[0].notes, 'Evidence I reviewed');
  assert.equal(saved.candidates[0].facts.acres.level, 'documented'); w.close();
});

test('Empty results are explicit; malformed and source-free research never mutate the workspace', async () => {
  for (const answer of [researchAnswer([]), 'Incomplete JSON {', researchAnswer([candidate({ listingUrl: '' })]), JSON.stringify(C.workspace(brief(), [candidate()]))]) {
    const { w, d } = await connectedPage({ answer });
    submit(w, 'research-form'); for (let i = 0; i < 3; i++) await flush();
    assert.equal(d.querySelectorAll('.candidate-card').length, 0);
    if (answer === researchAnswer([])) { assert.equal(d.getElementById('research-results').hidden, false); assert.equal(d.getElementById('research-apply').hidden, true); assert.match(d.getElementById('research-status').textContent, /without new property leads/); }
    else { assert.equal(d.getElementById('research-results').hidden, true); assert.ok(d.getElementById('research-error').textContent); }
    w.close();
  }
});
