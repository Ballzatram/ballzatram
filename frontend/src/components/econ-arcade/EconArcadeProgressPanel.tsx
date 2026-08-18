"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import {
  earnedAchievements,
  gameStatus,
  masteredConcepts,
  readEconProgress,
  recordEconProgress,
  type EconProgressStore,
} from "@/lib/econ-arcade/progress";

const mission = [
  { id: "supply-demand-lab", title: "1. Supply & Demand Challenge", route: "/econ-arcade/supply-demand-lab", concepts: ["equilibrium", "surplus", "deadweight loss"] },
  { id: "prisoners-dilemma-arena", title: "2. Prisoner’s Dilemma", route: "/legacy-econ-arcade/prisoners-dilemma.html", concepts: ["repeated games", "cooperation", "retaliation"] },
  { id: "central-bank-simulator", title: "3. Central Banker", route: "/games/central-bank.html", concepts: ["inflation targeting", "policy lags", "credibility"] },
  { id: "invisible-hands", title: "4. Invisible Hands", route: "/econ-arcade/invisible-hands", concepts: ["systems thinking", "second-order effects", "trade retaliation"] },
] as const;

function migrateLegacyProgress() {
  const store = readEconProgress();
  if (!store.games["central-bank-simulator"]) {
    try {
      const runs = JSON.parse(localStorage.getItem("centralBankRecentRunsV3") || "[]") as Array<{ score?: number; ending?: string }>;
      if (runs.length) recordEconProgress("central-bank-simulator", { completed: true, countAttempt: false, score: runs[0]?.score, outcome: runs[0]?.ending || "Completed term", concepts: ["inflation targeting", "policy lags", "credibility", "financial stability"] });
    } catch { /* ignore stale legacy storage */ }
  }
  if (!store.games["prisoners-dilemma-arena"] && localStorage.getItem("pd-seed-v3")) {
    recordEconProgress("prisoners-dilemma-arena", { countAttempt: false, outcome: "V3 match opened", concepts: ["repeated games", "cooperation", "retaliation", "continuation value"] });
  }
}

export function EconArcadeProgressPanel() {
  const [progress, setProgress] = useState<EconProgressStore>({ version: 1, games: {} });

  useEffect(() => {
    migrateLegacyProgress();
    const refresh = () => setProgress(readEconProgress());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ballzatram:econ-progress", refresh as EventListener);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ballzatram:econ-progress", refresh as EventListener);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const completedCount = mission.filter((item) => gameStatus(progress, item.id) === "completed").length;
  const next = mission.find((item) => gameStatus(progress, item.id) !== "completed") ?? mission[mission.length - 1];
  const concepts = useMemo(() => masteredConcepts(progress), [progress]);
  const achievements = useMemo(() => earnedAchievements(progress), [progress]);
  const tierCount = mission.filter((item) => progress.games[item.id]?.masteryTier).length;

  return (
    <section className="rounded-3xl border border-emerald-300/25 bg-[linear-gradient(135deg,rgba(6,78,59,.22),rgba(15,23,42,.96),rgba(8,47,73,.2))] p-5 shadow-xl shadow-black/30 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Your Econ Arcade campaign · local progress</p>
          <h2 className="mt-2 text-3xl font-black text-white">{completedCount}/4 core missions complete</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Completion gets you through the campaign. Mastery tiers and achievements show how deeply you understand the mechanics after the first clear.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-center text-xs font-bold uppercase tracking-[.14em] text-amber-100">{tierCount} mastery tier{tierCount===1?"":"s"} earned</div>
          <Link href={next.route as Route} className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950">Play next: {next.title.replace(/^\d+\.\s*/, "")}</Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {mission.map((item) => {
          const status = gameStatus(progress, item.id);
          const record = progress.games[item.id];
          return (
            <Link key={item.id} href={item.route as Route} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${status === "completed" ? "border-emerald-300/40 bg-emerald-300/10" : status === "attempted" ? "border-amber-300/35 bg-amber-300/10" : "border-slate-700 bg-slate-950/60"}`}>
              <div className="flex items-start justify-between gap-2"><h3 className="font-bold text-white">{item.title}</h3><span className="rounded-full border border-current/25 px-2 py-1 text-[.62rem] font-bold uppercase text-slate-300">{record?.masteryTier ? `${record.masteryTier} · ${status}` : status}</span></div>
              <p className="mt-3 text-xs leading-5 text-slate-400">{item.concepts.join(" · ")}</p>
              {record?.lastOutcome ? <p className="mt-3 text-xs text-slate-300">Last: {record.lastOutcome}{record.bestScore != null ? ` · best ${Math.round(record.bestScore)}` : ""}</p> : null}
              {record?.achievements?.length ? <p className="mt-2 text-xs text-amber-100">🏅 {record.achievements.slice(-2).join(" · ")}</p> : null}
            </Link>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Concept mastery</p><div className="mt-3 flex flex-wrap gap-2">{concepts.length ? concepts.map((concept) => <span key={concept} className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-xs text-cyan-50">{concept}</span>) : <span className="text-sm text-slate-400">Attempt a core game to start building concept badges.</span>}</div></div>
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Achievements</p><div className="mt-3 flex flex-wrap gap-2">{achievements.length ? achievements.map((achievement) => <span key={achievement} className="rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-xs text-amber-50">🏅 {achievement}</span>) : <span className="text-sm text-slate-400">Clear mastery conditions to earn achievement badges.</span>}</div></div>
      </div>
    </section>
  );
}
