import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import features from '../../assets/ai-features.js';

const source = readFileSync(new URL('../../assets/ai-client.js', import.meta.url), 'utf8');
const PREFS = 'ballzatram:ai-preferences:v2';
const request = { tool: 'general', prompt: 'A synthetic test question', context: { selected: 'Only this context' } };
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}
function mount(saved, { blocked = false, answer = { kind: 'answer', answer: 'Synthetic result', billing: 'chatgpt-subscription', model: 'synthetic' }, failure = null } = {}) {
  const calls = [], network = [], local = storage();
  if (saved) local.setItem(PREFS, JSON.stringify(saved));
  const subscription = {
    settings: () => ({ endpoint: '' }),
    connection: () => ({ account: { type: 'chatgpt', planType: 'synthetic' } }),
    status: async () => ({ account: { type: 'chatgpt' } }),
    ask: async (payload, options) => { calls.push({ payload, options }); if (failure) throw failure; return answer; }
  };
  const window = { localStorage: local, sessionStorage: storage(), BallzatramSubscription: subscription, BallzatramAIFeatures: features, setTimeout, clearTimeout,
    fetch: async (...args) => { network.push(args); throw new Error('Unexpected external request'); } };
  if (blocked) Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  vm.runInNewContext(source, { window, URL, AbortController, AbortSignal, TextEncoder, TextDecoder, setTimeout, clearTimeout });
  return { ai: window.BallzatramAI, local, calls, network, subscription };
}

test('fresh visitors default to native subscription without account, prompt or network actions', () => {
  const f = mount();
  assert.equal(f.ai.getSettings().mode, 'subscription');
  assert.equal(f.calls.length, 0); assert.equal(f.network.length, 0);
});
test('legacy persisted handoff migrates once and survives reloading without touching private records', () => {
  const f = mount({ mode: 'handoff', chat: 'chatgpt', maxTokens: 2400, apiKey: 'DO-NOT-PERSIST' });
  f.local.setItem('unrelated-project', 'KEEP');
  assert.equal(f.ai.getSettings().mode, 'subscription');
  const saved = JSON.parse(f.local.getItem(PREFS));
  assert.equal(saved.executionRevision, 1); assert.equal(saved.maxTokens, 2400);
  assert.equal(saved.apiKey, undefined); assert.equal(f.local.getItem('unrelated-project'), 'KEEP');
  assert.equal(mount(saved).ai.getSettings().mode, 'subscription');
  assert.equal(f.calls.length, 0); assert.equal(f.network.length, 0);
});
test('explicit API settings remain explicit; migration never changes billing providers', () => {
  for (const mode of ['openrouter', 'native', 'demo']) {
    const f = mount({ mode, model: 'selected', nativeModel: 'selected-native' });
    assert.equal(f.ai.getSettings().mode, mode); assert.equal(f.ai.getSettings().model, 'selected');
    assert.equal(f.calls.length, 0); assert.equal(f.network.length, 0);
  }
});
test('blocked preference storage still defaults to native with no request', () => {
  const f = mount(null, { blocked: true });
  assert.equal(f.ai.getSettings().mode, 'subscription');
  assert.equal(f.calls.length, 0); assert.equal(f.network.length, 0);
});
test('new explicit manual export remains separate but cannot execute a tool', async () => {
  const f = mount(); f.ai.saveSettings({ mode: 'handoff' });
  assert.equal(f.ai.getSettings().mode, 'handoff');
  await assert.rejects(f.ai.execute(request, { consent: true }), error => error.code === 'AI_CONNECTION_REQUIRED');
  assert.equal(f.calls.length, 0); assert.equal(f.network.length, 0);
  assert.equal((await f.ai.ask(request)).kind, 'handoff');
});
test('execution refuses local previews, missing consent and pre-cancelled requests before transport', async () => {
  const f = mount();
  await assert.rejects(f.ai.execute(request), /confirm/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(f.ai.execute(request, { consent: true, signal: controller.signal }), /stopped/);
  f.ai.saveSettings({ mode: 'demo' });
  await assert.rejects(f.ai.execute(request, { consent: true }), /in-page AI account/);
  assert.equal(f.calls.length, 0); assert.equal(f.network.length, 0);
});
test('one orchestration step delegates one reviewed snapshot and returns a completed subscription result', async () => {
  const f = mount(), controller = new AbortController();
  const result = await f.ai.execute({ ...request, context: { selected: 'Only this context', apiKey: 'DO-NOT-SEND' } }, { consent: true, signal: controller.signal });
  assert.equal(result.kind, 'answer'); assert.equal(result.billing, 'chatgpt-subscription');
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].options.signal, controller.signal);
  assert.equal(f.calls[0].payload.context.selected, 'Only this context'); assert.equal(f.calls[0].payload.context.apiKey, undefined);
  assert.equal(f.network.length, 0);
});
test('unexpected handoff or unfinished response is not a successful orchestration step', async () => {
  for (const answer of [{ kind: 'handoff', answer: 'Prepared prompt' }, { kind: 'demo', answer: 'Fixed preview' }, { kind: 'answer', answer: '' }]) {
    const f = mount(null, { answer });
    await assert.rejects(f.ai.execute(request, { consent: true }), /completed response/);
    assert.equal(f.calls.length, 1); assert.equal(f.network.length, 0);
  }
});
test('subscription failure never retries, exports a prompt, or falls back to an API', async () => {
  const f = mount(null, { failure: new Error('Synthetic provider limit') });
  await assert.rejects(f.ai.execute(request, { consent: true }), /provider limit/);
  assert.equal(f.calls.length, 1); assert.equal(f.network.length, 0);
  assert.equal(f.ai.getSettings().mode, 'subscription');
});
test('checking a subscription connection does not access an API credential or generate', async () => {
  const f = mount();
  assert.match((await f.ai.checkConnection()).message, /No model request/);
  assert.equal(f.calls.length, 0); assert.equal(f.network.length, 0);
});
