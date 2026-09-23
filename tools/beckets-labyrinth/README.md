# Beckets Labyrinth

**Ten discoveries. One more rabbit hole.**

An original, mobile-first top-ten feed at [dgallemore.com/tools/beckets-labyrinth/](https://dgallemore.com/tools/beckets-labyrinth/). It takes the countdown format into an exploratory, reel-like reading experience without copying another publisher's branding, presenters, scripts, or footage.

## Experience

Scroll vertically between countdowns. Enter an edition, then tap the reveal button or swipe left to move from #10 to #1. Swipe right to revisit a reveal. Arrow keys provide an alternative, and rank markers allow direct jumps without artificial waiting. Make a private #1 prediction before entering; the finale invites an opinion, not a fake trivia or mastery score.

Five original starter editions (50 entries) work without an AI account. Cinema is an editorial ranking, AI is an introductory learning sequence, and the speculative questions and story settings are explicitly hypothetical or fictional. Category filters, a shuffled starter order, private reactions, a saved shelf, and related-topic prompts support discovery. The end of the finite starter set is labeled honestly; it is not an unlimited AI feed.

Create a countdown from a topic of up to 240 characters, or pick a randomized prompt from the local topic pool. Related-topic buttons open the generator for review; they never send requests automatically. The original site theme remains unchanged outside this page.

## AI integration and readiness

The new `beckets-labyrinth` feature is registered in [the shared feature contract](../../assets/ai-features.js). The generator calls [the existing shared AI client](../../assets/ai-client.js), rather than introducing provider keys or another billing path.

- **Configured OpenRouter / direct API connection:** the existing visitor-funded account, model, relay, and output limit are used. At least a 1,200-token output limit is required before a request; 2,400 gives more room. No setting is silently increased.
- **Configured ChatGPT subscription pilot:** requests use the existing subscription client and Osiris runtime, with explicit consent and the selected model. The runtime must be running, include the updated feature contract, and have a user-completed sign-in. Updating GitHub Pages alone does not deploy that runtime. See [the runtime setup guide](https://github.com/Ballzatram/ballzatram/blob/master/osiris-runtime/README.md) in the repository.
- **Chat-app handoff:** the generator explicitly produces a prepared prompt, not an AI result. Users can copy it into their own AI app and paste the complete JSON back. No new window opens automatically.
- **Local demo:** not passed off as generated content. Visitors can explore the original starter editions instead.

Only the selected topic, storytelling style, output format, and knowledge-mode label enter the request. No browsing history, saved picks, Reading Room data, unrelated site state, or private account records are collected by this feature. Each generation requires confirmation. There is no automatic generation while scrolling, background prefetch of model output, automatic retry, or site-funded fallback. Existing provider usage limits and charges still apply, and stopping cannot guarantee reversal of usage already incurred.

Rankings are editorial and knowledge-based, not live-researched or independently verified. The prompt disallows invented sources and asks for uncertainty/fiction labels. The renderer distinguishes original starters, user-AI output, and imports. It never calls a search-result link a citation. Content is rendered as text, not model-authored HTML. Generated/imported source links are restricted to HTTPS without URL credentials, never fetched automatically, and labeled unverified.

## Data contract and storage

`core.js` validates a versioned JSON object containing `title`, `hook`, `category`, `rankingBasis`, ten `items` (`rank`, `title`, `detail`, `why`), optional `nextTopics`, and optional `sources`. Every rank from 1 to 10 must appear once; normalized duplicate titles, oversized responses, missing fields, truncated outputs, and malformed JSON are rejected. A rejected response never replaces the current feed.

`app.js` uses native scrolling, pointer events, semantic controls, modal dialogs, reduced-motion preferences, and focus management. Generation has a three-minute deadline, cancellation, a request epoch, and connection-change checks so late results cannot be inserted after cancellation. The existing runtime also enforces its own request boundaries.

The shelf uses `ballzatram:beckets-labyrinth:v1` in browser-local storage. At most 30 custom editions are retained; saved editions are protected from automatic eviction. Old unsaved editions may be displaced when a new one is added. A full pinned shelf blocks generation before using the provider. Corrupt/blocked storage does not block exploration; failed writes are surfaced. The clear action affects this feature's data only.

Sharing a starter links to that exact built-in edition. Sharing a generated edition shares **its topic**, not its private local result; the recipient must choose to generate. JSON export/import transfers an exact edition without AI credentials, account details, predictions, or other saved activity. There is no public publishing backend or cross-device synchronization.

## Test and run

From the repository root:

```sh
node --test tools/beckets-labyrinth/core.test.cjs
python -m pip install playwright==1.55.0
python -m playwright install chromium
python tools/beckets-labyrinth/browser_test.py
python scripts/build_public.py
python -m http.server 8080 --directory _site
```

Open `http://127.0.0.1:8080/tools/beckets-labyrinth/`.

The focused [workflow](https://github.com/Ballzatram/ballzatram/blob/master/.github/workflows/beckets-labyrinth.yml) runs contract and browser regressions. Browser tests use the **real shared client code with mocked provider HTTP responses**, covering OpenRouter, the direct relay, and subscription SSE delivery, plus handoff, imports, cancellation, no-consent/no-scroll requests, storage, and phone/desktop layouts. These tests do **not** establish live provider sign-in, actual subscription eligibility, or that a hosted Osiris runtime has been activated. Manual live acceptance remains separate.

The new directory is covered by the existing public build manifest's `tools` entry. The homepage links it through `data/public-programs.json`; AI setup inventory comes from the shared feature registry. Existing home, portfolio, game, research, and provider behavior is preserved.
