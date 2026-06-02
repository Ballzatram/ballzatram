import type { ReactNode } from "react";
import type { DataFreshness, MetricExplanation } from "@/lib/api";

export type Tone = "emerald" | "cyan" | "amber" | "rose" | "slate";

const toneClasses: Record<Tone, string> = {
  emerald: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
  cyan: "border-cyan-300/35 bg-cyan-300/10 text-cyan-100",
  amber: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  rose: "border-rose-300/40 bg-rose-300/10 text-rose-100",
  slate: "border-slate-700 bg-slate-950/70 text-slate-200",
};

function freshnessLabel(status: DataFreshness["status"]) {
  if (status === "fallback") return "demo";
  return status.replace("_", " ");
}

function freshnessTone(status: DataFreshness["status"] | undefined): Tone {
  if (status === "live") return "emerald";
  if (status === "demo" || status === "fallback" || status === "cached" || status === "stale") return "amber";
  if (status === "error" || status === "missing") return "rose";
  return "slate";
}

export function StatusBadge({ label, tone = "slate" }: { label: string; tone?: Tone }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>{label}</span>;
}

export function DataFreshnessBadge({ freshness, compact = false }: { freshness?: DataFreshness | null; compact?: boolean }) {
  if (!freshness) return <StatusBadge label="feed unknown" />;
  const tone = freshnessTone(freshness.status);
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      <span>{freshnessLabel(freshness.status)}</span>
      {!compact ? <span className="font-normal opacity-80">/{freshness.provider}</span> : null}
    </span>
  );
}

export function ResearchQuestionHeader({
  title,
  question,
  summary,
  freshness,
  children,
}: {
  title: string;
  question: string;
  summary: string;
  freshness?: DataFreshness | null;
  children?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b111a]">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="p-5 sm:p-7">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Quant Library research workstation</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">{question}</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{summary}</p>
        </div>
        <aside className="border-t border-slate-800 bg-slate-950/70 p-5 xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Data status</p>
            <DataFreshnessBadge freshness={freshness} />
          </div>
          {children}
        </aside>
      </div>
    </section>
  );
}

