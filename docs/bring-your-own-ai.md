# Bring your own AI to Ballzatram

The website defaults to **Osiris in the current page**, using the visitor's ChatGPT/Codex allowance after private-runtime activation. Without a configured service it shows in-place setup, not a silent chat-app handoff. The public MCP connector remains an explicitly chosen way to run project tools in the visitor's AI app. Neither path creates an operator-funded inference fallback or a general consumer-subscription API. See [native implementation and acceptance](osiris-native-acceptance.md) and [the development plan](osiris-native-plan.md).

## Choose the delivery channel deliberately

| Route | Interface and answer | Model usage | Status |
| --- | --- | --- | --- |
| Native private runtime | Osiris panel in the current website project, through hosted Codex | Visitor's eligible ChatGPT/Codex allowance | UI and runtime implemented; separate running HTTPS service and user-completed live acceptance required |
| Interactive MCP App | Family Business companion and Supply & Demand Lab inside a compatible AI host; answer in its conversation | Visitor's AI account | Existing Cloudflare Worker; host installation or connector refresh required |
| Explicit context handoff | Prepare in the project, copy to the chosen chat app | Visitor's chat account | No backend required; no automatic return/sync |
| Optional WebMCP | Visible lab in a supporting AI browser | Visitor's AI host | Feature-detected; other browsers retain the local lab |
| Local preview | Fixed checklist or deterministic simulation | No model calls | Available for testing |
| Optional user-funded API | Website using OpenRouter or the visitor's trusted relay | Visitor's separate API balance | Explicit selection only; chat subscriptions do not cover API usage |

`assets/ai-config.js` contains public service addresses only. `subscriptionUrl` identifies the native runtime and stays empty until that service is actually activated. `mcpUrl` identifies the separate model-free connector. The MCP Worker is not a subscription runtime. GitHub Pages cannot run the native process. Existing Cloudflare credentials deploy the connector, not a Docker host or a provider account.

The native panel retains the selected project and draft during connection. Only initial authorization opens OpenAI's sign-in page; ordinary questions stream into the current page. Service checks, sign-in, and model discovery do not generate an answer. Changing the question, model, or response length clears consent. An expired session, unavailable model, failed request, or provider limit never automatically switches transports, models, or billing accounts.

## Project context and tools

Nine enabled registry entries cover the workspace, selected bill section, portfolio result, scenario result, Supply & Demand run, report draft, Next.js workflow guide, Family Business episode, and Parcel brief. Seven entries remain disabled pending focused design. `contextReady` is distinct from `hostTools`; only Supply & Demand and Family Business currently expose interactive MCP tools. See [the project inventory](ai-project-configuration.md).

`tools/supply-demand/engine.js` is shared by the website, MCP tools, and host UI. The connector lists capabilities, simulates separate comparisons, and opens its interactive lab. Those tools cannot call models, read private browser storage, fetch arbitrary URLs, or write to projects. Results are recomputed rather than accepted from model-supplied numbers. Revisions and resets invalidate stale selections.

In connector mode, the player chooses a hint, explanation, or debrief, reviews the run, and explicitly shares one host message. Unsupported or declined messaging leaves a prepared prompt. Website snapshots are transferred deliberately; a remote AI host cannot see browser local storage.

For Family Business, the website's assistant button opens the native panel with the current episode, assignment, visible ledger, and selected result. The current field note is opt-in; full saves, other notes, and future state are excluded. Native answers return in place after runtime activation. Osiris cannot decide, score, promote, or change saved game state.

When the visitor explicitly chooses the AI-app alternative, `open_family_business` and `review_family_business_episode` consume that reviewed snapshot. The shared engine recomputes the selected outcome; broader progression and ledger information remain visitor-reported. The MCP companion has no persistence, model client, provider credential, or save/decision tool. Its answers stay in the host conversation. Share another snapshot after progressing; refresh existing connector installations to discover new tools.

Parcel's native path preserves its separate public-research output schema and reviewed import. Other enabled native projects produce text only, with web search disabled. Further source verification, persistent drafts, research actions, and reviewed edits need their own authorization and feature design.

## Account, billing, and data boundaries

The native pilot authenticates directly with OpenAI through Codex device authorization. The browser receives a short-lived Osiris service token, not OpenAI OAuth credentials. The trusted runtime operator necessarily controls the process handling selected context and provider credentials. Credentials and temporary workspaces are ephemeral; sessions expire after thirty minutes idle or four hours total. This is not permanent single sign-on or cross-device companion memory.

The public MCP connector receives no provider passwords or subscription tokens and cannot look up saved games or personal records. Its application code does not persist requests. Infrastructure may retain operational metadata, and the AI host processes shared context under its own policies. Future persistent private data or write tools require user-scoped storage and authorization.

Website preferences allowlist mode/provider choices; named credential fields are removed from selected context on the client and server. Review is still necessary for secrets embedded in ordinary text. Unselected project history is not scanned. Model and source output is rendered as text.

OpenRouter PKCE and direct API keys remain distinct options, with four-hour tab credentials bound to the provider/relay. Those balances are separate from consumer subscriptions. No provider chat history, memory, custom GPTs, or full native tool catalogue is imported. A ChatGPT connection does not activate Copilot or Claude; those need separate supported adapters and authentication review.

## Verification and activation

Run the native transport/runtime tests, real signed-out Codex check, desktop/mobile browser acceptance, existing static/project tests, frontend typecheck/build, and product guardrails. Run the [MCP tool tests and Worker build](../osiris-tools/README.md) separately. Tests using synthetic accounts or host bridges are not live account acceptance.

The native CI workflow produces a checksummed, minimal runtime source bundle. `GET /health` verifies the HTTP process; `GET /ready` probes a real signed-out native process. Both explicitly report that inference is unverified. `node osiris-runtime/scripts/check-deployment.mjs https://YOUR_RUNTIME_ORIGIN https://dgallemore.com` checks the hosted service's identity, readiness, browser-origin permissions, authentication boundary, and security headers without credentials or generation.

Follow the [private runtime setup](../osiris-runtime/README.md) and [live acceptance checklist](osiris-native-acceptance.md) before publishing a subscription URL. A trusted persistent host and an eligible user's own OpenAI authorization and explicit model request are still required. Infrastructure costs are separate from inference allowance; this implementation provisions no paid plan. Broad public multi-user access also requires stronger per-user isolation, verified identities, operational abuse controls, and confirmation of provider support for the deployment arrangement.

Primary implementation references: [Codex App Server](https://learn.chatgpt.com/docs/app-server), [OpenAI MCP Apps guidance](https://developers.openai.com/plugins/build/chatgpt-ui), [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview), and [Claude remote connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
