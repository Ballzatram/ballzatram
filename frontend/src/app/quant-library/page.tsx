"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AnomalyTable,
  CaveatPanel,
  CurrentStateCard,
  DataFreshnessBadge,
  EmptyState,
  ErrorState,
  HowToReadPanel,
  InterpretationPanel,
  LoadingState,
  MethodNote,
  MetricCard,
  NextChecksPanel,
  RegimeBadge,
  ResearchNoteCard,
  ResearchQuestionHeader,
  ScenarioControlPanel,
  SourceQualityPanel,
  StatusBadge,
  type Tone,
} from "@/components/quant-library/QuantLibraryPrimitives";
import { api, type DataFreshness, type QuantLibraryAnalyticsDemoResponse, type QuantLibrarySymbolAnalytics } from "@/lib/api";

type DeskId = "overview" | "rates" | "equity" | "risk" | "scenario" | "notes";

type DeskDefinition = {
  id: DeskId;
  label: string;
  title: string;
  question: string;
  summary: string;
  howToRead: string[];
  caveats: string[];
  nextChecks: string[];
  methodId?: string;
};

const desks: DeskDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    title: "Market Overview",
    question: "What does the current market sample suggest, and what should I inspect next?",
    summary: "A triage desk for regime, freshness, cross-asset behavior, and the next research question.",
    howToRead: ["Check source status before the numbers.", "Read the regime reasons before the label.", "Use the next checks to decide which desk deserves attention."],
    caveats: ["The overview is a triage surface, not a conclusion.", "Demo data proves the workflow, not current market conditions."],
    nextChecks: ["Open Rates Desk if curve spreads look unusual.", "Open Equity / Index Desk if leadership or drawdown quality is unclear.", "Open Risk & Anomaly Desk before writing a note."],
    methodId: "regimeScore",
  },
  {
    id: "rates",
    label: "Rates",
    title: "Rates Desk",
    question: "What is the yield curve saying about policy pressure and rate-sensitive risk?",
    summary: "A focused curve desk for Treasury tenors, spread direction, and plain-English curve caveats.",
    howToRead: ["Start with 2Y/10Y and 3M/10Y.", "Compare shape with the curve table.", "Treat inversions as context, not a clock."],
    caveats: ["Curve inversions are not timers.", "FRED data can lag or revise.", "Synthetic demo rates are not live market data."],
    nextChecks: ["Compare rate-sensitive assets in Equity / Index Desk.", "Stress a rate shock in Scenario Engine.", "Check whether volatility also changed."],
    methodId: "yieldCurveSpreads",
  },
  {
    id: "equity",
    label: "Equity / Index",
    title: "Equity / Index Desk",
    question: "Which markets are leading or lagging, and what risk did they take?",
    summary: "A broad market desk for indices, ETFs, and selected equities using benchmark-aware metrics.",
    howToRead: ["Compare return with drawdown and volatility.", "Check benchmark sensitivity before inferring idiosyncratic movement.", "Treat RSI and moving averages as context only."],
    caveats: ["Benchmark choice can change the conclusion.", "ETF labels can hide concentration.", "Single-name work needs business and event context outside this demo."],
    nextChecks: ["Review correlations before assuming diversification.", "Open Risk & Anomaly Desk for unusually large z-scores.", "Use Scenario Engine for transparent shock testing."],
    methodId: "betaVsBenchmark",
  },
  {
    id: "risk",
    label: "Risk & Anomaly",
    title: "Risk & Anomaly Desk",
    question: "What looks unusual, fragile, or worth investigating before writing a conclusion?",
    summary: "A warning desk for volatility, drawdown, z-score, correlation, and data-quality checks.",
    howToRead: ["Read flags as investigation prompts.", "Check the method and threshold.", "Confirm source quality before interpreting an anomaly."],
    caveats: ["Unusual does not mean wrong or actionable.", "A calm sample can still miss tail risk.", "Z-scores depend on the selected window."],
    nextChecks: ["Look for the largest drawdown.", "Compare anomaly flags with rates context.", "Document what could invalidate the interpretation."],
    methodId: "zScore",
  },
  {
    id: "scenario",
    label: "Scenario",
    title: "Scenario Engine",
    question: "How would selected assets respond under transparent market shocks?",
    summary: "A simple conditional stress bench that keeps assumptions visible before the result.",
    howToRead: ["Set shocks first.", "Read factor contributions before the total impact.", "Treat output as sensitivity analysis, not a forecast."],
    caveats: ["Scenario models are maps, not the territory.", "Linear sensitivities can fail during crises.", "Generic shocks are not personal portfolio advice."],
    nextChecks: ["Change one assumption at a time.", "Compare scenario output with historical drawdown.", "Save a research note only after caveats are attached."],
    methodId: "betaVsBenchmark",
  },
  {
    id: "notes",
    label: "Research Notes",
    title: "Research Notes",
    question: "What can be written from this analysis without losing the evidence trail?",
    summary: "A note-prep desk that preserves observations, interpretations, caveats, methods, and sources.",
    howToRead: ["Start with the question.", "Keep observations separate from interpretation.", "Attach caveats and sources before polishing prose."],
    caveats: ["A polished note can still be wrong.", "Generated notes must not imply certainty.", "Ballzatram Daily automation remains later scope."],
    nextChecks: ["Check missing data.", "Confirm caveats are visible.", "Route to the newspaper layer only after subscriber readiness."],
    methodId: "cumulativeReturns",
  },
];

