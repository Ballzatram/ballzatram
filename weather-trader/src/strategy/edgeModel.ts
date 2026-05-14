import type { GammaMarket } from "../markets/gammaClient.js";
import { parseStringArray } from "../markets/marketDiscovery.js";

export type TradeSide = "yes" | "no";

export interface MarketPrice {
  yes: number | null;
  no: number | null;
}

export interface EdgeEstimate {
  side: TradeSide;
  estimatedProbability: number;
  marketProbability: number;
  edge: number;
  reasons: string[];
}

export function extractMarketPrice(market: Pick<GammaMarket, "outcomePrices" | "bestAsk" | "lastTradePrice">): MarketPrice {
  const prices = parseStringArray(market.outcomePrices).map((value) => Number(value));
  const yes = normalizeProbability(prices[0] ?? market.bestAsk ?? market.lastTradePrice ?? null);
  const no = normalizeProbability(prices[1] ?? (yes === null ? null : 1 - yes));
  return { yes, no };
}

export function computeBestEdge(estimatedYesProbability: number, price: MarketPrice): EdgeEstimate | null {
  if (price.yes === null && price.no === null) {
    return null;
  }

  const yesEdge = price.yes === null ? Number.NEGATIVE_INFINITY : estimatedYesProbability - price.yes;
  const noProbability = 1 - estimatedYesProbability;
  const noEdge = price.no === null ? Number.NEGATIVE_INFINITY : noProbability - price.no;

  if (yesEdge >= noEdge && price.yes !== null) {
    return {
      side: "yes",
      estimatedProbability: roundTo(estimatedYesProbability, 3),
      marketProbability: price.yes,
      edge: roundTo(yesEdge, 3),
      reasons: [`Estimated YES probability exceeds market YES price by ${roundTo(yesEdge * 100, 1)} percentage points.`],
    };
  }

  if (price.no !== null) {
    return {
      side: "no",
      estimatedProbability: roundTo(noProbability, 3),
      marketProbability: price.no,
      edge: roundTo(noEdge, 3),
      reasons: [`Estimated NO probability exceeds market NO price by ${roundTo(noEdge * 100, 1)} percentage points.`],
    };
  }

  return null;
}

function normalizeProbability(value: number | null): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return value > 1 ? roundTo(value / 100, 4) : roundTo(value, 4);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
