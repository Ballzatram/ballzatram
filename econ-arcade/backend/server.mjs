import http from "node:http";
import { createMatch, submitAction, summarize } from "./prisoners-dilemma-engine.mjs";
import { scenarioCatalog, simulateScenario } from "./game-theory-engine.mjs";

const matches = new Map();

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(payload, null, 2));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") return sendJson(res, 204, {});
      if (req.method === "GET" && req.url === "/api/health") return sendJson(res, 200, { ok: true });
      if (req.method === "GET" && req.url === "/api/game-theory/catalog") return sendJson(res, 200, { scenarios: scenarioCatalog });

      const simulationMatch = req.url?.match(/^\/api\/game-theory\/scenarios\/([^/]+)\/simulate$/);
      if (req.method === "POST" && simulationMatch) {
        const body = await readBody(req);
        return sendJson(res, 200, simulateScenario(simulationMatch[1], body));
      }

      if (req.method === "POST" && req.url === "/api/prisoners-dilemma/matches") {
        const match = createMatch(await readBody(req));
        matches.set(match.id, match);
        return sendJson(res, 201, summarize(match));
      }

      const actionMatch = req.url?.match(/^\/api\/prisoners-dilemma\/matches\/([^/]+)\/actions$/);
      if (req.method === "POST" && actionMatch) {
        const match = matches.get(actionMatch[1]);
        if (!match) return sendJson(res, 404, { error: "Match not found." });
        const body = await readBody(req);
        return sendJson(res, 200, submitAction(match, body.move));
      }

      const getMatch = req.url?.match(/^\/api\/prisoners-dilemma\/matches\/([^/]+)$/);
      if (req.method === "GET" && getMatch) {
        const match = matches.get(getMatch[1]);
        if (!match) return sendJson(res, 404, { error: "Match not found." });
        return sendJson(res, 200, summarize(match));
      }

      return sendJson(res, 404, { error: "Route not found." });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT) || 8787;
  createServer().listen(port, () => {
    console.log(`Prisoner's Dilemma API listening on http://127.0.0.1:${port}`);
  });
}
