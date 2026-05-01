from fastapi import APIRouter
from app.models.schemas import AnalysisRequest, EventStudyRequest, ScenarioRequest, ReportRequest
from app.services.analytics import model_compare, scenario_impact
from app.services.reporting import render_markdown

router = APIRouter()

@router.post('/analyze/stock')
def analyze_stock(req: AnalysisRequest):
    return {
        "asset": req.asset,
        "top_drivers": ["ffr", "cpi_yoy", "dxy"],
        "model_scores": model_compare(),
        "assumptions": ["Stationarity may be violated", "Results are conditional on sample period"],
    }

@router.post('/analyze/portfolio/scenario')
def analyze_scenario(req: ScenarioRequest):
    return scenario_impact(req.shocks, req.holdings)

@router.post('/analyze/event-study')
def event_study(req: EventStudyRequest):
    return {
        "asset": req.asset,
        "event": req.event_name,
        "window": req.window,
        "avg_abnormal_return": -0.004,
        "cumulative_abnormal_return": -0.012,
        "p_value": 0.08,
    }

@router.get('/models/compare')
def compare_models():
    return model_compare()

@router.post('/reports/markdown')
def create_markdown_report(req: ReportRequest):
    return {"markdown": render_markdown(req.title, req.findings)}
