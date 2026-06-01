# Quant Library static tool

This folder contains the static predecessor for Quant Library. It is a dependency-free entry point so Ballzatram can open the markets desk from a plain site host without requiring the local Next.js development server.

- `index.html` defines the responsive Quant Library shell, process flow, upload controls, diagnostics panels, learning database, chart, and tables.
- `style.css` contains the standalone visual system with desktop two-column layouts, horizontal tablet navigation, touch-sized controls, scrollable tables, and single-column mobile breakpoints.
- `script.js` loads `demo_data/macro_timeseries.csv`, falls back to embedded demo rows when file fetching is unavailable, accepts user portfolio CSV files, computes portfolio diagnostics, attempts Yahoo-style public chart API price history pulls, and refreshes selected FRED series using the configured API key.

## Portfolio CSV format

Upload a CSV with one row per holding. Supported columns are flexible:

```csv
ticker,weight
AAPL,0.22
MSFT,0.20
```

You can also use `symbol` instead of `ticker`, or provide `shares` with `price` / `market_price` when weights are not available. Weights can be decimals (`0.25`) or percentages (`25`).

## Data behavior

- Portfolio upload and demo analytics work entirely in-browser.
- Market prices are requested from the free Yahoo chart endpoint from the browser; if the host or browser blocks the request, Quant Library keeps deterministic demo curves and labels the status.
- FRED requests use the built-in API key and update the latest macro observation for CPI, fed funds, unemployment, and high-yield credit spreads when the request succeeds.

The backend and Next.js app remain available for local/API-backed development outside this static launch path.
