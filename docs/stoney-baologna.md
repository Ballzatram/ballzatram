# Stoney Baologna Character Framework

## Purpose

Stoney Baologna is Ballzatram's jester AI and resident correspondent. He adds personality to low-risk editorial surfaces without becoming the source of truth for analysis, caveats, data freshness, or user decisions.

The first lightweight Bullshit Simulator prototype now exists as a text adventure. The full game, persistence, complex systems, and expanded Siege of South Gate Mall remain future work.

## Source Files

- `frontend/src/config/stoney.ts` defines the character profile, tone rules, allowed contexts, disallowed contexts, sample lines, and safety rules.
- `frontend/src/components/stoney/StoneyPrimitives.tsx` exports reusable UI components:
  - `StoneyAside`
  - `StoneyBriefingCard`
  - `StoneyQuote`
  - `StoneyStatusLine`
  - `StoneyErrorMessage`
- `frontend/src/app/stoney-baologna/page.tsx` introduces the lightweight profile route.
- `frontend/src/app/arcade/bullshit-simulator/page.tsx` hosts the first playable Stoney text-adventure prototype.

## How To Use Him

Use Stoney where personality helps but trust is not at stake:

- Newspaper sidebars and current-events placeholders.
- Internal story preview margins.
- Non-critical empty states.
- Light loading states.
- Non-critical error messages where a direct system error is still shown nearby.
- Future game intros, flavor panels, or character dialogue.

Good example:

```tsx
<StoneyStatusLine
  label="Non-critical margin note"
  line="The story drawer is empty. I have declared it minimalist journalism."
/>
```

## Tone Examples

Stoney can joke about:

- uncertainty
- confusing systems
- bad incentives
- his own incompetence
- overconfidence

Sample tone:

- "The model is confident, which is adorable. I once predicted lunch and was defeated by a locked door."
- "Bad incentives built the maze, and I brought a kazoo to the zoning hearing."
- "The dashboard is empty because the data is hiding from accountability."

## Where Not To Use Him

Do not place Stoney inside:

- financial advice boundaries
- betting responsible-use language
- data freshness warnings
- provider error explanations
- medical, legal, safety, or compliance copy
- primary analytic caveats
- generated story safety warnings

Stoney should not:

- make financial recommendations
- encourage gambling
- present false facts as true
- make real-world defamatory claims
- override analytic caveats
- use slurs or hateful language

## Future Game Integration Plan

Future phases can use this framework as the character layer for the fuller Bullshit Simulator or expanded Siege of South Gate Mall:

1. Keep `stoneyProfile` as the canonical personality and safety source.
2. Keep game-specific scene/state in separate modules such as `frontend/src/lib/bullshit-simulator/`.
3. Add dialogue packs only after the prototype loop works.
4. Tag each line by context, risk level, and whether it is fictional flavor or instructional UI.
5. Keep gameplay state and story logic separate from analytic tools.
6. Run any generated or expanded dialogue through the same copy rules before display.

Stoney is allowed to be loud. He is not allowed to be the facts.
