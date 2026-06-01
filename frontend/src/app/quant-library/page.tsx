"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AIIntakePanel,
  EmptyState,
  ErrorState,
  ExportSaveActionBar,
  LoadingState,
  NextActionPanel,
  RecommendationCard,
  ResultCards,
  RiskCard,
  SourceList,
} from "@/components/ai-tools/ToolPrimitives";
import { api, type QuantLibraryAnalyticsDemoResponse } from "@/lib/api";
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

type LibrarySection = {
  title: string;
  route: string;
  status: "available" | "structured placeholder";
  what: string;
  why: string;
  misleading: string;
  apply: string;
};

const librarySections: LibrarySection[] = [
  {
    title: "Overview",
    route: "/quant-library",
    status: "available",
    what: "Frames a market question as a research workspace with assumptions, evidence cards, risks, and next steps.",
    why: "A shared overview keeps analysis explainable before users jump into specific charts or models.",
    misleading: "A clean dashboard can make uncertain data feel more certain than it is.",
    apply: "Start here when you need to turn a broad market concern into a set of questions to test.",
  },
  {
    title: "Rates Desk",
    route: "/scenario",
    status: "structured placeholder",
    what: "Organizes interest-rate, inflation, and policy-rate questions for future rates-focused analysis.",
    why: "Rates influence discount rates, borrowing costs, housing, credit, and valuation pressure.",
    misleading: "One rate series rarely explains a whole market move by itself.",
    apply: "Use this desk to ask how a rate shock might flow through a portfolio or sector.",
  },
  {
    title: "Index & ETF Explorer",
    route: "/portfolio",
    status: "structured placeholder",
    what: "Prepares a home for comparing broad indices, ETFs, exposures, and market breadth signals.",
    why: "Indices and ETFs are often cleaner first-pass lenses than single-name guesses.",
    misleading: "ETF labels can hide concentration, sector overlap, and factor exposure.",
    apply: "Use it to understand what a fund or index actually represents before interpreting performance.",
  },
  {
    title: "Stock Analyzer",
    route: "/stock",
    status: "structured placeholder",
    what: "Keeps single-name analysis focused on drivers, sensitivities, and caveats rather than picks.",
    why: "Plain-English factor context can help users understand what moved a stock without pretending to forecast it.",
    misleading: "A historical beta or coefficient is descriptive, not a promise about the next move.",
    apply: "Use it to build better questions about a stock's macro exposure, not to outsource a buy/sell decision.",
  },
  {
    title: "Risk Scanner",
    route: "/model-compare",
    status: "structured placeholder",
    what: "Collects drawdown, volatility, exposure, model-stability, and missing-data warnings.",
    why: "Risk review is most useful when it is visible before recommendations are written.",
    misleading: "Risk metrics can look precise while still missing regime shifts and tail events.",
    apply: "Use it as a checklist for what could break the current interpretation.",
  },
  {
    title: "Technical Analysis Lab",
    route: "/event-study",
    status: "structured placeholder",
    what: "Reserves space for time-series signals, trend context, event windows, and chart-based hypotheses.",
    why: "Technical signals can be useful as evidence when paired with source quality and caveats.",
    misleading: "Patterns can overfit noise, especially when the lookback window is chosen after the fact.",
    apply: "Use it to phrase testable chart questions, then compare them with macro and risk context.",
  },
  {
    title: "Portfolio Sandbox",
    route: "/portfolio",
    status: "structured placeholder",
    what: "Supports scenario thinking around holdings, weights, shocks, and concentration.",
    why: "Market analysis becomes more practical when users can see how assumptions affect their own mix.",
    misleading: "A sandbox result can feel personalized even when the model is still generic and incomplete.",
    apply: "Use it to rehearse what-if questions and identify follow-up diligence.",
  },
  {
    title: "Research Notes",
    route: "/reports",
    status: "structured placeholder",
    what: "Turns findings, caveats, and source notes into draft research memos.",
    why: "A useful quant desk should leave an audit trail that explains how a conclusion was formed.",
    misleading: "A polished note can still be wrong if the data, assumptions, or model are weak.",
    apply: "Use notes to summarize what was learned, what is missing, and what would change your mind.",
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

export default function QuantLibraryPage() {
  const [prompt, setPrompt] = useState("Explain what is moving markets right now without making a prediction");
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

  const active = useMemo(() => workspaces.find((workspace) => workspace.workspace_id === activeId) ?? null, [workspaces, activeId]);
  const currentVersion = active?.versions?.[active.versions.length - 1];
  const output = currentVersion ? versionOutput(currentVersion) : null;

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
    <section className="space-y-6">
      <div className="rounded-2xl border border-emerald-300/20 bg-slate-900 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Markets department</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">Quant Library</h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              An explainable market analysis desk for rates, indices, stocks, ETFs, risk, regimes, and time-series signals.
              It is not a stock-picking tool or prediction engine; it is a plain-English workbench for understanding what the data can and cannot say.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Research posture</p>
            <p className="mt-1 leading-6">Serious enough for real analysis, written plainly enough that non-experts can learn what the signal means.</p>
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-white">Data freshness matters</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Markets move quickly. Always check the data timestamp, source, and fallback status before trusting an output.</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-white">Research oriented</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Outputs are for education and analysis. They are meant to improve questions, not automate decisions.</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-white">Not financial advice</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Quant Library does not recommend buying, selling, or timing securities.</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-white">Descriptive, not guaranteed</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Metrics describe historical relationships and model assumptions. They do not guarantee future behavior.</p>
        </article>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Library structure</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Research desks ready for later build-out</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {librarySections.map((section) => (
            <article key={section.title} className="flex min-h-80 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-400">{section.status}</span>
              </div>
              <div className="mt-4 grid flex-1 gap-3 text-sm leading-6 text-slate-400">
                <p><span className="font-semibold text-slate-200">What it does:</span> {section.what}</p>
                <p><span className="font-semibold text-slate-200">Why it matters:</span> {section.why}</p>
                <p><span className="font-semibold text-slate-200">What can mislead:</span> {section.misleading}</p>
                <p><span className="font-semibold text-slate-200">How to apply it:</span> {section.apply}</p>
              </div>
              <a className="mt-4 text-sm font-semibold text-emerald-200 hover:text-white" href={section.route}>
                Open current surface
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Internal analytics foundation</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Provider-backed demo metrics</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              A small proof that symbols can load through the market-data abstraction, metrics can calculate, explanation metadata can render, and fallback data is labeled clearly.
            </p>
          </div>
          {analyticsDemo ? (
            <span className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              {analyticsDemo.provider} / {analyticsDemo.status.replace("_", " ")}
            </span>
          ) : null}
        </div>

        {analyticsBusy ? <LoadingState message="Loading demo market data and analytics metadata..." /> : null}
        {!analyticsBusy && analyticsError ? (
          <ErrorState message={`Analytics preview unavailable. The page is still safe to use; backend demo endpoint returned: ${analyticsError}`} />
        ) : null}
        {!analyticsBusy && analyticsDemo ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="grid gap-3 md:grid-cols-3">
                {analyticsDemo.symbols.slice(0, 3).map((row) => (
                  <article key={row.symbol} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{row.symbol}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{row.name}</p>
                      </div>
                      <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-amber-100">
                        {row.freshness.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm">
                      <p className="flex justify-between gap-3 text-slate-300"><span>Last close</span><strong className="text-white">{formatNumber(row.metrics.lastClose)}</strong></p>
                      <p className="flex justify-between gap-3 text-slate-300"><span>Daily return</span><strong className="text-white">{formatPercent(row.metrics.latestDailyReturn)}</strong></p>
                      <p className="flex justify-between gap-3 text-slate-300"><span>20d volatility</span><strong className="text-white">{formatPercent(row.metrics.rollingVolatility20d)}</strong></p>
                      <p className="flex justify-between gap-3 text-slate-300"><span>Max drawdown</span><strong className="text-white">{formatPercent(row.metrics.maxDrawdown)}</strong></p>
                      <p className="flex justify-between gap-3 text-slate-300"><span>RSI 14</span><strong className="text-white">{formatNumber(row.metrics.rsi14, 1)}</strong></p>
                      <p className="flex justify-between gap-3 text-slate-300"><span>Beta vs {analyticsDemo.benchmark}</span><strong className="text-white">{formatNumber(row.metrics.betaVsBenchmark, 2)}</strong></p>
                    </div>
                  </article>
                ))}
              </div>
              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Simple regime score</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{analyticsDemo.regime.label}</h3>
                <p className="mt-1 text-4xl font-bold text-emerald-200">{formatNumber(analyticsDemo.regime.score, 0)}</p>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-400">
                  {analyticsDemo.regime.reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </article>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {["rollingVolatility", "maxDrawdown", "rsi"].map((metricId) => {
                const explanation = analyticsDemo.explanations[metricId];
                if (!explanation) return null;
                return (
                  <article key={metricId} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <h3 className="text-base font-semibold text-white">{explanation.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{explanation.shortExplanation}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-300"><span className="font-semibold text-slate-100">Why it matters:</span> {explanation.whyItMatters}</p>
                    <p className="mt-3 text-sm leading-6 text-amber-100"><span className="font-semibold">Caveat:</span> {explanation.caveats[0]}</p>
                  </article>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="text-base font-semibold text-white">Yield curve spreads</h3>
                <div className="mt-3 grid gap-2 text-sm text-slate-300">
                  <p className="flex justify-between"><span>2Y / 10Y</span><strong>{formatNumber(analyticsDemo.rates.spreads["2y10y"]?.latest, 2)} pts</strong></p>
                  <p className="flex justify-between"><span>3M / 10Y</span><strong>{formatNumber(analyticsDemo.rates.spreads["3m10y"]?.latest, 2)} pts</strong></p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{analyticsDemo.explanations.yieldCurveSpreads?.shortExplanation}</p>
              </article>
              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="text-base font-semibold text-white">Fallback and error handling</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                  {analyticsDemo.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
                  {analyticsDemo.errors.length ? analyticsDemo.errors.map((demoError) => <li key={`${demoError.scope}-${demoError.message}`}>{demoError.scope}: {demoError.message}</li>) : <li>No provider errors in this demo run; data is still marked as fallback.</li>}
                </ul>
              </article>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
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

