from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class MissingPolicy(str, Enum):
    drop = "drop"
    interpolate = "interpolate"
    ffill = "ffill"


class TimeSeriesPoint(BaseModel):
    date: date
    value: float


class AnalysisRequest(BaseModel):
    asset: str = Field(min_length=1)
    macro_series: List[str] = Field(min_length=2)
    start_date: date
    end_date: date
    frequency: Literal["D", "W", "M"] = "M"
    missing_policy: MissingPolicy = MissingPolicy.interpolate


class ScenarioRequest(BaseModel):
    name: str
    shocks: Dict[str, float]
    holdings: Dict[str, float]

    @field_validator("holdings")
    @classmethod
    def validate_weights(cls, holdings: Dict[str, float]) -> Dict[str, float]:
        if not holdings:
            raise ValueError("holdings cannot be empty")
        total = sum(holdings.values())
        if total <= 0:
            raise ValueError("holdings weights must sum to a positive number")
        return holdings


class EventStudyRequest(BaseModel):
    asset: str
    event_name: str
    release_dates: List[date]
    window: int = Field(default=5, ge=1, le=20)


class CsvUploadRequest(BaseModel):
    csv_text: str
    date_col: str = "date"
    frequency: Literal["D", "W", "M"] = "M"


class ReportRequest(BaseModel):
    title: str
    findings: List[str]
    scenario_outcomes: Dict[str, float] = Field(default_factory=dict)


class WarningEnvelope(BaseModel):
    correlation_warning: str
    model_assumptions: List[str]


class OlsResponse(BaseModel):
    coefficients: Dict[str, float]
    p_values: Dict[str, float]
    r_squared: float
    confidence_intervals: Dict[str, List[float]]
    warnings: WarningEnvelope


class AgentProcess(BaseModel):
    id: str
    title: str
    outcome: str
    starter_prompt: str
    steps: List[str]


class AgentProcessesResponse(BaseModel):
    processes: Dict[str, List[AgentProcess]]


class AgentMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


class ToolSource(BaseModel):
    title: str
    url: Optional[str] = None
    status: Literal["live", "cached", "demo", "stale", "fallback", "missing", "error", "unknown"] = "unknown"
    description: str = ""


class ToolAction(BaseModel):
    label: str
    description: str = ""
    href: Optional[str] = None


class ToolCard(BaseModel):
    title: str
    type: Literal["opportunity", "risk", "recommendation", "data", "next_step"]
    content: str
    confidence: Literal["low", "medium", "high"] = "medium"
    assumptions: List[str] = Field(default_factory=list)
    sources: List[ToolSource] = Field(default_factory=list)
    actions: List[ToolAction] = Field(default_factory=list)


class ToolRisk(BaseModel):
    title: str
    severity: Literal["low", "medium", "high"] = "medium"
    content: str
    mitigation: str = ""
    confidence: Literal["low", "medium", "high"] = "medium"


class ToolOutput(BaseModel):
    summary: str
    cards: List[ToolCard] = Field(default_factory=list)
    risks: List[ToolRisk] = Field(default_factory=list)
    missingData: List[str] = Field(default_factory=list)
    recommendedNextSteps: List[str] = Field(default_factory=list)
    sources: List[ToolSource] = Field(default_factory=list)
    confidence: Literal["low", "medium", "high"] = "medium"
    status: Literal["empty", "complete", "partial_success", "error"] = "complete"


class ParcelResearchThesis(BaseModel):
    useCase: str = Field(min_length=1, max_length=160)
    market: str = Field(min_length=1, max_length=160)
    acreageRange: str = Field(default="", max_length=80)
    budget: str = Field(default="", max_length=80)
    mustHaves: List[str] = Field(default_factory=list, max_length=20)
    riskFactors: List[str] = Field(default_factory=list, max_length=20)
    notes: str = Field(default="", max_length=2000)
    listingLinks: List[str] = Field(default_factory=list, max_length=20)


class ParcelCandidateInput(BaseModel):
    sourceUrl: Optional[str] = Field(default=None, max_length=800)
    notes: str = Field(min_length=1, max_length=3000)
    title: Optional[str] = Field(default=None, max_length=160)


