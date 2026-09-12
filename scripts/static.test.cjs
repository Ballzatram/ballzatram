const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { JSDOM } = createRequire(path.join(root, 'frontend/package.json'))('jsdom');

function page(file, prepare = () => {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'), {
    url: `https://ballzatram.com/${file}`, runScripts: 'outside-only', pretendToBeVisual: true
  });
  dom.window.structuredClone = structuredClone;
  prepare(dom.window);
  for (const script of dom.window.document.scripts) {
    const src = script.getAttribute('src');
    if (!src || src.includes('shell.js')) continue;
    const source = path.resolve(root, path.dirname(file), src.split('?')[0]);
    dom.window.eval(fs.readFileSync(source, 'utf8'));
  }
  return dom;
}
const visiblePrograms = document => [...document.querySelectorAll('.program95')].filter(card => !card.hidden);

for (const file of ['index.html']) {
  test(`${file}: search, category, and empty states preserve real links`, () => {
    const dom = page(file); const { document, Event } = dom.window;
    const search = document.getElementById('program-search');
    const count = document.querySelectorAll('.program95').length;
    assert.ok(count >= 7);
    assert.equal(document.querySelector('[data-enhanced]').hidden, false);
    search.value = 'central banker'; search.dispatchEvent(new Event('input'));
    assert.equal(visiblePrograms(document).length, 1);
    assert.match(visiblePrograms(document)[0].querySelector('a').href, /games\/central-bank.html$/);
    search.value = '<not a program>'; search.dispatchEvent(new Event('input'));
    assert.equal(document.getElementById('no-programs').hidden, false);
    search.value = ''; search.dispatchEvent(new Event('input'));
    document.querySelector('[data-filter="Games"]').click();
    assert.ok(visiblePrograms(document).every(card => card.dataset.category === 'Games'));
    document.querySelector('[data-filter="all"]').click();
    assert.equal(visiblePrograms(document).length, count);
    dom.window.close();
  });
}

test('Homepage is fully navigable before JavaScript runs', () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  assert.equal(visiblePrograms(dom.window.document).length, 17);
  assert.equal(dom.window.document.querySelector('[data-enhanced]').hidden, true);
  assert.ok([...dom.window.document.querySelectorAll('.program95 a')].every(a => a.getAttribute('href')));
  dom.window.close();
});

test('Homepage Start menu supports Escape, outside click, and keyboard focus', () => {
  const dom = page('index.html'); const { document, KeyboardEvent, MouseEvent } = dom.window;
  Object.defineProperty(document, 'currentScript', { value: document.querySelector('script[src$="shell.js"]'), configurable: true });
  dom.window.eval(fs.readFileSync(path.join(root, 'assets/win95/shell.js'), 'utf8'));
  const start = document.querySelector('.start95'); const menu = document.getElementById('start-menu95');
  start.click(); assert.equal(menu.hidden, false); assert.equal(start.getAttribute('aria-expanded'), 'true');
  assert.equal(menu.querySelector('a').href, 'https://ballzatram.com/index.html');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(menu.hidden, true); assert.equal(document.activeElement, start);
  start.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  assert.equal(document.activeElement, menu.querySelector('a'));
  document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })); assert.equal(menu.hidden, true);
  dom.window.close();
});

test('Portfolio demo computes and escapes user-controlled symbols and benchmark warnings', () => {
  const dom = page('tools/portfolio/index.html'); const { document, Event } = dom.window;
  document.getElementById('demoButton').click(); document.getElementById('analyzeButton').click();
  assert.equal(document.getElementById('resultsContent').hidden, false);
  const symbol = document.querySelector('[data-field=symbol]');
  symbol.value = '<img src=x onerror=alert(1)>'; symbol.dispatchEvent(new Event('input'));
  const csv = document.getElementById('csvInput'); csv.value = csv.value.replace('QQQ', symbol.value.toUpperCase());
  document.getElementById('benchmarkInput').value = '<img src=x onerror=alert(2)>';
  document.getElementById('analyzeButton').click();
  for (const id of ['holdingRows', 'correlationTable', 'warnings']) assert.equal(document.getElementById(id).querySelector('img'), null);
  assert.match(document.getElementById('holdingRows').textContent, /<IMG SRC=X/);
  dom.window.close();
});

test('Portfolio rejects duplicate CSV headers and survives blocked storage', () => {
  const dom = page('tools/portfolio/index.html', win => Object.defineProperty(win, 'localStorage', { get() { throw new Error('blocked'); } }));
  const { document } = dom.window;
  document.getElementById('demoButton').click(); document.getElementById('analyzeButton').click();
  assert.match(document.getElementById('inputStatus').textContent, /not saved/);
  document.getElementById('csvInput').value = 'date,QQQ,qqq\n2025-01-01,1,2\n2025-01-02,2,3';
  document.getElementById('analyzeButton').click();
  assert.match(document.getElementById('inputStatus').textContent, /unique/);
  dom.window.close();
});

