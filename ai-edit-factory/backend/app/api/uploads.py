from __future__ import annotations

import re
from pathlib import Path

from typing import Any

from app.config import MAX_UPLOAD_BYTES
from app.media.audio import ALLOWED_AUDIO_EXTENSIONS
from app.media.video import ALLOWED_VIDEO_EXTENSIONS

SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_filename(filename: str) -> str:
    name = Path(filename).name.strip().replace(" ", "_")
    name = SAFE_NAME_RE.sub("", name)
    if not name or name in {".", ".."}:
        raise ValueError("Invalid filename")
    return name[:120]


def validate_extension(filename: str, allowed: set[str]) -> None:
    if Path(filename).suffix.lower() not in allowed:
        raise ValueError(f"Unsupported file type. Allowed: {', '.join(sorted(allowed))}")


async def save_upload(upload: Any, destination_dir: Path, allowed: set[str]) -> Path:
    filename = sanitize_filename(upload.filename or "upload")
    validate_extension(filename, allowed)
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination = destination_dir / filename
    total = 0
    with destination.open("wb") as handle:
        while chunk := await upload.read(1024 * 1024):
            total += len(chunk)
            if total > MAX_UPLOAD_BYTES:
                destination.unlink(missing_ok=True)
                raise ValueError(f"Upload exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit")
            handle.write(chunk)
    return destination


async def save_song_upload(upload: Any, destination_dir: Path) -> Path:
    return await save_upload(upload, destination_dir, ALLOWED_AUDIO_EXTENSIONS)


async def save_video_upload(upload: Any, destination_dir: Path) -> Path:
    return await save_upload(upload, destination_dir, ALLOWED_VIDEO_EXTENSIONS)
