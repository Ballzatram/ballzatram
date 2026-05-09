from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from app.media.audio import detect_beats  # noqa: E402
from app.media.rendering import TEMPLATES, generate_edits, normalize_num_edits  # noqa: E402
from app.media.scene_detection import detect_candidate_clips  # noqa: E402
from app.media.scoring import score_candidate_clips  # noqa: E402
from app.media.templates import normalize_template  # noqa: E402
from app.media.youtube import download_youtube_media, fetch_youtube_metadata  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate beat-synced vertical TikTok-style edits from rights-approved media.")
    parser.add_argument("--song", default="inputs/song.mp3", help="Path to a local song file")
    parser.add_argument("--clips", default="inputs/clips", help="Folder of local video clips")
    parser.add_argument("--song-youtube-url", help="Rights-approved YouTube song URL. Metadata only unless rights flag is present.")
    parser.add_argument("--video-youtube-url", help="Rights-approved YouTube video URL. Metadata only unless rights flag is present.")
    parser.add_argument("--i-have-rights-to-download", action="store_true", help="Explicitly confirm you own/license/have permission to download/process the YouTube media.")
    parser.add_argument("--outputs", default="outputs", help="Folder for generated mp4 edits")
    parser.add_argument("--num-edits", type=int, default=10, help="Number of edits to render (1-30)")
    parser.add_argument("--style-template", default="all", choices=["all", *TEMPLATES], help="Render one style or cycle all styles")
    parser.add_argument("--max-beats", type=int, default=90, help="Maximum beats to use per run")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for repeatable random_montage edits")
    return parser.parse_args()


def resolve_inputs(args: argparse.Namespace) -> tuple[Path, Path]:
    song_path = Path(args.song)
    clips_dir = Path(args.clips)
    if args.song_youtube_url:
        metadata = fetch_youtube_metadata(args.song_youtube_url)
        print(f"YouTube song metadata: {metadata.title or metadata.video_id} — {metadata.channel}")
        if args.i_have_rights_to_download:
            song_path = download_youtube_media(args.song_youtube_url, ROOT / "inputs" / "youtube_song", True)
        else:
            print("YouTube song download skipped. Pass --i-have-rights-to-download only for media you own/license/have permission to use.")
    if args.video_youtube_url:
        metadata = fetch_youtube_metadata(args.video_youtube_url)
        print(f"YouTube video metadata: {metadata.title or metadata.video_id} — {metadata.channel}")
        if args.i_have_rights_to_download:
            video_path = download_youtube_media(args.video_youtube_url, ROOT / "inputs" / "clips", True)
            clips_dir = video_path.parent
        else:
            print("YouTube video download skipped. Pass --i-have-rights-to-download only for media you own/license/have permission to use.")
    return song_path, clips_dir


def main() -> None:
    args = parse_args()
    style = args.style_template if args.style_template == "all" else normalize_template(args.style_template)
    song_path, clips_dir = resolve_inputs(args)
    output_dir = Path(args.outputs)

    print(f"Detecting beats: {song_path}")
    beats = detect_beats(song_path, max_beats=args.max_beats)
    print(f"Detected {len(beats)} beats")

    print(f"Detecting scenes: {clips_dir}")
    candidates = detect_candidate_clips(clips_dir)
    print(f"Found {len(candidates)} candidate clips")

    print("Scoring clips by motion, sharpness, and brightness")
    scored_candidates = score_candidate_clips(candidates)

    outputs = generate_edits(
        song_path=song_path,
        beats=beats,
        candidates=scored_candidates,
        output_dir=output_dir,
        num_edits=normalize_num_edits(args.num_edits),
        template=style,
        seed=args.seed,
    )
    print("Done. Generated files ranked best-first:")
    for output in outputs:
        print(f"- {output.path} score={output.score:.3f} template={output.template}")


if __name__ == "__main__":
    main()
