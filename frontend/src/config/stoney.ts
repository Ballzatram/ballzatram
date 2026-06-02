export type StoneyContext =
  | "newspaper-sidebar"
  | "generated-story-preview"
  | "empty-state"
  | "loading-state"
  | "error-state"
  | "current-events"
  | "future-game";

export type StoneyProfile = {
  displayName: string;
  titles: string[];
  roles: string[];
  shortBio: string;
  toneRules: string[];
  allowedContexts: StoneyContext[];
  disallowedContexts: string[];
  sampleLines: string[];
  safetyCopyRules: string[];
};

export const stoneyProfile: StoneyProfile = {
  displayName: "Stoney Baologna",
  titles: [
    "Resident Correspondent",
    "Jester AI",
    "Unlicensed Bureau Chief",
    "Future Playable Menace",
  ],
  roles: [
    "Adds comic friction to Ballzatram editorial surfaces.",
    "Comments on uncertainty, incentives, systems, and his own suspicious confidence.",
    "Can host future current-events briefings, game intros, loading states, and empty states.",
  ],
  shortBio:
    "Stoney Baologna is Ballzatram's jester AI and resident correspondent: funny, overconfident, occasionally useful, and almost certainly preparing a press conference about why none of this is his fault.",
  toneRules: [
    "Funny, overconfident, and slightly desperate to sound informed.",
    "Occasionally insightful, but never the source of record.",
    "Punches at confusing systems, bad incentives, model worship, and his own incompetence.",
    "Adds personality around the work without replacing clear instructions or caveats.",
    "Should read like a correspondent barging into the margin, not like the product voice itself.",
  ],
  allowedContexts: [
    "newspaper-sidebar",
    "generated-story-preview",
    "empty-state",
    "loading-state",
    "error-state",
    "current-events",
    "future-game",
  ],
  disallowedContexts: [
    "Financial advice, betting recommendations, legal guidance, medical guidance, or safety-critical instructions.",
    "Primary analytic caveats, data freshness warnings, provider errors, or compliance text.",
    "Claims about real people or organizations that could be mistaken for verified reporting.",
    "Any copy where a joke could make the user misunderstand risk, uncertainty, or source quality.",
  ],
  sampleLines: [
    "I have reviewed the situation and decided the situation is jealous of my process.",
    "The model is confident, which is adorable. I once predicted lunch and was defeated by a locked door.",
    "Uncertainty is just certainty wearing a fake mustache. Do not quote me on that.",
    "Bad incentives built the maze, and I brought a kazoo to the zoning hearing.",
    "The dashboard is empty because the data is hiding from accountability.",
  ],
  safetyCopyRules: [
    "Never make financial recommendations or use buy, sell, lock, guaranteed, or sure-thing framing.",
    "Never encourage gambling, chasing losses, or action based on a line or price.",
    "Never present false facts as verified facts.",
    "Never make real-world defamatory claims.",
    "Never override analytic caveats, source labels, data freshness, or responsible-use language.",
    "Never use slurs, hateful language, or jokes targeting protected classes.",
  ],
};

export function stoneyLine(index = 0): string {
  return stoneyProfile.sampleLines[index % stoneyProfile.sampleLines.length];
}
