# Ballzatram Deployment

Ballzatram currently has two deploy targets:

- DigitalOcean production for `ballzatram.com`
- GitHub Pages static fallback/demo deploy

Do not put secrets in browser files, static docs, or committed build artifacts. Provider keys belong in server environment variables only.

## DigitalOcean Production

The production workflow is `.github/workflows/deploy.yml`. It runs on pushes to `master` and connects over SSH using these GitHub Actions secrets:

- `DO_HOST`
- `DO_USER`
- `DO_PORT`
- `DO_SSH_KEY`

Expected server repo path:

```bash
/root/ballzatram
```

The live containerized stack is not at the repo root. The production Compose file is:

```bash
ai-edit-factory/docker-compose.prod.yml
```

That Compose stack runs:

- `caddy`: public HTTP/HTTPS entrypoint
- `api`: FastAPI AI Edit Factory backend and `/api/health`
- `worker`: render worker
- `redis`: job queue/cache

Caddy serves the repo root static site from `/srv/ballzatram` and proxies API/media paths to the API container.

The separate Next.js MacroBoard app and shared agent backend under `frontend/` and `backend/` are not currently part of this DigitalOcean Compose stack. Static pages and AI Edit deploy through this stack; production `/macro-board` and `/api/agent/*` require either adding those services to Compose/Caddy or deploying them separately.

## Fixed Deployment Issue

The old DigitalOcean workflow only checked for `docker-compose.prod.yml` or `docker-compose.yml` at the repo root. Because the real production Compose file lives under `ai-edit-factory/`, the workflow could update the git checkout but then fall through to "static site deploy" and skip the Docker rebuild/restart.

The workflow now checks `ai-edit-factory/docker-compose.prod.yml` first and runs:

```bash
cd /root/ballzatram
git fetch origin master
git reset --hard origin/master
cd ai-edit-factory
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

## Manual DigitalOcean Deploy

Run on the server:

```bash
cd /root/ballzatram
git fetch origin master
git reset --hard origin/master
cd ai-edit-factory
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
cd ..
./scripts/verify_deployment.sh
```

If production uses a different checkout path, update the workflow `cd /root/ballzatram` line or create that path on the server.

## Verification

Local/server checklist:

```bash
./scripts/verify_deployment.sh
```

Windows/local equivalent:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verify_deployment.ps1
```

Optional full local build checks:

```bash
VERIFY_BUILD=1 ./scripts/verify_deployment.sh
```

```powershell
$env:VERIFY_BUILD = "1"
powershell -ExecutionPolicy Bypass -File scripts\verify_deployment.ps1
```

The script checks:

- current git root, branch, commit hash, and dirty status
- static entrypoints
- production Compose config
- running Compose services when Docker is available
- home page response
- Weather Desk response
- `/api/health` response when the AI Edit Factory stack is running

For a remote/live site:

```bash
SITE_URL=https://ballzatram.com ./scripts/verify_deployment.sh
```

## GitHub Pages

`.github/workflows/deploy-pages.yml` now runs on `main` and `master`. It publishes the static launchpad, games, tools, docs, and the public AI Edit Factory static shell. It intentionally does not publish backend source folders as static files.

## Server-Side Action Still Required

From the repo alone, we cannot verify:

- whether the GitHub Actions secrets are present and valid
- whether `/root/ballzatram` exists on the DigitalOcean host
- whether the server has Docker Compose v2 installed
- whether DNS/TLS for `ballzatram.com` points to the Caddy container
- whether the separate Next.js/MacroBoard agent services should be added to the production stack for live `/macro-board` and `/api/agent/*`

If deploys still do not update production after this workflow change, SSH into the server and run the manual deploy and verification commands above.
