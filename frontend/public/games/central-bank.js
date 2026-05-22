const MAX_QUARTERS = 10;
const INFLATION_TARGET = 2;

const metricDefs = [
  { key: "inflation", label: "Inflation", unit: "%", min: 0, max: 14, goodLow: 1.3, goodHigh: 3, warnLow: 0.6, warnHigh: 6, lowerIsBetter: false },
  { key: "unemployment", label: "Unemployment", unit: "%", min: 2, max: 18, goodLow: 3.5, goodHigh: 5.5, warnLow: 2.7, warnHigh: 9, lowerIsBetter: false },
  { key: "gdpGrowth", label: "GDP Growth", unit: "%", min: -7, max: 8, goodLow: 1.5, goodHigh: 3.5, warnLow: 0, warnHigh: 5.2, lowerIsBetter: false },
  { key: "interestRate", label: "Interest Rate", unit: "%", min: 0, max: 10, goodLow: 1.5, goodHigh: 5.5, warnLow: 0.25, warnHigh: 8, lowerIsBetter: false },
  { key: "confidence", label: "Public Confidence", unit: "", min: 0, max: 100, goodLow: 62, goodHigh: 100, warnLow: 38, warnHigh: 100, lowerIsBetter: false },
  { key: "bankStability", label: "Bank Stability", unit: "", min: 0, max: 100, goodLow: 66, goodHigh: 100, warnLow: 38, warnHigh: 100, lowerIsBetter: false },
  { key: "volatility", label: "Market Volatility", unit: "", min: 0, max: 100, goodLow: 0, goodHigh: 30, warnLow: 0, warnHigh: 58, lowerIsBetter: true },
  { key: "politicalPressure", label: "Political Pressure", unit: "", min: 0, max: 100, goodLow: 0, goodHigh: 28, warnLow: 0, warnHigh: 62, lowerIsBetter: true }
];

const modeDetails = {
  learn: "Learn Mode: the advisor explains tradeoffs, key terms, and one or two reasonable policy paths.",
  standard: "Standard Mode: the advisor gives context and risks, but fewer hints about the best action.",
  test: "Test Mode: the advisor reports the situation only. Your classroom nemesis may be watching."
};

