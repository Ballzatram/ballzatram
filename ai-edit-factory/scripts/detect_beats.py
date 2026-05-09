from __future__ import annotations

from pathlib import Path


def detect_beats(song_path: str | Path, max_beats: int | None = None) -> list[float]:
    """Return beat timestamps in seconds for a local song file using librosa."""
    song_path = Path(song_path)
    if not song_path.exists():
        raise FileNotFoundError(f"Song file not found: {song_path}")

    import librosa

    y, sr = librosa.load(str(song_path), sr=None, mono=True)
    _tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    beats = [round(float(t), 3) for t in beat_times if float(t) >= 0]
    if max_beats is not None:
        return beats[:max_beats]
    return beats


def beat_intervals(beats: list[float], min_duration: float = 0.25, max_duration: float = 3.0) -> list[tuple[float, float]]:
    """Convert beat timestamps into usable edit intervals."""
    intervals: list[tuple[float, float]] = []
    for start, end in zip(beats, beats[1:]):
        duration = end - start
        if duration < min_duration:
            continue
        intervals.append((start, min(end, start + max_duration)))
    return intervals


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Detect beat timestamps in a song.")
    parser.add_argument("song", help="Path to a local song file")
    parser.add_argument("--max-beats", type=int, default=20)
    args = parser.parse_args()

    for beat in detect_beats(args.song, max_beats=args.max_beats):
        print(beat)
