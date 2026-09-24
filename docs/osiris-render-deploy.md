# Activate native Osiris on Render

## Product contract

Open a tool, connect an eligible personal ChatGPT account, and run an AI step that returns to the same tool. No prompt export, response import, automatic API billing fallback, or shared operator model account. Initial authorization happens on OpenAI's own site; model execution stays in the tool afterward.

The shared native panel and Beckets Labyrinth implement this flow. Older browser preferences that automatically selected handoff migrate to native setup without making a request. Labyrinth's generator uses `BallzatramAI.execute`, which returns a completed model response or an error, never a prepared prompt. Existing explicitly selected API accounts remain separately billed and are not chosen automatically.

## What repository deployment does not do

Publishing GitHub Pages does not start the subscription runtime. The public `subscriptionUrl` must remain empty until a trusted runtime has passed deployment and real-account acceptance. MCP tool hosting is separate and does not provide in-page inference.

`render.yaml` prepares one Docker web service. It does not create a hosting account, approve spending, grant provider access, establish subscription eligibility, or deploy itself when merged. The proposed compute size is one CPU and 2 GB RAM; review Render's current price before authorizing creation. This Blueprint has not been submitted to Render's validation API or deployed during code-only development.

## Operator activation

1. Connect the authorized Render account and inspect existing services before creating anything. Review the actual hosting price with the owner. Import this repository's `render.yaml`, or use its exact settings to create one Docker web service from the tested `master` revision.
2. Set `OSIRIS_PILOT_CODES` privately to a cryptographically random 32-128 character base64url admission code. The included `.env.example` and runtime guide describe this format. Never store the code in the repository, frontend, URLs, public logs, or chat screenshots. Render's automatic secret generator uses standard base64, so the Blueprint intentionally prompts for this value rather than generating an incompatible code.
3. Keep one instance, automatic deploys off, no persistent disk, no request-body or authorization logging, and no provider API keys. Render supplies the service's HTTPS origin; do not invent one from its name. The Docker pre-deploy check and `/ready` health check must pass.
4. Run `node osiris-runtime/scripts/check-deployment.mjs https://ACTUAL_RUNTIME_ORIGIN https://dgallemore.com` from a trusted machine. Confirm the deployed `/health` feature list includes `beckets-labyrinth`, the service identifies `user-chatgpt-only` billing, and exact-origin/CORS checks succeed. Readiness is explicitly **not** proof of a signed-in account or successful inference.
5. Open Beckets Labyrinth on the actual website. Choose **Connect ChatGPT here**, enter the actual service origin and the private pilot code, and complete the provider's device-code authorization yourself. Select a model returned by that account. Close the native connection panel: the original topic must still be in the composer and generation must not have started automatically.
6. Confirm the topic and generate one countdown. Verify ten cards appear without navigation, copying, or importing; verify the request uses the signed-in account's Codex allowance. Exercise Stop and Disconnect. Check another enabled tool using the same session. Repeat on the intended phone/browser.
7. Only after that acceptance, set the public origin in `assets/ai-config.js`, publish the static site, and verify it from a fresh browser with no custom runtime preference. Keep the admission code private. Do not call the integration live merely because CI or `/ready` is green.

## Operating boundaries

This remains an invitation-only pilot, not public multi-tenant hosting. Each session has a separate process and temporary home but does not have its own isolated operating-system identity. Render runs the Docker service as a non-root user; the Blueprint is not a claim that every hardening option in the separate Docker Compose deployment is available on Render. Use only a trusted host and invited participants. Confirm provider deployment support and strengthen worker isolation, identity, abuse controls and operations before opening it broadly.

Session credentials are temporary. Restarting or redeploying the service requires signing in again; this is not permanent cross-device single sign-on. Hosting is separate from subscription model usage. Usage limits, cancellation costs and provider terms still apply.

## Verification and rollback

Automated tests cover the real browser clients with synthetic provider HTTP, the native HTTP runtime with a synthetic provider, the pinned real Codex binary while signed out, cancellation, disconnect, legacy preferences and JSON validation. These do not prove live subscription eligibility or provider inference.

To stop access, suspend the hosting service or rotate its private admission codes and restart it. Remove the public `subscriptionUrl` to return the site to an honest in-page unavailable/setup state. Never replace a failed subscription request with an API call or prompt handoff. Existing MCP tools and offline starter editions are separate and can remain available.

References: [Render Blueprint specification](https://render.com/docs/blueprint-spec), [Docker on Render](https://render.com/docs/docker), [native runtime guide](../osiris-runtime/README.md), [acceptance checklist](osiris-native-acceptance.md).
