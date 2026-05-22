# Econ Arcade Game Theory Platform Blueprint

## 1. Product vision document

### Core philosophy
Econ Arcade turns game theory into a strategy laboratory rather than a lesson library. The primary unit of learning is a playable strategic system: users make consequential decisions, watch simulated agents respond, inspect payoffs and information, then receive a concise theoretical debrief after their intuition has already been activated.

### Learning model
1. **Encounter:** start from a high-stakes scenario with incomplete intuition.
2. **Act:** force a real strategic commitment before terminology appears.
3. **Simulate:** run deterministic or stochastic agent responses.
4. **Reveal:** expose payoffs, hidden types, beliefs, reputations, and counterfactuals.
5. **Formalize:** map the experience to utility, dominance, equilibrium, beliefs, or mechanism constraints.
6. **Replay:** vary agents, rules, information, and incentives to test generality.
7. **Master:** unlock higher-noise and multiplayer variants once core reasoning stabilizes.

### Strategic differentiation
- More experiential than textbook edtech: simulations come before exposition.
- More rigorous than casual strategy games: every mechanic maps to a formal concept.
- More replayable than quizzes: AI agents, stochastic shocks, and sandbox parameters create emergent variation.
- More useful for advanced learners: debriefs include equilibrium logic, counterfactual analysis, and model assumptions.

### Target users
University economics students, MBA students, quant-minded self-learners, economists, poker players, traders, policy analysts, strategists, and intellectually curious gamers who want intuition they can transfer to negotiation, markets, organizations, and competition.

### Retention mechanics
- Simulation streaks tied to mastery, not vanity points.
- Strategy journals and replay reviews.
- Agent dossiers that evolve as users encounter behaviors.
- Weekly scenario drops based on auctions, bargaining, signaling, and macro-policy shocks.
- Competitive arenas where rankings are separated by scenario family to avoid one generic ladder.

## 2. Complete system architecture

### Frontend architecture
- **Next.js app shell:** route groups for `/arcade`, `/worlds/[worldId]`, `/labs/[labId]`, `/arena`, `/replays/[id]`, and `/creator`.
- **TypeScript domain models:** shared simulation contracts for actions, observations, payoffs, beliefs, and debrief events.
- **Tailwind design system:** dense dashboard components, terminal-like market panels, elegant cards, and accessible controls.
- **Framer Motion:** animated payoff matrices, game-tree traversal, belief updates, auction clocks, and replay timelines.
- **State:** Zustand or Redux Toolkit for local simulation state; TanStack Query for server state; WebSocket store for live matches.

### Backend architecture
- **Node API gateway:** authentication, authorization, payments, content metadata, match orchestration, replay persistence, and AI tutor requests.
- **PostgreSQL + Prisma:** durable users, progress, scenarios, match history, analytics, and authoring metadata.
- **Redis:** matchmaking queues, short-lived match state, rate limits, AI job queues, and pub/sub fanout.
- **WebSocket service:** authoritative multiplayer synchronization using command events, sequence numbers, and server validation.
- **Python simulation services:** numerical engines for auctions, Cournot markets, repeated games, Bayesian updating, and mechanism design.

### AI systems
- **Opponent agents:** deterministic baselines, stochastic policies, reinforcement-learning-ready adapters, and LLM-authored scenario flavor separated from payoff logic.
- **Tutor layer:** generates hints, debriefs, and counterfactuals from structured match traces; it never invents payoff data.
- **Adaptive difficulty:** estimates mastery per concept and adjusts noise, opponent sophistication, information asymmetry, and action space size.
- **Scenario generation:** authors candidate scenarios that are validated by schemas, safety checks, and deterministic simulation tests before publication.

### Multiplayer systems
- Room lifecycle: create room, reserve seats, commit actions, reveal simultaneous moves, advance state, persist replay.
- Synchronization: clients send commands; the server owns state transitions and broadcasts signed snapshots.
- Anti-cheat: hidden actions are committed with hashes before reveal; incomplete-information types are server-only until debrief.
- Modes: asynchronous classroom challenges, live arenas, anonymous repeated games, and private cohort rooms.

