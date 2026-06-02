"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AIIntakePanel,
  ExportSaveActionBar,
  LoadingState,
  NextActionPanel,
  RecommendationCard,
  ResultCards,
  RiskCard,
  SourceList,
} from "@/components/ai-tools/ToolPrimitives";
import {
  AnalysisSection,
  DataFreshnessBadge,
  DeskNote,
  EmptyState,
  ErrorState,
  ExplanationPanel,
  MetricCard,
  RiskBadge,
  ToolGeneratedStoryCard,
} from "@/components/quant-library/QuantLibraryPrimitives";
import { api, type DataFreshness, type QuantLibraryAnalyticsDemoResponse, type QuantLibrarySymbolAnalytics } from "@/lib/api";
import type { ToolCard, ToolConfidence, ToolRisk, ToolSource, ToolStatus } from "@/lib/toolOutput";

type IntakeQuestion = {
  id: string;
  question: string;
  why?: string;
  placeholder?: string;
};

type IntakeResponse = {
  prompt: string;
  inferred: Record<string, string>;
  clarifyingQuestions: IntakeQuestion[];
  status: ToolStatus;
  summary: string;
  missingData: string[];
  recommendedNextSteps: string[];
};

type WorkspaceVersion = {
  version_id: string;
  created_at: string;
  assumptions: Record<string, unknown>;
  cards: ToolCard[];
  analyst_outputs: Array<Record<string, unknown>>;
  recommendations: Array<Record<string, unknown>>;
  warnings: ToolCard[];
  data_sources?: string[];
  summary?: string;
  risks?: ToolRisk[];
  missing_data?: string[];
  recommended_next_steps?: string[];
  sources?: ToolSource[];
  confidence?: ToolConfidence;
  status?: ToolStatus;
};

type Workspace = {
  workspace_id: string;
  title: string;
  original_prompt: string;
  assumptions: Record<string, unknown>;
  versions: WorkspaceVersion[];
  updated_at: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload.detail;
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return payload as T;
}

function parseAssumptions(value: string, clarifyingAnswers: Record<string, string>) {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  return {
    ...parsed,
    clarifyingAnswers,
  };
}

function versionOutput(version: WorkspaceVersion) {
  return {
    summary: version.summary || "This workspace was created before the standard summary field existed.",
    cards: version.cards ?? [],
    risks: version.risks ?? [],
    missingData: version.missing_data ?? [],
    recommendedNextSteps: version.recommended_next_steps ?? [],
    sources: version.sources ?? [],
    confidence: version.confidence ?? "medium",
    status: version.status ?? "complete",
  };
}

type DeskId =
  | "overview"
  | "rates"
  | "index-etf"
  | "stock"
  | "risk"
  | "technical"
  | "portfolio"
  | "notes";

type DeskDefinition = {
  id: DeskId;
  title: string;
  shortTitle: string;
  route: string;
  status: "live" | "structured" | "draft";
  accent: string;
  what: string;
  why: string;
  caveats: string[];
  next: string[];
  storyHeadline: string;
  storySummary: string;
};

