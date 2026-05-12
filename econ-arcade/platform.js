const worlds = [
  {
    id: "rational-choice",
    title: "World 1 — Rational Choice",
    description: "Build intuition for preferences, utility, risk, lotteries, expected utility, paradoxes, discounting, backward induction, and value of information before formal notation arrives.",
    tags: ["preferences", "utility", "risk", "time", "information"],
    modules: [
      ["Utility Explorer", "Choose bundles under constraints and watch inferred utility curves update."],
      ["Risk Engine", "Price lotteries, compare expected value and expected utility, and reveal risk aversion."],
      ["St. Petersburg Lab", "Stress-test expected value reasoning with heavy-tailed payouts."],
      ["Time Preference Lab", "Tune patience, commitment devices, and backward-induction choices."],
      ["Value of Information", "Buy or skip noisy signals before committing to decisions."],
    ],
  },
  {
    id: "strategic-conflict",
    title: "World 2 — Strategic Conflict",
    description: "Study complete-information static games through payoff matrices, dominance, rationalizability, Nash equilibrium, mixed strategies, market competition, and voting environments.",
    tags: ["normal form", "dominance", "Nash", "mixed strategies", "markets"],
    modules: [
      ["Prisoner’s Dilemma Arena", "Play repeated cooperation and punishment against human or AI strategies."],
      ["Cournot Market Simulator", "Set quantities, observe price clearing, and learn best responses."],
      ["RPS Exploitability", "Randomize to make opponents indifferent and audit your predictability."],
      ["Dominance Eliminator", "Remove dominated strategies and visualize rationalizable sets."],
      ["Political Voting Simulator", "Experiment with strategic voting, agenda control, and coalition incentives."],
    ],
  },
  {
    id: "dynamic-strategy",
    title: "World 3 — Dynamic Strategy",
    description: "Move from simultaneous choices to game trees, sequential rationality, repeated games, bargaining, reputation, subgame perfection, and tacit collusion.",
    tags: ["game trees", "subgame perfection", "reputation", "bargaining", "collusion"],
    modules: [
      ["Game Tree Console", "Traverse extensive-form games and solve by backward induction."],
      ["Sequential Bargaining", "Make alternating offers under deadlines and outside options."],
      ["Reputation Systems", "Build, exploit, lose, and repair credibility over repeated interactions."],
      ["Deterrence Games", "Test threats, credibility, and costly commitments."],
      ["Tacit Collusion Lab", "Observe when repeated market games sustain cooperation without explicit communication."],
    ],
  },
  {
    id: "information-warfare",
    title: "World 4 — Information Warfare",
    description: "Introduce types, beliefs, posterior updates, auctions, winner’s curse, adverse selection, screening, and Bayesian games through hidden-information play.",
    tags: ["Bayesian games", "auctions", "adverse selection", "winner’s curse", "beliefs"],
    modules: [
      ["Auction Simulator", "Bid in first-price, second-price, English, Dutch, and common-value auctions."],
      ["Adverse Selection Market", "Trade lemons and high-quality goods under asymmetric information."],
      ["Bayesian Belief Lab", "Update priors into posteriors after noisy signals."],
      ["Winner’s Curse Drill", "Compete under common values and learn bid shading from painful wins."],
      ["Screening Mechanisms", "Design menus that separate hidden types."],
    ],
  },
  {
    id: "signals-mechanisms",
    title: "World 5 — Signaling & Mechanism Design",
    description: "Design, test, and break rules. Learn sequential equilibrium, signaling, education signals, cheap talk, VCG mechanisms, incentive compatibility, and market design.",
    tags: ["signaling", "cheap talk", "VCG", "incentive compatibility", "mechanism design"],
    modules: [
      ["Education Signaling", "Choose costly credentials and watch employers update beliefs."],
      ["Cheap Talk Channel", "Send non-binding messages when preferences are aligned or opposed."],
      ["Build Your Own Auction", "Edit rules and test agent bidding incentives."],
      ["VCG Mechanism Lab", "Allocate goods and compute externality payments."],
      ["Market Mechanism Arena", "Compete to maximize welfare subject to strategic misreporting."],
    ],
  },
];

