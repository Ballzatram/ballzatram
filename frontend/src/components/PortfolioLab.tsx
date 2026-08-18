"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type DataFreshness, type MarketPortfolioAnalysisResponse } from "@/lib/api";

type HoldingInput = { symbol: string; weight: string };
const ranges: MarketPortfolioAnalysisResponse["range"][] = ["1mo", "3mo", "6mo", "1y", "2y", "5y"];

function pct(value: number | null | undefined, digits = 1) {
  return value == null ? "—" : `${(value * 100).toFixed(digits)}%`;
}

function num(value: number | null | undefined, digits = 2) {
  return value == null ? "—" : value.toFixed(digits);
}

function freshnessTone(status: DataFreshness["status"]) {
  if (status === "live") return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100";
  if (status === "cached") return "border-cyan-300/40 bg-cyan-300/10 text-cyan-100";
  if (status === "demo" || status === "fallback") return "border-amber-300/40 bg-amber-300/10 text-amber-100";
  return "border-rose-300/40 bg-rose-300/10 text-rose-100";
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20"><p className="text-[.66rem] font-bold uppercase tracking-[.18em] text-slate-500">{label}</p><p className="mt-2 font-mono text-2xl font-black text-white">{value}</p><p className="mt-2 text-xs leading-5 text-slate-400">{note}</p></article>;
}

