from __future__ import annotations

import json
import subprocess
from pathlib import Path

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
    video_path = Path(video_path)
    metadata = {
        "duration": None,
        "width": None,
        "height": None,
        "file_type": video_path.suffix.lower().lstrip("."),
    }
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height:format=duration,format_name",
                "-of", "json", str(video_path),
            ],
            check=True, capture_output=True, text=True,
        )
        data = json.loads(result.stdout or "{}")
        stream = (data.get("streams") or [{}])[0]
        fmt = data.get("format") or {}
        metadata.update({
            "duration": float(fmt["duration"]) if fmt.get("duration") else None,
            "width": int(stream["width"]) if stream.get("width") else None,
            "height": int(stream["height"]) if stream.get("height") else None,
            "file_type": metadata["file_type"] or fmt.get("format_name"),
        })
    except (subprocess.SubprocessError, FileNotFoundError, KeyError, ValueError, json.JSONDecodeError):
        # Keep local/dev uploads usable when ffprobe is not installed; rendering will still surface ffmpeg requirements.
        pass
    return metadata