test('Scenario clears stale output and rejects empty and out-of-range shocks', () => {
  const dom = page('tools/scenario/index.html'); const { document } = dom.window;
  document.querySelector('[data-preset=rates]').click(); assert.notEqual(document.getElementById('stressReturn').textContent, '—');
  for (const value of ['', '9']) {
    document.getElementById('factor-rates').value = value; document.getElementById('runScenario').click();
    assert.equal(document.getElementById('stressReturn').textContent, '—');
    assert.match(document.getElementById('drivers').textContent, /Check the inputs/);
  }
  dom.window.close();
});

test('Reports load without storage or with malformed drafts', () => {
  for (const prepare of [win => Object.defineProperty(win, 'localStorage', { get() { throw new Error('blocked'); } }), win => win.localStorage.setItem('ballzatram:pages-report-draft:v1', JSON.stringify({ sections: [null, {}, { sourceKind: '<img src=x>', title: 'bad' }] }))]) {
    const dom = page('tools/reports/index.html', prepare);
    assert.equal(dom.window.document.querySelectorAll('.source-card').length, 3);
    assert.equal(dom.window.document.querySelectorAll('.report-section').length, 0);
    dom.window.close();
  }
});

test('Portfolio reports integrate directly and edits invalidate stale exports', () => {
  const dom = page('tools/reports/index.html', win => win.localStorage.setItem('ballzatram:portfolio-pages-last-run:v1', JSON.stringify({ metrics: {}, holdings: [], request: { holdings: [] } })));
  const { document, Event } = dom.window;
  document.querySelector('[data-add-source=portfolio]').click();
  assert.equal(document.querySelectorAll('.report-section').length, 1);
  document.getElementById('generateButton').click();
  assert.equal(document.getElementById('downloadButton').disabled, false);
  assert.match(document.getElementById('markdownPreview').textContent, /Portfolio Lab/);
  document.getElementById('reportTitle').value = 'Changed title';
  document.getElementById('reportTitle').dispatchEvent(new Event('input'));
  assert.equal(document.getElementById('downloadButton').disabled, true);
  document.getElementById('generateButton').click();
  assert.match(document.getElementById('markdownPreview').textContent, /^# Changed title/);
  dom.window.close();
});

test('AI guide blocks invalid URLs and empty context without making a request', async () => {
  let requests = 0;
  const dom = page('tools/ai/index.html', win => { win.fetch = async () => { requests++; throw new Error('unexpected'); }; });
  const { document } = dom.window;
  document.getElementById('bridgeUrl').value = 'http://example.com';
  document.getElementById('nativeKey').value = 'sk-proj-synthetic-user-test-key'; document.getElementById('nativeModel').value = 'test-model';
  document.getElementById('saveNative').click();
  assert.match(document.getElementById('status').textContent, /HTTPS/);
  document.getElementById('bridgeUrl').value = 'https://example.com'; document.getElementById('saveNative').click();
  document.getElementById('contextSelect').value = 'portfolio'; document.getElementById('prompt').value = 'Explain this'; document.getElementById('askButton').click();
  await Promise.resolve();
  assert.match(document.getElementById('answer').textContent, /No saved context/);
  assert.equal(requests, 0);
  dom.window.close();
});

test('AI guide handles blocked storage on startup and saves memory-only credentials', () => {
  const dom = page('tools/ai/index.html', win => { Object.defineProperty(win, 'localStorage', { get() { throw new Error('blocked'); } }); Object.defineProperty(win, 'sessionStorage', { get() { throw new Error('blocked'); } }); });
  const { document } = dom.window;
  document.getElementById('bridgeUrl').value = 'https://example.com'; document.getElementById('nativeKey').value = 'sk-proj-synthetic-user-test-key'; document.getElementById('nativeModel').value = 'test-model';
  document.getElementById('saveNative').click(); assert.match(document.getElementById('status').textContent, /this page only/);
  dom.window.close();
});

test('Arcade service worker preserves other apps’ caches and excludes unrelated requests', async () => {
  const vm = require('node:vm'); const listeners = {}; const deleted = [];
  const self = { location: new URL('https://ballzatram.com/econ-arcade/play/sw.js'), addEventListener: (name, fn) => { listeners[name] = fn; } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'econ-arcade/play/sw.js'), 'utf8'), {
    self, URL, Response, caches: { keys: async () => ['private-trip-v14-final', 'econ-arcade-living-world-v2', 'econ-arcade-living-world-v3', 'econ-arcade-living-world-v4'], delete: async key => deleted.push(key) }
  });
  let activation; listeners.activate({ waitUntil: promise => { activation = promise; } }); await activation;
  assert.deepEqual(deleted, ['econ-arcade-living-world-v2', 'econ-arcade-living-world-v3']);
  for (const url of ['https://example.com/data', 'https://ballzatram.com/travel/private', 'https://ballzatram.com/tools/ai/']) {
    let intercepted = false; listeners.fetch({ request: { url, method: 'GET' }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false);
  }
});
