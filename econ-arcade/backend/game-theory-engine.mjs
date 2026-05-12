export const scenarioCatalog = Object.freeze([
  {
    id: "utility-explorer",
    world: "Rational Choice",
    concepts: ["preferences", "utility", "rational choice"],
    inputs: { income: 70, xShare: 55, alpha: 0.58 },
  },
  {
    id: "risk-lottery-engine",
    world: "Rational Choice",
    concepts: ["risk", "lotteries", "expected utility", "St. Petersburg paradox"],
    inputs: { prize: 350, probability: 0.35, riskAversion: 0.55 },
  },
  {
    id: "cournot-market",
    world: "Strategic Conflict",
    concepts: ["Cournot competition", "best response", "Nash equilibrium", "tacit collusion"],
    inputs: { quantity: 42, rivalAggression: 0.55, cost: 22 },
  },
  {
    id: "auction-simulator",
    world: "Information Warfare",
    concepts: ["first-price auction", "winner's curse", "bid shading", "common value"],
    inputs: { signal: 120, shade: 0.22, commonValueRisk: 0.45 },
  },
  {
    id: "education-signaling",
    world: "Dynamic Incomplete Information",
    concepts: ["signaling", "sequential equilibrium", "pooling", "separating"],
    inputs: { productivity: 72, signal: 62, costGap: 0.68 },
  },
  {
    id: "sequential-bargaining",
    world: "Dynamic Strategy",
    concepts: ["bargaining", "backward induction", "outside option", "discounting"],
    inputs: { offer: 42, patience: 0.64, outsideOption: 24 },
  },
  {
    id: "mechanism-sandbox",
    world: "Mechanism Design",
    concepts: ["incentive compatibility", "VCG mechanisms", "truthful reporting"],
    inputs: { efficiencyWeight: 0.72, penalty: 0.48, privateGain: 0.56 },
  },
]);

export function simulateScenario(scenarioId, overrides = {}) {
  switch (scenarioId) {
    case "utility-explorer": return simulateUtility(overrides);
    case "risk-lottery-engine": return simulateLottery(overrides);
    case "cournot-market": return simulateCournot(overrides);
    case "auction-simulator": return simulateAuction(overrides);
    case "education-signaling": return simulateSignaling(overrides);
    case "sequential-bargaining": return simulateBargaining(overrides);
    case "mechanism-sandbox": return simulateMechanism(overrides);
    default: throw new Error(`Unknown scenario: ${scenarioId}`);
  }
}

function simulateUtility({ income = 70, xShare = 55, alpha = 0.58 } = {}) {
  const xUnits = income * xShare / 100;
  const yUnits = income - xUnits;
  const utility = xUnits ** alpha * yUnits ** (1 - alpha);
  const preferenceDistance = Math.abs(xShare / 100 - alpha);
  return {
    scenarioId: "utility-explorer",
    outputs: { xUnits, yUnits, utility, preferenceDistance },
    debrief: preferenceDistance < 0.08
      ? "The bundle is close to the preference-implied optimum under a Cobb-Douglas utility model."
      : "The bundle leaves utility on the table because spending does not match marginal preference pressure.",
    formalConcept: "Utility maximization under a budget constraint equalizes marginal utility per dollar.",
  };
}

function simulateLottery({ prize = 350, probability = 0.35, riskAversion = 0.55 } = {}) {
  const expectedValue = prize * probability;
  const expectedUtility = probability * Math.sqrt(prize);
  const certaintyEquivalent = expectedUtility ** 2 * (1 - riskAversion * 0.45);
  return {
    scenarioId: "risk-lottery-engine",
    outputs: { expectedValue, expectedUtility, certaintyEquivalent, riskPremium: expectedValue - certaintyEquivalent },
    debrief: "Risk aversion makes the certainty equivalent lower than expected value; the difference is the risk premium.",
    formalConcept: "Expected utility evaluates utility over possible outcomes rather than utility at expected dollars.",
  };
}

