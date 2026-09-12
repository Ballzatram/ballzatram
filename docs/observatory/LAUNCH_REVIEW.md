# Congressional Accountability — launch review

Review scope: citizen interface, browser state, data refresh and publication path,
source identity, imports/exports, and the boundary between public records and personal
judgment. The existing backend publication contract is preserved. This release is a
public beta for bill tracking and personal evidence review, not a reviewed political
ratings service.

## Findings addressed

| Finding | Change | Verification |
|---|---|---|
| A hidden historical case loaded behind the live tracker and could look like current data. | No automatic example fetch. Historical records are opt-in and labeled. | Fresh-session and source-outage DOM tests. |
| Draft tools and official records looked equally authoritative. | Distinct official, historical, saved, imported, synthetic, and draft labels; overview lists missing evidence. | Citizen journeys and import/export regressions. |
| Finding and using a bill required understanding the research workbench first. | Three-step introduction, bill overview, contextual navigation, saved-research entry, and citizen guide. | Search/open/follow, saved-research, and guide flows. |
| Bill links could not identify the selected bill; Back did not restore the prior view. | Validated bill/view URLs and browser history handling, with no unrelated fallback. | Shared-link, unavailable-link, and Back-navigation tests. |
| Source identity used BILLSTATUS bytes alone, despite independently arriving text. | Identity includes all retained source hashes and parser revision; existing detail files are immutable. | Same-status changed-text and repeated-fetch tests, real GPO retrieval, publication fingerprint validation. |
| A bill-level action could support a personal conduct judgment without an individual source. | New comparisons require individual evidence or an identity-confirmed vote; outcomes need a separate citation. | Negative and positive evidence-validation tests. |
| Long forms lost unsaved fields when navigating to evidence. | Keep incomplete fields within the tab; make the save/reload boundary explicit. | Navigate away and restore an unfinished comparison. |
| A pending request could replace a more recent selection; refresh could take keyboard focus away. | Cancel and version requests, preserve focused search input, remove listeners on teardown. | Existing corrupted-response and failure tests plus reviewed cancellation/focus paths. |
| A one-version comparison suggested a meaningful difference calculation. | Explicit one-version and same-version states. | Guarded view paths; no invented changes. |
| Export formatting could create an oversized file that its own importer rejected. | Compact export and enforce the import-size bound before download. | Import/export round-trip regressions. |
| Product identity and availability descriptions drifted across the site. | Update homepage source catalog, tool directory, department route, metadata, and documentation. | Homepage generator, static UI checks, public artifact validation. |

## Validation before deployment

- 34 browser/domain tests: real source fingerprints, diffing, vote totals,
  draft evidence rules, escaping hostile input, failures, storage, import/export,
  search/follow/reload, citizen onboarding, shared URLs, and Back navigation.
- 16 Python tests: parsing, identity, source allowlists, failed refresh retention,
  request prioritization, immutable evidence, and competing Pages builds.
- 11 static product tests; public artifact validation covers 26 HTML pages and
  17 program destinations. The bootstrap's 24 records pass complete source validation.
- A fresh two-bill GPO scan succeeded and passed the new multi-source identity checks.
- Full frontend/backend validation remains a required PR gate. The public deployment
  verifies the complete refreshed catalogue before upload and waits for any competing
  branch Pages deployment.

The local browser cannot reach the executor preview. Final visual and interaction
checks are performed against the deployed site. No claim of exhaustive cross-browser,
real-device mobile, screen-reader, or third-party penetration testing is made.

## Public release boundaries

Coverage is a growing subset of current-Congress House and Senate bills. It excludes
resolutions. Source availability, schedule delays, per-record check times, and missing
text are visible. No match is not evidence that a bill does not exist.

Live records do not automatically include every member's vote, campaign promises,
news coverage, lobbying data, or measured implementation outcomes. Users can create
sourced personal comparisons. Those remain local, unreviewed drafts, including when
exported. The website does not publish honesty, corruption, or promise-fulfillment
scores. A discrepancy is a research question; motive requires separate evidence.

Watchlists and notes live in browser storage. There is no account, email alert, device
sync, or guaranteed archival retention. Clearing browser storage loses local work;
exports provide a portable copy. Upstream data and display problems can be reported
through the linked public GitHub issue route.
