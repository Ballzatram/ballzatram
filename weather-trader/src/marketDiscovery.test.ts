import test from "node:test";
import assert from "node:assert/strict";
import { GammaClient, type GammaMarket } from "./markets/gammaClient.js";
import { getWeatherMatch, runMarketDiscovery } from "./markets/marketDiscovery.js";
import type { MarketSnapshotStore } from "./db/marketSnapshotStore.js";
import { createLogger } from "./logger/logger.js";
import type { TradingDecision } from "./strategy/decisionEngine.js";
import { createWeatherSourceRegistry } from "./weather/sourceRegistry.js";
import type { WeatherDataSource } from "./weather/types.js";

class MemoryStore implements MarketSnapshotStore {
  readonly weatherAudits: string[] = [];
  readonly snapshots: Array<{ id: string; weather: boolean }> = [];
  readonly decisions: TradingDecision[] = [];

  close(): void {
    // Nothing to close for the in-memory test store.
  }

  saveMarketSnapshot(market: GammaMarket, isWeatherLike: boolean): void {
    this.snapshots.push({ id: market.id, weather: isWeatherLike });
  }

  saveTradingDecision(decision: TradingDecision): void {
    this.decisions.push(decision);
  }

  saveWeatherSnapshotAudit(marketId: string): void {
    this.weatherAudits.push(marketId);
  }
}

test("weather market filtering matches weather-like market text", () => {
  const match = getWeatherMatch({
    id: "1",
    question: "Will New York City receive more than 1 inch of rain this week?",
    active: true,
    closed: false,
  });

  assert.equal(match.matched, true);
  assert.deepEqual(match.keywords, ["rain"]);
});

test("market discovery stores active snapshots and summarizes weather-like markets", async () => {
  const store = new MemoryStore();
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify([
        {
          id: "weather-1",
          question: "Will temperature above 95 degrees in Miami tomorrow?",
          slug: "miami-temperature-95",
          active: true,
          closed: false,
          clobTokenIds: '["yes-token","no-token"]',
        },
        {
          id: "sports-1",
          question: "Will Team A win?",
          active: true,
          closed: false,
        },
        {
          id: "closed-weather",
          question: "Will it snow in Boston?",
          active: false,
          closed: true,
        },
      ]),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const source: WeatherDataSource = { name: "open-meteo", getSnapshot: async () => ({ source:"open-meteo", location:{latitude:25.7617,longitude:-80.1918}, observedAt:new Date().toISOString(), fetchedAt:new Date().toISOString(), isForecast:true, temperatureC:36, precipitationProbabilityPercent:70, precipitationMm:null, windSpeedKph:10, windDirectionDeg:null, shortForecast:"Rain", raw:{} }) };
  const result = await runMarketDiscovery({
    gammaClient: new GammaClient({ baseUrl: "https://gamma-api.test", timeoutMs: 1000, fetchImpl }),
    store,
    logger: createLogger("error"),
    limit: 10,
    weatherSourceRegistry: createWeatherSourceRegistry([source]),
  });

  assert.equal(result.ok, true);
  assert.equal(result.fetchedMarkets, 3);
  assert.equal(result.activeMarkets, 2);
  assert.equal(result.weatherMarkets, 1);
  assert.equal(result.storedSnapshots, 2);
  assert.equal(result.weatherLikeMarkets[0]?.id, "weather-1");
  assert.deepEqual(result.weatherLikeMarkets[0]?.clobTokenIds, ["yes-token", "no-token"]);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0]?.action, "NO_TRADE");
  assert.match(result.decisions[0]?.reason ?? "", /Market location|Confidence|temperature/i);
  assert.deepEqual(store.snapshots, [
    { id: "weather-1", weather: true },
    { id: "sports-1", weather: false },
  ]);
  assert.equal(store.decisions.length, 1);
  assert.equal(result.weatherSnapshotAttempts, 1);
  assert.equal(result.weatherSnapshotSuccesses, 1);
});

test("market discovery handles failed API calls cleanly", async () => {
  const store = new MemoryStore();
  const fetchImpl: typeof fetch = async () => new Response("Service unavailable", { status: 503 });

  const source: WeatherDataSource = { name: "open-meteo", getSnapshot: async () => ({ source:"open-meteo", location:{latitude:25.7617,longitude:-80.1918}, observedAt:new Date().toISOString(), fetchedAt:new Date().toISOString(), isForecast:true, temperatureC:36, precipitationProbabilityPercent:70, precipitationMm:null, windSpeedKph:10, windDirectionDeg:null, shortForecast:"Rain", raw:{} }) };
  const result = await runMarketDiscovery({
    gammaClient: new GammaClient({ baseUrl: "https://gamma-api.test", timeoutMs: 1000, fetchImpl }),
    store,
    logger: createLogger("error"),
    limit: 10,
    weatherSourceRegistry: createWeatherSourceRegistry([source]),
  });

  assert.equal(result.ok, false);
  assert.equal(result.fetchedMarkets, 0);
  assert.equal(result.errors[0]?.source, "gamma");
  assert.match(result.errors[0]?.message ?? "", /HTTP 503/);
});
