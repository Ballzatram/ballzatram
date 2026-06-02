# Ballzatram

Ballzatram is a clean launchpad for useful AI-guided workbenches, simulations, games, and strange little tools.

The public site is intentionally simple:

- Home: a grouped launchpad for every exposed tool and page worth finding.
- Land Desk: Parcel Intelligence as a prototype land-acquisition research workflow.
- Markets & Risk: Quant Library plus demo portfolio, scenario, event-study, model, and report workflows.
- Games & Simulations: Econ Arcade, economics labs, static games, and experimental playable prototypes.
- Creative / AI Lab: AI Edit Factory and generated-story previews with backend/review caveats.
- Archive / Oddities: older newspaper, culture, betting-education, lore, and internal-note surfaces.

No checkout, billing, auth, entitlement, live trading, or paid-access implementation is part of this reset.

## Public launchpad reset

A June 2026 pass reduced the public surface back to a clearer launchpad:

- `frontend/src/config/toolCatalog.ts` is the typed source of truth for public tool cards, status labels, readiness notes, backend requirements, and route inventory.
- The homepage now groups tools by use case instead of leading with Ballzatram Daily or a newspaper-first concept.
- Land, Markets, Games, Creative / AI Lab, Culture, and Archive pages now reuse the same catalog labels.
- Quant Library remains the primary markets route; Macro Board is a legacy redirect.
- Betting, newspaper, Stoney, Penitent, and culture pages remain findable but de-emphasized as archive or experimental routes.
- Weather Desk stays paper/research only, with no live orders and no financial advice.

## Econ Arcade

The May 2026 production polish pass added stronger public-site metadata, skip-link accessibility, a homepage mission panel, and an Econ Arcade learning contract that makes the curriculum explicit before users launch a game. Central Banker now includes setup learning objectives, an in-game policy notebook, and end-of-term concept debriefs so the macro game teaches inflation targeting, policy lags, financial stability, expectations, and central-bank credibility while preserving the playful Goblin Reserve loop.

The Next.js Econ Arcade page now has a dedicated **Playable launch bay** so all currently runnable economics experiences are visible from one UI instead of being mixed into locked roadmap cards. It includes the Next.js Supply & Demand Lab, the Next.js Invisible Hands: Steel Crisis systems simulator, the static Invisible Hands market-clearing game, Central Banker, Prisoner's Dilemma Lab, Strategy Studio, and Quant Library. Planned modules such as Signal vs Noise and Tariff Lab remain visible in the complete registry with roadmap labels, not hidden. The `frontend/public` symlinks expose the existing static `econ-arcade`, `games`, `tools`, and `docs` folders to the Next.js dev/build server so these launch links return real pages instead of dead routes.

The static homepage now links to `econ-arcade/index.html`, a dedicated strategy-learning menu for economics games and macro tools. `econ-arcade/platform.html` now provides the curriculum-wide Strategy Studio covering rational choice, static games, dynamic games, incomplete information, auctions, signaling, bargaining, and mechanism design with multiple playable concept engines. The first full standalone game theory module is `econ-arcade/prisoners-dilemma.html`, which implements a repeated Prisoner’s Dilemma lab with AI opponent archetypes, a live payoff matrix, a cooperation trace, and educational debriefs. Dependency-free Node API foundations for Prisoner’s Dilemma and the broader scenario catalog live in `econ-arcade/backend/`. The product/architecture blueprint lives in `docs/game-theory-platform.md`, Prisma schema in `prisma/schema.prisma`, and shared simulation contracts in `packages/sim-core/src/types.ts`.

## Architecture (text diagram)
- `backend/app/data`: ingestion adapters, normalization, validation, caching
- `backend/app/analytics`: deterministic model runners (OLS, rolling, regularized, event study, stress, importance, regimes)
- `backend/app/services`: workflow orchestration, provider interfaces, Quant Library research payloads, and reporting
- `backend/app/api`: HTTP route handlers
- `frontend/src/app`: Next.js product workflows for local/backend-backed development
- `frontend/src/app/quant-library`: the active Quant Library workstation; old MacroBoard URLs redirect here for compatibility
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
Quant Library and the Next.js tool pages include a page-aware Ballzatram AI workflow agent. The backend exposes `/api/agent/processes`, `/api/agent/chat`, and `/api/agent/history/{conversation_id}`. No billing routes are exposed during the product-quality pass; do not wire checkout or entitlement gates until the tools are consistently useful.

Set these optional backend environment variables to enable production integrations:
- `OPENAI_API_KEY`: when present, `/api/agent/chat` calls OpenAI's Responses API; without it the service returns a deterministic development response.
- `OPENAI_AGENT_MODEL`: model override for the agent, defaulting to `gpt-4.1-mini`.
- Future entitlement checks should be added after the core workflows are production-ready. Keep secrets server-side only.

## Lab Pass / monetization readiness

Ballzatram is being prepared as an early-access lab membership called **Ballzatram Lab Pass**. Checkout is not live yet, and this repo still avoids billing routes, provider secrets, hard paywalls, and real entitlement gates.

The current monetizable promise is membership/support around early access, the experimental archive, votes, suggestions, favorites, monthly drops, behind-the-scenes notes, and helping decide what gets polished next.

Not currently promised:
- Professional investment advice.
- Live trading.
- Verified land acquisition.
- Guaranteed AI Edit uptime.
- Unlimited rendering.
- Durable paid workspaces.

Readiness docs:
- [`docs/MONETIZATION_READINESS.md`](docs/MONETIZATION_READINESS.md)
- [`docs/SCALE_TO_10K.md`](docs/SCALE_TO_10K.md)
- [`docs/PROPOSED_LAB_PASS_SCHEMA.md`](docs/PROPOSED_LAB_PASS_SCHEMA.md)

Validation command:

```bash
python scripts/validate_lab_readiness.py
```

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
