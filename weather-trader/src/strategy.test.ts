import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeBestEdge, extractMarketPrice } from "./strategy/edgeModel.js";
import { parseWeatherMarket } from "./strategy/marketParser.js";
import { DEFAULT_PAPER_PORTFOLIO } from "./strategy/portfolio.js";
import { sizePaperTrade } from "./strategy/sizing.js";
import { decideMarket } from "./strategy/decisionEngine.js";
import { PaperBroker } from "./strategy/paperBroker.js";
import { openMarketSnapshotStore } from "./db/marketSnapshotStore.js";
import type { WeatherSnapshot } from "./weather/types.js";

const require = createRequire(import.meta.url);

test("market parser extracts supported rain market details", () => {
  const parsed = parseWeatherMarket({
    id: "rain-seattle",
    question: "Will it rain in Seattle tomorrow?",
  });

  assert.equal(parsed.kind, "rain");
  assert.equal(parsed.locationText, "Seattle");
  assert.equal(parsed.targetDateText, "tomorrow");
  assert.deepEqual(parsed.ambiguityReasons, []);
});

test("edge model selects the side with the largest positive edge", () => {
  const price = extractMarketPrice({ outcomePrices: '["0.30","0.70"]' });
  const edge = computeBestEdge(0.55, price);

  assert.equal(edge?.side, "yes");
  assert.equal(edge?.marketProbability, 0.3);
  assert.equal(edge?.edge, 0.25);
});

test("risk sizing blocks ambiguous or low-confidence trades", () => {
  const ambiguous = sizePaperTrade({
    edge: 0.2,
    confidence: 0.8,
    marketProbability: 0.3,
    portfolio: DEFAULT_PAPER_PORTFOLIO,
    marketId: "ambiguous",
    settlementCanEvaluate: false,
    ambiguityReasons: ["Market location could not be inferred from the question."],
  });
  assert.equal(ambiguous.approved, false);
  assert.match(ambiguous.reasons.join(" "), /Settlement rule|location/);

  const lowConfidence = sizePaperTrade({
    edge: 0.2,
    confidence: 0.1,
    marketProbability: 0.3,
    portfolio: DEFAULT_PAPER_PORTFOLIO,
    marketId: "low-confidence",
    settlementCanEvaluate: true,
    ambiguityReasons: [],
  });
  assert.equal(lowConfidence.approved, false);
  assert.match(lowConfidence.reasons.join(" "), /Confidence/);
});

test("decision engine can produce a PAPER_TRADE decision with a reason", () => {
  const decision = decideMarket(
    {
      id: "rain-seattle",
      question: "Will it rain in Seattle tomorrow?",
      outcomePrices: '["0.20","0.80"]',
      active: true,
      closed: false,
    },
    { weatherSnapshots: [snapshot({ precipitationProbabilityPercent: 80 })] },
  );

  assert.equal(decision.action, "PAPER_TRADE");
  assert.equal(decision.side, "yes");
  assert.ok(decision.stakeCents > 0);
  assert.match(decision.reason, /Average precipitation probability|Approved paper stake/);
});

test("decision engine produces NO_TRADE for unsafe ambiguous markets", () => {
  const decision = decideMarket({
    id: "bad-weather",
    question: "Will the weather be weird?",
    outcomePrices: '["0.20","0.80"]',
  });

  assert.equal(decision.action, "NO_TRADE");
  assert.equal(decision.side, "skip");
  assert.match(decision.reason, /unsupported weather condition|location|target date/i);
});

test("paper broker saves paper trades to SQLite", () => {
  const dir = mkdtempSync(join(tmpdir(), "weather-trader-paper-"));
  const dbPath = join(dir, "paper.sqlite");
  const store = openMarketSnapshotStore(dbPath);
  const broker = new PaperBroker(store);
  const market = {
    id: "rain-seattle",
    question: "Will it rain in Seattle tomorrow?",
    outcomePrices: '["0.20","0.80"]',
    active: true,
    closed: false,
  };
  store.saveMarketSnapshot(market, true);

  const decision = decideMarket(market, { weatherSnapshots: [snapshot({ precipitationProbabilityPercent: 85 })] });
  const result = broker.recordDecision(decision);
  store.close();

  const { DatabaseSync } = require("node:sqlite") as {
    DatabaseSync: new (path: string) => {
      prepare(sql: string): { get(): Record<string, unknown> | undefined };
      close(): void;
    };
  };
  const db = new DatabaseSync(dbPath);
  const decisions = db.prepare("SELECT COUNT(*) AS count FROM paper_decisions").get();
  const trades = db.prepare("SELECT COUNT(*) AS count FROM paper_trades").get();
  db.close();
  rmSync(dir, { recursive: true, force: true });

  assert.equal(result.saved, true);
  assert.equal(result.action, "PAPER_TRADE");
  assert.equal(decisions?.count, 1);
  assert.equal(trades?.count, 1);
});

function snapshot(values: Partial<WeatherSnapshot>): WeatherSnapshot {
  return {
    source: "open-meteo",
    location: { latitude: 47.6062, longitude: -122.3321 },
    observedAt: "2026-05-14T17:00:00Z",
    fetchedAt: "2026-05-14T17:01:00Z",
    forecastValidAt: "2026-05-14T18:00:00Z",
    isForecast: true,
    temperatureC: null,
    precipitationProbabilityPercent: null,
    precipitationMm: null,
    windSpeedKph: null,
    windDirectionDeg: null,
    shortForecast: null,
    raw: {},
    ...values,
  };
}
