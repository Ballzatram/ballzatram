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
  status: "unlocked" | "locked" | "teaser";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  route?: string;
  summary: string;
};

export const curriculumPhases: CurriculumPhase[] = [
  {
    id: "micro-foundations",
    phase: "Phase 1",
    title: "Micro Foundations",
    focus: "Supply, demand, surplus, incentives, and the first market-control loops.",
    status: "available",
    progress: 18,
  },
  {
    id: "macro-stability",
    phase: "Phase 2",
    title: "Macro Stability",
    focus: "Inflation, unemployment, output gaps, credibility, and stabilization tradeoffs.",
    status: "locked",
    progress: 0,
  },
  {
    id: "stats-forecasting",
    phase: "Phase 3",
    title: "Stats & Forecasting",
    focus: "Signal extraction, confidence, noisy indicators, and forecast failure modes.",
    status: "locked",
    progress: 0,
  },
  {
    id: "game-theory",
    phase: "Phase 4",
    title: "Game Theory",
    focus: "Strategic moves, credible threats, mixed incentives, and repeated games.",
    status: "locked",
    progress: 0,
  },
  {
    id: "international-trade",
    phase: "Phase 5",
    title: "International Trade",
    focus: "Comparative advantage, tariffs, retaliation, exchange rates, and global shocks.",
    status: "locked",
    progress: 0,
  },
  {
    id: "invisible-hands-capstone",
    phase: "Phase 6",
    title: "Invisible Hands Capstone",
    focus: "A systems simulator that combines micro, macro, banking, trade, and strategy.",
    status: "capstone",
    progress: 0,
  },
];

export const arcadeModules: ArcadeModule[] = [
  {
    id: "supply-demand-lab",
    title: "Supply & Demand Lab",
    phaseId: "micro-foundations",
    status: "unlocked",
    difficulty: "Beginner",
    route: "/econ-arcade/supply-demand-lab",
    summary: "Move curves, set controls, and watch prices, quantities, surplus, and deadweight loss react.",
  },
  {
    id: "central-bank-simulator",
    title: "Central Bank Simulator",
    phaseId: "macro-stability",
    status: "locked",
    difficulty: "Intermediate",
    summary: "Tune rates and guidance while inflation expectations and unemployment push back.",
  },
  {
    id: "signal-vs-noise",
    title: "Signal vs Noise",
    phaseId: "stats-forecasting",
    status: "locked",
    difficulty: "Intermediate",
    summary: "Decide which indicators deserve trust before a noisy forecast window closes.",
  },
  {
    id: "prisoners-dilemma-arena",
    title: "Prisoner’s Dilemma Arena",
    phaseId: "game-theory",
    status: "locked",
    difficulty: "Intermediate",
    summary: "Probe cooperation, betrayal, reputation, and repeated-game strategy.",
  },
  {
    id: "tariff-lab",
    title: "Tariff Lab",
    phaseId: "international-trade",
    status: "locked",
    difficulty: "Advanced",
    summary: "Push tariff policy through consumers, producers, trade partners, and retaliation risk.",
  },
  {
    id: "invisible-hands",
    title: "Invisible Hands",
    phaseId: "invisible-hands-capstone",
    status: "teaser",
    difficulty: "Advanced",
    route: "/invisible-hands",
    summary: "The final systems simulator where every learned lever collides inside one unstable economy.",
  },
];
