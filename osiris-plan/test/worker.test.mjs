import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, input, completed, stream, event } from './helpers.mjs';
import { unseal, seal } from '../auth.mjs';
import { random, consumeResponse, validateQuestion, PLAN_SCOPE } from '../protocol.mjs';

test('hosted access fails closed before any provider request; health is not inference proof', async () => {
  const h = harness(); h.env.HOSTED_PLAN_ACCESS = 'disabled';
  const response = await h.request('/health');
  assert.equal((await response.json()).ready, false);
  assert.equal((await h.request('/auth/start')).status, 503);
  assert.equal(h.objects.size, 0);
  h.env.HOSTED_PLAN_ACCESS = 'approved'; h.env.OPENAI_CLIENT_ID = 'dynamic_agent_client';
  assert.equal((await h.request('/auth/start')).status, 503);
});
test('OAuth callback is cookie-bound, single-use, and cannot redirect to another site', async () => {
  const h = harness();
  assert.equal((await h.request('/auth/start?returnTo=https://evil.test')).status, 400);
  const a = await h.login();
  assert.match(a.sessionCookie, /^__Host-osiris-plan=/);
  assert.equal(a.callback.headers.get('location'), h.env.SITE_ORIGIN + '/tools/beckets-labyrinth/?osiris=connected');
  assert.match(a.callback.headers.getSetCookie().find(s => s.startsWith('__Host-osiris-plan=')), /HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await h.request('/auth/callback?state=' + a.state + '&code=alice')).status, 400);
  const replay = await h.request('/auth/callback?state=' + a.state + '&code=alice', { headers: { Cookie: a.authCookie } });
  assert.match(replay.headers.get('location'), /not-connected/);
  assert.equal(h.calls.exchange, 1);
});
test('sign-in and model discovery never generate; denied plan permission stays disabled', async () => {
  const h = harness({ denied: true }), a = await h.login();
  assert.equal(a.account.account.planEnabled, false);
  assert.equal((await a.call('/v1/assist', input)).status, 403);
  assert.equal((await a.call('/v1/models')).status, 403);
  assert.equal(h.calls.responses.length, 0);
});
test('encrypted storage binds each visitor; no provider credentials reach the browser', async () => {
  const h = harness(), a = await h.login('alice'), b = await h.login('bob');
  assert.notEqual(a.account.sessionId, b.account.sessionId);
  assert.equal(a.account.account.email, 'alice@example.test');
  assert.doesNotMatch(JSON.stringify(a.account), /SECRET|access_token|refresh_token/);
  for (const { data } of h.objects.values()) assert.doesNotMatch(JSON.stringify([...data]), /SECRET|alice@example/);
  const key = random(), cipher = await seal({ secret: 'credential' }, key, 'session-a');
  await assert.rejects(unseal(cipher, key, 'session-b'));
  await assert.rejects(unseal(cipher, random(), 'session-a'));
});
test('cross-origin and CSRF attempts fail without inference; retired session cannot be reused', async () => {
  const h = harness(), a = await h.login();
  const body = JSON.stringify(input);
  for (const headers of [
    { Cookie: a.sessionCookie, Origin: 'https://evil.test', 'Content-Type': 'application/json', 'X-Osiris-CSRF': a.account.csrf },
    { Cookie: a.sessionCookie, Origin: h.env.SITE_ORIGIN, 'Content-Type': 'application/json' }
  ]) assert.equal((await h.request('/v1/assist', { method: 'POST', headers, body })).status, 403);
  await h.login('bob', a.sessionCookie);
  assert.equal((await a.call('/v1/account')).status, 401);
  assert.equal(h.calls.responses.length, 0);
});
test('model selection, feature allowlist and explicit consent guard the Responses route', async () => {
  const h = harness(), a = await h.login();
  for (const body of [{ ...input, model: 'unavailable' }, { ...input, consent: false }, { ...input, tool: 'parcel' }]) assert.ok((await a.call('/v1/assist', body)).status >= 400);
  assert.equal(h.calls.responses.length, 0);
  const response = await a.call('/v1/assist', { ...input, context: { topic: 'Worlds', api_key: 'do-not-send' }, temperature: 0, max_output_tokens: 900 });
  const text = await response.text(); await Promise.all(h.tasks);
  assert.match(text, /event: done/);
  assert.equal(h.calls.responses.length, 1);
  const sent = h.calls.responses[0].body;
  assert.equal(sent.store, false); assert.equal(sent.stream, true);
  assert.equal(Array.isArray(sent.input), true);
  assert.doesNotMatch(JSON.stringify(sent), /do-not-send|temperature|max_output_tokens/);
});
test('rotating refresh is serialized for overlapping requests and remains session-specific', async () => {
  const h = harness({ expiring: true, refresh: async tokens => { await new Promise(resolve => setTimeout(resolve, 15)); return { ...tokens, access: 'ROTATED', scopes: [PLAN_SCOPE], expiresAt: Date.now() + 3600000 }; } });
  const a = await h.login();
  const responses = await Promise.all([a.call('/v1/models'), a.call('/v1/models')]);
  assert.deepEqual(responses.map(r => r.status), [200, 200]);
  assert.equal(h.calls.refresh, 1);
});
test('one active turn, cancel and disconnect stop upstream work; stream cleanup never restores logout', async () => {
  const h = harness({ respond: async (_tokens, _body, signal) => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode(event({ type: 'response.output_text.delta', delta: 'Partial' }))); signal.addEventListener('abort', () => controller.close(), { once: true }); }
  }), { headers: { 'Content-Type': 'text/event-stream' } }) });
  const a = await h.login();
  const response = await a.call('/v1/assist', input), collecting = response.text();
  assert.equal((await a.call('/v1/assist', input)).status, 409);
  assert.equal((await a.call('/v1/session', null, 'DELETE')).status, 200);
  const output = await collecting; await Promise.all(h.tasks);
  assert.match(output, /event: error/); assert.doesNotMatch(output, /event: done/);
  assert.equal(h.calls.responses[0].signal.aborted, true);
  assert.equal((await a.call('/v1/account')).status, 401);
});
test('usage errors after deltas, premature EOF and malformed streams are never successful answers', async () => {
  for (const text of [event({ type: 'response.output_text.delta', delta: 'Partial' }), completed().replace('completed","usage', 'incomplete","usage'), event({ type: 'response.failed', response: { error: { code: 'subscription_sharing_usage_limit_exceeded', message: 'SECRET' } } }), 'data: broken\n\n']) {
    await assert.rejects(consumeResponse(stream(text), 'fixture-model', () => {}), error => { assert.doesNotMatch(error.message, /SECRET/); return true; });
  }
});
test('SSE handles split Unicode, CRLF, comments, multiline data and complete terminal event', async () => {
  const bytes = new TextEncoder().encode(': heartbeat\r\n\r\n' + completed('Café 🐈').replaceAll('\n', '\r\n'));
  const response = new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } }), { headers: { 'Content-Type': 'text/event-stream' } });
  const parts = [], result = await consumeResponse(response, 'fixture-model', text => parts.push(text));
  assert.equal(result.answer, 'Café 🐈'); assert.equal(parts.join(''), result.answer);
  assert.equal(result.billing, 'chatgpt-subscription');
});
test('remote revocation failure is reported honestly after local cleanup', async () => {
  const h = harness({ revocation: false }), a = await h.login();
  const disconnected = await (await a.call('/v1/session', null, 'DELETE')).json();
  assert.equal(disconnected.disconnected, true); assert.equal(disconnected.revoked, false);
  assert.equal((await a.call('/v1/account')).status, 401);
  assert.throws(() => validateQuestion({ ...input, context: { password: 'secret' } }), /context/);
});
test('idle and absolute expiry erase credentials and reject further requests', async () => {
  for (const field of ['lastUsed', 'expiresAt']) {
    const h = harness(), a = await h.login();
    const id = a.sessionCookie.split('=')[1], object = h.objects.get(id);
    const record = await unseal(object.data.get('record'), h.env.TOKEN_ENCRYPTION_KEY, id);
    record[field] = Date.now() - 4 * 60 * 60 * 1000;
    object.data.set('record', await seal(record, h.env.TOKEN_ENCRYPTION_KEY, id));
    assert.equal((await a.call('/v1/account')).status, 401);
    assert.equal(object.data.size, 0); assert.equal(object.ctx.alarmAt, null);
    assert.equal(h.calls.revoke, 1); assert.equal(h.calls.responses.length, 0);
  }
});
test('a slow cancelled stream cannot clear the active replacement turn', async () => {
  const h = harness(), a = await h.login();
  const first = await a.call('/v1/assist', input);
  await a.call('/v1/cancel', {}, 'POST');
  // The client has not read the status event. Simulate the persisted turn deadline
  // passing while its cancelled response is still blocked on downstream reads.
  const id = a.sessionCookie.split('=')[1], object = h.objects.get(id);
  const record = await unseal(object.data.get('record'), h.env.TOKEN_ENCRYPTION_KEY, id);
  record.activeUntil = Date.now() - 1;
  object.data.set('record', await seal(record, h.env.TOKEN_ENCRYPTION_KEY, id));
  const second = await a.call('/v1/assist', input);
  assert.match(await first.text(), /event: error/); await h.tasks[0];
  const third = await a.call('/v1/assist', input);
  assert.equal(third.status, 409);
  assert.match(await second.text(), /event: done/); await Promise.all(h.tasks);
  assert.equal(h.calls.responses.length, 1);
});
