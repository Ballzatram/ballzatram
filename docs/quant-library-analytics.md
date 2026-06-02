# Quant Library Analytics Foundation

Date: 2026-06-01

## Purpose

Quant Library is Ballzatram's explainable market analysis workbench. This foundation gives it reusable market-data contracts, swappable providers, deterministic local demo data, analytics utilities, metric explanations, and a small frontend proof panel. It does not make investment recommendations and does not require API keys for local demo mode.

## Architecture

- `backend/app/services/market_data/models.py` defines shared market-data contracts for freshness, price series, quotes, rates series, yield curves, and universes.
- `backend/app/services/market_data/providers.py` defines the `MarketDataProvider` interface:
  - `get_rates_series()`
  - `get_yield_curve()`
  - `get_price_series(symbol, range, interval)`
  - `get_quote(symbol)`
  - `get_batch_quotes(symbols)`
  - `get_universe(universe_id)`
- `backend/app/services/market_data/demo_provider.py` implements deterministic fallback data for local development.
- `backend/app/services/market_data/factory.py` is the central provider swap point for future Yahoo, FRED, feed API, or paid provider adapters.
- `backend/app/services/market_data/universes.py` defines initial market universes.
- `backend/app/analytics/quant_library.py` contains reusable analytics utilities.
- `backend/app/analytics/metric_explanations.py` contains explanation metadata for each metric.
- `backend/app/services/quant_library.py` builds a structured analytics demo payload for the frontend and future story-generation layers.
- `frontend/src/app/quant-library/page.tsx` renders a small internal analytics foundation preview without adding a heavy charting dependency.

## Providers

Current local provider:

- `DemoMarketDataProvider`
  - Requires no API keys.
  - Generates deterministic fallback price series for arbitrary symbols.
  - Synthesizes rates and yield-curve data from `demo_data/macro_timeseries.csv`.
  - Marks freshness status as `fallback` and includes warnings so UI and future story logic can avoid treating demo data as live.

Optional rates provider:

- `FredRatesProvider`
  - Activates through the provider factory when `FRED_API_KEY` is present.
  - Serves Treasury and policy-rate series through the same `get_rates_series()` and `get_yield_curve()` interface.
  - Does not serve equity/index/ETF prices; the composite provider falls back to demo price data unless a future price provider is added.

Future provider candidates:

- Yahoo-style chart adapter for equities, ETFs, and indices.
- FRED/feed API adapter for Treasury rates and macro series.
- Paid market-data vendor adapter for quotes, fundamentals, and corporate actions.
- Cache/degradation layer that records provider failures, last successful refresh, and source timestamps.

Provider failures should raise `ProviderError` inside provider implementations and be converted into structured `errors` fields at service boundaries. UI code should render errors and fallback status, not crash.

## Initial Universes

The initial universe registry includes:

- Major US indices
- Sector ETFs
- International ETFs
- Mega-cap tech
- Defensive equities
- Small caps
- Rates-sensitive assets

These universes are examples and research starting points. They are not recommendations, model portfolios, or suggested trades.

## Metrics

The analytics foundation includes:

- Daily returns
- Cumulative returns
- Rolling volatility
- Max drawdown
- Moving averages
- RSI
- Z-score
- Beta vs benchmark
- Correlation matrix
- Relative strength
- Yield-curve spreads, including 2Y/10Y and 3M/10Y
- Simple descriptive regime scoring

Each metric has explanation metadata:

- Name
- Short explanation
- Why it matters
- Common false signals/caveats
- Basic interpretation rules

The explanation registry is intended for both UI rendering and future newspaper-story generation. A generated story should be able to cite not just a number, but what the number means, why it matters, and what can mislead.

## Caveats

- Quant Library is not a stock-picking tool.
- Quant Library is not a prediction engine.
- Metrics are descriptive and sample-dependent.
- Demo/fallback data should never be presented as fresh live market data.
- Beta, correlation, RSI, and moving averages can all produce false confidence when regimes shift.
- Yield-curve inversions are contextual signals, not clocks.
- Regime scoring is a transparent heuristic, not a forecast.

## Frontend Demo

The Quant Library page now includes a small "Internal analytics foundation" preview that:

- Loads sample symbols through `/api/quant-library/analytics-demo`.
- Shows demo metrics for `SPY`, `QQQ`, and `TLT`.
- Renders explanation metadata beside outputs.
- Shows fallback/freshness labels.
- Shows a safe error state if the backend endpoint is unavailable.

The preview is intentionally small. Later phases can replace it with richer desks for Rates, Index & ETF Explorer, Stock Analyzer, Risk Scanner, Technical Analysis Lab, Portfolio Sandbox, and Research Notes.

## Future Expansion Plan

1. Add live provider adapters behind the existing `MarketDataProvider` interface.
2. Add provider-level caching, retry, and freshness thresholds.
3. Store normalized observations and provider metadata for reproducible research notes.
4. Split each Quant Library module into its own service-level payload:
   - Rates Desk: curve, spreads, policy-rate context.
   - Index & ETF Explorer: breadth, leadership, correlation, concentration.
   - Stock Analyzer: benchmark sensitivity and factor context without recommendations.
   - Risk Scanner: drawdown, volatility, concentration, missing-data warnings.
   - Technical Analysis Lab: moving averages, RSI, z-score, event windows.
   - Portfolio Sandbox: holdings, weights, scenario shocks, caveats.
   - Research Notes: structured summaries that can become newspaper stories.
5. Add story-output contracts that link a published story back to the tool run, provider freshness, inputs, and caveats that produced it.
