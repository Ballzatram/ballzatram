import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServer, VERSION } from './server.mjs';

const MAX_BYTES = 16384;
const ORIGINS = new Set(['https://dgallemore.com', 'https://www.dgallemore.com', 'https://ballzatram.com', 'https://www.ballzatram.com', 'https://chatgpt.com', 'https://claude.ai']);
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
function error(status, text) { return new Response(text, { status, headers }); }

export function createHandler(widgetHtml) {
  return async function handle(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    // Missing Origin is normal for remote MCP hosts. No user data or writes are exposed.
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (origin && !ORIGINS.has(origin) && !(local && origin === url.origin)) return error(403, 'Origin not allowed.');
    if (url.pathname === '/health' && request.method === 'GET') return Response.json({ service: 'ballzatram-osiris-tools', version: VERSION, modelCalls: false, storage: 'none', auth: 'anonymous-read-only', endpoint: '/mcp' }, { headers: { ...headers, ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
    if (url.pathname !== '/mcp') return error(404, 'Not found.');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}), 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version', 'Access-Control-Max-Age': '600' } });
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST, OPTIONS' } });
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return error(415, 'Use application/json.');
    if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return error(413, 'Request too large.');
    let body;
    try {
      const reader = request.body?.getReader();
      if (!reader) return error(400, 'Missing request.');
      const chunks = []; let size = 0;
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); return error(413, 'Request too large.'); }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch { return error(400, 'Invalid JSON.'); }
    // Stateless, bounded tool calls. No batches, remote fetches, credentials, logging, or persistence.
    if (!body || Array.isArray(body) || typeof body !== 'object') return error(400, 'Send one JSON-RPC message.');
    const server = createServer(widgetHtml);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request, { parsedBody: body });
      // Fully materialize before cleanup; this transport returns JSON, never a live event stream.
      const bytes = await response.arrayBuffer();
      const finalHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(headers)) finalHeaders.set(key, value);
      if (origin) { finalHeaders.set('Access-Control-Allow-Origin', origin); finalHeaders.set('Vary', 'Origin'); }
      return new Response(response.status === 204 || response.status === 202 ? null : bytes, { status: response.status, headers: finalHeaders });
    } catch { return error(500, 'The tool request could not be completed.'); }
    finally { await server.close(); }
  };
}
