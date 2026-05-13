from __future__ import annotations

import json
import subprocess
from pathlib import Path

ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"}


def detect_beats(song_path: str | Path, max_beats: int | None = None) -> list[float]:
    song_path = Path(song_path)
    if not song_path.exists():
        raise FileNotFoundError(f"Song file not found: {song_path}")
    import librosa

    y, sr = librosa.load(str(song_path), sr=None, mono=True)
    _tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beats = [round(float(t), 3) for t in librosa.frames_to_time(beat_frames, sr=sr) if float(t) >= 0]
    if len(beats) < 2:
        # Keep very short synthetic/manual QA audio usable.
        duration = float(librosa.get_duration(y=y, sr=sr))
        beats = [round(t, 3) for t in _fallback_grid(duration)]
    return beats[:max_beats] if max_beats is not None else beats


def _fallback_grid(duration: float, step: float = 0.5) -> list[float]:
    count = max(2, int(duration / step))
    return [index * step for index in range(count)]


def beat_intervals(beats: list[float], min_duration: float = 0.25, max_duration: float = 3.0) -> list[tuple[float, float]]:
    intervals: list[tuple[float, float]] = []
    for start, end in zip(beats, beats[1:]):
        duration = end - start
        if duration < min_duration:
            continue
        intervals.append((start, min(end, start + max_duration)))
    return intervals


def probe_audio_metadata(audio_path: str | Path) -> dict:
    audio_path = Path(audio_path)
    metadata = {
        "duration": None,
        "file_type": audio_path.suffix.lower().lstrip("."),
    }
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration,format_name", "-of", "json", str(audio_path)],
            check=True,
            capture_output=True,
            text=True,
        )
        data = json.loads(result.stdout or "{}")
        fmt = data.get("format") or {}
        metadata.update({
            "duration": float(fmt["duration"]) if fmt.get("duration") else None,
            "file_type": metadata["file_type"] or fmt.get("format_name"),
        })
    except (subprocess.SubprocessError, FileNotFoundError, KeyError, ValueError, json.JSONDecodeError):
        pass
    return metadata
