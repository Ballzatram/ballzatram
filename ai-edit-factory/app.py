from __future__ import annotations

import argparse
from pathlib import Path

from scripts.detect_beats import detect_beats
from scripts.detect_scenes import detect_candidate_clips
from scripts.generate_edits import generate_edits
from scripts.score_clips import score_candidate_clips


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate beat-synced vertical TikTok-style edits from local media.")
    parser.add_argument("--song", default="inputs/song.mp3", help="Path to a local song file")
    parser.add_argument("--clips", default="inputs/clips", help="Folder of local video clips")
    parser.add_argument("--outputs", default="outputs", help="Folder for generated mp4 edits")
    parser.add_argument("--num-edits", type=int, default=10, help="Number of edits to render (max 20)")
    parser.add_argument("--max-beats", type=int, default=80, help="Maximum beats to use per run")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for repeatable random_montage edits")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    song_path = Path(args.song)
    clips_dir = Path(args.clips)
    output_dir = Path(args.outputs)

    print(f"Detecting beats: {song_path}")
    beats = detect_beats(song_path, max_beats=args.max_beats)
    print(f"Detected {len(beats)} beats")

    print(f"Detecting scenes: {clips_dir}")
    candidates = detect_candidate_clips(clips_dir)
    print(f"Found {len(candidates)} candidate clips")

    print("Scoring clips by motion intensity")
    scored_candidates = score_candidate_clips(candidates)

    outputs = generate_edits(
        song_path=song_path,
        beats=beats,
        candidates=scored_candidates,
        output_dir=output_dir,
        num_edits=args.num_edits,
        seed=args.seed,
    )
    print("Done. Generated files:")
    for output in outputs:
        print(f"- {output}")


if __name__ == "__main__":
    main()
