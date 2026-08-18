from fastapi.testclient import TestClient

from app.main import app

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
