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

let mode = "challenge";
let scenario = scenarios[0];
let challenge = challenges[0];
let baseline;
let market;
let moves = 0;
let pricePrediction;
let quantityPrediction;
let correctPredictions = 0;
let predictionChecks = 0;
let complete = false;

const $ = (id) => document.getElementById(id);

function startState() {
  const start = initialState(scenario);
  return challenge.id === "stabilize" && mode === "challenge" ? applyAction(start, scenario, "supply-down") : start;
}

function reset() {
  baseline = startState();
  market = structuredClone(baseline);
  moves = 0;
  pricePrediction = undefined;
  quantityPrediction = undefined;
  correctPredictions = 0;
  predictionChecks = 0;
  complete = false;
  $("debriefCard").hidden = true;
  render();
}

function deltaText(value) {
  if (Math.abs(value) < 0.001) return "vs baseline: —";
  return `vs baseline: ${value > 0 ? "+" : ""}${roundMetric(value)}`;
}

function render() {
  $("scenarioBrief").textContent = scenario.brief;
  $("marketTitle").textContent = `${scenario.title} · ${scenario.market}`;
  $("challengeLabel").hidden = mode !== "challenge";
  $("challengeBrief").hidden = mode !== "challenge";
  if (mode === "challenge") $("challengeBrief").innerHTML = `<strong>${challenge.title}</strong><br>${challenge.brief}<br><em>Win: ${challenge.target}</em><br><small>Moves: ${moves}/${challenge.maxMoves}</small>`;

  $("priceMetric").textContent = `$${market.price}`;
  $("quantityMetric").textContent = market.quantity;
  $("stabilityMetric").textContent = `${market.marketStability}/100`;
  $("dwlMetric").textContent = `$${market.deadweightLoss}`;
  $("priceDelta").textContent = deltaText(market.price - baseline.price);
  $("quantityDelta").textContent = deltaText(market.quantity - baseline.quantity);
  $("stabilityDelta").textContent = deltaText(market.marketStability - baseline.marketStability);
  $("dwlDelta").textContent = deltaText(market.deadweightLoss - baseline.deadweightLoss);

  $("consumerCompare").textContent = `$${baseline.consumerSurplus} → $${market.consumerSurplus}`;
  $("producerCompare").textContent = `$${baseline.producerSurplus} → $${market.producerSurplus}`;
  $("totalCompare").textContent = `$${roundMetric(baseline.consumerSurplus + baseline.producerSurplus)} → $${roundMetric(market.consumerSurplus + market.producerSurplus)}`;
  $("balanceCompare").textContent = `${baseline.shortageSurplus} → ${market.shortageSurplus}${market.gap ? ` (${market.gap})` : ""}`;
  $("explanation").textContent = market.explanation;
  $("marketState").textContent = market.shortageSurplus;
  $("marketState").className = `state-pill ${market.shortageSurplus.toLowerCase()}`;

  const accuracy = predictionChecks ? Math.round((correctPredictions / predictionChecks) * 100) : null;
  $("predictionScore").textContent = `Prediction accuracy: ${accuracy == null ? "—" : `${accuracy}%`}`;

  document.querySelectorAll("[data-predict]").forEach((button) => {
    const selected = button.dataset.predict === "price" ? pricePrediction : quantityPrediction;
    button.classList.toggle("selected", selected === button.dataset.direction);
  });

  const allowed = mode === "challenge" ? challenge.allowed : actions.map((a) => a.id);
  $("actionList").innerHTML = actions.filter((a) => allowed.includes(a.id)).map((a) => `
    <button class="action-button" data-action="${a.id}" ${complete ? "disabled" : ""}>
      <strong>${a.label}</strong><span>${a.hint}</span>
    </button>`).join("");
  $("actionList").querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => run(button.dataset.action)));

  $("historyStrip").innerHTML = market.history.map((item) => `<div><strong>${item.label}</strong><span>$${item.price}</span><small>Q ${item.quantity}</small></div>`).join("");
}

function run(actionId) {
  if (complete) return;
  if (mode === "challenge" && !pricePrediction && !quantityPrediction) {
    $("predictionScore").textContent = "Make at least one prediction before acting.";
    return;
  }
  const before = market;
  const next = applyAction(market, scenario, actionId);
  const checks = [];
  if (pricePrediction) checks.push(pricePrediction === (next.price >= before.price ? "up" : "down"));
  if (quantityPrediction) checks.push(quantityPrediction === (next.quantity >= before.quantity ? "up" : "down"));
  correctPredictions += checks.filter(Boolean).length;
  predictionChecks += checks.length;
  market = next;
  moves += 1;
  pricePrediction = undefined;
  quantityPrediction = undefined;

  if (mode === "challenge" && (challenge.success(market, baseline) || moves >= challenge.maxMoves)) {
    complete = true;
    showDebrief();
  }
  try {
    localStorage.setItem("ballzatram:supply-demand-last-run:v1", JSON.stringify({ savedAt: new Date().toISOString(), mode, scenarioId: scenario.id, challengeId: challenge.id, moves, result: market }));
  } catch {}
  render();
}

function showDebrief() {
  const success = challenge.success(market, baseline);
  const accuracy = predictionChecks ? Math.round((correctPredictions / predictionChecks) * 100) : 0;
  const score = Math.round((success ? 60 : 0) + (accuracy / 100) * 25 + Math.max(0, 15 - (moves - 1) * 5));
  $("debriefCard").hidden = false;
  $("debriefTitle").textContent = success ? "Challenge solved" : "Move budget exhausted";
  $("debriefCopy").textContent = success ? "You reached the market objective. Compare the welfare and balance metrics to see what the solution cost." : "The market did not reach the target. Use the baseline/current comparison and try a different causal move.";
  $("debriefStats").innerHTML = `<span>Score <strong>${score}/100</strong></span><span>Prediction accuracy <strong>${accuracy}%</strong></span><span>Moves <strong>${moves}</strong></span>`;
}

function fillSelects() {
  $("scenarioSelect").innerHTML = scenarios.map((s) => `<option value="${s.id}">${s.title}</option>`).join("");
  $("challengeSelect").innerHTML = challenges.map((c) => `<option value="${c.id}">${c.title}</option>`).join("");
}

fillSelects();
$("scenarioSelect").addEventListener("change", (event) => { scenario = scenarios.find((s) => s.id === event.target.value) || scenarios[0]; reset(); });
$("challengeSelect").addEventListener("change", (event) => { challenge = challenges.find((c) => c.id === event.target.value) || challenges[0]; reset(); });
$("resetButton").addEventListener("click", reset);
$("replayButton").addEventListener("click", reset);

document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
  mode = button.dataset.mode;
  document.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("active", item.dataset.mode === mode));
  reset();
}));

document.querySelectorAll("[data-predict]").forEach((button) => button.addEventListener("click", () => {
  if (button.dataset.predict === "price") pricePrediction = button.dataset.direction;
  else quantityPrediction = button.dataset.direction;
  render();
}));

reset();
