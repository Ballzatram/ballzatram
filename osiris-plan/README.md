# Osiris — use your ChatGPT plan

This is the gated, direct-API replacement for the hosted Codex process used by the [private runtime pilot](../osiris-runtime/README.md). The first supported website workflow is **Beckets Labyrinth**. Visitors authorize OpenAI once, choose an available model, review their topic, and generate a countdown inside the website using their own eligible ChatGPT allowance.

**Implemented, not activated.** Automated checks use synthetic OpenAI responses. No hosted client approval, production deployment, real account authorization, or real model answer is established by this code. `assets/ai-config.js` keeps `chatgptPlanUrl` empty, and the Worker defaults to `HOSTED_PLAN_ACCESS=disabled`.

## Hosting decision

| Component | Host | Responsibility |
| --- | --- | --- |
| Website and Beckets UI | Existing GitHub Pages | Topic, consent, model choice, in-page result |
| New connection service | Cloudflare Worker | Registered OAuth callback, origin checks, direct API requests |
| Each browser session | SQLite Durable Object | Encrypted credentials, serialized refresh, expiry and cancellation |
| Model inference | OpenAI Responses API | The visitor's approved ChatGPT plan usage |
| Existing MCP tools | Existing separate Worker | Deterministic tools inside compatible AI hosts |

**DigitalOcean is not required for this architecture.** It runs no Codex binary, Docker container, per-user OS process, or always-on VM. Cloudflare still supplies backend infrastructure; this is not a backend-free implementation. SQLite Durable Objects are available on Cloudflare's Free and Paid plans, with different limits. Verify account capacity and current [pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) before activation; zero cost at arbitrary traffic is not promised. This change does not delete or cancel an existing droplet or migrate unrelated services.

## OpenAI approval is the first dependency

