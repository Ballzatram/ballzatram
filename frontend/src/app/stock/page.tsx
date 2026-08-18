"use client";

import { FormEvent, useMemo, useState } from "react";
import { api } from "@/lib/api";

type OlsResult = {
  coefficients: Record<string, number>;
  r_squared: number;
  adjusted_r_squared: number;
  p_value: Record<string, number>;
  sample_size: number;
  methodology_note: string;
};

type RollingPoint = { date: string; beta: number; r2: number };
type FeatureImportance = { feature: string; importance: number; direction: string; share: number };
type RegularizedModel = { model: string; r_squared: number; coefficients: Record<string, number> };
type RegimePoint = { date: string; score: number; regime: string };

type StockAnalysisResult = {
  asset: string;
  ols: OlsResult;
  rolling_regression: RollingPoint[];
  regularized: {
    models: RegularizedModel[];
    best_model: RegularizedModel | null;
    methodology_note: string;
  };
  feature_importance: FeatureImportance[];
  regimes: { current_regime: string; history: RegimePoint[] };
  warnings: { correlation_warning: string; model_assumptions: string[] };
};

const factors = [
  { id: "market_ret", label: "Market return" },
  { id: "cpi_yoy", label: "CPI YoY" },
  { id: "ffr", label: "Fed funds rate" },
  { id: "unemployment", label: "Unemployment" },
  { id: "dxy", label: "US dollar (DXY)" },
  { id: "oil", label: "Oil" },
  { id: "credit_spread", label: "Credit spread" },
  { id: "ism_new_orders", label: "ISM new orders" },
];

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function number(value: number, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

export default function StockLabPage() {
  const [selectedFactors, setSelectedFactors] = useState(["market_ret", "cpi_yoy", "ffr", "dxy"]);
  const [startDate, setStartDate] = useState("2021-01-31");
  const [endDate, setEndDate] = useState("2022-12-31");
  const [result, setResult] = useState<StockAnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const strongestFactor = useMemo(() => result?.feature_importance?.[0] ?? null, [result]);
  const latestRolling = useMemo(() => result?.rolling_regression?.at(-1) ?? null, [result]);

  function toggleFactor(id: string) {
    setSelectedFactors((current) =>
      current.includes(id) ? current.filter((factor) => factor !== id) : [...current, id],
    );
  }

  async function runAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (selectedFactors.length < 2) {
      setError("Select at least two macro factors. The current backend model requires two or more explanatory series.");
      return;
    }

    if (startDate > endDate) {
      setError("Start date must be before the end date.");
      return;
    }

    setBusy(true);
    try {
      const response = (await api.stock({
        asset: "asset_ret",
        macro_series: selectedFactors,
        start_date: startDate,
        end_date: endDate,
        frequency: "M",
        missing_policy: "interpolate",
      })) as StockAnalysisResult;
      setResult(response);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Stock Lab analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Markets & Risk · Functional Lab</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">Stock Lab</h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Run a real regression and factor analysis against Ballzatram&apos;s bundled monthly research dataset. This first V3 implementation uses the demo asset-return series honestly; arbitrary ticker ingestion comes with the market-data provider layer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">Backend computed</span>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100">Demo data</span>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <form onSubmit={runAnalysis} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Analysis setup</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Choose the macro lens</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The dependent variable is the bundled <code className="text-slate-200">asset_ret</code> series. Select at least two explanatory factors and a date range.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-300">
              Start date
              <input type="date" min="2021-01-31" max="2022-12-31" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
            </label>
            <label className="text-sm font-medium text-slate-300">
              End date
              <input type="date" min="2021-01-31" max="2022-12-31" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-slate-300">Macro factors</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {factors.map((factor) => {
                const checked = selectedFactors.includes(factor.id);
                return (
                  <label key={factor.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${checked ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-50" : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleFactor(factor.id)} className="h-4 w-4 accent-emerald-400" />
                    {factor.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error ? <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm leading-6 text-rose-100">{error}</div> : null}

          <button type="submit" disabled={busy} className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Running models…" : "Run factor analysis"}
          </button>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs leading-5 text-slate-500">
            Source: <code>demo_data/macro_timeseries.csv</code> · Monthly observations · Jan 2021–Dec 2022 · Educational research dataset, not live market data.
          </div>
        </form>

        <div className="space-y-5">
          {!result && !busy ? (
            <div className="flex min-h-[430px] items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
              <div className="max-w-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">No fake dashboard</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Results appear only after a real run.</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">Choose your factors and run the backend model. The cards below will be populated from the actual calculation rather than preset workflow copy.</p>
              </div>
            </div>
          ) : null}

          {busy ? (
            <div className="flex min-h-[430px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <div>
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400" />
                <p className="mt-4 font-semibold text-white">Running OLS, rolling regression, ridge comparison, feature importance, and regime detection…</p>
              </div>
            </div>
          ) : null}

          {result ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="OLS R²" value={pct(result.ols.r_squared)} detail={`${result.ols.sample_size} observations`} />
                <MetricCard label="Adjusted R²" value={pct(result.ols.adjusted_r_squared)} detail="Complexity adjusted" />
                <MetricCard label="Strongest factor" value={strongestFactor?.feature ?? "—"} detail={strongestFactor ? `${pct(strongestFactor.share)} importance share` : "No factor result"} />
                <MetricCard label="Current regime" value={result.regimes.current_regime.replaceAll("_", " ")} detail={latestRolling ? `Latest rolling β ${number(latestRolling.beta)}` : "Rolling window unavailable"} />
              </div>

              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">OLS output</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Factor coefficients</h2>
                  </div>
                  <p className="text-xs text-slate-500">{result.ols.methodology_note}</p>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="pb-3">Factor</th><th className="pb-3">Coefficient</th><th className="pb-3">p-value</th><th className="pb-3">Signal</th></tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {Object.entries(result.ols.coefficients).map(([factor, coefficient]) => {
                        const pValue = result.ols.p_value[factor];
                        return <tr key={factor}><td className="py-3 font-medium text-slate-200">{factor}</td><td className="py-3 text-slate-300">{number(coefficient, 4)}</td><td className="py-3 text-slate-300">{number(pValue, 4)}</td><td className="py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${pValue < 0.05 ? "bg-emerald-400/10 text-emerald-200" : "bg-slate-800 text-slate-400"}`}>{pValue < 0.05 ? "p < 0.05" : "weak evidence"}</span></td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </article>

              <div className="grid gap-5 lg:grid-cols-2">
                <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Relative importance</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Which factors move with the asset?</h2>
                  <div className="mt-4 space-y-4">
                    {result.feature_importance.map((factor) => (
                      <div key={factor.feature}>
                        <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-200">{factor.feature}</span><span className="text-slate-400">{pct(factor.share)} · {factor.direction}</span></div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, factor.share * 100)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Model stability</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Ridge comparison</h2>
                  <div className="mt-4 space-y-3">
                    {result.regularized.models.map((model) => (
                      <div key={model.model} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3"><span className="text-sm font-medium text-slate-200">{model.model}</span><span className="text-sm text-slate-400">R² {pct(model.r_squared)}</span></div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-500">{result.regularized.methodology_note}</p>
                </article>
              </div>

              <article className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Interpretation guardrails</p>
                <p className="mt-3 text-sm leading-6 text-amber-50/90">{result.warnings.correlation_warning}</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">{result.warnings.model_assumptions.map((warning) => <li key={warning}>• {warning}</li>)}</ul>
              </article>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 break-words text-2xl font-bold capitalize text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </article>
  );
}
