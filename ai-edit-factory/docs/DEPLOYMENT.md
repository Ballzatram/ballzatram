# Production deployment: ballzatram.com

This deployment path makes `ballzatram.com` the Ballzatram launchpad while keeping AI Edit as a backend-powered tool route. Production should serve the repo-root homepage and static launchpad assets from Caddy, serve AI Edit at `/ai-edit-factory/`, and keep `/api/*`, `/api/diagnostics`, uploaded media previews, and rendered MP4 outputs behind HTTPS.

## Target architecture

- **Caddy** terminates HTTPS for `ballzatram.com`, serves the repo-root static Ballzatram launchpad from `/srv/ballzatram`, and reverse-proxies only backend-owned routes to `api:8000`.
- **FastAPI API** serves studio routes, `/api/diagnostics`, `/media/inputs/*`, `/media/outputs/*`, compatibility `/inputs/*` and `/outputs/*` media paths, and the built AI Edit frontend under `/ai-edit-factory/`.
- **Redis** stores the render queue.
- **Worker** runs the same backend image as the API and processes ffmpeg render jobs.
- **Bind mounts** persist user media and the SQLite database across container restarts:
  - `./inputs:/app/inputs`
  - `./outputs:/app/outputs`
  - `./data:/app/data`
- **Production routes**:
  - `/` plus root files such as `/style.css`, `/script.js`, `/assets/*`, `/econ-arcade/index.html`, `/tools/parcel/index.html`, and `/weather-bot.html` are served from the repo root.
  - `/ai-edit-factory/` is reverse-proxied to FastAPI, which serves the built AI Edit frontend at that subpath. Production Vite builds use `base: "/ai-edit-factory/"`, so the returned HTML loads JS/CSS from `/ai-edit-factory/assets/*` instead of competing with any root-site `/assets/*` directory.
  - `/api/*` remains reverse-proxied to FastAPI for diagnostics, project creation, uploads, renders, and feedback.
  - `/media/*`, `/outputs/*`, and `/inputs/*` remain reverse-proxied to FastAPI for uploaded previews and rendered exports.

Static-only hosting of AI Edit is preview-only and is **not** the desired production state for the editor. The domain root must remain the Ballzatram launchpad.

## 1. Provision a VPS

Use a Linux VPS with enough disk for uploaded source media and rendered MP4s. A practical MVP starting point is:

- Ubuntu 22.04 or 24.04 LTS
- 2+ vCPU
- 4+ GB RAM
- 40+ GB disk, sized up for expected uploads/exports
- Inbound ports `80` and `443` open

## 2. Install Docker

On Ubuntu, install Docker Engine and the Compose plugin:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in so your user can run Docker without `sudo`, or prefix the commands below with `sudo`.

## 3. Clone the repo

```bash
git clone <your-repo-url> ballzatram
cd ballzatram/ai-edit-factory
```

## 4. Configure production environment

```bash
cp .env.production.example .env
```

Review `.env` before starting. The default production example is:

```env
APP_MODE=production
REDIS_URL=redis://redis:6379/0
AIEF_BASE_DIR=/app
AIEF_DB_PATH=/app/data/ai_edit_factory.sqlite3
CORS_ORIGINS=https://ballzatram.com
ALLOW_YOUTUBE_DOWNLOADS=false
MAX_UPLOAD_MB=750
```

Keep `ALLOW_YOUTUBE_DOWNLOADS=false` unless you have an explicit, permissioned production workflow for downloads.

## 5. Create persistent directories

```bash
mkdir -p inputs outputs data
chmod 755 inputs outputs data
```

These directories are mounted into the API and worker containers. Do not delete them during deploys unless you intentionally want to remove uploaded sources, generated exports, or the SQLite database.

## 6. Configure DNS

Create or update the DNS record:

```text
Type: A
Name: @
Value: <your-vps-public-ip>
TTL: 300 or provider default
```

Wait for DNS to resolve before starting the HTTPS verification. You can check from your workstation:

```bash
dig +short ballzatram.com
```

## 7. Start the production stack

`docker-compose.prod.yml` includes `api`, `worker`, `redis`, and `caddy`. Caddy automatically provisions and renews HTTPS certificates for `ballzatram.com` when DNS points at the server and ports `80`/`443` are reachable.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check container status:

```bash
docker compose -f docker-compose.prod.yml ps
```

Tail logs if anything is unhealthy:

```bash
docker compose -f docker-compose.prod.yml logs -f api worker caddy redis
```

## 8. Verify production diagnostics

The required production verification endpoint is:

```text
https://ballzatram.com/api/diagnostics
```

Run the verification script from the VPS:

```bash
./scripts/verify_production.sh https://ballzatram.com
```

The script fails unless diagnostics reports all of these as ready:

- `api_ok: true`
- `ffmpeg_available: true`
- `ffprobe_available: true`
- `redis_available: true`
- `worker_queue_available: true`
- `inputs_path_writable: true`
- `outputs_path_writable: true`
- `db_path_writable: true`
- `app_mode: "full_stack_render_ready"`

## 9. Verify the creator workflow

Open `https://ballzatram.com` in a normal browser session and verify:

1. The app shows only the polished creator workflow. Users should not see backend settings, API-origin fields, diagnostics panels, or debug controls in the normal flow.
2. The render engine is ready; no static-only or preview-only warning should appear when the production backend is healthy.
3. Create a project.
4. Confirm rights for the files you are testing.
5. Upload one rights-approved video clip.
6. Upload one rights-approved music file.
7. Generate an edit plan or versions.
8. Render an MP4.
9. Preview and download the export.

If the production backend is offline, the UI should show polished **Render engine temporarily unavailable** messaging and should still never expose API-origin settings to normal users.

## 10. Confirm persistence after restart

Restart the stack:

```bash
docker compose -f docker-compose.prod.yml restart
```

Then verify:

```bash
./scripts/verify_production.sh https://ballzatram.com
```

Open the app and confirm previously uploaded media, project records, and rendered outputs still exist. The persistence check depends on keeping `./inputs`, `./outputs`, and `./data` mounted and backed up.

## Operations notes

- Back up `inputs/`, `outputs/`, and `data/` regularly.
- Keep Docker images and the host OS patched.
- Monitor disk usage; uploaded media and rendered MP4s can grow quickly.
- Scale workers by adding worker replicas only after confirming SQLite write contention is acceptable for your traffic level. For higher traffic, migrate `data/ai_edit_factory.sqlite3` to a production database while preserving table semantics.
