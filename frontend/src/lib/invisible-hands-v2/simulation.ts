import { actions, baseStats, layers, scenarios, trackedStatKeys } from "./data";
import type { Actor, EndState, GameEvent, GameState, Stats } from "./types";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const isSelectedAction = (state: GameState, id: string) => state.selectedActionIds.includes(id);

export const calculateStabilityScore = (s: GameState) => {
  const balancePenalty = Math.abs(s.tradeBalance - 50) * 0.6;
  const overheatingPenalty = Math.max(0, s.inflation - 65) * 0.8;
  const fragilityPenalty = Math.max(0, 45 - s.financialStability) * 0.7;
  return clamp(105 - 0.8 * s.inflation - 0.7 * s.unemployment + 0.75 * s.output + 0.65 * s.publicConfidence + 0.55 * s.financialStability + 0.35 * s.currencyStrength - 0.7 * s.supplyStress - 0.55 * s.marketVolatility + 0.7 * s.policyCredibility + 0.4 * s.fiscalSpace - balancePenalty - overheatingPenalty - fragilityPenalty);
};

export function initScenario(id: string): GameState {
  const sc = scenarios.find((s) => s.id === id) ?? scenarios[0];
  const state = { ...baseStats, ...sc.startingState, scenarioId: sc.id, layer: "macro" as const, selectedActionIds: [], actors: [...layers.micro, ...layers.macro, ...layers.global], activeEvents: [], history: [] } as GameState;
  state.stabilityScore = calculateStabilityScore(state);
  return state;
}

function applyAction(s: GameState, id: string) {
  const change = (k: keyof GameState, d: number) => (s[k] = ((s[k] as number) + d) as never);
  switch (id) {
    case "raise-interest-rates": change("inflation", -5); change("output", -3); change("unemployment", 3); change("policyCredibility", 5); break;
    case "cut-interest-rates": change("output", 4); change("unemployment", -3); change("inflation", 3); change("policyCredibility", -3); break;
    case "fiscal-stimulus": change("output", 4); change("publicConfidence", 3); change("inflation", 2); change("fiscalSpace", -5); break;
    case "spending-cuts": change("fiscalSpace", 5); change("output", -3); change("publicConfidence", -2); break;
    case "credit-tightening": change("financialStability", 2); change("output", -2); change("unemployment", 2); break;
    case "credit-support": change("financialStability", -1); change("output", 3); change("publicConfidence", 2); break;
    case "release-strategic-reserves": change("energyPrice", -5); change("inflation", -2); change("policyCredibility", -1); break;
    case "industrial-support": change("output", 3); change("unemployment", -2); change("fiscalSpace", -4); break;
    case "forward-guidance": change("policyCredibility", 4); change("marketVolatility", -2); break;
    case "raise-tariffs": change("tradeBalance", 4); change("inflation", 3); change("marketVolatility", 4); change("publicConfidence", -1); break;
    case "lower-tariffs": change("tradeBalance", -2); change("inflation", -2); change("marketVolatility", -2); break;
    case "sign-trade-deal": change("tradeBalance", 3); change("currencyStrength", 2); change("marketVolatility", -4); break;
    case "restrict-exports": change("tradeBalance", 2); change("marketVolatility", 3); change("publicConfidence", -2); break;
    case "diversify-suppliers": change("supplyStress", -3); change("fiscalSpace", -2); change("output", -1); break;
    case "currency-defense": change("currencyStrength", 4); change("output", -1); change("marketVolatility", -1); break;
    case "strategic-resource-purchase": change("supplyStress", -2); change("energyPrice", 1); change("foodPrice", 1); break;
    case "negotiate-shipping-access": change("supplyStress", -4); change("tradeBalance", 2); break;
    case "retaliation-de-escalation": change("marketVolatility", -4); change("tradeBalance", 1); change("publicConfidence", 2); break;
    case "encourage-consumer-spending": change("output", 3); change("publicConfidence", 2); change("inflation", 1); break;
    case "support-agriculture-supply": change("foodPrice", -3); change("supplyStress", -2); change("fiscalSpace", -2); break;
    case "subsidize-energy-inputs": change("energyPrice", -4); change("inflation", -1); change("fiscalSpace", -3); break;
    case "ease-credit-to-firms": change("output", 2); change("financialStability", -2); break;
    case "stabilize-transport-bottlenecks": change("supplyStress", -4); change("output", 2); break;
    case "release-commodity-inventory": change("foodPrice", -2); change("energyPrice", -2); change("supplyStress", -1); break;
    case "wage-support-program": change("publicConfidence", 3); change("unemployment", -2); change("inflation", 1); change("fiscalSpace", -3); break;
    default: break;
  }
}

