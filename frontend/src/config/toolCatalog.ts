export const toolStatuses = ["live", "prototype", "demo", "static", "experimental", "archived"] as const;
export type ToolStatus = (typeof toolStatuses)[number];

export type ToolCategory =
  | "featured"
  | "land"
  | "markets"
  | "games"
  | "creative"
  | "archive";

export type DataMode = "live" | "demo" | "fallback" | "static" | "mixed";

export type ToolCatalogItem = {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  status: ToolStatus;
  href: `/${string}`;
  secondaryHref?: `/${string}`;
  docsHref?: `/${string}`;
  readinessNote?: string;
  backendRequired?: boolean;
  dataMode?: DataMode;
  featured?: boolean;
};

export type LaunchpadSection = {
  id: ToolCategory;
  title: string;
  eyebrow: string;
  description: string;
};

export type RouteInventoryItem = {
  href: `/${string}`;
  label: string;
  section: string;
  status: ToolStatus;
  note: string;
};

export const categoryLabels: Record<ToolCategory, string> = {
  featured: "Featured Tools",
  land: "Land & Real Estate",
  markets: "Markets & Risk",
  games: "Games & Simulations",
  creative: "Creative / AI Lab",
  archive: "Archive / Oddities",
};

export const statusLabels: Record<ToolStatus, string> = {
  live: "Live",
  prototype: "Prototype",
  demo: "Demo",
  static: "Static",
  experimental: "Experimental",
  archived: "Archived",
};

export const dataModeLabels: Record<DataMode, string> = {
  live: "Live data",
  demo: "Demo data",
  fallback: "Fallback data",
  static: "Static files",
  mixed: "Mixed data",
};

export const launchpadSections: LaunchpadSection[] = [
  {
    id: "featured",
    title: "Featured Tools",
    eyebrow: "Start here",
    description: "The clearest current entry points: useful, findable, and labeled with their limits.",
  },
  {
    id: "land",
    title: "Land & Real Estate",
    eyebrow: "Research workflow",
    description: "Parcel and site-research tools for shaping questions, shortlists, and memo drafts.",
  },
  {
    id: "markets",
    title: "Markets & Risk",
    eyebrow: "Education and analysis",
    description: "Explainable market, portfolio, scenario, and report experiments. No advice, no live trading.",
  },
  {
    id: "games",
    title: "Games & Simulations",
    eyebrow: "Playable systems",
    description: "Economics labs, game-theory toys, policy games, and strange playable prototypes.",
  },
  {
    id: "creative",
    title: "Creative / AI Lab",
    eyebrow: "Prototype floor",
    description: "Creative AI experiments, generated-story previews, and rough machines that need honest labels.",
  },
  {
    id: "archive",
    title: "Archive / Oddities",
    eyebrow: "Back room",
    description: "Older pages, lore, culture artifacts, and prototypes kept findable without making them the main pitch.",
  },
];

