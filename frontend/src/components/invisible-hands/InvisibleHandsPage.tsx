"use client";
import { useMemo, useState } from "react";
import { actions, advanceTurn, initScenario, scenarios } from "@/lib/invisible-hands-v2/simulation";
import { trackedStatKeys } from "@/lib/invisible-hands-v2/data";
import type { GameLayer, GameState } from "@/lib/invisible-hands-v2/types";
import { EconomicMapViewport } from "./maps/EconomicMapViewport";
import { LayerZoomControls } from "./LayerZoomControls";
import { OverlayActionDock } from "./OverlayActionDock";
import { EventTicker } from "./EventTicker";

export function InvisibleHandsPage() {
  const [state, setState] = useState<GameState>(initScenario("inflation-spiral"));
  const scenario = scenarios.find((s) => s.id === state.scenarioId)!;
  const layerActors = useMemo(() => state.actors.filter((a) => a.layer === state.layer), [state.actors, state.layer]);
  const layerActions = actions.filter((a) => a.layer === state.layer);
  const selectedAction = layerActions.find((a) => state.selectedActionIds.includes(a.id));

  return <section className="min-h-screen bg-[#010611] p-3 text-slate-100">
    <header className="mb-3 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs">
      <div><p className="uppercase tracking-[0.24em] text-cyan-300">Invisible Hands</p><p>{scenario.name} · Turn {state.turn}</p></div>
      <div className="flex gap-2">{trackedStatKeys.slice(0,6).map((k: keyof GameState)=><span key={k} className="rounded border border-slate-700 px-2 py-1">{k}: {Number(state[k]).toFixed(0)}</span>)}<select value={state.scenarioId} onChange={(e)=>setState(initScenario(e.target.value))} className="bg-slate-900 border border-slate-700">{scenarios.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    </header>
    <div className="relative">
      <aside className="absolute left-3 top-4 z-20 w-60 rounded-2xl border border-slate-700 bg-slate-950/85 p-3 text-xs"><p className="uppercase text-cyan-200">Global Overview</p><p className="mt-2">Supply stress {state.supplyStress.toFixed(0)}</p><p>Volatility {state.marketVolatility.toFixed(0)}</p><p>Trade balance {state.tradeBalance.toFixed(0)}</p></aside>
      <EconomicMapViewport layer={state.layer} actors={layerActors} selectedAction={selectedAction} selectedActorId={state.selectedActorId} onSelect={(id)=>setState((s)=>({...s,selectedActorId:id}))} />
      <OverlayActionDock actions={layerActions} state={state} toggleAction={(id)=>setState((s)=>({...s,selectedActionIds:s.selectedActionIds.includes(id)?s.selectedActionIds.filter((x)=>x!==id):[id]}))} onAdvance={()=>setState(advanceTurn(state))} />
      <LayerZoomControls layer={state.layer} setLayer={(l:GameLayer)=>setState((s)=>({...s,layer:l}))} />
      <EventTicker events={state.activeEvents} pending={selectedAction?.preview?.pendingEvents ?? []} />
    </div>
  </section>;
}
