#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:?public hostname required}"
BUNDLE="${2:-/tmp/osiris-runtime-bundle.tgz}"
CADDY_BIN="${3:-/tmp/caddy}"
PILOT_FILE="${4:-/tmp/osiris-pilot-code}"
ROOT=/opt/osiris-pilot

if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9.-]{1,253}$ ]]; then
  echo "Invalid hostname." >&2
  exit 2
fi
pilot="$(tr -d '\r\n' < "$PILOT_FILE")"
if [[ ! "$pilot" =~ ^[A-Za-z0-9_-]{32,128}$ ]]; then
  echo "Pilot code failed validation." >&2
  exit 2
fi

mkdir -p "$ROOT/runtime" "$ROOT/caddy-data" "$ROOT/caddy-config"
if [[ -f "$ROOT/runtime.pid" ]] && kill -0 "$(cat "$ROOT/runtime.pid")" 2>/dev/null; then kill "$(cat "$ROOT/runtime.pid")" || true; fi
if [[ -f "$ROOT/caddy.pid" ]] && kill -0 "$(cat "$ROOT/caddy.pid")" 2>/dev/null; then kill "$(cat "$ROOT/caddy.pid")" || true; fi
sleep 1
rm -rf "$ROOT/runtime"/*
tar -xzf "$BUNDLE" -C "$ROOT/runtime"
install -m 0755 "$CADDY_BIN" "$ROOT/caddy"
chmod 0755 "$ROOT/runtime/node"

umask 077
cat > "$ROOT/runtime.env" <<EOF
OSIRIS_BIND_HOST=127.0.0.1
PORT=8788
OSIRIS_ALLOWED_ORIGINS=https://dgallemore.com,https://www.dgallemore.com
OSIRIS_PILOT_CODES=$pilot
NODE_ENV=production
EOF
rm -f "$PILOT_FILE"

cat > "$ROOT/Caddyfile" <<EOF
$DOMAIN {
  encode zstd gzip
  reverse_proxy 127.0.0.1:8788
}
EOF

set -a
source "$ROOT/runtime.env"
set +a
cd "$ROOT/runtime/osiris-runtime"
nohup "$ROOT/runtime/node" "$ROOT/runtime/osiris-runtime/server.mjs" >"$ROOT/runtime.log" 2>&1 &
echo $! > "$ROOT/runtime.pid"

for attempt in $(seq 1 30); do
  if python3 - <<'PY' >/dev/null 2>&1
import urllib.request
r=urllib.request.urlopen("http://127.0.0.1:8788/ready", timeout=4)
raise SystemExit(0 if r.status == 200 else 1)
PY
  then break; fi
  if (( attempt == 30 )); then
    tail -n 40 "$ROOT/runtime.log" >&2 || true
    exit 1
  fi
  sleep 2
done

XDG_DATA_HOME="$ROOT/caddy-data" XDG_CONFIG_HOME="$ROOT/caddy-config"   nohup "$ROOT/caddy" run --config "$ROOT/Caddyfile" --adapter caddyfile >"$ROOT/caddy.log" 2>&1 &
echo $! > "$ROOT/caddy.pid"

rm -f "$BUNDLE" "$CADDY_BIN"
echo "OSIRIS_PILOT_STARTED=1"
echo "OSIRIS_PUBLIC_HOST=$DOMAIN"
