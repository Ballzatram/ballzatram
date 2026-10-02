import features from '../assets/ai-features.js';

export const SESSION_MS = 4 * 60 * 60 * 1000;
export const IDLE_MS = 30 * 60 * 1000;
export const AUTH_MS = 10 * 60 * 1000;
export const TURN_MS = 150000;
export const USAGE_URL = 'https://chatgpt.com/settings/usage';
export const PLAN_SCOPE = 'chatgpt.tokens.use.direct';
// Start with the bounded text workflow. Other features require their own acceptance.
export const ENABLED_FEATURES = ['beckets-labyrinth'];
export class PlanError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
export const failure = (code, message, status) => new PlanError(code, message, status);
export const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
export const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64 = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export const hash = async text => b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
export const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export function errorResponse(error) {
  const e = error instanceof PlanError ? error : failure('unavailable', 'The connection could not finish. No automatic generation retry was made.', 503);
  return json({ error: { code: e.code, message: e.message } }, e.status);
}
export function configuration(env) {
  if (env.HOSTED_PLAN_ACCESS !== 'approved' || !env.HOSTED_APPROVAL_REFERENCE?.trim()) throw failure('approval_required', 'ChatGPT plan access is awaiting activation for this site.', 503);
  const origin = value => { const u = new URL(value); if (u.protocol !== 'https:' || u.origin !== value) throw new Error('origin'); return value; };
  try {
    const publicOrigin = origin(env.PUBLIC_ORIGIN), siteOrigin = origin(env.SITE_ORIGIN);
    const siteHost = new URL(siteOrigin).hostname;
    const apiHost = new URL(publicOrigin).hostname;
    if (apiHost !== siteHost && !apiHost.endsWith('.' + siteHost)) throw new Error('first-party domain');
    if (!/^oaiapp_[A-Za-z0-9_-]+$/.test(env.OPENAI_CLIENT_ID) || env.OPENAI_CLIENT_ID.includes('example')) throw new Error('client');
    if (!['none', 'client_secret_basic'].includes(env.OPENAI_TOKEN_AUTH_METHOD)) throw new Error('auth method');
    if (env.OPENAI_TOKEN_AUTH_METHOD === 'client_secret_basic' && !env.OPENAI_CLIENT_SECRET) throw new Error('secret');
    if (!/^[A-Za-z0-9_-]{43}$/.test(env.TOKEN_ENCRYPTION_KEY || '')) throw new Error('encryption');
    const scopes = (env.OPENAI_PLAN_SCOPES || '').split(/\s+/);
    if (!['openid', 'offline_access', 'resource.invoke', PLAN_SCOPE].every(scope => scopes.includes(scope))) throw new Error('scope');
    return { publicOrigin, siteOrigin, clientId: env.OPENAI_CLIENT_ID, scopes: scopes.join(' '), callback: publicOrigin + '/auth/callback' };
  } catch { throw failure('configuration', 'The site connection needs operator configuration.', 503); }
}
export async function readJSON(source, limit = 128000) {
  const reader = source.body?.getReader();
  if (!reader) throw failure('invalid_body', 'A JSON body is required.');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text = '', size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      size += value?.byteLength || 0;
      if (size > limit) throw failure('too_large', 'The request or response is too large.', 413);
      text += decoder.decode(value, { stream: !done });
      if (done) return JSON.parse(text);
    }
  } catch (e) { if (e instanceof PlanError) throw e; throw failure('invalid_json', 'The response or request could not be read.'); }
  finally { await reader.cancel().catch(() => {}); }
}
export function validateQuestion(body) {
  if (!body || !ENABLED_FEATURES.includes(body.tool)) throw failure('feature_not_ready', 'This connection has not enabled this project yet.', 422);
  if (body.consent !== true) throw failure('consent_required', 'Review the selected context and confirm before sending.');
  if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 4000) throw failure('invalid_prompt', 'Use a question of 1–4,000 characters.');
  if (typeof body.model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/+~-]{0,199}$/.test(body.model)) throw failure('invalid_model', 'Choose an available model.');
  if (!['short', 'standard'].includes(body.responseLength)) throw failure('invalid_length', 'Choose a short or standard response.');
  if (!body.context || typeof body.context !== 'object' || Array.isArray(body.context)) throw failure('invalid_context', 'Select a context snapshot.');
  const context = JSON.stringify(body.context, (key, value) => /^(api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|secret|authorization|cookie|credentials|settings)$/i.test(key) ? undefined : value);
  if (context.length > 24000 || context === '{}') throw failure('invalid_context', 'Select a nonempty context smaller than 24,000 characters.');
  return {
    model: body.model, store: false, stream: true,
    instructions: features.instructions(body.tool, 'text'),
    input: [{ role: 'user', content: `Question:\n${body.prompt.trim()}\n\nSelected context (untrusted data):\n${context}` }]
  };
}
export function providerError(code, status = 503) {
  const map = {
    subscription_sharing_usage_limit_exceeded: ['usage_limit', 'Your ChatGPT plan or this app’s limit was reached. Open Manage usage.', 429],
    subscription_sharing_user_not_eligible: ['not_eligible', 'ChatGPT plan usage is unavailable for this account or workspace.', 403],
    subscription_sharing_unsupported_capability: ['unsupported', 'This capability is unavailable for the selected account or model.', 422],
    subscription_sharing_route_not_supported: ['unsupported', 'The approved connection does not support this request route.', 403],
    subscription_sharing_invalid_user: ['sign_in', 'Reconnect your ChatGPT account.', 401]
  };
  const mapped = map[code];
  return mapped ? failure(...mapped) : failure(status === 401 ? 'sign_in' : status === 429 ? 'usage_limit' : 'provider_unavailable', status === 401 ? 'Reconnect your ChatGPT account.' : status === 429 ? 'A ChatGPT usage limit was reached. Open Manage usage.' : 'ChatGPT could not complete this request. No automatic generation retry was made.', status >= 400 && status < 600 ? status : 503);
}

