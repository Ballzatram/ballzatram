# Architecture and integration proposal

The inspected repository already has a Python/FastAPI backend, a Next.js frontend, source ingestion/service conventions, and a public tool catalog. Build into these rather than introducing a second application stack. This foundation only adds isolated evidence models, tests, synthetic fixtures, and documents.

## Proposed pipeline

Source inventory and rights approval -> permitted retrieval -> immutable snapshot storage -> deterministic parsing -> model-assisted draft extraction -> entity/provision reconciliation -> supporting and contrary evidence search -> human adjudication -> read-only publication/export.

Treat every fetched document as untrusted input. Text in a filing, article, PDF, or campaign page is data, never an instruction to Osiris. Constrain extraction to a schema. Separate read-only research from publishing authority. Do not let a model send messages, execute source-provided code, reveal credentials, or change source permissions.

## Data model beyond the starter

Core entities: Person, Organization, Promise, LegislativeAction, Vote, Bill, BillVersion, Provision, SourceDocument, Article, Event, CountryRelationship, Rule, Award, Outcome, Claim, EvidenceSpan, Review, and Correction.

Each relationship carries provenance and classification. Persist identifiers from the source rather than making fuzzy names primary keys. Save explicit reconciliation decisions. Store both the time the underlying fact applied and the time the system learned it, so an investigation can be replayed without hindsight.

Recommended first persistence design: ordinary relational tables for entities and claim edges plus a document/snapshot store. Full-text search can precede vector retrieval. A specialized graph database is optional, not a prerequisite. No infrastructure purchase or migration is part of this change.

## Proposed module layout

- `backend/app/observatory/`: contracts now; later deterministic domain operations.
- `backend/app/data/observatory/`: future source adapters with pagination, retries, and coverage manifests.
- `backend/app/services/observatory/`: future extraction, matching, research, and review orchestration.
- `backend/app/api/observatory_routes.py`: future read/review interfaces; not registered now.
- `frontend/src/app/observatory/`: future workbench, dossier, bill, promise, and media pages.
- Existing `frontend/src/config/toolCatalog.ts`: add an honestly labeled card only when a usable route exists.

Do not disturb the reading room, economics games, travel app, existing agent, or current routes. Keep all provider keys server-side and production data outside Git.

## Osiris contract

Osiris receives task-scoped sources and a question, produces schema-validated draft claims with exact evidence locators, and surfaces gaps rather than inventing them. Use separate extraction, verification, counterevidence, and explanation stages. Multiple model passes are not independent corroboration. Humans approve consequential findings.

Provider choice should remain behind an interface. Do not implement model billing, account linking, a new external AI subscription, or unlimited-agent loops. Cache by source hash and method version; invalidate derived analyses on source changes. Set per-task budgets and log actual cost before proposing unit economics.

## Publication boundary

`EvidenceBundle(mode="publication")` provides structural gates, not an authenticated publisher. The eventual publishing service must separately authorize reviewers, verify snapshot bytes and excerpt matches, enforce rights and privacy review, consult corrections, and record an audit event. Client-supplied review or rights flags must not be trusted.

Demo data must retain a visible synthetic banner in every UI and export. A public synthetic demo is not a publication bundle containing real verified findings. Real unverified imports remain draft. No background ingestion or auto-publishing is enabled by these files.

## Reliability and threat model

Address hostile source text, HTML injection, malicious attachments, XML external entities, SSRF through supplied URLs, oversized downloads, poisoned timestamps, false entity merges, prompt injection, model hallucination, source disappearance, defamation risk, and upstream licensing changes. Use allowlisted retrieval, sandboxed parsing, request caps, retry/backoff, access controls, private review drafts, and honest coverage reporting.

Start with content hashes, signed release manifests when operationally supported, ordinary backups, tested recovery, and correction history. Blockchain and absolute claims of being "uncensorable" are not requirements. Public records may still need privacy redaction or lawful removal.
