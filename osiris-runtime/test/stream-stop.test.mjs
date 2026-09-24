import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../../assets/subscription-client.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function storage(values = {}) {
  const map = new Map(Object.entries(values));
  return { getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) };
}
for (const cancelled of [true, false]) test(`stream-reader errors are safe and normalized (cancelled=${cancelled})`, async () => {
  let streamController, calls = 0;
  const controller = new AbortController();
  const window = {
    localStorage: storage({ 'ballzatram:subscription-settings:v1': JSON.stringify({ endpoint: 'https://synthetic.example', model: 'test-model' }) }),
    sessionStorage: storage({ 'ballzatram:subscription-session:v1': JSON.stringify({ token: 'a'.repeat(43), endpoint: 'https://synthetic.example', expiresAt: Date.now() + 60000, account: { type: 'chatgpt' } }) }),
    fetch: async () => { calls++; return new Response(new ReadableStream({ start(value) { streamController = value; } }), { headers: { 'Content-Type': 'text/event-stream' } }); }
  };
  vm.runInNewContext(source, { window, URL, TextDecoder, TextEncoder, AbortController, AbortSignal, setTimeout, clearTimeout });
  const pending = window.BallzatramSubscription.ask({ tool: 'general', prompt: 'Synthetic', context: {} }, { consent: true, signal: controller.signal });
  const rejected = assert.rejects(pending, error => {
    assert.match(error.message, cancelled ? /stopped/ : /ended before/);
    assert.doesNotMatch(error.message, /BodyStreamBuffer|SECRET/); return true;
  });
  await flush();
  if (cancelled) controller.abort();
  streamController.error(new Error('BodyStreamBuffer was aborted SECRET'));
  await rejected; assert.equal(calls, 1);
});
