import { createLocalJWKSet, jwtVerify } from 'jose';
import { b64, unb64, failure, readJSON, providerError, PLAN_SCOPE } from './protocol.mjs';

const ISSUER = 'https://auth.openai.com';
const RESOURCE = 'https://api.openai.com/v1';
export async function seal(value, key, aad) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aes = await crypto.subtle.importKey('raw', unb64(key), 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(aad) }, aes, new TextEncoder().encode(JSON.stringify(value)));
  return { iv: b64(iv), ciphertext: b64(new Uint8Array(ciphertext)) };
}
export async function unseal(value, key, aad) {
  const aes = await crypto.subtle.importKey('raw', unb64(key), 'AES-GCM', false, ['decrypt']);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(value.iv), additionalData: new TextEncoder().encode(aad) }, aes, unb64(value.ciphertext));
  return JSON.parse(new TextDecoder().decode(clear));
}
export function createProvider(env, config, fetcher = fetch) {
  let metadata;
  const get = async (url, options = {}) => {
    // workerd supports manual/follow, not redirect:error. Never follow credentials.
    const response = await fetcher(url, { ...options, redirect: 'manual', signal: options.signal || AbortSignal.timeout(15000) });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw failure('provider_redirect', 'OpenAI returned an unexpected redirect.', 502);
    }
    return response;
  };
  async function discovery() {
    if (metadata) return metadata;
    const response = await get(ISSUER + '/.well-known/openid-configuration');
    if (!response.ok) throw failure('discovery', 'OpenAI sign-in is temporarily unavailable.', 503);
    const data = await readJSON(response);
    if (data.issuer !== ISSUER) throw failure('discovery', 'OpenAI sign-in configuration could not be verified.', 503);
    for (const field of ['authorization_endpoint', 'token_endpoint', 'jwks_uri', 'revocation_endpoint']) {
      const url = new URL(data[field]);
      if (url.origin !== ISSUER || url.username || url.password || url.hash || url.search) throw failure('discovery', 'OpenAI sign-in configuration could not be verified.', 503);
    }
    metadata = data; return data;
  }
  function clientAuth(params) {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    params.set('client_id', config.clientId);
    if (env.OPENAI_TOKEN_AUTH_METHOD === 'client_secret_basic') {
      const form = text => new URLSearchParams({ v: text }).toString().slice(2);
      headers.Authorization = 'Basic ' + btoa(form(config.clientId) + ':' + form(env.OPENAI_CLIENT_SECRET));
    }
    return headers;
  }
  async function token(parameters, previous) {
    const params = new URLSearchParams({ ...parameters, resource: RESOURCE });
    const response = await get((await discovery()).token_endpoint, { method: 'POST', headers: clientAuth(params), body: params });
    const body = await readJSON(response);
    if (!response.ok) {
      if (['invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired', 'refresh_token_invalidated', 'refresh_token_reused'].includes(body.error)) throw failure('sign_in', 'Reconnect your ChatGPT account.', 401);
      throw failure('token_exchange', 'OpenAI could not complete authorization. Try connecting again.', 503);
    }
    const scopes = typeof body.scope === 'string' ? body.scope.split(/\s+/) : previous?.scopes || [];
    if (parameters.grant_type === 'authorization_code' && !scopes.includes(PLAN_SCOPE) && typeof body.id_token === 'string' && !body.access_token) {
      return { access: null, refresh: null, scopes, expiresAt: Date.now(), idToken: body.id_token };
    }
    if (typeof body.access_token !== 'string' || body.token_type?.toLowerCase() !== 'bearer' || !Number.isFinite(body.expires_in) || body.expires_in <= 0 || body.expires_in > 86400) throw failure('token_response', 'OpenAI did not return a valid connection.', 502);
    if (body.access_token.length > 24000 || (body.refresh_token?.length || 0) > 24000) throw failure('token_response', 'OpenAI returned an invalid connection.', 502);
    return { access: body.access_token, refresh: typeof body.refresh_token === 'string' ? body.refresh_token : previous?.refresh || null, scopes, expiresAt: Date.now() + body.expires_in * 1000, idToken: body.id_token };
  }
  return {
    async authorize(transaction) {
      const url = new URL((await discovery()).authorization_endpoint);
      url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callback, response_type: 'code', scope: config.scopes, resource: RESOURCE, state: transaction.state, nonce: transaction.nonce, code_challenge: transaction.challenge, code_challenge_method: 'S256' }).toString();
      return url.href;
    },
    async exchange(code, transaction) {
      const tokens = await token({ grant_type: 'authorization_code', code, code_verifier: transaction.verifier, redirect_uri: config.callback });
      const response = await get((await discovery()).jwks_uri);
      if (!response.ok) throw failure('identity', 'OpenAI identity could not be verified.', 503);
      const jwks = createLocalJWKSet(await readJSON(response));
      let identity;
      try {
        ({ payload: identity } = await jwtVerify(tokens.idToken, jwks, { issuer: ISSUER, audience: config.clientId, algorithms: ['RS256', 'ES256'], requiredClaims: ['sub', 'exp', 'iat', 'nonce'], clockTolerance: 5 }));
        if (identity.nonce !== transaction.nonce || typeof identity.sub !== 'string' || !identity.sub) throw new Error('identity');
      } catch { throw failure('identity', 'OpenAI identity could not be verified.', 401); }
      // No ChatGPT history, local-account auto-linking, or raw ID token persistence.
      delete tokens.idToken;
      return { tokens, identity: { issuer: ISSUER, clientId: config.clientId, subject: identity.sub, email: typeof identity.email === 'string' ? identity.email.slice(0, 250) : null }, planEnabled: tokens.scopes.includes(PLAN_SCOPE) };
    },
    async refresh(previous) {
      if (!previous.refresh) throw failure('sign_in', 'Reconnect your ChatGPT account.', 401);
      const tokens = await token({ grant_type: 'refresh_token', refresh_token: previous.refresh }, previous);
      delete tokens.idToken;
      return tokens;
    },
    async revoke(tokens) {
      if (!tokens?.refresh) return false;
      const params = new URLSearchParams({ token: tokens.refresh, token_type_hint: 'refresh_token' });
      const response = await get((await discovery()).revocation_endpoint, { method: 'POST', headers: clientAuth(params), body: params });
      await response.body?.cancel();
      return response.status === 200;
    },
    async models(tokens) {
      const response = await get(RESOURCE + '/models', { headers: { Authorization: 'Bearer ' + tokens.access } });
      const body = await readJSON(response);
      if (!response.ok) throw providerError(body.error?.code, response.status);
      if (!Array.isArray(body.models) || body.models.length > 500) throw failure('models', 'The account’s model list could not be read.', 502);
      const seen = new Set();
      return body.models.filter(row => row.visibility === 'list' && typeof row.slug === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/+~-]{0,199}$/.test(row.slug) && typeof row.display_name === 'string' && !seen.has(row.slug) && seen.add(row.slug)).map((row, i) => ({ id: row.slug, name: row.display_name.slice(0, 200), isDefault: i === 0 }));
    },
    respond(tokens, body, signal) {
      return get(RESOURCE + '/responses', { method: 'POST', headers: { Authorization: 'Bearer ' + tokens.access, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
    }
  };
}
