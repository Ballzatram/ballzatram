import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  BettingCaveatPanel,
  LineMoveBadge,
  OddsCard,
  OutcomeScenarioCard,
  ParlayRiskPanel,
  ProbabilityExplainer,
} from "@/components/bettors-corner/BettorsCornerPrimitives";
import {
  approximateHoldFromMarket,
  americanOddsToImpliedProbability,
  basicOutcomeDistribution,
  bettingConceptExplanations,
  demoBettingDataProvider,
  estimatePayout,
  getLineMovementDirection,
} from "@/lib/betting-data";
import { generateBettorsCornerDraft } from "@/lib/story-engine";

export const metadata: Metadata = {
  title: "Bettor's Corner | Ballzatram",
  description:
    "An educational betting-market analysis desk for odds, implied probability, line movement, outcomes, variance, and sportsbook pricing.",
};

type DeskSection = {
  id: string;
  title: string;
  kicker: string;
  what: string;
  why: string;
  caveats: string[];
  next: string[];
};

const deskSections: DeskSection[] = [
  {
    id: "overview",
    title: "Overview",
    kicker: "Desk map",
    what: "Frames betting markets as prices, probabilities, movement, and uncertainty instead of picks.",
    why: "A clear frame helps users understand the bet before they make the bet.",
    caveats: ["Demo data proves the workflow, not the current market.", "Odds are snapshots and can change rapidly."],
    next: ["Start with implied probability.", "Check hold across the market.", "Name what information could change the read."],
  },
  {
    id: "odds-board",
    title: "Odds Board",
    kicker: "Price board",
    what: "Shows a small provider-backed board with American odds, decimal odds, and implied probabilities.",
    why: "Odds are easier to reason about once the price is translated into a probability.",
    caveats: ["Different books can show different prices.", "A demo board should never be treated as live market data."],
    next: ["Compare both sides of the market.", "Look for stale timestamps.", "Ask whether the market has enough liquidity."],
  },
  {
    id: "probability-desk",
    title: "Probability Desk",
    kicker: "Translation room",
    what: "Converts American odds into break-even probabilities and simple payout math.",
    why: "The payout is only half the sentence. The required hit rate is the other half.",
    caveats: ["Break-even math does not decide whether an outcome is likely.", "Vig can make clean probability numbers too flattering."],
    next: ["Calculate break-even first.", "Write the probability assumption down.", "Separate arithmetic from confidence."],
  },
  {
    id: "line-movement",
    title: "Line Movement Lab",
    kicker: "Tape watch",
    what: "Shows whether the demo price moved toward or away from a higher implied probability.",
    why: "Movement can point to new information, book risk management, or market disagreement worth investigating.",
    caveats: ["Movement does not explain itself.", "A changed line is not evidence that the new price is correct."],
    next: ["Pair movement with timestamps.", "Look for injury, weather, lineup, or limit context.", "Compare movement across books later."],
  },
  {
    id: "outcomes",
    title: "Outcome Explorer",
    kicker: "Distribution sketch",
    what: "Normalizes the demo market probabilities so outcomes add to 100%.",
    why: "This can make hold visible and show how pricing shapes the apparent distribution.",
    caveats: ["Normalization is not prediction.", "Two-way markets are simpler than props, futures, or derivative markets."],
    next: ["Check raw implied probability first.", "Then compare normalized shares.", "Keep the hold note visible."],
  },
  {
    id: "parlay",
    title: "Parlay Laboratory",
    kicker: "Stacked risk",
    what: "Multiplies example leg probabilities to show how quickly combined probability can shrink.",
    why: "Compounded requirements often feel easier than they are when only payout is visible.",
    caveats: ["Legs may be correlated.", "Simple multiplication is a teaching aid, not a pricing model."],
    next: ["Multiply the probabilities.", "Ask whether legs are independent.", "Do not chase a payout shape."],
  },
  {
    id: "bankroll",
    title: "Bankroll & Risk Notes",
    kicker: "Risk rail",
    what: "Keeps responsible-use language close to the math.",
    why: "Educational tools should make risk harder to ignore, not easier.",
    caveats: ["No user-specific advice is provided.", "Variance can make outcomes emotionally noisy."],
    next: ["Avoid chasing losses.", "Decide limits away from the market screen.", "Treat this page as education only."],
  },
  {
    id: "research-notes",
    title: "Research Notes",
    kicker: "Story queue",
    what: "Previews how a deterministic betting insight can become a Ballzatram Daily story draft.",
    why: "Stories should carry caveats, source status, and a route back to the tool that produced them.",
    caveats: ["No automatic publication is enabled.", "No external AI call is made in this phase."],
    next: ["Keep sourceType as tool-generated.", "Attach caveats to every draft.", "Route readers back to the analysis."],
  },
];

