"use client";

import { useMemo, useState } from "react";
import { getEventForTurn } from "@/lib/invisible-hands/events";
import { invisibleHandsInitialState } from "@/lib/invisible-hands/initialState";
import { policyById } from "@/lib/invisible-hands/policies";
import { getScorecard, resolveTurn } from "@/lib/invisible-hands/simulation";
import type { Difficulty, EconomyState, GameState, PolicyAction, SectorState } from "@/lib/invisible-hands/types";

type ViewId = "nation" | "micro" | "central-bank" | "markets" | "trade";

const views: Array<{ id: ViewId; label: string }> = [
  { id: "nation", label: "Nation" },
  { id: "micro", label: "Micro / Sectors" },
  { id: "central-bank", label: "Central Bank" },
  { id: "markets", label: "Markets" },
  { id: "trade", label: "Trade / Global" },
];

const centralBankActionIds = ["hold_rate", "hike_rate", "cut_rate", "emergency_liquidity", "hawkish_guidance", "dovish_guidance"];
const tradeActionIds = ["steel_tariff_10", "steel_tariff_25", "steel_import_quota", "negotiate_with_eastport", "reduce_trade_barriers", "export_promotion", "local_content_requirement"];

function formatValue(value: number, suffix = "") {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}${suffix}`;
}

function riskTone(value: number, highIsBad = true) {
  if (highIsBad) {
    if (value >= 70) return "border-red-400/50 bg-red-500/10 text-red-100";
    if (value >= 45) return "border-amber-300/50 bg-amber-400/10 text-amber-100";
    return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  }
  if (value <= 35) return "border-red-400/50 bg-red-500/10 text-red-100";
  if (value <= 55) return "border-amber-300/50 bg-amber-400/10 text-amber-100";
  return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
}

function MetricTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <article className={`rounded-2xl border p-4 shadow-lg shadow-black/20 ${tone ?? "border-cyan-300/15 bg-slate-950/70"}`}>
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 font-mono text-2xl font-black text-white">{value}</p>
      {sub ? <p className="mt-2 text-xs leading-5 text-slate-400">{sub}</p> : null}
    </article>
  );
}

function DifficultyIntro({ onStart }: { onStart: (difficulty: Difficulty) => void }) {
  const [selected, setSelected] = useState<Difficulty>("easy");
  const modes: Array<{ id: Difficulty; title: string; copy: string }> = [
    { id: "easy", title: "Easy", copy: "Explicit advisor hints and likely consequences are visible." },
    { id: "normal", title: "Normal", copy: "Advisor notes include ambiguity and conflicting priorities." },
    { id: "hard", title: "Hard", copy: "Most hints are hidden; govern from raw metrics and terse briefings." },
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),linear-gradient(135deg,#020617,#0f172a_48%,#111827)] p-6 shadow-2xl shadow-black/40 sm:p-8">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-cyan-200">Ballzatram systems simulation</p>
      <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">Invisible Hands: Steel Crisis</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
        Govern Port Meridian through a 12-turn steel import crisis. Balance tariffs, inflation, exporters, voters, central bank credibility, and strategic retaliation from Eastport.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setSelected(mode.id)}
            className={`min-h-32 rounded-2xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-200 ${selected === mode.id ? "border-cyan-200 bg-cyan-300/15" : "border-slate-700 bg-slate-950/70 hover:border-cyan-300/60"}`}
          >
            <span className="font-mono text-lg font-black uppercase text-white">{mode.title}</span>
            <span className="mt-3 block text-sm leading-6 text-slate-300">{mode.copy}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onStart(selected)}
        className="mt-8 min-h-12 rounded-full border border-emerald-200 bg-emerald-300 px-6 py-3 font-bold uppercase tracking-[0.18em] text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      >
        Start Steel Crisis
      </button>
    </section>
  );
}

function NationDashboard({ economy }: { economy: EconomyState }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <MetricTile label="GDP growth" value={formatValue(economy.gdpGrowth, "%")} sub="Real output momentum" tone={riskTone(economy.gdpGrowth, false)} />
      <MetricTile label="Inflation" value={formatValue(economy.inflation, "%")} sub="Consumer price pressure" tone={riskTone(economy.inflation)} />
      <MetricTile label="Unemployment" value={formatValue(economy.unemployment, "%")} sub="Labor-market slack" tone={riskTone(economy.unemployment)} />
      <MetricTile label="Debt / GDP" value={formatValue(economy.debtToGdp, "%")} sub={`Fiscal balance ${formatValue(economy.fiscalBalance, "%")}`} tone={riskTone(economy.debtToGdp)} />
      <MetricTile label="Approval" value={formatValue(economy.approval)} sub="Political survival" tone={riskTone(economy.approval, false)} />
      <MetricTile label="Welfare" value={formatValue(economy.welfare)} sub="Composite household welfare" tone={riskTone(economy.welfare, false)} />
      <MetricTile label="Crisis risk" value={formatValue(economy.crisisRisk)} sub="Tail-risk pressure" tone={riskTone(economy.crisisRisk)} />
      <MetricTile label="CB credibility" value={formatValue(economy.centralBankCredibility)} sub="Power of monetary signals" tone={riskTone(economy.centralBankCredibility, false)} />
      <MetricTile label="Market confidence" value={formatValue(economy.marketConfidence)} sub="Investor trust" tone={riskTone(economy.marketConfidence, false)} />
    </div>
  );
}

function SectorCard({ name, sector }: { name: string; sector: SectorState }) {
  const rows = Object.entries(sector).filter(([, value]) => typeof value === "number");
  return (
    <article className="rounded-2xl border border-slate-700/80 bg-slate-950/75 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black text-white">{name}</h3>
        <span className={`rounded-full border px-3 py-1 font-mono text-xs ${riskTone(sector.stress)}`}>stress {formatValue(sector.stress)}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {rows.map(([key, value]) => (
          <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <dt className="text-xs capitalize text-slate-400">{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd className="mt-1 font-mono text-base font-bold text-slate-100">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function PolicyButton({ policy, difficulty, onChoose, compact = false }: { policy: PolicyAction; difficulty: Difficulty; onChoose: (id: string) => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChoose(policy.id)}
      className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-300/15 focus:outline-none focus:ring-2 focus:ring-cyan-200"
    >
      <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">{policy.category}</span>
      <span className="mt-1 block text-base font-bold text-white">{policy.label}</span>
      {!compact ? <span className="mt-2 block text-sm leading-6 text-slate-300">{policy.description}</span> : null}
      {difficulty !== "hard" ? <span className="mt-3 block rounded-xl border border-amber-200/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">Advisor: {policy.advisorHint[difficulty]}</span> : null}
    </button>
  );
}

function ActiveView({ view, gameState, difficulty, onChoose }: { view: ViewId; gameState: GameState; difficulty: Difficulty; onChoose: (id: string) => void }) {
  const { economy, sectors } = gameState;
  if (view === "micro") {
    return <div className="grid gap-4 lg:grid-cols-2"><SectorCard name="Steel" sector={sectors.steel} /><SectorCard name="Autos" sector={sectors.autos} /><SectorCard name="Agriculture" sector={sectors.agriculture} /><SectorCard name="Consumer Goods" sector={sectors.consumerGoods} /><SectorCard name="Banking" sector={sectors.banking} /></div>;
  }
  if (view === "central-bank") {
    return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><MetricTile label="Policy rate" value={formatValue(economy.policyRate, "%")} /><MetricTile label="Inflation expectations" value={formatValue(economy.inflationExpectations, "%")} tone={riskTone(economy.inflationExpectations)} /><MetricTile label="Unemployment pressure" value={formatValue(economy.unemployment, "%")} tone={riskTone(economy.unemployment)} /><MetricTile label="Currency index" value={formatValue(economy.currencyIndex)} tone={riskTone(economy.currencyIndex, false)} /><MetricTile label="Bank stress" value={formatValue(economy.bankStress)} tone={riskTone(economy.bankStress)} /><MetricTile label="Credibility" value={formatValue(economy.centralBankCredibility)} tone={riskTone(economy.centralBankCredibility, false)} /></div><ActionStrip actionIds={centralBankActionIds} difficulty={difficulty} onChoose={onChoose} /></div>;
  }
  if (view === "markets") {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><MetricTile label="Bond yield" value={formatValue(economy.bondYield, "%")} tone={riskTone(economy.bondYield)} /><MetricTile label="Equity index" value={formatValue(economy.equityIndex)} tone={riskTone(economy.equityIndex, false)} /><MetricTile label="Currency index" value={formatValue(economy.currencyIndex)} tone={riskTone(economy.currencyIndex, false)} /><MetricTile label="Commodity pressure" value={formatValue(economy.commodityPressure)} tone={riskTone(economy.commodityPressure)} /><MetricTile label="Bank stress" value={formatValue(economy.bankStress)} tone={riskTone(economy.bankStress)} /><MetricTile label="Market confidence" value={formatValue(economy.marketConfidence)} tone={riskTone(economy.marketConfidence, false)} /></div>;
  }
  if (view === "trade") {
    return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><MetricTile label="Eastport relationship" value={formatValue(economy.eastportRelationship)} tone={riskTone(economy.eastportRelationship, false)} /><MetricTile label="Tariff level" value={formatValue(economy.tariffLevel, "%")} tone={riskTone(economy.tariffLevel)} /><MetricTile label="Retaliation risk" value={formatValue(economy.retaliationRisk)} tone={riskTone(economy.retaliationRisk)} /><MetricTile label="Export access" value={formatValue(economy.exportAccess)} tone={riskTone(economy.exportAccess, false)} /><MetricTile label="Trade balance" value={formatValue(economy.tradeBalance, "% GDP")} /><MetricTile label="Supply-chain stress" value={formatValue(economy.supplyChainStress)} tone={riskTone(economy.supplyChainStress)} /></div><ActionStrip actionIds={tradeActionIds} difficulty={difficulty} onChoose={onChoose} /></div>;
  }
  return <NationDashboard economy={economy} />;
}

function ActionStrip({ actionIds, difficulty, onChoose }: { actionIds: string[]; difficulty: Difficulty; onChoose: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
      <h3 className="font-mono text-sm font-bold uppercase tracking-[0.22em] text-slate-300">Available from this console</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actionIds.map((id) => <PolicyButton key={id} policy={policyById[id]} difficulty={difficulty} onChoose={onChoose} compact />)}
      </div>
    </div>
  );
}

function Scorecard({ gameState, onReplay }: { gameState: GameState; onReplay: () => void }) {
  const score = getScorecard(gameState);
  return (
    <section className="space-y-5 rounded-3xl border border-emerald-300/25 bg-slate-950/90 p-6 shadow-2xl shadow-black/40">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-emerald-200">Final scorecard</p>
      <h2 className="text-4xl font-black text-white">{score.survivalRating}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricTile label="Welfare" value={String(score.welfareScore)} tone={riskTone(score.welfareScore, false)} />
        <MetricTile label="Political survival" value={String(score.politicalSurvivalScore)} tone={riskTone(score.politicalSurvivalScore, false)} />
        <MetricTile label="Macro stability" value={String(score.macroStabilityScore)} tone={riskTone(score.macroStabilityScore, false)} />
        <MetricTile label="Trade stability" value={String(score.tradeStabilityScore)} tone={riskTone(score.tradeStabilityScore, false)} />
        <MetricTile label="Market credibility" value={String(score.marketCredibilityScore)} tone={riskTone(score.marketCredibilityScore, false)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <DebriefList title="Best decisions" items={score.bestDecisions.length ? score.bestDecisions : ["No standout stabilizer recorded"]} />
        <DebriefList title="Worst decisions" items={score.worstDecisions.length ? score.worstDecisions : ["No severe policy spiral recorded"]} />
        <DebriefList title="Frameworks encountered" items={score.frameworksEncountered} />
      </div>
      <button type="button" onClick={onReplay} className="rounded-full border border-emerald-200 bg-emerald-300 px-5 py-3 font-bold uppercase tracking-[0.18em] text-slate-950">Replay Steel Crisis</button>
    </section>
  );
}

function DebriefList({ title, items }: { title: string; items: string[] }) {
  return <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><h3 className="font-bold text-white">{title}</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">{items.map((item) => <li key={item}>▸ {item}</li>)}</ul></article>;
}

export function InvisibleHandsPage() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [gameState, setGameState] = useState<GameState>(invisibleHandsInitialState);
  const [activeView, setActiveView] = useState<ViewId>("nation");
  const currentEvent = useMemo(() => getEventForTurn(Math.min(gameState.economy.turn, gameState.economy.maxTurns)), [gameState.economy.turn, gameState.economy.maxTurns]);
  const finished = gameState.economy.turn > gameState.economy.maxTurns;

  function start(mode: Difficulty) {
    setDifficulty(mode);
    setGameState(JSON.parse(JSON.stringify(invisibleHandsInitialState)) as GameState);
    setActiveView("nation");
  }

  function chooseAction(actionId: string) {
    if (!finished) setGameState((state) => resolveTurn(state, actionId));
  }

  if (!difficulty) return <DifficultyIntro onStart={start} />;

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-cyan-300/20 bg-[linear-gradient(135deg,#020617,#0f172a_55%,#052e2b)] p-5 shadow-2xl shadow-black/30 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.32em] text-cyan-200">Invisible Hands · Port Meridian</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">Steel Crisis</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Turn {Math.min(gameState.economy.turn, gameState.economy.maxTurns)} of {gameState.economy.maxTurns}. Difficulty: <span className="font-bold text-emerald-200">{difficulty}</span>.</p>
          </div>
          <button type="button" onClick={() => setDifficulty(null)} className="w-fit rounded-full border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200 hover:border-cyan-200">Change difficulty</button>
        </div>
      </div>

      {finished ? <Scorecard gameState={gameState} onReplay={() => start(difficulty)} /> : (
        <>
          <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-3xl border border-amber-300/25 bg-amber-300/10 p-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-amber-100">Current event</p>
              <h2 className="mt-3 text-2xl font-black text-white">{currentEvent.title}</h2>
              <p className="mt-3 text-sm leading-6 text-amber-50/90">{currentEvent.description}</p>
              {difficulty !== "hard" ? <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-200">Framework note: {currentEvent.educationalNote}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">{currentEvent.frameworkTags.map((tag) => <span key={tag} className="rounded-full border border-amber-200/25 px-3 py-1 text-xs text-amber-100">{tag}</span>)}</div>
            </article>
            <article className="rounded-3xl border border-cyan-300/20 bg-slate-900/80 p-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">Policy room</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {currentEvent.availablePolicyActionIds.map((id) => <PolicyButton key={id} policy={policyById[id]} difficulty={difficulty} onChoose={chooseAction} />)}
              </div>
            </article>
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-900/70 p-4 sm:p-5">
            <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Invisible Hands views">
              {views.map((view) => (
                <button key={view.id} type="button" onClick={() => setActiveView(view.id)} className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${activeView === view.id ? "border-cyan-200 bg-cyan-300 text-slate-950" : "border-slate-600 text-slate-200 hover:border-cyan-200"}`}>{view.label}</button>
              ))}
            </div>
            <div className="mt-4"><ActiveView view={activeView} gameState={gameState} difficulty={difficulty} onChoose={chooseAction} /></div>
          </section>
        </>
      )}

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
          <h2 className="font-mono text-sm font-black uppercase tracking-[0.25em] text-slate-300">Last debrief</h2>
          {gameState.log[0] ? <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300"><p><span className="font-bold text-white">Turn {gameState.log[0].turn}:</span> {gameState.log[0].actionLabel}</p><p>{gameState.log[0].explanation}</p>{gameState.log[0].delayedEffectsApplied.length ? <p className="text-emerald-200">Delayed effects appeared: {gameState.log[0].delayedEffectsApplied.join(", ")}</p> : null}</div> : <p className="mt-4 text-sm text-slate-400">Choose a policy to generate the first framework debrief.</p>}
        </article>
        <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
          <h2 className="font-mono text-sm font-black uppercase tracking-[0.25em] text-slate-300">Agent responses</h2>
          <div className="mt-4 space-y-3">
            {gameState.log[0]?.agentResponses.length ? gameState.log[0].agentResponses.map((response, index) => <div key={`${response.agent}-${index}`} className={`rounded-2xl border p-3 text-sm leading-6 ${response.tone === "positive" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-50" : response.tone === "negative" ? "border-red-300/25 bg-red-400/10 text-red-50" : "border-slate-600 bg-slate-950 text-slate-200"}`}><span className="font-bold">{response.agent}:</span> {response.message}</div>) : <p className="text-sm text-slate-400">Agents will react after each action.</p>}
          </div>
        </article>
      </section>
    </section>
  );
}
