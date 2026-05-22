export type CurriculumPhase = {
  id: string;
  phase: string;
  title: string;
  focus: string;
  status: "available" | "locked" | "capstone";
  progress: number;
};

export type ArcadeModule = {
  id: string;
  title: string;
  phaseId: string;
  status: "playable" | "preview" | "planned";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  route?: string;
  href?: string;
  hrefLabel?: string;
  summary: string;
  learningGoal: string;
  format:
    | "Next.js lab"
    | "Static game"
    | "Strategy studio"
    | "Companion tool"
    | "Roadmap";
};

export const curriculumPhases: CurriculumPhase[] = [
  {
    id: "micro-foundations",
    phase: "Phase 1",
    title: "Micro Foundations",
    focus:
      "Supply, demand, surplus, incentives, and the first market-control loops.",
    status: "available",
    progress: 55,
  },
  {
    id: "macro-stability",
    phase: "Phase 2",
    title: "Macro Stability",
    focus:
      "Inflation, unemployment, output gaps, credibility, and stabilization tradeoffs.",
    status: "available",
    progress: 45,
  },
  {
    id: "stats-forecasting",
    phase: "Phase 3",
    title: "Stats & Forecasting",
    focus:
      "Signal extraction, confidence, noisy indicators, and forecast failure modes.",
    status: "locked",
    progress: 0,
  },
  {
    id: "game-theory",
    phase: "Phase 4",
    title: "Game Theory",
    focus:
      "Strategic moves, credible threats, mixed incentives, and repeated games.",
    status: "available",
    progress: 50,
  },
  {
    id: "international-trade",
    phase: "Phase 5",
    title: "International Trade",
    focus:
      "Comparative advantage, tariffs, retaliation, exchange rates, and global shocks.",
    status: "locked",
    progress: 0,
  },
  {
    id: "invisible-hands-capstone",
    phase: "Phase 6",
    title: "Invisible Hands Capstone",
    focus:
      "A systems simulator that combines micro, macro, banking, trade, and strategy.",
    status: "capstone",
    progress: 35,
  },
];

export const arcadeModules: ArcadeModule[] = [
  {
    id: "supply-demand-lab",
    title: "Supply & Demand Lab",
    phaseId: "micro-foundations",
    status: "playable",
    difficulty: "Beginner",
    route: "/econ-arcade/supply-demand-lab",
    hrefLabel: "Launch lab",
    format: "Next.js lab",
    learningGoal:
      "Market clearing, surplus, price controls, taxes, and deadweight loss.",
    summary:
      "Move curves, set controls, and watch prices, quantities, surplus, and deadweight loss react.",
  },
  {
    id: "invisible-hands",
    title: "Invisible Hands",
    phaseId: "invisible-hands-capstone",
    status: "playable",
    difficulty: "Advanced",
    route: "/econ-arcade/invisible-hands",
    hrefLabel: "Play Invisible Hands",
    format: "Next.js lab",
    learningGoal:
      "Systems thinking across micro incentives, macro policy, trade retaliation, and expectations.",
    summary:
      "The Steel Crisis scenario: govern Port Meridian while markets, voters, banks, and trade partners respond.",
  },
  {
    id: "invisible-hands-market",
    title: "Invisible Hands Market",
    phaseId: "micro-foundations",
    status: "playable",
    difficulty: "Beginner",
    href: "/legacy-econ-arcade/invisible-hands.html",
    hrefLabel: "Play market game",
    format: "Static game",
    learningGoal:
      "Price signals, decentralized coordination, shortages, surpluses, and welfare.",
    summary:
      "Clear a street market by tuning price, supply confidence, and demand heat until decentralized agents coordinate.",
  },
  {
    id: "central-bank-simulator",
    title: "Central Banker",
    phaseId: "macro-stability",
    status: "playable",
    difficulty: "Intermediate",
    href: "/games/central-bank.html",
    hrefLabel: "Run policy game",
    format: "Static game",
    learningGoal:
      "Inflation targeting, expectations, credibility, financial stability, and policy lags.",
    summary:
      "Tune rates and guidance for ten quarters while inflation expectations, unemployment, and markets push back.",
  },
  {
    id: "prisoners-dilemma-arena",
    title: "Prisoner’s Dilemma Lab",
    phaseId: "game-theory",
    status: "playable",
    difficulty: "Intermediate",
    href: "/legacy-econ-arcade/prisoners-dilemma.html",
    hrefLabel: "Enter arena",
    format: "Static game",
    learningGoal:
      "Dominant strategies, Nash pressure, reputation, retaliation, and repeated-game cooperation.",
    summary:
      "Probe cooperation and betrayal against AI opponent archetypes with a live payoff matrix and debriefs.",
  },
  {
    id: "strategy-studio",
    title: "Strategy Studio",
    phaseId: "game-theory",
    status: "playable",
    difficulty: "Advanced",
    href: "/legacy-econ-arcade/platform.html",
    hrefLabel: "Open studio",
    format: "Strategy studio",
    learningGoal:
      "Rational choice, static games, dynamic games, Bayesian information, auctions, signaling, bargaining, and mechanism design.",
    summary:
      "A curriculum-wide game theory suite with multiple concept engines and a full campaign map.",
  },
  {
    id: "macroboard",
    title: "MacroBoard",
    phaseId: "macro-stability",
    status: "playable",
    difficulty: "Intermediate",
    href: "/tools/macroboard/index.html",
    hrefLabel: "Open tool",
    format: "Companion tool",
    learningGoal:
      "Applied macro data workflows, portfolio review, model governance, and scenario analysis.",
    summary:
      "Analyze macro time series, stock workflows, portfolios, and stress scenarios in a quant-style dashboard.",
  },
  {
    id: "signal-vs-noise",
    title: "Signal vs Noise",
    phaseId: "stats-forecasting",
    status: "planned",
    difficulty: "Intermediate",
    hrefLabel: "Queued",
    format: "Roadmap",
    learningGoal:
      "Forecast uncertainty, noisy indicators, confidence, overfitting, and evidence weighting.",
    summary:
      "Decide which indicators deserve trust before a noisy forecast window closes.",
  },
  {
    id: "tariff-lab",
    title: "Tariff Lab",
    phaseId: "international-trade",
    status: "planned",
    difficulty: "Advanced",
    hrefLabel: "Queued",
    format: "Roadmap",
    learningGoal:
      "Comparative advantage, pass-through, retaliation, incidence, and welfare losses.",
    summary:
      "Push tariff policy through consumers, producers, trade partners, and retaliation risk.",
  },
];

export const playableArcadeModules = arcadeModules.filter(
  (module) => module.status === "playable" && (module.route || module.href),
);
