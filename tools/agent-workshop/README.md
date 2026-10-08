# Osiris Agent Workshop

An interactive guide plus executable LangGraph workflow at `/tools/agent-workshop/`.

## Implemented

- Real LangGraph JavaScript graph in the browser, with node-by-node checkpoints, conditional routes, bounded content repair, a human decision, and observable state patches.
- Editable scenarios and rule settings; evidence inspection; before/after/patch inspection; node explanations and Python excerpts; JSON configuration and trace downloads.
- A runnable [Python implementation](reference/README.md), SQLite pause/resume, shared evaluation cases, and a downloadable starter ZIP.
- A clearly labeled deterministic writer. No model calls, automatic inference, login, external tracking, arbitrary code execution, or shared API spending.

The source notes are a small bundled corpus. This is not web research. Citation membership is not a factual accuracy check. Browser checkpoints clear on reload; Python checkpoints persist in the chosen local SQLite database. The only output action is approval or rejection of a local practice draft.

## Develop and verify

From this directory:

```sh
npm ci --ignore-scripts
npm run build
npm test
python -m pip install -r reference/requirements.txt
python -m unittest discover -s reference/tests -v
python package_starter.py
```

The compiled `workshop.js`, license notices, and starter ZIP are committed so GitHub Pages needs no JavaScript build system. Rebuild after editing source. `package-lock.json` pins JavaScript dependencies; `reference/requirements.txt` pins the tested Python environment.

From the repository root:

```sh
python scripts/build_frontier.py
python scripts/validate_public.py
python scripts/validate_docs.py
python -m pip install playwright==1.55.0
python -m playwright install chromium
python tools/agent-workshop/browser_test.py
```

The browser test serves the built `_site/` artifact and checks real graph execution, review decisions, no-evidence and bounded-repair failures, configuration export, state rendering, and desktop/mobile layouts. It does not use or mock an inference provider.

## Architecture and next integration

`core.mjs` holds the graph; `app.mjs` owns the UI; `lessons.mjs` contains node explanations. The browser uses static checkpoint boundaries and an explicit state update for approval, which works without Node's AsyncLocalStorage. Python demonstrates dynamic `interrupt()` and `Command(resume=...)`. The graph is fixed; visitors edit data and bounded settings, not executable code.

The workshop is independent of the legacy Osiris runtime and the hosted ChatGPT-plan adapter in draft PR #191. No existing connection is activated or altered. Live model use requires an approved visitor-funded provider contract, a per-feature backend allowlist/schema, explicit consent, hard per-run limits, cancellation, authenticated thread ownership, protected credentials, and live acceptance tests. Keep results inside this tool; do not add prompt handoff or hidden API-funded fallback.

This release teaches implementation through a real deterministic workflow. It does **not** claim a live autonomous model, durable browser storage, or a production multi-user agent service. See [the Python guide](reference/README.md) for extension exercises and primary sources.
