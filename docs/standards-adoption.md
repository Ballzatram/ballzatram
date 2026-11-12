# Engineering standards adoption

Owner: Ballzatram. Policy: 1.0.0. Baseline source revision: `4467bf434f47920d9d8927a7b74ee0b22e894f53`.

Monorepo: static public site, Next.js frontend, FastAPI analytics, media editing, educational tools and isolated AI runtimes. Keep component boundaries, paper-trading restrictions and credential isolation intact.

## Verification

Run `python .engineering/tools/audit.py .` for structural prerequisites. Existing native test/build commands are retained in README and the workflows. `.github/workflows/engineering.yml` adds a consistent, read-only verification gate; it never deploys or uses production secrets. Review `docs/audit.md` for controls requiring manual evidence.

The command register includes existing syntax/compile checks where no full static type checker exists; these are not equivalent to strict typing. Legacy formatter/type/coverage gaps remain explicit, not silently waived. No approved exceptions have been invented. Source import/native platform requirements and hosted protections must be reviewed separately.

## Preservation

Default branches and deployed services are not changed by preparing this branch. Runtime source changes, if any, are limited to documented regression fixes and must pass the existing tests. Do not run live research, mail, payment, model generation, customer data changes or production deployment as a standards check.

## Recorded local verification

70 backend tests, 122 frontend static tests, 36 isolated-runtime tests, 21 Osiris tool tests, 35 Observatory tests, 9 workshop tests and paper-trading tests passed. Frontend, media frontend and workshop builds passed. Scoped npm and analytics dependency audits report zero known vulnerabilities after security updates. OpenAPI route and schema-name inventories are preserved. Native Windows path assertions were corrected without changing runtime isolation behavior. AI/media backend rendering and production-container tests remain environment-specific follow-up checks.

See docs/audit.md for unresolved controls. A structural pass is not full conformance.
