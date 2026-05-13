from pathlib import Path

import pytest

from app.ai_editor import VideoMetadata, generate_edit_plan


def studio_client():
    pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient

    from app import db
    from app.main import app

    db.init_db()
    return TestClient(app)


def test_ai_edit_plan_has_structured_short_form_shape() -> None:
    plan = generate_edit_plan(
        "Make this a chaotic 20-second TikTok clip with dramatic captions and dark funny energy.",
        VideoMetadata(duration=42.0, width=1920, height=1080, file_type="mp4"),
    )

    assert plan["platform"] == "tiktok"
    assert plan["duration_seconds"] == 20
    assert plan["aspect_ratio"] == "9:16"
    assert plan["segments"]
    assert plan["text_overlays"]
    assert "caption_packages" in plan
    assert "tiktok" in plan["caption_packages"]
    assert "user-provided" in plan["system_instruction"]


def test_studio_upload_requires_rights_confirmation(tmp_path: Path) -> None:
    client = studio_client()
    project = client.post("/api/studio/projects", json={"name": "Rights check"}).json()
    video_path = tmp_path / "clip.mp4"
    video_path.write_bytes(b"not a real video but enough for upload validation")

    with video_path.open("rb") as handle:
        response = client.post(
            f"/api/studio/projects/{project['id']}/video",
            data={"rights_confirmed": "false"},
            files={"file": ("clip.mp4", handle, "video/mp4")},
        )

    assert response.status_code == 400
    assert "Confirm" in response.json()["detail"]


def test_studio_project_plan_and_stub_render(tmp_path: Path) -> None:
    client = studio_client()
    project = client.post("/api/studio/projects", json={"name": "Studio MVP"}).json()
    video_path = tmp_path / "clip.webm"
    video_path.write_bytes(b"dev placeholder")

    with video_path.open("rb") as handle:
        upload = client.post(
            f"/api/studio/projects/{project['id']}/video",
            data={"rights_confirmed": "true"},
            files={"file": ("clip.webm", handle, "video/webm")},
        )
    assert upload.status_code == 200
    asset = upload.json()
    assert asset["file_type"] == "webm"
    assert asset["preview_url"].startswith("/media/inputs/")

    plan_response = client.post(
        f"/api/studio/projects/{project['id']}/edit-plans",
        json={"prompt": "Make this a chaotic 20-second TikTok clip.", "media_asset_id": asset["id"]},
    )
    assert plan_response.status_code == 200
    plan = plan_response.json()["plan"]
    assert plan["segments"]
    assert plan["caption_packages"]["youtube_shorts"]["hashtags"]

    render = client.post(f"/api/studio/projects/{project['id']}/render")
    assert render.status_code == 200
    assert render.json()["render_interface"] == "stub"
    assert render.json()["export"]["status"] == "pending_render"
