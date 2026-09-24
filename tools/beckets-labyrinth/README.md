# Beckets Labyrinth

**Ten discoveries. One more rabbit hole.**

An original mobile-first countdown feed at [dgallemore.com/tools/beckets-labyrinth/](https://dgallemore.com/tools/beckets-labyrinth/).

## Experience

Scroll between countdowns; tap or swipe left from number 10 to number 1. Swipe right or use rank markers to revisit entries. Keyboard navigation, reduced-motion preferences, private predictions and reactions, category filters, sharing, and a browser-local saved shelf are supported. The wider site's theme is unchanged.

Five original starter editions contain 50 entries and work without an AI account. They are labeled editorial, fictional or speculative as appropriate. The starter set is finite and is never described as unlimited AI content. Random topic selection and shuffling do not call a model.

## Native AI execution

Enter a topic and storytelling style, connect your account inside the composer, review the selected input and generate. The model response is validated and becomes a countdown in the same feed. Generation never exports a prompt, opens a chat app, asks for pasted model output or accepts an exported prompt as a result. Initial provider authorization remains on the provider's own site.

The generator calls the shared `BallzatramAI.execute` orchestration contract. It rejects handoff and local-preview modes and never switches providers or retries automatically. A stale cached client returning a handoff is also rejected. Legacy saved handoff defaults migrate once to native setup; separately chosen paid API settings are preserved, not silently replaced.

The native ChatGPT path uses the existing Osiris runtime and the eligible visitor's Codex allowance. A running compatible service, private pilot access, user-completed authorization and a selected account model are required. Publishing the static website alone does not deploy that service. A missing runtime remains a visible in-page activation state, not a copy/paste fallback. See [Render activation](../../docs/osiris-render-deploy.md) and [runtime setup](../../osiris-runtime/README.md).

Visitors who explicitly selected an existing OpenRouter or direct API connection can continue to use it. This is separate API billing, not their ChatGPT subscription. The chosen model, relay and output limit are preserved; at least 1,200 output tokens are required, and 2,400 provides more room. No output limit is silently raised and no site-funded fallback exists.

Only the selected topic, tone, output format and source-mode label enter the request. Reading Room data, saved picks, browser history and unrelated project context are not collected. Each generation requires confirmation; model or connection changes invalidate that confirmation. The native setup panel preserves the draft and does not auto-submit after sign-in. Cancellation, timeouts and stale-response checks prevent a late response from entering the feed after the request was stopped or the connection changed.

## Content and data boundaries

Output is general-knowledge or clearly labeled original fiction, not live research or independently verified information. Sources are not fabricated by the prompt. Generated or imported links are restricted to HTTPS without credentials, never fetched automatically and labeled unverified. All model content is rendered as text, not HTML.

`core.js` validates a versioned JSON object with a title, hook, category, ranking basis and exactly ten unique ranked entries. Every rank from 1 to 10 must appear once. Oversized, duplicate, malformed, missing-field and truncated output is rejected without replacing the feed or retrying. Import/export remains an optional way to restore or transfer a previously saved edition, not part of AI generation.

Storage uses `ballzatram:beckets-labyrinth:v1`. At most 30 custom editions are retained; saved editions are protected from eviction. A full saved shelf blocks a new request before provider usage. Failed writes are surfaced and corrupt storage does not block the starter feed. Clear affects only this feature's local data.

A starter share link identifies that edition. A generated share link carries its topic, not the private local result; recipients choose whether to generate. JSON export transfers an exact edition without credentials, account details or private predictions. No public publishing backend or cross-device synchronization is implemented.

## Tests

From the repository root:

```sh
node --test tools/beckets-labyrinth/core.test.cjs
node --test osiris-runtime/test/execution.test.mjs
python -m pip install playwright==1.55.0
python -m playwright install chromium
python tools/beckets-labyrinth/browser_test.py
python scripts/build_public.py
python -m http.server 8080 --directory _site
```

The focused workflow tests countdown contracts and phone/desktop browser behavior. The browser test uses the real shared client with **synthetic HTTP responses**, including the complete disconnected-to-connected-to-countdown-to-disconnected flow in the original page, legacy-preference migration, API/SSE delivery, consent, cancellation, imports, storage and safe text rendering.

The native workflow additionally tests runtime isolation boundaries, signed-out real-Codex readiness, transport handling and in-page shared controls. Passing these checks does **not** establish real provider sign-in, subscription entitlement, a live model completion or a deployed public runtime. Those require separate real-account acceptance on the actual host.