const defaultScenario = {
  rates: 0.75,
  growth: -0.5,
  credit: 0.6,
};

function formatNumber(value: number | null | undefined, digits = 2) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

function latestFreshness(analytics: QuantLibraryAnalyticsDemoResponse | null): DataFreshness | null {
  return analytics?.symbols[0]?.freshness ?? analytics?.rates.yieldCurve?.freshness ?? null;
}

function firstSymbol(analytics: QuantLibraryAnalyticsDemoResponse | null): QuantLibrarySymbolAnalytics | null {
  return analytics?.symbols[0] ?? null;
}

function sourceLabels(analytics: QuantLibraryAnalyticsDemoResponse | null) {
  if (!analytics) return ["No source loaded"];
  const freshness = latestFreshness(analytics);
  return [freshness?.source ?? analytics.provider];
}

function overviewMetrics(analytics: QuantLibraryAnalyticsDemoResponse | null) {
  if (!analytics) {
    return [
      <MetricCard key="loading" label="Feed" value="Loading" detail="Waiting for the analytics endpoint." tone="amber" />,
      <MetricCard key="sample" label="Loaded symbols" value="0" detail="No sample has loaded yet." />,
      <MetricCard key="errors" label="Provider errors" value="n/a" detail="Errors will appear after load." />,
    ];
  }
  return [
    <MetricCard key="symbols" label="Loaded symbols" value={`${analytics.symbols.length}`} detail={analytics.universe.title} tone="emerald" />,
    <MetricCard key="spread" label="2Y / 10Y spread" value={`${formatNumber(analytics.rates.spreads["2y10y"]?.latest, 2)} pts`} detail="Read as curve context, not a timer." tone="amber" explanation={analytics.explanations.yieldCurveSpreads} />,
    <MetricCard key="errors" label="Provider errors" value={`${analytics.errors.length}`} detail={analytics.errors.length ? "Review source quality before interpreting." : "No provider errors in this run."} tone={analytics.errors.length ? "rose" : "slate"} />,
  ];
}

