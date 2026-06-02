# Quant Library Product Specification

Date: 2026-06-02

## Product vision

Quant Library is a financial econometrics research workstation that teaches non-quants how to think.

The product doctrine is:

Institutional-grade methods, retail-grade explanation.

Quant Library should feel closer to a serious rates-analysis research desk than a generic stock dashboard. It should help a smart non-quant ask better market questions, understand what a model measured, see where the data came from, and avoid treating a polished chart as certainty.

## Target user

Primary user:

- A financially curious retail investor, newsletter reader, founder, operator, student, or professional who wants serious market context without needing to already know econometrics.

Secondary user:

- A Ballzatram editor or future automated research-note generator that needs structured observations, caveats, data lineage, and plain-English method notes.

The user is assumed to be smart but not a quant. Copy should not condescend. The tool should teach concepts through the analysis itself.

## Subscriber value proposition

Quant Library becomes subscriber-worthy when it gives users:

- A disciplined market research workflow rather than loose market commentary.
- Real quantitative finance and financial econometrics methods with clear caveats.
- Data freshness and source labels attached to every output.
- Plain-English interpretation that distinguishes observation from inference.
- Scenario and stress-test tools that make assumptions visible.
- Research notes that preserve the evidence trail behind a market story.

The paid value is not a secret signal. The paid value is a better way to think.

## What Quant Library is

- A research workstation for rates, yield curve, indices, ETFs, equities, volatility, correlations, regimes, anomalies, scenarios, and portfolio/risk context.
- A teaching surface for standard quantitative methods.
- A data-lineage-first market analysis tool.
- A structured evidence generator for future Ballzatram Daily research notes.
- A place where every screen answers a research question.

## What Quant Library is not

- Not a buy/sell/hold recommendation engine.
- Not a prediction engine.
- Not a black-box confidence machine.
- Not a generic finance dashboard.
- Not a brokerage, portfolio optimizer, or personal financial adviser.
- Not a newspaper automation system in this phase.
- Not Bettor's Corner, Weather Bot, or a general Ballzatram portal.

## Existing implementation context

Current code that should be reused or carefully evolved:

- `docs/quant-library-analytics.md` documents an existing analytics foundation and should remain as historical context.
- `frontend/src/app/quant-library/page.tsx` is the active six-desk Quant Library workstation. It calls the analytics demo endpoint, shows data freshness, and renders Market Overview, Rates, Equity / Index, Risk & Anomaly, Scenario Engine, and Research Notes.
- `frontend/src/components/quant-library/QuantLibraryPrimitives.tsx` contains the workstation primitives for research headers, current state, metrics, method notes, interpretation, caveats, source quality, scenarios, anomalies, and research notes.
- `frontend/src/app/macro-board/page.tsx` redirects `/macro-board` to `/quant-library`. Keep this compatibility redirect.
- `backend/app/api/routes.py` exposes `/api/quant-library/*` routes and keeps `/api/macro-board/*` compatibility aliases. Keep aliases during the rebuild.
- `backend/app/services/quant_library.py` builds the current analytics demo payload.
- `backend/app/analytics/quant_library.py` contains reusable daily return, cumulative return, volatility, drawdown, beta, correlation, relative strength, RSI, z-score, yield-curve spread, and simple regime-score utilities.
- `backend/app/analytics/models.py` contains additional analytics including log returns, OLS regression, rolling regression, rolling beta, VaR/expected shortfall, stress tests, and basic regime detection.
- `backend/app/services/market_data/*` contains provider contracts, demo data, FRED rates, universes, and a central provider factory.
- `backend/app/services/macro_board.py` has been retired. MacroBoard URLs remain compatibility aliases, but Quant Library route logic now lives in `backend/app/services/quant_library.py`.
- The old static `tools/macroboard/*` predecessor has been retired; `/tools/macroboard/:path*` still redirects to `/quant-library`.

## Core user journeys

1. Understand the current market state.
   The user opens Market Overview, sees data freshness, current regime summary, key metrics, caveats, and the next desk to inspect.

2. Investigate rates and curve context.
   The user opens Rates Desk, reviews curve level/slope/curvature, key spreads, PCA/regime notes where available, and caveats about publication lag and false timing signals.

3. Compare equity/index behavior.
   The user opens Equity / Index Desk, compares returns, volatility, drawdowns, beta, and correlations for indices, ETFs, and selected equities.

4. Detect risk and anomalies.
   The user opens Risk & Anomaly Desk, reviews z-score flags, volatility shifts, drawdowns, rolling correlations, and source-quality warnings.

5. Run a scenario.
   The user opens Scenario Engine, chooses transparent shocks, sees modeled effects and what assumptions could break them.

6. Create a research note.
   The user opens Research Notes, turns a structured analysis run into an evidence-backed note with source labels, method notes, caveats, and next checks.

## MVP scope

