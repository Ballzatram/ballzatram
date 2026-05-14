import type { AppConfig } from "../config/config.js";
import { SQLITE_SCHEMA } from "../db/schema.js";

export interface WeatherBotStatus {
  service: "weather-trader";
  status: "ok";
  mode: AppConfig["mode"];
  modeDescription: string;
  liveTradingEnabled: false;
  api: {
    statusPath: "/api/weather-bot/status";
    runOncePath: "/api/weather-bot/run-once";
  };
  marketData: {
    gammaBaseUrl: string;
    clobBaseUrl: string;
    discoveryLimit: number;
  };
  weatherData: {
    nwsBaseUrl: string;
    nwsUserAgentConfigured: boolean;
    openMeteoBaseUrl: string;
  };
  database: {
    kind: "sqlite";
    path: string;
    schemaLoaded: boolean;
  };
  timestamp: string;
}

export function createStatusPayload(config: AppConfig, now = new Date()): WeatherBotStatus {
  return {
    service: "weather-trader",
    status: "ok",
    mode: config.mode,
    modeDescription: config.modeDescription,
    liveTradingEnabled: false,
    api: {
      statusPath: "/api/weather-bot/status",
      runOncePath: "/api/weather-bot/run-once",
    },
    marketData: {
      gammaBaseUrl: config.gammaBaseUrl,
      clobBaseUrl: config.clobBaseUrl,
      discoveryLimit: config.discoveryLimit,
    },
    weatherData: {
      nwsBaseUrl: config.nwsBaseUrl,
      nwsUserAgentConfigured: config.nwsUserAgent.length > 0,
      openMeteoBaseUrl: config.openMeteoBaseUrl,
    },
    database: {
      kind: "sqlite",
      path: config.dbPath,
      schemaLoaded: SQLITE_SCHEMA.includes("CREATE TABLE IF NOT EXISTS bot_runs"),
    },
    timestamp: now.toISOString(),
  };
}
