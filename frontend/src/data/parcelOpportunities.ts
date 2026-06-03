import parcelOpportunityRecords from "../../../data/parcel-opportunities.json";

export type ParcelSourceStatus = "live" | "partial" | "unknown" | "dead";

export type ParcelSourceType =
  | "broker"
  | "land-listing"
  | "county-gis"
  | "manual"
  | "seed"
  | "unknown";

export type ParcelRecommendationTier =
  | "Tier 1 - Facility Candidate"
  | "Tier 2 - Destination / Event Use"
  | "Tier 3 - Land Bank / Conservation"
  | "Watchlist";

export type ParcelOpportunity = {
  id: string;
  title: string;
  county: string;
  state: string;
  market: string;
  acreage?: number;
  price?: number;
  pricePerAcre?: number;
  distanceMiles?: number;
  distanceLabel?: string;
  driveTimeMinutes?: number;
  latitude?: number;
  longitude?: number;
  mapX?: number;
  mapY?: number;
  sourceType: ParcelSourceType;
  sourceStatus: ParcelSourceStatus;
  sourceUrl?: string;
  sourceLabel?: string;
  listingId?: string;
  lastResearched?: string;
  dataConfidence: number;
  fitScore: number;
  riskScore: number;
  readinessScore: number;
  tier: ParcelRecommendationTier;
  rationale: string;
  sourceVerification: string;
  diligenceConcerns: string[];
  nextDiligence: string[];
  missingData: string[];
  tags: string[];
  verificationNote: string;
};

export const parcelOpportunities = parcelOpportunityRecords as ParcelOpportunity[];
