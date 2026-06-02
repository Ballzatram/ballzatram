# Quant Library UI System

Date: 2026-06-02

## Design direction

Quant Library should feel like a research workstation:

- Serious, clean, and clear.
- A quant terminal with readable notes.
- Ballzatram-native without being goofy.
- Newspaper/lab flavor is acceptable, but tool usefulness comes first.
- Desktop-first, responsive enough for mobile.
- Dense enough for repeated research work, not decorative dashboard clutter.

Current UI context:

- `frontend/src/app/quant-library/page.tsx` now renders the active six-desk workstation and should stay scoped to the MVP desks.
- `frontend/src/components/quant-library/QuantLibraryPrimitives.tsx` now contains the clearer component system around research questions, state summaries, method notes, caveats, source quality, scenarios, anomaly tables, and research notes.
- `frontend/src/components/ai-tools/ToolPrimitives.tsx` is used by the current guided workspace. Reuse only where the component fits the research workstation pattern.

## Screen structure

Every Quant Library screen should use this structure:

1. Page title / research question
2. Current state summary
3. Key metric cards
4. Main chart/table
5. Interpretation panel
6. Method notes
7. Caveats
8. How to read this page
9. What to check next
10. Data freshness/source panel

The user should never have to hunt for whether data is demo, stale, live, or failed.

## Layout rules

- Desktop layout should use a primary analysis column plus a right-side notes/source rail when space allows.
- Mobile layout should stack in this order: research question, data freshness, current state, metrics, chart/table, interpretation, caveats, next checks.
- Avoid nested cards.
- Use cards for repeated metric items, modals, and compact panels only.
- Avoid oversized hero treatment inside tool screens.
- Keep chart and table areas stable so loading/error labels do not resize the page.
- Do not hide caveats behind hover-only interactions.
- Use responsive tables with horizontal scroll where needed.

## Reusable components

### ResearchQuestionHeader

Purpose:

- Establish the page's research question and scope.

Props:

- `title`
- `question`
- `scopeLabel`
- `asOf`
- `status`
- `primaryAction`
- `secondaryAction`

Rules:

- The headline should be the research question or desk name.
- Include data status near the header.
- Avoid marketing copy.

### CurrentStateCard

Purpose:

- Summarize what the desk sees right now.

Props:

- `stateLabel`
- `summary`
- `drivers`
- `confidenceLanguage`
- `updatedAt`

Rules:

- Use cautious language.
- Distinguish observed metric changes from interpretation.

### MetricCard

Purpose:

- Show one numeric output with context.

Props:

- `label`
- `value`
- `unit`
- `window`
- `direction`
- `methodId`
- `explanation`
- `status`

Rules:

- Include window/frequency when relevant.
- Avoid color-only meaning.
- No "good/bad" labels unless clearly defined.

### RegimeBadge

Purpose:

- Show transparent regime label.

Props:

- `label`
- `score`
- `drivers`
- `caveat`

Rules:

- Must link to reasons.
- Must state that regime is descriptive, not a forecast.

### DataFreshnessBadge

Purpose:

- Show live/cached/demo/stale/error status.

Props:

- `provider`
- `sourceLabel`
- `retrievedAt`
- `dataAsOf`
- `frequency`
- `status`

Rules:

- Use exact status text.
- Demo data should say "demo", not "fallback" in user-facing paid UI.

### MethodNote

Purpose:

- Explain the method near the output.

Props:

- `methodName`
- `whatItMeasures`
- `whyItMatters`
- `howToInterpret`
- `falseSignals`
- `minimumData`

Rules:

- Keep explanations short enough to read inside the workflow.
- Link to longer methodology docs when needed.

### InterpretationPanel

Purpose:

- Convert metrics into careful plain-English interpretation.

Props:

- `observations`
- `interpretation`
- `uncertainty`
- `evidenceLinks`

Rules:

- Observations and interpretations should be visually separate.
- Use "may suggest" and "worth investigating" language.

### CaveatPanel

Purpose:

- Make model/data limitations visible.

Props:

- `caveats`
- `severity`
- `whatCouldBreakThis`

Rules:

- Caveats are not optional.
- At least one caveat should be present for every modeled output.

### HowToReadPanel

Purpose:

- Teach the user how to approach the page.

Props:

