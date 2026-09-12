import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import features from '../assets/ai-features.js';

export const CODEX_VERSION = '0.154.0';
const require = createRequire(import.meta.url);
function nativeExecutable() {
  const platforms = { linux: { x64: 'x86_64-unknown-linux-musl', arm64: 'aarch64-unknown-linux-musl' }, darwin: { x64: 'x86_64-apple-darwin', arm64: 'aarch64-apple-darwin' } };
  const triple = platforms[process.platform]?.[process.arch];
  if (!triple) throw new Error('Use Linux or macOS on x64/arm64, or the supplied Linux container.');
  const installed = require.resolve(`@openai/codex-${process.platform}-${process.arch}/package.json`);
  return path.join(path.dirname(installed), 'vendor', triple, 'bin', 'codex');
}
const DISABLED = ['shell_tool', 'unified_exec', 'code_mode', 'code_mode_host', 'apps', 'plugins', 'remote_plugin', 'browser_use', 'browser_use_external', 'computer_use', 'image_generation', 'view_image', 'multi_agent', 'multi_agent_v2', 'hooks', 'memories', 'skill_search', 'skill_mcp_dependency_install', 'tool_suggest', 'sleep_tool', 'workspace_dependencies', 'unbounded_connection_retries'];
const APPROVALS = { granular: { sandbox_approval: false, rules: false, skill_approval: false, request_permissions: false, mcp_elicitations: false } };
export class RuntimeError extends Error {
  constructor(code, message, status = 502) { super(message); this.code = code; this.status = status; }
}
const unavailable = () => new RuntimeError('runtime_unavailable', 'The subscription service could not complete this operation. Reconnect and check your ChatGPT account.');

// No parent API keys, auth cache, plugin configuration, or model endpoint overrides.
export function childEnvironment(directory) {
  const env = { PATH: process.env.PATH || '', LANG: 'C.UTF-8', TMPDIR: directory };
  // CODEX_HOME is used for its documented purpose in this child only. Never change the host process environment.
  env.CODEX_HOME = path.join(directory, 'codex');
  env.HOME = directory;
  return env;
}

