from pathlib import Path
import shutil
import subprocess

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


def test_studio_edit_plan_splices_multiple_uploaded_videos(tmp_path: Path) -> None:
    client = studio_client()
    project = client.post("/api/studio/projects", json={"name": "Multi clip splice"}).json()
    uploaded_assets = []
    for index in range(2):
        video_path = tmp_path / f"clip_{index}.mp4"
        video_path.write_bytes(b"placeholder video bytes")
        with video_path.open("rb") as handle:
            response = client.post(
                f"/api/studio/projects/{project['id']}/video",
                data={"rights_confirmed": "true"},
                files={"file": (video_path.name, handle, "video/mp4")},
            )
        assert response.status_code == 200
        uploaded_assets.append(response.json())

    plan_response = client.post(
        f"/api/studio/projects/{project['id']}/edit-plans",
        json={
            "prompt": "Make a 12 second fast montage that splices all uploaded clips to the music.",
            "media_asset_id": uploaded_assets[0]["id"],
            "clip_type": "hype",
            "add_music": False,
            "add_captions": True,
            "add_hashtags": True,
        },
    )

    assert plan_response.status_code == 200
    plan = plan_response.json()["plan"]
    assert plan["source_mode"] == "uploaded_splice"
    assert plan["source_asset_ids"] == [asset["id"] for asset in uploaded_assets]
    assert {segment["source_asset_id"] for segment in plan["segments"]} == {asset["id"] for asset in uploaded_assets}
    assert all(segment["source_filename"] for segment in plan["segments"])


@pytest.mark.skipif(shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None, reason="ffmpeg not installed")
def test_studio_project_plan_and_real_render(tmp_path: Path) -> None:
    client = studio_client()
    project = client.post("/api/studio/projects", json={"name": "Studio MVP"}).json()
    video_path = tmp_path / "clip.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "lavfi", "-i", "testsrc2=duration=3:size=320x568:rate=24",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(video_path),
    ], check=True)

    with video_path.open("rb") as handle:
        upload = client.post(
            f"/api/studio/projects/{project['id']}/video",
            data={"rights_confirmed": "true"},
            files={"file": ("clip.mp4", handle, "video/mp4")},
        )
    assert upload.status_code == 200
    asset = upload.json()
    assert asset["file_type"] == "mp4"
    assert asset["preview_url"].startswith("/media/inputs/")

    song_path = tmp_path / "music.wav"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "lavfi", "-i", "sine=frequency=880:duration=3", str(song_path),
    ], check=True)
    with song_path.open("rb") as handle:
        music_upload = client.post(
            f"/api/studio/projects/{project['id']}/music",
            data={"rights_confirmed": "true"},
            files={"file": ("music.wav", handle, "audio/wav")},
        )
    assert music_upload.status_code == 200
    music_asset = music_upload.json()
    assert music_asset["kind"] == "music_audio"

    plan_response = client.post(
        f"/api/studio/projects/{project['id']}/edit-plans",
        json={
            "prompt": "Make this a chaotic 2-second TikTok clip.",
            "media_asset_id": asset["id"],
            "clip_type": "funny",
            "add_music": True,
            "add_captions": True,
            "add_hashtags": True,
        },
    )
    assert plan_response.status_code == 200
    plan = plan_response.json()["plan"]
    assert plan["segments"]
    assert plan["features"] == {"music": True, "captions": True, "hashtags": True}
    assert plan["music_asset_id"] == music_asset["id"]
    assert plan["caption_packages"]["youtube_shorts"]["hashtags"]

    render = client.post(f"/api/studio/projects/{project['id']}/render")
    assert render.status_code == 200
    assert render.json()["render_interface"] == "ffmpeg"

    refreshed = client.get(f"/api/studio/projects/{project['id']}").json()
    assert refreshed["render_job"]["status"] == "finished"
    assert refreshed["exports"][0]["status"] == "ready"
    assert refreshed["exports"][0]["download_url"].startswith("/media/outputs/")
    assert Path(refreshed["exports"][0]["path"]).exists()

def test_ai_edit_plan_uses_learning_profile_and_music_start() -> None:
    plan = generate_edit_plan(
        "Make this a 10 second TikTok clip with captions.",
        VideoMetadata(duration=30.0, width=1080, height=1920, file_type="mp4"),
        {"sample_size": 4, "recommended_pacing": "faster", "caption_density": "high"},
        music_duration=60.0,
    )

    assert plan["learning_profile"]["recommended_pacing"] == "faster"
    assert len(plan["segments"]) == 6
    assert len(plan["text_overlays"]) == 4
    assert plan["music_start_seconds"] > 0
    assert "official/permissioned" in plan["trend_context"]


def test_studio_feedback_updates_learning_profile() -> None:
    client = studio_client()
    project = client.post("/api/studio/projects", json={"name": "Feedback trainer"}).json()

    for rating in (2, 2, 1):
        response = client.post(
            f"/api/studio/projects/{project['id']}/feedback",
            json={"rating": rating, "signal": "manual"},
        )
        assert response.status_code == 200

    refreshed = client.get(f"/api/studio/projects/{project['id']}").json()
    assert refreshed["learning_profile"]["sample_size"] == 3
    assert refreshed["learning_profile"]["recommended_pacing"] == "faster"
