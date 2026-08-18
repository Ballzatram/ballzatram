"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type ScenarioStressResponse } from "@/lib/api";

type Factor = "rates" | "cpi" | "growth" | "oil" | "credit";
type ShockState = Record<Factor, string>;
type RunRecord = { id: string; name: string; shocks: Record<string, number>; result: ScenarioStressResponse };

const factorMeta: Array<{ id: Factor; label: string; copy: string }> = [
  { id: "rates", label: "Rates", copy: "Higher policy/market rates are modeled as a negative portfolio shock." },
  { id: "cpi", label: "Inflation / CPI", copy: "Higher inflation pressure is modeled as a negative shock." },
  { id: "growth", label: "Growth", copy: "Positive growth is supportive; negative growth hurts the stressed return." },
  { id: "oil", label: "Oil", copy: "Higher oil pressure is modeled as a modest negative shock." },
  { id: "credit", label: "Credit stress", copy: "Higher credit stress is modeled as a negative portfolio shock." },
];

const presets: Array<{ id: string; name: string; description: string; shocks: Record<Factor, number> }> = [
  { id: "rates-up", name: "Rates shock", description: "Rates rise sharply and credit conditions tighten.", shocks: { rates: 0.5, cpi: 0, growth: -0.1, oil: 0, credit: 0.25 } },
  { id: "inflation", name: "Inflation squeeze", description: "Inflation pressure rises and policy follows it higher.", shocks: { rates: 0.3, cpi: 0.6, growth: -0.15, oil: 0.15, credit: 0.1 } },
  { id: "growth-scare", name: "Growth scare", description: "Growth contracts while credit stress increases.", shocks: { rates: -0.1, cpi: -0.1, growth: -0.7, oil: -0.1, credit: 0.35 } },
  { id: "oil-spike", name: "Oil spike", description: "Energy prices jump with second-order inflation pressure.", shocks: { rates: 0.1, cpi: 0.2, growth: -0.1, oil: 0.8, credit: 0.05 } },
];

const emptyShocks = (): ShockState => ({ rates: "0", cpi: "0", growth: "0", oil: "0", credit: "0" });