MVP includes these essential desks only:

1. Market Overview
2. Rates Desk
3. Equity / Index Desk
4. Risk & Anomaly Desk
5. Scenario Engine
6. Research Notes

The current separate Stock Analyzer, Technical Analysis Lab, and Portfolio Sandbox concepts should be folded into the MVP desks or deferred. Single-name equity work belongs inside Equity / Index Desk for MVP. Technical indicators belong only as teaching/time-series context inside Risk & Anomaly Desk or Equity / Index Desk. Portfolio-specific persistence and account-like workflows are non-MVP unless they are generic demo scenarios.

## Non-MVP future scope

- Full single-name equity factor models with fundamentals, events, and revisions.
- Historical analog search.
- User-uploaded portfolio workspaces with user-scoped persistence.
- Exportable reports and PDFs.
- Paid provider integrations.
- News/context connectors.
- Automated Ballzatram Daily story publishing.
- Advanced regime models and model-comparison views.
- Auth, subscriber gating, usage limits, and billing enforcement.

## MVP desks

### Market Overview

Primary research question:

What does the current market sample suggest, and what should I inspect next?

Data needed:

- Index and ETF price series for a small default universe.
- Quote snapshots.
- Benchmark mapping.
- Yield-curve spread summary.
- Data freshness/source metadata.

Methods:

- Simple returns.
- Log returns where used in backend analytics.
- Cumulative returns.
- Rolling volatility.
- Max drawdown.
- Correlation snapshot.
- Descriptive regime classification.

Outputs:

- Current state summary.
- Regime badge.
- Key metric cards.
- Cross-asset comparison table.
- Data freshness/source panel.
- What to check next.

Explanation:

- Explain that the overview is a triage surface, not a conclusion.
- State whether outputs are live, cached, stale, demo, or error.
- Separate observed metrics from interpretation.

Caveats:

- A broad overview can hide asset-specific risk.
- Regime labels are descriptive and sample-dependent.
- Demo data proves workflow health, not market freshness.

Next investigation:

- Rates Desk if curve spreads or policy-sensitive assets are highlighted.
- Equity / Index Desk if leadership or drawdown quality is unclear.
- Risk & Anomaly Desk if volatility, z-scores, or correlations are elevated.

### Rates Desk

Primary research question:

What is the yield curve saying about policy pressure, growth expectations, and rate-sensitive risk?

Data needed:

- Treasury rates series: 3M, 2Y, 10Y, 30Y at minimum.
- Historical rates for spreads.
- Optional fed funds, inflation, unemployment, credit spreads.
- Freshness and publication-lag metadata.

Methods:

- Yield-curve spreads: 2Y/10Y and 3M/10Y.
- Curve level, slope, and curvature.
- Rolling changes in key tenors.
- PCA for level/slope/curvature decomposition as future or advanced MVP if time allows.
- Z-scores for unusual rate moves.

Outputs:

- Current curve table/chart.
- 2Y/10Y and 3M/10Y cards.
- Level/slope/curvature summary.
- Interpretation panel explaining what the curve may suggest.
- Caveats about inversions, lags, and term premium.

Explanation:

- Explain that curve shape can summarize market expectations but does not provide a countdown clock.
- Explain which tenors moved and why that matters.

Caveats:

- Yield-curve inversions are not recession timers.
- FRED data can lag and revise.
- Synthetic/demo rates are not market data.

Next investigation:

- Compare rate-sensitive ETFs/equities in Equity / Index Desk.
- Stress a rate shock in Scenario Engine.
- Check if volatility/correlation also changed in Risk & Anomaly Desk.

### Equity / Index Desk

Primary research question:

Which markets are leading or lagging, and is that leadership supported by risk-adjusted evidence?

Data needed:

- Index, ETF, and equity price series.
- Quote snapshots.
- Benchmarks and universe membership.
- Optional sector/asset-class classifications.

Methods:

- Simple and log returns.
- Cumulative returns.
- Rolling volatility and realized volatility.
- Rolling drawdown and max drawdown.
- Beta and rolling beta vs benchmark.
- Correlation and rolling correlation.
- Moving averages and RSI as teaching signals only.

Outputs:

- Comparison table for selected symbols.
- Relative strength vs benchmark.
- Drawdown and volatility cards.
- Beta/rolling beta chart.
- Correlation matrix.
- Plain-English notes for each method.

Explanation:

- Explain whether a symbol led, lagged, took more risk, or moved differently from the benchmark.
- Avoid implying that relative strength predicts future returns.

Caveats:

- Benchmark choice can change the conclusion.
- ETF labels can hide concentration.
- Single-name stocks need event, business, valuation, and fundamentals context outside MVP.

Next investigation:

- Risk & Anomaly Desk for unusual moves.
- Rates Desk for rate-sensitive exposures.
- Scenario Engine for sensitivity to shocks.

