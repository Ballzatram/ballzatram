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

export function getOpportunityStrength(opportunity: ParcelOpportunity) {
  return opportunity.fitScore + opportunity.readinessScore - opportunity.riskScore;
}

export function getBestCandidate(opportunities: ParcelOpportunity[]) {
  return [...opportunities].sort((a, b) => getOpportunityStrength(b) - getOpportunityStrength(a))[0];
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