const deskDefinitions: DeskDefinition[] = [
  {
    id: "overview",
    title: "Overview",
    shortTitle: "Overview",
    route: "/quant-library",
    status: "live",
    accent: "Market map",
    what: "Frames the current market sample as a set of signals, caveats, and questions to investigate.",
    why: "A shared overview keeps the desk from over-reading one chart or one symbol.",
    caveats: ["Demo data can look tidy even when live feeds are stale or unavailable.", "A strong sample can still be a noisy starting point."],
    next: ["Check freshness and fallback labels.", "Compare the first signal against benchmark and rates context.", "Write down what would make the interpretation weaker."],
    storyHeadline: "Market desk opens with a mixed signal board",
    storySummary: "A future story can summarize the sample, cite its data freshness, and link back to this overview.",
  },
  {
    id: "rates",
    title: "Rates Desk",
    shortTitle: "Rates",
    route: "/scenario",
    status: "structured",
    accent: "Curve watch",
    what: "Reads yield-curve levels and spreads as context for rate-sensitive assets and scenarios.",
    why: "Historically, curve shape can reflect policy pressure, growth worries, and term-premium shifts.",
    caveats: ["Curve inversions are not clocks.", "Synthetic/demo rates are useful for workflow testing, not real-time market calls."],
    next: ["Compare 2Y/10Y with 3M/10Y.", "Check whether rate-sensitive assets are moving with or against the curve.", "Look for publication lag or fallback warnings."],
    storyHeadline: "Rates desk flags the curve before the model speaks",
    storySummary: "A future rates story can explain curve shape, spread direction, and what the desk refuses to infer.",
  },
  {
    id: "index-etf",
    title: "Index & ETF Explorer",
    shortTitle: "Indices",
    route: "/portfolio",
    status: "structured",
    accent: "Breadth lens",
    what: "Compares broad index and ETF proxies using return, drawdown, volatility, and correlation context.",
    why: "Indices and ETFs are often cleaner first-pass lenses than isolated single-name movement.",
    caveats: ["ETF labels can hide concentration and sector overlap.", "Relative strength depends on benchmark choice."],
    next: ["Inspect correlation before assuming diversification.", "Compare leadership with drawdown quality.", "Check whether one component is dominating the signal."],
    storyHeadline: "ETF tape shows leadership, but the label is not the exposure",
    storySummary: "A future explorer story can turn ETF metrics into a plain-English note with source and concentration caveats.",
  },
  {
    id: "stock",
    title: "Stock Analyzer",
    shortTitle: "Stocks",
    route: "/stock",
    status: "structured",
    accent: "Driver check",
    what: "Frames a symbol against benchmark sensitivity, momentum context, and caveats.",
    why: "Plain-English factor context can help users understand what may have moved a stock without treating the model as an oracle.",
    caveats: ["Historical beta is descriptive, not a promise about the next move.", "Single-name work needs business, valuation, and event context outside this demo."],
    next: ["Compare beta with drawdown and relative strength.", "Ask whether the benchmark is the right comparison.", "List external company-specific context before writing a note."],
    storyHeadline: "Single-name readout asks better questions before it names causes",
    storySummary: "A future stock story can cite the metric panel while avoiding instruction language.",
  },
  {
    id: "risk",
    title: "Risk Scanner",
    shortTitle: "Risk",
    route: "/model-compare",
    status: "structured",
    accent: "Warning rail",
    what: "Collects drawdown, volatility, correlation, missing-data, and regime-score warnings.",
    why: "Risk review is most useful when it appears before a conclusion hardens.",
    caveats: ["Risk metrics can look precise while still missing regime shifts and tail events.", "A calm sample does not remove future uncertainty."],
    next: ["Find the deepest drawdown and ask what caused it.", "Check whether correlations rise together.", "Write the weakest assumption in the note."],
    storyHeadline: "Risk scanner keeps the caveat above the conclusion",
    storySummary: "A future risk story can summarize what might break the current interpretation.",
  },
  {
    id: "technical",
    title: "Technical Analysis Lab",
    shortTitle: "Technicals",
    route: "/event-study",
    status: "structured",
    accent: "Signal lab",
    what: "Uses moving averages, RSI, and z-scores as time-series context, not as commands.",
    why: "Technical signals can help phrase testable chart questions when paired with source quality and caveats.",
    caveats: ["Patterns can overfit noise, especially when the lookback window is chosen after the fact.", "Momentum can stay stretched longer than expected."],
    next: ["Compare RSI with trend and volatility.", "Ask whether the lookback window was chosen fairly.", "Pair chart context with rates and risk context."],
    storyHeadline: "Technical lab treats the chart like evidence, not scripture",
    storySummary: "A future lab story can explain the signal, the window, and the false-positive risk.",
  },
  {
    id: "portfolio",
    title: "Portfolio Sandbox",
    shortTitle: "Portfolio",
    route: "/portfolio",
    status: "draft",
    accent: "What-if bench",
    what: "Prepares scenario and holdings questions around weights, shocks, concentration, and missing data.",
    why: "Market analysis becomes more useful when assumptions are visible and reversible.",
    caveats: ["A sandbox can feel personal even when the model is still generic.", "Demo holdings and generic shocks should not be treated as account advice."],
    next: ["Check concentration before interpreting the whole portfolio.", "Document the shock size and why it was chosen.", "Separate observed data from user-specific constraints."],
    storyHeadline: "Portfolio sandbox marks assumptions before it touches the weights",
    storySummary: "A future sandbox story can link each conclusion back to holdings, shocks, and caveats.",
  },
  {
    id: "notes",
    title: "Research Notes",
    shortTitle: "Notes",
    route: "/reports",
    status: "draft",
    accent: "Story queue",
    what: "Turns findings, caveats, source notes, and investigation prompts into story-ready research drafts.",
    why: "A useful quant desk should leave an audit trail that explains how an interpretation was formed.",
    caveats: ["A polished note can still be wrong if the data, assumptions, or model are weak.", "Story generation must preserve source freshness and uncertainty."],
    next: ["Attach freshness metadata to every note.", "Name the metric and its caveat in the same paragraph.", "Link each story back to the analysis that produced it."],
    storyHeadline: "Research notes wait for the reporter, not the oracle",
    storySummary: "A future newspaper story can emerge from this desk once generation persistence is ready.",
  },
];