Request a registered hosted client through [OpenAI's client-ID request process](https://developers.openai.com/siwc/request-client-id). **Identity sign-in approval alone does not grant hosted ChatGPT plan usage.** Obtain confirmation that this website may use the direct inference scopes, and reconcile the approved contract with this adapter before activation.

The public open-source token-sharing example's `dynamic_agent_client` and localhost callback are for eligible local applications. They are deliberately not used by this hosted backend. Setting the approval flag is an operator assertion; it cannot create OpenAI entitlement.

Supply these details when requesting access:

- Product: Osiris / Ballzatram; website `https://dgallemore.com`.
- First workflow: bounded, user-requested text/JSON countdowns in Beckets Labyrinth. No background model calls, autonomous actions, hosted tools, or operator-funded fallback.
- Proposed backend: `https://ai.dgallemore.com`, with exact callback `https://ai.dgallemore.com/auth/callback`. Reserve or change this hostname **before** registering the callback.
- Authorization Code + S256 PKCE + OIDC nonce; server-held encrypted tokens; account models from `GET /v1/models`; streaming `POST /v1/responses` with `store:false`.
- Requested scopes: `openid profile email offline_access resource.invoke chatgpt.tokens.use.direct`, subject to OpenAI approval. The adapter requires `openid`, `offline_access`, `resource.invoke`, and the direct plan scope. Confirm the resource audience `https://api.openai.com/v1`, supported token authentication method, refresh rotation and revocation behavior.
- Registered client ID (`oaiapp_…`); approved token endpoint method (`none` or `client_secret_basic`), and client secret if that method requires one.

If OpenAI supplies a different hosted contract, update and test the adapter. Do not substitute local-client credentials or treat a successful identity-only login as inference approval.

## Configuration and activation

Use Node 22.17 or newer. The service uses the repository's existing Cloudflare approach, but is a **separate Worker** from the MCP service. Its session binding and secrets must not be added to the model-free MCP Worker.

| Setting | Purpose |
| --- | --- |
| `HOSTED_PLAN_ACCESS` | Leave `disabled` until hosted plan access is confirmed; then `approved` |
| `HOSTED_APPROVAL_REFERENCE` | Non-secret marker identifying the operator's retained approval record; not proof issued by the provider |
| `PUBLIC_ORIGIN` | Exact HTTPS backend origin, proposed `https://ai.dgallemore.com` |
| `SITE_ORIGIN` | One exact canonical site origin, currently `https://dgallemore.com` |
| `OPENAI_CLIENT_ID` | Approved hosted client ID |
| `OPENAI_TOKEN_AUTH_METHOD` | Approved `none` or `client_secret_basic`; no automatic guessing |
| `OPENAI_PLAN_SCOPES` | Exact approved scopes, including required direct usage permission |
| `TOKEN_ENCRYPTION_KEY` | Worker secret: 32 random bytes encoded as 43-character unpadded base64url |
| `OPENAI_CLIENT_SECRET` | Worker secret only if the approved client uses `client_secret_basic` |

Keep the backend on the site's domain or a subdomain of it. This allows secure same-site cookies on mobile browsers. A `workers.dev` address on a different site is intentionally rejected. All public browser URLs and the OAuth callback must use HTTPS. Only the canonical site origin is permitted; add a canonical redirect for other website hostnames rather than weakening CORS.

After approval, configure values in `wrangler.jsonc`, add the custom-domain route below, and install the secrets using Wrangler's secure input. Do not put secret values into git, the static site, a PR, or chat.

```jsonc
"routes": [{ "pattern": "ai.dgallemore.com", "custom_domain": true }]
```

The hostname must be available in an active Cloudflare-managed zone in the selected account, with no existing CNAME at that hostname. See [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/). If DNS is hosted elsewhere, decide the DNS arrangement before deployment. Keep the existing GitHub Pages records intact. `workers_dev` and preview URLs remain disabled.

From the repository root:

```sh
npm ci --prefix osiris-plan
cd osiris-plan
# Create and retain a new encryption key in the operator's secret manager.
# Enter its value at Wrangler's prompt; do not reuse a provider credential.
npx wrangler secret put TOKEN_ENCRYPTION_KEY
# Only for an approved confidential client:
npx wrangler secret put OPENAI_CLIENT_SECRET
```

The encryption key has no default. A local operator can generate one without a third-party service using `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"`. Store it securely and avoid recording it in terminal transcripts.

Deploy the configured Worker only after reviewing the account, domain, approval and secrets. The committed CI workflow **only verifies**; it does not deploy. `/health` reports configuration readiness with `inferenceVerified:false`; it is never evidence that an account can generate.

Before publishing a browser URL, run the live acceptance below on a controlled website build. Then set `chatgptPlanUrl` in [the public config](../assets/ai-config.js) to the backend origin, run `node scripts/sync-osiris-assets.cjs`, and publish through the existing Pages review/deployment flow. This setting takes priority over the old `subscriptionUrl` and saved legacy endpoints. Visitors do not enter a service address, pilot code, API key, or token.

## Behavior and boundaries

- Sign-in uses a ten-minute, browser-bound, single-use transaction with state, nonce, PKCE and an exact callback. Signed ID tokens are verified for issuer, client audience, expiry and nonce. Site identities are not auto-linked by email.
- The browser receives an HttpOnly, Secure, SameSite=Lax, host-only session cookie. OAuth tokens remain AES-GCM encrypted in the session's Durable Object, bound to that object's ID. Browser-readable account metadata and CSRF values remain in memory, not browser storage. Stored preferences contain only the endpoint and selected model.
- Identity-only consent stays visibly separate from plan permission. Model discovery and generation are disabled if direct plan usage was denied. Page load, service checks, sign-in and model discovery never invoke a model.
- Sessions expire after four hours or thirty idle minutes. Pending sign-ins expire after ten minutes. Refresh is serialized within a session and saves rotated credentials before reuse. Alarms remove expired records; disconnect clears local credentials even if remote revocation fails, and the UI directs the visitor to ChatGPT settings if it cannot confirm revocation.
- Exact-origin CORS and CSRF checks protect authenticated mutations. Return locations stay on the configured site and discard query strings/fragments. No generic API proxy, arbitrary provider URL, tool execution, operator API key or automatic model retry exists.
- The initial server and client allowlist enables only `beckets-labyrinth`. Its feature instructions come from the shared registry. Context and question size are bounded, and named credential fields are removed. Ordinary text can still contain private information: visitors review it before sending. ChatGPT history and memories are not imported.
- Inference accepts only an account-discovered model and explicit consent. It uses `store:false`, `stream:true`, `instructions`, and an `input` array. Unsupported preview parameters and hosted tools are omitted. Only a valid `response.completed` ends successfully; truncated streams, model mismatches, and usage failures cannot become saved countdowns. Beckets separately validates its ten-item output schema.
- One active request per session, thirty generation attempts per hour, twelve sign-in starts per IP hash per ten minutes, 150-second server turn timeout, and bounded streams limit this rollout. These are coarse limits, not a complete public-abuse system; new sessions reset per-session quotas. Review Cloudflare traffic controls and capacity before widening availability.
- Stop/disconnect abort upstream requests; completed provider work may still consume allowance. Usage limits lead to **Manage usage**, not a switch to another payer. Other explicitly selected legacy API modes remain separate.

Observability is off in the committed Worker config. Application errors do not log tokens, prompts, account details or OAuth callback codes. If adding logs or edge analytics, redact authorization headers, cookies and callback queries before enabling them.

For rollback, clear `chatgptPlanUrl` and republish the static config to stop new website connections. Existing service sessions still need to be disconnected/revoked or allowed to expire before disabling the Worker. Keep the old encryption key until those sessions have been retired. Replacing it makes old records unreadable and prevents their refresh-token revocation; rotate only after sessions drain, or implement an explicit key migration. The old Codex pilot is retained for inspection, but rollback must not silently activate an unaccepted runtime.

## Verification

```sh
npm ci --prefix osiris-plan
npm ci --prefix frontend --ignore-scripts
npm test --prefix osiris-plan
npm run test:edge --prefix osiris-plan
npm run check:worker --prefix osiris-plan
node --test scripts/ai.test.cjs scripts/subscription-transport.test.cjs tools/beckets-labyrinth/core.test.cjs
python -m pip install playwright==1.57.0
python -m playwright install --with-deps chromium webkit
python osiris-plan/test/browser.py
```

The edge test uses real workerd and SQLite Durable Objects with a synthetic OIDC provider and Responses stream. The browser test uses real Chromium and WebKit with a synthetic service; it checks mobile layout, topic preservation across authorization, no automatic generation, fresh consent, in-page output, usage failure, and denied plan permission. `BROWSER_ENGINES=chromium` and `CHROMIUM_PATH` allow an explicit local Chromium installation. Screenshots are CI artifacts, not site files.

Live acceptance remains required, with a consenting eligible test account:

1. Confirm the registered callback, approved scopes/client method, and actual deployment origins against the hosted approval.
2. On desktop and a real iPhone/Safari, return from authorization with the topic preserved. Identity-only consent must leave generation disabled; accepting plan usage should show the account's actual model list. Opening or connecting must consume no inference.
3. Explicitly generate one bounded countdown, verify it appears in the page, inspect the real response's model/terminal event, and confirm usage attribution in [ChatGPT Manage usage](https://chatgpt.com/settings/usage). Do not infer attribution from a local label.
4. Test a second account for isolation; test plan denial, revoked/expired authorization, unavailable models, cancellation, limits, reconnect and disconnect. Confirm refresh rotation and remote revocation with the actual approved client.
5. Record results without tokens, personal prompts or authorization codes. Activate the public config only when these checks pass. Expand to another project only with its own scoped acceptance.

Primary references checked October 2, 2026: [hosted website sign-in](https://developers.openai.com/siwc/website), [client approval](https://developers.openai.com/siwc/request-client-id), [models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), [preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations), and [Durable Object concurrency guidance](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/). The token-sharing references describe the public local preview; hosted permission must be confirmed separately.
