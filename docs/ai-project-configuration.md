# Current integration status — September 2026

The shared registry separates `contextReady` from `hostTools`. Seven projects have explicit context adapters; only Supply & Demand has interactive host tools in this release. Nine others remain disabled pending feature design. `/tools/ai/connect.html` shows whether the remote connector has been activated; code readiness does not establish live ChatGPT/Claude installation or phone acceptance.

Supply & Demand now shares one deterministic engine among the website, MCP service, and host UI. Its snapshot includes schema/engine versions, revision, selected inputs, computed baseline/current results, and limitations. The visible run is selected directly even when storage is blocked. Reset invalidates the previous selection; comparisons in AI tools cannot change scores. The host UI offers a small hint, explanation, and debrief, with explicit sharing and host-composer fallback.

The next feature is Congressional Accountability: keep the selected bill version, exact section locator, source URL, and provenance; design any research or draft-saving tools separately with authorization before enabling them. There is no general-purpose read/save endpoint in this pilot.

The detailed inventory below remains the feature-design backlog. “Configured” means an explicit context contract, not a universal account connection. For the current transport and deployment design, see [Bring your own AI](bring-your-own-ai.md) and [Osiris tools](../osiris-tools/README.md).

---

# Project AI configuration

Updated September 13, 2026. [Open the site inventory](https://dgallemore.com/tools/ai/projects.html).

Each project needs a defined purpose, selected-data adapter, instructions, and rules for actions or saved memory. The visitor’s AI app supplies model access; the public connector supplies only its advertised project tools.

**Configured below means the code adapter and instructions exist.** It does not mean a live runtime has been deployed, a user has signed in, or that every feature in the project has AI support. The default prepares context in the current page for the visitor’s AI app; the Supply & Demand connector also provides a host UI. It does not take actions or persist a conversation.

## Configured in this implementation

| Project | What Osiris receives | Current behavior | Focused next conversation |
| --- | --- | --- | --- |
| Osiris workspace | User's question and chosen context | Prepares a question for the visitor’s AI app | Conversation history, companion identity, and optional long-term memory |
| Congressional Accountability | One selected bill section, version, locator, source URL, provenance | Prepares selected evidence for a draft reading aid | Multiple sources, bill-version comparison, verification, promise-evidence workflows |
| Portfolio Lab | Latest explicitly selected saved portfolio run | Educational explanation of supplied results and assumptions | Benchmarks, risk explanation, questions that build investing literacy |
| Scenario Stress Lab | Latest explicitly selected saved scenario run | Explains fixed factor sensitivities and illustrative bands | Scenario critique and treatment of uncertainty; no invented security exposures |
| Supply & Demand Lab | Visible run with versioned input sequence and deterministic results | Shared interactive website/MCP lab; staged hints, explanation, and debrief | Hint stages, misconception detection, mastery evidence |
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

The registry uses `enabled: false` for these feature IDs, so context preparation and the legacy subscription endpoint reject them. It cannot make a deterministic game opponent into a model opponent just because the user connected an account.

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
- `assets/ai-panel.js`: in-project selected-context review, AI-app choice, prompt preparation, and export; advanced runtime controls remain separate.
- `assets/ai-config.js`: public `mcpUrl` and optional advanced `subscriptionUrl`; no credentials. `assets/subscription-client.js` handles only the advanced runtime.
- `osiris-tools/`: model-free MCP endpoint, shared app UI, bounded simulation tools, protocol/bridge tests, and deployment workflow.
- `osiris-runtime/`: independent advanced Codex pilot; not required by the MCP service.
- Project adapters: Observatory constructs selected evidence; static labs select one documented storage key; the Next.js guide constructs workflow metadata explicitly.

The current public-tool implementation uses MCP Apps for compatible ChatGPT/Claude hosts, with explicit context transfer from the website. The Codex runtime and API routes are separate advanced choices. This does not expose interchangeable subscription sign-in buttons over a shared inference backend.
