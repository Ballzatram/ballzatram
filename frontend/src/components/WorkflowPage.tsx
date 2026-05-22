import { AssumptionPanel, MiniChart } from "@/components/WorkflowPanels";
import type { Workflow } from "@/lib/workflows";

export function WorkflowPage({ workflow }: { workflow: Workflow }) {
  const intakeFields = [
    ["Goal", `What decision should ${workflow.navLabel.toLowerCase()} support?`],
    ["Inputs", "Which dataset, ticker, scenario, or assumption set should be trusted?"],
    ["Constraint", "What risk limit, horizon, or caveat should shape the output?"],
  ];
  const outputCards = [
    ["Recommendation", "What the workflow suggests and why it is not automatic advice."],
    ["Evidence", "The metrics, chart movement, or model signal supporting the view."],
    ["Caveat", "The assumption, missing data, or model risk that could change the result."],
    ["Next step", "The most useful follow-up action before exporting or sharing."],
  ];

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

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Guided intake</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Start with a decision, not a blank prompt</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The workshop guide uses these intake points to ask sharper questions before producing structured output.
          </p>
          <div className="mt-4 grid gap-3">
            {intakeFields.map(([label, copy]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-200">{copy}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Output contract</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Every useful answer becomes a card stack</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {outputCards.map(([title, copy]) => (
              <div key={title} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{copy}</p>
              </div>
            ))}
          </div>
        </article>
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
                <p className="text-sm font-semibold text-emerald-200">{String(index + 1).padStart(2, "0")} - {action.label}</p>
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
                <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xs text-emerald-200">OK</span>
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

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        {/* TODO: Connect these placeholders to saved runs, report exports, and future entitlement checks after monetization design is ready. */}
        <button className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300" disabled>
          Save run
        </button>
        <button className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300" disabled>
          Export report
        </button>
        <button className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300" disabled>
          Share workspace
        </button>
        <span className="text-xs text-slate-500">Placeholders only. No payment gate.</span>
      </div>
    </section>
  );
}
