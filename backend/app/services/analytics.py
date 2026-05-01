from __future__ import annotations

from datetime import datetime

import pandas as pd

from app.analytics.models import (
    compare_regularized,
    detect_regimes,
    event_study,
    feature_importance,
    rolling_regression,
    run_ols,
    stress_test,
)
from app.data.timeseries import align_and_normalize, load_demo_series
from app.models.schemas import AnalysisRequest, EventStudyRequest, MissingPolicy, ScenarioRequest


WARNING_BLOCK = {
    "correlation_warning": "These outputs identify statistical association and should not be interpreted as causal inference.",
    "model_assumptions": [
        "Linear models assume stable parameters and approximately iid residuals.",
        "Event study assumes a stable market model around event windows.",
        "Scenario stress tests are hypothetical and not forecasts.",
    ],
}


def run_stock_analysis(req: AnalysisRequest) -> dict:
    df = load_demo_series()
    df = df.loc[str(req.start_date) : str(req.end_date)]
    x_cols = [c for c in req.macro_series if c in df.columns]
    if len(x_cols) < 2:
        raise ValueError("Need at least two valid macro series.")
    model_df = align_and_normalize([df[[req.asset]], df[x_cols]], req.frequency, req.missing_policy)
    ols = run_ols(model_df, req.asset, x_cols)
    return {
        "asset": req.asset,
        "ols": ols,
        "rolling_regression": rolling_regression(model_df, req.asset, x_cols[0]),
        "regularized": compare_regularized(model_df, req.asset, x_cols),
        "feature_importance": feature_importance(model_df, req.asset, x_cols),
        "regimes": detect_regimes(model_df, x_cols),
        "warnings": WARNING_BLOCK,
    }


def run_event_study(req: EventStudyRequest) -> dict:
    df = load_demo_series()
    release_dates = [pd.Timestamp(datetime.combine(d, datetime.min.time())) for d in req.release_dates]
    out = event_study(df, req.asset, "market_ret", release_dates, req.window)
    out["warnings"] = WARNING_BLOCK
    return out


def run_scenario(req: ScenarioRequest) -> dict:
    out = stress_test(req.shocks, req.holdings)
    out["warnings"] = WARNING_BLOCK
    return out
