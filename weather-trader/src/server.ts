import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadConfig, type AppConfig } from "./config/config.js";
import { createLogger, type Logger } from "./logger/logger.js";
import { createStatusPayload } from "./api/status.js";
import { GammaClient } from "./markets/gammaClient.js";
import { runMarketDiscovery } from "./markets/marketDiscovery.js";
import { openMarketSnapshotStore } from "./db/marketSnapshotStore.js";
import { createDefaultWeatherSourceRegistry } from "./weather/sourceRegistry.js";

const STATUS_PATH = "/api/weather-bot/status";
const RUN_ONCE_PATH = "/api/weather-bot/run-once";

export function createApiServer(config: AppConfig, logger: Logger) {
  return createServer((request, response) => {
    handleRequest(request, response, config, logger).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected server error.";
      logger.error("Unhandled API server error", { message });
      writeJson(response, 500, {
        ok: false,
        error: "internal_server_error",
        message,
      });
    });
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  config: AppConfig,
  logger: Logger,
): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "OPTIONS") {
    writeJson(response, 204, null);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === STATUS_PATH) {
    writeJson(response, 200, createStatusPayload(config));
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === RUN_ONCE_PATH) {
    const store = openMarketSnapshotStore(config.dbPath);
    try {
      const result = await runMarketDiscovery({
        gammaClient: new GammaClient({
          baseUrl: config.gammaBaseUrl,
          timeoutMs: config.requestTimeoutMs,
        }),
        store,
        logger,
        limit: config.discoveryLimit,
        weatherSourceRegistry: createDefaultWeatherSourceRegistry(config),
      });

      writeJson(response, result.ok ? 200 : 502, result);
      return;
    } finally {
      store.close();
    }
  }

  logger.debug("Unhandled request", { method: request.method, path: requestUrl.pathname });
  writeJson(response, 404, {
    error: "not_found",
    message: `Use GET ${STATUS_PATH} for status or POST ${RUN_ONCE_PATH} for one discovery pass.`,
  });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  if (response.headersSent) {
    return;
  }

  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, accept",
  });
  response.end(`${body}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const server = createApiServer(config, logger);

  server.listen(config.port, config.host, () => {
    logger.info("Weather trader API server started", {
      host: config.host,
      port: config.port,
      mode: config.mode,
      statusPath: STATUS_PATH,
      runOncePath: RUN_ONCE_PATH,
      liveTradingEnabled: config.liveTradingEnabled,
    });
  });
}
