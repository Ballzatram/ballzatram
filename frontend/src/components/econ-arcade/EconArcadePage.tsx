import Link from "next/link";
import type { Route } from "next";
import { arcadeModules, curriculumPhases } from "@/lib/econ-arcade/curriculum";

function statusTone(status: string) {
  if (status === "available" || status === "unlocked") return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100";
  if (status === "capstone" || status === "teaser") return "border-cyan-300/40 bg-cyan-300/10 text-cyan-100";
  return "border-slate-700 bg-slate-950/70 text-slate-400";
}

export function EconArcadePage() {
  const unlockedModules = arcadeModules.filter((module) => module.status === "unlocked").length;
  const totalProgress = Math.round(curriculumPhases.reduce((sum, phase) => sum + phase.progress, 0) / curriculumPhases.length);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.2),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_28%),linear-gradient(135deg,#020617,#0f172a_52%,#172554)] p-5 shadow-2xl shadow-black/40 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.35em] text-emerald-300">Econ Arcade // learning command deck</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">Learn economics by playing the system.</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              Econ Arcade turns economics into focused games, simulations, and strategic decision-making drills. Start with isolated concepts, then combine them in increasingly unstable worlds.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={"/econ-arcade/supply-demand-lab" as Route}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-200 bg-emerald-300 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                Start Learning Path
              </Link>
              <a
                href="#modules"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-300/50 px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-100"
              >
                View Modules
              </a>
            </div>
          </div>
          <aside className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl shadow-black/30">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">Path telemetry</p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                <p className="text-sm text-emerald-100">Overall progress</p>
                <p className="mt-2 font-mono text-4xl font-black text-white">{totalProgress}%</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-300" style={{ width: `${totalProgress}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Unlocked</p>
                  <p className="mt-2 font-mono text-3xl font-black text-white">{unlockedModules}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Phases</p>
                  <p className="mt-2 font-mono text-3xl font-black text-white">6</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <section aria-labelledby="phase-heading" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Curriculum map</p>
            <h2 id="phase-heading" className="mt-2 text-2xl font-black text-white sm:text-3xl">Six phases from market basics to system collapse prevention</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">Static progress for now; designed so future modules can unlock Central Bank Simulator, Signal vs Noise, Prisoner’s Dilemma Arena, Tariff Lab, and Invisible Hands.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {curriculumPhases.map((phase) => (
            <article key={phase.id} className={`rounded-2xl border p-5 shadow-lg shadow-black/20 ${statusTone(phase.status)}`}>
              <p className="font-mono text-xs font-black uppercase tracking-[0.24em] opacity-80">{phase.phase}</p>
              <h3 className="mt-3 text-xl font-black text-white">{phase.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{phase.focus}</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-900/80">
                <div className="h-full rounded-full bg-current" style={{ width: `${phase.progress}%` }} />
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] opacity-80">{phase.status === "locked" ? "Locked" : `${phase.progress}% mapped`}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="modules" aria-labelledby="module-heading" className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Module bay</p>
        <h2 id="module-heading" className="text-2xl font-black text-white sm:text-3xl">Playable and planned modules</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {arcadeModules.map((module) => {
            const card = (
              <article className={`flex h-full flex-col rounded-2xl border p-5 shadow-lg shadow-black/20 transition ${statusTone(module.status)} ${module.route ? "hover:-translate-y-0.5 hover:border-emerald-200" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-black text-white">{module.title}</h3>
                  <span className="rounded-full border border-current/30 px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em]">{module.status}</span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-300">{module.summary}</p>
                <div className="mt-5 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span>{module.difficulty}</span>
                  <span>{module.route ? "Launch ↗" : "Queued"}</span>
                </div>
              </article>
            );

            return module.route ? (
              <Link key={module.id} href={module.route as Route} className="block focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950">
                {card}
              </Link>
            ) : (
              <div key={module.id}>{card}</div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 p-6 shadow-xl shadow-black/30">
          <p className="font-mono text-xs font-black uppercase tracking-[0.3em] text-cyan-200">Final capstone teaser</p>
          <h2 className="mt-3 text-3xl font-black text-white">Invisible Hands</h2>
          <p className="mt-4 text-base leading-7 text-slate-200">
            Invisible Hands is the capstone systems simulator where micro, macro, markets, central banking, trade policy, game theory, and global strategy collide. The player tries to keep an economy from crashing while AI-like agents respond strategically.
          </p>
          <Link href={"/invisible-hands" as Route} className="mt-5 inline-flex rounded-full border border-cyan-200 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-cyan-100 hover:bg-cyan-200 hover:text-slate-950">
            Preview current simulator
          </Link>
        </article>
        <article className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 shadow-xl shadow-black/30">
          <p className="font-mono text-xs font-black uppercase tracking-[0.3em] text-amber-200">Future scenario</p>
          <h2 className="mt-3 text-3xl font-black text-white">Trade War</h2>
          <p className="mt-4 text-base leading-7 text-slate-200">
            Trade War is planned as a future Invisible Hands scenario, not the whole game: tariffs, retaliation, supply chains, voters, and rival economies all push back.
          </p>
        </article>
      </section>
    </section>
  );
}
