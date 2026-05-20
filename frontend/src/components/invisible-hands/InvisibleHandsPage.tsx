"use client";
import { useMemo, useState } from "react";
import { actions, advanceTurn, initScenario, scenarios } from "@/lib/invisible-hands-v2/simulation";
import { globalAlerts, globalLegendItems, globalSupplyStress } from "@/lib/invisible-hands-v2/data";
import type { GameLayer, GameState } from "@/lib/invisible-hands-v2/types";
import { EconomicMapViewport } from "./maps/EconomicMapViewport";
import { LayerZoomControls } from "./LayerZoomControls";
import { OverlayActionDock } from "./OverlayActionDock";
import { EventTicker } from "./EventTicker";

type TurnPhase = "observe"|"preview"|"resolved";

export function InvisibleHandsPage() {
  const [state, setState] = useState<GameState>(initScenario("inflation-spiral"));
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("observe");
  const scenario = scenarios.find((s) => s.id === state.scenarioId)!;
  const layerActors = useMemo(() => state.actors.filter((a) => a.layer === state.layer), [state.actors, state.layer]);
  const layerActions = actions.filter((a) => a.layer === state.layer);
  const selectedAction = layerActions.find((a) => state.selectedActionIds.includes(a.id));

  const toggleAction=(id:string)=>setState((s)=>{const exists=s.selectedActionIds.includes(id);setTurnPhase(exists?"observe":"preview");return {...s,selectedActionIds:exists?[]:[id]};});
  const onAdvance=()=>{setState((s)=>advanceTurn(s)); setTurnPhase("resolved");};
  const onNextTurn=()=>{setState((s)=>({...s,selectedActionIds:[]})); setTurnPhase("observe");};

  if (state.layer !== "global") return <section className="min-h-screen bg-slate-950 p-6 text-slate-100"><div className="mb-3 flex gap-2">{(["micro","macro","global"] as GameLayer[]).map((l)=><button key={l} onClick={()=>setState((s)=>({...s,layer:l}))} className="rounded border border-slate-600 px-3 py-1">{l}</button>)}</div><EconomicMapViewport layer={state.layer} actors={layerActors} selectedAction={selectedAction} selectedActorId={state.selectedActorId} onSelect={(id)=>setState((s)=>({...s,selectedActorId:id}))} /></section>;

  return <section className="min-h-screen bg-[#e6e6e6] p-2 text-[#232323]"><div className="rounded-xl border border-[#c4c4c4] bg-[#efefef] p-2">
    <header className="mb-2 grid grid-cols-[260px_repeat(7,minmax(0,1fr))_320px] gap-2 text-xs">
      <div className="rounded border border-[#c2c2c2] bg-[#f7f7f7] p-2"><p className="text-2xl font-semibold">INVISIBLE HANDS</p><p>ECONOMIC STRATEGY COMMAND</p></div>
      {[['Scenario',scenario.name],['Turn',`0${state.turn} / 200${turnPhase==='resolved'?' (RESOLVED)':''}`],['Stability',`${state.stabilityScore.toFixed(0)}%`],['Inflation',`${state.inflation.toFixed(1)}%`],['Trade Balance',`+$${state.tradeBalance.toFixed(0)}B`],['Currency Strength',`${state.currencyStrength.toFixed(0)}`],['Confidence',`${state.publicConfidence.toFixed(0)}`]].map(([k,v])=><div key={k} className="rounded border border-[#c2c2c2] bg-[#f7f7f7] p-2"><p className="text-[10px] uppercase">{k}</p><p className="mt-1 text-xl font-medium">{v}</p></div>)}
      <div className="rounded border border-[#c2c2c2] bg-[#f7f7f7] p-2">WORLD · INTEL · MARKETS · DATA · SETTINGS</div>
    </header>
    <div className="grid grid-cols-[230px_1fr_290px] gap-2">
      <aside className="space-y-2 text-sm">{[["Global Overview",[`Global Trade Growth 2.6%`,`Supply Chain Stress HIGH`,`Geopolitical Risk ELEVATED`,`Protectionism RISING`]], ["Trade Flow Legend",globalLegendItems], ["Supply Chain Stress",globalSupplyStress.map((s)=>`${s.name} ${s.level}`)], ["Active Alerts",globalAlerts]].map(([title,rows])=><div key={title as string} className="rounded border border-[#c4c4c4] bg-[#f5f5f5] p-3"><p className="mb-2 text-xs font-semibold uppercase">{title as string}</p><div className="space-y-1 text-xs">{(rows as string[]).map((r)=><p key={r}>{r}</p>)}</div></div>)}</aside>
      <div className="relative rounded border border-[#c4c4c4] bg-[#ececec]"><EconomicMapViewport layer={state.layer} actors={layerActors} selectedAction={selectedAction} selectedActorId={state.selectedActorId} onSelect={(id)=>setState((s)=>({...s,selectedActorId:id}))} /><LayerZoomControls layer={state.layer} setLayer={(l:GameLayer)=>setState((s)=>({...s,layer:l}))} /></div>
      <OverlayActionDock actions={layerActions} state={state} toggleAction={toggleAction} onAdvance={onAdvance} onNextTurn={onNextTurn} turnPhase={turnPhase} />
    </div>
    <EventTicker events={state.activeEvents} pending={selectedAction?.preview?.pendingEvents ?? []} turnPhase={turnPhase} />
  </div></section>;
}
