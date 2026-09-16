# Parcel: a practical land-search workspace

The published application is `/tools/parcel/`. The saved workspace runs without a backend or model key. In-page AI requires the separately hosted subscription service. The older Next.js `/land` workspace remains available with its own saved projects and a link to the updated application. Its data, backend, and legacy pipeline outputs are not automatically imported into the new workspace.

## Start with a private project brief

1. Enter the intended use, target region, travel origin, acreage needs, and drive-time limit. Optional fields distinguish a preferred corridor from a required corridor, and purchase budgets from annual lease budgets.
2. Keep total property acreage separate from the contiguous usable arena area. Flat terrain, maximum slope, expansion, a future grass field, and event attendance are editable requirements.
3. Add candidate search areas, one per line. Generated links open listing searches, wider searches, maps, and county-record searches. They are not property results or measured travel-time bands.
4. Add actual properties or review a research import. There is no automatic sample inventory or fallback.
5. Record evidence, shortlist candidates, and export a workspace backup and diligence memo. Print / save PDF uses the browser print dialog.

The public application contains no project-specific private brief or curated property list. A saved workspace can be imported through **Import research → Review import → Replace this workspace and brief → Apply reviewed import**. Existing work is preserved by default; replacement requires explicit selection.

The USPA playing dimensions are 300 × 150 feet for an arena (~1.03 acres) and 300 × 160 yards for an outdoor grass field (~9.92 acres): https://www.uspolo.org/sport/rules. These exclude supporting space, runoffs, setbacks, horse facilities, and event parking. An arena-area target is not proof that the full venue fits.

## How screening works

`core.js` normalizes the brief and candidates and evaluates requirements without a weighted suitability score. The truth of a listing is not established by a working URL or a matching title.

- A reported hard failure remains a **conflict**, irrespective of favorable price or other strengths.
- Missing, unsourced, undated, future-dated, or old positive evidence stays **unresolved**. Evidence ages after 180 days, or 30 days for price, rent, and drive time. Availability must be source-reported active with a snapshot no older than 30 days. These are product research defaults, not legal standards.
- Geographic, corridor, use, and drive-origin context are stored with the candidate. Changing the brief invalidates mismatched checks. Drive evidence also requires travel-day/time context. A radius is never converted to a drive time.
- Event attendance must be defined and supported by capacity evidence before an event site is classified as promising.
- **Promising** means current reported requirements align, pending independent site review. It is not approval, verified suitability, or a recommendation to acquire.
- Total, usable, and contiguous arena acreage are separate. Impossible acreage relationships are rejected.
- The preferred corridor is not a hard rejection unless the user makes it required. Purchase and annual lease budgets apply only to the corresponding transaction type.

Each fact has a value, evidence label, exact source URL, date, and notes. “Documented by me” requires a URL/date and records the user's evidence review; it is not an independent verification claim. Research imports always downgrade purported verified/documented AI claims to reported. No contact, offer, paid memo gate, or external write occurs.

## In-page AI research

**Research in Parcel** brings the inline research panel into view. Save a brief, connect ChatGPT once per session, and select **Run research**. The panel sends only the saved brief, search areas, explicitly shortlisted properties, and the visible request. With no shortlist, it shares the brief alone. It never scans unrelated browser storage. The Run button is the explicit send action; no extra consent checkbox, prompt copying, app handoff, or file import is needed.

A compatible `osiris-runtime` service must advertise `parcel-research-v1` in `/health`. `assets/ai-config.js` currently has no default subscription URL, so the public page accurately shows that service setup is still required. The existing Cloudflare MCP connector is a separate integration and cannot execute website model requests. Publishing the page does not provision the subscription host or authenticate a user. See [runtime hosting](../../osiris-runtime/README.md).

Once connected, Parcel asks the official Codex runtime to use public web search and return structured results. The runtime owns the research instructions and output schema; it validates results before returning them. Other projects keep their text-only configuration. Credentials remain confined to the existing isolated subscription sessions. No site-funded API fallback is used.

OpenAI sign-in is the only external account step. Research itself stays on the page with progress, cancellation, source links, and findings to review. **Add selected properties** merges chosen results and preserves existing records. Changed briefs block applying stale results. Missing, malformed, unsourced, oversized, interrupted, and unsupported responses cannot mutate the workspace. Empty results explain what could not be established; there is no fallback inventory. Sources are reported claims, not independent site verification. Automatic GIS measurement and route calculations are not connected.

Research JSON contract:

```json
{
  "kind": "parcel-research",
  "schemaVersion": 1,
  "candidates": [{
    "title": "Actual property",
    "location": "Actual address / town / state",
    "listingUrl": "https://example.com/exact-property",
    "listingStatus": "unknown",
    "capturedAt": "2026-09-16",
    "tenure": "unknown",
    "facts": {
      "acres": {
        "value": 40,
        "level": "reported",
        "sourceUrl": "https://example.com/exact-property",
        "checkedAt": "2026-09-16",
        "detail": "Source-reported gross acreage; not surveyed."
      }
    }
  }]
}
```

The runtime supplies the complete field template and allowed values. In-page responses also include a `summary` string and are capped at 50,000 characters / eight candidates; the model is asked to research up to three per request. Manual file imports remain available for backups and outside research. Files are capped at 1 MB / 100 candidates. Research is previewed before application; duplicate source URLs (ignoring tracking parameters) or identical county/parcel IDs do not overwrite existing work. Workspace backups use `kind: parcel-workspace` and include `brief`. They merge by default; replacing a workspace requires the user to check the explicit replace option. Other versions and malformed files fail visibly before mutation.

## Persistence and architecture

- `core.js`: dependency-free model, validation, screening, source search plan, memo, and bounded context export; CommonJS/browser compatible.
- `script.js`: explicit DOM actions, local storage, import review, shortlist comparison, and download/print flow.
- `research.js`: inline account connection, research progress, result review, and selected-property application.
- `assets/ai-features.js`: Parcel context contract and public-research instructions.
- `osiris-runtime/parcel.mjs`: server-owned structured output schema and research validation.
- `ballzatram:parcel:workspace:v1`: current browser workspace. Storage failures leave a usable memory-only session. Malformed or externally changed saves are preserved until an explicit replacement; the UI asks users to export their session.

The old `pipeline/`, `data/`, `output/`, and `profiles/` files remain for legacy consumers. The new public workspace never uses their ranking or sample fallback. `frontend/src/components/parcel/ParcelIntelligencePage.tsx` remains the separate legacy Land Desk rather than silently migrating its saved records.

## Acceptance checks

Run `node --test scripts/parcel.test.cjs`, or `npm run test:static --prefix frontend`. The tests cover hard conflicts, unknown/stale evidence, criteria changes, lease/purchase budgets, malformed and duplicate imports, source preservation, safe text rendering, storage failures, explicit AI context boundaries, streamed research results, cancellation, incompatible services, and stale-result rejection. Run `npm test --prefix osiris-runtime` and `npm run check:runtime --prefix osiris-runtime` for protocol and real-binary isolation checks. These do not use a live account or generate a real completion.

Manual QA: save a brief; import reviewed source records; shortlist; edit terrain and acreage evidence; change drive origin; review a research import; reload; export workspace and memo; print; check narrow-screen forms and dialogs. No live broker/owner outreach or acquisition action is part of this workflow.
