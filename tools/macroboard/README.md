# MacroBoard static tool

This folder contains the homepage-launched MacroBoard experience. It is a static, dependency-free entry point so Ballzatram can open the dashboard from a plain site host without requiring the local Next.js development server.

- `index.html` defines the MacroBoard shell and data regions.
- `style.css` contains the standalone visual system for the tool.
- `script.js` loads `demo_data/macro_timeseries.csv`, falls back to embedded demo rows when file fetching is unavailable, and renders workflow tabs, metrics, charts, insights, and the recent-observations table.

The backend and Next.js app remain available for local/API-backed development outside this static launch path.
