from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_market_stock_analysis_uses_provider_contract(monkeypatch):
    monkeypatch.delenv("ALPHA_VANTAGE_API_KEY", raising=False)
    monkeypatch.delenv("MARKET_DATA_API_KEY", raising=False)
    monkeypatch.delenv("FRED_API_KEY", raising=False)

    response = client.post(
        "/api/analyze/stock/market",
        json={"symbol": "qqq", "benchmark": "spy", "range": "6mo"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["symbol"] == "QQQ"
    assert body["benchmark"] == "SPY"
    assert body["status"] == "partial_success"
    assert body["freshness"]["status"] == "demo"
    assert body["priceHistory"]
    assert body["metrics"]["maxDrawdown"] <= 0
    assert body["metrics"]["betaVsBenchmark"] is not None
    assert body["warnings"]


def test_market_stock_analysis_normalizes_symbols(monkeypatch):
    monkeypatch.delenv("ALPHA_VANTAGE_API_KEY", raising=False)
    monkeypatch.delenv("MARKET_DATA_API_KEY", raising=False)

    response = client.post(
        "/api/analyze/stock/market",
        json={"symbol": " aapl ", "benchmark": " spy ", "range": "3mo"},
    )

    assert response.status_code == 200
    assert response.json()["symbol"] == "AAPL"
    assert response.json()["benchmark"] == "SPY"


def test_market_stock_analysis_rejects_empty_symbol():
    response = client.post(
        "/api/analyze/stock/market",
        json={"symbol": "", "benchmark": "SPY", "range": "1y"},
    )

    assert response.status_code == 422
