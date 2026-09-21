# Osiris native subscription integration

Date: 2026-09-21. Baseline: b28c391ba7fa403e159907090e8acfc26c63a790.

## Product contract

The visitor stays in the current dgallemore.com project. Osiris adds server-owned project instructions and an explicitly reviewed context snapshot, invokes an officially supported account-backed runtime, and streams the answer into that page. Initial provider authorization happens on the provider's own domain; ordinary questions never open a provider tab. Connecting does not generate text. Missing infrastructure, expired credentials, unavailable models, or limits must not silently switch to a chat app, another provider, or paid API billing.

Osiris is the application/agent layer, not a custom-trained model or an import of ChatGPT memory. The public MCP connector remains a separate, explicitly chosen way to use project tools inside an AI host.

## Verified baseline and limits

- The static UI and Codex App Server bridge exist; the public subscriptionUrl is empty. The MCP Worker is not that runtime.
- The runtime uses ChatGPT-managed device authorization, ephemeral credentials, bounded context, no ambient API keys, and streamed responses. Automated provider doubles are not evidence of a live account completion.
- The shared panel still defaults to a handoff unless a runtime has already been selected. Some project launchers force handoff even after sign-in. These violate the native interaction contract.
- Health currently identifies an HTTP process, not a verified provider installation or successful account inference.
- The private pilot is not production multi-tenant isolation. No new paid hosting or public endpoint may be provisioned merely to make the UI look connected.

## Implementation sequence

### 1. Native connection and routing

Make the shared project panel the default, independent of whether a connection is ready. Show honest setup/reachability/account/model states in place. Keep chat-app handoff explicit. Retain the selected project and draft question through sign-in; never submit automatically. Update Family Business and affected entry points to use the same route. Preserve deterministic game behavior and the deployed MCP tools.

### 2. Transport and session hardening

Validate persisted session metadata and expiry; bind all operations and responses to the originating endpoint/session. Abort active work when disconnecting or changing connections. Prevent stale async responses from updating a replacement session. Make streaming parsing correct for UTF-8 chunk boundaries, CRLF/LF, comments, multiline data, malformed/oversized streams, terminal events, and cancellation. Preserve explicit consent, current model selection, no retries, and no API fallback.

Review the backend for concurrent requests, startup/cancellation cleanup, request limits, credential filtering, account/session isolation, and turn interruption. Add regression tests for each material fix instead of relying on prose assurances.

### 3. Deployment readiness

Provide a reproducible runtime source bundle and a non-generating readiness check. Distinguish process health, signed-out runtime readiness, user authentication, and a real model response. Keep subscriptionUrl empty until an actual HTTPS host passes the checks; provide deployment/rollback steps and an explicit live-acceptance checklist. Never claim that passing mocks activates a subscription or authorizes broad hosted redistribution.

### 4. Verification and release

Run existing runtime, static browser, project, and product-guardrail tests. Add adversarial transport/session tests and a native UI regression for Family Business. Run the pinned real Codex binary signed out in CI and the restricted container. Inspect the final diff and CI conclusions. Record actual results separately from required human/provider acceptance. Open a reviewable PR; do not promote a failing or unverified deployment.

## Provider boundary

This change completes and hardens the existing ChatGPT/Codex pilot first. Copilot is a separate adapter, not a way to spend a ChatGPT subscription. Its SDK documents per-user GitHub OAuth and explicitly disabled ambient authentication; a later adapter needs its own registered OAuth application, runtime integration, capability tests, and entitlement acceptance. Do not display Copilot or Claude as connected based on a ChatGPT login. Do not collect browser cookies or repurpose subscription tokens as API keys.

Primary references checked September 21, 2026:
- https://learn.chatgpt.com/docs/app-server (ChatGPT-managed device authorization; account/model/turn protocol).
- https://github.com/github/copilot-sdk/blob/main/docs/auth/authenticate.md (per-user OAuth, SaaS and ambient-auth controls).
- https://code.claude.com/docs/en/legal-and-compliance (third-party login and credential restrictions).

Technical documentation is not a guarantee of an end user's plan entitlement or approval for every public hosting arrangement.

## Acceptance matrix

| Scenario | Required result |
| --- | --- |
| No runtime configured | Same-page setup, no chat-app redirect or model call |
| Wrong service / unavailable binary | Clear readiness error before provider sign-in |
| Sign-in pending / denied / expired | Current project retained, no generation |
| Successful sign-in | Real account and provider model catalogue; explicit send remains necessary |
| Context or model changed | Consent cleared |
| Two simultaneous sends | One active turn, no hidden retry |
| Disconnect during connection or generation | Old session/stream cannot affect the next connection |
| Broken or oversized stream | Bounded failure; no fabricated completed answer |
| Family Business | Selected episode only; no hidden state, score changes, or forced handoff |
| Parcel | Existing research contract and reviewed import preserved |
| Provider limit or error | No fallback to operator credentials or API balance |
| Server restart | Ephemeral sessions invalid; clear reconnect path |
| Public release | Real HTTPS deployment and user-controlled sign-in/completion accepted separately |

## Operational completion criteria

Code/CI completion and live deployment are separate milestones. A trusted persistent host, private admission code, and an eligible user's own OpenAI authorization are required for the live pilot. The repository connection alone does not grant access to a host or authorize infrastructure spend. Broad public access additionally requires stronger per-user isolation and provider deployment review.
