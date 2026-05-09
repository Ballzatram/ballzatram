from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
redis = pytest.importorskip("redis")
RedisConnectionError = redis.exceptions.ConnectionError
from fastapi.testclient import TestClient

from app import db
from app.jobs import start_project_job
from app.main import app


class FakeBackgroundTasks:
    def __init__(self) -> None:
        self.tasks = []

    def add_task(self, func, *args, **kwargs) -> None:
        self.tasks.append((func, args, kwargs))


def test_create_project_api(tmp_path: Path, monkeypatch) -> None:
    # Uses configured sqlite path; endpoint should create a durable project row.
    db.init_db()
    client = TestClient(app)
    response = client.post("/api/projects", json={"name": "Test", "style_template": "all", "num_outputs": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test"
    assert data["num_outputs"] == 5


def test_generate_requires_uploaded_song_and_video() -> None:
    db.init_db()
    client = TestClient(app)
    project = client.post("/api/projects", json={"name": "Needs media", "style_template": "all", "num_outputs": 1}).json()

    response = client.post(f"/api/projects/{project['id']}/generate")

    assert response.status_code == 400
    assert response.json()["detail"] == "Upload a song before generating edits."


def test_generate_ignores_metadata_only_assets() -> None:
    db.init_db()
    client = TestClient(app)
    project = client.post("/api/projects", json={"name": "Metadata only", "style_template": "all", "num_outputs": 1}).json()
    db.add_asset(project["id"], "song", "youtube_metadata", url="https://youtu.be/dQw4w9WgXcQ")
    db.add_asset(project["id"], "video", "youtube_metadata", url="https://youtu.be/dQw4w9WgXcQ")

    response = client.post(f"/api/projects/{project['id']}/generate")

    assert response.status_code == 400
    assert response.json()["detail"] == "Upload a song before generating edits."


def test_start_project_job_falls_back_to_local_background(monkeypatch) -> None:
    db.init_db()
    project = db.create_project("Fallback", "fast_cut", 1)
    job = db.create_job(project["id"])
    background = FakeBackgroundTasks()

    def unavailable(*args, **kwargs):
        raise RedisConnectionError("redis is down")

    monkeypatch.setattr("app.jobs.enqueue_project", unavailable)

    fallback_id = start_project_job(project["id"], job["id"], background)

    saved_job = db.get_job(job["id"])
    assert fallback_id == f"local-bg-{job['id']}"
    assert saved_job["rq_job_id"] == fallback_id
    assert saved_job["message"] == "Queued locally because Redis is unavailable"
    assert len(background.tasks) == 1
