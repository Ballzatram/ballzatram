// Real workerd + SQLite Durable Objects. Every OpenAI response is synthetic.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { harness, input, completed } from './helpers.mjs';

const { env } = harness(); delete env.SESSIONS;
const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwk = await exportJWK(publicKey); jwk.kid = 'edge-fixture';
let nonce, requests = 0;
const bundle = await build({ entryPoints: [new URL('../worker.mjs', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
const mf = new Miniflare(convertV4MiniflareOptions({ name: "osiris-fixture",
  modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-18',
  bindings: env, durableObjects: { SESSIONS: { className: 'PlanSession', useSQLite: true } },
  outboundService: async request => {
    const path = new URL(request.url).pathname;
    if (path === '/.well-known/openid-configuration') return Response.json({ issuer: 'https://auth.openai.com', authorization_endpoint: 'https://auth.openai.com/api/accounts/authorize', token_endpoint: 'https://auth.openai.com/api/accounts/oauth/token', jwks_uri: 'https://auth.openai.com/.well-known/jwks.json', revocation_endpoint: 'https://auth.openai.com/api/accounts/oauth/revoke' });
    if (path === '/.well-known/jwks.json') return Response.json({ keys: [jwk] });
    if (path.endsWith('/oauth/token')) {
      const jwt = await new SignJWT({ nonce, sub: 'edge-user', email: 'edge@example.test' }).setProtectedHeader({ alg: 'RS256', kid: 'edge-fixture' }).setIssuer('https://auth.openai.com').setAudience(env.OPENAI_CLIENT_ID).setIssuedAt().setExpirationTime('5m').sign(privateKey);
      return Response.json({ id_token: jwt, token_type: 'Bearer', access_token: 'EDGE_ACCESS', refresh_token: 'EDGE_REFRESH', scope: env.OPENAI_PLAN_SCOPES, expires_in: 3600 });
    }
    if (path.endsWith('/oauth/revoke')) return new Response(null, { status: 200 });
    if (path === '/v1/models') return Response.json({ models: [{ slug: 'fixture-model', display_name: 'Fixture', visibility: 'list' }] });
    if (path === '/v1/responses') {
      requests++; const body = await request.json();
      assert.equal(body.store, false); assert.equal(body.stream, true);
      assert.equal(request.headers.get('authorization'), 'Bearer EDGE_ACCESS');
      return new Response(completed(), { headers: { 'Content-Type': 'text/event-stream' } });
    }
    throw new Error('Unexpected provider route: ' + path);
  }
}));
try {
  const call = (path, init) => mf.dispatchFetch(env.PUBLIC_ORIGIN + path, { redirect: 'manual', ...init });
  const start = await call('/auth/start'); assert.equal(start.status, 302, await start.clone().text());
  const login = new URL(start.headers.get('location')); nonce = login.searchParams.get('nonce');
  const pending = start.headers.get('set-cookie').split(';')[0];
  const callback = await call('/auth/callback?code=fixture&state=' + login.searchParams.get('state'), { headers: { Cookie: pending } });
  assert.equal(callback.status, 302); assert.match(callback.headers.get('location'), /osiris=connected/);
  const cookie = callback.headers.getSetCookie().find(value => value.startsWith('__Host-osiris-plan='))?.split(';')[0];
  const headers = { Origin: env.SITE_ORIGIN, Cookie: cookie };
  const account = await (await call('/v1/account', { headers })).json();
  assert.equal(account.account.planEnabled, true); assert.equal(requests, 0);
  headers['X-Osiris-CSRF'] = account.csrf; headers['Content-Type'] = 'application/json';
  const answer = await call('/v1/assist', { method: 'POST', headers, body: JSON.stringify(input) });
  assert.match(await answer.text(), /event: done/); assert.equal(requests, 1);
  const disconnect = await call('/v1/session', { method: 'DELETE', headers });
  assert.equal((await disconnect.json()).revoked, true);
  assert.equal((await call('/v1/account', { headers })).status, 401);
  console.log('PASS: real workerd/SQLite OAuth, JWT, encrypted session, direct stream and disconnect; synthetic OpenAI only.');
} finally { await mf.dispose(); }
