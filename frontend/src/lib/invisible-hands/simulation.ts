import { runAgentResponses } from "./agents";
import { getEventForTurn } from "./events";
import { policyById } from "./policies";
import type { EffectBundle, EconomyState, GameState, PolicyAction, ScheduledEffect, SectorState, SectorsState } from "./types";

const economyBounds: Partial<Record<keyof EconomyState, [number, number]>> = {
  gdpGrowth: [-6, 7],
  inflation: [-1, 12],
  inflationExpectations: [0.5, 10],
  unemployment: [2, 14],
  debtToGdp: [45, 110],
  fiscalBalance: [-12, 3],
  approval: [0, 100],
  welfare: [0, 130],
  crisisRisk: [0, 100],
  centralBankCredibility: [0, 100],
  marketConfidence: [0, 100],
  currencyIndex: [60, 130],
  bondYield: [0.5, 12],
  equityIndex: [40, 150],
  bankStress: [0, 100],
  retaliationRisk: [0, 100],
  tariffLevel: [0, 35],
  tradeBalance: [-10, 8],
  supplyChainStress: [0, 100],
  eastportRelationship: [0, 100],
  policyRate: [0, 12],
  commodityPressure: [0, 100],
  exportAccess: [0, 100],
};

const sectorBounds: Partial<Record<keyof SectorState, [number, number]>> = {
  output: [40, 140],
  jobs: [0, 140000],
  productivity: [10, 100],
  lobbyPower: [0, 100],
  importExposure: [0, 100],
  exportDependence: [0, 100],
  inputCostExposure: [0, 100],
  pricePressure: [0, 100],
  priceSensitivity: [0, 100],
  creditGrowth: [-8, 12],
  defaultRisk: [0, 100],
  retaliationExposure: [0, 100],
  stress: [0, 100],
  politicalSalience: [0, 100],
};

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, [min, max]: [number, number]): number {
  return Math.min(max, Math.max(min, value));
}

export function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function addEconomyEffects(economy: EconomyState, effects: EffectBundle["economy"] = {}) {
  for (const [key, delta] of Object.entries(effects) as Array<[keyof EconomyState, number]>) {
    const bounds = economyBounds[key] ?? [-Infinity, Infinity];
    economy[key] = round(clamp(Number(economy[key]) + delta, bounds));
  }
}

function addSectorEffects(sectors: SectorsState, effects: EffectBundle["sectors"] = {}) {
  for (const [sectorKey, sectorEffects] of Object.entries(effects) as Array<[keyof SectorsState, Partial<SectorState>]>) {
    for (const [metricKey, delta] of Object.entries(sectorEffects) as Array<[keyof SectorState, number]>) {
      const current = Number(sectors[sectorKey][metricKey] ?? 0);
      const bounds = sectorBounds[metricKey] ?? [-Infinity, Infinity];
      (sectors[sectorKey][metricKey] as number) = round(clamp(current + delta, bounds));
    }
  }
}

export function applyEffectBundle(state: GameState, effects: EffectBundle = {}) {
  addEconomyEffects(state.economy, effects.economy);
  addSectorEffects(state.sectors, effects.sectors);
}

function applyMacroFeedback(state: GameState) {
  const { economy, sectors } = state;

  // Tariffs and supply-chain stress pass into consumer prices, while high unemployment reduces demand pressure.
  economy.inflation = round(clamp(economy.inflation + economy.tariffLevel * 0.008 + economy.supplyChainStress * 0.004 - Math.max(0, economy.unemployment - 5.5) * 0.04, economyBounds.inflation!));
  economy.inflationExpectations = round(clamp(economy.inflationExpectations + (economy.inflation - economy.inflationExpectations) * 0.12 - (economy.centralBankCredibility - 65) * 0.006, economyBounds.inflationExpectations!));

  // Retaliation and logistics frictions directly lower net exports and pressure exposed sectors.
  if (economy.retaliationRisk > 55) {
    sectors.agriculture.output = round(clamp(sectors.agriculture.output - 2, sectorBounds.output!));
    sectors.agriculture.stress = round(clamp(sectors.agriculture.stress + 3, sectorBounds.stress!));
    economy.tradeBalance = round(clamp(economy.tradeBalance - 0.25, economyBounds.tradeBalance!));
  }

  // Financial markets aggregate several risks into yields, equity prices, and confidence.
  const riskPremium = Math.max(0, economy.inflationExpectations - 3) * 0.04 + Math.max(0, economy.debtToGdp - 75) * 0.01 + Math.max(0, economy.crisisRisk - 30) * 0.006;
  economy.bondYield = round(clamp(economy.bondYield + riskPremium - Math.max(0, economy.centralBankCredibility - 65) * 0.003, economyBounds.bondYield!));
  economy.marketConfidence = round(clamp(economy.marketConfidence - riskPremium * 8 + (economy.eastportRelationship - 55) * 0.02, economyBounds.marketConfidence!));
  economy.equityIndex = round(clamp(economy.equityIndex + economy.gdpGrowth * 0.12 - economy.bondYield * 0.08 - economy.bankStress * 0.03, economyBounds.equityIndex!));

  // Public welfare and approval respond to bread-and-butter macro conditions and visible crisis pressure.
  economy.welfare = round(clamp(economy.welfare + economy.gdpGrowth * 0.2 - Math.max(0, economy.inflation - 3) * 0.5 - Math.max(0, economy.unemployment - 5) * 0.7 - economy.supplyChainStress * 0.03, economyBounds.welfare!));
  economy.approval = round(clamp(economy.approval + economy.gdpGrowth * 0.15 - Math.max(0, economy.inflation - 4) * 0.7 - Math.max(0, economy.unemployment - 5.5) * 0.8 - Math.max(0, economy.crisisRisk - 35) * 0.08, economyBounds.approval!));
  economy.crisisRisk = round(clamp(economy.crisisRisk + economy.bankStress * 0.03 + economy.retaliationRisk * 0.025 + Math.max(0, economy.inflationExpectations - 4) * 0.8 - economy.marketConfidence * 0.015, economyBounds.crisisRisk!));
}

