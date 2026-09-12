"""Cost-isolation gates: operator keys must never fund an anonymous request."""
import sys
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import ParcelResearchRequest
from app.services.agent import chat
from app.services.parcel_research import build_parcel_research

client = TestClient(app)


def test_operator_key_cannot_fund_agent_or_parcel(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "operator-key-must-not-be-used")

    attempts = []

    def forbidden(**kwargs):
        attempts.append(kwargs)
        raise AssertionError("Model client must not be created without a user key")

    monkeypatch.setitem(sys.modules, "openai", SimpleNamespace(OpenAI=forbidden))
    response = client.post("/api/agent/chat", json={"message": "Explain this", "page_id": "stock"})
    assert response.status_code == 200
    assert response.json()["structured_output"]["status"] == "partial_success"
    request = ParcelResearchRequest.model_validate({"thesis": {"useCase": "Find land for a small riding facility near Charlotte", "market": "Charlotte"}})
    assert build_parcel_research(request)["mode"] == "fallback"
    assert attempts == []


def test_user_key_is_request_scoped_and_does_not_enter_history(monkeypatch):
    key = "sk-proj-synthetic-user-scoped-key"
    calls = []

    def openai(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(responses=SimpleNamespace(create=lambda **args: SimpleNamespace(output_text='{"summary":"User-funded draft","cards":[]}')))

    monkeypatch.setitem(sys.modules, "openai", SimpleNamespace(OpenAI=openai))
    result = chat("stock", None, "Explain this", None, api_key=key)
    assert calls == [{"api_key": key, "max_retries": 0, "timeout": 45}]
    assert result["answer"] == "User-funded draft"
    assert key not in str(result)
    chat("stock", None, "Another request without a key", None)
    assert len(calls) == 1


def test_subscription_credentials_are_rejected_at_the_api_boundary():
    response = client.post("/api/agent/chat", headers={"Authorization": "Bearer sk-ant-oat-subscription-token"}, json={"message": "Explain this", "page_id": "stock"})
    assert response.status_code == 401
    assert "subscription-token" not in response.text
