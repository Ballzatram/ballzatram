import type { Actor, GameAction, GameLayer } from "@/lib/invisible-hands-v2/types";
import { GlobalTradeMap } from "./GlobalTradeMap";

export function EconomicMapViewport(props: { layer: GameLayer; actors: Actor[]; selectedAction?: GameAction; selectedActorId?: string; onSelect:(id:string)=>void }) {
  return <div className="relative h-[76vh] min-h-[620px] overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950">
    <svg className="absolute inset-0 h-0 w-0"><defs><pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M 16 0 L 0 0 0 16" fill="none" stroke="#1e293b" strokeWidth="0.4"/></pattern></defs></svg>
    {props.layer === "global" ? <GlobalTradeMap {...props} /> : <div className="p-8 text-slate-300">TODO: richer {props.layer} map layer styling.</div>}
  </div>;
}
