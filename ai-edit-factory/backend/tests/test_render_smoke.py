from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from app import db
from app.media.rendering import render_studio_edit
from app.media.probe import probe_media_metadata


pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None, reason="ffmpeg/ffprobe not installed")


def _run(command: list[str]) -> None:
    subprocess.run(command, check=True, capture_output=True, text=True)


def _streams(path: Path) -> list[dict]:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type", "-of", "json", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout).get("streams", [])


def test_backend_render_smoke_with_uploaded_music(tmp_path: Path) -> None:
    db.DB_PATH = tmp_path / "render-smoke.sqlite3"
    db.init_db()
    video_path = tmp_path / "source.mp4"
    music_path = tmp_path / "music.wav"
    output_path = tmp_path / "rendered.mp4"

    _run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "lavfi", "-i", "testsrc2=duration=3:size=360x640:rate=24",
        "-f", "lavfi", "-i", "sine=frequency=330:duration=3",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(video_path),
    ])
    _run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=880:duration=4", str(music_path)])

    project = db.create_video_project("Render smoke")
    video_meta = probe_media_metadata(video_path)
    music_meta = probe_media_metadata(music_path)
    video_asset = db.add_video_project_asset(
        project["id"],
        "source_video",
        "upload",
        path=str(video_path),
        duration=video_meta["duration"],
        width=video_meta["width"],
        height=video_meta["height"],
        fps=video_meta["fps"],
        has_audio=video_meta["has_audio"],
        analysis_json=video_meta["analysis_json"],
        original_filename="source.mp4",
    )
    music_asset = db.add_video_project_asset(
        project["id"],
        "music_audio",
        "upload",
        path=str(music_path),
        duration=music_meta["duration"],
        has_audio=True,
        analysis_json=music_meta["analysis_json"],
        original_filename="music.wav",
    )
    plan = {
        "schema_version": "mvp.edit_plan.v1",
        "platform": "tiktok",
        "target_platform": "tiktok",
        "duration_seconds": 2.5,
        "aspect_ratio": "9:16",
        "crop_mode": "cover_vertical_center",
        "features": {"music": True, "captions": False, "hashtags": False},
        "music_asset_id": music_asset["id"],
        "music_settings": {
            "music_asset_id": music_asset["id"],
            "source_start_s": 0.1,
            "source_end_s": None,
            "volume": 1.0,
            "fade_in_s": 0.05,
            "fade_out_s": 0.1,
            "duck_original_audio": True,
        },
        "segments": [{"source_asset_id": video_asset["id"], "source_start": 0.0, "source_end": 2.5, "reason": "smoke test segment"}],
        "text_overlays": [],
    }
    db.create_edit_plan(project["id"], video_asset["id"], "smoke", plan)

    render_studio_edit(video_path, plan, output_path, source_duration=video_asset["duration"], music_path=music_path, source_assets=[video_asset])

    streams = _streams(output_path)
    assert any(stream["codec_type"] == "video" for stream in streams)
    assert any(stream["codec_type"] == "audio" for stream in streams)
    assert output_path.exists()
    assert output_path.resolve() != video_path.resolve()
    assert output_path.stat().st_size != video_path.stat().st_size
