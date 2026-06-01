from __future__ import annotations

from typing import Protocol, Sequence

from app.services.market_data.models import (
    MarketUniverse,
    PriceSeriesResponse,
    QuoteResponse,
    RatesSeriesResponse,
    YieldCurveResponse,
)


class ProviderError(RuntimeError):
    def __init__(self, message: str, *, provider: str = "unknown") -> None:
        super().__init__(message)
        self.provider = provider


class MarketDataProvider(Protocol):
    name: str

    def get_rates_series(
        self,
        series_ids: Sequence[str] | None = None,
        *,
        range: str = "2y",
        interval: str = "1mo",
    ) -> RatesSeriesResponse:
        ...

    def get_yield_curve(self) -> YieldCurveResponse:
        ...

    def get_price_series(self, symbol: str, *, range: str = "1y", interval: str = "1d") -> PriceSeriesResponse:
        ...

    def get_quote(self, symbol: str) -> QuoteResponse:
        ...

    def get_batch_quotes(self, symbols: Sequence[str]) -> list[QuoteResponse]:
        ...

    def get_universe(self, universe_id: str) -> MarketUniverse:
        ...


class CompositeMarketDataProvider:
    def __init__(self, providers: Sequence[MarketDataProvider]) -> None:
        if not providers:
            raise ValueError("at least one market data provider is required")
        self.providers = list(providers)
        self.name = "composite"

    def _first(self, method: str, *args, **kwargs):
        errors: list[str] = []
        for provider in self.providers:
            try:
                return getattr(provider, method)(*args, **kwargs)
            except ProviderError as exc:
                errors.append(f"{exc.provider}: {exc}")
        raise ProviderError("; ".join(errors) or f"no provider could satisfy {method}", provider=self.name)

    def get_rates_series(self, series_ids: Sequence[str] | None = None, *, range: str = "2y", interval: str = "1mo") -> RatesSeriesResponse:
        return self._first("get_rates_series", series_ids, range=range, interval=interval)

    def get_yield_curve(self) -> YieldCurveResponse:
        return self._first("get_yield_curve")

    def get_price_series(self, symbol: str, *, range: str = "1y", interval: str = "1d") -> PriceSeriesResponse:
        return self._first("get_price_series", symbol, range=range, interval=interval)

    def get_quote(self, symbol: str) -> QuoteResponse:
        return self._first("get_quote", symbol)

    def get_batch_quotes(self, symbols: Sequence[str]) -> list[QuoteResponse]:
        return self._first("get_batch_quotes", symbols)

    def get_universe(self, universe_id: str) -> MarketUniverse:
        return self._first("get_universe", universe_id)

