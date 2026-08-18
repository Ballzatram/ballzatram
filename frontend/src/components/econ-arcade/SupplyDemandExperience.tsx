"use client";

import { useMemo, useState } from "react";
import { SupplyDemandLab } from "./SupplyDemandLab";
import { applyMarketAction, createInitialMarketState, marketActions, supplyDemandScenarios, type MarketActionId, type MarketScenario } from "@/lib/econ-arcade/supplyDemand";
import { recordEconProgress, type MasteryTier } from "@/lib/econ-arcade/progress";

type Direction = "up" | "down";
type Challenge = { id: string; title: string; brief: string; target: string; maxMoves: number; allowed: MarketActionId[]; success: (state: ReturnType<typeof createInitialMarketState>, baseline: ReturnType<typeof createInitialMarketState>) => boolean };

const challenges: Challenge[] = [
  { id: "abundance", title: "Make it cheaper without a shortage", brief: "Increase quantity while lowering price. Do not use a price ceiling.", target: "Price below baseline + quantity above baseline + balanced market", maxMoves: 2, allowed: ["demand-up","demand-down","supply-up","supply-down","tax"], success: (s,b)=>s.price < b.price && s.quantity > b.quantity && s.shortageSurplus === "Balanced" },
  { id: "ceiling-diagnosis", title: "Expose the ceiling tradeoff", brief: "Create a shortage with a binding price ceiling and identify the welfare cost.", target: "Shortage + positive deadweight loss", maxMoves: 1, allowed: ["price-ceiling","price-floor","tax"], success: (s)=>s.shortageSurplus === "Shortage" && s.deadweightLoss > 0 },
  { id: "stabilize", title: "Restore a stressed market", brief: "Start after a negative supply shock, then restore quantity and stability without a binding control.", target: "Improve stability and quantity after the setup shock", maxMoves: 1, allowed: ["supply-up","demand-down","price-ceiling","price-floor","tax"], success: (s,b)=>s.marketStability > b.marketStability && s.quantity > b.quantity },
];

const tiers: Array<{ id: MasteryTier; label: string; rule: string }> = [
  { id: "bronze", label: "Bronze", rule: "One extra move. Predict at least one market direction before acting." },
  { id: "silver", label: "Silver", rule: "Base move budget. Predict both price and quantity directions." },
  { id: "gold", label: "Gold", rule: "Tightest move budget. Both predictions must be correct on every move." },
];

export function SupplyDemandExperience() {
  const [mode, setMode] = useState<"challenge"|"sandbox">("challenge");
  return <section className="space-y-4">
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
      <button onClick={()=>setMode("challenge")} className={`rounded-full px-4 py-2 text-sm font-bold ${mode==="challenge"?"bg-emerald-300 text-slate-950":"border border-slate-700 text-slate-300"}`}>Challenge Mode</button>
      <button onClick={()=>setMode("sandbox")} className={`rounded-full px-4 py-2 text-sm font-bold ${mode==="sandbox"?"bg-cyan-300 text-slate-950":"border border-slate-700 text-slate-300"}`}>Free-play Sandbox</button>
      <p className="ml-auto self-center text-xs text-slate-500">Predict → act → compare → master</p>
    </div>
    {mode === "sandbox" ? <SupplyDemandLab /> : <ChallengeLab />}
  </section>;
}

