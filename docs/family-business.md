# The Family Business

A playable first campaign for the Econ Arcade: one persistent, original pixel-art Mafia-family world with Osiris as the consigliere. Begin at Bellafiore Deli; earn responsibility by experiencing economic mechanisms, predicting controlled changes, and adapting to changed conditions.

Play at [dgallemore.com/econ-arcade/play/](https://dgallemore.com/econ-arcade/play/). The [Econ Arcade overview](https://dgallemore.com/econ-arcade/index.html) links the campaign and the existing library.

## The campaign

| Rank | Responsibility | Episodes |
| --- | --- | --- |
| Associate | The deli | The Sunday Rush; The Price of a Regular; Bread on Monday |
| Soldier | Bakery and supply route | Six Pairs of Hands; Cheap by the Crate; The Right Job |
| Capo | Relationships and rival businesses | Across the Street; Tomorrow’s Handshake; A Beautiful Bad Deal |
| Underboss | Family finance | The Money Isn’t Free; One More Oven; A Rainy-Day Fund |
| Boss | Neighborhood consequences | Help Wanted; The Same Dollar; Smoke over the Block |
| Commission | Cross-border connections | Flour from Afar; Two Kinds of Money; When the Harbor Stops |

Each episode contains three stages:

1. **Experience:** make a decision and observe its consequences. The opening result is ungraded evidence of observation.
2. **Experiment:** change exactly one control from the disclosed standing order, produce a different outcome, and correctly anticipate its direction. Reference and chosen plans use identical conditions. Only the chosen plan settles into the ledger.
3. **Adapt:** respond to a changed situation, improve the specified outcome relative to the standing order, and predict the direction. Multiple controls may change here.

All three episodes at a rank must be completed before the next promotion. One lucky profit, a long answer, or a matching keyword cannot substitute for these steps. This is a transparent introductory progression rule, not a validated measurement of comprehensive mastery. Deeper assessment and broader curriculum coverage remain future work.

## What carries forward

Cash, debt, neighborhood trust, unlocked businesses, manager policies, bakery capacity, and selected economic conditions persist. Earlier businesses report on every subsequent turn. Deli episodes replace that turn’s delegated deli shift; other active contracts are additional, separately identified business.

Starting capital is $650. Promotions add explicitly announced family equity: $450, $500, $700, $850, then $1,000. Working-capital advances add $500 to both cash and debt. Existing debt accrues 0.5% interest per campaign turn; unpaid interest is capitalized. Credit contracts additionally disclose their own four-week interest quote. A campaign turn is a settled scenario, not a uniform real-time day. These rates are teaching parameters, not real lending terms or financial guidance.

From Soldier onward, managers accept three policies: keep a cushion, steady trade, or chase demand. They change capacity, working costs, and exposure. Managers pause an unfunded shift rather than spending cash they do not have. Trust changes deli demand and delivery/district income. Later flour prices, tariffs, exchange rates, and wages change the relevant recurring business reports. A working-capital advance keeps a poor run from blocking experimentation.

After the 18 episodes, revisit any completed contract with the current family ledger. Previously earned promotions stay intact. Revisited contracts still have financial consequences.

## The Econ library

Supply & Demand, Invisible Hands, Strategy Studio’s eight engines, Prisoner’s Dilemma, Portfolio, Scenario Stress, Central Banker, and Reports are accessible from family locations. All remain accessible regardless of rank. Opening a lab with `?family=1` adds the family visual treatment, a contextual prompt, and a return link.

These labs retain their existing engines and saves. They do **not** silently alter campaign money, merge unrelated scores into mastery, or pretend that a visit is evidence of understanding. Central Banker is explicitly a separate policy perspective: the family does not control national monetary policy. The public Invisible Hands link is the market-clearing game; the richer Next.js Steel Crisis remains a separate implementation.

## Osiris and AI

Built-in character dialogue and three-stage hints work locally without an account. They are labeled as built-in guidance.

“Ask with my AI” opens the existing selected-context handoff. The visitor reviews the current episode, assignment, visible cash/debt/trust, and the selected result before preparing a prompt. Sharing the current saved field note is opt-in. Other notes, full save history, browser settings, credentials, and hidden future state are excluded. No request is sent simply by opening this panel. The visitor copies/sends the prepared prompt in their chosen AI app, and the response stays there.

The `econ-world` adapter also opens **Osiris’s desk**, an interactive MCP companion inside compatible AI apps. `open_family_business` opens the selected episode; `review_family_business_episode` reviews the same snapshot without another widget. Both understand Experience, Experiment, and Adapt, as well as retries, revisits, and the completed campaign. With no snapshot, the companion explains how to share one instead of inventing progress. Existing installations must refresh the Osiris connector to discover the new tools.

The companion recomputes the selected episode outcome from validated controls, canonical episode conditions, and the shared pre-turn ledger (needed for neighborhood trust). It reconstructs assignments and evidence rather than trusting supplied explanations or scores. The wider cash/debt ledger, rank, progress, and recurring business reports remain visitor-reported; a snapshot is not an authenticated save. Only the current episode is returned, without later-stage hints or unselected history. Field notes and report text are untrusted data.

The player selects a small nudge, another clue, or a debrief, reviews the snapshot, and confirms a single message to their AI app. Changed questions, help levels, and snapshots invalidate consent; stale acknowledgements cannot replace a newer selection. Unsupported or declined messaging offers a copyable prompt without automatic retries. The starting question is labeled built-in; the host model writes the actual conversation using the visitor’s account.

Native in-page model conversation, automatic answer synchronization, and cross-device companion memory remain separate work. Share a fresh snapshot after another turn. No operator API key is added, and AI text cannot execute decisions or modify progression.

## Save and recovery

The campaign uses `ballzatram:family-business:v1`, independently of prior game keys. The older three-district playtest remains at `econ-arcade/play/legacy.html`; `osiris-econ-world-v1` is untouched.

Backups contain a versioned event history. Restore rebuilds the state through the deterministic engine, validating plans, phase transitions, control bounds, funding, and notes. Unknown schema versions, non-finite controls, invalid transitions, and files over 2 MB are rejected before replacing the current game. A checked backup is presented for confirmation. The supported limit is 5,000 events.

Unreadable existing saves are preserved and downloadable. Play can continue temporarily in memory. Storage failures are visible with an export action. A newer save from another tab blocks stale writes and asks for a reload. Reset only replaces this campaign’s key, after confirmation; it leaves other games intact.

The UI shows the latest 80 shifts. The backup retains all accepted events; the Markdown field journal exports the recent visible record and the latest note per episode. Service-worker caching covers only an explicit list of static campaign assets. It removes this app’s obsolete caches, never other applications’ caches.

## Model boundaries

All scenarios are fictional, deterministic, and deliberately small. Price response is a stylized power curve; rivals use a fixed logistic demand split; partner behavior follows a disclosed response rule. Auctions disclose values and competitor bids for a first learning encounter; an inspection therefore adds no new information here. Risk uses two specified stress states, settling the worse one into the ledger. These are exercises in mechanisms, not predictions of human behavior or real markets.

The finale traces one input through a supply chain and updates later demand. It does not implement a general-equilibrium economy. Recurring operations connect selected mechanisms across the story; the wider library offers depth beyond these introductory episodes.

## Implementation and checks

- `econ-arcade/play/campaign-data.js`: 18 episode definitions, six ranks, businesses, and lab mappings.
- `campaign-engine.js`: deterministic models, event reducer, evidence, ledger, validated restore, selected AI context.
- `campaign.js` and `campaign.css`: accessible browser UI, family management, notes, saves, and AI handoff.
- `assets/family-business/`: original vector pixel art, shared theme, locally bundled font and license.
- `osiris-tools/src/family-business.mjs` and `web/family.*`: strict campaign context contract, recomputed results, stage-aware guidance, and the interactive companion.
- `scripts/family-business.test.cjs`: complete campaign, promotion evidence, budgets, persistence, stale tabs, malformed backups, DOM interactions, and AI selection boundaries.

Run `npm run test:static --prefix frontend`, `npm run lint --prefix frontend`, and `python scripts/validate_public.py`. The public site remains a static GitHub Pages build in the existing repository.
