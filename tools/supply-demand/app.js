const { scenarios, actions, challenges, initialState, applyAction, roundMetric } = window.SupplyDemandEngine;

let mode = "challenge";
let scenario = scenarios[0];
let challenge = challenges[0];
let baseline;
let market;
let moves = 0;
let actionIds = [];
let capturedAt;
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
  actionIds = [];
  capturedAt = new Date().toISOString();
  pricePrediction = undefined;
  quantityPrediction = undefined;
  correctPredictions = 0;
  predictionChecks = 0;
  complete = false;
  $("debriefCard").hidden = true;
  saveRun();
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
  if (actionIds.length >= window.SupplyDemandEngine.LIMIT) { $("predictionScore").textContent = "This run has reached 12 moves. Reset to explore another sequence."; return; }
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
  actionIds.push(actionId);
  capturedAt = new Date().toISOString();
  pricePrediction = undefined;
  quantityPrediction = undefined;

  if (mode === "challenge" && (challenge.success(market, baseline) || moves >= challenge.maxMoves)) {
    complete = true;
    showDebrief();
  }
  saveRun();
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

function selectedRun() {
  return { ...window.SupplyDemandEngine.simulate({ scenarioId: scenario.id, mode, challengeId: challenge.id, actions: actionIds }), capturedAt };
}
function saveRun() {
  try { localStorage.setItem('ballzatram:supply-demand-last-run:v1', JSON.stringify(selectedRun())); } catch { /* The visible run works without storage. */ }
  window.dispatchEvent(new CustomEvent('osiris:lab-change'));
}
function loadRun(input) {
  const snapshot = window.SupplyDemandEngine.simulate(input);
  scenario = scenarios.find(row => row.id === snapshot.input.scenarioId);
  challenge = challenges.find(row => row.id === snapshot.input.challengeId);
  mode = snapshot.input.mode;
  reset();
  baseline = snapshot.baseline; market = snapshot.result; actionIds = snapshot.input.actions; moves = actionIds.length;
  complete = snapshot.challenge?.complete || false;
  $('scenarioSelect').value = scenario.id; $('challengeSelect').value = challenge.id;
  document.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('active', item.dataset.mode === mode));
  // Imported simulations do not carry player predictions or award a score.
  saveRun(); render();
}
window.SupplyDemandLab = Object.freeze({ selectedRun, loadRun });
reset();
