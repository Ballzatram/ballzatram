# Engineering tour

[Overview](../README.md) · [Development](DEVELOPMENT.md) · [Documentation](README.md)

Ballzatram explores a recurring problem: how to make complex systems usable without hiding their assumptions. This tour connects a few representative product decisions to the implementation and the tests. It is a reading guide, not a production certification or benchmark report.

## A five-minute first pass

Open [The Family Business](https://dgallemore.com/econ-arcade/play/), make an initial decision, and inspect the resulting ledger. Read the [campaign engine](../econ-arcade/play/campaign-engine.js) alongside the [campaign tests](../scripts/family-business.test.cjs). Then compare the [Osiris tools contract](../osiris-tools/README.md) with the [runtime pilot boundaries](../osiris-runtime/README.md).

That path shows the central separation: deterministic product behavior, explicitly selected model context, and an interface that remains useful without inference.

## 1. Osiris: integrating models without handing them the application

**Problem.** A useful companion needs the right project context, but a generic prompt must not become authority to read unrelated state, change scores, or trigger hidden model spending.

**Implementation.** The shared [feature registry](../assets/ai-features.js) describes project-level context. The [MCP tools service](../osiris-tools/) exposes deterministic teaching operations inside compatible AI hosts. Separately, the [runtime server](../osiris-runtime/server.mjs) manages the in-page pilot, with the [Codex adapter](../osiris-runtime/codex.mjs) behind its constrained protocol. These are alternative integration surfaces, not interchangeable authentication methods.

**Evidence to inspect.** [Runtime tests](../osiris-runtime/test/runtime.test.mjs), the signed-out [real-binary smoke check](../osiris-runtime/scripts/check-runtime.mjs), and the [Osiris tools workflow](../.github/workflows/osiris-tools.yml). Follow the component README for the tools service's protocol and synthetic-host tests.

**Tradeoff.** The tools path keeps inference in the AI host but does not automatically return answers to the external website. The runtime supports the intended in-page flow but requires separate hosting and account acceptance. Temporary per-session processes are not a complete multi-tenant isolation design. Automated mock/protocol checks do not prove live subscription access.

## 2. Econ Arcade: teaching through state, decisions, and replay

**Problem.** A game should help a learner understand consequences, not merely reward a correct phrase or an AI-generated explanation.

**Implementation.** [Campaign data](../econ-arcade/play/campaign-data.js) defines the episodes; the [campaign engine](../econ-arcade/play/campaign-engine.js) settles decisions. Experience, Experiment, and Adapt stages connect a persistent business ledger with controlled comparisons. Versioned event histories support validation and replay during restore. The independent [Supply & Demand engine](../tools/supply-demand/engine.js) is also shared with the MCP service.

**Evidence to inspect.** [Campaign regression tests](../scripts/family-business.test.cjs), [static UI tests](../scripts/static.test.cjs), and the [campaign guide](family-business.md), especially save recovery, stale-tab protection, and the distinction between a recomputed episode result and a visitor-reported wider ledger.

**Tradeoff.** Rules are transparent and reproducible, but the economic parameters are teaching abstractions. Stage completion is not a validated claim of comprehensive mastery. Other arcade games remain independent; visiting one does not silently rewrite campaign state.

## 3. Congressional Accountability: provenance before interpretation

**Problem.** A legislative dashboard can mislead when incomplete coverage looks complete, an old snapshot looks current, or a personal judgment looks like an official finding.

**Implementation.** The [refresh pipeline](../scripts/refresh_observatory.py) bounds upstream work and retains source-backed records. The [browser workbench](../tools/observatory/) distinguishes official records, saved snapshots, and draft interpretations. Research stays attached to its source version rather than silently following changed evidence.

**Evidence to inspect.** The [live-data validator](../tools/observatory/validate-live.mjs), [Python test directory](../scripts/tests/), and [workbench guide](observatory/WORKBENCH.md). The [launch review](observatory/LAUNCH_REVIEW.md) describes findings and acceptance checks.

**Tradeoff.** A bounded public-data catalogue can run on a static publishing pipeline, but it is not exhaustive or instant. Upstream failures and cache eviction affect coverage. Missing evidence is not evidence of no activity, and a draft is not an independently reviewed judgment.

## 4. Static-first delivery with optional application services

**Problem.** A personal lab should be easy to explore without making every visitor install a backend or authorize a model account.

**Implementation.** [Public programs](../data/public-programs.json) drives the [homepage generator](../scripts/build_frontier.py). The [publication manifest and assembler](../scripts/build_public.py) determine the Pages artifact. The [Next.js application](../frontend/src/app/) and [FastAPI application](../backend/app/) are separate development/deployment surfaces for richer workflows.

**Evidence to inspect.** [Public-artifact validation](../scripts/validate_public.py), [product guardrails](../scripts/validate_lab_readiness.py), [PR Validation](../.github/workflows/pr-validation.yml), and the focused commands in [Development](DEVELOPMENT.md).

**Tradeoff.** Multiple surfaces add maintenance overhead and can diverge. Explicit manifests, shared engines, inventories, and route checks reduce that risk; they do not remove the need for integration review. A Pages deploy does not activate every service in the monorepo.

## Ownership and next engineering steps

This is independent, AI-assisted portfolio work by Devin Gallemore, not a representation of an employer's production system. AI tools assist implementation and iteration; architecture decisions, evidence, review, and acceptance remain maintainer responsibilities. No employer-scale impact or model-quality benchmark is claimed for these public prototypes.

The next steps are practical rather than cosmetic: complete hosted/user-account acceptance for the chosen AI path, strengthen per-user isolation before wider runtime access, evaluate learning outcomes beyond progression, and continue reducing duplicated behavior across static and backend-backed surfaces. Component guides record the more detailed boundaries and plans.
