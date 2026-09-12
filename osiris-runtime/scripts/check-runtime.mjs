import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { CodexSession, CODEX_VERSION } from '../codex.mjs';

const session = await CodexSession.create();
try {
  assert.equal((await session.account()).account, null);
  const { config } = await session.rpc('config/read', { includeLayers: false });
  assert.equal(config.forced_login_method, 'chatgpt');
  assert.equal(config.cli_auth_credentials_store, 'ephemeral');
  assert.equal(config.sandbox_mode, 'read-only');
  for (const name of ['shell_tool', 'unified_exec', 'apps', 'plugins', 'browser_use', 'computer_use', 'multi_agent', 'code_mode_host']) assert.equal(config.features[name], false, name);
} finally { await session.close(); }
assert.ok(session.child.exitCode !== null || session.child.signalCode !== null, 'The native process must exit before cleanup completes.');
await assert.rejects(access(session.directory), { code: 'ENOENT' });
console.log(`Codex ${CODEX_VERSION}: stdio protocol, isolated signed-out account, ephemeral credentials, disabled action configuration, process exit, and temporary-directory cleanup verified. No login or model generation was performed.`);
