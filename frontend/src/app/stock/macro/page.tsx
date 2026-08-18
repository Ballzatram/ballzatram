"use client";

import { FormEvent, useMemo, useState } from "react";
import { api } from "@/lib/api";

type OlsResult = { coefficients: Record<string, number>; r_squared: number; adjusted_r_squared: number; p_value: Record<string, number>; sample_size: number; methodology_note: string };
type StockAnalysisResult = { asset: string; ols: OlsResult; rolling_regression: Array<{ date: string; beta: number; r2: number }>; regularized: { models: Array<{ model: string; r_squared: number; coefficients: Record<string, number> }>; best_model: unknown; methodology_note: string }; feature_importance: Array<{ feature: string; importance: number; direction: string; share: number }>; regimes: { current_regime: string; history: Array<{ date: string; score: number; regime: string }> }; warnings: { correlation_warning: string; model_assumptions: string[] } };

const factors = [
  ["market_ret", "Market return"], ["cpi_yoy", "CPI YoY"], ["ffr", "Fed funds rate"], ["unemployment", "Unemployment"],
  ["dxy", "US dollar (DXY)"], ["oil", "Oil"], ["credit_spread", "Credit spread"], ["ism_new_orders", "ISM new orders"],
] as const;
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const num = (value: number, digits = 3) => Number.isFinite(value) ? value.toFixed(digits) : "—";

export default function StockMacroLabPage() {
  const [selectedFactors, setSelectedFactors] = useState(["market_ret", "cpi_yoy", "ffr", "dxy"]);
  const [startDate, setStartDate] = useState("2021-01-31");
  const [endDate, setEndDate] = useState("2022-12-31");
  const [result, setResult] = useState<StockAnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const strongest = useMemo(() => result?.feature_importance?.[0], [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (selectedFactors.length < 2) return setError("Select at least two macro factors.");
    if (startDate > endDate) return setError("Start date must be before end date.");
    setBusy(true);
    try {
      setResult(await api.stock({ asset: "asset_ret", macro_series: selectedFactors, start_date: startDate, end_date: endDate, frequency: "M", missing_policy: "interpolate" }) as StockAnalysisResult);
    } catch (err) { setResult(null); setError(err instanceof Error ? err.message : "Analysis failed."); }
    finally { setBusy(false); }
  }

  return <section className="space-y-6">
    <header className="rounded-3xl border border-amber-300/20 bg-slate-900 p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Stock Lab · Macro mode</p>
      <h1 className="mt-3 text-3xl font-bold text-white sm:text-5xl">Macro factor regression</h1>
      <p className="mt-4 max-w-3xl text-slate-300">The original V3 Stock Lab preserved as a separate research mode. It uses the bundled 2021–2022 monthly asset-return series, not a live ticker.</p>
      <a href="/stock" className="mt-4 inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200">← Live symbol analysis</a>
    </header>
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Start<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" /></label>
          <label className="text-sm text-slate-300">End<input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" /></label>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{factors.map(([id,label]) => <label key={id} className="flex gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"><input type="checkbox" checked={selectedFactors.includes(id)} onChange={()=>setSelectedFactors(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}/>{label}</label>)}</div>
        {error && <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-100">{error}</p>}
        <button disabled={busy} className="mt-4 w-full rounded-xl bg-amber-300 px-4 py-3 font-semibold text-slate-950">{busy?"Running…":"Run macro regression"}</button>
      </form>
      <div className="space-y-4">{!result ? <div className="min-h-72 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-slate-400">Run the model to populate computed results.</div> : <>
        <div className="grid gap-3 sm:grid-cols-3"><Metric label="R²" value={pct(result.ols.r_squared)}/><Metric label="Adjusted R²" value={pct(result.ols.adjusted_r_squared)}/><Metric label="Strongest factor" value={strongest?.feature ?? "—"}/></div>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-semibold text-white">Factor coefficients</h2><div className="mt-4 space-y-2">{Object.entries(result.ols.coefficients).map(([k,v])=><div key={k} className="flex justify-between rounded-lg bg-slate-950/60 p-3 text-sm"><span className="text-slate-200">{k}</span><span className="text-slate-400">β {num(v,4)} · p {num(result.ols.p_value[k],4)}</span></div>)}</div></article>
        <article className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5 text-sm text-slate-300">{result.warnings.correlation_warning}</article>
      </>}</div>
    </div>
  </section>;
}
function Metric({label,value}:{label:string;value:string}) { return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></article> }
