# Osiris subscription connection — private pilot

This service embeds the pinned official Codex App Server and accepts **ChatGPT device-code sign-in**. Ballzatram supplies the interface and selected project context. Each visitor supplies their own ChatGPT account; responses stream back into the project. There is no operator API key, shared provider account, or automatic API fallback.

The static interface is implemented. **A separate running service and user-completed sign-in are required to activate it.** GitHub Pages cannot run this process. The repository does not provision a server, configure DNS, or activate an account when published. Hosting still has infrastructure costs even when inference uses a visitor's subscription.

## Pilot boundaries

- Codex is the embedded runtime; the account is the visitor's normal ChatGPT account with eligible Codex access. Usage counts against that plan's Codex allowance. This is not an import of ChatGPT history, memory, custom GPTs, or all ChatGPT tools.
- Text explanations use fresh ephemeral threads. Shell, browser, image, plugin, file-viewing, memory, and multi-agent feature flags are disabled. The service rejects action approvals and exposes no generic RPC endpoint. It does not change project data.
- This is an invitation-only technical pilot. It uses separate processes and temporary homes but not a separate operating-system identity/container for every visitor. Before a broad multi-user release, add verified site identities, isolated per-user workers, operational abuse controls, and confirm provider deployment support. The official App Server documentation identifies deployment surfaces that are still experimental.
- No app-level generation retries or model/provider switching. Codex may perform its own connection recovery. Response length is an instruction, not a hard token cap. Cancel, timeout, or disconnect may still consume allowance for work already started.
- A ChatGPT connection does not enable Claude or Copilot. Their supported embedding/authentication paths need separate adapters and review; never paste their subscription tokens into the API-key path.

## Run on a private host

Use a host you control that supports Docker, outbound HTTPS to OpenAI, persistent processes, and HTTPS requests lasting at least three minutes. Point a dedicated DNS name at that host and allow inbound ports 80/443. The included Compose file runs Caddy for TLS and keeps the Node service off public ports.

From `osiris-runtime/` on that host:

```sh
cp .env.example .env
chmod 600 .env
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Edit `.env`: set `OSIRIS_DOMAIN` to the real hostname, `OSIRIS_ALLOWED_ORIGINS` to the exact website origin(s), and `OSIRIS_PILOT_CODES` to the generated code. Give each invited participant a distinct code. Keep the code private; it is an admission credential for your host, not a ChatGPT password. Do not place it in public frontend configuration, source control, URLs, or logs.

```sh
docker compose config --quiet
docker compose build
docker compose run --rm --no-deps osiris node scripts/check-runtime.mjs
docker compose up -d
```

The smoke check must pass **inside the deployment environment** before inviting anyone. Docker is not installed in the development workspace, so the container recipe itself has not been executed here. The same pinned binary and configuration passed the local Node smoke check without signing in or generating an answer.

Verify `https://YOUR_HOST/health` returns protocol `3`, service `osiris-subscription`, and billing `user-chatgpt-only`. Health verifies HTTP availability, not account access or generation. Never expose Codex's own app-server port, mount a personal Codex home, inject provider keys, or enable request-body/Authorization logging at a reverse proxy.

Then open **Connect ChatGPT** in Ballzatram and enter the service's HTTPS origin and your private pilot code. After successful hosting acceptance, the site's public default address may be set in `assets/ai-config.js`; it contains only the service URL. For a separate Next.js origin, include that exact origin on the service and connect on that origin. Its model and endpoint preferences are independent of the static site.

## Local development

Node 20 or later is required. From the repository root:

```sh
npm ci --prefix osiris-runtime --ignore-scripts
npm test --prefix osiris-runtime
npm run check:runtime --prefix osiris-runtime
```

Run a local static server in one terminal:

```sh
python -m http.server 8080 --bind 127.0.0.1
```

In another terminal, set a development-only admission code and the matching local origin:

