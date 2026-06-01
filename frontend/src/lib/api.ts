import type { ToolOutput } from "@/lib/toolOutput";

export type ApiError = { detail: string };
export type AgentProcess = { id: string; title: string; outcome: string; starter_prompt: string; steps: string[] };
export type AgentMessage = { role: "user" | "assistant"; content: string; created_at: string };
export type AgentChatResponse = { conversation_id: string; page_id: string; process_id: string; answer: string; structured_output?: ToolOutput; history: AgentMessage[] };
export type DataFreshness = {
  provider: string;
  source: string;
  status: "live" | "fallback" | "missing" | "error" | "unknown";
  as_of?: string | null;
  retrieved_at: string;
  warnings: string[];
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
  scenario: (body: unknown) => req<unknown>("/analyze/portfolio/scenario", { method: "POST", body: JSON.stringify(body) }),
  eventStudy: (body: unknown) => req<unknown>("/analyze/event-study", { method: "POST", body: JSON.stringify(body) }),
  quantLibraryAnalyticsDemo: (symbols: string[] = ["SPY", "QQQ", "TLT"], benchmark = "SPY", universeId = "major-us-indices") => {
    const params = new URLSearchParams({ benchmark, universe_id: universeId });
    symbols.forEach((symbol) => params.append("symbols", symbol));
    return req<QuantLibraryAnalyticsDemoResponse>(`/quant-library/analytics-demo?${params.toString()}`);
  },
  agentProcesses: () => req<{ processes: Record<string, AgentProcess[]> }>("/agent/processes"),
  agentChat: (body: unknown) => req<AgentChatResponse>("/agent/chat", { method: "POST", body: JSON.stringify(body) }),
};
