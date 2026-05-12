import crypto from "node:crypto";

export const PAYOFFS = Object.freeze({
  CC: [3, 3],
  CD: [0, 5],
  DC: [5, 0],
  DD: [1, 1],
});

export const AGENTS = Object.freeze({
  "tit-for-tat": {
    id: "tit-for-tat",
    name: "Reciprocity Engine",
    choose(history) {
      return history.length === 0 ? "C" : history.at(-1).user;
    },
  },
  greedy: {
    id: "greedy",
    name: "Greedy Optimizer",
    choose(history, rng) {
      const userCoopRate = ratio(history, (round) => round.user === "C");
      return rng() < (userCoopRate > 0.78 ? 0.55 : 0.82) ? "D" : "C";
    },
  },
  "risk-averse": {
    id: "risk-averse",
    name: "Risk-Averse Strategist",
    choose(history, rng) {
      if (history.length < 2) return rng() < 0.62 ? "C" : "D";
      const recentDefections = history.slice(-4).filter((round) => round.user === "D").length;
      return rng() < Math.max(0.18, 0.82 - recentDefections * 0.22) ? "C" : "D";
    },
  },
  mixed: {
    id: "mixed",
    name: "Mixed-Strategy Player",
    choose(_history, rng) {
      return rng() < 0.56 ? "C" : "D";
    },
  },
  grim: {
    id: "grim",
    name: "Reputation Sentinel",
    choose(history) {
      return history.some((round) => round.user === "D") ? "D" : "C";
    },
  },
});

export function createMatch({ agentId = "tit-for-tat", maxRounds = 12, discount = 0.82, seed = crypto.randomUUID() } = {}) {
  const agent = AGENTS[agentId] ?? AGENTS["tit-for-tat"];
  return {
    id: crypto.randomUUID(),
    seed,
    agentId: agent.id,
    agentName: agent.name,
    maxRounds: clamp(Number(maxRounds) || 12, 4, 30),
    discount: clamp(Number(discount) || 0.82, 0, 1),
    userScore: 0,
    aiScore: 0,
    trust: 50,
    history: [],
    status: "active",
  };
}

export function submitAction(match, userMove) {
  if (!match || match.status !== "active") throw new Error("Match is not active.");
  if (!["C", "D"].includes(userMove)) throw new Error("Move must be C or D.");
  if (match.history.length >= match.maxRounds) {
    match.status = "complete";
    return summarize(match);
  }

  const agent = AGENTS[match.agentId] ?? AGENTS["tit-for-tat"];
  const aiMove = agent.choose([...match.history], seededRng(`${match.seed}:${match.history.length}`));
  const [userPayoff, aiPayoff] = PAYOFFS[`${userMove}${aiMove}`];
  const round = { index: match.history.length + 1, user: userMove, ai: aiMove, userPayoff, aiPayoff };

  match.history.push(round);
  match.userScore += userPayoff;
  match.aiScore += aiPayoff;
  match.trust = clamp(match.trust + trustDelta(userMove, aiMove), 0, 100);
  if (match.history.length >= match.maxRounds) match.status = "complete";

  return { round, match: summarize(match), debrief: buildDebrief(match) };
}

export function summarize(match) {
  return {
    id: match.id,
    agentId: match.agentId,
    agentName: match.agentName,
    maxRounds: match.maxRounds,
    discount: match.discount,
    userScore: match.userScore,
    aiScore: match.aiScore,
    trust: match.trust,
    status: match.status,
    cooperationRate: ratio(match.history.flatMap((round) => [round.user, round.ai]), (move) => move === "C"),
    history: match.history,
  };
}

export function buildDebrief(match) {
  const userCoopRate = ratio(match.history, (round) => round.user === "C");
  const mutualCoopRate = ratio(match.history, (round) => round.user === "C" && round.ai === "C");
  const exploitationCount = match.history.filter((round) => round.user === "D" && round.ai === "C").length;
  const vulnerabilityCount = match.history.filter((round) => round.user === "C" && round.ai === "D").length;

  return {
    equilibriumFrame: "In the one-shot Prisoner's Dilemma, defection is a dominant strategy for both players even though mutual cooperation is Pareto-superior to mutual defection.",
    repeatedGameFrame: match.discount >= 0.7
      ? "Because the continuation value is high, future punishment can discipline current temptation payoffs."
      : "Because the continuation value is low, one-shot incentives remain relatively strong.",
    diagnostics: {
      userCoopRate,
      mutualCoopRate,
      exploitationCount,
      vulnerabilityCount,
    },
    nextExperiment: exploitationCount > vulnerabilityCount
      ? "Replay against Grim Trigger to test whether short-run exploitation survives permanent punishment."
      : "Replay against Mixed-Strategy Player to test how robust your cooperation rule is under noise.",
  };
}

function trustDelta(userMove, aiMove) {
  if (userMove === "C" && aiMove === "C") return 9;
  if (userMove === "D" && aiMove === "C") return -14;
  if (userMove === "C" && aiMove === "D") return -10;
  return -4;
}

function ratio(items, predicate) {
  if (!items.length) return 0;
  return items.filter(predicate).length / items.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seededRng(seed) {
  let state = crypto.createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
