from __future__ import annotations

from typing import Sequence

import pandas as pd

from app.analytics.models import stress_test
from app.analytics.metric_explanations import metric_explanations
from app.analytics.quant_library import (
    beta_vs_benchmark,
    correlation_matrix,
    cumulative_returns,
    daily_returns,
    max_drawdown,
    moving_average,
    relative_strength,
    relative_strength_index,
    rolling_volatility,
    simple_regime_score,
    yield_curve_spreads,
    z_score,
)
from app.data.timeseries import load_demo_series
from app.services.market_data import ProviderError, get_market_data_provider
from app.services.market_data.universes import list_universes


FRED_REGISTRY = ["FEDFUNDS", "DGS10", "CPIAUCSL", "UNRATE"]


CORE_EXPLANATION_IDS = [
    "dailyReturns",
    "cumulativeReturns",
    "rollingVolatility",
    "maxDrawdown",
    "movingAverage",
    "rsi",
    "zScore",
    "betaVsBenchmark",
    "correlationMatrix",
    "relativeStrength",
    "yieldCurveSpreads",
    "regimeScore",
]


def _series_from_price_points(points) -> pd.Series:
    return pd.Series({pd.Timestamp(point.date): point.close for point in points}).sort_index()


def _series_from_rate_points(points) -> pd.Series:
    return pd.Series({pd.Timestamp(point.date): point.value for point in points}).sort_index()


def _latest(series: pd.Series) -> float | None:
    cleaned = series.dropna()
    return float(cleaned.iloc[-1]) if len(cleaned) else None


def _round(value: float | None, digits: int = 6) -> float | None:
    return None if value is None else round(float(value), digits)


def list_quant_library_universes() -> list[dict]:
    return [universe.model_dump(mode="json") for universe in list_universes()]


def _source(title: str, source: str, status: str, description: str) -> dict:
    return {"title": title, "url": source, "status": status, "description": description}


def _action(label: str, description: str, href: str | None = None) -> dict:
    return {"label": label, "description": description, "href": href}


def _risk(title: str, content: str, severity: str = "medium", mitigation: str = "", confidence: str = "medium") -> dict:
    return {"title": title, "severity": severity, "content": content, "mitigation": mitigation, "confidence": confidence}


def _card(card_type: str, title: str, content: str, **kwargs) -> dict:
    base = {
        "id": f"{card_type}-{title.lower().replace(' ', '-')[:64]}",
        "type": card_type,
        "title": title,
        "content": content,
        "confidence": "medium",
        "assumptions": [],
        "sources": [],
        "actions": [],
        "metrics": {},
        "tableData": None,
        "chartData": None,
        "methodology": "",
        "caveats": [],
        "thesis": "",
    }
    base.update(kwargs)
    return base


def build_research_intake(prompt: str) -> dict:
    normalized = prompt.strip()
    inferred = {
        "region": "US",
        "timeframe": "1Y",
        "style": "financial econometrics research",
        "objective": "investigate a market question",
        "outputType": "research workspace",
    }
    lower_prompt = normalized.lower()
    if any(term in lower_prompt for term in ["rates", "curve", "yield", "inflation"]):
        inferred["style"] = "rates and curve research"
    if any(term in lower_prompt for term in ["risk", "drawdown", "volatility", "correlation"]):
        inferred["objective"] = "risk and anomaly review"
    if any(term in lower_prompt for term in ["scenario", "shock", "stress"]):
        inferred["objective"] = "scenario stress investigation"

    questions = [
        {
            "id": "research_question",
            "question": "What research question should this workspace answer?",
            "why": "Every Quant Library screen should answer a specific research question instead of becoming a generic dashboard.",
            "placeholder": "Example: Are rate-sensitive ETFs moving with the curve or against it?",
        },
        {
            "id": "universe",
            "question": "Which symbols, rates, or market universe should be inspected?",
            "why": "This keeps the analysis scoped and makes benchmark choice visible.",
            "placeholder": "Example: SPY, QQQ, TLT, 2Y/10Y, and 3M/10Y.",
        },
        {
            "id": "caveat_focus",
            "question": "What would make the interpretation weaker?",
            "why": "A useful research workstation keeps uncertainty attached to the output.",
            "placeholder": "Example: stale rates, wrong benchmark, or a short sample window.",
        },
    ]

    if not normalized:
        return {
            "prompt": prompt,
            "inferred": inferred,
            "clarifyingQuestions": questions,
            "status": "empty",
            "summary": "Start with a research question so Quant Library can build a focused workspace.",
            "missingData": ["Research question"],
            "recommendedNextSteps": ["Describe the market question you want to investigate."],
        }

    return {
        "prompt": prompt,
        "inferred": inferred,
        "clarifyingQuestions": questions,
        "status": "complete",
        "summary": "Quant Library inferred a research workspace shape and needs evidence-scoping answers before analysis.",
        "missingData": [],
        "recommendedNextSteps": ["Confirm the universe, benchmark, and caveat focus before generating a research workspace."],
    }


