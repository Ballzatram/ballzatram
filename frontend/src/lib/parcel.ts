import type {
  ParcelConfidenceStatus,
  ParcelFreshnessStatus,
  ParcelOpportunity,
  ParcelSourceStatus,
  ParcelSourceTrustStatus,
  ParcelSourceType,
} from "@/data/parcelOpportunities";

export type ParcelThesis = {
  intendedUse: string;
  targetCountyOrRegion: string;
  budgetMin: number;
  budgetMax: number;
  acreageMin: number;
  acreageMax: number;
  mustHaves: string;
  dealBreakers: string;
  riskTolerance: ParcelRiskTolerance;
};

export type ParcelThesisInput = ParcelThesis & {
  listingLinks: string;
};

export type ParcelRiskTolerance = "low" | "medium" | "high";

export type ParcelCandidateInput = {
  sourceUrl?: string;
  notes: string;
  title?: string;
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
  fitAssumptions?: string[];
  flagsQuestions?: string[];
};

export type ParcelFitAssessment = {
  candidateId: string;
  score: number;
  category: ParcelSuitabilityCategory;
  assumptions: string[];
  flagsQuestions: string[];
  componentScores: {
    acreage: number;
    budget: number;
    region: number;
    mustHaves: number;
    risk: number;
    readiness: number;
  };
};

export type ParcelMemoSections = {
  executiveSummary: string;
  sourceReadiness: string;
  diligencePlan: string[];
  memoScope: string[];
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
  candidateRecords: ParcelOpportunity[];
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
  intendedUse: "Equestrian, event, or long-hold development site",
  targetCountyOrRegion: "Charlotte-region Carolinas",
  budgetMin: 1_500_000,
  budgetMax: 8_000_000,
  acreageMin: 50,
  acreageMax: 300,
  mustHaves: "road frontage, utility path, defensible access, room for phased development",
  dealBreakers: "floodplain, unclear easements, stale listing links, entitlement uncertainty",
  riskTolerance: "medium",
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
  disqualified: "Needs major review",
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

export function formatBudgetRange(thesis: ParcelThesisInput) {
  return `${formatCurrency(thesis.budgetMin)}-${formatCurrency(thesis.budgetMax)}`;
}

export function formatAcreageRange(thesis: ParcelThesisInput) {
  return `${formatNumber(thesis.acreageMin, 0)}-${formatNumber(thesis.acreageMax, 0)} acres`;
}

export function getParcelSourceTrustStatus(opportunity: ParcelOpportunity): ParcelSourceTrustStatus {
  if (opportunity.sourceTrustStatus) return opportunity.sourceTrustStatus;
  if (opportunity.sourceType === "manual" || opportunity.id.startsWith("user-")) return "user-provided";
  if (opportunity.sourceType === "county-gis") return "public-record";
  if (opportunity.sourceStatus === "partial") return "estimated";
  if (opportunity.sourceType === "seed" || opportunity.lastResearched || opportunity.sourceLabel?.includes("LandSearch exact listing")) {
    return "demo";
  }
  return "unknown";
}

export function getParcelFreshnessStatus(opportunity: ParcelOpportunity): ParcelFreshnessStatus {
  if (opportunity.freshnessStatus) return opportunity.freshnessStatus;
  if (!opportunity.lastResearched) return "unknown";

  const researchedAt = new Date(`${opportunity.lastResearched}T00:00:00`);
  if (Number.isNaN(researchedAt.getTime())) return "unknown";

  const ageDays = (Date.now() - researchedAt.getTime()) / 86_400_000;
  return ageDays <= 60 ? "current" : "stale";
}

export function getParcelConfidenceStatus(opportunity: ParcelOpportunity): ParcelConfidenceStatus {
  if (opportunity.confidenceStatus) return opportunity.confidenceStatus;
  const sourceTrustStatus = getParcelSourceTrustStatus(opportunity);
  if (sourceTrustStatus === "user-provided" || sourceTrustStatus === "unknown" || opportunity.sourceStatus === "unknown") {
    return "needs-verification";
  }
  if (opportunity.dataConfidence >= 80) return "high";
  if (opportunity.dataConfidence >= 65) return "medium";
  if (opportunity.dataConfidence >= 50) return "low";
  return "needs-verification";
}

function base36(value: number) {
  return Math.max(0, value).toString(36);
}

export function stableUserCandidateId(sourceUrl: string, notes: string, title: string) {
  const canonical = `${sourceUrl.trim().toLowerCase()}|${title.trim().toLowerCase()}|${notes.trim().toLowerCase()}`;
  let value = 0;
  for (const character of canonical) {
    value = (value * 31 + character.charCodeAt(0)) % 1_000_000_007;
  }
  return `user-${base36(value)}`;
}

function firstLine(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
}

function urlHost(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function extractAcreage(notes: string) {
  const match = notes.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:acres|acre|ac\b)/i);
  return match ? Number(match[1]) : undefined;
}

