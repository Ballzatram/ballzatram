from pathlib import Path

from scripts.detect_beats import beat_intervals
from scripts.generate_edits import build_edit_plan, normalize_num_edits, select_clips, vertical_crop_filter
from scripts.models import CandidateClip


def _candidates() -> list[CandidateClip]:
    return [
        CandidateClip(Path("a.mp4"), 0.0, 2.0, 0.1),
        CandidateClip(Path("b.mp4"), 1.0, 4.0, 0.9),
        CandidateClip(Path("c.mp4"), 0.0, 1.0, 0.4),
    ]


def test_beat_intervals_skips_tiny_intervals() -> None:
    assert beat_intervals([0.0, 0.1, 0.5, 1.0]) == [(0.1, 0.5), (0.5, 1.0)]


def test_vertical_crop_filter_contains_9x16_crop() -> None:
    ffmpeg_filter = vertical_crop_filter(speed=1.25)
    assert "scale=1080:1920" in ffmpeg_filter
    assert "crop=1080:1920" in ffmpeg_filter
    assert "setpts=1.250000*PTS" in ffmpeg_filter


def test_high_motion_selects_highest_scores_first() -> None:
    selected = select_clips("high_motion", _candidates(), count=2, rng=__import__("random").Random(1))
    assert [clip.path.name for clip in selected] == ["b.mp4", "c.mp4"]


def test_build_edit_plan_uses_beat_durations() -> None:
    plan = build_edit_plan("fast_cut", [0.0, 0.5, 1.0], _candidates(), rng=__import__("random").Random(1))
    assert len(plan) == 2
    assert [item.duration for item in plan] == [0.5, 0.5]


def test_normalize_num_edits_caps_at_twenty() -> None:
    assert normalize_num_edits(25) == 20
    assert normalize_num_edits(0) == 1