- `steps`
- `commonMistakes`

Rules:

- Do not write marketing copy.
- Keep it procedural and concise.

### NextChecksPanel

Purpose:

- Tell the user what to investigate next.

Props:

- `checks`
- `links`

Rules:

- Next checks should route to another desk, data quality panel, or method note.

### ScenarioControlPanel

Purpose:

- Let users set scenario shocks transparently.

Props:

- `shockControls`
- `presetScenarios`
- `assumptions`
- `resetAction`
- `runAction`

Rules:

- Show units and baseline values.
- Show assumptions before results.

### AnomalyTable

Purpose:

- Display unusual observations and why they were flagged.

Props:

- `rows`
- `method`
- `threshold`
- `window`
- `sourceStatus`

Rules:

- Use "flagged" or "worth investigating," not "signal."
- Include method and threshold in the table header or side note.

### ResearchNoteCard

Purpose:

- Preview a note derived from structured analysis.

Props:

- `question`
- `observations`
- `interpretation`
- `caveats`
- `sources`
- `publishStatus`

Rules:

- Must include source and caveat summary.
- Must not imply recommendation language.

### SourceQualityPanel

Purpose:

- Summarize provider quality, freshness, and limitations.

Props:

- `provider`
- `sourceLabel`
- `retrievedAt`
- `dataAsOf`
- `frequency`
- `status`
- `limitations`
- `errors`

Rules:

- Show source quality before final interpretation.
- Make stale/demo/error states visually obvious.

### LoadingState

Purpose:

- Keep layout stable while data loads.

Rules:

- Say what is loading.
- Preserve the space that chart/table content will occupy.

### EmptyState

Purpose:

- Explain missing inputs without blaming the user.

Rules:

- Say what is missing and what to do next.

### ErrorState

Purpose:

- Explain provider or backend failures.

Rules:

- Include whether demo/cached data is being shown.
- Do not expose stack traces.

## Tone and copy rules

Use this voice:

- Clear.
- Calm.
- Specific.
- Smart but not academic.
- Direct about uncertainty.

Rules:

- Explain like the user is smart but not a quant.
- Avoid condescension.
- Avoid hype.
- Avoid trading instructions.
- Always distinguish observation from interpretation.
- Always include uncertainty.

Preferred phrases:

- "This may suggest..."
- "Historically, this can indicate..."
- "Worth investigating..."
- "This does not prove..."
- "The model may be wrong if..."

Avoid phrases:

- "Buy"
- "Sell"
- "Guaranteed"
- "Prediction"
- "This proves"
- "Risk-free"
- "Lock"

## Desk-specific UX

### Market Overview

- Header question: "What does the current market sample suggest, and what should I inspect next?"
- Main chart/table: cross-asset summary.
- Right rail: data freshness, regime reasons, next checks.

### Rates Desk

- Header question: "What is the curve saying about policy pressure and rate-sensitive risk?"
- Main chart/table: yield curve and spread history.
- Right rail: method notes for spreads, level/slope/curvature, publication caveats.

### Equity / Index Desk

- Header question: "Which markets are leading or lagging, and what risk did they take?"
- Main chart/table: returns, drawdown, volatility, beta, correlation.
- Right rail: benchmark caveats and ETF concentration warnings.

### Risk & Anomaly Desk

- Header question: "What looks unusual or fragile?"
- Main chart/table: anomaly flags, rolling volatility, drawdown, rolling correlation.
- Right rail: false positives and source-quality panel.

### Scenario Engine

- Header question: "What happens under a stated shock?"
- Main chart/table: scenario impact table and factor contributions.
- Right rail: assumptions, caveats, invalidation checks.

### Research Notes

- Header question: "What can be written from this analysis without losing the evidence trail?"
- Main chart/table: research note cards.
- Right rail: source appendix, method notes, publish-readiness state.

## Visual direction

- Base palette should not be one-note dark blue/slate. Use a quiet workstation base with restrained accents for freshness, warning, and method categories.
- Use typography hierarchy for scanning: compact section headings, readable body text, monospaced numerics.
- Use icons only where they clarify controls or status.
- Avoid decorative orbs, generic gradients, and novelty terminal clutter.
- Ballzatram flavor can appear in labels and editorial tone, but the workstation must remain useful first.
