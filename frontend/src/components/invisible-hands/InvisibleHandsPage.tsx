"use client";
import { useMemo, useState } from "react";
import { actions, advanceTurn, initScenario, scenarios } from "@/lib/invisible-hands-v2/simulation";
import type { GameLayer, GameState } from "@/lib/invisible-hands-v2/types";
import { EconomicMapViewport } from "./maps/EconomicMapViewport";
import { LayerZoomControls } from "./LayerZoomControls";
import { EventTicker } from "./EventTicker";
import { GlobalCommandLayout } from "./GlobalCommandLayout";

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

  return <GlobalCommandLayout state={state} scenarioName={scenario.name} actions={layerActions} selectedAction={selectedAction} turnPhase={turnPhase} onToggleAction={toggleAction} onAdvance={onAdvance} onNextTurn={onNextTurn}>
    <div className="relative overflow-hidden rounded border border-cyan-300/35 bg-[#07152a]"><EconomicMapViewport layer={state.layer} actors={layerActors} selectedAction={selectedAction} selectedActorId={state.selectedActorId} turnPhase={turnPhase} onSelect={(id)=>setState((s)=>({...s,selectedActorId:id}))} /><LayerZoomControls layer={state.layer} setLayer={(l:GameLayer)=>setState((s)=>({...s,layer:l}))} /><EventTicker events={state.activeEvents} pending={selectedAction?.preview?.pendingEvents ?? []} turnPhase={turnPhase} /></div>
  </GlobalCommandLayout>;
}