class ParcelResearchRequest(BaseModel):
    thesis: ParcelResearchThesis
    selectedOpportunityIds: List[str] = Field(default_factory=list, max_length=20)
    shortlistedOpportunityIds: List[str] = Field(default_factory=list, max_length=20)
    candidateInputs: List[ParcelCandidateInput] = Field(default_factory=list, max_length=20)


class ParcelNormalizedThesis(BaseModel):
    useCase: str
    market: str
    acreageRange: str
    budget: str
    mustHaves: List[str] = Field(default_factory=list)
    riskFactors: List[str] = Field(default_factory=list)


class ParcelSourceAuditItem(BaseModel):
    candidateId: Optional[str] = None
    title: str
    status: Literal["live", "partial", "unknown", "dead", "fallback", "missing"]
    note: str
    url: Optional[str] = None


class ParcelToolEvent(BaseModel):
    toolName: str
    status: Literal["complete", "fallback", "skipped"] = "complete"
    summary: str


class ParcelCandidateSuitability(BaseModel):
    candidateId: str
    category: Literal["strong_fit", "conditional_fit", "weak_fit", "disqualified", "needs_source_review"]
    suitabilityScore: int = Field(ge=0, le=100)
    reasons: List[str] = Field(default_factory=list)
    dealKillers: List[str] = Field(default_factory=list)
    nextQuestions: List[str] = Field(default_factory=list)


class ParcelCandidateRecord(BaseModel):
    id: str
    title: str
    county: str = ""
    state: str = ""
    market: str = ""
    acreage: Optional[float] = None
    price: Optional[float] = None
    pricePerAcre: Optional[float] = None
    distanceMiles: Optional[float] = None
    distanceLabel: Optional[str] = None
    driveTimeMinutes: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    mapX: Optional[float] = None
    mapY: Optional[float] = None
    sourceType: Literal["broker", "land-listing", "county-gis", "manual", "seed", "unknown"] = "unknown"
    sourceStatus: Literal["live", "partial", "unknown", "dead"] = "unknown"
    sourceUrl: Optional[str] = None
    sourceLabel: Optional[str] = None
    listingId: Optional[str] = None
    lastResearched: Optional[str] = None
    dataConfidence: int = Field(ge=0, le=100)
    fitScore: int = Field(ge=0, le=100)
    riskScore: int = Field(ge=0, le=100)
    readinessScore: int = Field(ge=0, le=100)
    tier: Literal[
        "Tier 1 - Facility Candidate",
        "Tier 2 - Destination / Event Use",
        "Tier 3 - Land Bank / Conservation",
        "Watchlist",
    ] = "Watchlist"
    rationale: str
    sourceVerification: str
    diligenceConcerns: List[str] = Field(default_factory=list)
    nextDiligence: List[str] = Field(default_factory=list)
    missingData: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    verificationNote: str


class ParcelMemoSections(BaseModel):
    executiveSummary: str
    sourceReadiness: str
    diligencePlan: List[str] = Field(default_factory=list)
    memoScope: List[str] = Field(default_factory=list)


class ParcelResearchResponse(BaseModel):
    mode: Literal["ai", "fallback"] = "fallback"
    normalizedThesis: ParcelNormalizedThesis
    rankedCandidateIds: List[str] = Field(default_factory=list)
    toolEvents: List[ParcelToolEvent] = Field(default_factory=list)
    candidateSuitability: List[ParcelCandidateSuitability] = Field(default_factory=list)
    candidateRecords: List[ParcelCandidateRecord] = Field(default_factory=list)
    sourceAudit: List[ParcelSourceAuditItem] = Field(default_factory=list)
    missingData: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    nextDiligence: List[str] = Field(default_factory=list)
    memo: ParcelMemoSections


class ParcelCandidateListResponse(BaseModel):
    candidateRecords: List[ParcelCandidateRecord] = Field(default_factory=list)


class AgentChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    page_id: str = Field(min_length=1, max_length=64)
    process_id: Optional[str] = Field(default=None, max_length=64)
    conversation_id: Optional[str] = Field(default=None, max_length=80)


class AgentChatResponse(BaseModel):
    conversation_id: str
    page_id: str
    process_id: str
    answer: str
    structured_output: Optional[ToolOutput] = None
    history: List[AgentMessage]


class AgentHistoryResponse(BaseModel):
    conversation_id: str
    messages: List[AgentMessage]


