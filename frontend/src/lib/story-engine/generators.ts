import type { DepartmentId } from "@/config/departments";
import type { DataFreshness, QuantLibraryAnalyticsDemoResponse, QuantLibrarySymbolAnalytics } from "@/lib/api";
import { americanOddsToImpliedProbability } from "@/lib/betting-data";
import { createStoryGenerator } from "@/lib/story-engine/generate";
import type { GeneratedStoryDraft, StoryGenerationContext, StorySource, ToolInsight } from "@/lib/story-engine/types";

function formatNumber(value: number | null | undefined, digits = 2) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

function latestFreshness(analytics?: QuantLibraryAnalyticsDemoResponse | null): DataFreshness | null {
  return analytics?.symbols[0]?.freshness ?? analytics?.rates.yieldCurve?.freshness ?? null;
}

function sourceFor(
  departmentId: DepartmentId,
  toolId: string,
  toolName: string,
  sourceLabel: string,
  analytics?: QuantLibraryAnalyticsDemoResponse | null,
): StorySource {
  const freshness = latestFreshness(analytics);
  return {
    toolId,
    toolName,
    departmentId,
    sourceLabel,
    provider: analytics?.provider ?? freshness?.provider,
    freshnessStatus: freshness?.status ?? "demo",
    warnings: [...(freshness?.warnings ?? []), ...(analytics?.errors.map((error) => error.message) ?? [])],
  };
}

function symbolAt(analytics: QuantLibraryAnalyticsDemoResponse | null | undefined, index: number): QuantLibrarySymbolAnalytics | undefined {
  return analytics?.symbols[index];
}

export function createQuantMarketSnapshotInsight(analytics?: QuantLibraryAnalyticsDemoResponse | null): ToolInsight {
  const first = symbolAt(analytics, 0);
  const source = sourceFor("quant-library", "quant-library", "Quant Library", "Quant Library analytics demo", analytics);
  const dataAsOf = latestFreshness(analytics)?.as_of ?? latestFreshness(analytics)?.retrieved_at ?? "demo-only";
  const errors = analytics?.errors.length ?? 0;
  return {
    id: "quant-library-market-snapshot",
    toolId: "quant-library",
    departmentId: "quant-library",
    title: "Quant Library files a market snapshot with caveats first",
    summary:
      analytics && first
        ? `The desk loaded ${analytics.symbols.length} sample symbols from ${analytics.universe.title}. ${analytics.regime.label} is treated as a descriptive readout, not a forecast.`
        : "The desk can convert a market-analysis payload into a newspaper draft, even when only demo data is available.",
    observations: [
      analytics ? `Benchmark context is ${analytics.benchmark}.` : "No live analytics payload is attached to this preview.",
      analytics ? `Regime score is ${formatNumber(analytics.regime.score, 0)} (${analytics.regime.label}).` : "The generated draft keeps demo/source status visible.",
      errors ? `${errors} provider issue${errors === 1 ? "" : "s"} need review before publication.` : "No provider errors are attached to this demo payload.",
    ],
    metrics: [
      { id: "symbols", label: "Loaded symbols", value: analytics?.symbols.length ?? 0 },
      { id: "regime-score", label: "Regime score", value: analytics ? formatNumber(analytics.regime.score, 0) : "demo" },
      { id: "first-cumulative-return", label: `${first?.symbol ?? "Sample"} cumulative return`, value: first ? formatPercent(first.metrics.cumulativeReturn) : "n/a" },
    ],
    dataAsOf,
    confidence: source.freshnessStatus === "live" ? "medium" : "low",
    caveats: [
      "Market outputs are descriptive research context.",
      "Source freshness and demo/cached/stale labels must travel with the story.",
      ...(analytics?.caveats ?? []),
    ],
    relatedRoutes: [
      {
        label: "Open Quant Library",
        href: "/quant-library",
        description: "Review the desk that produced the market snapshot.",
      },
    ],
    importance: errors ? "medium" : "low",
    severity: errors ? "medium" : "low",
    tags: ["markets", "quant-library", "generated", "snapshot"],
    source,
  };
}

