# Bring your own AI to Ballzatram

Implemented in `/tools/ai/` and the shared native Osiris panel, with the same assets served by the Next.js app through its existing public-directory symlinks. Bill sections, saved portfolio/scenario/supply-and-demand results, report drafts, and the Next.js guide now open the panel inside the project.

**ChatGPT subscription connection is a private pilot requiring a separately hosted service.** GitHub Pages publishes the interface but cannot run Codex. The public service address is empty until a real host is configured and accepted. Hosting costs remain separate from provider inference allowance.

## What visitors can do

| Choice | Where the answer appears | Who pays for inference |
| --- | --- | --- |
| Connect ChatGPT — private pilot | The current project or Osiris workspace through the hosted Codex runtime | Visitor's ChatGPT plan's Codex allowance |
| Copy to a chat app | Visitor manually pastes into ChatGPT, Claude, or Gemini | The visitor's chat plan and its limits apply |
| Connect my models | On Ballzatram, using OpenRouter account linking or an OpenRouter key | Visitor's OpenRouter credits; separate from chat subscriptions |
| Free local preview | A fixed, clearly labeled checklist on Ballzatram | Nobody; no network or model call |
| Advanced direct API | On Ballzatram through a relay the visitor operates or trusts | The owner of the visitor-supplied OpenAI/Anthropic API key |

The ChatGPT account is the regular user account; Codex is the embedded runtime using its documented subscription authentication path. It does not import ChatGPT history, memory, custom GPTs, or every ChatGPT tool. There is no Claude subscription-login adapter in this release. Copilot's SDK is a potential separate subscription adapter. OpenRouter explicitly supports third-party PKCE account linking. Manual handoff opens a bare chat URL; results do not sync back.

An Osiris MCP app/plugin inside a provider's own product remains a separate possible workflow. The new native panel instead sends selected context to the embedded Codex runtime. It has no application action tools and does not edit records or persist a conversation.

## ChatGPT account connection

1. The operator starts the [private runtime](../osiris-runtime/README.md) and supplies its HTTPS address and an invitation code.
2. The visitor opens **Connect ChatGPT**, enters those details, and receives a one-time OpenAI device code. No prompt is sent.
3. The visitor signs in directly on OpenAI's verification page, returns to Ballzatram, and chooses a model available to that account. Device-code login must be enabled or allowed by their workspace.
4. The project panel shows one selected section, saved run, or workflow context. The visitor reviews it and explicitly sends their question. Plain-text responses stream into that panel.

Connection, model-list, and plan-limit checks do not request generation. Each question starts a fresh ephemeral thread. The service supplies feature instructions from `assets/ai-features.js`; the [project inventory](ai-project-configuration.md) distinguishes these bounded adapters from projects needing deeper design.

## OpenRouter account connection

1. Choose **Connect my models → Connect OpenRouter**.
2. Authorize on OpenRouter's own page, then return to Ballzatram in the same tab.
3. Load/select a current text model. Prices are displayed from the provider catalogue. The free-only filter never switches to a paid model if the current selection disappears.
4. Review the question, selected context, and billing consent. Sending is explicit; connecting, loading models, and checking an account never generate text.

OAuth uses a cryptographically random 256-bit verifier, S256 challenge, and a separate callback nonce. The pending flow expires after ten minutes, is bound to the originating tab and callback, and is consumed once. Codes and state are removed from the URL before exchange. The callback exchanges a code only after verifying the pending flow; unsolicited, stale, or mismatched callbacks do not trigger a network call. There is no client secret or operator API key.

## Storage and data flow

