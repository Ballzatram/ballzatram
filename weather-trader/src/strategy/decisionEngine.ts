import type { GammaMarket } from "../markets/gammaClient.js";
import type { WeatherSnapshot } from "../weather/types.js";
import { computeBestEdge, extractMarketPrice, type TradeSide } from "./edgeModel.js";
import { parseWeatherMarket, type ParsedWeatherMarket } from "./marketParser.js";
import { DEFAULT_PAPER_PORTFOLIO, type PaperPortfolio } from "./portfolio.js";
import { estimateWeatherProbability } from "./probabilityModel.js";
import { buildSettlementRule } from "./settlementRules.js";
import { DEFAULT_RISK_LIMITS, sizePaperTrade, type RiskLimits } from "./sizing.js";

export type DecisionAction = "NO_TRADE" | "PAPER_TRADE";

export interface TradingDecision {
  action: DecisionAction;
  marketId: string;
  question: string;
  side: TradeSide | "skip";
  reason: string;
  reasons: string[];
  estimatedProbability: number | null;
  marketProbability: number | null;
  edge: number | null;
  confidence: number;
  stakeCents: number;
  parsedMarket: ParsedWeatherMarket;
  createdAt: string;
}

export interface DecisionEngineOptions {
  portfolio?: PaperPortfolio;
  riskLimits?: RiskLimits;
  weatherSnapshots?: WeatherSnapshot[];
  now?: Date;
}

export function decideMarket(market: GammaMarket, options: DecisionEngineOptions = {}): TradingDecision {
  const parsedMarket = parseWeatherMarket(market);
  const settlementRule = buildSettlementRule(parsedMarket);
  const probability = estimateWeatherProbability(parsedMarket, options.weatherSnapshots ?? []);
  const price = extractMarketPrice(market);
  const edge = computeBestEdge(probability.probability, price);
  const reasons = [...parsedMarket.ambiguityReasons, ...settlementRule.blockingReasons, ...probability.reasons];

  if (!edge) {
    reasons.push("No usable market price was available.");
    return noTrade(market, parsedMarket, reasons, probability.probability, null, null, probability.confidence, options.now);
  }

  reasons.push(...edge.reasons);
  const sizing = sizePaperTrade(
    {
      edge: edge.edge,
      confidence: probability.confidence,
      marketProbability: edge.marketProbability,
      portfolio: options.portfolio ?? DEFAULT_PAPER_PORTFOLIO,
      marketId: market.id,
      settlementCanEvaluate: settlementRule.canEvaluate,
      ambiguityReasons: parsedMarket.ambiguityReasons,
    },
    options.riskLimits ?? DEFAULT_RISK_LIMITS,
  );
  reasons.push(...sizing.reasons);

  if (!sizing.approved) {
    return noTrade(
      market,
      parsedMarket,
      reasons,
      edge.estimatedProbability,
      edge.marketProbability,
      edge.edge,
      probability.confidence,
      options.now,
    );
  }

  return {
    action: "PAPER_TRADE",
    marketId: market.id,
    question: market.question ?? market.slug ?? market.id,
    side: edge.side,
    reason: reasons.join(" "),
    reasons,
    estimatedProbability: edge.estimatedProbability,
    marketProbability: edge.marketProbability,
    edge: edge.edge,
    confidence: probability.confidence,
    stakeCents: sizing.stakeCents,
    parsedMarket,
    createdAt: (options.now ?? new Date()).toISOString(),
  };
}

function noTrade(
  market: GammaMarket,
  parsedMarket: ParsedWeatherMarket,
  reasons: string[],
  estimatedProbability: number | null,
  marketProbability: number | null,
  edge: number | null,
  confidence: number,
  now?: Date,
): TradingDecision {
  const finalReasons = reasons.length > 0 ? reasons : ["No trade criteria were met."];
  return {
    action: "NO_TRADE",
    marketId: market.id,
    question: market.question ?? market.slug ?? market.id,
    side: "skip",
    reason: finalReasons.join(" "),
    reasons: finalReasons,
    estimatedProbability,
    marketProbability,
    edge,
    confidence,
    stakeCents: 0,
    parsedMarket,
    createdAt: (now ?? new Date()).toISOString(),
  };
}
