export const departmentStatuses = ["live", "prototype", "planned"] as const;
export type DepartmentStatus = (typeof departmentStatuses)[number];

export const departmentTypes = [
  "analysis",
  "creative",
  "game",
  "editorial",
  "infrastructure",
  "learning",
] as const;
export type DepartmentType = (typeof departmentTypes)[number];

export type DepartmentId =
  | "daily"
  | "quant-library"
  | "bettors-corner"
  | "parcel"
  | "laboratory"
  | "culture"
  | "arcade"
  | "stoney-baologna"
  | "observatory"
  | "academy"
  | "vault"
  | "ledger";

export type Department = {
  id: DepartmentId;
  title: string;
  shortTitle: string;
  slug: string;
  description: string;
  status: DepartmentStatus;
  type: DepartmentType;
  primaryRoute: `/${string}`;
  accentLabel: string;
  storyEnabled: boolean;
  toolEnabled: boolean;
};

export const departments = [
  {
    id: "daily",
    title: "Ballzatram Daily",
    shortTitle: "Daily",
    slug: "front-page",
    description:
      "The self-writing front page where finished, draft, and demo stories eventually gather into the public newspaper.",
    status: "live",
    type: "editorial",
    primaryRoute: "/",
    accentLabel: "Front Page",
    storyEnabled: true,
    toolEnabled: false,
  },
  {
    id: "quant-library",
    title: "Quant Library",
    shortTitle: "Markets",
    slug: "quant-library",
    description:
      "The markets desk for macro research, portfolio diagnostics, factor notes, and future quantitative notebooks.",
    status: "planned",
    type: "analysis",
    primaryRoute: "/macro-board",
    accentLabel: "Markets",
    storyEnabled: true,
    toolEnabled: true,
  },
  {
    id: "bettors-corner",
    title: "Bettor's Corner",
    shortTitle: "Betting",
    slug: "bettors-corner",
    description:
      "A probability and betting-education desk for odds, implied probability, settlement notes, and paper-mode lessons.",
    status: "planned",
    type: "analysis",
    primaryRoute: "/weather-bot.html",
    accentLabel: "Betting",
    storyEnabled: true,
    toolEnabled: false,
  },
  {
    id: "parcel",
    title: "Land & Infrastructure",
    shortTitle: "Parcel",
    slug: "parcel",
    description:
      "The land desk for parcel diligence, site notes, infrastructure questions, and source-labeled opportunity memos.",
    status: "prototype",
    type: "infrastructure",
    primaryRoute: "/tools/parcel/index.html",
    accentLabel: "Land Desk",
    storyEnabled: true,
    toolEnabled: true,
  },
  {
    id: "laboratory",
    title: "Laboratory",
    shortTitle: "Lab",
    slug: "laboratory",
    description:
      "The workshop floor for experimental machines, AI edit drafts, prototypes, and process notes before they graduate.",
    status: "prototype",
    type: "creative",
    primaryRoute: "/ai-edit-factory/",
    accentLabel: "Lab Notes",
    storyEnabled: true,
    toolEnabled: true,
  },
  {
    id: "culture",
    title: "Culture",
    shortTitle: "Culture",
    slug: "culture",
    description:
      "The arts, lore, music, manuscript, and devlog section for Penitent II and other strange Ballzatram artifacts.",
    status: "prototype",
    type: "creative",
    primaryRoute: "/penitent",
    accentLabel: "Culture Desk",
    storyEnabled: true,
    toolEnabled: false,
  },
  {
    id: "arcade",
    title: "Arcade",
    shortTitle: "Arcade",
    slug: "arcade",
    description:
      "The game and simulation cabinet for economics labs, learning games, policy toys, and playable systems.",
    status: "live",
    type: "game",
    primaryRoute: "/econ-arcade",
    accentLabel: "Playable",
    storyEnabled: true,
    toolEnabled: true,
  },
  {
    id: "stoney-baologna",
    title: "Stoney Baologna",
    shortTitle: "Stoney",
    slug: "stoney-baologna",
    description:
      "The current-events satire desk for briefing-style placeholders and future dispatches from the Stoney universe.",
    status: "prototype",
    type: "editorial",
    primaryRoute: "/games/stoney-bologna/index.html",
    accentLabel: "Current Events",
    storyEnabled: true,
    toolEnabled: false,
  },
  {
    id: "observatory",
    title: "Observatory",
    shortTitle: "Observatory",
    slug: "observatory",
    description:
      "The signal-watching desk for weather, markets, public data, and external conditions that may inform stories.",
    status: "planned",
    type: "analysis",
    primaryRoute: "/weather-bot.html",
    accentLabel: "Signals",
    storyEnabled: true,
    toolEnabled: true,
  },
  {
    id: "academy",
    title: "Academy",
    shortTitle: "Academy",
    slug: "academy",
    description:
      "The learning desk for classroom explanations, economics lessons, game theory notes, and guided debriefs.",
    status: "prototype",
    type: "learning",
    primaryRoute: "/classroom",
    accentLabel: "Learning",
    storyEnabled: true,
    toolEnabled: true,
  },
  {
    id: "vault",
    title: "Vault",
    shortTitle: "Vault",
    slug: "vault",
    description:
      "The archive for back issues, relics, older tools, source notes, and stories that should remain findable.",
    status: "prototype",
    type: "editorial",
    primaryRoute: "/#back-issues",
    accentLabel: "Archive",
    storyEnabled: true,
    toolEnabled: false,
  },
  {
    id: "ledger",
    title: "Ledger",
    shortTitle: "Ledger",
    slug: "ledger",
    description:
      "The future operations desk for membership, accountability, credits, billing notes, and durable account records.",
    status: "planned",
    type: "infrastructure",
    primaryRoute: "/lab-pass.html",
    accentLabel: "Operations",
    storyEnabled: false,
    toolEnabled: false,
  },
] as const satisfies readonly Department[];

export const departmentById = departments.reduce(
  (lookup, department) => {
    lookup[department.id] = department;
    return lookup;
  },
  {} as Record<DepartmentId, Department>,
);

export function getDepartment(departmentId: DepartmentId): Department {
  return departmentById[departmentId];
}
