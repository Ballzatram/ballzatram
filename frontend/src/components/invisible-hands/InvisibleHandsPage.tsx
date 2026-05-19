"use client";

import { useMemo, useState } from "react";
import { actions, advanceTurn, initScenario, scenarios } from "@/lib/invisible-hands-v2/simulation";
import { trackedStatKeys } from "@/lib/invisible-hands-v2/data";
import type { Actor, GameLayer, GameState } from "@/lib/invisible-hands-v2/types";

const layerColors: Record<GameLayer, string> = { micro: "#22d3ee", macro: "#a78bfa", global: "#fbbf24" };
const layerLayouts: Record<GameLayer, Record<string, [number, number]>> = {
  micro: { "micro-energy": [15, 26], "micro-commodities": [32, 22], "micro-manufacturers": [49, 38], "micro-transport": [70, 34], "micro-agriculture": [78, 60], "micro-consumers": [51, 73], "micro-labor": [31, 60], "micro-banks": [16, 48] },
  macro: { "macro-cb": [50, 14], "macro-markets": [28, 28], "macro-housing": [71, 30], "macro-consumer": [50, 49], "macro-labor": [27, 66], "macro-output": [74, 66], "macro-treasury": [50, 82], "macro-energy": [89, 50] },
  global: { "global-domestic": [47, 50], "global-partner": [20, 22], "global-manu-competitor": [22, 76], "global-oil": [83, 18], "global-food": [82, 73], "global-fx": [63, 30], "global-resource": [64, 68], "global-chokepoint": [43, 86] },
};

function stressTone(stress: number) {
  if (stress >= 70) return "border-red-400/70 bg-red-500/10 text-red-200";
  if (stress >= 45) return "border-amber-300/70 bg-amber-500/10 text-amber-200";
  return "border-emerald-400/60 bg-emerald-500/10 text-emerald-200";
}

function summarizeTurn(state: GameState) {
  const last = state.history[state.history.length - 1];
  if (!last) return "No turn resolved yet. Queue actions and advance.";
  const prev = state.history[state.history.length - 2]?.statSnapshot;
  if (!prev) return `Turn ${last.turn} resolved with ${last.actionIds.length} action(s).`;
  const deltaInfl = last.statSnapshot.inflation - prev.inflation;
  const deltaOut = last.statSnapshot.output - prev.output;
  const deltaStress = last.statSnapshot.supplyStress - prev.supplyStress;
  const inflText = deltaInfl > 0 ? `Inflation pressure +${deltaInfl.toFixed(1)}` : `Inflation pressure ${deltaInfl.toFixed(1)}`;
  const outText = deltaOut > 0 ? `Output +${deltaOut.toFixed(1)}` : `Output ${deltaOut.toFixed(1)}`;
  const stressText = deltaStress > 0 ? `Supply stress +${deltaStress.toFixed(1)}` : `Supply stress ${deltaStress.toFixed(1)}`;
  return `${inflText} · ${outText} · ${stressText}`;
}

function layerBackdrop(layer: GameLayer) {
  if (layer === "micro") return "M8,16 L24,8 L46,14 L65,10 L88,20 L92,40 L83,57 L89,80 L68,84 L42,79 L18,84 L9,67 L14,48 L7,32 Z";
  if (layer === "macro") return "M12,18 L27,11 L48,12 L68,8 L86,18 L92,38 L84,58 L90,78 L70,86 L48,81 L26,87 L12,76 L15,56 L9,36 Z";
  return "M6,22 L18,11 L36,9 L50,13 L63,8 L81,14 L94,29 L88,46 L93,65 L80,82 L63,87 L48,81 L32,88 L15,84 L7,68 L11,49 Z";
}

function routePath(x1: number, y1: number, x2: number, y2: number) {
  const cx = (x1 + x2) / 2;
  const bend = Math.abs(x2 - x1) > 25 ? -8 : -4;
  return `M ${x1} ${y1} Q ${cx} ${Math.min(y1, y2) + bend} ${x2} ${y2}`;
}

