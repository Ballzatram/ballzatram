# Observatory workbench

The first usable bill and congressional-accountability application lives at
`/tools/observatory/index.html`. The static homepage and Lab Directory link to it;
the Next.js catalog links to the same application through the existing tools
symlink. Next.js also redirects `/observatory` to it. The current Pages workflow
already packages `tools/`, so no second hosting service is needed.

## Living bill tracker

The default **Find & follow bills** view searches indexed current-Congress House and
Senate bills by number, title, sponsor, or topic. Open a bill to read its official
activity timeline and available text; select **Follow bill** to keep it in this
browser's watchlist. Changed records are highlighted until opened. No upload or API
key is needed. Following does not send email/push alerts or synchronize devices.

The Pages workflow runs at minute 43 every four hours (UTC), and on deployments.
`scripts/refresh_observatory.py` reads the official GPO BILLSTATUS sitemaps and
retrieves up to 120 bill records per run, with a seven-minute request budget.
Existing due records receive half the budget before new-record backfill. The page
checks the published catalogue every five minutes while visible; **Check for
updates** fetches it immediately. Hosting schedules and upstream updates can lag.

This is a bounded, growing catalogue, not every bill. The committed bootstrap has
24 official records. Coverage counts are shown; resolutions are excluded. GPO
sitemap confirmation updates the activity check time for unchanged records without
claiming that their source XML was newly retrieved. Records older than 12 hours or
with failed refreshes are explicitly flagged. Failures retain the last good data.

The build cache retains earlier snapshots and grows between deployments. If GitHub
evicts the cache, coverage rebuilds from the committed bootstrap; an absent followed
bill remains visible as unavailable. Browser-local notes are not a durable account.
Exact detail and XML fingerprints are validated before publication, and the browser
verifies the chosen detail against its catalogue. Saved research remains attached
to the specific source snapshot, never silently remapped onto changed evidence.

Latest two available supported XML versions are parsed; all discovered XML versions
are linked. Missing, oversized, or unsupported text remains an explicit gap, with
activity still readable. Live records do not yet import individual roll calls,
campaign statements, or media articles. The historical reference case still has
its verified House roll call. Human interpretations remain drafts.

```bash
python scripts/refresh_observatory.py --output /tmp/observatory-live --budget 120
node tools/observatory/validate-live.mjs /tmp/observatory-live
```

## Available workflows

- **Bill X-Ray:** choose an exact version, search every parsed section, read original
  wording and explicitly draft reading notes, inspect the source, locator, retrieval
  timestamp, fingerprint, and retained XML. Unaccounted body content stays visible.
- **Version changes:** compare unique section numbers, show word additions/removals,
  preserve unchanged and unmatched sections, and link both original artifacts.
  Large sections use a bounded before/after view. This is not a statutory redline,
  semantic lineage determination, or comprehensive legal-effect opinion.
- **Congress & votes:** inspect sponsor metadata and a sourced action timeline;
  search the House roll call by name/Bioguide ID, party, state, and vote. Original
  totals reconcile with individual records. Senate unanimous consent remains a
  chamber action, without invented individual senator votes.
- **Promise Ledger:** add/edit an explicit sourced statement, context, measurable
  interpretation, condition, deadline, opportunity, and reasoning including contrary
  evidence. Link legislative actions and an individually verified House member.
  Conduct and outcome are separate human-entered judgments. No promise is inferred
  from a vote or party platform. Initial ledger is deliberately empty.
- **Coverage lens:** map selected headlines, article bodies, or official statements
  to exact version/section pairs. The sample and mapping limits stay explicit.
  Unmapped does not mean false or absent from all coverage. Initial sample is empty.
- **Investigation:** save cases and notes locally; export/import a complete JSON
  dossier; download a shorter reading brief; inspect provenance. Storage failures
  remain visible and exports still work. JSON exports retain draft/demo labels.
