#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${SITE_URL:-http://127.0.0.1}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

echo "== Git =="
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
git status --short

echo
echo "== Production files =="
test -f Dockerfile.frontend
test -f Dockerfile.backend
test -f docker-compose.prod.yml
test -f deploy/caddy/Caddyfile
test -f frontend/package.json
test -f backend/requirements.txt
echo "Production stack files present"

echo
echo "== Compose =="
if [ -f "$COMPOSE_FILE" ]; then
  echo "Compose file: $COMPOSE_FILE"
  if command -v docker >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" config >/dev/null
    echo "Compose config is valid"
    docker compose -f "$COMPOSE_FILE" ps || true
  else
    echo "Docker is not installed in this environment; run docker compose ps on the server."
  fi
else
  echo "Compose file missing: $COMPOSE_FILE"
fi

if [ "${VERIFY_BUILD:-0}" = "1" ]; then
  echo
  echo "== Optional local builds =="
  (cd frontend && npm run lint && npm run build)
  (cd weather-trader && npm run build)
fi

echo
echo "== HTTP checks =="
if command -v curl >/dev/null 2>&1; then
  curl -fsS "$SITE_URL/" >/dev/null && echo "Home responds: $SITE_URL/"
  curl -fsS "$SITE_URL/macro-board" >/dev/null && echo "MacroBoard responds"
  curl -fsS "$SITE_URL/api/health" >/dev/null && echo "API health responds"
  curl -fsS "$SITE_URL/api/version" >/dev/null && echo "API version responds"
  for path in /backend/app/main.py /frontend/package.json /ai-edit-factory/docker-compose.prod.yml; do
    status="$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL$path")"
    if [ "$status" = "200" ]; then
      echo "Source path is publicly reachable: $path"
      exit 1
    fi
    echo "Source path blocked: $path -> $status"
  done
else
  echo "curl is not installed; open the site and /api/version manually."
fi

echo
echo "Verification complete. Confirm /api/version reflects the current commit after deployment."
