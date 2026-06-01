# Ballzatram V2 Architecture Audit

Date: 2026-06-01  
Branch audited: `codex/ballzatram-newspaper-front-page`  
Latest local commit observed: `6f7b797 Refactor homepage into Ballzatram newspaper`

## Scope

This is a discovery and risk-reduction pass only. It does not rename Macro Board/MacroBoard, does not delete existing features, does not build Quant Library, does not implement the newspaper, and does not implement Stoney Baologna or Bullshit Simulator work.

## Current Architecture Summary

Ballzatram is currently a multi-surface repository rather than a single app:

- Root static site: `index.html`, `style.css`, `script.js`, `lab.js`, legal/community/lab-pass pages, static assets, and static tool/game folders. This is still deployable through GitHub Pages.
- Next.js frontend: `frontend/`, using Next.js `14.2.5`, React `18.3.1`, TypeScript, Tailwind, App Router, and `experimental.typedRoutes`.
- FastAPI backend: `backend/app/`, exposed under `/api` by `backend/app/main.py`.
- Static tools and games: `tools/`, `games/`, `econ-arcade/`, plus copies or symlinks into `frontend/public`.
- Separate verticals: `weather-trader/` TypeScript local backend and `ai-edit-factory/` FastAPI/Vite/worker app.
- Future/adjacent infrastructure: Prisma game-theory schema in `prisma/schema.prisma`, shared simulation contracts in `packages/sim-core/src/types.ts`.

There is no root `package.json`. Commands are per app/subproject.

## Framework And Routing

The production app direction appears to be the Next.js App Router frontend plus FastAPI backend:

- `frontend/src/app/layout.tsx` wraps most routes in `Layout`.
- Penitent routes bypass the normal site shell when `pathname.startsWith("/penitent")`.
- MacroBoard/workflow routes show a secondary workflow nav and the floating `AgentWidget`.
- No Next API route handlers were found under `frontend/src/app`; all API calls go to FastAPI.
- `frontend/next.config.mjs` defines a redirect from `/tools/macroboard/:path*` to `/macro-board` and a webpack alias for `@`.

Current Next pages found:

- `/`
- `/macro-board`
- `/dashboard` -> redirects to `/macro-board`
- `/stock`
- `/portfolio`
- `/scenario`
- `/event-study`
- `/model-compare`
- `/classroom`
- `/reports`
- `/econ-arcade`
- `/econ-arcade/supply-demand-lab`
- `/econ-arcade/invisible-hands`
- `/invisible-hands` -> redirects to `/econ-arcade/invisible-hands`
- `/penitent`
- `/penitent/hymns`
- `/penitent/relics`
- `/penitent/rhythm`

## Existing Features Found

### MacroBoard / Macro Board

There are two MacroBoard implementations:

- Static MacroBoard in `tools/macroboard/`.
  - Browser-only dashboard.
  - Loads `demo_data/macro_timeseries.csv`, falls back to embedded rows, supports holdings CSV upload, computes portfolio diagnostics, and attempts public Yahoo chart API pulls.
  - FRED browser key has been removed; UI says server-side key is required.
- Next/FastAPI MacroBoard in `frontend/src/app/macro-board/page.tsx` and `backend/app/services/macro_board.py`.
  - Guided intake.
  - Workspace creation/rerun/listing.
  - Evidence cards, risks, missing data, sources, recommendations, analyst outputs.
  - Uses local demo macro data, optional Stooq price fetches, optional FRED via `FRED_API_KEY`, and placeholder news context.
  - Persists workspaces to `backend/data/workspace_store.json` through `WorkspaceStore`.

Related files:

- `frontend/src/components/ai-tools/ToolPrimitives.tsx`
- `frontend/src/lib/toolOutput.ts`
- `frontend/src/components/AgentWidget.tsx`
- `frontend/src/lib/api.ts`
- `backend/app/api/routes.py`
- `backend/app/api/agent_routes.py`
- `backend/app/services/agent.py`
- `backend/app/services/workspace_store.py`
- `backend/app/data/timeseries.py`
- `backend/app/analytics/models.py`

### Finance Dashboards / Market Data / Rates Data

- `backend/app/services/macro_board.py` has Stooq price fetching, FRED fetching, demo macro series aliases, and a `/macro-board/market-data` route.
- Static MacroBoard attempts Yahoo chart API calls from the browser through `query1.finance.yahoo.com`.
- `demo_data/macro_timeseries.csv` and `demo_data/demo_portfolio.csv` are the current reliable bundled data sources.
- Backend analytics cover OLS, rolling regression, beta/alpha, stress tests, drawdown, VaR/expected shortfall, correlation, and report rendering.
- Workflow demo pages for stock, portfolio, scenario, event study, model compare, classroom, and reports are mostly shared static/demo UI through `WorkflowPage` and `workflows.ts`.

