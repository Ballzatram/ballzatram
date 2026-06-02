import type { BettingConceptExplanation, BettingOutcome, OutcomeDistributionPoint } from "@/lib/betting-data";
import { simpleParlayProbability, type LineMovementReadout } from "@/lib/betting-data";

type Tone = "green" | "blue" | "amber" | "red" | "ink";

const toneClasses: Record<Tone, string> = {
  green: "border-emerald-300/35 bg-emerald-300/10 text-emerald-50",
  blue: "border-cyan-300/35 bg-cyan-300/10 text-cyan-50",
  amber: "border-amber-300/40 bg-amber-300/10 text-amber-50",
  red: "border-rose-300/40 bg-rose-300/10 text-rose-50",
  ink: "border-slate-800 bg-slate-950/70 text-slate-200",
};

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

function formatDecimal(value: number, digits = 2) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function OddsCard({
  title,
  subtitle,
  outcome,
  hold,
}: {
  title: string;
  subtitle: string;
  outcome: BettingOutcome;
  hold?: number | null;
}) {
  return (
    <article className="min-h-52 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{subtitle}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
        </div>
        <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 font-mono text-xs font-semibold text-amber-50">
          demo
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">American</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-white">{formatOdds(outcome.oddsAmerican)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Implied</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-white">{formatPercent(outcome.impliedProbability)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Decimal</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-white">{formatDecimal(outcome.decimalOdds)}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">
        {outcome.note ?? "This card translates the price into probability language before any outside context is added."}
      </p>
      {typeof hold === "number" ? (
        <p className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-50">
          Approximate market hold: {formatPercent(hold)}. This is a pricing clue, not a quality score.
        </p>
      ) : null}
    </article>
  );
}

export function ProbabilityExplainer({
  explanation,
  value,
  detail,
}: {
  explanation: BettingConceptExplanation;
  value?: string;
  detail?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/75 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Plain English</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{explanation.name}</h3>
        {value ? <span className="font-mono text-sm font-semibold text-emerald-200">{value}</span> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{explanation.shortExplanation}</p>
      <p className="mt-3 text-sm leading-6 text-slate-400">{detail ?? explanation.whyItMatters}</p>
      <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-50">
        <span className="font-semibold">Can mislead:</span> {explanation.caveats[0]}
      </div>
    </article>
  );
}

export function LineMoveBadge({ movement }: { movement: LineMovementReadout }) {
  const tone: Tone =
    movement.direction === "probability-up"
      ? "green"
      : movement.direction === "probability-down"
        ? "amber"
        : movement.direction === "insufficient-data"
          ? "red"
          : "ink";
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {movement.label}
      {typeof movement.probabilityChange === "number" ? ` (${formatPercent(movement.probabilityChange, 2)})` : ""}
    </span>
  );
}

export function ParlayRiskPanel({
  legs,
}: {
  legs: Array<{ label: string; probability: number }>;
}) {
  const combined = simpleParlayProbability(legs.map((leg) => leg.probability));
  return (
    <article className="rounded-xl border border-amber-300/35 bg-amber-300/10 p-4 text-amber-50">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Parlay laboratory</p>
      <h3 className="mt-2 text-lg font-semibold text-white">Probability shrinks as requirements stack.</h3>
      <div className="mt-4 grid gap-2">
        {legs.map((leg) => (
          <p key={leg.label} className="flex justify-between gap-3 text-sm leading-6">
            <span>{leg.label}</span>
            <strong>{formatPercent(leg.probability)}</strong>
          </p>
        ))}
      </div>
      <p className="mt-4 border-t border-amber-100/20 pt-3 text-sm leading-6">
        Simple combined probability: <strong>{formatPercent(combined)}</strong>. This assumes independent legs and should be treated as a teaching estimate.
      </p>
    </article>
  );
}

export function OutcomeScenarioCard({ scenario }: { scenario: OutcomeDistributionPoint }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{scenario.outcomeId}</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{scenario.label}</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Raw implied</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-100">{formatPercent(scenario.rawImpliedProbability)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Normalized</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-100">{formatPercent(scenario.normalizedProbability)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{scenario.note}</p>
    </article>
  );
}

export function BettingCaveatPanel({
  title = "Responsible-use notes",
  caveats,
}: {
  title?: string;
  caveats: string[];
}) {
  return (
    <article className="rounded-xl border border-rose-300/35 bg-rose-300/10 p-4 text-rose-50">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">Read first</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
      <ul className="mt-4 grid gap-2 text-sm leading-6">
        {caveats.map((caveat) => (
          <li key={caveat}>{caveat}</li>
        ))}
      </ul>
    </article>
  );
}
