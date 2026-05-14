# ai-edit-factory

Production-ready MVP for Ballzatram that generates 10-30 vertical TikTok-style music edits from rights-approved uploaded or local media. It now also includes a native one-stop AI edit factory where users create a project, upload one or more source videos, optionally upload a rights-cleared music bed, choose the type of clips to make, enable music/captions/hashtags, review a structured short-form recipe, and render a real downloadable vertical MP4 export on the site. The app includes a FastAPI backend, RQ/Redis worker, SQLite persistence, a site-hosted Vite React frontend, Docker Compose, and an independent CLI.

## Legal and compliance guardrails

Use this tool only with media you own, licensed, or have explicit permission to process. Do not use it to rip copyrighted shows, bypass DRM, bypass logins, access private videos, defeat geo-blocks, or violate platform restrictions.

YouTube support is metadata-first. Media downloading is disabled by default. A YouTube URL only stores title/channel/thumbnail metadata unless both are true:

1. the deployment sets `ALLOW_YOUTUBE_DOWNLOADS=true`, and
2. the CLI caller passes `--i-have-rights-to-download`.

## What ships in this MVP

- FastAPI project API for project creation, uploads, YouTube metadata import, generation jobs, and output downloads.
- AI edit factory API for rights-confirmed source video uploads, optional music uploads, metadata capture, structured edit recipes, captions/titles/hashtags, ffmpeg render jobs, and downloadable MP4 exports.
- RQ worker backed by Redis so rendering never blocks the web server, with an in-process FastAPI background fallback when Redis is unavailable during local/manual runs.
- SQLite job/project/output tables with a small DB layer that can be swapped for Postgres later.
- Local-file media pipeline: librosa beat detection, PySceneDetect/fixed-window scene detection, OpenCV clip scoring, ffmpeg rendering.
- Templates: `fast_cut`, `high_motion`, `slow_mo`, `lyric_caption`, `random_montage`, and `retro_tv_filter`.
- Ranked outputs based on clip quality, variety, and template spread.
- Mobile-first React UI served by the API container for one-stop source uploads, source shelf selection, music/caption/hashtag toggles, progress polling, previews, and downloads.
- Public `ai-edit-factory/index.html` web studio with the same polished project/upload/plan/render workflow for site deployments; it defaults to same-origin `/api`, silently auto-tries common local render origins for phone testing, never asks creators to configure backend/API origins, and falls back to a clear browser draft mode when no render engine is reachable so project creation, file selection, previews, and edit-plan review still respond instead of appearing broken.
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

Production deployment for `ballzatram.com` is documented in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). The production target is the FastAPI-backed Docker stack, not static-only hosting.


Prerequisites: Docker Desktop or Docker Engine.

```bash
cd ai-edit-factory
docker compose up --build
```

Open the browser UI at <http://localhost:8000>. The API health check is <http://localhost:8000/api/health>. The app is operated entirely from the browser, but MP4 rendering does not run inside the browser tab: the browser uploads media to the FastAPI backend, and the backend uses ffmpeg to edit/splice/export reliable MP4 files. The standalone Vite dev server remains available at <http://localhost:5173> when you run the optional dev profile (`docker compose --profile dev up frontend`) or `npm run dev`. The public `ai-edit-factory/index.html` page is also a runnable studio shell: it auto-detects the render service from same-origin `/api` plus common local development origins, including local-IP phone testing, without exposing backend/API-origin settings to creators. If no render service can be reached, the page enters **Preview mode only** instead of leaving the workflow ambiguous: users can create a draft project, confirm rights, add local video/audio selections, preview selected video files from object URLs, and generate a draft edit plan, but **Render MP4** and real export/download actions stay disabled. Preview mode does not upload files, persist projects, mix music, or run ffmpeg; start or deploy the render service to export a real vertical MP4.

AI edit factory flow (site-native):

1. Open <http://localhost:8000> (or the deployed `ai-edit-factory/index.html` page) and create a project. The studio auto-detects the render service silently; on static hosts without one, the page switches to browser draft mode so the workflow remains clickable while explaining that the local render engine is required for server uploads and MP4 rendering.
2. Confirm that every uploaded video or audio file is owned, licensed, or otherwise permitted for editing.
3. Upload one or more source videos (`mp4`, `mov`, or `webm`). The app shows upload progress, stores each upload on a source shelf, saves duration/dimensions/file type/preview path when `ffprobe` is available, and lets the user choose the first/primary clip while the AI recipe can splice across the full uploaded source shelf.
4. Optionally upload a rights-cleared music bed (`mp3`, `wav`, `m4a`, `aac`, `flac`, or `ogg`). If **Add music** is enabled, the renderer uses that upload as the export audio bed; otherwise single-source edits preserve source audio where available and multi-source splice edits use silent AAC for consistent MP4 exports.
5. Choose the type of clips to make, such as funny, emotional, hype, dramatic, clean, or storytime. Toggle music, burned-in captions, and hashtag generation, then add creative direction.
6. Click **Make 3 versions** to create polished generated edit cards. The normal UI shows version names, preview/export status, duration, cut count, music start, caption count, feedback buttons, and download controls instead of raw JSON.
7. When the full render stack is ready, the browser queues MP4 exports for the generated versions automatically. If rendering is not ready yet, use the visible **Render all** / **Export MP4** controls after the stack is healthy.
8. Open **Edit** on a generated version to adjust the readable edit recipe: remove/reorder cuts, edit cut start/end timings, add/edit/delete captions, save the plan, and re-export. Captions in `text_overlays` are burned into MP4s by the ffmpeg renderer. Raw plan JSON is available only from the collapsed **Show technical JSON** debug control.

