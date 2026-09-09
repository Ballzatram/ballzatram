# Primary-source registry and access plan

Documentation checked September 8, 2026. These are candidate integrations, not functioning connectors. Actual history, authentication, rate limits, licensing, and availability must be tested per source before production. Public accessibility is not a blanket redistribution license.

| Source | Proposed use | Primary reference | Integration boundary |
|---|---|---|---|
| Congress.gov API | Bills, actions, members, amendments, text links; supported roll-call data | https://api.congress.gov/ | Verify endpoint-specific coverage; do not assume equal House/Senate or historical coverage. |
| GovInfo | Structured bill text/status, published artifacts, version lineage | https://www.govinfo.gov/developers | Keep exact package IDs and document formats; structured availability varies. |
| GovInfo related documents | Connect versions, laws, reports, Code references | https://www.govinfo.gov/features/api-related-document-service | Relatedness is a retrieval aid, not proof of a substantive interpretation. |
| FEC / OpenFEC | Candidates, committees, campaign filings and permitted finance analysis | https://api.open.fec.gov/developers/ | Reconcile amended filings and transaction types; restrict individual-donor use pending legal review. |
| Lobbying Disclosure Act portal | Registrations, quarterly activity, contribution reports | https://lda.gov/api/ and https://lda.gov/api/redoc/v1/ | Disclosed issue activity does not reveal all meetings, exact bill-level spending, or authorship. |
| USAspending | Federal awards, recipients, agency/account spending | https://api.usaspending.gov/ | Award linkage is not a causal estimate or proof of profit; distinguish financial concepts and date coverage. |
| Federal Register | Rules, proposals, notices, agency documents | https://www.federalregister.gov/developers/documentation/api/v1 | A proposed rule is not an effective final rule. Prefer the official API to uncontrolled scraping. |
| Regulations.gov | Regulatory dockets, documents, comments | https://open.gsa.gov/api/regulationsgov/ | Link comment authors and organizations cautiously; attachments and release timing may vary. |
| Media Cloud | Defined news-source inventories, observed coverage, metadata | https://www.mediacloud.org/documentation/faqs | Source coverage starts with collection; full story text is not provided for redistribution. |
| UCDP | Scoped organized-violence events, versioned records | https://ucdp.uu.se/apidocs/ and https://ucdp.uu.se/downloads/ | Not a global homicide census; confirm chosen release, inclusion rules, reporting lag, and reuse terms. |
| ACLED (optional, rights-gated) | Political-violence/protest events | https://acleddata.com/eula and https://acleddata.com/contentusage | Corporate licensing is required for commercial entities under the checked terms. Do not ingest by default. |

## Research sources not yet integration-verified

House Clerk/Senate roll calls, CBO/JCT scoring, archived campaign pages, primary speeches, official sanctions/treaty records, public corporate ownership filings, and appropriately licensed full-text media are next discovery tasks. The starter does not claim a usable endpoint or complete historical coverage for them. Homepage archives, television transcripts, and image prominence require additional access; leave those metrics unavailable rather than synthesizing them.

## Commercial-use constraints

The FEC describes restrictions on sale or commercial use of individual contributor information, while also describing specified news/communications and other permitted uses. A paid product needs a use-specific legal assessment; an API key does not settle that question. Do not export donor prospecting lists or personal contact details.

Primary reference: https://www.fec.gov/updates/sale-or-use-contributor-information/

Media Cloud's FAQ describes collection-start limits and copyright restrictions on full-text release. A metadata match is not access to the article body, and a zero search result is not proof of no publication. Model licenses, training rights, excerpt display, indexing, and redistribution need separate assessment where applicable.

Primary reference: https://www.mediacloud.org/documentation/faqs

ACLED's checked EULA requires a corporate license for commercial entities. Treat it as an optional licensed integration, not free startup infrastructure.

Primary reference: https://acleddata.com/eula

## Required per-adapter contract

Record provider, native record ID, source URL, retrieval time, publication/valid-time precision, content hash, history coverage, access/rights review, request parameters, pagination cursor, retry state, freshness, and parser version. Keep failed retrievals distinct from valid empty results. Credentials stay server-side; no user campaign data, personal addresses, secrets, or licensed corpora belong in this public repository.

Recheck this registry before implementation. Do not automatically enroll in paid services or accept licensing agreements on behalf of the user.
