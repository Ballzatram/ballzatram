"use client";

import { useMemo, useState } from "react";
import {
  applyConsequence,
  bullshitSimulatorScenes,
  initialNarrativeState,
  type Choice,
  type NarrativeStats,
} from "@/lib/bullshit-simulator/narrative";
import { StoneyQuote, StoneyStatusLine } from "@/components/stoney/StoneyPrimitives";

const statLabels: Record<keyof NarrativeStats, string> = {
  confidence: "Confidence",
  credibility: "Credibility",
  bullshitLevel: "Bullshit Level",
  snackInventory: "Snack Inventory",
};

function statTone(stat: keyof NarrativeStats, value: number) {
  if (stat === "snackInventory") return "bg-[#ead9ad]";
  if (stat === "credibility" && value >= 50) return "bg-[#cde7d0]";
  if (stat === "bullshitLevel" && value >= 70) return "bg-[#e7c4aa]";
  if (value >= 70) return "bg-[#f2d27a]";
  return "bg-[#f7edcf]";
}

function StatRail({ stats }: { stats: NarrativeStats }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Stoney stats">
      {(Object.keys(stats) as Array<keyof NarrativeStats>).map((stat) => (
        <article key={stat} className={`border border-[#2b1b10] p-3 ${statTone(stat, stats[stat])}`}>
          <p className="font-mono text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#7a5730]">
            {statLabels[stat]}
          </p>
          <p className="mt-2 font-mono text-3xl font-black text-[#1b1109]">{stats[stat]}</p>
        </article>
      ))}
    </section>
  );
}

function ChoiceButton({ choice, onChoose }: { choice: Choice; onChoose: (choice: Choice) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChoose(choice)}
      className="grid w-full gap-2 border border-[#2b1b10] bg-[#f7edcf] p-4 text-left text-[#24150b] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f1d1d]"
    >
      <span className="font-serif text-xl font-black leading-6">{choice.label}</span>
      <span className="text-sm leading-6 text-[#4b2b16]">{choice.description}</span>
    </button>
  );
}

export function BullshitSimulatorPrototype() {
  const [state, setState] = useState(initialNarrativeState);
  const scene = bullshitSimulatorScenes[state.sceneId] ?? bullshitSimulatorScenes.title;
  const visitedCount = useMemo(() => state.visitedSceneIds.length, [state.visitedSceneIds]);

  function choose(choice: Choice) {
    setState((current) => applyConsequence(current, choice.consequence));
  }

  function reset() {
    setState(initialNarrativeState);
  }

  return (
    <div className="grid gap-6">
      <section className="border border-[#2b1b10] bg-[#24150b] p-5 text-[#f4e7c8]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#e3bd72]">
            Playable prototype / First Stoney arc
          </p>
          <button
            type="button"
            onClick={reset}
            className="border border-[#e3bd72] px-3 py-2 font-mono text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#f4e7c8] hover:bg-[#e3bd72] hover:text-[#24150b]"
          >
            Reset broadcast
          </button>
        </div>
        <h1 className="mt-4 font-serif text-[clamp(3rem,8vw,6.6rem)] font-black leading-[0.84] tracking-normal text-[#fff7df]">
          Bullshit Simulator
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-xl font-bold leading-8 text-[#e9d29f]">
          South Gate Mall is under siege. The Orange Julius has fallen. Stoney is live on the scene for reasons no one approved.
        </p>
      </section>

      <StatRail stats={state.stats} />

      {state.lastConsequence ? (
        <StoneyStatusLine label="Last broadcast correction" line={state.lastConsequence} tone="amber" />
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <article className="border border-[#2b1b10] bg-[#f7edcf] p-5">
          <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
            {scene.location}
          </p>
          <h2 className="mt-2 font-serif text-4xl font-black leading-none text-[#1b1109]">{scene.title}</h2>
          <div className="mt-5 grid gap-3 text-base leading-7 text-[#3a2312]">
            {scene.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>

        <aside className="grid content-start gap-4">
          <StoneyQuote quote="I refuse to panic until I have fully monetized the confusion." tone="paper" />
          <article className="border border-[#2b1b10] bg-[#ead9ad] p-4">
            <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
              Prototype meter
            </p>
            <p className="mt-2 text-sm leading-6 text-[#4b2b16]">
              Scenes visited: {visitedCount}. No save system, no backend, no auth. Just mall panic and structured nonsense.
            </p>
          </article>
        </aside>
      </section>

      <section className="grid gap-3" aria-label="Choices">
        <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7a5730]">
          Choose Stoney's next layer of bullshit
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {scene.choices.map((choice) => (
            <ChoiceButton key={choice.id} choice={choice} onChoose={choose} />
          ))}
        </div>
      </section>
    </div>
  );
}
