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