- `localStorage` contains only allowlisted mode/model/provider/relay preferences. Credentials are never stored in these preferences.
- Subscription connections store only a service token and minimal account details in tab storage. OpenAI credentials stay in a separate temporary Codex process per session, with ephemeral credential storage and no parent auth inheritance. The service operator controls that runtime and can access data it processes; use a trusted operator. Exact-origin checks and private admission codes gate this pilot, but broader public hosting requires verified users and isolated per-user workers.
- Subscription disconnect clears the local token and asks the service to terminate and erase the runtime. An unreachable service expires after 30 idle minutes or four hours total. Restarting the server requires a new sign-in. No transcript database or imported ChatGPT memory is provided; OpenAI's own retention rules still apply.
- OpenRouter or native API credentials use tab-scoped `sessionStorage` with a four-hour application expiry. Browser session restoration can preserve storage until that expiry. Disconnect clears the local key; remote revocation is available in the provider's account settings. Keys are readable by JavaScript on this origin, so only trusted first-party scripts should run on credential-using pages. There are no third-party scripts on the AI workspace, and it has a restrictive script policy and no-referrer policy.
- If tab storage is blocked, manually entered keys work in page memory only. PKCE fails before redirect because it cannot preserve its verifier safely across navigation.
- Native credentials are bound to the chosen provider and exact relay origin. A changed destination cannot reuse a stored credential.
- Prepared questions use tab storage for up to one hour. Only explicitly selected tool context is transferred. Bills include the chosen section/source, not a full notebook. Lab requests include one saved run, not every lab. Named credential fields are removed from context before preview and sending.
- Handoff prompts and responses use plain text, never HTML insertion. Open links use fixed chat destinations with no prompt in the query string. Clipboard denial leaves selectable text available.
- OpenRouter calls go directly to `openrouter.ai`; OpenRouter and its selected inference provider receive the request under the visitor's account/settings. Advanced native calls pass through the entered relay. Provider account retention/billing rules apply.
- The app never automatically retries generation or switches model/provider. Codex may recover its own connections. Subscription response length is a preference, not a hard token cap. Cancel/timeout cannot guarantee that a provider has stopped consuming allowance for already-started work.

## Preventing an operator token bill

The browser has no operator model credential or default shared relay. Old bridge settings are not used. The optional Worker takes a visitor key on `/v2/assist`, ignores all operator model secrets, and retires `/v1/assist` on deployment. Deploying GitHub Pages alone does not update an already deployed Worker.

The subscription service accepts only ChatGPT-authenticated sessions, starts every child signed out, and strips parent API keys and auth configuration. It does not use an operator model account or fall back to existing API paths. The private pilot has per-session request limits, a 150-second turn deadline, and disabled action tools; see its deployment guide for isolation limits and operations.

Backend agent/parcel endpoints also stop inferring merely because `OPENAI_API_KEY` exists. They use deterministic fallback unless the request explicitly supplies a user OpenAI API key in an Authorization header. That key is request-scoped, is passed explicitly to the SDK, and never enters conversation history. Responses requests disable storage and SDK retries and have output/timeout limits. The parcel workflow can make two bounded model calls when explicitly user-funded. The Next.js guide opens the shared panel in place with workflow metadata only; it cannot automatically see charts or uploads and does not issue paid backend chat requests. Parcel research, game opponents, and media rendering have not been converted into subscription workflows.

## Deploy and test

GitHub Pages publishes the workspace and shared client through the existing manifest and workflow. No new deployment credentials are needed for OpenRouter, manual handoff, or local preview. Direct provider keys require deploying the optional relay; see `ai-bridge/README.md`. The user must complete provider authorization themselves. No private account was linked or charged during development.

ChatGPT subscription access needs the [separate runtime and TLS setup](../osiris-runtime/README.md). Node/Docker configuration and an acceptance checklist are provided. The Docker recipe has not been executed in this workspace. The public frontend intentionally has no service address preconfigured.

Next.js already links `frontend/public/tools` and `frontend/public/assets` to the canonical source directories. Both hosts serve the same workspace without copying or rewriting source files during a build. The home link uses `/`, the program directory is shared, and Privacy links to the canonical public policy. On a separate Next.js origin, connections are separate and must be made on that origin.

Validation: runtime HTTP/RPC tests, the real signed-out Codex protocol/configuration smoke check, `npm run test:static` in `frontend`, `npm test` in `tools/observatory`, frontend typecheck/build, backend tests, and published-link/product guardrails. Sign-in, inference, and relay cases use mocks; tests do not buy credits or invoke paid models. Hosted subscription sign-in and a first real answer remain user-account acceptance steps before the connection is called operational.

## Official references checked September 12, 2026

- [OpenRouter PKCE account linking](https://openrouter.ai/docs/guides/overview/auth/oauth)
- [OpenRouter API reference](https://openrouter.ai/docs/api_reference/overview)
- [OpenRouter model catalogue](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)
- [OpenAI client authentication](https://learn.chatgpt.com/docs/auth)
- [Codex App Server embedding](https://learn.chatgpt.com/docs/app-server)
- [Copilot SDK authentication](https://github.com/github/copilot-sdk/blob/main/docs/auth/authenticate.md)
- [OpenAI plugin authentication](https://developers.openai.com/plugins/build/auth)
- [Anthropic authentication and credential restrictions](https://code.claude.com/docs/en/legal-and-compliance)
