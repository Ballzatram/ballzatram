"use client";
import { useMemo, useState } from "react";
import { actions, advanceTurn, initScenario, scenarios } from "@/lib/invisible-hands-v2/simulation";
import type { GameLayer, GameState } from "@/lib/invisible-hands-v2/types";
import { globalPreviewEffects, globalResolvedOutcomes, globalRoutes } from "@/lib/invisible-hands-v2/data";
import { EconomicMapViewport } from "./maps/EconomicMapViewport";
import { LayerZoomControls } from "./LayerZoomControls";
import { EventTicker } from "./EventTicker";
import { GlobalCommandLayout } from "./GlobalCommandLayout";

type TurnPhase = "observe"|"preview"|"resolved";

export function InvisibleHandsPage() {
  const [state, setState] = useState<GameState>(initScenario("inflation-spiral"));
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("observe");
  const [resolution, setResolution] = useState<{ actionName: string; bullets: Array<{ text: string; tone: "positive" | "negative" | "neutral" }>; nextPressure: string; tags: string[]; affectedActors: string[]; affectedRoutes: string[]; }>();
  const scenario = scenarios.find((s) => s.id === state.scenarioId)!;
  const layerActors = useMemo(() => state.actors.filter((a) => a.layer === state.layer), [state.actors, state.layer]);
  const layerActions = actions.filter((a) => a.layer === state.layer);
  const selectedAction = layerActions.find((a) => state.selectedActionIds.includes(a.id));
  const previewEffect = selectedAction ? globalPreviewEffects.find((p) => p.actionId === selectedAction.id) : undefined;

  const toggleAction=(id:string)=>setState((s)=>{const exists=s.selectedActionIds.includes(id);setTurnPhase(exists?"observe":"preview");return {...s,selectedActionIds:exists?[]:[id]};});
  const onAdvance=()=>{setState((s)=>{const prev = s; const next = advanceTurn(s); const actionId = prev.selectedActionIds[0]; if (actionId) { const outcome = globalResolvedOutcomes.find((o)=>o.actionId===actionId); const effect = globalPreviewEffects.find((p)=>p.actionId===actionId); setResolution({ actionName: outcome?.actionLabel ?? actions.find((a)=>a.id===actionId)?.name ?? "Policy package", bullets: outcome?.bullets ?? [{ text: "Policy mix applied.", tone: "neutral" }], nextPressure: outcome?.nextPressure ?? "Monitor volatility and confidence next turn.", tags: Array.from(new Set((outcome?.bullets ?? []).map((b)=>b.tone))), affectedActors: effect?.affectedActorIds ?? [], affectedRoutes: (effect?.affectedRouteIds ?? []).map((id)=>globalRoutes.find((r)=>r.id===id)?.label ?? id) }); } return next;}); setTurnPhase("resolved");};
  const onNextTurn=()=>{setState((s)=>({...s,selectedActionIds:[]})); setTurnPhase("observe");};

  if (state.layer !== "global") return <section className="min-h-screen bg-slate-950 p-6 text-slate-100"><div className="mb-3 flex gap-2">{(["micro","macro","global"] as GameLayer[]).map((l)=><button key={l} onClick={()=>setState((s)=>({...s,layer:l}))} className="rounded border border-slate-600 px-3 py-1">{l}</button>)}</div><EconomicMapViewport layer={state.layer} actors={layerActors} previewEffect={previewEffect} selectedActorId={state.selectedActorId} onSelect={(id)=>setState((s)=>({...s,selectedActorId:id}))} /></section>;

  return <GlobalCommandLayout state={state} scenarioName={scenario.name} actions={layerActions} selectedAction={selectedAction} turnPhase={turnPhase} onToggleAction={toggleAction} onAdvance={onAdvance} onNextTurn={onNextTurn} resolution={resolution}>
    <div className="relative overflow-hidden rounded border border-cyan-300/35 bg-[#07152a]"><EconomicMapViewport layer={state.layer} actors={layerActors} previewEffect={previewEffect} selectedActorId={state.selectedActorId} turnPhase={turnPhase} onSelect={(id)=>setState((s)=>({...s,selectedActorId:id}))} /><LayerZoomControls layer={state.layer} setLayer={(l:GameLayer)=>setState((s)=>({...s,layer:l}))} /><EventTicker events={state.activeEvents} pending={previewEffect?.pendingEvents ?? []} turnPhase={turnPhase} resolved={resolution?.bullets.map((b)=>b.text)} /></div>
  </GlobalCommandLayout>;
}
