# weather-trader

Initial TypeScript backend package for a local Weather Prop Bot service. This package is intentionally limited to configuration, logging, mode definitions, public market discovery, SQLite persistence, and local API endpoints.

It does **not** implement live trading, browser-side credential handling, exchange order submission, private-key usage, or market account integrations.

## What is included

- TypeScript package scaffold with strict compiler settings.
- Local `.env` loading without adding runtime dependencies.
- Structured JSON logger.
- Bot mode definitions for `disabled` and `paper` only.
- Public Polymarket Gamma market discovery for active market snapshots.
- Weather-like market filtering based on public market/event/tag text.
- SQLite persistence using Node's built-in `node:sqlite` module.
- Optional public CLOB orderbook client wrapper for token-level book reads; it is not used for trading.
- Weather data adapters for NWS/api.weather.gov and Open-Meteo that normalize forecasts/observations into `WeatherSnapshot` objects.
- Source registry and consensus utilities for U.S.-first NWS selection, Open-Meteo fallback/global coverage, stale-data checks, and confidence haircuts on source disagreement.
- Paper-mode strategy loop with market parsing, settlement-rule checks, probability/edge models, risk sizing, decisions, paper broker persistence, and portfolio exposure helpers.
- Locked live-trading skeleton with strict env validation, kill-switch checks, live broker interface, and limit-order-only execution guardrails.
- Local HTTP API server with:
  - `GET /api/weather-bot/status`
  - `POST /api/weather-bot/run-once`
- Build and placeholder test scripts.

## Safety boundaries

- `WEATHER_TRADER_MODE=live` throws unless `LIVE_TRADING_ENABLED=true`, all required CLOB env vars are present, and `LIVE_TRADING_KILL_SWITCH=false`.
- The default status payload reports `liveTradingEnabled: false`; paper/backtest modes cannot place live orders.
- The package uses public market-data endpoints only:
  - Gamma API for market discovery.
  - Public CLOB `/book` wrapper for orderbook reads if future code calls it.
- Weather data uses NWS and Open-Meteo only; wethr.net is intentionally not implemented.
- No private keys, API keys, wallet secrets, or trading credentials belong in browser files.
- The public website remains a paper-trading worksheet surface; this package is backend-only.

## Requirements

- Node.js 24 or newer. The SQLite persistence layer uses the built-in `node:sqlite` module.

## Setup

```bash
cd weather-trader
npm install
cp .env.example .env
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `WEATHER_TRADER_HOST` | `127.0.0.1` | Local API bind host. |
| `WEATHER_TRADER_PORT` | `8787` | Local API port. |
| `WEATHER_TRADER_MODE` | `paper` | Runtime mode. Supported values are `disabled`, `paper`, `backtest`, and locked `live`. |
| `WEATHER_TRADER_DB_PATH` | `./data/weather-trader.sqlite` | Local SQLite database path for market snapshots and future paper-mode state. |
| `WEATHER_TRADER_LOG_LEVEL` | `info` | Logger threshold: `debug`, `info`, `warn`, or `error`. |
| `POLYMARKET_GAMMA_BASE_URL` | `https://gamma-api.polymarket.com` | Public Polymarket market/event discovery API base URL. |
| `POLYMARKET_CLOB_BASE_URL` | `https://clob.polymarket.com` | Public Polymarket orderbook API base URL. |
| `WEATHER_TRADER_DISCOVERY_LIMIT` | `100` | Number of currently open Gamma markets to fetch during one discovery pass. |
| `WEATHER_TRADER_REQUEST_TIMEOUT_MS` | `10000` | Timeout for public market-data and weather-data HTTP requests. |
| `NWS_BASE_URL` | `https://api.weather.gov` | Public NWS API base URL for U.S. forecasts and observations. |
| `NWS_USER_AGENT` | `weather-trader/0.1.0 (...)` | Required identifying User-Agent sent with every NWS request. Replace the example contact before shared deployments. |
| `OPEN_METEO_BASE_URL` | `https://api.open-meteo.com` | Open-Meteo forecast API base URL for fallback/global weather data. |
| `LIVE_TRADING_ENABLED` | `false` | Must be `true` with `WEATHER_TRADER_MODE=live` before the locked live skeleton can initialize. |
| `LIVE_TRADING_KILL_SWITCH` | `true` | Must be explicitly set to `false` before live mode can initialize. |
| `POLYMARKET_CLOB_API_KEY` / `POLYMARKET_CLOB_API_SECRET` / `POLYMARKET_CLOB_API_PASSPHRASE` | empty | Required only for live mode. Never expose these to browser files. |
| `POLYMARKET_FUNDER_ADDRESS` / `POLYMARKET_SIGNATURE_TYPE` | empty | Required only for live mode account metadata. |

