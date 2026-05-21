import type { GameEvent } from "@/lib/invisible-hands-v2/types";

type TurnPhase = "observe"|"preview"|"resolved";

export function EventTicker({ events, pending, turnPhase }: { events: GameEvent[]; pending: string[]; turnPhase:TurnPhase }) {
  const resolved = ["Turn resolved.","Trade flow projected higher.","Import prices ease.","Manufacturing competition intensifies.","Policy effects logged."];
  const feed = turnPhase === "resolved" ? resolved : turnPhase === "preview" ? ["Awaiting turn resolution.", ...pending] : events.map((e)=>e.title);
  return <div className="absolute bottom-2 left-2 right-2 rounded border border-cyan-300/30 bg-[#0a233d]/95 p-2 text-xs text-cyan-50">
    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide">{turnPhase==="preview"?"Awaiting Turn Resolution":turnPhase==="resolved"?"Turn Resolved":"Event Ticker"}</p>
    <div className="grid grid-cols-5 gap-2">{feed.slice(0,5).map((item)=><div key={item} className="rounded border border-cyan-300/25 bg-[#12375a] p-2">{item}</div>)}</div>
  </div>;
}
