const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto, createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { JSDOM } = createRequire(path.join(root, 'frontend/package.json'))('jsdom');
const client = fs.readFileSync(path.join(root, 'assets/ai-client.js'), 'utf8');
const OR_KEY = 'sk-or-v1-user-controlled-test-key';
const OA_KEY = 'sk-proj-user-controlled-test-key';
const SESSION = 'ballzatram:ai-connection:v2';
const PREFS = 'ballzatram:ai-preferences:v2';
const PKCE = 'ballzatram:ai-pkce:v2';
const request = { tool: 'observatory', prompt: 'Explain this section.', context: { section: '3', source: 'https://example.org/source', text: 'Selected evidence only.' } };
const flush = () => new Promise(resolve => setImmediate(resolve));
const ok = data => ({ ok: true, status: 200, json: async () => data });
function mount({ url = 'https://ballzatram.com/tools/ai/index.html', prepare = () => {}, ui = false } = {}) {
  const dom = new JSDOM(ui ? fs.readFileSync(path.join(root, 'tools/ai/index.html'), 'utf8') : '<!doctype html>', { url, runScripts: 'outside-only' });
  Object.defineProperty(dom.window, 'crypto', { value: webcrypto });
  dom.window.TextEncoder = TextEncoder;
  dom.window.TextDecoder = TextDecoder;
  dom.window.ReadableStream = ReadableStream;
  dom.window.AbortController = AbortController;
  dom.window.AbortSignal = AbortSignal;
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  dom.window.fetch = async () => { throw new Error('Unexpected network request'); };
  prepare(dom.window);
  for (const file of ['ai-features.js', 'subscription-client.js']) dom.window.eval(fs.readFileSync(path.join(root, 'assets', file), 'utf8'));
  dom.window.eval(client);
  dom.window.eval(fs.readFileSync(path.join(root, 'assets/ai-panel.js'), 'utf8'));
  if (ui) {
    dom.window.eval(fs.readFileSync(path.join(root, 'assets/storage.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(root, 'tools/ai/app.js'), 'utf8'));
  }
  return dom;
}
function connect(win, extras = {}) {
  win.BallzatramAI.saveSettings({ mode: 'openrouter', model: 'anthropic/test-model', ...extras });
  win.BallzatramAI.connectKey(OR_KEY);
}

test('handoff and local preview make no requests and exclude settings and credentials', async () => {
  const dom = mount(); const AI = dom.window.BallzatramAI;
  AI.saveSettings({ mode: 'handoff' });
  const data = { ...request, context: { ...request.context, access_token: 'secret', nested: { apiKey: 'secret', fact: 'kept' }, settings: { key: 'secret' } } };
  const prepared = await AI.ask(data);
  assert.equal(prepared.kind, 'handoff'); assert.match(prepared.answer, /Selected evidence only/); assert.match(prepared.answer, /kept/); assert.doesNotMatch(prepared.answer, /secret/);
  assert.equal(AI.chats.chatgpt.url, 'https://chatgpt.com/');
  AI.saveSettings({ mode: 'demo' }); const preview = await AI.ask(request);
  assert.match(preview.answer, /fixed testing checklist/); assert.equal(preview.kind, 'demo'); dom.window.close();
});

test('OpenRouter request uses only the visitor key, selected model, bounded output and no fallbacks', async () => {
  const calls = []; const dom = mount({ prepare: w => { w.fetch = async (...args) => { calls.push(args); return ok({ model: 'anthropic/test-model', choices: [{ message: { content: 'Draft answer' }, finish_reason: 'length' }], usage: { total_tokens: 17, cost: 0.00001 } }); }; } });
  connect(dom.window); const result = await dom.window.BallzatramAI.ask(request);
  assert.equal(calls.length, 1); const [url, options] = calls[0]; const body = JSON.parse(options.body);
  assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions'); assert.equal(options.headers.Authorization, `Bearer ${OR_KEY}`);
  assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(body.model, 'anthropic/test-model'); assert.equal(body.provider.allow_fallbacks, false); assert.equal(body.max_tokens, 1200);
  assert.match(body.messages[0].content, /promise fulfillment/); assert.equal(result.truncated, true); assert.equal(result.usage.total_tokens, 17);
  assert.doesNotMatch(options.body, /sk-or/); assert.doesNotMatch(dom.window.localStorage.getItem(PREFS), /sk-or/); dom.window.close();
});

test('missing or expired connection never reaches a paid endpoint', async () => {
  const dom = mount(); const AI = dom.window.BallzatramAI; AI.saveSettings({ mode: 'openrouter', model: 'test/model' });
  dom.window.localStorage.setItem('ballzatram:ai-bridge-settings:v1', JSON.stringify({ url: 'https://old-worker.example', token: 'operator-key' }));
  await assert.rejects(AI.ask(request), /Connect your own/);
  dom.window.sessionStorage.setItem(SESSION, JSON.stringify({ kind: 'openrouter', endpoint: 'https://openrouter.ai/api/v1', key: OR_KEY, expiresAt: Date.now() - 1 }));
  await assert.rejects(AI.ask(request), /Connect your own/); assert.equal(dom.window.sessionStorage.getItem(SESSION), null); dom.window.close();
});

test('disconnect clears credentials; blocked storage supports a memory-only API key', async () => {
  const dom = mount({ prepare: w => { Object.defineProperty(w, 'sessionStorage', { get() { throw new Error('blocked'); } }); Object.defineProperty(w, 'localStorage', { get() { throw new Error('blocked'); } }); } });
  const AI = dom.window.BallzatramAI; AI.saveSettings({ mode: 'openrouter', model: 'test/model' });
  assert.equal(AI.connectKey(OR_KEY), false); assert.equal(AI.isConnected(), true);
  AI.disconnect(); assert.equal(AI.isConnected(), false); await assert.rejects(AI.authorizationUrl(), /Allow tab storage/); dom.window.close();
});

test('native credentials are bound to an exact relay origin and provider', async () => {
  const dom = mount(); const AI = dom.window.BallzatramAI;
  const native = { mode: 'native', provider: 'openai', bridgeUrl: 'https://trusted.example', nativeModel: 'test-model' };
  AI.saveSettings(native); AI.connectKey(OA_KEY);
  assert.equal(AI.isConnected(), true);
  AI.saveSettings({ ...native, bridgeUrl: 'https://other.example' });
  assert.equal(AI.isConnected(), false); await assert.rejects(AI.ask(request), /Connect your own/);
  AI.saveSettings({ ...native, provider: 'anthropic' }); assert.equal(AI.isConnected(), false);
  for (const url of ['http://example.org', 'https://user:pass@example.org', 'https://example.org/path', 'https://example.org?token=x', 'javascript:alert(1)']) assert.throws(() => AI.bridgeUrl(url), /HTTPS/);
  assert.throws(() => AI.connectKey('sk-ant-oat-bogus-subscription-token'), /never/); dom.window.close();
});

test('PKCE uses random S256 and validates state, callback and one-time verifier without generating text', async () => {
  const calls = []; const dom = mount({ prepare: w => { w.fetch = async (...args) => { calls.push(args); return ok({ key: OR_KEY }); }; } });
  const AI = dom.window.BallzatramAI; const auth = new URL(await AI.authorizationUrl());
  const pending = JSON.parse(dom.window.sessionStorage.getItem(PKCE));
  assert.equal(auth.origin + auth.pathname, 'https://openrouter.ai/auth');
  assert.equal(auth.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(auth.searchParams.get('code_challenge'), createHash('sha256').update(pending.verifier).digest('base64url'));
  assert.ok(pending.verifier.length >= 43); const callback = new URL(auth.searchParams.get('callback_url')); callback.searchParams.set('code', 'synthetic-once-only-code');
  dom.reconfigure({ url: callback.href }); assert.equal(await AI.finishAuthorization(), true);
  assert.equal(dom.window.location.search, ''); assert.equal(dom.window.sessionStorage.getItem(PKCE), null); assert.equal(AI.isConnected(), true);
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 'https://openrouter.ai/api/v1/auth/keys');
  assert.equal(JSON.parse(calls[0][1].body).code_verifier, pending.verifier);
  dom.reconfigure({ url: callback.href }); await assert.rejects(AI.finishAuthorization(), /another tab/); assert.equal(calls.length, 1); dom.window.close();
});

for (const mutation of ['state', 'expiry', 'callback']) test(`PKCE rejects ${mutation} mismatch before any exchange`, async () => {
  const dom = mount(); const AI = dom.window.BallzatramAI; const auth = new URL(await AI.authorizationUrl());
  const callback = new URL(auth.searchParams.get('callback_url')); callback.searchParams.set('code', 'code');
  if (mutation === 'state') callback.searchParams.set('ai_state', 'other-state');
  if (mutation === 'callback') callback.pathname = '/other-path';
  if (mutation === 'expiry') { const pending = JSON.parse(dom.window.sessionStorage.getItem(PKCE)); pending.expiresAt = 1; dom.window.sessionStorage.setItem(PKCE, JSON.stringify(pending)); }
  dom.reconfigure({ url: callback.href }); await assert.rejects(AI.finishAuthorization(), /another tab/); assert.equal(dom.window.location.search, ''); dom.window.close();
});

test('oversized context, prompts and missing model fail before inference', async () => {
  const dom = mount(); connect(dom.window); const AI = dom.window.BallzatramAI;
  await assert.rejects(AI.ask({ ...request, context: { data: 'x'.repeat(24000) } }), /too large/);
  await assert.rejects(AI.ask({ ...request, prompt: 'x'.repeat(4001) }), /4,000/);
  AI.saveSettings({ mode: 'openrouter' }); await assert.rejects(AI.ask(request), /Choose a model/); dom.window.close();
});

test('provider rejection cannot leak its body and does not retry or fall back', async () => {
  let calls = 0; const dom = mount({ prepare: w => { w.fetch = async () => { calls++; return { ok: false, status: 402, json: async () => ({ error: { message: `SECRET ${OR_KEY}` } }) }; }; } });
  connect(dom.window); await assert.rejects(dom.window.BallzatramAI.ask(request), error => /balance/.test(error.message) && !/SECRET|sk-or/.test(error.message)); assert.equal(calls, 1); dom.window.close();
});

test('connection check and model catalogue never generate tokens', async () => {
  const calls = []; const dom = mount({ prepare: w => { w.fetch = async (url, options) => { calls.push([url, options]); return ok(url.endsWith('/models') ? { data: [{ id: 'text/model', name: '<img onerror=alert(1)>', architecture: { input_modalities: ['text'], output_modalities: ['text'] }, pricing: { prompt: '0', completion: '0' } }, { id: 'image/model', architecture: { input_modalities: ['text'], output_modalities: ['image'] } }] } : { data: { limit_remaining: 1 } }); }; } });
  connect(dom.window); const AI = dom.window.BallzatramAI;
  assert.equal((await AI.models()).length, 1); assert.match((await AI.checkConnection()).message, /No generation/);
  assert.deepEqual(calls.map(c => c[0]), ['https://openrouter.ai/api/v1/models', 'https://openrouter.ai/api/v1/key']); assert.equal(calls[0][1].headers, undefined); dom.window.close();
});

test('UI handoff has an explicit copy step and opens a bare chat URL without transmitting data', async () => {
  const dom = mount({ ui: true }); const d = dom.window.document;
  d.querySelector('[data-mode="handoff"]').click();
  d.getElementById('prompt').value = 'PRIVATE question <script>alert(1)</script>';
  d.getElementById('askButton').click(); await flush();
  assert.equal(d.getElementById('handoffActions').hidden, false); assert.match(d.getElementById('handoffText').value, /PRIVATE question/);
  assert.equal(d.getElementById('openChat').href, 'https://chatgpt.com/'); assert.equal(d.querySelector('#answer script'), null);
  d.querySelector('[data-mode="demo"]').click(); d.getElementById('askButton').click(); await flush(); assert.match(d.getElementById('answer').textContent, /LOCAL PREVIEW/); dom.window.close();
});

test('UI requires account consent and displays provider HTML as plain text', async () => {
  let calls = 0;
  const dom = mount({ ui: true, prepare: w => {
    w.sessionStorage.setItem(SESSION, JSON.stringify({ kind: 'openrouter', endpoint: 'https://openrouter.ai/api/v1', key: OR_KEY, expiresAt: Date.now() + 60000 }));
    w.localStorage.setItem(PREFS, JSON.stringify({ mode: 'openrouter', model: 'test/model' }));
    w.fetch = async () => { calls++; return ok({ choices: [{ message: { content: '<img src=x onerror=alert(1)> Draft answer' } }] }); };
  } });
  const d = dom.window.document; d.getElementById('prompt').value = 'Explain this'; d.getElementById('askButton').click(); await flush();
  assert.equal(calls, 0); assert.match(d.getElementById('answer').textContent, /Confirm/);
  d.getElementById('consent').checked = true; d.getElementById('askButton').click(); await flush();
  assert.equal(calls, 1); assert.equal(d.querySelector('#answer img'), null); assert.match(d.getElementById('answer').textContent, /<img/); dom.window.close();
});

test('prepared tool context survives sign-in staging without collecting other labs', () => {
  const dom = mount(); const AI = dom.window.BallzatramAI;
  dom.window.localStorage.setItem('another-lab', JSON.stringify({ private: 'unselected' }));
  assert.equal(AI.stageRequest(request), true); assert.equal(AI.preparedRequest().context.section, '3');
  assert.doesNotMatch(JSON.stringify(AI.preparedRequest()), /unselected/); dom.window.close();
});

const SUB_PREFS = 'ballzatram:subscription-settings:v1', SUB_SESSION = 'ballzatram:subscription-session:v1';
const service = 'https://osiris.example', token = 'a'.repeat(43), accessCode = 'b'.repeat(43);
const account = { type: 'chatgpt', email: 'synthetic@example.test', planType: 'plus' };
const login = () => ({ verificationUrl: 'https://auth.openai.com/codex/device', userCode: 'TEST-ONLY', expiresAt: Date.now() + 60000 });
function subscriptionSession(w, signedIn = true) {
  w.localStorage.setItem(SUB_PREFS, JSON.stringify({ endpoint: service, model: 'test-model' }));
  w.sessionStorage.setItem(SUB_SESSION, JSON.stringify({ token, endpoint: service, expiresAt: Date.now() + 60000, account: signedIn ? account : null }));
}
function streamResponse(events) {
  const text = events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('');
  return new Response(text, { headers: { 'Content-Type': 'text/event-stream' } });
}

test('subscription is the default and never substitutes an API account or manual handoff', async () => {
  const dom = mount();
  connect(dom.window);
  dom.window.BallzatramAI.saveSettings({ mode: 'subscription' });
  assert.equal(dom.window.BallzatramAI.isConnected(), false);
  await assert.rejects(dom.window.BallzatramAI.ask(request, { consent: true }), /Connect and sign in/);
  dom.window.close();
  const fresh = mount({ ui: true });
  assert.equal(fresh.window.BallzatramAI.getSettings().mode, 'subscription');
  fresh.window.document.getElementById('connectSubscription').click();
  assert.equal(fresh.window.document.querySelector('.osiris-dialog').open, true);
  assert.equal(fresh.window.document.querySelector('[data-osiris="form"]').hidden, true);
  fresh.window.close();
});

test('ChatGPT device connection makes no generation call; sending requires consent and streams plain text', async () => {
  const calls = [];
  const dom = mount({ prepare: w => { w.fetch = async (url, options) => {
    calls.push([url, options]);
    if (url.endsWith('/health')) return ok({ service: 'osiris-subscription', protocol: 3, billing: 'user-chatgpt-only' });
    if (url.endsWith('/v1/session')) return ok(options.method === 'DELETE' ? {} : { token, expiresAt: Date.now() + 60000 });
    if (url.endsWith('/v1/login')) return ok(login());
    if (url.endsWith('/v1/account')) return ok({ account });
    if (url.endsWith('/v1/models')) return ok({ models: [{ id: 'test-model', name: 'Test model', isDefault: true }] });
    assert.equal(url, service + '/v1/assist');
    return streamResponse([['delta', { text: '<img src=x> Draft' }], ['done', { kind: 'answer', answer: '<img src=x> Draft answer', model: 'test-model', billing: 'chatgpt-subscription', usage: { total_tokens: 12 } }]]);
  }; } });
  const sub = dom.window.BallzatramSubscription;
  sub.configure({ endpoint: service });
  assert.equal((await sub.connect(accessCode)).userCode, 'TEST-ONLY');
  await sub.status(); const rows = await sub.models(); sub.configure({ endpoint: service, model: rows[0].id });
  assert.equal(calls.some(([url]) => url.endsWith('/assist')), false);
  assert.doesNotMatch(dom.window.localStorage.getItem(SUB_PREFS), new RegExp(token + '|' + accessCode));
  await assert.rejects(dom.window.BallzatramAI.ask(request), /confirm/);
  let delta = '';
  const result = await dom.window.BallzatramAI.ask({ ...request, context: { ...request.context, apiKey: 'never-send' } }, { consent: true, responseLength: 'short', onDelta: text => { delta += text; } });
  assert.match(result.answer, /<img/); assert.match(delta, /Draft/);
  const [, options] = calls.find(([url]) => url.endsWith('/assist'));
  assert.equal(options.headers.Authorization, `Bearer ${token}`);
  assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
  const body = JSON.parse(options.body); assert.equal(body.model, 'test-model'); assert.equal(body.responseLength, 'short'); assert.equal(body.consent, true);
  assert.doesNotMatch(options.body, /never-send|accessCode|apiKey/);
  assert.equal(await sub.disconnect(), true); assert.equal(sub.connection(), null); assert.equal(dom.window.sessionStorage.getItem(SUB_SESSION), null);
  dom.window.close();
});

test('unexpected provider sign-in addresses are rejected and the new service session is removed', async () => {
  const calls = [];
  const dom = mount({ prepare: w => { w.fetch = async (url, options) => {
    calls.push([url, options.method]);
    if (url.endsWith('/health')) return ok({ service: 'osiris-subscription', protocol: 3, billing: 'user-chatgpt-only' });
    if (url.endsWith('/session')) return ok({ token, expiresAt: Date.now() + 60000 });
    return ok({ ...login(), verificationUrl: 'https://attacker.example/openai' });
  }; } });
  const sub = dom.window.BallzatramSubscription; sub.configure({ endpoint: service });
  await assert.rejects(sub.connect(accessCode), /unexpected sign-in/);
  assert.equal(sub.connection(), null); assert.deepEqual(calls.at(-1), [service + '/v1/session', 'DELETE']);
  assert.equal(calls.some(([url]) => url.includes('attacker')), false); dom.window.close();
});

test('disconnect during setup cannot restore an old session or send its code to a changed service', async () => {
  let finishSession; const calls = [];
  const dom = mount({ prepare: w => { w.fetch = async (url, options) => {
    calls.push([url, options]);
    if (url.endsWith('/health')) return ok({ service: 'osiris-subscription', protocol: 3, billing: 'user-chatgpt-only' });
    if (options.method === 'DELETE') return ok({});
    return new Promise(resolve => { finishSession = resolve; });
  }; } });
  const sub = dom.window.BallzatramSubscription; sub.configure({ endpoint: service });
  const pending = sub.connect(accessCode); await flush();
  await sub.disconnect(); sub.configure({ endpoint: 'https://other.example' });
  finishSession(ok({ token, expiresAt: Date.now() + 60000 }));
  await assert.rejects(pending, /cancelled/);
  assert.equal(sub.connection(), null); assert.equal(calls.some(([url]) => url.includes('other.example')), false);
  assert.equal(calls.at(-1)[1].method, 'DELETE'); dom.window.close();
});

test('native panel stays in its project, sends only reviewed context, and renders provider HTML as text', async () => {
  const calls = [];
  const dom = mount({ url: 'https://ballzatram.com/tools/scenario/index.html', prepare: w => {
    subscriptionSession(w); w.localStorage.setItem('another-lab', 'UNSELECTED PRIVATE DATA');
    w.fetch = async (url, options) => {
      calls.push([url, options]);
      if (url.endsWith('/account')) return ok({ account });
      if (url.endsWith('/models')) return ok({ models: [{ id: 'test-model', name: '<img src=x> Model', isDefault: true }] });
      return streamResponse([['delta', { text: '<script>fake()</script>' }], ['done', { answer: '<script>fake()</script> answer', model: 'test-model', billing: 'chatgpt-subscription' }]]);
    };
  } });
  const d = dom.window.document, selector = name => d.querySelector(`[data-osiris="${name}"]`);
  dom.window.OsirisPanel.open({ tool: 'scenario', prompt: 'Explain these assumptions.', context: { scenario: 'Selected scenario', apiKey: 'excluded-secret' } });
  await flush(); await flush();
  assert.equal(calls.some(([url]) => url.endsWith('/assist')), false);
  selector('ask').click(); await flush(); assert.match(selector('status').textContent, /confirm/);
  selector('consent').checked = true; selector('ask').click(); await flush(); await flush();
  assert.match(selector('answer').textContent, /<script>/); assert.equal(selector('answer').querySelector('script'), null); assert.equal(selector('model').querySelector('img'), null);
  const body = calls.find(([url]) => url.endsWith('/assist'))[1].body;
  assert.match(body, /Selected scenario/); assert.doesNotMatch(body, /UNSELECTED|excluded-secret/);
  assert.equal(dom.window.location.pathname, '/tools/scenario/index.html');
  assert.equal(selector('consent').checked, false); selector('close').click(); assert.equal(d.querySelector('.osiris-dialog').open, false); dom.window.close();
});

test('disconnect during an answer stops it and leaves the native panel usable for a new connection', async () => {
  let aborted = false;
  const dom = mount({ prepare: w => {
    subscriptionSession(w);
    w.fetch = async (url, options) => {
      if (url.endsWith('/account')) return ok({ account });
      if (url.endsWith('/models')) return ok({ models: [{ id: 'test-model', name: 'Test model', isDefault: true }] });
      if (options.method === 'DELETE') return ok({});
      return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => { aborted = true; const error = new Error('Aborted'); error.name = 'AbortError'; reject(error); }, { once: true }));
    };
  } });
  const selector = name => dom.window.document.querySelector(`[data-osiris="${name}"]`);
  dom.window.OsirisPanel.open(request); await flush(); await flush();
  selector('consent').checked = true; selector('ask').click(); await flush(); assert.equal(selector('ask').disabled, true);
  selector('disconnect').click(); await flush(); await flush();
  assert.equal(aborted, true); assert.equal(dom.window.BallzatramSubscription.connection(), null);
  assert.equal(selector('ask').disabled, false); assert.equal(selector('cancel').hidden, true); assert.equal(selector('login').hidden, true);
  assert.match(selector('status').textContent, /Disconnected/); dom.window.close();
});
