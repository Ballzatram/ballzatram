"use client";

import { useMemo, useState } from "react";
import { SupplyDemandLab } from "./SupplyDemandLab";
import { applyMarketAction, createInitialMarketState, marketActions, supplyDemandScenarios, type MarketActionId, type MarketScenario } from "@/lib/econ-arcade/supplyDemand";

type Prediction = "price-up" | "price-down" | "quantity-up" | "quantity-down";
type Challenge = { id: string; title: string; brief: string; target: string; maxMoves: number; allowed: MarketActionId[]; success: (state: ReturnType<typeof createInitialMarketState>, baseline: ReturnType<typeof createInitialMarketState>) => boolean };

const challenges: Challenge[] = [
  { id: "abundance", title: "Make it cheaper without a shortage", brief: "Increase the quantity traded while lowering the market price. Do not use a price ceiling.", target: "Price below baseline + quantity above baseline + balanced market", maxMoves: 2, allowed: ["demand-up","demand-down","supply-up","supply-down","tax"], success: (s,b)=>s.price < b.price && s.quantity > b.quantity && s.shortageSurplus === "Balanced" },
  { id: "ceiling-diagnosis", title: "Expose the ceiling tradeoff", brief: "Create a shortage with a binding price ceiling, then explain what happened through your prediction and the welfare readout.", target: "Shortage + positive deadweight loss", maxMoves: 1, allowed: ["price-ceiling","price-floor","tax"], success: (s)=>s.shortageSurplus === "Shortage" && s.deadweightLoss > 0 },
  { id: "stabilize", title: "Restore a stressed market", brief: "Start with a negative supply shock, then use one move to improve stability and quantity without imposing a binding control.", target: "Improve stability and quantity after the setup shock", maxMoves: 1, allowed: ["supply-up","demand-down","price-ceiling","price-floor","tax"], success: (s,b)=>s.marketStability > b.marketStability && s.quantity > b.quantity },
];

export function SupplyDemandExperience() {
  const [mode, setMode] = useState<"challenge"|"sandbox">("challenge");
  return <section className="space-y-4">
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
      <button onClick={()=>setMode("challenge")} className={`rounded-full px-4 py-2 text-sm font-bold ${mode==="challenge"?"bg-emerald-300 text-slate-950":"border border-slate-700 text-slate-300"}`}>Challenge Mode</button>
      <button onClick={()=>setMode("sandbox")} className={`rounded-full px-4 py-2 text-sm font-bold ${mode==="sandbox"?"bg-cyan-300 text-slate-950":"border border-slate-700 text-slate-300"}`}>Free-play Sandbox</button>
      <p className="ml-auto self-center text-xs text-slate-500">Predict → act → compare → debrief</p>
    </div>
    {mode === "sandbox" ? <SupplyDemandLab /> : <ChallengeLab />}
  </section>;
}

