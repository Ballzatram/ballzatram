const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../assets/subscription-client.js'), 'utf8');
const PREFS = 'ballzatram:subscription-settings:v1', SESSION = 'ballzatram:subscription-session:v1';
const service = 'https://osiris.example', token = 'a'.repeat(43), code = 'b'.repeat(43);
const account = { type: 'chatgpt', email: 'synthetic@example.test', planType: 'plus' };
const request = { tool: 'general', prompt: 'Explain this.', context: {} };
const terminal = extra => ({ kind: 'answer', answer: 'A complete answer.', model: 'test-model', billing: 'chatgpt-subscription', ...extra });
const event = (type, data, end = '\n') => `event: ${type}${end}data: ${JSON.stringify(data)}${end}${end}`;
const flush = () => new Promise(resolve => setImmediate(resolve));
function storage() { const map = new Map(); return { getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) }; }
function mount(fetcher, { signedIn = true, session = {}, settings = {} } = {}) {
  const calls = [], window = { localStorage: storage(), sessionStorage: storage(), fetch: async (url, options) => { calls.push([url, options]); return fetcher(url, options); } };
  window.localStorage.setItem(PREFS, JSON.stringify({ endpoint: service, model: 'test-model', ...settings }));
  if (signedIn) window.sessionStorage.setItem(SESSION, JSON.stringify({ token, endpoint: service, expiresAt: Date.now() + 60000, account, ...session }));
  vm.runInNewContext(source, { window, URL, TextDecoder, TextEncoder, AbortController, AbortSignal, setTimeout, clearTimeout });
  return { sub: window.BallzatramSubscription, window, calls };
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function stream(value, chunkSize = Infinity) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let offset = 0;
  return new Response(new ReadableStream({ pull(controller) {
    if (offset >= bytes.length) { controller.close(); return; }
    const end = Math.min(offset + chunkSize, bytes.length); controller.enqueue(bytes.slice(offset, end)); offset = end;
  } }), { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } });
}

for (const newline of ['\n', '\r\n', '\r']) test(`SSE accepts ${JSON.stringify(newline)} and byte-by-byte UTF-8`, async () => {
  const text = ': heartbeat' + newline + newline + event('status', { message: 'Working…' }, newline) + event('delta', { text: 'Café 🐈' }, newline) + event('done', terminal({ answer: 'Café 🐈' }), newline);
  const { sub, calls } = mount(async () => stream(text, 1)); let delta = '', status;
  const result = await sub.ask(request, { consent: true, onDelta: value => { delta += value; }, onStatus: value => { status = value; } });
  assert.equal(delta, 'Café 🐈'); assert.equal(result.answer, delta); assert.equal(status, 'Working…'); assert.equal(calls.length, 1);
});

test('SSE accepts multiline data, optional colon whitespace, comments, and unknown events', async () => {
  const text = 'event: unknown\ndata: not-json\n\n:ignore\nevent:done\ndata:{"answer":"Yes",\ndata:"model":"test-model",\ndata:"billing":"chatgpt-subscription"}\n\n';
  const { sub } = mount(async () => stream(text, 7));
  assert.equal((await sub.ask(request, { consent: true })).answer, 'Yes');
});

const invalidStreams = [
  ['missing terminal', event('delta', { text: 'Partial only' }), /ended before/],
  ['unfinished terminal', event('done', terminal()).trimEnd(), /ended before/],
  ['invalid JSON', 'event: done\ndata: {broken}\n\n', /could not be read/],
  ['array event', 'event: done\ndata: []\n\n', /could not be read/],
  ['empty final', event('done', terminal({ answer: ' ' })), /invalid response/],
  ['wrong billing', event('done', terminal({ billing: 'api' })), /invalid response/],
  ['wrong model', event('done', terminal({ model: 'another-model' })), /invalid response/],
  ['bad delta', event('delta', { text: 4 }), /response limit/],
  ['oversized final', event('done', terminal({ answer: 'x'.repeat(50001) })), /invalid response/],
  ['oversized line', 'data:' + 'x'.repeat(128001), /response limit/],
  ['oversized cumulative delta', event('delta', { text: 'x'.repeat(25001) }) + event('delta', { text: 'x'.repeat(25001) }), /response limit/],
  ['invalid UTF-8', new Uint8Array([0x65, 0x76, 0xff, 0xfe]), /invalid text/],
  ['model unavailable', event('error', { code: 'model_unavailable', message: 'SECRET RAW PROVIDER BODY' }), /choose an available model/]
];
for (const [name, text, pattern] of invalidStreams) test(`Reject ${name} without retry or fallback`, async () => {
  const { sub, calls } = mount(async () => stream(text, 19));
  await assert.rejects(sub.ask(request, { consent: true }), error => { assert.match(error.message, pattern); assert.doesNotMatch(error.message, /SECRET/); return true; });
  assert.equal(calls.length, 1);
});

