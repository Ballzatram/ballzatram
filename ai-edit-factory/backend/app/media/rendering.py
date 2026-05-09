from __future__ import annotations

import random
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from app.media.audio import beat_intervals
from app.media.templates import TEMPLATES, normalize_template
from app.models import CandidateClip, GeneratedOutput


@dataclass(frozen=True)
class EditPlanItem:
    clip: CandidateClip
    duration: float
    speed: float = 1.0
    zoom: bool = False


def ensure_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise RuntimeError("ffmpeg and ffprobe must be installed and available on PATH.")


def normalize_num_edits(num_edits: int) -> int:
    return max(1, min(30, int(num_edits)))


def vertical_crop_filter(width: int = 1080, height: int = 1920, speed: float = 1.0, template: str = "fast_cut", zoom: bool = False) -> str:
    parts = [
        f"scale={width}:{height}:force_original_aspect_ratio=increase",
        f"crop={width}:{height}",
        "setsar=1",
    ]
    if zoom:
        parts.append("scale=iw*1.06:ih*1.06")
        parts.append(f"crop={width}:{height}")
    if template == "retro_tv_filter":
        parts.extend(["eq=contrast=1.22:saturation=0.72:brightness=-0.025", "noise=alls=18:allf=t", "vignette=PI/4"])
    if template == "lyric_caption":
        parts.append("drawtext=text='AI EDIT FACTORY':x=(w-text_w)/2:y=h*0.82:fontsize=64:fontcolor=white:box=1:boxcolor=black@0.55")
    parts.append("format=yuv420p")
    if speed != 1.0:
        parts.append(f"setpts={speed:.6f}*PTS")
    return ",".join(parts)


def select_clips(template: str, candidates: list[CandidateClip], count: int, rng: random.Random) -> list[CandidateClip]:
    if not candidates:
        raise ValueError("No candidate clips found. Upload videos or add files to inputs/clips/.")
    template = normalize_template(template)
    if template == "high_motion":
        pool = sorted(candidates, key=lambda clip: clip.score, reverse=True)
    elif template == "random_montage":
        pool = candidates[:]
        rng.shuffle(pool)
    elif template == "slow_mo":
        pool = sorted(candidates, key=lambda clip: (clip.score, clip.duration), reverse=True)
    elif template == "fast_cut":
        pool = sorted(candidates, key=lambda clip: clip.duration)
    else:
        pool = sorted(candidates, key=lambda clip: (clip.brightness, clip.sharpness, clip.score), reverse=True)
    return [pool[index % len(pool)] for index in range(count)]


def build_edit_plan(template: str, beats: list[float], candidates: list[CandidateClip], rng: random.Random, max_segments: int = 24) -> list[EditPlanItem]:
    template = normalize_template(template)
    intervals = beat_intervals(beats)
    if template == "slow_mo":
        intervals = intervals[::2] or intervals
    if template == "fast_cut":
        intervals = intervals[: min(len(intervals), 18)]
    if not intervals:
        raise ValueError("Not enough beat timestamps detected to build an edit.")
    intervals = intervals[:max_segments]
    selected = select_clips(template, candidates, len(intervals), rng)
    speed = 1.35 if template == "slow_mo" else 1.0
    return [EditPlanItem(clip=clip, duration=end - start, speed=speed, zoom=(idx % 3 == 0)) for idx, (clip, (start, end)) in enumerate(zip(selected, intervals))]


def _run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def _render_segment(item: EditPlanItem, segment_path: Path, template: str) -> None:
    source_duration = min(item.clip.duration, item.duration / item.speed)
    if source_duration <= 0:
        raise ValueError(f"Invalid clip duration for {item.clip}")
    _run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-ss", f"{item.clip.start:.3f}", "-t", f"{source_duration:.3f}", "-i", str(item.clip.path),
        "-an", "-vf", vertical_crop_filter(speed=item.speed, template=template, zoom=item.zoom),
        "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", str(segment_path),
    ])


def render_edit(plan: list[EditPlanItem], song_path: str | Path, output_path: str | Path, template: str) -> Path:
    ensure_ffmpeg()
    song_path = Path(song_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    total_duration = sum(item.duration for item in plan)
    with tempfile.TemporaryDirectory(prefix="ai-edit-factory-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        segment_paths: list[Path] = []
        for index, item in enumerate(plan):
            segment_path = temp_dir / f"segment_{index:03d}.mp4"
            _render_segment(item, segment_path, template)
            segment_paths.append(segment_path)
        concat_file = temp_dir / "segments.txt"
        concat_file.write_text("".join(f"file '{path.as_posix()}'\n" for path in segment_paths), encoding="utf-8")
        silent_video = temp_dir / "silent.mp4"
        _run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(silent_video)])
        _run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(silent_video), "-stream_loop", "-1", "-i", str(song_path), "-t", f"{total_duration:.3f}",
            "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", str(output_path),
        ])
    return output_path


def edit_score(plan: list[EditPlanItem], template_index: int) -> float:
    if not plan:
        return 0.0
    quality = sum(item.clip.score for item in plan) / len(plan)
    variety = len({str(item.clip.path) for item in plan}) / len(plan)
    return round((quality * 0.75) + (variety * 0.20) + ((template_index % len(TEMPLATES)) * 0.005), 6)


def generate_edits(song_path: str | Path, beats: list[float], candidates: list[CandidateClip], output_dir: str | Path, num_edits: int, template: str = "fast_cut", seed: int = 42, progress: callable | None = None) -> list[GeneratedOutput]:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    rng = random.Random(seed)
    requested = normalize_num_edits(num_edits)
    templates = list(TEMPLATES) if template == "all" else [normalize_template(template)]
    outputs: list[GeneratedOutput] = []
    for index in range(requested):
        current_template = templates[index % len(templates)]
        plan = build_edit_plan(current_template, beats, candidates, rng)
        output_path = output_dir / f"edit_{index + 1:02d}_{current_template}.mp4"
        if progress:
            progress(index, requested, f"Rendering {output_path.name}")
        print(f"Rendering {output_path} ({current_template}, {len(plan)} beat cuts)")
        render_edit(plan, song_path, output_path, current_template)
        outputs.append(GeneratedOutput(output_path, current_template, edit_score(plan, index)))
    return sorted(outputs, key=lambda item: item.score, reverse=True)