Legacy beat-edit flow (API-compatible):

1. Create a project via the existing project API.
2. Upload a song file (`mp3`, `wav`, `m4a`, `aac`, `flac`, or `ogg`).
3. Upload one or more video clips (`mp4`, `mov`, `m4v`, `avi`, `mkv`, or `webm`).
4. Choose 1-30 outputs and a style template.
5. Click/generate through the legacy API. Generation unlocks only after the uploaded song and at least one uploaded video are saved.
6. Wait for the worker to finish, preview ranked outputs, then download MP4 files.

Legacy beat-edit files are rendered by the backend worker and saved under `outputs/project_<id>/`. AI edit factory exports are rendered from the site flow and saved under `outputs/studio_project_<id>/`. If Redis is unavailable in a non-Docker local run, the API queues a local background render instead and shows that status in the UI.

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

AI edit factory endpoints:

- `POST /api/studio/projects` creates a studio video project.
- `GET /api/studio/projects/{id}` returns source and music assets, latest edit recipe, render job, exports, and upload limits.
- `POST /api/studio/projects/{id}/video` uploads one rights-confirmed `mp4`, `mov`, or `webm` source video. The frontend can call this repeatedly for multi-video source shelves.
- `POST /api/studio/projects/{id}/music` uploads one rights-confirmed `mp3`, `wav`, `m4a`, `aac`, `flac`, or `ogg` music bed.
- `POST /api/studio/projects/{id}/edit-plans` creates a structured short-form edit recipe from clip type, creative prompt, selected primary source, the full uploaded source shelf, and music/caption/hashtag toggles.
- `PATCH /api/studio/projects/{id}/edit-plans/{edit_plan_id}` persists manual cut-list and caption edits so subsequent renders use the updated recipe.
- `PATCH /api/studio/projects/{id}/edit-plans/{edit_plan_id}/music` persists music-bed timing changes for the selected version.
- `POST /api/studio/projects/{id}/render` creates a real ffmpeg render job and export record that splices the planned uploaded source videos.

## Testing

```bash
cd ai-edit-factory
PYTHONPATH=backend python -m pytest -q
```

For realistic edit-quality checks, do not judge the planner with only one short 15-second source clip. Use at least three source videos, 30-120 seconds of total footage, one rights-cleared music file, and **Make 3 versions**. Single-short-clip tests can naturally produce similar-looking versions because the planner has little material to cut between.

The test suite covers YouTube URL parsing, beat interval shapes, scene detection wrappers, clip scoring helpers, render planning, upload validation, API project creation, and the studio edit-plan/render workflow. An integration test creates tiny sample media when ffmpeg is available.

## Manual QA checklist

- [ ] `docker compose up --build` starts Redis, the API-hosted site, and the worker.
- [ ] The site app opens at `http://localhost:8000` on a phone-sized viewport without horizontal scrolling.
- [ ] Compliance copy is visible before upload/generation.
- [ ] The AI edit factory requires the rights-confirmation checkbox before source video or music upload.
- [ ] Upload progress, source shelf selection, playable source preview, optional music bed metadata, recipe JSON, platform captions/hashtags, and render/export state appear in the factory flow.
- [ ] Creating a project succeeds against the FastAPI-backed app, or a non-production static preview clearly enters browser draft mode with project/upload/plan controls still responding and copy that explains MP4 rendering requires the render service.
- [ ] Invalid upload types are rejected.
- [ ] Uploading one rights-approved song and one or more rights-approved clips succeeds.
- [ ] YouTube URL import shows metadata and does not download media by default.
- [ ] Clicking generate stays disabled until required uploads exist, then creates a multi-clip recipe and changes job status from queued/running to finished.
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

## Built-in editor, music selection, and learning loop

The studio no longer depends on a creator-supplied editing API key or third-party editing service. The browser talks to the FastAPI backend, and the backend produces the edit through local, deterministic AI-style heuristics plus ffmpeg:

