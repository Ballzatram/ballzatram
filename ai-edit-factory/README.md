# ai-edit-factory

Production-ready MVP for Ballzatram that generates 10-30 vertical TikTok-style music edits from rights-approved uploaded or local media. It now also includes an AI clip-making studio where users upload a long source video, describe the desired mood/style, review a structured short-form edit plan, and render a real downloadable vertical MP4 export on the site. The app includes a FastAPI backend, RQ/Redis worker, SQLite persistence, a site-hosted Vite React frontend, Docker Compose, and an independent CLI.

## Legal and compliance guardrails

Use this tool only with media you own, licensed, or have explicit permission to process. Do not use it to rip copyrighted shows, bypass DRM, bypass logins, access private videos, defeat geo-blocks, or violate platform restrictions.

YouTube support is metadata-first. Media downloading is disabled by default. A YouTube URL only stores title/channel/thumbnail metadata unless both are true:

1. the deployment sets `ALLOW_YOUTUBE_DOWNLOADS=true`, and
2. the CLI caller passes `--i-have-rights-to-download`.

## What ships in this MVP

- FastAPI project API for project creation, uploads, YouTube metadata import, generation jobs, and output downloads.
- AI clip-making studio API for rights-confirmed source video uploads, metadata capture, structured edit plans, captions/titles/hashtags, ffmpeg render jobs, and downloadable MP4 exports.
- RQ worker backed by Redis so rendering never blocks the web server, with an in-process FastAPI background fallback when Redis is unavailable during local/manual runs.
- SQLite job/project/output tables with a small DB layer that can be swapped for Postgres later.
- Local-file media pipeline: librosa beat detection, PySceneDetect/fixed-window scene detection, OpenCV clip scoring, ffmpeg rendering.
- Templates: `fast_cut`, `high_motion`, `slow_mo`, `lyric_caption`, `random_montage`, and `retro_tv_filter`.
- Ranked outputs based on clip quality, variety, and template spread.
- Mobile-first React UI served by the API container for uploads, style selection, progress polling, previews, and downloads.
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

Open the site app at <http://localhost:8000>. The API health check is <http://localhost:8000/api/health>. The standalone Vite dev server remains available at <http://localhost:5173> when you run the optional dev profile (`docker compose --profile dev up frontend`) or `npm run dev`.

AI clip studio flow:

1. Open <http://localhost:8000> and create an AI project.
2. Confirm that you own, licensed, or have permission to process the upload.
3. Upload one source video (`mp4`, `mov`, or `webm`). The app shows upload progress, saves duration/dimensions/file type/preview path when `ffprobe` is available, and shows an inline preview.
4. Enter creative direction such as: “Make this a chaotic 20-second TikTok clip with dramatic captions and dark funny energy.”
5. Click **Generate structured edit plan** to review JSON segments, overlays, caption style, music vibe, export notes, and platform packages for TikTok, Instagram Reels, YouTube Shorts, and X.
6. Click **Render MP4 export**. The backend runs ffmpeg against the uploaded source video, crops/exports a vertical short-form MP4 with simple burned-in text overlays, updates render status automatically, and exposes an inline preview plus a download link when the export is ready.

Legacy beat-edit flow (API-compatible):

1. Create a project via the existing project API.
2. Upload a song file (`mp3`, `wav`, `m4a`, `aac`, `flac`, or `ogg`).
3. Upload one or more video clips (`mp4`, `mov`, `m4v`, `avi`, `mkv`, or `webm`).
4. Choose 1-30 outputs and a style template.
5. Click/generate through the legacy API. Generation unlocks only after the uploaded song and at least one uploaded video are saved.
6. Wait for the worker to finish, preview ranked outputs, then download MP4 files.

Legacy beat-edit files are rendered by the backend worker and saved under `outputs/project_<id>/`. AI studio exports are rendered from the site flow and saved under `outputs/studio_project_<id>/`. If Redis is unavailable in a non-Docker local run, the API queues a local background render instead and shows that status in the UI.

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

AI clip studio endpoints:

- `POST /api/studio/projects` creates a studio video project.
- `GET /api/studio/projects/{id}` returns source assets, latest edit plan, render job, exports, and upload limits.
- `POST /api/studio/projects/{id}/video` uploads one rights-confirmed `mp4`, `mov`, or `webm` source video.
- `POST /api/studio/projects/{id}/edit-plans` creates a structured short-form edit plan from a creative prompt.
- `POST /api/studio/projects/{id}/render` creates a pending stub render job and export record.

## Testing

```bash
cd ai-edit-factory
PYTHONPATH=backend python -m pytest -q
```

The test suite covers YouTube URL parsing, beat interval shapes, scene detection wrappers, clip scoring helpers, render planning, upload validation, API project creation, and the studio edit-plan/render-stub workflow. An integration test creates tiny sample media when ffmpeg is available.

## Manual QA checklist

- [ ] `docker compose up --build` starts Redis, the API-hosted site, and the worker.
- [ ] The site app opens at `http://localhost:8000` on a phone-sized viewport without horizontal scrolling.
- [ ] Compliance copy is visible before upload/generation.
- [ ] The AI clip studio requires the rights-confirmation checkbox before source video upload.
- [ ] Upload progress, playable source preview, metadata, structured edit-plan JSON, platform captions/hashtags, and pending render/export state appear in the studio flow.
- [ ] Creating a project succeeds.
- [ ] Invalid upload types are rejected.
- [ ] Uploading one rights-approved song and one rights-approved clip succeeds.
- [ ] YouTube URL import shows metadata and does not download media by default.
- [ ] Clicking generate stays disabled until required uploads exist, then changes job status from queued/running to finished.
- [ ] At least 5 vertical 1080x1920 MP4 outputs are created for suitable input media.
- [ ] Outputs appear best-first in the UI, preview inline, and download.
- [ ] Failed jobs show a useful error instead of spinning forever.
- [ ] `python app.py --song inputs/song.mp3 --clips inputs/clips --num-edits 20` works independently of the web app.

## Deployment notes

- Keep `ALLOW_YOUTUBE_DOWNLOADS=false` unless your production policy explicitly allows rights-gated downloads.
- Put `inputs/`, `outputs/`, and `data/` on persistent storage.
- Use a reverse proxy with HTTPS and larger body-size limits matching `MAX_UPLOAD_MB`.
- Run at least one API container and one worker container; scale workers for render throughput. The API image includes the built frontend, so a production deployment can expose the API container as the site.
- SQLite is acceptable for MVP/single-node use. For Postgres, replace the small functions in `backend/app/db.py` with an equivalent connection layer while preserving table semantics.
- Add scheduled cleanup for stale uploaded inputs and old outputs based on your retention policy.
