PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bot_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mode TEXT NOT NULL CHECK (mode IN ('disabled', 'paper', 'backtest', 'live')),
  status TEXT NOT NULL CHECK (status IN ('starting', 'running', 'stopped', 'failed')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  stopped_at TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS weather_markets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_market_id TEXT NOT NULL UNIQUE,
  condition_id TEXT,
  slug TEXT,
  title TEXT NOT NULL,
  question TEXT,
  location TEXT,
  event_date TEXT,
  active INTEGER CHECK (active IN (0, 1) OR active IS NULL),
  closed INTEGER CHECK (closed IN (0, 1) OR closed IS NULL),
  enable_order_book INTEGER CHECK (enable_order_book IN (0, 1) OR enable_order_book IS NULL),
  clob_token_ids_json TEXT,
  outcomes_json TEXT,
  outcome_prices_json TEXT,
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS polymarket_market_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market_id TEXT NOT NULL,
  condition_id TEXT,
  slug TEXT,
  question TEXT,
  category TEXT,
  active INTEGER CHECK (active IN (0, 1) OR active IS NULL),
  closed INTEGER CHECK (closed IN (0, 1) OR closed IS NULL),
  enable_order_book INTEGER CHECK (enable_order_book IN (0, 1) OR enable_order_book IS NULL),
  accepting_orders INTEGER CHECK (accepting_orders IN (0, 1) OR accepting_orders IS NULL),
  end_date TEXT,
  volume_num REAL,
  liquidity_num REAL,
  best_bid REAL,
  best_ask REAL,
  last_trade_price REAL,
  clob_token_ids_json TEXT,
  outcomes_json TEXT,
  outcome_prices_json TEXT,
  is_weather_like INTEGER NOT NULL DEFAULT 0 CHECK (is_weather_like IN (0, 1)),
  raw_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS paper_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market_id INTEGER NOT NULL REFERENCES weather_markets(id) ON DELETE CASCADE,
  run_id INTEGER REFERENCES bot_runs(id) ON DELETE SET NULL,
  side TEXT NOT NULL CHECK (side IN ('yes', 'no', 'skip')),
  action TEXT NOT NULL DEFAULT 'NO_TRADE' CHECK (action IN ('NO_TRADE', 'PAPER_TRADE')),
  confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
  estimated_probability REAL CHECK (estimated_probability >= 0 AND estimated_probability <= 1 OR estimated_probability IS NULL),
  market_probability REAL CHECK (market_probability >= 0 AND market_probability <= 1 OR market_probability IS NULL),
  edge REAL,
  stake_cents INTEGER NOT NULL DEFAULT 0 CHECK (stake_cents >= 0),
  rationale TEXT NOT NULL,
  raw_json TEXT,
  simulated_price_cents INTEGER CHECK (simulated_price_cents >= 0 AND simulated_price_cents <= 100),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS paper_trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_id INTEGER NOT NULL REFERENCES paper_decisions(id) ON DELETE CASCADE,
  market_id INTEGER NOT NULL REFERENCES weather_markets(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('yes', 'no')),
  stake_cents INTEGER NOT NULL CHECK (stake_cents > 0),
  market_probability REAL NOT NULL CHECK (market_probability >= 0 AND market_probability <= 1),
  estimated_probability REAL NOT NULL CHECK (estimated_probability >= 0 AND estimated_probability <= 1),
  edge REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled', 'cancelled')),
  opened_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS weather_snapshot_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_market_id TEXT NOT NULL,
  source TEXT,
  fetched_at TEXT NOT NULL,
  target_time TEXT,
  temperature_c REAL,
  precipitation_probability_percent REAL,
  precipitation_mm REAL,
  wind_speed_kph REAL,
  status TEXT NOT NULL CHECK (status IN ('resolved','skipped','failed')),
  reasons_json TEXT,
  raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_weather_markets_event_date ON weather_markets(event_date);
CREATE INDEX IF NOT EXISTS idx_weather_snapshot_audit_market ON weather_snapshot_audit(external_market_id);
CREATE INDEX IF NOT EXISTS idx_weather_markets_slug ON weather_markets(slug);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_market_id ON polymarket_market_snapshots(market_id);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_fetched_at ON polymarket_market_snapshots(fetched_at);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_weather ON polymarket_market_snapshots(is_weather_like);
CREATE INDEX IF NOT EXISTS idx_paper_decisions_market_id ON paper_decisions(market_id);
CREATE INDEX IF NOT EXISTS idx_paper_trades_market_id ON paper_trades(market_id);
CREATE INDEX IF NOT EXISTS idx_paper_trades_status ON paper_trades(status);