test('HTTP failures never expose raw provider text or retry', async () => {
  for (const status of [401, 403, 429, 500]) {
    const { sub, calls } = mount(async () => json({ error: 'SECRET RAW PROVIDER BODY' }, status));
    await assert.rejects(sub.ask(request, { consent: true }), error => { assert.doesNotMatch(error.message, /SECRET/); return true; });
    assert.equal(calls.length, 1); if (status === 401) assert.equal(sub.connection(), null);
  }
});

test('consent, sign-in, selected model, response length and pre-abort prevent any generation', async () => {
  const { sub, calls } = mount(async () => { throw new Error('Must not fetch'); });
  await assert.rejects(sub.ask(request), /confirm/);
  await assert.rejects(sub.ask(request, { consent: true, responseLength: 'unlimited' }), /short or standard/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(sub.ask(request, { consent: true, signal: controller.signal }), /stopped/);
  sub.configure({ endpoint: service });
  await assert.rejects(sub.ask(request, { consent: true }), /Choose a model/);
  await sub.disconnect(); calls.length = 0;
  await assert.rejects(sub.ask(request, { consent: true }), /Connect and sign in/);
  assert.equal(calls.length, 0);
});

test('one active turn; disconnect aborts it before another connection can receive output', async () => {
  let resolveStream, aborted = false;
  const { sub, calls } = mount(async (url, options) => {
    if (options.method === 'DELETE') return json({ disconnected: true });
    return new Promise((resolve, reject) => {
      resolveStream = resolve;
      options.signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    });
  });
  const pending = sub.ask(request, { consent: true }); const rejected = assert.rejects(pending, /stopped/); await flush();
  await assert.rejects(sub.ask(request, { consent: true }), /already running/);
  await sub.disconnect(); await rejected;
  resolveStream(stream(event('done', terminal())));
  assert.equal(aborted, true); assert.equal(sub.connection(), null); assert.equal(calls.filter(([url]) => url.endsWith('/assist')).length, 1);
});

test('changing model aborts a current turn and never starts a second model automatically', async () => {
  const { sub, calls } = mount(async (url, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })));
  const pending = sub.ask(request, { consent: true }); const rejected = assert.rejects(pending, /stopped/); await flush();
  sub.configure({ endpoint: service, model: 'other-model' }); await rejected;
  assert.equal(calls.length, 1); assert.equal(sub.connection().account.type, 'chatgpt');
});

test('late account response cannot restore an old session after disconnect', async () => {
  let finish;
  const { sub, window } = mount(async (url, options) => options.method === 'DELETE' ? json({}) : new Promise(resolve => { finish = resolve; }));
  const pending = sub.status(); const rejected = assert.rejects(pending, /cancelled or changed/); await flush();
  await sub.disconnect(); finish(json({ account })); await rejected;
  assert.equal(sub.connection(), null); assert.equal(window.sessionStorage.getItem(SESSION), null);
});

test('changing endpoint erases old credentials and sends cleanup only to the old endpoint', async () => {
  const { sub, calls } = mount(async () => json({}));
  sub.configure({ endpoint: 'https://replacement.example', model: 'test-model' }); await flush();
  assert.equal(sub.connection(), null); assert.equal(calls.length, 1); assert.equal(calls[0][0], service + '/v1/session'); assert.equal(calls[0][1].method, 'DELETE');
});

for (const [name, bad] of [['expired', { expiresAt: Date.now() - 1 }], ['too long', { expiresAt: Date.now() + 5 * 60 * 60 * 1000 }], ['wrong origin', { endpoint: 'https://evil.example' }], ['wrong auth', { account: { type: 'apiKey', key: 'SECRET' } }], ['bad token', { token: 'bad' }]]) test(`Persisted ${name} session is discarded`, () => {
  const { sub, window } = mount(async () => { throw new Error('Must not fetch'); }, { session: bad });
  assert.equal(sub.connection(), null); assert.equal(window.sessionStorage.getItem(SESSION), null);
});