function deskMetrics(deskId: DeskId, analytics: QuantLibraryAnalyticsDemoResponse | null) {
  const first = firstSymbol(analytics);
  if (!analytics || !first) return overviewMetrics(analytics);

  if (deskId === "rates") {
    return [
      <MetricCard key="2y10y" label="2Y / 10Y spread" value={`${formatNumber(analytics.rates.spreads["2y10y"]?.latest, 2)} pts`} detail="Historically, this can indicate curve pressure when negative." tone="cyan" explanation={analytics.explanations.yieldCurveSpreads} />,
      <MetricCard key="3m10y" label="3M / 10Y spread" value={`${formatNumber(analytics.rates.spreads["3m10y"]?.latest, 2)} pts`} detail="Worth comparing with policy-rate and growth context." tone="cyan" />,
      <MetricCard key="points" label="Curve points" value={`${analytics.rates.yieldCurve?.points.length ?? 0}`} detail="Current curve sample size." />,
    ];
  }

  if (deskId === "equity") {
    return [
      <MetricCard key="return" label={`${first.symbol} cumulative`} value={formatPercent(first.metrics.cumulativeReturn)} detail={`Compared against ${analytics.benchmark}.`} tone="emerald" explanation={analytics.explanations.cumulativeReturns} />,
      <MetricCard key="beta" label="Beta vs benchmark" value={formatNumber(first.metrics.betaVsBenchmark, 2)} detail="Historical benchmark sensitivity." tone="cyan" explanation={analytics.explanations.betaVsBenchmark} />,
      <MetricCard key="relative" label="Relative strength" value={formatPercent(first.metrics.relativeStrengthVsBenchmark)} detail="Leadership or lagging in this sample." explanation={analytics.explanations.relativeStrength} />,
    ];
  }

  if (deskId === "risk") {
    return [
      <MetricCard key="drawdown" label="Max drawdown" value={formatPercent(first.metrics.maxDrawdown)} detail="Worst peak-to-trough move in the sample." tone="rose" explanation={analytics.explanations.maxDrawdown} />,
      <MetricCard key="vol" label="20d volatility" value={formatPercent(first.metrics.rollingVolatility20d)} detail="Movement, not direction." tone="amber" explanation={analytics.explanations.rollingVolatility} />,
      <MetricCard key="z" label="Return z-score" value={formatNumber(first.metrics.zScore20d, 2)} detail="Distance from recent average." tone="cyan" explanation={analytics.explanations.zScore} />,
    ];
  }

  if (deskId === "scenario") {
    return [
      <MetricCard key="beta" label="Benchmark beta" value={formatNumber(first.metrics.betaVsBenchmark, 2)} detail="Used as one rough sensitivity input." tone="cyan" />,
      <MetricCard key="drawdown" label="Historical drawdown" value={formatPercent(first.metrics.maxDrawdown)} detail="Reference point for stress context." tone="rose" />,
      <MetricCard key="vol" label="Recent volatility" value={formatPercent(first.metrics.rollingVolatility20d)} detail="Higher volatility widens uncertainty." tone="amber" />,
    ];
  }

  if (deskId === "notes") {
    return [
      <MetricCard key="observations" label="Symbols attached" value={`${analytics.symbols.length}`} detail="The note should cite the symbols behind the claims." tone="cyan" />,
      <MetricCard key="caveats" label="Caveats attached" value={`${analytics.caveats.length}`} detail="Caveats are part of the note, not a footnote." tone="amber" />,
      <MetricCard key="status" label="Feed status" value={latestFreshness(analytics)?.status ?? "unknown"} detail="Source status travels with the draft." />,
    ];
  }

  return overviewMetrics(analytics);
}