const scenarios = [
  {
    title: "Soup Price Meteor",
    situation: "A supply shock has made soup, rent, and tiny banker hats more expensive. Inflation is above target while shoppers still have some cash.",
    shock: { inflation: 1.4, gdpGrowth: -0.2, confidence: -4, volatility: 6, politicalPressure: 4 },
    advisor: {
      learn: "Inflation is drifting away from the 2% inflation target. A rate hike can cool demand, but monetary policy lag means unemployment may rise later. Holding or calming guidance is gentler, but risks sticky expectations.",
      standard: "Price pressure is broadening. Markets expect a signal that the Goblin Reserve still cares about inflation.",
      test: "Inflation is above target after a supply shock."
    }
  },
  {
    title: "Mall Goblins Stop Buying Pants",
    situation: "Retail sales are sagging, factories are cutting shifts, and a newspaper columnist has typed the word recession in all caps.",
    shock: { gdpGrowth: -1.1, unemployment: 0.7, confidence: -7, volatility: 7, inflation: -0.2 },
    advisor: {
      learn: "This is recession risk. Lower rates or QE can support demand and jobs, but easier money may worsen inflation if prices are already hot.",
      standard: "Growth is weakening and unemployment is moving up. Watch inflation before adding stimulus.",
      test: "Growth is falling and unemployment is rising."
    }
  },
  {
    title: "Regional Bank With Too Many Basements",
    situation: "A mid-size bank reveals losses on mysterious basement loans. Depositors are asking whether ATMs dispense actual money or decorative coupons.",
    shock: { bankStability: -18, volatility: 12, confidence: -8, unemployment: 0.2, politicalPressure: 5 },
    advisor: {
      learn: "This resembles a bank run. Emergency lending can provide liquidity and stabilize banks, but politicians may complain about moral hazard.",
      standard: "Financial stability is deteriorating quickly. Liquidity support could stop panic from spreading.",
      test: "Bank stability is falling and panic is spreading."
    }
  },
  {
    title: "Meme-Stock Volcano",
    situation: "Markets are swinging wildly after traders discover a chart shaped like a raccoon. Households feel rich at breakfast and doomed by lunch.",
    shock: { volatility: 18, confidence: -3, gdpGrowth: 0.2, bankStability: -4 },
    advisor: {
      learn: "Market expectations can move faster than fundamentals. Forward guidance may calm volatility, while rates and QE affect the real economy more slowly.",
      standard: "Volatility is the main problem. Fundamentals have not fully broken yet.",
      test: "Market volatility is elevated."
    }
  },
  {
    title: "Wage Spiral Karaoke Night",
    situation: "Workers win raises, firms raise prices, and everyone sings about cost-of-living adjustments in a terrible key.",
    shock: { inflation: 1.2, unemployment: -0.2, gdpGrowth: 0.4, politicalPressure: 8, volatility: 4 },
    advisor: {
      learn: "Demand is strong and inflation expectations may be rising. Rate hikes can cool the wage-price spiral, but there is an unemployment tradeoff.",
      standard: "The labor market is hot and inflation pressure is becoming self-reinforcing.",
      test: "Inflation is rising while unemployment is low."
    }
  },
  {
    title: "Productivity Fairy With a Spreadsheet Wand",
    situation: "New software makes factories faster. Growth improves without much extra inflation, although nobody trusts the fairy's licensing terms.",
    shock: { gdpGrowth: 1.0, inflation: -0.4, unemployment: -0.4, confidence: 5, volatility: -5 },
    advisor: {
      learn: "Good supply news can raise growth and lower inflation at the same time. You may not need aggressive stimulus; preserving stability can be enough.",
      standard: "Growth is healthy and inflation pressure is easing. Avoid oversteering.",
      test: "Growth is improving and inflation is easing."
    }
  },
  {
    title: "Parliament Demands Free Money Friday",
    situation: "Elected officials demand rate cuts before an election. A senator waves a novelty check and calls it macroprudential vibes.",
    shock: { politicalPressure: 18, confidence: -2, volatility: 5 },
    advisor: {
      learn: "Central bank independence matters. Cutting rates under pressure may boost confidence briefly but can damage inflation credibility if not justified.",
      standard: "Political pressure is high. Your credibility is part of policy transmission.",
      test: "Political pressure has jumped."
    }
  },
  {
    title: "Credit Crunch Fog Machine",
    situation: "Banks tighten lending standards. Small businesses complain that loan officers have been replaced by suspicious fog machines.",
    shock: { bankStability: -8, gdpGrowth: -0.8, unemployment: 0.5, confidence: -6, volatility: 7 },
    advisor: {
      learn: "Tighter credit can slow the economy even without a rate hike. Liquidity tools or lower rates can help, but watch inflation and moral hazard.",
      standard: "Credit supply is weakening. Financial stress is leaking into jobs and output.",
      test: "Credit is tightening and growth is slowing."
    }
  },
  {
    title: "Energy Goblin Embargo",
    situation: "Energy prices spike after pipeline goblins demand dental benefits. Inflation rises as growth slows: the dreaded stagflation smell.",
    shock: { inflation: 1.5, gdpGrowth: -0.9, unemployment: 0.4, confidence: -6, volatility: 8, politicalPressure: 7 },
    advisor: {
      learn: "Stagflation is hard because rate hikes fight inflation but may deepen the slowdown. Guidance can anchor expectations, yet fundamentals still hurt.",
      standard: "Inflation and unemployment risks are both worsening. There is no painless button.",
      test: "Inflation is rising while growth is slowing."
    }
  },
  {
    title: "Soft-Landing Parade Permit",
    situation: "Inflation is closer to target, hiring is steady, and someone has applied for a parade permit shaped like a yield curve.",
    shock: { confidence: 6, volatility: -6, bankStability: 5, politicalPressure: -5 },
    advisor: {
      learn: "When the economy is near balance, gradual policy can protect the soft landing. Big moves may create unnecessary volatility due to monetary policy lag.",
      standard: "Conditions are stabilizing. The risk now is doing too much too late.",
      test: "Conditions are stabilizing."
    }
  }
];


