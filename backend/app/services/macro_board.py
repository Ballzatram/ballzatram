from __future__ import annotations

import os
from datetime import datetime
from typing import Any
from urllib.parse import quote

import numpy as np
import pandas as pd
import requests

from app.analytics.models import (
    annualized_return,
    annualized_volatility,
    beta_alpha,
    calmar_ratio,
    correlation_matrix,
    information_ratio,
    max_drawdown,
    rolling_beta,
    rolling_regression,
    run_ols,
    sharpe_ratio,
    sortino_ratio,
    stress_test,
    var_expected_shortfall,
)
from app.data.timeseries import load_demo_series

FRED_REGISTRY = ["FEDFUNDS", "DGS10", "CPIAUCSL", "UNRATE"]


def _card(card_type: str, title: str, **kwargs: Any) -> dict[str, Any]:
    base = {"id": f"{card_type}-{abs(hash(title))}", "type": card_type, "title": title, "subtitle": "", "thesis": "", "metrics": {}, "chartData": None, "tableData": None, "interpretation": "", "confidence": "medium", "caveats": [], "methodology": "", "sources": [], "followUpActions": []}
    base.update(kwargs)
    return base


def build_intake(prompt: str) -> dict[str, Any]:
    return {"prompt": prompt, "inferred": {"region": "US", "timeframe": "1Y", "style": "macro", "objective": "identify opportunity", "outputType": "dashboard"}, "clarifyingQuestions": []}


def _fetch_fred(series_id: str) -> list[dict[str, Any]]:
    key = os.getenv("FRED_API_KEY")
    if not key:
        return []
    url = f"https://api.stlouisfed.org/fred/series/observations?series_id={quote(series_id)}&api_key={quote(key)}&file_type=json"
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    obs = r.json().get("observations", [])
    return [{"date": o["date"], "value": None if o["value"] == "." else float(o["value"])} for o in obs]


def _fetch_stooq_prices(ticker: str) -> pd.Series:
    url = f"https://stooq.com/q/d/l/?s={ticker.lower()}.us&i=d"
    df = pd.read_csv(url)
    df["Date"] = pd.to_datetime(df["Date"])
    return df.set_index("Date")["Close"].rename(ticker).dropna()


