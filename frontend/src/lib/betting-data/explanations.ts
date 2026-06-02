export const bettingConceptIds = [
  "implied-probability",
  "expected-value",
  "break-even-rate",
  "variance",
  "parlay-compounding-risk",
  "line-movement",
  "vig-hold",
] as const;

export type BettingConceptId = (typeof bettingConceptIds)[number];

export type BettingConceptExplanation = {
  id: BettingConceptId;
  name: string;
  shortExplanation: string;
  whyItMatters: string;
  caveats: string[];
  interpretationRules: string[];
};

export const bettingConceptExplanations: Record<BettingConceptId, BettingConceptExplanation> = {
  "implied-probability": {
    id: "implied-probability",
    name: "Implied probability",
    shortExplanation: "The probability suggested by the odds before deeper context is added.",
    whyItMatters: "It translates a price into plain language, so +150 becomes roughly 40% before adjusting for market hold.",
    caveats: [
      "The implied number includes sportsbook pricing and may not represent a fair probability.",
      "Markets can move quickly after injuries, weather, lineups, or liquidity changes.",
    ],
    interpretationRules: [
      "Convert the odds first, then ask whether the price includes extra hold.",
      "Compare prices across outcomes before treating one side as a clean probability.",
    ],
  },
  "expected-value": {
    id: "expected-value",
    name: "Expected value",
    shortExplanation: "A long-run arithmetic frame for comparing a probability estimate with a price.",
    whyItMatters: "It separates a possible payout from the question of whether the price is sensible.",
    caveats: [
      "Expected value depends on a probability estimate that may be wrong.",
      "A positive-looking estimate can still lose often in small samples.",
    ],
    interpretationRules: [
      "Treat EV as an audit question, not an instruction.",
      "Write down the probability assumption before reading the payout.",
    ],
  },
  "break-even-rate": {
    id: "break-even-rate",
    name: "Break-even rate",
    shortExplanation: "The hit rate a price asks for before accounting for extra costs or uncertainty.",
    whyItMatters: "It helps users see how often an outcome would need to occur for the price to make arithmetic sense.",
    caveats: [
      "Break-even math does not say whether the outcome is likely.",
      "Vig and stale lines can make a clean break-even number look too tidy.",
    ],
    interpretationRules: [
      "Use break-even as the first translation, not the final conclusion.",
      "If the required rate surprises you, slow down and inspect the market.",
    ],
  },
  variance: {
    id: "variance",
    name: "Variance",
    shortExplanation: "The normal messiness between probability and observed outcomes.",
    whyItMatters: "Even reasonable analysis can produce losing outcomes for long stretches.",
    caveats: [
      "Short runs can be noisy enough to hide whether the process was sensible.",
      "High-variance formats can make risk feel smaller than it is.",
    ],
    interpretationRules: [
      "Separate process review from a single result.",
      "Avoid chasing losses after noisy outcomes.",
    ],
  },
  "parlay-compounding-risk": {
    id: "parlay-compounding-risk",
    name: "Parlay compounding risk",
    shortExplanation: "Each added leg multiplies the chance that at least one required outcome fails.",
    whyItMatters: "Parlays can look exciting because payout grows, while probability often shrinks faster than intuition expects.",
    caveats: [
      "Correlated legs can make simple multiplication misleading.",
      "Books can price parlays with rules and limits that simple math does not capture.",
    ],
    interpretationRules: [
      "Multiply probabilities before looking at the payout.",
      "Ask whether the legs are independent before trusting the simple estimate.",
    ],
  },
  "line-movement": {
    id: "line-movement",
    name: "Line movement",
    shortExplanation: "The way a price or point spread changes over time.",
    whyItMatters: "Movement can flag new information, liquidity shifts, or market disagreement worth investigating.",
    caveats: [
      "A moved line does not reveal why it moved.",
      "Late movement can reflect limits, news, or book-specific risk management.",
    ],
    interpretationRules: [
      "Compare movement with timestamps and known context.",
      "Do not assume direction means correctness.",
    ],
  },
  "vig-hold": {
    id: "vig-hold",
    name: "Vig / hold",
    shortExplanation: "The extra margin built into a market when implied probabilities sum above 100%.",
    whyItMatters: "Hold shows why two sides of a market can both look expensive after conversion.",
    caveats: [
      "Hold approximation is cleaner for simple markets than for props or derivative markets.",
      "Different books can price the same event with different hold.",
    ],
    interpretationRules: [
      "Sum the implied probabilities across the market.",
      "Treat a high hold as a reason to ask more questions before trusting the price.",
    ],
  },
};
