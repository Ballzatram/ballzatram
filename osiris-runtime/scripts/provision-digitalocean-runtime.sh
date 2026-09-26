#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:?public hostname required}"
BUNDLE="${2:-/tmp/osiris-runtime-bundle.tgz}"
CADDY_BIN="${3:-/tmp/caddy}"
PILOT_FILE="${4:-/tmp/osiris-pilot-code}"

if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9.-]{1,253}$ ]]; then
  echo "Invalid hostname." >&2
  exit 2
fi
if [[ ! -s "$BUNDLE" || ! -x "$CADDY_BIN" || ! -s "$PILOT_FILE" ]]; then
  echo "Provisioning inputs are missing." >&2
  exit 2
fi
pilot="$(tr -d '\r\n' < "$PILOT_FILE")"
if [[ ! "$pilot" =~ ^[A-Za-z0-9_-]{32,128}$ ]]; then
  echo "Pilot code failed validation." >&2
  exit 2
fi

if ! id -u osiris >/dev/null 2>&1; then
  useradd --system --home-dir /opt/osiris --create-home --shell /usr/sbin/nologin osiris
fi
install -d -m 0755 -o root -g root /opt/osiris
install -d -m 0755 -o root -g root /opt/osiris/runtime
rm -rf /opt/osiris/runtime/*
tar -xzf "$BUNDLE" -C /opt/osiris/runtime
install -m 0755 "$CADDY_BIN" /opt/osiris/caddy
chmod 0755 /opt/osiris/runtime/node
chown -R root:root /opt/osiris/runtime

umask 077
cat > /etc/osiris-runtime.env <<EOF
OSIRIS_BIND_HOST=127.0.0.1
PORT=8788
OSIRIS_ALLOWED_ORIGINS=https://dgallemore.com,https://www.dgallemore.com
OSIRIS_PILOT_CODES=$pilot
NODE_ENV=production
EOF
chmod 0600 /etc/osiris-runtime.env
rm -f "$PILOT_FILE"

cat > /etc/systemd/system/osiris-runtime.service <<'UNIT'
[Unit]
Description=Osiris ChatGPT subscription runtime
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=osiris
Group=osiris
WorkingDirectory=/opt/osiris/runtime/osiris-runtime
EnvironmentFile=/etc/osiris-runtime.env
ExecStart=/opt/osiris/runtime/node /opt/osiris/runtime/osiris-runtime/server.mjs
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/tmp
CapabilityBoundingSet=
LockPersonality=true

[Install]
WantedBy=multi-user.target
UNIT

install -d -m 0755 -o root -g root /var/lib/osiris-caddy /var/lib/osiris-caddy/data /var/lib/osiris-caddy/config
cat > /opt/osiris/Caddyfile <<EOF
$DOMAIN {
  encode zstd gzip
  reverse_proxy 127.0.0.1:8788
}
EOF
chmod 0644 /opt/osiris/Caddyfile

cat > /etc/systemd/system/osiris-caddy.service <<'UNIT'
[Unit]
Description=Osiris HTTPS reverse proxy
After=network-online.target osiris-runtime.service
Wants=network-online.target
Requires=osiris-runtime.service

[Service]
Type=simple
User=root
Group=root
Environment=XDG_DATA_HOME=/var/lib/osiris-caddy/data
Environment=XDG_CONFIG_HOME=/var/lib/osiris-caddy/config
ExecStart=/opt/osiris/caddy run --config /opt/osiris/Caddyfile --adapter caddyfile
ExecReload=/opt/osiris/caddy reload --config /opt/osiris/Caddyfile --adapter caddyfile
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable osiris-runtime.service osiris-caddy.service >/dev/null
systemctl restart osiris-runtime.service

for attempt in $(seq 1 30); do
  if python3 - <<'PY' >/dev/null 2>&1
import urllib.request
r=urllib.request.urlopen("http://127.0.0.1:8788/ready", timeout=4)
raise SystemExit(0 if r.status == 200 else 1)
PY
  then
    break
  fi
  if (( attempt == 30 )); then
    journalctl -u osiris-runtime.service -n 30 --no-pager >&2 || true
    exit 1
  fi
  sleep 2
done

# Re-run the exact signed-out Codex device-login start/cancel check inside
# the deployed runtime bundle. It never prints a device code or credential.
sudo -u osiris   env HOME=/tmp PATH=/usr/bin:/bin LANG=C.UTF-8   /opt/osiris/runtime/node /opt/osiris/runtime/osiris-runtime/scripts/check-device-login.mjs

systemctl restart osiris-caddy.service
rm -f "$BUNDLE" "$CADDY_BIN"
echo "OSIRIS_PROVISIONED=1"
echo "OSIRIS_PUBLIC_HOST=$DOMAIN"
