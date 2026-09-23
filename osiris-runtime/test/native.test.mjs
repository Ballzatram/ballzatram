import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { createRuntimeServer, validateRequest } from '../server.mjs';
import { CodexSession } from '../codex.mjs';

const origin = 'https://dgallemore.com', code = 'c'.repeat(48);
const request = { tool: 'general', prompt: 'A synthetic test question', context: {}, model: 'test-model', consent: true, responseLength: 'short' };
const flush = () => new Promise(resolve => setImmediate(resolve));
async function fixture(t, options = {}) {
  const app = createRuntimeServer({ origins: [origin], accessCodes: [code], ...options });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.shutdown());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  return { base, call: (path, { token, body, from = origin, method = body ? 'POST' : 'GET', contentType = 'application/json' } = {}) => fetch(base + path, { method, headers: { ...(from ? { Origin: from } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': contentType } : {}) }, body: body ? JSON.stringify(body) : undefined }) };
}

test('HTTP health never claims inference verification or starts a runtime', async t => {
  let probes = 0, sessions = 0;
  const f = await fixture(t, { readinessProbe: async () => { probes++; return true; }, sessionFactory: async () => { sessions++; throw new Error('Unexpected'); } });
  const response = await f.call('/health'), health = await response.json();
  assert.equal(health.runtimeReady, null); assert.equal(health.inferenceVerified, false); assert.equal(health.billing, 'user-chatgpt-only');
  assert.equal(response.headers.get('Cache-Control'), 'no-store'); assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(probes, 0); assert.equal(sessions, 0);
});

test('readiness is deduplicated, cached, signed-out only, and never creates a user session', async t => {
  let probes = 0, sessions = 0, resolveProbe, clock = Date.now();
  const f = await fixture(t, { now: () => clock, readinessProbe: async () => { probes++; return new Promise(resolve => { resolveProbe = resolve; }); }, sessionFactory: async () => { sessions++; throw new Error('Unexpected'); } });
  const pending = Array.from({ length: 5 }, () => f.call('/ready'));
  for (let i = 0; i < 30 && !resolveProbe; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(probes, 1); resolveProbe(true);
  const responses = await Promise.all(pending);
  for (const response of responses) { assert.equal(response.status, 200); const body = await response.json(); assert.equal(body.runtimeReady, true); assert.equal(body.inferenceVerified, false); }
  await f.call('/ready'); assert.equal(probes, 1); assert.equal(sessions, 0);
  clock += 31000; const next = f.call('/ready');
  for (let i = 0; i < 30 && probes < 2; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(probes, 2); resolveProbe(true); assert.equal((await next).status, 200);
});

test('failed readiness hides host/provider error details and disallowed origins cannot trigger probes', async t => {
  let probes = 0;
  const f = await fixture(t, { readinessProbe: async () => { probes++; throw new Error('SECRET credential /private/home'); } });
  assert.equal((await f.call('/ready', { from: 'https://untrusted.example' })).status, 403); assert.equal(probes, 0);
  const response = await f.call('/ready'); assert.equal(response.status, 503);
  const text = await response.text(); assert.doesNotMatch(text, /SECRET|credential|private\/home/); assert.equal(JSON.parse(text).runtimeReady, false);
  assert.equal(JSON.parse(text).inferenceVerified, false);
});

test('context stripped down to credential fields is rejected before inference', () => {
  assert.throws(() => validateRequest({ ...request, tool: 'scenario', context: { apiKey: 'SECRET', credentials: { password: 'SECRET' } } }), /select a source/);
  assert.equal(validateRequest({ ...request, context: { apiKey: 'SECRET' } }).tool, 'general');
});

test('revocation while authorization is pending prevents generation', async t => {
  let finishAccount, calls = 0;
  const runtime = { closed: false, account: () => new Promise(resolve => { finishAccount = resolve; }), ask: async () => { calls++; return {}; }, close: async () => { runtime.closed = true; } };
  const f = await fixture(t, { sessionFactory: async () => runtime });
  const session = await (await f.call('/v1/session', { body: { accessCode: code } })).json();
  const pending = f.call('/v1/assist', { token: session.token, body: request });
  for (let i = 0; i < 30 && !finishAccount; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal((await f.call('/v1/session', { token: session.token, method: 'DELETE' })).status, 200);
  finishAccount({ account: { type: 'chatgpt' } });
  assert.equal((await pending).status, 401); assert.equal(calls, 0);
});

test('case-insensitive JSON media type is accepted and failed startup releases capacity', async t => {
  let starts = 0;
  const f = await fixture(t, { maxSessions: 1, sessionFactory: async () => { if (++starts === 1) throw new Error('SECRET startup error'); return { close: async () => {} }; } });
  const failed = await f.call('/v1/session', { body: { accessCode: code }, contentType: 'Application/JSON; charset=utf-8' });
  assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /SECRET/);
  assert.equal((await f.call('/v1/session', { body: { accessCode: code } })).status, 201); assert.equal(starts, 2);
});

function protocol() {
  const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.kill = () => {};
  const runtime = new CodexSession(child, '/unused-synthetic-directory'); const calls = [];
  runtime.close = async () => { runtime.fail(); runtime.closedByTest = true; };
  runtime.rpc = async (method, params) => {
    calls.push([method, params]);
    if (method === 'account/read') return { account: { type: 'chatgpt' } };
    if (method === 'model/list') return { data: [{ model: 'test-model', displayName: 'Synthetic model' }] };
    if (method === 'thread/start') return { thread: { id: 'synthetic-thread' } };
    return {};
  };
  return { runtime, calls, child };
}

test('native session remains busy until turn interruption is acknowledged', async () => {
  const { runtime, calls } = protocol(), controller = new AbortController(); let finishInterrupt, started = false;
  const original = runtime.rpc;
  runtime.rpc = async (method, params) => {
    if (method === 'turn/start') { started = true; calls.push([method, params]); return { turn: { id: 'synthetic-turn' } }; }
    if (method === 'turn/interrupt') { calls.push([method, params]); return new Promise(resolve => { finishInterrupt = resolve; }); }
    return original(method, params);
  };
  const pending = runtime.ask(request, () => {}, controller.signal); const rejected = assert.rejects(pending, /stopped/);
  for (let i = 0; i < 10 && !started; i++) await flush();
  controller.abort(); await flush(); assert.equal(runtime.busy, true);
  await assert.rejects(runtime.ask(request, () => {}, new AbortController().signal), /already running/);
  finishInterrupt({}); await rejected; assert.equal(runtime.busy, false);
  assert.equal(calls.filter(([method]) => method === 'turn/start').length, 1); assert.equal(calls.filter(([method]) => method === 'turn/interrupt').length, 1);
  runtime.fail();
});

test('ambiguous turn start closes the native session instead of permitting a second turn', async () => {
  const { runtime, calls } = protocol(); const original = runtime.rpc;
  runtime.rpc = async (method, params) => { if (method === 'turn/start') { calls.push([method, params]); throw new Error('synthetic transport timeout'); } return original(method, params); };
  await assert.rejects(runtime.ask(request, () => {}, new AbortController().signal), /transport timeout/);
  assert.equal(runtime.closedByTest, true); assert.equal(runtime.busy, false); assert.equal(calls.filter(([method]) => method === 'turn/start').length, 1);
});

test('cancellation before thread creation never starts model generation', async () => {
  const { runtime, calls } = protocol(), controller = new AbortController(); let finishModels;
  const original = runtime.rpc;
  runtime.rpc = async (method, params) => method === 'model/list' ? new Promise(resolve => { finishModels = resolve; }) : original(method, params);
  const pending = runtime.ask(request, () => {}, controller.signal); const rejected = assert.rejects(pending, /cancelled before generation/);
  for (let i = 0; i < 10 && !finishModels; i++) await flush(); controller.abort(); finishModels({ data: [{ model: 'test-model' }] }); await rejected;
  assert.equal(calls.some(([method]) => method === 'thread/start' || method === 'turn/start'), false); assert.equal(runtime.busy, false); runtime.fail();
});

test('native pipe errors fail pending calls without unhandled EventEmitter errors', async () => {
  const { runtime, child } = protocol();
  child.stdin.emit('error', new Error('synthetic EPIPE')); assert.equal(runtime.closed, true);
  child.stdout.write('{not-json}\n'); assert.equal(runtime.closed, true);
});

test('deployment acceptance checks the HTTP boundary without login or generation', async t => {
  const { checkDeployment } = await import('../scripts/check-deployment.mjs'); let sessions = 0, probes = 0;
  const f = await fixture(t, { readinessProbe: async () => { probes++; return true; }, sessionFactory: async () => { sessions++; throw new Error('Unexpected'); } });
  const result = await checkDeployment(f.base, origin);
  assert.equal(result.runtimeReady, true); assert.equal(result.inferenceVerified, false); assert.equal(result.authenticated, false);
  assert.equal(sessions, 0); assert.equal(probes, 1); assert.equal(result.checks.length, 7);
});

test('deployment acceptance rejects a non-ready runtime and unsafe endpoint forms', async t => {
  const { checkDeployment } = await import('../scripts/check-deployment.mjs');
  const f = await fixture(t, { readinessProbe: async () => false });
  await assert.rejects(checkDeployment(f.base, origin), /readiness failed/);
  await assert.rejects(checkDeployment('https://user:SECRET@example.com'), /without paths/);
  await assert.rejects(checkDeployment('http://remote.example'), /HTTPS/);
});

test('closing HTTP before account validation finishes never starts a model turn', async t => {
  let finishAccount, calls = 0;
  const runtime = { closed: false, account: () => new Promise(resolve => { finishAccount = resolve; }), ask: async () => { calls++; return {}; }, close: async () => {} };
  const f = await fixture(t, { sessionFactory: async () => runtime });
  const session = await (await f.call('/v1/session', { body: { accessCode: code } })).json();
  const controller = new AbortController();
  const pending = fetch(f.base + '/v1/assist', { method: 'POST', signal: controller.signal, headers: { Origin: origin, Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
  const rejected = assert.rejects(pending, error => error.name === 'AbortError');
  for (let i = 0; i < 30 && !finishAccount; i++) await new Promise(resolve => setTimeout(resolve, 5));
  controller.abort(); await rejected;
  // Let the socket close reach the server while the provider-account read is pending.
  await new Promise(resolve => setTimeout(resolve, 30));
  finishAccount({ account: { type: 'chatgpt' } }); await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(calls, 0);
});