function SymbolTable({ analytics }: { analytics: QuantLibraryAnalyticsDemoResponse }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-4">
        <h3 className="text-lg font-semibold text-white">Market sample</h3>
        <p className="mt-1 text-sm text-slate-400">Returns, risk, and benchmark context for the loaded symbols.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr><th className="p-3">Symbol</th><th className="p-3">Last close</th><th className="p-3">Cumulative</th><th className="p-3">Volatility</th><th className="p-3">Drawdown</th><th className="p-3">Beta</th><th className="p-3">Z-score</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {analytics.symbols.map((symbol) => (
              <tr key={symbol.symbol}>
                <td className="p-3"><span className="font-semibold text-white">{symbol.symbol}</span><span className="ml-2 text-xs text-slate-500">{symbol.name}</span></td>
                <td className="p-3 font-mono">{formatNumber(symbol.metrics.lastClose, 2)}</td>
                <td className="p-3 font-mono">{formatPercent(symbol.metrics.cumulativeReturn)}</td>
                <td className="p-3 font-mono">{formatPercent(symbol.metrics.rollingVolatility20d)}</td>
                <td className="p-3 font-mono">{formatPercent(symbol.metrics.maxDrawdown)}</td>
                <td className="p-3 font-mono">{formatNumber(symbol.metrics.betaVsBenchmark, 2)}</td>
                <td className="p-3 font-mono">{formatNumber(symbol.metrics.zScore20d, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RatesTable({ analytics }: { analytics: QuantLibraryAnalyticsDemoResponse }) {
  const points = analytics.rates.yieldCurve?.points ?? [];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-4">
        <h3 className="text-lg font-semibold text-white">Yield curve</h3>
        <p className="mt-1 text-sm text-slate-400">Read shape and freshness before interpretation.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr><th className="p-3">Tenor</th><th className="p-3">Maturity</th><th className="p-3">Rate</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {points.map((point) => (
              <tr key={point.tenor}>
                <td className="p-3 font-semibold text-white">{point.tenor}</td>
                <td className="p-3">{point.maturity_months} months</td>
                <td className="p-3 font-mono">{formatNumber(point.rate, 2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildAnomalyRows(analytics: QuantLibraryAnalyticsDemoResponse | null) {
  if (!analytics) return [];
  return analytics.symbols.flatMap((symbol) => {
    const rows: Array<{ id: string; metric: string; value: string; reason: string; severity: Tone }> = [];
    if (Math.abs(symbol.metrics.zScore20d ?? 0) >= 1.5) {
      rows.push({ id: `${symbol.symbol}-z`, metric: `${symbol.symbol} return z-score`, value: formatNumber(symbol.metrics.zScore20d, 2), reason: "Return is far from its recent average.", severity: "amber" });
    }
    if ((symbol.metrics.maxDrawdown ?? 0) <= -0.12) {
      rows.push({ id: `${symbol.symbol}-drawdown`, metric: `${symbol.symbol} drawdown`, value: formatPercent(symbol.metrics.maxDrawdown), reason: "Drawdown crossed the review threshold.", severity: "rose" });
    }
    if ((symbol.metrics.rollingVolatility20d ?? 0) >= 0.25) {
      rows.push({ id: `${symbol.symbol}-vol`, metric: `${symbol.symbol} volatility`, value: formatPercent(symbol.metrics.rollingVolatility20d), reason: "Recent volatility is elevated.", severity: "amber" });
    }
    return rows;
  });
}

function scenarioRows(analytics: QuantLibraryAnalyticsDemoResponse | null, shocks: typeof defaultScenario) {
  const first = firstSymbol(analytics);
  const beta = first?.metrics.betaVsBenchmark ?? 1;
  const vol = first?.metrics.rollingVolatility20d ?? 0.18;
  const ratesImpact = -0.035 * shocks.rates * Math.max(beta, 0.25);
  const growthImpact = 0.045 * shocks.growth * Math.max(beta, 0.25);
  const creditImpact = -0.03 * shocks.credit * (1 + vol);
  return [
    { id: "rates", factor: "Rates shock", shock: `${shocks.rates.toFixed(2)} pts`, impact: ratesImpact },
    { id: "growth", factor: "Growth shock", shock: `${shocks.growth.toFixed(2)} std`, impact: growthImpact },
    { id: "credit", factor: "Credit shock", shock: `${shocks.credit.toFixed(2)} std`, impact: creditImpact },
  ];
}

function ScenarioTable({ rows }: { rows: ReturnType<typeof scenarioRows> }) {
  const total = rows.reduce((sum, row) => sum + row.impact, 0);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-4">
        <h3 className="text-lg font-semibold text-white">Conditional impact estimate</h3>
        <p className="mt-1 text-sm text-slate-400">A transparent sensitivity map using visible assumptions.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr><th className="p-3">Factor</th><th className="p-3">Shock</th><th className="p-3">Estimated impact</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="p-3 font-semibold text-white">{row.factor}</td>
                <td className="p-3 font-mono">{row.shock}</td>
                <td className="p-3 font-mono">{formatPercent(row.impact)}</td>
              </tr>
            ))}
            <tr>
              <td className="p-3 font-semibold text-white">Total illustrative impact</td>
              <td className="p-3 text-slate-500">sum</td>
              <td className="p-3 font-mono text-white">{formatPercent(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MainDeskContent({
  activeDesk,
  analytics,
  shocks,
  onShockChange,
}: {
  activeDesk: DeskDefinition;
  analytics: QuantLibraryAnalyticsDemoResponse | null;
  shocks: typeof defaultScenario;
  onShockChange: (id: string, value: number) => void;
}) {
  if (!analytics) return <EmptyState title="No analytics payload loaded" message="The desk will render once the Quant Library analytics endpoint responds." />;

  if (activeDesk.id === "rates") return <RatesTable analytics={analytics} />;
  if (activeDesk.id === "risk") return <AnomalyTable rows={buildAnomalyRows(analytics)} />;
  if (activeDesk.id === "scenario") {
    const rows = scenarioRows(analytics, shocks);
    return (
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <ScenarioControlPanel
          controls={[
            { id: "rates", label: "Rates", value: shocks.rates, min: -1.5, max: 2, step: 0.25, unit: " pts" },
            { id: "growth", label: "Growth", value: shocks.growth, min: -2, max: 2, step: 0.25, unit: " std" },
            { id: "credit", label: "Credit", value: shocks.credit, min: -1, max: 2.5, step: 0.25, unit: " std" },
          ]}
          onChange={onShockChange}
        />
        <ScenarioTable rows={rows} />
      </div>
    );
  }
  if (activeDesk.id === "notes") {
    const first = firstSymbol(analytics);
    return (
      <ResearchNoteCard
        title="Market sample opened with caveats first"
        observations={[
          `${analytics.symbols.length} symbols loaded from ${analytics.provider}.`,
          `${analytics.benchmark} is the current benchmark.`,
          first ? `${first.symbol} cumulative return is ${formatPercent(first.metrics.cumulativeReturn)} in this sample.` : "No primary symbol loaded.",
        ]}
        caveats={analytics.caveats}
        sources={sourceLabels(analytics)}
      />
    );
  }
  return <SymbolTable analytics={analytics} />;
}

export default function QuantLibraryPage() {
  const [activeDeskId, setActiveDeskId] = useState<DeskId>("overview");
  const [analytics, setAnalytics] = useState<QuantLibraryAnalyticsDemoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shocks, setShocks] = useState(defaultScenario);

  useEffect(() => {
    let mounted = true;
    api.quantLibraryAnalyticsDemo(["SPY", "QQQ", "TLT"], "SPY")
      .then((payload) => {
        if (mounted) {
          setAnalytics(payload);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Could not load Quant Library analytics.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeDesk = useMemo(() => desks.find((desk) => desk.id === activeDeskId) ?? desks[0], [activeDeskId]);
  const freshness = latestFreshness(analytics);
  const first = firstSymbol(analytics);
  const explanation = activeDesk.methodId ? analytics?.explanations[activeDesk.methodId] : undefined;
  const regime = analytics?.regime;

  function handleShockChange(id: string, value: number) {
    setShocks((current) => ({ ...current, [id]: value }));
  }

  return (
    <section className="space-y-6">
      <ResearchQuestionHeader
        title="Quant Library"
        question="A financial econometrics research workstation that teaches non-quants how to think."
        summary="The rebuilt surface focuses on six essential desks: Market Overview, Rates, Equity / Index, Risk & Anomaly, Scenario Engine, and Research Notes. Outputs are descriptive research context, not financial advice."
        freshness={freshness}
      >
        <dl className="mt-5 grid gap-3 text-sm">
          <div className="flex justify-between gap-4 text-slate-400"><dt>Provider</dt><dd className="text-right font-semibold text-slate-100">{analytics?.provider ?? "waiting"}</dd></div>
          <div className="flex justify-between gap-4 text-slate-400"><dt>Universe</dt><dd className="text-right font-semibold text-slate-100">{analytics?.universe.title ?? "loading sample"}</dd></div>
          <div className="flex justify-between gap-4 text-slate-400"><dt>Benchmark</dt><dd className="text-right font-semibold text-slate-100">{analytics?.benchmark ?? "SPY"}</dd></div>
          <div className="flex justify-between gap-4 text-slate-400"><dt>As of</dt><dd className="text-right font-semibold text-slate-100">{freshness?.as_of ?? "not reported"}</dd></div>
        </dl>
        <p className="mt-5 text-xs leading-5 text-slate-500">Observation first. Interpretation second. Caveats always visible.</p>
      </ResearchQuestionHeader>

      {loading ? <LoadingState message="Loading Quant Library analytics and source metadata..." /> : null}
      {error ? <ErrorState message={`The workstation shell is available, but analytics did not load: ${error}`} /> : null}

      <nav className="flex max-w-full gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-2" aria-label="Quant Library desks">
        {desks.map((desk) => (
          <button
            key={desk.id}
            onClick={() => setActiveDeskId(desk.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${activeDesk.id === desk.id ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}
          >
            {desk.label}
          </button>
        ))}
      </nav>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <CurrentStateCard
            label={regime?.label ?? "waiting for sample"}
            summary={first ? `${first.symbol} is the primary loaded symbol. This may suggest a starting point for investigation, not a conclusion.` : "The current state summary appears after the analytics endpoint responds."}
            drivers={regime?.reasons ?? ["Data and regime drivers have not loaded yet."]}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {deskMetrics(activeDesk.id, analytics)}
          </div>
        </div>
        <aside className="space-y-4">
          {regime ? <RegimeBadge label={regime.label} score={regime.score} reasons={regime.reasons} /> : null}
          <SourceQualityPanel freshness={freshness} errors={analytics?.errors} />
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{activeDesk.label}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{activeDesk.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{activeDesk.question}</p>
              </div>
              <DataFreshnessBadge freshness={freshness} />
            </div>
          </div>
          <MainDeskContent activeDesk={activeDesk} analytics={analytics} shocks={shocks} onShockChange={handleShockChange} />
        </div>

        <aside className="space-y-4">
          <InterpretationPanel
            observations={[
              analytics ? `${analytics.symbols.length} symbols loaded for ${analytics.universe.title}.` : "Analytics are still loading.",
              freshness ? `The current source status is ${freshness.status}.` : "Source status is not available yet.",
            ]}
            interpretation={activeDesk.summary}
            uncertainty="This does not prove causation or future direction. The model may be wrong if the sample window, benchmark, or data source changes."
          />
          <MethodNote explanation={explanation} minimumData={activeDesk.id === "rates" ? "3M, 2Y, and 10Y rates at minimum." : "Enough aligned observations to compute the selected metric."} />
          <CaveatPanel caveats={activeDesk.caveats} />
          <HowToReadPanel steps={activeDesk.howToRead} />
          <NextChecksPanel checks={activeDesk.nextChecks} />
          <StatusBadge label="No buy/sell/hold output" tone="emerald" />
        </aside>
      </section>
    </section>
  );
}