const scenarioCoaches = {
  "Soup-Price Jump Scare": {
    objective: "Separate a noisy price shock from a persistent inflation problem.",
    watch: "Inflation, confidence, and whether growth weakens after tightening.",
    success: "Cool demand gradually if inflation persists; avoid a giant move before lagged effects arrive."
  },
  "Regional Bank With Too Many Basements": {
    objective: "Stop a liquidity panic before it becomes a solvency and confidence crisis.",
    watch: "Bank stability below 50, volatility spikes, and confidence losses.",
    success: "Use liquidity tools when the banking channel is the dominant risk; explain moral hazard in the debrief."
  },
  "Meme-Stock Volcano": {
    objective: "Distinguish market volatility from broad macro weakness.",
    watch: "Volatility, confidence, and whether GDP and unemployment are still near healthy ranges.",
    success: "Stabilize expectations before using blunt rate or QE tools."
  },
  "Wage Spiral Karaoke Night": {
    objective: "Understand how expectations can turn wage and price increases into a loop.",
    watch: "Inflation above target with unemployment still low and political pressure rising.",
    success: "Lean against overheating while tracking the unemployment tradeoff."
  },
  "Productivity Fairy With a Spreadsheet Wand": {
    objective: "Recognize a positive supply shock that improves growth without extra inflation.",
    watch: "GDP growth, unemployment, inflation, and whether policy oversteers a healthy economy.",
    success: "Protect the soft landing; holding can be an active policy choice."
  },
  "Parliament Demands Free Money Friday": {
    objective: "Protect central bank credibility under political pressure.",
    watch: "Political pressure, inflation expectations, and confidence after non-economic demands.",
    success: "Do not cut rates just to satisfy politics if inflation credibility is at risk."
  },
  "Credit Crunch Fog Machine": {
    objective: "See how bank lending conditions can transmit into jobs and output.",
    watch: "GDP growth, unemployment, bank stability, and confidence after credit tightens.",
    success: "Target the credit channel while avoiding unnecessary inflation fuel."
  },
  "Energy Goblin Embargo": {
    objective: "Reason through stagflation when inflation rises and growth slows together.",
    watch: "Inflation and unemployment moving in the wrong direction at the same time.",
    success: "Anchor expectations and avoid pretending there is a painless single-button fix."
  },
  "Soft-Landing Parade Permit": {
    objective: "Preserve balance once inflation, jobs, and stability are close to target.",
    watch: "Whether aggressive moves create volatility after conditions improve.",
    success: "Use patience and small interventions; do not manufacture a recession after winning."
  }
};

const actions = [
  {
    id: "raise",
    name: "Raise interest rates",
    short: "Cool demand; risk jobs.",
    terms: "rate hikes · inflation target · unemployment tradeoff · monetary policy lag",
    effect: { interestRate: 0.75, inflation: -0.45, gdpGrowth: -0.45, unemployment: 0.25, confidence: -3, volatility: 3, politicalPressure: 5, bankStability: -2 },
    delayed: { inflation: -0.35, gdpGrowth: -0.25, unemployment: 0.22 },
    explanation: "Rate hikes make borrowing more expensive. That can pull inflation back toward the inflation target, but the monetary policy lag means slower GDP growth and higher unemployment may show up over later quarters."
  },
  {
    id: "lower",
    name: "Lower interest rates",
    short: "Support growth; risk inflation.",
    terms: "recession risk · market expectations · inflation pressure",
    effect: { interestRate: -0.75, inflation: 0.35, gdpGrowth: 0.55, unemployment: -0.25, confidence: 4, volatility: -2, politicalPressure: -2, bankStability: 1 },
    delayed: { inflation: 0.3, gdpGrowth: 0.25, unemployment: -0.18 },
    explanation: "Lower rates reduce borrowing costs and can support spending, GDP, and jobs. If the economy is already hot, easier money can push inflation and inflation expectations higher."
  },
  {
    id: "hold",
    name: "Hold rates steady",
    short: "Wait for lagged effects.",
    terms: "monetary policy lag · data dependence · credibility",
    effect: { inflation: -0.05, gdpGrowth: 0.02, confidence: 1, volatility: -1, politicalPressure: 1 },
    delayed: {},
    explanation: "Holding steady lets previous choices work through the economy. Central banks often wait because policy acts with a lag, but waiting too long can let inflation or recession risk worsen."
  },
  {
    id: "lending",
    name: "Emergency bank lending",
    short: "Add liquidity to banks.",
    terms: "liquidity · bank run · moral hazard · financial stability",
    effect: { bankStability: 18, volatility: -8, confidence: 4, gdpGrowth: 0.15, inflation: 0.1, politicalPressure: 8 },
    delayed: { bankStability: 3, politicalPressure: 2 },
    explanation: "Emergency lending provides liquidity so solvent banks can meet withdrawals and avoid a bank run. It improves stability, but critics may see it as moral hazard."
  },
  {
    id: "guidance",
    name: "Forward guidance / calming speech",
    short: "Shape expectations.",
    terms: "market expectations · credibility · inflation target",
    effect: { confidence: 8, volatility: -12, inflation: -0.12, bankStability: 3, politicalPressure: -1 },
    delayed: {},
    explanation: "Forward guidance changes market expectations by explaining the central bank's reaction plan. It can calm panic and anchor inflation expectations, but words cannot fix weak banks or high prices alone."
  },
  {
    id: "qe",
    name: "Quantitative easing",
    short: "Buy assets; boost markets.",
    terms: "quantitative easing · liquidity · recession risk · inflation expectations",
    effect: { gdpGrowth: 0.8, unemployment: -0.3, confidence: 6, volatility: -7, bankStability: 4, inflation: 0.45, politicalPressure: 7 },
    delayed: { gdpGrowth: 0.25, inflation: 0.25, volatility: -2 },
    explanation: "Quantitative easing buys assets to push money into financial markets and lower longer-term borrowing costs. It can fight recession risk, but may worsen inflation or political pressure."
  }
];

