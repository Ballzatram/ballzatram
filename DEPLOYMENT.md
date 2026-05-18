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
4. Rebuild and restart containers:
   - If `docker-compose.prod.yml` exists:
     - `docker compose -f docker-compose.prod.yml up -d --build`
   - Otherwise:
     - `docker compose up -d --build`
5. Print verification output:
   - `pwd`
   - `git status --short`
   - `docker compose ps`

## Manual Deployment Commands

If you need to deploy manually on the server:

```bash
cd /root/ballzatram
git fetch origin master
git reset --hard origin/master
if [ -f docker-compose.prod.yml ]; then
  docker compose -f docker-compose.prod.yml up -d --build
else
  docker compose up -d --build
fi
```

## Verification Commands

Run these on the server after deployment:

```bash
pwd
git status --short
docker compose ps
```

Expected results:

- `pwd` returns `/root/ballzatram`
- `git status --short` returns no output (clean working tree)
- `docker compose ps` shows running containers for the deployed stack
