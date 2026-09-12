import http from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import features from '../assets/ai-features.js';
import { CodexSession, RuntimeError, CODEX_VERSION } from './codex.mjs';

const SESSION_TTL = 4 * 60 * 60 * 1000;
const IDLE_TTL = 30 * 60 * 1000;
const MAX_BODY = 128 * 1024;
const digest = value => createHash('sha256').update(value).digest();
const error = (code, message, status) => new RuntimeError(code, message, status);
const secretField = /^(api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|secret|authorization|cookie|credentials|settings)$/i;

export function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw error('invalid_request', 'A question is required.', 400);
  const profile = features.get(body.tool);
  if (!profile?.enabled) throw error('feature_not_ready', 'This project’s AI workflow is not configured yet.', 422);
  if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 4000) throw error('invalid_prompt', 'Use a question between 1 and 4,000 characters.', 400);
  if (typeof body.model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:/+~-]{0,199}$/.test(body.model)) throw error('invalid_model', 'Choose a model from your connected account.', 400);
  if (body.consent !== true) throw error('consent_required', 'Review the selected context and confirm before sending.', 400);
  if (!['short', 'standard'].includes(body.responseLength)) throw error('invalid_length', 'Choose a short or standard response.', 400);
  if (!body.context || typeof body.context !== 'object' || Array.isArray(body.context)) throw error('invalid_context', 'Choose a valid context snapshot.', 400);
  const text = JSON.stringify(body.context, (key, value) => secretField.test(key) ? undefined : value);
  if (text.length > 24000) throw error('context_too_large', 'Choose a smaller run or section; nothing was sent.', 413);
  if (!['general', 'page-guide'].includes(profile.id) && !Object.keys(body.context).length) throw error('context_missing', 'Run this tool or select a source before asking about its results.', 400);
  return { tool: profile.id, prompt: body.prompt.trim(), model: body.model, context: JSON.parse(text), responseLength: body.responseLength };
}

export async function readJSON(request) {
  if (request.headers['content-type']?.split(';')[0] !== 'application/json') throw error('content_type', 'Use an application/json request.', 415);
  if (Number(request.headers['content-length']) > MAX_BODY) throw error('too_large', 'Request is too large.', 413);
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY) throw error('too_large', 'Request is too large.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw error('invalid_json', 'Request could not be read.', 400); }
}