- `generate_edit_plan(...)` chooses platform, duration, pacing, source segments, text overlays, caption packages, hashtags, music guidance, and a suggested `music_start_seconds` from the uploaded media metadata and prompt.
- The React studio exposes a **Song start second** control after music upload so a user can choose which hook/drop of the song is used before generating and rendering the MP4.
- Rendered files now include a slug of the project name in `outputs/studio_project_<id>/<project-name>_plan_<plan-id>_<platform>.mp4`, so exports are recognizable instead of only numeric/opaque names.
- Every export can receive quick feedback through **Nailed it** / **Tighten cuts** / music / caption / crop feedback. Feedback is stored in SQLite and returned as `learning_profile`; future edit plans for that project adjust pacing and caption density based on the profile.
- TikTok/trend relevance must be fed through permissioned or official sources. This repo intentionally does not scrape TikTok or bypass platform controls. For a production trend system, import approved trend signals into the database, then expose them to `generate_edit_plan(...)` the same way first-party feedback is exposed today.

New studio feedback endpoint:

```http
POST /api/studio/projects/{id}/feedback
```

Body:

```json
{
  "edit_plan_id": 1,
  "export_id": 1,
  "rating": 5,
  "signal": "liked_export",
  "notes": "Optional operator note"
}
```

## What you need to do to make the prototype functional end-to-end

1. Install Docker Desktop / Docker Engine.
2. From this directory, run `docker compose up --build`.
3. Open `http://localhost:8000`.
4. Create a named project; the generated MP4 filename will include a slug of that name.
5. Check the rights confirmation box.
6. Upload one or more short source videos (`mp4`, `mov`, or `webm`). For fastest iteration, start with clips under 60 seconds.
7. Optional: upload a rights-cleared tune (`mp3`, `wav`, `m4a`, `aac`, `flac`, or `ogg`) and set **Tune start second** to the part of the song you want under the edit.
8. Pick a vibe, keep tune/captions/hashtags enabled or disable what you do not want, then click **Make 3 versions**.
9. Review the generated edit cards. Open **Edit** to adjust cuts, captions, and music timing without touching raw JSON.
10. When the stack is render-ready, exports queue automatically; otherwise click **Render all** or **Export MP4**. Per-version status moves through queued/rendering/ready/failed states.
11. Preview each ready version and click **Download MP4**.
12. Click **Nailed it**, **Tighten cuts**, **Wrong music moment**, **Bad captions**, or **Bad crop** so the local learning profile can tune future plans for that project.

Operational requirements:

- Keep `inputs/`, `outputs/`, and `data/` writable and persistent if you want projects and exports to survive container restarts.
- Install/ship ffmpeg in any non-Docker environment; the provided backend Dockerfile already includes it.
- Do not use copyrighted media unless you own it, licensed it, or have explicit permission to process it.
- Do not connect scraping tools to TikTok. Use official/permissioned trend data feeds or manually curated trend signals.

## MVP acceptance script

This repository is intentionally local/single-node for the MVP. The end-to-end proof path is:

```bash
cd ai-edit-factory
docker compose up --build
```

Then open <http://localhost:8000> and verify:

1. Create a project with `name`, optional `description`, and a `target_platform` (stored in SQLite `projects`).
2. Upload one or more owned/licensed source videos and optional owned/licensed music.
3. Confirm each `media_assets` row stores `path`, `original_filename`, `asset_type`, `duration`, `width`, `height`, `fps`, `has_audio`, `analysis_json`, and a thumbnail path when ffmpeg can extract one.
4. Click **Make 3 versions**. The backend creates deterministic `edit_plans` for `fast_montage`, `hook_buildup_reveal`, and `beat_sync` using the `mvp.edit_plan.v1` schema (`target_platform`, duration, style/template, video clips, text overlays, music settings, crop mode, and timing).
5. Open a generated card's **Edit** panel, change music start time, adjust caption text, remove/reorder cuts, and save. This updates the edit plan and allows re-rendering.
6. Export a version. The render job uses local ffmpeg to write a vertical 1080x1920 H.264/AAC MP4 into `outputs/`, creates `render_jobs` and `exports` records, and exposes a `/media/outputs/...` download URL.
7. Download the MP4 from the ready generated edit card.
8. Save feedback using **Nailed it**, **Tighten cuts**, **Wrong music moment**, **Bad captions**, or **Bad crop**. The MVP stores `feedback_events` (`works`, `needs_tighter_cuts`, `wrong_music_section`, `bad_captions`, `bad_crop`, or `other`) for future improvement; it does not train a model.
9. Restart Docker Compose and verify projects, assets, plans, exports, feedback, and curated trend signals still load from the persisted `data/` volume.

Programmatic checks used by maintainers:

```bash
PYTHONPATH=backend python -m pytest -q
npm --prefix frontend run build
```

Network-restricted environments may not be able to install Python packages from PyPI. Use Docker Compose for a reproducible dependency environment.

## Trend insights MVP

The app does not scrape TikTok or any social platform. `trend_signals` is seeded locally with manually curated guidance fields:

- `format_name`
- `hook_style`
- `pacing_style`
- `caption_style`
- `music_guidance`
- `hashtags`
- `category`
- `region`
- `freshness_score`

The React **Insights** section displays these rows, and the `/api/studio/projects/{id}/versions` planner can use them as optional context when generating deterministic edit-plan variants.
