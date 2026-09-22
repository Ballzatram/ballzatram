# Documentation

[Repository overview](../README.md) · [Live site](https://dgallemore.com/)

Start with the implementation guides below. This repository also keeps product plans and earlier audits; their presence does not mean their proposed features have shipped.

## Start here

| Goal | Guide |
| --- | --- |
| Understand the engineering and inspect representative code | [Engineering tour](ENGINEERING_TOUR.md) |
| Run the site, application, or tests | [Development](DEVELOPMENT.md) |
| Understand public-site hosting and domain configuration | [Deployment](../DEPLOYMENT.md) |
| Make a change or report a problem | [Contributing](../CONTRIBUTING.md) · [Security](../SECURITY.md) |

## AI integration

[Bring your own AI](bring-your-own-ai.md) explains the different integration paths. [Project configuration](ai-project-configuration.md) records which projects have context adapters and what remains to be decided.

The component guides are the operational references: [Osiris MCP tools](../osiris-tools/README.md) for deterministic tools inside compatible AI hosts, and [Osiris runtime](../osiris-runtime/README.md) for the separate in-page subscription pilot. Deployment, model access, host support, and live account acceptance are distinct checks.

## Product and domain guides

| Area | Reading path |
| --- | --- |
| Econ Arcade | [The Family Business](family-business.md), then the broader [game-theory platform blueprint](game-theory-platform.md) |
| Congressional Accountability | [Citizen workbench](observatory/WORKBENCH.md), [launch review](observatory/LAUNCH_REVIEW.md), [methodology](observatory/METHODOLOGY.md), and [editorial policy](observatory/EDITORIAL_POLICY.md) |
| Parcel | [Current workspace guide](../tools/parcel/README.md), [product brief](parcel/PRODUCT_BRIEF.md), and the proposed [backend production plan](parcel/BACKEND_PRODUCTION_PLAN.md) |
| Quant Library | [Analytics](quant-library-analytics.md), [data architecture](quant-library-data-architecture.md), and [methodology](quant-library-methodology.md) |
| Learning feed | [Phased delivery plan and Phase 1 implementation](osiris-feed-plan.md) |

The Reading Room and its feed are intentionally unlisted from the public homepage. Unlisted routes are not access-controlled private storage; do not publish confidential material there.

## Maintenance and historical context

[UI and code audit](UI_CODE_AUDIT.md), [Pages-first audit](pages-first-audit.md), and the [root tool audit](../TOOL_AUDIT.md) explain earlier cleanup decisions. Use the current code and workflows to resolve differences with an older audit.

[Monetization readiness](MONETIZATION_READINESS.md), [proposed Lab Pass schema](PROPOSED_LAB_PASS_SCHEMA.md), and [scaling plan](SCALE_TO_10K.md) preserve planning context. They are not evidence of an active paid product, production capacity, or deployed account system.

## Keeping this useful

When a capability or command changes, update the relevant component guide and the entry points above. Keep proposed behavior explicitly labeled. The [documentation validator](../scripts/validate_docs.py) checks the curated overview, contributor, security, and review documents for local link targets and Markdown heading anchors; it does not crawl every historical document or verify external websites.
