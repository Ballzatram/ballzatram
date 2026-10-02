import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createProvider } from '../auth.mjs';
import { configuration, PLAN_SCOPE } from '../protocol.mjs';
import { harness } from './helpers.mjs';

async function fixture(overrides = {}) {
  const { env } = harness(), config = configuration(env), calls = [];
  if (overrides.confidential) { env.OPENAI_TOKEN_AUTH_METHOD = 'client_secret_basic'; env.OPENAI_CLIENT_SECRET = 'secret with: punctuation'; }
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey); jwk.kid = 'fixture';
  const tx = { state: 'test-state', nonce: 'test-nonce', challenge: 'pkce-challenge', verifier: 'test-verifier' };
  const claims = { sub: 'subject-1', nonce: tx.nonce, email: 'alice@example.test', ...overrides.claims };
  const jwt = await new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'fixture' }).setIssuer(overrides.issuer || 'https://auth.openai.com').setAudience(overrides.audience || config.clientId).setIssuedAt().setExpirationTime(overrides.expired ? '-10m' : '5m').sign(privateKey);
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/.well-known/openid-configuration')) return Response.json({ issuer: 'https://auth.openai.com', authorization_endpoint: 'https://auth.openai.com/api/accounts/authorize', token_endpoint: 'https://auth.openai.com/api/accounts/oauth/token', jwks_uri: overrides.jwksUrl || 'https://auth.openai.com/.well-known/jwks.json', revocation_endpoint: 'https://auth.openai.com/api/accounts/oauth/revoke' });
    if (url.endsWith('/.well-known/jwks.json')) return Response.json({ keys: [jwk] });
    if (url.endsWith('/oauth/token')) return Response.json(overrides.identityOnly ? { id_token: jwt, scope: 'openid profile email' } : { id_token: jwt, access_token: 'TEST_ACCESS', refresh_token: 'TEST_REFRESH', token_type: 'Bearer', scope: 'openid offline_access resource.invoke ' + PLAN_SCOPE, expires_in: 3600 });
    if (url.endsWith('/oauth/revoke')) return new Response(null, { status: 200 });
    throw new Error('Unexpected outbound request');
  };
  return { provider: createProvider(env, config, fetcher), tx, calls, config };
}
test('hosted OAuth uses registered client, exact callback, PKCE and separate plan scope', async () => {
  const f = await fixture();
  const url = new URL(await f.provider.authorize(f.tx));
  assert.equal(url.searchParams.get('client_id'), f.config.clientId);
  assert.equal(url.searchParams.get('redirect_uri'), f.config.callback);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.match(url.searchParams.get('scope'), /chatgpt.tokens.use.direct/);
  assert.equal(url.searchParams.has('ext_agent_host_id'), false);
  const result = await f.provider.exchange('code', f.tx);
  assert.equal(result.identity.subject, 'subject-1'); assert.equal(result.planEnabled, true);
  assert.equal(result.tokens.idToken, undefined);
  assert.equal(f.calls.every(call => call.options.redirect === 'manual'), true);
});
test('JWT issuer, audience, expiry, nonce and untrusted discovery URLs are rejected', async () => {
  for (const options of [{ issuer: 'https://evil.test' }, { audience: 'oaiapp_other' }, { expired: true }, { claims: { nonce: 'wrong' } }, { jwksUrl: 'https://evil.test/keys' }]) {
    const f = await fixture(options);
    await assert.rejects(f.provider.exchange('code', f.tx));
    assert.equal(f.calls.some(call => call.url.startsWith('https://evil.test')), false);
  }
});
test('confidential-client secret is restricted to the token/revocation Basic header', async () => {
  const f = await fixture({ confidential: true });
  const url = await f.provider.authorize(f.tx);
  assert.doesNotMatch(url, /secret/);
  const result = await f.provider.exchange('code', f.tx);
  await f.provider.revoke(result.tokens);
  for (const call of f.calls.filter(call => /oauth\/(token|revoke)$/.test(call.url))) {
    assert.match(call.options.headers.Authorization, /^Basic /);
    assert.equal(new URLSearchParams(call.options.body).has('client_secret'), false);
  }
});
test('valid identity-only consent is retained without inference permission or credentials', async () => {
  const f = await fixture({ identityOnly: true }), result = await f.provider.exchange('code', f.tx);
  assert.equal(result.planEnabled, false); assert.equal(result.tokens.access, null); assert.equal(result.tokens.refresh, null);
});
test('provider redirects are rejected instead of forwarding credentials', async () => {
  const { env } = harness(), calls = [];
  const provider = createProvider(env, configuration(env), async (url, options) => {
    calls.push({ url, options });
    return new Response(null, { status: 307, headers: { Location: 'https://evil.test/token' } });
  });
  await assert.rejects(provider.respond({ access: 'PRIVATE' }, {}, new AbortController().signal), error => error.code === 'provider_redirect');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/responses');
  assert.equal(calls[0].options.redirect, 'manual');
});
