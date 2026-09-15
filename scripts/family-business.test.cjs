const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { JSDOM } = createRequire(path.join(root, 'frontend/package.json'))('jsdom');
const E = require('../econ-arcade/play/campaign-engine.js');
const D = require('../econ-arcade/play/campaign-data.js');
function candidates(m) {
  let plans = [{}];
  for (const c of m.controls) {
    const values = c.type === 'choice' ? c.options.map(o => o[0]) : Array.from({ length: Math.round((c.max - c.min) / c.step) + 1 }, (_, i) => c.min + i * c.step);
    plans = plans.flatMap(plan => values.map(value => ({ ...plan, [c.id]: value })));
  }
  return plans;
}
function campaign(stop = 18) {
  let state = E.initial(); const events = [], snapshots = [];
  const act = command => { state = E.reduce(state, command); events.push(command); };
  while (state.completed.length < stop) {
    const m = E.mission(state), base = E.defaults(m), ref = E.evaluate(state, base);
    const plan = (state.stage === 0 ? [base] : candidates(m)).map(input => ({ input, result: E.evaluate(state, input) })).find(({ input, result }) => {
      const change = E.direction(result.value, ref.value);
      return state.stage === 0 || (change !== 'same' && (state.stage === 1 ? m.controls.filter(c => input[c.id] !== base[c.id]).length === 1 : change === m.goal));
    });
    assert.ok(plan, `${m.id}: stage ${state.stage} is attainable`);
    while (plan.result.cost > state.cash + plan.result.borrowing) act({ type: 'loan' });
    act({ type: 'play', input: plan.input, forecast: E.direction(plan.result.value, ref.value) });
    assert.equal(state.latest.qualifies, true, m.id);
    assert.ok(state.cash >= 0 && Number.isFinite(state.cash));
    assert.ok(Math.abs(state.cash - state.latest.before.cash - state.latest.cashChange) < .001);
    snapshots.push(state); act({ type: 'continue' });
  }
  return { state, events, snapshots };
}
const completed = campaign();

test('all six ranks and 18 episodes are playable and restore the identical ledger', () => {
  const { state, events, snapshots } = completed;
  assert.equal(state.rank, 5); assert.equal(state.finished, true); assert.equal(state.turn, 54); assert.equal(state.completed.length, 18);
  assert.deepEqual(E.restore(E.serialize(events)).state, state);
  for (let rank = 0; rank < 6; rank++) {
    const s = snapshots.find(s => s.rank === rank); assert.ok(s);
    if (rank > 0) assert.ok(s.latest.ongoing.some(report => report.id === 'deli'));
  }
  for (const evidence of Object.values(state.evidence)) assert.deepEqual(evidence, { observed: true, experiment: true, transfer: true });
  let s = E.reduce(state, { type: 'replay', id: 'sunday-rush' });
  s = E.reduce(s, { type: 'play', input: { price: 4, stock: 70 }, forecast: 'same' });
  assert.equal(s.rank, 5); assert.equal(s.completed.length, 18); assert.equal(s.latest.ongoing.length, 5);
});

test('cash, notes, repeated unchanged plans, and lucky profit do not replace learning evidence', () => {
  let s = E.initial(); const play = { type: 'play', input: { price: 4, stock: 70 }, forecast: 'same' };
  s = E.reduce(s, play); const settled = structuredClone(s);
  assert.throws(() => E.reduce(s, play), /already settled/); assert.deepEqual(s, settled);
  s = E.reduce(s, { type: 'continue' });
  s = E.reduce(s, { type: 'note', text: 'scarcity elasticity supply demand opportunity cost '.repeat(10) });
  s = E.reduce(s, { type: 'loan' }); s = E.reduce(s, play);
  assert.equal(s.latest.correct, true); assert.equal(s.latest.qualifies, false); assert.equal(s.evidence['sunday-rush'].experiment, false);
  s = E.reduce(s, { type: 'continue' });
  s = E.reduce(s, { type: 'play', input: { price: 4, stock: 100 }, forecast: 'down' });
  assert.equal(s.latest.qualifies, false); assert.equal(s.rank, 0);
  s = E.reduce(s, { type: 'continue' });
  s = E.reduce(s, { type: 'play', input: { price: 4, stock: 100 }, forecast: 'up' });
  assert.equal(s.latest.qualifies, true); s = E.reduce(s, { type: 'continue' });
  s = E.reduce(s, { type: 'play', input: { price: 4, stock: 20 }, forecast: 'down' });
  assert.equal(s.latest.correct, true); assert.equal(s.latest.qualifies, false); assert.equal(s.evidence['sunday-rush'].experiment, true);
});

