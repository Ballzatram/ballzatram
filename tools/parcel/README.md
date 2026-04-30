# Parcel: Institutional Land Aggregation Platform (Foundation)

## Product Direction
Parcel is evolving from a simple listing finder into a full **land intelligence operating system**:
- Multi-source discovery
- Normalized listing model
- Explainable scoring
- Investor-specific dashboard views
- Repeatable pipeline automation

## V1 Foundation Delivered
- Parameterized discovery UI with investment-oriented filters.
- Web discovery with resilient fallback dataset.
- Ranking and shortlist rendering in browser.
- Pipeline scaffolding for scoring + daily automation.

## Next Milestones (Acquisition-grade)
1. **Source Connectors Layer**
   - Provider-specific connectors and ingestion contracts.
   - Capture: listing URL, title, source, geo hints, price/acres text blocks.
2. **Normalization + Entity Resolution**
   - Canonical schema (`parcel_id`, `geo`, `pricing`, `zoning`, `signals`).
   - URL and address dedupe + confidence scores.
3. **Institutional Scoring Engine**
   - Multi-factor model with explainability traces per listing.
   - Portfolio-level optimization (coverage, corridor exposure, risk balance).
4. **Analyst Workspace**
   - Saved views, tags, notes, and underwriting status lanes.
   - KPI and IC memo export pipelines.
5. **Data Quality + Governance**
   - Source freshness, confidence scoring, and audit logs.
   - Explicit uncertainty and stale-data flags in UI.

## Minimum Data Contract (target)
Each listing should eventually include:
- `listing_id`, `source`, `source_url`, `retrieved_at`
- `title`, `address_raw`, `city`, `county`, `state`, `lat`, `lon`
- `acres`, `price`, `price_per_acre`, `status`
- `zoning`, `access_notes`, `utility_notes`, `terrain_notes`
- `score_total`, `score_breakdown`, `confidence`

## Execution Principle
Ship robust, explainable increments. No black-box scoring. Every ranking should be traceable and auditable.
