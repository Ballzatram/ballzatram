import type { DepartmentId } from "@/config/departments";
import type { RelatedRoute, Story, StoryConfidence } from "@/types/story";

export const insightImportanceLevels = ["low", "medium", "high", "urgent"] as const;
export type InsightImportance = (typeof insightImportanceLevels)[number];

export type ToolInsightMetric = {
  id: string;
  label: string;
  value: string | number | null;
  unit?: string;
  description?: string;
};

export type StorySource = {
  toolId: string;
  toolName: string;
  departmentId: DepartmentId;
  sourceLabel: string;
  runId?: string;
  provider?: string;
  freshnessStatus?: "live" | "cached" | "demo" | "stale" | "fallback" | "missing" | "error" | "unknown";
  warnings: string[];
};

export type ToolInsight = {
  id: string;
  toolId: string;
  departmentId: DepartmentId;
  title: string;
  summary: string;
  observations: string[];
  metrics: ToolInsightMetric[];
  dataAsOf?: string;
  confidence: StoryConfidence;
  caveats: string[];
  relatedRoutes: RelatedRoute[];
  importance: InsightImportance;
  severity?: InsightImportance;
  tags: string[];
  source: StorySource;
};

export type StoryGenerationContext = {
  generatedAt: string;
  editionLabel: string;
  publicationStatus?: Story["status"];
  defaultCaveats?: string[];
};

export type GeneratedStoryDraft = {
  id: string;
  insightId: string;
  insight: ToolInsight;
  story: Story;
  source: StorySource;
  context: StoryGenerationContext;
  generationWarnings: string[];
  readyToPublish: boolean;
};

export type StoryGenerator = {
  id: string;
  toolId: string;
  description: string;
  generate: (insight: ToolInsight, context?: Partial<StoryGenerationContext>) => GeneratedStoryDraft;
};

export type StoryGeneratorOptions = {
  id: string;
  toolId: string;
  description: string;
  heroLabel: string;
  titlePrefix?: string;
};
