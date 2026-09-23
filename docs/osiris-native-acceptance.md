# Native Osiris: implementation and live acceptance

## What this implementation does

The shared panel opens inside the current project even without a configured runtime. It explains the missing connection rather than silently handing the visitor to ChatGPT. Family Business uses the same native panel; its optional handoff can be selected explicitly and returns to the native panel with the draft intact. The AI workspace also defaults to native mode. Previously saved explicit OpenRouter, API, demo, and handoff choices remain available in the workspace.

The current native adapter is ChatGPT through the pinned Codex App Server. This is not a universal consumer-subscription API. Copilot and Claude are not represented as connected providers. The public MCP connector is unchanged and is a separate delivery channel.

Questions require explicit consent. The selected project snapshot and server-owned Osiris instructions are used; no unrelated browser records or hidden game state are collected. No operator model key, generation retry, API fallback, or automatic project writes are added. The existing private pilot still uses ephemeral sessions (four hours maximum, thirty minutes idle), not permanent provider login or cross-device memory.

## Reliability changes

- Persisted service/session metadata is validated, bounded, and sanitized. A session belongs to one exact runtime origin and browser-origin admission. Changing service or disconnecting invalidates old requests and best-effort deletes the old remote session.
- Late account/login/stream responses cannot restore a disconnected session. One browser turn is allowed at a time; changing its model aborts it. Provider protocol cleanup finishes before the native session becomes reusable.
- SSE handles split UTF-8, LF/CRLF/CR, comments, multiline data, partial packets, malformed data, byte/event/output limits, and missing terminal events. A completed response must identify the selected model and subscription billing; untrusted text remains text.
- The HTTP runtime rechecks session revocation after asynchronous account validation. Credential-only project context is rejected after sanitization.
- Root AI assets are canonical. Next.js predev/prebuild syncs an explicit allowlist into its public tree, preventing the second frontend from serving stale assistant code. Family Business's service-worker cache is versioned for this change; it still never caches account/assistant requests.

## Four distinct readiness levels

| Level | Evidence | Does not prove |
| --- | --- | --- |
| HTTP process health | GET /health | Native binary installed, provider access, inference |
| Signed-out runtime readiness | GET /ready; cached and deduplicated real native-process probe | User entitlement or a live model completion |
| Account/model connection | User authorizes OpenAI; account and model catalogue return | Successful inference for this project |
| Live acceptance | User explicitly sends a selected project snapshot; receives an in-page answer; tests Stop and Disconnect | Broad public/multi-tenant deployment approval |

Health and readiness always report `inferenceVerified: false`. A successful model run is session-specific and is not turned into a global health claim. The public `subscriptionUrl` remains empty until a real service is activated. No hosting account, DNS record, paid plan, or provider authorization is created by a code merge.

## Automated validation

The native CI workflow runs adversarial transport and runtime contracts, the pinned native binary signed out, and a real loopback HTTP deployment check. Browser acceptance uses desktop Chromium and a mobile WebKit viewport with the actual HTTP server but a deliberately synthetic provider. Browser external network requests are blocked; these tests cannot establish provider entitlement or consume model allowance. The test provider is excluded from the runtime image and deployment bundle.

The existing PR workflow continues to check the restricted Docker image, static UI/game regressions, backend tests, frontend types/build, and product guardrails. The MCP workflow remains separate. CI results, rather than this document, are the authoritative pass/fail record for a commit.

## Activate the private pilot

1. Use a trusted existing Linux host with persistent Docker processes and an HTTPS hostname. Follow `osiris-runtime/README.md` and its private environment template. Infrastructure billing is separate from model allowance; do not purchase or upgrade hosting implicitly.
2. Build the exact reviewed revision. Run `docker compose run --rm --no-deps osiris node scripts/check-runtime.mjs` and `docker compose run --rm --no-deps osiris node scripts/check-readiness.mjs`. Start with `docker compose up -d`.
3. From an environment with Node 20+, run `node osiris-runtime/scripts/check-deployment.mjs https://YOUR_RUNTIME_ORIGIN https://dgallemore.com`. This verifies service identity, signed-out readiness, browser CORS/preflight, required authentication, rejected origins, and no-store headers. It never takes a pilot code, provider token, or question.
4. Enter that origin and the operator-issued admission code in the native panel. Authorize only on OpenAI's displayed, allowlisted domain. Keep the code private; do not paste passwords or provider tokens into the site. An initial authorization window is expected; ordinary questions do not open an AI app.
5. Select a model actually returned by that account. Review a short Family Business snapshot or workspace question, explicitly consent, and send. Confirm the answer streams in place. Verify provider allowance attribution in that user's account. For Parcel, separately confirm source-linked research and reviewed import.
6. Stop a running response, send a new explicitly requested question, then disconnect. Verify old requests cannot resume, credentials expire, and reload/restart requires the expected reconnection. Stopping may still consume allowance for work already started.
7. Record date, tested commit, browser/device, service, and observed result without passwords/tokens/prompts in the public record. Only then set the public `assets/ai-config.js` subscription URL. Repeat for each actual website origin; `www` is distinct.

No real user login or model completion is claimed by these automated checks. Public multi-user access additionally requires verified user identities, per-user worker/container isolation, operational abuse controls, and confirmation of provider support for the deployment arrangement. Those are separate from this invitation-only pilot.

## Rollback

Restore the previous reviewed code revision and recreate the runtime service; existing sessions end and users sign in again. Remove the public subscription URL to stop advertising native activation, while leaving the MCP URL unchanged. `docker compose down` stops the host service. Never roll back by adding an operator API key or silently switching users to paid inference.
