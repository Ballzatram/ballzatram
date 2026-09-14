# Bring your own AI to Ballzatram

The default is **the visitor's AI app runs the model; Ballzatram supplies selected context and project tools**. This avoids an operator model-token bill. It does not turn a consumer subscription into a general website inference API.

| Route | Interface and answer | Model usage | Current status |
| --- | --- | --- | --- |
| Interactive MCP App | Shared Supply & Demand Lab inside a compatible ChatGPT/Claude host; answer in its conversation | Visitor's AI account | Implemented and protocol-tested; deployment and host installation are separate activation steps |
| Selected context | Prepare in the current project, copy to any chat app | Visitor's chat account | Works without a backend; no automatic return/sync |
| Optional WebMCP | Visible lab in a supporting AI browser | Visitor's AI host | Feature-detected; ordinary browser/phone users retain the local lab and copy flow |
| Local preview | Fixed checklist or deterministic simulation | No model calls | Available for testing |
| Advanced private runtime | Website panel through hosted Codex | Visitor's ChatGPT Codex allowance | Separate service required; not the public default |
| Optional user-funded API | Website using OpenRouter or the visitor's trusted relay | Visitor's separate API balance | Explicit selection only; chat subscriptions do not cover API usage |

`/tools/ai/connect.html` shows connector activation status. `assets/ai-config.js` accepts a verified public `mcpUrl`; empty means awaiting activation. GitHub Pages alone cannot host MCP. The deployment workflow uses existing Cloudflare credentials if configured and reports missing setup explicitly.

## Supply & Demand

`tools/supply-demand/engine.js` is shared by the website, MCP tools, and host UI. The three tools list capabilities, simulate separate comparisons, and open the interactive lab. They cannot call models, read private records or browser storage, fetch arbitrary URLs, or write to any project.

The user chooses a small hint, explanation, or debrief; reviews the exact run; then confirms sharing it through one host message. Unsupported or declined messaging leaves a prepared prompt for the host composer. No background model calls, automatic retries, or paid fallbacks exist. Revisions track exact inputs; reset invalidates the previous selection. Results are recomputed, not accepted from model-supplied numbers or scores.

A website run is transferred explicitly by copying its prepared prompt or downloading its bounded JSON context. A connected tool can reopen that sequence in the AI app. The remote host cannot see local storage. Provider chat history, memory, custom GPTs, and every native provider tool are not imported.

## Per-project setup

Seven adapters cover the workspace, selected Observatory bill section, portfolio result, scenario result, Supply & Demand run, report draft, and Next.js workflow guide. The registry separates `contextReady` from `hostTools`; only Supply & Demand advertises interactive tools. Nine remaining entries stay disabled pending focused design.

Congressional Accountability is next: bill version, exact section locator, source URL, and provenance remain explicit. Research actions, persistent drafts, and reviewed edits require their own authorization and verification design. See the [project inventory](ai-project-configuration.md).

## Account and data boundaries

- Visitors authenticate with their own AI app. Ballzatram's public teaching connector receives no provider passwords or subscription tokens. Personal records and write tools are absent; adding them requires OAuth authorization and user-scoped storage.
- MCP application code does not persist requests. Hosting infrastructure may retain operational metadata under its policies; the AI host processes shared context under its own retention policy.
- Website preferences allowlist provider/mode choices. Selected context is previewed and named credential/settings fields are excluded. Unselected project history is not scanned; model/source text is rendered as text.
- OpenRouter PKCE and direct API keys remain distinct options with four-hour tab credentials bound to their provider/relay. Their credits are separate from consumer subscriptions. Connection/model checks do not request generation.
- The [advanced Codex runtime](../osiris-runtime/README.md) retains its separate device-code flow and temporary credentials. It is not the public MCP connector.

## Validation and rollout

Run [Osiris tool tests and the Worker build](../osiris-tools/README.md), existing static/UI tests, frontend typecheck/build, and published-link validation. The new suite uses the official MCP client and real MCP Apps bridge with a synthetic host; it uses no model tokens.

A deployed endpoint still needs real host installation and mobile acceptance checks. The website remains useful during activation. Normal tool hosting is infrastructure: the Worker is bounded and model-free, but quotas and cost depend on the existing hosting account. No paid plan is provisioned by this feature.

The implementation follows [OpenAI MCP Apps guidance](https://developers.openai.com/plugins/build/chatgpt-ui), [the MCP Apps standard](https://modelcontextprotocol.io/extensions/apps/overview), and [Claude's remote-connector flow](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp). Further setup and current primary references are in the [service README](../osiris-tools/README.md).
