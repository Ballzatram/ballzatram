from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Dict, List, Literal

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


class AgentMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


class AgentChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    page_id: str = Field(min_length=1, max_length=64)
    process_id: Optional[str] = Field(default=None, max_length=64)
    conversation_id: Optional[str] = Field(default=None, max_length=80)
    access_token: Optional[str] = Field(default=None, max_length=500)


class AgentChatResponse(BaseModel):
    conversation_id: str
    page_id: str
    process_id: str
    answer: str
    history: List[AgentMessage]
    paid_access: bool


class AgentHistoryResponse(BaseModel):
    conversation_id: str
    messages: List[AgentMessage]


class CheckoutRequest(BaseModel):
    page_id: str = Field(default="dashboard", max_length=64)
    success_url: str
    cancel_url: str
    customer_email: Optional[str] = Field(default=None, max_length=320)


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class AccessVerifyRequest(BaseModel):
    session_id: Optional[str] = None
    access_token: Optional[str] = None


class AccessVerifyResponse(BaseModel):
    paid_access: bool
    reason: str