```sh
export OSIRIS_ALLOWED_ORIGINS=http://127.0.0.1:8080
export OSIRIS_PILOT_CODES=$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))")
npm start --prefix osiris-runtime
```

Use `http://127.0.0.1:8080/tools/ai/index.html` and service `http://127.0.0.1:8788`. Retrieve your generated code locally and enter it in the connection panel. Only localhost may use HTTP. For local use, keep the service bound to loopback; `OSIRIS_BIND_HOST` defaults to `127.0.0.1` and `PORT` to `8788`.

## Sign-in and acceptance

1. Connect to your service. It starts an empty Codex process and asks OpenAI for a device code. No question is sent.
2. Open the fixed OpenAI verification link, enter the displayed one-time code, and sign in directly with OpenAI. Device-code login must be enabled in ChatGPT security settings or allowed by the workspace administrator.
3. Return to Ballzatram. Confirm the account and select a model from its current catalogue. Reload models or check plan limits without generating text.
4. Open a configured project, select a source or saved run, review the context, and explicitly send one short question. Confirm that the response stays on the project page and the request uses the signed-in account's allowance.
5. Stop an in-progress answer, then disconnect. Confirm the session is rejected afterward. Check provider activity if a request had already started.

Automated tests simulate sign-in and inference. The runtime smoke check uses the real Codex `0.154.0` binary but stays signed out. **No live subscription sign-in or model completion was performed during development.** User-account acceptance above remains required.

## Session and data handling

Every service session has a random bearer token bound to its exact browser origin. Browser storage holds only that service token and minimal account metadata, never OpenAI OAuth credentials. Preferences contain only the service origin and selected model. Tab storage is readable by scripts on the same origin; keep credential-using pages limited to trusted scripts. Blocked storage falls back to page memory.

Each visitor gets a fresh temporary workspace and Codex home. The child inherits no provider keys or parent auth configuration. `forced_login_method = "chatgpt"` and `cli_auth_credentials_store = "ephemeral"` are enforced; API-authenticated sessions are rejected. The operator necessarily controls the runtime and can access data it processes, so use a trusted operator. Selected questions/context go through that host to OpenAI under the user's provider settings and retention rules.

Credentials and session mappings are temporary. Disconnect attempts provider logout, terminates the process, and erases its temporary directory. Sessions expire after 30 minutes of inactivity or four hours total. Server shutdown ends all sessions; a restart requires signing in again. With the included container, temporary files live on a nonpersistent memory filesystem. A native-process crash or hard host termination can leave temporary directories; remove stale `osiris-session-*` directories only after confirming no runtime is using them. No transcript database is implemented.

Current limits: eight simultaneous sessions total, two per access code, one active question per session, 30 questions per session per hour, 4,000 prompt characters, 24,000 context characters, and a 150-second turn deadline. The exact-origin check supplements admission codes; it is not user authentication by itself. Behind Caddy, the connection-attempt limiter conservatively groups proxied requests under the proxy address.

## Project configuration and operations

`assets/ai-features.js` is the common project registry for the runtime, panel, and [project setup inventory](../docs/ai-project-configuration.md). The service owns feature instructions and rejects disabled feature IDs, missing consent, oversized context, and arbitrary RPC/action requests. Named secret fields are filtered on both client and server; review remains necessary for secrets embedded in ordinary text.

To change pilot codes or origin access, edit the host's private environment and recreate the service with `docker compose up -d --force-recreate osiris`. This ends active sessions. `docker compose down` stops the service; TLS certificate volumes may remain. Keep dependencies pinned, review protocol changes, and rerun the real-binary smoke check before upgrading Codex.

Official references checked September 12, 2026: [Codex App Server](https://learn.chatgpt.com/docs/app-server), [ChatGPT authentication and device-code setup](https://learn.chatgpt.com/docs/auth). Separate future adapters: [Copilot SDK authentication](https://github.com/github/copilot-sdk/blob/main/docs/auth/authenticate.md), [Claude Code authentication restrictions](https://code.claude.com/docs/en/legal-and-compliance).