test('models expose bottlenecks, repeated-game incentives, and tariff reversals', () => {
  const s = E.initial(), deli = D.missions[0], logistics = D.missions[3], trust = D.missions[7], trade = D.missions[15];
  assert.equal(E.evaluate(s, { price: 4, stock: 70 }, deli, deli.base).value, 70);
  assert.equal(E.evaluate(s, { price: 4, stock: 100 }, deli, deli.base).value, 90);
  assert.ok(E.evaluate(s, { drivers: 3 }, logistics, logistics.base).value > E.evaluate(s, { drivers: 4 }, logistics, logistics.base).value);
  assert.ok(E.evaluate(s, { deal: 'cut', term: 'short' }, trust, trust.base).value > E.evaluate(s, { deal: 'honor', term: 'short' }, trust, trust.base).value);
  assert.ok(E.evaluate(s, { deal: 'cut', term: 'repeat' }, trust, trust.base).value < E.evaluate(s, { deal: 'honor', term: 'repeat' }, trust, trust.base).value);
  const imports = { imports: 100, partner: 'original' }, local = { imports: 0, partner: 'original' };
  assert.ok(E.evaluate(s, imports, trade, trade.base).value < E.evaluate(s, local, trade, trade.base).value);
  assert.ok(E.evaluate(s, imports, trade, trade.transfer).value > E.evaluate(s, local, trade, trade.transfer).value);
});

test('funding, loans, finite inputs, and legal transitions are enforced', () => {
  let s = { ...E.initial(), cash: 0 }; const play = { type: 'play', input: { price: 4, stock: 70 }, forecast: 'same' };
  assert.throws(() => E.reduce(s, play), /up front/);
  s = E.reduce(s, { type: 'loan' }); assert.equal(s.cash, 500); assert.equal(s.debt, 500);
  s = E.reduce(s, play); assert.equal(s.latest.interestPaid, 2.5); assert.equal(s.debt, 500);
  for (const price of [NaN, Infinity, -3, 5000, '4', 4.17]) assert.throws(() => E.reduce(E.initial(), { ...play, input: { price, stock: 70 } }));
  assert.throws(() => E.reduce(E.initial(), { type: 'continue' }));
  assert.throws(() => E.reduce(E.initial(), { type: 'replay', id: 'flour-from-afar' }));
  assert.throws(() => E.reduce(E.initial(), { type: 'policy', asset: 'harbor', value: 'grow' }));
});

test('delegation and carried costs or trust change the older deli', () => {
  const s = campaign(3).state, m = E.mission(s), normal = E.operations(s, m, s.cash);
  const cautious = E.reduce(s, { type: 'policy', asset: 'deli', value: 'careful' });
  assert.notEqual(normal[0].profit, E.operations(cautious, m, s.cash)[0].profit);
  const costly = structuredClone(s); costly.world.cost *= 2;
  assert.ok(E.operations(costly, m, s.cash)[0].profit < normal[0].profit);
  const popular = structuredClone(s); popular.world.traffic = 100; popular.trust = 100;
  const distrusted = structuredClone(popular); distrusted.trust = 0;
  assert.ok(E.operations(popular, m, s.cash)[0].profit > E.operations(distrusted, m, s.cash)[0].profit);
  assert.ok(E.operations(s, m, 0).every(line => line.profit === 0 && line.detail.includes('pauses')));
});

