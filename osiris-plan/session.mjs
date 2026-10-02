import { createProvider, seal, unseal } from './auth.mjs';
import { configuration, random, hash, json, readJSON, failure, errorResponse, PlanError, validateQuestion, consumeResponse, AUTH_MS, IDLE_MS, SESSION_MS, TURN_MS, PLAN_SCOPE, USAGE_URL } from './protocol.mjs';

export class PlanSession {
  constructor(ctx, env, providerFactory = createProvider) {
    this.ctx = ctx; this.env = env; this.providerFactory = providerFactory;
    this.queue = Promise.resolve(); this.active = null;
  }
  exclusive(fn) {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => {});
    return next;
  }
  async save(record) {
    await this.ctx.storage.put('record', await seal(record, this.env.TOKEN_ENCRYPTION_KEY, this.ctx.id.toString()));
    await this.ctx.storage.setAlarm(Math.min(record.expiresAt, record.lastUsed + IDLE_MS));
  }
  async load() {
    const value = await this.ctx.storage.get('record');
    if (!value) throw failure('sign_in', 'Connect your ChatGPT account.', 401);
    const record = await unseal(value, this.env.TOKEN_ENCRYPTION_KEY, this.ctx.id.toString());
    if (record.expiresAt <= Date.now() || record.lastUsed + IDLE_MS <= Date.now()) {
      await this.erase(record); throw failure('sign_in', 'This connection expired. Connect again.', 401);
    }
    return record;
  }
  async erase(record) {
    this.active?.abort(); this.active = null;
    // Clear local access even if revocation cannot be confirmed.
    await this.ctx.storage.deleteAll(); await this.ctx.storage.deleteAlarm();
    try { return await this.providerFactory(this.env, configuration(this.env)).revoke(record?.tokens); } catch { return false; }
  }
  async alarm() {
    return this.exclusive(async () => {
      const encrypted = await this.ctx.storage.get('record');
      if (!encrypted) { await this.ctx.storage.deleteAll(); return; }
      const record = await unseal(encrypted, this.env.TOKEN_ENCRYPTION_KEY, this.ctx.id.toString());
      if (Math.min(record.expiresAt, record.lastUsed + IDLE_MS) <= Date.now()) await this.erase(record);
      else await this.ctx.storage.setAlarm(Math.min(record.expiresAt, record.lastUsed + IDLE_MS));
    });
  }
  async fetch(request) {
    return this.exclusive(async () => {
      try { return await this.handle(request); } catch (error) { return errorResponse(error); }
    });
  }
  async handle(request) {
    const config = configuration(this.env), provider = this.providerFactory(this.env, config);
    const url = new URL(request.url), path = url.pathname;
    if (path === '/throttle') {
      const now = Date.now(); let bucket = await this.ctx.storage.get('bucket');
      if (!bucket || bucket.until <= now) bucket = { count: 0, until: now + AUTH_MS };
      if (++bucket.count > 12) throw failure('rate_limit', 'Too many connection attempts. Try again later.', 429);
      await this.ctx.storage.put('bucket', bucket); await this.ctx.storage.setAlarm(bucket.until);
      return json({ ok: true });
    }
    if (path === '/init') {
      const { returnTo } = await readJSON(request);
      const verifier = random();
      const transaction = { state: random(), nonce: random(), verifier, challenge: await hash(verifier), returnTo };
      const authorizationUrl = await provider.authorize(transaction);
      await this.save({ transaction, expiresAt: Date.now() + AUTH_MS, lastUsed: Date.now() });
      return json({ authorizationUrl });
    }
    let record = await this.load();
    if (path === '/retire') return json({ disconnected: true, revoked: await this.erase(record) });
    if (path === '/callback') {
      const transaction = record.transaction;
      if (!transaction || url.searchParams.get('state') !== transaction.state) throw failure('state', 'This sign-in could not be verified. Start again.', 400);
      // Consume the transaction before any exchange, including failed/denied attempts.
      await this.ctx.storage.deleteAll(); await this.ctx.storage.deleteAlarm();
      if (url.searchParams.has('error')) return json({ returnTo: transaction.returnTo, denied: true });
      const code = url.searchParams.get('code');
      if (!code || code.length > 8000) throw failure('code', 'OpenAI did not return a valid authorization code.');
      const result = await provider.exchange(code, transaction);
      record = { ...result, csrf: random(), publicId: random(), expiresAt: Date.now() + SESSION_MS, lastUsed: Date.now(), calls: [] };
      await this.save(record);
      return json({ returnTo: transaction.returnTo });
    }
    if (!record.identity) throw failure('sign_in', 'Finish connecting your ChatGPT account.', 401);
    if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('X-Osiris-CSRF') !== record.csrf) throw failure('csrf', 'Refresh the page before trying again.', 403);
    if (path === '/v1/session' && request.method === 'DELETE') return json({ disconnected: true, revoked: await this.erase(record) });
    if (path === '/v1/cancel' && request.method === 'POST') { this.active?.abort(); return json({ cancelled: true }); }
    if (path === '/v1/account') {
      record.lastUsed = Date.now(); await this.save(record);
      return json({ sessionId: record.publicId, csrf: record.csrf, expiresAt: record.expiresAt, account: { type: 'chatgpt', email: record.identity.email, planType: 'ChatGPT plan', planEnabled: record.planEnabled }, loginStatus: 'completed' });
    }
    if (path === '/v1/limits') return json({ manageUsageUrl: USAGE_URL });
    if (!record.planEnabled) throw failure('plan_permission', 'Sign-in succeeded, but permission to use your ChatGPT plan was not granted.', 403);
    if (path === '/v1/assist' && record.activeUntil > Date.now()) throw failure('busy', 'One question is already running.', 409);
    if (record.tokens.expiresAt - Date.now() < 60000) {
      try { record.tokens = await provider.refresh(record.tokens); }
      catch (error) { if (error.status === 401) await this.erase(record); throw error; }
      record.planEnabled = record.tokens.scopes.includes(PLAN_SCOPE);
      await this.save(record);
      if (!record.planEnabled) throw failure('plan_permission', 'Reconnect and allow ChatGPT plan usage.', 403);
    }
    if (path === '/v1/models') {
      const models = await provider.models(record.tokens);
      record.models = models; record.modelsAt = Date.now(); record.lastUsed = Date.now(); await this.save(record);
      return json({ models });
    }
    if (path !== '/v1/assist') throw failure('not_found', 'Unknown route.', 404);
    const input = validateQuestion(await readJSON(request));
    if (!record.models || Date.now() - record.modelsAt > 5 * 60 * 1000) { record.models = await provider.models(record.tokens); record.modelsAt = Date.now(); }
    if (!record.models.some(row => row.id === input.model)) throw failure('model_unavailable', 'Reload models and choose an available model.', 422);
    record.calls = record.calls.filter(time => time > Date.now() - 60 * 60 * 1000);
    if (record.calls.length >= 30) throw failure('usage_limit', 'This connection allows 30 questions per hour.', 429);
    const turnId = random();
    record.calls.push(Date.now()); record.activeId = turnId; record.activeUntil = Date.now() + TURN_MS; record.lastUsed = Date.now();
    await this.save(record);
    const controller = new AbortController(); this.active = controller;
    const timeout = setTimeout(() => controller.abort(), TURN_MS);
    const transform = new TransformStream(), writer = transform.writable.getWriter(), encoder = new TextEncoder();
    const emit = (event, data) => writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    // A cancel request/disconnect and a cancelled response stream both stop upstream work.
    writer.closed.catch(() => controller.abort());
    const task = (async () => {
      try {
        await emit('status', { message: 'Using your ChatGPT plan.' });
        if (controller.signal.aborted) throw failure('cancelled', 'Request stopped.', 409);
        const response = await provider.respond(record.tokens, input, controller.signal);
        const result = await consumeResponse(response, input.model, delta => emit('delta', { text: delta }), controller.signal);
        if (controller.signal.aborted) throw failure('cancelled', 'Request stopped.', 409);
        await emit('done', result);
      } catch (error) {
        const code = controller.signal.aborted ? 'cancelled' : error instanceof PlanError ? error.code : 'provider_unavailable';
        await emit('error', { code }).catch(() => {});
      } finally {
        clearTimeout(timeout); controller.abort();
        if (this.active === controller) this.active = null;
        await this.exclusive(async () => {
          // Disconnect/expiry may have erased the record. Never recreate it here.
          const saved = await this.ctx.storage.get('record');
          if (!saved) return;
          const latest = await unseal(saved, this.env.TOKEN_ENCRYPTION_KEY, this.ctx.id.toString());
          if (latest.publicId !== record.publicId || latest.activeId !== turnId) return;
          delete latest.activeId; delete latest.activeUntil; await this.save(latest);
        });
        await writer.close().catch(() => {});
      }
    })();
    this.ctx.waitUntil(task);
    return new Response(transform.readable, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}
