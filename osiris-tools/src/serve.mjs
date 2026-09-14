import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createHandler } from './http.mjs';
import { widgetHtml } from '../dist/widget.mjs';

const handle = createHandler(widgetHtml);
const port = Number(process.env.PORT || 8787);
const server = createServer(async (incoming, outgoing) => {
  try {
    const request = new Request(`http://127.0.0.1:${port}${incoming.url}`, { method: incoming.method, headers: incoming.headers, ...(['GET', 'HEAD'].includes(incoming.method) ? {} : { body: Readable.toWeb(incoming), duplex: 'half' }) });
    const response = await handle(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { outgoing.writeHead(500); outgoing.end('Request failed.'); }
});
server.requestTimeout = 15000;
server.listen(port, '127.0.0.1', () => console.log(`Model-free Osiris tools: http://127.0.0.1:${port}/mcp`));
