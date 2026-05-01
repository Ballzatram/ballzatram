from pydantic import BaseModel
from typing import Dict, List

class AnalysisRequest(BaseModel):
    asset: str
    macro_series: List[str]
    start_date: str
    end_date: str

class ScenarioRequest(BaseModel):
    name: str
    shocks: Dict[str, float]
    holdings: Dict[str, float]

class EventStudyRequest(BaseModel):
    asset: str
    event_name: str
    window: int = 5

class ReportRequest(BaseModel):
    title: str
    findings: List[str]