export function createRuntimeServer({ origins, accessCodes, sessionFactory = () => CodexSession.create(), maxSessions = 8, now = Date.now } = {}) {
  if (!Array.isArray(accessCodes) || !accessCodes.length || accessCodes.some(code => !/^[a-zA-Z0-9_-]{32,128}$/.test(code))) throw new Error('Set OSIRIS_PILOT_CODES to one or more random 32–128 character access codes.');
  const allowed = new Set(origins || []);
  if (!allowed.size || [...allowed].some(origin => {
    try { const u = new URL(origin); return u.origin !== origin || (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))); } catch { return true; }
  })) throw new Error('OSIRIS_ALLOWED_ORIGINS must contain exact HTTPS origins (or localhost for development).');
  const codes = accessCodes.map(digest), sessions = new Map(), attempts = new Map();
  let closing = false;
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
  async function erase(id) {
    const session = sessions.get(id);
    if (!session) return;
    sessions.delete(id); session.abort?.abort();
    try { await (await session.runtime).close(); } catch { /* Already closed. */ }
  }
  const sweep = setInterval(() => {
    for (const [id, s] of sessions) if (now() >= s.expiresAt || (!s.abort && now() - s.lastUsed > IDLE_TTL)) void erase(id);
    for (const [ip, a] of attempts) if (now() - a.start > 60000) attempts.delete(ip);
  }, 30000); sweep.unref();
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Vary', 'Origin');
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    try {
      if (closing) throw error('closing', 'The connection service is restarting.', 503);
      const url = new URL(req.url, 'http://localhost');
      if (url.search) throw error('invalid_url', 'Use the connection service without query parameters.', 400);
      const route = url.pathname;
      if (route === '/health' && req.method === 'GET') {
        if (origin && !allowed.has(origin)) throw error('origin', 'This website is not allowed to use this service.', 403);
        json(res, 200, { ok: true, protocol: 3, service: 'osiris-subscription', release: 'private-pilot', provider: 'codex', codexVersion: CODEX_VERSION, billing: 'user-chatgpt-only', features: features.features.filter(f => f.enabled).map(f => f.id) }); return;
      }
      if (!origin || !allowed.has(origin)) throw error('origin', 'This website is not allowed to use this service.', 403);
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      if (route === '/v1/session' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || 'unknown';
        const previous = attempts.get(ip), attempt = previous && now() - previous.start < 60000 ? previous : { start: now(), count: 0 };
        if (attempts.size > 1000 && !attempts.has(ip)) throw error('rate_limit', 'Too many connection attempts. Wait before trying again.', 429);
        attempts.set(ip, attempt);
        if (++attempt.count > 12) throw error('rate_limit', 'Too many connection attempts. Wait before trying again.', 429);
        const body = await readJSON(req);
        const supplied = digest(typeof body?.accessCode === 'string' ? body.accessCode : '');
        let codeIndex = -1;
        codes.forEach((code, i) => { if (timingSafeEqual(supplied, code)) codeIndex = i; });
        if (codeIndex < 0) throw error('access_code', 'The pilot access code was not accepted.', 401);
        if (sessions.size >= maxSessions || [...sessions.values()].filter(s => s.codeIndex === codeIndex).length >= 2) throw error('capacity', 'This pilot has reached its connection limit. Disconnect an existing session first.', 429);
        const id = randomBytes(32).toString('base64url'), expiresAt = now() + SESSION_TTL;
        // Reserve capacity before awaiting process creation.
        const session = { codeIndex, origin, expiresAt, lastUsed: now(), runtime: null, abort: null, requests: [], statusAt: 0, cachedStatus: null };
        sessions.set(id, session);
        session.runtime = Promise.resolve().then(sessionFactory);
        try { await session.runtime; } catch (e) { await erase(id); throw e; }
        if (!sessions.has(id) || res.destroyed) { await erase(id); return; }
        json(res, 201, { token: id, expiresAt }); return;
      }
      const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1];
      const s = token && sessions.get(token);
      if (!s || s.origin !== origin) throw error('session_expired', 'Connect your ChatGPT account again.', 401);
      if (now() >= s.expiresAt || now() - s.lastUsed > IDLE_TTL) { await erase(token); throw error('session_expired', 'This connection expired. Sign in again.', 401); }
      s.lastUsed = now();
      if (route === '/v1/session' && req.method === 'DELETE') { await erase(token); json(res, 200, { disconnected: true }); return; }
      const runtime = await s.runtime;
      if (runtime.closed) { await erase(token); throw error('session_expired', 'The assistant session ended. Reconnect your account.', 401); }
      if (route === '/v1/account' && req.method === 'GET') {
        if (!s.cachedStatus || now() - s.statusAt > 2000) { s.cachedStatus = await runtime.account(); s.statusAt = now(); }
        json(res, 200, { ...s.cachedStatus, expiresAt: s.expiresAt }); return;
      }
      if (route === '/v1/login' && req.method === 'POST') {
        await readJSON(req); s.cachedStatus = null;
        const login = await runtime.startLogin();
        json(res, 200, { verificationUrl: login.verificationUrl, userCode: login.userCode, expiresAt: login.expiresAt }); return;
      }
      if (route === '/v1/models' && req.method === 'GET') { json(res, 200, { models: await runtime.models() }); return; }
      if (route === '/v1/limits' && req.method === 'GET') { json(res, 200, await runtime.limits()); return; }
      if (route === '/v1/assist' && req.method === 'POST') {
        const request = validateRequest(await readJSON(req));
        if (!(await runtime.account()).account) throw error('sign_in', 'Sign in to ChatGPT before asking a question.', 401);
        if (s.abort) throw error('busy', 'One question is already running in this connection.', 409);
        s.requests = s.requests.filter(time => now() - time < 60 * 60 * 1000);
        if (s.requests.length >= 30) throw error('pilot_limit', 'This pilot allows 30 questions per connection each hour.', 429);
        s.requests.push(now());
        const controller = new AbortController(); s.abort = controller;
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Accel-Buffering': 'no' });
        const emit = (event, data) => {
          if (res.destroyed || res.writableEnded) return;
          if (res.writableLength > 256 * 1024) { controller.abort(); res.destroy(); return; }
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };
        const abort = () => controller.abort(); res.on('close', abort);
        const heartbeat = setInterval(() => { if (!res.destroyed && !res.writableEnded) res.write(': keepalive\n\n'); }, 15000);
        emit('status', { message: 'Using your ChatGPT subscription through Codex.' });
        try { emit('done', await runtime.ask(request, emit, controller.signal)); }
        catch (e) { emit('error', { code: e instanceof RuntimeError ? e.code : 'runtime_error', message: e instanceof RuntimeError ? e.message : 'The assistant could not finish. No automatic retry was made.' }); }
        finally { clearInterval(heartbeat); res.removeListener('close', abort); s.abort = null; s.lastUsed = now(); res.end(); }
        return;
      }
      throw error('not_found', 'Unknown connection service route.', 404);
    } catch (e) {
      if (!res.headersSent && !res.destroyed) json(res, e instanceof RuntimeError ? e.status : 503, { error: { code: e instanceof RuntimeError ? e.code : 'unavailable', message: e instanceof RuntimeError ? e.message : 'The subscription service is unavailable. No request was retried.' } });
      else if (!res.destroyed) res.end();
    }
  });
  server.requestTimeout = 170000; server.headersTimeout = 10000;
  async function shutdown() {
    closing = true; clearInterval(sweep);
    await Promise.allSettled([...sessions.keys()].map(erase));
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
  return { server, shutdown };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, shutdown } = createRuntimeServer({
    origins: (process.env.OSIRIS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
    accessCodes: (process.env.OSIRIS_PILOT_CODES || '').split(',').map(s => s.trim()).filter(Boolean)
  });
  const port = Number(process.env.PORT || 8788), host = process.env.OSIRIS_BIND_HOST || '127.0.0.1';
  server.listen(port, host, () => process.stdout.write(`Osiris private pilot listening on ${host}:${port}. No provider account is connected.\n`));
  for (const event of ['SIGINT', 'SIGTERM']) process.once(event, () => void shutdown().then(() => process.exit(0)));
}