function EconomicMapViewport({ layer, actors, selectedActorId, onSelect }: { layer: GameLayer; actors: Actor[]; selectedActorId?: string; onSelect: (id: string) => void }) {
  const pos = layerLayouts[layer];
  return (
    <div className="relative h-[72vh] min-h-[560px] w-full overflow-hidden rounded-3xl border border-cyan-400/30 bg-[#030712] shadow-[0_0_70px_rgba(8,145,178,0.24)]">
      <svg viewBox="0 0 100 92" className="h-full w-full" role="img" aria-label={`${layer} economy command map`}>
        <defs>
          <pattern id="grid" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M 4 0 L 0 0 0 4" fill="none" stroke="#1e293b" strokeWidth="0.2" /></pattern>
          <marker id="flowArrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><polygon points="0 0, 5 2.5, 0 5" fill={layerColors[layer]} opacity="0.8" /></marker>
        </defs>
        <rect width="100" height="92" fill="#020617" />
        <rect width="100" height="92" fill="url(#grid)" opacity="0.5" />
        <path d={layerBackdrop(layer)} fill="rgba(15,23,42,0.7)" stroke="#334155" strokeWidth="0.5" />
        {actors.flatMap((a) => a.connectedActorIds.map((to) => ({ from: a.id, to }))).map((edge) => {
          const p1 = pos[edge.from]; const p2 = pos[edge.to]; if (!p1 || !p2) return null;
          const stress = Math.max(actors.find((a) => a.id === edge.from)?.stress ?? 0, actors.find((a) => a.id === edge.to)?.stress ?? 0);
          return <path key={`${edge.from}-${edge.to}`} d={routePath(p1[0], p1[1], p2[0], p2[1])} stroke={stress > 65 ? "#f43f5e" : layerColors[layer]} strokeWidth={stress > 65 ? 1.1 : 0.8} fill="none" markerEnd="url(#flowArrow)" opacity={0.85} />;
        })}
        {actors.map((a) => {
          const p = pos[a.id] ?? [50, 50];
          const selected = a.id === selectedActorId;
          const hot = a.stress >= 70;
          return (
            <g key={a.id} onClick={() => onSelect(a.id)} className="cursor-pointer">
              {hot ? <circle cx={p[0]} cy={p[1]} r={selected ? 8.8 : 7} fill="none" stroke="#ef4444" strokeWidth="0.8" opacity="0.95" /> : null}
              <circle cx={p[0]} cy={p[1]} r={selected ? 5.6 : 4.7} fill={`hsl(${120 - a.stress},85%,50%)`} stroke={selected ? "#f8fafc" : layerColors[layer]} strokeWidth={selected ? 1.4 : 0.9} />
              <text x={p[0]} y={p[1] - 6.5} textAnchor="middle" fontSize="2.7" fill="#e2e8f0">{a.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function InvisibleHandsPage() {
  const [state, setState] = useState<GameState>(initScenario("inflation-spiral"));
  const scenario = scenarios.find((s) => s.id === state.scenarioId)!;
  const layerActors = useMemo(() => state.actors.filter((a) => a.layer === state.layer), [state.actors, state.layer]);
  const layerActions = actions.filter((a) => a.layer === state.layer);
  const selected = state.actors.find((a) => a.id === state.selectedActorId);

  const toggleAction = (id: string) => setState((s) => ({ ...s, selectedActionIds: s.selectedActionIds.includes(id) ? s.selectedActionIds.filter((x) => x !== id) : [...s.selectedActionIds, id] }));

  return (
    <section className="min-h-screen bg-[#020617] p-3 text-slate-100 md:p-4">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-950/90 p-3 shadow-2xl shadow-black/50">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 px-4 py-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-300">Invisible Hands Command</p>
            <h1 className="text-xl font-black md:text-2xl">{scenario.name}</h1>
            <p className="text-xs text-slate-400">{scenario.objective}</p>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <select className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5" value={state.scenarioId} onChange={(e) => setState(initScenario(e.target.value))}>{scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <div className="rounded-md border border-slate-700 px-2 py-1.5">Turn {state.turn}</div>
            <div className="rounded-md border border-slate-700 px-2 py-1.5">Stability {state.stabilityScore.toFixed(0)}</div>
            <button className="rounded-md bg-emerald-300 px-3 py-1.5 font-semibold text-slate-900" onClick={() => setState(advanceTurn(state))}>Advance Turn</button>
          </div>
        </header>

        <div className="relative">
          <EconomicMapViewport layer={state.layer} actors={layerActors} selectedActorId={state.selectedActorId} onSelect={(id) => setState((s) => ({ ...s, selectedActorId: id }))} />

          <aside className="absolute left-3 top-3 z-10 w-[230px] rounded-2xl border border-slate-700/80 bg-slate-950/88 p-3 backdrop-blur">
            <h3 className="mb-2 text-[11px] uppercase tracking-[0.2em] text-cyan-200">System Stats</h3>
            {trackedStatKeys.map((k) => <div key={k} className="flex items-center justify-between border-b border-slate-800 py-1 text-xs"><span className="capitalize text-slate-300">{k}</span><strong>{Number(state[k]).toFixed(0)}</strong></div>)}
          </aside>

          <aside className="absolute right-3 top-3 z-10 w-[320px] rounded-2xl border border-slate-700/80 bg-slate-950/88 p-3 backdrop-blur">
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-violet-200">Actor + Orders</h3>
            {selected ? <><p className="mt-2 font-semibold">{selected.name}</p><p className="text-xs text-slate-300">{selected.currentStrategy}</p><p className={`mt-2 inline-block rounded-full border px-2 py-1 text-[11px] ${stressTone(selected.stress)}`}>Stress {selected.stress.toFixed(0)}</p></> : <p className="mt-2 text-xs text-slate-400">Select a node to inspect the actor.</p>}
            <div className="mt-3 space-y-2">
              {layerActions.slice(0, 4).map((a) => <button key={a.id} onClick={() => toggleAction(a.id)} className={`w-full rounded-xl border p-2 text-left text-xs transition ${state.selectedActionIds.includes(a.id) ? "border-emerald-300 bg-emerald-500/15" : "border-slate-700 hover:border-slate-500"}`}><p className="font-semibold">{a.name}</p><p className="text-[11px] text-slate-300">{a.upside}</p></button>)}
            </div>
          </aside>

          <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-slate-700/80 bg-slate-950/90 px-2 py-1 backdrop-blur">
            {(["micro", "macro", "global"] as GameLayer[]).map((l) => <button key={l} onClick={() => setState((s) => ({ ...s, layer: l }))} className={`mx-1 rounded-full px-4 py-1.5 text-xs font-bold tracking-[0.18em] ${state.layer === l ? "bg-cyan-300 text-slate-900" : "bg-slate-800 text-slate-200"}`}>{l.toUpperCase()}</button>)}
          </div>
        </div>

        <footer className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-2">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Event Ticker</p>
          <p className="mt-1 text-sm text-slate-200">{summarizeTurn(state)} · Queued actions: {state.selectedActionIds.length}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">{state.activeEvents.slice(0, 3).map((e) => <span key={e.id} className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-1">{e.title}</span>)}</div>
        </footer>
      </div>
    </section>
  );
}
