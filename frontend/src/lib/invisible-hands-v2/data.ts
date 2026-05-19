import type { Actor, GameAction, GameLayer, GameState, Scenario } from "./types";

export const trackedStatKeys: Array<keyof GameState> = [
  "inflation","unemployment","output","publicConfidence","financialStability","currencyStrength","supplyStress","energyPrice","foodPrice","tradeBalance","marketVolatility","policyCredibility","fiscalSpace","stabilityScore",
];

export const baseStats: Omit<GameState, "scenarioId" | "actors" | "selectedActionIds" | "activeEvents" | "history" | "layer"> = {
  turn: 1, inflation: 55, unemployment: 35, output: 55, publicConfidence: 50, financialStability: 55, currencyStrength: 50, supplyStress: 50, energyPrice: 55, foodPrice: 50, tradeBalance: 50, marketVolatility: 45, policyCredibility: 50, fiscalSpace: 50, stabilityScore: 50,
};

const actor = (id: string, name: string, layer: GameLayer, connectedActorIds: string[], conceptTags: string[]): Actor => ({
  id, name, layer, type: "node", description: `${name} pressure center`, stress: 40, stats: { throughput: 50, resilience: 50 }, incentives: ["Best response", "Expected payoff"], respondsTo: ["Inflation", "Supply stress", "Policy signals"], currentStrategy: "Monitor conditions", connectedActorIds, conceptTags,
});

export const layers: Record<GameLayer, Actor[]> = {
  micro: [
    actor("micro-consumers", "Consumers", "micro", ["micro-manufacturers", "micro-banks", "micro-labor"], ["Expected payoff"]),
    actor("micro-manufacturers", "Manufacturers", "micro", ["micro-energy", "micro-commodities", "micro-consumers", "micro-transport"], ["Best response"]),
    actor("micro-agriculture", "Agriculture", "micro", ["micro-commodities", "micro-consumers", "micro-transport"], ["Coordination game"]),
    actor("micro-energy", "Energy / Oil", "micro", ["micro-manufacturers", "micro-transport", "micro-commodities"], ["Signaling"]),
    actor("micro-commodities", "Commodity Markets", "micro", ["micro-manufacturers", "micro-agriculture", "micro-energy"], ["Bayesian beliefs"]),
    actor("micro-banks", "Banks / Credit", "micro", ["micro-manufacturers", "micro-consumers"], ["Adverse selection"]),
    actor("micro-labor", "Labor Market", "micro", ["micro-consumers", "micro-manufacturers"], ["Bargaining power"]),
    actor("micro-transport", "Transport / Ports", "micro", ["micro-manufacturers", "micro-agriculture", "micro-energy"], ["Value of information"]),
  ],
  macro: [
    actor("macro-cb", "Central Bank", "macro", ["macro-markets", "macro-housing", "macro-consumer"], ["Credible commitment"]),
    actor("macro-treasury", "Treasury / Government", "macro", ["macro-consumer", "macro-output", "macro-energy"], ["Time inconsistency"]),
    actor("macro-markets", "Financial Markets", "macro", ["macro-cb", "macro-housing", "macro-output"], ["Signaling"]),
    actor("macro-housing", "Housing / Credit", "macro", ["macro-markets", "macro-consumer"], ["Best response"]),
    actor("macro-labor", "Labor Market", "macro", ["macro-consumer", "macro-output"], ["Backward induction"]),
    actor("macro-consumer", "Consumer Economy", "macro", ["macro-output", "macro-labor", "macro-energy"], ["Expected payoff"]),
    actor("macro-output", "Industrial Output", "macro", ["macro-labor", "macro-energy", "macro-markets"], ["Coordination game"]),
    actor("macro-energy", "Energy System", "macro", ["macro-output", "macro-consumer"], ["Mechanism design"]),
  ],
  global: [
    actor("global-domestic", "Domestic Economy", "global", ["global-partner", "global-fx", "global-chokepoint"], ["Repeated game"]),
    actor("global-partner", "Major Trade Partner", "global", ["global-domestic", "global-manu-competitor", "global-food"], ["Prisoner's dilemma"]),
    actor("global-oil", "Oil Exporter", "global", ["global-domestic", "global-fx"], ["Signaling"]),
    actor("global-food", "Food Exporter", "global", ["global-domestic", "global-partner"], ["Bargaining power"]),
    actor("global-manu-competitor", "Manufacturing Competitor", "global", ["global-domestic", "global-partner"], ["Dominant strategy"]),
    actor("global-chokepoint", "Shipping Chokepoint", "global", ["global-domestic", "global-resource"], ["Value of information"]),
    actor("global-fx", "Currency / FX Market", "global", ["global-domestic", "global-oil", "global-resource"], ["Bayesian beliefs"]),
    actor("global-resource", "Strategic Resource Supplier", "global", ["global-domestic", "global-chokepoint", "global-fx"], ["Reputation"]),
  ],
};

const mk = (id: string, name: string, layer: GameLayer, concept: string, upside: string, downside: string): GameAction => ({ id, name, layer, description: name, upside, downside, affectedStats: {}, affectedActors: [], concept, conceptExplanation: `${concept}: short-term gains can shift rival responses next turn.` });

