# Ballzatram Deployment (GitHub → DigitalOcean)

## GitHub Secrets

Add the following repository secrets in **GitHub → Settings → Secrets and variables → Actions**:

- `DO_HOST`: DigitalOcean server hostname or IP
- `DO_USER`: SSH user (for this setup, likely `root`)
- `DO_PORT`: SSH port (usually `22` unless customized)
- `DO_SSH_KEY`: Private SSH key content used by GitHub Actions to connect

## Deployment Flow

The deployment workflow is at `.github/workflows/deploy.yml` and runs automatically on every push to `master`.

Workflow steps:

1. Connect to the server over SSH via `appleboy/ssh-action`
2. Change into repo directory:
   - `cd /root/ballzatram`
3. Update code to exactly match GitHub `master`:
   - `git fetch origin master`
   - `git reset --hard origin/master`
4. Deploy based on available stack type:
   - If `docker-compose.prod.yml` exists:
     - `docker compose -f docker-compose.prod.yml up -d --build`
     - `docker compose -f docker-compose.prod.yml ps`
   - Else if `docker-compose.yml` exists:
     - `docker compose up -d --build`
     - `docker compose ps`
   - Else (static-site root deploy):
     - Print: `No Docker Compose file found; assuming static site deploy.`
     - Reload web server if available: `systemctl reload caddy || systemctl reload nginx || true`
5. Always print verification output:
   - `pwd`
   - `git status --short`

## Manual Deployment Commands

If you need to deploy manually on the server:

```bash
cd /root/ballzatram
git fetch origin master
git reset --hard origin/master
if [ -f docker-compose.prod.yml ]; then
  docker compose -f docker-compose.prod.yml up -d --build
  docker compose -f docker-compose.prod.yml ps
elif [ -f docker-compose.yml ]; then
  docker compose up -d --build
  docker compose ps
else
  echo "No Docker Compose file found; assuming static site deploy."
  systemctl reload caddy || systemctl reload nginx || true
fi
```

## Verification Commands

Run these on the server after deployment:

```bash
pwd
git status --short
```

For Docker-based sub-apps, also run one of:

```bash
docker compose -f docker-compose.prod.yml ps
# or
docker compose ps
```

Expected results:

- `pwd` returns `/root/ballzatram`
- `git status --short` returns no output (clean working tree)
- For Docker-based deploys, `docker compose ... ps` shows running containers
- For static-site deploys, no Compose file is required; deployment succeeds after git reset and web-server reload
