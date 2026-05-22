# Ballzatram Tool Audit

Date: 2026-05-21

Goal: make Ballzatram feel like a cohesive platform of AI-guided tools, games, and workflows before monetization. No paywalls, checkout, Stripe, Paddle, Lemon Squeezy, or payment provider work is included in this pass.

## Shared Standard

Every tool should move through this product loop:

1. Intake: goal, scenario, data, URL, file, market, or parameter set.
2. Guidance: the tool explains what it is checking and what the user should trust.
3. Processing: loading, partial-success, fallback, and error states are visible.
4. Output: structured cards, dashboards, source lists, risks, assumptions, and next steps.
5. Follow-through: save/export placeholders are visible but not gated.

## Reusable Primitives

- `frontend/src/components/ai-tools/ToolPrimitives.tsx`: shared AI intake, result cards, source lists, risk cards, next actions, loading, empty, error, and export/save placeholders.
- `frontend/src/lib/toolOutput.ts`: standard frontend schema for renderable tool outputs.
- `backend/app/models/schemas.py`: backend schema for structured AI tool outputs.
- `backend/app/services/agent.py`: page-aware Ballzatram AI workflow guide using structured JSON output when `OPENAI_API_KEY` is present and deterministic structured fallback when it is not.
- `frontend/src/components/WorkflowPage.tsx`: shared guided intake and output-contract framing for the stock, portfolio, scenario, event-study, model-compare, classroom, and report pages.

## Tool Inventory

| Tool/Page | Route/Entrypoint | Status | Current integration | Changes in this pass |
| --- | --- | --- | --- | --- |
| Platform home | `/index.html` | Functional | Static launchpad | Reframed as a cohesive AI-guided platform, grouped tools by use case, added readiness labels and clearer workflow copy. |
| Parcel Intelligence | `/tools/parcel/index.html` | Functional with deterministic fallback | Browser search via Jina/DuckDuckGo fallback plus local seed inventory | Hardened result rendering against remote HTML injection, made source quality explicit, preserved thesis -> score -> shortlist -> deck workflow. |
| AI Edit Factory static shell | `/ai-edit-factory/index.html` | Functional when backend is available; graceful browser draft fallback | FastAPI render engine when running, browser-preview fallback when offline | Removed raw JSON plan display from the user flow and replaced it with structured quality notes. |
| AI Edit Factory React app | `ai-edit-factory/frontend/src/main.jsx` | Functional with backend | FastAPI studio API, edit-plan generation, render queue, feedback events | Removed raw technical JSON toggle from the editor and replaced it with a structured recipe quality badge. |
| Weather Desk | `/weather-bot.html` | Functional paper-mode worksheet; optional local backend | Local `weather-trader` backend on `127.0.0.1:8787`, offline calculator fallback | Refactored the paper alert output into a structured recommendation card with metrics, confidence, caveats, and next-step review list. |
| Weather Trader backend | `weather-trader/src/server.ts` | Functional local runner scaffold | Status and paper scan API only | Kept browser safety boundary intact; no live trading surface was added. |
| Static MacroBoard | `/tools/macroboard/index.html` | Functional static dashboard | Browser CSV upload, demo data, public market attempts | Removed a browser-delivered FRED key, added server-side-key fallback messaging, and escaped dynamic table/card output from user/uploaded data. |
| Next MacroBoard AI workflow | `/macro-board` | Functional AI workflow | FastAPI MacroBoard workspace APIs and OpenAI Responses API when configured | Previously upgraded to guided intake, structured evidence cards, risks, missing data, sources, save/export placeholders, and partial-success states. |
| Next stock analysis | `/stock` | Partially functional demo workflow | Shared WorkflowPage plus AI agent | Added shared guided intake and card-output contract; AI agent now has page-specific structured workflow guidance. |
| Next portfolio analysis | `/portfolio` | Partially functional demo workflow | Shared WorkflowPage plus AI agent | Added shared guided intake and card-output contract; AI agent now has page-specific structured workflow guidance. |
| Next scenario lab | `/scenario` | Partially functional demo workflow | Shared WorkflowPage plus AI agent | Added shared guided intake and card-output contract; AI agent now has page-specific structured workflow guidance. |
| Next event study | `/event-study` | Partially functional demo workflow | Shared WorkflowPage plus AI agent | Added shared guided intake and card-output contract; AI agent now has page-specific structured workflow guidance. |
| Next model comparison | `/model-compare` | Partially functional demo workflow | Shared WorkflowPage plus AI agent | Added shared guided intake and card-output contract; AI agent now has page-specific structured workflow guidance. |
| Next classroom | `/classroom` | Partially functional demo workflow | Shared WorkflowPage plus AI agent | Added shared guided intake and card-output contract; AI agent now has page-specific structured workflow guidance. |
| Next reports | `/reports` | Partially functional demo workflow | Shared WorkflowPage plus AI agent | Added shared guided intake, card-output contract, and save/export placeholders. |
| Next Econ Arcade hub | `/econ-arcade` | Functional launch hub | Static/Next module registry | Added backend AI agent process coverage for learning-path selection. |
| Supply & Demand Lab | `/econ-arcade/supply-demand-lab` | Functional deterministic simulation | Local simulation reducer | Added backend AI agent process coverage for experiment design and debrief support. |
| Invisible Hands Next systems sim | `/econ-arcade/invisible-hands`, `/invisible-hands` | Functional deterministic simulation | Local scenario engine and command UI | Added backend AI agent process coverage for policy reasoning and next-turn briefing. |
| Static Econ Arcade hub | `/econ-arcade/index.html` | Functional static launch hub | Static links to games/labs | Audited as playable launch surface; no fake AI added. |
| Strategy Studio | `/econ-arcade/platform.html` | Functional deterministic curriculum/demo suite | Static JS concept engines | Audited as simulation suite with debrief-style output. |
| Prisoner's Dilemma Lab | `/econ-arcade/prisoners-dilemma.html` | Functional deterministic AI-opponent game | Static JS opponent archetypes | Audited as guided game workflow with payoff matrix, trace, and debrief. |
| Static Invisible Hands market | `/econ-arcade/invisible-hands.html` | Functional deterministic game | Static JS market-clearing simulation | Audited as guided playable market process with controls, output metrics, and debrief. |
| Central Banker | `/games/central-bank.html` | Functional deterministic game | Static JS scenario/advisor engine | Audited as playable policy workflow with setup, advisor mode, dashboard, log, and ending debrief. |

