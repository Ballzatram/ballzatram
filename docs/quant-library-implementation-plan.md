# Quant Library Implementation Plan

Date: 2026-06-02

## Rules for the rebuild

- Do not delete the existing Quant Library or MacroBoard code until the replacement is route-stable.
- Do not remove `/macro-board` compatibility redirects or API aliases.
- Do not build newspaper automation in this phase.
- Do not build Bettor's Corner or Weather Bot in this phase.
- Do not add dependencies unless necessary.
- Be honest about prototype vs production readiness.

## Phase 1: Stabilize current Quant Library route and remove confusing clutter

Goal:

- Make `/quant-library` safe and coherent while preserving existing behavior.

Files likely to change:

- `frontend/src/app/quant-library/page.tsx`
- `frontend/src/components/quant-library/QuantLibraryPrimitives.tsx`
- `frontend/src/app/macro-board/page.tsx`
- `backend/app/api/routes.py`

What to build:

- Keep route loading and existing analytics demo call working.
- Replace current eight-desk navigation with six MVP desk labels or mark non-MVP concepts as deferred.
- Move story-generation preview lower or hide behind a clearly labeled future/research-note section.
- Strengthen visible "not financial advice" and demo/freshness labels.

What not to build:

- No full redesign yet.
- No new provider integration.
- No auth/subscriber gating.

Acceptance criteria:

- `/quant-library` renders without backend crash.
- `/macro-board` still redirects.
- API aliases for `/api/macro-board/*` still work.
- User cannot mistake demo data for live data.

Tests/validation:

- Frontend typecheck.
- Backend tests.
- Manual route smoke test.

## Phase 2: Build core data provider interfaces and demo fallback

Goal:

- Align the data model with production data-lineage requirements.

Files likely to change:

- `backend/app/services/market_data/models.py`
- `backend/app/services/market_data/providers.py`
- `backend/app/services/market_data/demo_provider.py`
- `backend/app/services/market_data/fred_provider.py`
- `backend/app/services/market_data/factory.py`
- `frontend/src/lib/api.ts`

What to build:

- Migrate status vocabulary to `live | cached | demo | stale | error`.
- Add frequency, data-as-of, source label, limitations, and caveats to responses.
- Add benchmark mapping interface.
- Keep deterministic demo data.
- Keep FRED optional and server-side.

What not to build:

- No paid market-data vendor integration until contracts are stable.
- No browser-delivered provider keys.

Acceptance criteria:

- Analytics demo still returns usable data.
- Demo data is labeled `demo`.
- Provider failures become structured errors.
- Frontend type definitions match backend payloads.

Tests/validation:

- Update backend provider tests.
- Add tests for status mapping and provider errors.

## Phase 3: Build core analytics library with tested methods

Goal:

- Turn existing analytics helpers into a documented, desk-ready analytics layer.

Files likely to change:

- `backend/app/analytics/quant_library.py`
- `backend/app/analytics/models.py`
- `backend/app/analytics/metric_explanations.py`
- `backend/tests/test_quant_library_foundation.py`
- `backend/tests/test_analytics.py`

What to build:

- Normalize naming between duplicate methods.
- Add rolling drawdown.
- Add realized volatility wrapper.
- Add rolling correlation.
- Add curve level/slope/curvature.
- Add transparent method metadata for every MVP metric.
- Add minimum-data warnings.

What not to build:

- No heavy PCA/LOF/stationarity implementation unless MVP analytics are already solid.
- No proprietary model names.

Acceptance criteria:

- Each MVP method has tests.
- Each method returns values plus explanation metadata or method id.
- Thin samples return warnings instead of misleading values.

Tests/validation:

- Unit tests for each method.
- Edge-case tests for empty series, missing data, zero variance, and short windows.

## Phase 4: Build redesigned Market Overview and Rates Desk

Goal:

- Ship the first two coherent desks using the new screen structure.

Files likely to change:

- `frontend/src/app/quant-library/page.tsx`
- `frontend/src/components/quant-library/*`
- `backend/app/services/quant_library.py`
- `backend/app/api/routes.py`

What to build:

- `ResearchQuestionHeader`
- `CurrentStateCard`
- `MetricCard`
- `DataFreshnessBadge`
- `MethodNote`
- `InterpretationPanel`
- `CaveatPanel`
- `HowToReadPanel`
- `NextChecksPanel`
- Market Overview payload.
- Rates Desk payload.

What not to build:

- No newspaper automation.
- No route explosion unless it improves usability.

Acceptance criteria:

- Overview and Rates answer their research questions.
- Data freshness appears before interpretation.
- Rates Desk shows curve, spreads, method notes, caveats, and next checks.

Tests/validation:

- Frontend typecheck.
- Backend tests.
- Browser smoke test for desktop and mobile widths.

## Phase 5: Build Equity / Index Desk

Goal:

- Provide broad market and single-symbol context without stock-picking behavior.

Files likely to change:

- `frontend/src/components/quant-library/*`
- `backend/app/services/quant_library.py`
- `backend/app/analytics/quant_library.py`
- `frontend/src/lib/api.ts`

What to build:

- Symbol selector or controlled default universe.
- Returns, volatility, drawdown, beta, relative strength, and correlation outputs.
- Method notes for each metric.
- Benchmark caveat panel.

What not to build:

- No personalized security recommendations.
- No fundamentals/event deep dive in MVP.

Acceptance criteria:

- User can compare indices/ETFs/equities against a benchmark.
- Results avoid buy/sell/hold language.
- Benchmark and window are visible.