function ChallengeLab() {
  const [scenarioId, setScenarioId] = useState(supplyDemandScenarios[0].id);
  const scenario = useMemo<MarketScenario>(()=>supplyDemandScenarios.find(s=>s.id===scenarioId) ?? supplyDemandScenarios[0],[scenarioId]);
  const [challengeId, setChallengeId] = useState(challenges[0].id);
  const challenge = challenges.find(c=>c.id===challengeId) ?? challenges[0];
  const initialFor = (c: Challenge, sc: MarketScenario) => c.id === "stabilize" ? applyMarketAction(createInitialMarketState(sc), sc, "supply-down") : createInitialMarketState(sc);
  const [baseline, setBaseline] = useState(()=>initialFor(challenge, scenario));
  const [market, setMarket] = useState(()=>initialFor(challenge, scenario));
  const [moves, setMoves] = useState(0);
  const [prediction, setPrediction] = useState<Prediction>();
  const [lastPredictionCorrect, setLastPredictionCorrect] = useState<boolean|null>(null);
  const [complete, setComplete] = useState(false);

  function reset(nextChallenge = challenge, nextScenario = scenario) {
    const start = initialFor(nextChallenge, nextScenario);
    setBaseline(start); setMarket(start); setMoves(0); setPrediction(undefined); setLastPredictionCorrect(null); setComplete(false);
  }
  function pickChallenge(id:string){ const next=challenges.find(c=>c.id===id)??challenges[0]; setChallengeId(next.id); reset(next,scenario); }
  function pickScenario(id:string){ const next=supplyDemandScenarios.find(s=>s.id===id)??supplyDemandScenarios[0]; setScenarioId(next.id); reset(challenge,next); }
  function run(actionId:MarketActionId){
    if (!prediction || complete) return;
    const before = market;
    const next = applyMarketAction(market,scenario,actionId);
    const priceDirection = next.price > before.price ? "price-up" : "price-down";
    const quantityDirection = next.quantity > before.quantity ? "quantity-up" : "quantity-down";
    setLastPredictionCorrect(prediction===priceDirection || prediction===quantityDirection);
    const nextMoves=moves+1; setMarket(next); setMoves(nextMoves); setPrediction(undefined);
    if (challenge.success(next,baseline) || nextMoves >= challenge.maxMoves) setComplete(true);
  }
  const success = complete && challenge.success(market,baseline);
  const welfareBaseline = baseline.consumerSurplus + baseline.producerSurplus;
  const welfareNow = market.consumerSurplus + market.producerSurplus;

  return <section className="space-y-5">
    <header className="rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-6"><p className="text-xs font-bold uppercase tracking-[.3em] text-emerald-300">Econ Arcade · Market Challenge</p><h1 className="mt-2 text-4xl font-black text-white">Supply & Demand Challenge Lab</h1><p className="mt-3 max-w-3xl text-slate-300">You do not get credit for clicking until something looks good. Predict the direction first, then solve an economic objective inside a limited move budget.</p></header>
    <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <aside className="space-y-4"><article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><label className="text-xs font-bold uppercase text-slate-400">Challenge<select value={challengeId} onChange={e=>pickChallenge(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">{challenges.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label className="mt-4 block text-xs font-bold uppercase text-slate-400">Market<select value={scenarioId} onChange={e=>pickScenario(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">{supplyDemandScenarios.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><h2 className="mt-5 text-xl font-bold text-white">{challenge.title}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{challenge.brief}</p><p className="mt-3 rounded-xl bg-emerald-300/10 p-3 text-sm text-emerald-100"><strong>Win condition:</strong> {challenge.target}</p><p className="mt-2 text-xs text-slate-500">Moves: {moves}/{challenge.maxMoves}</p></article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-bold uppercase text-cyan-300">Predict before acting</p><div className="mt-3 grid grid-cols-2 gap-2">{([['price-up','Price ↑'],['price-down','Price ↓'],['quantity-up','Quantity ↑'],['quantity-down','Quantity ↓']] as [Prediction,string][]).map(([id,label])=><button key={id} onClick={()=>setPrediction(id)} className={`rounded-xl border p-3 text-sm font-bold ${prediction===id?"border-cyan-200 bg-cyan-300/15 text-cyan-50":"border-slate-700 text-slate-300"}`}>{label}</button>)}</div>{lastPredictionCorrect!=null?<p className={`mt-3 text-sm ${lastPredictionCorrect?"text-emerald-300":"text-amber-200"}`}>{lastPredictionCorrect?"Prediction matched one observed direction.":"Prediction missed the observed directions—use the movement readout to update your model."}</p>:null}</article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-bold uppercase text-cyan-300">Available moves</p><div className="mt-3 space-y-2">{marketActions.filter(a=>challenge.allowed.includes(a.id)).map(a=><button key={a.id} disabled={!prediction||complete} onClick={()=>run(a.id)} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-left disabled:opacity-40"><span className="font-semibold text-white">{a.label}</span><span className="mt-1 block text-xs text-slate-400">{a.normalHint}</span></button>)}</div></article></aside>
      <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Price" value={`$${market.price}`} delta={market.price-baseline.price}/><Metric label="Quantity" value={`${market.quantity}`} delta={market.quantity-baseline.quantity}/><Metric label="Stability" value={`${market.marketStability}/100`} delta={market.marketStability-baseline.marketStability}/><Metric label="DWL" value={`$${market.deadweightLoss}`} delta={market.deadweightLoss-baseline.deadweightLoss}/></div><article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-bold text-white">Baseline vs current</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Compare label="Consumer surplus" before={baseline.consumerSurplus} after={market.consumerSurplus}/><Compare label="Producer surplus" before={baseline.producerSurplus} after={market.producerSurplus}/><Compare label="Total private surplus" before={welfareBaseline} after={welfareNow}/><Compare label="Market balance" before={baseline.gap} after={market.gap}/></div><p className="mt-4 text-sm leading-6 text-slate-300">{market.explanation}</p></article>{complete?<article className={`rounded-2xl border p-6 ${success?"border-emerald-300/40 bg-emerald-300/10":"border-rose-300/30 bg-rose-300/10"}`}><p className="text-xs font-bold uppercase tracking-[.2em]">Challenge debrief</p><h2 className="mt-2 text-2xl font-black text-white">{success?"Objective achieved":"Move budget exhausted"}</h2><p className="mt-3 text-sm text-slate-200">{success?`You solved “${challenge.title}” in ${moves} move${moves===1?'':'s'}.`: `The market did not reach: ${challenge.target}. Reset and try a different causal path.`}</p><button onClick={()=>reset()} className="mt-4 rounded-xl border border-white/20 px-4 py-2 font-bold text-white">Replay challenge</button></article>:null}</div>
    </div>
  </section>;
}
function Metric({label,value,delta}:{label:string;value:string;delta:number}){return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p><p className="mt-1 text-xs text-slate-400">Δ {delta>0?'+':''}{delta.toFixed(1)}</p></article>}
function Compare({label,before,after}:{label:string;before:number;after:number}){return <div className="rounded-xl bg-slate-950/60 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-200">{before.toFixed(1)} → <strong>{after.toFixed(1)}</strong></p></div>}