const engines = {
  utility: {
    world: "World 1 — Rational Choice",
    title: "Utility Explorer",
    brief: "Allocate a budget between two goods. The visualization shows diminishing marginal utility and the debrief explains what your bundle implies about preferences.",
    controls: [
      { id: "income", label: "Budget", type: "range", min: 20, max: 120, value: 70 },
      { id: "x", label: "Good X share", type: "range", min: 5, max: 95, value: 55 },
      { id: "alpha", label: "Preference for X", type: "range", min: 10, max: 90, value: 58 },
    ],
    simulate(values) {
      const income = values.income;
      const xUnits = (income * values.x) / 100;
      const yUnits = income - xUnits;
      const alpha = values.alpha / 100;
      const utility = Math.pow(xUnits, alpha) * Math.pow(yUnits, 1 - alpha);
      const balancePenalty = Math.abs(values.x / 100 - alpha);
      return {
        visualTitle: "Utility surface slice",
        bars: [
          ["Good X", values.x, `${xUnits.toFixed(1)} units`],
          ["Good Y", 100 - values.x, `${yUnits.toFixed(1)} units`],
          ["Preference fit", Math.max(5, (1 - balancePenalty) * 100), `${Math.round((1 - balancePenalty) * 100)}%`],
        ],
        metrics: [["Utility index", utility.toFixed(2)], ["Implied MRS pressure", balancePenalty < 0.08 ? "near optimum" : "rebalance"], ["Budget used", income.toFixed(0)]],
        debrief: "Your chosen bundle reveals a tradeoff: utility rises when spending aligns with the preference weight, but concavity makes extreme bundles costly unless preferences are extreme.",
        formal: "Cobb-Douglas utility creates smooth indifference curves. Optimal choice equalizes marginal utility per dollar across goods.",
        replay: "Move the preference slider first, then rebalance the bundle. Notice that the optimal action changes only when preferences or constraints change.",
      };
    },
  },
  lottery: {
    world: "World 1 — Rational Decision Making Under Risk",
    title: "Risk & Lottery Engine",
    brief: "Price a risky lottery against a certain payment. The engine compares expected value, expected utility, risk premium, and St. Petersburg-style tail intuition.",
    controls: [
      { id: "prize", label: "High payoff", type: "range", min: 50, max: 1000, value: 350 },
      { id: "probability", label: "Win probability", type: "range", min: 5, max: 95, value: 35 },
      { id: "riskAversion", label: "Risk aversion", type: "range", min: 5, max: 95, value: 55 },
    ],
    simulate(values) {
      const p = values.probability / 100;
      const ev = p * values.prize;
      const rho = values.riskAversion / 100;
      const eu = p * Math.sqrt(values.prize) + (1 - p) * 0;
      const certaintyEquivalent = Math.pow(eu, 2) * (1 - rho * 0.45);
      return {
        visualTitle: "Expected value vs certainty equivalent",
        bars: [["Expected value", Math.min(100, ev / 7), `$${ev.toFixed(0)}`], ["Certainty equivalent", Math.min(100, certaintyEquivalent / 7), `$${certaintyEquivalent.toFixed(0)}`], ["Risk premium", Math.min(100, ((ev - certaintyEquivalent) / Math.max(ev, 1)) * 100), `$${Math.max(0, ev - certaintyEquivalent).toFixed(0)}`]],
        metrics: [["EV", `$${ev.toFixed(0)}`], ["Certainty equivalent", `$${certaintyEquivalent.toFixed(0)}`], ["Decision", certaintyEquivalent > ev * 0.75 ? "accept risk" : "prefer certainty"]],
        debrief: "A risk-averse player prices the same lottery below its expected value because volatility lowers expected utility. The gap is the risk premium.",
        formal: "Expected utility evaluates utility of outcomes, not utility of expected dollars. Concavity produces insurance demand and lottery discounts.",
        replay: "Raise the payoff while lowering probability to recreate heavy-tail paradoxes: expected value can rise while willingness to pay remains bounded.",
      };
    },
  },
  cournot: {
    world: "World 2 — Static Games of Complete Information",
    title: "Cournot Market Simulator",
    brief: "Set your quantity while an AI rival chooses output. Market price clears from inverse demand, revealing best-response pressure and collusion temptation.",
    controls: [
      { id: "quantity", label: "Your output", type: "range", min: 0, max: 100, value: 42 },
      { id: "rivalAggression", label: "Rival aggression", type: "range", min: 10, max: 90, value: 55 },
      { id: "cost", label: "Unit cost", type: "range", min: 5, max: 55, value: 22 },
    ],
    simulate(values) {
      const rivalQ = Math.max(0, 62 - values.quantity * 0.28 + values.rivalAggression * 0.42);
      const totalQ = values.quantity + rivalQ;
      const price = Math.max(2, 120 - totalQ);
      const profit = (price - values.cost) * values.quantity;
      const rivalProfit = (price - values.cost) * rivalQ;
      const collusiveQ = Math.max(0, (120 - values.cost) / 4);
      return {
        visualTitle: "Quantity competition and price clearing",
        bars: [["Your output", values.quantity, values.quantity.toFixed(0)], ["Rival output", rivalQ, rivalQ.toFixed(0)], ["Market price", price, `$${price.toFixed(0)}`], ["Collusive benchmark", collusiveQ, collusiveQ.toFixed(0)]],
        metrics: [["Your profit", `$${profit.toFixed(0)}`], ["Rival profit", `$${rivalProfit.toFixed(0)}`], ["Total quantity", totalQ.toFixed(0)]],
        debrief: totalQ > collusiveQ * 2 ? "Competition expanded total output and pushed price down. This is the Cournot tension: unilateral expansion can be tempting even when joint restriction would raise combined profit." : "Output is near a collusive range. In repeated play this can be stable only if deviations are detected and punished.",
        formal: "Cournot-Nash equilibrium occurs where each firm’s quantity is a best response to the rival’s quantity given inverse demand and marginal cost.",
        replay: "Increase rival aggression and see how your best response shifts. Then lower costs to watch equilibrium quantities expand.",
      };
    },
  },
  auction: {
    world: "World 4 — Static Games of Incomplete Information",
    title: "Auction Simulator",
    brief: "Bid with a private signal in a first-price or second-price auction. The engine reveals winner’s curse exposure, bid shading, and format incentives.",
    controls: [
      { id: "signal", label: "Your value signal", type: "range", min: 20, max: 200, value: 120 },
      { id: "shade", label: "Bid shading", type: "range", min: 0, max: 60, value: 22 },
      { id: "common", label: "Common-value risk", type: "range", min: 0, max: 100, value: 45 },
    ],
    simulate(values) {
      const bid = values.signal * (1 - values.shade / 100);
      const rivalBid = 88 + values.common * 0.55;
      const estimatedValue = values.signal - values.common * 0.28;
      const win = bid >= rivalBid;
      const surplus = win ? estimatedValue - bid : 0;
      return {
        visualTitle: "Auction dynamics",
        bars: [["Your signal", Math.min(100, values.signal / 2), `$${values.signal}`], ["Your bid", Math.min(100, bid / 2), `$${bid.toFixed(0)}`], ["Rival top bid", Math.min(100, rivalBid / 2), `$${rivalBid.toFixed(0)}`], ["Estimated value", Math.min(100, estimatedValue / 2), `$${estimatedValue.toFixed(0)}`]],
        metrics: [["Outcome", win ? "win" : "lose"], ["Expected surplus", `$${surplus.toFixed(0)}`], ["Winner’s curse risk", values.common > 65 && win ? "high" : "managed"]],
        debrief: win && surplus < 0 ? "You won by bidding above the corrected common value estimate. That is the winner’s curse in action: winning is bad news about your signal." : "Your bid balanced winning probability against surplus. Shading protects margin but can surrender efficient wins.",
        formal: "First-price auctions incentivize bid shading; common-value auctions require conditioning on the information revealed by winning.",
        replay: "Raise common-value risk and reduce shading. Watch how winning becomes less attractive when your win reveals others had lower signals.",
      };
    },
  },
  signaling: {
    world: "World 5 — Dynamic Games of Incomplete Information",
    title: "Education Signaling Game",
    brief: "Choose signal intensity as a hidden-type applicant. Employers update beliefs and decide wages; signal costs determine pooling or separating incentives.",
    controls: [
      { id: "typeQuality", label: "Your productivity", type: "range", min: 10, max: 100, value: 72 },
      { id: "signal", label: "Education signal", type: "range", min: 0, max: 100, value: 62 },
      { id: "costGap", label: "Low-type cost gap", type: "range", min: 0, max: 100, value: 68 },
    ],
    simulate(values) {
      const employerBelief = Math.min(95, 20 + values.signal * 0.68 + values.costGap * 0.12);
      const wage = 40 + employerBelief * 0.75;
      const signalCost = values.signal * (values.typeQuality > 55 ? 0.42 : 0.42 + values.costGap / 100);
      const payoff = wage - signalCost;
      const separating = values.signal > 55 && values.costGap > 45;
      return {
        visualTitle: "Belief update and signaling cost",
        bars: [["Employer belief", employerBelief, `${employerBelief.toFixed(0)}% high type`], ["Wage offer", Math.min(100, wage), `$${wage.toFixed(0)}`], ["Signal cost", Math.min(100, signalCost), `$${signalCost.toFixed(0)}`], ["Net payoff", Math.max(0, Math.min(100, payoff)), `$${payoff.toFixed(0)}`]],
        metrics: [["Equilibrium tendency", separating ? "separating" : "pooling/mimicry"], ["Applicant payoff", `$${payoff.toFixed(0)}`], ["Credibility", values.costGap > 50 ? "costly" : "weak"]],
        debrief: separating ? "The signal is costly enough for low types that employer beliefs can separate applicants. Education works here as a credible signal, not just a productivity input." : "The signal is cheap enough or weak enough that types can pool. Employers should discount the message because mimicry is plausible.",
        formal: "A separating equilibrium requires incentive constraints: high types prefer signaling and low types prefer not to mimic.",
        replay: "Lower the cost gap and observe how the same credential loses informational content when low types can imitate cheaply.",
      };
    },
  },
  bargaining: {
    world: "World 3 — Dynamic Games of Complete Information",
    title: "Sequential Bargaining Table",
    brief: "Make an offer under discounting and outside options. The debrief links patience and credible alternatives to bargaining power.",
    controls: [
      { id: "offer", label: "Your share offer to them", type: "range", min: 5, max: 95, value: 42 },
      { id: "patience", label: "Their patience", type: "range", min: 5, max: 95, value: 64 },
      { id: "outside", label: "Their outside option", type: "range", min: 0, max: 70, value: 24 },
    ],
    simulate(values) {
      const acceptanceThreshold = values.outside + values.patience * 0.32;
      const accepted = values.offer >= acceptanceThreshold;
      const yourShare = accepted ? 100 - values.offer : 100 - values.outside - 18;
      return {
        visualTitle: "Offer, outside option, and delay cost",
        bars: [["Offer to counterpart", values.offer, `${values.offer}%`], ["Acceptance threshold", acceptanceThreshold, `${acceptanceThreshold.toFixed(0)}%`], ["Your expected share", yourShare, `${yourShare.toFixed(0)}%`], ["Delay pressure", 100 - values.patience, `${100 - values.patience}%`]],
        metrics: [["Response", accepted ? "accept" : "reject/counter"], ["Your expected share", `${yourShare.toFixed(0)}%`], ["Counterparty power", values.outside + values.patience > 95 ? "strong" : "moderate"]],
        debrief: accepted ? "The offer clears their continuation value. You preserved surplus by avoiding delay while still extracting a share." : "The offer is below their continuation value. Rejection is sequentially rational when patience and outside options make waiting attractive.",
        formal: "Alternating-offer bargaining outcomes depend on discount factors and outside options. Backward induction pins down acceptable offers near continuation values.",
        replay: "Increase their outside option, then find the minimum offer that still gets accepted. That point is the bargaining power shift.",
      };
    },
  },
  mechanism: {
    world: "World 5 — Mechanism Design",
    title: "Incentive Compatibility Sandbox",
    brief: "Tune allocation weight and transfer penalties to test whether agents prefer truthful reporting or strategic misrepresentation.",
    controls: [
      { id: "efficiency", label: "Efficiency weight", type: "range", min: 0, max: 100, value: 72 },
      { id: "penalty", label: "Misreport penalty", type: "range", min: 0, max: 100, value: 48 },
      { id: "privateGain", label: "Private gain from lying", type: "range", min: 0, max: 100, value: 56 },
    ],
    simulate(values) {
      const truthfulUtility = values.efficiency * 0.78;
      const lyingUtility = values.efficiency * 0.42 + values.privateGain - values.penalty * 0.85;
      const icMargin = truthfulUtility - lyingUtility;
      return {
        visualTitle: "Truthful vs strategic reporting",
        bars: [["Truthful utility", Math.max(0, truthfulUtility), truthfulUtility.toFixed(0)], ["Misreport utility", Math.max(0, lyingUtility), lyingUtility.toFixed(0)], ["IC margin", Math.max(0, Math.min(100, 50 + icMargin)), icMargin.toFixed(0)], ["Welfare weight", values.efficiency, `${values.efficiency}%`]],
        metrics: [["Incentive compatible", icMargin >= 0 ? "yes" : "no"], ["IC margin", icMargin.toFixed(0)], ["Design risk", icMargin < 10 ? "fragile" : "stable"]],
        debrief: icMargin >= 0 ? "Truth-telling is optimal under this rule. The penalty and allocation rule jointly neutralize the private gain from manipulation." : "The mechanism is manipulable. Agents can improve payoff by misreporting, so the allocation rule is not incentive-compatible.",
        formal: "A mechanism is incentive-compatible when each type maximizes utility by truthfully reporting private information.",
        replay: "Raise private gains from lying, then increase the penalty until the IC margin crosses zero. That threshold is the design constraint.",
      };
    },
  },
};

