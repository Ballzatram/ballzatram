# Ballzatram Observatory

**Status: design and tested evidence-contract foundation, not a live investigative service.**

Prepared September 8, 2026. Working product name, not a trademark determination. Osiris is the reasoning and educational layer; Ballzatram is the host platform.

> Follow a public claim from its source, through decisions and legal changes, to documented interests, measurable outcomes, and the narrative people encountered.

## Preserve the original ideas

1. **Media Observatory:** identify documented global violent events, measure U.S. outlet attention and framing, and compare events across time-stamped U.S. geopolitical relationships. Test the Herman/Chomsky hypothesis instead of assuming it. The eventual ambition includes murders and other crimes; the first research scope should be a defined class of political violence, not a claim to count every global homicide.
2. **Promise Ledger:** archive campaign commitments and compare them with votes, sponsorship, amendments, public explanations, and subsequent outcomes. Preserve context, specificity, deadlines, opportunity to act, and limits of a member's authority.
3. **Bill X-Ray:** enumerate provisions and legal changes in a specified bill version or enacted law, show original text and plain-language analysis, and compare the contents with actual headlines and full stories. Explicitly distinguish chamber passage, enrolled text, enactment, and effective dates.

## The next-level platform

Connect those ideas through a versioned evidence graph: promise -> action -> bill version -> provision -> documented interest -> implementation -> outcome -> coverage. Missing links must remain missing. A shared timeline must never silently turn association into causation.

The flagship experience is an **investigation dossier**: a question, a source-backed timeline, a legal before/after view, potential and observed beneficiaries, competing explanations, source coverage, reviewer decisions, and a replayable evidence export.

The first product wedge is Bill X-Ray plus an evidence timeline. Build one trustworthy vertical slice before a universal political score or nationwide live feed.

## Documents

- [Product vision and workflows](PRODUCT.md)
- [Methodology and measurement rules](METHODOLOGY.md)
- [Primary data sources and rights constraints](DATA_SOURCES.md)
- [Architecture and Osiris integration](ARCHITECTURE.md)
- [Editorial independence and publication policy](EDITORIAL_POLICY.md)
- [Build sequence and acceptance criteria](ROADMAP.md)

## What is implemented here

- `backend/app/observatory/models.py`: typed sources, entities, evidence spans, claims, and bundles using the existing Pydantic dependency.
- Structural checks for citation references, unique identifiers, SHA-256 format, timezone-aware chronology, source-use status, review metadata, and separation of demo and publication bundles.
- `demo_data/observatory/`: a synthetic example and its exact snapshot. It makes no allegation about any real person or law.
- `backend/tests/test_observatory_models.py`: offline positive and negative tests, including publication gates and snapshot integrity.

There is **no** ingestion adapter, database migration, UI route, live model call, automatic publication, payment integration, or deployment in this foundation. No existing game, reading-room, travel, or catalog route is changed.

The contracts check structure, not truth, legal permission, genuine reviewer independence, or source authenticity. The future server must authenticate reviewers, enforce authorization, verify actual stored bytes and excerpts, and run the publication policy. A manually supplied `permitted` or `reviewed` field is not itself proof of permission or review. Generated JSON Schema also cannot replace the Python cross-record validators.

## Local check

From the repository root, with backend dependencies installed:

```bash
cd backend
PYTHONPATH=. python -m pytest tests/test_observatory_models.py -q
```

To generate a transport schema from the single source of truth:

```bash
cd backend
PYTHONPATH=. python -c 'import json; from app.observatory.models import EvidenceBundle; print(json.dumps(EvidenceBundle.model_json_schema(), indent=2))'
```

This preparation run passed 32 tests using the available Pydantic 2.13.4 / pytest 9.0.2 environment. The repository pins Pydantic 2.8.2 / pytest 8.2.2; installing those versions in the preparation environment failed because network resolution was unavailable. Run the same tests in the pinned environment before merging. No claim of whole-repository CI success is made.