def build_research(prompt: str, assumptions: dict[str, Any]) -> dict[str, Any]:
    warnings = []
    data_sources = ["demo_data/macro_timeseries.csv"]
    ticker = (assumptions.get("tickers") or ["SPY"])[0]
    df = load_demo_series()
    try:
        prices = _fetch_stooq_prices(ticker)
        ret = prices.pct_change().dropna().resample("ME").last().dropna()
        df = df.join(ret.rename(ticker), how="left")
        y_col = ticker
        data_sources.append("stooq.com")
    except Exception:
        y_col = "SPY" if "SPY" in df.columns else df.columns[0]
        warnings.append(_card("DataWarningCard", "Market data fallback", interpretation=f"Could not fetch {ticker}; using local demo series."))
    x_cols = [c for c in (assumptions.get("macroSeries") or ["DGS10", "CPI", "CREDIT"]) if c in df.columns][:3]
    sample = df[[y_col, *x_cols]].dropna().tail(120)

    ols = run_ols(sample, y_col, x_cols)
    rolling = rolling_regression(sample, y_col, x_cols[0], window=min(24, max(8, len(sample)//3)))
    returns = sample[y_col]
    bench = sample[x_cols[0]] if x_cols else returns
    ba = beta_alpha(returns, bench)
    risk = var_expected_shortfall(returns)

    fred_series = (assumptions.get("macroSeries") or FRED_REGISTRY)[:2]
    news_rows = [{"headline": "Macro context feed not configured", "source": "system", "timestamp": datetime.utcnow().isoformat(), "url": "", "themes": ["configuration"], "caveat": "News context only; not proof."}]
    for s in fred_series:
        points = _fetch_fred(s)
        if points:
            data_sources.append(f"FRED:{s}")
            break
    if not os.getenv("FRED_API_KEY"):
        warnings.append(_card("DataWarningCard", "FRED API key missing", interpretation="Set FRED_API_KEY for live macro observations."))

    cards = [
        _card("ExecutiveBriefCard", "Institutional Research Command Center", thesis=prompt, metrics={"annualizedReturn": annualized_return(returns), "annualizedVolatility": annualized_volatility(returns), "sharpe": sharpe_ratio(returns), "sortino": sortino_ratio(returns), "maxDrawdown": max_drawdown(returns), "calmar": calmar_ratio(returns), "beta": ba["beta"], "alpha": ba["alpha"], "informationRatio": information_ratio(returns, bench)}, methodology="Deterministic monthly return analytics.", sources=data_sources),
        _card("RegressionResultCard", f"{y_col} macro factor regression", tableData=ols, chartData=rolling, methodology=ols["methodology_note"], sources=data_sources),
        _card("CorrelationMatrixCard", "Macro/asset correlation matrix", tableData=correlation_matrix(sample, [y_col, *x_cols]), sources=data_sources),
        _card("DrawdownRiskCard", f"{y_col} drawdown profile", metrics={"maxDrawdown": max_drawdown(returns), "VaR95": risk["var"], "expectedShortfall95": risk["expected_shortfall"]}, sources=data_sources),
        _card("NewsContextCard", "News context", tableData=news_rows, caveats=["News is context, not proof."]),
    ]
    analysts = [{"role": r, "conclusion": "See card evidence.", "evidence": [cards[0]["id"]], "confidence": "medium", "caveats": ["Regime dependence"], "requested_follow_up": "Rerun with alternate benchmark."} for r in ["Macro Strategist", "Quant Researcher", "CFA Fundamental Analyst", "Risk Officer", "Portfolio Manager", "News Analyst"]]
    recs = [{"recommendation_type": "research_implication", "statement": "Potential positioning consideration should be validated across regimes.", "supporting_evidence": "Regression, drawdown, and correlation cards.", "confidence": "medium", "caveats": ["Sample window sensitive"], "what_could_invalidate_it": "Coefficient sign flips and volatility regime shifts", "source_card_ids": [cards[1]["id"], cards[2]["id"], cards[3]["id"]]}]
    return {"cards": cards + warnings, "analystTeam": analysts, "recommendations": recs, "warnings": warnings, "dataSources": data_sources}


def run_macro_stress(shocks: dict[str, float], holdings: dict[str, float]) -> dict[str, Any]:
    built_in = {"Soft Landing": {"growth": 0.5, "rates": -0.25}, "Hard Landing / Recession": {"growth": -1.0, "credit": 1.0}, "Stagflation": {"cpi": 1.0, "growth": -0.8}, "2008-Style Credit Crisis": {"credit": 1.5, "growth": -1.2}, "2020-Style Liquidity Shock": {"credit": 1.3, "oil": -1.0}, "2022-Style Rate Shock": {"rates": 1.5, "cpi": 0.9}}
    applied = shocks or built_in["Hard Landing / Recession"]
    out = stress_test(applied, holdings)
    return {"scenario": "CCAR-inspired macro scenario stress testing (not official CCAR)", "results": out, "assumptions": applied, "builtInScenarios": built_in}


def get_series() -> dict[str, Any]:
    return {"available": list(load_demo_series().columns), "fredRegistry": FRED_REGISTRY}


def get_market_data(tickers: list[str] | None = None) -> dict[str, Any]:
    tickers = tickers or ["SPY", "QQQ"]
    output = {}
    for t in tickers:
        try:
            output[t] = _fetch_stooq_prices(t).tail(10).reset_index().to_dict(orient="records")
        except Exception:
            output[t] = []
    return {"provider": "stooq", "tickers": output}