- **Osiris:** an explicit Ask action sends only the selected section and question
  through the existing configured AI bridge. It has a timeout, bounded context,
  no automatic calls, and no publishing authority. Missing bridge setup is explicit.
  Source text is untrusted evidence. The bridge adds Observatory-specific guidance;
  deploy that existing Worker change separately to activate its server-side wording.

## Reference case and data provenance

S. 4524 (117th Congress), the Speak Out Act, was selected because its five sections,
introduced and enrolled artifacts, and House roll call are manageable and publicly
available. It is a historical case, not a representative congressional sample or a
live feed. The enrolled artifact is labeled ENR; Public Law 117-224 is separately
identified from BILLSTATUS. The signed-law artifact and incorporated statutes are
not reconstructed here.

Original government snapshots and write-completion retrieval timestamps are in
`tools/observatory/data/sources/`. They were retrieved during implementation.
`dossier.json` is reproducibly generated by:

```bash
python scripts/build_observatory_reference.py
```

The builder derives all action and vote records from the pinned XML. Explicit
reading notes on the enrolled sections are draft interpretations. The three
changed sections are findings, definitions, and enforceability (2, 3, 4). Original
quotation typography and layout may differ from normalized extracted text.

The only bundled factual records are government documents, not allegations about
individuals or third-party news articles. No claim is marked editorially reviewed.
Hashes identify bytes; they do not certify legal interpretation, authenticity of
user imports, or actual reviewer independence.

## Optional manual import

The importer uses the Python standard library and constructed GPO URLs; no API key
or arbitrary remote URL input is required. It retains original XML and rejects
internal entities, oversized files, unsupported structures, and existing output
folders. Fetch failures are surfaced rather than replaced by demo data.

```bash
python scripts/import_observatory_bill.py \
  --congress 117 --type s --number 4524 --versions is enr \
  --output /tmp/my-bill-case
```

Open the resulting `dossier.json` with **Import case**. The dossier carries parsed
text and source fingerprints. Keep the adjacent `sources/` folder separately for
byte-for-byte reproduction; JSON does not embed raw XML. The browser does not fetch
or trust a local snapshot path from an imported file. The generic importer imports
bill versions, status and sponsors; it does not automatically retrieve every roll
call or campaign statement. The reference builder demonstrates the House roll-call
adapter, including reconciliation. Imported files are capped at 4 MB and sections
at 100,000 characters; larger work needs a server-backed pipeline.

The section parser is intended for GPO's Congress bill XML, not USLM public laws,
PDFs, HTML articles, or OCR. It preserves the full body and reports unsupported
body blocks. Section-number matching needs human reconciliation when bills have
repeated numbers, renumbering, or restructured provisions.

## Validation

```bash
npm ci --prefix tools/observatory --ignore-scripts
npm test --prefix tools/observatory
python -m unittest discover -s scripts/tests -v
cd backend && PYTHONPATH=. python -m pytest tests/test_observatory_models.py -q
cd ../frontend && npm run lint && npm run build
```

PR validation runs the new domain, simulated-DOM interaction and source-import
checks, alongside the repository's existing backend/frontend gates. The simulated
DOM tests exercise source inspection, section changes, vote filtering, promise
creation/editing, coverage mapping, local persistence/reload, export/import, hostile
markup, unavailable sources, failed browser storage and missing AI setup. They do
not certify visual layout or cross-browser behavior. Visual browser verification
was blocked by the implementation environment's remote-preview access.

## Boundaries and next work

No authenticated editorial review, cross-device account,
public promise rankings, paid plans, lobbying joins, causal beneficiary estimates,
media-silence metrics, or automatic publishing is running. Local notes are browser
storage, not a private account or a durable team workspace. Public publication of
consequential findings still needs the foundation's editorial and evidence policy.
The existing strict EvidenceBundle publication contract is unchanged; this draft
workbench uses its own versioned research envelope, never a publication bundle.

Next: verified reference-law review; more bill artifacts and legal-reference
resolution; curated original campaign statements and contrary actions; wider catalogue coverage and individual roll-call retrieval; authenticated collaborative review. Broader Media
Observatory and documented-interest research remain in the product roadmap.
