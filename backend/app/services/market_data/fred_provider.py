from __future__ import annotations

import os
from datetime import date, datetime, timezone
from typing import Sequence
from urllib.parse import quote

from app.services.market_data.models import (
    DataFreshness,
    PriceSeriesResponse,
    QuoteResponse,
    RateSeries,
    RatesSeriesResponse,
    TimeSeriesPoint,
    YieldCurvePoint,
    YieldCurveResponse,
)
from app.services.market_data.providers import ProviderError
from app.services.market_data.universes import get_universe


RATE_LABELS = {
    "TB3MS": "3-month Treasury bill",
    "DGS2": "2-year Treasury yield",
    "DGS10": "10-year Treasury yield",
    "DGS30": "30-year Treasury yield",
    "FEDFUNDS": "Effective fed funds rate",
}


class FredRatesProvider:
    name = "fred-rates"

    def _api_key(self) -> str:
        key = os.getenv("FRED_API_KEY", "").strip()
        if not key:
            raise ProviderError("FRED_API_KEY is not configured", provider=self.name)
        return key

    def _fetch_series(self, series_id: str) -> list[TimeSeriesPoint]:
        try:
            import requests
        except ModuleNotFoundError as exc:
            raise ProviderError("requests is not installed, so FRED cannot be queried", provider=self.name) from exc

        key = self._api_key()
        url = (
            "https://api.stlouisfed.org/fred/series/observations"
            f"?series_id={quote(series_id)}&api_key={quote(key)}&file_type=json"
        )
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
        except Exception as exc:
            raise ProviderError(f"FRED request failed for {series_id}: {exc}", provider=self.name) from exc
        points = []
        for observation in response.json().get("observations", []):
            value = observation.get("value")
            if value in (None, "."):
                continue
            points.append(TimeSeriesPoint(date=date.fromisoformat(observation["date"]), value=float(value)))
        if not points:
            raise ProviderError(f"FRED returned no usable observations for {series_id}", provider=self.name)
        return points

    def _freshness(self, points: list[TimeSeriesPoint]) -> DataFreshness:
        return DataFreshness(
            provider=self.name,
            source="FRED observations API",
            status="live",
            as_of=points[-1].date if points else None,
            retrieved_at=datetime.now(timezone.utc),
            warnings=["FRED data is live when reachable, but publication lags and revisions still matter."],
        )

    def get_rates_series(
        self,
        series_ids: Sequence[str] | None = None,
        *,
        range: str = "2y",
        interval: str = "1mo",
    ) -> RatesSeriesResponse:
        selected = [series.upper() for series in (series_ids or ["TB3MS", "DGS2", "DGS10"])]
        output: list[RateSeries] = []
        for series_id in selected:
            points = self._fetch_series(series_id)
            output.append(
                RateSeries(
                    series_id=series_id,
                    label=RATE_LABELS.get(series_id, series_id),
                    points=points[-60:],
                    freshness=self._freshness(points),
                )
            )
        freshness = output[0].freshness if output else DataFreshness(provider=self.name, source="FRED observations API", status="missing")
        return RatesSeriesResponse(series=output, freshness=freshness)

    def get_yield_curve(self) -> YieldCurveResponse:
        rates = self.get_rates_series(["TB3MS", "DGS2", "DGS10", "DGS30"])
        latest = {series.series_id: series.points[-1].value for series in rates.series if series.points}
        points = [
            YieldCurvePoint(tenor="3M", maturity_months=3, rate=latest["TB3MS"]),
            YieldCurvePoint(tenor="2Y", maturity_months=24, rate=latest["DGS2"]),
            YieldCurvePoint(tenor="10Y", maturity_months=120, rate=latest["DGS10"]),
            YieldCurvePoint(tenor="30Y", maturity_months=360, rate=latest["DGS30"]),
        ]
        return YieldCurveResponse(points=points, freshness=rates.freshness)

    def get_price_series(self, symbol: str, *, range: str = "1y", interval: str = "1d") -> PriceSeriesResponse:
        raise ProviderError("FRED rates provider does not serve equity, index, or ETF prices", provider=self.name)

    def get_quote(self, symbol: str) -> QuoteResponse:
        raise ProviderError("FRED rates provider does not serve quotes", provider=self.name)

    def get_batch_quotes(self, symbols: Sequence[str]) -> list[QuoteResponse]:
        raise ProviderError("FRED rates provider does not serve quotes", provider=self.name)

    def get_universe(self, universe_id: str):
        universe = get_universe(universe_id)
        if not universe:
            raise ProviderError(f"unknown market universe: {universe_id}", provider=self.name)
        return universe
