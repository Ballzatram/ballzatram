from __future__ import annotations

from typing import Sequence

import pandas as pd

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
from app.services.market_data import ProviderError, get_market_data_provider
from app.services.market_data.universes import list_universes


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
            "Demo mode intentionally requires no API keys and marks data as fallback.",
            "Metrics summarize historical sample behavior and do not predict future returns.",
        ],
    }
