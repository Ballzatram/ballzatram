import type { DepartmentId } from "@/config/departments";

export const storyStatuses = ["draft", "published", "archived"] as const;
export type StoryStatus = (typeof storyStatuses)[number];

export const storySourceTypes = ["manual", "tool-generated", "hybrid"] as const;
export type StorySourceType = (typeof storySourceTypes)[number];

export const storyConfidenceLevels = ["low", "medium", "high"] as const;
export type StoryConfidence = (typeof storyConfidenceLevels)[number];

export type StoryBodySectionType =
  | "paragraph"
  | "bullet-list"
  | "callout"
  | "data-note";

export type StoryBodySection = {
  id: string;
  type: StoryBodySectionType;
  heading?: string;
  content?: string;
  items?: string[];
};

export type RelatedRoute = {
  label: string;
  href: `/${string}`;
  description?: string;
};

export type Story = {
  id: string;
  title: string;
  dek: string;
  departmentId: DepartmentId;
  publishedAt: string;
  updatedAt: string;
  status: StoryStatus;
  sourceType: StorySourceType;
  sourceToolId?: string;
  heroLabel: string;
  tags: string[];
  summary: string;
  body: StoryBodySection[];
  relatedRoutes: RelatedRoute[];
  confidence?: StoryConfidence;
  caveats?: string[];
  dataAsOf?: string;
  readingTime?: number;
};