### Simulation engine design
Each simulation implements:
- `ScenarioDefinition`: players, actions, information sets, parameters, UI hints.
- `SimulationState`: public state plus private per-player observations.
- `AgentPolicy`: chooses actions from observations and memory.
- `Transition`: validates commands and advances the game.
- `Outcome`: payoffs, welfare, beliefs, learning events, replay frames.
- `Debrief`: formal theory mapping, mistakes, counterfactuals, and next recommended experiment.

## 3. Game design document

| Curriculum area | Learning objective | Core mechanic | Gameplay loop | Strategic insight | Replayability | Multiplayer | AI behaviors |
|---|---|---|---|---|---|---|---|
| Preferences & Utility | Infer utility from choices | Build bundles and reveal indifference curves | Choose bundles, see utility surface, face budget shocks | Preferences imply tradeoffs | New goods, constraints, nonlinear utility | Compare inferred utility maps | Consistent, noisy, satiated agents |
| Risk & Lotteries | Understand expected utility vs expected value | Lottery simulator with risk profiles | Price lotteries, reveal outcomes, fit risk aversion | Concavity changes choices under risk | Heavy-tail lotteries, insurance, St. Petersburg variants | Prediction markets | Risk-neutral, risk-averse, prospect-style agents |
| Time Discounting | Feel present bias and backward induction | Multi-period investment choices | Allocate now/later, face commitment devices | Discount factors govern patience | Shocks, hyperbolic profiles | Bargaining over delayed surplus | Patient, impatient, commitment-seeking agents |
| Prisoner’s Dilemma | Learn dominance and repeated cooperation | Repeated simultaneous-move arena | Cooperate/defect, observe payoffs and reputation | One-shot Nash can conflict with efficient cooperation | AI personalities, discount factors, noise | Anonymous repeated games | Tit-for-tat, grim trigger, greedy, mixed |
| Cournot Competition | Understand quantity competition | Real-time production and price clearing | Set quantity, observe market price and rival output | Best responses converge or collude | Cost shocks, demand curves, capacity | Duopoly or oligopoly rooms | Profit maximizer, colluder, spoiler |
| Mixed Strategies | Learn indifference and randomization | Rock-paper-scissors and security games | Choose distributions, inspect exploitability | Mixing prevents predictable exploitation | Custom payoff matrices | Live simultaneous rounds | Pattern hunter, equilibrium mixer |
| Extensive Form | Practice backward induction | Game-tree command table | Traverse actions, rollback counterfactuals | Credible future actions shape present choices | Larger trees, imperfect information | Sequential matches | Sophisticated vs myopic agents |
| Bargaining | Understand ultimatum, alternating offers, coalitions | Offer construction and rejection risk | Propose splits, wait, incur discounting | Outside options and patience shift surplus | Deadlines, coalitions, veto players | Negotiation rooms | Tough, fair, deadline-sensitive agents |
| Auctions | Compare first-price, second-price, common-value settings | Live bidding engine | Receive value signal, bid, reveal winner/curse | Rules alter truthful bidding incentives | Formats, signal noise, bidder count | Real-time auctions | Shade bidder, truthful bidder, cursed bidder |
| Signaling | Distinguish pooling and separating equilibria | Applicant/employer education game | Choose costly signal, employer updates belief | Cost differences can make signals credible | Type distributions, signal costs | Two-sided roles | High type, low type, skeptical employer |
| Mechanism Design | Build incentive-compatible rules | Rule editor and agent simulator | Define allocation/payment, test agents | Good rules align private incentives with objectives | Constraints, welfare goals, adversarial agents | Classroom mechanism contests | Strategic misreporters and truthful benchmarks |

## 4. UX/UI design system

### Navigation philosophy
The top-level structure is a campaign map of worlds, but each world opens into serious lab dashboards. The interface should make users feel like analysts operating a strategic instrument panel, not children collecting badges.

### Layout system
- Landing pages: editorial hero, world cards, capability matrix.
- Labs: left-side decision rail, central simulation canvas, right-side debrief/metrics panel.
- Replay pages: timeline scrubber, state snapshots, counterfactual branch controls.
- Creator: schema-driven forms, payoff editors, agent test bench.

