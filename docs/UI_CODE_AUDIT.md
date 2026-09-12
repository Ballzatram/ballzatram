# Windows 95 UI and code cleanup — September 12, 2026

## What changed

The public GitHub Pages site now uses a Windows 95 desktop: teal background, navy window title bars, beveled gray controls, original pixel-style SVG icons, desktop shortcuts, and a keyboard-accessible Start menu. Home, the program directory, and Econ Arcade are generated from `data/public-programs.json`. All program links remain available without JavaScript; search and category filters progressively enhance those pages.

Individual browser labs, games, the Observatory, and the portfolio share the desktop styling. The portfolio's printable resume retains its independent print layout. The encrypted travel application is preserved. Game rules, economic models, source snapshots, and saved-data keys are preserved.

The Next.js application has matching navigation and launchpad styling. It remains a separate, backend-dependent application; GitHub Pages does not host its server routes.

## Audit findings and fixes

| Finding | Fix |
| --- | --- |
| Multiple competing homepage styles and a perpetual cloud animation | Replaced the homepage and removed `mobile-home.css`, both cloud scripts, and the unused React SkyLayer. Shared styling is in `assets/win95/`. |
| Next.js public files had stale copies of game code and multi-megabyte images | Replaced copies with repository-relative symlinks to the canonical files. Updated the Docker build to preserve that directory layout. |
| Linked legal/community pages and their data/scripts were missing from the Pages artifact | Added an explicit public deployment manifest and validate links against the assembled artifact in CI and before deployment. |
| Browser MacroBoard links pointed at a missing directory | Added a compatibility redirect to Portfolio Lab. Removed misleading references to the unhosted `/land` route from the static Parcel page. |
| Program names, routes, and descriptions drifted between static menus | One catalog generates the three public entry points; the newly merged Observatory is included. |
| Portfolio symbols and benchmark text could become HTML in results | Escape user-supplied text in holdings, correlations, and warnings. Regression coverage includes HTML payloads. Duplicate CSV headers are rejected. |
| Blocked storage or corrupt drafts could stop Reports and AI from loading | Added guarded JSON storage access and draft shape validation. Session-only AI settings and unsaved portfolio runs are clearly reported. Existing storage keys are retained. |
| Portfolio reporting replaced `renderAll` at runtime | Integrated the source into the normal report-source registry and removed the monkey-patch script. |
| Reports could export old content after edits | Edits invalidate generated exports; regenerate before copying/downloading. |
| Empty scenario inputs became zero, and invalid inputs left old results visible | Reject blank shocks and clear stale outputs on validation errors. |
| AI guide accepted insecure URLs and sent empty context | Validate HTTPS/local-development URLs, reject empty context, add a request timeout, and reject redirects for bridge calls. No external AI requests are made by the test suite. |
| Arcade service worker deleted every other app cache on the origin | Scope deletion to the arcade cache prefix. Scope intercepted requests, cache only successful responses, and restrict HTML fallback to navigation requests. |
| Frontend dependency audit flagged Next.js and PostCSS | Upgrade to Next.js 15.5.24, migrate dynamic route params, pin PostCSS 8.5.28 with a transitive override, commit the lockfile, and use `npm ci`. The frontend audit reports zero known vulnerabilities at verification time. |

## Verification

Run from the repository root:

```sh
python scripts/build_desktop.py
python scripts/validate_public.py
python scripts/validate_lab_readiness.py
python scripts/validate_devin_portfolio.py
npm ci --prefix frontend
npm run test:static --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
npm audit --prefix frontend
npm ci --prefix tools/observatory
npm test --prefix tools/observatory
python -m unittest discover -s scripts/tests -p 'test_*.py'
cd backend && PYTHONPATH=. pytest -q
```

The new regression suite covers navigation without JavaScript; search and filtering; Start menu focus and dismissal; portfolio calculation and HTML injection; blocked storage; duplicate CSV headers; invalid scenario shocks; malformed report drafts; integrated portfolio reports; stale exports; AI URL/context validation; and preservation of unrelated service-worker caches.

The publication validator checks local HTML resource/link destinations and duplicate IDs in the actual Pages output. The encrypted trip app retains its existing dedicated deployment gate. CI also runs the existing Observatory tests and backend suite.

Verified in this pass: 13 new static regression tests, 23 Observatory tests, 6 importer tests, 67 backend tests, 26 published HTML pages, and 17 program destinations.

## Boundaries

- Automated DOM tests exercise behavior, not pixel rendering. The development preview was inaccessible to the remote browser. Post-deployment desktop-browser inspection covered the home, Start menu, search, Scenario Lab, Observatory, Portfolio Lab, and game controls; it identified nested legacy game colors, addressed in a focused contrast follow-up. Real-device mobile testing remains separate.
- Existing game scenes retain their illustrations beneath the shared desktop controls. The encrypted trip app and printable resume have separate presentation requirements.
- This is a UI, maintainability, dependency, and targeted input/storage audit, not a penetration test or certification of all financial/research models.
- Backend test warnings about Pydantic's `model_` namespace and Starlette/AnyIO deprecation are pre-existing and non-fatal. Backend dependency migration is not bundled with the frontend upgrade.
- Docker paths were updated for the shared source layout; a container image build requires Docker and is separate from the verified Next.js production build.

## Maintaining the site

Edit the public program catalog, then run `python scripts/build_desktop.py` and commit all three generated HTML pages. Edit shared controls/tokens in `assets/win95/theme.css`, desktop layout in `desktop.css`, and existing-app adapters in `apps.css`. Keep selectors scoped to the affected app rather than adding global `!important` overrides. Use `scripts/build_public.py` as the authoritative Pages file manifest. Preserve cache prefixes and storage keys when making later changes.