def build_analytics_demo(
    symbols: Sequence[str] | None = None,
    *,
    benchmark: str = "SPY",
    universe_id: str = "major-us-indices",
) -> dict:
    provider = get_market_data_provider()
    errors: list[dict] = []

    try:
        universe = provider.get_universe(universe_id)
    except ProviderError as exc:
        errors.append({"scope": "universe", "message": str(exc), "provider": exc.provider})
        universe = list_universes()[0]

    requested_symbols = [symbol.upper().strip() for symbol in (symbols or [item.symbol for item in universe.items[:4]]) if symbol.strip()]
    if benchmark.upper() not in requested_symbols:
        requested_symbols.append(benchmark.upper())
    requested_symbols = list(dict.fromkeys(requested_symbols))[:8]

    price_responses = {}
    quote_responses = {}
    price_series = {}
    for symbol in requested_symbols:
        try:
            price_response = provider.get_price_series(symbol, range="1y", interval="1d")
            quote_response = provider.get_quote(symbol)
            price_responses[symbol] = price_response
            quote_responses[symbol] = quote_response
            price_series[symbol] = _series_from_price_points(price_response.points)
        except Exception as exc:
            errors.append({"scope": "price", "symbol": symbol, "message": str(exc), "provider": getattr(exc, "provider", provider.name)})

    benchmark_symbol = benchmark.upper()
    benchmark_prices = price_series.get(benchmark_symbol)
    if benchmark_prices is None:
        benchmark_prices = next(iter(price_series.values()), pd.Series(dtype=float))
    benchmark_returns = daily_returns(benchmark_prices) if len(benchmark_prices) else pd.Series(dtype=float)

    symbol_rows = []
    returns_by_symbol = {}
    for symbol, prices in price_series.items():
        returns = daily_returns(prices)
        returns_by_symbol[symbol] = returns
        cumulative = cumulative_returns(returns)
        vol = rolling_volatility(returns, window=20)
        rsi = relative_strength_index(prices, window=14)
        z = z_score(returns, window=20)
        rel = relative_strength(prices, benchmark_prices)
        quote = quote_responses[symbol]
        symbol_rows.append(
            {
                "symbol": symbol,
                "name": price_responses[symbol].name,
                "quote": quote.model_dump(mode="json"),
                "freshness": price_responses[symbol].freshness.model_dump(mode="json"),
                "metrics": {
                    "lastClose": _round(_latest(prices), 4),
                    "latestDailyReturn": _round(_latest(returns)),
                    "cumulativeReturn": _round(_latest(cumulative)),
                    "rollingVolatility20d": _round(_latest(vol)),
                    "maxDrawdown": _round(max_drawdown(returns)),
                    "movingAverage20d": _round(_latest(moving_average(prices, 20)), 4),
                    "movingAverage50d": _round(_latest(moving_average(prices, 50)), 4),
                    "rsi14": _round(_latest(rsi), 2),
                    "zScore20d": _round(_latest(z), 3),
                    "betaVsBenchmark": _round(beta_vs_benchmark(returns, benchmark_returns), 3),
                    "relativeStrengthVsBenchmark": _round(_latest(rel)),
                },
            }
        )

    try:
        rates_response = provider.get_rates_series(["TB3MS", "DGS2", "DGS10"], range="2y", interval="1mo")
        rates_by_id = {series.series_id: _series_from_rate_points(series.points) for series in rates_response.series}
        spreads = yield_curve_spreads(rates_by_id)
    except Exception as exc:
        rates_response = None
        spreads = {"2y10y": {"status": "missing", "latest": None, "history": []}, "3m10y": {"status": "missing", "latest": None, "history": []}}
        errors.append({"scope": "rates", "message": str(exc), "provider": getattr(exc, "provider", provider.name)})

    try:
        yield_curve = provider.get_yield_curve()
    except Exception as exc:
        yield_curve = None
        errors.append({"scope": "yield_curve", "message": str(exc), "provider": getattr(exc, "provider", provider.name)})

    first_symbol = symbol_rows[0] if symbol_rows else None
    regime = simple_regime_score(
        rolling_volatility_value=first_symbol["metrics"]["rollingVolatility20d"] if first_symbol else None,
        max_drawdown_value=first_symbol["metrics"]["maxDrawdown"] if first_symbol else None,
        relative_strength_value=first_symbol["metrics"]["relativeStrengthVsBenchmark"] if first_symbol else None,
        curve_spreads=spreads,
    )

    return {
        "status": "partial_success" if errors else "complete",
        "provider": provider.name,
        "universe": universe.model_dump(mode="json"),
        "benchmark": benchmark_symbol,
        "symbols": symbol_rows,
        "correlationMatrix": correlation_matrix(returns_by_symbol) if returns_by_symbol else {"columns": [], "matrix": []},
        "rates": {
            "series": rates_response.model_dump(mode="json") if rates_response else None,
            "yieldCurve": yield_curve.model_dump(mode="json") if yield_curve else None,
            "spreads": spreads,
        },
        "regime": regime,
        "explanations": metric_explanations(CORE_EXPLANATION_IDS),
        "errors": errors,
        "caveats": [
            "Outputs are descriptive and education-oriented, not financial advice.",
            "Demo mode intentionally requires no API keys and marks data as demo.",
            "Metrics summarize historical sample behavior and do not predict future returns.",
        ],
    }


