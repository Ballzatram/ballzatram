from __future__ import annotations

from pathlib import Path

import numpy as np

from app.models import CandidateClip


def clip_metrics(video_path: str | Path, start: float, end: float, sample_fps: float = 4.0) -> tuple[float, float, float]:
    try:
        import cv2
    except ModuleNotFoundError:
        return 0.0, 0.0, 0.0

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return 0.0, 0.0, 0.0
    original_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_step = max(1, int(original_fps / sample_fps))
    cap.set(cv2.CAP_PROP_POS_MSEC, max(0.0, start) * 1000.0)
    prev_gray = None
    motions: list[float] = []
    brightness_values: list[float] = []
    sharpness_values: list[float] = []
    frame_index = 0
    while True:
        current_time = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
        if current_time > end:
            break
        ok, frame = cap.read()
        if not ok:
            break
        if frame_index % frame_step == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            small = cv2.resize(gray, (160, 90))
            brightness_values.append(float(np.mean(small)) / 255.0)
            sharpness_values.append(min(1.0, float(cv2.Laplacian(small, cv2.CV_64F).var()) / 1000.0))
            if prev_gray is not None:
                motions.append(float(np.mean(cv2.absdiff(small, prev_gray))) / 255.0)
            prev_gray = small
        frame_index += 1
    cap.release()
    motion = float(np.mean(motions)) if motions else 0.0
    brightness = float(np.mean(brightness_values)) if brightness_values else 0.0
    sharpness = float(np.mean(sharpness_values)) if sharpness_values else 0.0
    quality = 0.55 * motion + 0.25 * sharpness + 0.20 * (1.0 - abs(brightness - 0.55))
    return round(quality, 6), round(brightness, 6), round(sharpness, 6)


def motion_score(video_path: str | Path, start: float, end: float, sample_fps: float = 4.0) -> float:
    return clip_metrics(video_path, start, end, sample_fps)[0]


def score_candidate_clips(candidates: list[CandidateClip]) -> list[CandidateClip]:
    scored = []
    for clip in candidates:
        score, brightness, sharpness = clip_metrics(clip.path, clip.start, clip.end)
        scored.append(clip.with_scores(score, brightness, sharpness))
    return sorted(scored, key=lambda clip: clip.score, reverse=True)
