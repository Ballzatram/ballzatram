/* Shared deterministic engine: website, MCP tools, and host UI. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SupplyDemandEngine = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
'use strict';
const scenarios = [
  { id: "goblin-noodle-stand", title: "Goblin Noodle Stand", market: "Late-night noodle bowls", brief: "A campus noodle stand opens after midnight. Students are hungry, suppliers are sleepy, and the price board is very haunted.", baselinePrice: 10, baselineQuantity: 100, demandIndex: 100, supplyIndex: 100 },
  { id: "retro-handhelds", title: "Retro Handheld Drop", market: "Used handheld consoles", brief: "Collectors swarm a flea market after a streamer praises old pocket consoles. Vendors can restock, but slowly.", baselinePrice: 80, baselineQuantity: 60, demandIndex: 100, supplyIndex: 100 },
  { id: "moon-battery-cells", title: "Moon Battery Cells", market: "Compact battery cells", brief: "A lunar scooter startup needs cells fast. Factory capacity and buyer enthusiasm both matter.", baselinePrice: 45, baselineQuantity: 120, demandIndex: 100, supplyIndex: 100 }
];

const actions = [
  { id: "demand-up", label: "Demand shock up", hint: "Demand shifts right; price and quantity usually rise." },
  { id: "demand-down", label: "Demand shock down", hint: "Demand shifts left; price and quantity usually fall." },
  { id: "supply-up", label: "Supply shock up", hint: "Supply shifts right; quantity rises and price usually falls." },
  { id: "supply-down", label: "Supply shock down", hint: "Supply shifts left; scarcity raises price and lowers quantity." },
  { id: "price-ceiling", label: "Price ceiling", hint: "A binding ceiling lowers posted price and creates excess demand." },
  { id: "price-floor", label: "Price floor", hint: "A binding floor raises posted price and creates excess supply." },
  { id: "tax", label: "Per-unit tax", hint: "A tax wedge raises buyer cost, lowers volume, and creates deadweight loss." }
];

const challenges = [
  { id: "abundance", title: "Make it cheaper without a shortage", brief: "Increase quantity while lowering price. Do not use a price ceiling.", target: "Price below baseline + quantity above baseline + balanced market", maxMoves: 2, allowed: ["demand-up","demand-down","supply-up","supply-down","tax"], success: (s,b) => s.price < b.price && s.quantity > b.quantity && s.shortageSurplus === "Balanced" },
  { id: "ceiling-diagnosis", title: "Expose the ceiling tradeoff", brief: "Create a shortage with a binding price ceiling and identify the welfare cost.", target: "Shortage + positive deadweight loss", maxMoves: 1, allowed: ["price-ceiling","price-floor","tax"], success: (s) => s.shortageSurplus === "Shortage" && s.deadweightLoss > 0 },
  { id: "stabilize", title: "Restore a stressed market", brief: "Start after a negative supply shock, then restore quantity and stability without a binding control.", target: "Improve stability and quantity after the setup shock", maxMoves: 1, allowed: ["supply-up","demand-down","price-ceiling","price-floor","tax"], success: (s,b) => s.marketStability > b.marketStability && s.quantity > b.quantity }
];

const roundMetric = (value) => Math.round(value * 10) / 10;

function baseEquilibrium(scenario, demandIndex, supplyIndex) {
  const demandShift = (demandIndex - 100) / 10;
  const supplyShift = (supplyIndex - 100) / 10;
  return {
    price: Math.max(1, scenario.baselinePrice + demandShift * 1.8 - supplyShift * 1.5),
    quantity: Math.max(1, scenario.baselineQuantity + demandShift * 7 + supplyShift * 8)
  };
}

function surplus(price, quantity, scenario, demandIndex, supplyIndex) {
  const demandPremium = (demandIndex - 100) * 0.08;
  const supplyCostPressure = (100 - supplyIndex) * 0.05;
  const willingnessToPay = Math.max(price + 2, scenario.baselinePrice * 1.95 + demandPremium);
  const minimumSupplyPrice = Math.max(0.5, scenario.baselinePrice * 0.35 + supplyCostPressure);
  return {
    consumerSurplus: Math.max(0, ((willingnessToPay - price) * quantity) / 2),
    producerSurplus: Math.max(0, ((price - minimumSupplyPrice) * quantity) / 2)
  };
}

function initialState(scenario) {
  const eq = baseEquilibrium(scenario, scenario.demandIndex, scenario.supplyIndex);
  const welfare = surplus(eq.price, eq.quantity, scenario, scenario.demandIndex, scenario.supplyIndex);
  return {
    demandIndex: scenario.demandIndex,
    supplyIndex: scenario.supplyIndex,
    price: roundMetric(eq.price),
    quantity: roundMetric(eq.quantity),
    consumerSurplus: roundMetric(welfare.consumerSurplus),
    producerSurplus: roundMetric(welfare.producerSurplus),
    deadweightLoss: 0,
    marketStability: 92,
    shortageSurplus: "Balanced",
    gap: 0,
    lastAction: "start",
    explanation: "Baseline equilibrium is stable: buyers and sellers agree on the current price and quantity.",
    history: [{ label: "Start", price: roundMetric(eq.price), quantity: roundMetric(eq.quantity) }]
  };
}

function applyAction(state, scenario, actionId) {
  let demandIndex = state.demandIndex;
  let supplyIndex = state.supplyIndex;
  let shortageSurplus = "Balanced";
  let gap = 0;
  let deadweightLoss = 0;
  let priceAdjustment = 0;
  let quantityMultiplier = 1;
  let explanation = "The market absorbs the change and searches for a new clearing point.";

  if (actionId === "demand-up") { demandIndex += 12; explanation = "Demand shifted right: more buyers compete for the same market, so equilibrium price and quantity rise."; }
  if (actionId === "demand-down") { demandIndex -= 12; explanation = "Demand shifted left: fewer buyers want the good, so sellers clear the market at lower price and quantity."; }
  if (actionId === "supply-up") { supplyIndex += 12; explanation = "Supply shifted right: sellers can provide more units, so quantity rises while competitive pressure lowers price."; }
  if (actionId === "supply-down") { supplyIndex -= 12; explanation = "Supply shifted left: scarcity raises price and lowers quantity because fewer units are available at each price."; }

  const eq = baseEquilibrium(scenario, demandIndex, supplyIndex);

  if (actionId === "price-ceiling") {
    priceAdjustment = -Math.max(2, eq.price * 0.18); quantityMultiplier = 0.86; shortageSurplus = "Shortage";
    gap = Math.max(6, eq.quantity * 0.18); deadweightLoss = gap * Math.max(1, eq.price * 0.32);
    explanation = "A binding price ceiling pushes the posted price below equilibrium. Buyers want more than sellers provide, creating a shortage and deadweight loss.";
  }
  if (actionId === "price-floor") {
    priceAdjustment = Math.max(2, eq.price * 0.18); quantityMultiplier = 0.86; shortageSurplus = "Surplus";
    gap = Math.max(6, eq.quantity * 0.18); deadweightLoss = gap * Math.max(1, eq.price * 0.3);
    explanation = "A binding price floor pushes the posted price above equilibrium. Sellers offer more than buyers purchase, creating a surplus and deadweight loss.";
  }
  if (actionId === "tax") {
    priceAdjustment = Math.max(1.5, eq.price * 0.12); quantityMultiplier = 0.9; deadweightLoss = Math.max(8, eq.quantity * eq.price * 0.045);
    explanation = "A per-unit tax creates a wedge: buyers face a higher effective price, sellers receive less net revenue, quantity falls, and deadweight loss appears.";
  }

  const price = Math.max(1, eq.price + priceAdjustment);
  const quantity = Math.max(1, eq.quantity * quantityMultiplier);
  const welfare = surplus(price, quantity, scenario, demandIndex, supplyIndex);
  const stabilityPenalty = Math.abs(demandIndex - 100) * 0.45 + Math.abs(supplyIndex - 100) * 0.4 + gap * 0.35 + deadweightLoss * 0.04;
  const marketStability = Math.max(0, Math.min(100, 94 - stabilityPenalty));
  const labels = { "demand-up":"D↑", "demand-down":"D↓", "supply-up":"S↑", "supply-down":"S↓", "price-ceiling":"Ceiling", "price-floor":"Floor", tax:"Tax" };

  return {
    demandIndex, supplyIndex,
    price: roundMetric(price), quantity: roundMetric(quantity),
    consumerSurplus: roundMetric(welfare.consumerSurplus), producerSurplus: roundMetric(welfare.producerSurplus),
    deadweightLoss: roundMetric(deadweightLoss), marketStability: roundMetric(marketStability),
    shortageSurplus, gap: roundMetric(gap), lastAction: actionId, explanation,
    history: [...state.history.slice(-5), { label: labels[actionId], price: roundMetric(price), quantity: roundMetric(quantity) }]
  };
}


const VERSION = '1.0.0';
const LIMIT = 12;
function validateInput(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose a valid lab setup.');
  for (const key of Object.keys(value)) if (!['scenarioId', 'mode', 'challengeId', 'actions'].includes(key)) throw new Error('Only lab setup and action IDs are accepted.');
  const input = { scenarioId: value.scenarioId ?? scenarios[0].id, mode: value.mode ?? 'sandbox', challengeId: value.challengeId ?? challenges[0].id, actions: value.actions ?? [] };
  const scenario = scenarios.find(row => row.id === input.scenarioId);
  const challenge = challenges.find(row => row.id === input.challengeId);
  if (!scenario || !challenge || !['challenge', 'sandbox'].includes(input.mode)) throw new Error('Unknown market, challenge, or mode.');
  if (!Array.isArray(input.actions) || input.actions.length > LIMIT || input.actions.some(id => !actions.some(row => row.id === id))) throw new Error('Choose up to 12 supported market moves.');
  if (input.mode === 'challenge' && (input.actions.length > challenge.maxMoves || input.actions.some(id => !challenge.allowed.includes(id)))) throw new Error('These moves are outside this challenge’s rules.');
  return { ...input, actions: [...input.actions] };
}
function simulate(value) {
  const input = validateInput(value);
  const scenario = scenarios.find(row => row.id === input.scenarioId);
  const challenge = challenges.find(row => row.id === input.challengeId);
  let baseline = initialState(scenario);
  if (input.mode === 'challenge' && challenge.id === 'stabilize') baseline = applyAction(baseline, scenario, 'supply-down');
  let result = baseline;
  for (const [index, action] of input.actions.entries()) {
    if (input.mode === 'challenge' && index > 0 && challenge.success(result, baseline)) throw new Error('The challenge ended before this action. Start a new run.');
    result = applyAction(result, scenario, action);
  }
  return {
    schemaVersion: 1, featureId: 'supplyDemand', engineVersion: VERSION,
    revision: ['sd1', input.scenarioId, input.mode, input.challengeId, ...input.actions].join(':'),
    input, market: { id: scenario.id, title: scenario.title, description: scenario.market }, baseline, result,
    challenge: input.mode === 'challenge' ? { id: challenge.id, title: challenge.title, brief: challenge.brief, target: challenge.target, maxMoves: challenge.maxMoves, complete: challenge.success(result, baseline) || input.actions.length >= challenge.maxMoves } : null,
    provenance: { kind: 'deterministic-teaching-model', source: 'https://dgallemore.com/tools/supply-demand/index.html', limitations: 'Illustrative directional rules, not fitted supply/demand curves or real-market forecasts. Tax and price-control effects apply to the current move only; shifts persist. Welfare and stability are teaching indicators, not policy estimates.' }
  };
}
return Object.freeze({ VERSION, LIMIT, scenarios, actions, challenges, initialState, applyAction, roundMetric, validateInput, simulate });

});
