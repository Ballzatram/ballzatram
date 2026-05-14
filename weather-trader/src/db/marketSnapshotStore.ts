import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { SQLITE_SCHEMA } from "./schema.js";
import type { GammaMarket } from "../markets/gammaClient.js";
import type { TradingDecision } from "../strategy/decisionEngine.js";

type DatabaseSync = {
  exec(sql: string): void;
  prepare(sql: string): StatementSync;
  close(): void;
};

type StatementResult = { lastInsertRowid?: number | bigint };

type StatementSync = {
  run(...params: unknown[]): StatementResult;
  get(...params: unknown[]): Record<string, unknown> | undefined;
};

export interface MarketSnapshotStore {
  close(): void;
  saveMarketSnapshot(market: GammaMarket, isWeatherLike: boolean): void;
  saveTradingDecision(decision: TradingDecision): void;
}

const require = createRequire(import.meta.url);

export function openMarketSnapshotStore(dbPath: string): MarketSnapshotStore {
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = require("node:sqlite") as { DatabaseSync: new (path: string) => DatabaseSync };
  const db = new sqlite.DatabaseSync(dbPath);
  db.exec(SQLITE_SCHEMA);

  return {
    close: () => db.close(),
    saveMarketSnapshot: (market, isWeatherLike) => saveMarketSnapshot(db, market, isWeatherLike),
    saveTradingDecision: (decision) => saveTradingDecision(db, decision),
  };
}

export function persistMarketSnapshot(
  store: MarketSnapshotStore,
  market: GammaMarket,
  isWeatherLike: boolean,
): void {
  store.saveMarketSnapshot(market, isWeatherLike);
}

function saveMarketSnapshot(db: DatabaseSync, market: GammaMarket, isWeatherLike: boolean): void {
  const now = new Date().toISOString();
  const snapshot = JSON.stringify(market);
  const title = market.question ?? market.slug ?? `Polymarket market ${market.id}`;
  const eventDate = market.endDateIso ?? market.endDate ?? null;

  db.prepare(`
    INSERT INTO polymarket_market_snapshots (
      market_id,
      condition_id,
      slug,
      question,
      category,
      active,
      closed,
      enable_order_book,
      accepting_orders,
      end_date,
      volume_num,
      liquidity_num,
      best_bid,
      best_ask,
      last_trade_price,
      clob_token_ids_json,
      outcomes_json,
      outcome_prices_json,
      is_weather_like,
      raw_json,
      fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    market.id,
    market.conditionId ?? null,
    market.slug ?? null,
    market.question ?? null,
    market.category ?? null,
    booleanToInteger(market.active),
    booleanToInteger(market.closed),
    booleanToInteger(market.enableOrderBook),
    booleanToInteger(market.acceptingOrders),
    eventDate,
    market.volumeNum ?? null,
    market.liquidityNum ?? null,
    market.bestBid ?? null,
    market.bestAsk ?? null,
    market.lastTradePrice ?? null,
    serializeMaybeJsonArray(market.clobTokenIds),
    serializeMaybeJsonArray(market.outcomes),
    serializeMaybeJsonArray(market.outcomePrices),
    isWeatherLike ? 1 : 0,
    snapshot,
    now,
  );

  if (isWeatherLike) {
    db.prepare(`
      INSERT INTO weather_markets (
        external_market_id,
        condition_id,
        slug,
        title,
        question,
        location,
        event_date,
        active,
        closed,
        enable_order_book,
        clob_token_ids_json,
        outcomes_json,
        outcome_prices_json,
        raw_json,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(external_market_id) DO UPDATE SET
        condition_id = excluded.condition_id,
        slug = excluded.slug,
        title = excluded.title,
        question = excluded.question,
        event_date = excluded.event_date,
        active = excluded.active,
        closed = excluded.closed,
        enable_order_book = excluded.enable_order_book,
        clob_token_ids_json = excluded.clob_token_ids_json,
        outcomes_json = excluded.outcomes_json,
        outcome_prices_json = excluded.outcome_prices_json,
        raw_json = excluded.raw_json,
        updated_at = datetime('now')
    `).run(
      market.id,
      market.conditionId ?? null,
      market.slug ?? null,
      title,
      market.question ?? null,
      null,
      eventDate,
      booleanToInteger(market.active),
      booleanToInteger(market.closed),
      booleanToInteger(market.enableOrderBook),
      serializeMaybeJsonArray(market.clobTokenIds),
      serializeMaybeJsonArray(market.outcomes),
      serializeMaybeJsonArray(market.outcomePrices),
      snapshot,
    );
  }
}

function booleanToInteger(value: boolean | null | undefined): number | null {
  if (typeof value !== "boolean") {
    return null;
  }

  return value ? 1 : 0;
}

function serializeMaybeJsonArray(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}


function saveTradingDecision(db: DatabaseSync, decision: TradingDecision): void {
  const marketRow = db.prepare("SELECT id FROM weather_markets WHERE external_market_id = ?").get(decision.marketId);
  const marketId = readRowId(marketRow);
  if (marketId === null) {
    throw new Error(`Cannot save paper decision for unknown weather market ${decision.marketId}.`);
  }

  const decisionResult = db.prepare(`
    INSERT INTO paper_decisions (
      market_id,
      side,
      action,
      confidence,
      estimated_probability,
      market_probability,
      edge,
      stake_cents,
      rationale,
      raw_json,
      simulated_price_cents,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    marketId,
    decision.side,
    decision.action,
    decision.confidence,
    decision.estimatedProbability,
    decision.marketProbability,
    decision.edge,
    decision.stakeCents,
    decision.reason,
    JSON.stringify(decision),
    decision.marketProbability === null ? null : Math.round(decision.marketProbability * 100),
    decision.createdAt,
  );

  if (decision.action !== "PAPER_TRADE" || decision.side === "skip") {
    return;
  }

  const decisionId = normalizeInsertedId(decisionResult.lastInsertRowid);
  db.prepare(`
    INSERT INTO paper_trades (
      decision_id,
      market_id,
      side,
      stake_cents,
      market_probability,
      estimated_probability,
      edge,
      opened_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    decisionId,
    marketId,
    decision.side,
    decision.stakeCents,
    decision.marketProbability,
    decision.estimatedProbability,
    decision.edge,
    decision.createdAt,
  );
}

function readRowId(row: Record<string, unknown> | undefined): number | null {
  const value = row?.id;
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  return null;
}

function normalizeInsertedId(value: number | bigint | undefined): number {
  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "number") {
    return value;
  }

  throw new Error("SQLite did not return a decision id for the paper trade.");
}
