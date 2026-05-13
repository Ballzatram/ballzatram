import { AssumptionPanel, MiniChart } from "@/components/WorkflowPanels";
import type { Workflow } from "@/lib/workflows";

export function WorkflowPage({ workflow }: { workflow: Workflow }) {
  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-5 shadow-2xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">{workflow.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">{workflow.title}</h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">{workflow.description}</p>
          </div>
          <span className="w-fit rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
            {workflow.badge}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {workflow.metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
            <p className="mt-3 text-3xl font-bold text-white">{metric.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{metric.sub}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        <MiniChart data={workflow.chart} />
        <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
          <h2 className="text-xl font-semibold text-white">Next best actions</h2>
          <div className="mt-4 space-y-3">
            {workflow.actions.map((action, index) => (
              <div key={action.label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold text-emerald-200">{String(index + 1).padStart(2, "0")} · {action.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{action.detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold text-white">Professional review checklist</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            {workflow.checklist.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xs text-emerald-200">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-5">
          <h2 className="text-xl font-semibold text-white">Empty state behavior</h2>
          <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">
            {workflow.emptyState}
          </p>
          <div className="mt-4">
            <AssumptionPanel />
          </div>
        </article>
      </div>
    </section>
  );
}
