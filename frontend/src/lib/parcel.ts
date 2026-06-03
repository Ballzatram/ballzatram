import type { ParcelOpportunity, ParcelSourceStatus, ParcelSourceType } from "@/data/parcelOpportunities";

export type ParcelThesisInput = {
  useCase: string;
  market: string;
  acreageRange: string;
  budget: string;
  mustHaves: string;
  riskFactors: string;
  notes: string;
  listingLinks: string;
};

export type ParcelResearchMode = "ai" | "fallback";
export type ParcelSuitabilityCategory =
  | "strong_fit"
  | "conditional_fit"
  | "weak_fit"
  | "disqualified"
  | "needs_source_review";

export type ParcelToolEvent = {
  toolName: string;
  status: "complete" | "fallback" | "skipped";
  summary: string;
};

export type ParcelCandidateSuitability = {
  candidateId: string;
  category: ParcelSuitabilityCategory;
  suitabilityScore: number;
  reasons: string[];
  dealKillers: string[];
  nextQuestions: string[];
};

export type ParcelMemoSections = {
  executiveSummary: string;
  sourceReadiness: string;
  diligencePlan: string[];
  paidMemoScope: string[];
};

export type ParcelResearchResult = {
  mode: ParcelResearchMode;
  normalizedThesis: {
    useCase: string;
    market: string;
    acreageRange: string;
    budget: string;
    mustHaves: string[];
    riskFactors: string[];
  };
  rankedCandidateIds: string[];
  toolEvents: ParcelToolEvent[];
  candidateSuitability: ParcelCandidateSuitability[];
  sourceAudit: Array<{
    candidateId?: string | null;
    title: string;
    status: ParcelSourceStatus | "fallback" | "missing" | "unknown";
    note: string;
    url?: string | null;
  }>;
  missingData: string[];
  warnings: string[];
  nextDiligence: string[];
  memo: ParcelMemoSections;
};

export const defaultParcelThesis: ParcelThesisInput = {
  useCase: "Equestrian, event, or long-hold development site",
  market: "Charlotte-region Carolinas",
  acreageRange: "50-300 acres",
  budget: "$1.5M-$8M",
  mustHaves: "road frontage, utility path, defensible access, room for phased development",
  riskFactors: "floodplain, unclear easements, stale listing links, entitlement uncertainty",
  notes:
    "Prioritize source-aware 50+ acre opportunities that can survive a first diligence memo without overstating what is known.",
  listingLinks: "",
};

export const sourceStatusLabels: Record<ParcelSourceStatus, string> = {
  live: "Live link present",
  partial: "Partial source",
  unknown: "Unknown source",
  dead: "Dead or stale source",
};

export const sourceTypeLabels: Record<ParcelSourceType, string> = {
  broker: "Broker",
  "land-listing": "Land listing",
  "county-gis": "County GIS",
  manual: "Manual lead",
  seed: "Seed data",
  unknown: "Unknown",
};

export const suitabilityCategoryLabels: Record<ParcelSuitabilityCategory, string> = {
  strong_fit: "Strong fit",
  conditional_fit: "Conditional fit",
  weak_fit: "Weak fit",
  disqualified: "Disqualified",
  needs_source_review: "Needs source review",
};

export const driveTimeBands = [
  {
    id: "near",
    label: "0-35 min",
    title: "Best for recurring use",
    description: "Most compelling for lessons, club activity, events, sponsor access, and repeat operations.",
  },
  {
    id: "destination",
    label: "35-55 min",
    title: "Viable destination property",
    description: "Can work if acreage, pricing, road access, and event upside are strong enough.",
  },
  {
    id: "strategic",
    label: "55+ min",
    title: "Strategic / value review",
    description: "Needs a strong land thesis, regional partner, or value angle to justify distance.",
  },
] as const;