export const toolCatalog: ToolCatalogItem[] = [
  {
    id: "parcel-intelligence",
    name: "Parcel Intelligence",
    description:
      "Define a land thesis, inspect source-checked map candidates, compare shortlists, and generate a backend-assisted diligence memo preview.",
    category: "land",
    status: "prototype",
    href: "/land",
    secondaryHref: "/tools/parcel/index.html",
    docsHref: "/docs/MONETIZATION_READINESS.md",
    readinessNote: "Backend-assisted research preview; manual paid memo gate and human verification required.",
    backendRequired: true,
    dataMode: "mixed",
    featured: true,
  },
  {
    id: "quant-library",
    name: "Quant Library",
    description:
      "Explore market data, risk metrics, scenarios, and explainable analytics with demo-backed research workflows.",
    category: "markets",
    status: "demo",
    href: "/quant-library",
    secondaryHref: "/markets",
    docsHref: "/docs/quant-library-product-spec.md",
    readinessNote: "Educational and research only; not investment advice.",
    backendRequired: true,
    dataMode: "demo",
    featured: true,
  },
  {
    id: "econ-arcade",
    name: "Econ Arcade",
    description: "Open the main economics arcade for learning games, market simulations, and policy experiments.",
    category: "games",
    status: "live",
    href: "/econ-arcade",
    secondaryHref: "/legacy-econ-arcade/index.html",
    docsHref: "/docs/game-theory-platform.md",
    readinessNote: "Educational simulations with simplified models.",
    backendRequired: false,
    dataMode: "static",
    featured: true,
  },
  {
    id: "ai-edit-factory",
    name: "AI Edit Factory",
    description: "Preview a short-form video editing workflow for owned or licensed source media.",
    category: "creative",
    status: "experimental",
    href: "/ai-edit-factory/",
    readinessNote: "Needs backend for real rendering; use only approved media.",
    backendRequired: true,
    dataMode: "static",
    featured: true,
  },
  {
    id: "land-desk",
    name: "Land Desk",
    description: "A focused map-based land research workflow with source status, shortlist comparison, and founding memo request path.",
    category: "land",
    status: "prototype",
    href: "/land",
    secondaryHref: "/tools/parcel/index.html",
    readinessNote: "Research workflow; backend synthesis falls back safely without secrets.",
    backendRequired: true,
    dataMode: "mixed",
  },
  {
    id: "markets-overview",
    name: "Markets Overview",
    description: "A plain map of Quant Library and the older market workflow routes.",
    category: "markets",
    status: "demo",
    href: "/markets",
    secondaryHref: "/quant-library",
    readinessNote: "Educational only; no financial advice.",
    backendRequired: false,
    dataMode: "demo",
  },
  {
    id: "portfolio-analysis",
    name: "Portfolio Analysis",
    description: "Review holdings, concentration, factor exposure, and stress questions with demo workflow data.",
    category: "markets",
    status: "demo",
    href: "/portfolio",
    readinessNote: "Research workflow; not personalized advice.",
    backendRequired: false,
    dataMode: "demo",
  },
  {
    id: "scenario-lab",
    name: "Scenario Lab",
    description: "Translate macro shocks into transparent upside and downside ranges with visible assumptions.",
    category: "markets",
    status: "demo",
    href: "/scenario",
    readinessNote: "Sensitivity analysis only; not a forecast.",
    backendRequired: false,
    dataMode: "demo",
  },
  {
    id: "event-study",
    name: "Event Study",
    description: "Measure market behavior around selected events while preserving caveats and window assumptions.",
    category: "markets",
    status: "demo",
    href: "/event-study",
    readinessNote: "Research and education only.",
    backendRequired: false,
    dataMode: "demo",
  },
  {
    id: "model-compare",
    name: "Model Compare",
    description: "Compare model choices, validation signals, and stability tradeoffs before writing conclusions.",
    category: "markets",
    status: "demo",
    href: "/model-compare",
    readinessNote: "Model governance aid; not an automated decision system.",
    backendRequired: false,
    dataMode: "demo",
  },
  {
    id: "reports",
    name: "Reports",
    description: "Collect findings, assumptions, caveats, and next checks into a draft research memo.",
    category: "markets",
    status: "demo",
    href: "/reports",
    readinessNote: "Draft report builder; requires human review.",
    backendRequired: false,
    dataMode: "demo",
  },
  {
    id: "macro-board",
    name: "Macro Board Legacy Route",
    description: "Compatibility path for the former Macro Board, now redirected into Quant Library.",
    category: "markets",
    status: "archived",
    href: "/macro-board",
    secondaryHref: "/quant-library",
    readinessNote: "Legacy route; Quant Library is the active markets surface.",
    backendRequired: false,
    dataMode: "demo",
  },
  {
    id: "weather-desk",
    name: "Weather Desk",
    description: "A paper-mode weather market worksheet for settlement review, uncertainty, and capped sizing.",
    category: "markets",
    status: "static",
    href: "/weather-bot.html",
    readinessNote: "Paper research only; no live orders and no financial advice.",
    backendRequired: false,
    dataMode: "static",
  },
  {
    id: "games-launchpad",
    name: "Games Launchpad",
    description: "A clean map of the playable simulations, static games, and arcade experiments.",
    category: "games",
    status: "live",
    href: "/arcade",
    secondaryHref: "/games/index.html",
    readinessNote: "Playable demos and experiments.",
    backendRequired: false,
    dataMode: "mixed",
  },
  {
    id: "supply-demand-lab",
    name: "Supply & Demand Lab",
    description: "Move curves, taxes, controls, and shocks to see market-clearing outcomes change.",
    category: "games",
    status: "live",
    href: "/econ-arcade/supply-demand-lab",
    readinessNote: "Educational model; simplified inputs.",
    backendRequired: false,
    dataMode: "static",
  },
  {
    id: "invisible-hands-next",
    name: "Invisible Hands",
    description: "Run a market and systems simulator about price signals, stress, and policy feedback.",
    category: "games",
    status: "live",
    href: "/econ-arcade/invisible-hands",
    secondaryHref: "/legacy-econ-arcade/invisible-hands.html",
    readinessNote: "Educational simulation; model outputs may be wrong.",
    backendRequired: false,
    dataMode: "static",
  },
  {
    id: "central-banker",
    name: "Central Banker",
    description: "Run a fictional central bank through shocks, policy lags, credibility, and stability tradeoffs.",
    category: "games",
    status: "static",
    href: "/games/central-bank.html",
    readinessNote: "Fictional educational game; not policy or trading guidance.",
    backendRequired: false,
    dataMode: "static",
  },
  {
    id: "prisoners-dilemma-lab",
    name: "Prisoner's Dilemma Lab",
    description: "Test cooperation and betrayal against repeated-game opponent archetypes.",
    category: "games",
    status: "static",
    href: "/legacy-econ-arcade/prisoners-dilemma.html",
    readinessNote: "Educational game theory simulation.",
    backendRequired: false,
    dataMode: "static",
  },
  {
    id: "strategy-studio",
    name: "Strategy Studio",
    description: "Explore rational choice, auctions, signaling, bargaining, and mechanism-design concepts.",
    category: "games",
    status: "static",
    href: "/legacy-econ-arcade/platform.html",
    readinessNote: "Educational simulation, not behavioral prediction.",
    backendRequired: false,
    dataMode: "static",
  },
  {
    id: "bullshit-simulator",
    name: "Bullshit Simulator",
    description: "Play the first Stoney text-adventure prototype: a mall crisis told as absurd interactive fiction.",
    category: "games",
    status: "experimental",
    href: "/arcade/bullshit-simulator",
    secondaryHref: "/games/stoney-bologna/index.html",
    readinessNote: "Comedy prototype; no real-world guidance.",
    backendRequired: false,
    dataMode: "static",
  },
  {
    id: "generated-stories",
    name: "Generated Story Previews",
    description: "Inspect the story-engine preview surface without making the newspaper the homepage.",
    category: "creative",
    status: "experimental",
    href: "/internal/generated-stories",
    docsHref: "/docs/story-engine.md",
    readinessNote: "Internal preview; generated copy requires review.",
    backendRequired: false,
    dataMode: "fallback",
  },
  {
    id: "laboratory",
    name: "Laboratory",
    description: "A public doorway for experimental machines, creative prototypes, and process notes.",
    category: "creative",
    status: "experimental",
    href: "/laboratory",
    readinessNote: "Prototype floor; rough edges expected.",
    backendRequired: false,
    dataMode: "mixed",
  },
  {
    id: "penitent",
    name: "Penitent II",
    description: "Open the playable manuscript, relic archive, hymns, and rhythm-battle experiment.",
    category: "archive",
    status: "experimental",
    href: "/penitent",
    secondaryHref: "/pntnt2/index.html",
    readinessNote: "Creative artifact; not every page is finished.",
    backendRequired: false,
    dataMode: "static",
  },
  {
    id: "culture",
    name: "Culture Desk",
    description: "A lighter doorway into lore, creative artifacts, and older story surfaces.",
    category: "archive",
    status: "archived",
    href: "/culture",
    secondaryHref: "/penitent",
    readinessNote: "Archive and oddities; not a core product surface.",
    backendRequired: false,
    dataMode: "static",
  },
  {
    id: "daily",
    name: "Ballzatram Daily",
    description: "Keep the newspaper shell available as an archive route, no longer the public homepage.",
    category: "archive",
    status: "archived",
    href: "/daily",
    readinessNote: "Demo newspaper shell; generated stories are not the main product.",
    backendRequired: false,
    dataMode: "fallback",
  },
  {
    id: "stoney-file",
    name: "Stoney File",
    description: "A character and prototype file for the Stoney world without making it the whole site.",
    category: "archive",
    status: "experimental",
    href: "/stoney-baologna",
    secondaryHref: "/arcade/bullshit-simulator",
    readinessNote: "Creative prototype and satire surface.",
    backendRequired: false,
    dataMode: "static",
  },
  {
    id: "bettors-corner",
    name: "Odds Education Desk",
    description: "A de-emphasized betting-market education page kept as an experimental archive link.",
    category: "archive",
    status: "experimental",
    href: "/bettors-corner",
    readinessNote: "Educational only; no picks, no betting advice, no financial advice.",
    backendRequired: false,
    dataMode: "demo",
  },
  {
    id: "product-architecture",
    name: "Product Architecture Notes",
    description: "Read the internal product map and architecture notes behind the current reset.",
    category: "archive",
    status: "archived",
    href: "/internal/product-architecture",
    readinessNote: "Internal notes; useful for orientation, not a user workflow.",
    backendRequired: false,
    dataMode: "static",
  },
];