function formatNumber(value: number | null | undefined, digits = 2) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

function latestFreshness(analyticsDemo: QuantLibraryAnalyticsDemoResponse | null): DataFreshness | null {
  return analyticsDemo?.symbols[0]?.freshness ?? analyticsDemo?.rates.yieldCurve?.freshness ?? null;
}

function symbolByIndex(analyticsDemo: QuantLibraryAnalyticsDemoResponse | null, index: number): QuantLibrarySymbolAnalytics | null {
  return analyticsDemo?.symbols[index] ?? null;
}

function renderDeskMetrics(deskId: DeskId, analyticsDemo: QuantLibraryAnalyticsDemoResponse | null) {
  const first = symbolByIndex(analyticsDemo, 0);
  const second = symbolByIndex(analyticsDemo, 1);
  const third = symbolByIndex(analyticsDemo, 2);
  const spreads = analyticsDemo?.rates.spreads;
  const explanations = analyticsDemo?.explanations ?? {};

  if (!analyticsDemo || !first) {
    return [
      <MetricCard key="empty-feed" label="Feed" value="Waiting" detail="The desk is open, but the data feed is not responding yet." tone="amber" />,
      <MetricCard key="empty-sample" label="Sample" value="0" detail="This metric needs at least one loaded symbol." />,
      <MetricCard key="empty-story" label="Story state" value="Draft" detail="Story generation waits for structured analysis output." tone="cyan" />,
    ];
  }

  switch (deskId) {
    case "rates":
      return [
        <MetricCard key="2y10y" label="2Y / 10Y spread" value={`${formatNumber(spreads?.["2y10y"]?.latest, 2)} pts`} detail="Historically this can indicate curve pressure when it turns negative." tone="cyan" explanation={explanations.yieldCurveSpreads} />,
        <MetricCard key="3m10y" label="3M / 10Y spread" value={`${formatNumber(spreads?.["3m10y"]?.latest, 2)} pts`} detail="Worth investigating alongside policy-rate and growth context." tone="cyan" />,
        <MetricCard key="curve-points" label="Curve points" value={`${analyticsDemo.rates.yieldCurve?.points.length ?? 0}`} detail="The curve needs current rates observations to read cleanly." />,
      ];
    case "index-etf":
      return [first, second, third].filter(Boolean).map((row) => (
        <MetricCard key={row!.symbol} label={`${row!.symbol} cumulative`} value={formatPercent(row!.metrics.cumulativeReturn)} detail={`${row!.name} vs ${analyticsDemo.benchmark} context.`} tone={row!.symbol === analyticsDemo.benchmark ? "emerald" : "slate"} explanation={explanations.cumulativeReturns} />
      ));
    case "stock":
      return [
        <MetricCard key="beta" label={`${first.symbol} beta`} value={formatNumber(first.metrics.betaVsBenchmark, 2)} detail={`Historical sensitivity versus ${analyticsDemo.benchmark}.`} tone="cyan" explanation={explanations.betaVsBenchmark} />,
        <MetricCard key="relative" label="Relative strength" value={formatPercent(first.metrics.relativeStrengthVsBenchmark)} detail="This may suggest leadership or lagging in the selected sample." explanation={explanations.relativeStrength} />,
        <MetricCard key="zscore" label="Return z-score" value={formatNumber(first.metrics.zScore20d, 2)} detail="A distance-from-average readout, not an instruction." tone="amber" explanation={explanations.zScore} />,
      ];
    case "risk":
      return [
        <MetricCard key="drawdown" label="Max drawdown" value={formatPercent(first.metrics.maxDrawdown)} detail="Deep drawdowns are worth investigating before writing a conclusion." tone="rose" explanation={explanations.maxDrawdown} />,
        <MetricCard key="vol" label="20d volatility" value={formatPercent(first.metrics.rollingVolatility20d)} detail="Rising volatility means uncertainty increased, not direction." tone="amber" explanation={explanations.rollingVolatility} />,
        <MetricCard key="regime" label="Regime score" value={formatNumber(analyticsDemo.regime.score, 0)} detail={analyticsDemo.regime.label} tone="cyan" explanation={explanations.regimeScore} />,
      ];
    case "technical":
      return [
        <MetricCard key="ma20" label="20d average" value={formatNumber(first.metrics.movingAverage20d)} detail="Shorter trend context for the selected sample." explanation={explanations.movingAverage} />,
        <MetricCard key="ma50" label="50d average" value={formatNumber(first.metrics.movingAverage50d)} detail="Longer trend context for the selected sample." />,
        <MetricCard key="rsi" label="RSI 14" value={formatNumber(first.metrics.rsi14, 1)} detail="Momentum context can stay stretched in trends." tone="amber" explanation={explanations.rsi} />,
      ];
    case "portfolio":
      return [
        <MetricCard key="portfolio-drawdown" label="Proxy drawdown" value={formatPercent(first.metrics.maxDrawdown)} detail="A first proxy for stress, not a user-specific result." tone="rose" />,
        <MetricCard key="portfolio-correlation" label="Matrix size" value={`${analyticsDemo.correlationMatrix.columns.length} assets`} detail="Correlation can help find hidden overlap." explanation={explanations.correlationMatrix} />,
        <MetricCard key="portfolio-freshness" label="Provider" value={analyticsDemo.provider} detail="Fallback status must travel with any sandbox result." tone="amber" />,
      ];
    case "notes":
      return [
        <MetricCard key="note-symbols" label="Symbols attached" value={`${analyticsDemo.symbols.length}`} detail="A story should link back to the symbols and metrics that shaped it." tone="cyan" />,
        <MetricCard key="note-caveats" label="Caveats attached" value={`${analyticsDemo.caveats.length}`} detail="Caveats are part of the note, not footnote debris." tone="amber" />,
        <MetricCard key="note-feed" label="Feed status" value={latestFreshness(analyticsDemo)?.status ?? "unknown"} detail="Story output should preserve the data label." />,
      ];
    default:
      return [
        <MetricCard key="regime" label="Regime score" value={formatNumber(analyticsDemo.regime.score, 0)} detail={analyticsDemo.regime.label} tone="cyan" explanation={explanations.regimeScore} />,
        <MetricCard key="symbols" label="Loaded symbols" value={`${analyticsDemo.symbols.length}`} detail={`${analyticsDemo.universe.title} sample.`} tone="emerald" />,
        <MetricCard key="errors" label="Provider errors" value={`${analyticsDemo.errors.length}`} detail={analyticsDemo.errors.length ? "Some feeds need attention." : "No provider errors in this demo run."} tone={analyticsDemo.errors.length ? "rose" : "slate"} />,
      ];
  }
}