const headlines = {
  stable: [
    "Goblinopolis households cautiously buy normal amounts of soup",
    "Banks report vaults contain money, not raccoons",
    "Markets applaud boring central bank sentence"
  ],
  strained: [
    "Yield curve seen hiding under conference table",
    "Shoppers notice prices doing suspicious little hops",
    "Small banks ask whether panic is deductible"
  ],
  crisis: [
    "Emergency committee convenes in flaming spreadsheet bunker",
    "Market ticker replaced by continuous screaming",
    "Politicians demand chair's hat, chair refuses"
  ]
};

const state = {
  mode: "learn",
  quarter: 1,
  scenarioIndex: 0,
  score: 0,
  ended: false,
  metrics: {},
  pendingEffects: [],
  history: []
};

const el = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function resetMetrics() {
  state.metrics = {
    inflation: 3.2,
    unemployment: 4.8,
    gdpGrowth: 2.1,
    interestRate: 3,
    confidence: 58,
    bankStability: 70,
    volatility: 32,
    politicalPressure: 28
  };
  state.quarter = 1;
  state.scenarioIndex = 0;
  state.score = 0;
  state.ended = false;
  state.pendingEffects = [];
  state.history = [];
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode-card").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active.toString());
  });
  el("modeDetails").textContent = modeDetails[mode];
}

function metricStatus(def, value) {
  if (value >= def.goodLow && value <= def.goodHigh) return "good";
  if (value >= def.warnLow && value <= def.warnHigh) return "warn";
  return "bad";
}

function formatMetric(def, value) {
  if (def.unit === "%") return `${value.toFixed(1)}%`;
  return `${Math.round(value)}/100`;
}

function healthClass() {
  const m = state.metrics;
  const redFlags = [m.inflation > 8, m.unemployment > 10.5, m.gdpGrowth < -2, m.bankStability < 30, m.volatility > 70, m.politicalPressure > 78].filter(Boolean).length;
  const yellowFlags = [m.inflation > 5.2, m.unemployment > 7.5, m.gdpGrowth < 0, m.bankStability < 48, m.volatility > 55, m.politicalPressure > 58].filter(Boolean).length;
  if (redFlags >= 2 || m.bankStability < 18) return "crisis";
  if (redFlags >= 1 || yellowFlags >= 2) return "strained";
  return "stable";
}


function renderPolicyNotebook(lastAction) {
  const scenario = scenarios[state.scenarioIndex];
  const coach = scenarioCoaches[scenario.title];
  el("lessonObjective").textContent = coach.objective;
  el("watchSignal").textContent = coach.watch;
  el("successRule").textContent = lastAction
    ? `${lastAction.name}: ${lastAction.explanation}`
    : coach.success;
}

