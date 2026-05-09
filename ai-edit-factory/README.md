# ai-edit-factory

MVP local video-editing automation tool for Ballzatram. It takes a local song and local source clips, detects beats/scenes, scores motion, and renders multiple 1080x1920 vertical MP4 edits synced to beat changes.

## What it does

- Detects beat timestamps from `inputs/song.mp3` with `librosa`.
- Splits local videos in `inputs/clips/` into candidate clips using PySceneDetect, with fixed-window ffmpeg/ffprobe fallback.
- Scores candidate clips by motion intensity using OpenCV frame differences.
- Renders 9:16 vertical videos with ffmpeg using center-crop scaling.
- Overlays the song audio onto each edit.
- Cycles through simple templates: `fast_cut`, `slow_mo`, `high_motion`, and `random_montage`.

## Folder layout

```text
ai-edit-factory/
  inputs/
    song.mp3              # you provide this locally
    clips/                # you provide local video clips here
  outputs/                # generated edits are written here
  scripts/
    detect_beats.py
    detect_scenes.py
    score_clips.py
    generate_edits.py
  app.py
  requirements.txt
```

## Mac setup

Install ffmpeg first:

```bash
brew install ffmpeg
```

Create and activate a Python environment:

```bash
cd ai-edit-factory
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

> `faster-whisper` is included in the stack for future transcript-aware edits. The MVP does not download models or copyrighted content.

## Run the MVP

1. Put your own local song at `inputs/song.mp3`.
2. Put your own local videos in `inputs/clips/`.
3. Run:

```bash
python app.py --song inputs/song.mp3 --clips inputs/clips --num-edits 20
```

Expected output:

```text
Detecting beats: inputs/song.mp3
Detected ... beats
Detecting scenes: inputs/clips
Found ... candidate clips
Scoring clips by motion intensity
Rendering outputs/edit_01_fast_cut.mp4 (...)
...
Done. Generated files:
- outputs/edit_01_fast_cut.mp4
```

The generated vertical MP4 files will be in `outputs/`.

## Template behavior

- `fast_cut`: prioritizes short candidate clips and switches on beats.
- `slow_mo`: uses fewer beat intervals and slows visual clips with ffmpeg `setpts`.
- `high_motion`: uses the highest OpenCV motion-score clips first.
- `random_montage`: shuffles candidates with a repeatable random seed.

## Tests

```bash
cd ai-edit-factory
python -m pytest -q
```

The tests focus on pure planning/filter helpers so they can run without sample media.
