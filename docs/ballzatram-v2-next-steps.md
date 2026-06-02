# Ballzatram v2 Production Readiness Notes

Date: June 2, 2026

## What Was Built

Ballzatram v2 now has a connected product shell around the current ecosystem:

- Ballzatram Daily newspaper front page at `/` and `/daily`.
- Markets department at `/markets`, with Quant Library at `/quant-library`.
- Backwards-compatible `/macro-board` redirect to Quant Library.
- Bettor's Corner at `/bettors-corner`, with `/betting` redirect compatibility.
- Land department at `/land`, preserving the static Parcel prototype.
- Laboratory, Culture, Arcade, Stoney, generated story previews, and seeded story detail pages.
- Bullshit Simulator prototype at `/arcade/bullshit-simulator`, with `/bullshit-simulator` redirect compatibility.

This production-readiness pass did not add major new features. It tightened metadata, missing states, route safety, provider wording, and deployment documentation.

## Production-Readiness Changes

- Added a shared Next metadata helper with canonical URLs, Open Graph tags, Twitter summary tags, and noindex support.
- Added metadata/canonical coverage for Daily, Markets, Quant Library, Bettor's Corner, Land, Laboratory, Culture, Arcade, Stoney, Bullshit Simulator, compatibility redirects, internal previews, and story detail pages.
- Added a global missing-route page with recovery links.
- Added a missing-story page for `/stories/[slug]`.
- Marked internal preview routes as noindex.
- Removed nested `<main>` landmarks from the shared department shell, Stoney page, and Bullshit Simulator route.
- Updated static MacroBoard predecessor copy so it no longer implies browser-delivered or built-in FRED keys.
- Expanded `.env.example` with public vs server-side variable guidance.

## Route Audit

Production-server HTTP smoke results on port `3028`:

- `/`: `200`
- `/quant-library`: `200`
- `/macro-board`: `307` expected redirect
- `/bettors-corner`: `200`
- `/daily`: `200`
- `/stories/demo-market-breadth-check`: `200`
- `/stories/not-a-real-story`: `404` expected missing-story page
- `/stoney-baologna`: `200`
- `/bullshit-simulator`: `307` expected redirect
- `/arcade/bullshit-simulator`: `200`
- `/arcade`: `200`
- `/culture`: `200`
- `/laboratory`: `200`
- `/definitely-missing`: `404` expected global missing-route page

Metadata spot checks:

- `/` renders canonical `https://ballzatram.com`.
- `/quant-library` renders canonical `https://ballzatram.com/quant-library`.
- `/bettors-corner` renders canonical `https://ballzatram.com/bettors-corner`.
- `/stories/demo-market-breadth-check` renders story canonical and Open Graph title.
- `/internal/generated-stories` renders `noindex, nofollow`.

## Validation Results

- `npm.cmd run lint` in `frontend/`: passed. This is the configured TypeScript typecheck.
- `npm.cmd run build` in `frontend/`: first attempt failed while Next cleaned stale `.next` output with a Windows/OneDrive `readlink` error. After guarded removal of `frontend/.next`, the build passed.
- `python -m pip install -r requirements.txt` in `backend/`: completed so backend tests could run against the declared dependency set.
- `python -m unittest discover -s tests -q` in `backend/`: passed, 6 unittest-discovered tests. Existing Pydantic protected-namespace warning remains.
- `python -m pytest -q` in `backend/`: passed, 17 tests. Existing warnings remain for Pydantic `model_assumptions` namespace and `datetime.utcnow()` deprecation in `macro_board.py`.
- Formatting: no formatter script is configured in `frontend/package.json` or the root.

## Env Vars Needed

Server-side only:

- `FRED_API_KEY`: enables live FRED-backed rates data in the backend provider.
- `OPENAI_API_KEY`: enables live OpenAI-backed agent responses. Deterministic fallbacks run without it.
- `NEWS_PROVIDER_API_KEY`: reserved for future server-side news providers.
- `MARKET_DATA_API_KEY`: reserved for future server-side market providers.

Public/frontend:

- `NEXT_PUBLIC_API_BASE`: frontend API base. Use `/api` for same-origin production behind Caddy.
- `NEXT_PUBLIC_SITE_URL`: optional canonical/Open Graph site URL. Defaults to `https://ballzatram.com` when unset.

Do not ship private provider keys in browser-delivered static tools.

## Deployment Notes

- The frontend still has no committed lockfile, so Docker builds use `npm install` instead of reproducible `npm ci`.
- Existing webpack cache snapshot warnings appear during `next build`; they are non-fatal in this pass.
- Local Windows/OneDrive builds can leave `.next` in a state that Next cannot clean. Guarded removal of `frontend/.next` fixed the rerun.
- Internal preview routes are now noindex but still publicly routable if deployed. Consider gating them if production exposure becomes a concern.
- Finance and betting surfaces keep demo/freshness labels and caveats visible. Quant Library remains research/education-oriented; Bettor's Corner avoids picks, locks, and guaranteed-outcome language.

## Known Issues

- Backend tests pass after installing dependencies, but there are existing warnings:
  - Pydantic protected namespace warning for `model_assumptions`.
  - `datetime.utcnow()` deprecation warning in `backend/app/services/macro_board.py`.
- Penitent routes intentionally bypass the shared site shell; this preserves the immersive experience but hides the global nav.
- Story publication is still deterministic/demo-only. There is no approval workflow, persistence layer, or automated AI publishing queue.
- Some department pages remain orientation shells around existing tools rather than fully built products.

## Recommended Next Phases

1. Add CI route smoke tests for the public route map and compatibility redirects.
2. Commit a frontend lockfile and switch production Docker builds to `npm ci`.
3. Decide whether internal preview routes need auth, deployment gating, or environment-based hiding.
4. Address backend warnings: Pydantic namespace configuration and timezone-aware datetimes.
5. Add screenshot or Playwright-based accessibility smoke tests for Daily, Quant Library, Bettor's Corner, Arcade, and Stoney.
6. Define a publication workflow for generated story drafts: draft, review, approved, published, archived.
7. Decide whether Penitent should expose a small return link to Culture without losing its standalone presentation.
