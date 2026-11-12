# Historical credential review

On 2026-11-11, the repository owner confirmed that the FRED API key found in
commit `7147a9ed02c5629d8aa94ff036c99f507d5fece6`,
`tools/macroboard/script.js:1`, had already been revoked. The file is absent from
the current application. No credential value is reproduced here, and the key was
not used or independently queried during this review.

`.gitleaksignore` records only that exact immutable commit/file/rule/line finding.
This is a recorded revoked credential, not a path-wide or rule-wide exclusion.
History is preserved. A later occurrence, different commit or new credential
continues to be scanned. Existing `.gitleaks.toml` entries cover separate,
reviewed non-secret storage identifiers and test UUIDs only.

Future provider keys belong in the appropriate server-side secret store or
local environment and must never be embedded in browser JavaScript. Reassess
this incident if the owner confirmation proves inaccurate.