export function createRatesDeskSnapshotInsight(analytics?: QuantLibraryAnalyticsDemoResponse | null): ToolInsight {
  const source = sourceFor("quant-library", "rates-desk", "Rates Desk", "Quant Library rates demo", analytics);
  const spread2y10y = analytics?.rates.spreads["2y10y"]?.latest ?? null;
  const spread3m10y = analytics?.rates.spreads["3m10y"]?.latest ?? null;
  return {
    id: "rates-desk-snapshot",
    toolId: "rates-desk",
    departmentId: "quant-library",
    title: "Rates Desk turns the curve into a cautious briefing",
    summary:
      "The rates snapshot converts curve levels and spread context into a source-labeled newspaper draft without timing claims.",
    observations: [
      `2Y/10Y spread: ${formatNumber(spread2y10y, 2)} points.`,
      `3M/10Y spread: ${formatNumber(spread3m10y, 2)} points.`,
      "Curve shape can frame questions about pressure, but it is not a clock.",
    ],
    metrics: [
      { id: "2y10y", label: "2Y / 10Y spread", value: formatNumber(spread2y10y, 2), unit: "points" },
      { id: "3m10y", label: "3M / 10Y spread", value: formatNumber(spread3m10y, 2), unit: "points" },
      { id: "curve-points", label: "Curve points", value: analytics?.rates.yieldCurve?.points.length ?? 0 },
    ],
    dataAsOf: latestFreshness(analytics)?.as_of ?? "demo-only",
    confidence: source.freshnessStatus === "live" ? "medium" : "low",
    caveats: ["Rates data can lag or be synthetic in demo mode.", "Curve spreads are context, not a timing system."],
    relatedRoutes: [{ label: "Open Rates Desk", href: "/quant-library", description: "Review the rates section in Quant Library." }],
    importance: spread2y10y !== null && spread2y10y < 0 ? "medium" : "low",
    severity: spread2y10y !== null && spread2y10y < 0 ? "medium" : "low",
    tags: ["markets", "rates", "curve", "generated"],
    source,
  };
}

export function createRiskScannerAlertInsight(analytics?: QuantLibraryAnalyticsDemoResponse | null): ToolInsight {
  const source = sourceFor("quant-library", "risk-scanner", "Risk Scanner", "Quant Library risk demo", analytics);
  const first = symbolAt(analytics, 0);
  return {
    id: "risk-scanner-alert",
    toolId: "risk-scanner",
    departmentId: "quant-library",
    title: "Risk Scanner keeps the warning rail above the conclusion",
    summary:
      "The risk alert draft highlights drawdown, volatility, and regime caveats so the story does not harden around one metric.",
    observations: [
      first ? `${first.symbol} max drawdown is ${formatPercent(first.metrics.maxDrawdown)}.` : "No symbol-level risk sample is attached.",
      first ? `${first.symbol} 20-day volatility is ${formatPercent(first.metrics.rollingVolatility20d)}.` : "Risk metrics need enough observations before the desk should publish.",
      analytics ? `${analytics.regime.caveats[0] ?? "Regime caveats remain attached."}` : "The generated alert remains in preview mode.",
    ],
    metrics: [
      { id: "max-drawdown", label: "Max drawdown", value: first ? formatPercent(first.metrics.maxDrawdown) : "n/a" },
      { id: "volatility", label: "20d volatility", value: first ? formatPercent(first.metrics.rollingVolatility20d) : "n/a" },
      { id: "errors", label: "Provider errors", value: analytics?.errors.length ?? 0 },
    ],
    dataAsOf: latestFreshness(analytics)?.as_of ?? "demo-only",
    confidence: source.freshnessStatus === "live" ? "medium" : "low",
    caveats: ["Risk metrics can look precise while missing regime shifts.", "This alert is a research prompt, not a directive."],
    relatedRoutes: [{ label: "Open Risk Scanner", href: "/quant-library", description: "Review the risk section in Quant Library." }],
    importance: first?.metrics.maxDrawdown && first.metrics.maxDrawdown < -0.1 ? "high" : "medium",
    severity: first?.metrics.maxDrawdown && first.metrics.maxDrawdown < -0.1 ? "high" : "medium",
    tags: ["markets", "risk", "drawdown", "generated"],
    source,
  };
}

export function createParcelPlaceholderInsight(): ToolInsight {
  return {
    id: "parcel-placeholder-insight",
    toolId: "parcel",
    departmentId: "parcel",
    title: "Parcel placeholder insight keeps diligence gaps visible",
    summary:
      "Parcel can publish a land-desk draft only after the story preserves source quality, zoning uncertainty, and next diligence questions.",
    observations: [
      "The current insight uses placeholder parcel context.",
      "A future live run should attach listing, zoning, parcel, and infrastructure source notes.",
      "Readers must be routed back to the tool or record that produced the memo.",
    ],
    metrics: [
      { id: "source-count", label: "Attached sources", value: 0, description: "Placeholder has no verified live parcel sources." },
      { id: "diligence-open-items", label: "Open diligence items", value: 3 },
    ],
    dataAsOf: "demo-only",
    confidence: "low",
    caveats: ["Placeholder content only.", "No parcel data was fetched or verified.", "Human diligence is required before publication."],
    relatedRoutes: [{ label: "Open Parcel", href: "/tools/parcel/index.html", description: "Current static Parcel prototype." }],
    importance: "medium",
    severity: "medium",
    tags: ["parcel", "land", "diligence", "generated"],
    source: {
      toolId: "parcel",
      toolName: "Parcel",
      departmentId: "parcel",
      sourceLabel: "Parcel placeholder insight",
      freshnessStatus: "demo",
      warnings: ["Placeholder insight has no live parcel records."],
    },
  };
}

