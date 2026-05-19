"use client";

import { useMemo, useState } from "react";
import { actions, advanceTurn, initScenario, scenarios } from "@/lib/invisible-hands-v2/simulation";
import { trackedStatKeys } from "@/lib/invisible-hands-v2/data";
import type { Actor, GameLayer, GameState } from "@/lib/invisible-hands-v2/types";

const layerColors: Record<GameLayer, string> = { micro: "#06b6d4", macro: "#8b5cf6", global: "#f59e0b" };
const layerLayouts: Record<GameLayer, Record<string, [number, number]>> = {
  micro: { "micro-energy": [16, 24], "micro-commodities": [34, 20], "micro-manufacturers": [50, 38], "micro-transport": [70, 30], "micro-agriculture": [74, 56], "micro-consumers": [50, 70], "micro-labor": [29, 58], "micro-banks": [16, 45] },
  macro: { "macro-cb": [50, 14], "macro-markets": [26, 30], "macro-housing": [72, 30], "macro-consumer": [50, 50], "macro-labor": [26, 66], "macro-output": [74, 66], "macro-treasury": [50, 80], "macro-energy": [88, 50] },
  global: { "global-domestic": [48, 49], "global-partner": [20, 20], "global-manu-competitor": [20, 74], "global-oil": [84, 18], "global-food": [81, 72], "global-fx": [62, 30], "global-resource": [64, 68], "global-chokepoint": [42, 84] },
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
  const inflText = deltaInfl > 0 ? `Inflation rose ${deltaInfl.toFixed(1)}` : `Inflation cooled ${Math.abs(deltaInfl).toFixed(1)}`;
  const outText = deltaOut > 0 ? `output improved ${deltaOut.toFixed(1)}` : `output softened ${Math.abs(deltaOut).toFixed(1)}`;
  const stressText = deltaStress > 0 ? `supply stress worsened ${deltaStress.toFixed(1)}` : `supply stress eased ${Math.abs(deltaStress).toFixed(1)}`;
  return `${inflText}; ${outText}; ${stressText}.`;
}

