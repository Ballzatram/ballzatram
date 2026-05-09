from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient

from app.config import DATA_DIR, DB_PATH
from app.main import app


def test_create_project_api(tmp_path: Path, monkeypatch) -> None:
    # Uses configured sqlite path; endpoint should create a durable project row.
    client = TestClient(app)
    response = client.post("/api/projects", json={"name": "Test", "style_template": "all", "num_outputs": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test"
    assert data["num_outputs"] == 5
