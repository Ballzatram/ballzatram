import type { Actor, GameAction, GameLayer } from "@/lib/invisible-hands-v2/types";
import { GlobalTradeMap } from "./GlobalTradeMap";

export function EconomicMapViewport(props: { layer: GameLayer; actors: Actor[]; selectedAction?: GameAction; selectedActorId?: string; turnPhase?: "observe"|"preview"|"resolved"; onSelect:(id:string)=>void }) {
  return <div className="relative h-[78vh] min-h-[640px] overflow-hidden">
    <svg className="absolute inset-0 h-0 w-0"><defs><pattern id="grid" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M 14 0 L 0 0 0 14" fill="none" stroke="#1f4366" strokeWidth="0.35"/></pattern></defs></svg>
    {props.layer === "global" ? <GlobalTradeMap {...props} /> : <div className="p-8 text-slate-300">TODO: richer {props.layer} map layer styling.</div>}
  </div>;
}
