import type { GameAction, GameState } from "@/lib/invisible-hands-v2/types";

export function OverlayActionDock({ actions, state, toggleAction, onAdvance }: { actions: GameAction[]; state: GameState; toggleAction: (id: string) => void; onAdvance: () => void }) {
  const selected = actions.find((a) => state.selectedActionIds.includes(a.id));
  return <aside className="absolute right-3 top-20 z-20 w-[320px] rounded-2xl border border-slate-700 bg-slate-950/85 p-3">
    <button onClick={onAdvance} className={`mb-3 w-full rounded-lg px-3 py-2 font-semibold ${state.selectedActionIds.length ? "bg-emerald-300 text-black" : "bg-slate-800 text-slate-200"}`}>{state.selectedActionIds.length ? "Execute Policy" : "Next Turn"}</button>
    <p className="text-xs uppercase text-cyan-200">Actions</p>
    <div className="space-y-2 mt-2">{actions.slice(0,6).map((a)=><button key={a.id} onClick={()=>toggleAction(a.id)} className={`w-full rounded border p-2 text-left text-xs ${state.selectedActionIds.includes(a.id)?"border-cyan-300 bg-cyan-500/10":"border-slate-700"}`}>{a.name}</button>)}</div>
    {selected?.preview ? <div className="mt-3 text-xs"><p className="text-amber-200">Expected Impact</p>{selected.preview.expectedDeltas.map((d)=><div key={d.label} className="flex justify-between"><span>{d.label}</span><span>{d.value}</span></div>)}</div> : null}
  </aside>;
}
