# Parcel Intelligence Backend Production Plan

Date: 2026-06-03

## Purpose

Parcel Intelligence should not charge users until project state, source caveats, memo exports, and usage limits are handled by a server-side system with clear ownership and entitlement checks.

This plan documents the backend architecture needed to move from the current frontend/localStorage prototype to a production research workspace. The backend should preserve the same product posture: Parcel Intelligence organizes diligence research and memo artifacts, but it does not verify acquisition decisions, provide legal advice, appraise land, or recommend parcels.

## Data Model

### users

Represents an authenticated person who can own or access Parcel Intelligence work.

Core fields:

- `id`
- `email`
- `name`
- `created_at`
- `updated_at`
- `last_seen_at`
- `status`

Notes:

- Every request that reads or writes Parcel data should resolve to a user.
- User records should not directly encode billing rules; use organization memberships and entitlements for that.

### organizations

Represents the billing, quota, and collaboration boundary.

Core fields:

- `id`
- `name`
- `plan`
- `status`
- `billing_customer_id`
- `created_at`
- `updated_at`

Supporting table:

- `organization_memberships`
  - `organization_id`
  - `user_id`
  - `role`
  - `created_at`

Notes:

- Projects should belong to an organization, even for solo users.
- Organization ownership makes later team sharing, quota pooling, and invoice history possible without reshaping project data.

### parcel_projects

Represents a saved research workspace.

Core fields:

- `id`
- `organization_id`
- `created_by_user_id`
- `name`
- `status`
- `thesis`
- `listing_links`
- `selected_candidate_id`
- `shortlisted_candidate_ids`
- `created_at`
- `updated_at`
- `archived_at`

Notes:

- `thesis` can start as JSON matching the frontend `ParcelThesis` model.
- `shortlisted_candidate_ids` can be normalized later if shortlist ordering, notes, or collaborator annotations become richer.
- Project rows are the primary user-scoped access boundary.

### parcel_candidates

Represents a parcel or parcel-like lead inside a project.

Core fields:

- `id`
- `project_id`
- `provider_key`
- `external_parcel_id`
- `title`
- `address`
- `county`
- `state`
- `acreage`
- `price`
- `latitude`
- `longitude`
- `facts`
- `fit_score`
- `fit_assumptions`
- `created_at`
- `updated_at`

Notes:

- `facts` can store structured provider/user-import data such as zoning hints, access notes, utilities, taxes, flood hints, and terrain notes.
- `fit_score` and `fit_assumptions` are research aids only and must not be framed as acquisition recommendations.
- Candidate facts should keep source relationships rather than becoming uncaveated canonical truth.

### parcel_sources

Represents the provenance, freshness, confidence, and caveats behind candidate data.

Core fields:

- `id`
- `project_id`
- `candidate_id`
- `provider`
- `source_type`
- `source_url`
- `source_label`
- `source_status`
- `freshness_status`
- `confidence_status`
- `observed_at`
- `provider_updated_at`
- `caveat`
- `raw_payload_ref`
- `created_at`

Notes:

- Source records should support `demo`, `user_provided`, `public_record`, `estimated`, and `unknown` status values.
- Freshness should support `current`, `stale`, and `unknown`.
- Confidence should support `high`, `medium`, `low`, and `needs_verification`.
- Raw provider payloads should be stored behind an internal reference when needed, not exposed blindly to users.

### parcel_risk_flags

Represents questions, caveats, and diligence items surfaced for a project or candidate.

Core fields:

- `id`
- `project_id`
- `candidate_id`
- `source_id`
- `label`
- `detail`
- `severity`
- `category`
- `status`
- `created_by`
- `created_at`
- `updated_at`

Notes:

- Risk language should remain "flags/questions" instead of "pass/fail."
- Risk flags can be system-generated, imported, or user-created.
- Status values should support open, reviewed, and dismissed, with dismissal audit history.

### parcel_memos

Represents generated diligence memo artifacts.

Core fields:

- `id`
- `project_id`
- `generated_by_user_id`
- `version`
- `status`
- `thesis_summary`
- `candidate_overview`
- `shortlist_comparison`
- `key_risk_flags`
- `missing_information`
- `recommended_next_checks`
- `source_caveat_appendix`
- `user_notes`
- `markdown_body`
- `created_at`
- `updated_at`

