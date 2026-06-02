# Quant Library Subscriber-Readiness Checklist

Date: 2026-06-02

Quant Library should not be shown to paid users until this checklist is complete or any remaining gaps are visibly marked as known limitations.

## Data and source truthfulness

- [ ] Live, cached, demo, stale, and error data are clearly labeled.
- [ ] Demo data is never described as live.
- [ ] Every displayed metric has provider/source metadata.
- [ ] Every displayed metric has data-as-of and retrieved-at metadata where available.
- [ ] Source limitations are visible to users.
- [ ] Provider failures are handled without crashing the whole desk.
- [ ] Partial-success states show what loaded and what failed.
- [ ] FRED and other server-side keys are never exposed to the browser.
- [ ] Browser-delivered static tools are not treated as production data architecture.

## Routes and product scope

- [ ] `/quant-library` renders successfully in production.
- [ ] `/macro-board` compatibility redirect still works.
- [ ] `/api/quant-library/*` endpoints used by the UI work.
- [ ] `/api/macro-board/*` compatibility aliases still work until intentionally retired.
- [ ] No broken navigation links in the Quant Library route.
- [ ] The MVP exposes only the six essential desks or clearly marks non-MVP surfaces as deferred.
- [ ] Newspaper automation is not presented as live product scope.
- [ ] Bettor's Corner and Weather Bot are not coupled into this rebuild.

## Finance safety

- [ ] No buy/sell/hold wording appears in user-facing Quant Library output.
- [ ] No "guaranteed," "prediction," "proves," "risk-free," or "lock" language appears.
- [ ] Outputs are framed as educational research context, not advice.
- [ ] Personalized portfolio guidance is not implied unless a future user-scoped advisory framework exists.
- [ ] Every modeled output includes caveats.
- [ ] Every scenario output states assumptions before results.
- [ ] Regime labels are described as descriptive, not forecasts.
- [ ] Confidence language is justified and not theatrical.

## Methods and explanations

- [ ] MVP methods are documented in `docs/quant-library-methodology.md`.
- [ ] UI method notes exist near outputs.
- [ ] Lookback windows and frequency are visible.
- [ ] Minimum data requirements are enforced or warned.
- [ ] Thin samples do not produce confident interpretations.
- [ ] Z-scores and anomaly flags are described as "worth investigating."
- [ ] RSI and moving averages are teaching/time-series context only.
- [ ] Yield-curve inversions are not described as timers.

## UI readiness

- [ ] Every desk starts with a research question.
- [ ] Data freshness appears before interpretation.
- [ ] Current state, metrics, chart/table, interpretation, method notes, caveats, next checks, and source panel are present.
- [ ] Loading, empty, and error states are implemented.
- [ ] Mobile layout is usable and not broken.
- [ ] Text does not overlap or overflow controls.
- [ ] Tables are readable or horizontally scrollable on small screens.
- [ ] Caveats are visible without hover-only interaction.
- [ ] Reports/exports are not promised unless working.
- [ ] Workspace persistence is not promised unless user-scoped.

## Backend readiness

- [ ] Backend errors return structured messages.
- [ ] Provider errors are captured in structured `errors` fields.
- [ ] Demo provider remains deterministic for tests.
- [ ] Live provider failures degrade gracefully.
- [ ] API schemas are stable enough for frontend types.
- [ ] No API keys or secrets appear in logs, payloads, client bundles, or docs.
- [ ] Workspace storage is either production/user-scoped or clearly marked prototype-only.
- [ ] Cache behavior and stale thresholds are documented.

## Tests and validation

- [ ] Backend unit tests pass.
- [ ] Quant Library analytics tests pass.
- [ ] Frontend typecheck passes.
- [ ] Route smoke tests cover `/quant-library` and `/macro-board`.
- [ ] API smoke tests cover `/api/quant-library/analytics-demo`, `/api/quant-library/universes`, and workspace endpoints if visible.
- [ ] Browser smoke test covers desktop and mobile widths.
- [ ] Error-state test covers backend unavailable or provider failure.
- [ ] Safety tests catch prohibited advice language in generated research notes.

## Production deployment notes

- [ ] Required environment variables are documented.
- [ ] Optional provider keys are documented as server-side only.
- [ ] Deployment health checks include backend `/health`.
- [ ] Known provider limitations are visible.
- [ ] Known product limitations are visible to users.
- [ ] Rollback plan exists if provider data fails.
- [ ] Monitoring/logging captures provider error rates without leaking sensitive data.

## Current known risks as of 2026-06-02

- The current `frontend/src/app/quant-library/page.tsx` is a large mixed-purpose client component and should be split before subscriber launch.
- The current UI shows eight desk concepts, while the MVP should focus on six desks.
- The current story-generation preview risks pulling attention toward Ballzatram Daily before Quant Library is valuable as a standalone tool.
- `DataFreshness.status` now accepts explicit `demo/cached/stale`; remaining `fallback` usage should be compatibility-only.
- Current workspace storage should be treated as prototype until user-scoped and production-backed.
- Legacy `backend/app/services/macro_board.py` has been retired; continue checking for old MacroBoard language in compatibility docs and routes.
- The static `tools/macroboard/*` predecessor has been retired; keep redirects working for old URLs.

## Go/no-go rule

Quant Library can move toward paid users only when:

- All critical safety/data/route items are checked.
- Any unchecked non-critical items are visible as known limitations.
- Tests pass.
- A human reviewer confirms the UI does not imply personalized investment advice.
