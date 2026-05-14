import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "./config/config.js";
import { createStatusPayload } from "./api/status.js";

const baseEnv = {
  WEATHER_TRADER_HOST: "127.0.0.1",
  WEATHER_TRADER_PORT: "8787",
  WEATHER_TRADER_MODE: "paper",
  WEATHER_TRADER_DB_PATH: "./data/test.sqlite",
  WEATHER_TRADER_LOG_LEVEL: "error",
};

test("status payload exposes paper-mode backend safety state", () => {
  const config = loadConfig(baseEnv);
  const payload = createStatusPayload(config, new Date("2026-05-14T00:00:00.000Z"));

  assert.equal(payload.service, "weather-trader");
  assert.equal(payload.status, "ok");
  assert.equal(payload.mode, "paper");
  assert.equal(payload.liveTradingEnabled, false);
  assert.equal(payload.api.statusPath, "/api/weather-bot/status");
  assert.equal(payload.database.kind, "sqlite");
  assert.equal(payload.database.schemaLoaded, true);
});

test("live mode is rejected unless explicitly enabled", () => {
  assert.throws(
    () => loadConfig({ ...baseEnv, WEATHER_TRADER_MODE: "live" }),
    /LIVE_TRADING_ENABLED=true/,
  );
});
