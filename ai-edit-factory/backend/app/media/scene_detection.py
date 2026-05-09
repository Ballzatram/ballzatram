from __future__ import annotations

from pathlib import Path

from app.media.video import find_video_files, probe_duration
from app.models import CandidateClip


def fixed_windows(video_path: Path, window_seconds: float) -> list[CandidateClip]:
    duration = probe_duration(video_path)
    clips: list[CandidateClip] = []
    start = 0.0
    while start < duration:
        end = min(duration, start + window_seconds)
        if end - start >= 0.45:
            clips.append(CandidateClip(video_path, round(start, 3), round(end, 3)))
        start = end
    return clips


def scenedetect_windows(video_path: Path, min_scene_seconds: float) -> list[CandidateClip]:
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
            clips.append(CandidateClip(video_path, round(start, 3), round(end, 3)))
    return clips


def detect_candidate_clips(clips_dir: str | Path, min_scene_seconds: float = 0.75, fallback_window_seconds: float = 2.0) -> list[CandidateClip]:
    candidates: list[CandidateClip] = []
    for video_path in find_video_files(clips_dir):
        scenes: list[CandidateClip] = []
        try:
            scenes = scenedetect_windows(video_path, min_scene_seconds)
        except Exception as exc:  # noqa: BLE001 - fixed-window fallback keeps local MVP robust.
            print(f"PySceneDetect skipped for {video_path.name}: {exc}")
        candidates.extend(scenes or fixed_windows(video_path, fallback_window_seconds))
    return candidates
