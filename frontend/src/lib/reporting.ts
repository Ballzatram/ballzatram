import type { MarketPortfolioAnalysisResponse, MarketStockAnalysisResponse, ScenarioStressResponse } from "@/lib/api";

export type ReportSourceKind = "stock" | "portfolio" | "scenario";

export type ReportableSection = {
  id: string;
  sourceKind: ReportSourceKind;
  title: string;
  createdAt: string;
  findings: string[];
  assumptions: string[];
  warnings: string[];
  provenance: string[];
  scenarioOutcomes: Record<string, number>;
};

type StoredStockRun = {
  savedAt: string;
  request: { symbol: string; benchmark: string; range: string };
  result: MarketStockAnalysisResponse;
};

type StoredPortfolioRun = {
  savedAt: string;
  request: { holdings: Array<{ symbol: string; weight: number }>; benchmark: string; range: string };
  result: MarketPortfolioAnalysisResponse;
};

type StoredScenarioRun = {
  savedAt: string;
  id: string;
  name: string;
  holdings: Record<string, number>;
  shocks: Record<string, number>;
  result: ScenarioStressResponse;
};

const pct = (value: number | null | undefined, digits = 1) => value == null ? "n/a" : `${(value * 100).toFixed(digits)}%`;
const num = (value: number | null | undefined, digits = 2) => value == null ? "n/a" : value.toFixed(digits);

export function stockRunToReport(run: StoredStockRun): ReportableSection {
  const result = run.result;
  return {
    id: `stock-${run.savedAt}`,
    sourceKind: "stock",
    title: `${result.symbol} Stock Lab analysis`,
    createdAt: run.savedAt,
    findings: [
      `${result.symbol} last price: $${num(result.quote.price)}; selected-window cumulative return: ${pct(result.metrics.cumulativeReturn)}.`,
      `20-day annualized volatility: ${pct(result.metrics.rollingVolatility20d)}; max drawdown: ${pct(result.metrics.maxDrawdown)}.`,
      `Beta versus ${result.benchmark}: ${num(result.metrics.betaVsBenchmark, 3)}; relative strength: ${pct(result.metrics.relativeStrengthVsBenchmark)}.`,
      `RSI(14): ${num(result.metrics.rsi14, 1)}; 20-day z-score: ${num(result.metrics.zScore20d)}.`,
    ],
    assumptions: [
      `History range: ${result.range}.`,
      `Benchmark: ${result.benchmark}.`,
      "Historical price relationships are descriptive rather than forecasts.",
    ],
    warnings: [...result.freshness.warnings, ...result.warnings],
    provenance: [
      `Provider: ${result.freshness.provider}.`,
      `Source: ${result.freshness.source}.`,
      `Status: ${result.freshness.status}; as of ${result.freshness.as_of ?? "unknown"}; retrieved ${result.freshness.retrieved_at}.`,
    ],
    scenarioOutcomes: {},
  };
}

export function portfolioRunToReport(run: StoredPortfolioRun): ReportableSection {
  const result = run.result;
  const largest = result.holdings.slice().sort((a, b) => b.normalizedWeight - a.normalizedWeight)[0];
  return {
    id: `portfolio-${run.savedAt}`,
    sourceKind: "portfolio",
    title: "Portfolio Lab risk analysis",
    createdAt: run.savedAt,
    findings: [
      `Portfolio cumulative return: ${pct(result.metrics.cumulativeReturn)}; annualized return: ${pct(result.metrics.annualizedReturn)}.`,
      `Annualized volatility: ${pct(result.metrics.annualizedVolatility)}; max drawdown: ${pct(result.metrics.maxDrawdown)}.`,
      `Beta versus ${result.benchmark}: ${num(result.metrics.betaVsBenchmark, 3)}; correlation: ${num(result.metrics.correlationVsBenchmark, 3)}.`,
      `Top holding weight: ${pct(result.metrics.topHoldingWeight)}; effective positions: ${num(result.metrics.effectivePositions, 1)}${largest ? `; largest analyzed holding: ${largest.symbol} at ${pct(largest.normalizedWeight)}` : ""}.`,
    ],
    assumptions: [
      `History range: ${result.range}.`,
      "Weights are normalized across holdings with usable market data.",
      "Risk contribution is estimated from historical daily covariance.",
    ],
    warnings: result.warnings,
    provenance: result.holdings.map((holding) => `${holding.symbol}: ${holding.freshness.provider} / ${holding.freshness.status} / ${holding.freshness.source} / as-of ${holding.freshness.as_of ?? "unknown"}.`),
    scenarioOutcomes: {},
  };
}

export function scenarioRunToReport(run: StoredScenarioRun): ReportableSection {
  const result = run.result;
  const driverText = result.factor_contributions
    .slice()
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .map((item) => `${item.factor}: shock ${item.shock.toFixed(2)}, impact ${pct(item.impact)}`);
  return {
    id: `scenario-${run.savedAt}-${run.id}`,
    sourceKind: "scenario",
    title: `${run.name} scenario stress`,
    createdAt: run.savedAt,
    findings: [
      `Incremental stressed portfolio return: ${pct(result.portfolio_return_shock)}.`,
      `Illustrative confidence band: ${pct(result.confidence_band[0])} to ${pct(result.confidence_band[1])}.`,
      ...driverText,
    ],
    assumptions: [
      ...result.warnings.model_assumptions,
      "Current scenario engine applies fixed portfolio-level factor sensitivities rather than security-specific estimated exposures.",
    ],
    warnings: [result.warnings.correlation_warning],
    provenance: [
      `Scenario shocks: ${Object.entries(run.shocks).map(([factor, value]) => `${factor}=${value}`).join(", ")}.`,
      `Portfolio weights: ${Object.entries(run.holdings).map(([symbol, weight]) => `${symbol}=${pct(weight)}`).join(", ")}.`,
      `Run saved: ${run.savedAt}.`,
    ],
    scenarioOutcomes: { [run.name]: result.portfolio_return_shock },
  };
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function readLatestReportSources(): Partial<Record<ReportSourceKind, ReportableSection>> {
  if (typeof window === "undefined") return {};
  const stock = safeParse<StoredStockRun>(localStorage.getItem("ballzatram:stock-last-run:v1"));
  const portfolio = safeParse<StoredPortfolioRun>(localStorage.getItem("ballzatram:portfolio-last-run:v1"));
  const scenario = safeParse<StoredScenarioRun>(localStorage.getItem("ballzatram:scenario-last-run:v1"));
  return {
    ...(stock?.result ? { stock: stockRunToReport(stock) } : {}),
    ...(portfolio?.result ? { portfolio: portfolioRunToReport(portfolio) } : {}),
    ...(scenario?.result ? { scenario: scenarioRunToReport(scenario) } : {}),
  };
}