Notes:

- Store both structured sections and rendered markdown so exports are reproducible.
- Memo content must include caveats and source/freshness/confidence labels.
- Memo generation should snapshot the source/candidate state used at generation time.

### usage_events

Represents metering, audit, and quota activity.

Core fields:

- `id`
- `organization_id`
- `user_id`
- `project_id`
- `event_type`
- `quantity`
- `metadata`
- `request_id`
- `created_at`

Tracked events:

- Project created.
- Candidate imported.
- Provider lookup requested.
- Memo generated.
- Memo exported.
- Quota check failed.
- Source conflict detected.
- Project deleted or archived.

Notes:

- Usage events support monetization limits and operational audit trails.
- They should never store sensitive raw provider payloads unless the metadata field is explicitly designed and reviewed for that purpose.

## API Routes

All routes should require authentication and resolve an organization context before reading or writing Parcel resources.

### Projects

- `GET /api/parcel/projects`
  - List projects visible to the current user in the active organization.
- `POST /api/parcel/projects`
  - Create a project with thesis, listing links, and optional seed candidates.
- `GET /api/parcel/projects/{projectId}`
  - Read one project with candidates, sources, risk flags, and latest memo summary.
- `PATCH /api/parcel/projects/{projectId}`
  - Update name, thesis, selected candidate, shortlist, archive status, or notes.
- `DELETE /api/parcel/projects/{projectId}`
  - Soft-delete or archive a project after entitlement and ownership checks.

### Parcel Candidates

- `POST /api/parcel/projects/{projectId}/candidates`
  - Add one user-entered parcel candidate.
- `POST /api/parcel/projects/{projectId}/candidates/import`
  - Import candidates from CSV, pasted rows, URLs, or provider-specific identifiers.
- `PATCH /api/parcel/projects/{projectId}/candidates/{candidateId}`
  - Update user-editable candidate facts, notes, shortlist status, or selected source labels.
- `DELETE /api/parcel/projects/{projectId}/candidates/{candidateId}`
  - Remove a candidate from the active project.

### Memo

- `POST /api/parcel/projects/{projectId}/memos`
  - Generate a structured diligence memo from thesis, candidates, shortlist, risk flags, sources, and user notes.
- `GET /api/parcel/projects/{projectId}/memos`
  - List memo versions for a project.
- `GET /api/parcel/projects/{projectId}/memos/{memoId}`
  - Fetch structured memo sections and rendered markdown.
- `GET /api/parcel/projects/{projectId}/memos/{memoId}/export`
  - Export the memo as markdown first, with PDF or DOCX as later formats.

### Usage And Quota

- `GET /api/parcel/usage`
  - Return current organization usage, quota limits, remaining project slots, memo generation limits, export limits, and reset dates.
- `GET /api/parcel/usage/events`
  - Return an audit-friendly list of recent usage events for admins.

## Data Provider Abstraction

Provider integrations should sit behind a typed service boundary so product code does not depend on one parcel data vendor or one import shape.

### Provider Interface

Each provider should expose a common interface:

- `provider_key`
- `capabilities`
- `searchCandidates(input)`
- `hydrateCandidate(input)`
- `normalizeCandidate(rawRecord)`
- `buildSources(rawRecord)`
- `getFreshness(rawRecord)`
- `getConfidence(rawRecord)`

Provider responses should return normalized candidates plus source records and warnings. The caller should not treat any provider response as verified truth.

### Demo Provider

Purpose:

- Keep the product usable in development, demos, and tests.

Responsibilities:

- Serve deterministic demo candidates.
- Emit source labels as `demo`.
- Emit freshness and confidence caveats.
- Avoid representing demo data as live parcel intelligence.

### CSV/User Import Provider

Purpose:

- Support paid users who already have parcel lists, spreadsheet rows, URLs, APNs, or notes.

Responsibilities:

- Parse user-provided rows.
- Normalize common columns such as title, APN, county, acreage, price, URL, latitude, longitude, notes, and source label.
- Mark sources as `user_provided`.
- Preserve import errors and missing fields as risk flags or missing information.

### Future County/Public Record Provider

Purpose:

- Add jurisdiction-specific public record lookups where reliable and permitted.

Responsibilities:

