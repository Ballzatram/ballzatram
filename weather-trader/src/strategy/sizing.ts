import { getMarketExposureCents, getOpenExposureCents, type PaperPortfolio } from "./portfolio.js";

export interface SizingInput {
  edge: number;
  confidence: number;
  marketProbability: number;
  portfolio: PaperPortfolio;
  marketId: string;
  settlementCanEvaluate: boolean;
  ambiguityReasons: string[];
}

export interface RiskLimits {
  minEdge: number;
  minConfidence: number;
  maxTradeCents: number;
  minTradeCents: number;
  maxPortfolioExposureCents: number;
  maxMarketExposureCents: number;
}

export interface SizingResult {
  approved: boolean;
  stakeCents: number;
  reasons: string[];
}

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  minEdge: 0.04,
  minConfidence: 0.4,
  maxTradeCents: 1_000,
  minTradeCents: 100,
  maxPortfolioExposureCents: 10_000,
  maxMarketExposureCents: 1_500,
};

export function sizePaperTrade(input: SizingInput, limits: RiskLimits = DEFAULT_RISK_LIMITS): SizingResult {
  const reasons: string[] = [];

  if (!input.settlementCanEvaluate) {
    reasons.push("Settlement rule is ambiguous or cannot be evaluated.");
  }

  for (const reason of input.ambiguityReasons) {
    reasons.push(reason);
  }

  if (input.edge < limits.minEdge) {
    reasons.push(`Edge ${formatPercent(input.edge)} is below minimum ${formatPercent(limits.minEdge)}.`);
  }

  if (input.confidence < limits.minConfidence) {
    reasons.push(`Confidence ${formatPercent(input.confidence)} is below minimum ${formatPercent(limits.minConfidence)}.`);
  }

  const openExposure = getOpenExposureCents(input.portfolio);
  if (openExposure >= limits.maxPortfolioExposureCents) {
    reasons.push("Portfolio exposure limit is already reached.");
  }

  const marketExposure = getMarketExposureCents(input.portfolio, input.marketId);
  if (marketExposure >= limits.maxMarketExposureCents) {
    reasons.push("Market exposure limit is already reached.");
  }

  if (reasons.length > 0) {
    return { approved: false, stakeCents: 0, reasons };
  }

  const edgeScaled = Math.min(input.edge / 0.2, 1);
  const confidenceScaled = Math.min(input.confidence, 1);
  const rawStake = Math.round(limits.maxTradeCents * edgeScaled * confidenceScaled);
  const remainingPortfolio = limits.maxPortfolioExposureCents - openExposure;
  const remainingMarket = limits.maxMarketExposureCents - marketExposure;
  const stakeCents = Math.min(limits.maxTradeCents, remainingPortfolio, remainingMarket, rawStake);

  if (stakeCents < limits.minTradeCents) {
    return {
      approved: false,
      stakeCents: 0,
      reasons: [`Calculated stake ${stakeCents} cents is below minimum ${limits.minTradeCents} cents.`],
    };
  }

  return {
    approved: true,
    stakeCents,
    reasons: [`Approved paper stake of ${stakeCents} cents within configured risk limits.`],
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}
