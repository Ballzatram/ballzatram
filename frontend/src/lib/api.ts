import type { ToolOutput } from "@/lib/toolOutput";
import type { ParcelResearchResult } from "@/lib/parcel";

export type ApiError = { detail: string };
export type AgentProcess = { id: string; title: string; outcome: string; starter_prompt: string; steps: string[] };
export type AgentMessage = { role: "user" | "assistant"; content: string; created_at: string };
export type AgentChatResponse = { conversation_id: string; page_id: string; process_id: string; answer: string; structured_output?: ToolOutput; history: AgentMessage[] };
export type DataFreshness = {
  provider: string;
  source: string;
  status: "live" | "cached" | "demo" | "stale" | "fallback" | "missing" | "error" | "unknown";
  as_of?: string | null;
  retrieved_at: string;
  warnings: string[];
};
export type MarketStockAnalysisResponse = {
  status: "complete" | "partial_success";
  symbol: string;
  name: string;
  benchmark: string;
  range: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y";
  quote: { price: number; change: number; changePercent: number };
  metrics: {
    cumulativeReturn: number | null;
    rollingVolatility20d: number | null;
    maxDrawdown: number | null;
    movingAverage20d: number | null;
    movingAverage50d: number | null;
    rsi14: number | null;
    zScore20d: number | null;
    betaVsBenchmark: number | null;
    relativeStrengthVsBenchmark: number | null;
  };
  priceHistory: Array<{ date: string; close: number }>;
  freshness: DataFreshness;
  benchmarkFreshness: DataFreshness;
  warnings: string[];
};
export type MarketPortfolioAnalysisResponse = {
  status: "complete" | "partial_success";
  benchmark: string;
  range: MarketStockAnalysisResponse["range"];
  requestedWeightTotal: number;
  analyzedWeightTotal: number;
  metrics: {
    cumulativeReturn: number;
    annualizedReturn: number;
    annualizedVolatility: number;
    maxDrawdown: number;
    betaVsBenchmark: number | null;
    correlationVsBenchmark: number | null;
    benchmarkCumulativeReturn: number | null;
    topHoldingWeight: number;
    effectivePositions: number;
  };
  holdings: Array<{
    symbol: string;
    name: string;
    requestedWeight: number;
    normalizedWeight: number;
    annualizedVolatility: number | null;
    cumulativeReturn: number | null;
    riskContribution: number | null;
    freshness: DataFreshness;
  }>;
  correlationMatrix: { columns: string[]; matrix: Array<Array<number | null>> };
  benchmarkFreshness: DataFreshness | null;
  errors: Array<{ symbol: string; weight: number; message: string; provider: string }>;
  warnings: string[];
  scenarioPayload: { holdings: Record<string, number> };
};
export type ScenarioStressResponse = {
  portfolio_return_shock: number;
  confidence_band: [number, number];
  factor_contributions: Array<{ factor: string; shock: number; impact: number }>;
  warnings: {
    correlation_warning: string;
    model_assumptions: string[];
  };
};
export type MetricExplanation = {
  name: string;
  shortExplanation: string;
  whyItMatters: string;
  caveats: string[];
  interpretationRules: string[];
};
export type QuantLibrarySymbolMetrics = {
  lastClose: number | null;
  latestDailyReturn: number | null;
  cumulativeReturn: number | null;
  rollingVolatility20d: number | null;
  maxDrawdown: number | null;
  movingAverage20d: number | null;
  movingAverage50d: number | null;
  rsi14: number | null;
  zScore20d: number | null;
  betaVsBenchmark: number | null;
  relativeStrengthVsBenchmark: number | null;
};
export type QuantLibrarySymbolAnalytics = {
  symbol: string;
  name: string;
  quote: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    change_percent: number;
    currency: string;
    freshness: DataFreshness;
  };
  freshness: DataFreshness;
  metrics: QuantLibrarySymbolMetrics;
};
export type QuantLibraryAnalyticsDemoResponse = {
  status: "complete" | "partial_success";
  provider: string;
  benchmark: string;
  universe: { id: string; title: string; description: string };
  symbols: QuantLibrarySymbolAnalytics[];
  correlationMatrix: { columns: string[]; matrix: number[][] };
  rates: {
    yieldCurve: { points: Array<{ tenor: string; maturity_months: number; rate: number }>; freshness: DataFreshness } | null;
    spreads: Record<string, { status: string; latest: number | null; history: Array<{ date: string; value: number }> }>;
  };
  regime: { score: number; label: string; reasons: string[]; caveats: string[] };
  explanations: Record<string, MetricExplanation>;
  errors: Array<{ scope: string; symbol?: string; message: string; provider: string }>;
  caveats: string[];
};

export type ParcelResearchRequestBody = {
  thesis: {
    useCase: string;
    market: string;
    acreageRange: string;
    budget: string;
    mustHaves: string[];
    riskFactors: string[];
    notes: string;
    listingLinks: string[];
  };
  selectedOpportunityIds: string[];
  shortlistedOpportunityIds: string[];
  candidateInputs?: Array<{ sourceUrl?: string; notes: string; title?: string }>;
};

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

async function parseError(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await res.json()) as Partial<ApiError>;
    return body.detail ?? `API request failed with status ${res.status}`;
  }
  const body = await res.text();
  return body || `API request failed with status ${res.status}`;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

export const api = {
  demo: () => req<{ rows: number; columns: string[]; start: string; end: string }>("/data/demo"),
  stock: (body: unknown) => req<unknown>("/analyze/stock", { method: "POST", body: JSON.stringify(body) }),
  marketStock: (body: { symbol: string; benchmark?: string; range?: MarketStockAnalysisResponse["range"] }) =>
    req<MarketStockAnalysisResponse>("/analyze/stock/market", { method: "POST", body: JSON.stringify(body) }),
  marketPortfolio: (body: { holdings: Array<{ symbol: string; weight: number }>; benchmark?: string; range?: MarketPortfolioAnalysisResponse["range"] }) =>
    req<MarketPortfolioAnalysisResponse>("/analyze/portfolio/market", { method: "POST", body: JSON.stringify(body) }),
  scenario: (body: { name: string; shocks: Record<string, number>; holdings: Record<string, number> }) => req<ScenarioStressResponse>("/analyze/portfolio/scenario", { method: "POST", body: JSON.stringify(body) }),
  eventStudy: (body: unknown) => req<unknown>("/analyze/event-study", { method: "POST", body: JSON.stringify(body) }),
  quantLibraryAnalyticsDemo: (symbols: string[] = ["SPY", "QQQ", "TLT"], benchmark = "SPY", universeId = "major-us-indices") => {
    const params = new URLSearchParams({ benchmark, universe_id: universeId });
    symbols.forEach((symbol) => params.append("symbols", symbol));
    return req<QuantLibraryAnalyticsDemoResponse>(`/quant-library/analytics-demo?${params.toString()}`);
  },
  parcelResearch: (body: ParcelResearchRequestBody) =>
    req<ParcelResearchResult>("/parcel/research", { method: "POST", body: JSON.stringify(body) }),
  parcelCandidates: () => req<{ candidateRecords: ParcelResearchResult["candidateRecords"] }>("/parcel/candidates"),
  agentProcesses: () => req<{ processes: Record<string, AgentProcess[]> }>("/agent/processes"),
  agentChat: (body: unknown) => req<AgentChatResponse>("/agent/chat", { method: "POST", body: JSON.stringify(body) }),
};
