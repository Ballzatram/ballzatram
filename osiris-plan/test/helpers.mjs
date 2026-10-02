import { PlanSession } from '../session.mjs';
import worker from '../worker.mjs';
import { random, PLAN_SCOPE } from '../protocol.mjs';

export const event = value => `data: ${JSON.stringify(value)}\n\n`;
export const completed = (answer = 'A complete answer.', model = 'fixture-model') => event({ type: 'response.output_text.delta', delta: answer }) + event({ type: 'response.completed', response: { model, status: 'completed', usage: { total_tokens: 8 } } });
export const stream = text => new Response(text, { headers: { 'Content-Type': 'text/event-stream' } });
export const input = { tool: 'beckets-labyrinth', prompt: 'Make a countdown.', context: { topic: 'Imaginary worlds' }, model: 'fixture-model', consent: true, responseLength: 'standard' };
export function harness(options = {}) {
  const env = { HOSTED_PLAN_ACCESS: 'approved', HOSTED_APPROVAL_REFERENCE: 'test-only-contract', SITE_ORIGIN: 'https://example.test', PUBLIC_ORIGIN: 'https://ai.example.test', OPENAI_CLIENT_ID: 'oaiapp_fixture', OPENAI_TOKEN_AUTH_METHOD: 'none', OPENAI_PLAN_SCOPES: 'openid profile email offline_access resource.invoke ' + PLAN_SCOPE, TOKEN_ENCRYPTION_KEY: random() };
  const calls = { exchange: 0, models: 0, refresh: 0, responses: [], revoke: 0 }, objects = new Map(), tasks = [];
  const provider = {
    async authorize(tx) { const url = new URL('https://auth.openai.com/api/accounts/authorize'); url.searchParams.set('state', tx.state); return url.href; },
    async exchange(code) { calls.exchange++; return { identity: { subject: code, email: code + '@example.test' }, planEnabled: options.denied !== true, tokens: { access: 'SECRET_ACCESS_' + code, refresh: 'SECRET_REFRESH_' + code, scopes: options.denied ? [] : [PLAN_SCOPE], expiresAt: Date.now() + (options.expiring ? 0 : 3600000) } }; },
    async refresh(tokens) { calls.refresh++; if (options.refresh) return options.refresh(tokens); return { ...tokens, access: tokens.access + '_new', refresh: tokens.refresh + '_new', expiresAt: Date.now() + 3600000 }; },
    async revoke() { calls.revoke++; return options.revocation !== false; },
    async models() { calls.models++; return [{ id: 'fixture-model', name: 'Fixture', isDefault: true }]; },
    async respond(tokens, body, signal) { calls.responses.push({ tokens, body, signal }); return options.respond ? options.respond(tokens, body, signal) : stream(completed()); }
  };
  env.SESSIONS = {
    idFromName: name => name,
    get(name) {
      if (!objects.has(name)) {
        const data = new Map();
        const ctx = { id: { toString: () => name }, storage: {
          async get(key) { return structuredClone(data.get(key)); },
          async put(key, value) { data.set(key, structuredClone(value)); },
          async deleteAll() { data.clear(); },
          async setAlarm(value) { ctx.alarmAt = value; },
          async deleteAlarm() { ctx.alarmAt = null; }
        }, waitUntil(promise) { tasks.push(promise); } };
        objects.set(name, { data, ctx, instance: new PlanSession(ctx, env, () => provider) });
      }
      return { fetch: request => objects.get(name).instance.fetch(request) };
    }
  };
  const request = (path, init = {}) => worker.fetch(new Request(env.PUBLIC_ORIGIN + path, init), env);
  async function login(code = 'alice', oldCookie = '') {
    const start = await request('/auth/start?returnTo=' + encodeURIComponent(env.SITE_ORIGIN + '/tools/beckets-labyrinth/?private=discard'));
    const authCookie = start.headers.get('set-cookie').split(';')[0];
    const state = new URL(start.headers.get('location')).searchParams.get('state');
    const callback = await request('/auth/callback?state=' + state + '&code=' + code, { headers: { Cookie: authCookie + (oldCookie ? '; ' + oldCookie : '') } });
    const sessionCookie = callback.headers.getSetCookie().find(value => value.startsWith('__Host-osiris-plan='))?.split(';')[0];
    const headers = { Origin: env.SITE_ORIGIN, Cookie: sessionCookie };
    const account = await (await request('/v1/account', { headers })).json();
    headers['X-Osiris-CSRF'] = account.csrf;
    return { sessionCookie, authCookie, state, callback, account, headers,
      call: (path, body, method = body ? 'POST' : 'GET') => request(path, { method, headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }) };
  }
  return { env, calls, objects, tasks, request, login, provider };
}