export function CurrentStateCard({
  label,
  summary,
  drivers,
}: {
  label: string;
  summary: string;
  drivers: string[];
}) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Current state</p>
      <h2 className="mt-2 text-xl font-semibold text-white">{label}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{summary}</p>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-400">
        {drivers.map((driver) => <li key={driver}>{driver}</li>)}
      </ul>
    </article>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "slate",
  explanation,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: Tone;
  explanation?: MetricExplanation;
}) {
  return (
    <article className={`min-h-32 rounded-xl border p-4 ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">{label}</p>
      <p className="mt-3 break-words font-mono text-2xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 opacity-85">{detail}</p> : null}
      {explanation ? <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 opacity-80">{explanation.shortExplanation}</p> : null}
    </article>
  );
}

export function RegimeBadge({ label, score, reasons }: { label: string; score: number; reasons: string[] }) {
  const tone: Tone = score >= 65 ? "emerald" : score <= 35 ? "rose" : "amber";
  return (
    <article className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">Regime</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{label}</h3>
        </div>
        <span className="font-mono text-2xl font-semibold text-white">{score.toFixed(0)}</span>
      </div>
      <p className="mt-3 text-sm leading-6 opacity-85">{reasons[0] ?? "Inputs are mixed or near neutral thresholds."}</p>
      <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 opacity-75">Descriptive sample label, not a forecast.</p>
    </article>
  );
}

export function MethodNote({ explanation, minimumData }: { explanation?: MetricExplanation; minimumData?: string }) {
  if (!explanation) return null;
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Method note</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{explanation.name}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{explanation.shortExplanation}</p>
      <p className="mt-3 text-sm leading-6 text-slate-400">{explanation.whyItMatters}</p>
      {minimumData ? <p className="mt-3 text-xs leading-5 text-slate-500">Minimum data: {minimumData}</p> : null}
    </article>
  );
}

export function InterpretationPanel({
  observations,
  interpretation,
  uncertainty,
}: {
  observations: string[];
  interpretation: string;
  uncertainty: string;
}) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Interpretation</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
        {observations.map((observation) => <li key={observation}>{observation}</li>)}
      </ul>
      <p className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-50">{interpretation}</p>
      <p className="mt-3 text-sm leading-6 text-slate-400">{uncertainty}</p>
    </article>
  );
}

export function CaveatPanel({ caveats }: { caveats: string[] }) {
  return (
    <article className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-amber-50">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">Caveats</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
      </ul>
    </article>
  );
}

export function HowToReadPanel({ steps }: { steps: string[] }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">How to read this page</h3>
      <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
        {steps.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
      </ol>
    </article>
  );
}

export function NextChecksPanel({ checks }: { checks: string[] }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">What to check next</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
        {checks.map((check) => <li key={check}>{check}</li>)}
      </ul>
    </article>
  );
}

export function SourceQualityPanel({ freshness, errors }: { freshness?: DataFreshness | null; errors?: Array<{ scope: string; message: string; provider: string }> }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Source quality</h3>
        <DataFreshnessBadge freshness={freshness} compact />
      </div>
      <dl className="mt-4 grid gap-2 text-sm text-slate-400">
        <div className="flex justify-between gap-4"><dt>Provider</dt><dd className="text-right text-slate-100">{freshness?.provider ?? "unknown"}</dd></div>
        <div className="flex justify-between gap-4"><dt>Source</dt><dd className="text-right text-slate-100">{freshness?.source ?? "not reported"}</dd></div>
        <div className="flex justify-between gap-4"><dt>Data as of</dt><dd className="text-right text-slate-100">{freshness?.as_of ?? "not reported"}</dd></div>
      </dl>
      {freshness?.warnings?.length ? <p className="mt-4 text-xs leading-5 text-amber-100">{freshness.warnings[0]}</p> : null}
      {errors?.length ? <p className="mt-3 text-xs leading-5 text-rose-100">{errors.length} provider issue(s) were reported in this run.</p> : null}
    </article>
  );
}

export function ScenarioControlPanel({
  controls,
  onChange,
}: {
  controls: Array<{ id: string; label: string; value: number; min: number; max: number; step: number; unit: string }>;
  onChange: (id: string, value: number) => void;
}) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Scenario shocks</h3>
      <div className="mt-4 grid gap-4">
        {controls.map((control) => (
          <label key={control.id} className="grid gap-2 text-sm text-slate-300">
            <span className="flex items-center justify-between gap-3">
              <span>{control.label}</span>
              <span className="font-mono text-slate-100">{control.value.toFixed(2)}{control.unit}</span>
            </span>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={control.value}
              onChange={(event) => onChange(control.id, Number(event.target.value))}
              className="w-full accent-cyan-300"
            />
          </label>
        ))}
      </div>
    </article>
  );
}

export function AnomalyTable({ rows }: { rows: Array<{ id: string; metric: string; value: string; reason: string; severity: Tone }> }) {
  if (!rows.length) return <EmptyState title="No anomaly flags in the current sample" message="This means the simple screen did not find values far from its configured thresholds. It does not prove the market is calm." />;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-4">
        <h3 className="text-lg font-semibold text-white">Anomaly flags</h3>
        <p className="mt-1 text-sm text-slate-400">Flags mean worth investigating; they are not trading instructions.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr><th className="p-3">Metric</th><th className="p-3">Value</th><th className="p-3">Reason</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="p-3 font-semibold text-white">{row.metric}</td>
                <td className="p-3 font-mono">{row.value}</td>
                <td className="p-3">{row.reason}</td>
                <td className="p-3"><StatusBadge label="review" tone={row.severity} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ResearchNoteCard({
  title,
  observations,
  caveats,
  sources,
}: {
  title: string;
  observations: string[];
  caveats: string[];
  sources: string[];
}) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Research note draft</p>
      <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
        {observations.map((observation) => <li key={observation}>{observation}</li>)}
      </ul>
      <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-50">{caveats[0]}</div>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">Sources: {sources.join(", ")}</p>
    </article>
  );
}

export function LoadingState({ message }: { message: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">{message}</div>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-5">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-xl border border-rose-300/40 bg-rose-300/10 p-4 text-sm leading-6 text-rose-100">{message}</div>;
}
