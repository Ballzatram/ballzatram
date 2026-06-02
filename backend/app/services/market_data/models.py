from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


DataStatus = Literal["live", "fallback", "missing", "error", "unknown"]


class DataFreshness(BaseModel):
    provider: str
    source: str
    status: DataStatus = "unknown"
    as_of: Optional[date] = None
    retrieved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    warnings: list[str] = Field(default_factory=list)


class TimeSeriesPoint(BaseModel):
    date: date
    value: float


class PricePoint(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: Optional[int] = None


class PriceSeriesResponse(BaseModel):
    symbol: str
    name: str
    range: str
    interval: str
    points: list[PricePoint]
    freshness: DataFreshness


class QuoteResponse(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    currency: str = "USD"
    freshness: DataFreshness


class RateSeries(BaseModel):
    series_id: str
    label: str
    points: list[TimeSeriesPoint]
    freshness: DataFreshness


class RatesSeriesResponse(BaseModel):
    series: list[RateSeries]
    freshness: DataFreshness


class YieldCurvePoint(BaseModel):
    tenor: str
    maturity_months: int
    rate: float


class YieldCurveResponse(BaseModel):
    points: list[YieldCurvePoint]
    freshness: DataFreshness


class UniverseItem(BaseModel):
    symbol: str
    name: str
    asset_class: str
    category: str
    description: str = ""


class MarketUniverse(BaseModel):
    id: str
    title: str
    description: str
    items: list[UniverseItem]