export const routeInventory: RouteInventoryItem[] = [
  {
    href: "/",
    label: "Home",
    section: "Launchpad",
    status: "live",
    note: "Clean public index for every exposed tool group.",
  },
  {
    href: "/land",
    label: "Land Desk",
    section: "Land & Real Estate",
    status: "prototype",
    note: "Parcel research workflow and demo entry point.",
  },
  {
    href: "/markets",
    label: "Markets & Risk",
    section: "Markets & Risk",
    status: "demo",
    note: "Market workflow map with Quant Library as the primary route.",
  },
  {
    href: "/quant-library",
    label: "Quant Library",
    section: "Markets & Risk",
    status: "demo",
    note: "Main explainable market analysis surface.",
  },
  {
    href: "/arcade",
    label: "Games & Simulations",
    section: "Games & Simulations",
    status: "live",
    note: "Public cabinet for playable experiments.",
  },
  {
    href: "/econ-arcade",
    label: "Econ Arcade",
    section: "Games & Simulations",
    status: "live",
    note: "Next.js economics arcade entry point.",
  },
  {
    href: "/laboratory",
    label: "Creative / AI Lab",
    section: "Creative / AI Lab",
    status: "experimental",
    note: "Prototype and creative AI entry point.",
  },
  {
    href: "/archive",
    label: "Archive / Oddities",
    section: "Archive / Oddities",
    status: "archived",
    note: "Older pages, culture artifacts, and de-emphasized experiments.",
  },
  {
    href: "/daily",
    label: "Ballzatram Daily",
    section: "Archive / Oddities",
    status: "archived",
    note: "Newspaper shell kept as a secondary archive route.",
  },
];

export function getFeaturedTools() {
  return toolCatalog.filter((tool) => tool.featured);
}

export function getToolsForCategory(category: ToolCategory) {
  if (category === "featured") {
    return getFeaturedTools();
  }

  return toolCatalog.filter((tool) => tool.category === category);
}

export function getToolById(id: string) {
  return toolCatalog.find((tool) => tool.id === id);
}
