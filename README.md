# MacroBoard

Investor-grade macro + stock analysis foundation with a FastAPI backend, Next.js frontend, and a static homepage-launched MacroBoard tool.


## Site quality audit and shipped polish

A May 2026 pass tightened the public Ballzatram surface and MacroBoard app so the site feels less like a collection of placeholders and more like a coherent product:

- The homepage now describes each tool with user-facing readiness, risk, and workflow expectations instead of experimental copy.
- Weather Prop Bot is a paper-trading scanner worksheet with live edge math, capped paper sizing, settlement-review reminders, and an explicit browser safety boundary that prevents credential collection or live orders.
- The Next.js MacroBoard pages now use a shared workflow model with polished hero sections, metrics, charts, next actions, empty states, review checklists, and governance caveats across all navigation tabs.
- API client errors now handle non-JSON backend failures cleanly so user-facing surfaces do not collapse on unexpected responses.
- Parcel result rendering avoids injecting listing titles/URLs through HTML strings, reducing XSS risk from remote search results.

## Econ Arcade

The May 2026 production polish pass added stronger public-site metadata, skip-link accessibility, a homepage mission panel, and an Econ Arcade learning contract that makes the curriculum explicit before users launch a game. Central Banker now includes setup learning objectives, an in-game policy notebook, and end-of-term concept debriefs so the macro game teaches inflation targeting, policy lags, financial stability, expectations, and central-bank credibility while preserving the playful Goblin Reserve loop.

The Next.js Econ Arcade page now has a dedicated **Playable launch bay** so all currently runnable economics experiences are visible from one UI instead of being mixed into locked roadmap cards. It includes the Next.js Supply & Demand Lab, the Next.js Invisible Hands: Steel Crisis systems simulator, the static Invisible Hands market-clearing game, Central Banker, Prisoner’s Dilemma Lab, Strategy Studio, and MacroBoard. Planned modules such as Signal vs Noise and Tariff Lab remain visible in the complete registry with roadmap labels, not hidden. The `frontend/public` symlinks expose the existing static `econ-arcade`, `games`, `tools`, and `docs` folders to the Next.js dev/build server so these launch links return real pages instead of dead routes.

The static homepage now links to `econ-arcade/index.html`, a dedicated strategy-learning menu for economics games and macro tools. `econ-arcade/platform.html` now provides the curriculum-wide Strategy Studio covering rational choice, static games, dynamic games, incomplete information, auctions, signaling, bargaining, and mechanism design with multiple playable concept engines. The first full standalone game theory module is `econ-arcade/prisoners-dilemma.html`, which implements a repeated Prisoner’s Dilemma lab with AI opponent archetypes, a live payoff matrix, a cooperation trace, and educational debriefs. Dependency-free Node API foundations for Prisoner’s Dilemma and the broader scenario catalog live in `econ-arcade/backend/`. The product/architecture blueprint lives in `docs/game-theory-platform.md`, Prisma schema in `prisma/schema.prisma`, and shared simulation contracts in `packages/sim-core/src/types.ts`.

## Architecture (text diagram)
- `backend/app/data`: ingestion adapters, normalization, validation, caching
- `backend/app/analytics`: deterministic model runners (OLS, rolling, regularized, event study, stress, importance, regimes)
- `backend/app/services`: workflow orchestration + reporting
- `backend/app/api`: HTTP route handlers
- `frontend/src/app`: Next.js product workflows for local/backend-backed development
- `tools/macroboard`: static MacroBoard entry point linked from the Ballzatram homepage
- `frontend/src/components`: reusable KPI/model assumption/chart UI

## Setup
### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE=http://localhost:8000/api npm run dev
```

## Env vars
- `NEXT_PUBLIC_API_BASE` (frontend backend URL)
- Future connectors (FRED/BLS) should add `FRED_API_KEY`, `BLS_API_KEY`.

## AI workflow agent
MacroBoard and the Next.js tool pages include a page-aware Ballzatram AI workflow agent. The backend exposes `/api/agent/processes`, `/api/agent/chat`, and `/api/agent/history/{conversation_id}`. No billing routes are exposed during the product-quality pass; do not wire checkout or entitlement gates until the tools are consistently useful.

Set these optional backend environment variables to enable production integrations:
- `OPENAI_API_KEY`: when present, `/api/agent/chat` calls OpenAI's Responses API; without it the service returns a deterministic development response.
- `OPENAI_AGENT_MODEL`: model override for the agent, defaulting to `gpt-4.1-mini`.
- Future entitlement checks should be added after the core workflows are production-ready. Keep secrets server-side only.

## Data sources
- Demo public dataset: `demo_data/macro_timeseries.csv`
- Custom upload endpoint: `/api/data/upload-csv`
- Planned key-required: FRED/BLS adapters.

## Testing
```bash
cd backend && PYTHONPATH=. pytest -q
cd frontend && npm run lint
```

## Roadmap
1. Add real FRED/BLS/Yahoo connectors with retry, backoff, freshness monitoring.
2. Add out-of-sample validation, walk-forward backtests, and model governance metadata.
3. Add auth, saved workspaces, report export pipeline, and observability.
