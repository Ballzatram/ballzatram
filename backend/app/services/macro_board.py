from __future__ import annotations

import os
import re
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
SERIES_ALIASES = {
    "DGS10": "ffr",
    "FEDFUNDS": "ffr",
    "CPI": "cpi_yoy",
    "CPIAUCSL": "cpi_yoy",
    "CREDIT": "credit_spread",
    "UNRATE": "unemployment",
    "DXY": "dxy",
    "OIL": "oil",
}


def _slug(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned[:72] or "card"


def _source(title: str, url: str | None = None, status: str = "unknown", description: str = "") -> dict[str, Any]:
    return {"title": title, "url": url, "status": status, "description": description}


def _action(label: str, description: str, href: str | None = None) -> dict[str, Any]:
    return {"label": label, "description": description, "href": href}


def _risk(title: str, content: str, severity: str = "medium", mitigation: str = "", confidence: str = "medium") -> dict[str, Any]:
    return {"title": title, "severity": severity, "content": content, "mitigation": mitigation, "confidence": confidence}


def _card(card_type: str, title: str, content: str, **kwargs: Any) -> dict[str, Any]:
    base = {
        "id": f"{card_type}-{_slug(title)}",
        "type": card_type,
        "title": title,
        "content": content,
        "subtitle": "",
        "thesis": "",
        "metrics": {},
        "chartData": None,
        "tableData": None,
        "interpretation": content,
        "confidence": "medium",
        "assumptions": [],
        "caveats": [],
        "methodology": "",
        "sources": [],
        "actions": [],
        "followUpActions": [],
    }
    base.update(kwargs)
    return base


def build_intake(prompt: str) -> dict[str, Any]:
    normalized = prompt.strip()
    inferred = {
        "region": "US",
        "timeframe": "1Y",
        "style": "macro research",
        "objective": "identify opportunity",
        "outputType": "decision workspace",
    }
    lower_prompt = normalized.lower()
    if any(term in lower_prompt for term in ["portfolio", "holdings", "basket"]):
        inferred["objective"] = "portfolio risk review"
    if any(term in lower_prompt for term in ["stock", "ticker", "equity"]):
        inferred["objective"] = "single-name macro sensitivity"
    if any(term in lower_prompt for term in ["recession", "stagflation", "rates", "inflation"]):
        inferred["style"] = "macro stress workflow"

    clarifying = [
        {
            "id": "decision",
            "question": "What decision should this research support?",
            "why": "The output improves when the model knows whether it is preparing a watchlist, risk memo, rebalance note, or investment committee brief.",
            "placeholder": "Example: decide whether to reduce cyclicals before the next CPI print.",
        },
        {
            "id": "universe",
            "question": "Which ticker, portfolio, or macro universe should be prioritized?",
            "why": "This keeps the workflow focused and prevents generic macro commentary.",
            "placeholder": "Example: SPY and QQQ, or a top-10 holdings CSV.",
        },
        {
            "id": "constraints",
            "question": "What constraints or risk limits should the output respect?",
            "why": "Useful recommendations need boundaries such as time horizon, drawdown tolerance, liquidity, or forbidden actions.",
            "placeholder": "Example: no leverage, 6-month horizon, max 10% drawdown tolerance.",
        },
    ]
    if not normalized:
        return {
            "prompt": prompt,
            "inferred": inferred,
            "clarifyingQuestions": clarifying,
            "status": "empty",
            "summary": "Start with a research prompt so Quant Library can infer the workflow and ask sharper questions.",
            "missingData": ["Research prompt"],
            "recommendedNextSteps": ["Describe the market question or decision you want Quant Library to support."],
        }

    return {
        "prompt": prompt,
        "inferred": inferred,
        "clarifyingQuestions": clarifying,
        "status": "complete",
        "summary": "Quant Library inferred an initial workflow and has three clarifying questions before generating the research workspace.",
        "missingData": [],
        "recommendedNextSteps": ["Answer the clarifying questions, then generate the research workspace."],
    }


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
    sources = [
        _source(
            "Bundled macro demo dataset",
            "demo_data/macro_timeseries.csv",
            "live",
            "Local monthly macro and market demo data used when live providers are unavailable.",
        )
    ]
    data_sources = ["demo_data/macro_timeseries.csv"]
    ticker = (assumptions.get("tickers") or ["SPY"])[0]
    df = load_demo_series()
    try:
        prices = _fetch_stooq_prices(ticker)
        ret = prices.pct_change().dropna().resample("ME").last().dropna()
        df = df.join(ret.rename(ticker), how="left")
        y_col = ticker
        data_sources.append("stooq.com")
        sources.append(_source("Stooq daily prices", "https://stooq.com", "live", f"Public price history fetched for {ticker}."))
    except Exception:
        y_col = "SPY" if "SPY" in df.columns else df.columns[0]
        warnings.append(
            _card(
                "risk",
                "Market data fallback",
                f"Could not fetch {ticker}; using the local demo series instead.",
                confidence="high",
                assumptions=["Network or provider availability may differ by environment."],
                caveats=["Live price data did not load for this run."],
                actions=[_action("Retry with another ticker", "Use a highly liquid ticker such as SPY or QQQ, then rerun.")],
            )
        )
    requested_series = assumptions.get("macroSeries") or ["DGS10", "CPI", "CREDIT"]
    normalized_series = [SERIES_ALIASES.get(str(series).upper(), str(series)) for series in requested_series]
    x_cols = [c for c in normalized_series if c in df.columns][:3]
    if not x_cols:
        x_cols = [c for c in ["cpi_yoy", "ffr", "credit_spread"] if c in df.columns][:3]
        warnings.append(
            _card(
                "risk",
                "Macro series fallback",
                "Requested macro series were not found in the active dataset, so Quant Library used the closest demo factors.",
                confidence="high",
                assumptions=["Demo factor aliases can stand in for production provider names during local workflow testing."],
                caveats=["Review factor mapping before using this output in a paid workflow."],
                actions=[_action("Review factor names", "Use the series endpoint to select available macro fields.")],
            )
        )
    sample = df[[y_col, *x_cols]].dropna().tail(120)
    if len(sample) < max(8, len(x_cols) + 2) and "asset_ret" in df.columns:
        y_col = "asset_ret"
        sample = df[[y_col, *x_cols]].dropna().tail(120)
        warnings.append(
            _card(
                "risk",
                "Asset return fallback",
                "The selected ticker did not overlap enough with the macro sample, so Quant Library used the bundled asset return series.",
                confidence="high",
                assumptions=["Bundled asset_ret can stand in for local workflow testing."],
                caveats=["Use live aligned asset history before relying on the result."],
                actions=[_action("Check date overlap", "Confirm asset and macro observations cover the same dates.")],
            )
        )

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
            sources.append(_source(f"FRED {s}", "https://fred.stlouisfed.org", "live", "Live FRED observations were reachable for this run."))
            break
    if not os.getenv("FRED_API_KEY"):
        warnings.append(
            _card(
                "risk",
                "FRED API key missing",
                "Live FRED observations are not configured, so the run relies on bundled demo macro data.",
                confidence="high",
                assumptions=["Bundled demo data remains representative enough for workflow evaluation."],
                caveats=["Fresh macro observations are unavailable."],
                actions=[_action("Add FRED_API_KEY", "Configure the backend with a FRED key when moving this workflow toward production research.")],
            )
        )

    cards = [
        _card(
            "opportunity",
            "Institutional research command center",
            "Quant Library translated the prompt into an evidence workspace with returns, volatility, drawdown, beta, alpha, and factor diagnostics.",
            thesis=prompt,
            metrics={"annualizedReturn": annualized_return(returns), "annualizedVolatility": annualized_volatility(returns), "sharpe": sharpe_ratio(returns), "sortino": sortino_ratio(returns), "maxDrawdown": max_drawdown(returns), "calmar": calmar_ratio(returns), "beta": ba["beta"], "alpha": ba["alpha"], "informationRatio": information_ratio(returns, bench)},
            methodology="Deterministic monthly return analytics using aligned demo/live series.",
            sources=sources,
            assumptions=["Monthly observations are adequate for the requested horizon.", "Historical relationships remain useful enough to frame questions."],
            actions=[_action("Review signal quality", "Check whether return, volatility, beta, and drawdown point in the same direction.")],
        ),
        _card(
            "data",
            f"{y_col} macro factor regression",
            "Regression output ranks macro factors by historical association and exposes fit quality before any recommendation is made.",
            tableData=ols,
            chartData=rolling,
            methodology=ols["methodology_note"],
            sources=sources,
            assumptions=["Linear factor exposure is a useful first-pass model.", "The latest sample is not dominated by a single event."],
            actions=[_action("Inspect coefficient stability", "Use rolling regression before trusting one full-sample coefficient.")],
        ),
        _card(
            "data",
            "Macro/asset correlation matrix",
            "Correlation shows which macro series moved together with the selected asset in the available sample.",
            tableData=correlation_matrix(sample, [y_col, *x_cols]),
            sources=sources,
            assumptions=["Correlation is descriptive and not causal."],
            actions=[_action("Check collinearity", "Do not over-interpret factors that are highly correlated with each other.")],
        ),
        _card(
            "risk",
            f"{y_col} drawdown profile",
            "The downside card converts return history into drawdown, VaR, and expected shortfall checks.",
            metrics={"maxDrawdown": max_drawdown(returns), "VaR95": risk["var"], "expectedShortfall95": risk["expected_shortfall"]},
            sources=sources,
            assumptions=["Historical downside remains a useful warning signal.", "Tail losses are estimated from the available sample."],
            caveats=["VaR and expected shortfall are sample-sensitive."],
            actions=[_action("Stress-test the main risk", "Run a recession, credit spread, or rate shock after reviewing this card.")],
        ),
        _card(
            "data",
            "News context",
            "The live news feed is not configured, so this card is a placeholder source-quality warning rather than a market signal.",
            tableData=news_rows,
            caveats=["News is context, not proof."],
            sources=[_source("News context feed", None, "missing", "No approved news connector is configured.")],
            confidence="low",
            assumptions=["No external news evidence was used in this run."],
            actions=[_action("Connect approved news source", "Add a permissioned source before using news context in paid workflows.")],
        ),
    ]
    analysts = [
        {
            "role": r,
            "conclusion": "See card evidence before moving to a trade or allocation decision.",
            "evidence": [cards[0]["id"]],
            "confidence": "medium",
            "caveats": ["Regime dependence"],
            "requested_follow_up": "Rerun with alternate benchmark and a fresh data source.",
        }
        for r in ["Macro Strategist", "Quant Researcher", "CFA Fundamental Analyst", "Risk Officer", "Portfolio Manager", "News Analyst"]
    ]
    recs = [
        {
            "recommendation_type": "research_implication",
            "statement": "Use this run as a decision-prep workspace, not an automated trade signal.",
            "supporting_evidence": "Regression, drawdown, and correlation cards.",
            "confidence": "medium",
            "caveats": ["Sample window sensitive"],
            "what_could_invalidate_it": "Coefficient sign flips and volatility regime shifts",
            "source_card_ids": [cards[1]["id"], cards[2]["id"], cards[3]["id"]],
        }
    ]
    risks = [
        _risk("Correlation is not causation", "The model finds historical association, not a proven economic driver.", "high", "Treat every factor result as a hypothesis to validate."),
        _risk("Regime sensitivity", "Macro relationships can change during crises, policy pivots, and liquidity shocks.", "medium", "Compare rolling windows and rerun with alternate samples."),
    ]
    missing_data = []
    if any(card["title"] == "FRED API key missing" for card in warnings):
        missing_data.append("Live FRED macro observations")
    if any(card["title"] == "Market data fallback" for card in warnings):
        missing_data.append(f"Live market data for {ticker}")
    missing_data.append("Permissioned news context feed")
    next_steps = [
        "Answer or revise the clarifying questions and rerun if the decision context changed.",
        "Inspect regression stability before treating any factor as durable.",
        "Run a scenario stress test against the dominant risk driver.",
        "Draft a report section only after checking missing data warnings.",
    ]
    status = "partial_success" if warnings or missing_data else "complete"
    summary = (
        f"Quant Library built a {y_col} research workspace with {len(cards)} evidence cards, "
        f"{len(risks)} risk controls, and {len(missing_data)} missing-data warnings."
    )
    return {
        "summary": summary,
        "cards": cards + warnings,
        "risks": risks,
        "missingData": missing_data,
        "recommendedNextSteps": next_steps,
        "sources": sources,
        "confidence": "medium" if status == "complete" else "low",
        "status": status,
        "analystTeam": analysts,
        "recommendations": recs,
        "warnings": warnings,
        "dataSources": data_sources,
    }


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
