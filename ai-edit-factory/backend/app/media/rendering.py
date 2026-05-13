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


def _escape_drawtext(text: object) -> str:
    value = str(text or "").replace("\\", "\\\\")
    return value.replace(":", "\\:").replace("'", "\\'").replace("%", "\\%")[:120]


def _studio_drawtext_filters(overlays: list[dict], timeline_start: float, timeline_end: float) -> list[str]:
    filters: list[str] = []
    for overlay in overlays:
        try:
            time_at = float(overlay.get("time", 0))
        except (TypeError, ValueError):
            continue
        if not (timeline_start <= time_at < timeline_end):
            continue
        local_start = max(0.0, time_at - timeline_start)
        local_end = min(timeline_end - timeline_start, local_start + 2.2)
        text = _escape_drawtext(overlay.get("text", ""))
        if not text:
            continue
        y_expr = "h*0.18" if overlay.get("style") == "bold_center" else "h*0.76"
        filters.append(
            "drawtext="
            f"text='{text}':x=(w-text_w)/2:y={y_expr}:fontsize=64:"
            "fontcolor=white:borderw=5:bordercolor=black:"
            "box=1:boxcolor=black@0.35:boxborderw=18:"
            f"enable='between(t,{local_start:.3f},{local_end:.3f})'"
        )
    return filters


def _studio_segment_filter(width: int, height: int, overlays: list[dict], timeline_start: float, timeline_end: float) -> str:
    filters = [
        f"scale={width}:{height}:force_original_aspect_ratio=increase",
        f"crop={width}:{height}",
        "setsar=1",
        "fps=30",
        "eq=contrast=1.06:saturation=1.08",
    ]
    filters.extend(_studio_drawtext_filters(overlays, timeline_start, timeline_end))
    filters.append("format=yuv420p")
    return ",".join(filters)


def _source_asset_id(value: object) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _safe_segments(plan: dict, source_duration: float | None, source_durations: dict[int, float] | None = None) -> list[dict]:
    default_source_max = max(0.1, float(source_duration or plan.get("duration_seconds") or 20))
    raw_segments = plan.get("segments") or []
    segments: list[dict] = []
    for item in raw_segments:
        source_asset_id = _source_asset_id(item.get("source_asset_id"))
        source_max = max(0.1, float((source_durations or {}).get(source_asset_id, default_source_max)))
        try:
            start = max(0.0, min(float(item.get("source_start", 0)), source_max - 0.1))
            end = max(start + 0.1, min(float(item.get("source_end", start + 3)), source_max))
        except (TypeError, ValueError):
            continue
        if end > start:
            segment = {"source_start": start, "source_end": end}
            if source_asset_id is not None:
                segment["source_asset_id"] = source_asset_id
            if item.get("source_filename"):
                segment["source_filename"] = str(item.get("source_filename"))
            if item.get("reason"):
                segment["reason"] = str(item.get("reason"))
            segments.append(segment)
    if not segments:
        duration = max(1.0, min(float(plan.get("duration_seconds") or 20), default_source_max))
        segments.append({"source_start": 0.0, "source_end": duration})
    return segments[:24]


def render_studio_edit(source_path: str | Path, plan: dict, output_path: str | Path, source_duration: float | None = None, music_path: str | Path | None = None, source_assets: list[dict] | None = None) -> Path:
    """Render a site-generated AI edit plan into a real vertical MP4.

    When a rights-cleared music upload is provided, it becomes the export audio bed.
    Otherwise the source video audio is preserved where available.
    """
    ensure_ffmpeg()
    source_path = Path(source_path)
    if not source_path.exists():
        raise FileNotFoundError(f"Uploaded source video is missing on disk: {source_path}")
    source_lookup: dict[int, tuple[Path, float | None]] = {}
    for asset in source_assets or []:
        asset_id = _source_asset_id(asset.get("id"))
        asset_path = Path(str(asset.get("path") or ""))
        if asset_id is None or not asset_path.exists():
            continue
        source_lookup[asset_id] = (asset_path, asset.get("duration"))
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    music = Path(music_path) if music_path else None
    if music and not music.exists():
        raise FileNotFoundError(f"Uploaded music file is missing on disk: {music}")
    aspect = str(plan.get("aspect_ratio") or "9:16")
    width, height = (1080, 1920) if aspect != "4:5" else (1080, 1350)
    overlays = plan.get("text_overlays") or []
    source_durations = {asset_id: duration for asset_id, (_, duration) in source_lookup.items() if duration}
    segments = _safe_segments(plan, source_duration, source_durations)
    mute_segment_audio = bool(music) or len(source_lookup) > 1
    with tempfile.TemporaryDirectory(prefix="ai-edit-studio-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        segment_paths: list[Path] = []
        timeline = 0.0
        for index, segment in enumerate(segments):
            start = segment["source_start"]
            duration = max(0.1, segment["source_end"] - start)
            segment_source_path = source_lookup.get(_source_asset_id(segment.get("source_asset_id")), (source_path, source_duration))[0]
            segment_path = temp_dir / f"studio_segment_{index:03d}.mp4"
            command = [
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-ss", f"{start:.3f}", "-t", f"{duration:.3f}", "-i", str(segment_source_path),
                "-map", "0:v:0",
            ]
            if mute_segment_audio:
                command.append("-an")
            else:
                command.extend(["-map", "0:a?"])
            command.extend([
                "-vf", _studio_segment_filter(width, height, overlays, timeline, timeline + duration),
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            ])
            if not mute_segment_audio:
                command.extend(["-c:a", "aac", "-b:a", "160k", "-ar", "44100"])
            command.extend(["-movflags", "+faststart", str(segment_path)])
            _run(command)
            segment_paths.append(segment_path)
            timeline += duration
        concat_file = temp_dir / "segments.txt"
        concat_file.write_text("".join(f"file '{path.as_posix()}'\n" for path in segment_paths), encoding="utf-8")
        if music:
            stitched_path = temp_dir / "stitched_video.mp4"
            _run([
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-f", "concat", "-safe", "0", "-i", str(concat_file),
                "-c", "copy", "-movflags", "+faststart", str(stitched_path),
            ])
            _run([
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-stream_loop", "-1", "-i", str(music), "-i", str(stitched_path),
                "-map", "1:v:0", "-map", "0:a:0",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
                "-shortest", "-movflags", "+faststart", str(output_path),
            ])
        elif mute_segment_audio:
            stitched_path = temp_dir / "stitched_video.mp4"
            _run([
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-f", "concat", "-safe", "0", "-i", str(concat_file),
                "-c", "copy", "-movflags", "+faststart", str(stitched_path),
            ])
            _run([
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-i", str(stitched_path), "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                "-map", "0:v:0", "-map", "1:a:0",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
                "-shortest", "-movflags", "+faststart", str(output_path),
            ])
        else:
            _run([
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-f", "concat", "-safe", "0", "-i", str(concat_file),
                "-c", "copy", "-movflags", "+faststart", str(output_path),
            ])
    return output_path