### Motion system
Motion clarifies causality: action commitments pulse, hidden information reveals as layers, game-tree nodes animate along paths, payoff cells glow only after decisions, and charts animate between states with no gratuitous bounce.

### Typography and visual tone
Use high-legibility sans-serif typography, tight letterspacing for headings, dark analytical surfaces, cyan/violet/gold accents, and Bloomberg-like density where advanced users need data. Avoid cartoon icons except where Ballzatram site branding needs a light touch.

### Information density
Progressive disclosure keeps first play approachable while allowing advanced panels for payoff derivations, expected values, beliefs, equilibrium comparisons, and model assumptions.

## 5. Database schema

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  displayName   String?
  createdAt     DateTime @default(now())
  progress      Progress[]
  matches       MatchParticipant[]
  strategyNotes StrategyNote[]
}

model World {
  id          String @id
  title       String
  description String
  order       Int
  labs        Lab[]
}

model Lab {
  id          String @id
  worldId     String
  title       String
  conceptTags String[]
  difficulty  Int
  config      Json
  world       World @relation(fields: [worldId], references: [id])
  scenarios   Scenario[]
}

model Scenario {
  id          String   @id @default(cuid())
  labId       String
  version     Int
  title       String
  definition  Json
  published   Boolean  @default(false)
  createdAt   DateTime @default(now())
  lab         Lab      @relation(fields: [labId], references: [id])
}

model AIAgent {
  id          String @id
  name        String
  archetype   String
  policy      Json
  debriefTone String
}

model Match {
  id          String   @id @default(cuid())
  scenarioId  String
  mode        String
  status      String
  seed        String
  replay      Json
  summary     Json?
  createdAt   DateTime @default(now())
  endedAt      DateTime?
  players     MatchParticipant[]
}

model MatchParticipant {
  id        String @id @default(cuid())
  matchId   String
  userId    String?
  agentId   String?
  role      String
  payoff    Float  @default(0)
  match     Match  @relation(fields: [matchId], references: [id])
  user      User?  @relation(fields: [userId], references: [id])
}

model Progress {
  id          String   @id @default(cuid())
  userId      String
  labId       String
  mastery     Float    @default(0)
  attempts    Int      @default(0)
  lastPlayed  DateTime @default(now())
  unlocked    Boolean  @default(false)
  user        User     @relation(fields: [userId], references: [id])
}

model AnalyticsEvent {
  id        String   @id @default(cuid())
  userId    String?
  matchId   String?
  eventType String
  payload   Json
  createdAt DateTime @default(now())
}