const state = { worldIndex: 0, engine: "utility" };
const $ = (id) => document.getElementById(id);

function init() {
  $("worldCount").textContent = worlds.length;
  $("moduleCount").textContent = `${worlds.reduce((sum, world) => sum + world.modules.length, 0)}+`;
  renderWorldTabs();
  renderWorld();
  setupSimChoices();
  renderEngine();
  $("runSimulation").addEventListener("click", runSimulation);
}

function renderWorldTabs() {
  const tabs = $("worldTabs");
  tabs.innerHTML = "";
  worlds.forEach((world, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = index === state.worldIndex ? "active" : "";
    button.textContent = `World ${index + 1}`;
    button.addEventListener("click", () => {
      state.worldIndex = index;
      renderWorldTabs();
      renderWorld();
    });
    tabs.appendChild(button);
  });
}

function renderWorld() {
  const world = worlds[state.worldIndex];
  $("worldKicker").textContent = `World ${state.worldIndex + 1}`;
  $("worldTitle").textContent = world.title;
  $("worldDescription").textContent = world.description;
  $("worldTags").innerHTML = world.tags.map((tag) => `<span>${tag}</span>`).join("");
  $("moduleGrid").innerHTML = world.modules.map(([title, copy]) => `
    <article class="module-card">
      <h4>${title}</h4>
      <p>${copy}</p>
      <button type="button" data-module-title="${title}">Map to lab</button>
    </article>
  `).join("");
  document.querySelectorAll("[data-module-title]").forEach((button) => {
    button.addEventListener("click", () => mapModuleToEngine(button.dataset.moduleTitle));
  });
}

