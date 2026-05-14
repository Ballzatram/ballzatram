import { resolve } from "node:path";
import { loadDotEnvFile, type EnvSource } from "./env.js";
import { isLogLevel, type LogLevel } from "../logger/logger.js";
import { describeMode, isBotMode, type BotMode } from "../modes/mode.js";

export interface LiveTradingConfig {
  enabled: boolean;
  killSwitch: boolean;
  clobApiKey: string | null;
  clobApiSecret: string | null;
  clobApiPassphrase: string | null;
  funderAddress: string | null;
  signatureType: number | null;
}

export interface AppConfig {
  host: string;
  port: number;
  mode: BotMode;
  modeDescription: string;
  dbPath: string;
  logLevel: LogLevel;
  gammaBaseUrl: string;
  clobBaseUrl: string;
  discoveryLimit: number;
  requestTimeoutMs: number;
  nwsBaseUrl: string;
  nwsUserAgent: string;
  openMeteoBaseUrl: string;
  liveTradingEnabled: boolean;
  liveTrading: LiveTradingConfig;
}

export function loadConfig(env: EnvSource = process.env): AppConfig {
  const fileEnv = loadDotEnvFile();
  const mergedEnv = { ...fileEnv, ...env };

  const mode = readMode(mergedEnv.WEATHER_TRADER_MODE ?? "paper");
  const liveTrading = readLiveTradingConfig(mode, mergedEnv);

  return {
    host: mergedEnv.WEATHER_TRADER_HOST ?? "127.0.0.1",
    port: readPort(mergedEnv.WEATHER_TRADER_PORT ?? "8787"),
    mode,
    modeDescription: describeMode(mode),
    dbPath: resolve(process.cwd(), mergedEnv.WEATHER_TRADER_DB_PATH ?? "./data/weather-trader.sqlite"),
    logLevel: readLogLevel(mergedEnv.WEATHER_TRADER_LOG_LEVEL ?? "info"),
    gammaBaseUrl: mergedEnv.POLYMARKET_GAMMA_BASE_URL ?? "https://gamma-api.polymarket.com",
    clobBaseUrl: mergedEnv.POLYMARKET_CLOB_BASE_URL ?? "https://clob.polymarket.com",
    discoveryLimit: readPositiveInteger(mergedEnv.WEATHER_TRADER_DISCOVERY_LIMIT ?? "100", "WEATHER_TRADER_DISCOVERY_LIMIT"),
    requestTimeoutMs: readPositiveInteger(mergedEnv.WEATHER_TRADER_REQUEST_TIMEOUT_MS ?? "10000", "WEATHER_TRADER_REQUEST_TIMEOUT_MS"),
    nwsBaseUrl: mergedEnv.NWS_BASE_URL ?? "https://api.weather.gov",
    nwsUserAgent: readRequiredString(
      mergedEnv.NWS_USER_AGENT ?? "weather-trader/0.1.0 (local paper-mode research; contact: operator@example.com)",
      "NWS_USER_AGENT",
    ),
    openMeteoBaseUrl: mergedEnv.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com",
    liveTradingEnabled: liveTrading.enabled,
    liveTrading,
  };
}

function readMode(value: string): BotMode {
  if (!isBotMode(value)) {
    throw new Error(`Unsupported WEATHER_TRADER_MODE: ${value}`);
  }

  return value;
}

function readLogLevel(value: string): LogLevel {
  if (!isLogLevel(value)) {
    throw new Error(`Unsupported WEATHER_TRADER_LOG_LEVEL: ${value}`);
  }

  return value;
}

function readPort(value: string): number {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`WEATHER_TRADER_PORT must be an integer from 1 to 65535. Received: ${value}`);
  }

  return port;
}

function readPositiveInteger(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer. Received: ${value}`);
  }

  return parsed;
}

function readRequiredString(value: string, name: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${name} must be configured.`);
  }

  return trimmed;
}

function readLiveTradingConfig(mode: BotMode, env: EnvSource): LiveTradingConfig {
  const enabled = readBoolean(env.LIVE_TRADING_ENABLED ?? "false", "LIVE_TRADING_ENABLED");
  const killSwitch = readBoolean(env.LIVE_TRADING_KILL_SWITCH ?? "true", "LIVE_TRADING_KILL_SWITCH");

  if (enabled && mode !== "live") {
    throw new Error("LIVE_TRADING_ENABLED=true requires WEATHER_TRADER_MODE=live.");
  }

  if (mode === "live" && !enabled) {
    throw new Error("WEATHER_TRADER_MODE=live requires LIVE_TRADING_ENABLED=true.");
  }

  if (mode === "live" && killSwitch) {
    throw new Error("LIVE_TRADING_KILL_SWITCH must be false before live mode can start.");
  }

  const config: LiveTradingConfig = {
    enabled,
    killSwitch,
    clobApiKey: optionalTrimmed(env.POLYMARKET_CLOB_API_KEY),
    clobApiSecret: optionalTrimmed(env.POLYMARKET_CLOB_API_SECRET),
    clobApiPassphrase: optionalTrimmed(env.POLYMARKET_CLOB_API_PASSPHRASE),
    funderAddress: optionalTrimmed(env.POLYMARKET_FUNDER_ADDRESS),
    signatureType: env.POLYMARKET_SIGNATURE_TYPE ? readPositiveInteger(env.POLYMARKET_SIGNATURE_TYPE, "POLYMARKET_SIGNATURE_TYPE") : null,
  };

  if (mode === "live") {
    requireLiveEnv(config);
  }

  return config;
}

function requireLiveEnv(config: LiveTradingConfig): void {
  const missing = [
    ["POLYMARKET_CLOB_API_KEY", config.clobApiKey],
    ["POLYMARKET_CLOB_API_SECRET", config.clobApiSecret],
    ["POLYMARKET_CLOB_API_PASSPHRASE", config.clobApiPassphrase],
    ["POLYMARKET_FUNDER_ADDRESS", config.funderAddress],
    ["POLYMARKET_SIGNATURE_TYPE", config.signatureType === null ? null : String(config.signatureType)],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Live trading requires missing environment variables: ${missing.join(", ")}.`);
  }
}

function readBoolean(value: string, name: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`${name} must be a boolean value.`);
}

function optionalTrimmed(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
