from pathlib import Path

import pytest

from app.api.uploads import sanitize_filename, validate_extension
from app.media.audio import detect_beats
from app.media.scene_detection import fixed_windows
from app.media.scoring import motion_score
from app.media.video import ALLOWED_VIDEO_EXTENSIONS


def test_sanitize_filename_removes_path_and_spaces() -> None:
    assert sanitize_filename("../My Clip!.mp4") == "My_Clip.mp4"


def test_validate_extension_rejects_unknown_type() -> None:
    with pytest.raises(ValueError):
        validate_extension("clip.exe", ALLOWED_VIDEO_EXTENSIONS)


def test_fixed_windows_wrapper(monkeypatch, tmp_path: Path) -> None:
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"not real media")
    monkeypatch.setattr("app.media.scene_detection.probe_duration", lambda path: 5.0)
    clips = fixed_windows(video, 2.0)
    assert [(clip.start, clip.end) for clip in clips] == [(0.0, 2.0), (2.0, 4.0), (4.0, 5.0)]


def test_motion_score_missing_file_returns_zero() -> None:
    assert motion_score("missing.mp4", 0, 1) == 0.0
