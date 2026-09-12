(function (root, factory) {
  const value = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.BallzatramSubscription = value;
})(typeof window === 'undefined' ? globalThis : window, function (root) {
  'use strict';
  const PREFS = 'ballzatram:subscription-settings:v1', SESSION = 'ballzatram:subscription-session:v1';
  let memorySettings, memorySession, connectionEpoch = 0, connecting = false;
  function read(storage, key) { try { return JSON.parse(root[storage].getItem(key) || 'null'); } catch { return null; } }
  function write(storage, key, value) { try { root[storage].setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
  function announce() { if (root.dispatchEvent && root.CustomEvent) root.dispatchEvent(new root.CustomEvent('ballzatram:ai-connection-change')); }
  function endpoint(value) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Enter the HTTPS address of your Osiris connection service.'); }
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Use an HTTPS service origin without a path or credentials. Localhost is allowed for development.');
    return url.origin;
  }
  function settings() {
    const value = memorySettings || read('localStorage', PREFS) || {};
    return { endpoint: typeof value.endpoint === 'string' ? value.endpoint.slice(0, 2048) : (root.BallzatramAIConfig?.subscriptionUrl || ''), model: typeof value.model === 'string' ? value.model.slice(0, 200) : '' };
  }
  function configure(value) {
    const nextEndpoint = endpoint(value.endpoint);
    if (settings().endpoint !== nextEndpoint) connectionEpoch++;
    memorySettings = { endpoint: nextEndpoint, model: typeof value.model === 'string' ? value.model.slice(0, 200) : '' };
    write('localStorage', PREFS, memorySettings); announce(); return memorySettings;
  }
  function connection() {
    const value = memorySession || read('sessionStorage', SESSION);
    if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value.token || '') || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now() || value.endpoint !== settings().endpoint) return null;
    return value;
  }
  function saveSession(value) { memorySession = value; write('sessionStorage', SESSION, value); announce(); }
  function clear() { memorySession = null; try { root.sessionStorage.removeItem(SESSION); } catch { /* Memory-only mode. */ } announce(); }
  const messages = {
    401: 'Connection or pilot access code was rejected. Reconnect your account.',
    403: 'This website is not allowed by the connection service.',
    404: 'The Osiris subscription service is not configured at this address.',
    409: 'A question is already running, or the request was stopped.',
    413: 'Choose a smaller question or context snapshot.',
    422: 'This project’s AI workflow needs configuration before it can use this connection.',
    429: 'An account or pilot limit was reached. Wait before trying again.',
    503: 'The subscription service is not available. It may need to be started by its operator.'
  };
  async function fetchSafe(url, options) {
    try { return await root.fetch(url, { ...options, cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' }); }
    catch (e) { if (e.name === 'AbortError' || options.signal?.aborted) throw new Error('Request stopped. Work already started may count against your plan.'); throw new Error('Could not reach the subscription service. No automatic retry was made.'); }
  }
  async function json(path, { method = 'GET', body, authenticated = true, signal, session: c = connection(), serviceEndpoint = authenticated ? c?.endpoint : settings().endpoint } = {}) {
    if (authenticated && !c) throw new Error('Connect your ChatGPT account first.');
    const headers = { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(authenticated ? { Authorization: `Bearer ${c.token}` } : {}) };
    const response = await fetchSafe(endpoint(serviceEndpoint) + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: signal || AbortSignal.timeout(30000) });
    if (!response.ok) { if (authenticated && response.status === 401 && c.token === connection()?.token) clear(); throw new Error(messages[response.status] || `Subscription request failed (${response.status}). No automatic retry was made.`); }
    try { return await response.json(); } catch { throw new Error('The connection service returned an unreadable response.'); }
  }
  async function connect(accessCode) {
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(accessCode || '')) throw new Error('Enter the pilot access code supplied by the service operator. This is not your ChatGPT password.');
    if (connecting) throw new Error('A connection is already starting. Wait for it to finish before trying again.');
    const current = connectionEpoch, serviceEndpoint = endpoint(settings().endpoint);
    connecting = true;
    let session;
    try {
      const health = await json('/health', { authenticated: false, serviceEndpoint });
      if (current !== connectionEpoch) throw new Error('Connection setup was cancelled.');
      if (health.protocol !== 3 || health.billing !== 'user-chatgpt-only' || health.service !== 'osiris-subscription') throw new Error('This address is not a compatible Osiris subscription service.');
      const result = await json('/v1/session', { method: 'POST', body: { accessCode }, authenticated: false, serviceEndpoint });
      if (!/^[A-Za-z0-9_-]{43}$/.test(result.token || '') || !Number.isFinite(result.expiresAt) || result.expiresAt <= Date.now() || result.expiresAt > Date.now() + 4 * 60 * 60 * 1000 + 60000) throw new Error('The service returned an invalid session.');
      session = { token: result.token, expiresAt: result.expiresAt, endpoint: serviceEndpoint, account: null };
      if (current !== connectionEpoch) throw new Error('Connection setup was cancelled.');
      saveSession(session);
      const login = await startLogin(session);
      if (current !== connectionEpoch) throw new Error('Connection setup was cancelled.');
      return login;
    } catch (error) {
      if (session) { if (connection()?.token === session.token) clear(); await removeRemoteSession(session); }
      throw error;
    } finally { connecting = false; }
  }
  async function startLogin(session = connection()) {
    const result = await json('/v1/login', { method: 'POST', body: {}, session });
    if (!['https://auth.openai.com/codex/device', 'https://chatgpt.com/codex/device'].includes(result.verificationUrl) || !/^[A-Za-z0-9-]{4,32}$/.test(result.userCode || '') || !Number.isFinite(result.expiresAt)) throw new Error('The service returned an unexpected sign-in address.');
    return result;
  }
  async function status() {
    const c = connection(), result = await json('/v1/account', { session: c });
    if (result.account && result.account.type !== 'chatgpt') throw new Error('The service is not using a ChatGPT subscription.');
    if (c?.token === connection()?.token) saveSession({ ...c, account: result.account || null });
    return result;
  }
  async function models() { const result = await json('/v1/models'); if (!Array.isArray(result.models)) throw new Error('Model list unavailable.'); return result.models; }
  async function disconnect() {
    const c = connection();
    connectionEpoch++; clear();
    return removeRemoteSession(c);
  }
  async function removeRemoteSession(c) {
    if (!c) return true;
    try {
      const result = await fetchSafe(c.endpoint + '/v1/session', { method: 'DELETE', headers: { Authorization: `Bearer ${c.token}` }, signal: AbortSignal.timeout(5000) });
      return result.ok || result.status === 401;
    } catch { return false; }
  }
  async function ask(request, { signal, onDelta, consent = false, responseLength = 'standard' } = {}) {
    const c = connection(), s = settings();
    if (!c?.account) throw new Error('Connect and sign in to your ChatGPT account first.');
    if (!consent) throw new Error('Review the selected context and confirm before sending.');
    if (!s.model) throw new Error('Choose a model from your connected account.');
    const controller = new AbortController(), cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(cancel, 180000);
    let reader;
    try {
      const res = await fetchSafe(c.endpoint + '/v1/assist', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.token}` }, body: JSON.stringify({ ...request, model: s.model, consent, responseLength }), signal: controller.signal });
      if (!res.ok) { if (res.status === 401 && c.token === connection()?.token) clear(); throw new Error(messages[res.status] || 'The subscription request failed.'); }
      if (!res.headers.get('content-type')?.includes('text/event-stream') || !res.body) throw new Error('The service did not return an assistant stream.');
      reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '', received = 0;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        received += value?.byteLength || 0;
        if (received > 512000 || buffer.length > 128000) throw new Error('The assistant response exceeded this pilot’s response limit.');
        let end;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, end); buffer = buffer.slice(end + 2);
          const event = block.split('\n').find(line => line.startsWith('event: '))?.slice(7);
          const dataLine = block.split('\n').find(line => line.startsWith('data: '));
          if (!dataLine) continue;
          let data; try { data = JSON.parse(dataLine.slice(6)); } catch { throw new Error('The assistant stream could not be read.'); }
          if (event === 'delta' && typeof data.text === 'string') onDelta?.(data.text);
          if (event === 'error') throw new Error(data.code === 'sign_in' ? 'Sign in to ChatGPT again.' : data.code === 'model_unavailable' ? 'Reload the model list and choose an available model.' : data.code === 'cancelled' ? 'Request stopped. Work already started may count against your plan.' : 'The assistant did not finish. Check your connection and ChatGPT limits; no automatic retry was made.');
          if (event === 'done') {
            if (typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 50000 || data.billing !== 'chatgpt-subscription') throw new Error('The assistant returned an invalid response.');
            return data;
          }
        }
        if (done) throw new Error('The connection ended before the answer finished. No automatic retry was made.');
      }
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); if (reader) await reader.cancel().catch(() => {}); }
  }
  return Object.freeze({ settings, configure, connection, endpoint, connect, startLogin, status, models, disconnect, ask, limits: () => json('/v1/limits') });
});
