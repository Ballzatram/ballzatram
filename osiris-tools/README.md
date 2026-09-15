# Osiris tools

Ballzatram provides The Family Business companion and Supply & Demand tools; the visitor's AI app runs the model on their account. This service contains no provider client, AI credentials, database, hosted Codex process, or paid inference fallback.

## Tools and interface

- `open_family_business` opens Osiris’s desk for the exact reviewed campaign snapshot. With no snapshot it shows sharing instructions, never an invented game.
- `review_family_business_episode` recomputes the selected episode outcome and prepares stage-aware guidance without opening another widget.
- `list_osiris_projects` separates context readiness from interactive-tool support.
- `simulate_supply_demand` computes an independent, deterministic comparison from known market/challenge/action IDs. Challenge rules and a 12-move sandbox limit are enforced.
- `open_supply_demand_lab` opens the shared lab through MCP Apps. Full text/structured results remain useful without app UI.
- The UI offers a small hint, explanation, or debrief through one explicitly confirmed host message. Unsupported or declined messaging offers a prepared prompt for the host composer. No sampling or automatic retries occur.

`tools/supply-demand/engine.js` and `app.js` are shared by the website and host bundle. Snapshots contain input sequence, schema/engine versions, revision, computed results, and limitations. Results are recomputed from validated inputs; arbitrary data fields are rejected. Imported simulations do not import predictions or award scores. These teaching rules are preserved: shifts persist; tax and price-control effects apply to the current move only. Welfare and stability are illustrative indicators, not fitted market or policy estimates.

The Family Business companion shares `econ-arcade/play/campaign-data.js` and `campaign-engine.js` with the website. Its versioned contract includes the current episode, stage, turn/revision, ledger, selected decision/result, and an optional current field note. The strict schema rejects unknown fields and full backups. Assignments, facts, comparisons, and progression conditions are reconstructed from canonical episode data and validated controls. Pre-turn trust is used for the neighborhood episode. Wider ledger and business reports remain explicitly visitor-reported, not independently verified. See [the campaign guide](../docs/family-business.md).

The website selects its visible run at click time, even with blocked storage. A changed selection invalidates consent and stale UI acknowledgements. Optional WebMCP page tools expose only the visible simulation and independent comparisons. They cannot change the website's game state.

## Run and test

Use Node 22 or newer, from the repository root:

```sh
npm ci --prefix osiris-tools --ignore-scripts
npm ci --prefix frontend --ignore-scripts
npm test --prefix osiris-tools
npm run check:worker --prefix osiris-tools
npm start --prefix osiris-tools
```

The server binds to `127.0.0.1:8787`; routes are `/mcp` and `/health`. The build creates `osiris-tools/dist/widget.html` and `osiris-tools/dist/family.html`, with scripts, styles, portrait, and font bundled locally. UI resources allow no network connections or external frames. Tests use the official MCP client and the actual MCP Apps bridge against a synthetic host, plus browser DOM checks. No AI account or generation tokens are needed.

## Deployment and activation

The `Osiris tools` workflow validates PRs and deploys `master` only if existing repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are configured. Missing credentials produce an explicit activation-pending result. No paid plan, database, or custom domain is provisioned.

The Worker is named `ballzatram-osiris-tools`, has no environment bindings, and has application observability disabled. On Workers Free, Cloudflare enforces its 10 ms CPU limit automatically. Custom CPU limits are omitted because Cloudflare only accepts them on paid plans. Hosting quotas/costs still depend on the existing account. Zero model calls does not mean unlimited free hosting.

After successful deployment:

1. Check the returned HTTPS `/health` and `/mcp` addresses with a real MCP client.
2. Set the verified public `/mcp` address as `mcpUrl` in `assets/ai-config.js`. The website stays “awaiting activation” while this is empty.
3. Add the remote server in the AI host through its current installation/review flow. Refresh an existing Osiris installation to discover the two Family Business tools. No-auth is correct for these public, read-only simulations.
4. Verify widget rendering, selected-run transfer, explicit host messaging and denial, and navigation on supported web/iOS/Android clients. Protocol tests and deployment do not establish consumer-account or mobile-host acceptance.

This is not a universal “sign into any chat subscription and use it as a website API.” The interactive UI runs inside the compatible AI host. The external website transfers selected context explicitly, or offers optional tools in a capable AI browser. Answers do not automatically return to the website. The separate `osiris-runtime/` remains an advanced pilot and is not required here.

## Data boundary

This version uses fictional teaching markets and explicitly selected, request-scoped campaign snapshots. The optional current field note is included only when selected on the website. It cannot read browser storage, private records, arbitrary URLs, chat history, or other projects; it cannot save drafts, trade, publish, or edit scores. The application does not store requests; hosting infrastructure may retain operational metadata under its own policies. User questions and shared context follow the AI host's retention policy.

The registry keeps evidence rules separate from transport instructions. Text-only runtime/API prompts retain their no-tools restriction; host prompts may use only exposed tools. Eight projects have explicit context adapters. Supply & Demand and The Family Business have interactive host tools. Further project integrations, including Congressional Accountability evidence, remain separate work. Server-stored private records, research actions, and saved drafts require separate authorization and per-user state before adding tools.

## Primary references (reviewed September 13, 2026)

- [OpenAI MCP server](https://developers.openai.com/plugins/build/mcp-server) and [MCP Apps UI](https://developers.openai.com/plugins/build/chatgpt-ui)
- [Connect a ChatGPT plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [MCP Apps standard](https://modelcontextprotocol.io/extensions/apps/overview)
- [Claude remote connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) and [interactive connectors](https://support.claude.com/en/articles/13454812-use-interactive-connectors-in-claude)
- [ChatGPT WebMCP scope](https://learn.chatgpt.com/docs/webmcp)
- [Cloudflare Workers pricing and quotas](https://developers.cloudflare.com/workers/platform/pricing/)
