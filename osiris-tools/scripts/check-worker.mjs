import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Run the built Worker in workerd, not only in Node, without an AI/Cloudflare account.
const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--ip', '127.0.0.1', '--port', '8791'], {
  cwd: new URL('..', import.meta.url),
  env: { PATH: process.env.PATH, HOME: process.env.HOME, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let output = '';
child.stdout.on('data', data => { output = (output + data).slice(-6000); });
child.stderr.on('data', data => { output = (output + data).slice(-6000); });
const stopped = once(child, 'exit');
let client;
try {
  let ready = false;
  for (let i = 0; i < 60 && child.exitCode === null; i++) {
    try {
      const response = await fetch('http://127.0.0.1:8791/health', { signal: AbortSignal.timeout(500) });
      if (response.ok && (await response.json()).modelCalls === false) { ready = true; break; }
    } catch { /* Startup is bounded below; no model requests or retries. */ }
    await delay(250);
  }
  if (!ready) throw new Error('Local Worker did not become ready.\n' + output);
  client = new Client({ name: 'worker-smoke', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1:8791/mcp')));
  const tools = await client.listTools();
  if (tools.tools.length !== 3) throw new Error('Worker tool discovery failed.');
  const result = await client.callTool({ name: 'open_supply_demand_lab', arguments: { actions: ['supply-up'] } });
  if (result.isError || result.structuredContent?.result?.price !== 8.2) throw new Error('Worker simulation failed.');
  const ui = await client.readResource({ uri: 'ui://ballzatram/supply-demand/v1.html' });
  if (!ui.contents[0]?.text?.includes('hostForm')) throw new Error('Worker UI resource failed.');
  console.log('Worker runtime verified: initialization, discovery, simulation, and UI. No model calls.');
} finally {
  await client?.close();
  child.kill('SIGTERM');
  const kill = setTimeout(() => child.kill('SIGKILL'), 3000);
  await stopped; clearTimeout(kill);
}
