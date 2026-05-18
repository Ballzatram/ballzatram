export type DifficultyMode = "easy" | "normal" | "hard";

export type MarketScenario = {
  id: string;
  title: string;
  market: string;
  brief: string;
  baselinePrice: number;
  baselineQuantity: number;
  demandIndex: number;
  supplyIndex: number;
};

export type MarketActionId =
  | "demand-up"
  | "demand-down"
  | "supply-up"
  | "supply-down"
  | "price-ceiling"
  | "price-floor"
  | "tax"
  | "reset";

export type MarketAction = {
  id: MarketActionId;
  label: string;
  category: "Shock" | "Policy" | "Control";
  hint: string;
  normalHint: string;
  hardHint: string;
};

export type MarketState = {
  demandIndex: number;
  supplyIndex: number;
  price: number;
  quantity: number;
  consumerSurplus: number;
  producerSurplus: number;
  deadweightLoss: number;
  marketStability: number;
  shortageSurplus: "Balanced" | "Shortage" | "Surplus";
  gap: number;
  lastAction: MarketActionId | "start";
  explanation: string;
  history: Array<{ label: string; price: number; quantity: number }>;
};

export const supplyDemandScenarios: MarketScenario[] = [
  {
    id: "goblin-noodle-stand",
    title: "Goblin Noodle Stand",
    market: "Late-night noodle bowls",
    brief: "A campus noodle stand opens after midnight. Students are hungry, suppliers are sleepy, and the price board is very haunted.",
    baselinePrice: 10,
    baselineQuantity: 100,
    demandIndex: 100,
    supplyIndex: 100,
  },
  {
    id: "retro-handhelds",
    title: "Retro Handheld Drop",
    market: "Used handheld consoles",
    brief: "Collectors swarm a flea market after a streamer praises old pocket consoles. Vendors can restock, but slowly.",
    baselinePrice: 80,
    baselineQuantity: 60,
    demandIndex: 100,
    supplyIndex: 100,
  },
  {
    id: "moon-battery-cells",
    title: "Moon Battery Cells",
    market: "Compact battery cells",
    brief: "A lunar scooter startup needs cells fast. Factory capacity and buyer enthusiasm both matter.",
    baselinePrice: 45,
    baselineQuantity: 120,
    demandIndex: 100,
    supplyIndex: 100,
  },
];

export const marketActions: MarketAction[] = [
  {
    id: "demand-up",
    label: "Demand shock up",
    category: "Shock",
    hint: "More buyers enter. Expect equilibrium price and quantity to rise.",
    normalHint: "Demand shifts right; watch both price and quantity.",
    hardHint: "D+",
  },
  {
    id: "demand-down",
    label: "Demand shock down",
    category: "Shock",
    hint: "Buyers lose interest. Expect equilibrium price and quantity to fall.",
    normalHint: "Demand shifts left; check whether sellers must accept lower prices.",
    hardHint: "D-",
  },
  {
    id: "supply-up",
    label: "Supply shock up",
    category: "Shock",
    hint: "Production gets easier. Expect price to fall and quantity to rise.",
    normalHint: "Supply shifts right; abundance usually lowers the market-clearing price.",
    hardHint: "S+",
  },
  {
    id: "supply-down",
    label: "Supply shock down",
    category: "Shock",
    hint: "Production gets harder. Expect price to rise and quantity to fall.",
    normalHint: "Supply shifts left; scarcity usually raises the market-clearing price.",
    hardHint: "S-",
  },
  {
    id: "price-ceiling",
    label: "Price ceiling",
    category: "Policy",
    hint: "A legal maximum price below equilibrium helps some buyers but usually creates a shortage and deadweight loss.",
    normalHint: "Ceiling below equilibrium: lower posted price, less supplied, excess demand.",
    hardHint: "P max",
  },
  {
    id: "price-floor",
    label: "Price floor",
    category: "Policy",
    hint: "A legal minimum price above equilibrium helps some sellers but usually creates a surplus and deadweight loss.",
    normalHint: "Floor above equilibrium: higher posted price, less demanded, excess supply.",
    hardHint: "P min",
  },
  {
    id: "tax",
    label: "Per-unit tax",
    category: "Policy",
    hint: "A tax drives a wedge between buyers and sellers, reducing traded quantity and creating deadweight loss.",
    normalHint: "Tax wedge: buyer price rises, seller net falls, volume shrinks.",
    hardHint: "Tax wedge",
  },
  {
    id: "reset",
    label: "Reset market",
    category: "Control",
    hint: "Return the scenario to baseline equilibrium.",
    normalHint: "Baseline reset.",
    hardHint: "Reset",
  },
];

function roundMetric(value: number) {
  return Math.round(value * 10) / 10;
}

function baseEquilibrium(scenario: MarketScenario, demandIndex: number, supplyIndex: number) {
  const demandShift = (demandIndex - 100) / 10;
  const supplyShift = (supplyIndex - 100) / 10;

  // MVP deterministic model: demand increases move price and quantity together;
  // supply increases move quantity up but price down. Coefficients are intentionally
  // simple so the action/debrief loop teaches directional economics before calculus.
  const price = scenario.baselinePrice + demandShift * 1.8 - supplyShift * 1.5;
  const quantity = scenario.baselineQuantity + demandShift * 7 + supplyShift * 8;

  return {
    price: Math.max(1, price),
    quantity: Math.max(1, quantity),
  };
}