function scheduleDelayedEffects(state: GameState, action: PolicyAction) {
  for (const delayedEffect of action.delayedEffects) {
    const { delay, ...scheduled } = delayedEffect;
    state.delayedEffects.push({ ...scheduled, dueTurn: state.economy.turn + delay });
  }
}

function applyDueDelayedEffects(state: GameState): string[] {
  const due = state.delayedEffects.filter((effect) => effect.dueTurn <= state.economy.turn);
  state.delayedEffects = state.delayedEffects.filter((effect) => effect.dueTurn > state.economy.turn);
  for (const effect of due) {
    applyEffectBundle(state, effect);
  }
  return due.map((effect) => effect.label);
}

function createFrameworkExplanation(action: PolicyAction, eventNote: string): string {
  const tags = action.frameworkTags.join(" · ");
  return `${tags}: ${eventNote} Your chosen policy changed incentives first, then agents updated their expectations and bargaining positions.`;
}

function rememberDecisionQuality(state: GameState, action: PolicyAction) {
  const tariffEscalation = action.id === "steel_tariff_25" || action.id === "steel_import_quota" || action.id === "local_content_requirement";
  if (action.id === "negotiate_with_eastport" && state.economy.retaliationRisk < 45) state.bestDecisions.push(action.label);
  if (action.id === "hike_rate" && state.economy.inflationExpectations > 4) state.bestDecisions.push(action.label);
  if (action.id === "worker_adjustment_aid" && state.economy.unemployment > 5.8) state.bestDecisions.push(action.label);
  if (tariffEscalation && state.economy.inflation > 5.5) state.worstDecisions.push(action.label);
  if (action.id === "cut_rate" && state.economy.inflationExpectations > 4) state.worstDecisions.push(action.label);
  if (action.id === "austerity_package" && state.economy.unemployment > 6.5) state.worstDecisions.push(action.label);
}

export function resolveTurn(currentState: GameState, actionId: string): GameState {
  const state = cloneGameState(currentState);
  const action = policyById[actionId];
  const event = getEventForTurn(state.economy.turn);
  if (!action) return state;

  applyEffectBundle(state, action.immediateEffects);
  const delayedEffectsApplied = applyDueDelayedEffects(state);
  const agentResponses = runAgentResponses(state, action);
  for (const response of agentResponses) applyEffectBundle(state, response.effects);
  applyMacroFeedback(state);
  scheduleDelayedEffects(state, action);
  rememberDecisionQuality(state, action);

  const explanation = createFrameworkExplanation(action, event.educationalNote);
  state.actionHistory.push(action.id);
  state.frameworksEncountered = Array.from(new Set([...state.frameworksEncountered, ...event.frameworkTags, ...action.frameworkTags]));
  state.log.unshift({
    turn: state.economy.turn,
    eventTitle: event.title,
    actionLabel: action.label,
    agentResponses,
    delayedEffectsApplied,
    explanation,
    snapshot: { ...state.economy },
  });

  state.economy.turn = Math.min(state.economy.turn + 1, state.economy.maxTurns + 1);
  return state;
}

export function getSurvivalRating(state: GameState): string {
  const score = state.economy.welfare * 0.25 + state.economy.approval * 0.2 + state.economy.marketConfidence * 0.2 + state.economy.centralBankCredibility * 0.2 + (100 - state.economy.crisisRisk) * 0.15;
  if (score >= 78) return "Architect of a durable truce";
  if (score >= 62) return "Crisis manager with bruises";
  if (score >= 45) return "Survived, but credibility is fragile";
  return "Policy spiral and political danger";
}

export function getScorecard(state: GameState) {
  return {
    survivalRating: getSurvivalRating(state),
    welfareScore: Math.round(state.economy.welfare),
    politicalSurvivalScore: Math.round(state.economy.approval),
    macroStabilityScore: Math.round(100 - Math.abs(state.economy.inflation - 2.5) * 8 - Math.max(0, state.economy.unemployment - 5) * 5),
    tradeStabilityScore: Math.round((state.economy.eastportRelationship + state.economy.exportAccess + (100 - state.economy.retaliationRisk)) / 3),
    marketCredibilityScore: Math.round((state.economy.marketConfidence + state.economy.centralBankCredibility + (100 - Math.min(100, state.economy.bondYield * 8))) / 3),
    bestDecisions: Array.from(new Set(state.bestDecisions)).slice(0, 3),
    worstDecisions: Array.from(new Set(state.worstDecisions)).slice(0, 3),
    frameworksEncountered: state.frameworksEncountered,
  };
}
