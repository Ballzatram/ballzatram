"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { actions, advanceTurn, initScenario, scenarios } from "@/lib/invisible-hands-v2/simulation";
import type { GameAction, GameLayer, GameState } from "@/lib/invisible-hands-v2/types";
import { globalPreviewEffects, globalResolvedOutcomes, globalRoutes } from "@/lib/invisible-hands-v2/data";
import { readEconProgress, recordEconProgress, type MasteryTier } from "@/lib/econ-arcade/progress";
import { EconomicMapViewport } from "./maps/EconomicMapViewport";
import { LayerZoomControls } from "./LayerZoomControls";
import { EventTicker } from "./EventTicker";
import { GlobalCommandLayout } from "./GlobalCommandLayout";

type TurnPhase = "observe" | "preview" | "resolved";
type Resolution = { actionName: string; bullets: Array<{ text: string; tone: "positive" | "negative" | "neutral" }>; nextPressure: string; tags: string[]; affectedActors: string[]; affectedRoutes: string[] };

const tierRules: Record<MasteryTier, string> = {
  bronze: "Finish the scenario with stability ≥45.",
  silver: "Finish with stability ≥60 and command all three layers.",
  gold: "Finish with stability ≥70 in a Soft Landing/Growth Boom, command all layers, and deploy two 2-action policy packages.",
};

function masteredScenarioIds() {
  const mastery = readEconProgress().games["invisible-hands"]?.mastery ?? {};
  return new Set(scenarios.filter((scenario) => mastery[`scenario:${scenario.id}`] === true).map((scenario) => scenario.id));
}

function unlockedScenarioIds(mastered: Set<string>) {
  const unlocked = new Set<string>();
  scenarios.forEach((scenario, index) => {
    if (index === 0 || mastered.has(scenarios[index - 1].id)) unlocked.add(scenario.id);
  });
  return unlocked;
}