function MapView({ layer, actors, selectedActorId, onSelect }: { layer: GameLayer; actors: Actor[]; selectedActorId?: string; onSelect: (id: string) => void }) {
  const pos = layerLayouts[layer];
  return (
    <div className="rounded-3xl border border-slate-700 bg-[radial-gradient(circle_at_50%_35%,rgba(30,41,59,0.6),#020617)] p-3 shadow-2xl shadow-black/40">
      <svg viewBox="0 0 100 92" className="h-[58vh] min-h-[420px] w-full">
        <defs>
          <marker id="arr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><polygon points="0 0, 5 2.5, 0 5" fill="#334155" /></marker>
        </defs>
        {actors.flatMap((a) => a.connectedActorIds.map((t) => ({ from: a.id, to: t })) ).map((e) => {
          const p1 = pos[e.from]; const p2 = pos[e.to]; if (!p1 || !p2) return null;
          return <line key={`${e.from}-${e.to}`} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke="#334155" strokeWidth="0.65" markerEnd="url(#arr)" opacity={0.8} />;
        })}
        {actors.map((a) => {
          const p = pos[a.id] ?? [50, 50];
          const selected = selectedActorId === a.id;
          const isHot = a.stress > 70;
          return (
            <g key={a.id} onClick={() => onSelect(a.id)} className="cursor-pointer">
              {isHot ? <circle cx={p[0]} cy={p[1]} r={selected ? 8.8 : 7.2} fill="none" stroke="#ef4444" strokeWidth="0.6" opacity={0.9} /> : null}
              <circle cx={p[0]} cy={p[1]} r={selected ? 6.2 : 5} fill={`hsl(${120 - a.stress},85%,48%)`} stroke={selected ? "#e2e8f0" : layerColors[layer]} strokeWidth={selected ? 1.2 : 0.8} />
              <text x={p[0]} y={p[1] - 7} textAnchor="middle" fontSize="2.8" fill="#e2e8f0">{a.name}</text>
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
    <section className="space-y-4 text-slate-100">
      <header className="rounded-3xl border border-cyan-400/30 bg-slate-950 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-300">Invisible Hands Command</p>
            <h1 className="text-3xl font-black md:text-4xl">{scenario.name}</h1>
            <p className="mt-1 text-sm text-slate-300">Turn {state.turn} · {scenario.objective}</p>
            <p className="mt-1 text-xs text-slate-400">Concept focus: {scenario.recommendedConcepts.join(" · ")}</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm" value={state.scenarioId} onChange={(e) => setState(initScenario(e.target.value))}>{scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <button className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-900" onClick={() => setState(advanceTurn(state))}>Advance Turn</button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-sm">
          <h3 className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-300">Key Stats</h3>
          {trackedStatKeys.map((k) => <div key={k} className="flex justify-between border-b border-slate-800 py-1"><span className="capitalize">{k}</span><strong>{Number(state[k]).toFixed(0)}</strong></div>)}
        </aside>

        <main className="space-y-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-3">
            <p className="text-sm text-slate-300">{scenario.briefing}</p>
            <div className="mt-2 flex flex-wrap gap-2">{(["micro", "macro", "global"] as GameLayer[]).map((l) => <button key={l} onClick={() => setState((s) => ({ ...s, layer: l }))} className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] ${state.layer === l ? "bg-cyan-300 text-slate-900" : "bg-slate-800 text-slate-100"}`}>{l}</button>)}</div>
          </div>

          <MapView layer={state.layer} actors={layerActors} selectedActorId={state.selectedActorId} onSelect={(id) => setState((s) => ({ ...s, selectedActorId: id }))} />

          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
            <h3 className="font-bold">Action Cards · {state.layer.toUpperCase()}</h3>
            <div className="mt-2 grid gap-2 lg:grid-cols-2">
              {layerActions.map((a) => <button key={a.id} onClick={() => toggleAction(a.id)} className={`rounded-xl border p-3 text-left transition ${state.selectedActionIds.includes(a.id) ? "border-emerald-300 bg-emerald-400/10" : "border-slate-700 hover:border-slate-500"}`}><p className="font-semibold">{a.name}</p><p className="mt-1 text-xs text-emerald-200">Upside: {a.upside}</p><p className="text-xs text-rose-200">Risk: {a.downside}</p><p className="mt-1 text-[11px] text-slate-300">{a.concept} · {a.conceptExplanation}</p></button>)}
            </div>
          </div>
        </main>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
            <h3 className="font-bold">Selected Actor</h3>
            {selected ? <><p className="mt-2">{selected.name}</p><p className="text-sm text-slate-300">{selected.currentStrategy}</p><p className={`mt-2 inline-block rounded-full border px-2 py-1 text-xs ${stressTone(selected.stress)}`}>Stress {selected.stress.toFixed(0)}</p><p className="mt-2 text-xs text-slate-400">Concept tags: {selected.conceptTags.join(" · ")}</p></> : <p className="mt-2 text-sm text-slate-400">Click a map node to inspect incentives.</p>}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
            <h3 className="font-bold">Turn Summary</h3>
            <p className="mt-2 text-sm text-slate-200">{summarizeTurn(state)}</p>
            <p className="mt-1 text-xs text-slate-400">Queued actions: {state.selectedActionIds.length} · Resolved turns: {state.history.length}</p>
            {state.endState ? <p className="mt-2 rounded border border-amber-400/70 bg-amber-500/10 px-2 py-1 text-sm text-amber-200">End State: {state.endState}</p> : null}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
            <h3 className="font-bold">Event Log</h3>
            <ul className="mt-2 space-y-2 text-sm">{state.activeEvents.map((e) => <li key={e.id} className="rounded border border-slate-800 bg-slate-950/70 p-2"><strong className="text-slate-100">{e.title}</strong><p className="text-slate-300">{e.body}</p><p className="text-[11px] text-cyan-200">{e.concept ? `Concept: ${e.concept}` : ""}</p></li>)}</ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
