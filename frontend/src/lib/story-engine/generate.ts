import { getDepartment } from "@/config/departments";
import type { Story, StoryBodySection } from "@/types/story";
import { ensureCaveats, isStaleInsight, safetyWarnings } from "@/lib/story-engine/safety";
import type {
  GeneratedStoryDraft,
  StoryGenerationContext,
  StoryGenerator,
  StoryGeneratorOptions,
  ToolInsight,
  ToolInsightMetric,
} from "@/lib/story-engine/types";

const defaultContext: StoryGenerationContext = {
  generatedAt: "2026-06-02T09:00:00.000Z",
  editionLabel: "Ballzatram Daily generated draft",
  publicationStatus: "draft",
  defaultCaveats: ["Deterministic draft only; no AI rewrite or external generation was run."],
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function metricLine(metric: ToolInsightMetric) {
  const value = metric.value === null ? "not available" : `${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`;
  return metric.description ? `${metric.label}: ${value}. ${metric.description}` : `${metric.label}: ${value}.`;
}

function bodySections(insight: ToolInsight): StoryBodySection[] {
  const sections: StoryBodySection[] = [
    {
      id: "summary",
      type: "paragraph",
      heading: "What the tool saw",
      content: insight.summary,
    },
  ];

  if (insight.observations.length) {
    sections.push({
      id: "observations",
      type: "bullet-list",
      heading: "Structured observations",
      items: insight.observations,
    });
  }

  if (insight.metrics.length) {
    sections.push({
      id: "metrics",
      type: "bullet-list",
      heading: "Metric notes",
      items: insight.metrics.map(metricLine),
    });
  }

  sections.push({
    id: "freshness",
    type: "data-note",
    heading: "Source and freshness",
    content: isStaleInsight(insight)
      ? `This draft uses ${insight.source.freshnessStatus ?? "unknown"} source status from ${insight.source.sourceLabel}. Treat it as demo or stale-context copy until the source is reviewed.`
      : `This draft uses source metadata from ${insight.source.sourceLabel}${insight.dataAsOf ? `, data as of ${insight.dataAsOf}` : ""}.`,
  });

  sections.push({
    id: "editorial-guardrail",
    type: "callout",
    heading: "Editorial guardrail",
    content:
      "This draft is explanatory research copy. It should improve questions, preserve caveats, and route readers back to the producing tool.",
  });

  return sections;
}

export function createStoryGenerator(options: StoryGeneratorOptions): StoryGenerator {
  return {
    id: options.id,
    toolId: options.toolId,
    description: options.description,
    generate: (insight, contextOverrides = {}) => generateStoryDraft(insight, options, contextOverrides),
  };
}

export function generateStoryDraft(
  insight: ToolInsight,
  options: StoryGeneratorOptions,
  contextOverrides: Partial<StoryGenerationContext> = {},
): GeneratedStoryDraft {
  const context = { ...defaultContext, ...contextOverrides };
  const department = getDepartment(insight.departmentId);
  const caveats = [...ensureCaveats(insight), ...(context.defaultCaveats ?? [])];
  const title = options.titlePrefix ? `${options.titlePrefix}: ${insight.title}` : insight.title;
  const story: Story = {
    id: `generated-${slugify(insight.id)}`,
    title,
    dek: `${department.shortTitle} desk draft from ${insight.source.toolName}.`,
    departmentId: insight.departmentId,
    publishedAt: context.generatedAt,
    updatedAt: context.generatedAt,
    status: context.publicationStatus ?? "draft",
    sourceType: "tool-generated",
    sourceToolId: insight.toolId,
    heroLabel: options.heroLabel,
    tags: [...new Set(["generated", ...insight.tags])],
    summary: insight.summary,
    body: bodySections(insight),
    relatedRoutes: insight.relatedRoutes,
    confidence: insight.confidence,
    caveats,
    dataAsOf: insight.dataAsOf,
    readingTime: Math.max(2, Math.ceil((insight.observations.length + insight.metrics.length + 4) / 3)),
  };
  const draft: GeneratedStoryDraft = {
    id: `${story.id}-draft`,
    insightId: insight.id,
    insight,
    story,
    source: insight.source,
    context,
    generationWarnings: [],
    readyToPublish: false,
  };
  const warnings = safetyWarnings(draft);
  return {
    ...draft,
    generationWarnings: warnings,
    readyToPublish: warnings.length === 0 && story.status === "draft",
  };
}