function buildEndingConcepts(ending) {
  const m = state.metrics;
  const concepts = [];
  concepts.push(`Inflation targeting: ended at ${m.inflation.toFixed(1)}% versus a 2.0% target, showing how credibility depends on repeated choices.`);
  concepts.push(`Dual-mandate tradeoff: unemployment finished at ${m.unemployment.toFixed(1)}% while GDP growth finished at ${m.gdpGrowth.toFixed(1)}%, so the score reflects both prices and jobs.`);
  if (m.bankStability < 45 || ending.title.includes("Banking")) concepts.push("Financial stability: weak banks can turn normal policy into crisis management because credit transmission breaks.");
  if (m.volatility > 58) concepts.push("Expectations channel: high market volatility shows why guidance and credibility can matter before fundamentals fully move.");
  if (m.politicalPressure > 65 || ending.title.includes("Political")) concepts.push("Central bank independence: political pressure can narrow the feasible policy set even when the macro dashboard looks manageable.");
  if (ending.title === "Soft Landing") concepts.push("Soft landing: balanced outcomes require patience, targeted tools, and respect for monetary-policy lags.");
  return concepts.slice(0, 5);
}

function renderDashboard() {
  const dashboard = el("dashboard");
  dashboard.innerHTML = "";
  metricDefs.forEach((def) => {
    const value = state.metrics[def.key];
    const pct = clamp(((value - def.min) / (def.max - def.min)) * 100, 0, 100);
    const status = metricStatus(def, value);
    dashboard.insertAdjacentHTML("beforeend", `
      <article class="metric ${status}">
        <p class="metric-label">${def.label}</p>
        <p class="metric-value">${formatMetric(def, value)}</p>
        <div class="bar" aria-hidden="true"><div class="fill" style="width:${pct}%"></div></div>
        <p class="metric-foot">${status === "good" ? "comfortable" : status === "warn" ? "watch closely" : "danger zone"}</p>
      </article>
    `);
  });
  el("quarterLabel").textContent = `Quarter ${state.quarter} of ${MAX_QUARTERS}`;
  el("currentScore").textContent = String(calculateScore());
}

function renderScenario() {
  const scenario = scenarios[state.scenarioIndex];
  el("briefingTitle").textContent = scenario.title;
  el("scenarioText").textContent = scenario.situation;
  el("advisorText").textContent = scenario.advisor[state.mode];
  renderPolicyNotebook();
}

function renderActions() {
  const list = el("actionList");
  list.innerHTML = "";
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-button";
    button.innerHTML = `<strong>${action.name}</strong><span>${action.short}</span>`;
    button.addEventListener("click", () => takeAction(action));
    list.appendChild(button);
  });
}

function updateEconomyView(extraHeadline) {
  const view = el("economyView");
  const mood = healthClass();
  view.classList.remove("stable", "strained", "crisis");
  view.classList.add(mood);

  const m = state.metrics;
  const marketDirection = m.volatility > 65 || m.gdpGrowth < 0 ? "↘" : m.gdpGrowth > 2.8 && m.confidence > 55 ? "↗" : "↔";
  el("marketArrow").textContent = marketDirection;
  el("tickerText").textContent = `GOBX ${marketDirection === "↗" ? "+1.7" : marketDirection === "↘" ? "-3.9" : "+0.1"}% · CPI ${m.inflation.toFixed(1)}% · BANK-STAB ${Math.round(m.bankStability)} · VOL ${Math.round(m.volatility)} · Soup futures ${m.inflation > 6 ? "feral" : "contained"}`;

  const picked = [...headlines[mood]];
  if (extraHeadline) picked.unshift(extraHeadline);
  el("headlineList").innerHTML = picked.slice(0, 3).map((headline) => `<li>${headline}</li>`).join("");
}

function applyDelta(delta, multiplier = 1) {
  Object.entries(delta).forEach(([key, value]) => {
    state.metrics[key] += value * multiplier;
  });
}

function applyScenarioShock() {
  const scenario = scenarios[state.scenarioIndex];
  applyDelta(scenario.shock);
}

