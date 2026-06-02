import type { BettingOutcome, LineHistoryPoint } from "@/lib/betting-data/types";

export type PayoutEstimate = {
  stake: number;
  profit: number;
  totalReturn: number;
};

export type LineMovementDirection = "probability-up" | "probability-down" | "flat" | "insufficient-data";

export type LineMovementReadout = {
  direction: LineMovementDirection;
  probabilityChange: number | null;
  fromOdds?: number;
  toOdds?: number;
  label: string;
};

export type OutcomeDistributionPoint = {
  outcomeId: string;
  label: string;
  rawImpliedProbability: number;
  normalizedProbability: number;
  note: string;
};

function assertValidAmericanOdds(odds: number) {
  if (!Number.isFinite(odds) || odds === 0) {
    throw new Error("American odds must be a finite non-zero number.");
  }
}

export function americanOddsToImpliedProbability(odds: number): number {
  assertValidAmericanOdds(odds);
  if (odds > 0) return 100 / (odds + 100);
  const absoluteOdds = Math.abs(odds);
  return absoluteOdds / (absoluteOdds + 100);
}

export function impliedProbabilityToAmericanOdds(probability: number): number | null {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) return null;
  if (probability <= 0.5) {
    return Math.round(((1 - probability) / probability) * 100);
  }
  return Math.round((-probability / (1 - probability)) * 100);
}

export function americanToDecimalOdds(odds: number): number {
  assertValidAmericanOdds(odds);
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

export function breakEvenProbability(odds: number): number {
  return americanOddsToImpliedProbability(odds);
}

export function estimatePayout(stake: number, odds: number): PayoutEstimate {
  assertValidAmericanOdds(odds);
  if (!Number.isFinite(stake) || stake < 0) {
    throw new Error("Stake must be a finite non-negative number.");
  }
  const profit = odds > 0 ? stake * (odds / 100) : stake * (100 / Math.abs(odds));
  return {
    stake,
    profit,
    totalReturn: stake + profit,
  };
}

export function simpleParlayProbability(probabilities: number[]): number | null {
  if (!probabilities.length) return null;
  if (probabilities.some((probability) => !Number.isFinite(probability) || probability <= 0 || probability >= 1)) {
    return null;
  }
  return probabilities.reduce((product, probability) => product * probability, 1);
}

export function approximateHoldFromMarket(outcomes: Pick<BettingOutcome, "impliedProbability">[]): number | null {
  if (outcomes.length < 2) return null;
  const totalImplied = outcomes.reduce((sum, outcome) => sum + outcome.impliedProbability, 0);
  return Math.max(0, totalImplied - 1);
}

export function getLineMovementDirection(points: LineHistoryPoint[]): LineMovementReadout {
  if (points.length < 2) {
    return {
      direction: "insufficient-data",
      probabilityChange: null,
      label: "Needs at least two observations",
    };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const probabilityChange = americanOddsToImpliedProbability(last.oddsAmerican) - americanOddsToImpliedProbability(first.oddsAmerican);

  if (Math.abs(probabilityChange) < 0.005) {
    return {
      direction: "flat",
      probabilityChange,
      fromOdds: first.oddsAmerican,
      toOdds: last.oddsAmerican,
      label: "Mostly unchanged",
    };
  }

  return {
    direction: probabilityChange > 0 ? "probability-up" : "probability-down",
    probabilityChange,
    fromOdds: first.oddsAmerican,
    toOdds: last.oddsAmerican,
    label: probabilityChange > 0 ? "Implied probability moved up" : "Implied probability moved down",
  };
}

export function basicOutcomeDistribution(outcomes: BettingOutcome[]): OutcomeDistributionPoint[] {
  const totalImplied = outcomes.reduce((sum, outcome) => sum + outcome.impliedProbability, 0);
  if (!outcomes.length || totalImplied <= 0) return [];

  return outcomes.map((outcome) => ({
    outcomeId: outcome.id,
    label: outcome.label,
    rawImpliedProbability: outcome.impliedProbability,
    normalizedProbability: outcome.impliedProbability / totalImplied,
    note: "Demo distribution normalizes the market probabilities so the outcomes add to 100%. It is not a forecast.",
  }));
}
