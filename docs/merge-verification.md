# Merge verification — 2026-11-12

Candidate: https://github.com/Ballzatram/ballzatram/pull/204. Base revision: `4467bf434f47920d9d8927a7b74ee0b22e894f53`.
Machine-readable evidence: [standards evidence](evidence/standards-2026-11-12.json).

All merges require a successful Engineering Standards workflow on the final PR head. The rollout also checks default-branch CI after merge. CI success is not a full policy-conformance or production-readiness certificate.

## Behavior and performance

The initial inventory compared 757 existing application/code/asset files using Git objects. Changes after that inventory are recorded below. This is file-preservation evidence, not a claim that all paths have been exercised.

Five alternating base/candidate rounds used synthetic offline inputs on Windows with Python 3.12.16. The fixed gate is base × 1.20 plus a 2ms noise allowance, separately applied to median and p95. Contract hashes match. Times below are milliseconds; values are medians across the five rounds.

| Workload | Base median | Candidate median | Base p95 | Candidate p95 | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| health_http | 1.1254 | 1.2796 | 1.5142 | 1.6869 | Passed |
| demo_http | 1.2195 | 1.4969 | 1.6450 | 2.2299 | Passed |
| stock_analysis_http | 9.4669 | 8.9116 | 11.9578 | 11.7350 | Passed |
| ols_kernel | 0.5418 | 0.5495 | 0.7294 | 0.8916 | Passed |
| stress_kernel | 0.0029 | 0.0030 | 0.0031 | 0.0031 | Passed |

All 42 compiled Next.js route bundle inventories match. The maximum gzip JavaScript increase is 241 bytes; the workshop bundle increases by 346 gzip bytes. Both remain within the fixed 5% + 1KiB budget. An initial in-process TestClient run during concurrent work failed the health/demo p95 gate. Controlled local Uvicorn/HTTPX measurements passed the same gate. No application endpoint was changed to disguise that diagnostic difference.

## Generated updates under branch protection

Existing scheduled/manual generators retain their existing collection and validation rules. Publication now uses a unique automation branch and pull request, explicitly dispatches the required engineering workflow, then requests auto-merge after checks. This avoids direct default-branch writes and token-event recursion suppression. Four offline control-flow tests cover no-change, success, diff failure and commit failure. Actions default to read permissions; the existing update workflows alone request write scopes. Repository workflow PR creation and auto-merge are enabled. No workflow approves a review. If a concurrent base change makes an automation PR stale, its checks/update must be rerun before merge; protection is not bypassed. No live generator was manually triggered during verification.

## Hosted enforcement and limits

Required PR and strict GitHub Actions standards-gate, including administrators; no force push/deletion.

Public repositories require PRs, a strict up-to-date standards-gate owned by GitHub Actions, resolved review conversations and protections for administrators. No second reviewer is fabricated: the configured approval count is zero for this solo-owner account. CODEOWNERS remains an ownership signal, not a claim of independent approval. Protected deployment/recovery and product-specific manual evidence still require separate assessment.

This work does not certify production load capacity, game frame rate, live-provider performance, accessibility or recovery procedures. Remaining requirements are explicit in docs/audit.md; no waiver was invented.
