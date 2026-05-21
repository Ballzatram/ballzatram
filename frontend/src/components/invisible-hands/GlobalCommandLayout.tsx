import type { GameAction, GameState } from "@/lib/invisible-hands-v2/types";
import { globalAlerts, globalLegendItems, globalSupplyStress } from "@/lib/invisible-hands-v2/data";

type TurnPhase = "observe" | "preview" | "resolved";

export function GlobalCommandLayout({ state, scenarioName, actions, selectedAction, turnPhase, onToggleAction, onAdvance, onNextTurn, children }: { state: GameState; scenarioName: string; actions: GameAction[]; selectedAction?: GameAction; turnPhase: TurnPhase; onToggleAction: (id: string) => void; onAdvance: () => void; onNextTurn: () => void; children: React.ReactNode }) {
  const list = ["raise-tariffs","lower-tariffs","diversify-suppliers","currency-defense","sign-trade-deal","negotiate-shipping-access"]
    .map((id) => actions.find((a) => a.id === id))
    .filter(Boolean) as GameAction[];
  return <section className="min-h-screen bg-[#071120] p-3 text-[#d9eeff]"><div className="mx-auto max-w-[1800px] rounded-xl border border-cyan-400/30 bg-[#0a1b32] p-2 shadow-[0_0_50px_rgba(34,211,238,.15)_inset]">
    <header className="mb-2 grid grid-cols-[260px_repeat(7,minmax(0,1fr))] gap-2 text-xs">
      <div className="rounded border border-cyan-300/35 bg-[#0b2747] p-2"><p className="text-xl font-bold tracking-wider">INVISIBLE HANDS</p><p className="text-[10px] text-cyan-200">GLOBAL COMMAND</p></div>
      {[['Scenario',scenarioName],['Turn',`${String(state.turn).padStart(3,'0')}`],['Stability',`${state.stabilityScore.toFixed(0)}%`],['Inflation',`${state.inflation.toFixed(1)}%`],['Trade',`$${state.tradeBalance.toFixed(0)}B`],['FX',`${state.currencyStrength.toFixed(0)}`],['Confidence',`${state.publicConfidence.toFixed(0)}`]].map(([k,v])=><div key={k} className="rounded border border-cyan-300/30 bg-[#102844] p-2"><p className="text-[10px] uppercase text-cyan-200/80">{k}</p><p className="mt-1 text-lg font-semibold">{v}</p></div>)}
    </header>
    <div className="grid grid-cols-[260px_1fr_320px] gap-2">
      <aside className="space-y-2 text-xs">{[["Global Overview",[`Trade climate: ELEVATED FRICTION`,`Volatility: ${state.marketVolatility.toFixed(0)} / 100`,`Supply stress: ${state.supplyStress.toFixed(0)} / 100`,`Policy window: NARROW`]],["Trade Flow Legend",globalLegendItems],["Supply Chain Stress",globalSupplyStress.map(s=>`${s.name} ${s.level}`)],["Active Alerts",globalAlerts]].map(([t,rows])=><div key={t as string} className="rounded border border-cyan-300/30 bg-[#0e2440] p-3"><p className="mb-2 font-semibold uppercase text-cyan-100">{t as string}</p><div className="space-y-1 text-cyan-50/90">{(rows as string[]).map(r=><p key={r}>{r}</p>)}</div></div>)}</aside>
      {children}
      <aside className="space-y-2 text-xs"><button onClick={turnPhase==="resolved"?onNextTurn:onAdvance} className={`w-full rounded border px-3 py-3 text-base font-bold tracking-wide ${turnPhase==="preview"?"border-amber-300 bg-amber-300/15 text-amber-100 shadow-[0_0_22px_rgba(251,191,36,.35)]":"border-cyan-300/40 bg-[#0f2b4a]"}`}>{turnPhase==="resolved"?"NEXT TURN":"ADVANCE TURN"}</button>
      <div className="rounded border border-cyan-300/30 bg-[#0e2440] p-3"><p className="font-semibold uppercase text-cyan-100">Selected Actor</p><p className="mt-2 text-sm font-bold">Domestic Economy</p><p className="text-cyan-100/70">Inflation-sensitive demand core.</p></div>
      {turnPhase!=="resolved"?<div className="rounded border border-cyan-300/30 bg-[#0e2440] p-3"><p className="mb-2 font-semibold uppercase text-cyan-100">Command Actions</p><div className="grid grid-cols-1 gap-1">{list.map((a)=><button key={a.id} onClick={()=>onToggleAction(a.id)} className={`rounded border px-2 py-2 text-left ${selectedAction?.id===a.id?"border-amber-300 bg-amber-400/15":"border-cyan-300/30 bg-[#123154]"}`}>{a.name}</button>)}</div></div>:null}
      {selectedAction?<div className="rounded border border-amber-300/40 bg-[#2b2516] p-3"><p className="font-semibold uppercase text-amber-200">Preview</p><p className="mt-1 text-sm font-bold">{selectedAction.name}</p><div className="mt-2 space-y-1">{selectedAction.preview?.expectedDeltas.map((d)=><p key={d.label}>{d.label}: {d.value}</p>)}</div>{turnPhase!=="resolved"?<button onClick={()=>onToggleAction(selectedAction.id)} className="mt-2 w-full rounded border border-amber-200/40 py-1">Cancel Action</button>:null}</div>:null}
      </aside>
    </div>
  </div></section>;
}