test('endpoint validator rejects credentials, paths, queries, remote HTTP and invalid saved model', () => {
  const { sub } = mount(async () => json({}), { signedIn: false, settings: { endpoint: 'javascript:alert(1)', model: '../bad model' } });
  assert.equal(sub.settings().endpoint, ''); assert.equal(sub.settings().model, '');
  for (const endpoint of ['https://name:pass@example.com', 'https://example.com/path', 'https://example.com/?token=x', 'https://example.com/#x', 'http://example.com']) assert.throws(() => sub.endpoint(endpoint), /HTTPS/);
  assert.equal(sub.endpoint('http://127.0.0.1:8788'), 'http://127.0.0.1:8788');
});

test('readiness checks do not authenticate or generate and distinguish legacy health', async () => {
  const health = { service: 'osiris-subscription', protocol: 3, billing: 'user-chatgpt-only', capabilities: ['runtime-readiness-v1'] };
  const { sub, calls } = mount(async url => json(url.endsWith('/ready') ? { ...health, runtimeReady: true, inferenceVerified: false } : health), { signedIn: false });
  assert.equal((await sub.checkService()).runtimeReady, true);
  assert.deepEqual(calls.map(([url]) => new URL(url).pathname), ['/health', '/ready']);
  assert.ok(calls.every(([, options]) => !options.headers.Authorization));
  const legacy = mount(async () => json({ ...health, capabilities: [] }), { signedIn: false });
  assert.equal((await legacy.sub.checkService()).runtimeReady, null); assert.equal(legacy.calls.length, 1);
});

test('wrong service or failed runtime readiness blocks login before session creation', async () => {
  for (const health of [{ service: 'osiris-tools' }, { service: 'osiris-subscription', protocol: 3, billing: 'user-chatgpt-only', capabilities: ['runtime-readiness-v1'] }]) {
    const { sub, calls } = mount(async url => json(url.endsWith('/ready') ? { ...health, runtimeReady: false, inferenceVerified: false } : health), { signedIn: false });
    await assert.rejects(sub.connect(code), /compatible|not ready/); assert.ok(calls.every(([url]) => !url.includes('/v1/')));
  }
});

test('oversized JSON metadata is bounded and not rendered', async () => {
  const { sub, calls } = mount(async () => json({ account, padding: 'SECRET'.repeat(25000) }));
  await assert.rejects(sub.status(), /unreadable/); assert.equal(calls.length, 1);
});

test('model catalogue filters invalid/duplicate IDs, bounds names, and never returns extra credentials', async () => {
  const { sub } = mount(async () => json({ models: [{ id: 'test-model', name: 'x'.repeat(300), key: 'SECRET' }, { id: 'test-model', name: 'Duplicate' }, { id: '../invalid model', name: 'No' }, { id: 'other-model', name: '<img>', isDefault: true }] }));
  const rows = await sub.models(); assert.equal(rows.length, 2); assert.equal(rows[0].name.length, 200); assert.equal(rows[1].isDefault, true); assert.doesNotMatch(JSON.stringify(rows), /SECRET|Duplicate/);
});

test('disconnect during session creation removes the late session without opening provider login', async () => {
  let finish;
  const { sub, calls } = mount(async (url, options) => {
    if (url.endsWith('/health')) return json({ service: 'osiris-subscription', protocol: 3, billing: 'user-chatgpt-only' });
    if (options.method === 'DELETE') return json({});
    return new Promise(resolve => { finish = resolve; });
  }, { signedIn: false });
  const pending = sub.connect(code); const rejected = assert.rejects(pending, /cancelled or changed/); await flush();
  await sub.disconnect(); sub.configure({ endpoint: 'https://new.example' });
  finish(json({ token, expiresAt: Date.now() + 60000 })); await rejected;
  assert.equal(sub.connection(), null); assert.ok(calls.every(([url]) => !url.includes('/login') && !url.includes('new.example'))); assert.equal(calls.at(-1)[1].method, 'DELETE');
});

test('Next.js static sync copies only canonical allowlisted UI files, never runtime or private credentials', () => {
  const { sync, files } = require('./sync-osiris-assets.cjs');
  const temp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'osiris-static-test-'));
  try {
    assert.equal(sync(temp), files.length);
    for (const name of files) assert.equal(fs.readFileSync(path.join(temp, name), 'utf8'), fs.readFileSync(path.join(__dirname, '..', name), 'utf8'));
    assert.equal(fs.existsSync(path.join(temp, 'osiris-runtime')), false); assert.equal(fs.existsSync(path.join(temp, '.env')), false);
    assert.equal(fs.readFileSync(path.join(temp, 'legacy-econ-arcade/play/campaign.js'), 'utf8'), fs.readFileSync(path.join(temp, 'econ-arcade/play/campaign.js'), 'utf8'));
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
