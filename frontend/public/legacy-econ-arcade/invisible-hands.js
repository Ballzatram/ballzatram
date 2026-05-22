const totalDays = 5;
const state = {
  day: 1,
  score: 0,
  stability: 0,
  history: [],
};

const $ = (id) => document.getElementById(id);

function readControls() {
  const price = Number($("priceInput").value);
  const confidence = Number($("supplyInput").value);
  const heat = Number($("demandInput").value);
  $("priceValue").textContent = `$${price}`;
  $("supplyValue").textContent = confidence;
  $("demandValue").textContent = heat;
  return { price, confidence, heat };
}

function calculateMarket({ price, confidence, heat }) {
  const demand = Math.max(0, Math.round(118 + heat * 0.7 - price * 7.4));
  const supply = Math.max(0, Math.round(18 + confidence * 0.68 + price * 5.8));
  const traded = Math.min(demand, supply);
  const gap = supply - demand;
  const clearingPressure = Math.abs(gap);
  const welfare = Math.max(0, Math.round(traded * 2.4 - clearingPressure * 1.15));
  const dayScore = Math.max(0, Math.round(100 - clearingPressure * 1.25 + traded * 0.12));
  const stability = Math.max(0, Math.min(100, Math.round(100 - clearingPressure * 1.4)));
  return { demand, supply, traded, gap, welfare, dayScore, stability };
}

function describeOutcome(result) {
  if (Math.abs(result.gap) <= 6) {
    return "The market nearly clears. Buyers and sellers are using the price signal to coordinate plans, so welfare rises with little wasted inventory or unmet demand.";
  }
  if (result.gap > 0) {
    return "Supply exceeds demand. The posted price and confidence signal pulled too many units into the market, creating surplus inventory and downward price pressure.";
  }
  return "Demand exceeds supply. The price is too low for the current demand shock, so buyers queue for scarce units and the shortage creates rationing pressure.";
}

function lessonFor(result) {
  if (Math.abs(result.gap) <= 6) {
    return "Equilibrium is not magic; it is feedback. When price is close to the clearing level, decentralized buyers and sellers can act on local incentives and still produce a coordinated outcome.";
  }
  if (result.gap > 0) {
    return "A surplus is information. Sellers learn that the current price/capacity plan is too ambitious relative to buyer willingness to pay, so competition should push price or production down.";
  }
  return "A shortage is information. Buyers reveal stronger willingness to pay than sellers expected, so the market needs higher price signals, more supply, or a demand-cooling shock.";
}

function renderPreview() {
  const controls = readControls();
  const result = calculateMarket(controls);
  renderMarket(result);
  $("outcomeText").textContent = describeOutcome(result);
  $("lessonText").textContent = lessonFor(result);
}

function renderMarket(result) {
  $("dayTitle").textContent = `Day ${Math.min(state.day, totalDays)}`;
  $("demandMetric").textContent = result.demand;
  $("supplyMetric").textContent = result.supply;
  $("gapMetric").textContent = result.gap === 0 ? "clear" : `${Math.abs(result.gap)} ${result.gap > 0 ? "surplus" : "short"}`;
  $("welfareMetric").textContent = result.welfare;
  $("scoreMetric").textContent = state.score;
  $("stabilityMetric").textContent = `${state.stability}%`;
  $("roundMetric").textContent = `${state.history.length} / ${totalDays}`;

  const max = Math.max(140, result.demand, result.supply, Math.abs(result.gap));
  $("marketViz").innerHTML = [
    ["Demand", result.demand, "demand", `${result.demand} buyers`],
    ["Supply", result.supply, "supply", `${result.supply} units`],
    ["Imbalance", Math.abs(result.gap), "gap", result.gap === 0 ? "cleared" : `${Math.abs(result.gap)} units`],
  ].map(([label, value, kind, text]) => `
    <div class="market-row">
      <span>${label}</span>
      <div class="track"><div class="fill ${kind}" style="width:${Math.max(3, Math.min(100, (value / max) * 100))}%"></div></div>
      <strong>${text}</strong>
    </div>
  `).join("");
}

function renderHistory() {
  $("dayLog").innerHTML = state.history.length
    ? state.history.slice().reverse().map((entry) => `
      <article>
        <strong>Day ${entry.day}</strong> · ${entry.label}<br />
        Demand ${entry.demand}, supply ${entry.supply}, welfare ${entry.welfare}
      </article>
    `).join("")
    : "<article>No market days completed yet. Open the first day to start the trace.</article>";
}

function advanceDay() {
  if (state.history.length >= totalDays) return;
  const result = calculateMarket(readControls());
  const label = Math.abs(result.gap) <= 6 ? "near equilibrium" : result.gap > 0 ? "surplus" : "shortage";
  state.history.push({ day: state.day, label, ...result });
  state.score += result.dayScore;
  state.stability = Math.round(state.history.reduce((sum, entry) => sum + entry.stability, 0) / state.history.length);
  $("outcomeText").textContent = `Day ${state.day}: ${describeOutcome(result)}`;
  $("lessonText").textContent = lessonFor(result);
  state.day += 1;
  if (state.history.length === totalDays) {
    const best = Math.max(Number(localStorage.getItem("invisibleHandsBest") || 0), state.score);
    localStorage.setItem("invisibleHandsBest", String(best));
    $("bestScore").textContent = best;
    $("advanceButton").textContent = "Market complete";
    $("advanceButton").disabled = true;
  }
  renderMarket(result);
  renderHistory();
}

function resetMarket() {
  state.day = 1;
  state.score = 0;
  state.stability = 0;
  state.history = [];
  $("advanceButton").textContent = "Open market day →";
  $("advanceButton").disabled = false;
  renderPreview();
  renderHistory();
}

function init() {
  ["priceInput", "supplyInput", "demandInput"].forEach((id) => $(id).addEventListener("input", renderPreview));
  $("advanceButton").addEventListener("click", advanceDay);
  $("resetButton").addEventListener("click", resetMarket);
  $("bestScore").textContent = localStorage.getItem("invisibleHandsBest") || "0";
  resetMarket();
}

init();
