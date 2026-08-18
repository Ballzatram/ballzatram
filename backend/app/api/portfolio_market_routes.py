from __future__ import annotations

import math
from typing import Literal

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from app.analytics.quant_library import daily_returns, max_drawdown
from app.services.market_data import ProviderError, get_market_data_provider

router = APIRouter(prefix="/analyze/portfolio")


class PortfolioHolding(BaseModel):
    symbol: str = Field(min_length=1, max_length=24)
    weight: float = Field(gt=0, le=100)

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, value: str) -> str:
        return value.strip().upper()


class MarketPortfolioAnalysisRequest(BaseModel):
    holdings: list[PortfolioHolding] = Field(min_length=1, max_length=30)
    benchmark: str = Field(default="SPY", min_length=1, max_length=24)
    range: Literal["1mo", "3mo", "6mo", "1y", "2y", "5y"] = "1y"

    @field_validator("benchmark")
    @classmethod
    def normalize_benchmark(cls, value: str) -> str:
        return value.strip().upper()

    @model_validator(mode="after")
    def unique_symbols(self):
        symbols = [holding.symbol for holding in self.holdings]
        if len(symbols) != len(set(symbols)):
            raise ValueError("holding symbols must be unique")
        return self


def _prices(response) -> pd.Series:
    return pd.Series(
        [point.close for point in response.points],
        index=pd.to_datetime([point.date for point in response.points]),
        dtype=float,
        name=response.symbol,
    ).sort_index()


def _safe_float(value) -> float | None:
    if value is None or pd.isna(value) or not math.isfinite(float(value)):
        return None
    return float(value)


@router.post("/market")
def analyze_market_portfolio(req: MarketPortfolioAnalysisRequest):
    provider = get_market_data_provider()
    requested_total = sum(holding.weight for holding in req.holdings)
    successful: list[tuple[PortfolioHolding, object, pd.Series]] = []
    failures: list[dict] = []

    for holding in req.holdings:
        try:
            response = provider.get_price_series(holding.symbol, range=req.range, interval="1d")
            returns = daily_returns(_prices(response))
            if len(returns) < 2:
                raise ProviderError("portfolio", f"Not enough usable observations for {holding.symbol}")
            successful.append((holding, response, returns))
        except ProviderError as exc:
            failures.append({"symbol": holding.symbol, "weight": holding.weight, "message": str(exc), "provider": exc.provider})
        except Exception as exc:
            failures.append({"symbol": holding.symbol, "weight": holding.weight, "message": str(exc), "provider": "unknown"})

    if not successful:
        raise HTTPException(status_code=400, detail="No holdings returned enough usable market data")

    successful_weight = sum(holding.weight for holding, _, _ in successful)
    normalized_weights = {holding.symbol: holding.weight / successful_weight for holding, _, _ in successful}

    returns_frame = pd.concat([returns.rename(holding.symbol) for holding, _, returns in successful], axis=1, join="inner").dropna()
    if len(returns_frame) < 2:
        raise HTTPException(status_code=400, detail="Successful holdings do not share enough overlapping observations")

    weight_series = pd.Series(normalized_weights).reindex(returns_frame.columns)
    portfolio_returns = returns_frame.mul(weight_series, axis=1).sum(axis=1)

    try:
        benchmark_response = provider.get_price_series(req.benchmark, range=req.range, interval="1d")
        benchmark_returns = daily_returns(_prices(benchmark_response))
        aligned = pd.concat([portfolio_returns.rename("portfolio"), benchmark_returns.rename("benchmark")], axis=1, join="inner").dropna()
        benchmark_freshness = benchmark_response.freshness.model_dump(mode="json")
        if len(aligned) >= 2 and aligned["benchmark"].var() > 0:
            beta = aligned["portfolio"].cov(aligned["benchmark"]) / aligned["benchmark"].var()
            correlation = aligned["portfolio"].corr(aligned["benchmark"])
            benchmark_cumulative = (1 + aligned["benchmark"]).prod() - 1
        else:
            beta = None
            correlation = None
            benchmark_cumulative = None
    except Exception as exc:
        benchmark_freshness = None
        beta = correlation = benchmark_cumulative = None
        failures.append({"symbol": req.benchmark, "weight": 0, "message": f"Benchmark unavailable: {exc}", "provider": "benchmark"})

    covariance = returns_frame.cov() * 252
    annualized_variance = float(weight_series.T.dot(covariance).dot(weight_series))
    annualized_volatility = math.sqrt(max(0.0, annualized_variance))
    marginal = covariance.dot(weight_series)
    risk_contributions_raw = weight_series * marginal
    risk_total = float(risk_contributions_raw.sum())

    cumulative_return = float((1 + portfolio_returns).prod() - 1)
    annualized_return = float((1 + cumulative_return) ** (252 / max(1, len(portfolio_returns))) - 1)
    top_weight = max(normalized_weights.values())
    effective_positions = 1 / sum(weight ** 2 for weight in normalized_weights.values())

    statuses = {response.freshness.status for _, response, _ in successful}
    providers = {response.freshness.provider for _, response, _ in successful}
    degraded = bool(failures) or bool(statuses.intersection({"demo", "fallback", "stale", "error", "missing"})) or len(providers) > 1

    holdings = []
    for holding, response, returns in successful:
        contribution = _safe_float(risk_contributions_raw.get(holding.symbol))
        holdings.append({
            "symbol": holding.symbol,
            "name": response.name,
            "requestedWeight": holding.weight / requested_total,
            "normalizedWeight": normalized_weights[holding.symbol],
            "annualizedVolatility": _safe_float(returns.std() * math.sqrt(252)),
            "cumulativeReturn": _safe_float((1 + returns).prod() - 1),
            "riskContribution": _safe_float(contribution / risk_total) if contribution is not None and risk_total else None,
            "freshness": response.freshness.model_dump(mode="json"),
        })

    warnings = [
        "Portfolio statistics use historical daily price returns and are descriptive, not forecasts or investment advice.",
        "Weights are renormalized across holdings with usable data; failed symbols remain visible in the error list.",
    ]
    if failures:
        warnings.append("One or more holdings or the benchmark failed; successful holdings were still analyzed.")
    if degraded:
        warnings.append("At least one input used demo/fallback/stale or mixed-provider data; treat results as illustrative.")

    return {
        "status": "partial_success" if degraded else "complete",
        "benchmark": req.benchmark,
        "range": req.range,
        "requestedWeightTotal": requested_total,
        "analyzedWeightTotal": successful_weight,
        "metrics": {
            "cumulativeReturn": cumulative_return,
            "annualizedReturn": annualized_return,
            "annualizedVolatility": annualized_volatility,
            "maxDrawdown": max_drawdown(portfolio_returns),
            "betaVsBenchmark": _safe_float(beta),
            "correlationVsBenchmark": _safe_float(correlation),
            "benchmarkCumulativeReturn": _safe_float(benchmark_cumulative),
            "topHoldingWeight": top_weight,
            "effectivePositions": effective_positions,
        },
        "holdings": holdings,
        "correlationMatrix": {
            "columns": list(returns_frame.columns),
            "matrix": [[_safe_float(value) for value in row] for row in returns_frame.corr().values.tolist()],
        },
        "benchmarkFreshness": benchmark_freshness,
        "errors": failures,
        "warnings": warnings,
        "scenarioPayload": {"holdings": normalized_weights},
    }
