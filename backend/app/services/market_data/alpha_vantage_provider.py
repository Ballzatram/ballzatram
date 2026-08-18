from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone
from typing import Any, Sequence

import requests

from app.services.market_data.models import DataFreshness, PricePoint, PriceSeriesResponse, QuoteResponse
from app.services.market_data.providers import ProviderError
from app.services.market_data.universes import get_universe


class AlphaVantageMarketDataProvider:
    """Server-side equity price/quote adapter for Alpha Vantage.

    The provider intentionally implements only the capabilities Alpha Vantage is
    used for here (equity/ETF prices and quotes). Rates continue to flow through
    FRED and unsupported methods raise ProviderError so CompositeMarketDataProvider
    can fall through to the next configured provider.
    """

    name = "alpha-vantage"
    base_url = "https://www.alphavantage.co/query"

    def _api_key(self) -> str:
        key = (os.getenv("ALPHA_VANTAGE_API_KEY") or os.getenv("MARKET_DATA_API_KEY") or "").strip()
        if not key:
            raise ProviderError(
                "ALPHA_VANTAGE_API_KEY or MARKET_DATA_API_KEY is not configured",
                provider=self.name,
            )
        return key

    def _request(self, **params: str) -> dict[str, Any]:
        request_params = {**params, "apikey": self._api_key()}
        entitlement = os.getenv("ALPHA_VANTAGE_ENTITLEMENT", "").strip()
        if entitlement in {"realtime", "delayed"}:
            request_params["entitlement"] = entitlement
        try:
            response = requests.get(self.base_url, params=request_params, timeout=12)
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            raise ProviderError(f"Alpha Vantage request failed: {exc}", provider=self.name) from exc

        for error_key in ("Error Message", "Information", "Note"):
            if payload.get(error_key):
                raise ProviderError(str(payload[error_key]), provider=self.name)
        return payload

    def _freshness(self, *, source: str, as_of: date | None, warning: str) -> DataFreshness:
        entitlement = os.getenv("ALPHA_VANTAGE_ENTITLEMENT", "").strip()
        status = "live" if entitlement in {"realtime", "delayed"} else "cached"
        return DataFreshness(
            provider=self.name,
            source=source,
            status=status,
            as_of=as_of,
            retrieved_at=datetime.now(timezone.utc),
            warnings=[warning],
        )

    @staticmethod
    def _cutoff(latest: date, range_value: str) -> date | None:
        days = {
            "1mo": 31,
            "3mo": 93,
            "6mo": 186,
            "1y": 366,
            "2y": 732,
            "5y": 1830,
        }.get(range_value)
        return latest - timedelta(days=days) if days else None

    def get_price_series(self, symbol: str, *, range: str = "1y", interval: str = "1d") -> PriceSeriesResponse:
        normalized = symbol.strip().upper()
        if not normalized:
            raise ProviderError("symbol is required", provider=self.name)
        if interval != "1d":
            raise ProviderError(
                f"Alpha Vantage adapter currently supports interval=1d, not {interval}",
                provider=self.name,
            )

        payload = self._request(function="TIME_SERIES_DAILY", symbol=normalized, outputsize="full")
        raw_series = payload.get("Time Series (Daily)")
        if not isinstance(raw_series, dict) or not raw_series:
            raise ProviderError(f"Alpha Vantage returned no daily prices for {normalized}", provider=self.name)

        points: list[PricePoint] = []
        for raw_date, row in raw_series.items():
            try:
                points.append(
                    PricePoint(
                        date=date.fromisoformat(raw_date),
                        open=float(row["1. open"]),
                        high=float(row["2. high"]),
                        low=float(row["3. low"]),
                        close=float(row["4. close"]),
                        volume=int(float(row["5. volume"])) if row.get("5. volume") else None,
                    )
                )
            except (KeyError, TypeError, ValueError) as exc:
                raise ProviderError(
                    f"Alpha Vantage returned malformed daily price data for {normalized}",
                    provider=self.name,
                ) from exc

        points.sort(key=lambda point: point.date)
        latest = points[-1].date
        cutoff = self._cutoff(latest, range)
        if cutoff:
            points = [point for point in points if point.date >= cutoff]
        if not points:
            raise ProviderError(f"No {normalized} observations remained after applying range={range}", provider=self.name)

        freshness = self._freshness(
            source="Alpha Vantage TIME_SERIES_DAILY",
            as_of=points[-1].date,
            warning=(
                "Alpha Vantage market-data freshness depends on the configured entitlement; "
                "without an entitlement this adapter treats the feed as cached/end-of-day data."
            ),
        )
        return PriceSeriesResponse(
            symbol=normalized,
            name=normalized,
            range=range,
            interval=interval,
            points=points,
            freshness=freshness,
        )

    def get_quote(self, symbol: str) -> QuoteResponse:
        normalized = symbol.strip().upper()
        if not normalized:
            raise ProviderError("symbol is required", provider=self.name)
        payload = self._request(function="GLOBAL_QUOTE", symbol=normalized)
        quote = payload.get("Global Quote")
        if not isinstance(quote, dict) or not quote.get("05. price"):
            raise ProviderError(f"Alpha Vantage returned no quote for {normalized}", provider=self.name)

        try:
            price = float(quote["05. price"])
            change = float(quote.get("09. change", 0.0))
            change_percent = float(str(quote.get("10. change percent", "0")).replace("%", "")) / 100
            as_of = date.fromisoformat(quote["07. latest trading day"]) if quote.get("07. latest trading day") else None
        except (TypeError, ValueError) as exc:
            raise ProviderError(f"Alpha Vantage returned malformed quote data for {normalized}", provider=self.name) from exc

        freshness = self._freshness(
            source="Alpha Vantage GLOBAL_QUOTE",
            as_of=as_of,
            warning=(
                "GLOBAL_QUOTE defaults to end-of-day/historical freshness unless delayed or realtime "
                "market-data entitlement is configured."
            ),
        )
        return QuoteResponse(
            symbol=normalized,
            name=normalized,
            price=price,
            change=change,
            change_percent=change_percent,
            currency="USD",
            freshness=freshness,
        )

    def get_batch_quotes(self, symbols: Sequence[str]) -> list[QuoteResponse]:
        return [self.get_quote(symbol) for symbol in symbols]

    def get_rates_series(self, series_ids: Sequence[str] | None = None, *, range: str = "2y", interval: str = "1mo"):
        raise ProviderError("Alpha Vantage equity provider does not serve the Ballzatram rates contract", provider=self.name)

    def get_yield_curve(self):
        raise ProviderError("Alpha Vantage equity provider does not serve the Ballzatram yield-curve contract", provider=self.name)

    def get_universe(self, universe_id: str):
        universe = get_universe(universe_id)
        if not universe:
            raise ProviderError(f"unknown market universe: {universe_id}", provider=self.name)
        return universe
