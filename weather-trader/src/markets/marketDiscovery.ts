import type { Logger } from "../logger/logger.js";
import { GammaClient, GammaClientError, type GammaMarket } from "./gammaClient.js";
import { persistMarketSnapshot, type MarketSnapshotStore } from "../db/marketSnapshotStore.js";
import { decideMarket, type TradingDecision } from "../strategy/decisionEngine.js";
import { parseWeatherMarket } from "../strategy/marketParser.js";
import type { WeatherSourceRegistry } from "../weather/sourceRegistry.js";
import { resolveWeatherSnapshots, type WeatherDataStatus } from "../weather/weatherSnapshotResolver.js";
import { PaperBroker } from "../strategy/paperBroker.js";

const WEATHER_KEYWORDS = [
  "weather",
  "temperature",
  "temperatures",
  "rain",
  "raining",
  "rainfall",
  "snow",
  "snowfall",
  "hurricane",
  "tornado",
  "storm",
  "wildfire",
  "heat wave",
  "heatwave",
  "coldest",
  "hottest",
  "degrees",
  "fahrenheit",
  "celsius",
  "precipitation",
  "climate",
] as const;

export interface MarketDiscoveryOptions {
  gammaClient: GammaClient;
  store: MarketSnapshotStore;
  logger: Logger;
  limit: number;
  weatherSourceRegistry: WeatherSourceRegistry;
}

export interface WeatherMarketSummary {
  id: string;
  question: string;
  slug: string | null;
  category: string | null;
  endDate: string | null;
  clobTokenIds: string[];
  matchedKeywords: string[];
}

export interface WeatherDataStatusSummary {
  marketId: string;
  status: WeatherDataStatus;
  sourceNames: string[];
  reasons: string[];
}

export interface MarketDiscoveryResult {
  ok: boolean;
  fetchedMarkets: number;
  activeMarkets: number;
  weatherMarkets: number;
  storedSnapshots: number;
  storedWeatherMarkets: number;
  weatherLikeMarkets: WeatherMarketSummary[];
  decisions: TradingDecision[];
  paperTrades: number;
  noTrades: number;
  errors: Array<{ source: "gamma" | "sqlite" | "paper_broker"; message: string }>;
  weatherSnapshotAttempts: number;
  weatherSnapshotSuccesses: number;
  weatherSnapshotFailures: number;
  weatherDataStatuses: WeatherDataStatusSummary[];
}

export async function runMarketDiscovery(options: MarketDiscoveryOptions): Promise<MarketDiscoveryResult> {
  const result: MarketDiscoveryResult = {
    ok: true,
    fetchedMarkets: 0,
    activeMarkets: 0,
    weatherMarkets: 0,
    storedSnapshots: 0,
    storedWeatherMarkets: 0,
    weatherLikeMarkets: [],
    decisions: [],
    paperTrades: 0,
    noTrades: 0,
    errors: [],
    weatherSnapshotAttempts: 0,
    weatherSnapshotSuccesses: 0,
    weatherSnapshotFailures: 0,
    weatherDataStatuses: [],
  };

  let markets: GammaMarket[];
  try {
    markets = await options.gammaClient.listMarkets({ limit: options.limit, closed: false });
  } catch (error) {
    const message = error instanceof GammaClientError ? error.message : "Unexpected market discovery failure.";
    options.logger.warn("Polymarket market discovery failed", { message });
    return {
      ...result,
      ok: false,
      errors: [{ source: "gamma", message }],
    };
  }

  const activeMarkets = markets.filter((market) => market.active !== false && market.closed !== true);
  result.fetchedMarkets = markets.length;
  result.activeMarkets = activeMarkets.length;

  const paperBroker = new PaperBroker(options.store);

  for (const market of activeMarkets) {
    const weatherMatch = getWeatherMatch(market);

    try {
      persistMarketSnapshot(options.store, market, weatherMatch.matched);
      result.storedSnapshots += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to persist market snapshot.";
      options.logger.warn("Failed to persist Polymarket market snapshot", { marketId: market.id, message });
      result.ok = false;
      result.errors.push({ source: "sqlite", message });
      continue;
    }

    if (weatherMatch.matched) {
      const summary = summarizeWeatherMarket(market, weatherMatch.keywords);
      result.weatherLikeMarkets.push(summary);
      result.weatherMarkets += 1;
      result.storedWeatherMarkets += 1;
      options.logger.info("Discovered weather-like Polymarket market", { ...summary });

      const parsedMarket = parseWeatherMarket(market);
      result.weatherSnapshotAttempts += 1;
      const weatherResolution = await resolveWeatherSnapshots({
        parsedMarket,
        registry: options.weatherSourceRegistry,
        logger: options.logger,
      });
      result.weatherDataStatuses.push({
        marketId: market.id,
        status: weatherResolution.status,
        sourceNames: weatherResolution.sourcesUsed,
        reasons: weatherResolution.reasons,
      });
      if (weatherResolution.status === "resolved") {
        result.weatherSnapshotSuccesses += 1;
      } else {
        result.weatherSnapshotFailures += 1;
      }

      const decision = decideMarket(market, { weatherSnapshots: weatherResolution.snapshots });
      try {
        options.store.saveWeatherSnapshotAudit?.(market.id, weatherResolution);
        paperBroker.recordDecision(decision);
        result.decisions.push(decision);
        if (decision.action === "PAPER_TRADE") {
          result.paperTrades += 1;
        } else {
          result.noTrades += 1;
        }
        options.logger.info("Recorded paper-mode weather decision", {
          marketId: decision.marketId,
          action: decision.action,
          reason: decision.reason,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to record paper decision.";
        options.logger.warn("Failed to record paper-mode weather decision", { marketId: market.id, message });
        result.ok = false;
        result.errors.push({ source: "paper_broker", message });
      }
    }
  }

  return result;
}

export function isWeatherMarket(market: GammaMarket): boolean {
  return getWeatherMatch(market).matched;
}

export function getWeatherMatch(market: GammaMarket): { matched: boolean; keywords: string[] } {
  const haystack = [
    market.question,
    market.slug,
    market.description,
    market.category,
    ...(market.events ?? []).flatMap((event) => [event.title, event.slug, event.description, event.category]),
    ...(market.tags ?? []).flatMap((tag) => [tag.label, tag.slug]),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  const keywords = WEATHER_KEYWORDS.filter((keyword) => haystack.includes(keyword));
  return { matched: keywords.length > 0, keywords: [...keywords] };
}

function summarizeWeatherMarket(market: GammaMarket, matchedKeywords: string[]): WeatherMarketSummary {
  return {
    id: market.id,
    question: market.question ?? "Untitled Polymarket market",
    slug: market.slug ?? null,
    category: market.category ?? null,
    endDate: market.endDateIso ?? market.endDate ?? null,
    clobTokenIds: parseStringArray(market.clobTokenIds),
    matchedKeywords,
  };
}

export function parseStringArray(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
}