### AI Explanations / Generated Content

- `backend/app/services/agent.py` uses OpenAI Responses API when `OPENAI_API_KEY` is configured, otherwise returns deterministic structured fallback output.
- Agent process coverage exists for MacroBoard workflow pages and Econ Arcade pages.
- `ai-edit-factory/` is a separate, much larger generated/editing app with FastAPI, Vite, worker, ffmpeg render path, rights guardrails, and tests.
- `frontend/public/ai-edit-factory/index.html` is only a back-issue stub, not the full AI Edit studio.

### Newspaper Layout

- Root `index.html` and Next `frontend/src/app/page.tsx` both now present a newspaper/front-page concept.
- The styling is duplicated across root `style.css`, `frontend/public/style.css`, and very large `frontend/src/app/globals.css`.
- This audit does not implement or rewrite the newspaper.

### Penitent / Penitent II

- Next pages and components exist under `frontend/src/app/penitent/*` and `frontend/src/components/penitent/*`.
- Assets live under `frontend/public/pntnt2/`, including generated bundles and optimized runtime art.
- `RhythmCombat.tsx`, `PenitentGate.tsx`, `PenitentFolio.tsx`, `assets.ts`, and `beatmaps.ts` form the current Penitent II architecture.

### Games / Arcade

- Static games exist in root `games/` and `econ-arcade/`.
- Next copies/static public versions live under `frontend/public/games` and `frontend/public/legacy-econ-arcade`.
- Next Econ Arcade lives in `frontend/src/app/econ-arcade/*` with:
  - `EconArcadePage`
  - `SupplyDemandLab`
  - `InvisibleHandsPage`
  - simulation libraries under `frontend/src/lib/econ-arcade` and `frontend/src/lib/invisible-hands-v2`
- Stoney Bologna currently exists as a static game under both `games/stoney-bologna` and `frontend/public/games/stoney-bologna`.

## Data And API Patterns

- Frontend API base defaults to `process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api"`.
- Production Docker passes `NEXT_PUBLIC_API_BASE=/api`.
- `frontend/src/lib/api.ts` centralizes most agent/demo/analyze calls, but `frontend/src/app/macro-board/page.tsx` has its own local `fetchJson` helper.
- FastAPI routes are grouped in `backend/app/api/routes.py` and mounted with `/api`.
- Backend schemas are Pydantic models in `backend/app/models/schemas.py`.
- Persistence is currently file/SQLite oriented:
  - MacroBoard workspaces: JSON file in ignored `backend/data`.
  - Agent history: temp file locally or `/app/backend/data/agent_history.json` in Docker.
  - Weather Trader: local SQLite.
  - AI Edit Factory: SQLite under its own app.

## Deployment Setup

Current documented production setup is DigitalOcean, not Vercel/Cloudflare/Supabase/Sentry:

- `.github/workflows/deploy.yml` deploys on pushes to `master` over SSH to `/root/ballzatram`.
- `docker-compose.prod.yml` runs:
  - `frontend`: Next.js app on port 3000.
  - `backend`: FastAPI app on port 8000.
  - `caddy`: HTTPS reverse proxy on ports 80/443.
- `deploy/caddy/Caddyfile` sends `/api/*` to backend and everything else to frontend. It blocks source-tree paths such as `/backend/*`, `/frontend/*`, `/ai-edit-factory/*`, `/.git/*`.
- `DEPLOYMENT.md` states AI Edit Factory is retired from production and root Ballzatram is the production stack.
- `.github/workflows/deploy-pages.yml` still deploys the root static site to GitHub Pages and includes `CNAME` for `ballzatram.com`.
- `.github/workflows/update-parcel.yml` runs the Parcel data update pipeline daily and commits output files.

No `vercel.json`, `wrangler.toml`, Supabase config, or Sentry config was found in the repo.

## Risks And Unknowns

