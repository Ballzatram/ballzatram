from __future__ import annotations

import json
import subprocess
from pathlib import Path


def _run_ffprobe(path: Path) -> dict:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "stream=index,codec_type,width,height,avg_frame_rate,duration:format=duration,format_name",
            "-of", "json", str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout or "{}")


def _fps(value: str | None) -> float | None:
    if not value or value == "0/0":
        return None
    try:
        num, den = value.split("/", 1)
        den_f = float(den)
        return round(float(num) / den_f, 3) if den_f else None
    except (ValueError, ZeroDivisionError):
        return None


def probe_media_metadata(path: str | Path) -> dict:
    media_path = Path(path)
    metadata = {
        "duration": None,
        "width": None,
        "height": None,
        "fps": None,
        "has_audio": False,
        "file_type": media_path.suffix.lower().lstrip("."),
        "analysis_json": {"streams": [], "segments": []},
    }
    try:
        data = _run_ffprobe(media_path)
        streams = data.get("streams") or []
        fmt = data.get("format") or {}
        video = next((stream for stream in streams if stream.get("codec_type") == "video"), {})
        metadata.update({
            "duration": float(fmt["duration"]) if fmt.get("duration") else None,
            "width": int(video["width"]) if video.get("width") else None,
            "height": int(video["height"]) if video.get("height") else None,
            "fps": _fps(video.get("avg_frame_rate")),
            "has_audio": any(stream.get("codec_type") == "audio" for stream in streams),
            "file_type": metadata["file_type"] or fmt.get("format_name"),
            "analysis_json": {
                "format_name": fmt.get("format_name"),
                "duration": float(fmt["duration"]) if fmt.get("duration") else None,
                "streams": [{"index": s.get("index"), "codec_type": s.get("codec_type")} for s in streams],
                "segments": _segments(float(fmt["duration"]) if fmt.get("duration") else None),
            },
        })
    except (subprocess.SubprocessError, FileNotFoundError, KeyError, ValueError, json.JSONDecodeError):
        pass
    return metadata


def _segments(duration: float | None) -> list[dict]:
    if not duration or duration <= 0:
        return []
    count = min(8, max(1, int(duration // 2) or 1))
    step = duration / count
    return [
        {"start": round(index * step, 2), "end": round(min(duration, (index + 1) * step), 2), "label": "auto_probe_segment"}
        for index in range(count)
    ]


def create_thumbnail(video_path: str | Path, output_path: str | Path, at_seconds: float = 0.5) -> Path | None:
    video = Path(video_path)
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{at_seconds:.3f}", "-i", str(video), "-frames:v", "1", "-vf", "scale=360:-1", str(output)],
            check=True,
            capture_output=True,
            text=True,
        )
        return output if output.exists() else None
    except (subprocess.SubprocessError, FileNotFoundError):
        return None