function applyPendingEffects() {
  const stillPending = [];
  state.pendingEffects.forEach((item) => {
    applyDelta(item.delta, item.strength);
    if (item.turns > 1) stillPending.push({ ...item, turns: item.turns - 1, strength: item.strength * 0.72 });
  });
  state.pendingEffects = stillPending;
}

function applyEconomyFeedback(action) {
  const m = state.metrics;
  const inflationGap = Math.max(0, m.inflation - INFLATION_TARGET);

  // Simple teaching model: high inflation hurts confidence, weak GDP raises unemployment,
  // panic hurts banks, and political pressure rises when pain is visible.
  m.confidence += -0.55 * inflationGap + 0.9 * m.gdpGrowth - 0.55 * Math.max(0, m.unemployment - 5) - 0.08 * m.volatility;
  m.unemployment += m.gdpGrowth < 0 ? Math.abs(m.gdpGrowth) * 0.28 : -m.gdpGrowth * 0.08;
  m.bankStability += m.gdpGrowth < -1 ? -3 : 0.8;
  m.volatility += Math.abs(m.inflation - INFLATION_TARGET) * 0.7 - (action.id === "guidance" ? 3 : 0);
  m.politicalPressure += Math.max(0, m.unemployment - 6) * 0.9 + Math.max(0, m.inflation - 4) * 0.7;
}

function clampMetrics() {
  metricDefs.forEach((def) => {
    state.metrics[def.key] = clamp(state.metrics[def.key], def.min, def.max);
  });
}

function takeAction(action) {
  if (state.ended) return;

  applyDelta(action.effect);
  if (Object.keys(action.delayed).length) {
    state.pendingEffects.push({ delta: action.delayed, turns: 2, strength: 1 });
  }
  applyEconomyFeedback(action);
  clampMetrics();

  const score = calculateScore();
  state.score = score;
  const best = Math.max(Number(localStorage.getItem("centralBankBest") || 0), score);
  localStorage.setItem("centralBankBest", String(best));
  el("bestScore").textContent = String(best);

  const headline = buildActionHeadline(action);
  const entry = `Q${state.quarter}: ${action.name}. ${headline} Score ${score}.`;
  state.history.unshift(entry);
  renderLog();
  el("decisionExplanation").textContent = `${action.explanation} Key terms: ${action.terms}.`;
  el("termsText").textContent = `This quarter highlighted: ${action.terms}.`;
  renderPolicyNotebook(action);

  renderDashboard();
  updateEconomyView(headline);

  const ending = checkEnding(false);
  if (ending) return endGame(ending);

  if (state.quarter >= MAX_QUARTERS) return endGame(checkEnding(true));

  state.quarter += 1;
  state.scenarioIndex = (state.scenarioIndex + 1) % scenarios.length;
  applyPendingEffects();
  applyScenarioShock();
  clampMetrics();
  renderScenario();
  renderDashboard();
  updateEconomyView();
}

function buildActionHeadline(action) {
  const m = state.metrics;
  if (action.id === "raise") return `Rate hikes announced; inflation ${m.inflation > 5 ? "still snarls" : "starts cooling"} as recession risk twitches.`;
  if (action.id === "lower") return `Rate cut boosts borrowers; inflation hawks seen clutching laminated charts.`;
  if (action.id === "lending") return `Liquidity window opens; bank run fears ease while moral hazard debate gets loud.`;
  if (action.id === "guidance") return `Calming speech nudges market expectations; fundamentals remain annoyingly real.`;
  if (action.id === "qe") return `QE cannon fires confetti money; markets cheer and inflation skeptics frown.`;
  return `Goblin Reserve waits for monetary policy lag to reveal its weird little secrets.`;
}

function renderLog() {
  el("eventLog").innerHTML = state.history.map((item) => `<li>${item}</li>`).join("");
}

function calculateScore() {
  const m = state.metrics;
  const inflationScore = Math.max(0, 100 - Math.abs(m.inflation - INFLATION_TARGET) * 14);
  const jobsScore = Math.max(0, 100 - Math.abs(m.unemployment - 4.6) * 11);
  const growthScore = Math.max(0, 100 - Math.abs(m.gdpGrowth - 2.2) * 12);
  const stabilityScore = m.bankStability;
  const confidenceScore = m.confidence;
  const calmScore = 100 - m.volatility;
  const politicsScore = 100 - m.politicalPressure;
  return Math.round((inflationScore + jobsScore + growthScore + stabilityScore + confidenceScore + calmScore + politicsScore) / 7);
}

