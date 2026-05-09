from __future__ import annotations

import random
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from scripts.detect_beats import beat_intervals
from scripts.models import CandidateClip

TEMPLATES = ("fast_cut", "slow_mo", "high_motion", "random_montage")


@dataclass(frozen=True)
class EditPlanItem:
    clip: CandidateClip
    duration: float
    speed: float = 1.0


def ensure_ffmpeg() -> None:
    """Raise a clear error if ffmpeg is not available on PATH."""
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise RuntimeError("ffmpeg and ffprobe must be installed and available on PATH.")


def normalize_num_edits(num_edits: int) -> int:
    """Keep the MVP in the requested 10-20 edit range."""
    return max(1, min(20, int(num_edits)))


def vertical_crop_filter(width: int = 1080, height: int = 1920, speed: float = 1.0) -> str:
    """Build the ffmpeg filter for vertical 9:16 crop rendering."""
    parts = [
        f"scale={width}:{height}:force_original_aspect_ratio=increase",
        f"crop={width}:{height}",
        "setsar=1",
        "format=yuv420p",
    ]
    if speed != 1.0:
        parts.append(f"setpts={speed:.6f}*PTS")
    return ",".join(parts)


def select_clips(template: str, candidates: list[CandidateClip], count: int, rng: random.Random) -> list[CandidateClip]:
    if not candidates:
        raise ValueError("No candidate clips found. Add videos to inputs/clips/.")

    if template == "high_motion":
        pool = sorted(candidates, key=lambda clip: clip.score, reverse=True)
    elif template == "random_montage":
        pool = candidates[:]
        rng.shuffle(pool)
    elif template == "slow_mo":
        pool = sorted(candidates, key=lambda clip: (clip.score, clip.duration), reverse=True)
    else:  # fast_cut
        pool = sorted(candidates, key=lambda clip: clip.duration)

    selected: list[CandidateClip] = []
    for index in range(count):
        selected.append(pool[index % len(pool)])
    return selected


def build_edit_plan(
    template: str,
    beats: list[float],
    candidates: list[CandidateClip],
    rng: random.Random,
    max_segments: int = 24,
) -> list[EditPlanItem]:
    intervals = beat_intervals(beats)
    if template == "slow_mo":
        intervals = intervals[::2] or intervals
    if not intervals:
        raise ValueError("Not enough beat timestamps detected to build an edit.")

    intervals = intervals[:max_segments]
    selected = select_clips(template, candidates, len(intervals), rng)
    speed = 1.25 if template == "slow_mo" else 1.0
    return [EditPlanItem(clip=clip, duration=end - start, speed=speed) for clip, (start, end) in zip(selected, intervals)]


def _run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def _render_segment(item: EditPlanItem, segment_path: Path) -> None:
    source_duration = min(item.clip.duration, item.duration / item.speed)
    if source_duration <= 0:
        raise ValueError(f"Invalid clip duration for {item.clip}")

    _run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            f"{item.clip.start:.3f}",
            "-t",
            f"{source_duration:.3f}",
            "-i",
            str(item.clip.path),
            "-an",
            "-vf",
            vertical_crop_filter(speed=item.speed),
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            str(segment_path),
        ]
    )


def render_edit(plan: list[EditPlanItem], song_path: str | Path, output_path: str | Path) -> Path:
    """Render one vertical mp4 edit and overlay the song audio."""
    ensure_ffmpeg()
    song_path = Path(song_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    total_duration = sum(item.duration for item in plan)
    with tempfile.TemporaryDirectory(prefix="ai-edit-factory-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        concat_file = temp_dir / "segments.txt"
        segment_paths: list[Path] = []
        for index, item in enumerate(plan):
            segment_path = temp_dir / f"segment_{index:03d}.mp4"
            _render_segment(item, segment_path)
            segment_paths.append(segment_path)

        concat_file.write_text(
            "".join(f"file '{segment_path.as_posix()}'\n" for segment_path in segment_paths),
            encoding="utf-8",
        )
        silent_video = temp_dir / "silent.mp4"
        _run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat_file),
                "-c",
                "copy",
                str(silent_video),
            ]
        )
        _run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(silent_video),
                "-stream_loop",
                "-1",
                "-i",
                str(song_path),
                "-t",
                f"{total_duration:.3f}",
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-shortest",
                str(output_path),
            ]
        )
    return output_path


def generate_edits(
    song_path: str | Path,
    beats: list[float],
    candidates: list[CandidateClip],
    output_dir: str | Path,
    num_edits: int,
    seed: int = 42,
) -> list[Path]:
    """Generate multiple template-based vertical edits."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    rng = random.Random(seed)
    outputs: list[Path] = []
    for index in range(normalize_num_edits(num_edits)):
        template = TEMPLATES[index % len(TEMPLATES)]
        plan = build_edit_plan(template, beats, candidates, rng)
        output_path = output_dir / f"edit_{index + 1:02d}_{template}.mp4"
        print(f"Rendering {output_path} ({template}, {len(plan)} beat cuts)")
        outputs.append(render_edit(plan, song_path, output_path))
    return outputs
