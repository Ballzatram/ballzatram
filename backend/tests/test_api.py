from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    r = client.get('/health')
    assert r.status_code == 200


def test_stock_analysis():
    payload = {"asset":"asset_ret","macro_series":["cpi_yoy","ffr","dxy"],"start_date":"2021-01-31","end_date":"2022-12-31","frequency":"M","missing_policy":"interpolate"}
    r = client.post('/api/analyze/stock', json=payload)
    assert r.status_code == 200
    assert "ols" in r.json()