def build_research_workspace(prompt: str, assumptions: dict) -> dict:
    symbols = assumptions.get("tickers") or assumptions.get("symbols") or ["SPY", "QQQ", "TLT"]
    benchmark = str(assumptions.get("benchmark") or "SPY")
    analytics = build_analytics_demo(symbols, benchmark=benchmark)
    primary = analytics["symbols"][0] if analytics["symbols"] else None
    freshness = primary["freshness"] if primary else (analytics["rates"]["yieldCurve"] or {}).get("freshness")
    source_status = freshness.get("status", "unknown") if freshness else "unknown"
    source_title = freshness.get("source", "Quant Library analytics payload") if freshness else "Quant Library analytics payload"
    source = _source("Quant Library analytics payload", source_title, source_status, "Structured market data, method metadata, and caveats for this research run.")

    cards = [
        _card(
            "data",
            "Research question and data scope",
            "Quant Library converted the prompt into a scoped research workspace with visible data status, benchmark, and caveats.",
            thesis=prompt,
            sources=[source],
            assumptions=[
                f"Benchmark: {analytics['benchmark']}",
                f"Universe: {analytics['universe']['title']}",
                f"Provider status: {source_status}",
            ],
            caveats=analytics["caveats"],
            actions=[_action("Review source quality", "Confirm whether this run used live, cached, stale, demo, or error data.")],
        ),
        _card(
            "data",
            "Market overview metrics",
            "The overview combines return, volatility, drawdown, benchmark sensitivity, curve spreads, and a transparent regime label.",
            metrics={
                "regimeScore": analytics["regime"]["score"],
                "symbolCount": len(analytics["symbols"]),
                "providerErrors": len(analytics["errors"]),
            },
            tableData=[
                {
                    "symbol": row["symbol"],
                    "cumulativeReturn": row["metrics"]["cumulativeReturn"],
                    "maxDrawdown": row["metrics"]["maxDrawdown"],
                    "rollingVolatility20d": row["metrics"]["rollingVolatility20d"],
                    "betaVsBenchmark": row["metrics"]["betaVsBenchmark"],
                }
                for row in analytics["symbols"]
            ],
            methodology="Standard return, drawdown, volatility, beta, correlation, yield-curve spread, and z-score methods.",
            sources=[source],
            caveats=["Metrics describe the selected historical sample and do not settle future behavior."],
            actions=[_action("Open the relevant desk", "Move from overview into rates, equity/index, risk, scenario, or notes based on the research question.")],
        ),
        _card(
            "risk",
            "Caveats and failure modes",
            "The workspace keeps uncertainty visible before interpretation so a clean-looking table does not become false confidence.",
            sources=[source],
            caveats=analytics["caveats"],
            actions=[_action("Name the weakest assumption", "Document the data, benchmark, or sample-window issue that could change the readout.")],
        ),
        _card(
            "next_step",
            "Next investigation",
            "Use Rates Desk for curve context, Equity / Index Desk for benchmark-aware comparison, Risk & Anomaly Desk for unusual moves, and Scenario Engine for transparent shocks.",
            sources=[source],
            actions=[
                _action("Inspect Rates Desk", "Review 2Y/10Y and 3M/10Y before reading rate-sensitive assets."),
                _action("Inspect Risk & Anomaly Desk", "Check z-score, drawdown, volatility, and source-quality warnings."),
            ],
        ),
    ]

    risks = [
        _risk("Demo or stale data can mislead", "Source status must be read before the metric.", "high", "Show source quality next to every output."),
        _risk("Historical relationships can change", "Beta, correlation, and regime labels are descriptive sample summaries.", "medium", "Compare windows and benchmarks before writing a note."),
    ]
    missing_data = []
    if source_status in {"demo", "fallback", "missing", "unknown"}:
        missing_data.append("Live production market data")
    if analytics["errors"]:
        missing_data.append("One or more provider responses")

    return {
        "summary": f"Quant Library built a six-desk research workspace for {len(analytics['symbols'])} symbols with {source_status} source status.",
        "cards": cards,
        "risks": risks,
        "missingData": missing_data,
        "recommendedNextSteps": [
            "Check data freshness before interpreting any metric.",
            "Start with the desk that matches the research question.",
            "Attach method notes and caveats before writing a research note.",
        ],
        "sources": [source],
        "confidence": "low" if missing_data else "medium",
        "status": "partial_success" if missing_data or analytics["errors"] else "complete",
        "analystTeam": [],
        "recommendations": [],
        "warnings": [card for card in cards if card["type"] == "risk"],
        "dataSources": [source_title],
    }


