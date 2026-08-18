"use client";

import { FormEvent, useMemo, useState } from "react";
import { api, type QuantLibraryAnalyticsDemoResponse } from "@/lib/api";

const pct = (value: number | null, digits = 1) => value == null ? "—" : `${(value * 100).toFixed(digits)}%`;
const num = (value: number | null, digits = 2) => value == null ? "—" : value.toFixed(digits);

export default function StockLabPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [benchmark, setBenchmark] = useState("SPY");
  const [result, setResult] = useState<QuantLibraryAnalyticsDemoResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const asset = useMemo(() => result?.symbols.find((item) => item.symbol === symbol.toUpperCase()) ?? result?.symbols[0], [result, symbol]);
  const providerLabel = asset?.freshness.provider ?? result?.provider ?? "not loaded";
  const dataStatus = asset?.freshness.status ?? "unknown";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = symbol.trim().toUpperCase();
    const normalizedBenchmark = benchmark.trim().toUpperCase() || "SPY";
    if (!normalized) return setError("Enter a symbol.");
    setBusy(true); setError(""); setResult(null);
    try {
      setResult(await api.quantLibraryAnalyticsDemo([normalized, normalizedBenchmark], normalizedBenchmark));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stock analysis failed.");
    } finally { setBusy(false); }
  }

  return <section className="space-y-6">
    <header className="overflow-hidden rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-6 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Markets & Risk · Live-symbol workstation</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">Stock Lab</h1>
          <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">Analyze a real symbol against a benchmark using Ballzatram&apos;s market-data provider layer. When a live provider is configured the backend uses it; otherwise the result is explicitly marked as demo fallback.</p>
        </div>
        <a href="/stock/macro" className="w-fit rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100">Open macro regression mode →</a>
      </div>
    </header>

    <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
      <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Analysis setup</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Choose a symbol</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-300">Symbol<input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} placeholder="AAPL" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label>
          <label className="text-sm font-medium text-slate-300">Benchmark<input value={benchmark} onChange={e=>setBenchmark(e.target.value.toUpperCase())} placeholder="SPY" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label>
        </div>
        {error && <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div>}
        <button disabled={busy} className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{busy ? "Loading market data…" : "Analyze symbol"}</button>
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs leading-5 text-slate-500">Provider order is live equity feed → rates provider → deterministic demo fallback. Provenance is shown on every completed run.</div>
      </form>

      <div className="space-y-5">
        {!asset && !busy && <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-slate-400">Enter a symbol and run the analysis. No metrics are shown until the backend returns data.</div>}
        {busy && <div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">Loading prices, benchmark data, and risk metrics…</div>}
        {asset && <>
          <div className="flex flex-wrap gap-2"><Badge label={dataStatus.toUpperCase()} /><Badge label={providerLabel} /><Badge label={`as of ${asset.freshness.as_of ?? "unknown"}`} /></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Last price" value={`$${num(asset.metrics.lastClose)}`} detail={asset.symbol} />
            <Metric label="Cumulative return" value={pct(asset.metrics.cumulativeReturn)} detail="Selected provider window" />
            <Metric label="20D volatility" value={pct(asset.metrics.rollingVolatility20d)} detail="Annualized rolling volatility" />
            <Metric label="Max drawdown" value={pct(asset.metrics.maxDrawdown)} detail="Peak-to-trough loss" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Benchmark-relative</p><h2 className="mt-2 text-xl font-semibold text-white">Risk and relative strength</h2><div className="mt-4 space-y-2"><Row label="Beta" value={num(asset.metrics.betaVsBenchmark,3)} /><Row label="Relative strength" value={pct(asset.metrics.relativeStrengthVsBenchmark)} /><Row label="20D z-score" value={num(asset.metrics.zScore20d,2)} /><Row label="RSI 14" value={num(asset.metrics.rsi14,1)} /></div></article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Trend</p><h2 className="mt-2 text-xl font-semibold text-white">Moving averages</h2><div className="mt-4 space-y-2"><Row label="20D average" value={`$${num(asset.metrics.movingAverage20d)}`} /><Row label="50D average" value={`$${num(asset.metrics.movingAverage50d)}`} /><Row label="Latest daily return" value={pct(asset.metrics.latestDailyReturn)} /><Row label="Regime" value={result?.regime.label ?? "—"} /></div></article>
          </div>
          <article className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Data provenance</p><p className="mt-3 text-sm text-slate-300">Source: {asset.freshness.source}. Retrieved {asset.freshness.retrieved_at}.</p>{asset.freshness.warnings.map(w=><p key={w} className="mt-2 text-sm text-slate-400">• {w}</p>)}</article>
        </>}
      </div>
    </div>
  </section>;
}

function Metric({label,value,detail}:{label:string;value:string;detail:string}) { return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold text-white">{value}</p><p className="mt-2 text-xs text-slate-400">{detail}</p></article> }
function Row({label,value}:{label:string;value:string}) { return <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm"><span className="text-slate-300">{label}</span><span className="font-semibold text-slate-100">{value}</span></div> }
function Badge({label}:{label:string}) { return <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">{label}</span> }