function simulateCournot({ quantity = 42, rivalAggression = 0.55, cost = 22 } = {}) {
  const rivalQuantity = Math.max(0, 62 - quantity * 0.28 + rivalAggression * 42);
  const totalQuantity = quantity + rivalQuantity;
  const price = Math.max(2, 120 - totalQuantity);
  const profit = (price - cost) * quantity;
  const rivalProfit = (price - cost) * rivalQuantity;
  return {
    scenarioId: "cournot-market",
    outputs: { quantity, rivalQuantity, totalQuantity, price, profit, rivalProfit },
    debrief: totalQuantity > 95
      ? "Aggressive quantities pushed price down, illustrating how non-cooperative best responses can erode joint profits."
      : "Quantities are restrained enough to preserve price; repeated interaction would determine whether that restraint is credible.",
    formalConcept: "Cournot equilibrium is a fixed point in firms' best-response quantity functions.",
  };
}

function simulateAuction({ signal = 120, shade = 0.22, commonValueRisk = 0.45 } = {}) {
  const bid = signal * (1 - shade);
  const rivalBid = 88 + commonValueRisk * 55;
  const correctedValue = signal - commonValueRisk * 28;
  const wins = bid >= rivalBid;
  const surplus = wins ? correctedValue - bid : 0;
  return {
    scenarioId: "auction-simulator",
    outputs: { bid, rivalBid, correctedValue, wins, surplus },
    debrief: wins && surplus < 0
      ? "Winning revealed that your signal may have been too optimistic; this is winner's curse exposure."
      : "Bid shading traded off winning probability against surplus protection.",
    formalConcept: "First-price and common-value auctions require strategic bid shading and conditioning on the information conveyed by winning.",
  };
}

function simulateSignaling({ productivity = 72, signal = 62, costGap = 0.68 } = {}) {
  const employerBelief = Math.min(0.95, 0.2 + signal / 100 * 0.68 + costGap * 0.12);
  const wage = 40 + employerBelief * 75;
  const signalCost = signal * (productivity > 55 ? 0.42 : 0.42 + costGap);
  const payoff = wage - signalCost;
  return {
    scenarioId: "education-signaling",
    outputs: { employerBelief, wage, signalCost, payoff, separates: signal > 55 && costGap > 0.45 },
    debrief: signal > 55 && costGap > 0.45
      ? "The costly signal can separate types because mimicry is expensive for lower-productivity agents."
      : "The environment tends toward pooling because the signal is too cheap or too weak to distinguish types.",
    formalConcept: "Separating equilibria depend on incentive constraints that make mimicry unattractive for low types.",
  };
}

function simulateBargaining({ offer = 42, patience = 0.64, outsideOption = 24 } = {}) {
  const threshold = outsideOption + patience * 32;
  const accepted = offer >= threshold;
  const proposerShare = accepted ? 100 - offer : 100 - outsideOption - 18;
  return {
    scenarioId: "sequential-bargaining",
    outputs: { threshold, accepted, proposerShare },
    debrief: accepted
      ? "The offer clears the counterpart's continuation value, avoiding costly delay."
      : "Rejection is sequentially rational because patience and outside options make waiting valuable.",
    formalConcept: "Backward induction links acceptable offers to continuation values and discount factors.",
  };
}

function simulateMechanism({ efficiencyWeight = 0.72, penalty = 0.48, privateGain = 0.56 } = {}) {
  const truthfulUtility = efficiencyWeight * 78;
  const lyingUtility = efficiencyWeight * 42 + privateGain * 100 - penalty * 85;
  const incentiveCompatibilityMargin = truthfulUtility - lyingUtility;
  return {
    scenarioId: "mechanism-sandbox",
    outputs: { truthfulUtility, lyingUtility, incentiveCompatibilityMargin, incentiveCompatible: incentiveCompatibilityMargin >= 0 },
    debrief: incentiveCompatibilityMargin >= 0
      ? "Truth-telling is optimal under this rule because manipulation is not payoff-improving."
      : "The mechanism is manipulable because a strategic agent benefits from misreporting private information.",
    formalConcept: "Incentive compatibility requires truthful reporting to maximize each type's utility.",
  };
}
