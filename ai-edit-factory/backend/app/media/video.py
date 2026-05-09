from __future__ import annotations

import json
import subprocess
from pathlib import Path

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}


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