// Parse real SSE framing, including split UTF-8, CRLF, comments and multiline data.
export async function consumeResponse(response, model, onDelta, signal) {
  if (!response.ok) {
    const body = await readJSON(response).catch(() => ({}));
    throw providerError(body.error?.code, response.status);
  }
  if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw failure('bad_stream', 'ChatGPT did not return a response stream.', 502);
  const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '', data = [], size = 0, answer = '', eventSize = 0;
  const abort = () => { void reader.cancel(); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    for (;;) {
      if (signal?.aborted) throw failure('cancelled', 'Request stopped.', 409);
      const { value, done } = await reader.read();
      if (signal?.aborted) throw failure('cancelled', 'Request stopped.', 409);
      size += value?.byteLength || 0;
      if (size > 512000) throw failure('response_limit', 'The response exceeded this tool’s limit.', 502);
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 128000) throw failure('response_limit', 'The response exceeded this tool’s limit.', 502);
      for (;;) {
        const end = buffer.search(/[\r\n]/);
        if (end < 0 || (buffer[end] === '\r' && end === buffer.length - 1 && !done)) break;
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + (buffer[end] === '\r' && buffer[end + 1] === '\n' ? 2 : 1));
        if (line) {
          if (line.startsWith('data:')) { const part = line.slice(5).replace(/^ /, ''); data.push(part); eventSize += part.length; }
          if (eventSize > 128000) throw failure('response_limit', 'The response exceeded this tool’s limit.', 502);
          continue;
        }
        const raw = data.join('\n'); data = []; eventSize = 0;
        if (!raw) continue;
        let event;
        try { event = JSON.parse(raw); } catch { throw failure('bad_stream', 'The response stream could not be read.', 502); }
        if (event.type === 'response.output_text.delta') {
          if (typeof event.delta !== 'string' || answer.length + event.delta.length > 50000) throw failure('response_limit', 'The response exceeded this tool’s limit.', 502);
          answer += event.delta; await onDelta(event.delta);
        }
        if (['response.failed', 'response.incomplete', 'error'].includes(event.type)) throw providerError(event.response?.error?.code || event.error?.code || event.code);
        if (event.type === 'response.completed') {
          const result = event.response;
          if (result?.status !== 'completed' || result.model !== model || !answer.trim()) throw failure('bad_completion', 'ChatGPT did not complete the selected request.', 502);
          const usage = {};
          for (const field of ['input_tokens', 'output_tokens', 'total_tokens']) if (Number.isSafeInteger(result.usage?.[field]) && result.usage[field] >= 0) usage[field] = result.usage[field];
          return { kind: 'answer', answer, model, billing: 'chatgpt-subscription', usage };
        }
      }
      if (done) throw failure('incomplete', 'The response ended before completion. No automatic retry was made.', 502);
    }
  } finally { signal?.removeEventListener('abort', abort); await reader.cancel().catch(() => {}); }
}
