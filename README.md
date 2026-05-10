# MacroBoard

Investor-grade macro + stock analysis foundation with a FastAPI backend, Next.js frontend, and a static homepage-launched MacroBoard tool.

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

## AI agent and paid access
MacroBoard includes a page-aware AI workflow agent in the Next.js layout. The backend exposes `/api/agent/processes`, `/api/agent/chat`, `/api/agent/history/{conversation_id}`, and Stripe billing endpoints under `/api/agent/billing/*`.

Set these optional backend environment variables to enable production integrations:
- `OPENAI_API_KEY`: when present, `/api/agent/chat` calls OpenAI's Responses API; without it the service returns a deterministic development response.
- `OPENAI_AGENT_MODEL`: model override for the agent, defaulting to `gpt-4.1-mini`.
- `AGENT_REQUIRE_PAYMENT`: set to `true` to require paid access before chat responses.
- `AGENT_DEV_ACCESS_CODE`: optional access token for local/operator testing when payment is required.
- `STRIPE_SECRET_KEY` and `STRIPE_AGENT_PRICE_ID`: required by `/api/agent/billing/checkout` to create a Stripe Checkout session.

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