function applySecondOrderEffects(s: GameState) {
  if (s.inflation > 65) { s.publicConfidence -= 2; s.marketVolatility += 2; }
  if (s.supplyStress > 65) { s.output -= 2; s.foodPrice += 2; }
  if (s.energyPrice > 65) { s.inflation += 2; s.output -= 1; }
  if (s.marketVolatility > 65) { s.financialStability -= 2; s.currencyStrength -= 1; }
  if (s.fiscalSpace < 30) { s.policyCredibility -= 1; s.publicConfidence -= 1; }
  if (s.policyCredibility > 65 && isSelectedAction(s, "raise-interest-rates")) { s.inflation -= 1; }
  if (isSelectedAction(s, "raise-tariffs") && isSelectedAction(s, "restrict-exports")) { s.marketVolatility += 3; s.tradeBalance -= 2; }
  if (isSelectedAction(s, "sign-trade-deal") && isSelectedAction(s, "retaliation-de-escalation")) { s.marketVolatility -= 2; s.publicConfidence += 1; }
}

function updateActors(s: GameState) {
  s.actors = s.actors.map((a: Actor) => {
    const localBias = a.layer === s.layer ? -6 : 0;
    const stress = clamp((s.inflation + s.supplyStress + s.marketVolatility + (100 - s.publicConfidence)) / 4 + localBias);
    let strategy = "Hold and observe";
    if (a.name === "Consumers") strategy = s.inflation > 60 || s.foodPrice > 60 ? "Delay purchases, chase discounts" : "Resume discretionary spending";
    if (a.name === "Manufacturers") strategy = s.supplyStress > 60 || s.energyPrice > 60 ? "Pass through costs, trim hiring" : "Expand output and rebuild stocks";
    if (a.name === "Banks / Credit") strategy = s.financialStability < 45 || s.marketVolatility > 60 ? "Tighten lending standards" : "Ease credit to solvent firms";
    if (a.name === "Labor Market") strategy = s.output < 45 ? "Layoff risk rising" : s.inflation > 60 ? "Push wage demands" : "Stable bargaining";
    if (a.name === "Central Bank") strategy = s.inflation > 60 ? "Defend credibility with tightening bias" : "Hold line and guide expectations";
    if (a.name === "Treasury / Government") strategy = s.publicConfidence < 45 ? "Shield households, accept fiscal cost" : "Preserve fiscal space";
    if (a.name === "Financial Markets") strategy = s.policyCredibility < 45 ? "Price policy error risk" : "Reward consistent policy path";
    if (a.name === "Major Trade Partner") strategy = isSelectedAction(s, "raise-tariffs") || isSelectedAction(s, "restrict-exports") ? "Prepare retaliation" : "Probe for compromise";
    if (a.name === "Shipping Chokepoint") strategy = s.supplyStress > 60 ? "Prioritize strategic routes" : "Normalize shipping throughput";
    return { ...a, stress, currentStrategy: strategy };
  });
}