Tests/validation:

- Analytics tests for beta/correlation/drawdown.
- UI smoke test with default symbols.

## Phase 6: Build Risk & Anomaly Desk

Goal:

- Surface what looks unusual or fragile before any conclusion is written.

Files likely to change:

- `frontend/src/components/quant-library/*`
- `backend/app/services/quant_library.py`
- `backend/app/analytics/quant_library.py`

What to build:

- `AnomalyTable`
- `SourceQualityPanel`
- Z-score anomaly flags.
- Rolling volatility/drawdown/correlation outputs.
- False-positive caveat notes.

What not to build:

- No Local Outlier Factor unless explainability and tests are ready.
- No "signal" language.

Acceptance criteria:

- Anomaly rows show metric, threshold, window, source, and reason.
- Desk uses "worth investigating" language.
- Source quality warnings are visible.

Tests/validation:

- Unit tests for anomaly thresholds and thin samples.
- UI smoke test for no-anomaly and many-anomaly states.

## Phase 7: Build Scenario Engine

Goal:

- Make assumptions explicit and test conditional market shocks.

Files likely to change:

- `backend/app/services/quant_library.py`
- `backend/app/analytics/models.py`
- `backend/app/api/routes.py`
- `frontend/src/components/quant-library/*`

What to build:

- `ScenarioControlPanel`
- Preset scenarios.
- User-editable shock inputs.
- Impact table.
- Factor contributions.
- Invalidation checks.

What not to build:

- No personalized advice.
- No promised portfolio optimization.
- No complex historical analogs yet.

Acceptance criteria:

- Scenario output shows shocks before results.
- Results are labeled conditional and sample-sensitive.
- Built-in scenarios avoid official-sounding claims unless exact source/method is documented.

Tests/validation:

- Deterministic stress-test unit tests.
- UI smoke test for preset and custom shocks.

## Phase 8: Build Research Notes

Goal:

- Turn structured analysis into a safe, evidence-backed note.

Files likely to change:

- `frontend/src/lib/story-engine/*`
- `frontend/src/components/quant-library/*`
- `backend/app/services/quant_library.py`
- `backend/app/api/routes.py`

What to build:

- `ResearchNoteCard`
- Note schema with question, data, observations, interpretation, caveats, next checks, and sources.
- Publish-readiness status.
- Safety checks for recommendation language.

What not to build:

- No automatic newspaper publishing.
- No pretending generated notes are final editorial output.

Acceptance criteria:

- Each note links back to desk outputs, methods, and data freshness.
- Notes include caveats and next checks.
- Safety tests reject advice language.

Tests/validation:

- Story-engine safety tests.
- Snapshot/schema tests for research-note output.

## Phase 9: Prepare subscriber-readiness hardening

Goal:

- Remove prototype ambiguity before paid users see the product.

Files likely to change:

- `frontend/src/app/quant-library/*`
- `backend/app/services/*`
- `backend/app/api/routes.py`
- Deployment/config docs.

What to build:

- Route smoke tests.
- Error/fallback hardening.
- Known limitations UI.
- Production data configuration notes.
- No exposed keys.
- Feature flag or gating readiness.

What not to build:

- No public paid launch until checklist passes.

Acceptance criteria:

- Subscriber-readiness checklist is green or limitations are intentionally visible.
- All tests pass.
- Production deployment notes exist.

Tests/validation:

- Backend tests.
- Frontend typecheck.
- Browser smoke tests.
- Deployment sanity checks.

## Phase 10: Later, connect research notes into Ballzatram Daily

Goal:

- Make Quant Library output usable by the newspaper layer after the workstation is valuable on its own.

Files likely to change:

- `frontend/src/lib/story-engine/*`
- `frontend/src/components/newspaper/*`
- `frontend/src/app/daily/page.tsx`
- Future backend note persistence.

What to build:

- Explicit handoff from Research Notes to Ballzatram Daily.
- Source/caveat preservation.
- Editorial review state.

What not to build:

- No automated publication before paid workstation readiness.

Acceptance criteria:

- Every story can trace back to source data, methods, caveats, and analysis run.
- Newspaper layer does not mutate research claims into advice.

Tests/validation:

- Story safety tests.
- Generated note lineage tests.

## One-month production-readiness roadmap

### Week 1: architecture + analytics foundation

- Align data status model.
- Add provider metadata fields.
- Normalize analytics functions.
- Expand method tests.
- Finalize six-desk MVP scope.

### Week 2: core desks

- Build Market Overview.
- Build Rates Desk.
- Build Equity / Index Desk.
- Add source-quality panels and method notes.

### Week 3: scenario/risk/research notes

- Build Risk & Anomaly Desk.
- Build Scenario Engine.
- Build Research Notes schema and UI.
- Add safety tests for advice language.

### Week 4: polish, QA, subscriber gating readiness, docs, deployment hardening

- Route smoke tests.
- Mobile layout pass.
- Error-state hardening.
- Known limitations panel.
- Deployment notes.
- Subscriber-readiness checklist review.

## Recommended next implementation prompt

Use this prompt for the next Codex pass:

```text
Implement Phase 1 of docs/quant-library-implementation-plan.md in the ballzatram repo. Keep the work docs-aligned and scoped: stabilize /quant-library, preserve /macro-board redirects and API aliases, consolidate the visible UI to the six MVP desks from docs/quant-library-product-spec.md, strengthen demo/freshness/not-financial-advice labels, and do not build the full redesign yet. Run backend tests and frontend typecheck.
```
