# Implementation roadmap

This is an acceptance-based sequence, not a delivery-time or revenue promise. The browser workbench now implements draft workflows across Bill X-Ray, version comparison, congressional records, Promise Ledger, coverage mappings and export; see [WORKBENCH.md](WORKBENCH.md). This does not complete the reviewed publication or nationwide-data acceptance gates below.

## Phase 0 — preserve and validate the foundation

Included: product notes, all three original concepts, source registry, measurement codebook, architecture, independence policy, typed evidence contracts, and synthetic tests. That foundation phase added no route or live collection; the later workbench and living tracker are documented in WORKBENCH.md.

Check the isolated tests in the repository's pinned dependency environment. They passed in the preparation environment, but pinned-version installation was unavailable. Do not describe local contract tests as an end-to-end or production validation.

## Phase 1 — one bill, end to end

Select an enacted federal law and its available predecessor versions using a documented selection rule. Favor a manageable text size and reliable source access, not the most scandalous-looking example. Initially import permitted official structured text and manually selected, rights-reviewed headlines.

Deliver: exact artifact/status identification; original text; section tree; parse-completeness manifest; legal before/after links; reviewed section explanations; separate topic/provision/budget views; headline/body matrix; evidence drawer; source freshness; and explicit synthetic/draft/live labels.

Acceptance: every section accounted for, every displayed effect linked to its supporting text, all unresolved cross-references visible, no invented financial totals, and no public allegation without review. Use one reviewed law as the reference implementation.

## Phase 2 — five-law research pilot

Expand to five selected laws with at least two available versions where possible; do not fabricate missing versions. Use a small predeclared outlet set and a fixed collection window, and report failures. Include examples that do not show a narrative gap.

Double-review a sample of provision classifications, text matches, and headline/body mappings. Record disagreement and adjudication. Validate repeatability from the same corpus manifest. Interview at least five potential newsroom/research users and measure tasks, manual baseline effort, time saved, trust failures, and actual willingness to pay.

Do not add all Congress or all global violence yet. The decision gate is whether users can independently verify a useful result and repeatedly save research time.

## Phase 3 — Promise Ledger

Start with a small, transparently selected sample of explicit commitments from members of both major parties, plus other affiliations when in scope. Capture original context and opportunity-to-act metadata. Map a few relevant votes/amendments and member explanations to exact versions. Publish reviewed case files before aggregate rankings.

Acceptance: no party platform automatically assigned to an individual, no procedural vote confused with final passage, no package vote treated as categorical agreement with all clauses, and no outcome equated with personal effort.

## Phase 4 — documented interests and implementation

Add rights-cleared lobbying/institutional finance records, public comments, and observed federal awards. Review entity matching manually before display. Track known versus inferred beneficiaries and the difference between authorization and actual execution. Add a provenance timeline without turning temporal sequence into proof of causation.

Acceptance: every join is reproducible; amended records reconcile; employee, PAC, and corporation identities remain separate; individual-donor commercialization remains blocked pending use-specific legal review; and unknown policy authors stay unknown.

## Phase 5 — Media Observatory pilot

Define a political-violence category, an event corpus, a fixed U.S. outlet set, observation windows, and documented geopolitical relationship rules. Secure relevant rights before choosing a paid data provider. Compare independent-origin reporting and syndicated distribution separately. Evaluate language/event matching and show data gaps.

Acceptance: no claim of a complete homicide census; no "silence" inferred from missing collection; event and alleged-perpetrator relationships are separate; matched comparisons include contrary examples; and effect estimates carry uncertainty and clear noncausal limits.

## Phase 6 — discovery, alerts, and workspaces

Only after the preceding quality gates: research-priority suggestions, version-change alerts, saved investigations, collaborative annotations, licensed exports, and Osiris-guided lessons. Basic GPO bill monitoring and browser-local watchlists now run as an explicit feature. Wider coverage, delivered alerts, and collaborative workspaces remain future work.

Validate pricing with paid pilots rather than projecting revenue from hypothetical subscription counts. Keep public findings, methodology, corrections, and subject responses separate from paid workflow conveniences. Honor the existing repository's no-live-billing policy until usefulness and readiness are established.

## Work items to open first

- Implement official bill-artifact retrieval with pagination, provenance, source health, and rate handling.
- Implement section parsing and legal-reference resolution with a completeness manifest.
- Build the Bill X-Ray workbench and evidence drawer, including exact-version and status labels.
- Create a double-reviewed evaluation corpus and reproducible dossier export.
- Add authenticated review/publication gates; never trust review flags supplied by a client.

## Launch blockers

Unapproved data reuse; source access gaps hidden as zero coverage; incorrect bill versions; unaccounted sections; mistaken entity merges; uncited high-stakes claims; unauthenticated reviews; fabricated confidence; lack of corrections; or inability to reproduce findings. Budget for editorial expertise, data rights, legal review, and maintenance before assuming model tokens are the main cost.
