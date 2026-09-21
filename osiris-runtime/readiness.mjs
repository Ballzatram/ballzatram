import { CodexSession, RuntimeError } from './codex.mjs';

/** Check the real runtime without authenticating, selecting a model, or generating. */
export async function probeRuntime() {
  const session = await CodexSession.create();
  try {
    if ((await session.account()).account !== null) throw new RuntimeError('ambient_auth', 'Runtime isolation check failed.', 503);
    const { config } = await session.rpc('config/read', { includeLayers: false });
    if (config?.forced_login_method !== 'chatgpt' || config?.cli_auth_credentials_store !== 'ephemeral' || config?.sandbox_mode !== 'read-only') throw new RuntimeError('unsafe_config', 'Runtime isolation check failed.', 503);
    for (const name of ['shell_tool', 'unified_exec', 'apps', 'plugins', 'browser_use', 'computer_use', 'multi_agent', 'code_mode_host']) {
      if (config.features?.[name] !== false) throw new RuntimeError('unsafe_config', 'Runtime isolation check failed.', 503);
    }
    return true;
  } finally { await session.close(); }
}
