from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

import numpy as np
import pandas as pd

from app.analytics.models import rolling_regression, run_ols, stress_test
from app.data.timeseries import load_demo_series

FRED_REGISTRY = [
    "FEDFUNDS", "DGS2", "DGS10", "DGS30", "T10Y2Y", "T10Y3M", "CPIAUCSL", "CPILFESL", "PCEPI", "PCEPILFE",
    "UNRATE", "PAYEMS", "ICSA", "INDPRO", "RSAFS", "HOUST", "BAA10Y", "AAA10Y",
]

MARKET_UNIVERSE = ["SPY", "QQQ", "IWM", "DIA", "XLK", "XLF", "XLE", "XLU", "XLP", "XLY", "TLT", "IEF", "SHY", "GLD", "USO", "HYG", "LQD", "UUP"]


def _to_points(series: pd.Series) -> list[dict[str, Any]]:
    return [{"date": str(idx.date()), "value": float(val)} for idx, val in series.dropna().items()]


def build_intake(prompt: str) -> dict[str, Any]:
    lower = prompt.lower()
    clarifying = []
    if "opportunit" in lower and "equit" not in lower and "rate" not in lower:
        clarifying.append("Which asset universe should we prioritize first (equities, rates, credit, commodities, FX, crypto)?")
    return {
        "prompt": prompt,
        "inferred": {
            "region": "US" if "us" in lower else "Global",
            "timeframe": "1Y",
            "style": "macro",
            "objective": "identify opportunity",
            "outputType": "dashboard",
        },
        "clarifyingQuestions": clarifying,
    }


def build_research(prompt: str, assumptions: dict[str, Any]) -> dict[str, Any]:
    df = load_demo_series()
    asset = assumptions.get("tickers", ["SPY"])[0] if assumptions.get("tickers") else "SPY"
    y_col = asset if asset in df.columns else "SPY"
    x_cols = [c for c in assumptions.get("macroSeries", []) if c in df.columns][:3]
    if len(x_cols) < 2:
        x_cols = ["DGS10", "CPI", "CREDIT"]
    sample = df[[y_col, *x_cols]].dropna().tail(120)

    ols = run_ols(sample, y_col, x_cols)
    rolling = rolling_regression(sample, y_col, x_cols[0], window=min(24, max(8, len(sample)//3)))

    returns = sample[y_col]
    cum = (1 + returns).cumprod()
    dd = cum / cum.cummax() - 1
    vol = float(returns.std() * np.sqrt(12))
    ann = float((1 + returns.mean()) ** 12 - 1)

    cards = [
        {"type": "ExecutiveBriefCard", "title": "Institutional Research Command Center", "thesis": f"Prompt: {prompt}", "metrics": {"annualizedReturn": ann, "annualizedVol": vol, "maxDrawdown": float(dd.min())}, "sourceAttribution": ["demo_data/macro_timeseries.csv"], "methodologyNotes": "Deterministic calculations from local time series.", "confidence": "medium", "caveats": ["Demo dataset only."]},
        {"type": "RegressionResultCard", "title": f"{y_col} macro factor regression", "tablePayload": ols, "chartPayload": rolling, "methodologyNotes": "OLS and rolling beta.", "sourceAttribution": ["backend/app/analytics/models.py"]},
        {"type": "DrawdownRiskCard", "title": f"{y_col} drawdown profile", "chartPayload": _to_points(dd), "metrics": {"maxDrawdown": float(dd.min())}, "methodologyNotes": "Cumulative return drawdown."},
    ]

    analysts = [
        {"role": "Macro Strategist", "summary": "Rates/inflation remain primary drivers in this sample."},
        {"role": "Quant Researcher", "summary": f"Model R²={ols['r_squared']:.2f}; monitor coefficient stability."},
        {"role": "Risk Officer", "summary": f"Observed max drawdown {float(dd.min()):.2%}."},
        {"role": "Portfolio Manager", "summary": "Use as evidence input, not standalone trade trigger."},
        {"role": "News Analyst", "summary": "News context scaffold enabled; connect provider for live headlines."},
    ]

    recs = [
        {"label": "Research implication", "evidence": "Regression and drawdown outputs", "confidence": "medium", "caveats": ["Sample/regime dependence"], "invalidate": "Factor signs invert in new window"}
    ]
    return {"cards": cards, "analystTeam": analysts, "recommendations": recs, "warnings": [{"type": "DataWarningCard", "text": "Research outputs are for educational and analytical purposes only and are not financial advice."}]}


def run_macro_stress(shocks: dict[str, float], holdings: dict[str, float]) -> dict[str, Any]:
    out = stress_test(shocks, holdings)
    return {"scenario": "CCAR-inspired macro scenario stress testing", "results": out, "assumptions": shocks}


def get_series() -> dict[str, Any]:
    df = load_demo_series()
    return {"available": list(df.columns), "fredRegistry": FRED_REGISTRY}


def get_market_data(tickers: list[str] | None = None) -> dict[str, Any]:
    universe = tickers or MARKET_UNIVERSE
    return {"provider": "demo-local", "tickers": universe, "note": "Provider abstraction ready; replace with Yahoo/other adapter."}