def run_quant_scenario(shocks: dict[str, float], holdings: dict[str, float]) -> dict:
    built_in = {
        "Soft landing": {"growth": 0.5, "rates": -0.25, "credit": -0.2},
        "Rate shock": {"rates": 1.5, "growth": -0.3, "credit": 0.4},
        "Credit stress": {"credit": 1.4, "growth": -1.0, "rates": -0.2},
        "Stagflation pressure": {"rates": 1.0, "growth": -0.8, "credit": 0.8},
    }
    applied = shocks or built_in["Rate shock"]
    result = stress_test(applied, holdings or {"SPY": 1.0})
    return {
        "scenario": "Transparent Quant Library scenario stress test",
        "results": result,
        "assumptions": applied,
        "builtInScenarios": built_in,
        "caveats": [
            "Scenario output is conditional on visible shocks and simplified factor mappings.",
            "This is research context, not personal portfolio advice.",
        ],
    }


def get_series() -> dict:
    return {
        "available": list(load_demo_series().columns),
        "fredRegistry": FRED_REGISTRY,
        "quantLibraryMethods": CORE_EXPLANATION_IDS,
    }


def get_market_data(tickers: list[str] | None = None) -> dict:
    provider = get_market_data_provider()
    symbols = tickers or ["SPY", "QQQ"]
    output = {}
    errors = []
    for symbol in symbols:
        try:
            response = provider.get_price_series(symbol, range="1mo", interval="1d")
            output[symbol.upper()] = {
                "points": [point.model_dump(mode="json") for point in response.points[-10:]],
                "freshness": response.freshness.model_dump(mode="json"),
            }
        except Exception as exc:
            errors.append({"symbol": symbol, "message": str(exc), "provider": getattr(exc, "provider", provider.name)})
            output[symbol.upper()] = {"points": [], "freshness": None}
    return {"provider": provider.name, "tickers": output, "errors": errors}