function DeskEvidenceTable({ deskId, analyticsDemo }: { deskId: DeskId; analyticsDemo: QuantLibraryAnalyticsDemoResponse | null }) {
  if (!analyticsDemo) {
    return <EmptyState title="The desk is open, but the data feed is not responding." message="Demo data or live provider output will appear here when the analytics endpoint responds." />;
  }

  if (deskId === "rates") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-4">
          <h3 className="text-lg font-semibold text-white">Yield curve sample</h3>
          <p className="mt-1 text-sm text-slate-400">Shown as context for rates analysis; read freshness before reading shape.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr><th className="p-3">Tenor</th><th className="p-3">Months</th><th className="p-3">Rate</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {(analyticsDemo.rates.yieldCurve?.points ?? []).map((point) => (
                <tr key={point.tenor}><td className="p-3 font-semibold text-white">{point.tenor}</td><td className="p-3">{point.maturity_months}</td><td className="p-3">{formatNumber(point.rate, 2)}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-4">
        <h3 className="text-lg font-semibold text-white">Sample metric table</h3>
        <p className="mt-1 text-sm text-slate-400">A compact desk table for comparing loaded symbols without over-reading one metric.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr><th className="p-3">Symbol</th><th className="p-3">Close</th><th className="p-3">Cum. return</th><th className="p-3">Volatility</th><th className="p-3">Drawdown</th><th className="p-3">RSI</th><th className="p-3">Beta</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {analyticsDemo.symbols.map((row) => (
              <tr key={row.symbol}>
                <td className="p-3 font-semibold text-white">{row.symbol}</td>
                <td className="p-3">{formatNumber(row.metrics.lastClose)}</td>
                <td className="p-3">{formatPercent(row.metrics.cumulativeReturn)}</td>
                <td className="p-3">{formatPercent(row.metrics.rollingVolatility20d)}</td>
                <td className="p-3">{formatPercent(row.metrics.maxDrawdown)}</td>
                <td className="p-3">{formatNumber(row.metrics.rsi14, 1)}</td>
                <td className="p-3">{formatNumber(row.metrics.betaVsBenchmark, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function QuantLibraryPage() {
  const [prompt, setPrompt] = useState("Explain what may be moving markets right now while keeping caveats visible");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [assumptionsText, setAssumptionsText] = useState('{"tickers":["SPY"],"macroSeries":["DGS10","CPI","CREDIT"]}');
  const [intake, setIntake] = useState<IntakeResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"loading" | "intake" | "generate" | "rerun" | null>("loading");
  const [error, setError] = useState<string | null>(null);
  const [analyticsDemo, setAnalyticsDemo] = useState<QuantLibraryAnalyticsDemoResponse | null>(null);
  const [analyticsBusy, setAnalyticsBusy] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [activeDeskId, setActiveDeskId] = useState<DeskId>("overview");

  const active = useMemo(() => workspaces.find((workspace) => workspace.workspace_id === activeId) ?? null, [workspaces, activeId]);
  const currentVersion = active?.versions?.[active.versions.length - 1];
  const output = currentVersion ? versionOutput(currentVersion) : null;
  const activeDesk = deskDefinitions.find((desk) => desk.id === activeDeskId) ?? deskDefinitions[0];
  const freshness = latestFreshness(analyticsDemo);

  async function load(preferredId?: string) {
    setBusy((state) => state ?? "loading");
    try {
      const data = await fetchJson<{ workspaces: Workspace[] }>("/quant-library/workspaces");
      const rows = data.workspaces ?? [];
      setWorkspaces(rows);
      setActiveId(preferredId ?? rows[0]?.workspace_id ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workspaces.");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    let mounted = true;
    api.quantLibraryAnalyticsDemo(["SPY", "QQQ", "TLT"], "SPY")
      .then((data) => {
        if (!mounted) return;
        setAnalyticsDemo(data);
        setAnalyticsError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setAnalyticsError(err instanceof Error ? err.message : "Could not load analytics demo.");
      })
      .finally(() => {
        if (mounted) setAnalyticsBusy(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function runIntake() {
    setBusy("intake");
    setError(null);
    try {
      const data = await fetchJson<IntakeResponse>("/quant-library/intake", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      setIntake(data);
      setAnswers((existing) => {
        const next = { ...existing };
        data.clarifyingQuestions.forEach((question) => {
          if (!(question.id in next)) next[question.id] = "";
        });
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build intake questions.");
    } finally {
      setBusy(null);
    }
  }

  async function createWorkspace() {
    setBusy("generate");
    setError(null);
    try {
      const assumptions = parseAssumptions(assumptionsText, answers);
      const created = await fetchJson<Workspace>("/quant-library/workspaces", {
        method: "POST",
        body: JSON.stringify({ prompt, assumptions }),
      });
      await load(created.workspace_id);
    } catch (err) {
      setError(err instanceof SyntaxError ? "Assumption controls must be valid JSON." : err instanceof Error ? err.message : "Could not generate workspace.");
    } finally {
      setBusy(null);
    }
  }

  async function rerunWorkspace() {
    if (!active) return;
    setBusy("rerun");
    setError(null);
    try {
      const assumptions = parseAssumptions(assumptionsText, answers);
      await fetchJson<Workspace>(`/quant-library/workspaces/${active.workspace_id}/rerun`, {
        method: "POST",
        body: JSON.stringify({ prompt: active.original_prompt, assumptions }),
      });
      await load(active.workspace_id);
    } catch (err) {
      setError(err instanceof SyntaxError ? "Assumption controls must be valid JSON." : err instanceof Error ? err.message : "Could not rerun workspace.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-7">
      <section className="overflow-hidden rounded-[1.25rem] border border-slate-800 bg-[#08111f] shadow-2xl shadow-black/40">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Ballzatram markets desk / terminal left unlocked</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Quant Library
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
              A quant stepped away from the desk. The terminal is still open. Poke around. Learn something. Do not worship the model.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              An explainable market analysis desk for rates, indices, stocks, ETFs, risk, regimes, and time-series signals. Outputs are research context, not directives about portfolio actions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-200" href="#quant-library-desk">
                Open the desk
              </a>
              <a className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-emerald-300" href="#research-workspace">
                Start guided workspace
              </a>
            </div>
          </div>
          <aside className="border-t border-slate-800 bg-slate-950/80 p-5 xl:border-l xl:border-t-0">
            <div className="rounded-xl border border-slate-800 bg-black/40 p-4 font-mono">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Feed status</p>
                <DataFreshnessBadge freshness={freshness} />
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                <p className="flex justify-between gap-3 text-slate-400"><span>Provider</span><strong className="text-slate-100">{analyticsDemo?.provider ?? "waiting"}</strong></p>
                <p className="flex justify-between gap-3 text-slate-400"><span>Universe</span><strong className="text-slate-100">{analyticsDemo?.universe.title ?? "loading sample"}</strong></p>
                <p className="flex justify-between gap-3 text-slate-400"><span>Benchmark</span><strong className="text-slate-100">{analyticsDemo?.benchmark ?? "SPY"}</strong></p>
                <p className="flex justify-between gap-3 text-slate-400"><span>As of</span><strong className="text-slate-100">{freshness?.as_of ?? "not reported"}</strong></p>
              </div>
              {analyticsBusy ? <p className="mt-5 text-sm leading-6 text-amber-100">The desk is open. The feed is warming up.</p> : null}
              {analyticsError ? <ErrorState message="The desk is open, but the data feed is not responding. Demo and workspace sections remain available." /> : null}
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="Loaded sample" value={analyticsDemo ? `${analyticsDemo.symbols.length} symbols` : "..."} detail="Sample symbols come through the provider abstraction." tone="emerald" />
        <MetricCard label="Regime readout" value={analyticsDemo ? formatNumber(analyticsDemo.regime.score, 0) : "..."} detail={analyticsDemo?.regime.label ?? "Waiting for analytics."} tone="cyan" />
        <MetricCard label="2Y / 10Y spread" value={analyticsDemo ? `${formatNumber(analyticsDemo.rates.spreads["2y10y"]?.latest, 2)} pts` : "..."} detail="Read with rates caveats, not as a timer." tone="amber" />
        <MetricCard label="Errors" value={`${analyticsDemo?.errors.length ?? 0}`} detail={analyticsDemo?.errors.length ? "Some provider calls need attention." : "No provider errors in the current demo payload."} tone={analyticsDemo?.errors.length ? "rose" : "slate"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Modules</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Eight desks, one research memory</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {deskDefinitions.map((desk) => (
              <article key={desk.id} className="flex min-h-60 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300">{desk.accent}</p>
                  <RiskBadge label={desk.status} level={desk.status === "live" ? "low" : desk.status === "draft" ? "medium" : "medium"} />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{desk.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{desk.what}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="rounded-full border border-emerald-300/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:border-emerald-200"
                    onClick={() => setActiveDeskId(desk.id)}
                  >
                    Inspect section
                  </button>
                  <a className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500" href={desk.route}>
                    Workflow link
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
        <aside className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Today's Desk Notes</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Placeholders with a job</h2>
          </div>
          <DeskNote kicker="Morning marker" title="Demo data shown until live feeds are configured." body="This may suggest the interface is healthy, not that the market is fresh. Read the badge before the number." sourceLabel="demo" />
          <DeskNote kicker="Model margin" title="The regime score is a descriptive heuristic." body="Worth investigating when its reasons conflict with price action, rates context, or source freshness." sourceLabel="caveat" />
          <DeskNote kicker="Story queue" title="No generated newspaper story has been written yet." body="The section payload is being shaped so future stories can link back to the analysis that produced them." sourceLabel="placeholder" />
        </aside>
      </section>

      <section id="quant-library-desk" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Analysis bench</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Desk sections</h2>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto rounded-full border border-slate-800 bg-slate-950/70 p-1">
            {deskDefinitions.map((desk) => (
              <button
                key={desk.id}
                onClick={() => setActiveDeskId(desk.id)}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${activeDesk.id === desk.id ? "bg-emerald-300 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}
              >
                {desk.shortTitle}
              </button>
            ))}
          </div>
        </div>

        {analyticsBusy ? <LoadingState message="Loading desk metrics. This metric needs at least one provider response." /> : null}
        {!analyticsBusy && analyticsError ? <ErrorState message="The desk is open, but the data feed is not responding. Demo metrics cannot render until the analytics endpoint replies." /> : null}

        <AnalysisSection
          eyebrow={activeDesk.accent}
          title={activeDesk.title}
          summary={activeDesk.what}
          what={activeDesk.what}
          why={activeDesk.why}
          caveats={activeDesk.caveats}
          next={activeDesk.next}
          metrics={renderDeskMetrics(activeDesk.id, analyticsDemo)}
          story={<ToolGeneratedStoryCard headline={activeDesk.storyHeadline} summary={activeDesk.storySummary} sourceLabel="tool-generated story draft" />}
        >
          <DeskEvidenceTable deskId={activeDesk.id} analyticsDemo={analyticsDemo} />
        </AnalysisSection>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <ExplanationPanel title="Data freshness matters" why="Markets move quickly. Always check timestamp, source, and fallback status before trusting an output." caveats={["Demo data can prove the workflow without proving the market."]} rules={["Treat stale or fallback data as training context."]} />
        <ExplanationPanel title="Research oriented" why="Outputs are for education and analysis. They are meant to improve questions, not automate decisions." caveats={["A polished card can still be wrong."]} rules={["Keep assumptions visible."]} />
        <ExplanationPanel title="Not financial advice" why="Quant Library does not tell you which security to enter, exit, or time." caveats={["User-specific constraints live outside this demo."]} rules={["Use outputs as context for further diligence."]} />
        <ExplanationPanel title="Descriptive, not certain" why="Metrics describe historical relationships and model assumptions. They cannot settle future behavior." caveats={["Regimes change. Data revisions happen."]} rules={["Ask what would invalidate the readout."]} />
      </section>

      <div id="research-workspace" className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <AIIntakePanel
          prompt={prompt}
          assumptionsText={assumptionsText}
          questions={intake?.clarifyingQuestions ?? []}
          answers={answers}
          busy={busy !== null}
          error={error}
          onPromptChange={setPrompt}
          onAssumptionsChange={setAssumptionsText}
          onAnswerChange={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))}
          onClarify={runIntake}
          onGenerate={createWorkspace}
        />

        <section className="space-y-4">
          {intake ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Intake readout</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{intake.summary}</h2>
                </div>
                <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">{intake.status}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(intake.inferred).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="Intake has not run yet" message="Ask clarifying questions before generating the workspace to make the output feel guided instead of form-driven." />
          )}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Saved workspaces</h2>
                <p className="mt-1 text-sm text-slate-400">Workspace history stays free while the tool quality improves.</p>
              </div>
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50"
                onClick={rerunWorkspace}
                disabled={!active || busy !== null}
              >
                Rerun active
              </button>
            </div>
            {workspaces.length ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.workspace_id}
                    onClick={() => setActiveId(workspace.workspace_id)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      workspace.workspace_id === activeId
                        ? "border-emerald-300 bg-emerald-300 text-slate-950"
                        : "border-slate-700 text-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    {workspace.title} v{workspace.versions.length}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No saved workspaces yet.</p>
            )}
          </section>
        </section>
      </div>

      {busy === "loading" || busy === "generate" || busy === "rerun" ? (
        <LoadingState message={busy === "rerun" ? "Rerunning the active workspace with revised assumptions..." : "Generating structured research cards..."} />
      ) : null}

      {error && !busy ? <ErrorState message={error} /> : null}

      {!currentVersion && !busy ? (
        <EmptyState title="Generate your first research workspace" message="Quant Library will show card-based output, risks, missing data, sources, and next actions after the first guided run." />
      ) : null}

      {currentVersion && output ? (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <RecommendationCard output={output} />
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace version</p>
              <p className="mt-2 text-lg font-semibold text-white">{currentVersion.version_id.slice(0, 8)}</p>
              <p className="mt-1 text-sm text-slate-400">{new Date(currentVersion.created_at).toLocaleString()}</p>
            </div>
          </div>

          <ExportSaveActionBar disabled={!currentVersion} />

          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <ResultCards cards={output.cards} />
            <aside className="space-y-5">
              <RiskCard risks={output.risks} missingData={output.missingData} />
              <NextActionPanel actions={output.recommendedNextSteps} />
              <SourceList sources={output.sources} />
            </aside>
          </div>
        </div>
      ) : null}
    </section>
  );
}

