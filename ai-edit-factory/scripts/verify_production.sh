#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${AIEF_PRODUCTION_URL:-https://ballzatram.com}}"
BASE_URL="${BASE_URL%/}"
DIAGNOSTICS_URL="${BASE_URL}/api/diagnostics"

python - "$DIAGNOSTICS_URL" <<'PY'
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

url = sys.argv[1]
required_truthy = [
    "api_ok",
    "ffmpeg_available",
    "ffprobe_available",
    "redis_available",
    "worker_queue_available",
    "inputs_path_writable",
    "outputs_path_writable",
    "db_path_writable",
]

try:
    with urllib.request.urlopen(url, timeout=20) as response:
        status = response.status
        raw = response.read().decode("utf-8")
except urllib.error.URLError as exc:
    raise SystemExit(f"❌ Could not reach {url}: {exc}") from exc

if status != 200:
    raise SystemExit(f"❌ {url} returned HTTP {status}")

try:
    diagnostics = json.loads(raw)
except json.JSONDecodeError as exc:
    raise SystemExit(f"❌ {url} did not return JSON: {exc}") from exc

failures = [field for field in required_truthy if diagnostics.get(field) is not True]
if diagnostics.get("app_mode") != "full_stack_render_ready":
    failures.append("app_mode=full_stack_render_ready")

print(json.dumps(diagnostics, indent=2, sort_keys=True))
if failures:
    raise SystemExit(f"❌ Production verification failed for {url}. Missing/false checks: {', '.join(failures)}")

print(f"✅ Production render service is ready at {url}")
PY