model StrategyNote {
  id        String   @id @default(cuid())
  userId    String
  labId     String
  matchId   String?
  body      String
  tags      String[]
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

## 6. Feature roadmap

### Phase 1 — MVP
- Econ Arcade menu and one polished single-player lab.
- Prisoner’s Dilemma, Central Banker, and MacroBoard as homepage-accessible modules.
- Local replay trace, deterministic AI policies, payoff visualization, and educational feedback.
- Content blueprint and reusable simulation contract.

### Phase 2 — Multiplayer and AI tutors
- WebSocket match rooms for simultaneous games.
- AI debrief service backed by structured traces.
- Replay viewer with counterfactual branches.
- User accounts, saved progress, and concept mastery tracking.

### Phase 3 — Sandbox creator
- Scenario authoring tools for payoff matrices, game trees, auction formats, and agent policies.
- User-generated scenarios with validation and moderation.
- Competitive ladders by scenario family.
- Classroom challenge links and cohort dashboards.

### Phase 4 — Research-grade and institutional tools
- Calibrated market and geopolitical simulations.
- Experimental-economics data export.
- LMS integrations, instructor controls, assignment grading, and institutional licensing.
- Python simulation services that can run larger Monte Carlo sweeps.

## 7. Monetization strategy

- Free tier: selected labs, local-only progress, and introductory debriefs.
- Premium individual: full campaign, advanced AI tutor, replay analysis, sandbox parameters, and scenario drops.
- Cohort courses: guided sessions, discussion prompts, instructor dashboards, and private multiplayer rooms.
- University licensing: SSO, LMS integration, analytics exports, assignments, and custom curriculum mapping.
- Enterprise strategy training: negotiation, auction, pricing, and mechanism-design simulations tailored to teams.
- Competitive arena: optional premium tournaments, private leagues, and advanced analytics packs.

## 8. Detailed implementation plan

### Repo structure
```text
econ-arcade/
  index.html
  style.css
  prisoners-dilemma.html
  prisoners-dilemma.css
  prisoners-dilemma.js
apps/web/
  src/app/(arcade)/arcade/page.tsx
  src/app/(arcade)/labs/[labId]/page.tsx
  src/components/simulations/
  src/lib/simulations/
services/api/
  src/routes/matches.ts
  src/routes/scenarios.ts
  src/routes/progress.ts
  src/realtime/matchServer.ts
services/sim-python/
  engines/repeated_games.py
  engines/auctions.py
  engines/cournot.py
packages/sim-core/
  types.ts
  prisonerDilemma.ts
  agents.ts
prisma/schema.prisma
```

### API routes
- `GET /api/worlds`: campaign metadata and unlock state.
- `GET /api/labs/:id`: lab config, current mastery, recommended scenario.
- `POST /api/matches`: create single-player or multiplayer match.
- `POST /api/matches/:id/actions`: submit command to authoritative state machine.
- `GET /api/matches/:id/replay`: fetch replay frames and debrief events.
- `POST /api/tutor/debrief`: create structured AI explanation from match trace.
- `POST /api/scenarios/validate`: validate author-created scenario definitions.

### State management
- Local lab state: reducer-based finite state machine.
- Server state: query cache keyed by user, world, lab, and match.
- Multiplayer: WebSocket command queue with optimistic UI only for local affordances; server snapshots remain authoritative.

### Multiplayer sync model
1. Client submits signed action command with local sequence number.
2. Server validates action against private observation and scenario rules.
3. Server stores command event, advances simulation when all required actions arrive, then broadcasts snapshot.
4. Clients reconcile UI from snapshot and append replay frame.
5. Hidden actions use commit-reveal for simultaneous moves.

### AI orchestration layer
- Agent policy chooses actions from structured observation.
- Tutor receives only validated traces and scenario definitions.
- Debrief generator returns JSON sections: `mistakes`, `equilibrium`, `counterfactuals`, `nextExperiment`.
- Human-readable explanations are rendered from JSON with citations to game events.

## 9. Sample implementation shipped in this repo

The curriculum-wide interactive suite is `econ-arcade/platform.html`, `econ-arcade/platform.css`, and `econ-arcade/platform.js`. It covers every requested world with a module map plus playable concept engines for utility, lotteries/risk, Cournot competition, auctions, signaling, bargaining, and mechanism design.

The standalone sample implementation is `econ-arcade/prisoners-dilemma.html`, `econ-arcade/prisoners-dilemma.css`, and `econ-arcade/prisoners-dilemma.js`. It includes a complete browser-playable module with a decision UI, payoff matrix, repeated-game simulation logic, AI opponent policies, live visualization, and educational feedback.

The backend foundation is `econ-arcade/backend/prisoners-dilemma-engine.mjs`, `econ-arcade/backend/game-theory-engine.mjs`, and `econ-arcade/backend/server.mjs`. It exposes dependency-free Node HTTP APIs for match creation, action submission, match retrieval, deterministic seeded AI decisions, scenario catalog retrieval, generic scenario simulation, summary metrics, and structured debrief JSON. The concrete Prisma schema is in `prisma/schema.prisma`; shared simulation interfaces are in `packages/sim-core/src/types.ts`. A production version should replace the in-memory match map with Redis/PostgreSQL persistence and put the same engines behind authoritative `/api/matches/:id/actions` and `/api/scenarios/:id/simulate` routes.

## 10. Future expansion ideas

- Financial market microstructure simulations with strategic order placement.
- Geopolitical bargaining and deterrence simulations with private information.
- Corporate pricing, entry deterrence, and platform competition simulators.
- Negotiation tournaments with replayable transcripts and surplus decomposition.
- Mechanism-design competitions where users submit rules against adversarial agents.
- AI-vs-human strategic ecosystems where learners train, test, and audit custom policies.
