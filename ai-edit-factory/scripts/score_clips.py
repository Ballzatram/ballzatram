from __future__ import annotations

from pathlib import Path

import numpy as np

from scripts.models import CandidateClip


def motion_score(video_path: str | Path, start: float, end: float, sample_fps: float = 4.0) -> float:
    """Score a video segment by average frame-difference motion intensity."""
    import cv2

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return 0.0

    original_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_step = max(1, int(original_fps / sample_fps))
    cap.set(cv2.CAP_PROP_POS_MSEC, max(0.0, start) * 1000.0)

    prev_gray = None
    diffs: list[float] = []
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
            gray = cv2.resize(gray, (160, 90))
            if prev_gray is not None:
                diff = np.mean(cv2.absdiff(gray, prev_gray)) / 255.0
                diffs.append(float(diff))
            prev_gray = gray
        frame_index += 1

    cap.release()
    if not diffs:
        return 0.0
    return round(float(np.mean(diffs)), 6)


def score_candidate_clips(candidates: list[CandidateClip]) -> list[CandidateClip]:
    """Return candidates sorted by descending motion score."""
    scored = [clip.with_score(motion_score(clip.path, clip.start, clip.end)) for clip in candidates]
    return sorted(scored, key=lambda clip: clip.score, reverse=True)


if __name__ == "__main__":
    import argparse

    from scripts.detect_scenes import detect_candidate_clips

    parser = argparse.ArgumentParser(description="Score clips by motion intensity.")
    parser.add_argument("clips_dir", help="Folder containing local video clips")
    args = parser.parse_args()

    for clip in score_candidate_clips(detect_candidate_clips(args.clips_dir)):
        print(f"{clip.score:.6f} {clip.path} {clip.start:.3f}-{clip.end:.3f}")
