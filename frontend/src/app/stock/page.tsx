"use client";

import { FormEvent, useState } from "react";
import { api, type MarketStockAnalysisResponse } from "@/lib/api";

const pct = (value: number | null, digits = 1) => value == null ? "—" : `${(value * 100).toFixed(digits)}%`;
const num = (value: number | null, digits = 2) => value == null ? "—" : value.toFixed(digits);

export default function StockLabPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [benchmark, setBenchmark] = useState("SPY");
  const [range, setRange] = useState<MarketStockAnalysisResponse["range"]>("1y");
  const [result, setResult] = useState<MarketStockAnalysisResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return setError("Enter a symbol.");
    setBusy(true); setError(""); setResult(null);
    try { setResult(await api.marketStock({ symbol: normalized, benchmark: benchmark.trim().toUpperCase() || "SPY", range })); }
    catch (err) { setError(err instanceof Error ? err.message : "Stock analysis failed."); }
    finally { setBusy(false); }
  }

  return <section className="space-y-6">
    <header className="overflow-hidden rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-6 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Markets & Risk · Symbol workstation</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">Stock Lab</h1><p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">Analyze any supported symbol against a benchmark through Ballzatram&apos;s server-side market-data layer. Live data is used when configured; fallback data is always labeled.</p></div><a href="/stock/macro" className="w-fit rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100">Macro regression mode →</a></div>
    </header>
    <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
      <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Analysis setup</p><h2 className="mt-2 text-2xl font-semibold text-white">Choose a symbol</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm text-slate-300">Symbol<input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Benchmark<input value={benchmark} onChange={e=>setBenchmark(e.target.value.toUpperCase())} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label></div><label className="mt-4 block text-sm text-slate-300">History window<select value={range} onChange={e=>setRange(e.target.value as MarketStockAnalysisResponse["range"])} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">{["1mo","3mo","6mo","1y","2y","5y"].map(v=><option key={v}>{v}</option>)}</select></label>{error&&<p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-100">{error}</p>}<button disabled={busy} className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{busy?"Loading market data…":"Analyze symbol"}</button></form>
      <div className="space-y-5">{!result&&!busy&&<div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-slate-400">Run an analysis to populate real computed metrics.</div>}{busy&&<div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Loading prices and benchmark history…</div>}{result&&<><div className="flex flex-wrap gap-2"><Badge label={result.freshness.status.toUpperCase()}/><Badge label={result.freshness.provider}/><Badge label={`as of ${result.freshness.as_of??"unknown"}`}/>{result.status==="partial_success"&&<Badge label="PARTIAL / FALLBACK"/>}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Last price" value={`$${num(result.quote.price)}`} detail={`${result.symbol} · ${pct(result.quote.changePercent)}`} /><Metric label="Cumulative return" value={pct(result.metrics.cumulativeReturn)} detail={result.range}/><Metric label="20D volatility" value={pct(result.metrics.rollingVolatility20d)} detail="Annualized"/><Metric label="Max drawdown" value={pct(result.metrics.maxDrawdown)} detail="Peak-to-trough"/></div><div className="grid gap-5 lg:grid-cols-2"><Panel title="Benchmark-relative"><Row label="Benchmark" value={result.benchmark}/><Row label="Beta" value={num(result.metrics.betaVsBenchmark,3)}/><Row label="Relative strength" value={pct(result.metrics.relativeStrengthVsBenchmark)}/><Row label="20D z-score" value={num(result.metrics.zScore20d,2)}/></Panel><Panel title="Trend"><Row label="20D average" value={`$${num(result.metrics.movingAverage20d)}`}/><Row label="50D average" value={`$${num(result.metrics.movingAverage50d)}`}/><Row label="RSI 14" value={num(result.metrics.rsi14,1)}/><Row label="History points" value={String(result.priceHistory.length)}/></Panel></div><article className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Data provenance</p><p className="mt-3 text-sm text-slate-300">{result.freshness.source} · retrieved {result.freshness.retrieved_at}</p>{[...result.freshness.warnings,...result.warnings].map(w=><p key={w} className="mt-2 text-sm text-slate-400">• {w}</p>)}</article></>}</div>
    </div>
  </section>;
}
function Metric({label,value,detail}:{label:string;value:string;detail:string}){return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold text-white">{value}</p><p className="mt-2 text-xs text-slate-400">{detail}</p></article>}
function Row({label,value}:{label:string;value:string}){return <div className="flex justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm"><span className="text-slate-300">{label}</span><span className="font-semibold text-slate-100">{value}</span></div>}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-semibold text-white">{title}</h2><div className="mt-4 space-y-2">{children}</div></article>}
function Badge({label}:{label:string}){return <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">{label}</span>}