test('backups reject corrupt, future, forged, and oversized histories; stored scores are not trusted', () => {
  assert.throws(() => E.restore('{'), /valid JSON/);
  assert.throws(() => E.restore(JSON.stringify({ campaign: 'the-family-business', version: 2, events: [] })), /supported/);
  assert.throws(() => E.restore(' '.repeat(2000001)), /2 MB/);
  assert.throws(() => E.serialize(Array.from({ length: 4000 }, () => ({ type: 'note', text: 'x'.repeat(600) }))), /2 MB/);
  assert.throws(() => E.restore(E.serialize([{ type: 'promote', rank: 5 }])));
  assert.throws(() => E.restore(E.serialize([{ type: 'play', input: { price: 4, stock: -1 }, forecast: 'same' }])));
  const restored = E.restore(JSON.stringify({ campaign: 'the-family-business', version: 1, cash: 999999, rank: 5, events: [{ type: 'loan', secret: 'drop' }] }));
  assert.equal(restored.state.rank, 0); assert.equal(restored.state.cash, 1150); assert.equal(restored.state.debt, 500);
  assert.doesNotMatch(E.serialize(restored.events), /secret/);
});

test('AI context contains only the current selected episode and optional note, with no write capability', () => {
  const s = structuredClone(completed.snapshots[4]); s.notes['sunday-rush'] = 'PRIVATE OTHER NOTE'; s.notes[E.mission(s).id] = 'MY SELECTED NOTE'; s.unknown = 'SECRET';
  const minimal = JSON.stringify(E.selectedContext(s));
  assert.doesNotMatch(minimal, /PRIVATE OTHER NOTE|MY SELECTED NOTE|SECRET|journal|events/);
  const withNote = JSON.stringify(E.selectedContext(s, true)); assert.match(withNote, /MY SELECTED NOTE/); assert.doesNotMatch(withNote, /PRIVATE OTHER NOTE/);
  const features = require('../assets/ai-features.js'); assert.equal(features.get('econ-world').enabled, true);
  assert.equal(features.capabilities('econ-world').hostTools, true); assert.equal(features.capabilities('econ-world').writes, false);
});
function page(options = {}) {
  const file = path.join(root, 'econ-arcade/play/index.html');
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), { url: 'https://dgallemore.com/econ-arcade/play/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
  w.document.querySelectorAll('form[method=dialog]').forEach(form => form.addEventListener('submit', event => event.preventDefault()));
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; }; w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.localStorage.setItem('osiris-econ-world-v1', '{"legacy":true}'); if (options.raw) w.localStorage.setItem(E.KEY, options.raw);
  if (options.blocked) w.Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  w.OsirisPanel = { open: payload => { w.selectedAI = payload; } };
  for (const name of ['campaign-data.js', 'campaign-engine.js', 'campaign.js']) w.eval(fs.readFileSync(path.join(root, 'econ-arcade/play', name), 'utf8'));
  return dom;
}
function submit(dom, price = 4, stock = 70, forecast = 'same') {
  const d = dom.window.document; d.querySelector('[name=price]').value = price; d.querySelector('[name=stock]').value = stock;
  d.querySelector(`[name=forecast][value=${forecast}]`).checked = true;
  d.getElementById('decision-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

test('UI settles once, restores the result, preserves legacy saves, and opens the selected AI context', () => {
  const dom = page(), d = dom.window.document; assert.equal(d.querySelectorAll('[name=forecast][aria-label]').length, 3);
  submit(dom); assert.match(d.querySelector('.outcome-number').textContent, /70 people/); assert.equal(d.querySelector('#decision-form'), null);
  d.querySelector('[data-action=ai]').click(); assert.equal(dom.window.selectedAI.tool, 'econ-world'); assert.equal(dom.window.selectedAI.context.selectedResult.outcome.value, 70);
  assert.equal(dom.window.localStorage.getItem('osiris-econ-world-v1'), '{"legacy":true}');
  const restored = page({ raw: dom.window.localStorage.getItem(E.KEY) }); assert.match(restored.window.document.querySelector('.outcome-number').textContent, /70 people/);
  d.querySelector('[data-action=continue]').click(); assert.equal(d.querySelector('.steps .current').textContent, '02 · Experiment');
  submit(dom, 4, 100, 'up'); assert.match(d.querySelector('.evidence').textContent, /controlled prediction matched/);
  d.querySelector('[data-action=continue]').click(); assert.ok(d.querySelector('.transfer'));
  d.querySelector('[data-view=library]').click(); assert.equal(d.querySelectorAll('.cards a').length, 8); assert.ok([...d.querySelectorAll('.cards a')].every(a => a.href.includes('family=1')));
  dom.window.close(); restored.window.close();
});

test('corrupt saves remain intact, blocked storage is visible, and stale tabs cannot overwrite', () => {
  const corrupted = page({ raw: '{ broken save' }); submit(corrupted); assert.equal(corrupted.window.localStorage.getItem(E.KEY), '{ broken save'); assert.match(corrupted.window.document.getElementById('storage-warning').textContent, /preserved/);
  const blocked = page({ blocked: true }); submit(blocked); assert.match(blocked.window.document.getElementById('storage-warning').textContent, /could not save/); assert.match(blocked.window.document.getElementById('save-status').textContent, /Not saved/);
  const stale = page(), newSave = E.serialize([{ type: 'loan' }]); stale.window.localStorage.setItem(E.KEY, newSave); submit(stale);
  assert.equal(stale.window.localStorage.getItem(E.KEY), newSave); assert.ok(stale.window.document.getElementById('decision-form')); assert.match(stale.window.document.getElementById('storage-warning').textContent, /Another tab/);
  for (const dom of [corrupted, blocked, stale]) dom.window.close();
});

test('notes render as text; resetting is explicit and leaves other games intact', () => {
  const raw = E.serialize([{ type: 'note', text: '</textarea><img src=x onerror=alert(1)>' }, { type: 'play', input: { price: 4, stock: 70 }, forecast: 'same' }]);
  const dom = page({ raw }), d = dom.window.document; assert.equal(d.querySelectorAll('img[src=x]').length, 0); assert.match(d.getElementById('field-note').value, /<img/);
  d.querySelector('[data-view=ledger]').click(); d.querySelector('[data-action=reset]').click(); assert.equal(d.getElementById('reset-dialog').open, true); assert.equal(E.restore(dom.window.localStorage.getItem(E.KEY)).state.turn, 1);
  d.getElementById('confirm-reset').click(); assert.equal(E.restore(dom.window.localStorage.getItem(E.KEY)).state.turn, 0); assert.equal(dom.window.localStorage.getItem('osiris-econ-world-v1'), '{"legacy":true}'); dom.window.close();
});

test('restore validates first and waits for confirmation before replacing the family', async () => {
  const dom = page(), d = dom.window.document; submit(dom);
  const before = dom.window.localStorage.getItem(E.KEY);
  d.querySelector('[data-view=ledger]').click(); const input = d.getElementById('import-file');
  Object.defineProperty(input, 'files', { configurable: true, value: [{ size: 100, text: async () => '{bad JSON' }] });
  input.dispatchEvent(new dom.window.Event('change')); await new Promise(resolve => setImmediate(resolve));
  assert.equal(dom.window.localStorage.getItem(E.KEY), before); assert.match(d.getElementById('message').textContent, /valid JSON/);
  Object.defineProperty(input, 'files', { configurable: true, value: [{ size: 100, text: async () => E.serialize([{ type: 'loan' }]) }] });
  input.dispatchEvent(new dom.window.Event('change')); await new Promise(resolve => setImmediate(resolve));
  assert.equal(dom.window.localStorage.getItem(E.KEY), before); assert.equal(d.getElementById('import-dialog').open, true);
  assert.match(d.getElementById('import-summary').textContent, /1150/);
  d.getElementById('confirm-import').click();
  assert.equal(E.restore(dom.window.localStorage.getItem(E.KEY)).state.debt, 500); dom.window.close();
});

test('lab wrapper preserves engine state and has a valid return for public and Next.js routes', () => {
  for (const origin of ['', '&familyOrigin=legacy']) {
    const dom = new JSDOM('<body><main>Original lab</main></body>', { url: `https://dgallemore.com/tools/portfolio/index.html?family=1${origin}`, runScripts: 'outside-only' });
    dom.window.localStorage.setItem('existing-lab-save', 'untouched');
    dom.window.eval(fs.readFileSync(path.join(root, 'assets/family-business/lab-bridge.js'), 'utf8'));
    assert.equal(dom.window.document.querySelector('.family-room-bar a').getAttribute('href'), origin ? '/legacy-econ-arcade/play/#library' : '/econ-arcade/play/#library');
    assert.equal(dom.window.localStorage.getItem('existing-lab-save'), 'untouched');
    assert.equal(dom.window.document.querySelector('main').textContent, 'Original lab'); dom.window.close();
  }
});