## Ranking

| Rank | Tool | Closest to useful | Most monetizable | Easiest quick lift | Vision alignment | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Next MacroBoard AI workflow | High | High | Medium | High | Best current example of guided intake plus structured AI output. |
| 2 | AI Edit Factory | High | High | Medium | High | Strong paid-tool candidate once backend deployment is reliable and output cards stay polished. |
| 3 | Parcel Intelligence | Medium-high | High | High | High | Clear business workflow; needs stronger live data/source verification before charging. |
| 4 | Weather Desk | Medium | Medium-high | High | Medium-high | Useful if kept paper-mode/risk-first; live trading must remain out of hosted browser. |
| 5 | Supply & Demand / Econ Arcade games | High as learning tools | Medium | Medium | Medium-high | Strong platform character; monetization likely through curriculum, classrooms, or premium scenarios. |
| 6 | Static MacroBoard | Medium | Medium | Medium | Medium | Good public demo, but Next MacroBoard is the better production direction. |

## Known Gaps

- Static tools do not all call OpenAI directly. Where AI is not wired, the UI now avoids fake claims and presents deterministic guidance honestly.
- Production AI depends on server `OPENAI_API_KEY`; without it, structured deterministic fallback responses keep the UI renderable.
- DigitalOcean currently deploys the static root and AI Edit Factory stack. Live Next.js `/macro-board` and `/api/agent/*` need a dedicated production service/proxy before those AI workflows are reachable on the public domain.
- Parcel still needs a proper backend data pipeline and source verification service before it is ready for paid land-acquisition use.
- AI Edit Factory paid packaging should wait until DigitalOcean deploy reliability and render health checks are consistently green.
- Auth, subscriptions, and entitlement checks remain TODOs by design.
