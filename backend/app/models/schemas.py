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
    status: Literal["live", "fallback", "missing", "unknown"] = "unknown"
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