- There are two active public-site surfaces: root static and Next. They have overlapping but different routes, copy, links, and static assets. This increases drift risk.
- GitHub Pages deployment still exists with `CNAME=ballzatram.com`, while `DEPLOYMENT.md` says production is DigitalOcean/Caddy. DNS/source-of-truth should be confirmed before future public changes.
- `frontend/public/tools` is a git symlink to `../../tools` (`120000` in git), but on this Windows checkout it appears as a plain file containing `../../tools`. That can make `/tools/parcel/index.html` fail in local Next development even though Linux production may behave differently.
- Static root links to `/penitent`, which is a Next route and likely broken on static GitHub Pages.
- Frontend has no committed `package-lock.json`; Docker uses `npm install` instead of `npm ci`, so frontend production builds are not fully reproducible.
- `npm run lint` is actually `tsc --noEmit`; there is no ESLint command configured.
- Several files contain mojibake/encoding artifacts, including corrupted arrow, middle-dot, and apostrophe sequences, especially in static copied content and Econ Arcade text.
- `backend/data` is ignored and missing until the backend creates it. Production uses a Docker volume, but there is no auth, user scoping, retention, locking, or migration story for MacroBoard workspaces.
- Live market data is provider-fragile. Stooq and Yahoo-style public chart calls may fail or be blocked; FRED requires `FRED_API_KEY`; news context is explicitly unconfigured.
- Root `.env.example` advertises `NEWS_PROVIDER_API_KEY` and `MARKET_DATA_API_KEY`, but the current code does not have corresponding production-grade adapters.
- Weather Trader requires Node `>=24.0.0`, while its dev dependency types are Node 20. That may be intentional for `node:sqlite`, but it is a local setup hazard.
- Styling is split across several very large CSS files and one-off Tailwind class systems. `frontend/src/app/globals.css` has accumulated unrelated page-specific UI.
- No observability or production error reporting integration was found. Sentry is not wired.
- No auth, entitlement, account, or Supabase-backed user data layer is present. This is consistent with the current Lab Pass docs, but blocks paid durable workspace claims.

## Proposed Phased Implementation Plan

### Phase 1: Stabilize Surfaces And Routes

- Decide whether DigitalOcean/Next is the canonical public surface and either retire or clearly label the GitHub Pages workflow.
- Verify every homepage/navigation link in both root static and Next surfaces.
- Replace fragile public symlink assumptions with a build/copy strategy that works on Windows, CI, and Docker.
- Add a committed frontend lockfile and switch Docker to `npm ci`.
- Fix mojibake in user-facing text.

### Phase 2: Harden MacroBoard Without Renaming It

- Keep MacroBoard/Macro Board naming stable for now.
- Consolidate the duplicated frontend API helpers.
- Define a stable provider interface for demo, Stooq/Yahoo, FRED, and future market/news providers.
- Add explicit source freshness, provider failure, and fallback metadata.
- Add auth/user-scoped persistence before promising durable workspaces.
- Add workspace retention/export rules before monetization.

### Phase 3: Turn Demo Workflow Pages Into Real Tool Views

- Keep `WorkflowPage` as the shared shell where it helps.
- Connect stock, portfolio, scenario, event-study, model-compare, classroom, and report pages to real backend calls or clearly mark them as static demo pages.
- Reuse `ToolOutput` everywhere a tool emits cards, risks, sources, and next actions.
- Avoid adding Quant Library until MacroBoard's current flows are stable.

### Phase 4: Production Hardening

- Add CI validation for frontend typecheck/build, backend tests, and route/link checks.
- Add structured backend logging and error tracking.
- Add deployment health checks for `/`, `/macro-board`, `/api/health`, `/api/version`, and key static public assets.
- Confirm CORS and same-origin assumptions for production.

### Phase 5: Future Experience Work

- Only after route/deploy/data stability: revisit the newspaper layout, new games, Penitent expansion, Stoney Baologna/Bullshit Simulator work, and richer generated content.
- Keep older static games/tools available unless a deliberate archive/redirect plan exists.

## Files Likely To Change In Later Phases

- `frontend/next.config.mjs`
- `frontend/package.json`
- `frontend/package-lock.json` or another lockfile if package manager changes
- `Dockerfile.frontend`
- `frontend/src/app/page.tsx`
- `frontend/src/app/macro-board/page.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/AgentWidget.tsx`
- `frontend/src/components/WorkflowPage.tsx`
- `frontend/src/components/ai-tools/ToolPrimitives.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/workflows.ts`
- `frontend/src/lib/toolOutput.ts`
- `frontend/src/app/globals.css`
- `backend/app/api/routes.py`
- `backend/app/api/agent_routes.py`
- `backend/app/models/schemas.py`
- `backend/app/services/macro_board.py`
- `backend/app/services/agent.py`
- `backend/app/services/workspace_store.py`
- `backend/app/data/timeseries.py`
- `docker-compose.prod.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/deploy-pages.yml`
- `DEPLOYMENT.md`
- `README.md`
- `data/tool-inventory.json`