## Scripts

```bash
npm run dev
npm run build
npm test
```

`npm run dev` builds the TypeScript sources and starts the local API server with Node:

```text
http://127.0.0.1:8787/api/weather-bot/status
```

## Local API

### `GET /api/weather-bot/status`

Returns local service configuration and safety state, including `liveTradingEnabled: false`.

### `POST /api/weather-bot/run-once`

Runs one public market-discovery pass:

1. Fetches open markets from the public Polymarket Gamma `/markets` endpoint.
2. Filters out closed/inactive markets.
3. Stores active market snapshots in SQLite.
4. Stores matching weather-like markets in the `weather_markets` table and logs them.
5. Produces a `NO_TRADE` or `PAPER_TRADE` decision for each weather-like market.
6. Saves every decision to SQLite and saves approved paper trades to `paper_trades`.
7. Returns counts plus clean error details if the public API, SQLite write, or paper broker write fails.

Example response:

```json
{
  "ok": true,
  "fetchedMarkets": 100,
  "activeMarkets": 100,
  "weatherMarkets": 2,
  "storedSnapshots": 100,
  "storedWeatherMarkets": 2,
  "weatherLikeMarkets": [
    {
      "id": "12345",
      "question": "Will it rain in New York City tomorrow?",
      "slug": "rain-nyc-tomorrow",
      "category": "Weather",
      "endDate": "2026-05-15T00:00:00Z",
      "clobTokenIds": ["...", "..."],
      "matchedKeywords": ["rain"]
    }
  ],
  "decisions": [
    {
      "action": "NO_TRADE",
      "marketId": "12345",
      "side": "skip",
      "reason": "Confidence 35% is below minimum 40%."
    }
  ],
  "paperTrades": 0,
  "noTrades": 1,
  "errors": []
}
```

## Strategy and paper trading

The strategy layer is paper-only and lives under `src/strategy/`:

- `marketParser.ts` extracts weather condition, threshold, location text, and target date text from market questions.
- `settlementRules.ts` blocks ambiguous markets that cannot be evaluated safely.
- `probabilityModel.ts` creates a simple normalized weather probability estimate from available snapshots or a neutral low-confidence prior.
- `edgeModel.ts` compares estimated probability against public market prices.
- `sizing.ts` applies minimum edge/confidence and exposure limits before any paper trade is approved.
- `decisionEngine.ts` emits `NO_TRADE` or `PAPER_TRADE`, and every decision includes a human-readable reason.
- `paperBroker.ts` records decisions and approved paper trades to SQLite only.
- `portfolio.ts` contains paper portfolio/exposure helpers.

No live trading routes, private keys, signed orders, or exchange account integrations are included in paper mode.

## Locked live-trading skeleton

The live skeleton is intentionally difficult to start:

1. `WEATHER_TRADER_MODE` must be `live`.
2. `LIVE_TRADING_ENABLED` must be `true`.
3. `LIVE_TRADING_KILL_SWITCH` must be `false`.
4. CLOB API credentials, funder address, and signature type must be configured in the local backend environment.
5. The execution layer only accepts validated limit-order intents (`GTC`/`GTD`) backed by an approved strategy decision.

The package does not sign orders in browser code, does not add browser credential fields, and does not enable live trading by default.

## Weather data adapters

The weather adapter layer lives under `src/weather/`:

- `types.ts` defines normalized `WeatherSnapshot` objects plus stale-data helpers.
- `nwsClient.ts` reads NWS `/points`, hourly forecast, and latest observation endpoints with a configured User-Agent.
- `openMeteoClient.ts` reads Open-Meteo forecast/current data as the fallback/global source.
- `sourceRegistry.ts` prefers NWS for likely U.S. locations and always keeps Open-Meteo available globally.
- `sourceConsensus.ts` detects stale snapshots and applies confidence haircuts when sources disagree on temperature, precipitation probability, or wind speed.

No wethr.net adapter is included.

## SQLite schema

The canonical schema lives in both forms for convenience:

- `src/db/schema.sql` for direct SQLite inspection/application.
- `src/db/schema.ts` for API/runtime application by the local server.

The initial schema stores local bot run metadata, public Polymarket market snapshots, filtered weather-like markets, paper-only decision records, and paper trades. It does not contain live order tables.

## Next backend steps

1. Add migrations once schema changes need backward compatibility beyond this initial package.
2. Wire weather snapshots into paper-mode market analysis and settlement review flows.
3. Add paper backtesting and settlement review flows before any live-trading design is considered.
