from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException, Query

from app.api.agent_routes import router as agent_router
from app.data.timeseries import load_demo_series, parse_uploaded_csv
from app.models.schemas import AnalysisRequest, CsvUploadRequest, EventStudyRequest, ReportRequest, ScenarioRequest
from app.services.analytics import run_event_study, run_scenario, run_stock_analysis

from app.services.macro_board import build_intake, build_research, get_market_data, get_series, run_macro_stress
from app.services.market_data import ProviderError, get_market_data_provider
from app.services.quant_library import build_analytics_demo, list_quant_library_universes
from app.services.workspace_store import WorkspaceStore
from app.services.reporting import render_markdown

router = APIRouter()

router.include_router(agent_router)


@router.get("/health")
def api_health() -> dict:
    return {"status": "ok", "service": "ballzatram-api"}


@router.get("/version")
def api_version() -> dict:
    return {
        "status": "ok",
        "service": "ballzatram-api",
        "environment": os.getenv("APP_ENV", "development"),
        "branch": os.getenv("GIT_BRANCH", "unknown"),
        "commit": os.getenv("GIT_COMMIT", "unknown"),
        "deployedAt": os.getenv("DEPLOYED_AT", "unknown"),
    }


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


@router.post("/quant-library/intake")
@router.post("/macro-board/intake", include_in_schema=False)
def macro_intake(payload: dict):
    return build_intake(payload.get("prompt", ""))


@router.post("/quant-library/research")
@router.post("/macro-board/research", include_in_schema=False)
def macro_research(payload: dict):
    return build_research(payload.get("prompt", ""), payload.get("assumptions", {}))


@router.post("/quant-library/stress-test")
@router.post("/macro-board/stress-test", include_in_schema=False)
def macro_stress(payload: dict):
    return run_macro_stress(payload.get("scenario", {}), payload.get("holdings", {"SPY": 1.0}))


@router.post("/quant-library/regime")
@router.post("/macro-board/regime", include_in_schema=False)
def macro_regime(payload: dict):
    return {"regime": "Transitional", "methodology": "Placeholder deterministic regime label from current macro factor z-scores."}


@router.post("/quant-library/compare-tabs")
@router.post("/macro-board/compare-tabs", include_in_schema=False)
def macro_compare_tabs(payload: dict):
    tabs = payload.get("tabs", [])
    return {"comparison": [{"title": t.get("title", "Untitled"), "cards": len(t.get("cards", []))} for t in tabs]}


@router.get("/quant-library/series")
@router.get("/macro-board/series", include_in_schema=False)
def macro_series():
    return get_series()


@router.get("/quant-library/market-data")
@router.get("/macro-board/market-data", include_in_schema=False)
def macro_market_data():
    return get_market_data()


@router.get("/quant-library/universes")
def quant_library_universes():
    return {"universes": list_quant_library_universes()}


@router.get("/quant-library/universes/{universe_id}")
def quant_library_universe(universe_id: str):
    try:
        universe = get_market_data_provider().get_universe(universe_id)
        return {"universe": universe.model_dump(mode="json")}
    except ProviderError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/quant-library/analytics-demo")
def quant_library_analytics_demo(
    symbols: list[str] | None = Query(default=None),
    benchmark: str = "SPY",
    universe_id: str = "major-us-indices",
):
    return build_analytics_demo(symbols, benchmark=benchmark, universe_id=universe_id)


store = WorkspaceStore()

@router.get("/quant-library/workspaces")
@router.get("/macro-board/workspaces", include_in_schema=False)
def list_workspaces():
    return {"workspaces": store.list_workspaces()}

@router.get("/quant-library/workspaces/{workspace_id}")
@router.get("/macro-board/workspaces/{workspace_id}", include_in_schema=False)
def get_workspace(workspace_id: str):
    ws = store.get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="workspace not found")
    return ws

@router.post("/quant-library/workspaces")
@router.post("/macro-board/workspaces", include_in_schema=False)
def create_workspace(payload: dict):
    result = build_research(payload.get("prompt", ""), payload.get("assumptions", {}))
    title = payload.get("title") or payload.get("prompt", "Untitled")[:48]
    return store.create_workspace(title, payload.get("prompt", ""), payload.get("assumptions", {}), result)

@router.post("/quant-library/workspaces/{workspace_id}/rerun")
@router.post("/macro-board/workspaces/{workspace_id}/rerun", include_in_schema=False)
def rerun_workspace(workspace_id: str, payload: dict):
    result = build_research(payload.get("prompt", ""), payload.get("assumptions", {}))
    try:
        return store.rerun_workspace(workspace_id, payload.get("assumptions", {}), result)
    except KeyError:
        raise HTTPException(status_code=404, detail="workspace not found")

@router.post("/quant-library/workspaces/{workspace_id}/duplicate")
@router.post("/macro-board/workspaces/{workspace_id}/duplicate", include_in_schema=False)
def duplicate_workspace(workspace_id: str):
    ws = store.get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="workspace not found")
    latest = ws["versions"][-1] if ws["versions"] else {"cards": [], "analyst_outputs": [], "recommendations": [], "warnings": []}
    result = {"cards": latest.get("cards", []), "analystTeam": latest.get("analyst_outputs", []), "recommendations": latest.get("recommendations", []), "warnings": latest.get("warnings", [])}
    return store.create_workspace(ws["title"] + " (copy)", ws["original_prompt"], ws.get("assumptions", {}), result)

@router.post("/quant-library/compare-versions")
@router.post("/macro-board/compare-versions", include_in_schema=False)
def compare_versions(payload: dict):
    ws = store.get_workspace(payload.get("workspaceId", ""))
    if not ws:
        raise HTTPException(status_code=404, detail="workspace not found")
    a = next((v for v in ws["versions"] if v["version_id"] == payload.get("leftVersionId")), None)
    b = next((v for v in ws["versions"] if v["version_id"] == payload.get("rightVersionId")), None)
    if not a or not b:
        raise HTTPException(status_code=404, detail="version not found")
    return {"left": a["version_id"], "right": b["version_id"], "changedAssumptions": {k: {"left": a["assumptions"].get(k), "right": b["assumptions"].get(k)} for k in set(a["assumptions"]).union(b["assumptions"]) if a["assumptions"].get(k) != b["assumptions"].get(k)}, "cardCount": {"left": len(a.get("cards", [])), "right": len(b.get("cards", []))}}
