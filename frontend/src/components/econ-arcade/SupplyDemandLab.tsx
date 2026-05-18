"use client";

import { useMemo, useState } from "react";
import {
  applyMarketAction,
  createInitialMarketState,
  marketActions,
  supplyDemandScenarios,
  type DifficultyMode,
  type MarketAction,
  type MarketScenario,
} from "@/lib/econ-arcade/supplyDemand";

const difficultyModes: Array<{ id: DifficultyMode; label: string; copy: string }> = [
  { id: "easy", label: "Easy", copy: "Explicit hints and likely consequences." },
  { id: "normal", label: "Normal", copy: "Partial hints with some ambiguity." },
  { id: "hard", label: "Hard", copy: "Raw metrics and terse feedback." },
];

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
}

function actionHint(action: MarketAction, difficulty: DifficultyMode) {
  if (difficulty === "easy") return action.hint;
  if (difficulty === "normal") return action.normalHint;
  return action.hardHint;
}

function MetricCard({ label, value, sub, tone = "border-slate-800 bg-slate-900" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <article className={`rounded-2xl border p-4 shadow-lg shadow-black/20 ${tone}`}>
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 font-mono text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{sub}</p>
    </article>
  );
}

function MarketMovement({ history }: { history: Array<{ label: string; price: number; quantity: number }> }) {
  const maxPrice = Math.max(...history.map((item) => item.price), 1);
  const maxQuantity = Math.max(...history.map((item) => item.quantity), 1);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-white">Market movement console</h3>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">Last 6 moves</span>
      </div>
      <div className="mt-5 space-y-4">
        {history.map((item, index) => (
          <div key={`${item.label}-${index}`} className="grid gap-2 sm:grid-cols-[5rem_1fr] sm:items-center">
            <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-emerald-200">Price</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.max(8, (item.price / maxPrice) * 100)}%` }} />
                </div>
                <span className="w-16 text-right font-mono text-xs text-slate-300">{formatMoney(item.price)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-cyan-200">Qty</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(8, (item.quantity / maxQuantity) * 100)}%` }} />
                </div>
                <span className="w-16 text-right font-mono text-xs text-slate-300">{item.quantity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupplyDemandLab() {
  const [scenarioId, setScenarioId] = useState(supplyDemandScenarios[0].id);
  const scenario = useMemo<MarketScenario>(() => supplyDemandScenarios.find((item) => item.id === scenarioId) ?? supplyDemandScenarios[0], [scenarioId]);
  const [difficulty, setDifficulty] = useState<DifficultyMode>("easy");
  const [market, setMarket] = useState(() => createInitialMarketState(scenario));

  function chooseScenario(nextScenarioId: string) {
    const nextScenario = supplyDemandScenarios.find((item) => item.id === nextScenarioId) ?? supplyDemandScenarios[0];
    setScenarioId(nextScenario.id);
    setMarket(createInitialMarketState(nextScenario));
  }

  function runAction(actionId: Parameters<typeof applyMarketAction>[2]) {
    setMarket((current) => applyMarketAction(current, scenario, actionId));
  }

  const statusTone = market.shortageSurplus === "Balanced" ? "border-emerald-300/30 bg-emerald-400/10" : market.shortageSurplus === "Shortage" ? "border-red-400/40 bg-red-500/10" : "border-amber-300/40 bg-amber-400/10";

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_34%),linear-gradient(135deg,#020617,#0f172a_50%,#132317)] p-5 shadow-2xl shadow-black/40 sm:p-8">
        <p className="font-mono text-xs font-black uppercase tracking-[0.35em] text-emerald-300">Econ Arcade // Phase 1</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Supply & Demand Lab</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
              Run a tiny market. Push demand, supply, and policy levers. Watch equilibrium price, quantity, surplus, deadweight loss, and stability respond.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <label htmlFor="scenario" className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Market scenario</label>
            <select
              id="scenario"
              value={scenarioId}
              onChange={(event) => chooseScenario(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {supplyDemandScenarios.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="space-y-5">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Scenario panel</p>
            <h2 className="mt-3 text-2xl font-black text-white">{scenario.title}</h2>
            <p className="mt-2 font-mono text-sm text-emerald-200">{scenario.market}</p>
            <p className="mt-4 text-sm leading-6 text-slate-300">{scenario.brief}</p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Difficulty</p>
            <div className="mt-4 grid gap-3">
              {difficultyModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setDifficulty(mode.id)}
                  className={`rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-200 ${difficulty === mode.id ? "border-cyan-200 bg-cyan-300/15" : "border-slate-700 bg-slate-950/70 hover:border-cyan-300/60"}`}
                >
                  <span className="font-mono text-sm font-black uppercase text-white">{mode.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{mode.copy}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Action deck</p>
              <button type="button" onClick={() => runAction("reset")} className="rounded-full border border-amber-300/50 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-100 hover:bg-amber-300 hover:text-slate-950">Reset</button>
            </div>
            <div className="mt-4 grid gap-3">
              {marketActions.filter((action) => action.id !== "reset").map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => runAction(action.id)}
                  className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-left transition hover:border-emerald-300/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-bold text-white">{action.label}</span>
                    <span className="rounded-full border border-slate-600 px-2 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-slate-400">{action.category}</span>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-slate-400">{actionHint(action, difficulty)}</span>
                </button>
              ))}
            </div>
          </article>
        </aside>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Equilibrium price" value={formatMoney(market.price)} sub="Current market-clearing or controlled price" tone="border-emerald-300/20 bg-emerald-400/10" />
            <MetricCard label="Equilibrium quantity" value={`${market.quantity} units`} sub="Units traded after the latest move" tone="border-cyan-300/20 bg-cyan-400/10" />
            <MetricCard label="Shortage / surplus" value={market.shortageSurplus} sub={market.gap ? `${market.gap} unit gap` : "No excess demand or supply"} tone={statusTone} />
            <MetricCard label="Consumer surplus" value={formatMoney(market.consumerSurplus)} sub="Simplified buyer value above price" />
            <MetricCard label="Producer surplus" value={formatMoney(market.producerSurplus)} sub="Simplified seller value above cost" />
            <MetricCard label="Deadweight loss" value={formatMoney(market.deadweightLoss)} sub="Lost gains from trades that no longer happen" tone={market.deadweightLoss > 0 ? "border-red-400/30 bg-red-500/10" : undefined} />
            <MetricCard label="Market stability" value={`${market.marketStability}/100`} sub="Falls with shocks, gaps, and deadweight loss" tone={market.marketStability > 70 ? "border-emerald-300/20 bg-emerald-400/10" : "border-amber-300/30 bg-amber-400/10"} />
            <MetricCard label="Demand index" value={`${market.demandIndex}`} sub="100 is scenario baseline" />
            <MetricCard label="Supply index" value={`${market.supplyIndex}`} sub="100 is scenario baseline" />
          </div>

          <article className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">Debrief loop</p>
            <h2 className="mt-3 text-2xl font-black text-white">What happened?</h2>
            <p className="mt-3 text-base leading-7 text-slate-200">{difficulty === "hard" ? market.explanation.split(":")[0] : market.explanation}</p>
            {difficulty === "easy" ? (
              <p className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
                Easy mode readout: compare this move to the baseline. Demand shocks move price and quantity in the same direction; supply shocks move price and quantity in opposite directions; binding controls and taxes reduce efficient trades.
              </p>
            ) : null}
          </article>

          <MarketMovement history={market.history} />
        </div>
      </div>
    </section>
  );
}
