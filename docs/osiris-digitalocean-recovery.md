# Osiris DigitalOcean recovery

## Observed failure

The [DigitalOcean auth probe run](https://github.com/Ballzatram/ballzatram/actions/runs/36209094316)
failed on September 26, 2026 at 01:40 UTC. Every attempt failed to establish a
connection to the test host's HTTPS port. It obtained no `probe.txt` result.
This is a host/listener/connectivity failure, **not evidence that OpenAI rejected
DigitalOcean**. Its cause inside the droplet is still unverified.

The test also only checked that three metadata fields existed. Even a retrieved
HTTP 403 would have satisfied that old workflow. It is not a device-login or
inference acceptance test and must not be used to authorize a production switch.

The real signed-out device-login start/cancel check passed on GitHub's runner in
[native integration run 36206688824](https://github.com/Ballzatram/ballzatram/actions/runs/36206688824),
job `Native transport and signed-out deployment acceptance`. The browser job in
that run failed separately. Runner success does not establish DigitalOcean host
success. `assets/ai-config.js` still leaves the native service address empty.

## Existing-host check

Use the existing Ubuntu 24.04 x86_64 host with at least 1 GB RAM. Do not create or
resize a droplet to repeat a failed HTTP probe. In DigitalOcean, open the droplet
and choose **Web Console** (or **Actions → Connect**). This uses the existing
account access; do not put private SSH keys or account passwords in chat.

Download the script from its reviewed commit, inspect it, then run:

```sh
sudo bash osiris-host-preflight.sh --install-deps
```

The script installs only missing Ubuntu dependencies, starts Docker if needed,
fetches runtime revision `99c2584d428878ed477092871327fcc2c5c5be7d`, verifies that
revision, and builds the repository's existing image with Codex `0.154.0`.
It uses restricted, temporary containers for the configuration/isolation test and
the actual device-login start/cancel test. No browser login, model call, admission
code, DNS change, firewall change, public port, or frontend change is involved.
It preserves a clean checkout and image for the subsequent deployment, rejects
unexpected/local source changes, and cleans up the temporary test container.

Read the final `OSIRIS_HOST_PREFLIGHT` line. A failure includes its stage and exit
status. Keep any detailed console output private; do not publish account data.
Do not restart/recreate hosts or weaken TLS checks based on an unknown failure.
If device login is rejected, stop and investigate the actual provider error.

## Continue only after the host passes

Follow [the runtime deployment instructions](../osiris-runtime/README.md#run-on-a-private-host)
using the retained checkout at `/opt/osiris-host-check/99c2584d428878ed477092871327fcc2c5c5be7d`.
Choose a hostname that resolves to that host and ensure ports 80/443 are available.
The temporary 1 GB authentication-test host is not a capacity certification for
multiple concurrent visitors. Review memory requirements before a larger pilot;
the script does not purchase or resize infrastructure.

1. Configure the private `.env`, install the matching Compose plugin if absent,
   and validate `docker compose config --quiet`.
2. Repeat the signed-out checks through Compose to validate the actual deployment
   limits, then start Caddy and Osiris. Confirm both containers are running.
3. Run `check-deployment.mjs` against the real HTTPS origin from an independent
   machine. It checks identity, native readiness, CORS, authentication and caching.
4. Complete OpenAI authorization and one explicitly consented in-page result,
   then Stop and Disconnect, as described in
   [native acceptance](osiris-native-acceptance.md#activate-the-private-pilot).
5. Update the public service address only after that evidence is available.

Droplets continue billing until deleted. Preserve useful diagnostics first and
obtain owner confirmation before deleting the test host. Never publish its keys
or pilot code and never substitute an operator-funded model API key.

References: [DigitalOcean console](https://docs.digitalocean.com/products/droplets/how-to/connect-with-console/),
[Ubuntu package management](https://documentation.ubuntu.com/server/how-to/software/package-management/).
