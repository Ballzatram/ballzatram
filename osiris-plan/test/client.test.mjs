import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function mount(fetcher) {
  const writes = [], locations = [], session = { sessionId: 'a'.repeat(43), csrf: 'c'.repeat(43), expiresAt: Date.now() + 3600000, account: { type: 'chatgpt', email: 'fixture@example.test', planType: 'Plus', planEnabled: true } };
  const root = { BallzatramAIConfig: { chatgptPlanUrl: 'https://ai.example.test' }, localStorage: { getItem: () => null, setItem: (...args) => writes.push(args) }, sessionStorage: { getItem: () => null, setItem: (...args) => writes.push(args), removeItem() {} }, location: { href: 'https://example.test/tools/beckets-labyrinth/?osiris=connected', origin: 'https://example.test', pathname: '/tools/beckets-labyrinth/', assign: url => locations.push(url) }, history: { replaceState() {} }, fetch: async (url, options) => fetcher ? fetcher(url, options, session) : Response.json(session) };
  const context = vm.createContext({ window: root, URL, AbortController, AbortSignal, TextDecoder, setTimeout, clearTimeout, console });
  vm.runInContext(fs.readFileSync(new URL('../../assets/subscription-client.js', import.meta.url), 'utf8'), context);
  return { sub: root.BallzatramSubscription, root, session, writes, locations };
}
test('hosted restore uses only a credentialed cookie request; metadata is not persisted', async () => {
  const calls = [], h = mount((url, options, session) => { calls.push({ url, options }); return Response.json(session); });
  await h.sub.status();
  assert.equal(h.sub.connection().account.planEnabled, true);
  assert.equal(h.writes.length, 0);
  assert.equal(calls.every(c => c.options.credentials === 'include' && !c.options.headers.Authorization), true);
  assert.equal(h.sub.takeReturnStatus(), 'connected'); assert.equal(h.sub.takeReturnStatus(), '');
});
test('the configured hosted endpoint cannot be replaced by local preferences', async () => {
  const h = mount();
  h.sub.configure({ endpoint: 'https://evil.test', model: 'fixture-model' });
  assert.equal(h.sub.settings().endpoint, 'https://ai.example.test');
  assert.doesNotMatch(JSON.stringify(h.writes), /evil.test|csrf|access_token/);
});
test('connection navigates only to the configured backend and never submits a question', async () => {
  const calls = [], h = mount((url, options, session) => { calls.push(url); return Response.json(url.endsWith('/health') ? { service: 'osiris-chatgpt-plan', protocol: 4, billing: 'user-chatgpt-only', ready: true } : session); });
  await h.sub.connect();
  assert.equal(h.locations.length, 1);
  const target = new URL(h.locations[0]);
  assert.equal(target.origin, 'https://ai.example.test');
  assert.equal(target.searchParams.get('returnTo'), 'https://example.test/tools/beckets-labyrinth/');
  assert.equal(calls.some(url => url.includes('/assist')), false);
});
test('disconnect invalidates an outstanding restore before it can reconnect the browser', async () => {
  const resolvers = []; const h = mount(() => new Promise(r => { resolvers.push(r); }));
  const pending = h.sub.status(); await new Promise(r => setTimeout(r, 0));
  await h.sub.disconnect(); resolvers.forEach(resolve => resolve(Response.json(h.session)));
  await assert.rejects(pending, /cancelled or changed/);
  assert.equal(h.sub.connection(), null);
});
test('closing a pending hosted connection prevents a delayed navigation', async () => {
  let release;
  const h = mount((url, options, session) => url.endsWith('/health') ? new Promise(resolve => { release = resolve; }) : Response.json(session));
  const pending = h.sub.connect(); await new Promise(resolve => setTimeout(resolve, 0));
  await h.sub.disconnect();
  release(Response.json({ service: 'osiris-chatgpt-plan', protocol: 4, billing: 'user-chatgpt-only', ready: true }));
  await assert.rejects(pending, /cancelled or changed/);
  assert.equal(h.locations.length, 0);
});
test('the initial hosted rollout rejects other project requests before network inference', async () => {
  const calls = [], h = mount((url, options, session) => { calls.push(url); return Response.json(session); });
  await h.sub.status(); h.sub.configure({ model: 'fixture-model' });
  await assert.rejects(h.sub.ask({ tool: 'parcel' }, { consent: true }), /Beckets Labyrinth/);
  assert.equal(calls.some(url => url.endsWith('/assist')), false);
});
