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
    monkeypatch.setenv("AGENT_REQUIRE_PAYMENT", "false")
    payload = {"page_id": "stock", "process_id": "stock-driver-analysis", "message": "What should I do first?"}
    r = client.post("/api/agent/chat", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["page_id"] == "stock"
    assert body["conversation_id"]
    assert len(body["history"]) == 2

    history = client.get(f"/api/agent/history/{body['conversation_id']}")
    assert history.status_code == 200
    assert len(history.json()["messages"]) == 2