function ChallengeLab() {
  const [scenarioId, setScenarioId] = useState(supplyDemandScenarios[0].id);
  const scenario = useMemo<MarketScenario>(()=>supplyDemandScenarios.find(s=>s.id===scenarioId) ?? supplyDemandScenarios[0],[scenarioId]);
  const [challengeId, setChallengeId] = useState(challenges[0].id);
  const challenge = challenges.find(c=>c.id===challengeId) ?? challenges[0];
  const [tier, setTier] = useState<MasteryTier>("bronze");
  const initialFor = (c: Challenge, sc: MarketScenario) => c.id === "stabilize" ? applyMarketAction(createInitialMarketState(sc), sc, "supply-down") : createInitialMarketState(sc);
  const [baseline, setBaseline] = useState(()=>initialFor(challenge, scenario));
  const [market, setMarket] = useState(()=>initialFor(challenge, scenario));
  const [moves, setMoves] = useState(0);
  const [pricePrediction, setPricePrediction] = useState<Direction>();
  const [quantityPrediction, setQuantityPrediction] = useState<Direction>();
  const [correctPredictions, setCorrectPredictions] = useState(0);
  const [predictionChecks, setPredictionChecks] = useState(0);
  const [goldPerfect, setGoldPerfect] = useState(true);
  const [complete, setComplete] = useState(false);
  const [attemptRecorded, setAttemptRecorded] = useState(false);

  const moveBudget = Math.max(1, challenge.maxMoves + (tier === "bronze" ? 1 : tier === "gold" ? -1 : 0));
  const predictionsReady = tier === "bronze" ? Boolean(pricePrediction || quantityPrediction) : Boolean(pricePrediction && quantityPrediction);

  function reset(nextChallenge = challenge, nextScenario = scenario, nextTier = tier) {
    const start = initialFor(nextChallenge, nextScenario);
    setBaseline(start); setMarket(start); setMoves(0); setPricePrediction(undefined); setQuantityPrediction(undefined); setCorrectPredictions(0); setPredictionChecks(0); setGoldPerfect(true); setComplete(false); setAttemptRecorded(false); setTier(nextTier);
  }
  function pickChallenge(id:string){ const next=challenges.find(c=>c.id===id)??challenges[0]; setChallengeId(next.id); reset(next,scenario); }
  function pickScenario(id:string){ const next=supplyDemandScenarios.find(s=>s.id===id)??supplyDemandScenarios[0]; setScenarioId(next.id); reset(challenge,next); }
  function pickTier(next: MasteryTier){ reset(challenge, scenario, next); }

  function run(actionId:MarketActionId){
    if (!predictionsReady || complete) return;
    if (!attemptRecorded) {
      recordEconProgress("supply-demand-lab", { outcome: `${challenge.title} · ${tier}`, concepts: ["equilibrium","supply and demand","welfare"], countAttempt: true });
      setAttemptRecorded(true);
    }
    const before = market;
    const next = applyMarketAction(market,scenario,actionId);
    const actualPrice: Direction = next.price >= before.price ? "up" : "down";
    const actualQuantity: Direction = next.quantity >= before.quantity ? "up" : "down";
    const checks = [pricePrediction ? pricePrediction === actualPrice : null, quantityPrediction ? quantityPrediction === actualQuantity : null].filter((x): x is boolean => x !== null);
    const correct = checks.filter(Boolean).length;
    const allCorrect = checks.length > 0 && correct === checks.length;
    setCorrectPredictions(value=>value+correct); setPredictionChecks(value=>value+checks.length); if (!allCorrect) setGoldPerfect(false);
    const nextMoves=moves+1; setMarket(next); setMoves(nextMoves); setPricePrediction(undefined); setQuantityPrediction(undefined);
    if (challenge.success(next,baseline) || nextMoves >= moveBudget) setComplete(true);
  }

  const objectiveSuccess = complete && challenge.success(market,baseline);
  const accuracy = predictionChecks ? correctPredictions / predictionChecks : 0;
  const tierSuccess = objectiveSuccess && (tier !== "gold" || (goldPerfect && accuracy === 1));
  const efficiency = Math.max(0, (moveBudget - moves + 1) / moveBudget);
  const score = complete ? Math.round((objectiveSuccess ? 50 : 0) + accuracy * 30 + efficiency * 20) : 0;
  const welfareBaseline = baseline.consumerSurplus + baseline.producerSurplus;
  const welfareNow = market.consumerSurplus + market.producerSurplus;

  const achievements = complete && objectiveSuccess ? [
    ...(accuracy === 1 ? ["Market Whisperer"] : []),
    ...(moves === 1 ? ["One-Move Economist"] : []),
    ...(market.deadweightLoss === 0 && challenge.id !== "ceiling-diagnosis" ? ["Welfare Defender"] : []),
    ...(challenge.id === "ceiling-diagnosis" ? ["Price Control Detective"] : []),
  ] : [];

  function saveMastery() {
    recordEconProgress("supply-demand-lab", {
      completed: tierSuccess,
      score,
      outcome: tierSuccess ? `${challenge.title} · ${tier.toUpperCase()} mastered` : `${challenge.title} · ${tier.toUpperCase()} attempted`,
      concepts: ["equilibrium","supply and demand","surplus","deadweight loss","price controls"],
      achievements,
      masteryTier: tierSuccess ? tier : undefined,
      mastery: { [`${challenge.id}Tier`]: tierSuccess ? tier : "attempted", [`${challenge.id}Score`]: score },
      countAttempt: false,
    });
  }

  return <section className="space-y-5">
    <header className="rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-6"><p className="text-xs font-bold uppercase tracking-[.3em] text-emerald-300">Econ Arcade · Market Mastery</p><h1 className="mt-2 text-4xl font-black text-white">Supply & Demand Challenge Lab</h1><p className="mt-3 max-w-3xl text-slate-300">Solve the market, then prove you understand why it moved. Higher tiers tighten the move budget and prediction requirements.</p></header>
    <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <aside className="space-y-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><label className="text-xs font-bold uppercase text-slate-400">Challenge<select value={challengeId} onChange={e=>pickChallenge(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">{challenges.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label className="mt-4 block text-xs font-bold uppercase text-slate-400">Market<select value={scenarioId} onChange={e=>pickScenario(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">{supplyDemandScenarios.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><h2 className="mt-5 text-xl font-bold text-white">{challenge.title}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{challenge.brief}</p><p className="mt-3 rounded-xl bg-emerald-300/10 p-3 text-sm text-emerald-100"><strong>Win:</strong> {challenge.target}</p></article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-bold uppercase text-amber-200">Mastery tier</p><div className="mt-3 space-y-2">{tiers.map(t=><button key={t.id} onClick={()=>pickTier(t.id)} className={`w-full rounded-xl border p-3 text-left ${tier===t.id?"border-amber-300 bg-amber-300/10":"border-slate-700"}`}><strong className="text-white">{t.label}</strong><span className="mt-1 block text-xs text-slate-400">{t.rule}</span></button>)}</div><p className="mt-3 text-xs text-slate-500">Move budget: {moves}/{moveBudget}</p></article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-bold uppercase text-cyan-300">Predict before acting</p><p className="mt-2 text-xs text-slate-500">Bronze needs one direction. Silver/Gold require both.</p><div className="mt-3 grid grid-cols-2 gap-2"><PredictionPair label="Price" value={pricePrediction} set={setPricePrediction}/><PredictionPair label="Quantity" value={quantityPrediction} set={setQuantityPrediction}/></div><p className="mt-3 text-xs text-slate-400">Accuracy: {predictionChecks ? `${Math.round(accuracy*100)}%` : "—"}</p></article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-bold uppercase text-cyan-300">Available moves</p><div className="mt-3 space-y-2">{marketActions.filter(a=>challenge.allowed.includes(a.id)).map(a=><button key={a.id} disabled={!predictionsReady||complete} onClick={()=>run(a.id)} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-left disabled:opacity-40"><span className="font-semibold text-white">{a.label}</span><span className="mt-1 block text-xs text-slate-400">{a.normalHint}</span></button>)}</div></article>
      </aside>
      <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Price" value={`$${market.price}`} delta={market.price-baseline.price}/><Metric label="Quantity" value={`${market.quantity}`} delta={market.quantity-baseline.quantity}/><Metric label="Stability" value={`${market.marketStability}/100`} delta={market.marketStability-baseline.marketStability}/><Metric label="DWL" value={`$${market.deadweightLoss}`} delta={market.deadweightLoss-baseline.deadweightLoss}/></div><article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-bold text-white">Baseline vs current</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Compare label="Consumer surplus" before={baseline.consumerSurplus} after={market.consumerSurplus}/><Compare label="Producer surplus" before={baseline.producerSurplus} after={market.producerSurplus}/><Compare label="Total private surplus" before={welfareBaseline} after={welfareNow}/><Compare label="Market balance" before={baseline.gap} after={market.gap}/></div><p className="mt-4 text-sm leading-6 text-slate-300">{market.explanation}</p></article>{complete?<article className={`rounded-2xl border p-6 ${tierSuccess?"border-emerald-300/40 bg-emerald-300/10":"border-rose-300/30 bg-rose-300/10"}`}><p className="text-xs font-bold uppercase tracking-[.2em]">Mastery debrief</p><h2 className="mt-2 text-2xl font-black text-white">{tierSuccess?`${tier.toUpperCase()} mastery earned`:objectiveSuccess?"Objective solved, mastery condition missed":"Move budget exhausted"}</h2><p className="mt-3 text-sm text-slate-200">Score {score}/100 · prediction accuracy {Math.round(accuracy*100)}% · {moves} move{moves===1?'':'s'}.</p>{achievements.length?<p className="mt-2 text-sm text-amber-100">Achievements: {achievements.join(" · ")}</p>:null}<div className="mt-4 flex gap-2"><button onClick={saveMastery} className="rounded-xl bg-emerald-300 px-4 py-2 font-bold text-slate-950">Save result</button><button onClick={()=>reset()} className="rounded-xl border border-white/20 px-4 py-2 font-bold text-white">Replay</button></div></article>:null}</div>
    </div>
  </section>;
}

function PredictionPair({label,value,set}:{label:string;value?:Direction;set:(v:Direction)=>void}){return <div className="rounded-xl border border-slate-700 p-2"><p className="mb-2 text-xs font-bold text-slate-300">{label}</p><div className="grid grid-cols-2 gap-1"><button onClick={()=>set("up")} className={`rounded p-2 text-xs ${value==="up"?"bg-cyan-300 text-slate-950":"bg-slate-950 text-slate-300"}`}>↑</button><button onClick={()=>set("down")} className={`rounded p-2 text-xs ${value==="down"?"bg-cyan-300 text-slate-950":"bg-slate-950 text-slate-300"}`}>↓</button></div></div>}
function Metric({label,value,delta}:{label:string;value:string;delta:number}){return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p><p className="mt-1 text-xs text-slate-400">Δ {delta>0?'+':''}{delta.toFixed(1)}</p></article>}
function Compare({label,before,after}:{label:string;before:number;after:number}){return <div className="rounded-xl bg-slate-950/60 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-200">{before.toFixed(1)} → <strong>{after.toFixed(1)}</strong></p></div>}
