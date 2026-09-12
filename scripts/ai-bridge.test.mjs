import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../ai-bridge/worker.js', import.meta.url), 'utf8');
const { default: worker } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const key = 'sk-proj-visitor-test-api-key';
const env = { OPENAI_API_KEY: 'operator-must-never-be-used', ANTHROPIC_API_KEY: 'operator-must-never-be-used', BALLZATRAM_ACCESS_TOKEN: 'old-owner-token' };
const body = { provider: 'openai', model: 'test-model', tool: 'observatory', prompt: 'Explain the evidence', context: { section: '3' }, maxTokens: 1200 };
const make = (data = body, headers = {}, path = '/v2/assist') => new Request('https://relay.example' + path, { method: 'POST', headers: { Origin: 'https://ballzatram.com', 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...headers }, body: JSON.stringify(data) });

test('operator secrets never authorize v1 or requests without a user key', async () => {
  const original = globalThis.fetch; globalThis.fetch = () => { throw new Error('No inference expected'); };
  try {
    assert.equal((await worker.fetch(make(body, {}, '/v1/assist'), env)).status, 410);
    assert.equal((await worker.fetch(make(body, { Authorization: '' }), env)).status, 401);
    assert.equal((await worker.fetch(make(body, { Authorization: 'Bearer old-owner-token' }), env)).status, 401);
  } finally { globalThis.fetch = original; }
});

test('OpenAI and Anthropic get only the user credential at fixed destinations', async () => {
  const original = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, options) => { calls.push([url, options]); return Response.json(url.includes('anthropic') ? { model: 'claude-test', content: [{ type: 'text', text: 'draft' }], usage: { input_tokens: 3, output_tokens: 2 } } : { output: [{ content: [{ type: 'output_text', text: 'draft' }] }] }); };
  try {
    const res = await worker.fetch(make({ ...body, baseURL: 'https://attacker.example' }), env);
    assert.equal(res.status, 200); assert.equal(calls[0][0], 'https://api.openai.com/v1/responses');
    assert.equal(calls[0][1].headers.Authorization, `Bearer ${key}`); assert.equal(calls[0][1].redirect, 'error');
    const input = JSON.parse(calls[0][1].body); assert.equal(input.store, false); assert.equal(input.max_output_tokens, 1200); assert.match(input.instructions, /promise fulfillment/);
    const ant = 'sk-ant-api03-user-test-api-key';
    const ares = await worker.fetch(make({ ...body, provider: 'anthropic', model: 'claude-test' }, { Authorization: `Bearer ${ant}` }), env);
    assert.equal((await ares.json()).usage.total_tokens, 5); assert.equal(calls[1][0], 'https://api.anthropic.com/v1/messages'); assert.equal(calls[1][1].headers['x-api-key'], ant);
    assert.doesNotMatch(JSON.stringify(calls), /operator-must|attacker/);
  } finally { globalThis.fetch = original; }
});

test('relay enforces actual body size without Content-Length, provider, origin and token caps', async () => {
  assert.equal((await worker.fetch(make({ ...body, padding: 'x'.repeat(130000) }), env)).status, 413);
  assert.equal((await worker.fetch(make({ ...body, context: { text: 'x'.repeat(24000) } }), env)).status, 413);
  assert.equal((await worker.fetch(make({ ...body, maxTokens: 100000 }), env)).status, 400);
  assert.equal((await worker.fetch(make({ ...body, provider: 'custom-url' }), env)).status, 400);
  assert.equal((await worker.fetch(make(body, { Origin: 'https://attacker.example' }), env)).status, 403);
  assert.equal((await worker.fetch(make(body, { Authorization: 'Bearer sk-ant-oat-subscription-session' }), env)).status, 401);
});

test('relay strips upstream error bodies, makes no retries and advertises its billing contract', async () => {
  const health = await worker.fetch(new Request('https://relay.example/health'), env);
  assert.equal((await health.json()).billing, 'user-key-only');
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ error: { message: `secret ${key}` } }, { status: 429 }); };
  try {
    const res = await worker.fetch(make(), env); assert.equal(res.status, 429); assert.doesNotMatch(await res.text(), /secret|sk-proj/); assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});