export function formatCurrency(value?: number) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value?: number, maximumFractionDigits = 0) {
  if (value === undefined || value === null) {
    return "Unknown";
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

export function splitList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extractListingLinks(value: string) {
  const matches = value.match(/https?:\/\/[^\s,]+/gi) ?? [];
  return Array.from(new Set(matches.map((item) => item.replace(/[).;]+$/, ""))));
}

export function getOpportunityStrength(opportunity: ParcelOpportunity) {
  return opportunity.fitScore + opportunity.readinessScore - opportunity.riskScore;
}

export function getBestCandidate(opportunities: ParcelOpportunity[]) {
  return [...opportunities].sort((a, b) => getOpportunityStrength(b) - getOpportunityStrength(a))[0];
}

export function getDriveBand(opportunity: ParcelOpportunity) {
  const minutes = opportunity.driveTimeMinutes ?? 999;
  if (minutes <= 35) return driveTimeBands[0];
  if (minutes <= 55) return driveTimeBands[1];
  return driveTimeBands[2];
}

export function summarizeShortlist(opportunities: ParcelOpportunity[]) {
  if (!opportunities.length) {
    return "No parcel has been shortlisted yet. Add one or more candidates to compare fit, risk, missing data, and next diligence.";
  }

  const best = getBestCandidate(opportunities);
  const avgFit = opportunities.reduce((total, opportunity) => total + opportunity.fitScore, 0) / opportunities.length;
  const avgReadiness =
    opportunities.reduce((total, opportunity) => total + opportunity.readinessScore, 0) / opportunities.length;

  return `${best.title} is the strongest current fit by combined fit, readiness, and risk discipline. The shortlist averages ${avgFit.toFixed(
    0,
  )}/100 fit and ${avgReadiness.toFixed(0)}/100 readiness, with source verification still required before any reliance.`;
}

export function getLocalSuitability(opportunity: ParcelOpportunity): ParcelCandidateSuitability {
  const rawScore = Math.round(opportunity.fitScore * 0.45 + opportunity.readinessScore * 0.35 + (100 - opportunity.riskScore) * 0.2);
  const score = Math.max(0, Math.min(100, rawScore));
  const category: ParcelSuitabilityCategory =
    opportunity.sourceStatus !== "live"
      ? "needs_source_review"
      : score >= 82
        ? "strong_fit"
        : score >= 68
          ? "conditional_fit"
          : score >= 50
            ? "weak_fit"
            : "disqualified";
  const dealKillers = [
    opportunity.riskScore >= 65 ? "High risk score; verify entitlement, access, utilities, and environmental constraints before advancing." : "",
    opportunity.missingData.some((item) => /wetlands|floodplain/i.test(item))
      ? "Wetlands or floodplain constraints could materially reduce usable acreage."
      : "",
    opportunity.missingData.some((item) => /zoning/i.test(item)) ? "Zoning path is not proven by the current record." : "",
    opportunity.missingData.some((item) => /access|frontage/i.test(item))
      ? "Access/frontage must be verified before site planning or valuation reliance."
      : "",
  ].filter(Boolean);

  return {
    candidateId: opportunity.id,
    category,
    suitabilityScore: score,
    reasons: [
      `${opportunity.fitScore}/100 fit and ${opportunity.readinessScore}/100 readiness against the current thesis.`,
      `${opportunity.riskScore}/100 risk keeps the recommendation caveated until missing data is cleared.`,
      opportunity.sourceVerification,
    ],
    dealKillers,
    nextQuestions: [
      `Is ${opportunity.title} still active, and can acreage, asking price, ownership, and parcel IDs be confirmed?`,
      "Can the broker provide survey, county GIS parcel map, zoning confirmation, and easement/access documents?",
      "Are there known utility, floodplain/wetlands, entrance, parking, or use-permission constraints?",
    ],
  };
}

export function buildParcelResearchRequest(
  thesis: ParcelThesisInput,
  selectedOpportunityIds: string[],
  shortlistedOpportunityIds: string[],
) {
  return {
    thesis: {
      useCase: thesis.useCase,
      market: thesis.market,
      acreageRange: thesis.acreageRange,
      budget: thesis.budget,
      mustHaves: splitList(thesis.mustHaves),
      riskFactors: splitList(thesis.riskFactors),
      notes: thesis.notes,
      listingLinks: extractListingLinks(thesis.listingLinks),
    },
    selectedOpportunityIds,
    shortlistedOpportunityIds,
  };
}

export function buildLocalParcelResearchResult(
  thesis: ParcelThesisInput,
  candidates: ParcelOpportunity[],
): ParcelResearchResult {
  const ranked = [...candidates].sort((a, b) => getOpportunityStrength(b) - getOpportunityStrength(a));
  const best = ranked[0];
  const missingData = Array.from(new Set(ranked.flatMap((candidate) => candidate.missingData))).slice(0, 10);
  const nextDiligence = Array.from(new Set(ranked.flatMap((candidate) => candidate.nextDiligence))).slice(0, 8);
  const mustHaves = splitList(thesis.mustHaves);
  const riskFactors = splitList(thesis.riskFactors);

  return {
    mode: "fallback",
    normalizedThesis: {
      useCase: thesis.useCase,
      market: thesis.market,
      acreageRange: thesis.acreageRange,
      budget: thesis.budget,
      mustHaves,
      riskFactors,
    },
    rankedCandidateIds: ranked.map((candidate) => candidate.id),
    toolEvents: [
      {
        toolName: "extract_project_thesis",
        status: "complete",
        summary: `Normalized ${thesis.useCase} in ${thesis.market} into screenable criteria.`,
      },
      {
        toolName: "normalize_listing_links",
        status: extractListingLinks(thesis.listingLinks).length ? "complete" : "skipped",
        summary: `Recorded ${extractListingLinks(thesis.listingLinks).length} user-provided listing link(s) as unverified context.`,
      },
      {
        toolName: "score_property_suitability",
        status: "complete",
        summary: `Scored ${ranked.length} candidate(s) into suitability categories.`,
      },
      {
        toolName: "audit_sources_and_missing_data",
        status: "complete",
        summary: `Found ${missingData.length} missing data point(s) across the current candidate set.`,
      },
      {
        toolName: "generate_broker_questions",
        status: "complete",
        summary: "Generated broker and county-record questions for next diligence.",
      },
    ],
    candidateSuitability: ranked.map(getLocalSuitability).sort((a, b) => b.suitabilityScore - a.suitabilityScore),
    sourceAudit: ranked.map((candidate) => ({
      candidateId: candidate.id,
      title: candidate.title,
      status: candidate.sourceStatus,
      note: candidate.sourceVerification,
      url: candidate.sourceUrl ?? null,
    })),
    missingData,
    warnings: [
      "Fallback mode uses committed demo records and deterministic ranking.",
      "Parcel Intelligence is research support, not brokerage, appraisal, legal, engineering, tax, or investment advice.",
      "Every listing, parcel, zoning, access, ownership, and environmental fact must be independently verified before reliance.",
    ],
    nextDiligence,
    memo: {
      executiveSummary: best
        ? `${best.title} is the current strongest fit for a ${thesis.useCase.toLowerCase()} thesis in ${thesis.market}, pending source, parcel, zoning, access, and environmental diligence.`
        : `Parcel Intelligence needs at least one candidate before it can draft a useful memo for ${thesis.market}.`,
      sourceReadiness:
        "The preview separates source status from investment readiness. Live or exact listing links are treated as research aids, not verified acquisition facts.",
      diligencePlan: nextDiligence.slice(0, 5),
      paidMemoScope: [
        "Verify active listing status, acreage, parcel boundary, ownership, and source chain.",
        "Pull county GIS, zoning, floodplain, wetlands, access, utility, and easement records.",
        "Rank candidates against the thesis and write a human-reviewed diligence memo with caveats.",
      ],
    },
  };
}
