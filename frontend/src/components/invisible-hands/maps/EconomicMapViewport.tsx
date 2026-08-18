import type { Actor, GameLayer, GlobalPreviewEffect } from "@/lib/invisible-hands-v2/types";
import { GlobalTradeMap } from "./GlobalTradeMap";

export function EconomicMapViewport(props: { layer: GameLayer; actors: Actor[]; previewEffect?: GlobalPreviewEffect; selectedActorId?: string; turnPhase?: "observe"|"preview"|"resolved"; onSelect:(id:string)=>void }) {
  return <div className="relative h-[78vh] min-h-[640px] overflow-auto">
    <svg className="absolute inset-0 h-0 w-0"><defs><pattern id="grid" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M 14 0 L 0 0 0 14" fill="none" stroke="#1f4366" strokeWidth="0.35"/></pattern></defs></svg>
    {props.layer === "global"
      ? <GlobalTradeMap actors={props.actors} previewEffect={props.previewEffect} selectedActorId={props.selectedActorId} onSelect={props.onSelect} />
      : <ActorCommandBoard layer={props.layer} actors={props.actors} selectedActorId={props.selectedActorId} onSelect={props.onSelect} />}
  </div>;
}

function ActorCommandBoard({ layer, actors, selectedActorId, onSelect }: { layer: Exclude<GameLayer,"global">; actors: Actor[]; selectedActorId?: string; onSelect:(id:string)=>void }) {
  const averageStress = actors.length ? actors.reduce((sum, actor) => sum + actor.stress, 0) / actors.length : 0;
  return <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(34,211,238,.10),transparent_45%),linear-gradient(#07152a,#08111f)] p-5">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">{layer} actor network</p><h2 className="mt-2 text-2xl font-bold text-white">Incentives, stress, and current strategies</h2><p className="mt-2 max-w-3xl text-sm text-slate-400">This layer is an actor command board rather than a geographic map. Select an actor to inspect who is under pressure and how policy changes incentives.</p></div><div className="rounded-xl border border-cyan-300/25 bg-cyan-300/5 px-4 py-3 text-right"><p className="text-xs uppercase text-cyan-200/70">Average stress</p><p className="text-2xl font-bold text-cyan-100">{averageStress.toFixed(0)}/100</p></div></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{actors.map((actor) => {
      const selected = selectedActorId === actor.id;
      const tone = actor.stress >= 70 ? "border-rose-400/50 bg-rose-500/10" : actor.stress >= 45 ? "border-amber-300/40 bg-amber-300/10" : "border-emerald-300/30 bg-emerald-300/5";
      return <button key={actor.id} onClick={()=>onSelect(actor.id)} className={`rounded-2xl border p-4 text-left transition ${tone} ${selected?"ring-2 ring-cyan-200":"hover:border-cyan-300/60"}`}>
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{actor.type}</p><h3 className="mt-1 text-lg font-bold text-white">{actor.visual?.icon ? `${actor.visual.icon} ` : ""}{actor.name}</h3></div><span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-200">Stress {actor.stress.toFixed(0)}</span></div>
        <p className="mt-3 text-sm leading-6 text-slate-300">{actor.description}</p>
        <div className="mt-3 rounded-xl bg-slate-950/45 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Current strategy</p><p className="mt-1 text-sm text-white">{actor.currentStrategy}</p></div>
        <div className="mt-3 grid gap-2 text-xs text-slate-400"><p><span className="text-slate-200">Incentives:</span> {actor.incentives.slice(0,2).join(" · ")}</p><p><span className="text-slate-200">Responds to:</span> {actor.respondsTo.slice(0,3).join(" · ")}</p></div>
      </button>;
    })}</div>
  </div>;
}
