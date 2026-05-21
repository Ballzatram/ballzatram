from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.agent_routes import router as agent_router
from app.data.timeseries import load_demo_series, parse_uploaded_csv
from app.models.schemas import AnalysisRequest, CsvUploadRequest, EventStudyRequest, ReportRequest, ScenarioRequest
from app.services.analytics import run_event_study, run_scenario, run_stock_analysis

from app.services.macro_board import build_intake, build_research, get_market_data, get_series, run_macro_stress
from app.services.reporting import render_markdown

router = APIRouter()

router.include_router(agent_router)


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


@router.post("/macro-board/intake")
def macro_intake(payload: dict):
    return build_intake(payload.get("prompt", ""))


@router.post("/macro-board/research")
def macro_research(payload: dict):
    return build_research(payload.get("prompt", ""), payload.get("assumptions", {}))


@router.post("/macro-board/stress-test")
def macro_stress(payload: dict):
    return run_macro_stress(payload.get("scenario", {}), payload.get("holdings", {"SPY": 1.0}))


@router.post("/macro-board/regime")
def macro_regime(payload: dict):
    return {"regime": "Transitional", "methodology": "Placeholder deterministic regime label from current macro factor z-scores."}


@router.post("/macro-board/compare-tabs")
def macro_compare_tabs(payload: dict):
    tabs = payload.get("tabs", [])
    return {"comparison": [{"title": t.get("title", "Untitled"), "cards": len(t.get("cards", []))} for t in tabs]}


@router.get("/macro-board/series")
def macro_series():
    return get_series()


@router.get("/macro-board/market-data")
def macro_market_data():
    return get_market_data()
