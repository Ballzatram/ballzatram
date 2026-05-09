# ai-edit-factory

Production-ready MVP for Ballzatram that generates 10-30 vertical TikTok-style music edits from rights-approved local media. It includes a FastAPI backend, RQ/Redis worker, SQLite persistence, Vite React frontend, Docker Compose, and an independent CLI.

## Legal and compliance guardrails

Use this tool only with media you own, licensed, or have explicit permission to process. Do not use it to rip copyrighted shows, bypass DRM, bypass logins, access private videos, defeat geo-blocks, or violate platform restrictions.

YouTube support is metadata-first. Media downloading is disabled by default. A YouTube URL only stores title/channel/thumbnail metadata unless both are true:

1. the deployment sets `ALLOW_YOUTUBE_DOWNLOADS=true`, and
2. the CLI caller passes `--i-have-rights-to-download`.

## What ships in this MVP

- FastAPI project API for project creation, uploads, YouTube metadata import, generation jobs, and output downloads.
- RQ worker backed by Redis so rendering never blocks the web server.
- SQLite job/project/output tables with a small DB layer that can be swapped for Postgres later.
- Local-file media pipeline: librosa beat detection, PySceneDetect/fixed-window scene detection, OpenCV clip scoring, ffmpeg rendering.
- Templates: `fast_cut`, `high_motion`, `slow_mo`, `lyric_caption`, `random_montage`, and `retro_tv_filter`.
- Ranked outputs based on clip quality, variety, and template spread.
- Mobile-first React UI for uploads, style selection, progress polling, previews, and downloads.
- CLI for local batch generation.

## Repo layout

```text
ai-edit-factory/
  backend/app/
    main.py              # FastAPI app
    db.py                # SQLite persistence
    jobs.py              # RQ enqueue/process functions
    api/                 # project, job, output, upload routes/helpers
    media/               # youtube, audio, video, scene detection, scoring, rendering, templates
  frontend/              # Vite React mobile-first UI
  worker/worker.py       # RQ worker entrypoint
  inputs/                # local inputs and uploaded files
  outputs/               # generated MP4s
  app.py                 # independent CLI
  docker-compose.yml
  .env.example
```

## Run with Docker Compose

Prerequisites: Docker Desktop or Docker Engine.

```bash
cd ai-edit-factory
docker compose up --build
```

Open the frontend at <http://localhost:5173>. The API health check is <http://localhost:8000/api/health>.

Day-1 flow:

1. Create a project.
2. Upload a song file (`mp3`, `wav`, `m4a`, `aac`, `flac`, or `ogg`).
3. Upload one or more video clips (`mp4`, `mov`, `m4v`, `avi`, `mkv`, or `webm`).
4. Choose 1-30 outputs and a style template.
5. Click **Generate edits**.
6. Wait for the worker to finish, preview ranked outputs, then download MP4 files.

Generated files are saved under `outputs/project_<id>/`.

## Local CLI setup

Install ffmpeg first. On macOS:

```bash
brew install ffmpeg
```

Create a Python environment:

```bash
cd ai-edit-factory
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Run local-file generation:

```bash
python app.py --song inputs/song.mp3 --clips inputs/clips --num-edits 20
```

Run with one specific style:

```bash
python app.py --song inputs/song.mp3 --clips inputs/clips --num-edits 10 --style-template high_motion
```

YouTube metadata-only example:

```bash
python app.py --song-youtube-url URL --video-youtube-url URL --num-edits 20
```

Rights-gated YouTube download example. Only use this when you own, licensed, or have permission to download/process the media, and only in deployments where `ALLOW_YOUTUBE_DOWNLOADS=true`:

```bash
ALLOW_YOUTUBE_DOWNLOADS=true python app.py --song-youtube-url URL --video-youtube-url URL --i-have-rights-to-download --num-edits 20
```

## API basics

- `POST /api/projects` creates a project.
- `POST /api/projects/{id}/song` uploads one song.
- `POST /api/projects/{id}/videos` uploads one or more clips.
- `POST /api/projects/{id}/youtube` fetches and stores YouTube metadata only.
- `POST /api/projects/{id}/generate` enqueues an RQ render job.
- `GET /api/projects/{id}` returns assets, latest job status, and ranked outputs.
- `GET /api/outputs/{id}/download` downloads a generated MP4.

## Testing

```bash
cd ai-edit-factory
PYTHONPATH=backend python -m pytest -q
```

The test suite covers YouTube URL parsing, beat interval shapes, scene detection wrappers, clip scoring helpers, render planning, upload validation, and API project creation. An integration test creates tiny sample media when ffmpeg is available.

## Manual QA checklist

- [ ] `docker compose up --build` starts Redis, API, worker, and frontend.
- [ ] Frontend opens on a phone-sized viewport without horizontal scrolling.
- [ ] Compliance copy is visible before upload/generation.
- [ ] Creating a project succeeds.
- [ ] Invalid upload types are rejected.
- [ ] Uploading one rights-approved song and one rights-approved clip succeeds.
- [ ] YouTube URL import shows metadata and does not download media by default.
- [ ] Clicking generate changes job status from queued/running to finished.
- [ ] At least 5 vertical 1080x1920 MP4 outputs are created for suitable input media.
- [ ] Outputs appear best-first in the UI, preview inline, and download.
- [ ] Failed jobs show a useful error instead of spinning forever.
- [ ] `python app.py --song inputs/song.mp3 --clips inputs/clips --num-edits 20` works independently of the web app.

## Deployment notes

- Keep `ALLOW_YOUTUBE_DOWNLOADS=false` unless your production policy explicitly allows rights-gated downloads.
- Put `inputs/`, `outputs/`, and `data/` on persistent storage.
- Use a reverse proxy with HTTPS and larger body-size limits matching `MAX_UPLOAD_MB`.
- Run at least one API container and one worker container; scale workers for render throughput.
- SQLite is acceptable for MVP/single-node use. For Postgres, replace the small functions in `backend/app/db.py` with an equivalent connection layer while preserving table semantics.
- Add scheduled cleanup for stale uploaded inputs and old outputs based on your retention policy.
