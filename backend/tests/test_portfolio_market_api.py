from fastapi.testclient import TestClient

import app.api.portfolio_market_routes as portfolio_routes
from app.main import app
from app.services.market_data import ProviderError
from app.services.market_data.demo_provider import DemoMarketDataProvider

client = TestClient(app)


def test_portfolio_market_analysis_uses_provider_contract(monkeypatch):
    monkeypatch.delenv("ALPHA_VANTAGE_API_KEY", raising=False)
    monkeypatch.delenv("MARKET_DATA_API_KEY", raising=False)
    monkeypatch.delenv("FRED_API_KEY", raising=False)

    response = client.post(
        "/api/analyze/portfolio/market",
        json={
            "holdings": [
                {"symbol": "QQQ", "weight": 45},
                {"symbol": "TLT", "weight": 35},
                {"symbol": "GLD", "weight": 20},
            ],
            "benchmark": "SPY",
            "range": "1y",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "partial_success"
    assert body["benchmark"] == "SPY"
    assert len(body["holdings"]) == 3
    assert abs(sum(item["normalizedWeight"] for item in body["holdings"]) - 1) < 1e-9
    assert body["metrics"]["annualizedVolatility"] >= 0
    assert body["metrics"]["effectivePositions"] > 1
    assert body["correlationMatrix"]["columns"] == ["QQQ", "TLT", "GLD"]
    assert body["scenarioPayload"]["holdings"]["QQQ"] == 0.45
    assert body["warnings"]


def test_portfolio_partial_failure_preserves_successful_holdings(monkeypatch):
    demo = DemoMarketDataProvider()

    class PartialProvider:
        name = "partial-test"

        def get_price_series(self, symbol: str, *, range: str = "1y", interval: str = "1d"):
            if symbol == "BAD":
                raise ProviderError("synthetic failure", provider=self.name)
            return demo.get_price_series(symbol, range=range, interval=interval)

    monkeypatch.setattr(portfolio_routes, "get_market_data_provider", lambda: PartialProvider())

    response = client.post(
        "/api/analyze/portfolio/market",
        json={
            "holdings": [
                {"symbol": "QQQ", "weight": 60},
                {"symbol": "BAD", "weight": 20},
                {"symbol": "GLD", "weight": 20},
            ],
            "benchmark": "SPY",
            "range": "1y",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "partial_success"
    assert [holding["symbol"] for holding in body["holdings"]] == ["QQQ", "GLD"]
    assert abs(body["scenarioPayload"]["holdings"]["QQQ"] - 0.75) < 1e-9
    assert abs(body["scenarioPayload"]["holdings"]["GLD"] - 0.25) < 1e-9
    assert body["errors"][0]["symbol"] == "BAD"


def test_portfolio_market_rejects_duplicate_symbols():
    response = client.post(
        "/api/analyze/portfolio/market",
        json={
            "holdings": [
                {"symbol": "SPY", "weight": 50},
                {"symbol": "spy", "weight": 50},
            ]
        },
    )

    assert response.status_code == 422
