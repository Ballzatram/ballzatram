import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import engine from '../../tools/supply-demand/engine.js';
import features from '../../assets/ai-features.js';

z.config({ jitless: true });

export const VERSION = '1.0.0';
export const RESOURCE_URI = 'ui://ballzatram/supply-demand/v1.html';
export const MIME_TYPE = 'text/html;profile=mcp-app';
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const inputSchema = z.object({
  scenarioId: z.enum(engine.scenarios.map(row => row.id)).default(engine.scenarios[0].id),
  mode: z.enum(['sandbox', 'challenge']).default('sandbox'),
  challengeId: z.enum(engine.challenges.map(row => row.id)).default(engine.challenges[0].id),
  actions: z.array(z.enum(engine.actions.map(row => row.id))).max(engine.LIMIT).default([])
}).strict();
const outputSchema = z.object({
  schemaVersion: z.literal(1), featureId: z.literal('supplyDemand'), engineVersion: z.string(), revision: z.string(),
  input: inputSchema, market: z.object({ id: z.string(), title: z.string(), description: z.string() }),
  baseline: z.record(z.string(), z.unknown()), result: z.record(z.string(), z.unknown()),
  challenge: z.record(z.string(), z.unknown()).nullable(),
  provenance: z.object({ kind: z.string(), source: z.string(), limitations: z.string() })
});
function run(input) {
  try {
    const snapshot = engine.simulate(input);
    return { structuredContent: snapshot, content: [{ type: 'text', text: JSON.stringify(snapshot) }] };
  } catch {
    return { isError: true, content: [{ type: 'text', text: 'These moves violate the challenge rules or run limit. Choose a valid scenario and up to 12 sandbox moves, or follow the selected challenge’s move budget. No state was changed.' }] };
  }
}

export function createServer(widgetHtml) {
  const server = new McpServer({ name: 'ballzatram-osiris', version: VERSION }, {
    instructions: 'Ballzatram tools run deterministic teaching simulations only. They never call a model, read website storage, save work, or change scores. Use only inputs the user selects. Tax and price controls apply to the current move; shifts persist. ' + features.instructions('supplyDemand', 'tools')
  });
  server.registerTool('list_osiris_projects', {
    title: 'Explore Ballzatram AI projects',
    description: 'List project context readiness and available interactive tools. Only Supply & Demand has host tools in this release; other projects support explicit context transfer or need feature design.',
    inputSchema: z.object({}).strict(), annotations
  }, async () => {
    const data = { schemaVersion: 1, modelCalls: false, projects: features.features.map(row => ({ id: row.id, name: row.name, ...features.capabilities(row.id), next: row.next })) };
    return { structuredContent: data, content: [{ type: 'text', text: JSON.stringify(data) }] };
  });
  server.registerTool('simulate_supply_demand', {
    title: 'Compare a supply and demand simulation',
    description: 'Compute an independent teaching example from scenario and ordered action IDs. Does not change the user’s website or score. Use for explanations and comparisons. Limited to 12 sandbox moves; challenge rules are enforced. Returns all inputs, results, revision, and limitations without opening a new widget.',
    inputSchema, outputSchema, annotations
  }, async input => run(input));
  server.registerTool('open_supply_demand_lab', {
    title: 'Open the Supply & Demand Lab',
    description: 'Open the interactive Ballzatram lab for the user’s selected input sequence, or start an empty sandbox. For an existing result, pass the input returned by simulate_supply_demand or explicitly shared by the user. The user can explore market moves and request a hint in their AI app. Returns complete results even when UI is unsupported.',
    inputSchema, outputSchema, annotations,
    _meta: { ui: { resourceUri: RESOURCE_URI }, 'openai/toolInvocation/invoking': 'Opening your lab…', 'openai/toolInvocation/invoked': 'Lab ready' }
  }, async input => run(input));
  server.registerResource('supply-demand-lab', RESOURCE_URI, { mimeType: MIME_TYPE, description: 'Interactive deterministic market lab. Model usage is handled by the host AI app.' }, async () => ({ contents: [{
    uri: RESOURCE_URI, mimeType: MIME_TYPE, text: widgetHtml,
    _meta: { ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [], frameDomains: [] } } }
  }] }));
  return server;
}
