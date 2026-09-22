# Development and verification

[Overview](../README.md) · [Engineering tour](ENGINEERING_TOUR.md) · [Contributing](../CONTRIBUTING.md)

Commands below run from the repository root unless stated otherwise. The repository contains separate components, not a root npm workspace: install dependencies in the component you are reviewing. Never put provider keys, pilot admission codes, or personal records into a public example.

## Choose a surface

| Surface | Environment reflected by the repository | Guide |
| --- | --- | --- |
| Public browser site and documentation checks | Python 3.12; no npm or AI account required | Instructions below |
| Next.js frontend and FastAPI backend | Node 20 / npm and Python 3.12, matching PR Validation | Instructions below |
| In-page Osiris runtime pilot | Node 20 or later; Docker for container acceptance | [Runtime guide](../osiris-runtime/README.md) |
| Osiris MCP tools / Worker | Node 22 or later; frontend dependencies for browser tests | [Tools guide](../osiris-tools/README.md) |

These describe the checked-in setup and CI, not a guarantee of compatibility with every runtime release. Lockfiles and component configuration remain the source of truth.

## Public site: quickest start

```sh
git clone https://github.com/Ballzatram/ballzatram.git
cd ballzatram
python scripts/build_public.py
python -m http.server 8080 --bind 127.0.0.1 --directory _site
```

Open **http://127.0.0.1:8080/**. Keep that terminal running while reviewing the site; `Ctrl+C` stops it. Use HTTP rather than opening an HTML file directly, because some modules fetch local JSON and load ES modules.

`build_public.py` recreates `_site/` using an explicit publication manifest. Edit the source files, then rebuild; edits inside `_site/` will be lost. To change the generated homepage, edit [public programs](../data/public-programs.json) or the [homepage generator](../scripts/build_frontier.py), then run:

```sh
python scripts/build_frontier.py
python scripts/validate_public.py
```

The public validator builds and checks the Pages artifact. Neither command starts FastAPI, the MCP service, or the subscription runtime. General deployment and domain instructions live in [DEPLOYMENT.md](../DEPLOYMENT.md).

## Next.js and FastAPI

The browser site above is enough for the static portfolio. Use this setup only for the separate application and backend-backed workflows.

### Terminal 1: backend

```sh
cd backend
python -m venv .venv
# macOS / Linux:
source .venv/bin/activate
# Windows PowerShell instead:
# .\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2: frontend

From the repository root, in a new terminal:

```sh
cd frontend
npm ci
# macOS / Linux:
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000/api npm run dev
```

For Windows PowerShell, replace the final command with:

```powershell
$env:NEXT_PUBLIC_API_BASE = "http://127.0.0.1:8000/api"
npm run dev
```

Open **http://localhost:3000/**. `NEXT_PUBLIC_API_BASE` is a public frontend setting, never a place for credentials. Review [.env.example](../.env.example) and each component guide before enabling optional features. A provider key is not required for deterministic fallback paths; an environment key must not be treated as permission to enable hidden paid inference.

## Focused verification

### Documentation and public artifact

```sh
python -m unittest discover -s scripts/tests -p 'test_validate_docs.py' -v
python scripts/validate_docs.py
python scripts/validate_lab_readiness.py
python scripts/validate_public.py
```

The documentation validator checks a curated list of overview/review/contribution files, their local links, and Markdown heading anchors. It deliberately makes no external network requests and does not certify every historical document. The public-site checks are separate.

### Frontend and static applications

```sh
npm ci --prefix frontend
npm run test:static --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Despite its name, `npm run lint` currently executes `next typegen && tsc --noEmit`. It is a **TypeScript check**, not ESLint. `test:static` runs the static-site, AI-panel, bridge, campaign, and Parcel suites declared in [package.json](../frontend/package.json).

### Backend

Activate the backend virtual environment first. From `backend/`:

```sh
# macOS / Linux:
PYTHONPATH=. python -m pytest -q
```

PowerShell equivalent:

```powershell
$env:PYTHONPATH = "."
python -m pytest -q
```

### Observatory

From the repository root:

```sh
npm ci --prefix tools/observatory --ignore-scripts
npm test --prefix tools/observatory
node tools/observatory/validate-live.mjs
python -m unittest discover -s scripts/tests -v
```

See the [workbench guide](observatory/WORKBENCH.md) for the separate networked refresh command and its request budget. A fixture or retained-data check is not a freshness guarantee.

### Osiris runtime: no sign-in required for these checks

```sh
npm ci --prefix osiris-runtime --ignore-scripts
npm test --prefix osiris-runtime
npm run check:runtime --prefix osiris-runtime
```

The smoke check exercises the pinned real runtime while signed out. It does not generate an answer or validate user entitlement. Follow the [runtime guide](../osiris-runtime/README.md) for Docker, hosting, sign-in, and explicit user-account acceptance; do not invent a public runtime address or substitute shared credentials.

### Osiris MCP tools

Use Node 22 or later. The browser tests also need the frontend dependencies:

```sh
npm ci --prefix osiris-tools --ignore-scripts
npm ci --prefix frontend --ignore-scripts
npm test --prefix osiris-tools
npm run check:worker --prefix osiris-tools
```

See the [tools guide](../osiris-tools/README.md) for starting the local server, deployment, and host acceptance. Protocol tests do not establish that every consumer host or mobile client supports the integration.

The [learning-feed plan](osiris-feed-plan.md) documents its independent Node and served-browser checks. Do not replace its HTTP browser test with a render-only preview.

## Before opening a pull request

Run the checks relevant to the files you changed and the documentation validator when changing these entry-point documents. Include exact commands and results; list anything not run. For UI changes, check keyboard navigation, a narrow/mobile viewport, and the built `_site/` route. For AI changes, cover consent, cancellation, disconnect, malformed input, and cost/credential boundaries without using real secrets in fixtures.

[PR Validation](../.github/workflows/pr-validation.yml) is the reference for the main automated gates; [Documentation](../.github/workflows/docs.yml) guards this entry-point documentation. Keep failures visible. A green check on one component is not evidence that an unrelated service has been deployed or accepted.
