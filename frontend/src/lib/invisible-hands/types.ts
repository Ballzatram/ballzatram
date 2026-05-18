export type Difficulty = "easy" | "normal" | "hard";

export type EconomyState = {
  turn: number;
  maxTurns: number;
  gdpGrowth: number;
  inflation: number;
  inflationExpectations: number;
  unemployment: number;
  debtToGdp: number;
  fiscalBalance: number;
  approval: number;
  welfare: number;
  crisisRisk: number;
  centralBankCredibility: number;
  marketConfidence: number;
  currencyIndex: number;
  bondYield: number;
  equityIndex: number;
  bankStress: number;
  retaliationRisk: number;
  tariffLevel: number;
  tradeBalance: number;
  supplyChainStress: number;
  eastportRelationship: number;
  policyRate: number;
  commodityPressure: number;
  exportAccess: number;
};

export type SectorState = {
  output: number;
  jobs?: number;
  productivity?: number;
  lobbyPower?: number;
  importExposure?: number;
  exportDependence?: number;
  inputCostExposure?: number;
  pricePressure?: number;
  priceSensitivity?: number;
  creditGrowth?: number;
  defaultRisk?: number;
  retaliationExposure?: number;
  stress: number;
  politicalSalience?: number;
};

export type SectorsState = {
  steel: SectorState;
  autos: SectorState;
  agriculture: SectorState;
  consumerGoods: SectorState;
  banking: SectorState;
};

export type GameState = {
  economy: EconomyState;
  sectors: SectorsState;
  delayedEffects: ScheduledEffect[];
  actionHistory: string[];
  frameworksEncountered: string[];
  bestDecisions: string[];
  worstDecisions: string[];
  log: TurnLogEntry[];
};

export type NumericEffects = Partial<EconomyState>;
export type SectorEffects = Partial<Record<keyof SectorsState, Partial<SectorState>>>;

export type EffectBundle = {
  economy?: NumericEffects;
  sectors?: SectorEffects;
};

export type ScheduledEffect = EffectBundle & {
  id: string;
  label: string;
  dueTurn: number;
};

export type PolicyAction = {
  id: string;
  label: string;
  category: "Trade" | "Fiscal / Industrial" | "Central Bank";
  description: string;
  immediateEffects: EffectBundle;
  delayedEffects: Array<Omit<ScheduledEffect, "dueTurn"> & { delay: number }>;
  frameworkTags: string[];
  advisorHint: {
    easy: string;
    normal: string;
    hard: string;
  };
};

export type ScenarioEvent = {
  id: string;
  turn: number;
  title: string;
  description: string;
  availablePolicyActionIds: string[];
  affectedAgents: string[];
  frameworkTags: string[];
  educationalNote: string;
};

export type AgentResponse = {
  agent: string;
  message: string;
  tone: "positive" | "neutral" | "negative";
  effects?: EffectBundle;
};

export type TurnLogEntry = {
  turn: number;
  eventTitle: string;
  actionLabel: string;
  agentResponses: AgentResponse[];
  delayedEffectsApplied: string[];
  explanation: string;
  snapshot: EconomyState;
};