function pct(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function ScenarioLab() {
  const [name, setName] = useState("Custom scenario");
  const [shocks, setShocks] = useState<ShockState>(emptyShocks);
  const [holdings, setHoldings] = useState<Record<string, number>>({ SPY: 1 });
  const [handoffLoaded, setHandoffLoaded] = useState(false);
  const [result, setResult] = useState<ScenarioStressResponse>();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ballzatram:scenario-handoff:v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { source?: string; holdings?: Record<string, number> };
      if (parsed.holdings && Object.keys(parsed.holdings).length) {
        setHoldings(parsed.holdings);
        setHandoffLoaded(parsed.source === "portfolio");
      }
    } catch {
      // Ignore stale/invalid handoff state.
    }
  }, []);

  const parsedShocks = useMemo(() => Object.fromEntries(Object.entries(shocks).map(([factor, value]) => [factor, Number(value)])), [shocks]);
  const invalidShock = Object.values(parsedShocks).some((value) => !Number.isFinite(value) || value < -5 || value > 5);
  const hasShock = Object.values(parsedShocks).some((value) => value !== 0);
  const holdingRows = Object.entries(holdings).sort((a, b) => b[1] - a[1]);

  function applyPreset(preset: typeof presets[number]) {
    setName(preset.name);
    setShocks(Object.fromEntries(Object.entries(preset.shocks).map(([factor, value]) => [factor, String(value)])) as ShockState);
  }

  async function runScenario() {
    if (invalidShock || !hasShock) return;
    setLoading(true);
    setError(undefined);
    try {
      const next = await api.scenario({ name: name.trim() || "Custom scenario", shocks: parsedShocks, holdings });
      setResult(next);
      const record: RunRecord = { id: `${Date.now()}`, name: name.trim() || "Custom scenario", shocks: parsedShocks, result: next };
      setRuns((current) => [record, ...current].slice(0, 5));
      localStorage.setItem("ballzatram:scenario-last-run:v1", JSON.stringify({ savedAt: new Date().toISOString(), holdings, ...record }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scenario run failed");
    } finally {
      setLoading(false);
    }
  }

  const worstDriver = result?.factor_contributions.slice().sort((a, b) => a.impact - b.impact)[0];

  return <section className="space-y-6">
    <header className="overflow-hidden rounded-3xl border border-amber-300/20 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,.18),transparent_32%),linear-gradient(135deg,#020617,#111827_55%,#451a03)] p-6 shadow-2xl shadow-black/40 sm:p-8">
      <p className="font-mono text-xs font-black uppercase tracking-[.32em] text-amber-300">Ballzatram V3 · Scenario Lab</p>
      <h1 className="mt-4 max-w-5xl text-4xl font-black tracking-tight text-white sm:text-6xl">Stress the portfolio you actually built.</h1>
      <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-300">Compose macro factor shocks, run the existing backend stress engine, and see the stressed portfolio return plus factor drivers. This is an illustrative sensitivity model—not a security-level forecast or VaR system.</p>
      {handoffLoaded ? <p className="mt-5 inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[.14em] text-emerald-100">Portfolio Lab handoff loaded</p> : null}
    </header>

    <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
      <aside className="space-y-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Scenario presets</p><div className="mt-4 grid gap-2">{presets.map((preset) => <button key={preset.id} type="button" onClick={() => applyPreset(preset)} className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-left hover:border-amber-300/50"><span className="font-bold text-white">{preset.name}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{preset.description}</span></button>)}</div></article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><label className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">Scenario name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"/></label><div className="mt-4 space-y-3">{factorMeta.map((factor) => <label key={factor.id} className="block"><span className="flex items-center justify-between text-sm"><strong className="text-slate-200">{factor.label}</strong><span className="text-xs text-slate-500">stress units</span></span><input type="number" min="-5" max="5" step="0.05" value={shocks[factor.id]} onChange={(event) => setShocks((current) => ({ ...current, [factor.id]: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"/><span className="mt-1 block text-[.7rem] leading-4 text-slate-500">{factor.copy}</span></label>)}</div>{invalidShock ? <p className="mt-3 text-xs text-rose-300">Each shock must be numeric and between -5 and +5 stress units.</p> : !hasShock ? <p className="mt-3 text-xs text-amber-200">Set at least one non-zero shock.</p> : null}<button type="button" disabled={invalidShock || !hasShock || loading} onClick={runScenario} className="mt-5 w-full rounded-xl bg-amber-300 px-4 py-3 font-black uppercase tracking-[.14em] text-slate-950 disabled:opacity-40">{loading ? "Running stress…" : "Run scenario"}</button>{error ? <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p> : null}</article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Portfolio</p><h2 className="mt-1 font-black text-white">{holdingRows.length} holding{holdingRows.length === 1 ? "" : "s"}</h2></div><a href="/portfolio" className="text-xs font-bold text-cyan-200">Edit in Portfolio Lab →</a></div><div className="mt-3 space-y-2">{holdingRows.map(([symbol, weight]) => <div key={symbol} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2 text-sm"><span className="font-mono font-bold text-white">{symbol}</span><span className="font-mono text-slate-400">{pct(weight)}</span></div>)}</div></article>
      </aside>

      <div className="space-y-4">
        {!result ? <article className="flex min-h-[28rem] items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center"><div><p className="font-mono text-xs uppercase tracking-[.25em] text-slate-500">No stress run yet</p><h2 className="mt-3 text-2xl font-black text-white">Choose a preset or compose your own shocks.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Results appear only after the backend computes them. Base case is zero incremental scenario shock; stressed case is the factor-model output.</p></div></article> : <>
          <div className="grid gap-3 sm:grid-cols-3"><article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs uppercase tracking-[.18em] text-slate-500">Base incremental shock</p><p className="mt-2 font-mono text-3xl font-black text-white">0.0%</p><p className="mt-2 text-xs text-slate-400">Reference case before scenario factors.</p></article><article className={`rounded-2xl border p-5 ${result.portfolio_return_shock < 0 ? "border-rose-300/30 bg-rose-300/10" : "border-emerald-300/30 bg-emerald-300/10"}`}><p className="text-xs uppercase tracking-[.18em] text-slate-400">Stressed portfolio return</p><p className="mt-2 font-mono text-3xl font-black text-white">{pct(result.portfolio_return_shock)}</p><p className="mt-2 text-xs text-slate-300">Incremental model shock under {name}.</p></article><article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs uppercase tracking-[.18em] text-slate-500">Model confidence band</p><p className="mt-2 font-mono text-2xl font-black text-white">{pct(result.confidence_band[0])} to {pct(result.confidence_band[1])}</p><p className="mt-2 text-xs text-slate-400">Fixed illustrative ±3% band from current engine.</p></article></div>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Driver decomposition</p><h2 className="mt-2 text-xl font-black text-white">What drove the stress result?</h2></div>{worstDriver ? <p className="text-sm text-rose-200">Largest drag: <strong>{worstDriver.factor}</strong> ({pct(worstDriver.impact)})</p> : null}</div><div className="mt-4 space-y-3">{result.factor_contributions.map((driver) => <div key={driver.factor} className="grid gap-2 sm:grid-cols-[8rem_6rem_1fr_6rem] sm:items-center"><span className="font-bold capitalize text-white">{driver.factor}</span><span className="font-mono text-xs text-slate-400">shock {driver.shock.toFixed(2)}</span><div className="h-3 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${driver.impact < 0 ? "bg-rose-300" : "bg-emerald-300"}`} style={{ width: `${Math.min(100, Math.max(4, Math.abs(driver.impact) * 220))}%` }}/></div><span className={`text-right font-mono text-sm ${driver.impact < 0 ? "text-rose-200" : "text-emerald-200"}`}>{pct(driver.impact)}</span></div>)}</div></article>

          <article className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-200">Model limitations</p><p className="mt-3 text-sm leading-6 text-slate-300">{result.warnings.correlation_warning}</p><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">{result.warnings.model_assumptions.map((warning) => <li key={warning}>• {warning}</li>)}</ul><p className="mt-3 text-xs leading-5 text-amber-100">Current backend applies factor sensitivities at the portfolio level. It does not yet estimate security-specific factor exposures; treat the result as a scenario sensitivity illustration.</p></article>
        </>}

        {runs.length ? <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">Recent reruns</p><div className="mt-3 space-y-2">{runs.map((run) => <button key={run.id} type="button" onClick={() => { setName(run.name); setShocks(Object.fromEntries(Object.entries(run.shocks).map(([key, value]) => [key, String(value)])) as ShockState); setResult(run.result); }} className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-left"><span><strong className="text-white">{run.name}</strong><span className="ml-2 text-xs text-slate-500">{Object.entries(run.shocks).filter(([, value]) => value !== 0).map(([key, value]) => `${key} ${value > 0 ? "+" : ""}${value}`).join(" · ")}</span></span><span className={`font-mono font-bold ${run.result.portfolio_return_shock < 0 ? "text-rose-200" : "text-emerald-200"}`}>{pct(run.result.portfolio_return_shock)}</span></button>)}</div></article> : null}
      </div>
    </div>
  </section>;
}