function surplus(price: number, quantity: number, scenario: MarketScenario, demandIndex: number, supplyIndex: number) {
  const demandPremium = (demandIndex - 100) * 0.08;
  const supplyCostPressure = (100 - supplyIndex) * 0.05;
  const willingnessToPay = Math.max(price + 2, scenario.baselinePrice * 1.95 + demandPremium);
  const minimumSupplyPrice = Math.max(0.5, scenario.baselinePrice * 0.35 + supplyCostPressure);

  return {
    consumerSurplus: Math.max(0, ((willingnessToPay - price) * quantity) / 2),
    producerSurplus: Math.max(0, ((price - minimumSupplyPrice) * quantity) / 2),
  };
}

export function createInitialMarketState(scenario: MarketScenario): MarketState {
  const eq = baseEquilibrium(scenario, scenario.demandIndex, scenario.supplyIndex);
  const surplusValues = surplus(eq.price, eq.quantity, scenario, scenario.demandIndex, scenario.supplyIndex);

  return {
    demandIndex: scenario.demandIndex,
    supplyIndex: scenario.supplyIndex,
    price: roundMetric(eq.price),
    quantity: roundMetric(eq.quantity),
    consumerSurplus: roundMetric(surplusValues.consumerSurplus),
    producerSurplus: roundMetric(surplusValues.producerSurplus),
    deadweightLoss: 0,
    marketStability: 92,
    shortageSurplus: "Balanced",
    gap: 0,
    lastAction: "start",
    explanation: "Baseline equilibrium is stable: buyers and sellers agree on the current price and quantity.",
    history: [{ label: "Start", price: roundMetric(eq.price), quantity: roundMetric(eq.quantity) }],
  };
}

export function applyMarketAction(state: MarketState, scenario: MarketScenario, actionId: MarketActionId): MarketState {
  if (actionId === "reset") return createInitialMarketState(scenario);

  let demandIndex = state.demandIndex;
  let supplyIndex = state.supplyIndex;
  let shortageSurplus: MarketState["shortageSurplus"] = "Balanced";
  let gap = 0;
  let deadweightLoss = 0;
  let priceAdjustment = 0;
  let quantityMultiplier = 1;
  let explanation = "The market absorbs the change and searches for a new clearing point.";

  if (actionId === "demand-up") {
    demandIndex += 12;
    explanation = "Demand shifted right: more buyers compete for the same market, so equilibrium price and quantity rise.";
  }
  if (actionId === "demand-down") {
    demandIndex -= 12;
    explanation = "Demand shifted left: fewer buyers want the good, so sellers clear the market at lower price and quantity.";
  }
  if (actionId === "supply-up") {
    supplyIndex += 12;
    explanation = "Supply shifted right: sellers can provide more units, so quantity rises while competitive pressure lowers price.";
  }
  if (actionId === "supply-down") {
    supplyIndex -= 12;
    explanation = "Supply shifted left: scarcity raises price and lowers quantity because fewer units are available at each price.";
  }

  const eq = baseEquilibrium(scenario, demandIndex, supplyIndex);

  if (actionId === "price-ceiling") {
    priceAdjustment = -Math.max(2, eq.price * 0.18);
    quantityMultiplier = 0.86;
    shortageSurplus = "Shortage";
    gap = Math.max(6, eq.quantity * 0.18);
    deadweightLoss = gap * Math.max(1, eq.price * 0.32);
    explanation = "A binding price ceiling pushes the posted price below equilibrium. Buyers want more than sellers provide, creating a shortage and deadweight loss.";
  }

  if (actionId === "price-floor") {
    priceAdjustment = Math.max(2, eq.price * 0.18);
    quantityMultiplier = 0.86;
    shortageSurplus = "Surplus";
    gap = Math.max(6, eq.quantity * 0.18);
    deadweightLoss = gap * Math.max(1, eq.price * 0.3);
    explanation = "A binding price floor pushes the posted price above equilibrium. Sellers offer more than buyers purchase, creating a surplus and deadweight loss.";
  }

  if (actionId === "tax") {
    priceAdjustment = Math.max(1.5, eq.price * 0.12);
    quantityMultiplier = 0.9;
    deadweightLoss = Math.max(8, eq.quantity * eq.price * 0.045);
    explanation = "A per-unit tax creates a wedge: buyers face a higher effective price, sellers receive less net revenue, quantity falls, and deadweight loss appears.";
  }

  const price = Math.max(1, eq.price + priceAdjustment);
  const quantity = Math.max(1, eq.quantity * quantityMultiplier);
  const surplusValues = surplus(price, quantity, scenario, demandIndex, supplyIndex);
  const stabilityPenalty = Math.abs(demandIndex - 100) * 0.45 + Math.abs(supplyIndex - 100) * 0.4 + gap * 0.35 + deadweightLoss * 0.04;
  const marketStability = Math.max(0, Math.min(100, 94 - stabilityPenalty));

  const labelByAction: Record<MarketActionId, string> = {
    "demand-up": "D↑",
    "demand-down": "D↓",
    "supply-up": "S↑",
    "supply-down": "S↓",
    "price-ceiling": "Ceiling",
    "price-floor": "Floor",
    tax: "Tax",
    reset: "Reset",
  };

  return {
    demandIndex,
    supplyIndex,
    price: roundMetric(price),
    quantity: roundMetric(quantity),
    consumerSurplus: roundMetric(surplusValues.consumerSurplus),
    producerSurplus: roundMetric(surplusValues.producerSurplus),
    deadweightLoss: roundMetric(deadweightLoss),
    marketStability: roundMetric(marketStability),
    shortageSurplus,
    gap: roundMetric(gap),
    lastAction: actionId,
    explanation,
    history: [...state.history.slice(-5), { label: labelByAction[actionId], price: roundMetric(price), quantity: roundMetric(quantity) }],
  };
}
