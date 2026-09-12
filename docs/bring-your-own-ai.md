# Bring your own AI to Ballzatram

Implemented in `/tools/ai/`, with the same workspace copied into the Next.js app at build/dev time. The homepage AI shortcut, saved lab context links, Congressional Accountability reading aid, and Next.js guide lead into it.

## What visitors can do

| Choice | Where the answer appears | Who pays for inference |
| --- | --- | --- |
| Use my subscription | Visitor copies the prepared prompt into ChatGPT, Claude, or Gemini | The visitor's chat plan and its limits apply |
| Connect my models | On Ballzatram, using OpenRouter account linking or an OpenRouter key | Visitor's OpenRouter credits; separate from chat subscriptions |
| Free local preview | A fixed, clearly labeled checklist on Ballzatram | Nobody; no network or model call |
| Advanced direct API | On Ballzatram through a relay the visitor operates or trusts | The owner of the visitor-supplied OpenAI/Anthropic API key |

ChatGPT/Claude subscription linking is not advertised as a generic website inference entitlement. OpenAI documents ChatGPT subscription sign-in for its clients, and Anthropic restricts third-party reuse of subscription credentials. OpenRouter explicitly supports third-party PKCE account linking. Handoff is manual: opening a chat URL sends no prompt, and results are not synchronized back into the site.

Longer term, an Osiris MCP app/plugin can let ChatGPT or Claude operate Ballzatram tools from within those products. That requires a hosted tool service and user authorization for private data/write operations. This release does not advertise an MCP connector or attempt to reuse provider subscription session tokens.

## Account connection

1. Choose **Connect my models → Connect OpenRouter**.
2. Authorize on OpenRouter's own page, then return to Ballzatram in the same tab.
3. Load/select a current text model. Prices are displayed from the provider catalogue. The free-only filter never switches to a paid model if the current selection disappears.
4. Review the question, selected context, and billing consent. Sending is explicit; connecting, loading models, and checking an account never generate text.

OAuth uses a cryptographically random 256-bit verifier, S256 challenge, and a separate callback nonce. The pending flow expires after ten minutes, is bound to the originating tab and callback, and is consumed once. Codes and state are removed from the URL before exchange. The callback exchanges a code only after verifying the pending flow; unsolicited, stale, or mismatched callbacks do not trigger a network call. There is no client secret or operator API key.

## Storage and data flow

- `localStorage` contains only allowlisted mode/model/provider/relay preferences. Credentials are never stored in these preferences.
- OpenRouter or native API credentials use tab-scoped `sessionStorage` with a four-hour application expiry. Browser session restoration can preserve storage until that expiry. Disconnect clears the local key; remote revocation is available in the provider's account settings. Keys are readable by JavaScript on this origin, so only trusted first-party scripts should run on credential-using pages. There are no third-party scripts on the AI workspace, and it has a restrictive script policy and no-referrer policy.
- If tab storage is blocked, manually entered keys work in page memory only. PKCE fails before redirect because it cannot preserve its verifier safely across navigation.
- Native credentials are bound to the chosen provider and exact relay origin. A changed destination cannot reuse a stored credential.
- Prepared questions use tab storage for up to one hour. Only explicitly selected tool context is transferred. Bills include the chosen section/source, not a full notebook. Lab requests include one saved run, not every lab. Named credential fields are removed from context before preview and sending.
- Handoff prompts and responses use plain text, never HTML insertion. Open links use fixed chat destinations with no prompt in the query string. Clipboard denial leaves selectable text available.
- OpenRouter calls go directly to `openrouter.ai`; OpenRouter and its selected inference provider receive the request under the visitor's account/settings. Advanced native calls pass through the entered relay. Provider account retention/billing rules apply.
- Requests are bounded and never automatically retried or switched to another model. Cancel/timeout cannot guarantee that a provider has stopped billing already-started work.

## Preventing an operator token bill

The browser has no operator model credential or default shared relay. Old bridge settings are not used. The optional Worker takes a visitor key on `/v2/assist`, ignores all operator model secrets, and retires `/v1/assist` on deployment. Deploying GitHub Pages alone does not update an already deployed Worker.

Backend agent/parcel endpoints also stop inferring merely because `OPENAI_API_KEY` exists. They use deterministic fallback unless the request explicitly supplies a user OpenAI API key in an Authorization header. That key is request-scoped, is passed explicitly to the SDK, and never enters conversation history. Responses requests disable storage and SDK retries and have output/timeout limits. The parcel workflow can make two bounded model calls when explicitly user-funded. The Next.js guide routes questions to the common review workspace; it does not issue paid backend chat requests.

## Deploy and test

GitHub Pages publishes the workspace and shared client through the existing manifest and workflow. No new deployment credentials are needed for OpenRouter, manual handoff, or local preview. Direct provider keys require deploying the optional relay; see `ai-bridge/README.md`. The user must complete provider authorization themselves. No private account was linked or charged during development.

The Next.js `predev`/`prebuild` script copies the canonical workspace/assets into ignored public build inputs, avoiding divergent source copies. On a separate Next.js origin, connections are separate and must be made on that origin.

Validation: `npm run test:static` in `frontend`, `npm test` in `tools/observatory`, frontend typecheck/build, backend tests, and the existing published-link/product guardrails. OAuth callback, paid inference, and relay cases use mocks; tests do not buy credits or invoke paid models. Live provider authorization and a paid completion remain user-account acceptance steps.

## Official references checked September 12, 2026

- [OpenRouter PKCE account linking](https://openrouter.ai/docs/guides/overview/auth/oauth)
- [OpenRouter API reference](https://openrouter.ai/docs/api_reference/overview)
- [OpenRouter model catalogue](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)
- [OpenAI client authentication](https://learn.chatgpt.com/docs/auth)
- [OpenAI plugin authentication](https://developers.openai.com/plugins/build/auth)
- [Anthropic authentication and credential restrictions](https://code.claude.com/docs/en/legal-and-compliance)
