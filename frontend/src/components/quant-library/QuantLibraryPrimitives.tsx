import type { ReactNode } from "react";
import type { DataFreshness, MetricExplanation } from "@/lib/api";

type Tone = "emerald" | "cyan" | "amber" | "rose" | "slate";

const toneClasses: Record<Tone, string> = {
  emerald: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
  cyan: "border-cyan-300/35 bg-cyan-300/10 text-cyan-100",
  amber: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  rose: "border-rose-300/40 bg-rose-300/10 text-rose-100",
  slate: "border-slate-700 bg-slate-950/70 text-slate-200",
};

export function RiskBadge({ label, level = "medium" }: { label: string; level?: "low" | "medium" | "high" }) {
  const tone = level === "high" ? "rose" : level === "low" ? "emerald" : "amber";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>{label}</span>;
}

export function DataFreshnessBadge({ freshness, compact = false }: { freshness?: DataFreshness | null; compact?: boolean }) {
  if (!freshness) {
    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses.slate}`}>feed unknown</span>;
  }
  const tone: Tone = freshness.status === "live" ? "emerald" : freshness.status === "fallback" ? "amber" : freshness.status === "error" ? "rose" : "slate";
  const label = freshness.status === "fallback" ? "demo data shown" : freshness.status.replace("_", " ");
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      <span>{label}</span>
      {!compact ? <span className="font-normal opacity-80">/{freshness.provider}</span> : null}
    </span>
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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">{label}</p>
      <p className="mt-3 break-words font-mono text-2xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 opacity-85">{detail}</p> : null}
      {explanation ? <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 opacity-80">{explanation.shortExplanation}</p> : null}
    </article>
  );
}

export function ExplanationPanel({
  title,
  explanation,
  why,
  caveats,
  rules,
}: {
  title: string;
  explanation?: MetricExplanation;
  why?: string;
  caveats?: string[];
  rules?: string[];
}) {
  const shortText = explanation?.shortExplanation ?? why;
  const whyText = explanation?.whyItMatters;
  const caveatItems = explanation?.caveats ?? caveats;
  const ruleItems = explanation?.interpretationRules ?? rules;

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Plain English</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{explanation?.name ?? title}</h3>
      {shortText ? <p className="mt-2 text-sm leading-6 text-slate-300">{shortText}</p> : null}
      {whyText ? <p className="mt-3 text-sm leading-6 text-slate-400">{whyText}</p> : null}
      {caveatItems?.length ? (
        <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-50">
          <span className="font-semibold">Can mislead:</span> {caveatItems[0]}
        </div>
      ) : null}
      {ruleItems?.length ? (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-400">
          {ruleItems.slice(0, 2).map((rule) => <li key={rule}>{rule}</li>)}
        </ul>
      ) : null}
    </article>
  );
}

export function DeskNote({
  kicker,
  title,
  body,
  sourceLabel,
}: {
  kicker: string;
  title: string;
  body: string;
  sourceLabel: string;
}) {
  return (
    <article className="rounded-xl border border-slate-800 bg-[#111827] p-4 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">{kicker}</p>
        <RiskBadge label={sourceLabel} level="medium" />
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-7 text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </article>
  );
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

export function ToolGeneratedStoryCard({
  headline,
  summary,
  sourceLabel,
}: {
  headline: string;
  summary: string;
  sourceLabel: string;
}) {
  return (
    <article className="rounded-xl border border-dashed border-emerald-300/35 bg-emerald-300/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Story-ready placeholder</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{headline}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{summary}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <RiskBadge label={sourceLabel} level="low" />
        <button className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 opacity-70" disabled>
          Generate story from this analysis
        </button>
      </div>
    </article>
  );
}

export function AnalysisSection({
  eyebrow,
  title,
  summary,
  what,
  why,
  caveats,
  next,
  metrics,
  children,
  story,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  what: string;
  why: string;
  caveats: string[];
  next: string[];
  metrics: ReactNode;
  children?: ReactNode;
  story: ReactNode;
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">{summary}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ExplanationPanel title="What this does" why={what} rules={[why]} caveats={caveats} />
          <ExplanationPanel title="Why it matters" why={why} rules={next} caveats={caveats.slice(1)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{metrics}</div>
        {children}
      </div>
      <aside className="space-y-5">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-white">What to investigate next</h3>
          <ol className="mt-4 space-y-3">
            {next.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-400">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-300 font-mono text-xs font-bold text-slate-950">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-white">Caveats</h3>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-400">
            {caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
          </ul>
        </article>
        {story}
      </aside>
    </section>
  );
}
