from __future__ import annotations

from typing import Literal

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.analytics.quant_library import (
    beta_vs_benchmark,
    cumulative_returns,
    daily_returns,
    max_drawdown,
    moving_average,
    relative_strength,
    relative_strength_index,
    rolling_volatility,
    z_score,
)
from app.services.market_data import ProviderError, get_market_data_provider


router = APIRouter(prefix="/analyze/stock")


class MarketStockAnalysisRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=24)
    benchmark: str = Field(default="SPY", min_length=1, max_length=24)
    range: Literal["1mo", "3mo", "6mo", "1y", "2y", "5y"] = "1y"

    @field_validator("symbol", "benchmark")
    @classmethod
    def normalize_symbol(cls, value: str) -> str:
        return value.strip().upper()


def _price_series(points) -> pd.Series:
    return pd.Series(
        [point.close for point in points],
        index=pd.to_datetime([point.date for point in points]),
        dtype=float,
    ).sort_index()


def _last(series: pd.Series) -> float | None:
    cleaned = series.dropna()
    return float(cleaned.iloc[-1]) if not cleaned.empty else None


@router.post("/market")
def analyze_market_stock(req: MarketStockAnalysisRequest):
    provider = get_market_data_provider()
    try:
        asset_response = provider.get_price_series(req.symbol, range=req.range, interval="1d")
        benchmark_response = provider.get_price_series(req.benchmark, range=req.range, interval="1d")
    except ProviderError as exc:
        raise HTTPException(status_code=400, detail=f"{exc.provider}: {exc}") from exc

    asset_prices = _price_series(asset_response.points)
    benchmark_prices = _price_series(benchmark_response.points)
    asset_returns = daily_returns(asset_prices)
    benchmark_returns = daily_returns(benchmark_prices)

    if len(asset_returns) < 2:
        raise HTTPException(status_code=400, detail=f"Not enough usable observations for {req.symbol}")

    cumulative = cumulative_returns(asset_returns)
    volatility = rolling_volatility(asset_returns, window=20)
    ma20 = moving_average(asset_prices, 20)
    ma50 = moving_average(asset_prices, 50)
    rsi = relative_strength_index(asset_prices, window=14)
    z20 = z_score(asset_prices, window=20)
    rel_strength = relative_strength(asset_prices, benchmark_prices)

    providers = {asset_response.freshness.provider, benchmark_response.freshness.provider}
    statuses = {asset_response.freshness.status, benchmark_response.freshness.status}
    degraded = bool(statuses.intersection({"demo", "fallback", "stale", "error", "missing"})) or len(providers) > 1

    warnings = [
        "Historical price relationships are descriptive and are not forecasts or investment advice.",
        "Changing the range, benchmark, provider, or data entitlement can materially change the metrics.",
    ]
    if degraded:
        warnings.append("At least one series used demo/fallback/mixed-provider data; treat cross-series comparisons as illustrative.")

    latest = asset_prices.iloc[-1]
    previous = asset_prices.iloc[-2] if len(asset_prices) > 1 else latest

    return {
        "status": "partial_success" if degraded else "complete",
        "symbol": asset_response.symbol,
        "name": asset_response.name,
        "benchmark": benchmark_response.symbol,
        "range": req.range,
        "quote": {
            "price": float(latest),
            "change": float(latest - previous),
            "changePercent": float((latest / previous) - 1) if previous else 0.0,
        },
        "metrics": {
            "cumulativeReturn": _last(cumulative),
            "rollingVolatility20d": _last(volatility),
            "maxDrawdown": max_drawdown(asset_returns),
            "movingAverage20d": _last(ma20),
            "movingAverage50d": _last(ma50),
            "rsi14": _last(rsi),
            "zScore20d": _last(z20),
            "betaVsBenchmark": beta_vs_benchmark(asset_returns, benchmark_returns),
            "relativeStrengthVsBenchmark": _last(rel_strength),
        },
        "priceHistory": [
            {"date": str(index.date()), "close": float(value)}
            for index, value in asset_prices.tail(120).items()
        ],
        "freshness": asset_response.freshness.model_dump(mode="json"),
        "benchmarkFreshness": benchmark_response.freshness.model_dump(mode="json"),
        "warnings": warnings,
    }
