# Ballzatram Pages-First Audit

Date: 2026-08-18

## Current goal

Ballzatram does not need SaaS infrastructure yet. The immediate product goal is simpler: `ballzatram.com` should be a place where Devin can open tools, simulations, games, and experiments on a phone or laptop and use them.

The default implementation rule for this stage is:

> If a feature can run honestly in browser JavaScript without exposing secrets, prefer the GitHub Pages version.

Do not add a paid server, database, auth system, or durable account layer until a concrete feature actually requires it.

## Bucket A — works on GitHub Pages now

These are already browser-native or have useful browser-only behavior:

- Ballzatram homepage
- Econ Arcade static hub
- Strategy Studio
- Prisoner's Dilemma Lab
- Invisible Hands static market simulation
- Central Banker
- Stoney Bologna's Bullshit Simulator 7
- Weather Desk paper-mode worksheet/calculator
- Static MacroBoard (`tools/macroboard`)
- Parcel static prototype/browser fallback (`tools/parcel`), with source caveats
- AI Edit static shell/browser draft behavior, but **not** real video rendering

## Bucket B — easy/high-value browser conversions

### Scenario Stress Lab — converted in this pass

The current V3 scenario backend is a deterministic fixed-factor model:

- rates sensitivity: -0.24
- CPI sensitivity: -0.11
- growth sensitivity: +0.19
- oil sensitivity: -0.07
- credit sensitivity: -0.21
- confidence band: illustrative +/- 3 percentage points

It does not require Python, secrets, or live data. A Pages-native implementation belongs under `tools/scenario/` and should be labeled as a portfolio-level sensitivity illustration, not a security-specific forecast.

### Supply & Demand Lab — next strong conversion

The Next implementation is a deterministic local simulation. Port the model and controls into a static HTML/JS page so the modern supply/demand experience can be played from Pages without Next.js.

### Reports — browser version is feasible

Markdown composition, editing, ordering, local drafts, and downloads can all run in the browser. A Pages-native report composer can consume Pages-native run records in localStorage.

### Portfolio — partial browser version is feasible

Weighting, covariance, volatility, drawdown, correlation, and scenario handoff can run in JavaScript. Automatic market-data acquisition is the server-dependent part. A future Pages version can start with CSV/manual data or a bundled demo dataset.

## Bucket C — genuinely needs a backend for the current experience

- Live Stock Lab market data/provider layer
- Live Portfolio market data/provider layer
- OpenAI-backed Ballzatram guide/tool-aware AI
- Server-side FRED / Alpha Vantage secrets
- Durable multi-device Workspace/user accounts
- AI Edit real video rendering (ffmpeg/workers/Redis)
- Any verified/private data pipeline requiring server credentials

These can remain in the repo and CI without being publicly hosted yet.

## Public UX rule

The public site should distinguish three states clearly:

1. **Playable now** — opens and works on GitHub Pages.
2. **Browser prototype** — useful but caveated/fallback-based.
3. **Backend later** — code exists, but the full experience is intentionally not public yet.

Do not link a user into a route that GitHub Pages cannot serve and call it live.

## Near-term sequence

1. Lab Directory + Pages-native Scenario Stress Lab.
2. Port Supply & Demand Lab to static HTML/JS.
3. Add a Pages-native report composer using localStorage run records.
4. Consider a manual/CSV Portfolio Lab if it still feels useful without live data.
5. Revisit backend hosting only when live market data or AI becomes important enough to justify it.
