const PAYOFFS = {
  CC: [3, 3],
  CD: [0, 5],
  DC: [5, 0],
  DD: [1, 1],
};

const AGENTS = [
  {
    id: "tit-for-tat",
    name: "Reciprocity Engine",
    description: "Cooperates first, then mirrors your previous move. Excellent for learning how trust can be rebuilt or destroyed.",
    move(history) {
      return history.length === 0 ? "C" : history[history.length - 1].user;
    },
  },
  {
    id: "greedy",
    name: "Greedy Optimizer",
    description: "Searches for short-run exploitation and defects often unless cooperation has been extremely profitable.",
    move(history) {
      const userCoopRate = rate(history.map((round) => round.user === "C"));
      return Math.random() < (userCoopRate > 0.78 ? 0.55 : 0.82) ? "D" : "C";
    },
  },
  {
    id: "risk-averse",
    name: "Risk-Averse Strategist",
    description: "Starts carefully, forgives slowly, and only cooperates when your reputation makes exploitation unlikely.",
    move(history) {
      if (history.length < 2) return Math.random() < 0.62 ? "C" : "D";
      const recent = history.slice(-4);
      const recentDefections = recent.filter((round) => round.user === "D").length;
      return Math.random() < Math.max(0.18, 0.82 - recentDefections * 0.22) ? "C" : "D";
    },
  },
  {
    id: "mixed",
    name: "Mixed-Strategy Player",
    description: "Randomizes deliberately, forcing you to reason probabilistically rather than narratively.",
    move() {
      return Math.random() < 0.56 ? "C" : "D";
    },
  },
  {
    id: "grim",
    name: "Reputation Sentinel",
    description: "Cooperates until your first defection, then permanently punishes. A harsh model of trigger strategies.",
    move(history) {
      return history.some((round) => round.user === "D") ? "D" : "C";
    },
  },
];

const state = {
  history: [],
  userScore: 0,
  aiScore: 0,
  trust: 50,
  maxRounds: 12,
  discount: 0.82,
  agent: AGENTS[0],
};

const el = {
  agentSelect: document.getElementById("agentSelect"),
  roundInput: document.getElementById("roundInput"),
  discountInput: document.getElementById("discountInput"),
  discountValue: document.getElementById("discountValue"),
  resetButton: document.getElementById("resetButton"),
  cooperateButton: document.getElementById("cooperateButton"),
  defectButton: document.getElementById("defectButton"),
  roundTitle: document.getElementById("roundTitle"),
  agentBrief: document.getElementById("agentBrief"),
  roundOutcome: document.getElementById("roundOutcome"),
  userScore: document.getElementById("userScore"),
  aiScore: document.getElementById("aiScore"),
  coopRate: document.getElementById("coopRate"),
  trustIndex: document.getElementById("trustIndex"),
  historyChart: document.getElementById("historyChart"),
  feedbackText: document.getElementById("feedbackText"),
  insightStack: document.getElementById("insightStack"),
};

function rate(values) {
  if (!values.length) return 0;
  return values.filter(Boolean).length / values.length;
}

function label(move) {
  return move === "C" ? "cooperate" : "defect";
}

function setupAgents() {
  AGENTS.forEach((agent) => {
    const option = document.createElement("option");
    option.value = agent.id;
    option.textContent = agent.name;
    el.agentSelect.appendChild(option);
  });
}

