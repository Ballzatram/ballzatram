#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-ballzatram.com}"
BASE="https://${DOMAIN}"

curl -kfsS --resolve "${DOMAIN}:443:127.0.0.1" "${BASE}/api/version" >/dev/null
for path in /backend/app/main.py /frontend/package.json /ai-edit-factory/docker-compose.prod.yml; do
  status="$(curl -ks -o /dev/null -w "%{http_code}" --resolve "${DOMAIN}:443:127.0.0.1" "${BASE}${path}")"
  if [ "$status" = "200" ]; then
    echo "FAIL: source path reachable: ${path}"
    exit 1
  fi
done

echo "Production routing smoke passed for ${DOMAIN}."
