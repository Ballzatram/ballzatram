# Ballzatram v2 Cohesion Next Steps

Date: June 2, 2026

## Cohesion Pass Summary

This pass connected the current Ballzatram v2 pieces into a clearer product map without rebuilding the core tools. The main navigation now presents the site as:

- Daily
- Markets
- Betting
- Land
- Laboratory
- Culture
- Arcade
- Stoney

The homepage now explains Ballzatram as a self-writing newspaper powered by AI tools, analysis engines, creative worlds, and playable experiments. The section map, tools area, playable-worlds area, Stoney card, and footer links now point readers back into the appropriate route family.

## Current Route Map

- `/` and `/daily`: Ballzatram Daily newspaper shell.
- `/markets`: Markets department landing page.
- `/quant-library`: Quant Library workbench.
- `/macro-board`: compatibility redirect for the former Macro Board route.
- `/bettors-corner`: Bettor's Corner workbench.
- `/betting`: compatibility redirect to Bettor's Corner.
- `/land`: Land and infrastructure department landing page for Parcel.
- `/tools/parcel/index.html`: existing static Parcel prototype.
- `/laboratory`: Laboratory department landing page.
- `/ai-edit-factory/`: existing static AI Edit Factory prototype.
- `/culture`: Culture department landing page for Penitent II and creative artifacts.
- `/penitent`: existing Penitent II route family.
- `/arcade`: Arcade department landing page.
- `/arcade/bullshit-simulator`: Bullshit Simulator text-adventure prototype.
- `/bullshit-simulator`: compatibility redirect to the arcade route.
- `/econ-arcade`: existing Econ Arcade hub.
- `/stoney-baologna`: Stoney Baologna character page.
- `/internal/generated-stories`: deterministic story-engine preview.
- `/stories/[slug]`: seed story detail pages.

## Product Connections Added

- Quant Library story and tool previews now keep a visible path back to `/quant-library`.
- Bettor's Corner story and tool previews keep a visible path back to `/bettors-corner`.
- Stoney cards point to `/stoney-baologna`.
- Arcade and Stoney routes point readers toward Bullshit Simulator.
- Culture has a clear home for Penitent II.
- Parcel now has a department landing page at `/land` while preserving the existing static Parcel prototype.
- Generated-story previews now render "Back to the producing tool" links.

## Remaining Issues

- The in-app browser control tool was not available in this session, so manual route inspection used production-server HTTP smoke checks rather than screenshots.
- The backend full unittest discovery still fails in this local runtime because `fastapi` and `scipy` are not installed. This is an environment/dependency issue, not a failure introduced by this cohesion pass.
- Penitent routes still bypass the shared site shell. That preserves the existing immersive route identity, but it also means the global nav is not visible there.
- Some section pages are intentionally department shells, not full products yet. Land, Culture, Laboratory, Arcade, and Stoney are currently used as orientation layers around existing tools/prototypes.
- The homepage edition date is still static demo content. A future Daily phase should decide whether dates come from build time, publication metadata, or an editorial config.
- Story publication is still deterministic/demo-only. No automated AI rewrite, approval workflow, persistence layer, or production publishing queue has been added.

## Recommended Next Phases

1. Add a route health checklist to CI for the main section map and compatibility redirects.
2. Decide whether Penitent should keep bypassing the shared shell or expose a minimal "return to Culture" affordance.
3. Give each department landing page a more specific module rail once the core tools mature.
4. Add a lightweight publication state model for story drafts, review, and approved Daily placement.
5. Replace static homepage edition metadata with a simple edition config or generated date label.
6. Add visual regression or screenshot smoke tests for the Daily, Quant Library, Bettor's Corner, Arcade, and Stoney routes.
7. Revisit backend dependency setup so full test discovery can run locally and in CI with the same dependency set.

## Validation

- `npm.cmd run lint` in `frontend/`: passed.
- `npm.cmd run build` in `frontend/`: passed. The build emitted existing webpack cache snapshot warnings, then generated 40 app routes including `/land`, `/markets`, `/bettors-corner`, `/arcade/bullshit-simulator`, `/stoney-baologna`, `/internal/generated-stories`, and seeded story detail pages.
- `python -m unittest discover -s tests -p test_quant_library_foundation.py -q` in `backend/`: passed, 6 tests.
- `python -m unittest discover -s tests -q` in `backend/`: failed because the local Python runtime is missing `fastapi` and `scipy`.
- Local production server route smoke on port `3027`: passed for `/`, `/daily`, `/markets`, `/quant-library`, `/bettors-corner`, `/land`, `/laboratory`, `/culture`, `/arcade`, `/arcade/bullshit-simulator`, `/stoney-baologna`, `/internal/generated-stories`, and `/stories/demo-market-breadth-check`; `/betting` and `/bullshit-simulator` returned expected `307` redirects.
