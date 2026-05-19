"use client";
import { useMemo, useState } from "react";
import { actions, initScenario, scenarios, advanceTurn, layers } from "@/lib/invisible-hands-v2/simulation";
import type { GameLayer, GameState } from "@/lib/invisible-hands-v2/types";

const layerColors:Record<GameLayer,string>={micro:"#22d3ee",macro:"#a78bfa",global:"#f59e0b"};
const pos={0:[50,14],1:[80,26],2:[84,54],3:[64,76],4:[36,76],5:[16,54],6:[20,26],7:[50,50]};

export function InvisibleHandsPage(){
  const [state,setState]=useState<GameState>(initScenario("inflation-spiral"));
  const scenario = scenarios.find(s=>s.id===state.scenarioId)!;
  const layerActors=useMemo(()=>state.actors.filter(a=>a.layer===state.layer),[state]);
  const layerActions=actions.filter(a=>a.layer===state.layer);
  const selected=state.actors.find(a=>a.id===state.selectedActorId);
  const toggleAction=(id:string)=>setState(s=>({...s,selectedActionIds:s.selectedActionIds.includes(id)?s.selectedActionIds.filter(x=>x!==id):[...s.selectedActionIds,id]}));
  return <section className="space-y-4 text-slate-100">
    <header className="rounded-2xl border border-cyan-400/30 bg-slate-950 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Invisible Hands Command</p><h1 className="text-3xl font-black">{scenario.name}</h1><p className="text-sm text-slate-300">Turn {state.turn} · Objective: {scenario.objective}</p></div><button className="rounded bg-emerald-300 px-3 py-2 font-bold text-slate-900" onClick={()=>setState(advanceTurn(state))}>Advance Turn</button></div></header>
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
      <aside className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-sm">{(["inflation","unemployment","output","publicConfidence","financialStability","currencyStrength","supplyStress","energyPrice","foodPrice","tradeBalance","marketVolatility","policyCredibility","fiscalSpace","stabilityScore"] as Array<keyof GameState>).map(k=><div key={k} className="flex justify-between border-b border-slate-800 py-1"><span>{k}</span><strong>{Number(state[k]).toFixed(0)}</strong></div>)}</aside>
      <main className="space-y-3"><div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-3"><p className="text-sm text-slate-300">{scenario.briefing}</p><div className="mt-2 flex gap-2">{(["micro","macro","global"] as GameLayer[]).map(l=><button key={l} onClick={()=>setState(s=>({...s,layer:l}))} className={`rounded px-3 py-1 text-sm ${state.layer===l?"bg-cyan-300 text-slate-900":"bg-slate-800"}`}>{l.toUpperCase()}</button>)}</div></div>
      <div className="rounded-2xl border border-slate-700 bg-[#020617] p-2"><svg viewBox="0 0 100 90" className="h-[420px] w-full">{layerActors.map((a,i)=>{const p=pos[i as keyof typeof pos]??[50,50]; const connected=layerActors[(i+1)%layerActors.length]; return <g key={a.id}><line x1={p[0]} y1={p[1]} x2={(pos[((i+1)%8) as keyof typeof pos]??[50,50])[0]} y2={(pos[((i+1)%8) as keyof typeof pos]??[50,50])[1]} stroke="#334155" strokeWidth="0.7" markerEnd="url(#arr)"/><circle cx={p[0]} cy={p[1]} r={state.selectedActorId===a.id?6:4.8} fill={`hsl(${120-a.stress},80%,50%)`} stroke={layerColors[state.layer]} onClick={()=>setState(s=>({...s,selectedActorId:a.id}))}/><text x={p[0]} y={p[1]-7} textAnchor="middle" fontSize="3" fill="#cbd5e1">{a.name}</text></g>;})}<defs><marker id="arr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><polygon points="0 0, 5 2.5, 0 5" fill="#334155"/></marker></defs></svg></div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3"><h3 className="font-bold">Action Cards · {state.layer}</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{layerActions.map(a=><button key={a.id} onClick={()=>toggleAction(a.id)} className={`rounded border p-2 text-left ${state.selectedActionIds.includes(a.id)?"border-emerald-300 bg-emerald-400/10":"border-slate-700"}`}><p className="font-semibold">{a.name}</p><p className="text-xs text-slate-300">{a.concept}: {a.conceptExplanation}</p></button>)}</div></div>
      </main>
      <aside className="space-y-3"><div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3"><h3 className="font-bold">Selected Actor</h3>{selected?<><p>{selected.name}</p><p className="text-sm text-slate-300">{selected.currentStrategy}</p><p className="text-xs">Stress {selected.stress.toFixed(0)}</p></>:<p className="text-sm text-slate-400">Click a node.</p>}</div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3"><h3 className="font-bold">Event Log</h3><ul className="mt-2 space-y-2 text-sm">{state.activeEvents.map(e=><li key={e.id}><strong>{e.title}</strong><p className="text-slate-300">{e.body}</p></li>)}</ul></div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3"><h3 className="font-bold">Turn Summary</h3><p className="text-sm">Selected actions: {state.selectedActionIds.length}</p><p className="text-sm">History turns: {state.history.length}</p>{state.endState&&<p className="mt-2 font-bold text-amber-300">End State: {state.endState}</p>}</div></aside>
    </div>
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3"><label className="text-sm">Scenario</label><select className="ml-3 rounded bg-slate-800 p-1" value={state.scenarioId} onChange={e=>setState(initScenario(e.target.value))}>{scenarios.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
  </section>
}
