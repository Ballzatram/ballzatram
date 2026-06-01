import type { DepartmentId } from "@/config/departments";
import type { Story } from "@/types/story";

export const demoStories = [
  {
    id: "demo-market-breadth-check",
    title: "Market Breadth Check Waits For A Real Quant Library Run",
    dek: "A placeholder markets story showing how MacroBoard-style analysis could become a newspaper item.",
    departmentId: "quant-library",
    publishedAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
    status: "draft",
    sourceType: "tool-generated",
    sourceToolId: "macroboard",
    heroLabel: "Demo Markets Story",
    tags: ["demo", "markets", "macroboard", "breadth"],
    summary:
      "This demo story represents a future market breadth note generated from a validated Quant Library or MacroBoard workflow.",
    body: [
      {
        id: "purpose",
        type: "paragraph",
        heading: "Purpose",
        content:
          "The eventual story should summarize market breadth, identify which tool produced the readout, and let readers jump back into the underlying analysis.",
      },
      {
        id: "placeholder-findings",
        type: "bullet-list",
        heading: "Placeholder findings",
        items: [
          "No live market breadth data is used in this seed story.",
          "Future versions should include source freshness and data provider status.",
          "The story should preserve caveats from the source tool.",
        ],
      },
    ],
    relatedRoutes: [
      {
        label: "Open MacroBoard",
        href: "/macro-board",
        description: "Current prototype surface for market and macro workflow cards.",
      },
    ],
    confidence: "low",
    caveats: ["Placeholder content only.", "No live market data or AI generation was run."],
    dataAsOf: "2026-06-01",
    readingTime: 2,
  },
  {
    id: "demo-implied-probability-lesson",
    title: "Bettor's Corner Drafts An Implied Probability Lesson",
    dek: "A demo betting-education story for turning odds math into a readable classroom item.",
    departmentId: "bettors-corner",
    publishedAt: "2026-06-01T09:10:00.000Z",
    updatedAt: "2026-06-01T09:10:00.000Z",
    status: "draft",
    sourceType: "hybrid",
    sourceToolId: "weather-desk",
    heroLabel: "Demo Betting Lesson",
    tags: ["demo", "betting", "probability", "education"],
    summary:
      "This placeholder shows how a future paper-mode betting tool could publish a lesson without implying real betting advice.",
    body: [
      {
        id: "lesson-frame",
        type: "paragraph",
        heading: "Lesson frame",
        content:
          "A future tool can calculate implied probability, then publish an educational explainer with settlement caveats and no live-wagering call to action.",
      },
      {
        id: "guardrails",
        type: "callout",
        heading: "Guardrail",
        content:
          "Bettor's Corner stories should stay educational unless a reviewed product policy says otherwise.",
      },
    ],
    relatedRoutes: [
      {
        label: "Open Weather Desk",
        href: "/weather-bot.html",
        description: "Current paper-mode worksheet adjacent to probability and settlement education.",
      },
    ],
    confidence: "low",
    caveats: ["Demo content only.", "Not betting advice.", "No live odds feed was used."],
    readingTime: 2,
  },
  {
    id: "demo-parcel-land-opportunity",
    title: "Parcel Files A Land Opportunity Demo With Caveats Attached",
    dek: "A placeholder land desk memo showing how diligence output can become a newspaper story.",
    departmentId: "parcel",
    publishedAt: "2026-06-01T09:20:00.000Z",
    updatedAt: "2026-06-01T09:20:00.000Z",
    status: "draft",
    sourceType: "tool-generated",
    sourceToolId: "parcel",
    heroLabel: "Demo Land Desk",
    tags: ["demo", "parcel", "land", "diligence"],
    summary:
      "This seed story represents a future Parcel-generated memo with explicit source quality, diligence status, and next questions.",
    body: [
      {
        id: "opportunity-shape",
        type: "paragraph",
        heading: "Opportunity shape",
        content:
          "Parcel stories should translate shortlist output into a readable memo while keeping zoning, source quality, and verification gaps visible.",
      },
      {
        id: "next-questions",
        type: "bullet-list",
        heading: "Next questions",
        items: [
          "Which listing or public record produced the lead?",
          "Which assumptions still need human diligence?",
          "Which route takes the reader back to the source analysis?",
        ],
      },
    ],
    relatedRoutes: [
      {
        label: "Open Parcel",
        href: "/tools/parcel/index.html",
        description: "Current static Parcel prototype.",
      },
    ],
    confidence: "low",
    caveats: ["Placeholder content only.", "No parcel data was fetched or verified."],
    readingTime: 3,
  },
  {
    id: "demo-penitent-ii-devlog",
    title: "Penitent II Gets A Culture Desk Devlog Slot",
    dek: "A demo culture story for playable manuscript notes, rhythm-battle updates, and artifact context.",
    departmentId: "culture",
    publishedAt: "2026-06-01T09:30:00.000Z",
    updatedAt: "2026-06-01T09:30:00.000Z",
    status: "draft",
    sourceType: "manual",
    heroLabel: "Demo Culture Devlog",
    tags: ["demo", "penitent", "culture", "devlog"],
    summary:
      "This placeholder demonstrates how creative prototypes can produce editorial stories without changing the Penitent routes.",
    body: [
      {
        id: "devlog-note",
        type: "paragraph",
        heading: "Devlog note",
        content:
          "Culture stories can explain what changed in a playable artifact, what is still prototype-grade, and where readers can launch the experience.",
      },
    ],
    relatedRoutes: [
      {
        label: "Open Penitent",
        href: "/penitent",
        description: "Current Penitent II manuscript route.",
      },
      {
        label: "Open Rhythm Crusade",
        href: "/penitent/rhythm",
        description: "Current rhythm prototype route.",
      },
    ],
    confidence: "medium",
    caveats: ["Demo editorial copy only.", "No new Penitent feature was implemented."],
    readingTime: 2,
  },
  {
    id: "demo-stoney-baologna-briefing",
    title: "Stoney Baologna Briefing Placeholder Arrives Without A Rebuild",
    dek: "A demo current-events story slot for future Stoney dispatches and briefing-style recaps.",
    departmentId: "stoney-baologna",
    publishedAt: "2026-06-01T09:40:00.000Z",
    updatedAt: "2026-06-01T09:40:00.000Z",
    status: "draft",
    sourceType: "manual",
    heroLabel: "Demo Briefing",
    tags: ["demo", "stoney", "briefing", "current-events"],
    summary:
      "This placeholder keeps the Stoney concept represented in the newspaper architecture without implementing a new simulator.",
    body: [
      {
        id: "briefing-intent",
        type: "paragraph",
        heading: "Briefing intent",
        content:
          "Future Stoney stories can work like satirical current-events briefings that point back to playable scenes, logs, or source notes.",
      },
      {
        id: "phase-boundary",
        type: "data-note",
        heading: "Phase boundary",
        content:
          "This seed only defines the story slot. It does not implement Stoney Baologna, Bullshit Simulator, or any new game logic.",
      },
    ],
    relatedRoutes: [
      {
        label: "Open existing Stoney game",
        href: "/games/stoney-bologna/index.html",
        description: "Existing static playable oddity; route spelling is preserved.",
      },
    ],
    confidence: "medium",
    caveats: ["Demo content only.", "No new Stoney implementation was added."],
    readingTime: 2,
  },
] as const satisfies readonly Story[];

export function getStoriesByDepartment(departmentId: DepartmentId): Story[] {
  return demoStories.filter((story) => story.departmentId === departmentId);
}

export const storyById = demoStories.reduce(
  (lookup, story) => {
    lookup[story.id] = story;
    return lookup;
  },
  {} as Record<string, Story>,
);
