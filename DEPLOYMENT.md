# Ballzatram Deployment

Ballzatram production is the AI process platform, not the retired AI Edit Factory stack.

Production should serve:

- `https://ballzatram.com/` through the Next.js frontend
- `https://ballzatram.com/macro-board` through the AI-guided MacroBoard route
- `https://ballzatram.com/api/*` through the FastAPI AI/process backend

Do not put secrets in browser files, static docs, or committed build artifacts. Provider keys belong in `/root/ballzatram/.env.production` on the server or in GitHub deployment secrets.

## DigitalOcean Droplet

The production workflow is `.github/workflows/deploy.yml`. It runs on pushes to `master` and connects over SSH using these GitHub Actions secrets:

- `DO_HOST`
- `DO_USER`
- `DO_PORT`
- `DO_SSH_KEY`

Expected checkout path:

```bash
/root/ballzatram
```

Expected server env file:

```bash
/root/ballzatram/.env.production
```

Minimum contents:

```env
OPENAI_API_KEY=sk-...
OPENAI_AGENT_MODEL=gpt-5.1
APP_ENV=production
GIT_BRANCH=master
```

Lock it down:

```bash
chmod 600 /root/ballzatram/.env.production
```

## Production Stack

Root Compose file:

```bash
docker-compose.prod.yml
```

Services:

- `frontend`: Next.js Ballzatram app on port `3000`
- `backend`: FastAPI AI/process API on port `8000`
- `caddy`: HTTPS reverse proxy on ports `80` and `443`

Routing:

- `/api/*` -> `backend:8000`
- everything else -> `frontend:3000`

Caddy no longer serves the repository root as static files. Source-tree paths such as `/backend/*`, `/frontend/*`, `/ai-edit-factory/*`, and `/.git/*` return `404`.

## Deploy Flow

The GitHub Action does this on the droplet:

```bash
cd /root/ballzatram
git fetch origin master
git reset --hard origin/master
export GIT_COMMIT="$(git rev-parse --short HEAD)"
export GIT_BRANCH="master"
export DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker compose --env-file .env.production -f docker-compose.prod.yml build
cd ai-edit-factory && docker compose -f docker-compose.prod.yml down --remove-orphans
cd /root/ballzatram
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans
curl -fsS https://ballzatram.com/api/version
```

It builds the new Ballzatram stack before stopping the legacy AI Edit stack, then verifies that `/api/version` reports the deployed commit.

## Manual Cutover

Run this on the droplet after the deployment overhaul is merged to `master`:

```bash
cd /root/ballzatram
git fetch origin master
git reset --hard origin/master
export GIT_COMMIT="$(git rev-parse --short HEAD)"
export GIT_BRANCH="master"
export DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker compose --env-file .env.production -f docker-compose.prod.yml build
cd /root/ballzatram/ai-edit-factory
docker compose -f docker-compose.prod.yml down --remove-orphans
cd /root/ballzatram
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

## Verification

Run:

```bash
curl -fsS https://ballzatram.com/api/version
curl -I https://ballzatram.com/macro-board
curl -I https://ballzatram.com/backend/app/main.py
curl -I https://ballzatram.com/frontend/package.json
curl -I https://ballzatram.com/ai-edit-factory/docker-compose.prod.yml
```

Expected:

- `/api/version` returns the current commit
- `/macro-board` returns the Next.js app
- source-tree paths return `404`, not `200`

Local/server helper:

```bash
./scripts/verify_deployment.sh
```

Windows/local equivalent:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verify_deployment.ps1
```

## Legacy AI Edit

AI Edit Factory is retired from production. Keep the old stack running only until the root Ballzatram stack has built successfully and is ready to bind ports `80` and `443`.
