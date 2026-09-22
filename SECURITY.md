# Security

[Overview](README.md) · [Contribution guide](CONTRIBUTING.md)

## Report privately

Do not put credentials, exploit details, private records, or another person's data in a public issue or pull request. Use GitHub's private vulnerability reporting option for this repository **when it is available**. Otherwise, ask the maintainer, `@Ballzatram`, for a private reporting channel without including sensitive details in the public request. This document does not imply that private reporting has been enabled.

A useful private report identifies the affected component and commit, prerequisites, minimal reproduction using synthetic data, likely impact, and any suggested mitigation. Redact access tokens, cookies, authorization headers, pilot codes, and personal information from logs and screenshots. Do not probe other users' sessions or run destructive tests against the public site.

## Scope and current limits

The public browser site, Next.js / FastAPI application, Osiris MCP tools, and Osiris runtime are separate surfaces. A static deploy does not establish the security or availability of a separately hosted service. This is an experimental portfolio; there is no promised response-time SLA or bug bounty.

Review the [runtime guide](osiris-runtime/README.md) before hosting the subscription pilot. Its per-session processes and temporary homes are not equivalent to per-user container or operating-system isolation. Public multi-user operation needs additional identity, isolation, and abuse controls. The [MCP guide](osiris-tools/README.md) documents the different, deterministic-tool boundary.

## Handling sensitive information

Keep secrets out of Git history, public frontend configuration, browser URLs, and test fixtures. Never commit an actual `.env` file or provider session directory. Example configuration must contain placeholders only.

Browser-local storage is not a secret vault. Unlisted or `noindex` pages are not access-controlled. Share only the context explicitly selected for the task, treat imported/model-produced text as untrusted, and do not log request bodies or authorization headers in credential-bearing services.

A passing test suite is not a security audit. Changes to authentication, origins, context filtering, dependencies, or runtime permissions require focused review and regression testing.