export function PortfolioLab() {
  const router = useRouter();
  const [holdings, setHoldings] = useState<HoldingInput[]>([
    { symbol: "QQQ", weight: "45" },
    { symbol: "TLT", weight: "35" },
    { symbol: "GLD", weight: "20" },
  ]);
  const [benchmark, setBenchmark] = useState("SPY");
  const [range, setRange] = useState<MarketPortfolioAnalysisResponse["range"]>("1y");
  const [result, setResult] = useState<MarketPortfolioAnalysisResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const parsed = useMemo(() => holdings.map((holding) => ({ symbol: holding.symbol.trim().toUpperCase(), weight: Number(holding.weight) })), [holdings]);
  const weightTotal = parsed.reduce((sum, holding) => sum + (Number.isFinite(holding.weight) ? holding.weight : 0), 0);
  const duplicates = parsed.filter((holding, index) => holding.symbol && parsed.findIndex((other) => other.symbol === holding.symbol) !== index).map((holding) => holding.symbol);
  const valid = parsed.length > 0 && parsed.every((holding) => holding.symbol && Number.isFinite(holding.weight) && holding.weight > 0) && duplicates.length === 0;

  function updateHolding(index: number, patch: Partial<HoldingInput>) {
    setHoldings((current) => current.map((holding, i) => i === index ? { ...holding, ...patch } : holding));
  }

  async function analyze() {
    if (!valid) return;
    setLoading(true);
    setError(undefined);
    try {
      const next = await api.marketPortfolio({ holdings: parsed, benchmark: benchmark.trim().toUpperCase(), range });
      setResult(next);
      localStorage.setItem("ballzatram:portfolio-last-run:v1", JSON.stringify({ savedAt: new Date().toISOString(), request: { holdings: parsed, benchmark, range }, result: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portfolio analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function launchScenario() {
    if (!result) return;
    sessionStorage.setItem("ballzatram:scenario-handoff:v1", JSON.stringify({
      source: "portfolio",
      createdAt: new Date().toISOString(),
      benchmark: result.benchmark,
      range: result.range,
      holdings: result.scenarioPayload.holdings,
      portfolioMetrics: result.metrics,
    }));
    router.push("/scenario?from=portfolio");
  }

  const dominantStatus = result?.holdings.some((holding) => ["demo", "fallback"].includes(holding.freshness.status)) ? "demo/fallback" : result?.holdings.some((holding) => holding.freshness.status === "cached") ? "cached" : result ? "live" : "not run";

  return <section className="space-y-6">
    <header className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.2),transparent_30%),linear-gradient(135deg,#020617,#0f172a_55%,#172554)] p-6 shadow-2xl shadow-black/40 sm:p-8">
      <p className="font-mono text-xs font-black uppercase tracking-[.32em] text-cyan-300">Ballzatram V3 · Portfolio Lab</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end"><div><h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Portfolio risk, without the fake dashboard.</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">Enter actual symbols and weights. Ballzatram pulls each available price history, preserves partial successes, measures diversification and risk contribution, and prepares the same holdings for Scenario Lab.</p></div><div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300"><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">Current input</p><p className="mt-2 font-mono text-3xl font-black text-white">{weightTotal.toFixed(1)}</p><p className="mt-1">weight units across {holdings.length} holding{holdings.length === 1 ? "" : "s"}. Inputs are normalized server-side after any data failures.</p></div></div>
    </header>

    <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <aside className="space-y-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">Holdings</p><h2 className="mt-2 text-xl font-black text-white">Portfolio inputs</h2></div><button type="button" onClick={() => setHoldings((current) => [...current, { symbol: "", weight: "10" }])} className="rounded-full border border-cyan-300/40 px-3 py-2 text-xs font-bold text-cyan-100">+ Add holding</button></div><div className="mt-4 space-y-2">{holdings.map((holding, index) => <div key={index} className="grid grid-cols-[1fr_7rem_auto] gap-2"><input aria-label={`Holding ${index + 1} symbol`} value={holding.symbol} onChange={(event) => updateHolding(index, { symbol: event.target.value.toUpperCase() })} placeholder="SPY" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono uppercase text-white"/><input aria-label={`Holding ${index + 1} weight`} type="number" min="0.01" value={holding.weight} onChange={(event) => updateHolding(index, { weight: event.target.value })} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-right font-mono text-white"/><button type="button" disabled={holdings.length === 1} onClick={() => setHoldings((current) => current.filter((_, i) => i !== index))} className="rounded-xl border border-slate-700 px-3 text-slate-400 disabled:opacity-30">×</button></div>)}</div>{duplicates.length ? <p className="mt-3 text-xs text-rose-300">Duplicate symbols: {Array.from(new Set(duplicates)).join(", ")}</p> : null}<p className="mt-3 text-xs leading-5 text-slate-500">Weights can be percentages or relative units; they do not need to sum to exactly 100.</p></article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><label className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">Benchmark<input value={benchmark} onChange={(event) => setBenchmark(event.target.value.toUpperCase())} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono uppercase text-white"/></label><label className="mt-4 block text-xs font-bold uppercase tracking-[.2em] text-slate-500">History range<select value={range} onChange={(event) => setRange(event.target.value as MarketPortfolioAnalysisResponse["range"])} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">{ranges.map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" disabled={!valid || loading} onClick={analyze} className="mt-5 w-full rounded-xl bg-cyan-300 px-4 py-3 font-black uppercase tracking-[.14em] text-slate-950 disabled:opacity-40">{loading ? "Analyzing…" : "Analyze portfolio"}</button>{error ? <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p> : null}</article>
      </aside>

      <div className="space-y-4">
        {!result ? <article className="flex min-h-[24rem] items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center"><div><p className="font-mono text-xs uppercase tracking-[.25em] text-slate-500">No portfolio run yet</p><h2 className="mt-3 text-2xl font-black text-white">Your inputs should create the analysis.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Run the portfolio to populate risk, concentration, diversification, data provenance, and the Scenario Lab handoff. Nothing here is pre-filled with fake metrics.</p></div></article> : <>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-xs"><span className="font-bold uppercase tracking-[.18em] text-slate-500">Run status</span><span className={`rounded-full border px-3 py-1 ${result.status === "complete" ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100" : "border-amber-300/40 bg-amber-300/10 text-amber-100"}`}>{result.status.replace("_", " ")}</span><span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">data: {dominantStatus}</span><span className="text-slate-500">{result.range} · benchmark {result.benchmark}</span><button type="button" onClick={launchScenario} className="ml-auto rounded-full bg-amber-300 px-4 py-2 font-black uppercase tracking-[.14em] text-slate-950">Stress in Scenario Lab →</button></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Cumulative return" value={pct(result.metrics.cumulativeReturn)} note={`${result.range} weighted historical result`}/><Metric label="Annualized volatility" value={pct(result.metrics.annualizedVolatility)} note="From weighted daily covariance"/><Metric label="Max drawdown" value={pct(result.metrics.maxDrawdown)} note="Peak-to-trough historical loss"/><Metric label="Beta vs benchmark" value={num(result.metrics.betaVsBenchmark)} note={`Relative to ${result.benchmark}`}/><Metric label="Top holding" value={pct(result.metrics.topHoldingWeight)} note="Largest normalized portfolio weight"/><Metric label="Effective positions" value={num(result.metrics.effectivePositions, 1)} note="Inverse concentration (1 / sum w²)"/><Metric label="Benchmark correlation" value={num(result.metrics.correlationVsBenchmark)} note="Historical return correlation"/><Metric label="Annualized return" value={pct(result.metrics.annualizedReturn)} note="Geometric annualization of selected window"/></div>

          <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"><div className="border-b border-slate-800 p-5"><h2 className="text-xl font-black text-white">Holding contribution</h2><p className="mt-1 text-xs text-slate-400">Weights renormalize across successful symbols, so failed data never silently deletes the rest of the portfolio.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[.14em] text-slate-500"><tr><th className="p-3">Holding</th><th className="p-3">Weight</th><th className="p-3">Return</th><th className="p-3">Volatility</th><th className="p-3">Risk contribution</th><th className="p-3">Data</th></tr></thead><tbody>{result.holdings.map((holding) => <tr key={holding.symbol} className="border-t border-slate-800"><td className="p-3"><strong className="text-white">{holding.symbol}</strong><span className="ml-2 text-xs text-slate-500">{holding.name}</span></td><td className="p-3 font-mono text-slate-200">{pct(holding.normalizedWeight)}</td><td className="p-3 font-mono text-slate-200">{pct(holding.cumulativeReturn)}</td><td className="p-3 font-mono text-slate-200">{pct(holding.annualizedVolatility)}</td><td className="p-3 font-mono text-slate-200">{pct(holding.riskContribution)}</td><td className="p-3"><span className={`rounded-full border px-2 py-1 text-[.65rem] uppercase ${freshnessTone(holding.freshness.status)}`}>{holding.freshness.status} · {holding.freshness.provider}</span></td></tr>)}</tbody></table></div></article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-black text-white">Correlation matrix</h2><p className="mt-1 text-xs text-slate-400">Pairwise correlation across the overlapping daily-return window actually used for portfolio calculations.</p><div className="mt-4 overflow-x-auto"><table className="min-w-[32rem] text-center text-xs"><thead><tr><th className="p-2"></th>{result.correlationMatrix.columns.map((symbol) => <th key={symbol} className="p-2 text-slate-400">{symbol}</th>)}</tr></thead><tbody>{result.correlationMatrix.columns.map((symbol, row) => <tr key={symbol}><th className="p-2 text-left text-slate-400">{symbol}</th>{result.correlationMatrix.matrix[row].map((value, col) => <td key={col} className="border border-slate-800 bg-slate-950/60 p-2 font-mono text-slate-200">{num(value)}</td>)}</tr>)}</tbody></table></div></article>

          {result.errors.length ? <article className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5"><h2 className="font-black text-amber-100">Partial data failures</h2><div className="mt-3 space-y-2">{result.errors.map((item, index) => <p key={`${item.symbol}-${index}`} className="text-sm text-amber-50"><strong>{item.symbol}</strong> · {item.message}</p>)}</div></article> : null}
          <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Methodology & warnings</p><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">{result.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></article>
        </>}
      </div>
    </div>
  </section>;
}