function mapModuleToEngine(title) {
  const lower = title.toLowerCase();
  const engine = lower.includes("utility") ? "utility"
    : lower.includes("risk") || lower.includes("lottery") || lower.includes("petersburg") ? "lottery"
    : lower.includes("cournot") || lower.includes("collusion") ? "cournot"
    : lower.includes("auction") || lower.includes("winner") ? "auction"
    : lower.includes("signal") || lower.includes("cheap talk") ? "signaling"
    : lower.includes("bargain") ? "bargaining"
    : lower.includes("mechanism") || lower.includes("vcg") || lower.includes("screen") ? "mechanism"
    : "utility";
  state.engine = engine;
  syncChoiceButtons();
  renderEngine();
  document.getElementById("simulation").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupSimChoices() {
  document.querySelectorAll(".sim-choice").forEach((button) => {
    button.addEventListener("click", () => {
      state.engine = button.dataset.engine;
      syncChoiceButtons();
      renderEngine();
    });
  });
}

function syncChoiceButtons() {
  document.querySelectorAll(".sim-choice").forEach((button) => {
    button.classList.toggle("active", button.dataset.engine === state.engine);
  });
}

function renderEngine() {
  const engine = engines[state.engine];
  $("engineKicker").textContent = engine.world;
  $("engineTitle").textContent = engine.title;
  $("engineBrief").textContent = engine.brief;
  $("controls").innerHTML = engine.controls.map((control) => controlMarkup(control)).join("");
  engine.controls.forEach((control) => {
    const input = $(control.id);
    input.addEventListener("input", runSimulation);
  });
  runSimulation();
}

function controlMarkup(control) {
  return `
    <label>${control.label}
      <input id="${control.id}" type="${control.type}" min="${control.min}" max="${control.max}" value="${control.value}" />
      <span id="${control.id}Value">${control.value}</span>
    </label>
  `;
}

function runSimulation() {
  const engine = engines[state.engine];
  const values = Object.fromEntries(engine.controls.map((control) => {
    const value = Number($(control.id).value);
    $(`${control.id}Value`).textContent = value;
    return [control.id, value];
  }));
  const result = engine.simulate(values);
  $("visualTitle").textContent = result.visualTitle;
  renderVisualization(result);
  $("metrics").innerHTML = result.metrics.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
  $("debriefText").textContent = result.debrief;
  $("formalText").textContent = result.formal;
  $("replayText").textContent = result.replay;
}

function renderVisualization(result) {
  if (state.engine === "mechanism" || state.engine === "signaling") {
    $("visualization").innerHTML = `<div class="matrix-viz">${result.bars.map(([label, width, text]) => `<div class="matrix-cell"><strong>${label}</strong><p>${text}</p><div class="bar-track"><div class="bar-fill" style="width:${clamp(width)}%"></div></div></div>`).join("")}</div>`;
    return;
  }
  if (state.engine === "utility") {
    $("visualization").innerHTML = `<div class="curve">${result.bars.map(([label, width, text], index) => `<span class="curve-dot" style="transform: translateY(${Math.max(-60, -width / 2)}px)">${index + 1}</span><div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${clamp(width)}%"></div></div><strong>${text}</strong></div>`).join("")}</div>`;
    return;
  }
  $("visualization").innerHTML = result.bars.map(([label, width, text]) => `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${clamp(width)}%"></div></div><strong>${text}</strong></div>`).join("");
}

function clamp(value) {
  return Math.max(3, Math.min(100, Number(value) || 0));
}

init();
