# Contributing

[Overview](README.md) · [Development](docs/DEVELOPMENT.md) · [Security](SECURITY.md)

Ballzatram is an independent, evolving lab. Changes should make a real workflow clearer or more reliable while keeping experiments and limitations honestly labeled.

## Make a focused change

Start from `master` on a descriptive branch. Read the relevant component guide in the [documentation index](docs/README.md), keep the diff focused, and open a pull request that explains the problem, the implementation, and how it was checked. Preserve existing routes, saves, source attribution, and independent project themes unless changing them is part of the agreed task.

There is no root npm workspace. Follow the [development guide](docs/DEVELOPMENT.md) for the component you are changing. Edit source files, not generated `_site/` output; regenerate the homepage through `scripts/build_frontier.py` when its catalog changes.

## Review expectations

- **Correctness:** add regression coverage for the behavior being changed. Share exact commands and outcomes, including checks you could not run. Do not relabel TypeScript checking as a full lint suite or mocked provider tests as live acceptance.
- **Data and AI boundaries:** use synthetic or public, attributed fixtures. Do not commit credentials, private conversations, employer/client material, or personal records. Treat imported text and model output as untrusted data, not instructions or authority to perform actions.
- **User experience:** preserve useful disconnected/error states, keyboard access, mobile layouts, and visible storage or consent failures. Do not silently change unrelated game state or spend model usage on opening a page.
- **Documentation:** distinguish implemented, deployed, and user-accepted behavior. Update the nearest component guide and the overview when capability or setup changes. Keep product proposals labeled as proposals.

Run `python scripts/validate_docs.py` when editing the curated overview, review, or contribution documents. This checks local links and Markdown anchors, not external availability. Relevant application tests remain necessary for behavior changes.

## AI-assisted development

AI coding tools are part of this project's workflow. Generated code and documentation receive the same review requirements as other changes: understand the diff, verify claims against source, test behavior, and disclose remaining limits. Maintainers remain responsible for architectural choices, acceptance, security boundaries, and what is merged. Do not send private data or credentials to a model to reproduce a bug.

## Reports and licensing

Use the issue templates for reproducible bugs or scoped feature proposals. Follow [SECURITY.md](SECURITY.md) rather than posting vulnerability details publicly.

A repository-wide software license has not been selected. This contribution guide does not add a license or change reuse terms. Preserve existing third-party license and attribution files, including the [frontier font notice](assets/frontier/FONT-LICENSE.txt), and discuss licensing questions with the maintainer before contributing third-party material.
