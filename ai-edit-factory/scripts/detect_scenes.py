from __future__ import annotations

import json
import subprocess
from pathlib import Path

from scripts.models import CandidateClip

VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}


def find_video_files(clips_dir: str | Path) -> list[Path]:
    clips_dir = Path(clips_dir)
    if not clips_dir.exists():
        raise FileNotFoundError(f"Clips folder not found: {clips_dir}")
    return sorted(path for path in clips_dir.iterdir() if path.suffix.lower() in VIDEO_EXTENSIONS and path.is_file())


def probe_duration(video_path: str | Path) -> float:
    """Return video duration in seconds using ffprobe."""
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(video_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    data = json.loads(result.stdout)
    return float(data["format"]["duration"])


def _fixed_windows(video_path: Path, window_seconds: float) -> list[CandidateClip]:
    duration = probe_duration(video_path)
    clips: list[CandidateClip] = []
    start = 0.0
    while start < duration:
        end = min(duration, start + window_seconds)
        if end - start >= 0.5:
            clips.append(CandidateClip(path=video_path, start=round(start, 3), end=round(end, 3)))
        start = end
    return clips


def _scenedetect_windows(video_path: Path, min_scene_seconds: float) -> list[CandidateClip]:
    from scenedetect import SceneManager, VideoManager
    from scenedetect.detectors import ContentDetector

    video_manager = VideoManager([str(video_path)])
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector())
    try:
        video_manager.start()
        scene_manager.detect_scenes(frame_source=video_manager)
        scene_list = scene_manager.get_scene_list()
    finally:
        video_manager.release()

    clips: list[CandidateClip] = []
    for start_time, end_time in scene_list:
        start = start_time.get_seconds()
        end = end_time.get_seconds()
        if end - start >= min_scene_seconds:
            clips.append(CandidateClip(path=video_path, start=round(start, 3), end=round(end, 3)))
    return clips


def detect_candidate_clips(
    clips_dir: str | Path,
    min_scene_seconds: float = 0.75,
    fallback_window_seconds: float = 2.0,
) -> list[CandidateClip]:
    """Split local input videos into short candidate clips.

    PySceneDetect is attempted first. If a file yields no scenes, fixed windows based on
    ffprobe duration keep the MVP pipeline usable on simple footage.
    """
    candidates: list[CandidateClip] = []
    for video_path in find_video_files(clips_dir):
        scenes: list[CandidateClip] = []
        try:
            scenes = _scenedetect_windows(video_path, min_scene_seconds)
        except Exception as exc:  # noqa: BLE001 - fallback is intentional for MVP robustness.
            print(f"PySceneDetect skipped for {video_path.name}: {exc}")
        if not scenes:
            scenes = _fixed_windows(video_path, fallback_window_seconds)
        candidates.extend(scenes)
    return candidates


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Detect candidate scenes from a clips folder.")
    parser.add_argument("clips_dir", help="Folder containing local video clips")
    args = parser.parse_args()

    for clip in detect_candidate_clips(args.clips_dir):
        print(f"{clip.path} {clip.start:.3f} {clip.end:.3f}")
