from __future__ import annotations

import hashlib
from datetime import date
from typing import Sequence

import numpy as np
import pandas as pd

from app.data.timeseries import load_demo_series
from app.services.market_data.models import (
    DataFreshness,
    PricePoint,
    PriceSeriesResponse,
    QuoteResponse,
    RateSeries,
    RatesSeriesResponse,
    TimeSeriesPoint,
    YieldCurvePoint,
    YieldCurveResponse,
)
from app.services.market_data.providers import ProviderError
from app.services.market_data.universes import get_universe, symbol_name


RANGE_PERIODS = {
    "1mo": 23,
    "3mo": 66,
    "6mo": 126,
    "1y": 252,
    "2y": 504,
    "5y": 1260,
}

INTERVAL_FREQ = {
    "1d": "B",
    "1wk": "W-FRI",
    "1mo": "ME",
}

RATE_LABELS = {
    "TB3MS": "3-month Treasury bill",
    "DGS2": "2-year Treasury yield",
    "DGS10": "10-year Treasury yield",
    "DGS30": "30-year Treasury yield",
    "FEDFUNDS": "Effective fed funds rate",
}


class DemoMarketDataProvider:
    name = "demo-fallback"

    def _freshness(self, *, source: str, as_of: date | None, warnings: list[str] | None = None) -> DataFreshness:
        return DataFreshness(
            provider=self.name,
            source=source,
            status="fallback",
            as_of=as_of,
            warnings=warnings
            or [
                "Using deterministic demo data because no live market-data provider is configured.",
                "Demo values are suitable for local workflow testing, not real-time analysis.",
            ],
        )

    def _dates(self, range: str, interval: str) -> pd.DatetimeIndex:
        periods = RANGE_PERIODS.get(range, RANGE_PERIODS["1y"])
        freq = INTERVAL_FREQ.get(interval, "B")
        if freq != "B":
            periods = max(6, round(periods / 5 if freq.startswith("W") else periods / 21))
        return pd.date_range(end=pd.Timestamp.today().normalize(), periods=periods, freq=freq)

    def _symbol_seed(self, symbol: str) -> int:
        digest = hashlib.sha256(symbol.upper().encode("utf-8")).digest()
        return int.from_bytes(digest[:8], "big", signed=False)

    def get_price_series(self, symbol: str, *, range: str = "1y", interval: str = "1d") -> PriceSeriesResponse:
        normalized = symbol.upper().strip()
        if not normalized:
            raise ProviderError("symbol is required", provider=self.name)

        dates = self._dates(range, interval)
        seed = self._symbol_seed(normalized)
        rng = np.random.default_rng(seed)
        base = 45 + (seed % 240)
        annual_vol = 0.12 + ((seed >> 8) % 18) / 100
        annual_drift = (((seed >> 16) % 140) - 45) / 1000
        periodic = np.sin(np.linspace(0, 5.5, len(dates)) + (seed % 11)) * 0.0025
        noise = rng.normal(annual_drift / 252, annual_vol / np.sqrt(252), len(dates))
        returns = np.clip(noise + periodic, -0.08, 0.08)
        closes = np.maximum(1, base * np.cumprod(1 + returns))

        opens = closes * (1 + rng.normal(0, 0.002, len(dates)))
        highs = np.maximum(opens, closes) * (1 + rng.uniform(0.001, 0.014, len(dates)))
        lows = np.minimum(opens, closes) * (1 - rng.uniform(0.001, 0.014, len(dates)))
        volumes = rng.integers(500_000, 8_000_000, len(dates))
        points = [
            PricePoint(
                date=timestamp.date(),
                open=round(float(opens[index]), 4),
                high=round(float(highs[index]), 4),
                low=round(float(lows[index]), 4),
                close=round(float(closes[index]), 4),
                volume=int(volumes[index]),
            )
            for index, timestamp in enumerate(dates)
        ]
        return PriceSeriesResponse(
            symbol=normalized,
            name=symbol_name(normalized),
            range=range,
            interval=interval,
            points=points,
            freshness=self._freshness(source="deterministic synthetic price series", as_of=points[-1].date if points else None),
        )

    def get_quote(self, symbol: str) -> QuoteResponse:
        series = self.get_price_series(symbol, range="1mo", interval="1d")
        if len(series.points) < 2:
            raise ProviderError(f"not enough demo prices for {symbol}", provider=self.name)
        latest = series.points[-1].close
        previous = series.points[-2].close
        change = latest - previous
        change_percent = change / previous if previous else 0.0
        return QuoteResponse(
            symbol=series.symbol,
            name=series.name,
            price=round(latest, 4),
            change=round(change, 4),
            change_percent=round(change_percent, 6),
            freshness=series.freshness,
        )

    def get_batch_quotes(self, symbols: Sequence[str]) -> list[QuoteResponse]:
        return [self.get_quote(symbol) for symbol in symbols]

    def _demo_rates_frame(self) -> pd.DataFrame:
        df = load_demo_series().copy()
        rates = pd.DataFrame(index=df.index)
        rates["FEDFUNDS"] = df["ffr"].clip(lower=0)
        rates["TB3MS"] = (df["ffr"] - 0.05).clip(lower=0)
        rates["DGS2"] = (df["ffr"] + 0.35 + df["credit_spread"] * 0.04).clip(lower=0)
        rates["DGS10"] = (df["ffr"] + 0.95 + df["credit_spread"] * 0.05 - df["cpi_yoy"] * 0.025).clip(lower=0)
        rates["DGS30"] = (rates["DGS10"] + 0.45).clip(lower=0)
        return rates.round(4)

    def get_rates_series(
        self,
        series_ids: Sequence[str] | None = None,
        *,
        range: str = "2y",
        interval: str = "1mo",
    ) -> RatesSeriesResponse:
        rates = self._demo_rates_frame()
        selected = [series.upper() for series in (series_ids or ["TB3MS", "DGS2", "DGS10"])]
        freshness = self._freshness(source="demo_data/macro_timeseries.csv synthetic rates", as_of=rates.index.max().date())
        output: list[RateSeries] = []
        for series_id in selected:
            if series_id not in rates.columns:
                continue
            points = [TimeSeriesPoint(date=index.date(), value=float(value)) for index, value in rates[series_id].tail(36).items()]
            output.append(RateSeries(series_id=series_id, label=RATE_LABELS.get(series_id, series_id), points=points, freshness=freshness))
        if not output:
            raise ProviderError("no requested rates series exist in demo data", provider=self.name)
        return RatesSeriesResponse(series=output, freshness=freshness)

    def get_yield_curve(self) -> YieldCurveResponse:
        rates = self._demo_rates_frame()
        latest = rates.iloc[-1]
        points = [
            YieldCurvePoint(tenor="3M", maturity_months=3, rate=float(latest["TB3MS"])),
            YieldCurvePoint(tenor="2Y", maturity_months=24, rate=float(latest["DGS2"])),
            YieldCurvePoint(tenor="10Y", maturity_months=120, rate=float(latest["DGS10"])),
            YieldCurvePoint(tenor="30Y", maturity_months=360, rate=float(latest["DGS30"])),
        ]
        return YieldCurveResponse(
            points=points,
            freshness=self._freshness(source="demo_data/macro_timeseries.csv synthetic curve", as_of=rates.index.max().date()),
        )

    def get_universe(self, universe_id: str):
        universe = get_universe(universe_id)
        if not universe:
            raise ProviderError(f"unknown market universe: {universe_id}", provider=self.name)
        return universe