### Risk & Anomaly Desk

Primary research question:

What looks unusual, fragile, or worth investigating before writing a conclusion?

Data needed:

- Return series for selected symbols and benchmark.
- Rates and optional macro series for context.
- Data quality/freshness metadata.

Methods:

- Rolling volatility.
- Realized volatility.
- Rolling drawdown and max drawdown.
- Z-scores.
- Rolling correlation.
- Beta and rolling beta.
- Local Outlier Factor as a future anomaly-detection layer.
- ADF/KPSS stationarity tests where appropriate and explained cautiously.

Outputs:

- Anomaly table.
- Warning cards.
- Rolling volatility/drawdown charts.
- Correlation shift panel.
- Source quality panel.
- What could be a false signal.

Explanation:

- Explain anomaly flags as "worth investigating" rather than "bad" or "actionable."
- Always name the lookback window and comparison baseline.

Caveats:

- Z-scores assume the window is representative.
- Markets can remain unusual for long periods.
- LOF and other anomaly models can flag structure changes rather than errors.

Next investigation:

- Review the data source/freshness panel.
- Compare anomalies against Rates Desk and Equity / Index Desk context.
- Test a plausible shock in Scenario Engine.

### Scenario Engine

Primary research question:

How would selected assets or a generic portfolio proxy respond under transparent market shocks?

Data needed:

- Selected symbols and benchmark.
- Return history.
- Factor/rates history.
- User-selected shocks.
- Optional holdings weights for demo or future user-scoped workspaces.

Methods:

- Scenario shocks.
- Stress tests.
- Beta/factor sensitivity.
- Historical analogs as future phase.
- Confidence bands or uncertainty ranges only when methodologically justified.

Outputs:

- Scenario control panel.
- Shock assumptions.
- Estimated impact table.
- Factor contribution chart/table.
- Interpretation and caveat panels.
- "What would invalidate this scenario?"

Explanation:

- Explain the shock, the assumed transmission path, and the sample basis.
- Make assumptions editable and visible.

Caveats:

- Scenarios are maps, not forecasts.
- Linear sensitivities can fail during crises.
- User-specific portfolio advice is non-MVP unless account and suitability constraints exist.

Next investigation:

- Check which assumptions drive most of the result.
- Compare with historical drawdowns.
- Save a Research Note only after caveats are visible.

### Research Notes

Primary research question:

What can be written from this analysis without losing the evidence trail?

Data needed:

- Structured outputs from the other desks.
- Source labels and freshness metadata.
- Method notes.
- Caveats and next checks.
- User prompt/context.

Methods:

- No new quantitative method is required.
- The "method" is evidence serialization: observation, interpretation, caveat, next check, source lineage.

Outputs:

- Research note cards.
- Draft note with sections: question, data, observations, interpretation, caveats, next checks.
- Source and method appendix.
- Publish-readiness status.

Explanation:

- The note should teach the reader what was measured and what remains uncertain.

Caveats:

- A polished note can still be wrong.
- No generated note should imply recommendations or certainty.
- Ballzatram Daily publication is later scope.

Next investigation:

- Run missing data checks.
- Confirm caveats are visible.
- Route to future newspaper layer only after subscriber readiness.

## Data requirements

Every data object should carry:

- `provider`
- `sourceLabel`
- `retrievedAt`
- `dataAsOf`
- `frequency`
- `status`: `live`, `cached`, `demo`, `stale`, or `error`
- `limitations`
- `caveats`

The backend `DataFreshness` model in `backend/app/services/market_data/models.py` now accepts `live`, `cached`, `demo`, `stale`, `fallback`, `missing`, `error`, and `unknown`; new demo provider payloads should emit `demo`, while `fallback` remains accepted for compatibility.

## UX principles

- Every page starts with a research question.
- Data freshness appears before interpretation.
- Metrics are grouped by why they matter, not by dashboard density.
- Method notes are visible near outputs.
- Caveats are first-class UI, not hidden footnotes.
- Avoid generic SaaS clutter.
- Avoid confidence theater.
- Make the next investigation obvious.

## Safety and disclaimer principles

- No buy/sell/hold language.
- No guaranteed, risk-free, or prediction language.
- No personalized portfolio advice.
- No hidden demo/fallback data.
- No unsupported confidence scores.
- Every output should include uncertainty, assumptions, and caveats.
- The UI should state that outputs are educational research context, not financial advice.

## Subscriber-ready truth test

Quant Library is subscriber-ready only when:

- Live/demo/stale/error data status is unmistakable.
- The six MVP desks are coherent and route-stable.
- Backend failures produce useful UI states.
- Methods are documented and tested.
- Caveats appear next to outputs.
- The product does not promise reports, exports, workspaces, or persistence unless they actually work.
- No API keys or provider credentials are exposed.
- Route smoke tests and backend tests pass.
- Known limitations are visible to users.
