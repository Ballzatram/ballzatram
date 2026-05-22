#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${SITE_URL:-http://127.0.0.1}"
COMPOSE_FILE="${COMPOSE_FILE:-ai-edit-factory/docker-compose.prod.yml}"

echo "== Git =="
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
git status --short

echo
echo "== Static assets =="
test -f index.html
test -f weather-bot.html
test -f tools/parcel/index.html
test -f tools/macroboard/index.html
test -f econ-arcade/index.html
test -f ai-edit-factory/index.html
echo "Static entrypoints present"

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
  (cd ai-edit-factory/frontend && npm run build)
fi

echo
echo "== HTTP checks =="
if command -v curl >/dev/null 2>&1; then
  curl -fsS "$SITE_URL/" >/dev/null && echo "Home responds: $SITE_URL/"
  curl -fsS "$SITE_URL/weather-bot.html" >/dev/null && echo "Weather Desk responds"
  curl -fsS "$SITE_URL/api/health" >/dev/null && echo "AI Edit health responds" || echo "AI Edit health did not respond at $SITE_URL/api/health"
else
  echo "curl is not installed; open the site and /api/health manually."
fi

echo
echo "Verification complete. Confirm the live page footer/header reflects the current commit after deployment."
