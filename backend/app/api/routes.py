from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.data.timeseries import load_demo_series, parse_uploaded_csv
from app.models.schemas import AnalysisRequest, CsvUploadRequest, EventStudyRequest, ReportRequest, ScenarioRequest
from app.services.analytics import run_event_study, run_scenario, run_stock_analysis
from app.services.reporting import render_markdown

router = APIRouter()


@router.get("/data/demo")
def get_demo_data() -> dict:
    df = load_demo_series()
    return {"rows": len(df), "columns": list(df.columns), "start": str(df.index.min().date()), "end": str(df.index.max().date())}


@router.post("/data/upload-csv")
def upload_csv(req: CsvUploadRequest) -> dict:
    try:
        df = parse_uploaded_csv(req.csv_text, req.date_col)
        return {"rows": len(df), "columns": list(df.columns)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post('/analyze/stock')
def analyze_stock(req: AnalysisRequest):
    try:
        return run_stock_analysis(req)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post('/analyze/portfolio/scenario')
def analyze_scenario(req: ScenarioRequest):
    return run_scenario(req)


@router.post('/analyze/event-study')
def do_event_study(req: EventStudyRequest):
    return run_event_study(req)


@router.post('/reports/markdown')
def create_markdown_report(req: ReportRequest):
    return {"markdown": render_markdown(req.title, req.findings, req.scenario_outcomes)}
