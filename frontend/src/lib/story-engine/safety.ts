import type { GeneratedStoryDraft, ToolInsight } from "@/lib/story-engine/types";

const marketAdviceTerms = /\b(buy|sell|hold|short|long|outperform|underperform)\b/i;
const bettingCertaintyTerms = /\b(lock|locks|guarantee|guaranteed|sure thing|free money)\b/i;

export function isStaleInsight(insight: ToolInsight): boolean {
  return ["fallback", "missing", "error", "unknown"].includes(insight.source.freshnessStatus ?? "unknown");
}

export function ensureCaveats(insight: ToolInsight): string[] {
  const caveats = [...insight.caveats];
  if (!caveats.length) {
    caveats.push("Generated draft requires source review before publication.");
  }
  if (isStaleInsight(insight)) {
    caveats.push("Data freshness is limited; the story must say the source may be stale or demo-only.");
  }
  return [...new Set(caveats)];
}

export function safetyWarnings(draft: GeneratedStoryDraft): string[] {
  const text = [
    draft.story.title,
    draft.story.dek,
    draft.story.summary,
    ...draft.story.body.flatMap((section) => [section.heading, section.content, ...(section.items ?? [])]),
    ...(draft.story.caveats ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  const warnings: string[] = [];
  if (draft.story.sourceType !== "tool-generated") {
    warnings.push("Generated stories must use sourceType=tool-generated.");
  }
  if (!draft.story.caveats?.length) {
    warnings.push("Generated stories must include caveats.");
  }
  if (draft.story.departmentId === "quant-library" && marketAdviceTerms.test(text)) {
    warnings.push("Market story contains advice-like market language.");
  }
  if (draft.story.departmentId === "bettors-corner" && bettingCertaintyTerms.test(text)) {
    warnings.push("Betting story contains certainty language.");
  }
  const sourceLooksStale = ["fallback", "missing", "error", "unknown"].includes(draft.source.freshnessStatus ?? "unknown");
  if (sourceLooksStale) {
    const saysStale = /stale|fallback|demo-only|freshness/i.test(text);
    if (!saysStale) warnings.push("Stale or fallback data must be disclosed in the story body.");
  }
  return warnings;
}