function extractPrice(notes: string) {
  const match = notes.match(/\$\s*(\d+(?:[,\d]{0,12})?(?:\.\d+)?)\s*(m|million|k)?\b/i);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ""));
  const unit = (match[2] ?? "").toLowerCase();
  if (unit === "m" || unit === "million") return amount * 1_000_000;
  if (unit === "k") return amount * 1_000;
  return amount;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function candidateSearchText(opportunity: ParcelOpportunity) {
  return [
    opportunity.title,
    opportunity.county,
    opportunity.state,
    opportunity.market,
    opportunity.rationale,
    opportunity.sourceVerification,
    opportunity.verificationNote,
    ...opportunity.diligenceConcerns,
    ...opportunity.nextDiligence,
    ...opportunity.missingData,
    ...opportunity.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function criteriaTerms(value: string) {
  const stopWords = new Set([
    "and",
    "or",
    "the",
    "for",
    "with",
    "without",
    "room",
    "path",
    "clear",
    "defensible",
    "unknown",
    "unclear",
  ]);

  return splitList(value)
    .flatMap((item) => item.toLowerCase().split(/[^a-z0-9]+/))
    .map((item) => item.trim())
    .filter((item) => item.length >= 4 && !stopWords.has(item));
}

function scoreRange(value: number | undefined, min: number, max: number) {
  if (value === undefined || value === null || min <= 0 || max <= 0 || min > max) return 50;
  if (value >= min && value <= max) return 100;
  const nearest = value < min ? min : max;
  const deviation = Math.abs(value - nearest) / nearest;
  return clampScore(100 - deviation * 120);
}

function scoreRegion(opportunity: ParcelOpportunity, thesis: ParcelThesisInput) {
  const region = thesis.targetCountyOrRegion.trim().toLowerCase();
  if (!region) return 70;
  const tokens = region.split(/[^a-z0-9]+/).filter((item) => item.length >= 3);
  const text = `${opportunity.county} ${opportunity.state} ${opportunity.market}`.toLowerCase();
  if (!tokens.length) return 70;
  const matches = tokens.filter((token) => text.includes(token)).length;
  return clampScore(45 + (matches / tokens.length) * 55);
}

function scoreMustHaves(opportunity: ParcelOpportunity, thesis: ParcelThesisInput) {
  const terms = criteriaTerms(thesis.mustHaves);
  if (!terms.length) return 70;
  const text = candidateSearchText(opportunity);
  const matches = terms.filter((term) => text.includes(term)).length;
  return clampScore(45 + (matches / terms.length) * 55);
}

function scoreRiskTolerance(opportunity: ParcelOpportunity, thesis: ParcelThesisInput) {
  const targetRisk = thesis.riskTolerance === "low" ? 42 : thesis.riskTolerance === "medium" ? 58 : 74;
  const excessRisk = Math.max(0, opportunity.riskScore - targetRisk);
  const base = 100 - excessRisk * 1.6;
  return clampScore(base - Math.max(0, opportunity.missingData.length - 3) * 3);
}

export function scoreParcelAgainstThesis(opportunity: ParcelOpportunity, thesis: ParcelThesisInput): ParcelFitAssessment {
  const acreage = scoreRange(opportunity.acreage, thesis.acreageMin, thesis.acreageMax);
  const budget = scoreRange(opportunity.price, thesis.budgetMin, thesis.budgetMax);
  const region = scoreRegion(opportunity, thesis);
  const mustHaves = scoreMustHaves(opportunity, thesis);
  const risk = scoreRiskTolerance(opportunity, thesis);
  const readiness = clampScore(opportunity.readinessScore);
  const score = clampScore(
    acreage * 0.2 +
      budget * 0.18 +
      region * 0.12 +
      mustHaves * 0.2 +
      risk * 0.18 +
      readiness * 0.12,
  );
  const category: ParcelSuitabilityCategory =
    getParcelSourceTrustStatus(opportunity) === "user-provided" || getParcelSourceTrustStatus(opportunity) === "unknown"
      ? "needs_source_review"
      : score >= 82
        ? "strong_fit"
        : score >= 68
          ? "conditional_fit"
          : score >= 50
            ? "weak_fit"
            : "disqualified";
  const mustHaveTerms = criteriaTerms(thesis.mustHaves);
  const matchedTerms = mustHaveTerms.filter((term) => candidateSearchText(opportunity).includes(term));
  const assumptions = [
    `Acreage fit compares ${formatNumber(opportunity.acreage, 1)} acres against the ${formatAcreageRange(thesis)} thesis range.`,
    `Budget fit compares ${formatCurrency(opportunity.price)} against the ${formatBudgetRange(thesis)} thesis range.`,
    `Must-have fit uses demo text fields and matched ${matchedTerms.length} of ${mustHaveTerms.length || 0} extracted criteria terms.`,
    `Risk fit treats risk tolerance as ${thesis.riskTolerance} and keeps open items as flags/questions for review.`,
    `Readiness uses the existing demo readiness score and source caveats, not field-verified diligence.`,
  ];
  const dealBreakerTerms = criteriaTerms(thesis.dealBreakers);
  const text = candidateSearchText(opportunity);
  const matchedDealBreakers = dealBreakerTerms.filter((term) => text.includes(term));
  const flagsQuestions = Array.from(
    new Set([
      ...matchedDealBreakers.map((term) => `Thesis constraint to review: ${term}.`),
      ...opportunity.missingData.map((item) => `Verify ${item}.`),
      ...(opportunity.riskScore > (thesis.riskTolerance === "low" ? 42 : thesis.riskTolerance === "medium" ? 58 : 74)
        ? ["Risk score is above the current tolerance setting; treat this as a review question."]
        : []),
      ...(opportunity.sourceStatus !== "live" ? ["Source status needs review before relying on candidate facts."] : []),
    ]),
  ).slice(0, 7);

  return {
    candidateId: opportunity.id,
    score,
    category,
    assumptions,
    flagsQuestions,
    componentScores: {
      acreage,
      budget,
      region,
      mustHaves,
      risk,
      readiness,
    },
  };
}

export function normalizeCandidateInputs(
  thesis: ParcelThesisInput,
  inputs: ParcelCandidateInput[],
): ParcelOpportunity[] {
  const candidates: ParcelOpportunity[] = [];

  inputs.forEach((input, index) => {
    const notes = input.notes.trim();
    if (!notes) return;

    const sourceUrl = input.sourceUrl?.trim() || undefined;
    const title = input.title?.trim() || firstLine(notes).slice(0, 90) || `User lead: ${urlHost(sourceUrl) || `property ${index + 1}`}`;
    const acreage = extractAcreage(notes);
    const price = extractPrice(notes);
    const pricePerAcre = acreage && price ? Math.round(price / acreage) : undefined;
    const knownFactCount = [sourceUrl, acreage, price].filter(Boolean).length;
    const mustHaves = thesis.mustHaves.toLowerCase();
    let fitScore = 52;
    if (acreage && acreage >= 50) fitScore += 10;
    if (/(frontage|access|road)/i.test(notes)) fitScore += 6;
    if (/(utility|utilities|water|sewer|power)/i.test(notes)) fitScore += 6;
    if (/(pasture|field|cleared|flat)/i.test(notes)) fitScore += 5;
    if (mustHaves.includes("acre") && !acreage) fitScore -= 4;
    let riskScore = 72;
    if (/(wetland|flood|easement|zoning|entitlement)/i.test(notes)) riskScore += 6;
    if (/(survey|gis|parcel id|zoning confirmed)/i.test(notes)) riskScore -= 6;
    const readinessScore = Math.min(58, 30 + knownFactCount * 6 + (notes.length > 120 ? 8 : 0));
    const dataConfidence = Math.min(48, 28 + knownFactCount * 5 + (notes.length > 120 ? 5 : 0));
    const id = stableUserCandidateId(sourceUrl ?? "", notes, title);
    const mapSeed = Number.parseInt(id.replace("user-", ""), 36);

    candidates.push({
      id,
      title,
      county: "",
      state: "",
      market: thesis.targetCountyOrRegion,
      acreage,
      price,
      pricePerAcre,
      distanceLabel: "User-provided lead; location not verified",
      mapX: 35 + (mapSeed % 30),
      mapY: 34 + (Math.floor(mapSeed / 31) % 42),
      sourceType: "manual",
      sourceStatus: "unknown",
      sourceTrustStatus: "user-provided",
      freshnessStatus: "unknown",
      confidenceStatus: "needs-verification",
      sourceUrl,
      sourceLabel: "User-provided URL + notes",
      dataConfidence,
      fitScore: Math.max(0, Math.min(100, fitScore)),
      riskScore: Math.max(0, Math.min(100, riskScore)),
      readinessScore,
      tier: "Watchlist",
      rationale:
        "User-provided lead created from pasted notes. Parcel can triage it against the thesis, but it has not verified availability, acreage, price, location, zoning, access, or source facts.",
      sourceVerification:
        "Unverified user-provided candidate. No live scraping, broker confirmation, county GIS pull, or listing fact verification has run for this lead.",
      diligenceConcerns: [
        "Source status is unknown until the listing, broker, or owner confirms availability.",
        "Acreage, price, ownership, parcel IDs, zoning, access, utilities, and environmental constraints are unverified.",
        "Use this as a triage placeholder until source documents and county records are collected.",
      ],
      nextDiligence: [
        "Confirm the listing or broker source and capture active status, asking price, acreage, ownership, and parcel IDs.",
        "Pull county GIS parcel boundary, zoning, floodplain/wetlands, access, utility, and easement records.",
        "Replace user notes with verified source documents before relying on suitability or memo conclusions.",
      ],
      missingData: [
        "active listing status",
        "parcel boundary",
        "acreage confirmation",
        "asking price confirmation",
        "zoning/access/utilities",
        "wetlands/floodplain screen",
      ],
      tags: ["user lead", "unverified", "needs source review"],
      verificationNote: "Dynamic lead is session-only and unverified; Parcel did not scrape or verify the source URL.",
    });
  });

  return candidates;
}

export function getOpportunityStrength(opportunity: ParcelOpportunity, thesis: ParcelThesisInput = defaultParcelThesis) {
  return scoreParcelAgainstThesis(opportunity, thesis).score;
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

export function getLocalSuitability(opportunity: ParcelOpportunity, thesis: ParcelThesisInput = defaultParcelThesis): ParcelCandidateSuitability {
  const assessment = scoreParcelAgainstThesis(opportunity, thesis);
  const flagsQuestions = [
    opportunity.riskScore >= 65 ? "High risk score; verify entitlement, access, utilities, and environmental constraints as review questions." : "",
    opportunity.missingData.some((item) => /wetlands|floodplain/i.test(item))
      ? "Wetlands or floodplain constraints could materially reduce usable acreage."
      : "",
    opportunity.missingData.some((item) => /zoning/i.test(item)) ? "Zoning path is not proven by the current record." : "",
    opportunity.missingData.some((item) => /access|frontage/i.test(item))
      ? "Access/frontage must be verified before site planning or valuation reliance."
      : "",
    ...assessment.flagsQuestions,
  ].filter(Boolean);

  return {
    candidateId: opportunity.id,
    category: assessment.category,
    suitabilityScore: assessment.score,
    reasons: [
      `${assessment.score}/100 thesis fit from acreage, budget, region, must-have, risk, and readiness assumptions.`,
      `${opportunity.riskScore}/100 risk keeps the research readout framed as flags/questions until missing data is cleared.`,
      opportunity.sourceVerification,
    ],
    dealKillers: flagsQuestions,
    nextQuestions: [
      `Is ${opportunity.title} still active, and can acreage, asking price, ownership, and parcel IDs be confirmed?`,
      "Can the broker provide survey, county GIS parcel map, zoning confirmation, and easement/access documents?",
      "Are there known utility, floodplain/wetlands, entrance, parking, or use-permission constraints?",
    ],
    fitAssumptions: assessment.assumptions,
    flagsQuestions,
  };
}

export function buildParcelResearchRequest(
  thesis: ParcelThesisInput,
  selectedOpportunityIds: string[],
  shortlistedOpportunityIds: string[],
  candidateInputs: ParcelCandidateInput[] = [],
) {
  return {
    thesis: {
      useCase: thesis.intendedUse,
      market: thesis.targetCountyOrRegion,
      acreageRange: formatAcreageRange(thesis),
      budget: formatBudgetRange(thesis),
      mustHaves: splitList(thesis.mustHaves),
      riskFactors: splitList(thesis.dealBreakers),
      notes: `Risk tolerance: ${thesis.riskTolerance}.`,
      listingLinks: extractListingLinks(thesis.listingLinks),
    },
    selectedOpportunityIds,
    shortlistedOpportunityIds,
    candidateInputs,
  };
}

export function buildLocalParcelResearchResult(
  thesis: ParcelThesisInput,
  candidates: ParcelOpportunity[],
): ParcelResearchResult {
  const ranked = [...candidates].sort((a, b) => getOpportunityStrength(b, thesis) - getOpportunityStrength(a, thesis));
  const best = ranked[0];
  const missingData = Array.from(new Set(ranked.flatMap((candidate) => candidate.missingData))).slice(0, 10);
  const nextDiligence = Array.from(new Set(ranked.flatMap((candidate) => candidate.nextDiligence))).slice(0, 8);
  const mustHaves = splitList(thesis.mustHaves);
  const riskFactors = splitList(thesis.dealBreakers);

  return {
    mode: "fallback",
    normalizedThesis: {
      useCase: thesis.intendedUse,
      market: thesis.targetCountyOrRegion,
      acreageRange: formatAcreageRange(thesis),
      budget: formatBudgetRange(thesis),
      mustHaves,
      riskFactors,
    },
    rankedCandidateIds: ranked.map((candidate) => candidate.id),
    toolEvents: [
      {
        toolName: "extract_project_thesis",
        status: "complete",
        summary: `Normalized ${thesis.intendedUse} in ${thesis.targetCountyOrRegion} into screenable criteria.`,
      },
      {
        toolName: "normalize_listing_links",
        status: extractListingLinks(thesis.listingLinks).length ? "complete" : "skipped",
        summary: `Recorded ${extractListingLinks(thesis.listingLinks).length} user-provided listing link(s) as unverified context.`,
      },
      {
        toolName: "score_parcel_fit",
        status: "complete",
        summary: `Scored ${ranked.length} candidate(s) against acreage, budget, region, must-have, risk, and readiness assumptions.`,
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
    candidateSuitability: ranked.map((candidate) => getLocalSuitability(candidate, thesis)).sort((a, b) => b.suitabilityScore - a.suitabilityScore),
    candidateRecords: ranked,
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
      "Parcel Intelligence is research support, not brokerage, appraisal, legal, engineering, tax, financial, or real-estate advice.",
      "Every listing, parcel, zoning, access, ownership, and environmental fact must be independently verified before reliance.",
    ],
    nextDiligence,
    memo: {
      executiveSummary: best
        ? `${best.title} is the current strongest fit for a ${thesis.intendedUse.toLowerCase()} thesis in ${thesis.targetCountyOrRegion}, pending source, parcel, zoning, access, and environmental diligence.`
        : `Parcel Intelligence needs at least one candidate before it can draft a useful memo for ${thesis.targetCountyOrRegion}.`,
      sourceReadiness:
        "The preview separates source status from research readiness. Live or exact listing links are treated as research aids, not verified parcel facts.",
      diligencePlan: nextDiligence.slice(0, 5),
      memoScope: [
        "Verify active listing status, acreage, parcel boundary, ownership, and source chain.",
        "Pull county GIS, zoning, floodplain, wetlands, access, utility, and easement records.",
        "Rank candidates against the thesis and write a human-reviewed diligence memo with caveats.",
      ],
    },
  };
}
