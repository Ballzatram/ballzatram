const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { JSDOM } = createRequire(path.join(root, 'frontend/package.json'))('jsdom');
const publicPrograms = JSON.parse(fs.readFileSync(path.join(root, 'data/public-programs.json'), 'utf8'));

function page(file, prepare = () => {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'), {
    url: `https://dgallemore.com/${file}`, runScripts: 'outside-only', pretendToBeVisual: true
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
test('The homepage is an uninterrupted Western journey', () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  const { document } = dom.window;
  assert.match(document.title, /Devin Gallemore/);
  assert.match(document.getElementById('welcome-title').textContent, /HOWDY/);
  assert.doesNotMatch(document.body.textContent, /Gallemore Gulch/i);
  assert.equal(document.querySelector('.frontier-header'), null);
  assert.equal(document.querySelector('.frontier-directory'), null);
  assert.equal(document.querySelector('.frontier-trails'), null);
  assert.equal(document.querySelector('.program-grid'), null);
  assert.equal(document.querySelector('#program-search'), null);
  assert.ok(document.querySelector('.frontier-town'));
  assert.ok(document.querySelector('#ride-out'));
  assert.ok(document.querySelector('#camp'));
  assert.equal(document.querySelectorAll('.ride-sign').length, 3);
  dom.window.close();
});

test('Every published project is inside the initially collapsed trail noticeboard', () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  const { document } = dom.window;
  const map = document.getElementById('trail-map');
  assert.equal(map.tagName, 'DETAILS');
  assert.equal(map.open, false);
  assert.equal(document.querySelector('.camp-records').open, false);
  assert.equal(document.getElementById('programs').contains(map), true);
  const links = [...map.querySelectorAll('.trail-route-group a')];
  assert.equal(links.length, publicPrograms.length);
  assert.deepEqual(
    links.map(a => a.getAttribute('href')).sort(),
    publicPrograms.map(item => item.href).sort()
  );
  assert.equal(document.querySelectorAll('.trail-route-group').length, 4);
  dom.window.close();
});

test('The whole town and each trail sign are navigable before JavaScript runs', () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  const { document } = dom.window;
  const buildings = [...document.querySelectorAll('a.town-building')];
  assert.equal(buildings.length, 6);
  assert.equal(new Set(buildings.map(a => a.getAttribute('href'))).size, 6);
  for (const a of buildings) {
    assert.ok(a.getAttribute('aria-label'));
    assert.ok(a.getAttribute('href'));
  }
  for (const sign of document.querySelectorAll('.ride-sign')) {
    assert.ok(sign.querySelector('a[href]'));
  }
  assert.equal(document.querySelector('.frontier-skip').getAttribute('href'), '#main');
  assert.equal(document.querySelector('.ride-footer a').getAttribute('href'), '#programs');
  dom.window.close();
});

test('Horseback travel respects reduced-motion preferences without hiding links', () => {
  for (const reduced of [false, true]) {
    const dom = page('index.html', win => {
      win.matchMedia = () => ({ matches: reduced, addEventListener() {} });
    });
    const { document } = dom.window;
    const ride = document.querySelector('.frontier-ride');
    assert.equal(ride.classList.contains('has-ride-motion'), !reduced);
    if (reduced) {
      for (const sign of ride.querySelectorAll('.ride-sign')) {
        assert.equal(sign.inert, false);
      }
    }
    assert.equal(document.querySelectorAll('.town-building[href]').length, 6);
    dom.window.close();
  }
});

test('Roadside signs appear briefly, pass the rider, and leave long quiet stretches', () => {
  let progress = 0;
  const viewportHeight = 800;
  const rideHeight = 4400;
  const dom = page('index.html', win => {
    win.matchMedia = () => ({ matches: false, addEventListener() {} });
    Object.defineProperty(win, 'innerHeight', { value: viewportHeight, configurable: true });
    // Control scroll progress deterministically; don't depend on wall-clock animation.
    win.requestAnimationFrame = callback => { callback(); return 1; };
    const defaultRect = win.HTMLElement.prototype.getBoundingClientRect;
    win.HTMLElement.prototype.getBoundingClientRect = function () {
      if (this.classList?.contains('frontier-ride')) {
        const top = -progress * (rideHeight - viewportHeight);
        return { top, bottom: top + rideHeight, height: rideHeight };
      }
      return defaultRect.call(this);
    };
  });
  const { document, Event } = dom.window;
  const signs = [...document.querySelectorAll('.ride-sign')];

  function step(value) {
    progress = value;
    dom.window.dispatchEvent(new Event('scroll'));
    const visible = signs.filter(sign => sign.classList.contains('is-current'));
    assert.ok(visible.length <= 1, `Overlapping waypoints at ${value}`);
    for (const sign of signs) assert.equal(sign.inert, !visible.includes(sign));
    return visible.map(sign => signs.indexOf(sign));
  }

  assert.deepEqual(step(0.08), [], 'The rider leaves town before seeing a sign');
  assert.deepEqual(step(0.24), [0], 'First sign is readable');
  assert.equal(Number(signs[0].style.getPropertyValue('--sign-opacity')), 1);
  assert.deepEqual(step(0.40), [], 'Long empty stretch after the first sign');
  assert.deepEqual(step(0.57), [1], 'Second sign is readable');
  assert.deepEqual(step(0.71), [], 'A second quiet stretch before the final reveal');
  assert.deepEqual(step(0.88), [2], 'Final sign announces future projects');
  assert.deepEqual(step(0.98), [], 'The final sign is gone before the campfire');

  step(0.185);
  const approaching = parseFloat(signs[0].style.getPropertyValue('--sign-shift'));
  const arrivingOpacity = parseFloat(signs[0].style.getPropertyValue('--sign-opacity'));
  step(0.295);
  const departing = parseFloat(signs[0].style.getPropertyValue('--sign-shift'));
  const departingOpacity = parseFloat(signs[0].style.getPropertyValue('--sign-opacity'));
  assert.ok(approaching > 0, 'A sign enters from the right');
  assert.ok(departing < 0, 'A sign exits left, behind the rider');
  assert.ok(arrivingOpacity < 1 && departingOpacity < 1, 'Signs fade in and out');

  for (let i = 0; i <= 100; i++) step(i / 100);
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
  const self = { clients: { claim: async () => {} }, location: new URL('https://dgallemore.com/econ-arcade/play/sw.js'), addEventListener: (name, fn) => { listeners[name] = fn; } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'econ-arcade/play/sw.js'), 'utf8'), {
    self, URL, Response, caches: { keys: async () => ['private-trip-v14-final', 'econ-arcade-living-world-v2', 'econ-arcade-living-world-v3', 'econ-arcade-living-world-v4', 'family-business-v1', 'family-business-v2', 'family-business-native-v3'], delete: async key => deleted.push(key) }
  });
  let activation; listeners.activate({ waitUntil: promise => { activation = promise; } }); await activation;
  assert.deepEqual(deleted, ['econ-arcade-living-world-v2', 'econ-arcade-living-world-v3', 'econ-arcade-living-world-v4', 'family-business-v1', 'family-business-v2']);
  assert.equal(deleted.includes('family-business-native-v3'), false);
  assert.equal(deleted.includes('private-trip-v14-final'), false);
  for (const url of ['https://example.com/data', 'https://dgallemore.com/travel/private', 'https://dgallemore.com/tools/ai/', 'https://dgallemore.com/v1/account', 'https://dgallemore.com/v1/assist']) {
    let intercepted = false; listeners.fetch({ request: { url, method: 'GET' }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false);
  }
});
