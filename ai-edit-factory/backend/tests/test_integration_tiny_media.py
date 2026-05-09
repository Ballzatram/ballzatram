from pathlib import Path
import shutil
import subprocess

import pytest

pytest.importorskip("librosa")
pytest.importorskip("cv2")

from app.media.audio import detect_beats
from app.media.rendering import generate_edits
from app.media.scene_detection import detect_candidate_clips
from app.media.scoring import score_candidate_clips


@pytest.mark.skipif(shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None, reason="ffmpeg not installed")
def test_tiny_media_pipeline_generates_mp4(tmp_path: Path) -> None:
    song = tmp_path / "song.wav"
    clips_dir = tmp_path / "clips"
    clips_dir.mkdir()
    clip = clips_dir / "clip.mp4"
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=880:duration=3", str(song)], check=True)
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=duration=3:size=320x568:rate=24", "-pix_fmt", "yuv420p", str(clip)], check=True)
    beats = detect_beats(song, max_beats=8)
    candidates = score_candidate_clips(detect_candidate_clips(clips_dir, fallback_window_seconds=1.0))
    outputs = generate_edits(song, beats, candidates, tmp_path / "outputs", num_edits=1, template="fast_cut")
    assert outputs[0].path.exists()
    assert outputs[0].path.suffix == ".mp4"
