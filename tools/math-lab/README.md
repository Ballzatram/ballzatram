# Math Fieldbook

Fourteen browser experiments teach the mathematics of machine learning through predictions, controls, animated charts, and short worked examples. The course starts at [the fieldbook](./index.html). Each lab has its own URL fragment, such as `#calibration`. The curriculum, experiment renderers, chart primitives, and synthetic mathematical fixtures are separate ES modules. It has no build step, external assets, accounts, analytics, or model calls.

Serve the repository using the [public-site instructions](../../docs/DEVELOPMENT.md). The static tool targets modern browsers with native ES modules, SVG and ResizeObserver. The responsive layout starts at 320 CSS pixels. All controls support keyboard use. Playback starts on request, offers pause and single-step, and slows when reduced motion is enabled. Settings persist across lessons within the current page session.

The repeated-sampling demonstrations use a seeded 32-bit generator. Reset restores the starting batch and “New batch” changes the seed. Calibration uses five constructed groups with equal size and known event counts. The nearest-neighbor example has fixed disjoint sets of synthetic labels for fitting and validation. The small examples teach procedures and are unsuitable for measuring production model performance.

Run `node --test scripts/math-lab.test.mjs` for numerical regression checks, then `python scripts/validate_public.py` to rebuild and verify the public artifact. The exercises use only Python’s standard library.
