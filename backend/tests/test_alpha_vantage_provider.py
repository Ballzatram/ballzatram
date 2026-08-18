from datetime import date

import pytest

from app.services.market_data.alpha_vantage_provider import AlphaVantageMarketDataProvider
from app.services.market_data.factory import get_market_data_provider
from app.services.market_data.providers import CompositeMarketDataProvider, ProviderError


class FakeResponse:
    def __init__(self, payload: dict):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_alpha_vantage_price_series_parses_and_labels_cached_data(monkeypatch):
    monkeypatch.setenv("MARKET_DATA_API_KEY", "test-key")
    monkeypatch.delenv("ALPHA_VANTAGE_ENTITLEMENT", raising=False)

    payload = {
        "Time Series (Daily)": {
            "2026-08-18": {"1. open": "101", "2. high": "104", "3. low": "100", "4. close": "103", "5. volume": "1200000"},
            "2026-08-17": {"1. open": "100", "2. high": "102", "3. low": "99", "4. close": "101", "5. volume": "900000"},
        }
    }

    def fake_get(url, params, timeout):
        assert params["function"] == "TIME_SERIES_DAILY"
        assert params["symbol"] == "SPY"
        assert params["apikey"] == "test-key"
        return FakeResponse(payload)

    monkeypatch.setattr("app.services.market_data.alpha_vantage_provider.requests.get", fake_get)

    response = AlphaVantageMarketDataProvider().get_price_series("spy", range="1mo")

    assert response.symbol == "SPY"
    assert response.points[-1].close == 103
    assert response.points[-1].date == date(2026, 8, 18)
    assert response.freshness.provider == "alpha-vantage"
    assert response.freshness.status == "cached"
    assert response.freshness.as_of == date(2026, 8, 18)


def test_alpha_vantage_quote_parses_percent_and_entitlement(monkeypatch):
    monkeypatch.setenv("ALPHA_VANTAGE_API_KEY", "test-key")
    monkeypatch.setenv("ALPHA_VANTAGE_ENTITLEMENT", "delayed")

    payload = {
        "Global Quote": {
            "01. symbol": "AAPL",
            "05. price": "220.50",
            "07. latest trading day": "2026-08-18",
            "09. change": "2.50",
            "10. change percent": "1.1468%",
        }
    }

    def fake_get(url, params, timeout):
        assert params["function"] == "GLOBAL_QUOTE"
        assert params["entitlement"] == "delayed"
        return FakeResponse(payload)

    monkeypatch.setattr("app.services.market_data.alpha_vantage_provider.requests.get", fake_get)

    response = AlphaVantageMarketDataProvider().get_quote("aapl")

    assert response.symbol == "AAPL"
    assert response.price == 220.50
    assert response.change == 2.50
    assert response.change_percent == pytest.approx(0.011468)
    assert response.freshness.status == "live"


def test_alpha_vantage_surfaces_api_information_as_provider_error(monkeypatch):
    monkeypatch.setenv("MARKET_DATA_API_KEY", "test-key")
    monkeypatch.setattr(
        "app.services.market_data.alpha_vantage_provider.requests.get",
        lambda *args, **kwargs: FakeResponse({"Information": "rate limit reached"}),
    )

    with pytest.raises(ProviderError, match="rate limit reached"):
        AlphaVantageMarketDataProvider().get_quote("SPY")


def test_factory_adds_live_equity_provider_before_demo_fallback(monkeypatch):
    monkeypatch.setenv("MARKET_DATA_API_KEY", "test-key")
    monkeypatch.delenv("FRED_API_KEY", raising=False)

    provider = get_market_data_provider()

    assert isinstance(provider, CompositeMarketDataProvider)
    assert provider.providers[0].name == "alpha-vantage"
    assert provider.providers[-1].name == "demo-fallback"