export function createBettorsCornerPlaceholderInsight(): ToolInsight {
  const exampleOdds = 150;
  const impliedProbability = americanOddsToImpliedProbability(exampleOdds);
  return {
    id: "bettors-corner-placeholder-insight",
    toolId: "bettors-corner",
    departmentId: "bettors-corner",
    title: "Bettor's Corner drafts an implied-probability classroom note",
    summary:
      "The betting desk turns odds math into an educational article while avoiding certainty language and wagering instructions.",
    observations: [
      `A +${exampleOdds} line implies roughly ${formatPercent(impliedProbability)} break-even probability before accounting for vig.`,
      "The lesson frame is educational and demo-only.",
      "No live odds feed is attached, so the draft must keep the data status visible.",
      "The article should explain implied probability, movement, and variance without claiming an outcome.",
    ],
    metrics: [
      { id: "example-odds", label: "Example odds", value: `+${exampleOdds}` },
      { id: "implied-probability", label: "Implied probability", value: formatPercent(impliedProbability) },
    ],
    dataAsOf: "demo-only",
    confidence: "low",
    caveats: [
      "Demo education content only.",
      "No live odds feed was used.",
      "No wagering recommendation is made.",
      "Odds can change rapidly and should be rechecked at the source.",
      "Variance can make outcomes noisy even when the arithmetic is correct.",
    ],
    relatedRoutes: [{ label: "Open Bettor's Corner", href: "/bettors-corner", description: "Review the betting education desk that produced the note." }],
    importance: "low",
    severity: "low",
    tags: ["betting", "probability", "education", "generated"],
    source: {
      toolId: "bettors-corner",
      toolName: "Bettor's Corner",
      departmentId: "bettors-corner",
      sourceLabel: "Bettor's Corner demo odds education insight",
      freshnessStatus: "demo",
      warnings: ["Demo insight has no live odds feed."],
    },
  };
}

export const quantMarketSnapshotStoryGenerator = createStoryGenerator({
  id: "quant-library-market-snapshot-generator",
  toolId: "quant-library",
  description: "Turns a Quant Library analytics payload into a Ballzatram Daily market snapshot draft.",
  heroLabel: "Generated Markets Draft",
});

export const ratesDeskStoryGenerator = createStoryGenerator({
  id: "rates-desk-snapshot-generator",
  toolId: "rates-desk",
  description: "Turns rates desk context into a curve-focused newspaper draft.",
  heroLabel: "Generated Rates Draft",
});

export const riskScannerStoryGenerator = createStoryGenerator({
  id: "risk-scanner-alert-generator",
  toolId: "risk-scanner",
  description: "Turns risk scanner output into a caution-first newspaper draft.",
  heroLabel: "Generated Risk Draft",
});

export const parcelStoryGenerator = createStoryGenerator({
  id: "parcel-placeholder-generator",
  toolId: "parcel",
  description: "Turns Parcel diligence placeholders into a source-labeled land desk draft.",
  heroLabel: "Generated Parcel Draft",
});

export const bettorsCornerStoryGenerator = createStoryGenerator({
  id: "bettors-corner-placeholder-generator",
  toolId: "bettors-corner",
  description: "Turns betting education placeholders into a no-certainty classroom draft.",
  heroLabel: "Generated Betting Draft",
});

export function generateQuantMarketSnapshotDraft(
  analytics?: QuantLibraryAnalyticsDemoResponse | null,
  context?: Partial<StoryGenerationContext>,
): GeneratedStoryDraft {
  return quantMarketSnapshotStoryGenerator.generate(createQuantMarketSnapshotInsight(analytics), context);
}

export function generateRatesDeskDraft(
  analytics?: QuantLibraryAnalyticsDemoResponse | null,
  context?: Partial<StoryGenerationContext>,
): GeneratedStoryDraft {
  return ratesDeskStoryGenerator.generate(createRatesDeskSnapshotInsight(analytics), context);
}

export function generateRiskScannerDraft(
  analytics?: QuantLibraryAnalyticsDemoResponse | null,
  context?: Partial<StoryGenerationContext>,
): GeneratedStoryDraft {
  return riskScannerStoryGenerator.generate(createRiskScannerAlertInsight(analytics), context);
}

export function generateBettorsCornerDraft(context?: Partial<StoryGenerationContext>): GeneratedStoryDraft {
  return bettorsCornerStoryGenerator.generate(createBettorsCornerPlaceholderInsight(), context);
}

export function generatedStoryPreviewDrafts(): GeneratedStoryDraft[] {
  return [
    generateQuantMarketSnapshotDraft(),
    generateRatesDeskDraft(),
    generateRiskScannerDraft(),
    parcelStoryGenerator.generate(createParcelPlaceholderInsight()),
    generateBettorsCornerDraft(),
  ];
}