export function InvisibleHandsPage() {
  const [state, setState] = useState<GameState>(() => ({ ...initScenario("inflation-spiral"), layer: "global" }));
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("observe");
  const [resolution, setResolution] = useState<Resolution>();
  const [targetTier, setTargetTier] = useState<MasteryTier>("bronze");
  const [visitedLayers, setVisitedLayers] = useState<Set<GameLayer>>(() => new Set(["global"]));
  const [packageTurns, setPackageTurns] = useState(0);
  const [usedActionIds, setUsedActionIds] = useState<Set<string>>(() => new Set());
  const [masteredScenarios, setMasteredScenarios] = useState<Set<string>>(() => masteredScenarioIds());
  const endingRecorded = useRef<string>();
  const attemptRecorded = useRef(false);

  const scenario = scenarios.find((item) => item.id === state.scenarioId) ?? scenarios[0];
  const unlockedScenarios = useMemo(() => unlockedScenarioIds(masteredScenarios), [masteredScenarios]);
  const layerActors = useMemo(() => state.actors.filter((actor) => actor.layer === state.layer), [state.actors, state.layer]);
  const layerActions = useMemo(() => actions.filter((action) => action.layer === state.layer), [state.layer]);
  const selectedActions = useMemo(() => layerActions.filter((action) => state.selectedActionIds.includes(action.id)), [layerActions, state.selectedActionIds]);
  const previewEffects = selectedActions.map((action) => globalPreviewEffects.find((effect) => effect.actionId === action.id)).filter(Boolean);
  const primaryPreview = previewEffects[0];

  function resetMasteryRun() {
    setVisitedLayers(new Set(["global"]));
    setPackageTurns(0);
    setUsedActionIds(new Set());
    endingRecorded.current = undefined;
    attemptRecorded.current = false;
  }

  function setLayer(layer: GameLayer) {
    setVisitedLayers((current) => new Set([...current, layer]));
    setState((current) => ({ ...current, layer, selectedActionIds: [] }));
    setTurnPhase("observe");
    setResolution(undefined);
  }

  function toggleAction(id: string) {
    setState((current) => {
      const exists = current.selectedActionIds.includes(id);
      const nextIds = exists
        ? current.selectedActionIds.filter((selectedId) => selectedId !== id)
        : current.selectedActionIds.length < 2
          ? [...current.selectedActionIds, id]
          : [current.selectedActionIds[1], id];
      setTurnPhase(nextIds.length ? "preview" : "observe");
      return { ...current, selectedActionIds: nextIds };
    });
  }

  function buildResolution(selected: GameAction[]): Resolution {
    const outcomes = selected.map((action) => globalResolvedOutcomes.find((outcome) => outcome.actionId === action.id));
    const effects = selected.map((action) => globalPreviewEffects.find((effect) => effect.actionId === action.id));
    const bullets = selected.flatMap((action, index) => outcomes[index]?.bullets ?? [
      { text: `${action.name}: ${action.upside}`, tone: "positive" as const },
      { text: `Tradeoff: ${action.downside}`, tone: "negative" as const },
    ]);
    return {
      actionName: selected.map((action, index) => outcomes[index]?.actionLabel ?? action.name).join(" + ") || "No intervention",
      bullets: bullets.length ? bullets : [{ text: "No policy action selected; scenario pressure continued.", tone: "neutral" }],
      nextPressure: outcomes.map((outcome) => outcome?.nextPressure).filter(Boolean).join(" ") || "Monitor the new actor strategies and active events before the next turn.",
      tags: Array.from(new Set(bullets.map((bullet) => bullet.tone))),
      affectedActors: Array.from(new Set(effects.flatMap((effect) => effect?.affectedActorIds ?? selected.flatMap((action) => action.affectedActors)))),
      affectedRoutes: Array.from(new Set(effects.flatMap((effect) => (effect?.affectedRouteIds ?? []).map((id) => globalRoutes.find((route) => route.id === id)?.label ?? id)))),
    };
  }

  function onAdvance() {
    const selected = [...selectedActions];
    if (!attemptRecorded.current) {
      attemptRecorded.current = true;
      recordEconProgress("invisible-hands", { outcome: `${scenario.name} · ${targetTier.toUpperCase()} started`, concepts: ["systems thinking", "policy tradeoffs", "second-order effects"], countAttempt: true });
    }
    if (selected.length === 2) setPackageTurns((value) => value + 1);
    setUsedActionIds((current) => new Set([...current, ...selected.map((action) => action.id)]));
    setState((current) => advanceTurn(current));
    setResolution(buildResolution(selected));
    setTurnPhase("resolved");
  }

  function onNextTurn() {
    setState((current) => ({ ...current, selectedActionIds: [] }));
    setTurnPhase("observe");
    setResolution(undefined);
  }

  function restart() {
    setState({ ...initScenario(state.scenarioId), layer: "global" });
    setTurnPhase("observe");
    setResolution(undefined);
    resetMasteryRun();
  }

  function changeScenario(id: string) {
    if (!unlockedScenarios.has(id)) return;
    setState({ ...initScenario(id), layer: "global" });
    setTurnPhase("observe");
    setResolution(undefined);
    resetMasteryRun();
  }

  useEffect(() => {
    if (!state.endState) return;
    const key = `${state.scenarioId}:${state.turn}:${state.endState}`;
    if (endingRecorded.current === key) return;
    endingRecorded.current = key;

    const allLayers = visitedLayers.size === 3;
    const favorable = state.endState === "Soft Landing" || state.endState === "Growth Boom";
    const bronze = state.stabilityScore >= 45;
    const silver = bronze && state.stabilityScore >= 60 && allLayers;
    const gold = silver && state.stabilityScore >= 70 && favorable && packageTurns >= 2;
    const masterySuccess = targetTier === "bronze" ? bronze : targetTier === "silver" ? silver : gold;
    const achievements = [
      ...(allLayers ? ["Systems Mapper"] : []),
      ...(packageTurns >= 1 ? ["Policy Package Engineer"] : []),
      ...(packageTurns >= 2 ? ["Second-Order Thinker"] : []),
      ...(favorable ? ["Systems Soft Landing"] : []),
      ...(usedActionIds.has("sign-trade-deal") && usedActionIds.has("retaliation-de-escalation") ? ["Trade De-escalator"] : []),
      ...(state.scenarioId === "supply-shock" && state.supplyStress < 45 ? ["Shock Absorber"] : []),
      ...(state.scenarioId === "trade-war" && state.marketVolatility < 62 ? ["Trade Stabilizer"] : []),
    ];

    recordEconProgress("invisible-hands", {
      completed: true,
      countAttempt: false,
      score: state.stabilityScore,
      outcome: `${scenario.name} · ${state.endState} · ${targetTier.toUpperCase()} ${masterySuccess ? "mastered" : "attempted"}`,
      concepts: ["systems thinking", "policy tradeoffs", "credibility", "trade retaliation", "second-order effects"],
      achievements,
      masteryTier: masterySuccess ? targetTier : undefined,
      mastery: {
        [`scenario:${state.scenarioId}`]: masterySuccess,
        [`scenario:${state.scenarioId}:stability`]: Math.round(state.stabilityScore),
        [`scenario:${state.scenarioId}:packages`]: packageTurns,
        [`scenario:${state.scenarioId}:layers`]: visitedLayers.size,
      },
    });
    if (masterySuccess) setMasteredScenarios((current) => new Set([...current, state.scenarioId]));
  }, [state.endState, state.scenarioId, state.turn, state.stabilityScore, state.supplyStress, state.marketVolatility, scenario.name, targetTier, visitedLayers, packageTurns, usedActionIds]);

  const masteryDock = <MasteryDock targetTier={targetTier} setTargetTier={setTargetTier} visitedLayers={visitedLayers} packageTurns={packageTurns} state={state} mastered={masteredScenarios} unlocked={unlockedScenarios} onScenario={changeScenario} />;

  if (state.layer !== "global") {
    return <>
      {masteryDock}
      <LayerCommandView state={state} scenarioName={scenario.name} scenarioObjective={scenario.objective} actors={layerActors} actions={layerActions} selectedActions={selectedActions} turnPhase={turnPhase} resolution={resolution} onToggleAction={toggleAction} onAdvance={onAdvance} onNextTurn={onNextTurn} onSetLayer={setLayer} onRestart={restart} onChangeScenario={changeScenario} unlockedScenarios={unlockedScenarios} />
    </>;
  }

  return <>
    {masteryDock}
    <GlobalCommandLayout state={state} scenarioName={scenario.name} actions={layerActions} selectedActions={selectedActions} turnPhase={turnPhase} onToggleAction={toggleAction} onAdvance={onAdvance} onNextTurn={onNextTurn} onSetLayer={setLayer} onRestart={restart} resolution={resolution}>
      <div className="relative overflow-hidden rounded border border-cyan-300/35 bg-[#07152a]"><EconomicMapViewport layer={state.layer} actors={layerActors} previewEffect={primaryPreview} selectedActorId={state.selectedActorId} turnPhase={turnPhase} onSelect={(id)=>setState((current)=>({...current,selectedActorId:id}))} /><LayerZoomControls layer={state.layer} setLayer={setLayer} /><EventTicker events={state.activeEvents} pending={previewEffects.flatMap((effect)=>effect?.pendingEvents ?? [])} turnPhase={turnPhase} resolved={resolution?.bullets.map((bullet)=>bullet.text)} /></div>
    </GlobalCommandLayout>
    {state.endState ? <CampaignEnding state={state} scenarioObjective={scenario.objective} onRestart={restart} onChangeScenario={changeScenario} unlockedScenarios={unlockedScenarios} targetTier={targetTier} visitedLayers={visitedLayers.size} packageTurns={packageTurns} /> : null}
  </>;
}