function endState(s: GameState): EndState | undefined {
  if (s.turn < 10) return undefined;
  if (s.inflation < 48 && s.unemployment < 52 && s.stabilityScore > 70) return "Soft Landing";
  if (s.marketVolatility > 78 && s.financialStability < 35) return "Financial Crisis";
  if (s.tradeBalance < 30 && s.marketVolatility > 70) return "Trade Breakdown";
  if (s.inflation > 68 && s.unemployment > 55) return "Stagflation Trap";
  if (s.output > 72 && s.publicConfidence > 70 && s.inflation < 58) return "Growth Boom";
  if (s.publicConfidence < 30 || s.fiscalSpace < 20) return "Political Backlash";
  return "Fragile Recovery";
}

function buildEvents(s: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  if (s.inflation > 65) events.push({ id: `e-${s.turn}-infl`, turn: s.turn, title: "Price expectations drifting higher", body: "Households front-load purchases while firms pre-emptively reprice contracts.", affectedActors: ["Consumers", "Manufacturers"], affectedStats: ["inflation", "publicConfidence"], severity: "high", concept: "Expected payoff" });
  if (s.supplyStress > 65) events.push({ id: `e-${s.turn}-supply`, turn: s.turn, title: "Input bottlenecks broadening", body: "Transport and inventory constraints are now crossing sectors.", affectedActors: ["Transport / Ports", "Manufacturers"], affectedStats: ["supplyStress", "output"], severity: "high", concept: "Coordination game" });
  if (s.marketVolatility > 62) events.push({ id: `e-${s.turn}-mkt`, turn: s.turn, title: "Markets demand clearer policy path", body: "Risk premia are rising as policy signals look inconsistent.", affectedActors: ["Financial Markets", "Central Bank"], affectedStats: ["marketVolatility", "policyCredibility"], severity: "medium", concept: "Credible commitment" });
  if (isSelectedAction(s, "raise-tariffs") && isSelectedAction(s, "restrict-exports")) events.push({ id: `e-${s.turn}-ret`, turn: s.turn, title: "Retaliation channel activated", body: "Partner response escalates; both sides lose efficiency despite tactical gains.", affectedActors: ["Major Trade Partner", "Domestic Economy"], affectedStats: ["tradeBalance", "marketVolatility"], severity: "high", concept: "Prisoner's dilemma" });
  if (events.length === 0) events.push({ id: `e-${s.turn}-base`, turn: s.turn, title: "Pressure contained this turn", body: "Policy mix absorbed shocks, but incentives remain fragile.", affectedActors: ["Domestic Economy"], affectedStats: ["stabilityScore"], severity: "low", concept: "Best response" });
  return events;
}

export function advanceTurn(state: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  const scenario = scenarios.find((x) => x.id === s.scenarioId)!;

  s.selectedActionIds.forEach((id) => applyAction(s, id));
  Object.entries(scenario.pressureProfile).forEach(([k, v]) => {
    if (typeof v === "number" && trackedStatKeys.includes(k as keyof GameState)) {
      const key = k as keyof GameState;
      s[key] = ((s[key] as number) + v) as never;
    }
  });

  applySecondOrderEffects(s);
  trackedStatKeys.filter((k) => k !== "stabilityScore").forEach((k) => { s[k] = clamp(s[k] as number) as never; });
  updateActors(s);
  const events = buildEvents(s);
  s.stabilityScore = calculateStabilityScore(s);
  s.endState = endState(s);

  const snap: Stats = {
    inflation: s.inflation, unemployment: s.unemployment, output: s.output, publicConfidence: s.publicConfidence, financialStability: s.financialStability, currencyStrength: s.currencyStrength, supplyStress: s.supplyStress, energyPrice: s.energyPrice, foodPrice: s.foodPrice, tradeBalance: s.tradeBalance, marketVolatility: s.marketVolatility, policyCredibility: s.policyCredibility, fiscalSpace: s.fiscalSpace, stabilityScore: s.stabilityScore,
  };

  s.history.push({ turn: s.turn, layer: s.layer, actionIds: [...s.selectedActionIds], statSnapshot: snap, eventIds: events.map((e) => e.id) });
  s.activeEvents = [...events, ...s.activeEvents].slice(0, 14);
  s.selectedActionIds = [];
  s.turn += 1;
  return s;
}

export { actions, scenarios, layers };