function checkEnding(survivedFullTerm) {
  const m = state.metrics;
  if (m.bankStability <= 12) return { title: "Banking Collapse", text: "The banks ran out of trust before they ran out of marble columns. Liquidity arrived too late, and a bank run became the curriculum." };
  if (m.politicalPressure >= 92) return { title: "Political Removal", text: "Parliament replaced you with a vending machine that promises low rates and dispenses pickles. Central bank independence has left the building." };
  if (m.inflation >= 11) return { title: "Inflation Spiral", text: "Inflation expectations broke loose. Every price tag now includes a smaller price tag apologizing for tomorrow." };
  if (m.unemployment >= 14 || m.gdpGrowth <= -5.5) return { title: "Recession", text: "Output contracted and unemployment surged. Price stability matters, but so does keeping the economy from face-planting into a filing cabinet." };
  if (m.inflation >= 7 && m.unemployment >= 8) return { title: "Stagflation Nightmare", text: "Prices rose while jobs vanished. The economy became a two-headed classroom example of why supply shocks are rude." };

  if (!survivedFullTerm) return null;

  if (m.inflation >= 5.5 && m.unemployment >= 6.8) return { title: "Stagflation Nightmare", text: "You survived, but inflation and unemployment both ended too high. The goblin textbooks will use a red pen." };
  if (m.inflation > 6.2) return { title: "Inflation Spiral", text: "The term ended with inflation too hot. Growth survived, but the inflation target is now a decorative wall quote." };
  if (m.unemployment > 8.5 || m.gdpGrowth < -1) return { title: "Recession", text: "Inflation cooled, but jobs and output paid too high a price. The unemployment tradeoff became painfully visible." };
  if (m.bankStability < 35) return { title: "Banking Collapse", text: "The final dashboard still smells like bank panic. Stability was too fragile for a victory parade." };
  if (m.politicalPressure > 78) return { title: "Political Removal", text: "The macro numbers were survivable, but political pressure consumed your chairmanship like a ceremonial shredder." };
  return { title: "Soft Landing", text: "Inflation moved near target, jobs held up, banks stayed open, and the parade permit was approved with only minor raccoon damage." };
}

function endGame(ending) {
  state.ended = true;
  const finalScore = calculateScore();
  el("endingTitle").textContent = ending.title;
  el("endingText").textContent = ending.text;
  el("endingScore").textContent = `Final score: ${finalScore}. Final dashboard: inflation ${state.metrics.inflation.toFixed(1)}%, unemployment ${state.metrics.unemployment.toFixed(1)}%, GDP growth ${state.metrics.gdpGrowth.toFixed(1)}%.`;
  const conceptList = el("endingConcepts");
  conceptList.innerHTML = "";
  buildEndingConcepts(ending).forEach((concept) => {
    const item = document.createElement("li");
    item.textContent = concept;
    conceptList.appendChild(item);
  });
  el("endingModal").classList.remove("hidden");
}

function startGame() {
  resetMetrics();
  applyScenarioShock();
  clampMetrics();
  el("setupPanel").classList.add("hidden");
  el("gamePanel").classList.remove("hidden");
  el("endingModal").classList.add("hidden");
  el("decisionExplanation").textContent = "Choose a policy action to see how monetary policy ripples through the economy.";
  el("termsText").textContent = "Inflation target, monetary policy lag, liquidity, market expectations, recession risk, and bank run will appear as your choices unfold.";
  renderScenario();
  renderActions();
  renderLog();
  renderDashboard();
  updateEconomyView();
}

function restartToSetup() {
  resetMetrics();
  el("gamePanel").classList.add("hidden");
  el("setupPanel").classList.remove("hidden");
  el("endingModal").classList.add("hidden");
}

function bind() {
  document.querySelectorAll(".mode-card").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  el("startGame").addEventListener("click", startGame);
  el("restartGame").addEventListener("click", restartToSetup);
  el("playAgain").addEventListener("click", startGame);
  el("closeEnding").addEventListener("click", () => el("endingModal").classList.add("hidden"));
  el("bestScore").textContent = localStorage.getItem("centralBankBest") || "0";
  setMode("learn");
}

bind();
