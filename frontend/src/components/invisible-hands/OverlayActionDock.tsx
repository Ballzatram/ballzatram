import type { GameAction, GameState } from "@/lib/invisible-hands-v2/types";

type TurnPhase = "observe"|"preview"|"resolved";

const actionGroups = ["Tariff & Trade Policy","Supply Chain Strategy","Currency & Finance","Strategic Tools"];

export function OverlayActionDock({ actions, state, toggleAction, onAdvance, onNextTurn, turnPhase }: { actions: GameAction[]; state: GameState; toggleAction: (id: string) => void; onAdvance: () => void; onNextTurn:()=>void; turnPhase:TurnPhase }) {
  const selected = actions.find((a) => state.selectedActionIds.includes(a.id));
  return <aside className="space-y-2 text-xs">
    <button onClick={turnPhase==="resolved"?onNextTurn:onAdvance} className={`w-full rounded border px-3 py-3 text-lg font-semibold ${turnPhase==="preview"?"border-[#5c5c5c] bg-[#262626] text-white":"border-[#bfbfbf] bg-[#f7f7f7]"}`}>{turnPhase==="resolved"?`NEXT TURN ${String(state.turn+1).padStart(3,'0')}`:"ADVANCE TURN"}</button>
    <div className="rounded border border-[#c2c2c2] bg-[#f7f7f7] p-3"><p className="font-semibold">SELECTED ACTOR</p><p className="mt-2 text-base">DOMESTIC ECONOMY</p><p>Your Economy</p></div>
    {turnPhase==="preview" && selected ? <div className="rounded border border-[#8f8f8f] bg-[#f9f9f9] p-3"><p className="mb-2 font-semibold">ACTION PREVIEW · 1 ACTION SELECTED</p><p className="text-lg font-semibold">{selected.name}</p><p className="mt-2">{selected.description}</p><div className="mt-2 space-y-1">{selected.preview?.expectedDeltas.map((d)=><p key={d.label}>{d.label}: {d.value}</p>)}</div><button onClick={()=>toggleAction(selected.id)} className="mt-3 w-full rounded border border-[#bcbcbc] p-2">Modify Actions</button></div> : null}
    {turnPhase==="observe" ? <div className="rounded border border-[#c2c2c2] bg-[#f7f7f7] p-3"><p className="mb-2 font-semibold">ACTIONS</p>{actionGroups.map((g,i)=><div key={g} className="mb-3"><p className="mb-1 font-medium">{g}</p><div className="grid grid-cols-2 gap-1">{actions.slice(i*2,i*2+2).map((a)=><button key={a.id} onClick={()=>toggleAction(a.id)} className="rounded border border-[#c7c7c7] p-1">{a.name}</button>)}</div></div>)}</div> : null}
    {turnPhase==="resolved" ? <div className="rounded border border-[#c2c2c2] bg-[#f7f7f7] p-3"><p className="font-semibold">TURN {String(state.turn).padStart(3,'0')} RESOLUTION SUMMARY</p><p className="mt-2">Action enacted: {selected?.name ?? "Policy package"}</p><p>Status: Successful</p><p>Policy Cost: -25 Political Capital</p></div> : null}
  </aside>;
}