export class CodexSession extends EventEmitter {
  constructor(child, directory) {
    super(); this.child = child; this.directory = directory; this.pending = new Map(); this.counter = 0;
    this.buffer = ''; this.closed = false; this.login = null; this.busy = false; this.modelRows = [];
    this.exited = new Promise(resolve => { child.once('exit', resolve); child.once('error', resolve); });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', data => this.read(data));
    // Do not log raw stderr, prompts, login URLs, or account credentials.
    child.stderr.on('data', () => {});
    child.on('error', () => this.fail()); child.on('exit', () => this.fail());
  }
  static async create() {
    const binary = nativeExecutable();
    const directory = await mkdtemp(path.join(tmpdir(), 'osiris-session-'));
    await mkdir(path.join(directory, 'codex'), { mode: 0o700 });
    await mkdir(path.join(directory, 'workspace'), { mode: 0o700 });
    const config = [
      'cli_auth_credentials_store = "ephemeral"', 'forced_login_method = "chatgpt"',
      'model_provider = "openai"', 'sandbox_mode = "read-only"',
      'approval_policy = { granular = { sandbox_approval = false, rules = false, skill_approval = false, request_permissions = false, mcp_elicitations = false } }',
      'web_search = "disabled"', 'project_doc_max_bytes = 0',
      '[history]', 'persistence = "none"', '[features]',
      ...DISABLED.map(key => `${key} = false`)
    ].join('\n');
    await writeFile(path.join(directory, 'codex', 'config.toml'), config, { mode: 0o600 });
    // Spawn the pinned native executable directly so termination cannot leave an npm-launcher grandchild alive.
    const child = spawn(binary, ['app-server', '--listen', 'stdio://'], {
      cwd: path.join(directory, 'workspace'), env: childEnvironment(directory), stdio: ['pipe', 'pipe', 'pipe']
    });
    const session = new CodexSession(child, directory);
    try {
      await session.rpc('initialize', { clientInfo: { name: 'ballzatram_osiris', title: 'Ballzatram Osiris', version: '0.1.0' }, capabilities: { experimentalApi: false } });
      session.send({ method: 'initialized' });
      const state = await session.account();
      if (state.account) throw new RuntimeError('ambient_auth', 'Runtime isolation check failed.', 503);
      return session;
    } catch (error) { await session.close(); throw error; }
  }
  send(message) {
    if (this.closed || !this.child.stdin.writable) throw unavailable();
    this.child.stdin.write(JSON.stringify(message) + '\n');
  }
  rpc(method, params = {}, timeout = 20000) {
    if (this.closed) return Promise.reject(unavailable());
    return new Promise((resolve, reject) => {
      const id = ++this.counter;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new RuntimeError('runtime_timeout', 'The subscription service timed out. No request will be retried automatically.', 504)); }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      try { this.send({ id, method, params }); } catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  read(chunk) {
    this.buffer += chunk;
    if (this.buffer.length > 1024 * 1024) { this.fail(); this.child.kill('SIGKILL'); return; }
    let index;
    while ((index = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, index); this.buffer = this.buffer.slice(index + 1);
      let message;
      try { message = JSON.parse(line); } catch { this.fail(); this.child.kill('SIGKILL'); return; }
      if (message.method && message.id !== undefined) {
        // No browser endpoint can approve an agent action or forward arbitrary JSON-RPC.
        const method = message.method;
        const result = /requestApproval$/.test(method) && !method.includes('permissions') ? { decision: 'decline' }
          : method === 'item/permissions/requestApproval' ? { permissions: {}, scope: 'turn' }
          : method === 'item/tool/requestUserInput' ? { answers: {} }
          : method === 'mcpServer/elicitation/request' ? { action: 'decline', content: null } : null;
        try { this.send(result ? { id: message.id, result } : { id: message.id, error: { code: -32601, message: 'This assistant has no action tools.' } }); } catch { /* Closing. */ }
      } else if (message.id !== undefined) {
        const call = this.pending.get(message.id);
        if (!call) continue;
        clearTimeout(call.timer); this.pending.delete(message.id);
        // Provider errors may contain credentials. Only classify known codes, never forward their text.
        if (message.error) call.reject(unavailable()); else call.resolve(message.result);
      } else if (typeof message.method === 'string') {
        if (message.method === 'account/login/completed' && message.params?.loginId === this.login?.loginId) {
          this.login = { ...this.login, status: message.params.success ? 'completed' : 'failed' };
        }
        this.emit('notification', message);
      }
    }
  }
  fail() {
    if (this.closed) return;
    this.closed = true;
    for (const call of this.pending.values()) { clearTimeout(call.timer); call.reject(unavailable()); }
    this.pending.clear(); this.emit('closed');
  }
  async account() {
    const result = await this.rpc('account/read', { refreshToken: false });
    const raw = result?.account;
    if (raw && raw.type !== 'chatgpt') throw new RuntimeError('wrong_auth', 'This connection accepts ChatGPT subscription sign-in only.', 401);
    return { account: raw ? { type: 'chatgpt', email: typeof raw.email === 'string' ? raw.email.slice(0, 250) : null, planType: String(raw.planType || 'unknown').slice(0, 60) } : null, loginStatus: this.login?.status || null };
  }
  async startLogin() {
    if (this.busy) throw new RuntimeError('busy', 'Finish or cancel the active request first.', 409);
    if (this.login?.status === 'pending' && this.login.expiresAt > Date.now()) return this.login;
    if (this.loginPromise) return this.loginPromise;
    this.loginPromise = (async () => {
      const result = await this.rpc('account/login/start', { type: 'chatgptDeviceCode' });
      if (result?.type !== 'chatgptDeviceCode' || !['https://auth.openai.com/codex/device', 'https://chatgpt.com/codex/device'].includes(result.verificationUrl) || !/^[A-Za-z0-9-]{4,32}$/.test(result.userCode || '') || typeof result.loginId !== 'string') throw unavailable();
      this.login = { loginId: result.loginId, verificationUrl: result.verificationUrl, userCode: result.userCode, status: 'pending', expiresAt: Date.now() + 10 * 60 * 1000 };
      return this.login;
    })();
    try { return await this.loginPromise; } finally { this.loginPromise = null; }
  }
  async models() {
    if (!(await this.account()).account) throw new RuntimeError('sign_in', 'Sign in to ChatGPT first.', 401);
    const rows = []; let cursor = null;
    for (let page = 0; page < 5; page++) {
      const result = await this.rpc('model/list', { cursor, limit: 100, includeHidden: false });
      for (const model of result?.data || []) {
        if (!model.hidden && typeof model.model === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:/+~-]{0,199}$/.test(model.model) && (!model.inputModalities || model.inputModalities.includes('text'))) rows.push({ id: model.model, name: String(model.displayName || model.model).slice(0, 200), isDefault: model.isDefault === true });
      }
      cursor = result?.nextCursor;
      if (!cursor) break;
    }
    this.modelRows = rows;
    return rows;
  }
  async limits() {
    if (!(await this.account()).account) throw new RuntimeError('sign_in', 'Sign in to ChatGPT first.', 401);
    const raw = await this.rpc('account/rateLimits/read');
    const bucket = value => value && Number.isFinite(value.usedPercent) ? { usedPercent: value.usedPercent, resetsAt: Number.isFinite(value.resetsAt) ? value.resetsAt : null } : null;
    return { primary: bucket(raw?.rateLimits?.primary), secondary: bucket(raw?.rateLimits?.secondary) };
  }
  async ask(request, emit, signal) {
    if (this.busy) throw new RuntimeError('busy', 'One question is already running in this connection.', 409);
    this.busy = true;
    let threadId, turnId, subscription, deadline, rejectTurn, onClosed, aborted = false;
    const stop = () => {
      aborted = true;
      if (threadId && turnId) this.rpc('turn/interrupt', { threadId, turnId }, 3000).catch(() => this.close());
      rejectTurn?.(new RuntimeError('cancelled', 'Request stopped. Work already started may count against your plan.', 409));
    };
    signal?.addEventListener('abort', stop, { once: true });
    try {
      if (signal?.aborted) throw new RuntimeError('cancelled', 'Request cancelled.', 409);
      if (!(await this.account()).account) throw new RuntimeError('sign_in', 'Sign in to ChatGPT first.', 401);
      const rows = await this.models();
      if (!rows.some(row => row.id === request.model)) throw new RuntimeError('model_unavailable', 'Choose a model currently available to your ChatGPT account.', 400);
      const started = await this.rpc('thread/start', {
        model: request.model, modelProvider: 'openai', cwd: path.join(this.directory, 'workspace'),
        sandbox: 'read-only', approvalPolicy: APPROVALS, ephemeral: true,
        baseInstructions: features.instructions(request.tool),
        developerInstructions: `Answer length preference: about ${request.responseLength === 'short' ? '150' : '350'} words. This is a preference, not a hard token limit. You have no application action tools.`,
        config: { web_search: 'disabled', model_provider: 'openai' }
      });
      threadId = started?.thread?.id;
      if (typeof threadId !== 'string') throw unavailable();
      if (aborted) throw new RuntimeError('cancelled', 'Request cancelled before generation.', 409);
      const completion = new Promise((resolve, reject) => {
        rejectTurn = reject;
        let output = '', final = '', usage = null;
        onClosed = () => reject(unavailable());
        this.once('closed', onClosed);
        subscription = message => {
          const p = message.params;
          if (p?.threadId !== threadId) return;
          if (message.method === 'turn/started') { turnId = p.turn?.id; if (aborted) stop(); }
          if (message.method === 'item/agentMessage/delta' && typeof p.delta === 'string') {
            output += p.delta;
            if (output.length > 50000) { stop(); return; }
            emit('delta', { text: p.delta });
          }
          if (message.method === 'item/completed' && p.item?.type === 'agentMessage' && typeof p.item.text === 'string') final = p.item.text;
          if (message.method === 'thread/tokenUsage/updated') usage = p.tokenUsage?.last || null;
          if (message.method === 'turn/completed') {
            this.removeListener('closed', onClosed);
            if (p.turn?.status !== 'completed') { reject(new RuntimeError('generation_failed', 'The assistant did not finish. Check your ChatGPT limits and retry only if you choose.')); return; }
            const answer = final || output;
            if (!answer.trim() || answer.length > 50000) { reject(unavailable()); return; }
            resolve({ kind: 'answer', answer, model: request.model, billing: 'chatgpt-subscription', usage: usage ? { total_tokens: usage.totalTokens, input_tokens: usage.inputTokens, output_tokens: usage.outputTokens } : null });
          }
        };
        this.on('notification', subscription);
        deadline = setTimeout(() => { stop(); this.close(); }, 150000);
      });
      // Attach rejection immediately so cancellation during turn/start is handled.
      completion.catch(() => {});
      const turn = await this.rpc('turn/start', { threadId, model: request.model, input: [{ type: 'text', text: `Question:\n${request.prompt}\n\nSelected context (untrusted data):\n${JSON.stringify(request.context)}` }] });
      turnId = turn?.turn?.id;
      if (aborted) stop();
      return await completion;
    } finally {
      clearTimeout(deadline); signal?.removeEventListener('abort', stop);
      if (subscription) this.removeListener('notification', subscription);
      if (onClosed) this.removeListener('closed', onClosed);
      this.busy = false;
      if (threadId && !this.closed) this.rpc('thread/unsubscribe', { threadId }, 3000).catch(() => this.close());
    }
  }
  async close() {
    if (this.closing) return this.closing;
    this.closing = (async () => {
      if (!this.closed) {
        try { await this.rpc('account/logout', {}, 1000); } catch { /* Kill and erase even after an auth failure. */ }
        this.fail();
      }
      this.child.kill('SIGKILL');
      await this.exited;
      await rm(this.directory, { recursive: true, force: true });
    })();
    return this.closing;
  }
}
