from __future__ import annotations

import json
import subprocess
from pathlib import Path

from app.media.probe import probe_media_metadata

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}
STUDIO_ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm"}


def find_video_files(clips_dir: str | Path) -> list[Path]:
    clips_dir = Path(clips_dir)
    if not clips_dir.exists():
        raise FileNotFoundError(f"Clips folder not found: {clips_dir}")
    return sorted(path for path in clips_dir.iterdir() if path.is_file() and path.suffix.lower() in ALLOWED_VIDEO_EXTENSIONS)


def probe_duration(video_path: str | Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(video_path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(json.loads(result.stdout)["format"]["duration"])


def probe_video_metadata(video_path: str | Path) -> dict:
    return probe_media_metadata(video_path)
