export type ParcelSourceStatus = "live" | "partial" | "unknown" | "dead";

export type ParcelSourceType =
  | "broker"
  | "land-listing"
  | "county-gis"
  | "manual"
  | "seed"
  | "unknown";

export type ParcelOpportunity = {
  id: string;
  title: string;
  county?: string;
  state?: string;
  market?: string;
  acreage?: number;
  price?: number;
  pricePerAcre?: number;
  distanceLabel?: string;
  driveTimeMinutes?: number;
  sourceType: ParcelSourceType;
  sourceStatus: ParcelSourceStatus;
  sourceUrl?: string;
  dataConfidence: number;
  fitScore: number;
  riskScore: number;
  readinessScore: number;
  tier?: string;
  rationale: string;
  diligenceConcerns: string[];
  nextDiligence: string[];
  missingData?: string[];
  tags?: string[];
  verificationNote: string;
};

export const parcelOpportunities: ParcelOpportunity[] = [
  {
    id: "richburg-old-catholic-church",
    title: "Old Catholic Church Road assemblage",
    county: "Chester County",
    state: "SC",
    market: "I-77 South / Richburg",
    acreage: 117,
    price: 1450000,
    pricePerAcre: 12393,
    distanceLabel: "35-45 min from Charlotte region",
    driveTimeMinutes: 42,
    sourceType: "land-listing",
    sourceStatus: "partial",
    sourceUrl: "https://www.landsearch.com/properties/old-catholic-church-rd-richburg-sc-29729/5043157",
    dataConfidence: 62,
    fitScore: 82,
    riskScore: 44,
    readinessScore: 68,
    tier: "Diligence candidate",
    rationale:
      "Large enough for a flexible land thesis with I-77 corridor access and a source link retained from the Parcel MVP. The current page does not fetch the listing live, so all listing facts stay caveated.",
    diligenceConcerns: [
      "Current listing status and acreage need source re-check.",
      "Floodplain, wetlands, and easements are unknown from the demo record.",
      "Utility access and road frontage need county and broker confirmation.",
    ],
    nextDiligence: [
      "Call the listing contact or broker platform to confirm active status.",
      "Pull Chester County GIS parcel card and boundary.",
      "Screen FEMA floodplain, wetlands, access, and utility tie-in assumptions.",
    ],
    missingData: ["zoning", "parcel boundary", "utility letters", "environmental constraints"],
    tags: ["50+ acres", "I-77", "South Carolina", "listing seed"],
    verificationNote:
      "Seed listing URL retained from Parcel MVP. Treat price, acreage, and status as demo inputs until independently verified.",
  },
  {
    id: "fort-lawn-hightower-road",
    title: "Hightower Road tract",
    county: "Chester County",
    state: "SC",
    market: "Fort Lawn / Catawba River side",
    acreage: 68,
    price: 850000,
    pricePerAcre: 12500,
    distanceLabel: "40-50 min from Charlotte region",
    driveTimeMinutes: 48,
    sourceType: "land-listing",
    sourceStatus: "unknown",
    sourceUrl: "https://www.landsearch.com/properties/fort-lawn-sc/5095610",
    dataConfidence: 54,
    fitScore: 74,
    riskScore: 53,
    readinessScore: 57,
    tier: "Source re-check",
    rationale:
      "The tract clears a 50+ acre screen and sits in a plausible regional search band, but the committed seed record is thin. It belongs in the queue as a prompt for source verification, not as a ranked recommendation.",
    diligenceConcerns: [
      "Acreage and pricing are demo-normalized and may not match current listing data.",
      "Parcel access, topography, and floodplain exposure are not established.",
      "No county GIS source has been attached to the demo record.",
    ],
    nextDiligence: [
      "Verify whether the listing link still resolves to an active opportunity.",
      "Locate parcel IDs and check ownership, zoning, and access.",
      "Ask broker for survey, timber/clearing notes, and utility availability.",
    ],
    missingData: ["parcel IDs", "survey", "active status", "access rights"],
    tags: ["50+ acres", "source unknown", "broker call"],
    verificationNote:
      "The page keeps unknown-source candidates visible so weak evidence cannot look stronger than it is.",
  },
  {
    id: "rock-hill-highway-324",
    title: "Highway 324 development lead",
    county: "York County",
    state: "SC",
    market: "Rock Hill / Highway frontage",
    acreage: 54,
    price: 2200000,
    pricePerAcre: 40741,
    distanceLabel: "25-35 min from Charlotte region",
    driveTimeMinutes: 33,
    sourceType: "land-listing",
    sourceStatus: "live",
    sourceUrl: "https://www.landsearch.com/properties/3805-e-highway-324-rock-hill-sc-29732/4693533",
    dataConfidence: 70,
    fitScore: 79,
    riskScore: 58,
    readinessScore: 64,
    tier: "Closer-in review",
    rationale:
      "Closer market access improves sponsor, event, or development optionality, while higher implied basis and entitlement complexity keep the risk score elevated.",
    diligenceConcerns: [
      "Price per acre may compress flexibility if entitlement scope is limited.",
      "Frontage, ingress, and traffic implications need review.",
      "Zoning and municipal/county jurisdiction need confirmation.",
    ],
    nextDiligence: [
      "Confirm listing status and ask for offering memorandum.",
      "Check York County zoning, road access, and utility maps.",
      "Estimate entitlement path and likely pre-development cost.",
    ],
    missingData: ["entitlement path", "traffic/access notes", "utility capacity"],
    tags: ["frontage", "closer-in", "higher basis"],
    verificationNote:
      "Source link is present in the seed set. Parcel still requires independent confirmation before reliance.",
  },
  {
    id: "edgemoor-westbrook-road",
    title: "Westbrook Road land-bank lead",
    county: "Chester County",
    state: "SC",
    market: "Edgemoor / rural land-bank",
    acreage: 142,
    price: 990000,
    pricePerAcre: 6972,
    distanceLabel: "40-55 min from Charlotte region",
    driveTimeMinutes: 52,
    sourceType: "seed",
    sourceStatus: "dead",
    sourceUrl: "https://www.landsearch.com/properties/westbrook-rd-edgemoor-sc-29712/3187032",
    dataConfidence: 38,
    fitScore: 66,
    riskScore: 72,
    readinessScore: 39,
    tier: "Archive / dead-source watch",
    rationale:
      "The acreage and basis look interesting in a seed record, but the source is intentionally marked weak. It should stay visible as a watch item only if a human can reacquire a current source.",
    diligenceConcerns: [
      "Source may be stale, removed, or materially changed.",
      "No current listing facts should be used without reacquiring the source.",
      "Unknown environmental and access constraints dominate the risk profile.",
    ],
    nextDiligence: [
      "Search current broker and county records before discussing the lead.",
      "If no current source exists, archive the candidate from active shortlist.",
      "Record why the source failed so it does not re-enter as fresh evidence.",
    ],
    missingData: ["current source", "price", "listing status", "ownership"],
    tags: ["dead source", "archive", "land bank"],
    verificationNote:
      "Dead-source examples are kept in the demo to show how Parcel flags weak evidence instead of hiding it.",
  },
  {
    id: "manual-i77-assembly",
    title: "I-77 frontage assembly lead",
    county: "York / Chester County",
    state: "SC",
    market: "I-77 South corridor",
    acreage: 210,
    price: undefined,
    pricePerAcre: undefined,
    distanceLabel: "30-50 min from Charlotte region",
    driveTimeMinutes: 44,
    sourceType: "manual",
    sourceStatus: "unknown",
    dataConfidence: 46,
    fitScore: 71,
    riskScore: 66,
    readinessScore: 45,
    tier: "Manual thesis lead",
    rationale:
      "A manual thesis lead can be useful before a broker packet exists, but missing price, parcel IDs, and seller context prevent it from outranking source-backed opportunities.",
    diligenceConcerns: [
      "No source URL is attached.",
      "Assemblage feasibility and ownership fragmentation are unknown.",
      "Pricing and seller motivation are not established.",
    ],
    nextDiligence: [
      "Identify parcel IDs and ownership from county GIS.",
      "Check frontage, access, utilities, and zoning for each parcel.",
      "Decide whether the lead belongs in a broker outreach list.",
    ],
    missingData: ["source URL", "seller", "price", "parcel IDs"],
    tags: ["manual", "assemblage", "frontage"],
    verificationNote:
      "Manual lead added to show how Parcel handles user-entered opportunities with no source attached.",
  },
];
