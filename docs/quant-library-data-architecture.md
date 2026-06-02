# Quant Library Data Architecture

Date: 2026-06-02

## Goal

Quant Library data architecture must make research outputs reproducible, explainable, and honest about source quality.

The core rule:

No number should reach the UI without provider, source, freshness, frequency, status, and limitations metadata.

## Existing architecture

Current reusable pieces:

- `backend/app/services/market_data/models.py` defines `DataFreshness`, price series, quote, rates series, yield curve, and universe models.
- `backend/app/services/market_data/providers.py` defines the `MarketDataProvider` protocol and `CompositeMarketDataProvider`.
- `backend/app/services/market_data/demo_provider.py` provides deterministic demo prices, quotes, rates, yield curve, and universes.
- `backend/app/services/market_data/fred_provider.py` provides live FRED rates when `FRED_API_KEY` is present.
- `backend/app/services/market_data/factory.py` is the provider swap point.
- `backend/app/services/quant_library.py` builds the current analytics demo payload.
- `backend/app/api/routes.py` exposes `/api/quant-library/analytics-demo`, `/api/quant-library/universes`, `/api/quant-library/research`, `/api/quant-library/stress-test`, and workspace endpoints.
- `backend/app/services/macro_board.py` has been retired. New Quant Library research/workspace/series/market-data compatibility endpoints use `backend/app/services/quant_library.py`.
- `demo_data/macro_timeseries.csv` is the bundled demo macro data source.

## What should be reused

Reuse:

- Provider protocol pattern.
- Demo provider for deterministic local and CI behavior.
- FRED rates provider, after hardening freshness and error semantics.
- Universe registry.
- Analytics demo service as a temporary integration harness.
- Compatibility aliases for `/macro-board`.
- Existing backend tests as baseline coverage.

## What should be replaced or redesigned

Replace or redesign:

- Remaining legacy uses of `fallback` as user-facing copy. Paid UI should use `demo`, `cached`, `stale`, or `error` as appropriate.
- Any remaining old macro workflow language that implies recommendations, "opportunity," or decision automation.
- Browser/static Yahoo-style fetching as production architecture. The old `tools/macroboard` predecessor has been retired.
- Any workspace persistence that is not user-scoped before paid release.
- Any generated story output that does not preserve method and source lineage.

## Provider interfaces

Provider interfaces should support these capabilities:

- Rates series.
- Yield curve points.
- Index/ETF price series.
- Equity price series.
- Quote snapshots.
- Market universes.
- Benchmark mapping.
- Optional macro series.
- Optional news/context later.

Recommended Python protocol shape:

```python
class QuantMarketDataProvider(Protocol):
    name: str

    def get_rates_series(self, series_ids: Sequence[str], *, range: str, interval: str) -> RatesSeriesResponse: ...
    def get_yield_curve(self, *, date: date | None = None) -> YieldCurveResponse: ...
    def get_price_series(self, symbol: str, *, range: str, interval: str) -> PriceSeriesResponse: ...
    def get_quote(self, symbol: str) -> QuoteResponse: ...
    def get_batch_quotes(self, symbols: Sequence[str]) -> list[QuoteResponse]: ...
    def get_universe(self, universe_id: str) -> MarketUniverse: ...
    def get_benchmark(self, symbol: str) -> BenchmarkMapping: ...
    def get_macro_series(self, series_ids: Sequence[str], *, range: str, interval: str) -> MacroSeriesResponse: ...
```

The current `MarketDataProvider` in `backend/app/services/market_data/providers.py` already covers most MVP needs. Add benchmark mapping and optional macro series rather than creating an unrelated system.

## Data object metadata

Every data object should carry:

- `provider`
- `sourceLabel`
- `retrievedAt`
- `dataAsOf`
- `frequency`
- `status`
- `limitations`
- `caveats`

Recommended status vocabulary:

- `live`: fetched from live provider during this request or refresh cycle.
- `cached`: fetched from approved cache within freshness SLA.
- `demo`: deterministic or bundled data used for development/demo.
- `stale`: cached/live provider data older than freshness SLA.
- `error`: provider failed and no acceptable data is available.

Current state:

- `DataFreshness` accepts `status: live | cached | demo | stale | fallback | missing | error | unknown`. New demo payloads should emit `demo`; `fallback` remains compatibility-only.

## Source quality metadata

Add source quality fields where possible:

