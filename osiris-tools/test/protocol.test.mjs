import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createHandler } from '../src/http.mjs';
import { widgetHtml } from '../dist/widget.mjs';
import engine from '../../tools/supply-demand/engine.js';
import features from '../../assets/ai-features.js';
import { RESOURCE_URI, MIME_TYPE } from '../src/server.mjs';

const handle = createHandler(widgetHtml);
const url = 'https://tools.example.test/mcp';
const rpc = (body, headers = {}) => handle(new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers }, body: JSON.stringify(body) }));
async function client(t) {
  const client = new Client({ name: 'contract-test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url), { fetch: (input, init) => handle(new Request(input, init)) });
  await client.connect(transport);
  t.after(() => client.close());
  return client;
}

test('official MCP client initializes, discovers tools, loads UI, and computes without a model', async t => {
  const c = await client(t);
  assert.match(c.getInstructions(), /never call a model/);
  assert.doesNotMatch(c.getInstructions(), /You have no tools/);
  const { tools } = await c.listTools();
  assert.deepEqual(tools.map(tool => tool.name), ['list_osiris_projects', 'simulate_supply_demand', 'open_supply_demand_lab']);
  for (const tool of tools) { assert.equal(tool.annotations.readOnlyHint, true); assert.equal(tool.annotations.openWorldHint, false); assert.equal(tool.inputSchema.additionalProperties, false); }
  assert.equal(tools.filter(tool => tool._meta?.ui?.resourceUri).length, 1);
  const ui = await c.readResource({ uri: RESOURCE_URI });
  assert.equal(ui.contents[0].mimeType, MIME_TYPE);
  assert.deepEqual(ui.contents[0]._meta.ui.csp.connectDomains, []);
  assert.match(ui.contents[0].text, /shareConsent/);
  assert.doesNotMatch(ui.contents[0].text, /<script\b[^>]*src=|<iframe\b|subscription-client/);
  const result = await c.callTool({ name: 'simulate_supply_demand', arguments: { actions: ['supply-up'] } });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.result.price, 8.2);
  assert.equal(result.structuredContent.result.quantity, 109.6);
  assert.equal(result.structuredContent.result.shortageSurplus, 'Balanced');
  assert.match(result.content[0].text, /limitations/);
  const rendered = await c.callTool({ name: 'open_supply_demand_lab', arguments: result.structuredContent.input });
  assert.deepEqual(rendered.structuredContent, result.structuredContent);
});

test('invalid names, excessive moves, arbitrary data and invalid challenge sequences cannot mutate anything', async t => {
  const c = await client(t);
  for (const input of [{ actions: Array(13).fill('tax') }, { actions: ['execute-shell'] }, { scenarioId: 'private-record' }, { actions: [], score: 100 }, { actions: [], url: 'https://example.test/private' }, { mode: 'challenge', challengeId: 'abundance', actions: ['price-ceiling'] }, { mode: 'challenge', challengeId: 'abundance', actions: ['supply-up', 'tax'] }]) {
    const result = await c.callTool({ name: 'simulate_supply_demand', arguments: input });
    assert.equal(result.isError, true, JSON.stringify(input));
  }
  const bad = await c.callTool({ name: 'save_assistant_draft', arguments: { text: 'write' } });
  assert.equal(bad.isError, true);
  const result = await c.callTool({ name: 'simulate_supply_demand', arguments: {} });
  assert.equal(result.structuredContent.result.price, 10);
  assert.equal(result.structuredContent.result.history.length, 1);
});

test('independent clients share no state and expose accurate per-project readiness', async t => {
  const a = await client(t); const b = await client(t);
  await a.callTool({ name: 'simulate_supply_demand', arguments: { actions: ['price-ceiling'] } });
  const clean = await b.callTool({ name: 'simulate_supply_demand', arguments: {} });
  assert.equal(clean.structuredContent.result.shortageSurplus, 'Balanced');
  const list = await b.callTool({ name: 'list_osiris_projects', arguments: {} });
  assert.equal(list.structuredContent.projects.length, features.features.length);
  assert.deepEqual(list.structuredContent.projects.filter(p => p.hostTools).map(p => p.id), ['supplyDemand']);
});

test('HTTP rejects untrusted origins, malformed bodies, batches and oversized streamed input', async () => {
  assert.equal((await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await rpc([])).status, 400);
  assert.equal((await rpc({ data: 'x'.repeat(17000) })).status, 413);
  assert.equal((await handle(new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }))).status, 400);
  assert.equal((await handle(new Request(url, { method: 'DELETE' }))).status, 405);
  assert.equal((await handle(new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json-wrong' }, body: '{}' }))).status, 415);
  const response = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { Origin: 'https://ballzatram.com' });
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://ballzatram.com');
  assert.equal(response.headers.get('mcp-session-id'), null);
});

test('health is a tool-service check, with no provider/account verification or side effects', async () => {
  const response = await handle(new Request('https://tools.example.test/health', { headers: { Origin: 'https://ballzatram.com' } }));
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://ballzatram.com');
  const data = await response.json();
  assert.equal(data.modelCalls, false); assert.equal(data.storage, 'none');
  assert.equal(data.auth, 'anonymous-read-only');
});

test('shared teaching engine preserves directional results and transient policy assumptions', () => {
  const baseline = engine.simulate({});
  for (const [action, price, quantity] of [['demand-up', 1, 1], ['demand-down', -1, -1], ['supply-up', -1, 1], ['supply-down', 1, -1]]) {
    const { result } = engine.simulate({ actions: [action] });
    assert.equal(Math.sign(result.price - baseline.result.price), price);
    assert.equal(Math.sign(result.quantity - baseline.result.quantity), quantity);
  }
  const ceiling = engine.simulate({ actions: ['price-ceiling'] });
  assert.equal(ceiling.result.shortageSurplus, 'Shortage'); assert.ok(ceiling.result.deadweightLoss > 0);
  const next = engine.simulate({ actions: ['price-ceiling', 'supply-up'] });
  assert.equal(next.result.shortageSurplus, 'Balanced');
  assert.match(next.provenance.limitations, /current move only/);
  assert.deepEqual(engine.simulate(next.input), next);
});