function formatPercent(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function SectionShell({ section, children }: { section: DeskSection; children: ReactNode }) {
  return (
    <section id={section.id} className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">{section.kicker}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{section.title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{section.what}</p>
          <p className="mt-3 text-sm leading-6 text-slate-400">{section.why}</p>
          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-50">
            <strong>Caveat:</strong> {section.caveats[0]}
          </div>
          <ol className="mt-4 grid gap-2 text-sm leading-6 text-slate-400">
            {section.next.map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300 font-mono text-xs font-bold text-slate-950">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid content-start gap-4">{children}</div>
      </div>
    </section>
  );
}

export default async function BettorsCornerPage() {
  const board = await demoBettingDataProvider.getDemoOdds();
  const markets = await demoBettingDataProvider.getMarketsBySport("basketball");
  const primaryEvent = board.events[0];
  const primaryMarket = primaryEvent.markets[0];
  const primaryOutcome = primaryMarket.outcomes[0];
  const parlaySecondOutcome = board.events[1]?.markets[0]?.outcomes[0] ?? primaryMarket.outcomes[1];
  const hold = approximateHoldFromMarket(primaryMarket.outcomes);
  const payout = estimatePayout(25, primaryOutcome.oddsAmerican);
  const lineHistory = await demoBettingDataProvider.getLineHistory(primaryEvent.id, primaryMarket.id, primaryOutcome.id);
  const movement = getLineMovementDirection(lineHistory.points);
  const distribution = basicOutcomeDistribution(primaryMarket.outcomes);
  const draft = generateBettorsCornerDraft({
    generatedAt: board.freshness.retrievedAt,
    editionLabel: "Bettor's Corner generated preview",
  });

  return (
    <section className="min-h-dvh bg-[#07111f] text-slate-100">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.25rem] border border-slate-800 bg-[#0b1524] shadow-2xl shadow-black/40">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="p-6 sm:p-8">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
                Ballzatram betting desk / probability first
              </p>
              <h1 className="mt-4 max-w-4xl font-serif text-5xl font-black leading-[0.95] text-white sm:text-7xl">
                Bettor's Corner
              </h1>
              <p className="mt-5 max-w-3xl text-xl leading-8 text-slate-200">
                Understand the bet before you make the bet.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                An educational betting-market analysis desk for odds, implied probability, line movement, outcomes,
                variance, and how sportsbooks price uncertainty. No picks, no user-specific recommendations, no certainty theater.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200" href="#odds-board">
                  Open odds board
                </a>
                <a className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-300" href="#research-notes">
                  Preview story draft
                </a>
              </div>
            </div>
            <aside className="border-t border-slate-800 bg-slate-950/80 p-5 xl:border-l xl:border-t-0">
              <div className="rounded-xl border border-slate-800 bg-black/35 p-4 font-mono">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Feed status</p>
                  <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-50">
                    demo data shown
                  </span>
                </div>
                <div className="mt-5 grid gap-3 text-sm">
                  <p className="flex justify-between gap-3 text-slate-400"><span>Provider</span><strong className="text-slate-100">{board.freshness.provider}</strong></p>
                  <p className="flex justify-between gap-3 text-slate-400"><span>Source</span><strong className="text-slate-100">{board.sourceLabel}</strong></p>
                  <p className="flex justify-between gap-3 text-slate-400"><span>As of</span><strong className="text-slate-100">{board.freshness.asOf}</strong></p>
                  <p className="flex justify-between gap-3 text-slate-400"><span>Events</span><strong className="text-slate-100">{board.events.length}</strong></p>
                </div>
                <p className="mt-5 text-sm leading-6 text-amber-100">
                  The desk is open, but no live sportsbook feed is connected. This page uses deterministic demo data.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <nav className="flex max-w-full gap-2 overflow-x-auto rounded-full border border-slate-800 bg-slate-950/75 p-2" aria-label="Bettor's Corner sections">
          {deskSections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white">
              {section.title}
            </a>
          ))}
        </nav>

        <section className="grid gap-4 lg:grid-cols-4">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Example line</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-white">{formatOdds(primaryOutcome.oddsAmerican)}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Break-even before vig: {formatPercent(primaryOutcome.impliedProbability)}.</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Approx hold</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-white">{formatPercent(hold)}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Sum of implied probabilities above 100% in the demo moneyline.</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Demo payout</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-white">{formatCurrency(payout.profit)}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Profit on a $25 teaching stake, before any outcome is known.</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Line movement</p>
            <div className="mt-3"><LineMoveBadge movement={movement} /></div>
            <p className="mt-3 text-sm leading-6 text-slate-400">Movement is a research prompt, not an answer.</p>
          </article>
        </section>

        <SectionShell section={deskSections[0]}>
          <OddsCard title={primaryOutcome.label} subtitle={`${primaryEvent.awayTeam} at ${primaryEvent.homeTeam}`} outcome={primaryOutcome} hold={hold} />
          <ProbabilityExplainer
            explanation={bettingConceptExplanations["implied-probability"]}
            value={formatPercent(primaryOutcome.impliedProbability)}
          />
        </SectionShell>

        <SectionShell section={deskSections[1]}>
          <div className="grid gap-3">
            {board.events.map((event) => (
              <article key={event.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{event.league}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{event.awayTeam} at {event.homeTeam}</h3>
                    <p className="mt-1 text-sm text-slate-500">{event.startsAt}</p>
                  </div>
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-50">
                    {event.markets[0]?.label ?? "No market"}
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  {event.markets.flatMap((item) => item.outcomes).map((item) => (
                    <p key={item.id} className="grid gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_110px_110px]">
                      <span className="font-semibold text-slate-100">{item.label}</span>
                      <span className="font-mono text-slate-300">{formatOdds(item.oddsAmerican)}</span>
                      <span className="font-mono text-slate-300">{formatPercent(item.impliedProbability)}</span>
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </SectionShell>

        <SectionShell section={deskSections[2]}>
          <ProbabilityExplainer
            explanation={bettingConceptExplanations["break-even-rate"]}
            value={`${formatOdds(primaryOutcome.oddsAmerican)} = ${formatPercent(primaryOutcome.impliedProbability)}`}
            detail={`A ${formatOdds(primaryOutcome.oddsAmerican)} price asks for roughly ${formatPercent(primaryOutcome.impliedProbability)} before hold, context, or your own probability estimate is considered.`}
          />
          <ProbabilityExplainer explanation={bettingConceptExplanations["vig-hold"]} value={formatPercent(hold)} />
          <article className="rounded-xl border border-slate-800 bg-slate-950/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Payout estimate</p>
            <h3 className="mt-2 text-lg font-semibold text-white">A $25 teaching stake at {formatOdds(primaryOutcome.oddsAmerican)}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Potential profit: {formatCurrency(payout.profit)}. Total return including stake: {formatCurrency(payout.totalReturn)}.
              This calculation does not say the outcome is likely.
            </p>
          </article>
        </SectionShell>

        <SectionShell section={deskSections[3]}>
          <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">{primaryOutcome.label} line history</h3>
              <LineMoveBadge movement={movement} />
            </div>
            <div className="mt-4 grid gap-2">
              {lineHistory.points.map((point) => (
                <p key={point.at} className="grid gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_110px_130px]">
                  <span className="text-slate-400">{point.at}</span>
                  <span className="font-mono text-slate-100">{formatOdds(point.oddsAmerican)}</span>
                  <span className="font-mono text-slate-100">{formatPercent(americanOddsToImpliedProbability(point.oddsAmerican))}</span>
                </p>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              The demo move from {formatOdds(movement.fromOdds ?? primaryOutcome.oddsAmerican)} to {formatOdds(movement.toOdds ?? primaryOutcome.oddsAmerican)} raises implied probability, but it does not explain why.
            </p>
          </div>
          <ProbabilityExplainer explanation={bettingConceptExplanations["line-movement"]} />
        </SectionShell>

        <SectionShell section={deskSections[4]}>
          <div className="grid gap-3 sm:grid-cols-2">
            {distribution.map((scenario) => <OutcomeScenarioCard key={scenario.outcomeId} scenario={scenario} />)}
          </div>
          <ProbabilityExplainer explanation={bettingConceptExplanations.variance} />
        </SectionShell>

        <SectionShell section={deskSections[5]}>
          <ParlayRiskPanel
            legs={[
              { label: primaryOutcome.label, probability: primaryOutcome.impliedProbability },
              { label: parlaySecondOutcome.label, probability: parlaySecondOutcome.impliedProbability },
              { label: "Demo total over", probability: 0.512 },
            ]}
          />
          <ProbabilityExplainer explanation={bettingConceptExplanations["parlay-compounding-risk"]} />
        </SectionShell>

        <SectionShell section={deskSections[6]}>
          <BettingCaveatPanel
            caveats={[
              "Educational only. This page does not provide betting advice.",
              "No guaranteed picks. No user-specific recommendations.",
              "Odds can change rapidly and may be stale outside this demo.",
              "Understand risk before any real-money decision.",
              "Avoid chasing losses; variance is part of outcomes.",
            ]}
          />
          <div className="grid gap-3">
            {markets.map((market) => (
              <article key={market.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{market.id}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{market.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{market.description}</p>
              </article>
            ))}
          </div>
        </SectionShell>

        <SectionShell section={deskSections[7]}>
          <article className="rounded-xl border border-emerald-300/30 bg-emerald-300/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Tool insight</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{draft.insight.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{draft.insight.summary}</p>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-400">
              {draft.insight.observations.map((observation) => <li key={observation}>{observation}</li>)}
            </ul>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Generated story draft</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{draft.story.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{draft.story.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span>{draft.story.sourceType}</span>
              <span>Confidence: {draft.story.confidence}</span>
              <span>{draft.readyToPublish ? "review-ready draft" : "needs review"}</span>
            </div>
            <a className="mt-5 inline-flex rounded-full border border-cyan-300/50 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-200" href="/internal/generated-stories">
              Open generated stories preview
            </a>
          </article>
        </SectionShell>
      </div>
    </section>
  );
}
