# Ballzatram Story Engine

## Purpose

The story engine is the deterministic publishing bridge between Ballzatram tools and Ballzatram Daily. Tools produce structured `ToolInsight` objects. The story engine converts those insights into `GeneratedStoryDraft` objects that wrap the existing `Story` model.

This phase does not call an LLM, publish content automatically, or mutate the seed story dataset. It proves the architecture for reliable tool-to-newspaper drafts.

## Core Model

- `ToolInsight`: typed tool output with observations, metrics, data freshness, caveats, confidence, tags, importance, and related routes.
- `StorySource`: source metadata for the producing tool, provider/freshness status, and warnings.
- `StoryGenerationContext`: deterministic generation context such as generated timestamp, edition label, default caveats, and publication status.
- `StoryGenerator`: a deterministic generator that converts one `ToolInsight` into a `GeneratedStoryDraft`.
- `GeneratedStoryDraft`: a generated wrapper containing the input insight, generated `Story`, source metadata, warnings, and review state.

The generated `Story` always uses:

- `status: "draft"`
- `sourceType: "tool-generated"`
- `sourceToolId` matching the producing tool
- caveats copied from the insight plus deterministic generation caveats
- related routes that point back to the source tool or department page

## Generation Flow

1. A tool produces a structured `ToolInsight`.
2. A deterministic `StoryGenerator` formats the insight into the existing `Story` shape.
3. Safety checks inspect source type, caveats, stale/fallback data disclosure, and prohibited certainty language.
4. The result is a `GeneratedStoryDraft`, not a published story.
5. Editors or later systems can preview, revise, enrich, and eventually persist the draft.

Current implementation lives in:

- `frontend/src/lib/story-engine/types.ts`
- `frontend/src/lib/story-engine/generate.ts`
- `frontend/src/lib/story-engine/generators.ts`
- `frontend/src/lib/story-engine/safety.ts`

## Current Generators

- Quant Library market snapshot
- Rates Desk snapshot
- Risk Scanner alert
- Placeholder Parcel insight
- Placeholder Bettor's Corner insight

The internal preview route is:

```text
/internal/generated-stories
```

The preview renders:

- input insight JSON
- generated story card
- generated article body
- caveats and generation warnings

Quant Library also renders a compact story-engine preview from the analytics demo payload when that payload is available.

## Safety Rules

Generated stories must preserve caveats and source labels. Market stories are descriptive research context only and must avoid advice-like market language. Betting stories must avoid certainty language such as locks or guaranteed outcomes.

If source status is `fallback`, `missing`, `error`, or `unknown`, the generated story body must explicitly mention freshness, fallback, stale, or demo-only context.

The story engine is allowed to mark a draft as `readyToPublish: false` when warnings remain. This does not block preview rendering; it gives reviewers a clear signal.

## How Tools Plug In

A tool should expose a function that converts its output into `ToolInsight`:

```ts
const insight: ToolInsight = {
  id: "tool-run-id",
  toolId: "quant-library",
  departmentId: "quant-library",
  title: "Desk title",
  summary: "Plain-English summary",
  observations: ["Observation one"],
  metrics: [{ id: "metric", label: "Metric", value: "value" }],
  dataAsOf: "2026-06-02",
  confidence: "low",
  caveats: ["Source caveat"],
  relatedRoutes: [{ label: "Open tool", href: "/quant-library" }],
  importance: "medium",
  tags: ["generated"],
  source: {
    toolId: "quant-library",
    toolName: "Quant Library",
    departmentId: "quant-library",
    sourceLabel: "Quant Library analytics demo",
    freshnessStatus: "fallback",
    warnings: [],
  },
};
```

Then pass it to a `StoryGenerator`:

```ts
const draft = quantMarketSnapshotStoryGenerator.generate(insight);
```

## Future AI Enrichment

Later phases can add AI enrichment after deterministic generation. The recommended flow is:

1. Generate deterministic draft first.
2. Store or pass the complete `ToolInsight`, `StorySource`, and generated `Story`.
3. Ask an AI rewrite layer to improve prose without changing metrics, caveats, source labels, or related routes.
4. Re-run safety checks on the enriched draft.
5. Persist only reviewed drafts.

AI enrichment should never be the first source of truth. The tool insight and deterministic draft remain the audit trail.