## What Not To Touch Yet

- Do not delete static tools, games, AI Edit assets, Weather Desk, Parcel, Penitent, or legacy Econ Arcade.
- Do not rename Macro Board/MacroBoard yet.
- Do not build Quant Library yet.
- Do not implement the newspaper yet.
- Do not implement Stoney Baologna or Bullshit Simulator yet.
- Do not enable live trading or add browser credential collection.
- Do not add checkout, entitlement gates, or paid workspace claims before auth/storage scope exists.
- Do not replace the deployment stack until the active DNS/hosting source of truth is confirmed.

## Testing And Build Commands Discovered

Root/local:

```bash
python scripts/validate_lab_readiness.py
powershell -ExecutionPolicy Bypass -File scripts\verify_deployment.ps1
```

Backend:

```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
PYTHONPATH=. pytest -q
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
npm run start
```

Weather Trader:

```bash
cd weather-trader
npm install
npm run build
npm test
```

AI Edit Factory:

```bash
cd ai-edit-factory
PYTHONPATH=backend python -m pytest -q
npm --prefix frontend run build
docker compose up --build
```

## Deployment Considerations

- Confirm whether `ballzatram.com` should be served by DigitalOcean/Caddy only, or whether GitHub Pages remains an intentional public/static channel.
- Production FastAPI secrets belong in `.env.production` on the server or GitHub deployment secrets, not browser/static files.
- `NEXT_PUBLIC_API_BASE=/api` is correct for Caddy same-origin production.
- `OPENAI_API_KEY`, `OPENAI_AGENT_MODEL`, `FRED_API_KEY`, and any future provider keys should remain server-side.
- Static tools exposed through `frontend/public` should be copied or built reliably, not dependent on symlink behavior that differs across Windows, GitHub Actions, and Linux Docker.
- If MacroBoard becomes user-facing in production, workspace storage needs auth, user scope, retention policy, and migration/backups before it is sold as durable.

## Validation Result

Commands run after writing this audit:

```powershell
python scripts\validate_lab_readiness.py
npm.cmd run lint
```

Results:

- `python scripts\validate_lab_readiness.py` failed because `data/tool-inventory.json` uses status labels that are not present in `scripts/validate_lab_readiness.py` / `data/status-taxonomy.json`: `Under Review`, `Playable Oddity`, `Playable Archive`, `Prototype Relic`, and `Back Issue`.
- `npm run lint` first failed through PowerShell because `npm.ps1` is blocked by the local execution policy.
- `npm.cmd run lint` succeeded. This runs `tsc --noEmit` for the Next frontend.

No validation-driven code rewrites were made in this discovery pass.

## Implementation Notes

### 2026-06-01 - Ballzatram v2 product architecture foundation

Added a typed frontend product architecture foundation for departments and newspaper-style stories without rebuilding the public UI.

Files added:

- `frontend/src/config/departments.ts`
- `frontend/src/types/story.ts`
- `frontend/src/data/stories.ts`
- `frontend/src/app/internal/product-architecture/page.tsx`

Scope notes:

- Department metadata now covers Ballzatram Daily, Quant Library, Bettor's Corner, Parcel, Laboratory, Culture, Arcade, Stoney Baologna, Observatory, Academy, Vault, and Ledger.
- Story typing now supports manual, tool-generated, and hybrid story sources, related routes back to tools, confidence/caveat fields, data freshness, body sections, and reading time.
- Demo stories are explicitly placeholder content and do not run API calls, market data fetches, AI generation, or new game logic.
- The internal preview route is intentionally small and unlinked from public navigation: `/internal/product-architecture`.
- Existing routes and tools were preserved.

Validation run for this implementation:

- `npm.cmd run lint` in `frontend/` passed. This runs `tsc --noEmit`.
- `npm.cmd run build` in `frontend/` passed and generated the new `/internal/product-architecture` route. The build emitted existing webpack cache snapshot warnings but exited successfully.
- `python scripts\validate_lab_readiness.py` still fails on the existing status taxonomy mismatch in `data/tool-inventory.json`: `Under Review`, `Playable Oddity`, `Playable Archive`, `Prototype Relic`, and `Back Issue` are not accepted by the validator.
- `python -m pytest -q` in `backend/` could not run in this local environment because `pytest` is not installed for `C:\Python314\python.exe`.
