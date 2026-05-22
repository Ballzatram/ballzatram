from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_agent_processes_cover_pages():
    r = client.get("/api/agent/processes")
    assert r.status_code == 200
    processes = r.json()["processes"]
    for page in ["dashboard", "stock", "portfolio", "scenario", "event-study", "model-compare", "classroom", "reports"]:
        assert page in processes
        assert processes[page][0]["outcome"]


def test_agent_chat_stores_history_without_openai_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    payload = {"page_id": "stock", "process_id": "stock-driver-analysis", "message": "What should I do first?"}
    r = client.post("/api/agent/chat", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["page_id"] == "stock"
    assert body["conversation_id"]
    assert len(body["history"]) == 2
    assert body["structured_output"]["summary"]
    assert body["structured_output"]["cards"][0]["type"] in {"opportunity", "risk", "recommendation", "data", "next_step"}
    assert body["structured_output"]["missingData"]

    history = client.get(f"/api/agent/history/{body['conversation_id']}")
    assert history.status_code == 200
    assert len(history.json()["messages"]) == 2


def test_macroboard_research_returns_standard_tool_output(monkeypatch):
    monkeypatch.delenv("FRED_API_KEY", raising=False)
    payload = {
        "prompt": "Should I reduce SPY exposure if rates stay high?",
        "assumptions": {"tickers": ["SPY"], "macroSeries": ["DGS10", "CPI", "CREDIT"]},
    }
    r = client.post("/api/macro-board/research", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["summary"]
    assert body["cards"]
    assert body["cards"][0]["type"] in {"opportunity", "risk", "recommendation", "data", "next_step"}
    assert "missingData" in body
    assert "recommendedNextSteps" in body
    assert "sources" in body