function resetMatch() {
  state.history = [];
  state.userScore = 0;
  state.aiScore = 0;
  state.trust = 50;
  state.maxRounds = clamp(Number(el.roundInput.value) || 12, 4, 30);
  state.discount = Number(el.discountInput.value) / 100;
  state.agent = AGENTS.find((agent) => agent.id === el.agentSelect.value) || AGENTS[0];
  el.roundOutcome.textContent = "Make a move to reveal the opponent's action and update the strategic trace.";
  clearMatrixHighlight();
  render();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function choose(userMove) {
  if (state.history.length >= state.maxRounds) return;
  const aiMove = state.agent.move([...state.history]);
  const key = `${userMove}${aiMove}`;
  const [userPayoff, aiPayoff] = PAYOFFS[key];
  state.userScore += userPayoff;
  state.aiScore += aiPayoff;
  state.trust = clamp(state.trust + trustDelta(userMove, aiMove), 0, 100);
  state.history.push({ user: userMove, ai: aiMove, userPayoff, aiPayoff });
  highlightCell(key);
  el.roundOutcome.innerHTML = `You chose <strong>${label(userMove)}</strong>; ${state.agent.name} chose <strong>${label(aiMove)}</strong>. This round paid <strong>${userPayoff}</strong> to you and <strong>${aiPayoff}</strong> to the AI.`;
  render();
}

function trustDelta(userMove, aiMove) {
  if (userMove === "C" && aiMove === "C") return 9;
  if (userMove === "D" && aiMove === "C") return -14;
  if (userMove === "C" && aiMove === "D") return -10;
  return -4;
}

function clearMatrixHighlight() {
  ["cellCC", "cellCD", "cellDC", "cellDD"].forEach((id) => document.getElementById(id).classList.remove("active"));
}

function highlightCell(key) {
  clearMatrixHighlight();
  document.getElementById(`cell${key}`).classList.add("active");
}

function render() {
  const round = Math.min(state.history.length + 1, state.maxRounds);
  const complete = state.history.length >= state.maxRounds;
  el.roundTitle.textContent = complete ? "Match complete" : `Round ${round} of ${state.maxRounds}`;
  el.agentBrief.textContent = `${state.agent.description} Continuation value δ = ${state.discount.toFixed(2)}; higher values make future punishment more strategically important.`;
  el.userScore.textContent = state.userScore;
  el.aiScore.textContent = state.aiScore;
  el.trustIndex.textContent = Math.round(state.trust);
  el.coopRate.textContent = `${Math.round(rate(state.history.flatMap((roundItem) => [roundItem.user === "C", roundItem.ai === "C"])) * 100)}%`;
  el.cooperateButton.disabled = complete;
  el.defectButton.disabled = complete;
  renderHistory();
  renderFeedback(complete);
}

function renderHistory() {
  el.historyChart.innerHTML = "";
  const rounds = state.history.length ? state.history : Array.from({ length: state.maxRounds }, () => null);
  rounds.forEach((roundItem, index) => {
    const bar = document.createElement("div");
    bar.className = "history-bar";
    if (!roundItem) {
      bar.style.opacity = "0.16";
      bar.style.height = "18%";
      bar.title = `Future round ${index + 1}`;
    } else {
      const bothCoop = roundItem.user === "C" && roundItem.ai === "C";
      const bothDefect = roundItem.user === "D" && roundItem.ai === "D";
      bar.classList.toggle("defected", bothDefect);
      bar.classList.toggle("mixed", !bothCoop && !bothDefect);
      bar.style.height = `${24 + ((roundItem.userPayoff + roundItem.aiPayoff) / 8) * 70}%`;
      bar.title = `Round ${index + 1}: you ${label(roundItem.user)}, AI ${label(roundItem.ai)}`;
    }
    el.historyChart.appendChild(bar);
  });
}

function renderFeedback(complete) {
  if (!state.history.length) {
    el.feedbackText.textContent = "The one-shot game rewards defection no matter what the other player does. The learning question is whether repeated interaction, memory, and future payoffs can change the effective incentives.";
    setInsights([
      ["Dominant strategy pressure", "Defection gives 5 instead of 3 when the AI cooperates, and 1 instead of 0 when it defects."],
      ["Repeated-game opening", "If future rounds are valuable enough, losing cooperation tomorrow can outweigh exploiting today."],
    ]);
    return;
  }

  const userCoop = rate(state.history.map((round) => round.user === "C"));
  const mutualCoop = rate(state.history.map((round) => round.user === "C" && round.ai === "C"));
  const exploited = state.history.filter((round) => round.user === "C" && round.ai === "D").length;
  const exploitedAi = state.history.filter((round) => round.user === "D" && round.ai === "C").length;
  const status = complete ? "The match is complete." : "The match is still live.";

  el.feedbackText.textContent = `${status} You cooperated in ${Math.round(userCoop * 100)}% of rounds and reached mutual cooperation in ${Math.round(mutualCoop * 100)}%. Your decisions are creating a reputation signal that this AI uses to estimate whether cooperation is safe.`;

  const insights = [];
  if (exploitedAi > exploited) {
    insights.push(["Short-run extraction", "You captured temptation payoffs more often than you were exploited. Watch for retaliatory strategies that make those gains expensive later."]);
  } else if (exploited > exploitedAi) {
    insights.push(["Exposure to exploitation", "Your cooperative moves were punished more often than you exploited the AI. In noisy environments, forgiveness needs boundaries."]);
  } else {
    insights.push(["Balanced strategic pressure", "Neither side has dominated the temptation channel yet, so the relationship can still move toward trust or punishment."]);
  }

  insights.push(state.discount > 0.7
    ? ["High continuation value", "With δ above 0.70, future losses matter. Trigger strategies and credible reciprocity become more powerful."]
    : ["Low continuation value", "With a low δ, the future is cheap. One-shot Nash logic becomes harder to escape."]);

  if (state.agent.id === "grim" && state.history.some((round) => round.user === "D")) {
    insights.push(["Grim trigger activated", "A single defection changed the continuation game. This demonstrates how reputation rules can sustain cooperation but also lock in inefficient punishment."]);
  }

  setInsights(insights);
}

function setInsights(items) {
  el.insightStack.innerHTML = "";
  items.forEach(([title, copy]) => {
    const card = document.createElement("article");
    card.innerHTML = `<h3>${title}</h3><p>${copy}</p>`;
    el.insightStack.appendChild(card);
  });
}

setupAgents();
render();

el.cooperateButton.addEventListener("click", () => choose("C"));
el.defectButton.addEventListener("click", () => choose("D"));
el.resetButton.addEventListener("click", resetMatch);
el.agentSelect.addEventListener("change", resetMatch);
el.roundInput.addEventListener("change", resetMatch);
el.discountInput.addEventListener("input", () => {
  state.discount = Number(el.discountInput.value) / 100;
  el.discountValue.textContent = state.discount.toFixed(2);
  render();
});
