# Parcel Intelligence: AI-Guided Land Acquisition Workflow

Parcel Intelligence reframes Parcel from “link scraping” into an AI-guided acquisition analyst workflow:
1. Define investment thesis
2. Discover opportunities across sources
3. Normalize + validate source quality
4. Score and explain fit/risk
5. Shortlist + compare
6. Generate a pitch deck preview

## Current MVP Capabilities
- Structured thesis intake (use case, market, radius, acreage, budget, must-haves, risk factors, notes).
- Deterministic `generateInvestmentThesis` fallback that creates a normalized thesis object and weighted score profile.
- Card-based opportunity output with:
  - source status (`live`, `dead`, `unknown`, `partial`)
  - source type
  - data confidence
  - fit/risk/readiness scoring
  - rationale, diligence concerns, and next questions
- Shortlist and comparison table.
- In-app slideshow-style pitch deck preview with institutional sections.

## AI Integration Architecture (MVP)
The frontend now uses explicit service-style functions that can be swapped to a backend AI provider later:
- `generateInvestmentThesis(input)`
- `summarizeOpportunity(opportunity, thesis)`
- `scoreOpportunity(opportunity, thesis)`
- `generateComparisonSummary(shortlist, thesis)`
- `generatePitchDeck(shortlist, thesis)`

Current implementation is deterministic for reliability and transparency when backend AI is unavailable.

## Trust & Data Quality
- Missing fields are clearly labeled `unknown/inferred`.
- Dead/unknown links are flagged and do not dominate ranking presentation.
- Score explanations are displayed so analysts can audit decisions.