- `license`: free/public/paid/internal/user-uploaded.
- `revisionPolicy`: static/revisable/unknown.
- `publicationLag`: estimated lag.
- `coverageStart`
- `coverageEnd`
- `missingValuePolicy`
- `adjustmentPolicy`: split-adjusted/dividend-adjusted/raw/unknown.
- `knownLimitations`

These fields can live in a `SourceQuality` model referenced by data responses or embedded in each response for MVP.

## Demo and fallback data requirements

Demo data must:

- Be deterministic.
- Be clearly labeled as demo.
- Avoid real-time claims.
- Exercise all MVP desks.
- Include rates, prices, benchmark, and anomaly examples.
- Include metadata indicating demo source, as-of date, and limitations.

Demo data must not:

- Be silently mixed with live data without labeling.
- Use stale real data while claiming to be live.
- Drive paid-user conclusions without visible warning.

## Caching expectations

MVP caching:

- Add a provider cache boundary after provider contracts are stable.
- Cache by provider, symbol/series, range, interval, and data frequency.
- Store retrieved-at and source as-of timestamps.
- Apply freshness thresholds by asset class and frequency.

Suggested freshness thresholds:

- Daily equity/index/ETF prices: stale after 24 market hours.
- Quote snapshots: stale after minutes in live mode; in MVP quote data can be disabled or clearly delayed.
- FRED monthly macro series: stale based on publication calendar, not intraday time.
- Treasury daily rates: stale after next market day or provider-specific publication lag.

## Error handling

Provider layer:

- Providers raise `ProviderError` with provider name and recoverable message.
- Composite provider tries approved fallback providers.

Service layer:

- Convert provider failures into structured `errors` arrays.
- Keep partial success possible when one symbol fails but the desk can still render.
- Attach data status to every successful and fallback object.

UI layer:

- Show `ErrorState` when no acceptable data exists.
- Show `SourceQualityPanel` when partial, stale, cached, or demo data is used.
- Never crash the whole desk because one provider call fails.

## User-uploaded data considerations

User-uploaded CSV support is non-MVP for subscriber launch unless scoped carefully.

When added:

- Require explicit source label: "user uploaded".
- Store user data only in user-scoped workspace storage.
- Validate dates, symbols, units, frequency, and missing values.
- Show parse errors in plain English.
- Never mix user-uploaded holdings with generic advice language.
- Keep uploaded data out of Ballzatram Daily unless user explicitly exports or publishes.

## Future paid-user workspace storage

Paid-user workspaces require:

- Authentication and user-scoped storage.
- Workspace ownership checks.
- Versioned analysis runs.
- Stored input assumptions.
- Stored provider metadata and source snapshots.
- Reproducible research note linkage.
- Deletion/export controls.
- No global temp-file persistence for private work.

Current `WorkspaceStore` should be treated as prototype storage until it is user-scoped and production-backed.

## Data architecture for each MVP desk

### Market Overview

Inputs:

- Default universe price series.
- Benchmark.
- Rates spread summary.
- Quote snapshots or latest close.

Outputs:

- Cross-asset metrics.
- Correlation snapshot.
- Regime summary.
- Source quality.

### Rates Desk

Inputs:

- 3M, 2Y, 10Y, 30Y rates.
- Optional fed funds and macro context.

Outputs:

- Curve points.
- 2Y/10Y and 3M/10Y spreads.
- Level/slope/curvature.
- PCA factors in future phase.

### Equity / Index Desk

Inputs:

- Price series for selected symbols.
- Benchmark mapping.
- Universe metadata.

Outputs:

- Returns, volatility, drawdown, beta, correlation, RSI/moving average teaching signals.

### Risk & Anomaly Desk

Inputs:

- Aligned returns.
- Metrics from other desks.
- Source quality flags.

Outputs:

- Anomaly flags.
- Rolling volatility/drawdown/correlation.
- Missing/stale/error data warnings.

### Scenario Engine

Inputs:

- Shock definitions.
- Factor mappings or historical sensitivities.
- Selected assets or generic demo holdings.

Outputs:

- Conditional impact estimates.
- Factor contributions.
- Assumptions and invalidation checks.

### Research Notes

Inputs:

- Structured outputs from the other desks.
- Source metadata.
- Method metadata.
- Caveats.

Outputs:

- Evidence-backed research note draft.
- Source appendix.
- Publish-readiness status.
