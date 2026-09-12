# Optional user-funded API relay

The public AI workspace at `/tools/ai/` works without this Worker. Its standard in-site connection uses OpenRouter's browser PKCE flow; visitors pay with their own OpenRouter account. ChatGPT/Claude/Gemini handoff and local preview need no relay.

Use this Worker only for the advanced **direct OpenAI or Anthropic API key** option. A visitor supplies their own API key for each request. The Worker forwards it to a fixed provider endpoint and does not store it. There is no operator-key fallback.

## Deploy your own relay

1. Install/log in to Cloudflare Wrangler: `npx wrangler login`.
2. Set `ALLOWED_ORIGINS` in `wrangler.toml` to the exact origins where you use Ballzatram. Localhost is also supported for development.
3. Run `npx wrangler deploy` in this directory.
4. Open Ballzatram → AI → Advanced. Enter the Worker origin, provider, exact model ID, and your provider API key. Only use a relay you operate or trust; the relay can see the key and submitted context.

No OpenAI/Anthropic secrets are needed on the Worker. Hosting/request costs are separate from inference charges and belong to whoever deploys the relay.

## Existing v1 installations

Deploy this version to retire the old operator-funded endpoint. `/v1/assist` now returns HTTP 410 and never invokes a model. `/v2/assist` ignores `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `BALLZATRAM_ACCESS_TOKEN` environment secrets even if they still exist. Remove obsolete secrets with `wrangler secret delete` after deploying. An already deployed old Worker is unchanged until you deploy this update; the new site never calls its v1 endpoint.

The existing `Deploy AI Bridge` GitHub workflow is manual and requires Cloudflare credentials. Publishing the Pages site does not deploy this optional Worker.

## Contract

- `GET /health`: protocol `2`, billing `user-key-only`. No model call and no credential verification.
- `POST /v2/assist`: `Authorization: Bearer <visitor-provider-API-key>`; JSON body `{ provider, model, tool, prompt, context, maxTokens }`. Providers: `openai`, `anthropic`. Response token limits: 600, 1200, or 2400.
- `POST /v1/assist`: retired; HTTP 410.

Requests use allowlisted upstream endpoints, reject redirects, expire after 45 seconds, bound the actual body to 128 KB, prompt to 4,000 characters, and context to 24,000 characters. Rejected browser origins are blocked. CORS is not user authentication; this is a stateless relay, and a valid visitor API key authorizes/bills the provider request. There are no automatic retries or provider/model fallback. Upstream error bodies are not returned to the browser. Worker observability is disabled in the checked-in config, and application code logs neither keys nor prompts; review your own infrastructure logging before deployment.

API keys are distinct from subscription credentials. Never submit ChatGPT or Claude passwords, cookies, OAuth session tokens, or Codex/Claude Code subscription tokens.

## Verification

`node --test scripts/ai-bridge.test.mjs` from the repository root exercises provider routing, key isolation, retired operator billing, bounds, origin restrictions, and safe errors with mocked upstreams. No model credits are spent.
