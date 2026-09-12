# Project AI configuration

Updated September 12, 2026. [Open the site inventory](https://ballzatram.com/tools/ai/projects.html).

The common connection is separate from each project's workflow. A successful ChatGPT sign-in supplies model access; a project still needs a defined purpose, selected-data adapter, instructions, and explicit rules for actions or saved memory.

**Configured below means the code adapter and instructions exist.** It does not mean a live runtime has been deployed, a user has signed in, or that every feature in the project has AI support. This implementation provides text help inside the current page. It does not take actions or persist a conversation.

## Configured in this implementation

| Project | What Osiris receives | Current behavior | Focused next conversation |
| --- | --- | --- | --- |
| Osiris workspace | User's question and chosen context | A streamed answer in the workspace | Conversation history, companion identity, and optional long-term memory |
| Congressional Accountability | One selected bill section, version, locator, source URL, provenance | Draft reading aid inside the bill page | Multiple sources, bill-version comparison, verification, promise-evidence workflows |
| Portfolio Lab | Latest explicitly selected saved portfolio run | Educational explanation of supplied results and assumptions | Benchmarks, risk explanation, questions that build investing literacy |
| Scenario Stress Lab | Latest explicitly selected saved scenario run | Explains fixed factor sensitivities and illustrative bands | Scenario critique and treatment of uncertainty; no invented security exposures |
| Supply & Demand Lab | Latest explicitly selected saved run | Hints and diagnostic questions using actual simulated inputs | Hint stages, misconception detection, mastery evidence |
| Reports | Explicitly selected saved report draft | Separate critique/explanation; never edits or publishes the draft | Reviewable suggested edits and an explicit apply action |
| Next.js workshop guide | Page ID and selected workflow only | Opens the shared panel in place | Data adapters for Quant Library, market analytics, land research; currently cannot see charts or uploads |

Saved-run buttons fail visibly when no run exists. Context is shown before a question can be sent; a connection alone never sends it. The server validates the feature ID and supplies its own instructions. Finance explanations remain educational, and bill responses do not establish motives, wrongdoing, promise fulfillment, legal advice, or editorial verification.

## Projects needing deeper design

| Project | Present state | Decisions before connection |
| --- | --- | --- |
| Central Banker | Deterministic policy simulation and feedback | Adviser role, policy-notebook fields, hint timing, debriefs, and player decision ownership |
| Prisoner's Dilemma | Opponent archetypes are game logic | Tutor versus opponent roles, permissible history, hidden-information boundaries, strategy explanation |
| Econ Arcade world | Scripted/local Osiris dialogue and progression | Character voices, shared learner context, reflective questions, mastery evidence |
| Strategy Studio / Invisible Hands | Local learning engines and explanations | Scenario-specific context, spoiler rules, progression across concepts |
| Parcel Intelligence | Legacy user-key backend or deterministic fallback | Verified sources, research permissions/actions, source-linked memo review |
| Reading Room | Local reader progression; no reading history collected by this connection | Recommendation sources, spoiler preferences, finished-book evidence, private reader memory |
| Genealogy / family stories | No genealogy assistant implementation found in this repository | Evidence-ranked family links, source provenance, family privacy, separating research from storytelling |
| AI Edit Factory | Separate upload/rendering/media system | Media providers, retention, rendering cost, assistant permissions and reviewable actions |
| Generated stories / newspaper archive | Existing archive/demo surfaces, not a verified live generator | Which workflows stay active; labels for sourced facts versus fiction |

The registry uses `enabled: false` for these feature IDs, so the subscription endpoint rejects them. It cannot make a deterministic game opponent into a model opponent just because the user connected an account.

## A focused setup conversation for each feature

For each project, settle these questions together before implementation:

1. What should Osiris help the user accomplish at this moment?
2. Which exact inputs, sources, game state, or saved records may it see? What must stay hidden?
3. Should it explain, tutor, recommend, draft, research, or take an action? Which steps require review?
4. What may it remember, for how long, and how can the user inspect or clear it?
5. Which account/model capabilities are required, and what happens when the provider is unavailable or limited?
6. What concrete example would prove that the feature is behaving correctly?

Central Banker and Prisoner's Dilemma both have bounded state and existing mechanics, so the value of a tutor can be tested clearly. The bill workbench deserves its own discussion of evidence and verification.

## Configuration ownership

- `assets/ai-features.js`: shared project registry, purpose, readiness, context description, and server-owned instructions. The site inventory renders it directly.
- `assets/ai-panel.js`: shared native panel, context review, sign-in, model selection, consent, streaming, stop, and disconnect.
- `assets/subscription-client.js`: origin-bound browser/service connection. `assets/ai-config.js` optionally supplies the public service address; it contains no admission code or provider credentials.
- `osiris-runtime/`: pinned Codex process, isolated temporary sessions, authentication checks, request limits, and deployment guide.
- Project adapters: Observatory constructs selected evidence; static labs select one documented storage key; the Next.js guide constructs workflow metadata explicitly.

The current pilot implements ChatGPT through Codex. OpenRouter/API/manual choices remain separate. Copilot and Claude need provider-specific integration decisions; they are not interchangeable sign-in buttons over one shared subscription backend.
