import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "./config/config.js";
import { assertLimitOrderPayload, type ClobClient, type SignedLimitOrderPayload } from "./execution/clobClient.js";
import { assertLiveExecutionAllowed, LockedLiveBroker, type LimitOrderIntent } from "./execution/execution.js";
import type { TradingDecision } from "./strategy/decisionEngine.js";

const baseEnv = {
  WEATHER_TRADER_HOST: "127.0.0.1",
  WEATHER_TRADER_PORT: "8787",
  WEATHER_TRADER_DB_PATH: "./data/test.sqlite",
  WEATHER_TRADER_LOG_LEVEL: "error",
};

const liveEnv = {
  ...baseEnv,
  WEATHER_TRADER_MODE: "live",
  LIVE_TRADING_ENABLED: "true",
  LIVE_TRADING_KILL_SWITCH: "false",
  POLYMARKET_CLOB_API_KEY: "test-key",
  POLYMARKET_CLOB_API_SECRET: "test-secret",
  POLYMARKET_CLOB_API_PASSPHRASE: "test-passphrase",
  POLYMARKET_FUNDER_ADDRESS: "0x0000000000000000000000000000000000000000",
  POLYMARKET_SIGNATURE_TYPE: "1",
};

test("live mode throws unless LIVE_TRADING_ENABLED is true", () => {
  assert.throws(
    () => loadConfig({ ...baseEnv, WEATHER_TRADER_MODE: "live", LIVE_TRADING_ENABLED: "false" }),
    /LIVE_TRADING_ENABLED=true/,
  );
});

test("live mode validates required live execution environment", () => {
  assert.throws(
    () =>
      loadConfig({
        ...baseEnv,
        WEATHER_TRADER_MODE: "live",
        LIVE_TRADING_ENABLED: "true",
        LIVE_TRADING_KILL_SWITCH: "false",
      }),
    /POLYMARKET_CLOB_API_KEY/,
  );
});

test("live mode remains blocked when kill switch is on", () => {
  assert.throws(
    () => loadConfig({ ...liveEnv, LIVE_TRADING_KILL_SWITCH: "true" }),
    /LIVE_TRADING_KILL_SWITCH/,
  );
});

test("LIVE_TRADING_ENABLED cannot be set in paper or backtest mode", () => {
  assert.throws(
    () => loadConfig({ ...baseEnv, WEATHER_TRADER_MODE: "paper", LIVE_TRADING_ENABLED: "true" }),
    /requires WEATHER_TRADER_MODE=live/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, WEATHER_TRADER_MODE: "backtest", LIVE_TRADING_ENABLED: "true" }),
    /requires WEATHER_TRADER_MODE=live/,
  );
});

test("live orders cannot happen in paper or backtest mode", () => {
  for (const mode of ["paper", "backtest"] as const) {
    const config = loadConfig({ ...baseEnv, WEATHER_TRADER_MODE: mode });
    assert.throws(() => assertLiveExecutionAllowed(config, intent()), /Live orders are blocked/);
  }
});

test("live broker does not call CLOB client when execution is blocked", async () => {
  let calls = 0;
  const fakeClient = {
    postSignedLimitOrder: async () => {
      calls += 1;
      return { raw: { ok: true } };
    },
  } as unknown as ClobClient;
  const broker = new LockedLiveBroker(loadConfig({ ...baseEnv, WEATHER_TRADER_MODE: "paper" }), fakeClient);

  await assert.rejects(() => broker.placeLimitOrder(intent(), { signed: true }), /WEATHER_TRADER_MODE=paper/);
  assert.equal(calls, 0);
});

test("limit-order-only payload validation rejects unsafe order shapes", () => {
  assert.throws(
    () => assertLimitOrderPayload({ ...signedPayload(), orderType: "FOK" as SignedLimitOrderPayload["orderType"] }),
    /Only limit order types/,
  );
  assert.throws(() => assertLimitOrderPayload({ ...signedPayload(), price: 1.25 }), /between 0 and 1/);
  assert.throws(() => assertLimitOrderPayload({ ...signedPayload(), size: 0 }), /positive/);
});

test("fully unlocked live skeleton allows only validated limit-order intent", () => {
  const config = loadConfig(liveEnv);
  assert.doesNotThrow(() => assertLiveExecutionAllowed(config, intent()));
  assert.equal(config.liveTradingEnabled, true);
});

function intent(overrides: Partial<LimitOrderIntent> = {}): LimitOrderIntent {
  return {
    decision: decision(),
    tokenId: "123-token",
    side: "BUY",
    price: 0.42,
    size: 5,
    orderType: "GTC",
    ...overrides,
  };
}

function decision(): TradingDecision {
  return {
    action: "PAPER_TRADE",
    marketId: "market-1",
    question: "Will it rain in Seattle tomorrow?",
    side: "yes",
    reason: "Approved paper trade for test.",
    reasons: ["Approved paper trade for test."],
    estimatedProbability: 0.6,
    marketProbability: 0.42,
    edge: 0.18,
    confidence: 0.75,
    stakeCents: 500,
    parsedMarket: {
      marketId: "market-1",
      question: "Will it rain in Seattle tomorrow?",
      kind: "rain",
      operator: null,
      threshold: null,
      unit: null,
      locationText: "Seattle",
      targetDateText: "tomorrow",
      ambiguityReasons: [],
    },
    createdAt: "2026-05-14T00:00:00.000Z",
  };
}

function signedPayload(): SignedLimitOrderPayload {
  return {
    orderType: "GTC",
    tokenId: "123-token",
    side: "BUY",
    price: 0.42,
    size: 5,
    signedOrder: { signed: true },
  };
}