function MasteryDock({ targetTier, setTargetTier, visitedLayers, packageTurns, state, mastered, unlocked, onScenario }: { targetTier: MasteryTier; setTargetTier:(tier:MasteryTier)=>void; visitedLayers:Set<GameLayer>; packageTurns:number; state:GameState; mastered:Set<string>; unlocked:Set<string>; onScenario:(id:string)=>void }) {
  return <section className="sticky top-0 z-40 border-b border-amber-300/20 bg-slate-950/95 px-4 py-3 text-slate-100 backdrop-blur"><div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3 text-xs"><strong className="uppercase tracking-[.18em] text-amber-200">Capstone mastery</strong>{(["bronze","silver","gold"] as MasteryTier[]).map((tier)=><button key={tier} onClick={()=>setTargetTier(tier)} className={`rounded-full border px-3 py-1 font-bold uppercase ${targetTier===tier?"border-amber-200 bg-amber-300/15 text-amber-100":"border-slate-700 text-slate-400"}`}>{tier}</button>)}<span className="text-slate-400">{tierRules[targetTier]}</span><span className="ml-auto text-cyan-200">Layers {visitedLayers.size}/3 · packages {packageTurns} · stability {state.stabilityScore.toFixed(0)}</span><select value={state.scenarioId} onChange={(event)=>onScenario(event.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white">{scenarios.map((scenario)=><option key={scenario.id} value={scenario.id} disabled={!unlocked.has(scenario.id)}>{mastered.has(scenario.id)?"✓ ":unlocked.has(scenario.id)?"":"🔒 "}{scenario.name}</option>)}</select></div></section>;
}

