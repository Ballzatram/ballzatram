# Osiris Feed — phased delivery plan

Decision date: 2026-09-21. Product: an enjoyable, low-friction learning feed within the existing Reading Room. The initial focus is AI and building useful systems, with detours into history, markets, evidence and learning design. This plan is not an assertion that every previous conversation or book has been imported.

## Phase 1 — make the feed worth opening

**Scope:** a complete static experience at `/internal/reading-room/feed/`, linked only from the unlisted Reading Room. No homepage catalog entry, model service, account setup or paid inference is required.

Deliverables:
- 60 original cards: 32 explanations/exercises and 28 resource/video entry points; 34 source records; 14 optional questions; three editorial paths.
- Five topic filters, search, AI-first/balanced ordering, saved cards, original-reference details and in-place expansion.
- A two-value attention slider, optional video loading, card links and resume control.
- View/attempt counters, not a mastery score. New-to-this-browser cards lead within each topic; personal beliefs are not inferred.
- Eight-card batches, automatic continuation to 24 cards, then an explicit continuation choice. No fabricated endless content or streak penalties.
- Separate browser storage, progress export/import, confirmation before replacement/reset, and useful handling of missing content or unavailable storage.

**Acceptance gate:** valid catalog and links; pure-state tests pass; served-browser checks cover rendering, saving, questions, search, paths, imports, reset isolation, pagination, small screens and recoverable failures. The existing complete Pages artifact must validate. Merge/deployment status is distinct from code completion.

**Content boundary:** source review scope appears on each reference (for example abstract, author syllabus or publisher description). Book entry cards are not full-book summaries. Questions and teaching examples are original constructions. There are no private chat transcripts, personal financial or health details, confidential work records, personal reading-completion files, fabricated quotes or automatically published model output in this feed.

## Phase 2 — turn the seed edition into a connected curriculum

Build a reviewed ingestion pipeline for explicitly selected conversation extracts, available notes, papers, articles, book excerpts and video chapters. Store stable source/concept IDs, prerequisites, related misconceptions, passage or chapter locators, review scope, publication date and freshness requirements. Deduplicate ideas instead of cloning whole conversations.

Expand the existing paths into concept progressions. Add richer diagrams and tested micro-experiments, explicit links to relevant site simulations, and spoiler controls for fiction. Keep foundational explanations distinct from dated AI developments; never relabel an old source as current. Preserve old card IDs or provide migration rules when editing editions.

**Acceptance gate:** each factual card is traceable to a reviewed source; uncertain or contested claims remain attributed; private imports require an explicit review step before publication. The catalog is useful without a live model.

## Phase 3 — add private learning memory and meaningful recall

Design authenticated storage before putting private notes or conversation extracts on the server. Offer opt-in account synchronization, deletion and portable exports. Import Reading Room activity only with an explicit choice; do not silently rewrite its existing storage.

Add spaced recall, confidence input, prerequisites and alternative explanations informed by actual answers. Distinguish exposure, attempts, correct recall and transfer to a new problem. Make recommendations explainable and allow the learner to change emphasis or pause topics. Do not infer political beliefs or optimize for persuasion.

**Acceptance gate:** access-control and deletion tests pass; cross-device state is consistent; demonstrated understanding is not inferred from scrolling or elapsed time. Evaluate usefulness and later recall rather than maximizing time on site.

## Phase 4 — connect Osiris coaching and keep material current

Attach a verified, explicitly selected model connection to the current card and only the context the visitor approves. Show connection/billing status and preserve the static experience when disconnected. Integrate hints, questions, explanations and selected simulation actions without silently sending the whole library or private history.

Add reviewed update queues for rapidly changing AI material, clearly dated revisions and periodic source-health checks. Quarantine untrusted source instructions. Use bounded context, safe rendering, explicit action permissions and regression evaluations. Do not introduce an operator-funded model fallback.

**Acceptance gate:** in-place coaching works with the supported deployed connection; context sharing is visible; disconnect/failure/cost behavior is tested; neither generated content nor account-derived material is auto-published.

## Phase 1 architecture and maintenance

The Pages manifest already publishes `internal/reading-room`, so the nested feed needs no new deployment entry. Its CSS and scripts are independent of the Reading Room and homepage. The feed does not read the Reading Room's `ballzatram-reading-room` storage.

- `internal/reading-room/feed/content.json`: versioned cards, sources and editorial paths.
- `core.mjs`: validation, ordering, safe URL handling and progress normalization.
- `app.mjs`: UI, intersection observers, optional practice/video controls and import/export.
- `feed.css`, `index.html`: responsive presentation, accessibility landmarks and restrictive source policy.
- Storage key: `osiris-learning-feed-v1`. No authentication or cross-device synchronization in Phase 1.

An unlisted/noindex route is **not** a private vault. The repository and general content are accessible to anyone with the address. Browser-local storage is not encrypted secret storage; other scripts on the same origin could access it. It contains only card IDs, attempts and the chosen mix. Export transfers that activity into a file under the user's control. External source links navigate to the named sites; YouTube is contacted only after an explicit load action. Video playback depends on provider availability and embedding permissions. Only after the explicit video action, the iframe sends an origin-level Referer (not the private page path) and uses a minimum 200-pixel height, following YouTube player requirements. See https://developers.google.com/youtube/iframe_api_reference (requirements and error 153; checked 2026-09-21).

### Checks and local preview

```sh
node --test scripts/test_osiris_feed.mjs
python -m pip install playwright==1.57.0
python -m playwright install chromium
python scripts/smoke_osiris_feed.py
python scripts/validate_public.py
python -m http.server 8000
# Open http://localhost:8000/internal/reading-room/feed/
```

Do not double-click the HTML file: ES-module loading and content fetching require HTTP. `CHROMIUM_EXECUTABLE` can select a local browser; CI otherwise uses Playwright's installed Chromium. `SCREENSHOT_DIR` changes smoke-test screenshot output. The browser suite stubs YouTube at its boundary; it does not assert successful real-world playback.

The unit suite covers 40 cases. The served-browser suite supplements it. Local browser policies may prohibit HTTP navigation; a render-only, in-memory preview is not a substitute for the served-browser gate in CI. Do not describe that partial preview as an end-to-end deployment test.