export const actions: GameAction[] = [
  mk("encourage-consumer-spending", "Encourage Consumer Spending", "micro", "Expected payoff", "Lifts demand and output.", "Can reheat inflation."),
  mk("support-agriculture-supply", "Support Agriculture Supply", "micro", "Coordination game", "Eases food pressure.", "Uses fiscal room."),
  mk("subsidize-energy-inputs", "Subsidize Energy Inputs", "micro", "Signaling", "Cuts near-term cost pass-through.", "Weakens fiscal space and credibility if repeated."),
  mk("ease-credit-to-firms", "Ease Credit to Firms", "micro", "Best response", "Prevents production collapse.", "Raises fragility if fundamentals weaken."),
  mk("stabilize-transport-bottlenecks", "Stabilize Transport Bottlenecks", "micro", "Value of information", "Reduces supply stress quickly.", "Benefits fade without coordination."),
  mk("release-commodity-inventory", "Release Commodity Inventory", "micro", "Mechanism design", "Buffers shortages.", "Signals limited buffers."),
  mk("wage-support-program", "Wage Support Program", "micro", "Bargaining power", "Protects consumers and labor stability.", "Can lock in wage-price pressure."),
  mk("raise-interest-rates", "Raise Interest Rates", "macro", "Credible commitment", "Anchors inflation expectations.", "Hurts output and labor near-term."),
  mk("cut-interest-rates", "Cut Interest Rates", "macro", "Time inconsistency", "Supports growth and confidence.", "May unanchor inflation expectations."),
  mk("fiscal-stimulus", "Fiscal Stimulus", "macro", "Expected payoff", "Supports output quickly.", "Consumes fiscal space and can raise inflation."),
  mk("spending-cuts", "Spending Cuts", "macro", "Backward induction", "Rebuilds fiscal buffer.", "Weakens demand and confidence."),
  mk("credit-tightening", "Credit Tightening", "macro", "Dominant strategy", "Contains leverage buildup.", "Can amplify downturn."),
  mk("credit-support", "Credit Support", "macro", "Best response", "Stabilizes funding channels.", "Adds medium-term stability risk."),
  mk("release-strategic-reserves", "Release Strategic Reserves", "macro", "Signaling", "Relieves energy pressure.", "Markets may question policy depth."),
  mk("industrial-support", "Industrial Support", "macro", "Coordination game", "Protects capacity and jobs.", "Crowds out fiscal space."),
  mk("forward-guidance", "Forward Guidance", "macro", "Credible commitment", "Improves policy transmission.", "Backfires if inconsistent with actions."),
  mk("raise-tariffs", "Raise Tariffs", "global", "Prisoner's dilemma", "Protects strategic firms now.", "Invites retaliation and price pressure."),
  mk("lower-tariffs", "Lower Tariffs", "global", "Repeated game", "Reduces imported inflation.", "May hurt protected sectors."),
  mk("sign-trade-deal", "Sign Trade Deal", "global", "Bargaining power", "Improves access and confidence.", "Requires policy concessions."),
  mk("restrict-exports", "Restrict Exports", "global", "Dominant strategy", "Prioritizes domestic supply.", "Damages reputation and partner trust."),
  mk("diversify-suppliers", "Diversify Suppliers", "global", "Value of information", "Lowers concentration risk.", "Costs rise before resilience gains."),
  mk("currency-defense", "Currency Defense", "global", "Signaling", "Supports FX stability.", "Can tighten domestic conditions."),
  mk("strategic-resource-purchase", "Strategic Resource Purchase", "global", "Bayesian beliefs", "Secures key inputs.", "Raises near-term price pressure."),
  mk("negotiate-shipping-access", "Negotiate Shipping Access", "global", "Bargaining power", "Improves flow reliability.", "Dependent on counterpart incentives."),
  mk("retaliation-de-escalation", "Retaliation De-escalation", "global", "Reputation", "Cuts escalation risk.", "Can look weak if done unilaterally."),
];

export const scenarios: Scenario[] = [
  { id: "inflation-spiral", name: "Inflation Spiral", briefing: "Energy and food costs are bleeding into wages and expectations.", objective: "Bring inflation below 48 while keeping unemployment below 52 by turn 12.", startingState: { inflation: 72, energyPrice: 70, foodPrice: 63, publicConfidence: 42, policyCredibility: 45, marketVolatility: 55 }, recommendedConcepts: ["Credible commitment", "Expected payoff", "Time inconsistency", "Best response"], pressureProfile: { inflation: 2, publicConfidence: -1, marketVolatility: 1 } },
  { id: "supply-shock", name: "Supply Shock", briefing: "Port delays and commodity squeezes are cascading through producers.", objective: "Reduce supply stress below 45 and keep fiscal space above 28 by turn 12.", startingState: { supplyStress: 75, energyPrice: 68, foodPrice: 69, fiscalSpace: 42, output: 48 }, recommendedConcepts: ["Value of information", "Coordination game", "Adverse selection", "Bargaining power"], pressureProfile: { supplyStress: 2, foodPrice: 1, energyPrice: 1 } },
  { id: "trade-war", name: "Trade War", briefing: "Tariffs rose overnight; partner signals retaliation and exporters are exposed.", objective: "Keep trade balance above 35 and market volatility below 62 by turn 12.", startingState: { tradeBalance: 40, currencyStrength: 45, marketVolatility: 58, publicConfidence: 45, output: 52 }, recommendedConcepts: ["Prisoner's dilemma", "Repeated game", "Reputation", "Signaling"], pressureProfile: { marketVolatility: 2, tradeBalance: -1, currencyStrength: -1 } },
];
