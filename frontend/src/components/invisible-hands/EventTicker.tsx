import type { GameEvent } from "@/lib/invisible-hands-v2/types";

type TurnPhase = "observe"|"preview"|"resolved";

export function EventTicker({ events, pending, turnPhase }: { events: GameEvent[]; pending: string[]; turnPhase:TurnPhase }) {
  const resolved = ["Trade balance improves from lower tariffs.","Oil prices rise on stronger demand.","Import competition intensifies.","Customs revenue declines after tariff cuts.","Investor confidence improves."];
  return <div className="mt-2 rounded border border-[#c4c4c4] bg-[#f5f5f5] p-2 text-xs">
    <p className="mb-2 text-sm font-semibold uppercase">{turnPhase==="preview"?"AWAITING TURN RESOLUTION":turnPhase==="resolved"?"TURN RESOLVED":"EVENT FEED"}</p>
    <div className="grid grid-cols-5 gap-2">{(turnPhase==="resolved"?resolved:turnPhase==="preview"?["Policy enacted", "Potential response", "Market reaction", "Trade routes update", "Fiscal impact"]:[...pending,...events.slice(0,4).map((e)=>e.title)]).slice(0,5).map((item)=><div key={item} className="rounded border border-[#c7c7c7] bg-white p-2">{item}</div>)}</div>
  </div>;
}
