# Parcel Intelligence Product Brief

Date: 2026-06-03

## Product definition

Parcel Intelligence is a production-oriented land research workspace.

It helps users organize early parcel research into a structured diligence narrative: what they are looking for, which parcels might fit, what risks are visible from available sources, how candidates compare, and what should be reviewed by qualified professionals before any decision is made.

Parcel Intelligence is not a real estate advisor, appraisal tool, legal service, title product, survey replacement, zoning authority, environmental review, tax advisor, or acquisition recommendation system.

The product promise is better research structure, better caveat tracking, and better decision support artifacts. It should never imply that Ballzatram knows whether a user should buy a specific parcel.

## Target users

Primary users:

- Land investors screening many rural or edge-market parcels before deeper diligence.
- Rural land buyers trying to make sense of scattered parcel, county, map, listing, and risk information.
- Agents and brokers doing early screening for clients before bringing in specialists.
- Developers doing first-pass diligence before paying for surveys, engineering, zoning counsel, environmental review, or entitlement work.

These users may be sophisticated, but the product should assume the underlying parcel data is incomplete, uneven, stale, or jurisdiction-specific until proven otherwise.

## Core job

Parcel Intelligence turns scattered parcel research into:

- A structured thesis.
- A candidate parcel list.
- A risk checklist.
- A shortlist.
- A comparison view.
- A memo or exportable diligence artifact.

The workspace should help users move from loose notes and tabs into an evidence-backed research file. The highest-value output is not a decision; it is an organized memo that shows the user's thesis, evidence, caveats, missing diligence, and next questions.

## Explicit non-promises

Parcel Intelligence must clearly state that it does not provide:

- Legal advice.
- Appraisals or valuation opinions.
- Guaranteed parcel accuracy.
- A "buy this land" recommendation.
- A substitute for title review.
- A substitute for survey review.
- A substitute for zoning review.
- A substitute for environmental review.
- A substitute for tax review.
- A substitute for legal review.

Any parcel score, fit label, risk label, or shortlist status must be framed as research organization, not professional judgment or an acquisition recommendation.

## Core workflow

1. Thesis setup
   The user defines the research thesis: geography, acreage range, budget range, intended use, access needs, utility expectations, terrain preferences, restrictions to avoid, and deal-breakers.

2. Parcel discovery/input
   The user adds parcels from listings, county records, map links, APNs, coordinates, manual notes, imported rows, or future supported data providers. Each parcel should preserve source labels and caveats.

3. Parcel detail review
   The user reviews parcel-level facts such as location, size, listing details, ownership/source notes, access, visible roads, terrain, flood hints, utility hints, zoning hints, tax notes, nearby context, and unresolved questions.

4. Risk flags
   The workspace surfaces and records risk flags such as unclear access, flood exposure, steep terrain, wetland/environmental concerns, zoning uncertainty, utility uncertainty, easements, title questions, tax anomalies, source conflicts, or stale data.

5. Comparison
   The user compares candidates against the thesis and each other. The comparison should separate known facts, user-entered assumptions, source-derived observations, and missing diligence.

6. Memo/export
   The user exports a memo summarizing the thesis, shortlisted parcels, evidence, caveats, risk checklist, source labels, data freshness labels, and recommended professional review steps.

## Product posture

Parcel Intelligence should feel like a serious diligence workspace, not a lead-generation page or speculative buying engine.

Good product language:

- "This parcel appears to match your acreage and access criteria based on the current sources."
- "Flood, access, zoning, and title status require independent review."
- "Source conflict detected between listing acreage and county acreage."
- "Shortlisted for further diligence."

Unsafe product language:

- "Buy this parcel."
- "This is a safe investment."
- "This parcel is accurately valued."
- "This land is buildable."
- "This parcel has clear title."
- "This is legally approved for your intended use."

## Production-readiness checklist

Parcel Intelligence is production-ready only when it has:

- Clear disclaimers on product entry, parcel detail, comparison, and export surfaces.
- Source labels for every imported, inferred, or user-entered parcel fact.
- Data freshness labels that identify last-updated dates, provider dates, import dates, or unknown freshness.
- Saved projects with durable workspace state.
- Exportable memos suitable for sharing with brokers, attorneys, surveyors, lenders, engineers, or internal stakeholders.
- Error states for missing data, provider failures, invalid parcel identifiers, stale sources, unsupported geographies, and source conflicts.
- Auth-ready architecture with user-scoped project ownership and future billing compatibility.
- Observability hooks for imports, provider calls, export generation, error states, quota usage, and source-conflict events.

The product should not be sold as a production land workspace until the user can save projects, understand source limits, recover from data issues, and export a caveated memo.

## First paid version

The first paid version should sell structured workflow and durable research artifacts, not land-purchase certainty.

Minimum paid scope:

- Saved projects.
- Shortlist comparison.
- Memo export.
- Source and caveat tracking.
- Limited monthly project quota.

The paid version can be positioned as a disciplined early-screening workspace for parcel research. It should not promise verified acquisition decisions, complete due diligence, guaranteed data accuracy, or professional advice.

## Success criteria

Parcel Intelligence succeeds when a user can:

- Start with a thesis instead of a blank search.
- Add messy parcel inputs without losing source context.
- See what is known, assumed, stale, conflicting, or missing.
- Build a shortlist for further diligence.
- Export a memo that is useful to professionals who will perform the actual review.
- Understand that the workspace supports research discipline, not final acquisition judgment.
