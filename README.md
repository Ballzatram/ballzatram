# MacroBoard

MacroBoard is an investor-grade macroeconomic and equity analysis platform with a modern chalkboard-style UI and a modular analytics backend.

## Stack
- Frontend: Next.js 14 + TypeScript + Tailwind
- Backend: FastAPI + pandas/numpy/scikit-learn/statsmodels
- Storage: SQLite prototype (schema-ready for Postgres migration)

## Repository Structure
- `frontend/` Next.js product UI and investor workflows.
- `backend/` FastAPI analytics engine and API endpoints.
- `demo_data/` sample data files for onboarding/demo.

## Implemented Workflows
- Single stock/ETF analysis vs selected macro variables.
- Portfolio scenario stress testing.
- Event study endpoint around macro releases.
- Model comparison endpoint (OLS/Ridge/ElasticNet/RF/PCA summary).
- Report generation endpoint (Markdown).
- UI pages for Dashboard, Stock, Portfolio, Scenario, Event Study, Model Compare, Model Classroom, Reports.

## Data Layer Design
- Public-source adapters planned for FRED, BLS, BEA, Treasury, SEC, World Bank.
- Caching + validation + normalization pipeline pattern implemented in backend service layer.
- CSV upload support is architecture-ready via API layer and persisted user datasets folder (to extend).

## API Keys and Data Sources
Public/no key (typical):
- FRED (some usage may still require registration key depending endpoint/policy)
- BLS public datasets (bulk files)
- BEA public datasets (key generally required for API)
- Treasury yield data (public)
- SEC EDGAR (public, rate-limited)
- World Bank indicators (public)

Likely key required:
- Premium market data APIs (Polygon, Alpha Vantage premium tiers, etc.)

## Run Locally
### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Testing
```bash
cd backend
pytest
```

## Productionization Roadmap (next steps)
1. Add SQLAlchemy models + Alembic migrations (SQLite -> Postgres).
2. Add background jobs (Celery/Redis or APScheduler) for refresh cadence.
3. Add auth (NextAuth/Auth.js + backend token verification).
4. Expand statistical modules (VAR/SARIMAX/DID/rolling windows with robust inference).
5. Add PDF export service and shareable signed report links.
6. Add full observability (OpenTelemetry + structured logging + alerting).