- Support county/APN lookup where integrations exist.
- Track provider date, retrieval date, and unsupported geographies.
- Emit public-record source labels with freshness caveats.
- Surface conflicts between user/listing data and public records.

### Future Paid Parcel Data Provider

Purpose:

- Add commercial parcel enrichment when the business can support provider costs and terms.

Responsibilities:

- Enforce provider-specific entitlement and rate limits.
- Store provider payload references securely.
- Normalize fields into parcel candidates and sources.
- Track paid lookup usage events.
- Expose caveats about data rights, coverage gaps, freshness, and confidence.

## Security

### User-Scoped Access

- Every Parcel API request must require an authenticated user.
- Every project read/write must verify organization membership.
- Every candidate, source, risk flag, and memo lookup must be constrained by the parent project and organization.

### No Cross-User Leakage

- Never trust client-supplied organization IDs without checking membership.
- Use project ownership joins for every nested resource query.
- Do not expose raw provider payloads unless a route is explicitly authorized and sanitized.
- Avoid sequential public identifiers for private resources.
- Add tests that attempt cross-organization access for projects, candidates, sources, risk flags, memos, and exports.

### Server-Side Entitlement Checks

- Create project, import candidate, generate memo, export memo, and paid provider lookup routes must check active plan entitlements server-side.
- Client-side disabled states are convenience only and should never be the enforcement layer.
- Entitlement failures should return structured errors that the UI can render as quota or plan-limit states.

## Monetization Readiness

### Quotas

Initial quotas should be organization-scoped and reset monthly:

- Projects created.
- Active projects.
- Candidate imports.
- Memo generations.
- Memo exports.
- Paid provider lookups.

### Project Limits

- Enforce active project limits before creation.
- Keep archived projects available according to plan policy.
- Track project creation and archive/delete activity in usage events.

### Export Limits

- Meter memo exports separately from memo generation.
- Start with markdown exports, then extend the same quota model to PDF or DOCX.
- Ensure exports include disclaimers, source labels, freshness labels, confidence labels, and caveats.

### Audit Logs

Audit logs should capture:

- Who created, updated, archived, or deleted a project.
- Who imported candidates.
- Which provider was used for enrichment.
- When memos were generated or exported.
- When quota or entitlement checks failed.
- When source conflicts or provider errors occurred.

Audit logs are operational records, not user-facing research truth. They should support support, billing, compliance review, and debugging.

## Migration Path From The Prototype

The current prototype stores project state in frontend localStorage through a typed project store boundary. Production migration should preserve that interface while replacing the adapter.

1. Stabilize shared types.
   Align frontend `ParcelProject`, `ParcelThesis`, `ParcelCandidate`, `ParcelRiskFlag`, and `ParcelMemo` with backend schemas.

2. Introduce an API-backed project store.
   Add a second frontend adapter that implements the existing project store interface using authenticated API calls.

3. Keep local preview mode for development.
   Preserve the localStorage adapter for demos and offline development, but label it clearly as preview storage.

4. Add import/export migration tools.
   Let users export local preview projects to JSON or markdown, then import them into server-backed accounts once authentication exists.

5. Backfill source records.
   Convert demo and user-entered candidate fields into `parcel_sources` rows so every fact has source, freshness, confidence, and caveat metadata.

6. Move memo generation server-side.
   Keep the frontend preview UX, but have production memo generation call `POST /api/parcel/projects/{projectId}/memos` so generated artifacts are versioned, metered, and auditable.

7. Enforce quotas server-side.
   Add quota checks to project creation, candidate import, memo generation, memo export, and paid provider lookup routes before launching paid access.

8. Add observability.
   Instrument provider calls, import failures, quota failures, memo generation latency, export failures, source conflicts, and cross-user authorization denials.

## Launch Gate

Parcel Intelligence should not charge for saved projects until the backend can:

- Persist projects server-side.
- Scope every resource to a user and organization.
- Enforce project, import, memo, export, and provider quotas.
- Preserve source/freshness/confidence/caveat metadata.
- Generate reproducible memo exports.
- Produce audit and usage events.
- Prevent cross-user data access through tests and authorization checks.

The backend does not need every future provider before launch, but it does need the provider abstraction, local/demo provider, CSV/user import path, memo persistence, quota enforcement, and clear security boundaries.
