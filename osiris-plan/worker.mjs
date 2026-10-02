import { PlanSession } from './session.mjs';
import { configuration, random, hash, json, readJSON, failure, errorResponse, AUTH_MS, SESSION_MS, ENABLED_FEATURES } from './protocol.mjs';
export { PlanSession };
const SESSION_COOKIE = '__Host-osiris-plan', AUTH_COOKIE = '__Host-osiris-auth';
const cookie = (name, value, seconds) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
function cookieValue(request, name) {
  const values = (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).filter(s => s.startsWith(name + '='));
  const value = values.length === 1 ? values[0].slice(name.length + 1) : '';
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
const stub = (env, name) => env.SESSIONS.get(env.SESSIONS.idFromName(name));
export default {
  async fetch(request, env) {
    const url = new URL(request.url), origin = request.headers.get('Origin');
    let response;
    try {
      if (url.pathname === '/health' && request.method === 'GET') {
        let ready = false;
        try { configuration(env); ready = true; } catch { /* Configuration is not entitlement verification. */ }
        response = json({ service: 'osiris-chatgpt-plan', protocol: 4, billing: 'user-chatgpt-only', ready, inferenceVerified: false, features: ENABLED_FEATURES });
      } else {
        const config = configuration(env);
        if (url.origin !== config.publicOrigin) throw failure('origin', 'Use the configured connection address.', 403);
        if (url.pathname === '/auth/start' && request.method === 'GET') {
          const returnTo = new URL(url.searchParams.get('returnTo') || config.siteOrigin + '/tools/beckets-labyrinth/');
          if (returnTo.origin !== config.siteOrigin || !returnTo.pathname.startsWith('/') || returnTo.username || returnTo.password) throw failure('return_url', 'The return address is not allowed.');
          const limiter = stub(env, 'rate:' + await hash((request.headers.get('CF-Connecting-IP') || 'unknown') + env.TOKEN_ENCRYPTION_KEY));
          const admission = await limiter.fetch(new Request(config.publicOrigin + '/throttle'));
          if (!admission.ok) throw failure('rate_limit', 'Too many connection attempts. Try again later.', 429);
          const id = random();
          const created = await stub(env, id).fetch(new Request(config.publicOrigin + '/init', { method: 'POST', body: JSON.stringify({ returnTo: returnTo.origin + returnTo.pathname }) }));
          const result = await readJSON(created);
          if (!created.ok) throw failure('sign_in', 'The connection could not start. Try again later.', created.status);
          response = new Response(null, { status: 302, headers: { Location: result.authorizationUrl, 'Set-Cookie': cookie(AUTH_COOKIE, id, AUTH_MS / 1000) } });
        } else if (url.pathname === '/auth/callback' && request.method === 'GET') {
          const id = cookieValue(request, AUTH_COOKIE);
          if (!id) throw failure('state', 'This sign-in belongs to another browser or expired. Start again.');
          const resultResponse = await stub(env, id).fetch(new Request(config.publicOrigin + '/callback' + url.search));
          const result = await readJSON(resultResponse);
          const headers = new Headers({ Location: (resultResponse.ok ? result.returnTo : config.siteOrigin + '/tools/beckets-labyrinth/') + '?osiris=' + (resultResponse.ok && !result.denied ? 'connected' : 'not-connected') });
          headers.append('Set-Cookie', cookie(AUTH_COOKIE, '', 0));
          if (resultResponse.ok && !result.denied) headers.append('Set-Cookie', cookie(SESSION_COOKIE, id, SESSION_MS / 1000));
          const oldId = cookieValue(request, SESSION_COOKIE);
          if (resultResponse.ok && !result.denied && oldId && oldId !== id) await stub(env, oldId).fetch(new Request(config.publicOrigin + '/retire', { method: 'POST' }));
          response = new Response(null, { status: 302, headers });
        } else {
          if (origin !== config.siteOrigin) throw failure('origin', 'This website cannot use this connection.', 403);
          const routes = { '/v1/account': 'GET', '/v1/models': 'GET', '/v1/limits': 'GET', '/v1/assist': 'POST', '/v1/cancel': 'POST', '/v1/session': 'DELETE' };
          if (!routes[url.pathname] || url.search) throw failure('not_found', 'Unknown connection route.', 404);
          if (request.method === 'OPTIONS') response = new Response(null, { status: 204 });
          else {
            if (request.method !== routes[url.pathname]) throw failure('method', 'Unsupported method.', 405);
            if (request.method === 'POST' && request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') throw failure('content_type', 'Use JSON for this request.', 415);
            const id = cookieValue(request, SESSION_COOKIE);
            if (!id) throw failure('sign_in', 'Connect your ChatGPT account.', 401);
            response = await stub(env, id).fetch(request);
            if (request.method === 'DELETE' && response.ok) {
              response = new Response(response.body, response);
              response.headers.append('Set-Cookie', cookie(SESSION_COOKIE, '', 0));
            }
          }
        }
      }
    } catch (error) { response = errorResponse(error); }
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store'); headers.set('Referrer-Policy', 'no-referrer'); headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Vary', 'Origin');
    if (origin && origin === env.SITE_ORIGIN) {
      headers.set('Access-Control-Allow-Origin', origin); headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Osiris-CSRF');
    }
    return new Response(response.body, { status: response.status, headers });
  }
};
