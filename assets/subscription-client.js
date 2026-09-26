/* Subscription transport only: no provider API keys, ambient auth, or inference fallback. */
(function (root, factory) {
  const value = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.BallzatramSubscription = value;
})(typeof window === 'undefined' ? globalThis : window, function (root) {
  'use strict';
  const PREFS = 'ballzatram:subscription-settings:v1', SESSION = 'ballzatram:subscription-session:v1';
  const TTL = 4 * 60 * 60 * 1000, MODEL = /^[a-zA-Z0-9][a-zA-Z0-9._:/+~-]{0,199}$/;
  let memorySettings, memorySession, connectionEpoch = 0, connecting = null, activeTurn = null;
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
    const configured = root.BallzatramAIConfig?.subscriptionUrl;
    const savedEndpoint = typeof value.endpoint === 'string' ? value.endpoint.trim() : '';
    let origin = '';
    // An old blank/invalid saved endpoint must never mask a newly activated public runtime.
    // Prefer a valid explicit endpoint, otherwise fall back to the site's public runtime.
    try { origin = endpoint(savedEndpoint || configured); }
    catch {
      try { origin = endpoint(configured); } catch { /* Runtime is genuinely unconfigured. */ }
    }
    return { endpoint: origin, model: typeof value.model === 'string' && MODEL.test(value.model) ? value.model : '' };
  }
  function clear(notify = true) {
    memorySession = null;
    try { root.sessionStorage.removeItem(SESSION); } catch { /* Memory-only mode. */ }
    if (notify) announce();
  }
  function invalidate() { connectionEpoch++; connecting = null; activeTurn?.abort(); }
  function configure(value) {
    const next = { endpoint: endpoint(value.endpoint), model: typeof value.model === 'string' && MODEL.test(value.model) ? value.model : '' };
    const previous = settings(), oldSession = connection();
    if (previous.endpoint !== next.endpoint) { invalidate(); clear(false); }
    else if (previous.model !== next.model) activeTurn?.abort();
    memorySettings = next; write('localStorage', PREFS, next); announce();
    // Best-effort cleanup is bound to the old origin, never the replacement service.
    if (oldSession && previous.endpoint !== next.endpoint) void removeRemoteSession(oldSession);
    return { ...next };
  }
  function account(value) {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'object' || Array.isArray(value) || value.type !== 'chatgpt') throw new Error('The service is not using a ChatGPT subscription.');
    return { type: 'chatgpt', email: typeof value.email === 'string' ? value.email.slice(0, 250) : null, planType: typeof value.planType === 'string' ? value.planType.slice(0, 60) : 'unknown' };
  }
  function connection() {
    const value = memorySession || read('sessionStorage', SESSION);
    if (!value) return null;
    if (typeof value !== 'object' || !/^[A-Za-z0-9_-]{43}$/.test(value.token || '') || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now() || value.expiresAt > Date.now() + TTL + 60000 || !value.endpoint || value.endpoint !== settings().endpoint) { clear(false); activeTurn?.abort(); return null; }
    try { return { token: value.token, expiresAt: value.expiresAt, endpoint: value.endpoint, account: account(value.account) }; }
    catch { clear(false); activeTurn?.abort(); return null; }
  }
  function saveSession(value) {
    memorySession = { token: value.token, expiresAt: value.expiresAt, endpoint: value.endpoint, account: account(value.account) };
    write('sessionStorage', SESSION, memorySession); announce();
  }
  function sameSession(c, epoch) { const current = connection(); return epoch === connectionEpoch && !!c && c.token === current?.token && c.endpoint === current.endpoint; }
  function changed() { return new Error('Connection setup was cancelled or changed. Reconnect before sending again.'); }
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
  async function readBoundedJSON(response) {
    if (!response.body?.getReader) {
      const value = await response.json();
      if (JSON.stringify(value).length > 128000) throw new Error('Response too large.');
      return value;
    }
    const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
    let text = '', size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        size += value?.byteLength || 0;
        if (size > 128000) throw new Error('Response too large.');
        text += decoder.decode(value, { stream: !done });
        if (done) return JSON.parse(text);
      }
    } finally { await reader.cancel().catch(() => {}); }
  }
  async function json(path, { method = 'GET', body, authenticated = true, signal, session: c = connection(), serviceEndpoint = authenticated ? c?.endpoint : settings().endpoint } = {}) {
    if (authenticated && !c) throw new Error('Connect your ChatGPT account first.');
    const epoch = connectionEpoch;
    const headers = { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(authenticated ? { Authorization: `Bearer ${c.token}` } : {}) };
    const response = await fetchSafe(endpoint(serviceEndpoint) + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: signal || AbortSignal.timeout(30000) });
    if (authenticated && !sameSession(c, epoch)) throw changed();
    if (!response.ok) {
      if (authenticated && response.status === 401 && sameSession(c, epoch)) { invalidate(); clear(); }
      const failure = new Error(messages[response.status] || `Subscription request failed (${response.status}). No automatic retry was made.`);
      failure.status = response.status;
      throw failure;
    }
    let result;
    try { result = await readBoundedJSON(response); } catch { throw new Error('The connection service returned an unreadable response.'); }
    if (authenticated && !sameSession(c, epoch)) throw changed();
    if (!result || typeof result !== 'object' || Array.isArray(result) || result.error) throw new Error('The connection service returned an unreadable response.');
    return result;
  }
  function pause(ms, signal) {
    if (signal?.aborted) return Promise.reject(new Error('Request stopped.'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Request stopped.')); }, { once: true });
    });
  }
  function wakeRetryable(error) {
    return [502, 503, 504].includes(error?.status) || /Could not reach the subscription service/.test(error?.message || '');
  }
  async function checkService(value = settings().endpoint, { signal, onStatus } = {}) {
    const serviceEndpoint = endpoint(value);
    let health, lastError;
    const wakeDelays = [0, 1500, 2500, 4000, 5000, 5000];
    for (let attempt = 0; attempt < wakeDelays.length; attempt++) {
      if (wakeDelays[attempt]) {
        onStatus?.(attempt === 1 ? 'Waking the free Osiris runtime…' : 'Osiris is still waking up…');
        await pause(wakeDelays[attempt], signal);
      }
      try {
        health = await json('/health', { authenticated: false, serviceEndpoint, signal });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (!wakeRetryable(error) || attempt === wakeDelays.length - 1) throw error;
      }
    }
    if (!health) throw lastError || new Error('Could not reach the subscription service.');
    if (health.protocol !== 3 || health.billing !== 'user-chatgpt-only' || health.service !== 'osiris-subscription') throw new Error('This address is not a compatible Osiris subscription service.');
    const capabilities = Array.isArray(health.capabilities) ? health.capabilities.filter(v => typeof v === 'string').slice(0, 50) : [];
    let runtimeReady = null;
    if (capabilities.includes('runtime-readiness-v1')) {
      let ready;
      try { ready = await json('/ready', { authenticated: false, serviceEndpoint, signal }); }
      catch (error) {
        if (error?.status === 503) throw new Error('The service is awake, but the Codex runtime readiness check failed. The operator needs to inspect the runtime.');
        throw error;
      }
      if (ready.service !== health.service || ready.protocol !== 3 || ready.billing !== health.billing || ready.runtimeReady !== true || ready.inferenceVerified !== false) throw new Error('The service is reachable but its subscription runtime is not ready. Ask its operator to run the deployment checks.');
      runtimeReady = true;
    }
    return { endpoint: serviceEndpoint, runtimeReady, capabilities, inferenceVerified: false };
  }
  async function connect(accessCode) {
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(accessCode || '')) throw new Error('Enter the pilot access code supplied by the service operator. This is not your ChatGPT password.');
    if (connecting) throw new Error('A connection is already starting. Wait for it to finish before trying again.');
    if (connection()) throw new Error('Disconnect the current session before connecting another account.');
    const current = connectionEpoch, serviceEndpoint = endpoint(settings().endpoint), attempt = {};
    connecting = attempt;
    let session;
    try {
      await checkService(serviceEndpoint);
      if (current !== connectionEpoch) throw changed();
      const result = await json('/v1/session', { method: 'POST', body: { accessCode }, authenticated: false, serviceEndpoint });
      if (!/^[A-Za-z0-9_-]{43}$/.test(result.token || '') || !Number.isFinite(result.expiresAt) || result.expiresAt <= Date.now() || result.expiresAt > Date.now() + TTL + 60000) throw new Error('The service returned an invalid session.');
      session = { token: result.token, expiresAt: result.expiresAt, endpoint: serviceEndpoint, account: null };
      if (current !== connectionEpoch) throw changed();
      saveSession(session);
      const login = await startLogin(session);
      if (current !== connectionEpoch) throw changed();
      return login;
    } catch (error) {
      if (session) { if (connection()?.token === session.token && connection()?.endpoint === session.endpoint) clear(); await removeRemoteSession(session); }
      throw error;
    } finally { if (connecting === attempt) connecting = null; }
  }
  async function startLogin(session = connection()) {
    const result = await json('/v1/login', { method: 'POST', body: {}, session });
    if (!['https://auth.openai.com/codex/device', 'https://chatgpt.com/codex/device'].includes(result.verificationUrl) || !/^[A-Za-z0-9-]{4,32}$/.test(result.userCode || '') || !Number.isFinite(result.expiresAt) || result.expiresAt <= Date.now() || result.expiresAt > Date.now() + 11 * 60 * 1000) throw new Error('The service returned an unexpected sign-in address or expired code.');
    return { verificationUrl: result.verificationUrl, userCode: result.userCode, expiresAt: result.expiresAt };
  }
  async function status() {
    const c = connection(), epoch = connectionEpoch, result = await json('/v1/account', { session: c });
    const sanitized = account(result.account);
    if (!sameSession(c, epoch)) throw changed();
    saveSession({ ...c, account: sanitized });
    return { account: sanitized, loginStatus: ['pending', 'completed', 'failed'].includes(result.loginStatus) ? result.loginStatus : null, expiresAt: c.expiresAt };
  }
  async function models() {
    const result = await json('/v1/models');
    if (!Array.isArray(result.models) || result.models.length > 500) throw new Error('Model list unavailable.');
    const seen = new Set();
    return result.models.filter(m => m && typeof m.id === 'string' && MODEL.test(m.id) && typeof m.name === 'string' && !seen.has(m.id) && seen.add(m.id))
      .map(m => ({ id: m.id, name: m.name.slice(0, 200), isDefault: m.isDefault === true }));
  }
  async function researchReady({ signal } = {}) {
    const service = await checkService(settings().endpoint, { signal });
    if (!service.capabilities.includes('parcel-research-v1')) throw new Error('This connection service needs the Parcel research update before it can search. No model request was sent.');
    return true;
  }
  async function disconnect() {
    const c = connection(); invalidate(); clear();
    return removeRemoteSession(c);
  }
  async function removeRemoteSession(c) {
    if (!c) return true;
    try {
      const result = await fetchSafe(c.endpoint + '/v1/session', { method: 'DELETE', headers: { Authorization: `Bearer ${c.token}` }, signal: AbortSignal.timeout(5000) });
      return result.ok || result.status === 401;
    } catch { return false; }
  }
  async function ask(request, { signal, onDelta, onStatus, consent = false, responseLength = 'standard' } = {}) {
    const c = connection(), s = settings(), epoch = connectionEpoch;
    if (!c?.account) throw new Error('Connect and sign in to your ChatGPT account first.');
    if (!consent) throw new Error('Review the selected context and confirm before sending.');
    if (!s.model) throw new Error('Choose a model from your connected account.');
    if (!['short', 'standard'].includes(responseLength)) throw new Error('Choose a short or standard response.');
    if (activeTurn) throw new Error('A question is already running. Stop it before sending another.');
    const controller = new AbortController(), cancel = () => controller.abort(); activeTurn = controller;
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) controller.abort();
    const ensureCurrent = () => {
      if (controller.signal.aborted) throw new Error('Request stopped. Work already started may count against your plan.');
      if (!sameSession(c, epoch)) throw changed();
    };
    const timer = setTimeout(cancel, 180000);
    let reader;
    try {
      ensureCurrent();
      const res = await fetchSafe(c.endpoint + '/v1/assist', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.token}` }, body: JSON.stringify({ ...request, model: s.model, consent, responseLength }), signal: controller.signal });
      ensureCurrent();
      if (!res.ok) { if (res.status === 401 && sameSession(c, epoch)) { invalidate(); clear(); } throw new Error(messages[res.status] || 'The subscription request failed.'); }
      if (!res.headers.get('content-type')?.toLowerCase().includes('text/event-stream') || !res.body) throw new Error('The service did not return an assistant stream.');
      reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let buffer = '', received = 0, event = '', dataLines = [], eventSize = 0, outputSize = 0;
      while (true) {
        ensureCurrent();
        let chunk;
        try { chunk = await reader.read(); }
        catch {
          ensureCurrent();
          throw new Error('The connection ended before the answer finished. No automatic retry was made.');
        }
        const { value, done } = chunk; ensureCurrent();
        received += value?.byteLength || 0;
        if (received > 512000) throw new Error('The assistant response exceeded this pilot’s response limit.');
        try { buffer += decoder.decode(value, { stream: !done }); } catch { throw new Error('The assistant stream contains invalid text.'); }
        if (buffer.length > 128000) throw new Error('The assistant response exceeded this pilot’s response limit.');
        // SSE is line-oriented. A CR may be split from its LF in the next network chunk.
        while (true) {
          const end = buffer.search(/[\r\n]/);
          if (end < 0 || (buffer[end] === '\r' && end === buffer.length - 1 && !done)) break;
          const line = buffer.slice(0, end);
          buffer = buffer.slice(end + (buffer[end] === '\r' && buffer[end + 1] === '\n' ? 2 : 1));
          if (line) {
            if (line.startsWith(':')) continue;
            const colon = line.indexOf(':'), field = colon < 0 ? line : line.slice(0, colon);
            const text = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
            if (field === 'event') event = text;
            if (field === 'data') { eventSize += text.length + 1; if (eventSize > 128000) throw new Error('The assistant event exceeded this pilot’s response limit.'); dataLines.push(text); }
            continue;
          }
          const type = event, raw = dataLines.join('\n'); event = ''; dataLines = []; eventSize = 0;
          if (!raw || !['delta', 'status', 'error', 'done'].includes(type)) continue;
          let data;
          try { data = JSON.parse(raw); } catch { throw new Error('The assistant stream could not be read.'); }
          if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The assistant stream could not be read.');
          ensureCurrent();
          if (type === 'delta') {
            if (typeof data.text !== 'string' || (outputSize += data.text.length) > 50000) throw new Error('The assistant response exceeded this pilot’s response limit.');
            onDelta?.(data.text);
          }
          if (type === 'status' && typeof data.message === 'string') onStatus?.(data.message.slice(0, 300));
          if (type === 'error') throw new Error(data.code === 'sign_in' ? 'Sign in to ChatGPT again.' : data.code === 'model_unavailable' ? 'Reload the model list and choose an available model.' : data.code === 'cancelled' ? 'Request stopped. Work already started may count against your plan.' : 'The assistant did not finish. Check your connection and ChatGPT limits; no automatic retry was made.');
          if (type === 'done') {
            if (typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 50000 || data.billing !== 'chatgpt-subscription' || data.model !== s.model) throw new Error('The assistant returned an invalid response.');
            return { ...data, kind: 'answer' };
          }
        }
        if (done) throw new Error('The connection ended before the answer finished. No automatic retry was made.');
      }
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', cancel); controller.abort();
      if (reader) await reader.cancel().catch(() => {});
      if (activeTurn === controller) activeTurn = null;
    }
  }
  return Object.freeze({ settings, configure, connection, endpoint, connect, startLogin, status, models, disconnect, ask, researchReady, checkService, limits: () => json('/v1/limits') });
});
