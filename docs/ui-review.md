# Ballzatram Public UI Review

Date: 2026-05-22

## Scope

Reviewed the public visitor surfaces that are reachable from the Ballzatram frontend:

- `/`
- `/macro-board`
- `/econ-arcade`
- `/econ-arcade/supply-demand-lab`
- `/econ-arcade/invisible-hands`
- `/penitent?veil=reset`
- `/penitent/rhythm`
- `/legacy-econ-arcade/index.html`
- `/legacy-econ-arcade/platform.html`
- `/games/central-bank.html`
- `/docs/game-theory-platform.md`

Review methods:

- Code inspection of Next routes, shared layout, public assets, and linked static artifacts.
- Browser pass at desktop `1280x720` and mobile `390x844`.
- Horizontal overflow checks across the route list.
- Link checks for preserved static arcade/game artifacts.

## Fixed In This Pass

- Restored the homepage to the old blue-sky Ballzatram visual language while keeping the newer creative-universe positioning.
- Added a dedicated animated sky layer with distant, middle, and foreground clouds, subtle parallax, sun glow, horizon shimmer, and reduced-motion fallback.
- Scoped the blue/cloud shell to the homepage so Penitent, MacroBoard, and Econ Arcade keep their own route identities.
- Fixed the `/econ-arcade` route conflict by moving the preserved static arcade artifact to `/legacy-econ-arcade`.
- Replaced fragile public symlink paths for linked static arcade/game/docs artifacts with real `frontend/public` copies for the visitor-facing pages.
- Updated old static artifact links so they return to the Next homepage, Econ Arcade hub, MacroBoard route, and archive docs correctly.
- Fixed mobile horizontal overflow in the shared non-home header.
- Fixed Penitent stage overflow caused by combining shell padding with `vw` sizing.

## Priority Findings

### Must Fix

No route-blocking UI issues remained after this pass. The root route loads the Ballzatram homepage, MacroBoard stays on `/macro-board`, `/econ-arcade` loads the App Router hub, and the preserved static arcade/game artifacts are reachable.

### Should Fix

1. `Invisible Hands` needs a stronger document structure.
   - The route renders visually, but the browser audit did not find a page-level `h1`.
   - Add a semantic title, landmark structure, and screen-reader-friendly state summary.

2. MacroBoard still reads more like a dashboard than a world artifact.
   - The route is functional and correctly separated from `/`.
   - Future visual work should frame it as a workshop instrument rather than a general productivity interface.

3. Econ Arcade mixes strong game energy with older command-deck language.
   - It works as a hub, but the tone should gradually shift toward a mythological arcade inside Ballzatram's world.
   - Keep the useful learning structure, but wrap it in more character, sound, and artifact language.

4. The preserved static arcade pages now work, but their source of truth is duplicated.
   - Root static files remain preserved.
   - Visitor-facing copies now live under `frontend/public` so the Next app can serve them reliably.
   - Future work should either formalize this as a legacy artifact copy pipeline or migrate the pages into Next routes.

5. Penitent reveal is strong but can still teach the gesture more elegantly.
   - The diegetic hint is present and the page fits desktop/mobile after the overflow fix.
   - Future polish should add richer dust trails, sound hooks, and a clearer reveal-progress state without turning it into a heavy tutorial.

6. Rhythm combat is playable but needs a second pass for feel.
   - The core loop, health, combo, special meter, and win/lose state exist.
   - Next pass should focus on hit feedback, lane readability, audio timing, mobile controls, and stronger manuscript-style combat effects.

### Polish And Worldbuilding

- Add a small "world map" or artifact index that makes Home, Penitent, Econ Arcade, Music, Workshop, and Lore feel interconnected.
- Give each major route a stronger local identity: sky hangar, manuscript, arcade cabinet, workshop bench, music folio.
- Add audio affordances carefully: hover tones, manuscript scratch sounds, rhythm metronome, and optional ambient loops.
- Add route-level metadata and social preview assets for the major worlds.
- Decide whether static legacy pages should stay visibly preserved as external relics or be progressively rebuilt as first-class Next experiences.

## Validation Notes

Current pass verified:

- `/` renders the blue/cloud homepage and does not redirect to MacroBoard.
- `/macro-board` renders with its workflow navigation.
- `/econ-arcade` renders after removing the public route conflict.
- `/penitent` and `/penitent/rhythm` remain visually separate from the sky shell.
- `/legacy-econ-arcade/index.html`, `/legacy-econ-arcade/platform.html`, and `/games/central-bank.html` load as preserved static artifacts.
- `/docs/game-theory-platform.md` returns `200`.
- Desktop and mobile horizontal overflow checks pass for the primary Next routes after the layout fixes.
