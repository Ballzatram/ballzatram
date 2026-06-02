# Bullshit Simulator

## Concept

Bullshit Simulator is the playable Stoney Baologna universe. The player is Stoney: a wildly overconfident correspondent with opinions on everything, no meaningful credentials, and a powerful refusal to admit he is wrong.

The game is about navigating systems full of incomplete information, incentives, social pressure, misinformation, and absurdity. The player tries to convince the world they are right while moving through layers of bullshit that can obscure, distort, or occasionally reveal the truth.

This first implementation is a lightweight narrative prototype, not a full game engine.

## Core Loop

1. Enter a scene with incomplete information.
2. Read what Stoney thinks is happening.
3. Choose how Stoney responds: overclaim, investigate, bargain, deflect, or perform confidence.
4. Apply consequences to simple stats.
5. Move into the next layer of the situation.
6. End with a partial interpretation of what the system did to Stoney and what Stoney did to the system.

The loop should reward comedy, but the system underneath should keep track of whether Stoney is becoming more credible, more confident, or more buried in nonsense.

## Stoney's Role

Stoney is:

- the playable character
- the narrator of his own questionable broadcast
- a jester AI / resident correspondent
- occasionally insightful by accident
- never fully reliable

He should make the experience funny without becoming the source of truth for serious Ballzatram tools. In game contexts, his overconfidence is the point. In analysis contexts, Stoney remains a margin character and never replaces caveats.

## Siege Of South Gate Mall Premise

South Gate Mall is under siege.

- The Orange Julius has fallen.
- The food court is contested territory.
- Something is wrong near the old Sears.
- Stoney is reporting live despite having no credentials.

The mall is a compact satire system: rumor, scarcity, factions, decaying infrastructure, stale information, incentives, and weird institutional memory all collide under fluorescent lights.

## Possible Mechanics

Initial prototype stats:

- Confidence
- Credibility
- Bullshit Level
- Snack Inventory

Future mechanics can include:

- rumor spread
- faction trust
- source quality
- social pressure
- mall territory
- incentives and payoff maps
- contradiction tracking
- correction refusal
- Daily story generation from completed runs

The first prototype intentionally avoids save systems, backend services, auth, persistence, combat, inventory depth, and animation-heavy UI.

## Ballzatram Daily Integration

Bullshit Simulator should eventually create structured story outputs for Ballzatram Daily:

- "Stoney files a mall dispatch"
- "Food court faction memo"
- "Rumor audit from the old Sears"
- "What Stoney got wrong and doubled down on"

Completed runs could produce `ToolInsight`-style summaries later, but the first prototype does not publish, persist, or generate stories automatically.

## Connection To Tools And Stories

The prototype connects to Ballzatram's broader architecture in three ways:

- It uses the Stoney character framework for tone and safety boundaries.
- It lives in the Arcade as a playable narrative prototype.
- It can later feed structured story drafts into the story engine, similar to Quant Library and Bettor's Corner, but with fictional game-state output instead of real analysis.

Important boundary: fictional game output must not be confused with real reporting, market analysis, betting guidance, or operational advice.

## Implementation Roadmap

### Phase 1: Narrative Prototype

- Add typed scenes, choices, consequences, and state.
- Create the `/arcade/bullshit-simulator` route.
- Track a few stats client-side.
- No save system.
- No backend.
- No generated AI calls.

### Phase 2: Run Summary

- Add an end-of-run summary card.
- Show what drove the ending.
- Keep the output fictional and clearly labeled.

### Phase 3: Story Bridge

- Convert completed runs into structured fictional `ToolInsight` objects.
- Preview generated Stoney dispatches in Ballzatram Daily.
- Preserve caveats that the output is fictional/playable.

### Phase 4: Expanded South Gate Mall

- Add more locations: parking deck, cinema wing, security office, service corridors, old Sears interior.
- Add faction state and rumor pressure.
- Add more endings.

### Phase 5: Bullshit Simulator Proper

- Consider a lightweight game state engine.
- Add persistence only if the product needs it.
- Add richer UI only after the narrative loop works.

The game should stay small until the nonsense proves it has legs.
