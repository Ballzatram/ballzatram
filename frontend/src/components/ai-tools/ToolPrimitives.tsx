"use client";

import type { ToolCard, ToolOutput, ToolRisk, ToolSource } from "@/lib/toolOutput";

type IntakeQuestion = {
  id: string;
  question: string;
  why?: string;
  placeholder?: string;
};

type IntakePanelProps = {
  prompt: string;
  assumptionsText: string;
  questions: IntakeQuestion[];
  answers: Record<string, string>;
  busy?: boolean;
  error?: string | null;
  onPromptChange: (value: string) => void;
  onAssumptionsChange: (value: string) => void;
  onAnswerChange: (id: string, value: string) => void;
  onClarify: () => void;
  onGenerate: () => void;
};

const typeLabels: Record<ToolCard["type"], string> = {
  opportunity: "Opportunity",
  risk: "Risk",
  recommendation: "Recommendation",
  data: "Data",
  next_step: "Next step",
};

const confidenceTone: Record<string, string> = {
  high: "border-emerald-300/50 bg-emerald-300/10 text-emerald-100",
  medium: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
  low: "border-amber-300/50 bg-amber-300/10 text-amber-100",
};

function Badge({ children, tone = "medium" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${confidenceTone[tone] ?? confidenceTone.medium}`}>{children}</span>;
}

function formatMetric(value: string | number) {
  if (typeof value === "number") {
    const abs = Math.abs(value);
    if (abs <= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value;
}

export function AIIntakePanel({
  prompt,
  assumptionsText,
  questions,
  answers,
  busy,
  error,
  onPromptChange,
  onAssumptionsChange,
  onAnswerChange,
  onClarify,
  onGenerate,
}: IntakePanelProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20" aria-label="AI intake">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Guided intake</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Tell MacroBoard what decision this should support</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          The workflow asks clarifying questions first, then turns the answers into structured research cards with caveats and next actions.
        </p>
      </div>

      <label className="block text-sm font-medium text-slate-200">
        Research prompt
        <textarea
          className="mt-2 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="Example: Should I reduce SPY exposure if rates stay higher for the next two quarters?"
        />
      </label>

      <label className="block text-sm font-medium text-slate-200">
        Assumption controls
        <textarea
          className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-300"
          value={assumptionsText}
          onChange={(event) => onAssumptionsChange(event.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-full border border-emerald-300/60 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200 disabled:opacity-50"
          onClick={onClarify}
          disabled={busy}
        >
          Ask clarifying questions
        </button>
        <button
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
          onClick={onGenerate}
          disabled={busy || !prompt.trim()}
        >
          Generate research workspace
        </button>
      </div>

      {error ? <ErrorState message={error} /> : null}

      {questions.length ? (
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <p className="text-sm font-semibold text-white">Clarifying questions</p>
          {questions.map((question) => (
            <label key={question.id} className="block rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
              <span className="font-semibold text-emerald-100">{question.question}</span>
              {question.why ? <span className="mt-1 block leading-6 text-slate-400">{question.why}</span> : null}
              <textarea
                className="mt-3 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm leading-6 text-white outline-none focus:border-emerald-300"
                value={answers[question.id] ?? ""}
                onChange={(event) => onAnswerChange(question.id, event.target.value)}
                placeholder={question.placeholder}
              />
            </label>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ResultCards({ cards }: { cards: ToolCard[] }) {
  if (!cards.length) return <EmptyState title="No result cards yet" message="Complete the guided intake to generate structured MacroBoard evidence cards." />;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {cards.map((card, index) => (
        <ResultCard key={card.id ?? `${card.title}-${index}`} card={card} />
      ))}
    </div>
  );
}

export function ResultCard({ card }: { card: ToolCard }) {
  const metrics = Object.entries(card.metrics ?? {});
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{typeLabels[card.type] ?? card.type}</p>
          <h3 className="mt-2 text-xl font-semibold leading-7 text-white">{card.title}</h3>
        </div>
        <Badge tone={card.confidence ?? "medium"}>{card.confidence ?? "medium"} confidence</Badge>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{card.content || card.thesis || card.methodology || "No interpretation supplied."}</p>

      {metrics.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {metrics.slice(0, 8).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <p className="mt-1 break-words text-lg font-semibold text-emerald-100">{formatMetric(value)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {card.assumptions?.length ? <ListBlock title="Assumptions" items={card.assumptions} /> : null}
      {card.caveats?.length ? <ListBlock title="Caveats" items={card.caveats} /> : null}
      {card.actions?.length ? <NextActionPanel actions={card.actions.map((action) => action.label)} compact /> : null}

      {card.tableData || card.chartData ? (
        <details className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">Technical evidence</summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {JSON.stringify({ tableData: card.tableData, chartData: card.chartData }, null, 2)}
          </pre>
        </details>
      ) : null}
    </article>
  );
}

export function SourceList({ sources }: { sources: ToolSource[] }) {
  if (!sources.length) return <EmptyState title="No sources attached" message="This output does not include external source evidence yet." />;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-semibold text-white">Sources and citations</h2>
      <div className="mt-4 space-y-3">
        {sources.map((source, index) => (
          <div key={`${source.title}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-slate-100">{source.url ? <a className="hover:text-emerald-200" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : source.title}</p>
              <Badge tone={source.status === "live" ? "high" : source.status === "missing" ? "low" : "medium"}>{source.status ?? "unknown"}</Badge>
            </div>
            {source.description ? <p className="mt-2 text-sm leading-6 text-slate-400">{source.description}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecommendationCard({ output }: { output: Pick<ToolOutput, "summary" | "confidence" | "status"> }) {
  return (
    <section className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">Research summary</h2>
        <div className="flex flex-wrap gap-2">
          <Badge tone={output.confidence}>{output.confidence} confidence</Badge>
          <Badge tone={output.status === "complete" ? "high" : output.status === "error" ? "low" : "medium"}>{output.status.replace("_", " ")}</Badge>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-emerald-50">{output.summary || "Generate a workspace to see a structured research summary."}</p>
    </section>
  );
}

export function RiskCard({ risks, missingData }: { risks: ToolRisk[]; missingData: string[] }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-semibold text-white">Risks and missing data</h2>
      {risks.length ? (
        <div className="space-y-3">
          {risks.map((risk) => (
            <div key={risk.title} className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-amber-50">{risk.title}</p>
                <Badge tone={risk.severity === "high" ? "low" : "medium"}>{risk.severity ?? "medium"} severity</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-50/90">{risk.content}</p>
              {risk.mitigation ? <p className="mt-2 text-sm leading-6 text-slate-300">Mitigation: {risk.mitigation}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No explicit risks returned yet.</p>
      )}
      {missingData.length ? <ListBlock title="Missing data warnings" items={missingData} /> : null}
    </section>
  );
}

export function NextActionPanel({ actions, compact = false }: { actions: string[]; compact?: boolean }) {
  if (!actions.length) return null;
  return (
    <section className={compact ? "mt-4" : "rounded-2xl border border-slate-800 bg-slate-900 p-5"}>
      <h2 className={compact ? "text-sm font-semibold text-white" : "text-lg font-semibold text-white"}>Next actions</h2>
      <ol className="mt-3 space-y-2">
        {actions.map((action, index) => (
          <li key={`${action}-${index}`} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm leading-6 text-slate-300">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-xs font-bold text-slate-950">{index + 1}</span>
            <span>{action}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ExportSaveActionBar({ disabled }: { disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      {/* TODO: Connect these placeholders to saved workspaces, export jobs, and future entitlement checks after monetization planning. */}
      <button className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50" disabled={disabled}>
        Save snapshot
      </button>
      <button className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50" disabled={disabled}>
        Export Markdown
      </button>
      <button className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50" disabled={disabled}>
        Copy share link
      </button>
      <span className="text-xs text-slate-500">Placeholders only. No payment gate.</span>
    </div>
  );
}

export function LoadingState({ message = "Working through the workflow..." }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-300" />
      </div>
      <p className="mt-4">{message}</p>
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-300/40 bg-rose-300/10 p-3 text-sm leading-6 text-rose-100">
      {message}
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-400">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