function LayerCommandView({ state, scenarioName, scenarioObjective, actors, actions: layerActions, selectedActions, turnPhase, resolution, onToggleAction, onAdvance, onNextTurn, onSetLayer, onRestart, onChangeScenario, unlockedScenarios }: { state: GameState; scenarioName: string; scenarioObjective: string; actors: GameState["actors"]; actions: GameAction[]; selectedActions: GameAction[]; turnPhase: TurnPhase; resolution?: Resolution; onToggleAction:(id:string)=>void; onAdvance:()=>void; onNextTurn:()=>void; onSetLayer:(layer:GameLayer)=>void; onRestart:()=>void; onChangeScenario:(id:string)=>void; unlockedScenarios:Set<string> }) {
  const selectedIds = new Set(selectedActions.map((action) => action.id));
  return <section className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6"><div className="mx-auto max-w-7xl space-y-4"><header className="rounded-2xl border border-cyan-300/30 bg-[#0a1b32] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">Invisible Hands · {state.layer} command</p><h1 className="mt-2 text-3xl font-bold">{scenarioName}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{scenarioObjective}</p></div><div className="text-right text-sm text-slate-300"><p>Turn {state.turn}</p><p>Stability {state.stabilityScore.toFixed(0)}/100</p></div></div><div className="mt-4 flex flex-wrap gap-2">{(["micro","macro","global"] as GameLayer[]).map((layer)=><button key={layer} onClick={()=>onSetLayer(layer)} className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${state.layer===layer?"border-cyan-200 bg-cyan-300/15":"border-slate-700"}`}>{layer}</button>)}<button onClick={onRestart} className="ml-auto rounded-full border border-amber-300/40 px-3 py-1 text-xs text-amber-100">Restart</button></div></header><div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><div className="overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#07152a]"><EconomicMapViewport layer={state.layer} actors={actors} selectedActorId={state.selectedActorId} onSelect={()=>{}} /></div><aside className="space-y-4"><article className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="flex justify-between"><h2 className="font-semibold">Policy actions</h2><span className="text-xs text-amber-200">{selectedActions.length}/2 package</span></div><div className="mt-3 space-y-2">{layerActions.map((action)=><button key={action.id} onClick={()=>onToggleAction(action.id)} className={`w-full rounded-xl border p-3 text-left ${selectedIds.has(action.id)?"border-amber-300 bg-amber-300/10":"border-slate-700 bg-slate-950/60"}`}><span className="font-semibold">{action.name}</span><span className="mt-1 block text-xs text-emerald-200">Upside: {action.upside}</span><span className="mt-1 block text-xs text-rose-200">Cost: {action.downside}</span></button>)}</div><button onClick={turnPhase==="resolved"?onNextTurn:onAdvance} disabled={Boolean(state.endState)} className="mt-4 w-full rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{state.endState?"Campaign complete":turnPhase==="resolved"?"Next turn":"Commit policy package"}</button></article>{resolution?<article className="rounded-2xl border border-cyan-300/25 bg-[#0a1b32] p-4"><h2 className="font-semibold">Turn report</h2><p className="mt-2 text-sm text-cyan-100">{resolution.actionName}</p>{resolution.bullets.map((bullet)=><p key={bullet.text} className="mt-2 text-xs text-slate-300">• {bullet.text}</p>)}</article>:null}</aside></div>{state.endState ? <CampaignEnding state={state} scenarioObjective={scenarioObjective} onRestart={onRestart} onChangeScenario={onChangeScenario} unlockedScenarios={unlockedScenarios} targetTier="bronze" visitedLayers={0} packageTurns={0} /> : null}</div></section>;
}

function CampaignEnding({ state, scenarioObjective, onRestart, onChangeScenario, unlockedScenarios, targetTier, visitedLayers, packageTurns }: { state: GameState; scenarioObjective: string; onRestart:()=>void; onChangeScenario:(id:string)=>void; unlockedScenarios:Set<string>; targetTier:MasteryTier; visitedLayers:number; packageTurns:number }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"><article className="w-full max-w-xl rounded-3xl border border-emerald-300/30 bg-slate-900 p-6 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">Campaign resolution</p><h2 className="mt-2 text-3xl font-bold text-white">{state.endState}</h2><p className="mt-3 text-sm leading-6 text-slate-300">Objective: {scenarioObjective}</p><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Score label="Stability" value={state.stabilityScore}/><Score label="Inflation" value={state.inflation}/><Score label="Output" value={state.output}/><Score label="Confidence" value={state.publicConfidence}/></div><p className="mt-4 text-sm text-slate-400">Target {targetTier.toUpperCase()} · layers {visitedLayers}/3 · two-action packages {packageTurns}. The mastery dock records whether this run unlocked the next crisis.</p><div className="mt-5 flex flex-wrap gap-2"><button onClick={onRestart} className="rounded-xl bg-emerald-300 px-4 py-2 font-semibold text-slate-950">Replay scenario</button><select onChange={(event)=>onChangeScenario(event.target.value)} value={state.scenarioId} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">{scenarios.map((scenario)=><option key={scenario.id} value={scenario.id} disabled={!unlockedScenarios.has(scenario.id)}>{scenario.name}</option>)}</select></div></article></div>;
}

function Score({ label, value }: { label:string; value:number }) { return <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value.toFixed(0)}</p></div>; }
